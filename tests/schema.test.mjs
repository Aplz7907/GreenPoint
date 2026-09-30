import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
const alice = '11111111-1111-4111-8111-111111111111';
const bob = '22222222-2222-4222-8222-222222222222';
let schema;
const submission = (hash = 'a'.repeat(64), overrides = {}) => ({
  image_hash: hash, image_phash: null, image_url: 'test/photo.jpg', ai_result: {},
  status: 'approved', points_earned: 10, base_points: 10, multiplier: 1, grams_total: 20,
  ...overrides,
});
const record = (user, row) => db.query('select public.record_submission($1::uuid, $2::jsonb) as result', [user, JSON.stringify(row)]);
const balance = async user => (await db.query('select points_balance from public.profiles where id = $1', [user])).rows[0].points_balance;

const bootstrap = `
    create role anon; create role authenticated; create role service_role;
    create schema auth; create schema storage;
    create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb);
    create function auth.uid() returns uuid language sql as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
  `;
before(async () => {
  await db.exec(bootstrap);
  schema = await readFile(new URL('../schema.sql', import.meta.url), 'utf8');
  await db.exec(schema);
});
beforeEach(async () => {
  await db.exec('reset role; truncate auth.users cascade;');
  await db.query('insert into auth.users (id, email) values ($1, $2), ($3, $4)', [alice, 'alice@test.invalid', bob, 'bob@test.invalid']);
});
after(() => db.close());

test('fresh catalogue matches the four PDF offers and starts with unconfirmed stock', async () => {
  const rows = (await db.query('select name, description, points_cost, stock, partner_id from public.rewards order by points_cost')).rows;
  assert.deepEqual(rows, [
    {name:'ส่วนลดเครื่องดื่ม 20 บาท', description:'ใช้ได้ที่ร้านกาแฟในมหาวิทยาลัย', points_cost:500, stock:0, partner_id:1},
    {name:'ต้นไม้สำหรับปลูก', description:'ต้นกล้าพร้อมปลูก ร่วมเพิ่มพื้นที่สีเขียว', points_cost:800, stock:0, partner_id:null},
    {name:'คูปองร้านค้าสหกรณ์ 50 บาท', description:'ใช้ซื้อสินค้าในร้านสหกรณ์', points_cost:1200, stock:0, partner_id:3},
    {name:'กระเป๋าผ้ารักษ์โลก', description:'กระเป๋าผ้าลดการใช้ถุงพลาสติก', points_cost:2000, stock:0, partner_id:null},
  ]);
});

test('catalogue upgrade preserves issued coupons, custom rewards, stock and paused offers on replay', async () => {
  const legacy = new PGlite();
  try {
    await legacy.exec(bootstrap);
    await legacy.exec(`
      create table public.profiles (
        id uuid primary key references auth.users(id) on delete cascade,
        display_name text, points_balance int not null default 0 check(points_balance >= 0),
        is_banned boolean not null default false, created_at timestamptz not null default now()
      );
      create table public.rewards (
        id serial primary key, name text not null, description text,
        points_cost int not null check(points_cost > 0), stock int not null default 0 check(stock >= 0),
        is_active boolean not null default true
      );
      create table public.redemptions (
        id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id),
        reward_id int not null references public.rewards(id), points_spent int not null,
        code text not null unique, status text not null default 'active', created_at timestamptz not null default now()
      );
      insert into public.rewards(id,name,points_cost,stock) values
        (1,'ส่วนลดเครื่องดื่ม 10 บาท',500,7), (2,'ถุงผ้ารักษ์โลก',1500,8),
        (3,'บัตรเติมเงิน 20 บาท',3000,9), (42,'ร้านเพิ่มเอง',777,3);
    `);
    await legacy.query('insert into auth.users(id) values ($1)', [alice]);
    await legacy.query('insert into public.profiles(id) values ($1)', [alice]);
    await legacy.query("insert into public.redemptions(user_id,reward_id,points_spent,code) values ($1,1,500,'GP-OLD')", [alice]);
    await legacy.exec(schema);
    const old = (await legacy.query('select id,name,points_cost,stock,is_active from public.rewards where id <= 3 order by id')).rows;
    assert.deepEqual(old.map(r => [r.name,r.points_cost,r.stock,r.is_active]), [
      ['ส่วนลดเครื่องดื่ม 10 บาท',500,7,false], ['ถุงผ้ารักษ์โลก',1500,8,false], ['บัตรเติมเงิน 20 บาท',3000,9,false],
    ]);
    assert.equal((await legacy.query('select name from public.rewards where id=42')).rows[0].name, 'ร้านเพิ่มเอง');
    const ids = (await legacy.query('select id from public.rewards where seed_code is not null order by id')).rows;
    assert.equal(ids.length, 4);
    assert.ok(ids.every(r => r.id > 42));
    await legacy.exec("update public.rewards set stock=5,is_active=false where seed_code='pdf_drink_20'");
    await legacy.exec(schema);
    assert.deepEqual((await legacy.query('select id from public.rewards where seed_code is not null order by id')).rows, ids);
    assert.deepEqual((await legacy.query("select stock,is_active from public.rewards where seed_code='pdf_drink_20'")).rows[0], {stock:5,is_active:false});
    assert.deepEqual((await legacy.query("select reward_id,points_spent,code,status from public.redemptions")).rows[0], {reward_id:1,points_spent:500,code:'GP-OLD',status:'active'});
    // Supabase grants these table reads by default; the fixture makes them
    // explicit so the assertions exercise RLS rather than table privileges.
    await legacy.exec('grant usage on schema auth to authenticated; grant select on public.rewards,public.redemptions to authenticated');
    await legacy.query("select set_config('request.jwt.claim.sub', $1, false)", [alice]);
    await legacy.exec('set role authenticated');
    assert.deepEqual((await legacy.query('select name from public.rewards where id <= 3')).rows, [{name:'ส่วนลดเครื่องดื่ม 10 บาท'}]);
    await assert.rejects(legacy.query('select public.redeem_reward(1)'), /REWARD_NOT_FOUND/);
    await legacy.query("select set_config('request.jwt.claim.sub', $1, false)", [bob]);
    assert.equal((await legacy.query('select name from public.rewards where id <= 3')).rows.length, 0);
  } finally {
    await legacy.close();
  }
});

test('mission progress cannot expose another account through the public RPC', async () => {
  const result = await db.query("select has_function_privilege('authenticated', 'public.mission_progress(uuid,int)', 'execute') as allowed");
  assert.equal(result.rows[0].allowed, false);
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [alice]);
  await db.exec('set role authenticated');
  const own = await db.query('select public.get_my_missions() as missions');
  assert.equal(own.rows[0].missions.length, 5);
});

test('a malformed historical perceptual hash does not block every submission', async () => {
  await db.query("insert into public.submissions (user_id,image_hash,image_phash,status) values ($1,'legacy',$2,'rejected')", [alice, 'x'.repeat(64)]);
  const result = await db.query('select public.has_similar_image($1) as similar', ['0'.repeat(64)]);
  assert.equal(result.rows[0].similar, false);
});

test('replaying schema preserves remaining reward stock', async () => {
  await db.exec('update public.rewards set stock = 7 where id = 1');
  await db.exec(schema);
  assert.equal((await db.query('select stock from public.rewards where id = 1')).rows[0].stock, 7);
});

test('submission and payout commit together; exact duplicates pay once across accounts', async () => {
  await record(alice, submission());
  assert.equal(await balance(alice), 10);
  await assert.rejects(record(bob, submission()), /DUPLICATE_IMAGE/);
  assert.equal(await balance(bob), 0);
  assert.equal((await db.query('select count(*)::int as n from public.submissions')).rows[0].n, 1);
});

test('a payout failure rolls back the submission so the photo can be retried', async () => {
  await db.exec(`create function public.test_fail_payout() returns trigger language plpgsql as $$ begin raise exception 'TEST_PAYOUT_FAILED'; end $$;
    create trigger test_fail_payout before update on public.profiles for each row execute function public.test_fail_payout();`);
  try {
    await assert.rejects(record(alice, submission()), /TEST_PAYOUT_FAILED/);
    assert.equal((await db.query('select count(*)::int as n from public.submissions')).rows[0].n, 0);
    assert.equal(await balance(alice), 0);
  } finally {
    await db.exec('drop trigger test_fail_payout on public.profiles; drop function public.test_fail_payout()');
  }
  await record(alice, submission());
  assert.equal(await balance(alice), 10);
});

test('commit rechecks cooldown, daily cap, ban, and perceptual duplicates', async () => {
  await record(alice, submission('a'.repeat(64), {image_phash: '0'.repeat(64)}));
  await assert.rejects(record(alice, submission('b'.repeat(64))), /COOLDOWN/);
  await assert.rejects(record(bob, submission('b'.repeat(64), {image_phash: '0'.repeat(63) + '1'})), /SIMILAR_IMAGE/);
  await db.query('update public.profiles set is_banned = true where id = $1', [bob]);
  await assert.rejects(record(bob, submission('b'.repeat(64))), /USER_BANNED/);
  await db.query(`insert into public.submissions (user_id,image_hash,status,created_at)
    select $1, 'seed-' || i, 'rejected', (date_trunc('day', now() at time zone 'Asia/Bangkok') at time zone 'Asia/Bangkok') from generate_series(1,4) i`, [alice]);
  await assert.rejects(record(alice, submission('c'.repeat(64))), /DAILY_CAP/);
});

test('atomic writer is backend-only and rejected photos cannot mint points', async () => {
  await assert.rejects(record(alice, submission('a'.repeat(64), {status:'rejected'})), /INVALID_SUBMISSION/);
  for (const role of ['anon','authenticated']) {
    await db.exec(`set role ${role}`);
    await assert.rejects(record(alice, submission()), /permission denied/);
    await db.exec('reset role');
  }
  await db.exec('set role service_role');
  await record(alice, submission());
  await db.exec('reset role');
  assert.equal(await balance(alice), 10);
});

test('mission claims pay once and reward failures leave stock and balance intact', async () => {
  await db.exec('update public.rewards set stock = 1 where id = 1');
  await db.query(`insert into public.submissions (user_id,image_hash,status,grams_total)
    values ($1,'mission-seed','approved',1000)`, [alice]);
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [alice]);
  await db.exec('set role authenticated');
  await db.query('select public.claim_mission(4)');
  await assert.rejects(db.query('select public.claim_mission(4)'), /ALREADY_CLAIMED/);
  await assert.rejects(db.query('select public.redeem_reward(1)'), /INSUFFICIENT_POINTS/);
  await db.exec('reset role');
  assert.equal(await balance(alice), 120);
  await db.query('update public.profiles set points_balance = 1000 where id = $1', [alice]);
  await db.exec('update public.rewards set stock = 1 where id = 1; set role authenticated');
  await db.query('select public.redeem_reward(1)');
  await assert.rejects(db.query('select public.redeem_reward(1)'), /OUT_OF_STOCK/);
  await db.exec('reset role');
  assert.equal(await balance(alice), 500);
  assert.equal((await db.query('select stock from public.rewards where id = 1')).rows[0].stock, 0);
  assert.equal((await db.query('select count(*)::int as n from public.redemptions')).rows[0].n, 1);
});
