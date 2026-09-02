'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Spinner } from '@/components/AuthUI';
import { AlertIcon, CheckIcon, GiftIcon } from '@/components/Icons';
import { formatPoints } from '@/lib/copy';
import type { RewardWithPartner } from '@/lib/types';

/**
 * redeem_reward() raises bare error codes so the UI owns the wording. Anything
 * unmapped still gets a friendly Thai sentence — never a raw Postgres error.
 */
function redeemErrorTh(message: string): string {
  const m = message.toUpperCase();

  if (m.includes('INSUFFICIENT_POINTS')) {
    return 'แต้มไม่พอแลกของรางวัลชิ้นนี้ เก็บเพิ่มอีกนิดนะ';
  }
  if (m.includes('OUT_OF_STOCK')) {
    return 'ของรางวัลชิ้นนี้หมดแล้ว ลองดูชิ้นอื่นนะ';
  }
  if (m.includes('REWARD_NOT_FOUND')) {
    return 'ไม่พบของรางวัลชิ้นนี้แล้ว อาจถูกปิดไปนะ';
  }
  if (m.includes('USER_BANNED')) {
    return 'บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ';
  }
  if (m.includes('UNAUTHENTICATED')) {
    return 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่นะ';
  }

  return 'แลกของรางวัลไม่สำเร็จ ลองใหม่อีกครั้งนะ';
}

interface RedeemSuccess {
  code: string;
  reward_name: string;
  points_spent: number;
  points_balance: number;
}

export function RewardsList({
  rewards,
  balance,
}: {
  rewards: RewardWithPartner[];
  balance: number;
}) {
  const router = useRouter();

  const [busyId, setBusyId] = useState<number | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [success, setSuccess] = useState<RedeemSuccess | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function redeem(reward: RewardWithPartner) {
    setError(null);
    setConfirmId(null);
    setBusyId(reward.id);

    const supabase = createClient();

    // The client sends only the reward id. The database checks the balance,
    // checks the stock, deducts, decrements and issues the code in one atomic
    // transaction — a double-tap cannot spend the same points twice.
    const { data, error } = await supabase.rpc('redeem_reward', {
      reward_id: reward.id,
    });

    setBusyId(null);

    if (error) {
      setError(redeemErrorTh(error.message));
      return;
    }

    setSuccess(data as RedeemSuccess);
    router.refresh();
  }

  if (success) {
    return (
      <section className="animate-pop rounded-card border border-ok-line bg-ok-soft p-6 text-center">
        <span className="mx-auto inline-flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-on">
          <CheckIcon className="h-6 w-6" />
        </span>

        <h2 className="mt-3 font-semibold text-ok-ink">แลกสำเร็จ</h2>
        <p className="mt-0.5 text-sm text-ink-muted">{success.reward_name}</p>

        <p className="mt-5 text-sm text-ink-subtle">แสดงโค้ดนี้ให้เจ้าหน้าที่</p>
        <p className="mt-1.5 select-all rounded-control border border-dashed border-primary/40 bg-surface py-3.5 font-mono text-2xl font-bold tracking-[0.2em] text-primary-ink">
          {success.code}
        </p>

        <p className="mt-3 text-sm text-ink-muted nums">
          ใช้ไป {formatPoints(success.points_spent)} · เหลือ{' '}
          {formatPoints(success.points_balance)} แต้ม
        </p>

        <button
          type="button"
          onClick={() => setSuccess(null)}
          className="btn-outline mt-5 w-full"
        >
          เรียบร้อย
        </button>
      </section>
    );
  }

  if (rewards.length === 0) {
    return (
      <div className="card text-center">
        <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-surface-sunken text-ink-subtle">
          <GiftIcon className="h-6 w-6" />
        </span>
        <p className="mt-3 font-medium">ยังไม่มีของรางวัลตอนนี้</p>
        <p className="mt-1 text-sm text-ink-subtle">แวะมาดูใหม่เร็วๆ นี้นะ</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-control border border-danger-line bg-danger-soft px-3.5 py-2.5 text-sm text-danger-ink"
        >
          <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </p>
      )}

      {rewards.map((reward) => {
        const affordable = balance >= reward.points_cost;
        const inStock = reward.stock > 0;
        const canRedeem = affordable && inStock;
        const shortBy = reward.points_cost - balance;
        const isConfirming = confirmId === reward.id;
        const progress = Math.min(100, (balance / reward.points_cost) * 100);

        return (
          <div
            key={reward.id}
            className={`card ${
              // An affordable reward gets a green rim. On a page that is one
              // long list of near-identical cards, that ring is what makes
              // "these two are yours right now" readable at a glance.
              canRedeem ? 'border-primary/35 ring-1 ring-primary/15' : ''
            } ${inStock ? '' : 'opacity-65'}`}
          >
            <div className="flex items-start gap-4">
              <span
                className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-control ${
                  canRedeem
                    ? 'bg-primary-soft text-primary-ink'
                    : 'bg-surface-sunken text-ink-subtle'
                }`}
                aria-hidden
              >
                <GiftIcon className="h-5 w-5" />
              </span>

              <div className="min-w-0 flex-1">
                <h3 className="font-medium leading-tight">{reward.name}</h3>
                {/* Whose counter this coupon is handed over at. Without it the
                    list is a set of prizes from nowhere; with it, it is the
                    partner network the business model is built on. */}
                {reward.partners && (
                  <p className="mt-1 text-sm text-ink-muted">
                    <span aria-hidden>{reward.partners.emoji}</span>{' '}
                    {reward.partners.name}
                  </p>
                )}
                {reward.description && (
                  <p className="mt-1 text-sm text-ink-subtle">
                    {reward.description}
                  </p>
                )}
                <p className="mt-1 text-sm text-ink-subtle">
                  {inStock ? `เหลือ ${reward.stock} ชิ้น` : 'ของหมดแล้ว'}
                </p>
              </div>

              <div className="shrink-0 text-right">
                <p className="font-display text-lg font-semibold nums text-ink">
                  {formatPoints(reward.points_cost)}
                </p>
                <p className="text-xs text-ink-subtle">แต้ม</p>
              </div>
            </div>

            {/* How much of this reward you already own — more useful than a
                disabled button with no context. */}
            {!affordable && inStock && (
              <div className="mt-3.5">
                <div
                  className="meter"
                  role="progressbar"
                  aria-valuenow={Math.round(progress)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`ความคืบหน้าสู่ ${reward.name}`}
                >
                  <div
                    className="meter-fill"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="mt-1.5 text-xs text-ink-subtle nums">
                  {Math.round(progress)}% ของรางวัลชิ้นนี้
                </p>
              </div>
            )}

            {isConfirming ? (
              <div className="mt-3.5 rounded-control border border-line bg-surface-sunken p-3">
                <p className="text-center text-sm text-ink-muted">
                  ยืนยันใช้{' '}
                  <span className="font-semibold text-ink nums">
                    {formatPoints(reward.points_cost)}
                  </span>{' '}
                  แต้ม แลกของชิ้นนี้?
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmId(null)}
                    className="btn-outline flex-1"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="button"
                    onClick={() => redeem(reward)}
                    className="btn-primary flex-1"
                  >
                    ยืนยัน
                  </button>
                </div>
              </div>
            ) : canRedeem ? (
              <button
                type="button"
                disabled={busyId !== null}
                onClick={() => setConfirmId(reward.id)}
                className="btn-primary mt-3.5 w-full"
              >
                {busyId === reward.id ? (
                  <>
                    <Spinner /> กำลังแลก
                  </>
                ) : (
                  'แลกเลย'
                )}
              </button>
            ) : (
              /* Not a disabled button. "ขาดอีก 120 แต้ม" is the most useful
                 sentence on the card, and `disabled:opacity-45` would render
                 the one thing worth reading at 45% contrast. */
              <p className="mt-3.5 flex min-h-[3rem] items-center justify-center rounded-control bg-surface-sunken px-4 text-sm text-ink-muted">
                {!inStock
                  ? 'ของหมดแล้ว'
                  : `ขาดอีก ${formatPoints(shortBy)} แต้ม`}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
