import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient, getProfile } from '@/lib/supabase/server';
import { AppHeader, PageMain } from '@/components/AppHeader';
import { BottomNav } from '@/components/BottomNav';
import { GiftIcon } from '@/components/Icons';
import { formatPoints, timeAgoTh } from '@/lib/copy';
import type { Redemption, RewardWithPartner } from '@/lib/types';
import { RewardsList } from './RewardsList';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'ของรางวัล — Green Point',
};

type RedemptionWithReward = Redemption & { rewards: { name: string } | null };

export default async function RewardsPage() {
  const profile = await getProfile();
  if (!profile) redirect('/login');

  const supabase = createClient();

  const [{ data: rewards }, { data: redemptions }] = await Promise.all([
    supabase
      .from('rewards')
      .select('id, name, description, points_cost, stock, is_active, partners(name, emoji)')
      .eq('is_active', true)
      .order('points_cost', { ascending: true }),
    supabase
      .from('redemptions')
      .select(
        'id, code, points_spent, status, created_at, reward_id, user_id, rewards(name)'
      )
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  const myRedemptions = (redemptions ?? []) as unknown as RedemptionWithReward[];

  return (
    <div className="min-h-dvh">
      <AppHeader
        title="ของรางวัล"
        actions={
          // The balance belongs in the header on this page specifically: every
          // decision below is "can I afford it", and scrolling away from the
          // number you are comparing against is the whole problem.
          <span className="badge bg-primary-soft text-primary-ink nums">
            {formatPoints(profile.points_balance)} แต้ม
          </span>
        }
      />

      <PageMain>
        <RewardsList
          rewards={(rewards ?? []) as unknown as RewardWithPartner[]}
          balance={profile.points_balance}
        />

        <section className="mt-8">
          <h2 className="section-title mb-3">โค้ดของคุณ</h2>

          {myRedemptions.length === 0 ? (
            <div className="card text-center">
              <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-primary-ink">
                <GiftIcon className="h-6 w-6" />
              </span>
              <p className="mt-3 font-medium">ยังไม่เคยแลกของรางวัล</p>
              <p className="mt-1 text-sm text-ink-subtle">
                เก็บแต้มให้ถึงเป้า แล้วมาแลกกันนะ
              </p>
              <Link href="/submit" className="btn-primary mt-4 w-full">
                ไปเก็บแต้ม
              </Link>
            </div>
          ) : (
            <ul className="space-y-3">
              {myRedemptions.map((r) => {
                const active = r.status === 'active';

                return (
                  <li
                    key={r.id}
                    className={`card ${active ? '' : 'opacity-70'}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">
                          {r.rewards?.name ?? 'ของรางวัล'}
                        </p>
                        <p className="mt-0.5 text-sm text-ink-subtle">
                          {timeAgoTh(r.created_at)} · ใช้ไป{' '}
                          {formatPoints(r.points_spent)} แต้ม
                        </p>
                      </div>
                      <span
                        className={`badge shrink-0 ${
                          active
                            ? 'bg-ok-soft text-ok-ink'
                            : 'bg-surface-sunken text-ink-subtle'
                        }`}
                      >
                        {active ? 'ใช้ได้' : 'ใช้แล้ว'}
                      </span>
                    </div>

                    {/* The code is the product. Make it easy to read and copy —
                        and give a spent code a visibly dead treatment so nobody
                        walks up to a counter with the wrong one. */}
                    <p
                      className={`mt-3 select-all rounded-control border py-3 text-center font-mono text-lg font-semibold tracking-[0.2em] ${
                        active
                          ? 'border-dashed border-primary/40 bg-primary-soft text-primary-ink'
                          : 'border-line bg-surface-sunken text-ink-subtle line-through'
                      }`}
                    >
                      {r.code}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </PageMain>

      <BottomNav />
    </div>
  );
}
