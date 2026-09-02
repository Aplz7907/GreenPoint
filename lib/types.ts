/** The four accepted waste codes. Must stay in sync with waste_types.code. */
export const WASTE_CODES = [
  'plastic_bottle',
  'can',
  'glass_bottle',
  'paper_carton',
] as const;

export type WasteCode = (typeof WASTE_CODES)[number];

export type SubmissionStatus = 'approved' | 'pending_review' | 'rejected';

export interface Profile {
  id: string;
  display_name: string | null;
  points_balance: number;
  is_banned: boolean;
  created_at: string;
  email?: string | null;
  /** Which faculty this user competes for, or null if they never picked one. */
  faculty_id?: number | null;
  /** Opt-OUT of the individual leaderboard. Faculty totals still include them. */
  show_on_leaderboard?: boolean;
}

export interface Faculty {
  id: number;
  name_th: string;
  /** Which มทร.อีสาน campus the unit belongs to. Null only on the retired
   *  placeholder rows, which no picker shows. */
  campus_th: string | null;
  is_active: boolean;
}

export interface WasteType {
  id: number;
  code: WasteCode;
  name_th: string;
  points_per_item: number;
  /** Reference weight of one item, in grams. Drives the impact figure only. */
  gram_per_item: number;
  is_active: boolean;
}

/** One item as reported by Gemini. */
export interface DetectedItem {
  type: WasteCode;
  count: number;
  confidence: number;
}

/** The shape we require back from Gemini, after defensive parsing. */
export interface AiVisionResult {
  items: DetectedItem[];
  is_recyclable_photo: boolean;
  is_screen_photo: boolean;
  notes: string;
}

export interface Submission {
  id: string;
  user_id: string;
  image_url: string | null;
  image_hash: string;
  image_phash: string | null;
  ai_result: Record<string, unknown> | null;
  points_earned: number;
  /** What the price list alone said, before streak/tier/event multipliers. */
  base_points: number;
  /** The product of those multipliers, as actually applied. */
  multiplier: number;
  /** Reference weight recycled by this submission, in grams. */
  grams_total: number;
  status: SubmissionStatus;
  reject_reason: string | null;
  created_at: string;
}

export interface Reward {
  id: number;
  name: string;
  description: string | null;
  points_cost: number;
  stock: number;
  is_active: boolean;
  /** The shop honouring this reward, or null for a Green Point-issued one. */
  partner_id?: number | null;
}

/**
 * A reward with its partner embedded, as PostgREST returns the nested select.
 * Kept separate from Reward so the flat shape stays the one most code sees.
 */
export interface RewardWithPartner extends Reward {
  partners: { name: string; emoji: string } | null;
}

export interface Redemption {
  id: string;
  user_id: string;
  reward_id: number;
  points_spent: number;
  code: string;
  status: 'active' | 'used';
  created_at: string;
}

/** The running event from bonus_periods, or null when none is active. */
export interface ActiveBonus {
  name_th: string;
  multiplier: number;
  ends_at: string;
}

/** What get_my_stats() returns — one round trip for the whole profile header. */
export interface MyStats {
  lifetime_points: number;
  grams: number;
  submissions_count: number;
  streak_days: number;
  rank: number;
  total_players: number;
}

/**
 * One row of get_leaderboard(). Deliberately has no user id: the function
 * returns is_me instead, so a row can be highlighted but never correlated back
 * to an account.
 */
export interface LeaderboardRow {
  rank: number;
  display_name: string;
  faculty_th: string | null;
  lifetime_points: number;
  grams: number;
  is_me: boolean;
}

/** One row of get_faculty_leaderboard(). Ranked by avg_points, not the sum. */
export interface FacultyStanding {
  rank: number;
  faculty_th: string;
  campus_th: string | null;
  member_count: number;
  lifetime_points: number;
  avg_points: number;
  grams: number;
  is_mine: boolean;
}

/** What POST /api/submit returns. The client renders this and nothing else. */
export interface SubmitResponse {
  ok: boolean;
  status?: SubmissionStatus;
  points_earned?: number;
  points_balance?: number;
  items?: Array<DetectedItem & { name_th: string; points: number }>;
  message: string;
  reject_reason?: string;
  /** Points before multipliers, so the UI can show "40 × 1.15 = 46". */
  base_points?: number;
  multiplier?: number;
  /** Which multipliers fired, already filtered to the ones above ×1. */
  bonuses?: Array<{ key: string; label_th: string; multiplier: number }>;
  /** Reference weight of this haul, in grams. */
  grams?: number;
  /** Streak AFTER this submission — the number worth celebrating. */
  streak_days?: number;
}

/** A shop that honours Green Point rewards. Read-only reference data. */
export interface Partner {
  id: number;
  name: string;
  category_th: string | null;
  description: string | null;
  emoji: string;
  address_th: string | null;
  is_active: boolean;
}

/** A physical place waste can be handed over. */
export interface DropOffPoint {
  id: number;
  name_th: string;
  detail_th: string | null;
  hours_th: string | null;
  lat: number | null;
  lng: number | null;
  /** waste_types.code values accepted here. Empty means "everything". */
  accepts: WasteCode[];
  is_active: boolean;
}

/** How a mission's progress is measured. Mirrors missions.kind. */
export type MissionKind = 'submit_count' | 'grams' | 'streak';

/**
 * One row of get_my_missions().
 *
 * `progress` is already clamped to `target` by the database, so the UI can
 * divide the two without guarding against a bar wider than its track.
 */
export interface MissionProgress {
  id: number;
  code: string;
  title_th: string;
  description_th: string | null;
  kind: MissionKind;
  target: number;
  reward_points: number;
  ends_at: string | null;
  sort_order: number;
  progress: number;
  claimed: boolean;
  claimed_at: string | null;
}

/** What claim_mission() returns on success. */
export interface ClaimResult {
  mission_id: number;
  title_th: string;
  points_awarded: number;
  points_balance: number;
}

/**
 * One line of the points ledger on /history.
 *
 * Submissions, mission claims and redemptions are three different tables with
 * three different shapes; the history page merges them into this so the list
 * has one renderer instead of a switch inside every row.
 */
export interface LedgerEntry {
  id: string;
  kind: 'submission' | 'mission' | 'redemption';
  /** Signed: positive for the two ways points arrive, negative for spending. */
  points: number;
  title: string;
  detail: string | null;
  created_at: string;
  /** Submissions only — the rest are always settled. */
  status?: SubmissionStatus;
  /**
   * The dominant waste code in a submission, used to tint the row's icon.
   * Null on mission and redemption rows, which have tints of their own.
   */
  waste?: WasteCode | null;
  /** Redemptions only — the coupon code to show at the counter. */
  code?: string;
}
