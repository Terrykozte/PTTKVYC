/**
 * MapsArchiveView.tsx  (v3)
 *
 * – CartoDB Dark tile map
 * – Pulsing blue dot = current position (mocked: Q1 HCMC)
 * – Photo pin markers: [thumbnail] ▼ [location name]
 *   Privacy filtered: viewer's own photos only
 * – Tap pin → bottom preview card
 * – Drag handle to dismiss
 * – Floating search
 */

import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { HistoryItem } from './HomeScreen';

interface LocationPin { id: string; name: string; lat: number; lng: number; photos: HistoryItem[] }

export interface MapsArchiveViewProps {
  historyItems: HistoryItem[];
  viewerIdentity: string;
  onClose: () => void;
  initialFocusLocation?: { lat: number; lng: number; name: string } | null;
}

function toLatLng(loc: NonNullable<HistoryItem['location']>): [number, number] {
  return [23 - (loc.mapY / 100) * 15, 102 + (loc.mapX / 100) * 7];
}

function formatDate(d?: string): string {
  if (!d) return '';
  try { return new Date(d).toLocaleDateString('vi-VN', { day: 'numeric', month: 'long', year: 'numeric' }); }
  catch { return d; }
}

const MY_POS: [number, number] = [10.7764, 106.7009];

const userDotIcon = L.divIcon({
  className: '',
  html: `<div style="position:relative;width:20px;height:20px;">
    <div style="position:absolute;inset:0;background:rgba(0,122,255,.2);border-radius:50%;animation:locRing 2.2s ease-out infinite;"></div>
    <div style="position:absolute;top:3px;left:3px;right:3px;bottom:3px;background:#007AFF;border-radius:50%;border:2.5px solid white;box-shadow:0 2px 10px rgba(0,122,255,.55);"></div>
  </div>`,
  iconSize: [20, 20], iconAnchor: [10, 10],
});

function makePhotoIcon(img: string, count: number, name: string, hl: boolean, delay = 0) {
  const bdr = hl ? 'rgba(255,214,10,.8)' : 'rgba(255,255,255,.15)';
  const sh  = hl ? 'rgba(255,214,10,.3)'  : 'rgba(0,0,0,.7)';
  return L.divIcon({
    className: '',
    html: `<div style="display:flex;flex-direction:column;align-items:center;animation:pinPop .45s cubic-bezier(.175,.885,.32,1.275) ${delay}s both;">
      <div style="padding:3px;background:rgba(10,15,26,.97);border-radius:13px;box-shadow:0 10px 28px ${sh},0 0 0 1.5px ${bdr};position:relative;cursor:pointer;">
        <div style="width:54px;height:54px;border-radius:10px;overflow:hidden;">
          <img src="${img}" style="width:100%;height:100%;object-fit:cover;" />
        </div>
        ${count > 1 ? `<div style="position:absolute;top:-9px;right:-9px;background:#FFD60A;color:#000;border-radius:50%;width:22px;height:22px;border:2.5px solid rgba(10,15,26,.97);font-size:10px;font-weight:900;display:flex;align-items:center;justify-content:center;font-family:-apple-system,sans-serif;">${count}</div>` : ''}
      </div>
      <div style="width:1.5px;height:8px;background:rgba(255,255,255,.28);"></div>
      <div style="background:rgba(0,0,0,.88);backdrop-filter:blur(10px);padding:3px 9px;border-radius:7px;font-size:9px;font-weight:800;color:rgba(255,255,255,.88);white-space:nowrap;max-width:110px;overflow:hidden;text-overflow:ellipsis;border:1px solid rgba(255,255,255,.1);font-family:-apple-system,sans-serif;letter-spacing:.08px;">${name}</div>
    </div>`,
    iconSize: [120, 86], iconAnchor: [60, 86],
  });
}

function AutoBounds({ pins, focus }: { pins: LocationPin[]; focus?: { lat: number; lng: number } | null }) {
  const map = useMap();
  const done = useRef(false);
  useEffect(() => {
    if (focus) {
      map.flyTo([focus.lat, focus.lng], 14, { duration: .7 });
    } else if (pins.length > 0) {
      const b = L.latLngBounds(pins.map(p => [p.lat, p.lng]));
      if (b.isValid()) {
        map.fitBounds(b, { padding: [60, 60], maxZoom: 13, animate: true });
      }
    }
  }, [pins, focus, map]);
  return null;
}

function FlyTo({ target }: { target: { lat: number; lng: number } | null }) {
  const map = useMap();
  const prev = useRef('');
  useEffect(() => {
    if (!target) return;
    const k = `${target.lat},${target.lng}`;
    if (k === prev.current) return;
    prev.current = k;
    map.flyTo([target.lat, target.lng], Math.max(map.getZoom(), 13), { duration: .7 });
  }, [target, map]);
  return null;
}

export default function MapsArchiveView({ historyItems, viewerIdentity, onClose, initialFocusLocation }: MapsArchiveViewProps) {
  const [mapFilter, setMapFilter] = useState<'you' | 'all'>('you');
  const [selectedPin, setSelectedPin] = useState<LocationPin | null>(null);
  const [selectedPhotoIdx, setSelectedPhotoIdx] = useState(0);
  const [flyTarget, setFlyTarget] = useState<{ lat: number; lng: number } | null>(null);
  const [sheetOffset, setSheetOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({ isDown: false, startY: 0, lastY: 0, lastT: 0, vel: 0 });

  // 1. Lọc ảnh dựa theo toggle You/All
  const displayPhotos = historyItems.filter(item => {
    if (!item.location || !item.image) return false;
    if (mapFilter === 'you') return item.sender === viewerIdentity || item.sender === 'You';
    return true;
  });

  // 2. Gom nhóm ảnh theo địa điểm (Pins)
  const pins: LocationPin[] = [];
  displayPhotos.forEach(item => {
    const [lat, lng] = toLatLng(item.location!);
    const ex = pins.find(p => p.name === item.location!.name);
    if (ex) ex.photos.push(item);
    else pins.push({ id: item.id, name: item.location!.name, lat, lng, photos: [item] });
  });

  const onPtrDown = (e: React.PointerEvent) => {
    dragRef.current = { isDown: true, startY: e.pageY - sheetOffset, lastY: e.pageY, lastT: Date.now(), vel: 0 };
    setIsDragging(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPtrMove = (e: React.PointerEvent) => {
    if (!dragRef.current.isDown) return;
    const dy = Math.max(0, e.pageY - dragRef.current.startY);
    const now = Date.now();
    dragRef.current.vel = (e.pageY - dragRef.current.lastY) / Math.max(1, now - dragRef.current.lastT);
    dragRef.current.lastY = e.pageY; dragRef.current.lastT = now;
    setSheetOffset(dy);
  };
  const onPtrUp = () => {
    if (!dragRef.current.isDown) return;
    dragRef.current.isDown = false; setIsDragging(false);
    if (sheetOffset > 150 || dragRef.current.vel > .5) { onClose(); setTimeout(() => setSheetOffset(0), 400); }
    else setSheetOffset(0);
  };

  const selectedPhoto = selectedPin?.photos[selectedPhotoIdx];

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 8000, background: `rgba(0,0,0,${Math.max(0, .85 - sheetOffset * .002)})`, animation: 'fadeInOverlay .3s ease-out' }} onClick={onClose}>
      <style>{`
        @keyframes pinPop { from{opacity:0;transform:scale(.2) translateY(20px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes locRing { 0%{transform:scale(1);opacity:.6} 100%{transform:scale(3);opacity:0} }
        @keyframes cardUp  { from{opacity:0;transform:translateY(28px) scale(.97)} to{opacity:1;transform:translateY(0) scale(1)} }
        .leaflet-container{background:#e5e5e5 !important} /* Đổi từ màu đen sang xám sáng */
        .leaflet-tile-pane{ filter: none; }
        .leaflet-control-attribution,.leaflet-control-zoom{display:none!important}
     `}</style>

      <div onClick={e => e.stopPropagation()} style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, top: 0,
        background: '#000000', borderRadius: 0, overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        transform: `translateY(${sheetOffset}px)`,
        transition: isDragging ? 'none' : 'transform .5s cubic-bezier(.19,1,.22,1)',
        animation: 'slideUpSheet .45s cubic-bezier(.16,1,.3,1)',
        boxShadow: '0 -20px 60px rgba(0,0,0,.8)',
      }}>

        {/* Drag handle */}
        <div onPointerDown={onPtrDown} onPointerMove={onPtrMove} onPointerUp={onPtrUp} style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 2000, padding: '12px 0', cursor: 'grab', touchAction: 'none' }}>
          <div style={{ width: 36, height: 5, borderRadius: 3, background: 'rgba(255,255,255,.3)', margin: '0 auto' }} />
        </div>

        {/* Map container - Full Screen Inset */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <MapContainer center={MY_POS} zoom={12} zoomControl={false} attributionControl={false} style={{ width: '100%', height: '100%' }}>
            <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" maxZoom={19} subdomains="abcd" />
            <AutoBounds pins={pins} focus={initialFocusLocation ?? null} />
            <FlyTo target={flyTarget} />
            <Marker position={MY_POS} icon={userDotIcon} />
            {pins.map((pin, idx) => (
              <Marker key={pin.id} position={[pin.lat, pin.lng]}
                icon={makePhotoIcon(pin.photos[0].image, pin.photos.length, pin.name, selectedPin?.id === pin.id, idx * .06)}
                eventHandlers={{ click: () => { setSelectedPin(pin); setSelectedPhotoIdx(0); setFlyTarget({ lat: pin.lat, lng: pin.lng }); } }}
              />
            ))}
          </MapContainer>

          {/* You / All Filter + Locate Me — bottom bar */}
          {!selectedPin && (
            <div style={{ position: 'absolute', bottom: `calc(20px + env(safe-area-inset-bottom))`, left: 0, right: 0, zIndex: 1100, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, pointerEvents: 'none' }}>
              {/* YOU / ALL pill */}
              <div style={{ display: 'flex', background: 'rgba(10,15,26,0.82)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', padding: 4, borderRadius: 20, border: '1px solid rgba(255,255,255,0.08)', pointerEvents: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
                {(['you', 'all'] as const).map(type => (
                  <button key={type} onClick={() => { setMapFilter(type); setSelectedPin(null); }}
                    style={{ padding: '8px 24px', borderRadius: 16, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, background: mapFilter === type ? 'white' : 'transparent', color: mapFilter === type ? '#000' : 'rgba(255,255,255,0.6)', transition: 'all 0.25s ease' }}>
                    {type === 'you' ? 'You' : 'All'}
                  </button>
                ))}
              </div>
              {/* Locate Me button */}
              <button onClick={() => setFlyTarget({ lat: MY_POS[0], lng: MY_POS[1] })}
                style={{ width: 44, height: 44, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', background: 'rgba(10,15,26,0.82)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'auto' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#007AFF" strokeWidth="2.5" strokeLinecap="round">
                  <circle cx="12" cy="12" r="3"/><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/>
                </svg>
              </button>
            </div>
          )}

          {/* Header — solid frosted-glass pill, top: 16 */}
          <div style={{ position: 'absolute', top: `calc(18px + env(safe-area-inset-top, 40px))`, left: 12, right: 12, zIndex: 1200 }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'rgba(8,12,22,0.92)', backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)',
              border: '1.5px solid rgba(255,255,255,0.15)', borderRadius: 28,
              padding: '12px 16px 12px 24px',
              boxShadow: '0 12px 40px rgba(0,0,0,0.75)',
            }}>
              <div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 2 }}>Private Archive</div>
                <div style={{ color: 'white', fontSize: 21, fontWeight: 950, letterSpacing: -0.6, lineHeight: 1.1 }}>Memory Map</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: 'white', fontSize: 15, fontWeight: 900 }}>{pins.length} địa điểm</div>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 700 }}>{displayPhotos.length} kỷ niệm</div>
                </div>
                <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.16)', border: '1px solid rgba(255,255,255,0.12)', cursor: 'pointer', borderRadius: '50%', width: 40, height: 40, display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0, transition: 'background 0.2s' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            </div>
          </div>

          {/* Empty state */}
          {pins.length === 0 && (
            <div style={{ position: 'absolute', inset: 0, zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(10,15,26,.94)', gap: 10, pointerEvents: 'none' }}>
              <div style={{ fontSize: 46 }}>📍</div>
              <div style={{ color: 'white', fontSize: 16, fontWeight: 800, letterSpacing: -.3 }}>Chưa có kỷ niệm nào</div>
              <div style={{ color: 'rgba(255,255,255,.35)', fontSize: 12, fontWeight: 500, textAlign: 'center', maxWidth: 220, lineHeight: 1.6 }}>
                Chụp ảnh → chọn 📍 Location → gửi để ghim kỷ niệm
              </div>
            </div>
          )}


          {/* Preview card */}
          {selectedPin && (
            <div style={{ position: 'absolute', bottom: `calc(12px + env(safe-area-inset-bottom))`, left: 10, right: 10, zIndex: 1000, background: 'rgba(14,18,28,.97)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderRadius: 20, border: '1px solid rgba(255,255,255,.1)', boxShadow: '0 24px 70px rgba(0,0,0,.85)', overflow: 'hidden', animation: 'cardUp .32s cubic-bezier(.16,1,.3,1)' }} onClick={e => e.stopPropagation()}>
              <button onClick={() => setSelectedPin(null)} style={{ position: 'absolute', top: 10, right: 10, zIndex: 2, background: 'rgba(0,0,0,.55)', border: 'none', cursor: 'pointer', borderRadius: '50%', width: 28, height: 28, display: 'flex', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(8px)' }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.9)" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
              <div style={{ height: 150, overflow: 'hidden', position: 'relative' }}>
                <img key={selectedPhoto?.id} src={selectedPhoto?.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'opacity .2s ease' }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,.15) 0%, transparent 35%, rgba(0,0,0,.72) 100%)' }} />
                <div style={{ position: 'absolute', bottom: 12, left: 14, right: 50 }}>
                  <div style={{ color: 'white', fontSize: 13, fontWeight: 800, letterSpacing: -.2, marginBottom: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span>📍</span> {selectedPin.name}
                  </div>
                  {selectedPhoto?.caption && <div style={{ color: 'rgba(255,255,255,.72)', fontSize: 12, fontWeight: 500, lineHeight: 1.35 }}>{selectedPhoto.caption}</div>}
                </div>
              </div>
              <div style={{ padding: '8px 14px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: selectedPin.photos.length > 1 ? '1px solid rgba(255,255,255,.06)' : 'none' }}>
                <div style={{ color: 'rgba(255,255,255,.4)', fontSize: 11, fontWeight: 600 }}>{formatDate(selectedPhoto?.date)}</div>
                <div style={{ color: 'rgba(255,255,255,.25)', fontSize: 10, fontWeight: 600, background: 'rgba(255,255,255,.07)', padding: '2px 8px', borderRadius: 6 }}>{selectedPin.photos.length} ảnh</div>
              </div>
              {selectedPin.photos.length > 1 && (
                <div style={{ display: 'flex', gap: 6, padding: '10px 14px 14px', overflowX: 'auto', scrollbarWidth: 'none' }}>
                  {selectedPin.photos.map((photo, idx) => (
                    <div key={photo.id} onClick={() => setSelectedPhotoIdx(idx)} style={{ flexShrink: 0, width: 52, height: 52, borderRadius: 9, overflow: 'hidden', cursor: 'pointer', border: idx === selectedPhotoIdx ? '2.5px solid #FFD60A' : '2.5px solid rgba(255,255,255,.08)', transition: 'border-color .2s ease', boxShadow: idx === selectedPhotoIdx ? '0 0 10px rgba(255,214,10,.35)' : 'none' }}>
                      <img src={photo.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
