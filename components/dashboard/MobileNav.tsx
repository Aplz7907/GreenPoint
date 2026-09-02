'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ScanLine } from 'lucide-react';
import { MOBILE_NAV_ITEMS } from './data';

/**
 * Persistent bottom bar, phone and tablet only.
 *
 * Four tabs with the scan action raised between them: scanning is the one thing
 * every other screen exists to support, and giving it a tab of equal weight
 * would bury it among five identical glyphs.
 */
export function MobileNav() {
  const pathname = usePathname();
  const left = MOBILE_NAV_ITEMS.slice(0, 2);
  const right = MOBILE_NAV_ITEMS.slice(2);

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === href : (pathname ?? '').startsWith(href);

  const Tab = ({ href, label, icon: Icon }: (typeof MOBILE_NAV_ITEMS)[number]) => {
    const active = isActive(href);
    return (
      <Link
        href={href}
        aria-current={active ? 'page' : undefined}
        className={`flex flex-1 flex-col items-center gap-1 py-2 text-[11px] transition-colors ${
          active ? 'text-emerald-700' : 'text-slate-500'
        }`}
      >
        <span
          className={`grid h-7 w-12 place-items-center rounded-full transition-colors ${
            active ? 'bg-emerald-50' : ''
          }`}
        >
          <Icon className="h-5 w-5" />
        </span>
        <span className={active ? 'font-medium' : undefined}>{label}</span>
      </Link>
    );
  };

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="mx-auto flex max-w-lg items-end px-2">
        {left.map((item) => (
          <Tab key={item.href} {...item} />
        ))}

        <Link
          href="/dashboard/scan"
          aria-label="สแกนขยะ"
          className="-mt-6 grid h-14 w-14 shrink-0 place-items-center rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 ring-4 ring-white transition-transform active:scale-95"
        >
          <ScanLine className="h-6 w-6" />
        </Link>

        {right.map((item) => (
          <Tab key={item.href} {...item} />
        ))}
      </div>
    </nav>
  );
}
