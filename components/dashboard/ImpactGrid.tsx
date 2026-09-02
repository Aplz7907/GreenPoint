import { STATS, type Stat } from './data';

function StatCard({ label, value, unit, delta, icon: Icon, tone }: Stat) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-slate-500">{label}</p>
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${tone}`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>

      <p className="mt-3 flex items-baseline gap-1">
        <span className="text-2xl font-semibold tracking-tight text-slate-900">
          {value}
        </span>
        {unit && <span className="text-sm text-slate-500">{unit}</span>}
      </p>
      <p className="mt-1 text-xs text-emerald-700">{delta}</p>
    </article>
  );
}

/** 1 column on phones, 2 on tablets, 4 from `lg` — the four figures read as a
 *  row of peers only once they all fit on one line. */
export function ImpactGrid() {
  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {STATS.map((stat) => (
        <StatCard key={stat.label} {...stat} />
      ))}
    </section>
  );
}
