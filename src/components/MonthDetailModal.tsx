import { useRef, useState } from 'react';
import type { HistoryItem } from './HomeScreen';
import { getMonthlyChallengeConfig } from '../mockData';

interface MonthDetailModalProps {
  month: number;
  year: number;
  historyItems: HistoryItem[];
  challengeImages: Record<string, string>;
  viewerIdentity: string;
  onSelectPhoto?: (photo: HistoryItem) => void;
  onClose: () => void;
}

const MONTH_NAMES = [
  '', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const MONTH_NAMES_VI = [
  '', 'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
  'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
];

const WEEKDAY_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  const day = new Date(year, month - 1, 1).getDay();
  return (day + 6) % 7;
}

function challengeSlotToDay(weekIndex: number, dayIndex: number): number {
  return weekIndex * 7 + dayIndex + 1;
}

function formatLightboxDate(dateStr?: string) {
  if (!dateStr) return { year: '', day: '' };
  try {
    const d = new Date(dateStr);
    const year = d.getFullYear().toString();
    const dom = d.getDate();
    const ord = dom === 1 || dom === 21 || dom === 31 ? 'st' : dom === 2 || dom === 22 ? 'nd' : dom === 3 || dom === 23 ? 'rd' : 'th';
    return { year, day: d.toLocaleDateString('en-US', { month: 'long' }) + ' ' + dom + ord };
  } catch { return { year: '', day: '' }; }
}

function formatTime(dateStr?: string) {
  if (!dateStr) return '';
  try { return new Date(dateStr).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false }); }
  catch { return ''; }
}

export default function MonthDetailModal({ month, year, historyItems, challengeImages, viewerIdentity, onClose }: MonthDetailModalProps) {
  const [sheetOffset, setSheetOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({ isDown: false, startY: 0, lastY: 0, lastT: 0, vel: 0 });

  // Lightbox state
  const [lightboxPhotos, setLightboxPhotos] = useState<HistoryItem[]>([]);
  const [lightboxIdx, setLightboxIdx] = useState(0);
  const thumbsRef = useRef<HTMLDivElement>(null);

  function openLightbox(photos: HistoryItem[], startIdx = 0) {
    setLightboxPhotos(photos);
    setLightboxIdx(startIdx);
  }
  function closeLightbox() { setLightboxPhotos([]); setLightboxIdx(0); }
  function goLightbox(idx: number) {
    setLightboxIdx(idx);
    // scroll thumb into view
    setTimeout(() => {
      const el = thumbsRef.current?.children[idx] as HTMLElement | undefined;
      el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }, 50);
  }

  const handlePointerDown = (e: React.PointerEvent) => {
    dragRef.current.isDown = true;
    dragRef.current.startY = e.pageY - sheetOffset;
    dragRef.current.lastY = e.pageY;
    dragRef.current.lastT = Date.now();
    setIsDragging(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current.isDown) return;
    const dy = Math.max(0, e.pageY - dragRef.current.startY);
    const now = Date.now();
    const dt = Math.max(1, now - dragRef.current.lastT);
    dragRef.current.vel = (e.pageY - dragRef.current.lastY) / dt;
    dragRef.current.lastY = e.pageY;
    dragRef.current.lastT = now;
    setSheetOffset(dy);
  };

  const handlePointerUp = () => {
    if (!dragRef.current.isDown) return;
    dragRef.current.isDown = false;
    setIsDragging(false);
    if (sheetOffset > 150 || dragRef.current.vel > 0.5) {
      onClose();
      setTimeout(() => setSheetOffset(0), 400);
    } else {
      setSheetOffset(0);
    }
  };

  const daysInMonth = getDaysInMonth(year, month);
  const firstDayOffset = getFirstDayOfMonth(year, month); // how many empty cells before day 1
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month;
  const todayDay = isCurrentMonth ? today.getDate() : -1;

  const datePrefix = `${year}-${String(month).padStart(2, '0')}-`;

  // Group historyItems by day number — Private Memories: only MY photos
  const photosByDay: Record<number, HistoryItem[]> = {};
  historyItems.forEach(item => {
    if (item.date?.startsWith(datePrefix) && (item.sender === viewerIdentity || item.sender === 'You')) {
      const day = parseInt(item.date.slice(8, 10), 10);
      if (!photosByDay[day]) photosByDay[day] = [];
      photosByDay[day].push(item);
    }
  });

  // Build challenge day map: dayOfMonth → {slotKey, dataUrl}
  const challengeByDay: Record<number, string> = {};
  const monthConfig = getMonthlyChallengeConfig(month);
  
  monthConfig.forEach((week, wIdx) => {
    for (let d = 0; d < 7; d++) {
      // FIX: Include Month prefix to avoid leakage between months
      const slotKey = `M${month}-${week.key}-${d}`;
      const img = challengeImages[slotKey];
      if (img) {
        const dayNum = challengeSlotToDay(wIdx, d);
        challengeByDay[dayNum] = img;
      }
    }
  });

  const totalCells = Math.ceil((firstDayOffset + daysInMonth) / 7) * 7;

  return (
    <div
      style={{
        position: 'absolute', inset: 0, zIndex: 7600,
        background: `rgba(0,0,0,${Math.max(0, 0.65 - sheetOffset * 0.001)})`,
        animation: 'fadeInOverlay 0.3s ease-out',
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, top: 44,
          background: 'rgba(14,14,14,0.99)',
          backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)',
          borderRadius: '32px 32px 0 0',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 -20px 60px rgba(0,0,0,0.8)',
          transform: `translateY(${sheetOffset}px)`,
          transition: isDragging ? 'none' : 'transform 0.5s cubic-bezier(0.19, 1, 0.22, 1)',
          animation: 'slideUpSheet 0.45s cubic-bezier(0.16, 1, 0.3, 1)',
          overflow: 'hidden',
        }}
      >
        {/* Drag Handle */}
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          style={{ padding: '12px 0 8px', cursor: 'grab', touchAction: 'none', flexShrink: 0 }}
        >
          <div style={{ width: 36, height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.2)', margin: '0 auto' }} />
        </div>

        {/* Header */}
        <div style={{ padding: '4px 20px 12px', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          <div style={{ flex: 1 }}>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 }}>
              {MONTH_NAMES_VI[month]}
            </div>
            <h2 style={{ color: 'white', fontSize: 22, fontWeight: 900, margin: '2px 0 0', letterSpacing: -0.5 }}>
              {MONTH_NAMES[month]} {year}
            </h2>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {/* Stats */}
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 700 }}>
                {Object.keys(photosByDay).length} ngày có ảnh
              </div>
              {Object.keys(challengeByDay).length > 0 && (
                <div style={{ color: '#FFC800', fontSize: 11, fontWeight: 700 }}>
                  ⚡ {Object.keys(challengeByDay).length} challenge
                </div>
              )}
            </div>
            {/* Close button */}
            <button
              onClick={onClose}
              style={{ background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', borderRadius: '50%', width: 32, height: 32, display: 'flex', justifyContent: 'center', alignItems: 'center' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Weekday labels */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, padding: '0 12px 6px', flexShrink: 0 }}>
          {WEEKDAY_LABELS.map(label => (
            <div key={label} style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: 700, padding: '4px 0' }}>
              {label}
            </div>
          ))}
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', marginBottom: 8, flexShrink: 0 }} />

        {/* Day grid — scrollable */}
        <div className="settings-scroll" style={{ flex: 1, overflowY: 'auto', padding: '0 12px 40px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
            {Array.from({ length: totalCells }, (_, cellIdx) => {
              const dayNum = cellIdx - firstDayOffset + 1;
              const isValidDay = dayNum >= 1 && dayNum <= daysInMonth;

              if (!isValidDay) {
                return <div key={cellIdx} style={{ aspectRatio: '1/1' }} />;
              }

              const photos = photosByDay[dayNum] || [];
              const challengeImg = challengeByDay[dayNum];
              const isToday = dayNum === todayDay;
              const hasContent = photos.length > 0 || !!challengeImg;
              const coverPhoto = challengeImg || (photos.length > 0 ? photos[0].image : null);

              return (
                <div
                  key={cellIdx}
                  onClick={() => {
                    if (photos.length > 0) openLightbox(photos, 0);
                  }}
                  style={{
                    aspectRatio: '1/1', borderRadius: 10, overflow: 'hidden', position: 'relative',
                    background: hasContent ? 'transparent' : 'rgba(255,255,255,0.04)',
                    border: isToday
                      ? '2px solid rgba(255,200,0,0.7)'
                      : hasContent
                        ? '1px solid rgba(255,255,255,0.08)'
                        : '1px solid rgba(255,255,255,0.05)',
                    cursor: hasContent ? 'pointer' : 'default',
                    transition: 'transform 0.15s ease',
                  }}
                >
                  {/* Cover photo */}
                  {coverPhoto && (
                    <img src={coverPhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  )}

                  {/* Gradient overlay when has photo */}
                  {hasContent && (
                    <div style={{
                      position: 'absolute', inset: 0,
                      background: 'linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, transparent 40%, rgba(0,0,0,0.4) 100%)',
                    }} />
                  )}

                  {/* Day number */}
                  <div style={{
                    position: 'absolute', top: hasContent ? 4 : '50%', left: 0, right: 0,
                    textAlign: 'center',
                    transform: hasContent ? 'none' : 'translateY(-50%)',
                  }}>
                    <span style={{
                      fontSize: hasContent ? 10 : 12,
                      fontWeight: 800,
                      color: isToday ? '#FFC800' : hasContent ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.25)',
                      textShadow: hasContent ? '0 1px 3px rgba(0,0,0,0.8)' : 'none',
                    }}>
                      {dayNum}
                    </span>
                  </div>

                  {/* Challenge badge */}
                  {challengeImg && (
                    <div style={{
                      position: 'absolute', top: 3, right: 3,
                      background: '#FFC800', borderRadius: '50%',
                      width: 12, height: 12, display: 'flex', justifyContent: 'center', alignItems: 'center',
                      fontSize: 7, border: '1.5px solid rgba(0,0,0,0.4)',
                    }}>
                      ⚡
                    </div>
                  )}

                  {/* Multiple photos dot */}
                  {photos.length > 1 && (
                    <div style={{
                      position: 'absolute', bottom: 3, left: 0, right: 0,
                      display: 'flex', justifyContent: 'center', gap: 2,
                    }}>
                      {Array.from({ length: Math.min(photos.length, 3) }, (_, i) => (
                        <div key={i} style={{ width: 3, height: 3, borderRadius: '50%', background: 'rgba(255,255,255,0.8)' }} />
                      ))}
                    </div>
                  )}

                  {/* Today ring */}
                  {isToday && !hasContent && (
                    <div style={{
                      position: 'absolute', inset: 0,
                      borderRadius: 9,
                      border: '2px solid rgba(255,200,0,0.5)',
                    }} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div style={{ marginTop: 20, display: 'flex', justifyContent: 'center', gap: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: 3, background: 'rgba(255,200,0,0.8)', flexShrink: 0 }} />
              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: 700 }}>Hôm nay</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#FFC800', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: 6 }}>⚡</div>
              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: 700 }}>Challenge</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ display: 'flex', gap: 1.5 }}>
                {[0, 1, 2].map(i => <div key={i} style={{ width: 3, height: 3, borderRadius: '50%', background: 'rgba(255,255,255,0.4)' }} />)}
              </div>
              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: 700 }}>Nhiều ảnh</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Photo Lightbox — OUTSIDE overflow:hidden, full-screen ── */}
      {lightboxPhotos.length > 0 && (() => {
        // Only photos that have an image
        const withImg = lightboxPhotos.filter(p => p.image);
        const safeIdx = Math.min(lightboxIdx, withImg.length - 1);
        const photo = withImg[safeIdx];
        const { year: lbYear, day: lbDay } = formatLightboxDate(photo?.date);
        return (
          <div style={{ position: 'absolute', inset: 0, zIndex: 7700, background: '#000', display: 'flex', flexDirection: 'column' }}>
            <style>{`@keyframes lbFade{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}`}</style>

            {/* ── [X]   year / Month Dayth   [share↑] ── */}
            <div style={{ display: 'flex', alignItems: 'center', padding: '14px 16px 6px', flexShrink: 0 }}>
              <button onClick={closeLightbox} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8, marginLeft: -8, flexShrink: 0 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ color: 'rgba(255,255,255,0.38)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.9 }}>{lbYear}</div>
                <div style={{ color: 'white', fontSize: 18, fontWeight: 900, letterSpacing: -0.4 }}>{lbDay}</div>
              </div>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8, marginRight: -8, flexShrink: 0, opacity: 0.55 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>
                </svg>
              </button>
            </div>

            {/* ── IMAGE 1:1 + TIME ── */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '8px 16px 0' }}>
              <div key={photo?.id} style={{ width: '100%', aspectRatio: '1/1', borderRadius: 26, overflow: 'hidden', position: 'relative', boxShadow: '0 20px 60px rgba(0,0,0,0.85)', animation: 'lbFade 0.2s ease-out' }}>
                {photo?.image && (
                  <img src={photo.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                )}
                {photo?.caption && (
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '44px 18px 18px', background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 100%)' }}>
                    <div style={{ color: 'white', fontSize: 15, fontWeight: 700, lineHeight: 1.4, textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}>{photo.caption}</div>
                  </div>
                )}
              </div>
              {/* TIME */}
              <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, fontWeight: 600, marginTop: 12, letterSpacing: 0.5 }}>
                {formatTime(photo?.date)}
              </div>
            </div>

            {/* ── [...img-2] [img-1] [▐CURRENT▌] [img+1] [img+2...] ── */}
            <div style={{ flexShrink: 0, paddingBottom: 30, paddingTop: 8 }}>
              <div
                ref={thumbsRef}
                style={{ display: 'flex', gap: 7, overflowX: 'auto', scrollbarWidth: 'none', padding: '6px 20px', alignItems: 'center' }}
              >
                {withImg.map((p, idx) => {
                  const isCurrent = idx === safeIdx;
                  return (
                    <div
                      key={p.id}
                      onClick={() => goLightbox(idx)}
                      style={{
                        flexShrink: 0,
                        width: isCurrent ? 64 : 54,
                        height: isCurrent ? 64 : 54,
                        borderRadius: 12,
                        overflow: 'hidden',
                        cursor: 'pointer',
                        border: isCurrent ? '2.5px solid white' : '2px solid rgba(255,255,255,0.12)',
                        opacity: isCurrent ? 1 : 0.45,
                        transition: 'all 0.22s cubic-bezier(0.4,0,0.2,1)',
                        boxShadow: isCurrent ? '0 0 0 3px rgba(255,255,255,0.18)' : 'none',
                      }}
                    >
                      <img src={p.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
