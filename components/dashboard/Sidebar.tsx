'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Leaf, Sparkles, X } from 'lucide-react';
import { NAV_ITEMS, USER } from './data';

/**
 * Desktop rail and mobile drawer are the same markup.
 *
 * They differ only in the wrapper that positions them, so a nav item added to
 * NAV_ITEMS shows up in both without a second edit — the usual way these two
 * drift apart.
 */
function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 space-y-1 px-3">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        // `/dashboard` must not light up on every child route, so the root gets
        // an exact match and everything below it a prefix match.
        const active =
          href === '/dashboard' ? pathname === href : pathname.startsWith(href);

        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
              active
                ? 'bg-emerald-50 text-emerald-700'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Icon
              className={`h-5 w-5 shrink-0 ${
                active ? 'text-emerald-600' : 'text-slate-400 group-hover:text-slate-600'
              }`}
            />
            <span className="truncate">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function LevelCard() {
  return (
    <div className="m-3 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 p-4 text-white shadow-md">
      <div className="flex items-center gap-2 text-xs font-medium text-emerald-100">
        <Sparkles className="h-4 w-4" />
        ระดับของคุณ
      </div>
      <p className="mt-1 text-lg font-semibold">{USER.level}</p>
      {/* Same 550-to-next-level figure as the stat card; both read from USER. */}
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/25">
        <div className="h-full w-[82%] rounded-full bg-white" />
      </div>
      <p className="mt-2 text-xs text-emerald-50">อีก 550 แต้มถึง Eco Legend</p>
    </div>
  );
}

export function SidebarBrand() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2.5">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-600 text-white shadow-sm">
        <Leaf className="h-5 w-5" />
      </span>
      <span className="text-base font-semibold tracking-tight text-slate-900">
        EcoPoint
      </span>
    </Link>
  );
}

/** Fixed rail, desktop only. The main column reserves its width with md:pl-64. */
export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200 bg-white md:flex">
      <div className="flex h-16 items-center px-5">
        <SidebarBrand />
      </div>
      <NavList />
      <LevelCard />
    </aside>
  );
}

/** Off-canvas copy for tablet and phone, opened from the header menu button. */
export function SidebarDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <div
      className={`fixed inset-0 z-50 md:hidden ${open ? '' : 'pointer-events-none'}`}
      aria-hidden={!open}
    >
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-slate-900/40 transition-opacity ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
      />
      <div
        role="dialog"
        aria-label="เมนูหลัก"
        className={`absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-white shadow-xl transition-transform duration-200 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center justify-between px-5">
          <SidebarBrand />
          <button
            onClick={onClose}
            aria-label="ปิดเมนู"
            className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <NavList onNavigate={onClose} />
        <LevelCard />
      </div>
    </div>
  );
}
