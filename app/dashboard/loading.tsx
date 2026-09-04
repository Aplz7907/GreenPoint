/**
 * The dashboard's own loading state.
 *
 * Without this file /dashboard would fall back to the root one, which is drawn
 * with the main app's tokens on the canvas background — against this section's
 * slate/emerald palette that reads as the wrong page flashing up before the
 * right one. Same purpose, this section's colours.
 */
export default function DashboardLoading() {
  return (
    <div className="space-y-8">
      <div className="h-44 animate-pulse rounded-2xl bg-slate-200/70 sm:h-52" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-2xl border border-slate-200 bg-white"
          />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-32 animate-pulse rounded-2xl border border-slate-200 bg-white"
          />
        ))}
      </div>

      <span className="sr-only" role="status">
        กำลังโหลด
      </span>
    </div>
  );
}
