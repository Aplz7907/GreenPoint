import Link from 'next/link';
import { ChevronLeftIcon, LeafIcon } from '@/components/Icons';
import { ThemeToggle } from '@/components/ThemeToggle';

/**
 * The one header every signed-in page uses.
 *
 * Before this existed each page hand-rolled its own bar and they had drifted:
 * different paddings, one baseline-aligned and three centred, the subtitle
 * sometimes a sibling and sometimes inside. Centralising it is what makes the
 * app feel like one product rather than five screens.
 */
export function AppHeader({
  title,
  subtitle,
  backHref,
  brand = false,
  actions,
}: {
  title: string;
  subtitle?: React.ReactNode;
  /** Renders a back affordance on the left. Omit on tab-level pages. */
  backHref?: string;
  /** Shows the leaf mark and sets the title in the brand size. */
  brand?: boolean;
  /** Trailing controls. The theme toggle is always appended after these. */
  actions?: React.ReactNode;
}) {
  return (
    <header className="app-header">
      <div className="mx-auto flex max-w-md items-center gap-3 px-4 py-3 sm:max-w-2xl sm:px-6 lg:max-w-4xl">
        {backHref && (
          <Link
            href={backHref}
            aria-label="ย้อนกลับ"
            className="-ml-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
          >
            <ChevronLeftIcon className="h-5 w-5" />
          </Link>
        )}

        {brand && (
          <span
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-primary text-primary-on shadow-glow"
            aria-hidden
          >
            <LeafIcon className="h-5 w-5" />
          </span>
        )}

        <div className="min-w-0 flex-1">
          <h1
            className={
              brand
                ? 'truncate text-lg font-semibold leading-tight'
                : 'truncate text-base font-semibold leading-tight'
            }
          >
            {title}
          </h1>
          {/* Wraps rather than truncates. The longest subtitle in the app is
              the leaderboard's "you have hidden your name" notice, which is the
              one that actually has to be read — an ellipsis would eat the half
              of the sentence that tells you what to do about it. */}
          {subtitle && (
            <p className="text-sm leading-snug text-ink-subtle">{subtitle}</p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {actions}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

/**
 * Standard page body. `pb-28` clears the bottom nav plus the raised camera
 * button; every page that renders <BottomNav /> needs it, so it lives here
 * instead of being re-typed (and occasionally mistyped) five times.
 */
export function PageMain({
  children,
  withNav = true,
  className = '',
}: {
  children: React.ReactNode;
  withNav?: boolean;
  className?: string;
}) {
  return (
    <main
      className={`mx-auto w-full max-w-md px-4 py-5 sm:max-w-2xl sm:px-6 sm:py-8 lg:max-w-4xl ${
        withNav ? 'pb-28 md:pb-10' : ''
      } ${className}`}
    >
      {children}
    </main>
  );
}
