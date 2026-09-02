/** Title block for the non-dashboard pages. Matches the dashboard's rhythm
 *  without pulling in the "see all" affordance those pages have no use for. */
export function PageHeading({
  title,
  caption,
}: {
  title: string;
  caption?: string;
}) {
  return (
    <div className="mb-6">
      <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
        {title}
      </h1>
      {caption && <p className="mt-1 text-sm text-slate-500">{caption}</p>}
    </div>
  );
}
