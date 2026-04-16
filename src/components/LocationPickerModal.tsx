/**
 * LocationPickerModal.tsx
 *
 * Flow:
 *  1. Opens from the "📍 Location" button in preview compose area (HomeScreen)
 *  2. Shows a mini Leaflet map centered on "current location" (mocked: Q1 HCMC)
 *     with a pulsing blue dot for current position
 *  3. Shows a scrollable list of nearby places below
 *  4. User taps a place → location pill updates to that name
 *  5. User can re-open and change selection at any time before Send
 *
 * Props:
 *   selectedLocation  – currently active location (null if none)
 *   onSelect          – callback with { name, mapX, mapY } | null
 *   onClose           – close the modal
 */

import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ─── Types ───────────────────────────────────────────────────────────────────
export interface PickedLocation {
  name: string;
  mapX: number;
  mapY: number;
}

interface LocationPickerModalProps {
  selectedLocation: PickedLocation | null;
  onSelect: (loc: PickedLocation | null) => void;
  onClose: () => void;
}

// ─── Nearby data (mock — in production replace with Geolocation + Places API) ─
const NEARBY_PLACES: Array<PickedLocation & { sub: string; distM: number }> = [
  // Q1 — Trung tâm
  { name: 'Quận 1, TP.HCM',          sub: 'Trung tâm thành phố',          mapX: 65, mapY: 79, distM:   120 },
  { name: 'Chợ Bến Thành',           sub: 'Lê Lợi, Quận 1',               mapX: 65, mapY: 79, distM:   280 },
  { name: 'Nhà thờ Đức Bà',          sub: 'Công xã Paris, Quận 1',        mapX: 65, mapY: 78, distM:   410 },
  { name: 'Phố đi bộ Nguyễn Huệ',   sub: 'Nguyễn Huệ, Quận 1',          mapX: 65, mapY: 79, distM:   530 },
  { name: 'Dinh Độc Lập',            sub: 'Nam Kỳ Khởi Nghĩa, Quận 1',   mapX: 64, mapY: 79, distM:   700 },
  { name: 'Bùi Viện Walking Street', sub: 'Bùi Viện, Quận 1',             mapX: 65, mapY: 80, distM:   850 },
  // Q3
  { name: 'Bảo tàng Chứng tích',     sub: 'Võ Văn Tần, Quận 3',          mapX: 64, mapY: 79, distM:  1100 },
  { name: 'Quận 3, TP.HCM',          sub: 'Lân cận Quận 1',               mapX: 64, mapY: 79, distM:  1200 },
  // Q5
  { name: 'Chợ Lớn',                 sub: 'Quận 5, TP.HCM',               mapX: 64, mapY: 80, distM:  2300 },
  { name: 'Quận 5, TP.HCM',          sub: 'Khu Hoa kiều',                  mapX: 64, mapY: 80, distM:  2500 },
  // Bình Thạnh
  { name: 'Landmark 81',             sub: 'Vinhomes Central Park, BT',     mapX: 52, mapY: 69, distM:  4800 },
  { name: 'Vinhomes Central Park',   sub: 'Bình Thạnh, TP.HCM',           mapX: 52, mapY: 70, distM:  5100 },
  // Q7
  { name: 'Phú Mỹ Hưng',             sub: 'Quận 7, TP.HCM',               mapX: 64, mapY: 81, distM:  8900 },
  { name: 'Crescent Mall',           sub: 'Tôn Dật Tiên, Quận 7',         mapX: 51, mapY: 80, distM:  9200 },
  // Thủ Đức
  { name: 'Thủ Đức, TP.HCM',         sub: 'TP. Thủ Đức',                  mapX: 67, mapY: 77, distM:  8400 },
  { name: 'Làng Đại học Thủ Đức',    sub: 'Linh Trung, Thủ Đức',          mapX: 67, mapY: 76, distM: 11000 },
  // Tỉnh khác
  { name: 'Vũng Tàu',               sub: 'Tỉnh BR-Vũng Tàu',              mapX: 72, mapY: 84, distM: 93000 },
  { name: 'Mũi Né, Phan Thiết',      sub: 'Tỉnh Bình Thuận',              mapX: 70, mapY: 74, distM:200000 },
  { name: 'Đà Lạt',                  sub: 'Tỉnh Lâm Đồng',                mapX: 62, mapY: 68, distM:290000 },
  { name: 'Đà Nẵng',                 sub: 'Thành phố Đà Nẵng',            mapX: 62, mapY: 44, distM:870000 },
];

// ─── Current location (mocked) ───────────────────────────────────────────────
const CURRENT_POS: [number, number] = [10.7764, 106.7009]; // Quận 1 centroid

// ─── User location dot icon ──────────────────────────────────────────────────
const userDotIcon = L.divIcon({
  className: '',
  html: `
    <div style="position:relative;width:18px;height:18px;">
      <div style="
        position:absolute;inset:0;
        background:rgba(0,122,255,0.2);
        border-radius:50%;
        animation:locRing 2s ease-out infinite;
      "></div>
      <div style="
        position:absolute;top:3px;left:3px;right:3px;bottom:3px;
        background:#007AFF;border-radius:50%;
        border:2.5px solid white;
        box-shadow:0 2px 8px rgba(0,122,255,0.5);
      "></div>
    </div>
  `,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

// ─── Selected pin icon ───────────────────────────────────────────────────────
function makeSelectedIcon(name: string) {
  return L.divIcon({
    className: '',
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;animation:pinPop .4s cubic-bezier(.175,.885,.32,1.275) both;">
        <div style="
          background:#1a7a5e;
          border-radius:12px 12px 12px 2px;
          padding:6px 10px;
          box-shadow:0 6px 20px rgba(0,0,0,0.45);
          border:1.5px solid rgba(255,255,255,0.2);
          white-space:nowrap;
          max-width:140px;overflow:hidden;text-overflow:ellipsis;
        ">
          <span style="color:white;font-size:11px;font-weight:800;font-family:-apple-system,sans-serif;">📍 ${name}</span>
        </div>
        <div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:8px solid #1a7a5e;margin-top:-1px;"></div>
      </div>
    `,
    iconSize: [160, 48],
    iconAnchor: [80, 48],
  });
}

// ─── Fly-to helper ───────────────────────────────────────────────────────────
function FlyTo({ target }: { target: [number, number] | null }) {
  const map = useMap();
  const prev = useRef<string>('');
  useEffect(() => {
    if (!target) return;
    const key = target.join(',');
    if (key === prev.current) return;
    prev.current = key;
    map.flyTo(target, 15, { duration: 0.6 });
  }, [target, map]);
  return null;
}

// ─── Format distance ─────────────────────────────────────────────────────────
function fmtDist(m: number): string {
  return m < 1000 ? `${m}m` : `${(m / 1000).toFixed(1)}km`;
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function LocationPickerModal({
  selectedLocation,
  onSelect,
  onClose,
}: LocationPickerModalProps) {
  const [search, setSearch] = useState('');
  const [sheetOffset, setSheetOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null);
  const dragRef = useRef({ isDown: false, startY: 0, lastY: 0, vel: 0, lastT: 0 });

  const filtered = NEARBY_PLACES.filter(p =>
    search.trim() === '' ||
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sub.toLowerCase().includes(search.toLowerCase())
  );

  const handlePointerDown = (e: React.PointerEvent) => {
    dragRef.current = { isDown: true, startY: e.pageY - sheetOffset, lastY: e.pageY, vel: 0, lastT: Date.now() };
    setIsDragging(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current.isDown) return;
    const dy = Math.max(0, e.pageY - dragRef.current.startY);
    const now = Date.now();
    dragRef.current.vel = (e.pageY - dragRef.current.lastY) / Math.max(1, now - dragRef.current.lastT);
    dragRef.current.lastY = e.pageY;
    dragRef.current.lastT = now;
    setSheetOffset(dy);
  };
  const handlePointerUp = () => {
    if (!dragRef.current.isDown) return;
    dragRef.current.isDown = false;
    setIsDragging(false);
    if (sheetOffset > 140 || dragRef.current.vel > 0.5) {
      onClose();
      setTimeout(() => setSheetOffset(0), 350);
    } else {
      setSheetOffset(0);
    }
  };

  const handlePick = (loc: PickedLocation) => {
    onSelect(loc);
    const lat = 23 - (loc.mapY / 100) * 15;
    const lng = 102 + (loc.mapX / 100) * 7;
    setFlyTarget([lat, lng]);
  };

  return (
    <>
      <style>{`
        @keyframes locRing {
          0% { transform: scale(1); opacity:.6; }
          100% { transform: scale(2.8); opacity:0; }
        }
        @keyframes pinPop {
          from { opacity:0; transform:scale(0.3) translateY(10px); }
          to   { opacity:1; transform:scale(1) translateY(0); }
        }
        .loc-item-row:active { background:rgba(255,255,255,0.06) !important; }
        .leaflet-container { background:#e5e5e5 !important; }
        .leaflet-control-attribution { display:none !important; }
        .leaflet-control-zoom { display:none !important; }
      `}</style>

      {/* Backdrop */}
      <div
        style={{
          position: 'absolute', inset: 0, zIndex: 8500,
          background: `rgba(0,0,0,${Math.max(0, 0.65 - sheetOffset * 0.003)})`,
          animation: 'fadeInOverlay .25s ease-out',
        }}
        onClick={onClose}
      >
        {/* Sheet */}
        <div
          onClick={e => e.stopPropagation()}
          style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            background: 'rgba(14,14,18,0.98)',
            backdropFilter: 'blur(28px)', WebkitBackdropFilter: 'blur(28px)',
            borderRadius: '28px 28px 0 0',
            display: 'flex', flexDirection: 'column',
            maxHeight: '86vh',
            boxShadow: '0 -16px 50px rgba(0,0,0,0.75)',
            transform: `translateY(${sheetOffset}px)`,
            transition: isDragging ? 'none' : 'transform .45s cubic-bezier(.19,1,.22,1)',
            animation: 'slideUpSheet .4s cubic-bezier(.16,1,.3,1)',
            overflow: 'hidden',
          }}
        >
          {/* Drag handle */}
          <div
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            style={{ padding: '10px 0 6px', cursor: 'grab', touchAction: 'none', flexShrink: 0 }}
          >
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.2)', margin: '0 auto' }} />
          </div>

          {/* Header */}
          <div style={{ padding: '6px 20px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <div>
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, margin: 0 }}>Vị trí</p>
              <h3 style={{ color: 'white', fontSize: 20, fontWeight: 900, margin: '2px 0 0', letterSpacing: -0.4 }}>Nearby Places</h3>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {selectedLocation && (
                <button
                  onClick={() => { onSelect(null); setFlyTarget(null); }}
                  style={{ background: 'rgba(255,59,48,0.18)', border: 'none', cursor: 'pointer', borderRadius: 10, padding: '6px 12px', color: '#FF453A', fontSize: 13, fontWeight: 700 }}
                >
                  Xóa
                </button>
              )}
              <button
                onClick={onClose}
                style={{ background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', borderRadius: '50%', width: 32, height: 32, display: 'flex', justifyContent: 'center', alignItems: 'center' }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>

          {/* ── Mini Map ── */}
          <div style={{ margin: '0 12px', borderRadius: 18, overflow: 'hidden', flexShrink: 0, height: 180, boxShadow: '0 4px 24px rgba(0,0,0,0.5)' }}>
            <MapContainer
              center={CURRENT_POS}
              zoom={15}
              zoomControl={false}
              attributionControl={false}
              style={{ width: '100%', height: '100%' }}
            >
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                maxZoom={19}
                subdomains="abcd"
              />
              <FlyTo target={flyTarget} />

              {/* Current position */}
              <Marker position={CURRENT_POS} icon={userDotIcon} />

              {/* Selected location */}
              {selectedLocation && (() => {
                const lat = 23 - (selectedLocation.mapY / 100) * 15;
                const lng = 102 + (selectedLocation.mapX / 100) * 7;
                return (
                  <Marker
                    position={[lat, lng]}
                    icon={makeSelectedIcon(selectedLocation.name)}
                  />
                );
              })()}
            </MapContainer>
          </div>

          {/* ── Search ── */}
          <div style={{ padding: '10px 12px 6px', flexShrink: 0 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: 'rgba(255,255,255,0.08)',
              borderRadius: 14, padding: '10px 14px',
              border: '1px solid rgba(255,255,255,0.06)',
            }}>
              <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2.5">
                <circle cx="9" cy="9" r="6" /><path d="m15 15 3 3" />
              </svg>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Tìm kiếm địa điểm..."
                autoFocus
                style={{
                  flex: 1, background: 'transparent', border: 'none', outline: 'none',
                  color: 'white', fontSize: 14, fontWeight: 600,
                  caretColor: '#30D158',
                }}
              />
              {search && (
                <button onClick={() => setSearch('')} style={{ background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: '50%', width: 18, height: 18, cursor: 'pointer', color: 'rgba(255,255,255,0.7)', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
              )}
            </div>
          </div>

          {/* ── Current location shortcut ── */}
          <div
            onClick={() => { 
              handlePick({ name: 'Quận 1, TP.HCM', mapX: 65, mapY: 79 }); 
              setFlyTarget(CURRENT_POS);
              // Provide instant haptic-like feedback by closing if it's a direct pick
              setTimeout(onClose, 400); 
            }}
            style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '11px 20px', cursor: 'pointer',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              background: selectedLocation?.name === 'Quận 1, TP.HCM' ? 'rgba(0,122,255,0.08)' : 'transparent',
              flexShrink: 0,
            }}
          >
            <div style={{ width: 42, height: 42, borderRadius: 13, background: 'linear-gradient(135deg,#007AFF,#0055c4)', display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ color: 'white', fontSize: 15, fontWeight: 700 }}>Sử dụng vị trí hiện tại</div>
              <div style={{ color: 'rgba(255,255,255,0.38)', fontSize: 12, marginTop: 1 }}>Tự động phát hiện · Q1, TP.HCM</div>
            </div>
            {selectedLocation?.name === 'Quận 1, TP.HCM' && (
              <div style={{ color: '#30D158', fontSize: 18, flexShrink: 0 }}>✓</div>
            )}
          </div>

          {/* ── Nearby list header ── */}
          <div style={{ padding: '10px 20px 4px', color: 'rgba(255,255,255,0.28)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, flexShrink: 0 }}>
            Gần đây
          </div>

          {/* ── Nearby list ── */}
          <div
            className="settings-scroll"
            style={{ flex: 1, overflowY: 'auto', paddingBottom: 32 }}
          >
            {filtered.length === 0 && (
              <div style={{ padding: '24px 20px', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 14, fontWeight: 600 }}>
                Không tìm thấy địa điểm
              </div>
            )}
            {filtered.map((loc, i) => {
              const isSelected = selectedLocation?.name === loc.name;
              return (
                <div
                  key={i}
                  className="loc-item-row"
                  onClick={() => handlePick(loc)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '11px 20px', cursor: 'pointer',
                    borderBottom: i < filtered.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                    background: isSelected ? 'rgba(26,122,94,0.12)' : 'transparent',
                    transition: 'background .15s ease',
                  }}
                >
                  <div style={{
                    width: 42, height: 42, borderRadius: 13,
                    background: isSelected ? 'rgba(26,122,94,0.3)' : 'rgba(255,255,255,0.07)',
                    display: 'flex', justifyContent: 'center', alignItems: 'center',
                    flexShrink: 0, transition: 'background .2s',
                  }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                      stroke={isSelected ? '#30D158' : 'rgba(255,255,255,0.55)'}
                      strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      color: isSelected ? '#30D158' : 'white',
                      fontSize: 15, fontWeight: isSelected ? 700 : 600,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      transition: 'color .15s',
                    }}>{loc.name}</div>
                    <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, marginTop: 1 }}>
                      {loc.sub} · <span style={{ color: 'rgba(255,255,255,0.22)' }}>{fmtDist(loc.distM)}</span>
                    </div>
                  </div>
                  {isSelected
                    ? <div style={{ color: '#30D158', fontSize: 18, flexShrink: 0 }}>✓</div>
                    : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
                  }
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
