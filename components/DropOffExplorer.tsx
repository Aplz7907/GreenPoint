'use client';

import dynamic from 'next/dynamic';
import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ClockIcon, MapPinIcon, ScanIcon } from '@/components/Icons';
import { DropOffScene } from '@/components/DropOffScene';
import { WASTE_LABELS } from '@/lib/copy';
import { acceptsWaste, directionsHref, hasCoordinates } from '@/lib/dropoff';
import { WASTE_CODES, type DropOffPoint, type WasteCode } from '@/lib/types';

const DropOffMap = dynamic(() => import('@/components/DropOffMap'), {
  ssr: false,
  loading: () => <div className="card flex h-[460px] items-center justify-center text-ink-subtle" role="status">กำลังเตรียมแผนที่ 3D…</div>,
});

function WasteBadges({ point }: { point: DropOffPoint }) {
  if (!point.accepts.length) return <span className="badge bg-primary-soft text-primary-ink">รับขยะรีไซเคิลทุกประเภท</span>;
  return <>{point.accepts.map(code => (
    <span key={code} className="badge bg-surface-sunken text-ink-muted">
      {WASTE_LABELS[code] ? `${WASTE_LABELS[code].emoji} ${WASTE_LABELS[code].th}` : code}
    </span>
  ))}</>;
}

export function DropOffExplorer({ points }: { points: DropOffPoint[] }) {
  const [search, setSearch] = useState('');
  const [waste, setWaste] = useState<WasteCode | ''>('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const mapSection = useRef<HTMLDivElement>(null);
  const filtered = useMemo(() => points.filter(point => acceptsWaste(point, waste)
    && `${point.name_th} ${point.detail_th ?? ''}`.toLocaleLowerCase('th-TH').includes(search.trim().toLocaleLowerCase('th-TH'))),
  [points, waste, search]);
  const located = useMemo(() => filtered.filter(hasCoordinates), [filtered]);
  const selected = filtered.find(point => point.id === selectedId);
  const selectedHref = selected ? directionsHref(selected) : null;
  const activeId = selected?.id ?? null;

  return (
    <div className="space-y-5">
      <section className="dropoff-welcome rounded-card border border-line p-5 sm:p-6" aria-label="ค้นหาจุดรับขยะ">
        <div className="grid items-center gap-2 sm:grid-cols-[1fr_240px]">
          <div className="relative z-10">
            <span className="badge bg-surface text-primary-ink"><MapPinIcon className="mr-1 h-3.5 w-3.5" /> GREEN POINT · 3D MAP</span>
            <h2 className="mt-3 text-2xl font-bold text-ink text-balance sm:text-3xl">แยกแล้ว<br />ไปส่งที่ไหนดี?</h2>
            <p className="mt-2 max-w-sm text-sm text-ink-muted">หาจุดรับที่ใช่ให้ขยะของเรา สำรวจพื้นที่แบบ 3D แล้วออกไปรีไซเคิลกัน</p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium">
              <span className="rounded-control bg-surface px-3 py-2 text-primary-ink nums">{points.length.toLocaleString('th-TH')} จุดรับในระบบ</span>
              <span className="rounded-control bg-surface/70 px-3 py-2 text-ink-muted">เลือกจุด · ดูรายละเอียด · นำทาง</span>
            </div>
          </div>
          <DropOffScene />
        </div>
        <div className="relative z-10 mt-4 grid gap-3 rounded-control border border-line bg-surface p-4 sm:grid-cols-[1fr_180px]">
          <div>
            <label className="field-label" htmlFor="dropoff-search">ค้นหาจุดรับ</label>
            <input id="dropoff-search" className="input" type="search" placeholder="ชื่อจุดรับ หรืออาคาร…"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div>
            <label className="field-label" htmlFor="dropoff-waste">ประเภทขยะ</label>
            <select id="dropoff-waste" className="input" value={waste} onChange={e => setWaste(e.target.value as WasteCode | '')}>
              <option value="">ทุกประเภท</option>
              {WASTE_CODES.map(code => <option key={code} value={code}>{WASTE_LABELS[code].th}</option>)}
            </select>
          </div>
        </div>
      </section>
      <div ref={mapSection} className="scroll-mt-24">
      {located.length > 0 ? <DropOffMap points={located} selectedId={activeId} onSelect={setSelectedId} /> : (
        <div className="card bg-surface-sunken text-center text-sm text-ink-muted">
          {filtered.length > 0 ? 'จุดรับเหล่านี้ยังไม่มีพิกัด ดูรายละเอียดจากรายการด้านล่างได้เลย' : 'ไม่มีจุดรับที่ตรงกับการค้นหา'}
        </div>
      )}
      </div>
      {selected && (
        <section key={selected.id} className="card dropoff-selection border-primary" aria-label="รายละเอียดจุดรับที่เลือก" aria-live="polite">
          <div className="flex items-start justify-between gap-3">
            <div><p className="text-xs font-medium text-primary-ink">จุดรับที่เลือก</p><h2 className="mt-1 font-semibold">{selected.name_th}</h2></div>
            <button type="button" className="btn-ghost btn-sm" onClick={() => setSelectedId(null)}>ปิด</button>
          </div>
          {selected.detail_th && <p className="mt-2 text-sm text-ink-muted">{selected.detail_th}</p>}
          {selected.hours_th && <p className="mt-2 flex items-center gap-2 text-sm text-ink-muted"><ClockIcon className="h-4 w-4" />{selected.hours_th}</p>}
          <div className="mt-3 flex flex-wrap gap-1.5"><WasteBadges point={selected} /></div>
          <div className="mt-4 flex flex-wrap gap-2">
            {selectedHref && <a href={selectedHref} target="_blank" rel="noopener noreferrer" className="btn-primary btn-sm"><MapPinIcon className="h-4 w-4" />นำทางไปจุดรับ</a>}
            <Link href="/submit" className="btn-secondary btn-sm"><ScanIcon className="h-4 w-4" />ถ่ายรูปสะสมแต้ม</Link>
          </div>
        </section>
      )}
      <div>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="section-title">จุดรับทั้งหมด</h2>
          <p className="text-sm text-ink-subtle nums" role="status">พบ {filtered.length.toLocaleString('th-TH')} จุด</p>
        </div>
        {filtered.length === 0 && (
          <div className="card text-center">
            <p className="text-sm text-ink-muted">ลองค้นหาชื่ออื่น หรือเลือกขยะทุกประเภทนะ</p>
            <button type="button" className="btn-secondary btn-sm mt-3" onClick={() => { setSearch(''); setWaste(''); }}>ล้างตัวกรอง</button>
          </div>
        )}
        <ul className="grid gap-3 sm:grid-cols-2">
          {filtered.map(point => {
            const href = directionsHref(point);
            const index = located.findIndex(p => p.id === point.id);
            return (
              <li key={point.id} className={`card dropoff-point-card ${activeId === point.id ? 'border-primary bg-primary-soft/30' : ''}`}>
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-soft font-semibold text-primary-ink nums" aria-hidden>
                    {index >= 0 ? (index + 1).toLocaleString('th-TH') : <MapPinIcon className="h-5 w-5" />}
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-medium">{point.name_th}</h3>
                    {point.detail_th && <p className="mt-1 text-sm text-ink-subtle">{point.detail_th}</p>}
                    {point.hours_th && <p className="mt-2 flex items-start gap-1.5 text-sm text-ink-muted"><ClockIcon className="mt-0.5 h-4 w-4 shrink-0" />{point.hours_th}</p>}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5"><WasteBadges point={point} /></div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" className="btn-secondary btn-sm" aria-pressed={activeId === point.id}
                    onClick={() => {
                      setSelectedId(point.id);
                      if (href) mapSection.current?.scrollIntoView({
                        block: 'start',
                        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
                      });
                    }}>{href ? 'ดูบนแผนที่' : 'ดูรายละเอียด'}</button>
                  {href ? <a href={href} target="_blank" rel="noopener noreferrer" className="btn-outline btn-sm">นำทาง</a>
                    : <span className="self-center text-xs text-ink-subtle">ยังไม่มีพิกัด</span>}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
