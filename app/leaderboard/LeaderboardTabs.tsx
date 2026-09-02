'use client';

import { useState } from 'react';

import { TrophyIcon } from '@/components/Icons';
import { formatPoints } from '@/lib/copy';
import { formatWeightTh, tierFor } from '@/lib/scoring';
import type { FacultyStanding, LeaderboardRow } from '@/lib/types';

type Board = 'people' | 'faculty';

/**
 * The podium is a filled disc, everyone else is a plain number.
 *
 * Only first place gets a colour. Three medal palettes would need gold, silver
 * and bronze tints that do not exist anywhere else in the system, and inventing
 * them here is how a design system starts leaking.
 */
function Rank({ rank }: { rank: number }) {
  if (rank > 3) {
    return (
      <span className="w-8 shrink-0 text-center text-sm text-ink-subtle nums">
        {rank}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold nums ${
        rank === 1
          ? 'bg-warn-soft text-warn-ink ring-1 ring-inset ring-warn-line'
          : 'bg-surface-sunken text-ink ring-1 ring-inset ring-line-strong'
      }`}
    >
      {rank}
    </span>
  );
}

function EmptyBoard({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-6 text-center">
      <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-surface-sunken text-ink-subtle">
        <TrophyIcon className="h-6 w-6" />
      </span>
      <p className="mt-3 font-medium">ยังไม่มีข้อมูล</p>
      <p className="mt-1 text-sm text-ink-subtle">{children}</p>
    </div>
  );
}

export function LeaderboardTabs({
  rows,
  standings,
}: {
  rows: LeaderboardRow[];
  standings: FacultyStanding[];
}) {
  const [board, setBoard] = useState<Board>('people');

  const tabs: { key: Board; label: string }[] = [
    { key: 'people', label: 'รายบุคคล' },
    { key: 'faculty', label: 'คณะ' },
  ];

  return (
    <>
      <div
        role="tablist"
        aria-label="เลือกกระดาน"
        className="flex gap-1 rounded-control border border-line bg-surface-sunken p-1"
      >
        {tabs.map(({ key, label }) => {
          const active = board === key;

          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setBoard(key)}
              className={`flex-1 rounded-[0.5rem] py-2 text-sm transition-colors ${
                active
                  ? 'bg-surface font-medium text-ink shadow-soft'
                  : 'text-ink-subtle hover:text-ink-muted'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {board === 'people' ? (
        <ul className="list-surface mt-4">
          {rows.length === 0 ? (
            <li>
              <EmptyBoard>ยังไม่มีใครเก็บแต้มได้เลย เป็นคนแรกสิ</EmptyBoard>
            </li>
          ) : (
            rows.map((row) => {
              const tier = tierFor(row.lifetime_points);

              return (
                <li
                  key={`${row.rank}-${row.display_name}`}
                  className={`flex items-center gap-3 px-3.5 py-3 ${
                    // Your own row gets a tint AND a left rail. On a 50-row
                    // list, the tint alone is easy to scroll straight past.
                    row.is_me
                      ? 'border-l-[3px] border-primary bg-primary-soft pl-[calc(0.875rem-3px)]'
                      : ''
                  }`}
                >
                  <Rank rank={row.rank} />

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {row.display_name}
                      {row.is_me && (
                        <span className="ml-1.5 text-xs font-semibold text-primary-ink">
                          (คุณ)
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 truncate text-sm text-ink-subtle">
                      {tier.name_th}
                      {row.faculty_th ? ` · ${row.faculty_th}` : ''}
                      {row.grams > 0 ? ` · ${formatWeightTh(row.grams)}` : ''}
                    </p>
                  </div>

                  <span className="shrink-0 font-display text-sm font-semibold nums text-ink">
                    {formatPoints(row.lifetime_points)}
                  </span>
                </li>
              );
            })
          )}
        </ul>
      ) : (
        <>
          <ul className="list-surface mt-4">
            {standings.length === 0 ? (
              <li>
                <EmptyBoard>
                  ยังไม่มีคณะไหนเก็บแต้มได้ เลือกคณะของคุณด้านล่างแล้วเริ่มเลย
                </EmptyBoard>
              </li>
            ) : (
              standings.map((f) => (
                <li
                  key={f.faculty_th}
                  className={`flex items-center gap-3 px-3.5 py-3 ${
                    f.is_mine
                      ? 'border-l-[3px] border-primary bg-primary-soft pl-[calc(0.875rem-3px)]'
                      : ''
                  }`}
                >
                  <Rank rank={f.rank} />

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {f.faculty_th}
                      {f.is_mine && (
                        <span className="ml-1.5 text-xs font-semibold text-primary-ink">
                          (คณะคุณ)
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 text-sm text-ink-subtle">
                      {f.campus_th ? `${f.campus_th} · ` : ''}
                      {f.member_count.toLocaleString('th-TH')} คน ·{' '}
                      {formatWeightTh(f.grams)}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <span className="block font-display text-sm font-semibold nums text-ink">
                      {formatPoints(Math.round(f.avg_points))}
                    </span>
                    <span className="text-xs text-ink-subtle">เฉลี่ย/คน</span>
                  </div>
                </li>
              ))
            )}
          </ul>

          {standings.length > 0 && (
            <p className="mt-2.5 text-sm text-ink-subtle">
              จัดอันดับด้วยแต้มเฉลี่ยต่อคน ไม่ใช่แต้มรวม —
              คณะใหญ่จะได้ไม่ชนะเพราะมีคนเยอะกว่าอย่างเดียว
            </p>
          )}
        </>
      )}
    </>
  );
}
