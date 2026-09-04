'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Spinner } from '@/components/AuthUI';
import { AlertIcon, CheckIcon, TargetIcon } from '@/components/Icons';
import { formatPoints } from '@/lib/copy';
import { formatWeightTh } from '@/lib/scoring';
import type { ClaimResult, MissionProgress } from '@/lib/types';

/**
 * claim_mission() raises bare codes so the wording lives here, next to the
 * button that caused it — same contract redeem_reward() uses.
 */
function claimErrorTh(message: string): string {
  const m = message.toUpperCase();

  if (m.includes('NOT_COMPLETE')) {
    return 'ภารกิจนี้ยังทำไม่ครบ ลองเช็กความคืบหน้าอีกครั้งนะ';
  }
  if (m.includes('ALREADY_CLAIMED')) {
    return 'รับแต้มภารกิจนี้ไปแล้ว';
  }
  if (m.includes('MISSION_NOT_FOUND')) {
    return 'ภารกิจนี้ปิดไปแล้ว ลองดูภารกิจอื่นนะ';
  }
  if (m.includes('USER_BANNED')) {
    return 'บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ';
  }
  if (m.includes('UNAUTHENTICATED')) {
    return 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่นะ';
  }

  return 'รับแต้มไม่สำเร็จ ลองใหม่อีกครั้งนะ';
}

/**
 * "3 / 5 ครั้ง" — the unit has to match what the mission actually counts, or
 * the bar reads as a percentage of nothing.
 */
function progressLabel(m: MissionProgress): string {
  if (m.kind === 'grams') {
    return `${formatWeightTh(m.progress)} / ${formatWeightTh(m.target)}`;
  }

  const unit = m.kind === 'streak' ? 'วัน' : 'ครั้ง';
  return `${formatPoints(m.progress)} / ${formatPoints(m.target)} ${unit}`;
}

function MissionCard({
  mission,
  busy,
  onClaim,
}: {
  mission: MissionProgress;
  busy: boolean;
  onClaim: () => void;
}) {
  const ratio = Math.min(1, mission.progress / mission.target);
  const complete = mission.progress >= mission.target;
  const percent = Math.round(ratio * 100);

  return (
    <li
      className={`card ${
        mission.claimed ? 'opacity-60' : complete ? 'border-ok-line' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
            mission.claimed
              ? 'bg-ok-soft text-ok-ink'
              : 'bg-primary-soft text-primary-ink'
          }`}
        >
          {mission.claimed ? (
            <CheckIcon className="h-5 w-5" />
          ) : (
            <TargetIcon className="h-5 w-5" />
          )}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-medium leading-snug">{mission.title_th}</h3>
            <span className="shrink-0 whitespace-nowrap font-display text-sm font-semibold nums text-primary-ink">
              +{formatPoints(mission.reward_points)}
            </span>
          </div>

          {mission.description_th && (
            <p className="mt-0.5 text-sm text-ink-subtle">
              {mission.description_th}
            </p>
          )}
        </div>
      </div>

      <div className="mt-3.5">
        <div className="flex items-baseline justify-between gap-3 text-xs text-ink-subtle">
          <span className="nums">{progressLabel(mission)}</span>
          <span className="nums">{percent}%</span>
        </div>

        <div
          className="meter mt-1.5"
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`ความคืบหน้าภารกิจ ${mission.title_th}`}
        >
          <div className="meter-fill" style={{ width: `${percent}%` }} />
        </div>
      </div>

      {mission.claimed ? (
        <p className="mt-3 flex items-center gap-1.5 text-sm text-ok-ink">
          <CheckIcon className="h-4 w-4" />
          รับแต้มแล้ว
        </p>
      ) : complete ? (
        <button
          type="button"
          onClick={onClaim}
          disabled={busy}
          className="btn-primary mt-3 w-full"
        >
          {busy ? <Spinner /> : null}
          รับ {formatPoints(mission.reward_points)} แต้ม
        </button>
      ) : (
        <p className="mt-3 text-sm text-ink-subtle">
          ทำให้ครบแล้วกลับมากดรับแต้มได้เลย
        </p>
      )}
    </li>
  );
}

export function MissionsList({ missions }: { missions: MissionProgress[] }) {
  const router = useRouter();

  const [busyId, setBusyId] = useState<number | null>(null);
  const [claimed, setClaimed] = useState<ClaimResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function claim(mission: MissionProgress) {
    setError(null);
    setBusyId(mission.id);

    // Deferred on purpose — see the note in lib/supabase/client.ts.
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();

    // The client sends an id. The database re-derives the progress and decides
    // whether it is owed anything — a tampered `progress` in this component
    // cannot buy a single point.
    const { data, error } = await supabase.rpc('claim_mission', {
      p_mission_id: mission.id,
    });

    setBusyId(null);

    if (error) {
      setError(claimErrorTh(error.message));
      // The most likely cause of NOT_COMPLETE is a stale page, so pull fresh
      // progress in rather than leaving the user staring at a wrong bar.
      router.refresh();
      return;
    }

    setClaimed(data as ClaimResult);
    router.refresh();
  }

  return (
    <>
      {claimed && (
        <section className="animate-pop mb-4 rounded-card border border-ok-line bg-ok-soft p-5 text-center">
          <span className="mx-auto inline-flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-on">
            <CheckIcon className="h-6 w-6" />
          </span>
          <h2 className="mt-3 font-semibold text-ok-ink">
            +{formatPoints(claimed.points_awarded)} แต้ม
          </h2>
          <p className="mt-1 text-sm text-ok-ink/90">
            สำเร็จภารกิจ “{claimed.title_th}” · แต้มรวม{' '}
            {formatPoints(claimed.points_balance)}
          </p>
          <button
            type="button"
            onClick={() => setClaimed(null)}
            className="btn-outline btn-sm mt-4"
          >
            ปิด
          </button>
        </section>
      )}

      {error && (
        <p className="mb-4 flex items-start gap-2 rounded-control border border-danger-line bg-danger-soft px-3.5 py-2.5 text-sm text-danger-ink">
          <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </p>
      )}

      <ul className="space-y-3">
        {missions.map((mission) => (
          <MissionCard
            key={mission.id}
            mission={mission}
            busy={busyId === mission.id}
            onClaim={() => claim(mission)}
          />
        ))}
      </ul>
    </>
  );
}
