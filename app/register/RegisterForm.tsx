'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { authErrorTh } from '@/lib/authErrors';
import {
  AuthError,
  FieldLabel,
  PasswordInput,
  Spinner,
} from '@/components/AuthUI';
import { CheckIcon } from '@/components/Icons';
import type { Faculty } from '@/lib/types';
import { FacultySelect } from '@/components/FacultySelect';

const MIN_PASSWORD_LENGTH = 8;

type Busy = null | 'signup';

export function RegisterForm({ faculties = [] }: { faculties?: Faculty[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/';

  const [displayName, setDisplayName] = useState('');
  const [facultyId, setFacultyId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState<Busy>(null);
  const [confirmSent, setConfirmSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function callbackUrl() {
    const origin = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    return `${origin}/auth/callback?next=${encodeURIComponent(next)}`;
  }

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`รหัสผ่านต้องยาวอย่างน้อย ${MIN_PASSWORD_LENGTH} ตัวอักษรนะ`);
      return;
    }

    if (password !== confirm) {
      setError('รหัสผ่านสองช่องไม่ตรงกัน ลองพิมพ์ใหม่อีกครั้งนะ');
      return;
    }

    setBusy('signup');

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: callbackUrl(),
        // The on_auth_user_created trigger in schema.sql reads these out of
        // raw_user_meta_data to seed the profile row. It validates faculty_id
        // against the faculties table, so a junk value here costs the user
        // their faculty and nothing else.
        data: {
          full_name: displayName.trim() || null,
          faculty_id: facultyId || null,
        },
      },
    });

    if (error) {
      setBusy(null);
      setError(authErrorTh(error.message));
      return;
    }

    // When email confirmation is ON, Supabase deliberately returns a decoy user
    // with an empty identities array for an address that already exists, rather
    // than leaking "this email is registered". Detect it and say so ourselves —
    // the person is standing here trying to sign up, so it is not a leak.
    if (data.user && data.user.identities?.length === 0) {
      setBusy(null);
      setError('อีเมลนี้สมัครไว้แล้ว ลองเข้าสู่ระบบแทนนะ');
      return;
    }

    // Session present = email confirmation is turned off → straight into the app.
    if (data.session) {
      router.replace(next.startsWith('/') ? next : '/');
      router.refresh();
      return;
    }

    setBusy(null);
    setConfirmSent(true);
  }

  if (confirmSent) {
    return (
      <div className="card animate-fade-up text-center">
        <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-primary-ink">
          <CheckIcon className="h-6 w-6" />
        </span>
        <h2 className="mt-3 font-semibold">อีกขั้นเดียว</h2>
        <p className="mt-2 text-sm text-ink-subtle">เราส่งลิงก์ยืนยันไปที่</p>
        <p className="mt-1 break-all text-sm font-medium">{email}</p>
        <p className="mt-2 text-sm text-ink-subtle">
          เปิดอีเมลแล้วกดลิงก์เพื่อยืนยันบัญชี (ถ้าไม่เจอ ลองดูในกล่องสแปม)
        </p>
        <Link href="/login" className="btn-outline mt-4 w-full">
          ไปหน้าเข้าสู่ระบบ
        </Link>
      </div>
    );
  }

  const passwordTooShort =
    password.length > 0 && password.length < MIN_PASSWORD_LENGTH;
  const mismatch = confirm.length > 0 && password !== confirm;

  return (
    <div className="card">
      <form onSubmit={signUp} className="space-y-4">
        <div>
          <FieldLabel htmlFor="displayName">ชื่อที่อยากให้เรียก</FieldLabel>
          <input
            id="displayName"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="เช่น สมชาย"
            autoComplete="name"
            maxLength={50}
            className="input"
          />
        </div>

        {faculties.length > 0 && (
          <div>
            <FieldLabel htmlFor="faculty">คณะ (ไม่บังคับ)</FieldLabel>
            <FacultySelect
              id="faculty"
              faculties={faculties}
              value={facultyId}
              onChange={setFacultyId}
            />
            <p className="field-hint">
              แต้มของคุณจะไปช่วยคณะแข่งกับคณะอื่น เปลี่ยนทีหลังได้
            </p>
          </div>
        )}

        <div>
          <FieldLabel htmlFor="email">อีเมล</FieldLabel>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            inputMode="email"
            className="input"
          />
        </div>

        <div>
          <FieldLabel htmlFor="password">รหัสผ่าน</FieldLabel>
          <PasswordInput
            id="password"
            value={password}
            onChange={setPassword}
            placeholder="อย่างน้อย 8 ตัวอักษร"
            autoComplete="new-password"
            visible={showPassword}
            onToggleVisible={() => setShowPassword((v) => !v)}
          />
          {passwordTooShort && (
            <p className="mt-1.5 text-sm text-warn-ink">
              สั้นไปนิด — ต้องอย่างน้อย {MIN_PASSWORD_LENGTH} ตัวอักษร
            </p>
          )}
        </div>

        <div>
          <FieldLabel htmlFor="confirm">ยืนยันรหัสผ่าน</FieldLabel>
          <PasswordInput
            id="confirm"
            value={confirm}
            onChange={setConfirm}
            placeholder="พิมพ์รหัสผ่านอีกครั้ง"
            autoComplete="new-password"
            visible={showPassword}
            onToggleVisible={() => setShowPassword((v) => !v)}
          />
          {mismatch && (
            <p className="mt-1.5 text-sm text-warn-ink">
              ยังไม่ตรงกับรหัสผ่านด้านบน
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={
            busy !== null ||
            !email.trim() ||
            password.length < MIN_PASSWORD_LENGTH ||
            password !== confirm
          }
          className="btn-primary w-full"
        >
          {busy === 'signup' ? (
            <>
              <Spinner /> กำลังสมัครสมาชิก
            </>
          ) : (
            'สมัครสมาชิก'
          )}
        </button>
      </form>

      {error && <AuthError message={error} />}

      <p className="mt-5 border-t border-line pt-4 text-center text-sm text-ink-subtle">
        มีบัญชีอยู่แล้ว?{' '}
        <Link
          href={`/login?next=${encodeURIComponent(next)}`}
          className="font-semibold text-primary-ink hover:underline"
        >
          เข้าสู่ระบบ
        </Link>
      </p>
    </div>
  );
}
