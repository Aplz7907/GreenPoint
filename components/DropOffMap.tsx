'use client';

import { useEffect, useRef, useState } from 'react';
import type { Map as MapLibreMap, Marker } from 'maplibre-gl';
import type { LocatedDropOffPoint } from '@/lib/dropoff';

type Props = {
  points: LocatedDropOffPoint[];
  selectedId: number | null;
  onSelect: (id: number) => void;
};

function themeColor(token: string): string {
  return `rgb(${getComputedStyle(document.documentElement).getPropertyValue(`--c-${token}`).trim()})`;
}

// A map is a canvas, so Tailwind cannot recolour it. Read the same tokens as
// the surrounding UI whenever the theme changes, including the base map.
function applyTheme(map: MapLibreMap) {
  for (const layer of map.getStyle().layers) {
    if (layer.id === 'ecopoint-buildings') {
      map.setPaintProperty(layer.id, 'fill-extrusion-color', themeColor('mint'));
    } else if (layer.type === 'background') {
      map.setPaintProperty(layer.id, 'background-color', themeColor('canvas'));
    } else if (layer.type === 'fill') {
      const token = layer.id.includes('water') ? 'info-soft'
        : layer.id.includes('building') ? 'line-strong'
        : /park|wood|grass/.test(layer.id) ? 'primary-soft' : 'surface-sunken';
      map.setPaintProperty(layer.id, 'fill-color', themeColor(token));
      if (layer.paint?.['fill-outline-color']) {
        map.setPaintProperty(layer.id, 'fill-outline-color', themeColor('line'));
      }
    } else if (layer.type === 'line') {
      map.setPaintProperty(layer.id, 'line-color', themeColor(
        layer.id.includes('water') ? 'info-soft'
          : /casing|boundary|rail/.test(layer.id) ? 'line-strong' : 'surface',
      ));
    } else if (layer.type === 'symbol' && layer.layout?.['text-field']) {
      map.setPaintProperty(layer.id, 'text-color', themeColor('ink-muted'));
      map.setPaintProperty(layer.id, 'text-halo-color', themeColor('surface'));
    }
  }
}

function fitPoints(map: MapLibreMap, points: LocatedDropOffPoint[]) {
  if (!points.length) return;
  if (points.length === 1) {
    map.easeTo({ center: [points[0].lng, points[0].lat], zoom: 17, bearing: -20 });
    return;
  }
  map.fitBounds([
    [Math.min(...points.map(p => p.lng)), Math.min(...points.map(p => p.lat))],
    [Math.max(...points.map(p => p.lng)), Math.max(...points.map(p => p.lat))],
  ], { padding: 65, maxZoom: 17, bearing: -20 });
}

export default function DropOffMap({ points, selectedId, onSelect }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markers = useRef<Marker[]>([]);
  const pointsRef = useRef(points);
  const onSelectRef = useRef(onSelect);
  const selectedIdRef = useRef(selectedId);
  pointsRef.current = points;
  onSelectRef.current = onSelect;
  selectedIdRef.current = selectedId;
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [locationMessage, setLocationMessage] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [is3D, setIs3D] = useState(true);

  useEffect(() => {
    let disposed = false;
    let map: MapLibreMap | undefined;
    let observer: MutationObserver | undefined;
    let resizeObserver: ResizeObserver | undefined;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    setReady(false);
    setError('');
    setLocationMessage('');
    setIs3D(true);

    async function start() {
      try {
        // Load the WebGL SDK only on this page, after hydration. Importing it
        // in the shared shell would make every student download a map.
        const { default: maplibre } = await import('maplibre-gl');
        const { Map, NavigationControl, GeolocateControl } = maplibre;
        if (disposed || !container.current || !pointsRef.current.length) return;
        const first = pointsRef.current[0];
        map = new Map({
          container: container.current,
          style: 'https://tiles.openfreemap.org/styles/bright',
          center: [first.lng, first.lat], zoom: 16, pitch: 55, bearing: -20, maxPitch: 65,
          attributionControl: { compact: true },
          locale: {
            'NavigationControl.ZoomIn': 'ซูมเข้า',
            'NavigationControl.ZoomOut': 'ซูมออก',
            'NavigationControl.ResetBearing': 'หันไปทางทิศเหนือ',
            'GeolocateControl.FindMyLocation': 'ตำแหน่งของฉัน',
            'GeolocateControl.LocationNotAvailable': 'หาตำแหน่งไม่ได้',
            'AttributionControl.ToggleAttribution': 'แหล่งข้อมูลแผนที่',
          },
        });
        mapRef.current = map;
        map.addControl(new NavigationControl({ visualizePitch: true }), 'top-right');
        const geolocate = new GeolocateControl({
          positionOptions: { enableHighAccuracy: true, timeout: 10000 }, trackUserLocation: false,
        });
        geolocate.on('error', () => setLocationMessage('หาตำแหน่งไม่ได้ ลองเปิดสิทธิ์ตำแหน่งในเบราว์เซอร์นะ'));
        geolocate.on('geolocate', () => setLocationMessage(''));
        map.addControl(geolocate, 'top-right');
        timeout = setTimeout(() => {
          if (!disposed) setError('โหลดแผนที่นานกว่าปกติ ลองตรวจอินเทอร์เน็ตแล้วลองใหม่นะ');
        }, 20000);
        map.on('load', () => {
          if (disposed || !map) return;
          clearTimeout(timeout);
          const labelId = map.getStyle().layers.find(layer =>
            layer.type === 'symbol' && layer.layout?.['text-field'],
          )?.id;
          map.addLayer({
            id: 'ecopoint-buildings', source: 'openmaptiles', 'source-layer': 'building',
            type: 'fill-extrusion', minzoom: 14,
            filter: ['!=', ['get', 'hide_3d'], true],
            paint: {
              'fill-extrusion-color': themeColor('mint'),
              'fill-extrusion-height': ['coalesce', ['get', 'render_height'], 0],
              'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
              'fill-extrusion-opacity': 0.9,
            },
          }, labelId);
          applyTheme(map);
          fitPoints(map, pointsRef.current);
          setReady(true);
          setError('');
          observer = new MutationObserver(() => { if (map) applyTheme(map); });
          observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
        });
        map.on('error', () => {
          if (!disposed) setError('โหลดข้อมูลแผนที่บางส่วนไม่ได้ ยังเลือกจุดรับจากรายการด้านล่างได้');
        });
        resizeObserver = new ResizeObserver(() => map?.resize());
        resizeObserver.observe(container.current);
      } catch {
        if (!disposed) setError('เปิดแผนที่ 3D ไม่ได้บนอุปกรณ์นี้ เลือกจุดรับจากรายการด้านล่างได้เลย');
      }
    }
    void start();
    return () => {
      disposed = true;
      clearTimeout(timeout);
      observer?.disconnect();
      resizeObserver?.disconnect();
      markers.current.forEach(marker => marker.remove());
      markers.current = [];
      map?.remove();
      mapRef.current = null;
    };
  }, [attempt]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    let disposed = false;
    void import('maplibre-gl').then(({ default: maplibre }) => {
      if (disposed) return;
      markers.current.forEach(marker => marker.remove());
      markers.current = points.map((point, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'dropoff-marker';
        button.textContent = (index + 1).toLocaleString('th-TH');
        button.setAttribute('aria-label', `เลือก ${point.name_th}`);
        button.dataset.pointId = String(point.id);
        button.setAttribute('aria-pressed', String(point.id === selectedIdRef.current));
        button.addEventListener('click', () => onSelectRef.current(point.id));
        return new maplibre.Marker({ element: button, anchor: 'bottom' }).setLngLat([point.lng, point.lat]).addTo(map);
      });
      if (selectedIdRef.current === null) fitPoints(map, points);
    });
    return () => { disposed = true; };
  }, [points, ready]);

  useEffect(() => {
    markers.current.forEach(marker => {
      const element = marker.getElement();
      element.setAttribute('aria-pressed', String(element.dataset.pointId === String(selectedId)));
    });
    const point = points.find(p => p.id === selectedId);
    if (ready && point) mapRef.current?.easeTo({ center: [point.lng, point.lat], zoom: 17.5 });
    else if (ready && selectedId === null && mapRef.current) fitPoints(mapRef.current, points);
  }, [selectedId, points, ready]);

  return (
    <section className="overflow-hidden rounded-card border border-line bg-surface shadow-soft" aria-label="แผนที่จุดรับขยะ 3D">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
        <div>
          <p className="font-semibold text-ink">แผนที่จุดรับขยะ</p>
          <p className="text-xs text-ink-subtle">หมุนและซูม เพื่อดูพื้นที่รอบจุดรับ</p>
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn-outline btn-sm" disabled={!ready} onClick={() => {
            if (mapRef.current) fitPoints(mapRef.current, points);
          }}>ดูทุกจุด</button>
          <button type="button" className="btn-secondary btn-sm nums" disabled={!ready}
            aria-pressed={is3D} aria-label={is3D ? 'เปลี่ยนเป็นแผนที่ 2D' : 'เปลี่ยนเป็นแผนที่ 3D'}
            onClick={() => {
              const next = !is3D;
              mapRef.current?.easeTo({ pitch: next ? 55 : 0 });
              mapRef.current?.setLayoutProperty('ecopoint-buildings', 'visibility', next ? 'visible' : 'none');
              setIs3D(next);
            }}>{is3D ? '3D' : '2D'}</button>
        </div>
      </div>
      <div className="relative">
        <div ref={container} className="dropoff-map h-[360px] w-full sm:h-[440px]" />
        {!ready && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-surface-sunken" role="status">
            <span className="spinner" /><p className="text-sm text-ink-muted">กำลังโหลดแผนที่ 3D…</p>
          </div>
        )}
        {error && (
          <div className={ready ? 'absolute bottom-10 left-3 right-3' : 'absolute inset-0 flex items-center justify-center bg-surface-sunken p-5'}>
            <div className="rounded-control border border-warn-line bg-warn-soft p-3 text-sm text-warn-ink" role="status">
              <p>{error}</p>
              <button type="button" className="btn-outline btn-sm mt-2" onClick={() => setAttempt(a => a + 1)}>ลองโหลดอีกครั้ง</button>
            </div>
          </div>
        )}
      </div>
      <div className="space-y-1 border-t border-line px-4 py-3 text-xs text-ink-subtle">
        <p>ลากเพื่อเลื่อน · ใช้สองนิ้วหมุนและซูม · กดหมุดเพื่อดูจุดรับ</p>
        <p>ตำแหน่งจุดรับอ้างอิงข้อมูลในระบบ อาคาร 3D แสดงตามข้อมูล OpenStreetMap ที่มี</p>
        {locationMessage && <p className="text-warn-ink" role="status">{locationMessage}</p>}
      </div>
    </section>
  );
}
