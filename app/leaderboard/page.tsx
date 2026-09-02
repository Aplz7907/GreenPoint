import { redirect } from 'next/navigation';

import { createClient, getProfile } from '@/lib/supabase/server';
import { AppHeader, PageMain } from '@/components/AppHeader';
import { BottomNav } from '@/components/BottomNav';
import type { FacultyStanding, LeaderboardRow } from '@/lib/types';
import { fetchFaculties } from '@/lib/faculties';

import { LeaderboardTabs } from './LeaderboardTabs';
import { FacultySettings } from './FacultySettings';

export const dynamic = 'force-dynamic';

/** How many individual rows to show. The RPC hard-caps this at 100 anyway. */
const TOP_N = 50;

export default async function LeaderboardPage() {
  const profile = await getProfile();
  if (!profile) redirect('/login');
  if (profile.is_banned) redirect('/');

  const supabase = createClient();

  // Three independent reads — the two boards do not depend on each other, and
  // the faculty list is only needed for the picker at the bottom.
  const [people, faculties, facultyOptions] = await Promise.all([
    supabase.rpc('get_leaderboard', { p_limit: TOP_N }),
    supabase.rpc('get_faculty_leaderboard'),
    fetchFaculties(supabase),
  ]);

  const rows = (people.data ?? []) as LeaderboardRow[];
  const standings = (faculties.data ?? []) as FacultyStanding[];
  const options = facultyOptions;

  const me = rows.find((r) => r.is_me) ?? null;

  return (
    <div className="min-h-dvh">
      <AppHeader
        title="กระดานผู้นำ"
        subtitle={
          me
            ? `ตอนนี้คุณอยู่อันดับ ${me.rank.toLocaleString('th-TH')}`
            : profile.show_on_leaderboard
              ? 'ส่งรูปขยะให้ผ่านสักครั้ง แล้วชื่อคุณจะขึ้นกระดานนี้'
              : 'คุณปิดการแสดงชื่อบนกระดานอยู่ — เปิดได้ที่ด้านล่าง'
        }
      />

      <PageMain>
        <LeaderboardTabs rows={rows} standings={standings} />

        <FacultySettings
          faculties={options}
          currentFacultyId={profile.faculty_id ?? null}
          showOnLeaderboard={profile.show_on_leaderboard ?? true}
        />
      </PageMain>

      <BottomNav />
    </div>
  );
}
