import { Coins, Target } from 'lucide-react';
import { MISSIONS, type Mission } from './data';
import { SectionHeader } from './SectionHeader';

/** Badge tint per cadence. Kept as a lookup rather than a ternary chain so a
 *  fourth cadence is one line, not a rewrite. */
const BADGE_TONE: Record<Mission['badge'], string> = {
  รายวัน: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  รายสัปดาห์: 'bg-sky-50 text-sky-700 ring-sky-100',
  พิเศษ: 'bg-violet-50 text-violet-700 ring-violet-100',
};

function MissionCard({ title, detail, current, goal, reward, badge }: Mission) {
  // A goal of 0 divides to Infinity and a goal already overshot gives >100,
  // and both reach CSS as a width — `width: NaN%` is dropped by the browser and
  // `width: 140%` runs the fill out of its own rounded track. Clamp once here so
  // neither the bar nor the label can render a value that does not exist.
  const pct =
    goal > 0 ? Math.min(100, Math.max(0, Math.round((current / goal) * 100))) : 0;
  const done = goal > 0 && current >= goal;

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          <p className="mt-0.5 text-xs text-slate-500">{detail}</p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ring-inset ${BADGE_TONE[badge]}`}
        >
          {badge}
        </span>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>
            ความคืบหน้า {current}/{goal}
          </span>
          <span className="font-medium text-slate-700">{pct}%</span>
        </div>
        <div
          role="progressbar"
          aria-valuenow={current}
          aria-valuemin={0}
          aria-valuemax={goal}
          aria-label={title}
          className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100"
        >
          <div
            className={`h-full rounded-full transition-[width] duration-500 ${
              done ? 'bg-emerald-500' : 'bg-gradient-to-r from-emerald-500 to-teal-500'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-100">
          <Coins className="h-3.5 w-3.5" />+{reward} แต้ม
        </span>
        <button
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
            done
              ? 'bg-emerald-600 text-white hover:bg-emerald-700'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          {done ? 'รับรางวัล' : 'ทำต่อ'}
        </button>
      </div>
    </article>
  );
}

export function MissionList() {
  return (
    <section>
      <SectionHeader
        title="ภารกิจรักษ์โลก"
        caption="ทำครบแล้วรับแต้มโบนัสทันที"
        actionLabel="ดูทั้งหมด"
        actionHref="/dashboard/missions"
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {MISSIONS.map((mission) => (
          <MissionCard key={mission.title} {...mission} />
        ))}
      </div>

      <p className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-xs text-emerald-800 ring-1 ring-inset ring-emerald-100">
        <Target className="h-4 w-4 shrink-0" />
        ภารกิจรายวันรีเซ็ตทุกเที่ยงคืน — สแกนอย่างน้อยวันละ 1 ชิ้นเพื่อรักษาสตรีค
      </p>
    </section>
  );
}
