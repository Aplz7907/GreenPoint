import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/supabase/server';
import { AppHeader, PageMain } from '@/components/AppHeader';
import { SubmitForm } from './SubmitForm';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'สแกนขยะ — Green Point',
};

export default async function SubmitPage() {
  const profile = await getProfile();
  if (!profile) redirect('/login');
  if (profile.is_banned) redirect('/');

  return (
    <div className="min-h-dvh">
      <AppHeader title="สแกนขยะ" subtitle="วันละ 5 ครั้ง" backHref="/" />

      {/* No bottom nav on this screen — it is a focused task, and the scan
          button would only offer to restart the thing you are already doing. */}
      <PageMain withNav={false}>
        <SubmitForm />
      </PageMain>
    </div>
  );
}
