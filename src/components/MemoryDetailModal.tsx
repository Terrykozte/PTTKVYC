import React, { useEffect, useRef, useState } from 'react';
import type { HistoryItem } from './HomeScreen';

export interface MemoryDetailModalProps {
  historyItems: HistoryItem[];
  challengeImages: Record<string, string>;
  viewerIdentity: string;
  /** Optional: scroll to a specific photo on open */
  initialPhotoId?: string;
  onClose: () => void;
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

export default function MemoryDetailModal({ historyItems, challengeImages, viewerIdentity, initialPhotoId, onClose }: MemoryDetailModalProps) {
  // ── All my memories with images, sorted newest first ──
  const myMemories = React.useMemo(() => {
    return historyItems
      .filter(i => (i.sender === viewerIdentity || i.sender === 'You') && i.image)
      .sort((a, b) => {
        if (!a.date || !b.date) return 0;
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
  }, [historyItems, viewerIdentity]);

  // ── Swipe carousel state ──
  const [currentIndex, setCurrentIndex] = useState(() => {
    if (initialPhotoId) {
      const idx = myMemories.findIndex(m => m.id === initialPhotoId);
      return idx !== -1 ? idx : 0;
    }
    return 0;
  });
  const scrollRef = useRef<HTMLDivElement>(null);
  const thumbsRef = useRef<HTMLDivElement>(null);

  // Scroll to initial photo on mount
  useEffect(() => {
    if (scrollRef.current && currentIndex > 0) {
      const w = scrollRef.current.offsetWidth;
      scrollRef.current.scrollTo({ left: currentIndex * w, behavior: 'instant' as ScrollBehavior });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync thumb scroll when index changes
  useEffect(() => {
    const el = thumbsRef.current?.children[currentIndex] as HTMLElement | undefined;
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [currentIndex]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const w = e.currentTarget.offsetWidth;
    const idx = Math.round(e.currentTarget.scrollLeft / w);
    if (idx !== currentIndex && idx >= 0 && idx < myMemories.length) {
      setCurrentIndex(idx);
    }
  };

  const goTo = (idx: number) => {
    setCurrentIndex(idx);
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ left: idx * scrollRef.current.offsetWidth, behavior: 'smooth' });
    }
  };

  const currentItem = myMemories[currentIndex];
  const { year: lbYear, day: lbDay } = formatLightboxDate(currentItem?.date);
  const totalPhotos = myMemories.length;

  if (totalPhotos === 0) {
    return (
      <div style={{ position: 'absolute', inset: 0, zIndex: 7600, background: '#111', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <div style={{ fontSize: 46 }}>📸</div>
        <div style={{ color: 'white', fontSize: 16, fontWeight: 800 }}>Chưa có kỷ niệm nào</div>
        <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, fontWeight: 500 }}>Gửi ảnh để tạo kỷ niệm đầu tiên</div>
        <button onClick={onClose} style={{ marginTop: 20, padding: '10px 28px', borderRadius: 20, background: 'rgba(255,255,255,0.12)', border: 'none', color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>Đóng</button>
      </div>
    );
  }

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 7600, background: '#111', display: 'flex', flexDirection: 'column' }}>

      {/* ── Header pill — synced with Maps: X left side inside pill, share right side ── */}
      <div style={{ position: 'absolute', top: 16, left: 12, right: 12, zIndex: 100 }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'rgba(8,12,22,0.90)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.13)', borderRadius: 20,
          padding: '8px 12px 8px 12px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.65)',
        }}>
          {/* X close — same position as Maps X */}
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', borderRadius: '50%', width: 34, height: 34, display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>

          {/* Date center */}
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.1 }}>{lbYear}</div>
            <div style={{ color: 'white', fontSize: 16, fontWeight: 900, letterSpacing: -0.4, lineHeight: 1.1 }}>{lbDay}</div>
          </div>

          {/* Share — same position as profile button */}
          <button style={{ background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', borderRadius: '50%', width: 34, height: 34, display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0, opacity: 0.7 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" /></svg>
          </button>
        </div>
      </div>

      {/* ── Swipeable carousel (CSS Scroll Snap) ── */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        style={{
          flex: 1, display: 'flex', overflowX: 'auto',
          scrollSnapType: 'x mandatory', scrollbarWidth: 'none',
          touchAction: 'pan-x', WebkitOverflowScrolling: 'touch',
          paddingTop: 80, /* space for header pill */
        }}
      >
        {myMemories.map((item) => (
          <div key={item.id} style={{
            flex: '0 0 100%', width: '100%', scrollSnapAlign: 'center',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: '0 20px',
          }}>
            {/* 1:1 image with rounded corners */}
            <div style={{ position: 'relative', width: '100%', aspectRatio: '1/1', borderRadius: 36, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)' }}>
              <img src={item.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              {item.caption && (
                <div style={{ position: 'absolute', bottom: 18, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
                  <div style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', padding: '9px 18px', borderRadius: 22, color: 'white', fontSize: 15, fontWeight: 700, maxWidth: '85%', textAlign: 'center' }}>
                    {item.caption}
                  </div>
                </div>
              )}
            </div>
            {/* Time */}
            <div style={{ marginTop: 16, color: 'rgba(255,255,255,0.35)', fontSize: 14, fontWeight: 700, letterSpacing: 0.5 }}>
              {formatTime(item.date)}
            </div>
          </div>
        ))}
      </div>

      {/* ── Bottom thumbnails ── */}
      <div style={{ padding: '12px 0 32px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        {myMemories.map((item, idx) => {
          if (Math.abs(idx - currentIndex) > 2) return null;
          const isActive = idx === currentIndex;
          const size = isActive ? 56 : 42;
          return (
            <div
              key={item.id}
              onClick={() => goTo(idx)}
              style={{
                width: size, height: size, borderRadius: 14, overflow: 'hidden',
                transition: 'all 0.3s cubic-bezier(0.19,1,0.22,1)',
                opacity: isActive ? 1 : 0.4,
                border: isActive ? '2px solid white' : '2px solid transparent',
                cursor: 'pointer', flexShrink: 0,
              }}
            >
              <img src={item.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
