import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient, getProfile } from '@/lib/supabase/server';
import { AppHeader, PageMain } from '@/components/AppHeader';
import { BottomNav } from '@/components/BottomNav';
import { CameraIcon, MapPinIcon, RecycleIcon } from '@/components/Icons';
import { WASTE_LABELS, formatPoints } from '@/lib/copy';
import { formatWeightTh } from '@/lib/scoring';
import type { WasteCode, WasteType } from '@/lib/types';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'คู่มือแยกขยะ — Green Point',
};

/**
 * How to prepare each kind of waste before photographing it.
 *
 * Copy, not data: these lines describe how the AI reads a photo, so they belong
 * next to the app that takes the photo rather than in a table an operator can
 * edit without knowing what the model is looking for.
 */
const HOW_TO: Record<WasteCode, string[]> = {
  plastic_bottle: [
    'เทน้ำออกให้หมด บีบให้แบนได้',
    'ฝาและฉลากแยกออกได้ยิ่งดี',
    'ขวดขุ่น (HDPE) และขวดใส (PET) นับรวมกัน',
  ],
  can: [
    'เทของเหลวออกและล้างคร่าวๆ',
    'กระป๋องอะลูมิเนียมและเหล็กใช้ได้ทั้งคู่',
    'บี้ให้แบนช่วยให้ถ่ายเห็นจำนวนชัดขึ้น',
  ],
  glass_bottle: [
    'ล้างให้สะอาด ระวังขวดแตก',
    'ขวดที่แตกแล้วไม่รับ เพราะอันตรายต่อคนคัดแยก',
    'วางแยกชิ้นไม่ให้ซ้อนกัน',
  ],
  paper_carton: [
    'กล่องนม/กล่องน้ำผลไม้ ล้างและผึ่งให้แห้ง',
    'พับให้แบนก่อนถ่าย',
    'กระดาษเปียกหรือเปื้อนอาหารไม่รับ',
  ],
};

/** Things the AI will reject, said plainly so nobody wastes a photo on them. */
const NOT_ACCEPTED = [
  'ถุงพลาสติกและฟิล์มห่อของ',
  'กล่องโฟมและกล่องอาหารเปื้อนน้ำมัน',
  'เศษอาหารและขยะเปียก',
  'ถ่านไฟฉาย หลอดไฟ ขยะอันตราย',
  'รูปถ่ายจากหน้าจอหรือรูปจากอินเทอร์เน็ต',
];

export default async function GuidePage() {
  const profile = await getProfile();
  if (!profile) redirect('/login');

  const supabase = createClient();

  // waste_types is the price list, so it is also the guide: anything else would
  // be a second copy of the numbers, free to drift away from what /api/submit
  // actually pays.
  const { data } = await supabase
    .from('waste_types')
    .select('id, code, name_th, points_per_item, gram_per_item, is_active')
    .eq('is_active', true)
    .order('points_per_item', { ascending: false });

  const types = (data ?? []) as WasteType[];

  return (
    <div className="min-h-dvh">
      <AppHeader
        title="คู่มือแยกขยะ"
        backHref="/"
        subtitle="รับอะไรบ้าง ได้กี่แต้ม และต้องเตรียมยังไง"
      />

      <PageMain>
        <section>
          <h2 className="section-title mb-3">ขยะที่รับ</h2>

          <ul className="space-y-3">
            {types.map((type) => {
              const label = WASTE_LABELS[type.code];

              return (
                <li key={type.id} className="card">
                  <div className="flex items-start gap-3">
                    <span
                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xl"
                      aria-hidden
                    >
                      {label?.emoji ?? '♻️'}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-3">
                        <h3 className="font-medium">{type.name_th}</h3>
                        <span className="shrink-0 whitespace-nowrap font-display text-sm font-semibold nums text-primary-ink">
                          +{formatPoints(type.points_per_item)} / ชิ้น
                        </span>
                      </div>

                      <p className="mt-0.5 text-xs text-ink-subtle">
                        น้ำหนักอ้างอิง {formatWeightTh(type.gram_per_item)} ต่อชิ้น
                      </p>
                    </div>
                  </div>

                  <ul className="mt-3 space-y-1.5 border-t border-line pt-3 text-sm text-ink-muted">
                    {(HOW_TO[type.code] ?? []).map((line) => (
                      <li key={line} className="flex gap-2">
                        <span className="text-primary-ink" aria-hidden>
                          ·
                        </span>
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="mt-8">
          <h2 className="section-title mb-3">ยังไม่รับ</h2>

          <ul className="card space-y-1.5 text-sm text-ink-muted">
            {NOT_ACCEPTED.map((line) => (
              <li key={line} className="flex gap-2">
                <span className="text-danger-ink" aria-hidden>
                  ×
                </span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-8">
          <h2 className="section-title mb-3">ถ่ายรูปยังไงให้ผ่าน</h2>

          <ol className="card list-inside list-decimal space-y-1.5 text-sm text-ink-muted marker:text-primary-ink">
            <li>แยกประเภทและล้างให้สะอาดก่อน</li>
            <li>วางบนพื้นโล่งๆ ไม่ให้ซ้อนทับกัน</li>
            <li>ถ่ายจากด้านบน ให้เห็นครบทุกชิ้นในรูปเดียว</li>
            <li>ถ่ายในที่มีแสงพอ ไม่ย้อนแสง</li>
            <li>ถ่ายรูปใหม่ทุกครั้ง — รูปซ้ำระบบตรวจเจอและไม่ให้แต้ม</li>
          </ol>
        </section>

        <div className="mt-6 grid grid-cols-2 gap-3">
          <Link href="/dropoff" className="btn-secondary">
            <MapPinIcon className="h-5 w-5" />
            จุดรับขยะ
          </Link>
          <Link href="/submit" className="btn-primary">
            <CameraIcon className="h-5 w-5" />
            ถ่ายรูปเลย
          </Link>
        </div>

        <p className="mt-4 flex items-start gap-2 text-sm text-ink-subtle">
          <RecycleIcon className="mt-0.5 h-4 w-4 shrink-0 text-primary-ink" />
          <span>
            แต้มต่อชิ้นอาจถูกปรับได้ตามประเภทขยะ ตัวเลขบนหน้านี้คือค่าที่ระบบใช้จริงในตอนนี้
          </span>
        </p>
      </PageMain>

      <BottomNav />
    </div>
  );
}
