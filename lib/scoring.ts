/**
 * The point economy, in one place and with no I/O.
 *
 * /api/submit is the only caller that matters, but everything here is a pure
 * function of its arguments so the same numbers can be rendered in the UI —
 * "why did I get 46 points?" — without a second implementation drifting away
 * from the first.
 *
 * WHAT MULTIPLIERS DO TO THE ANTI-FRAUD MODEL
 *
 * schema.sql prices rewards on the assumption that the worst a cheater can do
 * is re-photograph one bottle five times a day: 5 × 10 = 50 points/day, which
 * makes the cheapest reward ten days of tedious work for a 10฿ drink.
 *
 * Multipliers inflate that ceiling, so they are capped hard. With
 * MAX_TOTAL_MULTIPLIER at 2.5 the same cheater tops out at 125 points/day —
 * four days of farming for 10฿, still comfortably not worth anyone's time. The
 * cap is what keeps that sentence true; raise it and the reward prices in
 * schema.sql have to move with it.
 *
 * The multipliers are also deliberately unequal in kind. The event bonus is
 * large (×2) and rare. Streak and tier are small (≤×1.15, ≤×1.20) and earned
 * slowly, because a bonus that a cheater can farm their way into is not a
 * loyalty reward — it is just a higher payout for farming.
 */

export type TierKey = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface Tier {
  key: TierKey;
  /** Thai label shown to the user. */
  name_th: string;
  /** Lifetime points earned — never the spendable balance. */
  minLifetimePoints: number;
  multiplier: number;
  /** Tailwind classes for the tier chip. */
  className: string;
}

/**
 * Thresholds are on LIFETIME points, so redeeming a reward can never demote
 * someone. A tier that could be spent away would make the rewards page feel
 * like a punishment.
 *
 * Ordered ascending; tierFor() walks it backwards.
 */
export const TIERS: readonly Tier[] = [
  {
    key: 'bronze',
    name_th: 'บรอนซ์',
    minLifetimePoints: 0,
    multiplier: 1.0,
    className: 'bg-surface-sunken text-ink-muted',
  },
  {
    key: 'silver',
    name_th: 'ซิลเวอร์',
    minLifetimePoints: 1_000,
    multiplier: 1.05,
    className: 'bg-info-soft text-info-ink',
  },
  {
    key: 'gold',
    name_th: 'โกลด์',
    minLifetimePoints: 5_000,
    multiplier: 1.1,
    className: 'bg-warn-soft text-warn-ink',
  },
  {
    key: 'platinum',
    name_th: 'แพลทินัม',
    minLifetimePoints: 15_000,
    multiplier: 1.2,
    className: 'bg-primary-soft text-primary-ink',
  },
] as const;

export function tierFor(lifetimePoints: number): Tier {
  const points = Number.isFinite(lifetimePoints) ? lifetimePoints : 0;

  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (points >= TIERS[i].minLifetimePoints) return TIERS[i];
  }

  return TIERS[0];
}

/** The next tier up, or null at the top. Used for the progress bar. */
export function nextTierAfter(current: Tier): Tier | null {
  const index = TIERS.findIndex((t) => t.key === current.key);
  return index >= 0 && index < TIERS.length - 1 ? TIERS[index + 1] : null;
}

/**
 * Progress toward the next tier, 0–1. Returns 1 at the top tier so the bar
 * reads as "complete" rather than "empty".
 */
export function tierProgress(lifetimePoints: number): number {
  const current = tierFor(lifetimePoints);
  const next = nextTierAfter(current);
  if (!next) return 1;

  const span = next.minLifetimePoints - current.minLifetimePoints;
  const done = lifetimePoints - current.minLifetimePoints;

  return Math.min(1, Math.max(0, done / span));
}

/**
 * Streak tiers. The first step is at 3 days rather than 2 because a two-day
 * streak is mostly luck; three is a habit forming.
 */
export const STREAK_STEPS: readonly { minDays: number; multiplier: number }[] = [
  { minDays: 14, multiplier: 1.15 },
  { minDays: 7, multiplier: 1.1 },
  { minDays: 3, multiplier: 1.05 },
] as const;

export function streakMultiplier(days: number): number {
  const d = Number.isFinite(days) ? days : 0;
  return STREAK_STEPS.find((s) => d >= s.minDays)?.multiplier ?? 1.0;
}

/** Days until the next streak step, or null once the top step is reached. */
export function daysToNextStreakStep(days: number): number | null {
  const steps = [...STREAK_STEPS].reverse(); // ascending
  const next = steps.find((s) => days < s.minDays);
  return next ? next.minDays - days : null;
}

/**
 * Ceiling on the product of every multiplier. See the header — this is the
 * number that keeps farming unprofitable, not a cosmetic limit.
 */
export const MAX_TOTAL_MULTIPLIER = 2.5;

/**
 * Ceiling on what the price list alone may say for one photo.
 *
 * There is no human review in this system, so instead of escalating a
 * suspiciously large haul to a person, we simply refuse to pay more than this
 * for one picture.
 */
export const MAX_BASE_POINTS = 100;

/**
 * Absolute ceiling on one photo, applied after multipliers.
 *
 * MAX_BASE_POINTS caps the price list; this caps the payout. Both exist because
 * they fail differently: the first stops a single implausible photo ("47 cans
 * on one table"), the second stops that photo being multiplied into a jackpot
 * during an event.
 */
export const MAX_AWARD_POINTS = 250;

export interface AwardInput {
  /** Σ count × points_per_item, already capped at MAX_BASE_POINTS. */
  basePoints: number;
  /** Lifetime points BEFORE this submission. */
  lifetimePoints: number;
  /** Consecutive days INCLUDING today, as compute_streak() reports it. */
  streakDays: number;
  /** From bonus_periods, or 1 when no event is running. */
  eventMultiplier?: number;
  eventName?: string | null;
}

export interface AwardBonus {
  key: 'tier' | 'streak' | 'event';
  label_th: string;
  multiplier: number;
}

export interface Award {
  basePoints: number;
  /** Rounded to 2dp so it matches the numeric(4,2) column exactly. */
  multiplier: number;
  finalPoints: number;
  /** Points added purely by multipliers — what the UI celebrates. */
  bonusPoints: number;
  /** Only the multipliers that actually did something. */
  bonuses: AwardBonus[];
  /** True when MAX_TOTAL_MULTIPLIER or MAX_AWARD_POINTS bit. */
  capped: boolean;
}

/**
 * Turn a base price into a final award.
 *
 * Rounding is floor(), not round(): when the arithmetic lands between two
 * integers the house should not be the one that gains, and floor keeps the
 * stored multiplier × base reproducible from the row afterwards.
 */
export function computeAward({
  basePoints,
  lifetimePoints,
  streakDays,
  eventMultiplier = 1,
  eventName = null,
}: AwardInput): Award {
  const base = Math.max(0, Math.floor(basePoints));

  const tier = tierFor(lifetimePoints);
  const streak = streakMultiplier(streakDays);
  const event = Number.isFinite(eventMultiplier) && eventMultiplier > 1 ? eventMultiplier : 1;

  const bonuses: AwardBonus[] = [];

  if (event > 1) {
    bonuses.push({
      key: 'event',
      label_th: eventName?.trim() || 'โบนัสช่วงพิเศษ',
      multiplier: event,
    });
  }
  if (streak > 1) {
    bonuses.push({
      key: 'streak',
      label_th: `ต่อเนื่อง ${streakDays} วัน`,
      multiplier: streak,
    });
  }
  if (tier.multiplier > 1) {
    bonuses.push({
      key: 'tier',
      label_th: `ระดับ${tier.name_th}`,
      multiplier: tier.multiplier,
    });
  }

  const rawMultiplier = tier.multiplier * streak * event;
  const multiplier = Math.round(Math.min(rawMultiplier, MAX_TOTAL_MULTIPLIER) * 100) / 100;

  const uncapped = Math.floor(base * multiplier);
  const finalPoints = Math.min(uncapped, MAX_AWARD_POINTS);

  return {
    basePoints: base,
    multiplier,
    finalPoints,
    bonusPoints: Math.max(0, finalPoints - base),
    bonuses,
    capped: rawMultiplier > MAX_TOTAL_MULTIPLIER || uncapped > MAX_AWARD_POINTS,
  };
}

/** Grams → "1.2 กก." / "340 ก." Weight is an impact figure, not a score. */
export function formatWeightTh(grams: number): string {
  const g = Math.max(0, Math.round(grams));
  if (g < 1000) return `${g.toLocaleString('th-TH')} ก.`;
  return `${(g / 1000).toLocaleString('th-TH', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} กก.`;
}
