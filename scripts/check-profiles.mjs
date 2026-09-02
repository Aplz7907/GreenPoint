/**
 * scripts/check-profiles.mjs
 *
 * Read-only health check: does every auth.users row still have the
 * public.profiles row the app expects? Deleting a profile by hand also
 * cascades away that user's submissions and redemptions, so this also
 * reports the row counts.
 *
 *   node scripts/check-profiles.mjs
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

const { data: profiles, error: pe } = await admin
  .from('profiles')
  .select('id, display_name, points_balance, faculty_id');
const { count: subCount } = await admin
  .from('submissions')
  .select('*', { count: 'exact', head: true });
const { count: redCount } = await admin
  .from('redemptions')
  .select('*', { count: 'exact', head: true });

console.log('auth.users     :', au.users.length);
console.log('public.profiles:', pe ? 'ERROR ' + pe.message : profiles.length);
console.log('submissions    :', subCount);
console.log('redemptions    :', redCount);
console.log('');

const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
for (const u of au.users) {
  const p = byId.get(u.id);
  console.log(
    p
      ? `OK       ${u.email}  balance=${p.points_balance}  faculty=${p.faculty_id ?? '-'}`
      : `MISSING  ${u.email}  ${u.id}   <- no profile row`,
  );
}
for (const p of profiles ?? []) {
  if (!au.users.some((u) => u.id === p.id)) console.log(`ORPHAN   profile ${p.id}`);
}

process.exit(0);
