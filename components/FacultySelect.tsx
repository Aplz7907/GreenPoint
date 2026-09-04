import { Fragment } from 'react';
import type { Faculty } from '@/lib/types';

/**
 * The faculty picker, shared by registration and the leaderboard settings.
 *
 * Only มทร.อีสาน ศูนย์กลางนครราชสีมา is served, so today the list is one
 * labelled group. The grouping stays because the label is what tells a student
 * the board they are joining is the นครราชสีมา one, and because adding a
 * วิทยาเขต back is then a one-line change here plus a seed in schema.sql.
 */

/** Campus order: the ศูนย์กลาง first, then any วิทยาเขต, in this order rather
 *  than alphabetically — a campus not listed here still renders, after these. */
const CAMPUS_ORDER = ['นครราชสีมา'];

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
    // Rows with no campus are the ones from a database that has not replayed
    // schema.sql yet. They keep their place in the list but are rendered loose,
    // above the groups — "มทร.อีสาน อื่น ๆ" would name a campus that does not exist.
    const key = f.campus_th ?? '';
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
