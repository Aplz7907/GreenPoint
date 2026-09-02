import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient, getProfile } from '@/lib/supabase/server';
import { AppHeader, PageMain } from '@/components/AppHeader';
import { BottomNav } from '@/components/BottomNav';
import { BookIcon, ClockIcon, MapPinIcon } from '@/components/Icons';
import { WASTE_LABELS } from '@/lib/copy';
import type { DropOffPoint, WasteCode } from '@/lib/types';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'จุดรับขยะ — Green Point',
};

/**
 * A maps link, not a map.
 *
 * Four bins on one campus do not justify a tile server, an API key and 200KB
 * of map SDK in the bundle. The phone already has a maps app that knows how to
 * navigate; handing the coordinates to it is both smaller and more useful.
 */
function mapsHref(point: DropOffPoint): string | null {
  if (point.lat == null || point.lng == null) return null;
  return `https://www.google.com/maps/search/?api=1&query=${point.lat},${point.lng}`;
}

export default async function DropOffPage() {
  const profile = await getProfile();
  if (!profile) redirect('/login');

  const supabase = createClient();

  const { data } = await supabase
    .from('drop_off_points')
    .select('id, name_th, detail_th, hours_th, lat, lng, accepts, is_active')
    .eq('is_active', true)
    .order('id');

  const points = (data ?? []) as DropOffPoint[];

  return (
    <div className="min-h-dvh">
      <AppHeader
        title="จุดรับขยะ"
        backHref="/"
        subtitle="เอาขยะที่แยกแล้วไปส่งได้ที่จุดเหล่านี้"
      />

      <PageMain>
        {points.length === 0 ? (
          <div className="card text-center">
            <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-primary-ink">
              <MapPinIcon className="h-6 w-6" />
            </span>
            <p className="mt-3 font-medium">ยังไม่มีจุดรับขยะในระบบ</p>
            <p className="mt-1 text-sm text-ink-subtle">
              ระหว่างนี้ยังถ่ายรูปสะสมแต้มจากที่บ้านได้ตามปกติ
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {points.map((point) => {
              const href = mapsHref(point);

              return (
                <li key={point.id} className="card">
                  <div className="flex items-start gap-3">
                    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary-ink">
                      <MapPinIcon className="h-5 w-5" />
                    </span>

                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium leading-snug">
                        {point.name_th}
                      </h3>

                      {point.detail_th && (
                        <p className="mt-0.5 text-sm text-ink-subtle">
                          {point.detail_th}
                        </p>
                      )}

                      {point.hours_th && (
                        <p className="mt-1.5 flex items-center gap-1.5 text-sm text-ink-muted">
                          <ClockIcon className="h-4 w-4 shrink-0 text-ink-subtle" />
                          {point.hours_th}
                        </p>
                      )}
                    </div>
                  </div>

                  {point.accepts.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {point.accepts.map((code) => {
                        const label = WASTE_LABELS[code as WasteCode];
                        return (
                          <span
                            key={code}
                            className="badge bg-surface-sunken text-ink-muted"
                          >
                            {label ? `${label.emoji} ${label.th}` : code}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {href && (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-outline btn-sm mt-3 w-full"
                    >
                      <MapPinIcon className="h-4 w-4" />
                      เปิดในแผนที่
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <Link href="/guide" className="btn-secondary mt-6 w-full">
          <BookIcon className="h-5 w-5" />
          ดูคู่มือแยกขยะ
        </Link>
      </PageMain>

      <BottomNav />
    </div>
  );
}
