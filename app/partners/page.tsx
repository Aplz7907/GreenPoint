import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient, getProfile } from '@/lib/supabase/server';
import { AppHeader, PageMain } from '@/components/AppHeader';
import { BottomNav } from '@/components/BottomNav';
import { GiftIcon, MapPinIcon, StoreIcon } from '@/components/Icons';
import { formatPoints } from '@/lib/copy';
import type { Partner, Reward } from '@/lib/types';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'ร้านค้าพันธมิตร — Green Point',
};

type PartnerReward = Pick<Reward, 'id' | 'name' | 'points_cost'> & {
  partner_id: number | null;
};

export default async function PartnersPage() {
  const profile = await getProfile();
  if (!profile) redirect('/login');

  const supabase = createClient();

  // Two flat reads rather than a join: RLS already limits both to the active
  // rows, and grouping four rewards under four partners in JS is cheaper than
  // teaching PostgREST to nest them.
  const [partnersRes, rewardsRes] = await Promise.all([
    supabase
      .from('partners')
      .select('id, name, category_th, description, emoji, address_th, is_active')
      .eq('is_active', true)
      .order('id'),
    supabase
      .from('rewards')
      .select('id, name, points_cost, partner_id')
      .eq('is_active', true)
      .order('points_cost'),
  ]);

  const partners = (partnersRes.data ?? []) as Partner[];
  const rewards = (rewardsRes.data ?? []) as PartnerReward[];

  const rewardsByPartner = new Map<number, PartnerReward[]>();
  for (const reward of rewards) {
    if (reward.partner_id == null) continue;
    const list = rewardsByPartner.get(reward.partner_id) ?? [];
    list.push(reward);
    rewardsByPartner.set(reward.partner_id, list);
  }

  return (
    <div className="min-h-dvh">
      <AppHeader
        title="ร้านค้าพันธมิตร"
        backHref="/"
        subtitle="ร้านที่รับโค้ดแลกของรางวัลจาก Green Point"
      />

      <PageMain>
        {partners.length === 0 ? (
          <div className="card text-center">
            <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-primary-ink">
              <StoreIcon className="h-6 w-6" />
            </span>
            <p className="mt-3 font-medium">ยังไม่มีร้านค้าพันธมิตร</p>
            <p className="mt-1 text-sm text-ink-subtle">
              ของรางวัลที่มีอยู่ยังแลกได้ตามปกตินะ
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {partners.map((partner) => {
              const partnerRewards = rewardsByPartner.get(partner.id) ?? [];

              return (
                <li key={partner.id} className="card">
                  <div className="flex items-start gap-3">
                    <span
                      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xl"
                      aria-hidden
                    >
                      {partner.emoji}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-medium leading-snug">
                          {partner.name}
                        </h3>
                        {partner.category_th && (
                          <span className="badge shrink-0 bg-surface-sunken text-ink-muted">
                            {partner.category_th}
                          </span>
                        )}
                      </div>

                      {partner.description && (
                        <p className="mt-0.5 text-sm text-ink-subtle">
                          {partner.description}
                        </p>
                      )}

                      {partner.address_th && (
                        <p className="mt-1.5 flex items-center gap-1.5 text-sm text-ink-muted">
                          <MapPinIcon className="h-4 w-4 shrink-0 text-ink-subtle" />
                          {partner.address_th}
                        </p>
                      )}
                    </div>
                  </div>

                  {partnerRewards.length > 0 && (
                    <ul className="mt-3 space-y-1.5 border-t border-line pt-3">
                      {partnerRewards.map((reward) => (
                        <li
                          key={reward.id}
                          className="flex items-baseline justify-between gap-3 text-sm"
                        >
                          <span className="min-w-0 truncate text-ink-muted">
                            {reward.name}
                          </span>
                          <span className="shrink-0 whitespace-nowrap font-medium nums text-primary-ink">
                            {formatPoints(reward.points_cost)} แต้ม
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <Link href="/rewards" className="btn-primary mt-6 w-full">
          <GiftIcon className="h-5 w-5" />
          ไปแลกของรางวัล
        </Link>

        <p className="mt-4 text-center text-sm text-ink-subtle">
          อยากให้ร้านของคุณเข้าร่วม? ติดต่อผู้ดูแลโครงการได้เลย
        </p>
      </PageMain>

      <BottomNav />
    </div>
  );
}
