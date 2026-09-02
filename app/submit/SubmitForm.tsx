'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertIcon,
  CheckIcon,
  LeafIcon,
  ScanIcon,
  SparkIcon,
} from '@/components/Icons';
import { WASTE_LABELS, formatPoints } from '@/lib/copy';
import type { SubmitResponse } from '@/lib/types';

type Phase = 'pick' | 'preview' | 'uploading' | 'result';

/**
 * The four corner brackets from the prototype's scan screen.
 *
 * Purely decorative — there is no live viewfinder here, the photo is already
 * taken — but it is what makes the screen read as "scanning" rather than as a
 * file upload, and it frames the subject the way the capture guidance asks the
 * user to frame it.
 */
function ScanFrame() {
  const corner =
    'absolute h-8 w-8 border-mint transition-opacity duration-300';

  return (
    <span className="pointer-events-none absolute inset-6" aria-hidden>
      <span className={`${corner} left-0 top-0 rounded-tl-lg border-l-2 border-t-2`} />
      <span className={`${corner} right-0 top-0 rounded-tr-lg border-r-2 border-t-2`} />
      <span className={`${corner} bottom-0 left-0 rounded-bl-lg border-b-2 border-l-2`} />
      <span className={`${corner} bottom-0 right-0 rounded-br-lg border-b-2 border-r-2`} />
    </span>
  );
}

/** Reassuring, rotating copy — the Gemini call takes a few seconds. */
const WAITING_MESSAGES = [
  'กำลังส่งรูปให้ AI ดู',
  'AI กำลังนับขยะในรูปของคุณ',
  'กำลังคิดแต้มให้',
  'ใกล้เสร็จแล้ว รออีกนิด',
];

/** Long edge, in pixels, of what we actually upload. */
const MAX_EDGE = 1280;

/**
 * Shrink the photo in the browser before it goes anywhere.
 *
 * A modern phone camera hands us 3–6 MB. Nothing downstream wants that: the
 * upload is the slowest part of the whole flow on mobile data, and the AI reads
 * a 1280px frame exactly as well as a 4000px one. This typically turns a 4 MB
 * POST into ~200 KB.
 *
 * Any failure (an exotic HEIC, a browser without createImageBitmap) falls back
 * to sending the original file — a slow submission beats a broken one.
 */
async function shrink(file: File): Promise<File> {
  if (typeof createImageBitmap !== 'function') return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));

    // Already small enough — re-encoding would only lose quality for nothing.
    if (scale === 1 && file.size < 600_000) {
      bitmap.close();
      return file;
    }

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close();
      return file;
    }

    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.82)
    );

    if (!blob || blob.size >= file.size) return file;

    return new File([blob], 'photo.jpg', { type: 'image/jpeg' });
  } catch {
    return file;
  }
}

export function SubmitForm() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [phase, setPhase] = useState<Phase>('pick');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<SubmitResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [waitingIndex, setWaitingIndex] = useState(0);

  // Revoke the object URL when the preview is replaced or the page unmounts,
  // otherwise every retake leaks a few MB of blob.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    if (phase !== 'uploading') return;

    const id = setInterval(
      () => setWaitingIndex((i) => (i + 1) % WAITING_MESSAGES.length),
      2200
    );
    return () => clearInterval(id);
  }, [phase]);

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0];
    if (!picked) return;

    if (previewUrl) URL.revokeObjectURL(previewUrl);

    setFile(picked);
    setPreviewUrl(URL.createObjectURL(picked));
    setError(null);
    setResult(null);
    setPhase('preview');
  }

  function retake() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);

    setFile(null);
    setPreviewUrl(null);
    setResult(null);
    setError(null);
    setWaitingIndex(0);
    setPhase('pick');

    // Clearing the input lets the user re-pick the *same* file if they want.
    if (inputRef.current) inputRef.current.value = '';
  }

  async function submit() {
    if (!file) return;

    setError(null);
    setPhase('uploading');

    // The body carries the image and NOTHING else. No point value, no waste
    // type, no count — the server decides all of that.
    const body = new FormData();
    body.append('image', await shrink(file));

    let data: SubmitResponse;

    try {
      const res = await fetch('/api/submit', { method: 'POST', body });
      data = (await res.json()) as SubmitResponse;
    } catch {
      setPhase('preview');
      setError('เชื่อมต่อไม่สำเร็จ ตรวจสอบอินเทอร์เน็ตแล้วลองใหม่นะ');
      return;
    }

    if (!data.ok) {
      setPhase('preview');
      setError(data.message);
      return;
    }

    setResult(data);
    setPhase('result');

    // Pull the new balance into the server-rendered pages behind us.
    router.refresh();
  }

  // ---------------------------------------------------------------- result
  if (phase === 'result' && result) {
    const approved = result.status === 'approved';

    return (
      <div className="space-y-4">
        {/* The payoff moment. Approved gets the full green treatment — this is
            the one screen in the app allowed to celebrate. */}
        {approved ? (
          <section className="animate-pop relative overflow-hidden rounded-card bg-gradient-to-br from-hero-from to-hero-to p-6 text-center text-hero-ink shadow-lift">
            <div
              className="leaf-field-hero pointer-events-none absolute inset-0"
              aria-hidden
            />
            <LeafIcon
              className="pointer-events-none absolute -bottom-8 -left-6 h-36 w-36 -rotate-12 text-hero-ink/10"
            />

            <div className="relative">
              <span className="mx-auto inline-flex h-11 w-11 items-center justify-center rounded-full bg-hero-ink/15 ring-1 ring-inset ring-hero-ink/25">
                <CheckIcon className="h-6 w-6" />
              </span>

              <p className="mt-3 text-sm text-hero-muted">ได้รับ</p>
              <p className="font-display text-5xl font-bold tracking-tight nums">
                +{formatPoints(result.points_earned ?? 0)}
              </p>

              {result.points_balance !== undefined && (
                <p className="mt-1.5 text-sm text-hero-muted">
                  แต้มรวม {formatPoints(result.points_balance)}
                </p>
              )}

              <p className="mt-4 text-sm text-hero-muted">{result.message}</p>
            </div>
          </section>
        ) : (
          <section className="animate-pop rounded-card border border-danger-line bg-danger-soft p-6 text-center">
            <span className="mx-auto inline-flex h-11 w-11 items-center justify-center rounded-full bg-danger/10 text-danger-ink">
              <AlertIcon className="h-6 w-6" />
            </span>
            <p className="mt-3 font-semibold text-danger-ink">
              ไม่ผ่านการตรวจสอบ
            </p>
            <p className="mt-2 text-sm text-danger-ink/90">{result.message}</p>
          </section>
        )}

        {result.items && result.items.length > 0 && (
          <div className="list-surface">
            <h3 className="flex items-center gap-2 border-b border-line px-4 py-3 text-sm font-medium text-ink-muted">
              <SparkIcon className="h-4 w-4 text-primary-ink" />
              AI เห็นอะไรในรูป
            </h3>
            <ul className="divide-y divide-line">
              {result.items.map((item, i) => (
                <li
                  key={`${item.type}-${i}`}
                  className="flex items-center gap-3 px-4 py-3"
                >
                  <span
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-lg"
                    aria-hidden
                  >
                    {WASTE_LABELS[item.type]?.emoji ?? '♻️'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      {item.name_th} × {item.count}
                    </p>
                    <p className="text-sm text-ink-subtle">
                      มั่นใจ {Math.round(item.confidence * 100)}%
                    </p>
                  </div>
                  <span
                    className={`shrink-0 font-display text-sm font-semibold nums ${
                      item.points > 0 ? 'text-primary-ink' : 'text-ink-subtle'
                    }`}
                  >
                    {item.points > 0 ? `+${formatPoints(item.points)}` : '0'}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="space-y-2">
          <button type="button" onClick={retake} className="btn-primary w-full">
            <ScanIcon className="h-5 w-5" />
            สแกนอีกชิ้น
          </button>
          <Link href="/" className="btn-outline w-full">
            กลับหน้าแรก
          </Link>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------- uploading
  if (phase === 'uploading') {
    return (
      <div className="space-y-4">
        {previewUrl && (
          <div className="relative overflow-hidden rounded-card border border-line">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="รูปที่กำลังส่ง"
              className="aspect-[4/3] w-full object-cover"
            />
            {/* Scrim rather than opacity on the image: dimming the photo itself
                also dims the border and looks like a rendering fault. */}
            <div
              className="absolute inset-0 bg-canvas/60 backdrop-blur-[1px]"
              aria-hidden
            />
            <ScanFrame />
            <span className="absolute inset-0 flex items-center justify-center">
              <span
                className="h-10 w-10 animate-spin rounded-full border-[3px] border-primary/30 border-t-primary"
                aria-hidden
              />
            </span>
          </div>
        )}

        <div
          className="card flex flex-col items-center gap-1 py-6 text-center"
          role="status"
          aria-live="polite"
        >
          <p className="text-sm font-medium text-ink">
            {WAITING_MESSAGES[waitingIndex]}
          </p>
          <p className="text-sm text-ink-subtle">อย่าเพิ่งปิดหน้านี้</p>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------- pick / preview
  return (
    <div className="space-y-4">
      {/*
        capture="environment" asks the phone to open the rear camera directly
        instead of the photo library. It is a hint, not a guarantee — the real
        defence against gallery re-uploads is the duplicate hash and the
        is_screen_photo check on the server.
      */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onPick}
        className="sr-only"
        id="waste-photo"
      />

      {previewUrl ? (
        <div className="relative overflow-hidden rounded-card border border-line bg-ink shadow-soft">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="รูปขยะที่ถ่ายไว้"
            className="aspect-[4/3] w-full object-cover"
          />
          <ScanFrame />
        </div>
      ) : (
        /* The dropzone is the largest tap target in the app on purpose: it is
           the first thing a new user must do, and it has to look pressable
           without a button label competing with the CTA below. */
        <label
          htmlFor="waste-photo"
          className="group flex aspect-[4/3] w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-card border-2 border-dashed border-line-strong bg-surface px-6 text-center transition-colors hover:border-primary hover:bg-primary-soft/40"
        >
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft text-primary-ink transition-transform duration-200 group-hover:scale-105">
            <ScanIcon className="h-7 w-7" />
          </span>
          <span className="mt-1 font-medium text-ink">แตะเพื่อสแกนขยะ</span>
          <span className="max-w-[16rem] text-sm text-ink-subtle">
            วางขยะที่แยกแล้วบนพื้นโล่งๆ ถ่ายให้เห็นทุกชิ้นชัดเจน
          </span>
        </label>
      )}

      {phase === 'preview' && (
        <div className="space-y-2">
          {/* "ยืนยัน", not "ส่งรูปนี้": the prototype's confirm step is the
              moment the user accepts what the scan found, and the word has to
              be the same one on the button they will tap next time. */}
          <button type="button" onClick={submit} className="btn-primary w-full text-base">
            <CheckIcon className="h-5 w-5" />
            ยืนยัน
          </button>
          <button type="button" onClick={retake} className="btn-outline w-full">
            ถ่ายใหม่
          </button>
        </div>
      )}

      {error && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-control border border-danger-line bg-danger-soft px-3.5 py-2.5 text-sm text-danger-ink"
        >
          <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </p>
      )}

      <div className="card">
        <p className="flex items-center gap-2 text-sm font-medium text-ink">
          <LeafIcon className="h-4 w-4 text-primary-ink" />
          เคล็ดลับให้ได้แต้มเต็ม
        </p>
        <ul className="mt-3 space-y-2 text-sm text-ink-muted">
          {[
            'แยกขยะแต่ละชิ้นออกจากกัน อย่าวางซ้อนทับ',
            'ถ่ายในที่แสงสว่างพอ ไม่ย้อนแสง',
            'ถ่ายจากขยะจริงเท่านั้น ถ่ายจากหน้าจอจะไม่ผ่าน',
            'แยกถ่ายทีละชนิดได้ ส่งได้วันละ 5 ครั้ง',
          ].map((tip) => (
            <li key={tip} className="flex items-start gap-2.5">
              {/* A dot, not a list-disc marker: Thai ascenders sit high enough
                  that the browser's bullet lands off-centre against them. */}
              <span
                className="mt-[0.6rem] h-1.5 w-1.5 shrink-0 rounded-full bg-leaf"
                aria-hidden
              />
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
