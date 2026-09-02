/**
 * scripts/reset-password.mjs
 *
 * Local admin utility: list accounts, or force-set a password on one.
 * Uses SUPABASE_SERVICE_ROLE_KEY, so it bypasses RLS and needs no email.
 * Never import this from app code and never ship it to the client.
 *
 *   node scripts/reset-password.mjs                       # list accounts
 *   node scripts/reset-password.mjs you@mail.com NewPass1 # set password
 */

import { createClient } from '@supabase/supabase-js';

process.loadEnvFile('.env.local');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const [email, password] = process.argv.slice(2);

// No email argument: just show who exists, so you can pick one.
if (!email) {
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (error) {
    console.error('listUsers failed:', error.message);
    process.exit(1);
  }
  if (data.users.length === 0) {
    console.log('No accounts yet.');
    process.exit(0);
  }
  console.log(`${data.users.length} account(s):\n`);
  for (const u of data.users) {
    const confirmed = u.email_confirmed_at ? 'confirmed' : 'NOT confirmed';
    console.log(`  ${u.email}  [${confirmed}]  created ${u.created_at.slice(0, 10)}`);
  }
  console.log('\nSet a password:  node scripts/reset-password.mjs <email> <new-password>');
  process.exit(0);
}

if (!password) {
  console.error('Usage: node scripts/reset-password.mjs <email> <new-password>');
  process.exit(1);
}

if (password.length < 6) {
  console.error('Password must be at least 6 characters (Supabase minimum).');
  process.exit(1);
}

const { data, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
if (listError) {
  console.error('listUsers failed:', listError.message);
  process.exit(1);
}

const user = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
if (!user) {
  console.error(`No account with email: ${email}`);
  console.error('Run without arguments to list the accounts that do exist.');
  process.exit(1);
}

// email_confirm alongside the password: an account stuck at "unconfirmed"
// cannot sign in no matter how correct the new password is.
const { error } = await admin.auth.admin.updateUserById(user.id, {
  password,
  email_confirm: true,
});

if (error) {
  console.error('Update failed:', error.message);
  process.exit(1);
}

console.log(`Password updated for ${user.email}`);
console.log('You can sign in at /login now.');
