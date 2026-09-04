 -- ============================================================================
-- Green Point — schema.sql
-- Run this whole file in the Supabase SQL Editor (Dashboard → SQL Editor → New query).
-- It is idempotent: safe to re-run.
--
-- SECURITY MODEL (read this before changing anything):
--   * RLS is ON for every table.
--   * A user can only ever SELECT their own rows.
--   * profiles.points_balance / is_banned are NOT writable by a user session.
--     They are protected by a trigger and can only change via the service role
--     or a SECURITY DEFINER function.
--   * submissions are INSERTed only by the service role (from /api/submit),
--     because the server is the sole authority on how many points were earned.
--   * redemptions are INSERTed only by redeem_reward(), which is atomic.
--   * There is no admin role and no human review. The AI decides, the server
--     prices the result, and nobody can read another user's rows — ever.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 0. Clean up the admin/human-review machinery from earlier versions.
--
--    Harmless on a fresh database (everything is `if exists`). On a database
--    that already ran the older schema, this removes the `role` column and the
--    policies that let an admin read *everyone's* rows — dead weight now, and
--    a real blast radius if that column were ever flipped by accident.
-- ---------------------------------------------------------------------------

do $$
begin
  if to_regclass('public.profiles') is not null then
    execute 'drop policy if exists "profiles: admin reads all" on public.profiles';
  end if;
  if to_regclass('public.submissions') is not null then
    execute 'drop policy if exists "submissions: admin reads all" on public.submissions';
  end if;
  if to_regclass('public.redemptions') is not null then
    execute 'drop policy if exists "redemptions: admin reads all" on public.redemptions';
  end if;
end
$$;

drop function if exists public.admin_review_submission(uuid, boolean, text);
drop function if exists public.is_admin();

-- Only ever existed to feed the admin review queue.
drop index if exists public.submissions_status_created_idx;

do $$
begin
  if to_regclass('public.profiles') is not null then
    execute 'alter table public.profiles drop column if exists role';
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- 1. Helpers
-- ---------------------------------------------------------------------------

-- True when the current DB role is a trusted backend role (service_role key,
-- SQL editor, or the owner of a SECURITY DEFINER function). Used to gate the
-- protected columns on profiles.
create or replace function public.is_trusted_role()
returns boolean
language sql
stable
as $$
  select current_user in ('service_role', 'postgres', 'supabase_admin');
$$;

-- ---------------------------------------------------------------------------
-- 2. profiles
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  display_name   text,
  points_balance int         not null default 0 check (points_balance >= 0),
  is_banned      boolean     not null default false,
  created_at     timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Auto-create a profile row whenever someone signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Hard guard: a normal user session may never change its own points or ban
-- flag — even if a policy is misconfigured later.
create or replace function public.protect_profile_columns()
returns trigger
language plpgsql
as $$
begin
  if public.is_trusted_role() then
    return new;
  end if;

  if new.points_balance is distinct from old.points_balance
     or new.is_banned is distinct from old.is_banned
     or new.id        is distinct from old.id then
    raise exception 'FORBIDDEN_COLUMN_UPDATE: points_balance and is_banned are server-managed';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_protect_profile_columns on public.profiles;
create trigger trg_protect_profile_columns
  before update on public.profiles
  for each row execute function public.protect_profile_columns();

drop policy if exists "profiles: read own" on public.profiles;
create policy "profiles: read own"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

-- Users may update their own row, but the trigger above still blocks the
-- protected columns, so in practice this only allows renaming yourself.
drop policy if exists "profiles: update own display_name" on public.profiles;
create policy "profiles: update own display_name"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- No INSERT / DELETE policy on purpose: rows come from the signup trigger only.

-- ---------------------------------------------------------------------------
-- 3. waste_types  (the single source of truth for point values)
-- ---------------------------------------------------------------------------

create table if not exists public.waste_types (
  id              serial primary key,
  code            text unique not null check (code in ('plastic_bottle', 'can', 'glass_bottle', 'paper_carton')),
  name_th         text        not null,
  points_per_item int         not null check (points_per_item >= 0),
  is_active       boolean     not null default true
);

alter table public.waste_types enable row level security;

drop policy if exists "waste_types: read active" on public.waste_types;
create policy "waste_types: read active"
  on public.waste_types for select
  to authenticated
  using (is_active);

-- No write policies: point values change only via the SQL editor / service role.

insert into public.waste_types (code, name_th, points_per_item, is_active) values
  ('plastic_bottle', 'ขวดพลาสติก', 10, true),
  ('can',            'กระป๋อง',     15, true),
  ('glass_bottle',   'ขวดแก้ว',     8,  true),
  ('paper_carton',   'กล่องกระดาษ', 5,  true)
on conflict (code) do update
  set name_th         = excluded.name_th,
      points_per_item = excluded.points_per_item,
      is_active       = excluded.is_active;

-- ---------------------------------------------------------------------------
-- 4. submissions
-- ---------------------------------------------------------------------------

create table if not exists public.submissions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid        not null references public.profiles(id) on delete cascade,
  image_url     text,
  image_hash    text        not null,
  image_phash   text,
  ai_result     jsonb,
  points_earned int         not null default 0 check (points_earned >= 0),
  status        text        not null check (status in ('approved', 'pending_review', 'rejected')),
  reject_reason text,
  created_at    timestamptz not null default now()
);

-- For databases created before perceptual hashing existed.
alter table public.submissions
  add column if not exists image_phash text;

create index if not exists submissions_user_created_idx
  on public.submissions (user_id, created_at desc);

-- Exact-duplicate detection: any user's identical file blocks a re-submit.
create index if not exists submissions_image_hash_idx
  on public.submissions (image_hash);

alter table public.submissions enable row level security;

drop policy if exists "submissions: read own" on public.submissions;
create policy "submissions: read own"
  on public.submissions for select
  to authenticated
  using (user_id = auth.uid());

-- No INSERT/UPDATE/DELETE policy for users, ever. /api/submit writes these rows
-- with the service role, after it — not the client — has decided the points.

-- ---------------------------------------------------------------------------
-- Keep points_balance honest when a submission is deleted or re-scored.
--
-- points_balance is a running total kept alongside the submissions that earned
-- it. Delete a submission row — from the Table Editor, from SQL, by cascade
-- when a user is removed — and without this trigger the points it paid out
-- would simply stay in the balance forever, with nothing left to justify them.
--
-- The floor at zero matters: the user may already have spent those points on a
-- reward, and we cannot claw back what is gone. Better a balance of 0 than an
-- exception that blocks the delete, or a negative balance the check constraint
-- would reject anyway.
--
-- SECURITY DEFINER so it runs as the table owner, which is what lets it past
-- protect_profile_columns().
-- ---------------------------------------------------------------------------

create or replace function public.sync_points_on_submission_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    if old.points_earned > 0 then
      update public.profiles
         set points_balance = greatest(points_balance - old.points_earned, 0)
       where id = old.user_id;
    end if;
    return old;
  end if;

  -- UPDATE: apply only the difference, so hand-editing points_earned in the
  -- dashboard cannot silently desync the balance either.
  if new.points_earned is distinct from old.points_earned then
    update public.profiles
       set points_balance =
             greatest(points_balance - old.points_earned + new.points_earned, 0)
     where id = new.user_id;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sync_points_on_submission_delete on public.submissions;
create trigger trg_sync_points_on_submission_delete
  after delete on public.submissions
  for each row execute function public.sync_points_on_submission_change();

drop trigger if exists trg_sync_points_on_submission_update on public.submissions;
create trigger trg_sync_points_on_submission_update
  after update on public.submissions
  for each row execute function public.sync_points_on_submission_change();

-- ---------------------------------------------------------------------------
-- has_similar_image(phash, max_distance)
--
-- "Have I seen this *scene* before?" — the question SHA-256 cannot answer.
--
-- Two dHashes are compared by XORing them and counting the set bits (their
-- Hamming distance). A second photo of the same bottle on the same table lands
-- within a handful of bits of the first; a genuinely different pile does not.
--
-- Done in SQL rather than in Node so we never have to pull every hash in the
-- table over the wire just to compare 64 bits against each of them.
-- ---------------------------------------------------------------------------

create or replace function public.has_similar_image(
  p_phash        text,
  p_max_distance int default 6,
  p_within_days  int default 30
)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.submissions s
    where s.image_phash is not null
      and length(s.image_phash) = 64
      and length(p_phash) = 64
      and s.created_at > now() - make_interval(days => p_within_days)
      and bit_count(s.image_phash::bit(64) # p_phash::bit(64)) <= p_max_distance
  );
$$;

-- Server-side check only. A user session has no business asking whether some
-- image already exists — that would leak other people's submissions.
revoke all on function public.has_similar_image(text, int, int) from public, authenticated, anon;
grant execute on function public.has_similar_image(text, int, int) to service_role;

-- ---------------------------------------------------------------------------
-- 5. rewards
-- ---------------------------------------------------------------------------

create table if not exists public.rewards (
  id          serial primary key,
  name        text    not null,
  description text,
  points_cost int     not null check (points_cost > 0),
  stock       int     not null default 0 check (stock >= 0),
  is_active   boolean not null default true
);

alter table public.rewards enable row level security;

drop policy if exists "rewards: read active" on public.rewards;
create policy "rewards: read active"
  on public.rewards for select
  to authenticated
  using (is_active);

-- Reward economics — this is the anti-fraud lever, not a pricing detail.
--
-- The worst a cheater can do is re-photograph one bottle 5×/day = 50 points/day
-- (the SHA-256 and dHash checks cannot stop a genuinely new photo of the same
-- object; only the daily cap bounds it). So the rewards are priced so that
-- farming is simply not worth the effort:
--
--   500 pts  →  10 days of pure farming for a 10฿ drink   ≈ 1฿/day
--   1,500 pts→  30 days                for a tote bag
--   3,000 pts→  60 days                for 20฿ of credit  ≈ 0.3฿/day
--
-- Nobody grinds two months of fake photos for twenty baht. An honest user who
-- actually sorts a few pieces of waste per photo clears these in days, not
-- months. Adjust freely — it is data, no deploy required.
insert into public.rewards (id, name, description, points_cost, stock, is_active) values
  (1, 'ส่วนลดเครื่องดื่ม 10 บาท', 'ใช้เป็นส่วนลดเครื่องดื่มที่ร้านกาแฟในโครงการ', 500,  100, true),
  (2, 'ถุงผ้ารักษ์โลก',           'ถุงผ้าแคนวาส Green Point ลายพิเศษ',            1500, 20,  true),
  (3, 'บัตรเติมเงิน 20 บาท',      'โค้ดเติมเงินมือถือ มูลค่า 20 บาท',              3000, 10,  true)
on conflict (id) do update
  set name        = excluded.name,
      description = excluded.description,
      points_cost = excluded.points_cost,
      stock       = excluded.stock,
      is_active   = excluded.is_active;

select setval(
  pg_get_serial_sequence('public.rewards', 'id'),
  greatest((select coalesce(max(id), 1) from public.rewards), 1)
);

-- ---------------------------------------------------------------------------
-- 6. redemptions
-- ---------------------------------------------------------------------------

create table if not exists public.redemptions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid        not null references public.profiles(id) on delete cascade,
  reward_id    int         not null references public.rewards(id),
  points_spent int         not null check (points_spent >= 0),
  code         text        not null unique,
  status       text        not null default 'active' check (status in ('active', 'used')),
  created_at   timestamptz not null default now()
);

create index if not exists redemptions_user_created_idx
  on public.redemptions (user_id, created_at desc);

alter table public.redemptions enable row level security;

drop policy if exists "redemptions: read own" on public.redemptions;
create policy "redemptions: read own"
  on public.redemptions for select
  to authenticated
  using (user_id = auth.uid());

-- No INSERT policy: rows are created exclusively by redeem_reward().

-- ---------------------------------------------------------------------------
-- 7. redeem_reward(reward_id) — atomic, race-condition-free
--
--    Locks the reward row, then the profile row (always in that order, so two
--    concurrent redemptions can never deadlock). Everything below runs inside
--    the single implicit transaction of the function call: if any step raises,
--    the deduction and the stock decrement roll back together.
-- ---------------------------------------------------------------------------

create or replace function public.redeem_reward(reward_id int)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id   uuid := auth.uid();
  v_reward    public.rewards%rowtype;
  v_balance   int;
  v_banned    boolean;
  v_code      text;
  v_redemption_id uuid;
begin
  if v_user_id is null then
    raise exception 'UNAUTHENTICATED';
  end if;

  -- 1) Lock the reward. FOR UPDATE serialises concurrent redeemers of the same
  --    reward, which is what makes the stock check below trustworthy.
  select * into v_reward
  from public.rewards r
  where r.id = redeem_reward.reward_id
  for update;

  if not found or not v_reward.is_active then
    raise exception 'REWARD_NOT_FOUND';
  end if;

  if v_reward.stock <= 0 then
    raise exception 'OUT_OF_STOCK';
  end if;

  -- 2) Lock the profile. Same reason: two tabs redeeming at once must queue up
  --    here instead of both reading the same stale balance.
  select p.points_balance, p.is_banned into v_balance, v_banned
  from public.profiles p
  where p.id = v_user_id
  for update;

  if not found then
    raise exception 'PROFILE_NOT_FOUND';
  end if;

  if v_banned then
    raise exception 'USER_BANNED';
  end if;

  if v_balance < v_reward.points_cost then
    raise exception 'INSUFFICIENT_POINTS';
  end if;

  -- 3) Mutate. The points_balance >= 0 check constraint is the last line of
  --    defence if the guard above is ever bypassed.
  update public.profiles
     set points_balance = points_balance - v_reward.points_cost
   where id = v_user_id;

  update public.rewards
     set stock = stock - 1
   where id = v_reward.id;

  -- 4) Issue a code. Retry on the (astronomically unlikely) unique collision.
  loop
    v_code := 'GP-' || upper(substr(md5(gen_random_uuid()::text), 1, 8));
    begin
      insert into public.redemptions (user_id, reward_id, points_spent, code)
      values (v_user_id, v_reward.id, v_reward.points_cost, v_code)
      returning id into v_redemption_id;
      exit;
    exception when unique_violation then
      -- try another code
    end;
  end loop;

  return json_build_object(
    'redemption_id',  v_redemption_id,
    'code',           v_code,
    'reward_name',    v_reward.name,
    'points_spent',   v_reward.points_cost,
    'points_balance', v_balance - v_reward.points_cost
  );
end;
$$;

revoke all on function public.redeem_reward(int) from public;
grant execute on function public.redeem_reward(int) to authenticated;

-- ---------------------------------------------------------------------------
-- 8. add_points(user_id, delta) — the only way points ever go up.
--    Called by the service role from /api/submit, and by nothing else.
-- ---------------------------------------------------------------------------

create or replace function public.add_points(p_user_id uuid, p_delta int)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_balance int;
begin
  update public.profiles
     set points_balance = points_balance + p_delta
   where id = p_user_id
  returning points_balance into v_new_balance;

  if not found then
    raise exception 'PROFILE_NOT_FOUND';
  end if;

  return v_new_balance;
end;
$$;

-- Not callable from a user session — service role / SECURITY DEFINER only.
-- The grant to service_role must be explicit: revoking from PUBLIC also removes
-- the implicit grant that service_role would otherwise have inherited.
revoke all on function public.add_points(uuid, int) from public, authenticated, anon;
grant execute on function public.add_points(uuid, int) to service_role;

-- ---------------------------------------------------------------------------
-- 9. Storage: private bucket for submitted photos.
--    No user-facing storage policies — the app hands out short-lived signed
--    URLs generated server-side, so nobody can enumerate the bucket.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'submissions',
  'submissions',
  false,
  10485760, -- 10 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do update
  set public             = false,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------------
-- 10. Reconcile every balance against the rows that justify it.
--
--     The invariant:  points_balance
--                       = Σ submissions.points_earned
--                       + Σ user_missions.points_awarded
--                       − Σ redemptions.points_spent
--
--     The reconcile itself now lives at the very end of this file (section 21),
--     because user_missions is created in section 20 and a reconcile that ran
--     here would subtract every mission reward from every balance.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 11. Tuning knobs, all data — no deploy needed to change any of them:
--
--     update public.waste_types set points_per_item = 12 where code = 'can';
--     update public.rewards      set stock = 0        where id = 3;
--     update public.profiles     set is_banned = true where id = '<user-uuid>';
-- ---------------------------------------------------------------------------


-- ============================================================================
-- ============================================================================
--  GAMIFICATION  (sections 12–18)
--
--  Everything below is additive. The rules from the header still hold without
--  exception: a user session can read only its own rows, points move only
--  through add_points()/redeem_reward(), and the server — never the client —
--  decides what a photo is worth.
--
--  The leaderboard is the one place that shows a user something about somebody
--  else. It is deliberately NOT an RLS relaxation: profiles stays "read own",
--  and the three functions below are SECURITY DEFINER with a fixed, minimal
--  projection (display name, faculty, totals). There is no query a user can
--  write that returns another person's email, balance, or submissions.
-- ============================================================================
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 12. faculties
--
--     A lookup table rather than free text on profiles, so the faculty
--     leaderboard groups cleanly and a typo cannot fragment a faculty into
--     three. Edit the seed below to match your university.
-- ---------------------------------------------------------------------------

create table if not exists public.faculties (
  id        serial primary key,
  name_th   text unique not null,
  -- Which มทร.อีสาน campus the unit belongs to. Only ศูนย์กลางนครราชสีมา is
  -- served today, but the column stays: it is what the picker groups and labels
  -- by, and it is the marker the retire statements below use to take a campus
  -- out of every board without deleting rows students already point at.
  campus_th text,
  is_active boolean not null default true
);

-- Separate from the CREATE above, which is a no-op on a database that already
-- has the table. This is the line that upgrades an existing deployment.
alter table public.faculties
  add column if not exists campus_th text;

alter table public.faculties enable row level security;

-- Readable while signed OUT as well: the registration form offers a faculty
-- picker, and the list of faculties at a university is public information —
-- there is nothing here to leak.
drop policy if exists "faculties: read active" on public.faculties;
create policy "faculties: read active"
  on public.faculties for select
  to anon, authenticated
  using (is_active);

-- The list this file used to ship was a generic Thai-university placeholder
-- (วิศวกรรมศาสตร์, แพทยศาสตร์, นิติศาสตร์ ...). It is retired rather than
-- deleted: profiles.faculty_id points at these rows, so a DELETE would either
-- fail on the foreign key or orphan a student's choice. Flipping is_active
-- takes them out of every picker and out of get_faculty_leaderboard, and anyone
-- still carrying an old id simply stops appearing on a board until they pick
-- again. `campus_th is null` is the marker, because every real row below has one.
update public.faculties
   set is_active = false
 where campus_th is null;

-- มทร.อีสาน ศูนย์กลางนครราชสีมา — the only campus this deployment serves. Names
-- are the units' own, without the "มทร.อีสาน" prefix, since the whole app
-- belongs to one university.
insert into public.faculties (name_th, campus_th) values
  ('คณะวิศวกรรมศาสตร์และเทคโนโลยี',        'นครราชสีมา'),
  ('คณะบริหารธุรกิจ',                       'นครราชสีมา'),
  ('คณะวิทยาศาสตร์และศิลปศาสตร์',          'นครราชสีมา'),
  ('คณะสถาปัตยกรรมศาสตร์และศิลปสร้างสรรค์', 'นครราชสีมา'),
  ('คณะระบบรางและการขนส่ง',                'นครราชสีมา'),
  ('วิทยาลัยนวัตกรรมวิชาชีพ',               'นครราชสีมา'),
  ('สถาบันสหสรรพศาสตร์',                    'นครราชสีมา')
-- Re-runnable: an existing row is corrected rather than skipped, so fixing a
-- campus here and replaying the file is enough to fix the database.
on conflict (name_th) do update
  set campus_th = excluded.campus_th,
      is_active = true;

-- The other วิทยาเขต (ขอนแก่น, สกลนคร, สุรินทร์, ร้อยเอ็ด) are out of scope for
-- this deployment. Earlier versions of this file seeded some of them, so they
-- are retired the same way the generic placeholders above are — is_active =
-- false rather than DELETE, because profiles.faculty_id may already point at
-- them. Anyone still carrying one drops off the boards until they pick again.
-- Written as "anything that is not นครราชสีมา" so a campus this file never knew
-- about is retired too, and kept after the insert so replaying the file cannot
-- resurrect what it just retired.
update public.faculties
   set is_active = false
 where campus_th is distinct from 'นครราชสีมา';

-- ---------------------------------------------------------------------------
-- 13. New columns on profiles
--
--     faculty_id           — which faculty this user competes for (opt-in).
--     show_on_leaderboard  — the individual leaderboard is opt-OUT. Someone who
--                            turns it off vanishes from the ranking entirely;
--                            their waste still counts toward their faculty,
--                            which is an anonymous aggregate.
--
--     Both are ordinary user-writable columns: protect_profile_columns() guards
--     points_balance / is_banned / id only, so the existing "update own" policy
--     already covers these two and nothing new needs granting.
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists faculty_id int references public.faculties(id),
  add column if not exists show_on_leaderboard boolean not null default true;

create index if not exists profiles_faculty_idx
  on public.profiles (faculty_id)
  where faculty_id is not null;

-- Re-declare the signup trigger now that faculties exists, so a faculty chosen
-- on the registration form survives into the profile.
--
-- It has to arrive through raw_user_meta_data because with email confirmation
-- turned on there is no session at signup time, and therefore no authenticated
-- request that could write the row afterwards.
--
-- raw_user_meta_data is attacker-controlled, so the value is validated rather
-- than trusted: anything that is not a live faculty id becomes NULL. Letting a
-- bad id reach the foreign key would abort the INSERT, and a stranger could
-- then break their own signup — or worse, ours — with a malformed field.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_faculty int;
begin
  begin
    v_faculty := nullif(new.raw_user_meta_data->>'faculty_id', '')::int;
  exception when others then
    v_faculty := null;
  end;

  if v_faculty is not null
     and not exists (
       select 1 from public.faculties f where f.id = v_faculty and f.is_active
     ) then
    v_faculty := null;
  end if;

  insert into public.profiles (id, display_name, faculty_id)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    ),
    v_faculty
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 14. Weight tracking
--
--     "แต้มตามน้ำหนัก" is implemented as a fixed weight per item rather than a
--     guess from the photo. A camera cannot tell an empty bottle from a full
--     one, so asking the AI for grams would invent a number and then pay real
--     points for it — the one thing this system has never done.
--
--     With a constant gram_per_item the arithmetic is identical to per-item
--     pricing, so this does NOT change anyone's points. What it buys is an
--     honest impact figure: "คุณรีไซเคิลไปแล้ว 4.2 กก." computed from the same
--     counts the AI already returns.
--
--     Reference weights (empty, dry, typical Thai campus waste):
--       PET 600ml ≈ 20 g · aluminium can ≈ 15 g · glass bottle ≈ 300 g ·
--       paper carton ≈ 30 g
-- ---------------------------------------------------------------------------

alter table public.waste_types
  add column if not exists gram_per_item int not null default 0
    check (gram_per_item >= 0);

update public.waste_types set gram_per_item = 20  where code = 'plastic_bottle';
update public.waste_types set gram_per_item = 15  where code = 'can';
update public.waste_types set gram_per_item = 300 where code = 'glass_bottle';
update public.waste_types set gram_per_item = 30  where code = 'paper_carton';

-- Per-submission audit trail. base_points is what the price list alone said;
-- multiplier is what streak/tier/event turned it into. Keeping both means a
-- user can always be shown *why* they got what they got, and a suspicious row
-- can be read back years later without re-deriving anything.
alter table public.submissions
  add column if not exists grams_total int not null default 0 check (grams_total >= 0),
  add column if not exists base_points int not null default 0 check (base_points >= 0),
  add column if not exists multiplier   numeric(4,2) not null default 1.00
    check (multiplier >= 1.00 and multiplier <= 5.00);

-- Backfill rows written before these columns existed. ai_result already stores
-- the item list, so the weight is recoverable exactly; base_points falls back to
-- what was actually paid, which for those rows *was* the unmultiplied total.
update public.submissions s
   set grams_total = coalesce((
         select sum(greatest((item->>'count')::int, 0) * coalesce(w.gram_per_item, 0))
         from jsonb_array_elements(s.ai_result->'items') as item
         left join public.waste_types w on w.code = item->>'type'
         where jsonb_typeof(item->'count') = 'number'
       ), 0)
 where s.status = 'approved'
   and s.grams_total = 0
   and jsonb_typeof(s.ai_result->'items') = 'array';

update public.submissions
   set base_points = points_earned
 where base_points = 0
   and points_earned > 0;

-- ---------------------------------------------------------------------------
-- 15. bonus_periods — "โบนัส ×2 ช่วงสอบ"
--
--     A date window with a multiplier. Pure data: opening an exam-week double
--     points event is one INSERT, and ending it early is one UPDATE. No deploy.
--
--     Readable by any signed-in user because the app shows a countdown banner —
--     there is nothing private about a campaign that is being advertised.
-- ---------------------------------------------------------------------------

create table if not exists public.bonus_periods (
  id         serial primary key,
  name_th    text        not null,
  starts_at  timestamptz not null,
  ends_at    timestamptz not null,
  multiplier numeric(3,2) not null check (multiplier > 1.00 and multiplier <= 3.00),
  is_active  boolean     not null default true,
  check (ends_at > starts_at)
);

alter table public.bonus_periods enable row level security;

drop policy if exists "bonus_periods: read active" on public.bonus_periods;
create policy "bonus_periods: read active"
  on public.bonus_periods for select
  to authenticated
  using (is_active and now() between starts_at and ends_at);

create index if not exists bonus_periods_window_idx
  on public.bonus_periods (starts_at, ends_at)
  where is_active;

-- The single active event, or no row. If two overlap — which the schema does
-- not forbid, because banning it would make scheduling awkward — the most
-- generous one wins, so nobody is ever quietly given the worse of two deals.
create or replace function public.get_active_bonus()
returns table (name_th text, multiplier numeric, ends_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select b.name_th, b.multiplier, b.ends_at
  from public.bonus_periods b
  where b.is_active
    and now() >= b.starts_at
    and now() <= b.ends_at
  order by b.multiplier desc, b.ends_at asc
  limit 1;
$$;

grant execute on function public.get_active_bonus() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 16. compute_streak(user_id) — consecutive days with an approved submission
--
--     Counted in Thai calendar days, matching the daily cap in guards.ts. A
--     streak survives "has not sent one *yet* today" and dies only once a whole
--     day has been missed — otherwise every user would watch their streak break
--     at midnight while they were asleep.
-- ---------------------------------------------------------------------------

create or replace function public.compute_streak(p_user_id uuid)
returns int
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_today  date := (now() at time zone 'Asia/Bangkok')::date;
  v_anchor date;
  v_streak int;
begin
  select max((created_at at time zone 'Asia/Bangkok')::date)
    into v_anchor
  from public.submissions
  where user_id = p_user_id and status = 'approved';

  if v_anchor is null or v_anchor < v_today - 1 then
    return 0;
  end if;

  -- Walk back from the anchor day. Numbering the distinct days 0,1,2,… and
  -- keeping only those that still sit exactly that many days before the anchor
  -- stops the count at the first gap: past a missing day the dates fall away
  -- faster than the row numbers, so nothing downstream can match again.
  select count(*)
    into v_streak
  from (
    select d, row_number() over (order by d desc) as rn
    from (
      select distinct (created_at at time zone 'Asia/Bangkok')::date as d
      from public.submissions
      where user_id = p_user_id
        and status = 'approved'
        and (created_at at time zone 'Asia/Bangkok')::date <= v_anchor
    ) days
  ) ranked
  where ranked.d = v_anchor - (ranked.rn - 1)::int;

  return coalesce(v_streak, 0);
end;
$$;

-- Server-side only: a user has no business asking about anyone else's streak,
-- and their own arrives through get_my_stats().
revoke all on function public.compute_streak(uuid) from public, authenticated, anon;
grant execute on function public.compute_streak(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- 16b. get_scoring_context(user_id) — everything /api/submit needs to price a
--      photo, in one round trip.
--
--      Kept as a single function rather than four queries from Node because it
--      runs inside the request the user is waiting on, immediately after a
--      Gemini call that already cost them a second or two.
--
--      `approved_today` exists so the caller can tell whether the streak it is
--      being handed already counts today. It does not for someone sending their
--      first photo of the day, and that submission is about to extend the run —
--      so the multiplier must be computed on streak + 1, not streak.
-- ---------------------------------------------------------------------------

create or replace function public.get_scoring_context(p_user_id uuid)
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_lifetime    bigint;
  v_today_cnt   bigint;
  v_streak      int;
  v_event_name  text;
  v_event_mult  numeric;
begin
  select coalesce(sum(points_earned), 0)::bigint,
         count(*) filter (
           where (created_at at time zone 'Asia/Bangkok')::date
                 = (now() at time zone 'Asia/Bangkok')::date
         )::bigint
    into v_lifetime, v_today_cnt
  from public.submissions
  where user_id = p_user_id and status = 'approved';

  v_streak := public.compute_streak(p_user_id);

  -- Scalars rather than a record: with no event running the SELECT matches no
  -- row, and reading a field off an unassigned record variable is an error in
  -- plpgsql. Two plain variables simply stay NULL, which is the common case.
  select b.name_th, b.multiplier
    into v_event_name, v_event_mult
  from public.get_active_bonus() b;

  return json_build_object(
    'lifetime_points',  v_lifetime,
    'streak_days',      v_streak,
    'approved_today',   v_today_cnt > 0,
    'event_name',       v_event_name,
    'event_multiplier', coalesce(v_event_mult, 1.0)
  );
end;
$$;

revoke all on function public.get_scoring_context(uuid) from public, authenticated, anon;
grant execute on function public.get_scoring_context(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- 17. get_my_stats() — everything the profile header needs, in one round trip
--
--     Lifetime points are the sum of what was *earned*, not the current
--     balance. Spending points on a reward must not demote someone's tier or
--     drop them down the leaderboard — that would punish the exact behaviour
--     the rewards exist to encourage.
-- ---------------------------------------------------------------------------

create or replace function public.get_my_stats()
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid      uuid := auth.uid();
  v_lifetime bigint;
  v_grams    bigint;
  v_count    bigint;
  v_streak   int;
  v_rank     bigint;
  v_total    bigint;
begin
  if v_uid is null then
    raise exception 'UNAUTHENTICATED';
  end if;

  select coalesce(sum(points_earned), 0)::bigint,
         coalesce(sum(grams_total), 0)::bigint,
         count(*)::bigint
    into v_lifetime, v_grams, v_count
  from public.submissions
  where user_id = v_uid and status = 'approved';

  v_streak := public.compute_streak(v_uid);

  select count(*)::bigint into v_total
  from public.profiles
  where not is_banned;

  -- Rank = how many people are strictly ahead, plus one. Ties therefore share a
  -- rank instead of being ordered arbitrarily by uuid.
  select count(*)::bigint + 1
    into v_rank
  from (
    select p.id, coalesce(sum(s.points_earned), 0) as pts
    from public.profiles p
    left join public.submissions s
      on s.user_id = p.id and s.status = 'approved'
    where not p.is_banned
    group by p.id
  ) t
  where t.pts > v_lifetime;

  return json_build_object(
    'lifetime_points',   v_lifetime,
    'grams',             v_grams,
    'submissions_count', v_count,
    'streak_days',       v_streak,
    'rank',              v_rank,
    'total_players',     v_total
  );
end;
$$;

revoke all on function public.get_my_stats() from public;
grant execute on function public.get_my_stats() to authenticated;

-- ---------------------------------------------------------------------------
-- 18. Leaderboards
--
--     The projection is the security boundary. These functions return a name, a
--     faculty and two totals — and nothing else, ever. No id is returned either:
--     the caller gets `is_me` instead, which is enough to highlight their own
--     row and useless for correlating rows to accounts.
-- ---------------------------------------------------------------------------

create or replace function public.get_leaderboard(p_limit int default 50)
returns table (
  rank            bigint,
  display_name    text,
  faculty_th      text,
  lifetime_points bigint,
  grams           bigint,
  is_me           boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with totals as (
    select p.id,
           coalesce(nullif(trim(p.display_name), ''), 'ผู้ใช้ Green Point') as display_name,
           f.name_th as faculty_th,
           coalesce(sum(s.points_earned), 0)::bigint as lifetime_points,
           coalesce(sum(s.grams_total), 0)::bigint   as grams
    from public.profiles p
    left join public.faculties f on f.id = p.faculty_id
    left join public.submissions s
      on s.user_id = p.id and s.status = 'approved'
    where not p.is_banned
      and p.show_on_leaderboard
    group by p.id, p.display_name, f.name_th
  )
  select rank() over (order by t.lifetime_points desc, t.grams desc) as rank,
         t.display_name,
         t.faculty_th,
         t.lifetime_points,
         t.grams,
         t.id = auth.uid() as is_me
  from totals t
  where t.lifetime_points > 0
  order by t.lifetime_points desc, t.grams desc
  limit greatest(1, least(coalesce(p_limit, 50), 100));
$$;

revoke all on function public.get_leaderboard(int) from public;
grant execute on function public.get_leaderboard(int) to authenticated;

-- Faculty standings. An aggregate over people, so opting out of the individual
-- board does not remove your waste from your faculty's total — the number is
-- anonymous either way, and a faculty race that silently ignored some of its
-- members would just be wrong.
--
-- Ranked by average points per member, not the raw sum: the biggest faculty
-- would otherwise win permanently on headcount alone and the race would be over
-- before it started. member_count is returned so the UI can show both.
-- Dropped rather than replaced: campus_th was added to the result and Postgres
-- will not let CREATE OR REPLACE change a function's return type.
drop function if exists public.get_faculty_leaderboard();

create or replace function public.get_faculty_leaderboard()
returns table (
  rank            bigint,
  faculty_th      text,
  campus_th       text,
  member_count    bigint,
  lifetime_points bigint,
  avg_points      numeric,
  grams           bigint,
  is_mine         boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with totals as (
    select f.id,
           f.name_th,
           f.campus_th,
           count(distinct p.id)::bigint                as member_count,
           coalesce(sum(s.points_earned), 0)::bigint   as lifetime_points,
           coalesce(sum(s.grams_total), 0)::bigint     as grams
    from public.faculties f
    join public.profiles p
      on p.faculty_id = f.id and not p.is_banned
    left join public.submissions s
      on s.user_id = p.id and s.status = 'approved'
    where f.is_active
    group by f.id, f.name_th, f.campus_th
  ),
  scored as (
    select t.*,
           round(t.lifetime_points::numeric / greatest(t.member_count, 1), 1) as avg_points
    from totals t
  )
  select rank() over (order by sc.avg_points desc, sc.lifetime_points desc) as rank,
         sc.name_th,
         sc.campus_th,
         sc.member_count,
         sc.lifetime_points,
         sc.avg_points,
         sc.grams,
         sc.id = (select p2.faculty_id from public.profiles p2 where p2.id = auth.uid())
           as is_mine
  from scored sc
  where sc.lifetime_points > 0
  order by sc.avg_points desc, sc.lifetime_points desc;
$$;

revoke all on function public.get_faculty_leaderboard() from public;
grant execute on function public.get_faculty_leaderboard() to authenticated;

-- ---------------------------------------------------------------------------
-- 19. More tuning knobs, still all data:
--
--     -- open an exam-week double-points event
--     insert into public.bonus_periods (name_th, starts_at, ends_at, multiplier)
--     values ('สอบกลางภาค ×2', '2026-09-28 00:00+07', '2026-10-05 23:59+07', 2.0);
--
--     -- end it early
--     update public.bonus_periods set is_active = false where id = 1;
--
--     -- adjust a reference weight
--     update public.waste_types set gram_per_item = 25 where code = 'plastic_bottle';
--
--     -- add a faculty (only ศูนย์กลางนครราชสีมา is seeded above; a unit from
--     -- another วิทยาเขต also needs its campus adding to CAMPUS_ORDER in
--     -- components/FacultySelect.tsx and removing from the retire statement)
--     insert into public.faculties (name_th, campus_th)
--     values ('คณะใหม่', 'นครราชสีมา');
--
--     -- retire one without breaking the profiles that point at it
--     update public.faculties set is_active = false where name_th = '...';
-- ---------------------------------------------------------------------------

-- ============================================================================
-- ============================================================================
--  MISSIONS, PARTNERS AND DROP-OFF POINTS  (section 20)
--
--  The prototype the app is built from asks for four things the sections above
--  do not cover: a mission board ("ภารกิจรักษ์โลก"), a list of places you can
--  actually hand waste over ("จุดรับขยะ"), the partner shops the rewards come
--  from ("ร้านค้าพันธมิตร"), and a sorting guide.
--
--  The guide needs no tables — waste_types already is the guide, so the page
--  reads that. The other three are below.
--
--  The security rules from the header are unchanged. Missions are the second
--  way points can be created, so they get the same treatment submissions got:
--  the client sends an id and nothing else, the database decides whether the
--  goal was met, and the award is written by a SECURITY DEFINER function that a
--  user session cannot call around.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 20.1 partners — the shops behind the rewards.
--
--      Read-only reference data. Rewards point at a partner so the rewards
--      page can say who is actually honouring the coupon, which is the whole
--      value proposition on the business-model slide.
-- ---------------------------------------------------------------------------

create table if not exists public.partners (
  id          serial primary key,
  name        text    not null,
  category_th text,
  description text,
  emoji       text    not null default '🏪',
  address_th  text,
  is_active   boolean not null default true
);

alter table public.partners enable row level security;

drop policy if exists "partners: read active" on public.partners;
create policy "partners: read active"
  on public.partners for select
  to authenticated
  using (is_active);

insert into public.partners (id, name, category_th, description, emoji, address_th, is_active) values
  (1, 'ร้านกาแฟ Green Cup',      'เครื่องดื่ม', 'ส่วนลดเครื่องดื่มทุกแก้ว สำหรับสมาชิก Green Point', '☕',  'โรงอาหารกลาง ชั้น 1',        true),
  (2, 'ร้านอาหารครัวใบเตย',      'อาหาร',      'ลดค่าอาหารตามสั่งเมื่อแสดงโค้ดแลกของรางวัล',        '🍜', 'โรงอาหารคณะวิศวกรรมศาสตร์', true),
  (3, 'ร้านค้าสหกรณ์',           'ของใช้',      'แลกของที่ระลึกและของใช้รักษ์โลก',                    '🛒', 'อาคารกิจการนักศึกษา',       true),
  (4, 'ร้านถ่ายเอกสาร Print+',   'บริการ',      'ส่วนลดค่าพิมพ์งานและถ่ายเอกสาร',                    '🖨',  'ข้างหอสมุดกลาง',            true)
on conflict (id) do update
  set name        = excluded.name,
      category_th = excluded.category_th,
      description = excluded.description,
      emoji       = excluded.emoji,
      address_th  = excluded.address_th,
      is_active   = excluded.is_active;

select setval(
  pg_get_serial_sequence('public.partners', 'id'),
  greatest((select coalesce(max(id), 1) from public.partners), 1)
);

-- Rewards gain an owner. Nullable on purpose: a Green Point-issued reward
-- (the tote bag) has no partner behind it.
alter table public.rewards
  add column if not exists partner_id int references public.partners(id) on delete set null;

update public.rewards set partner_id = 1 where id = 1 and partner_id is null;
update public.rewards set partner_id = 3 where id = 3 and partner_id is null;

-- ---------------------------------------------------------------------------
-- 20.2 drop_off_points — where a person physically hands the waste over.
--
--      lat/lng are stored so the UI can hand off to a real map app rather than
--      ship a map SDK: a link to Google Maps is one anchor tag and works on
--      every phone, which is the right amount of machinery for four bins.
-- ---------------------------------------------------------------------------

create table if not exists public.drop_off_points (
  id        serial primary key,
  name_th   text    not null,
  detail_th text,
  hours_th  text,
  lat       double precision,
  lng       double precision,
  -- waste_types.code values this point accepts. Empty = accepts everything.
  accepts   text[]  not null default '{}',
  is_active boolean not null default true
);

alter table public.drop_off_points enable row level security;

drop policy if exists "drop_off_points: read active" on public.drop_off_points;
create policy "drop_off_points: read active"
  on public.drop_off_points for select
  to authenticated
  using (is_active);

insert into public.drop_off_points (id, name_th, detail_th, hours_th, lat, lng, accepts, is_active) values
  (1, 'จุดรับขยะ โรงอาหารกลาง', 'ถังแยกประเภท 4 สี หน้าทางเข้าโรงอาหาร', 'ทุกวัน 07:00–19:00',
      14.9799, 102.0977, '{plastic_bottle,can,glass_bottle,paper_carton}', true),
  (2, 'จุดรับขยะ อาคารเรียนรวม', 'ชั้น 1 ข้างลิฟต์ฝั่งตะวันออก', 'จันทร์–ศุกร์ 08:00–18:00',
      14.9805, 102.0961, '{plastic_bottle,can,paper_carton}', true),
  (3, 'จุดรับขยะ หอพักนักศึกษา', 'ลานจอดรถหน้าหอพัก', 'ทุกวัน 06:00–21:00',
      14.9788, 102.0993, '{plastic_bottle,can}', true),
  (4, 'ธนาคารขยะรีไซเคิล', 'ชั่งน้ำหนักและรับแต้มพิเศษทุกวันพุธ', 'พุธ 09:00–15:00',
      14.9812, 102.0940, '{plastic_bottle,can,glass_bottle,paper_carton}', true)
on conflict (id) do update
  set name_th   = excluded.name_th,
      detail_th = excluded.detail_th,
      hours_th  = excluded.hours_th,
      lat       = excluded.lat,
      lng       = excluded.lng,
      accepts   = excluded.accepts,
      is_active = excluded.is_active;

select setval(
  pg_get_serial_sequence('public.drop_off_points', 'id'),
  greatest((select coalesce(max(id), 1) from public.drop_off_points), 1)
);

-- ---------------------------------------------------------------------------
-- 20.3 missions — "ทำสำเร็จจะได้รับแต้มเพิ่มเติม"
--
--      A mission is a goal expressed over rows that already exist, never a
--      counter the app increments. `kind` picks which query measures it:
--
--        submit_count  approved submissions in the window
--        grams         reference weight recycled in the window
--        streak        consecutive days, as compute_streak() reports it
--
--      Deriving progress instead of storing it means a mission can be added,
--      retargeted or removed at any time without a migration, and there is no
--      counter for a bug to corrupt. user_missions records only the claim.
--
--      reward_points is capped at 500 by a check: a mission is a bonus on top
--      of real recycling, and the reward prices in section 5 assume nobody can
--      mint a reward out of a single button press.
-- ---------------------------------------------------------------------------

create table if not exists public.missions (
  id             serial primary key,
  code           text    not null unique,
  title_th       text    not null,
  description_th text,
  kind           text    not null check (kind in ('submit_count', 'grams', 'streak')),
  target         int     not null check (target > 0),
  reward_points  int     not null check (reward_points > 0 and reward_points <= 500),
  -- Progress window. A null starts_at counts from the beginning of time.
  starts_at      timestamptz,
  ends_at        timestamptz,
  sort_order     int     not null default 0,
  is_active      boolean not null default true
);

alter table public.missions enable row level security;

drop policy if exists "missions: read active" on public.missions;
create policy "missions: read active"
  on public.missions for select
  to authenticated
  using (is_active);

insert into public.missions
  (id, code, title_th, description_th, kind, target, reward_points, sort_order, is_active) values
  (1, 'first_five',  'นักแยกขยะมือใหม่', 'ส่งรูปขยะรีไซเคิลให้ครบ 5 ครั้ง',   'submit_count', 5,    50,  10, true),
  (2, 'twenty_subs', 'ขาประจำจุดรับขยะ', 'ส่งรูปขยะรีไซเคิลให้ครบ 20 ครั้ง',  'submit_count', 20,   150, 20, true),
  (3, 'streak_7',    'ต่อเนื่อง 7 วัน',   'ส่งขยะติดต่อกัน 7 วันไม่ขาด',       'streak',       7,    100, 30, true),
  (4, 'kilo_1',      'ลดขยะ 1 กิโล',     'รีไซเคิลสะสมให้ครบ 1,000 กรัม',     'grams',        1000, 120, 40, true),
  (5, 'kilo_5',      'นักรบรักษ์โลก',     'รีไซเคิลสะสมให้ครบ 5,000 กรัม',     'grams',        5000, 300, 50, true)
on conflict (id) do update
  set code           = excluded.code,
      title_th       = excluded.title_th,
      description_th = excluded.description_th,
      kind           = excluded.kind,
      target         = excluded.target,
      reward_points  = excluded.reward_points,
      sort_order     = excluded.sort_order,
      is_active      = excluded.is_active;

select setval(
  pg_get_serial_sequence('public.missions', 'id'),
  greatest((select coalesce(max(id), 1) from public.missions), 1)
);

-- ---------------------------------------------------------------------------
-- 20.4 user_missions — one row per claim, and nothing else.
--
--      The primary key is what makes double-claiming impossible: a second
--      insert for the same (user, mission) raises unique_violation inside
--      claim_mission()'s transaction, so the points are never paid twice even
--      if two taps land at the same millisecond.
-- ---------------------------------------------------------------------------

create table if not exists public.user_missions (
  user_id        uuid        not null references public.profiles(id) on delete cascade,
  mission_id     int         not null references public.missions(id) on delete cascade,
  points_awarded int         not null check (points_awarded >= 0),
  claimed_at     timestamptz not null default now(),
  primary key (user_id, mission_id)
);

create index if not exists user_missions_user_claimed_idx
  on public.user_missions (user_id, claimed_at desc);

alter table public.user_missions enable row level security;

drop policy if exists "user_missions: read own" on public.user_missions;
create policy "user_missions: read own"
  on public.user_missions for select
  to authenticated
  using (user_id = auth.uid());

-- No INSERT/UPDATE/DELETE policy: rows come from claim_mission() only.

-- Same deal as submissions: if a claim row is deleted or edited by hand, the
-- balance it justified has to move with it, or the invariant in section 21
-- quietly stops holding.
create or replace function public.sync_points_on_mission_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    if old.points_awarded > 0 then
      update public.profiles
         set points_balance = greatest(points_balance - old.points_awarded, 0)
       where id = old.user_id;
    end if;
    return old;
  end if;

  if new.points_awarded is distinct from old.points_awarded then
    update public.profiles
       set points_balance =
             greatest(points_balance - old.points_awarded + new.points_awarded, 0)
     where id = new.user_id;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sync_points_on_mission_delete on public.user_missions;
create trigger trg_sync_points_on_mission_delete
  after delete on public.user_missions
  for each row execute function public.sync_points_on_mission_change();

drop trigger if exists trg_sync_points_on_mission_update on public.user_missions;
create trigger trg_sync_points_on_mission_update
  after update on public.user_missions
  for each row execute function public.sync_points_on_mission_change();

-- ---------------------------------------------------------------------------
-- 20.5 mission_progress(user, mission) — the one definition of "how far along".
--
--      Both get_my_missions() (which draws the bar) and claim_mission() (which
--      pays out) call this. Two implementations of the same rule would sooner
--      or later disagree, and the way that bug presents is a full progress bar
--      whose claim button insists the goal is not met.
-- ---------------------------------------------------------------------------

create or replace function public.mission_progress(p_user_id uuid, p_mission_id int)
returns bigint
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_m        public.missions%rowtype;
  v_progress bigint := 0;
begin
  select * into v_m from public.missions where id = p_mission_id;
  if not found then
    return 0;
  end if;

  if v_m.kind = 'streak' then
    -- A streak is a property of today, not of a window, so the mission's date
    -- range does not slice it.
    return public.compute_streak(p_user_id);
  end if;

  select coalesce(
           case v_m.kind
             when 'submit_count' then count(*)
             when 'grams'        then sum(s.grams_total)
           end,
           0
         )::bigint
    into v_progress
  from public.submissions s
  where s.user_id = p_user_id
    and s.status = 'approved'
    and (v_m.starts_at is null or s.created_at >= v_m.starts_at)
    and (v_m.ends_at   is null or s.created_at <= v_m.ends_at);

  return v_progress;
end;
$$;

revoke all on function public.mission_progress(uuid, int) from public;
grant execute on function public.mission_progress(uuid, int) to authenticated;

-- ---------------------------------------------------------------------------
-- 20.6 get_my_missions() — the whole mission board in one round trip.
-- ---------------------------------------------------------------------------

create or replace function public.get_my_missions()
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'UNAUTHENTICATED';
  end if;

  return coalesce(
    (
      select json_agg(row_to_json(t) order by t.claimed, t.sort_order, t.id)
      from (
        select m.id,
               m.code,
               m.title_th,
               m.description_th,
               m.kind,
               m.target,
               m.reward_points,
               m.ends_at,
               m.sort_order,
               least(public.mission_progress(v_uid, m.id), m.target) as progress,
               (um.user_id is not null) as claimed,
               um.claimed_at
        from public.missions m
        left join public.user_missions um
          on um.mission_id = m.id and um.user_id = v_uid
        where m.is_active
          and (m.starts_at is null or m.starts_at <= now())
          and (m.ends_at   is null or m.ends_at   >= now())
      ) t
    ),
    '[]'::json
  );
end;
$$;

revoke all on function public.get_my_missions() from public;
grant execute on function public.get_my_missions() to authenticated;

-- ---------------------------------------------------------------------------
-- 20.7 claim_mission(mission_id) — the second and last way points are created.
--
--      Locks the profile row before it checks anything, for the same reason
--      redeem_reward() does: the check and the write have to be one indivisible
--      step, or two taps can pass the same check twice.
-- ---------------------------------------------------------------------------

create or replace function public.claim_mission(p_mission_id int)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid      uuid := auth.uid();
  v_m        public.missions%rowtype;
  v_banned   boolean;
  v_balance  int;
  v_progress bigint;
begin
  if v_uid is null then
    raise exception 'UNAUTHENTICATED';
  end if;

  select is_banned, points_balance
    into v_banned, v_balance
  from public.profiles
  where id = v_uid
  for update;

  if not found then
    raise exception 'PROFILE_NOT_FOUND';
  end if;

  if v_banned then
    raise exception 'USER_BANNED';
  end if;

  select * into v_m
  from public.missions
  where id = p_mission_id
    and is_active
    and (starts_at is null or starts_at <= now())
    and (ends_at   is null or ends_at   >= now());

  if not found then
    raise exception 'MISSION_NOT_FOUND';
  end if;

  if exists (
    select 1 from public.user_missions
    where user_id = v_uid and mission_id = v_m.id
  ) then
    raise exception 'ALREADY_CLAIMED';
  end if;

  v_progress := public.mission_progress(v_uid, v_m.id);

  if v_progress < v_m.target then
    raise exception 'NOT_COMPLETE';
  end if;

  insert into public.user_missions (user_id, mission_id, points_awarded)
  values (v_uid, v_m.id, v_m.reward_points);

  update public.profiles
     set points_balance = points_balance + v_m.reward_points
   where id = v_uid
  returning points_balance into v_balance;

  return json_build_object(
    'mission_id',     v_m.id,
    'title_th',       v_m.title_th,
    'points_awarded', v_m.reward_points,
    'points_balance', v_balance
  );
end;
$$;

revoke all on function public.claim_mission(int) from public;
grant execute on function public.claim_mission(int) to authenticated;

-- ---------------------------------------------------------------------------
-- 21. Reconcile every balance against the rows that justify it.
--
--     The invariant:
--       points_balance = Σ submissions.points_earned
--                      + Σ user_missions.points_awarded
--                      − Σ redemptions.points_spent
--
--     The triggers keep this true from now on; this repairs any balance that
--     already drifted. Safe to re-run — it recomputes from the source rows
--     rather than adjusting by a delta.
--
--     It is the last statement in the file because it reads every table that
--     can move a balance, and all of them have to exist first.
-- ---------------------------------------------------------------------------

with truth as (
  select p.id,
         greatest(
           coalesce((select sum(s.points_earned)   from public.submissions   s  where s.user_id  = p.id), 0)
         + coalesce((select sum(um.points_awarded) from public.user_missions um where um.user_id = p.id), 0)
         - coalesce((select sum(r.points_spent)    from public.redemptions   r  where r.user_id  = p.id), 0),
           0
         )::int as balance
  from public.profiles p
)
update public.profiles p
   set points_balance = t.balance
  from truth t
 where t.id = p.id
   and p.points_balance is distinct from t.balance;
