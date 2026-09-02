/**
 * scripts/repair-profiles.mjs
 *
 * Recreate the public.profiles row for any auth.users row that lost one.
 *
 * The signup trigger (on_auth_user_created) only fires on INSERT into
 * auth.users, so a profile deleted afterwards never comes back on its own —
 * and the app treats a missing profile as a broken account. This mirrors
 * handle_new_user() exactly: same display_name fallback chain, same
 * validate-or-NULL treatment of faculty_id.
 *
 * Only ever inserts. points_balance starts at 0 because the submissions that
 * justified the old balance were cascade-deleted along with the profile.
 *
 *   node scripts/repair-profiles.mjs
 */

import { createClient } from '@supabase/supabase-js';

process.loadEnvFile('.env.local');

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const { data: au, error: ae } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
if (ae) {
  console.error('listUsers failed:', ae.message);
  process.exit(1);
}

const { data: existing, error: pe } = await admin.from('profiles').select('id');
if (pe) {
  console.error('read profiles failed:', pe.message);
  process.exit(1);
}

const { data: faculties } = await admin.from('faculties').select('id').eq('is_active', true);
const activeFaculties = new Set((faculties ?? []).map((f) => f.id));

const have = new Set(existing.map((p) => p.id));
const missing = au.users.filter((u) => !have.has(u.id));

if (missing.length === 0) {
  console.log('Nothing to repair — every account already has a profile.');
  process.exit(0);
}

const rows = missing.map((u) => {
  const meta = u.user_metadata ?? {};

  // Same fallback chain as handle_new_user().
  const displayName =
    meta.full_name || meta.name || (u.email ? u.email.split('@')[0] : null);

  // raw_user_meta_data is user-controlled: anything that is not a live faculty
  // id becomes null rather than blowing up the foreign key.
  const facultyId = Number.parseInt(meta.faculty_id, 10);

  return {
    id: u.id,
    display_name: displayName,
    faculty_id: activeFaculties.has(facultyId) ? facultyId : null,
  };
});

const { error } = await admin.from('profiles').insert(rows);
if (error) {
  console.error('insert failed:', error.message);
  process.exit(1);
}

for (const u of missing) console.log(`created profile for ${u.email}`);
console.log(`\n${missing.length} profile(s) repaired. points_balance starts at 0.`);
process.exit(0);
