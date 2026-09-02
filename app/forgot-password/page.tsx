'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { authErrorTh } from '@/lib/authErrors';
import { AuthError, FieldLabel, Spinner } from '@/components/AuthUI';
import { AuthShell } from '@/components/AuthShell';
import { CheckIcon, ChevronLeftIcon } from '@/components/Icons';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendReset(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);

    const origin = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      // The recovery link lands on /auth/callback, which turns the code into a
      // session and then forwards here → /reset-password can call updateUser().
      redirectTo: `${origin}/auth/callback?next=/reset-password`,
    });

    setBusy(false);

    if (error) {
      setError(authErrorTh(error.message));
      return;
    }

    setSent(true);
  }

  return (
    <AuthShell
      title="ลืมรหัสผ่าน"
      subtitle="ใส่อีเมลที่ใช้สมัคร แล้วเราจะส่งลิงก์ไปตั้งรหัสผ่านใหม่ให้"
    >
      {sent ? (
        <div className="card animate-fade-up text-center">
          <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-primary-ink">
            <CheckIcon className="h-6 w-6" />
          </span>
          <h2 className="mt-3 font-semibold">ส่งลิงก์ไปแล้ว</h2>
          <p className="mt-2 text-sm text-ink-subtle">
            ถ้ามีบัญชีที่ใช้อีเมลนี้ เราส่งลิงก์ตั้งรหัสผ่านใหม่ไปให้แล้ว
            (เช็คในกล่องสแปมด้วยนะ)
          </p>
          <p className="mt-1 break-all text-sm font-medium">{email}</p>
          <Link href="/login" className="btn-outline mt-4 w-full">
            กลับไปหน้าเข้าสู่ระบบ
          </Link>
        </div>
      ) : (
        <div className="card">
          <form onSubmit={sendReset} className="space-y-4">
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

            <button
              type="submit"
              disabled={busy || !email.trim()}
              className="btn-primary w-full"
            >
              {busy ? (
                <>
                  <Spinner /> กำลังส่งลิงก์
                </>
              ) : (
                'ส่งลิงก์ตั้งรหัสผ่านใหม่'
              )}
            </button>
          </form>

          {error && <AuthError message={error} />}

          <p className="mt-5 border-t border-line pt-4 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-1 text-sm text-ink-subtle hover:text-primary-ink"
            >
              <ChevronLeftIcon className="h-4 w-4" />
              กลับไปหน้าเข้าสู่ระบบ
            </Link>
          </p>
        </div>
      )}
    </AuthShell>
  );
}
