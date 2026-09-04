/**
 * The one thing standing between a tap and any visible response.
 *
 * Nearly every route in this app is server-rendered on demand and reads Supabase
 * before it can paint. Without a loading file, the App Router has nothing to show
 * during that wait: the browser stays on the OLD page, fully interactive-looking,
 * for as long as the round trip takes, then swaps. Users read that as the tap not
 * registering and tap again.
 *
 * A route-level loading file also changes what <Link> can prefetch. For a dynamic
 * route, Next prefetches only as far as the nearest loading boundary — with none
 * declared there is nothing to prefetch, so every navigation starts cold.
 *
 * Deliberately generic and reused by every nested route that does not define its
 * own: this is a placeholder for the split second before real content, not a
 * pixel-accurate double of each screen that would then have to be kept in sync.
 */
export default function Loading() {
  return (
    <div className="animate-fade-up">
      {/* Stands in for AppHeader, so the page does not jump vertically when the
          real header replaces it. */}
      <div className="app-header">
        <div className="mx-auto flex max-w-md items-center gap-3 px-4 py-3 sm:max-w-2xl sm:px-6 lg:max-w-4xl">
          <div className="h-9 w-9 shrink-0 animate-pulse rounded-control bg-surface-sunken" />
          <div className="h-5 w-32 animate-pulse rounded bg-surface-sunken" />
        </div>
      </div>

      <div className="mx-auto w-full max-w-md px-4 py-5 pb-28 sm:max-w-2xl sm:px-6 sm:py-8 lg:max-w-4xl md:pb-10">
        <div className="space-y-4">
          <div className="card space-y-3">
            <div className="h-4 w-24 animate-pulse rounded bg-surface-sunken" />
            <div className="h-9 w-40 animate-pulse rounded bg-surface-sunken" />
            <div className="h-2 w-full animate-pulse rounded-full bg-surface-sunken" />
          </div>

          {/* Three rows is enough to read as "a list is coming" without the
              skeleton itself becoming the thing you look at. */}
          {[0, 1, 2].map((i) => (
            <div key={i} className="card flex items-center gap-3">
              <div className="h-10 w-10 shrink-0 animate-pulse rounded-control bg-surface-sunken" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-4 w-1/2 animate-pulse rounded bg-surface-sunken" />
                <div className="h-3 w-1/3 animate-pulse rounded bg-surface-sunken" />
              </div>
            </div>
          ))}
        </div>

        <span className="sr-only" role="status">
          กำลังโหลด
        </span>
      </div>
    </div>
  );
}
