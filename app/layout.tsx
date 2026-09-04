import type { Metadata, Viewport } from 'next';
import { Inter, Poppins } from 'next/font/google';
import { AppFrame } from '@/components/AppFrame';
import './globals.css';

/**
 * Latin subset only, on purpose.
 *
 * Almost every string in this UI is Thai, and neither family ships Thai glyphs
 * — the browser falls through to the system Thai face per-glyph, which is what
 * we want and what it already did before. What the webfont buys is the numerals
 * (the balance figure is the most-looked-at element in the app), the headings
 * and a consistent voice across devices, for two woff2 files.
 */
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const poppins = Poppins({
  subsets: ['latin'],
  // 600 and 700 only. `font-display` is only ever paired with font-semibold
  // and font-bold in this codebase, so the 500 face was a third woff2 that
  // downloaded on every visit and rendered nothing.
  weight: ['600', '700'],
  display: 'swap',
  variable: '--font-poppins',
});

export const metadata: Metadata = {
  title: 'Green Point — แยกขยะ เก็บแต้ม',
  description: 'ถ่ายรูปขยะรีไซเคิลที่แยกแล้ว รับแต้มไปแลกของรางวัล',
};

export const viewport: Viewport = {
  // Matches --c-canvas in each theme, so the browser chrome on mobile blends
  // into the page instead of banding against it.
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F1F8E9' },
    { media: '(prefers-color-scheme: dark)', color: '#0F1711' },
  ],
  width: 'device-width',
  initialScale: 1,
  // Deliberately NOT `viewportFit: 'cover'`. Opting into the full screen means
  // every fixed element becomes responsible for its own safe-area inset, and
  // the sticky header would slide under the status bar on a notched phone.
  // The bottom nav's `env(safe-area-inset-bottom)` is harmless either way.
};

/**
 * Resolves the theme before first paint.
 *
 * This has to be an inline, blocking script: any later and the page paints
 * light, then snaps to dark — which is worse than not having dark mode at all.
 * It writes a literal `light`/`dark` class, so "follow the system" is decided
 * here once rather than by a media query the manual toggle would have to fight.
 */
const THEME_BOOTSTRAP = `
(function () {
  try {
    var stored = localStorage.getItem('greenpoint-theme');
    var dark = stored === 'dark' ||
      ((!stored || stored === 'system') &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', dark);
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="th"
      className={`${inter.variable} ${poppins.variable}`}
      // The bootstrap script above edits className before React hydrates.
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      </head>
      <body className="min-h-dvh">
        <AppFrame>{children}</AppFrame>
      </body>
    </html>
  );
}
