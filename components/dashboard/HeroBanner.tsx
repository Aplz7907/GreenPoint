import Link from 'next/link';
import { Leaf, Recycle, ScanLine } from 'lucide-react';

/**
 * The one saturated surface on the page.
 *
 * The decorative leaf and recycle glyphs are absolutely positioned and hidden
 * below `sm` — at phone width they would sit under the headline rather than
 * beside it, and Thai text over a busy fill is the first thing to become
 * unreadable.
 */
export function HeroBanner() {
  return (
    <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 p-6 text-white shadow-md sm:p-8">
      <Leaf
        aria-hidden
        className="pointer-events-none absolute -right-6 -top-8 hidden h-40 w-40 rotate-12 text-white/10 sm:block"
      />
      <Recycle
        aria-hidden
        className="pointer-events-none absolute -bottom-10 right-24 hidden h-32 w-32 -rotate-12 text-white/10 lg:block"
      />

      <div className="relative max-w-xl">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-emerald-50 ring-1 ring-inset ring-white/20">
          <Leaf className="h-3.5 w-3.5" />
          วันนี้คุณลด CO₂ ไปแล้ว 0.8 kg
        </span>

        <h1 className="mt-3 text-2xl font-semibold leading-snug tracking-tight sm:text-3xl">
          เปลี่ยนขยะให้เป็นประโยชน์
          <br className="hidden sm:block" /> เพื่อโลกที่น่าอยู่ของเรา
        </h1>
        <p className="mt-2 text-sm text-emerald-50/90 sm:text-base">
          ถ่ายรูปขยะที่แยกแล้ว รับแต้มทันที แล้วเอาไปแลกของรางวัลจากร้านค้าพาร์ทเนอร์
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Link
            href="/dashboard/scan"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-50 active:scale-[0.98]"
          >
            <ScanLine className="h-4 w-4" />
            สแกนขยะ
          </Link>
          <Link
            href="/dashboard/missions"
            className="inline-flex items-center rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold text-white ring-1 ring-inset ring-white/25 transition hover:bg-white/20"
          >
            ดูภารกิจวันนี้
          </Link>
        </div>
      </div>
    </section>
  );
}
