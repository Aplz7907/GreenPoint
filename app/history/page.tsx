import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient, getProfile } from '@/lib/supabase/server';
import { AppHeader, PageMain } from '@/components/AppHeader';
import { BottomNav } from '@/components/BottomNav';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CoinIcon,
  GiftIcon,
  HistoryIcon,
  ScanIcon,
  TargetIcon,
} from '@/components/Icons';
import {
  LEDGER_TINTS,
  WASTE_LABELS,
  formatPoints,
  formatThaiDateTime,
} from '@/lib/copy';
import type {
  DetectedItem,
  LedgerEntry,
  Redemption,
  Reward,
  Submission,
  WasteCode,
} from '@/lib/types';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'ประวัติแต้ม — Green Point',
};

const PAGE_SIZE = 10;

/**
 * How far back the ledger reaches.
 *
 * The three sources live in three tables with three timestamps, so a merged
 * list cannot be paged by the database — page 3 of the merge is not page 3 of
 * anything. Pulling a bounded slice of each and merging in memory is the honest
 * version of that: the window is finite and stated, rather than a LIMIT/OFFSET
 * that silently returns the wrong rows once a user has both kinds of entry.
 */
const LEDGER_WINDOW = 150;

type TabKey = 'all' | 'earned' | 'spent';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'all', label: 'ทั้งหมด' },
  { key: 'earned', label: 'ได้รับแต้ม' },
  { key: 'spent', label: 'ใช้แต้ม' },
];

function parseTab(value: string | undefined): TabKey {
  return value === 'earned' || value === 'spent' ? value : 'all';
}

type SubmissionRow = Pick<
  Submission,
  'id' | 'status' | 'points_earned' | 'reject_reason' | 'ai_result' | 'created_at'
>;

type RedemptionRow = Pick<
  Redemption,
  'id' | 'points_spent' | 'code' | 'status' | 'created_at'
> & { reward_id: number };

type MissionClaimRow = {
  mission_id: number;
  points_awarded: number;
  claimed_at: string;
};

/** The code that contributed the most items — what the row is "about". */
function dominantWaste(items: DetectedItem[]): WasteCode | null {
  if (items.length === 0) return null;

  return items.reduce((best, item) => (item.count > best.count ? item : best))
    .type;
}

/**
 * "สแกนขวดพลาสติก" — the row title names the thing, the way the prototype's
 * ledger does. Ten identical "ส่งขยะรีไซเคิล" lines are unreadable.
 */
function submissionTitle(waste: WasteCode | null, status: string): string {
  if (status === 'rejected') return 'สแกนไม่ผ่าน';
  if (!waste) return 'สแกนขยะรีไซเคิล';
  return `สแกน${WASTE_LABELS[waste]?.th ?? 'ขยะรีไซเคิล'}`;
}

/** The detail line: what was actually in the photo, or why it was refused. */
function submissionDetail(
  row: SubmissionRow,
  items: DetectedItem[]
): string | null {
  if (row.status === 'rejected' && row.reject_reason) return row.reject_reason;

  if (items.length > 0) {
    return items
      .map(
        (item) => `${WASTE_LABELS[item.type]?.th ?? item.type} ×${item.count}`
      )
      .join(', ');
  }

  return (row.ai_result?.notes as string | undefined) ?? null;
}

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: { page?: string; tab?: string };
}) {
  const profile = await getProfile();
  if (!profile) redirect('/login');

  const tab = parseTab(searchParams.tab);
  const page = Math.max(1, Number(searchParams.page) || 1);

  const supabase = createClient();

  const [submissionsRes, redemptionsRes, claimsRes] = await Promise.all([
    supabase
      .from('submissions')
      .select('id, status, points_earned, reject_reason, ai_result, created_at')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(LEDGER_WINDOW),
    supabase
      .from('redemptions')
      .select('id, reward_id, points_spent, code, status, created_at')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(LEDGER_WINDOW),
    supabase
      .from('user_missions')
      .select('mission_id, points_awarded, claimed_at')
      .eq('user_id', profile.id)
      .order('claimed_at', { ascending: false })
      .limit(LEDGER_WINDOW),
  ]);

  const submissions = (submissionsRes.data ?? []) as SubmissionRow[];
  const redemptions = (redemptionsRes.data ?? []) as RedemptionRow[];
  const claims = (claimsRes.data ?? []) as MissionClaimRow[];

  // Names for the two id-only sources. Both tables are small reference lists,
  // and neither read happens at all when the user has no rows of that kind.
  const [rewardsRes, missionsRes] = await Promise.all([
    redemptions.length > 0
      ? supabase
          .from('rewards')
          .select('id, name')
          .in('id', Array.from(new Set(redemptions.map((r) => r.reward_id))))
      : Promise.resolve({ data: [] }),
    claims.length > 0
      ? supabase
          .from('missions')
          .select('id, title_th')
          .in('id', Array.from(new Set(claims.map((c) => c.mission_id))))
      : Promise.resolve({ data: [] }),
  ]);

  const rewardNames = new Map(
    ((rewardsRes.data ?? []) as Pick<Reward, 'id' | 'name'>[]).map((r) => [
      r.id,
      r.name,
    ])
  );
  const missionNames = new Map(
    ((missionsRes.data ?? []) as { id: number; title_th: string }[]).map((m) => [
      m.id,
      m.title_th,
    ])
  );

  const entries: LedgerEntry[] = [
    ...submissions.map<LedgerEntry>((row) => {
      const items = (row.ai_result?.items ?? []) as DetectedItem[];
      const waste = dominantWaste(items);

      return {
        id: `s-${row.id}`,
        kind: 'submission',
        points: row.points_earned,
        title: submissionTitle(waste, row.status),
        detail: submissionDetail(row, items),
        created_at: row.created_at,
        status: row.status,
        waste,
      };
    }),
    ...claims.map<LedgerEntry>((row) => ({
      id: `m-${row.mission_id}`,
      kind: 'mission',
      points: row.points_awarded,
      title: missionNames.get(row.mission_id) ?? 'ภารกิจรักษ์โลก',
      detail: 'ทำภารกิจสำเร็จ',
      created_at: row.claimed_at,
    })),
    ...redemptions.map<LedgerEntry>((row) => ({
      id: `r-${row.id}`,
      kind: 'redemption',
      points: -row.points_spent,
      title: rewardNames.get(row.reward_id) ?? 'แลกของรางวัล',
      detail: row.status === 'used' ? 'ใช้โค้ดแล้ว' : 'ยังไม่ได้ใช้โค้ด',
      created_at: row.created_at,
      code: row.code,
    })),
  ].sort((a, b) => b.created_at.localeCompare(a.created_at));

  const filtered =
    tab === 'earned'
      ? entries.filter((e) => e.points > 0)
      : tab === 'spent'
        ? entries.filter((e) => e.points < 0)
        : entries;

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visible = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  const pageHref = (n: number) =>
    tab === 'all' ? `/history?page=${n}` : `/history?tab=${tab}&page=${n}`;

  return (
    <div className="min-h-dvh">
      <AppHeader title="ประวัติแต้ม" backHref="/" />

      <PageMain>
        {/* The balance leads, as it does on the prototype's history screen: the
            list below is only ever read to explain this number. */}
        <section className="rounded-card bg-gradient-to-b from-primary-soft to-ok-soft p-5 text-center ring-1 ring-inset ring-ok-line">
          <p className="flex items-center justify-center gap-1.5 text-sm text-ok-ink">
            <CoinIcon className="h-4 w-4 text-warn-ink" aria-hidden />
            แต้มคงเหลือ
          </p>
          <p className="mt-1 flex items-baseline justify-center gap-1.5">
            <span className="font-display text-4xl font-bold tracking-tight nums text-ink">
              {formatPoints(profile.points_balance)}
            </span>
            <span className="text-sm text-ink-subtle">แต้ม</span>
          </p>
        </section>

        <nav className="seg mt-4">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={t.key === 'all' ? '/history' : `/history?tab=${t.key}`}
              aria-current={t.key === tab ? 'page' : undefined}
              className={`seg-item ${
                t.key === tab ? 'seg-item-on' : 'seg-item-off'
              }`}
            >
              {t.label}
            </Link>
          ))}
        </nav>

        {visible.length === 0 ? (
          <div className="card mt-4 text-center">
            <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-primary-ink">
              <HistoryIcon className="h-6 w-6" />
            </span>
            <p className="mt-3 font-medium">
              {tab === 'spent' ? 'ยังไม่เคยใช้แต้ม' : 'ยังไม่มีรายการ'}
            </p>
            <p className="mt-1 text-sm text-ink-subtle">
              {tab === 'spent'
                ? 'เก็บแต้มไว้แลกของรางวัลได้เลย'
                : 'สแกนขยะชิ้นแรกของคุณ แล้วเริ่มเก็บแต้มกันเลย'}
            </p>
            <Link
              href={tab === 'spent' ? '/rewards' : '/submit'}
              className="btn-primary mt-4 w-full"
            >
              {tab === 'spent' ? 'ดูของรางวัล' : 'สแกนขยะ'}
            </Link>
          </div>
        ) : (
          <ul className="list-surface mt-4">
            {visible.map((entry) => {
              // Tint by what the row is, so the list is scannable by colour
              // before it is read: waste type for scans, one tint each for
              // missions and for the rows that spend.
              const tint =
                LEDGER_TINTS[
                  entry.kind === 'submission'
                    ? (entry.waste ?? 'default')
                    : entry.kind
                ] ?? LEDGER_TINTS.default;

              return (
                <li key={entry.id} className="p-4">
                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-control ${tint}`}
                    >
                      {entry.kind === 'redemption' ? (
                        <GiftIcon className="h-5 w-5" />
                      ) : entry.kind === 'mission' ? (
                        <TargetIcon className="h-5 w-5" />
                      ) : (
                        <ScanIcon className="h-5 w-5" />
                      )}
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {entry.title}
                      </p>
                      <p className="mt-0.5 text-xs text-ink-subtle nums">
                        {formatThaiDateTime(entry.created_at)}
                      </p>
                    </div>

                    <span
                      className={`shrink-0 font-display text-lg font-semibold nums ${
                        entry.points > 0
                          ? 'text-primary-ink'
                          : entry.points < 0
                            ? 'text-danger-ink'
                            : 'text-ink-subtle'
                      }`}
                    >
                      {entry.points > 0
                        ? `+${formatPoints(entry.points)}`
                        : entry.points < 0
                          ? `−${formatPoints(Math.abs(entry.points))}`
                          : '0'}
                    </span>
                  </div>

                  {/* Secondary lines are indented under the title, not under the
                      icon, so the icon column stays a clean rail. */}
                  {(entry.detail || entry.code) && (
                    <div className="mt-1.5 pl-14">
                      {entry.detail && (
                        <p
                          className={`line-clamp-2 text-sm ${
                            entry.status === 'rejected'
                              ? 'text-danger-ink'
                              : 'text-ink-muted'
                          }`}
                        >
                          {entry.detail}
                        </p>
                      )}
                      {entry.code && (
                        <p className="mt-1 font-mono text-sm tracking-wide text-ink">
                          {entry.code}
                        </p>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {totalPages > 1 && (
          <nav className="mt-5 flex items-center justify-between gap-3">
            {safePage > 1 ? (
              <Link href={pageHref(safePage - 1)} className="btn-outline btn-sm">
                <ChevronLeftIcon className="h-4 w-4" />
                ก่อนหน้า
              </Link>
            ) : (
              <span />
            )}

            <span className="text-sm text-ink-subtle nums">
              {safePage} / {totalPages}
            </span>

            {safePage < totalPages ? (
              <Link href={pageHref(safePage + 1)} className="btn-outline btn-sm">
                ถัดไป
                <ChevronRightIcon className="h-4 w-4" />
              </Link>
            ) : (
              <span />
            )}
          </nav>
        )}

        {entries.length >= LEDGER_WINDOW && (
          <p className="mt-4 text-center text-sm text-ink-subtle">
            แสดง {LEDGER_WINDOW} รายการล่าสุดของแต่ละประเภท
          </p>
        )}
      </PageMain>

      <BottomNav />
    </div>
  );
}
