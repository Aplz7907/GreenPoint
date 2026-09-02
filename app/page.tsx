import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient, getProfile } from '@/lib/supabase/server';
import { PageMain } from '@/components/AppHeader';
import { BottomNav } from '@/components/BottomNav';
import { StatusBadge } from '@/components/StatusBadge';
import { TierBadge } from '@/components/TierBadge';
import { ThemeToggle } from '@/components/ThemeToggle';
import { HeroClouds, HeroLandscape, HeroMascot } from '@/components/HeroScene';
import {
  BagIcon,
  ChevronRightIcon,
  CoinIcon,
  EarthIcon,
  FlameIcon,
  GiftIcon,
  LeafIcon,
  ScaleIcon,
  ScanIcon,
  SparkIcon,
  TrashIcon,
  TrophyIcon,
} from '@/components/Icons';
import { formatPoints, timeAgoTh } from '@/lib/copy';
import {
  daysToNextStreakStep,
  formatWeightTh,
  nextTierAfter,
  tierFor,
  tierProgress,
} from '@/lib/scoring';
import type {
  ActiveBonus,
  MissionProgress,
  MyStats,
  Submission,
} from '@/lib/types';

export const dynamic = 'force-dynamic';

/** One stat cell. Icon on top so the three read as a row of equals. */
function Stat({
  icon,
  value,
  label,
  href,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  href?: string;
}) {
  const body = (
    <>
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary-soft text-primary-ink">
        {icon}
      </span>
      {/*
        `text-lg` and not `text-xl`, with tight tracking and no wrapping. A
        third of a 320px row is ~73px of usable width, and the weight figure is
        the one value here that can reach "12.5 กก." — at 20px that spills out
        of the cell, and letting it wrap puts the unit on its own line.
      */}
      <span className="mt-2 block whitespace-nowrap font-display text-lg font-semibold tracking-tight nums text-ink">
        {value}
      </span>
      <span className="mt-0.5 block text-xs text-ink-subtle">{label}</span>
    </>
  );

  const className =
    'flex flex-col items-center rounded-card border border-line bg-surface px-1.5 py-4 text-center shadow-soft transition-colors';

  return href ? (
    <Link href={href} className={`${className} hover:border-line-strong`}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

/**
 * One of the four shortcut tiles under the points card.
 *
 * The screens behind them — the sorting guide, the drop-off points, the rewards
 * list and the leaderboard — are all things you consult occasionally, which is
 * exactly what does not deserve a permanent tab.
 */
function Tile({
  icon,
  label,
  href,
  tint,
}: {
  icon: React.ReactNode;
  label: string;
  href: string;
  /**
   * One tint per destination, as on the prototype. Four identical green
   * squares are a texture the eye slides off; four colours give the row four
   * landmarks, and a returning user reaches for the amber one without
   * reading the label under it.
   */
  tint: string;
}) {
  return (
    <Link href={href} className="tile">
      <span
        className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-control ${tint}`}
      >
        {icon}
      </span>
      <span className="tile-label">{label}</span>
    </Link>
  );
}

export default async function HomePage() {
  const profile = await getProfile();
  if (!profile) redirect('/login');

  if (profile.is_banned) {
    return (
      <main className="flex min-h-dvh items-center justify-center px-5">
        <div className="card max-w-md text-center">
          <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-danger-soft text-danger-ink">
            <LeafIcon className="h-6 w-6" />
          </span>
          <h1 className="mt-3 text-lg font-semibold">บัญชีนี้ถูกระงับ</h1>
          <p className="mt-2 text-sm text-ink-subtle">
            หากคิดว่าเป็นความผิดพลาด กรุณาติดต่อผู้ดูแลระบบ
          </p>
          <form action="/auth/signout" method="post">
            <button type="submit" className="btn-outline mt-5 w-full">
              ออกจากระบบ
            </button>
          </form>
        </div>
      </main>
    );
  }

  const supabase = createClient();

  const [submissionsRes, statsRes, bonusRes, missionsRes] = await Promise.all([
    supabase
      .from('submissions')
      .select('id, status, points_earned, created_at, ai_result')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase.rpc('get_my_stats'),
    supabase.rpc('get_active_bonus'),
    supabase.rpc('get_my_missions'),
  ]);

  const recent = (submissionsRes.data ?? []) as Pick<
    Submission,
    'id' | 'status' | 'points_earned' | 'created_at' | 'ai_result'
  >[];

  // A stats failure must not take the page down — the balance above is the
  // thing this screen exists for, and it comes from the profile row.
  const stats = (statsRes.data as MyStats | null) ?? {
    lifetime_points: profile.points_balance,
    grams: 0,
    submissions_count: 0,
    streak_days: 0,
    rank: 0,
    total_players: 0,
  };

  const bonus = (Array.isArray(bonusRes.data) ? bonusRes.data[0] : null) as
    | ActiveBonus
    | null;

  const missions = (missionsRes.data ?? []) as MissionProgress[];
  const claimable = missions.filter((m) => !m.claimed && m.progress >= m.target);
  // The mission the user is furthest along on, so the card names a goal that is
  // actually within reach rather than the first one in the table.
  const nextMission = missions
    .filter((m) => !m.claimed && m.progress < m.target)
    .sort((a, b) => b.progress / b.target - a.progress / a.target)[0];

  const tier = tierFor(stats.lifetime_points);
  const nextTier = nextTierAfter(tier);
  const progress = tierProgress(stats.lifetime_points);
  const toNextStreak = daysToNextStreakStep(stats.streak_days);

  const firstName = profile.display_name?.split(' ')[0] ?? 'คุณ';

  return (
    <div className="min-h-dvh">
      {/* ------------------------------------------------------------- band
          The prototype opens on an illustrated header rather than a title bar:
          the app's promise stated once, in full, before any number. There is no
          AppHeader on this screen for that reason — a second bar above this
          would say the product's name twice. */}
      <header className="hero-band pb-16 pt-5">
        <div className="leaf-field pointer-events-none absolute inset-0" aria-hidden />

        {/* The drawn scene, in three layers so each one can be anchored to the
            edge it belongs to: clouds to the top, park to the horizon, and the
            mascot into the flow beside the headline (below), where it can never
            land on top of the type no matter how the band grows. */}
        <HeroClouds className="pointer-events-none absolute inset-x-0 top-0 h-24 w-full" />
        <HeroLandscape className="pointer-events-none absolute inset-x-0 bottom-0 h-24 w-full" />

        <div className="relative mx-auto max-w-md px-4 sm:max-w-2xl sm:px-6 lg:max-w-4xl">
          <div className="flex items-start justify-between gap-3">
            <span className="flex items-center gap-2">
              <span
                className="inline-flex h-8 w-8 items-center justify-center rounded-control bg-primary text-primary-on shadow-glow"
                aria-hidden
              >
                <LeafIcon className="h-4 w-4" />
              </span>
              <span className="text-sm font-semibold">Green Point</span>
            </span>

            <ThemeToggle className="-mr-2 -mt-1 text-sky-ink/70 hover:bg-sky-ink/10 hover:text-sky-ink" />
          </div>

          <div className="mt-5 flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <h1 className="font-display text-[2rem] font-bold leading-[1.15] tracking-tight">
                สะสมขยะ
                <br />
                แลกแต้ม
                <LeafIcon className="ml-1.5 inline h-6 w-6 align-baseline text-primary" />
              </h1>

              <p className="mt-2.5 text-sm leading-relaxed text-sky-ink/75">
                เปลี่ยนขยะให้เป็นประโยชน์
                <br />
                เพื่อโลกที่น่าอยู่ของเรา
              </p>
            </div>

            {/* -mb-6 lets the mascot sit down into the horizon rather than
                float above it; the band's pb-16 leaves room for that. */}
            <HeroMascot className="-mb-6 h-28 w-28 shrink-0 sm:h-32 sm:w-32" />
          </div>
        </div>
      </header>

      {/* The negative margin is what lifts the points card onto the band, the
          way the prototype overlaps them. It has to live on the main element,
          not on the card, so the rest of the page moves up with it. */}
      <PageMain className="-mt-11">
        {/* ------------------------------------------------------- balance */}
        <section className="animate-fade-up rounded-card border border-line bg-surface p-4 shadow-lift">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm text-ink-subtle">แต้มของฉัน</p>
            <TierBadge tier={tier} showMultiplier />
          </div>

          <div className="mt-1.5 flex items-center justify-between gap-3">
            <p className="flex min-w-0 items-center gap-2">
              <CoinIcon className="h-6 w-6 shrink-0 text-warn-ink" aria-hidden />
              <span className="font-display text-4xl font-bold tracking-tight nums text-ink">
                {formatPoints(profile.points_balance)}
              </span>
              <span className="text-sm text-ink-subtle">แต้ม</span>
            </p>

            <Link
              href="/history"
              className="btn-primary btn-sm shrink-0 rounded-full"
            >
              ดูประวัติแต้ม
            </Link>
          </div>

          <div className="mt-4">
            <div className="flex items-end justify-between gap-3 text-xs text-ink-subtle">
              <span>สวัสดี {firstName}</span>
              <span className="text-right">
                {nextTier
                  ? `อีก ${formatPoints(
                      nextTier.minLifetimePoints - stats.lifetime_points
                    )} แต้ม → ${nextTier.name_th}`
                  : 'ระดับสูงสุดแล้ว'}
              </span>
            </div>

            <div
              className="meter mt-1.5"
              role="progressbar"
              aria-valuenow={Math.round(progress * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="ความคืบหน้าสู่ระดับถัดไป"
            >
              <div
                className="meter-fill"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
          </div>
        </section>

        {bonus && (
          <p className="mt-3 flex items-start gap-2 rounded-control border border-warn-line bg-warn-soft px-3.5 py-2.5 text-sm text-warn-ink">
            <SparkIcon className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              <span className="font-semibold">{bonus.name_th}</span> · ทุกรูปได้แต้ม
              ×{bonus.multiplier} ถึง{' '}
              {new Date(bonus.ends_at).toLocaleDateString('th-TH', {
                day: 'numeric',
                month: 'short',
              })}
            </span>
          </p>
        )}

        {/* ---------------------------------------------------------- tiles */}
        <section className="mt-4 grid grid-cols-4 gap-2">
          <Tile
            icon={<TrashIcon className="h-5 w-5" />}
            label="แยกขยะ"
            href="/guide"
            tint="bg-primary-soft text-primary-ink"
          />
          <Tile
            icon={<BagIcon className="h-5 w-5" />}
            label="บริจาคขยะ"
            href="/dropoff"
            tint="bg-info-soft text-info-ink"
          />
          <Tile
            icon={<GiftIcon className="h-5 w-5" />}
            label="แลกของรางวัล"
            href="/rewards"
            tint="bg-warn-soft text-warn-ink"
          />
          <Tile
            icon={<TrophyIcon className="h-5 w-5" />}
            label="อันดับ"
            href="/leaderboard"
            tint="bg-accent-soft text-accent-ink"
          />
        </section>

        {/* -------------------------------------------------------- mission */}
        {(claimable.length > 0 || nextMission) && (
          <Link
            href="/missions"
            className="mt-4 flex items-center gap-3 overflow-hidden rounded-card bg-gradient-to-br from-primary-soft to-mint/45 p-4 shadow-soft ring-1 ring-inset ring-ok-line transition-shadow hover:shadow-lift"
          >
            <span
              className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
                claimable.length > 0
                  ? 'bg-primary text-primary-on'
                  : 'bg-surface text-primary-ink'
              }`}
            >
              <EarthIcon className="h-6 w-6" />
            </span>

            <span className="min-w-0 flex-1">
              <span className="block font-semibold leading-tight text-ok-ink">
                ภารกิจรักษ์โลก
              </span>

              {claimable.length > 0 ? (
                <span className="mt-0.5 block text-sm text-ok-ink/85">
                  มี {claimable.length} ภารกิจพร้อมรับ +
                  {formatPoints(
                    claimable.reduce((sum, m) => sum + m.reward_points, 0)
                  )}{' '}
                  แต้ม
                </span>
              ) : (
                nextMission && (
                  <>
                    <span className="mt-0.5 block truncate text-sm text-ok-ink/85">
                      {nextMission.title_th} · รับแต้มเพิ่มพิเศษ
                    </span>
                    <span className="meter mt-1.5 block bg-surface/70">
                      <span
                        className="meter-fill block"
                        style={{
                          width: `${Math.round(
                            (nextMission.progress / nextMission.target) * 100
                          )}%`,
                        }}
                      />
                    </span>
                  </>
                )
              )}
            </span>

            <ChevronRightIcon className="h-5 w-5 shrink-0 text-ok-ink/60" />
          </Link>
        )}

        {/* ------------------------------------------------------------ cta */}
        <Link href="/submit" className="btn-primary mt-4 w-full text-base">
          <ScanIcon className="h-5 w-5" />
          สแกนขยะรับแต้ม
        </Link>

        <p className="mt-2 text-center text-sm text-ink-subtle">
          แยกขยะให้เรียบร้อย วางบนพื้นโล่งๆ แล้วถ่ายให้เห็นชัดๆ
        </p>

        {/* ---------------------------------------------------------- stats */}
        <section className="mt-6 grid grid-cols-3 gap-2.5">
          <Stat
            icon={<FlameIcon className="h-5 w-5" />}
            value={String(stats.streak_days)}
            label="วันต่อเนื่อง"
          />
          <Stat
            icon={<ScaleIcon className="h-5 w-5" />}
            value={formatWeightTh(stats.grams)}
            label="รีไซเคิลแล้ว"
          />
          <Stat
            icon={<TrophyIcon className="h-5 w-5" />}
            value={stats.rank > 0 ? `#${stats.rank}` : '—'}
            label="อันดับ"
            href="/leaderboard"
          />
        </section>

        {/* The nudge only appears when there is a concrete next step to name. */}
        {toNextStreak !== null && stats.submissions_count > 0 && (
          <p className="mt-3 text-center text-sm text-ink-subtle">
            ส่งอีก {toNextStreak} วันติด จะได้โบนัสแต้มเพิ่ม
          </p>
        )}

        {/* --------------------------------------------------------- recent */}
        <section className="mt-8">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="section-title">ส่งล่าสุด</h2>
            {recent.length > 0 && (
              <Link
                href="/history"
                className="text-sm font-medium text-primary-ink hover:underline"
              >
                ทั้งหมด
              </Link>
            )}
          </div>

          {recent.length === 0 ? (
            <div className="card text-center">
              <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-primary-ink">
                <ScanIcon className="h-6 w-6" />
              </span>
              <p className="mt-3 font-medium">ยังไม่มีรายการ</p>
              <p className="mt-1 text-sm text-ink-subtle">
                สแกนขยะชิ้นแรกของคุณ แล้วเริ่มเก็บแต้มกันเลย
              </p>
            </div>
          ) : (
            <ul className="list-surface">
              {recent.map((s) => (
                <li key={s.id} className="flex items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={s.status} />
                      <span className="text-sm text-ink-subtle">
                        {timeAgoTh(s.created_at)}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-sm text-ink-muted">
                      {(s.ai_result?.notes as string) ?? 'ส่งรูปขยะรีไซเคิล'}
                    </p>
                  </div>

                  <span
                    className={`shrink-0 font-display text-lg font-semibold nums ${
                      s.points_earned > 0 ? 'text-primary-ink' : 'text-ink-subtle'
                    }`}
                  >
                    {s.points_earned > 0
                      ? `+${formatPoints(s.points_earned)}`
                      : '0'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </PageMain>

      <BottomNav />
    </div>
  );
}
