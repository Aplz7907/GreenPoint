# ♻️ Green Point

> เว็บแอปเก็บแต้มจากการแยกขยะ — ถ่ายรูปขยะรีไซเคิล → AI ตรวจ → ได้แต้ม → แลกของรางวัล

**Stack:** Next.js 14 (App Router) · TypeScript · Tailwind · Supabase (DB/Auth/Storage) · Google Gemini · Vercel

---

## ⚡ Quick start

```bash
# 1. Supabase: New project → SQL Editor → paste schema.sql ทั้งไฟล์ → Run
# 2. Gemini key: aistudio.google.com/app/apikey
cp .env.example .env.local   # 3. เติม 5 ค่า (ตารางด้านล่าง)
bun install
bun dev                      # → http://localhost:3000
```

ติดขัดตรงไหน ดู [ติดตั้งแบบละเอียด](#-ติดตั้งแบบละเอียด)

---

## สารบัญ

| หัวข้อ | อ่านเมื่อ |
|---|---|
| [กฎความปลอดภัย 4 ข้อ](#-กฎความปลอดภัย-4-ข้อ) | **ก่อนแก้โค้ดทุกครั้ง** |
| [Environment variables](#-environment-variables) | ตั้ง env / deploy |
| [ติดตั้งแบบละเอียด](#-ติดตั้งแบบละเอียด) | ตั้งโปรเจกต์ครั้งแรก |
| [โครงสร้างโปรเจกต์](#-โครงสร้างโปรเจกต์) | หาไฟล์ |
| [Flow ของ /api/submit](#-flow-ของ-post-apisubmit) | แก้ตรรกะให้แต้ม |
| [ค่าแต้มและกติกา](#-ค่าแต้มและกติกา) | ปรับ balance |
| [ระบบกันโกง](#-ระบบกันโกง) | ออกแบบของรางวัล |
| [ข้อจำกัดที่รู้ตัว](#-ข้อจำกัดที่รู้ตัว) | ก่อนเปิดใช้จริง |

---

## 🔒 กฎความปลอดภัย 4 ข้อ

แต้มแลกของจริงได้ คนโกงจึงมีแรงจูงใจ — 4 ข้อนี้ห้ามละเมิด:

| # | กฎ | บังคับใช้ยังไง |
|---|---|---|
| 1 | `GEMINI_API_KEY` + `SUPABASE_SERVICE_ROLE_KEY` **server-only** ห้ามใส่ prefix `NEXT_PUBLIC_` | `lib/supabase/server.ts` และ `lib/gemini.ts` มี `import 'server-only'` — เผลอ import เข้า client แล้ว **build พังทันที** ไม่หลุดเงียบๆ |
| 2 | **แต้มคำนวณฝั่งเซิร์ฟเวอร์ 100%** | client ส่งมาแค่ไฟล์รูป (`body.append('image', file)`) ไม่มีตัวเลข ไม่มีชนิดขยะ — server อ่านราคาจาก `waste_types` เอง |
| 3 | **RLS เปิดทุกตาราง** ผู้ใช้อ่านได้แค่แถวตัวเอง | `points_balance` แก้ได้ผ่าน service role หรือ `SECURITY DEFINER` เท่านั้น + trigger `protect_profile_columns` กันอีกชั้น |
| 4 | **เรียก AI ผ่าน Route Handler เท่านั้น** | `app/api/submit` — ไม่เรียกจากเบราว์เซอร์ |

---

## 🔑 Environment variables

```bash
cp .env.example .env.local
```

| ตัวแปร | หาได้จาก | ฝั่ง |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API → Project URL | public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API → `anon public` | public |
| `NEXT_PUBLIC_SITE_URL` | dev: `http://localhost:3000` | public |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → `service_role` | 🔒 server |
| `GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com/app/apikey) | 🔒 server |

รายละเอียดแต่ละตัวดูใน [`.env.example`](.env.example)

> ⚠️ **สองตัวล่างคือความลับจริง** — service role key ข้าม RLS ได้หมด ใครได้ไปแก้แต้มใครก็ได้
> ห้าม commit ห้าม paste ลงแชท หลุดเมื่อไหร่กด **Reset** ใน Supabase ทันที (`.env.local` อยู่ใน `.gitignore` แล้ว)

**กับดักตอนก๊อป:**
- `NEXT_PUBLIC_SUPABASE_URL` ต้องเป็น origin ล้วน (`https://xxx.supabase.co`) — ห้ามมี `/rest/v1/` ต่อท้าย
- คีย์ JWT ต้องไม่มีจุด `.` เกินท้าย
- ผิดสองข้อนี้ = เจอ 401/404 แบบหาสาเหตุไม่เจอ

---

## 📦 ติดตั้งแบบละเอียด

<details>
<summary><b>1. สร้างโปรเจกต์ Supabase</b></summary>

[supabase.com/dashboard](https://supabase.com/dashboard) → **New project** → ตั้งชื่อ + รหัสผ่าน DB → region ใกล้ไทย (**Singapore**) → รอ ~2 นาที

</details>

<details>
<summary><b>2. รัน schema.sql</b></summary>

**SQL Editor → New query** → ก๊อป [`schema.sql`](schema.sql) **ทั้งไฟล์** → paste → **Run**

ขึ้น `Success` = ผ่าน ไฟล์นี้รันซ้ำได้ ไม่พังถ้าเผลอรันสองรอบ

สร้างให้ทั้งหมด:
- ตาราง `profiles` · `waste_types` · `submissions` · `rewards` · `redemptions`
- RLS policy ทุกตาราง + index
- ฟังก์ชัน `redeem_reward()` · `add_points()` · `admin_review_submission()`
- trigger สร้างแถว `profiles` อัตโนมัติตอนสมัคร
- ข้อมูลตั้งต้น: ค่าแต้มขยะ 4 ชนิด + ของรางวัล 3 ชิ้น
- storage bucket `submissions` แบบ **private** (ไม่ต้องไปกดสร้างเอง)

</details>

<details>
<summary><b>3. ตั้งค่า Auth</b></summary>

**Authentication → URL Configuration**
- Site URL: `http://localhost:3000` (deploy แล้วเปลี่ยนเป็น URL จริง)
- Redirect URLs: เพิ่ม `http://localhost:3000/auth/callback` และ `https://<โดเมนของคุณ>/auth/callback`

**Authentication → Sign In / Providers → Email**
- เปิด Email provider ไว้
- ตอน dev แนะนำ **ปิด "Confirm email"** จะสมัครแล้วเข้าใช้ได้เลย ไม่ต้องรอเมล
  (โค้ดรองรับทั้งสองแบบ — เปิดไว้จะขึ้นหน้า "เช็คอีเมล" ให้เอง)

**ไม่มี Google login** — แอปนี้ใช้อีเมล+รหัสผ่าน และ magic link อย่างเดียว
อยากเพิ่มทีหลัง: เปิด provider ใน Supabase แล้วเรียก `supabase.auth.signInWithOAuth({ provider: 'google' })` — [/auth/callback](app/auth/callback/route.ts) รองรับ OAuth code flow อยู่แล้ว ไม่ต้องแก้

> ⚠️ **เรื่องอีเมล:** SMTP ที่ Supabase แถมมาเป็นของสำหรับเทสต์ จำกัดไม่กี่ฉบับต่อชั่วโมง และมักส่งไม่ถึงจริง
> จะใช้ magic link หรือ "ลืมรหัสผ่าน" ต้องต่อ SMTP ของตัวเองที่ **Project Settings → Authentication → SMTP Settings**
> เช่น [Resend](https://resend.com) ฟรี 3,000 ฉบับ/เดือน — host `smtp.resend.com`, port `465`, user `resend`, password = API key

</details>

<details>
<summary><b>4. ขอ Gemini API key</b></summary>

[aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) → **Create API key** → ก๊อปมา (ขึ้นต้น `AIza...`) ใช้ free tier ได้ ไม่ต้องผูกบัตร

> ⚠️ **อย่าใช้ `gemini-2.0-flash` หรือ `gemini-2.5-flash`** — API key ที่สร้างใหม่จะได้โควตา free tier = 0 กับรุ่นนั้น ยิงไปเจอ 429 ทุกครั้ง
> default ในโค้ดคือ `gemini-3.1-flash-lite` (ตอบใน ~1.5 วินาที) เปลี่ยนได้ผ่าน env `GEMINI_MODEL`

</details>

<details>
<summary><b>5. Deploy ขึ้น Vercel</b></summary>

1. push โค้ดขึ้น GitHub
2. [vercel.com](https://vercel.com) → **Add New → Project** → เลือก repo
3. **Settings → Environment Variables** → ใส่ครบทั้ง 5 ตัว (เปลี่ยน `NEXT_PUBLIC_SITE_URL` เป็นโดเมนจริง)
   ⚠️ ขาด `SUPABASE_SERVICE_ROLE_KEY` หรือ `GEMINI_API_KEY` = `/api/submit` พังทันที
4. Deploy
5. กลับ Supabase → **Authentication → URL Configuration** → เพิ่มโดเมน Vercel ใน **Redirect URLs** และแก้ **Site URL**

</details>

---

## 📁 โครงสร้างโปรเจกต์

```
app/
  api/submit/route.ts     ← หัวใจของระบบ: ตรวจสอบ → เรียก AI → คิดแต้ม → ให้แต้ม
  page.tsx                ← หน้าแรก: แต้มสะสม + ปุ่มกล้อง + รายการล่าสุด
  submit/                 ← หน้าถ่ายรูป (บังคับกล้องหลัง)
  rewards/                ← แลกของรางวัล (เรียก redeem_reward)
  history/                ← ประวัติแบบแบ่งหน้า + รูปย่อ
  login/ register/ forgot-password/ reset-password/
  auth/callback/          ← แลก OAuth code เป็น session
  auth/signout/           ← ออกจากระบบ (ล้าง session)

lib/
  supabase/client.ts      ← client ฝั่ง browser (anon key)
  supabase/server.ts      ← client ฝั่ง server + service role + signed URL
  supabase/middleware.ts  ← refresh session + กันคนไม่ล็อกอิน
  gemini.ts               ← เรียก vision + parser ที่ทนคำตอบพัง
  guards.ts               ← rate limit + เช็ครูปซ้ำ (SHA-256) + รูปคล้าย (dHash)
  phash.ts                ← คำนวณ dHash กันถ่ายขยะชิ้นเดิมซ้ำ
  types.ts  copy.ts  authErrors.ts

schema.sql                ← รันใน Supabase SQL Editor
```

---

## 🔄 Flow ของ `POST /api/submit`

หลักการ: **ด่านฟรีมาก่อนด่านที่เสียเงิน** เสมอ เพื่อประหยัดโควตา Gemini

| # | ขั้นตอน | ไม่ผ่าน | เปลืองโควตา |
|---|---|---|---|
| 1 | ตรวจ session | 401 | – |
| 2 | เช็คว่าถูกแบนไหม | 403 | – |
| 3 | Rate limit — วันละ 5 ครั้ง, เว้น 30 วินาที | 429 | – |
| 4a | SHA-256 เช็ค**ไฟล์**เดิมซ้ำ (ข้ามทุก user) | 409 | – |
| 4b | dHash เช็ค**ภาพ**คล้าย ระยะ ≤ 6/64 bits (ข้ามทุก user) | 409 | – |
| 5 | **เรียก Gemini** | 503 (ไม่บันทึกอะไรเลย) | ✅ ใช่ |
| 6 | Parse JSON แบบระวังตัว (ตัด markdown fence, try/catch) | 503 | – |
| 7 | ตัดสินสถานะ | – | – |
| 8 | คิดแต้มจาก `waste_types` ใน DB | – | – |
| 9 | อัปโหลดรูปเข้า private bucket | – | – |
| 10 | บันทึก + เพิ่มแต้มด้วย service role | – | – |

**AI ตัดสินจบในตัว — ไม่มี admin ไม่มีคิวรอคนตรวจ:**

| เงื่อนไข | ผล |
|---|---|
| `is_screen_photo = true` (ถ่ายจากหน้าจอ) | ❌ rejected · 0 แต้ม |
| `is_recyclable_photo = false` หรือไม่เจอขยะเลย | ❌ rejected · 0 แต้ม |
| item ไหน `confidence < 0.6` | ไม่นับ item นั้น — ไม่จ่ายเงินให้การเดา |
| ไม่มี item ไหนผ่านเกณฑ์ความมั่นใจเลย | ❌ rejected + บอกให้ถ่ายใหม่ให้ชัดขึ้น |
| แต้มรวมเกิน 100 ในครั้งเดียว | จ่าย 100 (เพดานกันโกง) |
| นอกนั้น | ✅ approved · ให้แต้มทันที |

> **Gemini ล่มหรือตอบ JSON พัง → 503 และไม่บันทึกอะไรลง DB เลย**
> ไม่กินสิทธิ์วันละ 5 ครั้ง ไม่ติด cooldown ส่งรูปเดิมซ้ำได้ทันที — ระบบเราพัง ผู้ใช้ไม่ควรเป็นคนรับกรรม

---

## 🎯 ค่าแต้มและกติกา

| ขยะ | แต้ม/ชิ้น |
|---|---|
| ขวดพลาสติก | 10 |
| กระป๋อง | 15 |
| ขวดแก้ว | 8 |
| กล่องกระดาษ | 5 |

แก้ค่าได้ที่ตาราง `waste_types` — ไม่ต้องแก้โค้ด ไม่ต้อง deploy ใหม่

- **วันละ 5 ครั้ง** (นับตามวันของไทย ไม่ใช่ UTC) ← ตัวจำกัดความเสียหายตัวจริง
- **เว้น 30 วินาที** ต่อครั้ง — พอกันสคริปต์ยิงรัว (นานกว่าเวลาที่ Gemini ใช้ตอบด้วยซ้ำ) แต่ไม่ขวางคนแยกขยะจริงที่ถ่ายทีละชนิดต่อเนื่อง
- รูปเดิมส่งซ้ำไม่ได้ แม้เป็นคนละบัญชี

---

## 🛡️ ระบบกันโกง

<details>
<summary><b>ด่านตรวจรูปซ้ำ — จับได้แค่ไหน</b></summary>

- **SHA-256** จับ *ไฟล์เดิมเป๊ะๆ* (อัปโหลดไฟล์เดิมซ้ำ)
- **dHash** จับ *ฉากเดิม* — ถ่ายขวดใบเดิมบนโต๊ะเดิม hash จะห่างกันแค่ไม่กี่ bit (เกณฑ์ ≤ 6/64) เพราะ dHash จำ "โครงสร้างความสว่าง" ไม่ใช่ byte ดิบ จึงทน re-encode / ย่อ / crop / screenshot
- **แต่ dHash หลบได้** ถ้าตั้งใจเปลี่ยนมุม เปลี่ยนพื้นหลัง หรือย้ายขยะไปวางที่อื่น

**เราจงใจตั้งเกณฑ์ให้แคบ (6 bit)** เพราะการเผลอปฏิเสธคนที่แยกขยะจริง (ถ่ายขวด แล้วถ่ายกระป๋องบนโต๊ะเดิม พื้นหลังคล้ายกัน) แย่กว่าการปล่อยรูปซ้ำหลุดไปบ้าง

สรุป: จับโกงแบบขี้เกียจ (ถ่ายซ้ำที่เดิม) ได้ แต่คนตั้งใจโกงยังหลบได้ → เพดานความเสียหาย ~**50 แต้ม/วัน** (5 ครั้ง × ~10 แต้ม)

</details>

**ด่านจริงคือราคาของรางวัล** — ตั้งให้การโกงไม่คุ้ม แทนที่จะไล่จับ:

| ของรางวัล | แต้ม | ถ้าโกงล้วนๆ ต้องใช้ | คิดเป็น |
|---|---|---|---|
| ส่วนลดเครื่องดื่ม 10 บาท | 500 | 10 วัน | ~1 บาท/วัน |
| ถุงผ้า | 1,500 | 30 วัน | – |
| บัตรเติมเงิน 20 บาท | 3,000 | 60 วัน | ~0.3 บาท/วัน |

ไม่มีใครนั่งถ่ายรูปปลอม 2 เดือนเพื่อเงิน 20 บาท ส่วนคนที่แยกขยะจริง (ถ่ายทีละหลายชิ้น) เก็บถึงเป้าได้ในไม่กี่วัน

> อยากเพิ่มมูลค่าของรางวัลให้สูงมากๆ **ต้องทำ challenge code ก่อน** (สุ่มเลข 4 หลักเขียนใส่กระดาษวางข้างขยะ แล้วให้ AI อ่าน) — ทางเดียวที่บังคับให้ถ่ายใหม่จริงทุกครั้ง แลกกับ UX ที่ยุ่งขึ้นมาก

---

## ⚠️ ข้อจำกัดที่รู้ตัว

### โค้ดของรางวัลไม่ตัดตัวเอง

`redeem_reward()` หักแต้ม ตัด stock และออกโค้ด (`ECO-XXXXXXXX`) เป็น atomic — กดรัวแค่ไหนก็หักแต้มครั้งเดียว

**แต่ระบบไม่รู้ว่าโค้ดถูกใช้ไปหรือยัง** — คอลัมน์ `redemptions.status` มีค่า `active` / `used` อยู่ แต่ไม่มีหน้าจอไหนในแอปเปลี่ยนมันเป็น `used` (จงใจไม่ทำใน MVP)

**แปลว่าโค้ดใบเดียวใช้ซ้ำได้ไม่จำกัดครั้ง ถ้าไม่มีคนคุมหน้าร้าน**

ขั้นตอนหน้าร้านตอนนี้ต้องทำมือ:
1. ลูกค้าโชว์โค้ดบนมือถือ
2. พนักงาน **จดโค้ดลงสมุด** แล้วเช็คว่าเคยถูกจดไปแล้วหรือยัง
3. (ถ้าอยากให้ระบบรู้ด้วย) Supabase → Table Editor → `redemptions` → หาแถวนั้น → เปลี่ยน `status` เป็น `used` ด้วยมือ

> ก่อนขยายเป็นหลายร้าน หรือของรางวัลมีมูลค่าสูงขึ้น **ควรทำหน้า `/redeem/[code]`** ให้พนักงานเปิดเช็คโค้ดและกด "ใช้แล้ว" (พร้อม QR ให้สแกน)
> ตารางและคอลัมน์รองรับไว้หมดแล้ว เหลือแค่ UI กับฟังก์ชัน `mark_redemption_used()`

### จงใจตัดออกจาก MVP

เพิ่มเมื่อเจอคนโกงจริงเท่านั้น — อย่าเพิ่งทำตอนนี้:

- ตรวจ EXIF / GPS
- challenge code (เขียนเลขสุ่มใส่กระดาษวางข้างขยะ) — ทางเดียวที่หยุด "ถ่ายขยะชิ้นเดิมซ้ำ" ได้จริง
- หน้าตัดโค้ดสำหรับพนักงาน (`/redeem/[code]`)
- ผู้ดูแลระบบ / คิวให้คนตรวจรูป — AI ตัดสินจบในตัวแล้ว
- สุ่มตรวจ 5% ของรายการที่ approved
