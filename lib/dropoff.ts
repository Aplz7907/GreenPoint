import type { DropOffPoint, WasteCode } from '@/lib/types';

export type LocatedDropOffPoint = DropOffPoint & { lat: number; lng: number };

// Missing coordinates stay in the list: guessing a location would send a
// student carrying waste to the wrong place.
export function hasCoordinates(point: DropOffPoint): point is LocatedDropOffPoint {
  return typeof point.lat === 'number' && Number.isFinite(point.lat)
    && Math.abs(point.lat) <= 90
    && typeof point.lng === 'number' && Number.isFinite(point.lng)
    && Math.abs(point.lng) <= 180;
}

export function acceptsWaste(point: DropOffPoint, code: WasteCode | ''): boolean {
  return !code || point.accepts.length === 0 || point.accepts.includes(code);
}

export function directionsHref(point: DropOffPoint): string | null {
  if (!hasCoordinates(point)) return null;
  return `https://www.google.com/maps/dir/?api=1&destination=${point.lat},${point.lng}&travelmode=walking`;
}
