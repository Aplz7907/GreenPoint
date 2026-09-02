import { Suspense } from 'react';
import { AuthShell } from '@/components/AuthShell';
import { AppIntro, BinLogo } from '@/components/AppIntro';
import { LoginForm } from './LoginForm';

export const metadata = {
  title: 'เข้าสู่ระบบ — Green Point',
};

export default function LoginPage() {
  return (
    <AuthShell
      title="Green Point"
      subtitle="แยกขยะ ถ่ายรูป เก็บแต้ม แลกของรางวัล"
      // The mark only appears here. Login is the screen a first-time user
      // lands on, and it is the only one where the app still has to say what
      // it is; forgot-password keeps the plain leaf.
      mark={
        <span className="inline-flex h-20 w-20 items-center justify-center rounded-card bg-primary-soft p-3 shadow-soft">
          <BinLogo className="h-full w-full" />
        </span>
      }
      below={<AppIntro className="mt-7" />}
      footnote="การเข้าสู่ระบบถือว่าคุณยอมรับให้เราเก็บรูปขยะที่คุณส่งเข้ามา เพื่อใช้ตรวจสอบและคิดแต้มเท่านั้น"
    >
      <Suspense fallback={<div className="card h-80" aria-hidden />}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
