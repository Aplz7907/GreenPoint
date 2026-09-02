'use client';

import { useState } from 'react';
import { MobileNav } from './MobileNav';
import { Sidebar, SidebarDrawer } from './Sidebar';
import { TopHeader } from './TopHeader';

/**
 * The chrome every dashboard page sits inside: rail on the left from `md` up,
 * sticky header, scrolling content, bottom bar below `md`.
 *
 * It owns the one piece of state that chrome shares — whether the mobile drawer
 * is open — which keeps the header and the drawer in one tree and lets every
 * page below stay a plain server component.
 *
 * `md:pl-64` reserves the fixed rail's width; the content's bottom padding
 * clears the bottom bar, without which the last card of every list sits under
 * the nav.
 */
export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-dvh bg-slate-50 text-slate-900 md:flex">
      <Sidebar />
      <SidebarDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col md:pl-64">
        <TopHeader onOpenMenu={() => setMenuOpen(true)} />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-6 sm:px-6 md:pb-10 lg:px-8">
          {children}
        </main>
      </div>

      <MobileNav />
    </div>
  );
}
