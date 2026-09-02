'use client';

import { MoonIcon, SunIcon } from '@/components/Icons';

const STORAGE_KEY = 'greenpoint-theme';

/**
 * Light/dark toggle.
 *
 * Which icon shows is decided by CSS (`dark:` on the two spans), not by React
 * state. That is deliberate: the theme is already on `<html>` before hydration,
 * courtesy of the bootstrap script in layout.tsx, so reading it into state
 * would only reintroduce the server/client mismatch that script exists to
 * avoid — and would flash the wrong icon for one frame on every load.
 */
export function ThemeToggle({ className = '' }: { className?: string }) {
  function toggle() {
    const root = document.documentElement;
    const dark = root.classList.toggle('dark');

    try {
      localStorage.setItem(STORAGE_KEY, dark ? 'dark' : 'light');
    } catch {
      // Private mode / storage disabled — the toggle still works for this
      // session, it just will not be remembered. Not worth surfacing.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="สลับโหมดสว่างและมืด"
      title="สลับโหมดสว่างและมืด"
      className={`inline-flex h-10 w-10 items-center justify-center rounded-full text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink ${className}`}
    >
      <MoonIcon className="h-5 w-5 dark:hidden" />
      <SunIcon className="hidden h-5 w-5 dark:block" />
    </button>
  );
}
