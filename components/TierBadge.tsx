import { tierFor, type Tier } from '@/lib/scoring';

/**
 * A tier is a tinted chip — the palette does the ranking, so bronze/silver/gold
 * never need a gradient or a metallic texture to read as a hierarchy.
 *
 * `onHero` swaps the tint for a translucent white pill: the per-tier tints are
 * all pale, and a pale chip on the filled green balance panel is either
 * invisible or looks like a rendering bug.
 */
export function TierBadge({
  lifetimePoints,
  tier,
  showMultiplier = false,
  onHero = false,
}: {
  lifetimePoints?: number;
  tier?: Tier;
  showMultiplier?: boolean;
  onHero?: boolean;
}) {
  const resolved = tier ?? tierFor(lifetimePoints ?? 0);

  return (
    <span
      className={`badge shrink-0 ${
        onHero
          ? 'bg-hero-ink/15 text-hero-ink ring-1 ring-inset ring-hero-ink/25'
          : resolved.className
      }`}
    >
      {resolved.name_th}
      {showMultiplier && resolved.multiplier > 1 && (
        <span className="opacity-80">×{resolved.multiplier}</span>
      )}
    </span>
  );
}
