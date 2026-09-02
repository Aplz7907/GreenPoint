import type { SubmissionStatus, WasteCode } from './types';

/** Thai label + emoji per waste code. name_th in the DB is authoritative for
 *  points; this is only for icons and fallback labels in the UI. */
export const WASTE_LABELS: Record<WasteCode, { th: string; emoji: string }> = {
  plastic_bottle: { th: 'ขวดพลาสติก', emoji: '🧴' },
  can: { th: 'กระป๋อง', emoji: '🥫' },
  glass_bottle: { th: 'ขวดแก้ว', emoji: '🍾' },
  paper_carton: { th: 'กล่องกระดาษ', emoji: '📦' },
};

/**
 * A quiet tinted chip per state — enough to scan, not enough to shout.
 *
 * Semantic tokens, not raw Tailwind palette entries: `bg-green-50` is white-ish
 * and would vanish on a dark surface, whereas `bg-ok-soft` is defined once per
 * theme in globals.css and is already correct in both.
 */
export const STATUS_LABELS: Record<
  SubmissionStatus,
  { th: string; className: string }
> = {
  approved: {
    th: 'ผ่าน',
    className: 'bg-ok-soft text-ok-ink',
  },
  pending_review: {
    th: 'รอตรวจ',
    className: 'bg-warn-soft text-warn-ink',
  },
  rejected: {
    th: 'ไม่ผ่าน',
    className: 'bg-danger-soft text-danger-ink',
  },
};

/** "3 นาทีที่แล้ว" — no date library needed. */
export function timeAgoTh(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60_000);

  if (mins < 1) return 'เมื่อสักครู่';
  if (mins < 60) return `${mins} นาทีที่แล้ว`;

  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ชั่วโมงที่แล้ว`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} วันที่แล้ว`;

  return new Date(iso).toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatPoints(n: number): string {
  return n.toLocaleString('th-TH');
}

/**
 * "25 พ.ค. 2567 10:30" — Buddhist-era date and time, as the prototype's
 * history rows show it.
 *
 * The list is a ledger. `timeAgoTh` is right when the question is "did that
 * just happen?", but a row that explains where 100 points went has to answer
 * "when exactly?", and "3 วันที่แล้ว" cannot be checked against anything.
 */
export function formatThaiDateTime(iso: string): string {
  const d = new Date(iso);

  const date = d.toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const time = d.toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return `${date} ${time}`;
}

/**
 * Tinted icon chips for the history ledger, keyed by waste code.
 *
 * The prototype gives every row a differently-tinted rounded square, which is
 * what makes a list of near-identical lines scannable — you find last week's
 * glass entry by its colour, not by reading five labels. Redemptions get the
 * danger tint because they are the only rows that spend.
 */
export const LEDGER_TINTS: Record<string, string> = {
  plastic_bottle: 'bg-info-soft text-info-ink',
  can: 'bg-ok-soft text-ok-ink',
  glass_bottle: 'bg-primary-soft text-primary-ink',
  paper_carton: 'bg-warn-soft text-warn-ink',
  mission: 'bg-primary-soft text-primary-ink',
  redemption: 'bg-danger-soft text-danger-ink',
  default: 'bg-surface-sunken text-ink-muted',
};
