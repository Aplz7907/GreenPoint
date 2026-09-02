'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { authErrorTh, callbackErrorTh } from '@/lib/authErrors';
import {
  AuthError,
  FieldLabel,
  PasswordInput,
  Spinner,
} from '@/components/AuthUI';
import { CheckIcon } from '@/components/Icons';

type Busy = null | 'password' | 'magic';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState<Busy>(null);
  const [magicSent, setMagicSent] = useState(false);
  const [error, setError] = useState<string | null>(
    callbackErrorTh(searchParams.get('error'))
  );

  // Computed on click, not during render: `window` does not exist while this
  // component is being server-rendered.
  function callbackUrl() {
    const origin = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    return `${origin}/auth/callback?next=${encodeURIComponent(next)}`;
  }

  async function signInWithPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy('password');

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setBusy(null);
      setError(authErrorTh(error.message));
      return;
    }

    // Full refresh so the server re-reads the new session cookie.
    router.replace(next.startsWith('/') ? next : '/');
    router.refresh();
  }

  /** Fallback for people who forgot they ever set a password. */
  async function sendMagicLink() {
    if (!email.trim()) {
      setError('กรอกอีเมลก่อนนะ แล้วเราจะส่งลิงก์ไปให้');
      return;
    }

    setError(null);
    setBusy('magic');

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: callbackUrl() },
    });

    setBusy(null);

    if (error) {
      setError(authErrorTh(error.message));
      return;
    }

    setMagicSent(true);
  }

  if (magicSent) {
    return (
      <div className="card animate-fade-up text-center">
        <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-primary-ink">
          <CheckIcon className="h-6 w-6" />
        </span>
        <h2 className="mt-3 font-semibold">ส่งลิงก์ไปแล้ว</h2>
        <p className="mt-2 text-sm text-ink-subtle">เราส่งลิงก์เข้าสู่ระบบไปที่</p>
        <p className="mt-1 break-all text-sm font-medium">{email}</p>
        <p className="mt-2 text-sm text-ink-subtle">
          เปิดอีเมลแล้วกดลิงก์ได้เลย (เช็คในกล่องสแปมด้วยนะ)
        </p>
        <button
          type="button"
          onClick={() => setMagicSent(false)}
          className="btn-outline mt-4 w-full"
        >
          กลับไปหน้าเข้าสู่ระบบ
        </button>
      </div>
    );
  }

  return (
    <div className="card">
      <form onSubmit={signInWithPassword} className="space-y-4">
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
          <div className="flex items-baseline justify-between">
            <FieldLabel htmlFor="password">รหัสผ่าน</FieldLabel>
            <Link
              href="/forgot-password"
              className="mb-1.5 text-sm text-ink-subtle hover:text-primary-ink"
            >
              ลืมรหัสผ่าน
            </Link>
          </div>
          <PasswordInput
            id="password"
            value={password}
            onChange={setPassword}
            placeholder="••••••••"
            autoComplete="current-password"
            visible={showPassword}
            onToggleVisible={() => setShowPassword((v) => !v)}
          />
        </div>

        <button
          type="submit"
          disabled={busy !== null || !email.trim() || !password}
          className="btn-primary w-full"
        >
          {busy === 'password' ? (
            <>
              <Spinner /> กำลังเข้าสู่ระบบ
            </>
          ) : (
            'เข้าสู่ระบบ'
          )}
        </button>
      </form>

      <div className="my-4 flex items-center gap-3">
        <span className="h-px flex-1 bg-line" />
        <span className="text-xs text-ink-subtle">หรือ</span>
        <span className="h-px flex-1 bg-line" />
      </div>

      <button
        type="button"
        onClick={sendMagicLink}
        disabled={busy !== null}
        className="btn-outline w-full"
      >
        {busy === 'magic' ? (
          <>
            <Spinner /> กำลังส่งลิงก์
          </>
        ) : (
          'ส่งลิงก์เข้าอีเมลแทน'
        )}
      </button>

      {error && <AuthError message={error} />}

      <p className="mt-5 border-t border-line pt-4 text-center text-sm text-ink-subtle">
        ยังไม่มีบัญชี?{' '}
        <Link
          href={`/register?next=${encodeURIComponent(next)}`}
          className="font-semibold text-primary-ink hover:underline"
        >
          สมัครสมาชิก
        </Link>
      </p>
    </div>
  );
}
