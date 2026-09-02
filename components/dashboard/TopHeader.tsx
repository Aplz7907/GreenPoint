'use client';

import { Bell, Coins, Menu, Search } from 'lucide-react';
import { USER } from './data';

/**
 * Sticky bar above the content column.
 *
 * On phones the search field collapses to an icon: a full-width input plus the
 * points counter cannot both survive at 360px, and the counter is the thing
 * people open the app to check.
 */
export function TopHeader({ onOpenMenu }: { onOpenMenu: () => void }) {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/85 backdrop-blur">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
        <button
          onClick={onOpenMenu}
          aria-label="เปิดเมนู"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-slate-600 hover:bg-slate-100 md:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        <label className="relative hidden min-w-0 flex-1 items-center sm:flex lg:max-w-md">
          <Search className="pointer-events-none absolute left-3 h-4 w-4 text-slate-400" />
          <span className="sr-only">ค้นหา</span>
          <input
            type="search"
            placeholder="ค้นหาขยะ ของรางวัล หรือจุดรับ..."
            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </label>

        <button
          aria-label="ค้นหา"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-slate-600 hover:bg-slate-100 sm:hidden"
        >
          <Search className="h-5 w-5" />
        </button>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-100">
            <Coins className="h-4 w-4 text-amber-500" />
            {USER.points.toLocaleString('th-TH')}
            <span className="hidden font-medium sm:inline">แต้ม</span>
          </span>

          <button
            aria-label="การแจ้งเตือน"
            className="relative grid h-10 w-10 place-items-center rounded-xl text-slate-600 hover:bg-slate-100"
          >
            <Bell className="h-5 w-5" />
            {/* The ring matches the header fill so the dot reads as a dot and
                not as a smear where it overlaps the bell. */}
            <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
          </button>

          <button className="flex items-center gap-2 rounded-xl p-1 pr-1 text-left hover:bg-slate-100 sm:pr-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-600 text-sm font-semibold text-white">
              {USER.initials}
            </span>
            <span className="hidden leading-tight sm:block">
              <span className="block text-sm font-medium text-slate-900">
                {USER.name}
              </span>
              <span className="block text-xs text-slate-500">{USER.level}</span>
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
