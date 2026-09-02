import { redirect } from 'next/navigation';
import { createClient, getProfile } from '@/lib/supabase/server';
import { AppHeader, PageMain } from '@/components/AppHeader';
import { BottomNav } from '@/components/BottomNav';
import { MissionsList } from './MissionsList';
import { TargetIcon } from '@/components/Icons';
import { formatPoints } from '@/lib/copy';
import type { MissionProgress } from '@/lib/types';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'ภารกิจรักษ์โลก — Green Point',
};

export default async function MissionsPage() {
  const profile = await getProfile();
  if (!profile) redirect('/login');

  const supabase = createClient();
  const { data } = await supabase.rpc('get_my_missions');

  // get_my_missions() already orders unclaimed first, then by sort_order.
  const missions = (data ?? []) as MissionProgress[];

  const claimable = missions.filter(
    (m) => !m.claimed && m.progress >= m.target
  ).length;

  const unclaimedPoints = missions
    .filter((m) => !m.claimed)
    .reduce((sum, m) => sum + m.reward_points, 0);

  return (
    <div className="min-h-dvh">
      <AppHeader
        title="ภารกิจรักษ์โลก"
        subtitle={
          claimable > 0
            ? `มี ${claimable} ภารกิจพร้อมรับแต้มแล้ว`
            : 'ทำภารกิจสำเร็จ รับแต้มเพิ่มจากการแยกขยะ'
        }
      />

      <PageMain>
        {missions.length === 0 ? (
          <div className="card text-center">
            <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-primary-ink">
              <TargetIcon className="h-6 w-6" />
            </span>
            <p className="mt-3 font-medium">ยังไม่มีภารกิจในตอนนี้</p>
            <p className="mt-1 text-sm text-ink-subtle">
              ระหว่างนี้ส่งรูปขยะเก็บแต้มไปก่อนได้เลย
            </p>
          </div>
        ) : (
          <>
            {/* The one number that decides whether this page is worth opening:
                how many points are still sitting here unclaimed. */}
            {unclaimedPoints > 0 && (
              <p className="mb-4 flex items-start gap-2 rounded-control border border-line bg-surface-sunken px-3.5 py-2.5 text-sm text-ink-muted">
                <TargetIcon className="mt-0.5 h-4 w-4 shrink-0 text-primary-ink" />
                <span>
                  ยังมีแต้มรออยู่อีก{' '}
                  <span className="font-semibold text-ink">
                    {formatPoints(unclaimedPoints)} แต้ม
                  </span>{' '}
                  จากภารกิจที่ยังทำไม่ครบ
                </span>
              </p>
            )}

            <MissionsList missions={missions} />
          </>
        )}
      </PageMain>

      <BottomNav />
    </div>
  );
}
