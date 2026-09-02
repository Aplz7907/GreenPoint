/**
 * The drawn scene behind the home screen's headline.
 *
 * Inline SVG rather than a PNG: the band is the first thing that paints on the
 * app's most-visited screen, and the prototype's illustration would be ~200KB
 * of raster that also needs a second version for dark mode. This is ~3KB of
 * markup that ships inside the HTML — no request, no layout shift, no flash.
 *
 * COLOURS ARE DELIBERATELY LITERAL, not theme tokens.
 *
 * `--c-leaf` and `--c-mint` happen to hold the same value in both themes, so
 * the greens here would not have flipped anyway. But an illustration is a
 * picture, not a surface: the sky behind it changes with the theme and the
 * drawing stays the drawing, the way a photograph would. Every colour below is
 * also fixed against the *band*, which is pale blue-green in light mode and
 * near-black in dark — hence the mid-tone palette, which has contrast against
 * both, and the fixed dark ink on the mascot's face, which sits on the globe
 * and never on the page.
 */

/** Mid greens, readable on both the pale and the night sky. */
const CANOPY = '#2E7D32';
const LEAF = '#66BB6A';
const MINT = '#A5D6A7';
const TRUNK = '#7A5C3E';
/** The figure in the park. Warm tones, so it separates from the greenery. */
const SKIN = '#E8B48C';
const SHIRT = '#FFFFFF';
const JEANS = '#4B7FA8';
const HAIR = '#2B2118';
/** Facial features. Sits on LEAF in both themes, so it is fixed. */
const INK = '#173F1C';

/**
 * Clouds. Sized and placed to sit *behind* the headline, so they are texture
 * rather than an element the eye stops on — hence the low opacity and the
 * clearance from the left column where the type lives.
 */
export function HeroClouds({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 90"
      preserveAspectRatio="xMidYMin slice"
      className={className}
      aria-hidden
      focusable="false"
    >
      {/* The sun, half behind the far cloud. */}
      <circle cx="330" cy="26" r="17" fill="#FFD98A" opacity="0.55" />

      <g fill="#FFFFFF" opacity="0.5">
        <path d="M262 34c0-8 7-14 15-14 4 0 8 2 11 5 2-6 8-10 15-10 9 0 17 7 17 16 0 1 0 2-1 3h4c5 0 9 4 9 9s-4 9-9 9h-56c-6 0-11-5-11-11s5-11 11-11z" />
        <path d="M44 58c0-6 5-11 11-11 3 0 6 1 8 3 2-5 6-8 12-8 7 0 13 6 13 13v2h3c4 0 7 3 7 7s-3 7-7 7H44c-4 0-8-3-8-7s4-6 8-6z" />
      </g>
    </svg>
  );
}

/**
 * The park strip along the bottom of the band.
 *
 * `xMidYMax slice` anchors it to its own bottom edge, so on a wider phone the
 * scene grows upward out of the horizon instead of leaving a gap under it. The
 * lower ~40px is covered by the balance card that overlaps the band, which is
 * why nothing meaningful is drawn down there.
 */
export function HeroLandscape({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 96"
      preserveAspectRatio="xMidYMax slice"
      className={className}
      aria-hidden
      focusable="false"
    >
      {/* Town on the far hill — small, flat, and low-contrast, so it reads as
          distance rather than as a second subject. */}
      <g fill={MINT} opacity="0.75">
        <rect x="30" y="40" width="17" height="26" rx="2" />
        <rect x="51" y="30" width="14" height="36" rx="2" />
        <rect x="69" y="46" width="19" height="20" rx="2" />
        <path d="M96 46l12-11 12 11v20H96z" />
      </g>

      {/* Far hill */}
      <path
        d="M0 60c58-18 96 6 148 2s84-22 140-14 74 20 112 16v32H0z"
        fill={MINT}
        opacity="0.6"
      />

      {/* Near hill */}
      <path
        d="M0 78c70-20 118 4 176-2s96-18 152-8 46 12 72 10v18H0z"
        fill={LEAF}
        opacity="0.5"
      />

      {/* Conifers on the near hill. Two sizes so the row is not a comb. */}
      <g>
        <rect x="141" y="62" width="4" height="12" rx="1.5" fill={TRUNK} opacity="0.7" />
        <path d="M143 34l14 30h-28z" fill={CANOPY} opacity="0.75" />
        <path d="M143 46l11 22h-22z" fill={LEAF} opacity="0.6" />

        <rect x="176" y="66" width="3" height="10" rx="1.5" fill={TRUNK} opacity="0.7" />
        <path d="M177.5 46l10 22h-20z" fill={CANOPY} opacity="0.65" />

        <rect x="252" y="64" width="4" height="12" rx="1.5" fill={TRUNK} opacity="0.7" />
        <path d="M254 40l13 27h-26z" fill={CANOPY} opacity="0.7" />
      </g>

      {/* Two round-canopy trees, for the shape variety the prototype has. */}
      <g>
        <rect x="207" y="60" width="4" height="16" rx="2" fill={TRUNK} opacity="0.7" />
        <circle cx="209" cy="50" r="15" fill={CANOPY} opacity="0.7" />
        <circle cx="204" cy="46" r="8" fill={LEAF} opacity="0.5" />

        <rect x="290" y="64" width="3" height="13" rx="1.5" fill={TRUNK} opacity="0.7" />
        <circle cx="291.5" cy="56" r="11" fill={CANOPY} opacity="0.6" />
      </g>

      {/*
        A person carrying a bag to the bins — the second subject from the
        prototype, at the size the scene can actually hold.

        It stands on the FAR hill, not the near one, for a mechanical reason:
        the balance card overlaps the band's bottom ~44px, and anything standing
        on the near horizon is cut off at the knees by it. On the far hill the
        whole figure clears the card. Distance also buys the simplification —
        at 34px a pictogram reads as "someone in the park", where the same
        drawing at hero size would read as clip-art next to the mascot.
      */}
      <g transform="translate(298 16)">
        {/* Bag of recycling, in the near hand. */}
        <path d="M14 20h11l-1.5 15h-8z" fill={CANOPY} />
        <path d="M16 20v-2a3.5 3.5 0 0 1 7 0v2" stroke={CANOPY} strokeWidth="1.6" fill="none" />

        {/* Legs */}
        <path d="M3 24h4v12H3z" fill={JEANS} />
        <path d="M8 24h4v12H8z" fill={JEANS} opacity="0.85" />

        {/* Torso, with the arm that holds the bag reaching right. */}
        <path d="M2 11h11a2 2 0 0 1 2 2v11H0V13a2 2 0 0 1 2-2z" fill={SHIRT} />
        <path d="M13 13h3a1.8 1.8 0 0 1 0 3.6h-3z" fill={SKIN} />

        {/* Head */}
        <circle cx="7.5" cy="5.5" r="5" fill={SKIN} />
        <path d="M2.6 4.6a5 5 0 0 1 9.8 0c-1.4-1.4-3-2-4.9-2s-3.5.6-4.9 2z" fill={HAIR} />
      </g>

      {/* Grass tufts, the detail that keeps the horizon from being a bare edge. */}
      <g stroke={CANOPY} strokeOpacity="0.35" strokeWidth="2.5" strokeLinecap="round" fill="none">
        <path d="M20 84v-7M27 84v-9M34 84v-6" />
        <path d="M356 82v-7M363 82v-9M370 82v-6" />
      </g>
    </svg>
  );
}

/**
 * The mascot: a smiling earth with a leaf sprout.
 *
 * The prototype pairs a globe character with a drawn person. Here the two are
 * split across layers rather than crowded into one: the globe carries the
 * meaning — it is the app's subject — so it takes the hero slot beside the
 * headline, and the person walks the park strip below at scene scale. Side by
 * side at this size, on a 360px phone, neither would have had room to read.
 */
export function HeroMascot({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 120"
      className={className}
      role="img"
      aria-label="โลกยิ้มพร้อมใบไม้"
      focusable="false"
    >
      {/* Contact shadow. Without it the globe floats off the horizon. */}
      <ellipse cx="60" cy="110" rx="32" ry="5" fill={CANOPY} opacity="0.16" />

      <circle cx="60" cy="62" r="38" fill={LEAF} />

      {/* Continents. Clipped to the globe so a landmass cannot spill past the
          rim when the shapes are nudged. */}
      <clipPath id="hero-globe">
        <circle cx="60" cy="62" r="38" />
      </clipPath>
      <g clipPath="url(#hero-globe)" fill={CANOPY} opacity="0.55">
        <path d="M22 44c8-6 16-4 22 1s2 13-5 15-14 1-19-4-4-9 2-12z" />
        <path d="M74 30c10 1 18 7 21 15s-3 14-11 12-13-8-15-15 1-12 5-12z" />
        <path d="M52 82c9-3 19 0 24 7s-1 14-9 14-17-4-20-11 1-9 5-10z" />
      </g>

      {/* Specular highlight — one soft arc, top-left, as in the prototype. */}
      <path
        d="M34 44a34 34 0 0 1 22-16"
        stroke="#FFFFFF"
        strokeOpacity="0.45"
        strokeWidth="6"
        strokeLinecap="round"
        fill="none"
      />

      {/* Face */}
      <g fill={INK}>
        <circle cx="48" cy="60" r="3.6" />
        <circle cx="72" cy="60" r="3.6" />
      </g>
      <path
        d="M49 72c3 4 7 6 11 6s8-2 11-6"
        stroke={INK}
        strokeWidth="3.4"
        strokeLinecap="round"
        fill="none"
      />
      <g fill="#EF8A7F" opacity="0.5">
        <ellipse cx="40" cy="70" rx="5" ry="3.5" />
        <ellipse cx="80" cy="70" rx="5" ry="3.5" />
      </g>

      {/* Leaf sprout */}
      <path
        d="M60 25c0-9 7-16 17-17 1 10-6 18-17 17z"
        fill={CANOPY}
      />
      <path
        d="M60 25c-1-7-7-12-15-12 0 8 6 13 15 12z"
        fill={LEAF}
      />
      <path
        d="M60 30v-6"
        stroke={CANOPY}
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
