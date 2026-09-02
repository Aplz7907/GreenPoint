'use client';

import { useState } from 'react';
import { Camera, Check, Image as ImageIcon, Sparkles, Zap } from 'lucide-react';

type Phase = 'idle' | 'scanning' | 'detected' | 'confirmed';

const DETECTED = { name: 'ขวดพลาสติกใส PET', points: 10, confidence: 96 };

/**
 * Viewfinder mockup, no camera permission involved.
 *
 * The frame is held at `aspect-[3/4]` rather than given a fixed height so it
 * keeps a phone-camera shape on every breakpoint — a 16:9 box on desktop reads
 * as a video player, not as a camera.
 */
export function WasteScanner() {
  const [phase, setPhase] = useState<Phase>('idle');

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-900 shadow-md">
        <div className="relative mx-auto aspect-[3/4] w-full max-w-sm sm:max-w-md lg:max-w-none lg:aspect-[4/3]">
          {/* Stand-in for the camera feed. */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,#334155,#0f172a)]" />

          {/* Alignment box: corner brackets only. A full outline competes with
              the item's own edges, which is exactly what the user is trying to
              line up. */}
          <div className="absolute inset-0 grid place-items-center p-8">
            <div className="relative aspect-square w-full max-w-[16rem]">
              {[
                'left-0 top-0 border-l-4 border-t-4 rounded-tl-2xl',
                'right-0 top-0 border-r-4 border-t-4 rounded-tr-2xl',
                'left-0 bottom-0 border-b-4 border-l-4 rounded-bl-2xl',
                'right-0 bottom-0 border-b-4 border-r-4 rounded-br-2xl',
              ].map((pos) => (
                <span
                  key={pos}
                  className={`absolute h-12 w-12 border-emerald-400 ${pos}`}
                />
              ))}

              {phase === 'scanning' && (
                <span className="absolute inset-x-0 top-1/2 h-0.5 animate-pulse bg-emerald-400 shadow-[0_0_20px_4px_rgba(52,211,153,0.6)]" />
              )}
            </div>
          </div>

          <p className="absolute inset-x-0 top-4 text-center text-xs text-white/70">
            วางขยะ 1 ชิ้นให้อยู่ในกรอบ แล้วกดสแกน
          </p>

          {(phase === 'detected' || phase === 'confirmed') && (
            <div className="absolute inset-x-4 bottom-24 mx-auto max-w-sm rounded-2xl bg-white/95 p-3 shadow-lg backdrop-blur sm:inset-x-6">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-700">
                  <Sparkles className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {DETECTED.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    ความมั่นใจ {DETECTED.confidence}% · รีไซเคิลได้
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white">
                  +{DETECTED.points} แต้ม
                </span>
              </div>
            </div>
          )}

          <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-4 bg-gradient-to-t from-slate-900 to-transparent p-5">
            <button
              aria-label="เลือกรูปจากคลัง"
              className="grid h-11 w-11 place-items-center rounded-xl bg-white/10 text-white ring-1 ring-inset ring-white/20 hover:bg-white/20"
            >
              <ImageIcon className="h-5 w-5" />
            </button>

            <button
              onClick={() => {
                setPhase('scanning');
                window.setTimeout(() => setPhase('detected'), 900);
              }}
              aria-label="สแกน"
              className="grid h-16 w-16 place-items-center rounded-full bg-white text-emerald-700 shadow-lg transition active:scale-95"
            >
              <Camera className="h-7 w-7" />
            </button>

            <button
              aria-label="เปิดแฟลช"
              className="grid h-11 w-11 place-items-center rounded-xl bg-white/10 text-white ring-1 ring-inset ring-white/20 hover:bg-white/20"
            >
              <Zap className="h-5 w-5" />
            </button>
          </div>
        </div>
      </section>

      <aside className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">ผลการตรวจจับ</h2>

          {phase === 'idle' || phase === 'scanning' ? (
            <p className="mt-2 text-sm text-slate-500">
              {phase === 'scanning' ? 'กำลังวิเคราะห์ภาพ...' : 'ยังไม่มีรายการ — กดปุ่มกล้องเพื่อเริ่ม'}
            </p>
          ) : (
            <>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">ชนิดขยะ</dt>
                  <dd className="font-medium text-slate-900">{DETECTED.name}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">ถังที่ต้องทิ้ง</dt>
                  <dd className="font-medium text-slate-900">ถังเหลือง (รีไซเคิล)</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">แต้มที่จะได้รับ</dt>
                  <dd className="font-semibold text-emerald-700">
                    +{DETECTED.points} แต้ม
                  </dd>
                </div>
              </dl>

              <button
                onClick={() => setPhase('confirmed')}
                disabled={phase === 'confirmed'}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 active:scale-[0.98] disabled:cursor-default disabled:bg-emerald-100 disabled:text-emerald-700"
              >
                <Check className="h-4 w-4" />
                {phase === 'confirmed' ? 'บันทึกแต้มแล้ว' : 'ยืนยันและรับแต้ม'}
              </button>
            </>
          )}
        </div>

        <div className="rounded-2xl bg-emerald-50 p-5 text-sm text-emerald-900 ring-1 ring-inset ring-emerald-100">
          <p className="font-semibold">ถ่ายยังไงให้ผ่านตั้งแต่ครั้งแรก</p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-emerald-800">
            <li>ล้างและบีบขวดให้แบนก่อนถ่าย</li>
            <li>ถ่าย 1 ชิ้นต่อ 1 รูป บนพื้นสีเรียบ</li>
            <li>เลี่ยงแสงย้อนและเงาทับฉลาก</li>
          </ul>
        </div>
      </aside>
    </div>
  );
}
