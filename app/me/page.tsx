import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient, getProfile } from '@/lib/supabase/server';
import { AppHeader, PageMain } from '@/components/AppHeader';
import { BottomNav } from '@/components/BottomNav';
import { TierBadge } from '@/components/TierBadge';
import {
  BookIcon,
  ChevronRightIcon,
  FlameIcon,
  GiftIcon,
  HistoryIcon,
  MapPinIcon,
  ScaleIcon,
  SettingsIcon,
  TargetIcon,
  TrophyIcon,
  UserIcon,
} from '@/components/Icons';
import { formatPoints } from '@/lib/copy';
import {
  formatWeightTh,
  nextTierAfter,
  tierFor,
  tierProgress,
} from '@/lib/scoring';
import type { MyStats } from '@/lib/types';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'ฉัน — Green Point',
};

/** One row of the settings-style link list. */
function MenuRow({
  icon,
  label,
  hint,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  href: string;
}) {
  return (
    <li>
      <Link
        href={href}
        className="flex items-center gap-3 p-4 transition-colors hover:bg-surface-sunken"
      >
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-primary-soft text-primary-ink">
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium">{label}</span>
          {hint && (
            <span className="block truncate text-xs text-ink-subtle">
              {hint}
            </span>
          )}
        </span>
        <ChevronRightIcon className="h-5 w-5 shrink-0 text-ink-subtle" />
      </Link>
    </li>
  );
}

function Stat({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center rounded-card border border-line bg-surface px-1.5 py-4 text-center shadow-soft">
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary-soft text-primary-ink">
        {icon}
      </span>
      <span className="mt-2 block whitespace-nowrap font-display text-lg font-semibold tracking-tight nums text-ink">
        {value}
      </span>
      <span className="mt-0.5 block text-xs text-ink-subtle">{label}</span>
    </div>
  );
}

export default async function MePage() {
  const profile = await getProfile();
  if (!profile) redirect('/login');

  const supabase = createClient();
  const { data } = await supabase.rpc('get_my_stats');

  const stats = (data as MyStats | null) ?? {
    lifetime_points: profile.points_balance,
    grams: 0,
    submissions_count: 0,
    streak_days: 0,
    rank: 0,
    total_players: 0,
  };

  const tier = tierFor(stats.lifetime_points);
  const nextTier = nextTierAfter(tier);
  const progress = Math.round(tierProgress(stats.lifetime_points) * 100);

  const name = profile.display_name?.trim() || 'สมาชิก Green Point';
  const initial = name.slice(0, 1);

  return (
    <div className="min-h-dvh">
      <AppHeader title="ฉัน" />

      <PageMain>
        {/* ------------------------------------------------------- identity */}
        <section className="card">
          <div className="flex items-center gap-3.5">
            <span
              className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary text-xl font-semibold text-primary-on"
              aria-hidden
            >
              {initial}
            </span>

            <div className="min-w-0 flex-1">
              <h2 className="truncate font-semibold leading-tight">{name}</h2>
              {profile.email && (
                <p className="mt-0.5 truncate text-sm text-ink-subtle">
                  {profile.email}
                </p>
              )}
              <div className="mt-1.5">
                <TierBadge tier={tier} showMultiplier />
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-control bg-surface-sunken p-3.5">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm text-ink-subtle">แต้มคงเหลือ</span>
              <span className="font-display text-2xl font-bold nums text-primary-ink">
                {formatPoints(profile.points_balance)}
              </span>
            </div>

            <div
              className="meter mt-3 bg-surface"
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="ความคืบหน้าสู่ระดับถัดไป"
            >
              <div className="meter-fill" style={{ width: `${progress}%` }} />
            </div>

            <p className="mt-2 text-xs text-ink-subtle">
              {nextTier
                ? `อีก ${formatPoints(
                    nextTier.minLifetimePoints - stats.lifetime_points
                  )} แต้มสะสม → ระดับ${nextTier.name_th}`
                : 'ถึงระดับสูงสุดแล้ว'}
            </p>
          </div>
        </section>

        {/* ---------------------------------------------------------- stats */}
        <section className="mt-4 grid grid-cols-3 gap-2.5">
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
          />
        </section>

        {/* ----------------------------------------------------------- menu */}
        <h2 className="section-title mb-3 mt-8">แต้มของฉัน</h2>
        <ul className="list-surface">
          <MenuRow
            icon={<HistoryIcon className="h-5 w-5" />}
            label="ประวัติแต้ม"
            hint="รายการได้รับและใช้แต้มทั้งหมด"
            href="/history"
          />
          <MenuRow
            icon={<GiftIcon className="h-5 w-5" />}
            label="แลกของรางวัล"
            hint={`มี ${formatPoints(profile.points_balance)} แต้มให้ใช้`}
            href="/rewards"
          />
          <MenuRow
            icon={<TargetIcon className="h-5 w-5" />}
            label="ภารกิจรักษ์โลก"
            hint="ทำภารกิจรับแต้มเพิ่ม"
            href="/missions"
          />
        </ul>

        <h2 className="section-title mb-3 mt-6">ทั่วไป</h2>
        <ul className="list-surface">
          <MenuRow
            icon={<TrophyIcon className="h-5 w-5" />}
            label="อันดับ"
            hint={
              stats.total_players > 0
                ? `จากผู้เล่น ${formatPoints(stats.total_players)} คน`
                : undefined
            }
            href="/leaderboard"
          />
          <MenuRow
            icon={<SettingsIcon className="h-5 w-5" />}
            label="คณะและการแสดงชื่อ"
            hint="ตั้งค่าได้ที่หน้าอันดับ"
            href="/leaderboard"
          />
          <MenuRow
            icon={<BookIcon className="h-5 w-5" />}
            label="คู่มือแยกขยะ"
            hint="รับอะไรบ้าง ได้กี่แต้ม"
            href="/guide"
          />
          <MenuRow
            icon={<MapPinIcon className="h-5 w-5" />}
            label="จุดรับขยะ"
            hint="เอาขยะไปส่งที่ไหน"
            href="/dropoff"
          />
        </ul>

        {/* Sign-out lives here rather than in the home header, which is where
            the prototype puts the account controls — and it keeps the one
            destructive action on the screen that is about the account. */}
        <form action="/auth/signout" method="post" className="mt-6">
          <button type="submit" className="btn-outline w-full">
            <UserIcon className="h-5 w-5" />
            ออกจากระบบ
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-ink-subtle">
          Green Point · เปลี่ยนขยะให้เป็นแต้ม
        </p>
      </PageMain>

      <BottomNav />
    </div>
  );
}
