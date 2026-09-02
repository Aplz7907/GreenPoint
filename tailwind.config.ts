import type { Config } from 'tailwindcss';

/**
 * Every colour in the app resolves to a CSS variable declared in globals.css,
 * as three space-separated RGB channels. That indirection is what makes dark
 * mode a single swap of `:root` values instead of a `dark:` prefix on every
 * element — a page written against `bg-surface text-ink` is already correct in
 * both themes, and can never drift out of sync between them.
 *
 * `<alpha-value>` keeps the opacity modifiers (`bg-primary/10`) working.
 */
const token = (name: string) => `rgb(var(${name}) / <alpha-value>)`;

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  // Resolved to a literal `light`/`dark` by the bootstrap script in layout.tsx,
  // so "follow the system" is decided once at boot rather than by a media query
  // that a manual toggle would then have to fight.
  darkMode: 'class',
  future: {
    // Touch devices emulate :hover on tap and then leave it stuck. Gating hover
    // styles behind a real pointer removes that, and removes a class of repaint
    // that only ever fired by accident on a phone.
    hoverOnlyWhenSupported: true,
  },
  theme: {
    extend: {
      colors: {
        /** Page background. Light: #F1F8E9. */
        canvas: token('--c-canvas'),
        /** Cards, headers, nav — the raised plane. */
        surface: {
          DEFAULT: token('--c-surface'),
          sunken: token('--c-surface-sunken'),
        },
        line: {
          DEFAULT: token('--c-line'),
          strong: token('--c-line-strong'),
        },
        /** Text. `ink` is body copy, `-muted` secondary, `-subtle` tertiary. */
        ink: {
          DEFAULT: token('--c-ink'),
          muted: token('--c-ink-muted'),
          subtle: token('--c-ink-subtle'),
        },
        /**
         * Forest green #2E7D32. `on` is what sits legibly on top of a filled
         * primary surface; in dark mode the fill lightens and `on` goes dark,
         * because white on a light green is a contrast failure.
         */
        primary: {
          DEFAULT: token('--c-primary'),
          hover: token('--c-primary-hover'),
          on: token('--c-primary-on'),
          soft: token('--c-primary-soft'),
          ink: token('--c-primary-ink'),
        },
        /** Leaf green #66BB6A and mint #A5D6A7 — decorative fills only. Both
         *  are far under 4.5:1 on white, so neither is ever used for text. */
        leaf: token('--c-leaf'),
        mint: token('--c-mint'),
        ok: {
          soft: token('--c-ok-soft'),
          ink: token('--c-ok-ink'),
          line: token('--c-ok-line'),
        },
        warn: {
          soft: token('--c-warn-soft'),
          ink: token('--c-warn-ink'),
          line: token('--c-warn-line'),
        },
        danger: {
          DEFAULT: token('--c-danger'),
          soft: token('--c-danger-soft'),
          ink: token('--c-danger-ink'),
          line: token('--c-danger-line'),
        },
        info: {
          soft: token('--c-info-soft'),
          ink: token('--c-info-ink'),
        },
        /** The fourth home-tile tint. See globals.css for why it exists. */
        accent: {
          soft: token('--c-accent-soft'),
          ink: token('--c-accent-ink'),
        },
        /** The filled green balance panel — green in both themes. */
        hero: {
          from: token('--c-hero-from'),
          to: token('--c-hero-to'),
          ink: token('--c-hero-ink'),
          muted: token('--c-hero-muted'),
        },
        /** The illustrated band at the top of the home screen. Light surface. */
        sky: {
          from: token('--c-sky-from'),
          to: token('--c-sky-to'),
          ink: token('--c-sky-ink'),
        },
      },
      borderRadius: {
        // 16px cards, 12px controls. Two radii, used consistently, read as a
        // deliberate system; five read as an accident.
        card: '1rem',
        control: '0.75rem',
      },
      boxShadow: {
        /**
         * Green-tinted rather than neutral black: a grey shadow under a green
         * card reads as dirt. Both are wide and low-opacity — the brief asks
         * for soft, and a tight dark shadow is the fastest way to make a
         * rounded card look like a 2013 button.
         */
        soft: '0 1px 2px rgb(var(--c-shadow) / 0.04), 0 8px 24px -12px rgb(var(--c-shadow) / 0.16)',
        lift: '0 2px 6px rgb(var(--c-shadow) / 0.06), 0 16px 36px -16px rgb(var(--c-shadow) / 0.24)',
        /** Under the primary CTA only, so the main action floats. */
        glow: '0 6px 20px -8px rgb(var(--c-primary) / 0.55)',
      },
      fontSize: {
        /**
         * Roomier leading than Tailwind's defaults, across the board.
         *
         * Thai stacks vowels and tone marks above and below the baseline, so
         * lines set at 1.4 collide and the whole screen reads as noise. Every
         * size below is the stock size with the line-height opened up; because
         * the utilities carry it, this fixes the entire app at once instead of
         * sprinkling `leading-relaxed` on individual elements.
         */
        xs: ['0.75rem', { lineHeight: '1.25rem' }],
        sm: ['0.875rem', { lineHeight: '1.5rem' }],
        base: ['1rem', { lineHeight: '1.75rem' }],
        lg: ['1.125rem', { lineHeight: '1.9rem' }],
        xl: ['1.25rem', { lineHeight: '2rem' }],
        '2xl': ['1.5rem', { lineHeight: '2.25rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.5rem' }],
        // Display sizes for the balance figure. Tight leading is safe here
        // because these only ever hold Latin digits.
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1' }],
      },
      fontFamily: {
        /**
         * Inter for body, Poppins for display — both loaded latin-only through
         * next/font in layout.tsx, so the Thai glyphs that make up most of this
         * UI still come from the system stack at zero bytes. The webfont buys
         * the numerals, the headings and the brand voice; it does not pay for a
         * Thai subset it would only duplicate.
         */
        sans: [
          'var(--font-inter)',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Noto Sans Thai',
          'Sarabun',
          'sans-serif',
        ],
        display: [
          'var(--font-poppins)',
          'var(--font-inter)',
          'system-ui',
          'Noto Sans Thai',
          'Sarabun',
          'sans-serif',
        ],
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'none' },
        },
        pop: {
          '0%': { opacity: '0', transform: 'scale(0.94)' },
          '60%': { transform: 'scale(1.02)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        /** Slow drift on the decorative leaves. Nothing functional moves. */
        drift: {
          '0%, 100%': { transform: 'translateY(0) rotate(0deg)' },
          '50%': { transform: 'translateY(-6px) rotate(3deg)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.35s cubic-bezier(0.16, 1, 0.3, 1) both',
        pop: 'pop 0.4s cubic-bezier(0.16, 1, 0.3, 1) both',
        drift: 'drift 7s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
