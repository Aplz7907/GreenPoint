'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BookIcon,
  GiftIcon,
  HistoryIcon,
  HomeIcon,
  LeafIcon,
  MapPinIcon,
  ScanIcon,
  StoreIcon,
  TargetIcon,
  TrophyIcon,
  UserIcon,
} from '@/components/Icons';

/**
 * The desktop counterpart of <BottomNav />.
 *
 * The bar downstairs shows four destinations because a phone can only carry
 * four; a 1280px screen has room for the whole map, so the pages that used to
 * be one tap deeper inside ฉัน — the leaderboard, the drop-off map, the guide —
 * get a permanent slot here rather than staying hidden behind a submenu that
 * exists for no reason on this width.
 *
 * Everything is written against the theme tokens, so this rail is correct in
 * dark mode without a single `dark:` prefix.
 */
const SECTIONS: {
  label?: string;
  items: { href: string; label: string; Icon: (p: { className?: string }) => JSX.Element }[];
}[] = [
  {
    items: [
      { href: '/', label: 'หน้าแรก', Icon: HomeIcon },
      { href: '/submit', label: 'สแกนขยะ', Icon: ScanIcon },
      { href: '/missions', label: 'ภารกิจ', Icon: TargetIcon },
    ],
  },
  {
    label: 'แต้มและรางวัล',
    items: [
      { href: '/rewards', label: 'แลกของรางวัล', Icon: GiftIcon },
      { href: '/partners', label: 'ร้านค้าพาร์ทเนอร์', Icon: StoreIcon },
      { href: '/history', label: 'ประวัติแต้ม', Icon: HistoryIcon },
      { href: '/leaderboard', label: 'อันดับ', Icon: TrophyIcon },
    ],
  },
  {
    label: 'อื่น ๆ',
    items: [
      { href: '/dropoff', label: 'จุดรับขยะ', Icon: MapPinIcon },
      { href: '/guide', label: 'คู่มือแยกขยะ', Icon: BookIcon },
      { href: '/me', label: 'ฉัน', Icon: UserIcon },
    ],
  },
];

export function AppSidebar() {
  const pathname = usePathname();

  // Null-safe: a null pathname simply lights nothing up, rather than throwing.
  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : (pathname ?? '').startsWith(href);

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col overflow-y-auto border-r border-line bg-surface md:flex">
      <Link href="/" className="flex items-center gap-2.5 px-5 py-5">
        <span
          className="inline-flex h-9 w-9 items-center justify-center rounded-control bg-primary text-primary-on shadow-glow"
          aria-hidden
        >
          <LeafIcon className="h-5 w-5" />
        </span>
        <span className="font-display text-base font-semibold tracking-tight text-ink">
          Green Point
        </span>
      </Link>

      <nav className="flex-1 space-y-5 px-3 pb-6">
        {SECTIONS.map((section, i) => (
          <div key={section.label ?? i}>
            {section.label && (
              <p className="px-3 pb-1.5 text-[11px] font-medium uppercase tracking-wide text-ink-subtle">
                {section.label}
              </p>
            )}

            <div className="space-y-0.5">
              {section.items.map(({ href, label, Icon }) => {
                const active = isActive(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={active ? 'page' : undefined}
                    className={`group flex items-center gap-3 rounded-control px-3 py-2.5 text-sm transition-colors ${
                      active
                        ? 'bg-primary-soft font-medium text-primary-ink'
                        : 'text-ink-muted hover:bg-surface-sunken hover:text-ink'
                    }`}
                  >
                    <Icon
                      className={`h-5 w-5 shrink-0 ${
                        active ? 'text-primary' : 'text-ink-subtle group-hover:text-ink-muted'
                      }`}
                    />
                    <span className="truncate">{label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* The scan is the primary action on every width; on the phone it is the
          raised button in the bar, and here it is the one filled control. */}
      <div className="px-3 pb-5">
        <Link href="/submit" className="btn-primary w-full rounded-control">
          <ScanIcon className="h-5 w-5" />
          สแกนขยะ
        </Link>
      </div>
    </aside>
  );
}
