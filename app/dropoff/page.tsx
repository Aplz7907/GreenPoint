import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient, getProfile } from '@/lib/supabase/server';
import { AppHeader, PageMain } from '@/components/AppHeader';
import { BottomNav } from '@/components/BottomNav';
import { DropOffExplorer } from '@/components/DropOffExplorer';
import { BookIcon, MapPinIcon } from '@/components/Icons';
import type { DropOffPoint } from '@/lib/types';
import 'maplibre-gl/dist/maplibre-gl.css';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'แผนที่จุดรับขยะ 3D — Green Point',
};

export default async function DropOffPage() {
  const profile = await getProfile();
  if (!profile) redirect('/login');

  const supabase = createClient();
  const { data, error } = await supabase
    .from('drop_off_points')
    .select('id, name_th, detail_th, hours_th, lat, lng, accepts, is_active')
    .eq('is_active', true)
    .order('id');

  const points = (data ?? []) as DropOffPoint[];

  return (
    <div className="min-h-dvh">
      <AppHeader title="แผนที่จุดรับขยะ 3D" backHref="/" subtitle="ค้นหาจุดรับ เลือกประเภทขยะ แล้วไปส่งกัน" />
      <PageMain>
        {error ? (
          <div className="card text-center" role="alert">
            <p className="font-medium">โหลดจุดรับขยะไม่ได้</p>
            <p className="mt-1 text-sm text-ink-subtle">ลองโหลดหน้านี้อีกครั้งนะ</p>
            <a href="/dropoff" className="btn-secondary btn-sm mt-3">ลองใหม่</a>
          </div>
        ) : points.length === 0 ? (
          <div className="card text-center">
            <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-primary-ink">
              <MapPinIcon className="h-6 w-6" />
            </span>
            <p className="mt-3 font-medium">ยังไม่มีจุดรับขยะในระบบ</p>
            <p className="mt-1 text-sm text-ink-subtle">ระหว่างนี้ยังถ่ายรูปสะสมแต้มจากที่บ้านได้ตามปกติ</p>
          </div>
        ) : <DropOffExplorer points={points} />}

        <Link href="/guide" className="btn-secondary mt-6 w-full"><BookIcon className="h-5 w-5" />ดูคู่มือแยกขยะ</Link>
      </PageMain>
      <BottomNav />
    </div>
  );
}
