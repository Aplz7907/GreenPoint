import { Suspense } from 'react';
import { AuthShell } from '@/components/AuthShell';
import { createClient } from '@/lib/supabase/server';
import { fetchFaculties } from '@/lib/faculties';
import { RegisterForm } from './RegisterForm';

export const metadata = {
  title: 'สมัครสมาชิก — Green Point',
};

export default async function RegisterPage() {
  // Read with the anon key — nobody is signed in on this page. The faculties
  // policy allows anon precisely so this works; an empty list is not fatal,
  // the picker simply hides itself and the user can choose later.
  const supabase = createClient();
  const faculties = await fetchFaculties(supabase);

  return (
    <AuthShell
      title="สมัครสมาชิก"
      subtitle="เริ่มเก็บแต้มจากขยะรีไซเคิลของคุณวันนี้"
      footnote="การสมัครสมาชิกถือว่าคุณยอมรับให้เราเก็บรูปขยะที่คุณส่งเข้ามา เพื่อใช้ตรวจสอบและคิดแต้มเท่านั้น"
    >
      <Suspense fallback={<div className="card h-96" aria-hidden />}>
        <RegisterForm faculties={faculties} />
      </Suspense>
    </AuthShell>
  );
}
