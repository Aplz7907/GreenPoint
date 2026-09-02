import { NextResponse } from 'next/server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { analyzeWasteImage } from '@/lib/gemini';
import {
  checkRateLimit,
  getScoringContext,
  hashImage,
  isDuplicateImage,
  isSimilarImage,
} from '@/lib/guards';
import { computeAward, formatWeightTh, MAX_BASE_POINTS } from '@/lib/scoring';
import { computeDHash } from '@/lib/phash';
import type {
  AiVisionResult,
  SubmissionStatus,
  SubmitResponse,
  WasteType,
} from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB — matches the storage bucket limit.
const ALLOWED_MIME = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
];

/** Below this, we do not trust the AI enough to pay for the item at all. */
const MIN_CONFIDENCE = 0.6;

function fail(message: string, status: number, extra: Partial<SubmitResponse> = {}) {
  return NextResponse.json<SubmitResponse>(
    { ok: false, message, ...extra },
    { status }
  );
}

export async function POST(request: Request) {
  // ---------------------------------------------------------------------
  // 1. Auth
  // ---------------------------------------------------------------------
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return fail('กรุณาเข้าสู่ระบบก่อนส่งรูปนะ', 401);
  }

  // ---------------------------------------------------------------------
  // 2. Ban check
  // ---------------------------------------------------------------------
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, is_banned')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return fail('ไม่พบบัญชีของคุณในระบบ ลองออกจากระบบแล้วเข้าใหม่นะ', 403);
  }

  if (profile.is_banned) {
    return fail('บัญชีนี้ถูกระงับการใช้งาน หากคิดว่าผิดพลาดกรุณาติดต่อผู้ดูแลระบบ', 403);
  }

  const admin = createAdminClient();

  // ---------------------------------------------------------------------
  // 3. Rate limit  (free — a single indexed query)
  // ---------------------------------------------------------------------
  let rate;
  try {
    rate = await checkRateLimit(supabase, user.id);
  } catch {
    return fail('ระบบขัดข้องชั่วคราว ลองใหม่อีกครั้งนะ', 500);
  }

  if (!rate.allowed) {
    return fail(rate.message, 429);
  }

  // ---------------------------------------------------------------------
  // Read the upload. Still free — nothing has cost quota yet.
  // ---------------------------------------------------------------------
  let file: File | null = null;

  try {
    const form = await request.formData();
    const value = form.get('image');
    if (value instanceof File) file = value;
  } catch {
    return fail('อ่านไฟล์รูปไม่ได้ ลองถ่ายใหม่อีกครั้งนะ', 400);
  }

  if (!file || file.size === 0) {
    return fail('ไม่พบรูปภาพ กรุณาถ่ายรูปขยะรีไซเคิลก่อนนะ 📷', 400);
  }

  if (file.size > MAX_BYTES) {
    return fail('รูปใหญ่เกินไป (เกิน 10 MB) ลองถ่ายใหม่ด้วยความละเอียดต่ำลงนะ', 413);
  }

  const mimeType = file.type || 'image/jpeg';

  if (!ALLOWED_MIME.includes(mimeType)) {
    return fail('รองรับเฉพาะไฟล์รูปภาพ (JPG, PNG, WEBP) เท่านั้นนะ', 415);
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // ---------------------------------------------------------------------
  // 4. Duplicate checks (free — no Gemini quota spent yet). Two layers:
  //
  //    a) SHA-256  — "is this the same *file*?"  Catches a straight re-upload.
  //    b) dHash    — "is this the same *scene*?" Catches re-photographing the
  //                  same bottle, which sails past (a) entirely because the
  //                  bytes are all different.
  // ---------------------------------------------------------------------
  const imageHash = hashImage(buffer);

  try {
    if (await isDuplicateImage(admin, imageHash)) {
      return fail(
        'รูปนี้เคยถูกส่งเข้ามาแล้ว ถ่ายรูปใหม่จากขยะจริงๆ นะ 🌱',
        409,
        { status: 'rejected', reject_reason: 'duplicate_image' }
      );
    }
  } catch {
    return fail('ระบบขัดข้องชั่วคราว ลองใหม่อีกครั้งนะ', 500);
  }

  // Null when the image could not be decoded. We then fall back to the SHA-256
  // check alone rather than blocking someone over our own decoding failure.
  const imagePhash = await computeDHash(buffer);

  if (imagePhash) {
    try {
      if (await isSimilarImage(admin, imagePhash)) {
        return fail(
          'รูปนี้คล้ายกับรูปที่เคยส่งเข้ามาแล้วมาก 🤔 ขยะชิ้นเดิมนับได้ครั้งเดียวนะ ลองแยกขยะชิ้นใหม่มาถ่ายกัน',
          409,
          { status: 'rejected', reject_reason: 'similar_image' }
        );
      }
    } catch {
      return fail('ระบบขัดข้องชั่วคราว ลองใหม่อีกครั้งนะ', 500);
    }
  }

  // ---------------------------------------------------------------------
  // 5. Gemini. This is the only step that costs quota, and nothing above it
  //    could have been skipped to get here.
  // ---------------------------------------------------------------------
  const outcome = await analyzeWasteImage(buffer, mimeType);

  // The AI is down or replied with something we cannot trust. There is no human
  // to escalate to, so do not record anything at all: no row means no cooldown
  // burned, no daily quota spent, and the same photo can be re-sent. The user
  // must not be punished for our outage.
  if (!outcome.ok) {
    return fail(
      'ระบบตรวจสอบขัดข้องชั่วคราว 😥 ลองส่งรูปเดิมใหม่อีกครั้งได้เลย ไม่เสียสิทธิ์ส่งของวันนี้นะ',
      503
    );
  }

  const visionResult: AiVisionResult = outcome.result;

  // ---------------------------------------------------------------------
  // 6–8. Decide status and points. THE CLIENT NEVER SENDS A POINT VALUE —
  //      every number below comes from waste_types in the database.
  // ---------------------------------------------------------------------
  const { data: wasteTypes, error: wasteError } = await admin
    .from('waste_types')
    .select('code, name_th, points_per_item, gram_per_item, is_active')
    .eq('is_active', true);

  if (wasteError || !wasteTypes) {
    return fail('ระบบขัดข้องชั่วคราว ลองใหม่อีกครั้งนะ', 500);
  }

  const priceList = new Map(
    (wasteTypes as WasteType[]).map((w) => [w.code, w])
  );

  // Price each item from the DB. Two kinds of item earn nothing:
  //   - ones the AI was not confident about (we do not pay for a guess)
  //   - ones whose code is not in the active price list (we cannot pay for what
  //     we cannot price)
  let rawPoints = 0;
  // Weight follows the points: an item we would not pay for is an item we do
  // not claim was recycled either, so the impact figure can never overstate
  // what the AI actually saw.
  let gramsTotal = 0;

  const itemBreakdown: SubmitResponse['items'] = visionResult.items.map((item) => {
    const wasteType = priceList.get(item.type);
    const confident = item.confidence >= MIN_CONFIDENCE;
    const points = wasteType && confident ? item.count * wasteType.points_per_item : 0;

    rawPoints += points;
    if (wasteType && confident) {
      gramsTotal += item.count * (wasteType.gram_per_item ?? 0);
    }

    return {
      ...item,
      name_th: wasteType?.name_th ?? item.type,
      points,
    };
  });

  const calculatedPoints = Math.min(rawPoints, MAX_BASE_POINTS);
  const wasCapped = rawPoints > MAX_BASE_POINTS;

  let status: SubmissionStatus;
  let rejectReason: string | null = null;

  if (visionResult.is_screen_photo) {
    status = 'rejected';
    rejectReason =
      'ดูเหมือนเป็นการถ่ายจากหน้าจอหรือรูปพิมพ์ ต้องถ่ายจากขยะจริงเท่านั้นนะ 📵';
  } else if (!visionResult.is_recyclable_photo || visionResult.items.length === 0) {
    status = 'rejected';
    rejectReason =
      'ไม่พบขยะรีไซเคิลในรูป ลองแยกขยะแล้ววางบนพื้นโล่งๆ ถ่ายให้เห็นชัดๆ นะ';
  } else if (calculatedPoints === 0) {
    // Items were detected, but not one of them cleared the confidence bar.
    status = 'rejected';
    rejectReason =
      'AI มองไม่ชัดว่าเป็นขยะรีไซเคิลชนิดไหน ลองถ่ายใหม่ในที่แสงสว่างพอ ให้เห็นแต่ละชิ้นชัดๆ นะ';
  } else {
    status = 'approved';
  }

  // ---------------------------------------------------------------------
  // 8b. Streak / tier / event multipliers.
  //
  //     Only for an approved photo: a rejected one earns nothing, and reading
  //     the context would be a wasted round trip on the unhappy path. The
  //     numbers still come from the server alone — the client has no say in
  //     what streak it is on any more than it does in what a can is worth.
  // ---------------------------------------------------------------------
  const scoring =
    status === 'approved'
      ? await getScoringContext(admin, user.id)
      : null;

  const award =
    scoring && status === 'approved'
      ? computeAward({
          basePoints: calculatedPoints,
          lifetimePoints: scoring.lifetimePoints,
          streakDays: scoring.streakDays,
          eventMultiplier: scoring.eventMultiplier,
          eventName: scoring.eventName,
        })
      : null;

  const pointsEarned = award?.finalPoints ?? 0;

  // ---------------------------------------------------------------------
  // 9. Upload the image to the private bucket.
  // ---------------------------------------------------------------------
  const extension = mimeType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg';
  const storagePath = `${user.id}/${imageHash}.${extension}`;

  const { error: uploadError } = await admin.storage
    .from('submissions')
    .upload(storagePath, buffer, {
      contentType: mimeType,
      upsert: true,
    });

  if (uploadError) {
    return fail('อัปโหลดรูปไม่สำเร็จ ลองใหม่อีกครั้งนะ', 500);
  }

  // ---------------------------------------------------------------------
  // 10. Insert the submission, then award points (service role only).
  // ---------------------------------------------------------------------
  const { error: insertError } = await admin.from('submissions').insert({
    user_id: user.id,
    image_url: storagePath,
    image_hash: imageHash,
    image_phash: imagePhash,
    ai_result: {
      ...visionResult,
      raw: outcome.raw,
      calculated_points: calculatedPoints,
      raw_points: rawPoints,
      capped: wasCapped,
      // The multiplier breakdown, kept verbatim so "why did I get 46?" can be
      // answered from the row itself months later, without re-running scoring
      // against price lists and bonus periods that have since changed.
      bonuses: award?.bonuses ?? [],
      streak_days: scoring?.streakDays ?? null,
      award_capped: award?.capped ?? false,
    },
    points_earned: pointsEarned,
    base_points: status === 'approved' ? calculatedPoints : 0,
    multiplier: award?.multiplier ?? 1,
    grams_total: status === 'approved' ? gramsTotal : 0,
    status,
    reject_reason: rejectReason,
  });

  if (insertError) {
    return fail('บันทึกข้อมูลไม่สำเร็จ ลองใหม่อีกครั้งนะ', 500);
  }

  let newBalance: number | undefined;

  if (pointsEarned > 0) {
    const { data: balance, error: pointsError } = await admin.rpc('add_points', {
      p_user_id: user.id,
      p_delta: pointsEarned,
    });

    if (pointsError) {
      return fail('ให้แต้มไม่สำเร็จ กรุณาติดต่อผู้ดูแลระบบ', 500, {
        status,
        points_earned: 0,
      });
    }

    newBalance = balance as number;
  }

  // ---------------------------------------------------------------------
  // 11. Answer in Thai.
  // ---------------------------------------------------------------------
  let message: string;

  if (status !== 'approved') {
    message = rejectReason ?? 'รูปนี้ไม่ผ่านการตรวจสอบ';
  } else {
    message = `เยี่ยมมาก! ได้ ${pointsEarned} แต้ม 🎉`;

    // Say the bonus out loud. A multiplier the user cannot see is a multiplier
    // that changes no behaviour, and the whole point of a streak is that it is
    // felt on the day it pays out.
    if (award && award.bonusPoints > 0) {
      message += ` (${calculatedPoints} × ${award.multiplier} — ${award.bonuses
        .map((b) => b.label_th)
        .join(' + ')})`;
    }

    if (wasCapped) {
      message += ` · สูงสุด ${MAX_BASE_POINTS} แต้มต่อรูป ครั้งหน้าแบ่งถ่ายหลายรูปได้แต้มเต็มกว่านะ`;
    }

    if (gramsTotal > 0) {
      message += ` · รีไซเคิลไป ${formatWeightTh(gramsTotal)}`;
    }
  }

  return NextResponse.json<SubmitResponse>({
    ok: true,
    status,
    points_earned: pointsEarned,
    points_balance: newBalance,
    items: itemBreakdown,
    message,
    reject_reason: rejectReason ?? undefined,
    base_points: status === 'approved' ? calculatedPoints : undefined,
    multiplier: award?.multiplier,
    bonuses: award?.bonuses,
    grams: status === 'approved' ? gramsTotal : undefined,
    streak_days: scoring?.streakDays,
  });
}
