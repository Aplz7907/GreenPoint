'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { authErrorTh } from '@/lib/authErrors';
import {
  AuthError,
  FieldLabel,
  PasswordInput,
  Spinner,
} from '@/components/AuthUI';
import { AuthShell } from '@/components/AuthShell';
import { AlertIcon, CheckIcon } from '@/components/Icons';

const MIN_PASSWORD_LENGTH = 8;

export default function ResetPasswordPage() {
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Getting here without a session means the recovery link expired or was
  // already used. Say that plainly instead of showing a form that cannot work.
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      setHasSession(Boolean(data.session));
      setChecking(false);
    });
  }, []);

  async function updatePassword(e: React.FormEvent) {
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

    setBusy(true);

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    setBusy(false);

    if (error) {
      setError(authErrorTh(error.message));
      return;
    }

    setDone(true);
  }

  return (
    <AuthShell title="ตั้งรหัสผ่านใหม่">
      {checking ? (
        <div className="card flex items-center justify-center gap-2 py-10 text-sm text-ink-subtle">
          <Spinner /> กำลังตรวจสอบลิงก์
        </div>
      ) : done ? (
        <div className="card animate-fade-up text-center">
          <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-primary-ink">
            <CheckIcon className="h-6 w-6" />
          </span>
          <h2 className="mt-3 font-semibold">เปลี่ยนรหัสผ่านเรียบร้อย</h2>
          <p className="mt-2 text-sm text-ink-subtle">
            ครั้งหน้าเข้าสู่ระบบด้วยรหัสผ่านใหม่ได้เลย
          </p>
          <button
            type="button"
            onClick={() => {
              router.replace('/');
              router.refresh();
            }}
            className="btn-primary mt-4 w-full"
          >
            เริ่มเก็บแต้มเลย
          </button>
        </div>
      ) : !hasSession ? (
        <div className="card text-center">
          <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-warn-soft text-warn-ink">
            <AlertIcon className="h-6 w-6" />
          </span>
          <h2 className="mt-3 font-semibold">ลิงก์หมดอายุแล้ว</h2>
          <p className="mt-2 text-sm text-ink-subtle">
            ลิงก์ตั้งรหัสผ่านใช้ได้ครั้งเดียวและมีอายุจำกัด ขอลิงก์ใหม่อีกครั้งนะ
          </p>
          <Link href="/forgot-password" className="btn-primary mt-4 w-full">
            ขอลิงก์ใหม่
          </Link>
        </div>
      ) : (
        <div className="card">
          <form onSubmit={updatePassword} className="space-y-4">
            <div>
              <FieldLabel htmlFor="password">รหัสผ่านใหม่</FieldLabel>
              <PasswordInput
                id="password"
                value={password}
                onChange={setPassword}
                placeholder="อย่างน้อย 8 ตัวอักษร"
                autoComplete="new-password"
                visible={show}
                onToggleVisible={() => setShow((v) => !v)}
              />
            </div>

            <div>
              <FieldLabel htmlFor="confirm">ยืนยันรหัสผ่านใหม่</FieldLabel>
              <PasswordInput
                id="confirm"
                value={confirm}
                onChange={setConfirm}
                placeholder="พิมพ์รหัสผ่านอีกครั้ง"
                autoComplete="new-password"
                visible={show}
                onToggleVisible={() => setShow((v) => !v)}
              />
            </div>

            <button
              type="submit"
              disabled={
                busy ||
                password.length < MIN_PASSWORD_LENGTH ||
                password !== confirm
              }
              className="btn-primary w-full"
            >
              {busy ? (
                <>
                  <Spinner /> กำลังบันทึก
                </>
              ) : (
                'บันทึกรหัสผ่านใหม่'
              )}
            </button>
          </form>

          {error && <AuthError message={error} />}
        </div>
      )}
    </AuthShell>
  );
}
