import { LeafIcon } from '@/components/Icons';

/** A small CSS diorama keeps the welcome illustration offline and lightweight.
 * The real map below remains the only source of geographic information. */
export function DropOffScene() {
  return (
    <div className="dropoff-scene" aria-hidden="true">
      <div className="dropoff-scene-halo" />
      <div className="dropoff-scene-stage">
        <div className="dropoff-scene-ground" />
        {[0, 1, 2].map(index => (
          <div key={index} className={`dropoff-bin dropoff-bin-${index}`}>
            <div className="dropoff-bin-front"><LeafIcon className="h-6 w-6" /></div>
            <div className="dropoff-bin-side" />
            <div className="dropoff-bin-top"><span /></div>
          </div>
        ))}
        <div className="dropoff-scene-pin"><LeafIcon className="h-6 w-6" /></div>
      </div>
      <span className="dropoff-scene-label">แยกวันนี้ โลกดีขึ้นทุกวัน</span>
    </div>
  );
}
