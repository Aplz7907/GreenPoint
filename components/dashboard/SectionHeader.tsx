import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

/** Title, optional caption, optional "see all" link — used by every section so
 *  their spacing and type scale cannot drift apart. */
export function SectionHeader({
  title,
  caption,
  actionLabel,
  actionHref,
}: {
  title: string;
  caption?: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-lg font-semibold tracking-tight text-slate-900">
          {title}
        </h2>
        {caption && <p className="mt-0.5 text-sm text-slate-500">{caption}</p>}
      </div>
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="inline-flex shrink-0 items-center gap-0.5 text-sm font-medium text-emerald-700 hover:text-emerald-800"
        >
          {actionLabel}
          <ChevronRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}
