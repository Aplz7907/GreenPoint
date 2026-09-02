import { Fragment } from 'react';
import type { Faculty } from '@/lib/types';

/**
 * The faculty picker, shared by registration and the leaderboard settings.
 *
 * มทร.อีสาน runs five campuses whose unit names overlap heavily — ขอนแก่น's
 * คณะวิศวกรรมศาสตร์ sits two rows from นครราชสีมา's คณะวิศวกรรมศาสตร์และเทคโนโลยี
 * — so the options are grouped by campus rather than listed flat. A student who
 * picks the wrong one competes on the wrong board for the rest of the term.
 */

/** Campus order: the ศูนย์กลาง first, then the four วิทยาเขต. Sorting these by
 *  name would open the list on ขอนแก่น, which is not where most students are. */
const CAMPUS_ORDER = [
  'นครราชสีมา',
  'ขอนแก่น',
  'สกลนคร',
  'สุรินทร์',
  'ร้อยเอ็ด ณ ทุ่งกุลาร้องไห้',
];

function campusRank(campus: string) {
  // The unlabelled bucket sorts first; it only ever exists on its own.
  if (campus === '') return -1;
  const i = CAMPUS_ORDER.indexOf(campus);
  // A campus added to the database but not to the list above still renders —
  // it lands after the known ones instead of disappearing from the picker.
  return i === -1 ? CAMPUS_ORDER.length : i;
}

export function groupByCampus(faculties: Faculty[]) {
  const groups = new Map<string, Faculty[]>();

  for (const f of faculties) {
    const key = f.campus_th ?? 'อื่น ๆ';
    const bucket = groups.get(key);
    if (bucket) bucket.push(f);
    else groups.set(key, [f]);
  }

  // Array.from rather than spreading the iterator: the project targets a
  // downlevel lib where a Map iterator is not spreadable.
  return Array.from(groups.entries()).sort(
    ([a], [b]) => campusRank(a) - campusRank(b) || a.localeCompare(b, 'th')
  );
}

export function FacultySelect({
  id,
  faculties,
  value,
  disabled,
  onChange,
}: {
  id: string;
  faculties: Faculty[];
  /** '' means "not chosen yet". */
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  const groups = groupByCampus(faculties);

  return (
    <select
      id={id}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className="input"
    >
      <option value="">— ยังไม่เลือก —</option>
      {groups.map(([campus, items]) => {
        const options = items.map((f: Faculty) => (
          <option key={f.id} value={f.id}>
            {f.name_th}
          </option>
        ));

        return campus === '' ? (
          <Fragment key="ungrouped">{options}</Fragment>
        ) : (
          <optgroup key={campus} label={`มทร.อีสาน ${campus}`}>
            {options}
          </optgroup>
        );
      })}
    </select>
  );
}
