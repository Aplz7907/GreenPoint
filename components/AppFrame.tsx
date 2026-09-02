'use client';

import { usePathname } from 'next/navigation';
import { AppSidebar } from '@/components/AppSidebar';

/**
 * Decides whether a route gets the app chrome.
 *
 * Two kinds of route opt out. The signed-out screens (login, register, the
 * password flows, the auth callbacks) render their own full-bleed AuthShell and
 * must not be pushed to the right by a rail they do not show — that list
 * mirrors PUBLIC_PATHS in lib/supabase/middleware.ts, same routes for the same
 * reason. And /dashboard ships its own shell, so wrapping it here would stack
 * two sidebars and two lots of left padding.
 */
const CHROMELESS = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/auth',
  '/dashboard',
];

export function AppFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const chromeless = CHROMELESS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );

  if (chromeless) return <>{children}</>;

  // `md:pl-64` reserves the fixed rail's width. Below `md` the rail is display:
  // none and this is a no-op wrapper, so the phone layout is byte-identical to
  // what it was before.
  return (
    <div className="md:pl-64">
      <AppSidebar />
      {children}
    </div>
  );
}
