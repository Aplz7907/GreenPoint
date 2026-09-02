import { LeafIcon } from '@/components/Icons';
import { ThemeToggle } from '@/components/ThemeToggle';

/**
 * Every signed-out page is the same shape: brand mark, a small heading block,
 * then the form. Centralised so login/register/forgot/reset cannot drift apart.
 *
 * On tablet and desktop the column stays at phone width and centres vertically
 * — a 400px form stretched across 1200px is the classic way a mobile-first app
 * looks broken on a laptop.
 */
export function AuthShell({
  title,
  subtitle,
  children,
  footnote,
  mark,
  below,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footnote?: React.ReactNode;
  /** Replaces the leaf square. The entry screen shows the app mark instead. */
  mark?: React.ReactNode;
  /** Rendered under the form, above the footnote. */
  below?: React.ReactNode;
}) {
  return (
    <div className="relative min-h-dvh overflow-hidden">
      {/* A wash of colour behind the top of the page, so the signed-out screens
          are recognisably the same product as the green app behind them. */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-mint/35 to-transparent dark:from-primary/10"
        aria-hidden
      />
      <div
        className="leaf-field pointer-events-none absolute inset-x-0 top-0 h-72 opacity-70"
        aria-hidden
      />

      <div className="absolute right-3 top-3 z-10">
        <ThemeToggle />
      </div>

      {/*
        `m-auto` on the inner block, NOT `justify-center` on the flex column.
        They look identical until the content is taller than the viewport: with
        `justify-center` the overflow splits both ways and the top of the form
        goes above the scroll origin, permanently unreachable — which is exactly
        the register form on a small phone. Auto margins resolve to 0 instead,
        so a tall form simply starts at the top and scrolls.
      */}
      <main className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 py-10">
        <div className="m-auto w-full">
          <div className="mb-6">
            {mark ?? (
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-card bg-primary text-primary-on shadow-glow">
                <LeafIcon className="h-6 w-6" />
              </span>
            )}

            <h1 className="mt-4 text-2xl font-bold text-balance">{title}</h1>
            {subtitle && (
              <p className="mt-1.5 text-sm text-ink-muted">{subtitle}</p>
            )}
          </div>

          {children}

          {below}

          {footnote && (
            <p className="mt-6 text-center text-xs leading-relaxed text-ink-subtle">
              {footnote}
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
