'use client';

import { useMemo, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Filter } from 'lucide-react';
import { TRANSACTIONS, type Txn } from './data';

const TABS = [
  { key: 'all', label: 'ทั้งหมด' },
  { key: 'earned', label: 'ได้รับ' },
  { key: 'spent', label: 'ใช้ไป' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

const STATUS_TONE: Record<Txn['status'], string> = {
  สำเร็จ: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  รอตรวจสอบ: 'bg-amber-50 text-amber-700 ring-amber-100',
  ไม่ผ่าน: 'bg-red-50 text-red-700 ring-red-100',
};

function StatusBadge({ status }: { status: Txn['status'] }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ring-inset ${STATUS_TONE[status]}`}
    >
      {status}
    </span>
  );
}

function PointsDelta({ points }: { points: number }) {
  if (points === 0) {
    return <span className="text-sm font-medium text-slate-400">0</span>;
  }
  const earned = points > 0;
  const Icon = earned ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-sm font-semibold ${
        earned ? 'text-emerald-700' : 'text-red-600'
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {earned ? '+' : ''}
      {points}
    </span>
  );
}

/**
 * One dataset, two presentations.
 *
 * Below `md` the rows render as cards; a seven-column table on a phone either
 * scrolls sideways (so the amount, the column people came for, is off-screen)
 * or shrinks the type past legibility. Both branches map the same filtered
 * array, so a row can never appear in one and not the other.
 */
export function PointsHistoryTable() {
  const [tab, setTab] = useState<TabKey>('all');

  const rows = useMemo(
    () =>
      TRANSACTIONS.filter((t) =>
        tab === 'all' ? true : tab === 'earned' ? t.points > 0 : t.points < 0,
      ),
    [tab],
  );

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4 sm:px-5">
        <div className="inline-flex rounded-xl bg-slate-100 p-1">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              aria-pressed={tab === key}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                tab === key
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <button className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50">
          <Filter className="h-4 w-4" />
          <span className="hidden sm:inline">ช่วงเวลา:</span> 30 วันล่าสุด
        </button>
      </div>

      {/* Desktop and tablet */}
      <div className="hidden md:block">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th scope="col" className="px-5 py-3 font-medium">รายการ</th>
              <th scope="col" className="px-5 py-3 font-medium">วันที่</th>
              <th scope="col" className="px-5 py-3 font-medium">สถานะ</th>
              <th scope="col" className="px-5 py-3 text-right font-medium">แต้ม</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((t) => (
              <tr key={t.id} className="transition hover:bg-slate-50/70">
                <td className="px-5 py-3.5">
                  <p className="text-sm font-medium text-slate-900">{t.title}</p>
                  <p className="text-xs text-slate-500">{t.detail}</p>
                </td>
                <td className="whitespace-nowrap px-5 py-3.5 text-sm text-slate-600">
                  {t.date}
                </td>
                <td className="px-5 py-3.5">
                  <StatusBadge status={t.status} />
                </td>
                <td className="px-5 py-3.5 text-right">
                  <PointsDelta points={t.points} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Phone */}
      <ul className="divide-y divide-slate-100 md:hidden">
        {rows.map((t) => (
          <li key={t.id} className="flex items-start gap-3 p-4">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-900">{t.title}</p>
              <p className="mt-0.5 text-xs text-slate-500">{t.detail}</p>
              <p className="mt-1.5 flex items-center gap-2">
                <StatusBadge status={t.status} />
                <span className="text-xs text-slate-400">{t.date}</span>
              </p>
            </div>
            <PointsDelta points={t.points} />
          </li>
        ))}
      </ul>

      {rows.length === 0 && (
        <p className="p-10 text-center text-sm text-slate-500">
          ยังไม่มีรายการในช่วงนี้
        </p>
      )}
    </section>
  );
}
