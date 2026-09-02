import Link from 'next/link';
import { Hammer } from 'lucide-react';
import { PageHeading } from './PageHeading';

/**
 * Placeholder for the nav destinations this layout pass does not build out.
 *
 * They exist as real routes so no sidebar or quick-action link dead-ends in a
 * 404 while the screens behind them are still being designed.
 */
export function ComingSoon({
  title,
  caption,
  note,
}: {
  title: string;
  caption?: string;
  note: string;
}) {
  return (
    <>
      <PageHeading title={title} caption={caption} />
      <div className="grid place-items-center rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm sm:p-16">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
          <Hammer className="h-6 w-6" />
        </span>
        <p className="mt-4 text-sm font-medium text-slate-900">กำลังพัฒนา</p>
        <p className="mt-1 max-w-sm text-sm text-slate-500">{note}</p>
        <Link
          href="/dashboard"
          className="mt-5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
        >
          กลับหน้าภาพรวม
        </Link>
      </div>
    </>
  );
}
