'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  HomeIcon,
  ScanIcon,
  StoreIcon,
  TargetIcon,
  UserIcon,
} from '@/components/Icons';

/**
 * The five slots from the prototype: หน้าแรก · ภารกิจ · [สแกน] · ร้านค้า · ฉัน,
 * with the scan button raised out of the middle.
 *
 * The leaderboard, the rewards list and the points history all used to hold a
 * tab. They are now one tap away from the home tiles and the ฉัน tab, because
 * a bar that offers five destinations of equal weight makes none of them read
 * as the thing to do next — and the thing to do next is always the scan.
 */
const TABS = [
  { href: '/', label: 'หน้าแรก', Icon: HomeIcon },
  { href: '/missions', label: 'ภารกิจ', Icon: TargetIcon },
  { href: '/partners', label: 'ร้านค้า', Icon: StoreIcon },
  { href: '/me', label: 'ฉัน', Icon: UserIcon },
];

type Tab = (typeof TABS)[number];

function NavTab({ href, label, Icon, active }: Tab & { active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`group flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] transition-colors ${
        active ? 'text-primary-ink' : 'text-ink-subtle hover:text-ink-muted'
      }`}
    >
      {/*
        The active state is a soft pill behind the icon rather than colour
        alone: at 20px, a green glyph next to a grey one is a weak signal in
        sunlight, and the pill survives being looked at from arm's length.
      */}
      <span
        className={`inline-flex h-7 w-12 items-center justify-center rounded-full transition-colors ${
          active ? 'bg-primary-soft' : 'group-hover:bg-surface-sunken'
        }`}
      >
        <Icon className="h-5 w-5" />
      </span>
      <span className={active ? 'font-medium' : undefined}>{label}</span>
    </Link>
  );
}

export function BottomNav() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : (pathname ?? '').startsWith(href);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden">
      {/*
        No `items-*` here on purpose. The default `stretch` is what makes the
        scan button's wrapper fill the bar's height, which is what gives its
        `-mt-6` something to lift the button out of. Pinning the row to
        `items-end` collapses that wrapper to its own content and the button
        sinks back into the bar.
      */}
      <div className="mx-auto flex max-w-md sm:max-w-2xl">
        {TABS.slice(0, 2).map((tab) => (
          <NavTab key={tab.href} {...tab} active={isActive(tab.href)} />
        ))}

        {/*
          The scan is the whole point of the app, so it gets a raised button
          instead of a fifth tab. The negative margin lifts it above the bar and
          the canvas-coloured ring cuts it out of the border-t line underneath —
          the ring has to track the page background, not be hard-coded white, or
          it punches a bright hole in dark mode.

          The label lives inside the circle, as it does on the prototype: a
          caption underneath would sit below the bar's own baseline and drag the
          whole row taller for one word.
        */}
        <div className="flex flex-1 justify-center">
          <Link
            href="/submit"
            aria-label="สแกนขยะ"
            className="-mt-6 flex h-[3.75rem] w-[3.75rem] flex-col items-center justify-center gap-0.5 rounded-full bg-primary text-primary-on shadow-glow ring-4 ring-canvas transition-[background-color,transform] duration-150 hover:bg-primary-hover active:scale-95"
          >
            <ScanIcon className="h-6 w-6" />
            <span className="text-[10px] font-medium leading-none">สแกน</span>
          </Link>
        </div>

        {TABS.slice(2).map((tab) => (
          <NavTab key={tab.href} {...tab} active={isActive(tab.href)} />
        ))}
      </div>
    </nav>
  );
}
