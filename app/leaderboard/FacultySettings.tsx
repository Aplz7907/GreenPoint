'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { createClient } from '@/lib/supabase/client';
import type { Faculty } from '@/lib/types';
import { FacultySelect } from '@/components/FacultySelect';

/**
 * Faculty choice and the leaderboard opt-out.
 *
 * Writes straight from the browser with the user's own session: both columns
 * are ordinary profile fields, so the existing "profiles: update own" policy
 * covers them and the protect_profile_columns() trigger still slams the door on
 * points_balance. There is no server action here because there is nothing for a
 * server to decide — unlike points, a faculty is simply what the user says it
 * is.
 */
export function FacultySettings({
  faculties,
  currentFacultyId,
  showOnLeaderboard,
}: {
  faculties: Faculty[];
  currentFacultyId: number | null;
  showOnLeaderboard: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [facultyId, setFacultyId] = useState<number | null>(currentFacultyId);
  const [visible, setVisible] = useState(showOnLeaderboard);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Returns whether the write landed.
   *
   * Both controls update themselves before the round-trip so they feel
   * instant, which means a failed write leaves the UI asserting something the
   * database does not hold — the select showing a faculty the user is not in.
   * The callers use this to put their own state back.
   */
  async function save(next: {
    faculty_id?: number | null;
    show_on_leaderboard?: boolean;
  }): Promise<boolean> {
    setError(null);
    setSaved(false);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError('เซสชันหมดอายุ ลองรีเฟรชหน้านี้แล้วเข้าสู่ระบบใหม่นะ');
      return false;
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update(next)
      .eq('id', user.id);

    if (updateError) {
      setError('บันทึกไม่สำเร็จ ลองใหม่อีกครั้งนะ');
      return false;
    }

    setSaved(true);
    // The boards are rendered on the server, so they only reflect the new
    // faculty after a refetch.
    startTransition(() => router.refresh());
    return true;
  }

  return (
    <section className="mt-8">
      <h2 className="section-title mb-3">ตั้งค่ากระดาน</h2>

      <div className="card space-y-5">
        <div>
          <label htmlFor="faculty" className="field-label">
            คณะของคุณ
          </label>
          <FacultySelect
            id="faculty"
            faculties={faculties}
            value={facultyId === null ? '' : String(facultyId)}
            disabled={isPending}
            onChange={(raw) => {
              const next = raw === '' ? null : Number(raw);
              const previous = facultyId;
              setFacultyId(next);
              void save({ faculty_id: next }).then((ok) => {
                if (!ok) setFacultyId(previous);
              });
            }}
          />
          <p className="field-hint">
            {faculties.length === 0
              ? 'ยังโหลดรายชื่อคณะไม่ได้ ลองรีเฟรชหน้านี้อีกครั้งนะ'
              : 'แต้มของคุณจะถูกนับรวมเข้ากระดานคณะโดยไม่เปิดเผยชื่อ'}
          </p>
        </div>

        <div className="border-t border-line pt-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-ink">
              แสดงชื่อบนกระดานรายบุคคล
            </p>

            {/* A real switch rather than a pill that says "เปิดอยู่": the pill
                made people read the label as the action they were about to
                take instead of the state they were already in. */}
            <button
              type="button"
              role="switch"
              disabled={isPending}
              onClick={() => {
                const next = !visible;
                setVisible(next);
                void save({ show_on_leaderboard: next }).then((ok) => {
                  if (!ok) setVisible(!next);
                });
              }}
              aria-checked={visible}
              aria-label="แสดงชื่อบนกระดานรายบุคคล"
              className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
                visible ? 'bg-primary' : 'bg-line-strong'
              }`}
            >
              {/* The knob takes `primary-on` when the track is `primary` —
                  that pairing is defined per theme precisely so a mark stays
                  legible on the primary fill, in light and dark alike. */}
              <span
                className={`inline-block h-5 w-5 transform rounded-full shadow-soft ring-1 ring-inset ring-black/5 transition-transform duration-200 dark:ring-white/10 ${
                  visible
                    ? 'translate-x-6 bg-primary-on'
                    : 'translate-x-1 bg-surface'
                }`}
              />
            </button>
          </div>

          <p className="field-hint">
            ปิดแล้วชื่อคุณจะหายจากกระดานรายบุคคล แต่แต้มยังนับให้คณะเหมือนเดิม
          </p>
        </div>

        {saved && !error && (
          <p className="text-sm font-medium text-primary-ink">บันทึกแล้ว</p>
        )}

        {error && <p className="text-sm text-danger-ink">{error}</p>}
      </div>
    </section>
  );
}
