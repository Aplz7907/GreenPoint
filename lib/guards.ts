import 'server-only';

import { createHash } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

export const MAX_SUBMISSIONS_PER_DAY = 5;

/**
 * Gap between two submissions.
 *
 * Deliberately short. The daily cap is what actually bounds abuse — a cheater
 * re-shooting the same bottle gets the same 5 photos either way, a long
 * cooldown only spreads them out. What a long cooldown *does* do is punish the
 * honest case: someone who sorted a real pile and wants to photograph the
 * bottles, then the cans, then the glass would be locked out between each shot,
 * standing outside, having done exactly what we asked of them.
 *
 * 30 seconds is still longer than the Gemini call itself, so it stops a script
 * hammering the endpoint — which was the only thing this was ever for.
 */
export const COOLDOWN_SECONDS = 30;

/** Thailand has no DST, so the offset is a constant +07:00. */
const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;

/**
 * Midnight in Bangkok, expressed as a UTC instant.
 *
 * "5 ครั้งต่อวัน" has to mean a Thai calendar day, not a UTC one — otherwise the
 * counter would reset at 7am local time, which nobody would understand.
 */
export function startOfBangkokDay(now: Date = new Date()): Date {
  const shifted = new Date(now.getTime() + BANGKOK_OFFSET_MS);
  const midnightShifted = Date.UTC(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth(),
    shifted.getUTCDate()
  );
  return new Date(midnightShifted - BANGKOK_OFFSET_MS);
}

/** SHA-256 of the exact bytes uploaded. Good enough to catch a re-upload of the
 *  same file; it will not catch a re-encoded or cropped copy (out of scope). */
export function hashImage(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

export type RateLimitResult =
  | { allowed: true }
  | {
      allowed: false;
      reason: 'daily_cap' | 'cooldown';
      message: string;
      retryAfterSeconds?: number;
    };

/**
 * Two limits, both free to check (one indexed query):
 *   - at most MAX_SUBMISSIONS_PER_DAY per Thai calendar day
 *   - at least COOLDOWN_SECONDS between submissions
 */
export async function checkRateLimit(
  supabase: SupabaseClient,
  userId: string,
  now: Date = new Date()
): Promise<RateLimitResult> {
  const dayStart = startOfBangkokDay(now);

  // Covered by submissions_user_created_idx (user_id, created_at desc).
  const { data, error } = await supabase
    .from('submissions')
    .select('created_at')
    .eq('user_id', userId)
    .gte('created_at', dayStart.toISOString())
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`rate limit query failed: ${error.message}`);
  }

  const todays = data ?? [];

  if (todays.length >= MAX_SUBMISSIONS_PER_DAY) {
    return {
      allowed: false,
      reason: 'daily_cap',
      message: `วันนี้ส่งครบ ${MAX_SUBMISSIONS_PER_DAY} ครั้งแล้ว พรุ่งนี้มาใหม่นะ 🌱`,
    };
  }

  const last = todays[0];

  if (last) {
    const elapsedMs = now.getTime() - new Date(last.created_at).getTime();
    const cooldownMs = COOLDOWN_SECONDS * 1000;

    if (elapsedMs < cooldownMs) {
      const waitSeconds = Math.max(1, Math.ceil((cooldownMs - elapsedMs) / 1000));

      return {
        allowed: false,
        reason: 'cooldown',
        message: `ส่งถี่ไปนิด 😅 รออีก ${waitSeconds} วินาทีแล้วส่งใหม่ได้เลย`,
        retryAfterSeconds: waitSeconds,
      };
    }
  }

  return { allowed: true };
}

/**
 * True when this exact image has been submitted before — by anyone.
 *
 * Needs the service-role client: RLS deliberately hides other people's rows
 * from the user's own session, so a user-scoped query could only ever see their
 * own duplicates.
 */
export async function isDuplicateImage(
  admin: SupabaseClient,
  imageHash: string
): Promise<boolean> {
  const { data, error } = await admin
    .from('submissions')
    .select('id')
    .eq('image_hash', imageHash)
    .limit(1);

  if (error) {
    throw new Error(`duplicate check failed: ${error.message}`);
  }

  return (data?.length ?? 0) > 0;
}

/**
 * How many of the 64 dHash bits may differ before two photos still count as
 * "the same scene".
 *
 * 6/64 is deliberately tight. Too loose and we start rejecting an honest user
 * who photographs their bottles, then their cans, on the same kitchen table —
 * the backgrounds match even though the waste does not. Wrongly refusing points
 * to someone who actually sorted their rubbish is a far worse failure than
 * letting one repeat photo through.
 */
export const PHASH_MAX_DISTANCE = 6;

/** Only compare against the recent past; last month is plenty. */
const PHASH_WINDOW_DAYS = 30;

/**
 * True when a visually near-identical photo has been submitted before — by
 * anyone. This is what stops someone re-shooting the same bottle five times.
 */
export async function isSimilarImage(
  admin: SupabaseClient,
  phash: string
): Promise<boolean> {
  const { data, error } = await admin.rpc('has_similar_image', {
    p_phash: phash,
    p_max_distance: PHASH_MAX_DISTANCE,
    p_within_days: PHASH_WINDOW_DAYS,
  });

  if (error) {
    throw new Error(`similar image check failed: ${error.message}`);
  }

  return data === true;
}

/** What /api/submit needs to know about the user before it prices a photo. */
export interface ScoringContext {
  /** Points earned over all time — drives the tier, never the balance. */
  lifetimePoints: number;
  /**
   * The streak this submission will land on, counting today.
   *
   * compute_streak() reports the run as it stands *now*, which for someone who
   * has not sent anything yet today ends yesterday. Submitting extends it, so
   * the number the user is about to be shown — and paid for — is that run plus
   * one. Getting this wrong by a day is the difference between "ต่อเนื่อง 7 วัน"
   * unlocking the ×1.10 step today or tomorrow, which is exactly the kind of
   * off-by-one a user notices immediately.
   */
  streakDays: number;
  eventMultiplier: number;
  eventName: string | null;
}

/**
 * Reads the scoring context with the SERVICE ROLE.
 *
 * Not the user's own client: compute_streak() is deliberately not granted to
 * authenticated (a user has no business asking about anyone's streak, including
 * their own, through a function that takes a uuid).
 */
export async function getScoringContext(
  admin: SupabaseClient,
  userId: string
): Promise<ScoringContext> {
  const { data, error } = await admin.rpc('get_scoring_context', {
    p_user_id: userId,
  });

  // A failure here must never block a submission — the photo is real and the
  // base points are already known. Falling back to "no bonuses" pays the user
  // slightly less than they were owed, which is the safe direction to be wrong
  // in: it can be corrected later, and it can never be farmed.
  if (error || !data || typeof data !== 'object') {
    return {
      lifetimePoints: 0,
      streakDays: 1,
      eventMultiplier: 1,
      eventName: null,
    };
  }

  const row = data as {
    lifetime_points?: number;
    streak_days?: number;
    approved_today?: boolean;
    event_name?: string | null;
    event_multiplier?: number | string;
  };

  const lifetimePoints = Number(row.lifetime_points ?? 0);
  const priorStreak = Number(row.streak_days ?? 0);
  const eventMultiplier = Number(row.event_multiplier ?? 1);

  return {
    lifetimePoints: Number.isFinite(lifetimePoints) ? lifetimePoints : 0,
    streakDays: row.approved_today ? priorStreak : priorStreak + 1,
    eventMultiplier: Number.isFinite(eventMultiplier) ? eventMultiplier : 1,
    eventName: row.event_name ?? null,
  };
}
