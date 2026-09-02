import Link from 'next/link';
import { QUICK_ACTIONS } from './data';
import { SectionHeader } from './SectionHeader';

export function QuickActions() {
  return (
    <section>
      <SectionHeader title="ทำอะไรต่อดี" caption="ทางลัดที่ใช้บ่อยที่สุด" />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {QUICK_ACTIONS.map(({ label, hint, href, icon: Icon, tone }) => (
          <Link
            key={label}
            href={href}
            className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-5"
          >
            <span
              className={`grid h-11 w-11 place-items-center rounded-xl ring-1 ring-inset ${tone}`}
            >
              <Icon className="h-5 w-5" />
            </span>
            <p className="mt-3 text-sm font-semibold text-slate-900">{label}</p>
            {/* Hidden on the narrowest layout: two tiles per row leaves no width
                for a second line without the label wrapping mid-word. */}
            <p className="mt-0.5 hidden text-xs text-slate-500 sm:block">{hint}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
