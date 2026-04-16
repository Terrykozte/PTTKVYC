import { useCallback, useEffect, useRef, useState } from 'react';
import CaptionsModal from './components/CaptionsModal';
import FriendsModal from './components/FriendsModal';
import HomeScreen from './components/HomeScreen';
import 'leaflet/dist/leaflet.css';
import './index.css';

import SettingsScreen from './components/SettingsScreen';

type Modal = null | 'friends' | 'captions' | 'settings';

const CAPTION_TEXT_MAP: Record<string, string> = {
  CAPTION_TEXT:      '',
  CAPTION_REVIEW:    '⭐ Review',
  CAPTION_MUSIC:     '🎵 Now Playing',
  CAPTION_LOCATION:  '📍 Location',
  CAPTION_WEATHER:   '☀️ Weather',
  CAPTION_TIME:      '🕒 ' + new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
  CAPTION_STREAK:    '🔥 2',
  CAPTION_PARTY:     '🪩 Party Time!',
  CAPTION_GOODNIGHT: '🌙 Goodnight',
  CAPTION_OOTD:      '🕶️ OOTD',
  CAPTION_MISSYOU:   '🥰 Miss you',
};

// Công thức đàn hồi chuẩn (Rubber Band Physics)
const rubberBand = (distance: number, dimension: number, constant: number = 0.55) => {
  const sign = distance < 0 ? -1 : 1;
  const absDist = Math.abs(distance);
  return sign * (absDist * dimension * constant) / (dimension + constant * absDist);
};

const DesignShowcase = () => {
  const navigateTo = (target: string) => {
    const mapping: Record<string, string> = {
      'home': 'SC:HOME', 'chat': 'SC:CHAT_LIST', 'calendar': 'SC:CALENDAR',
      'friends': 'SC:FRIENDS', 'settings': 'SC:SETTINGS', 'activity': 'SC:ACTIVITY'
    };
    const id = mapping[target];
    if (id) {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        el.style.transform = 'scale(1.02)';
        el.style.boxShadow = '0 0 60px rgba(255, 200, 0, 0.25)';
        setTimeout(() => { el.style.transform = ''; el.style.boxShadow = ''; }, 800);
      }
    }
  };

  // ── Tiêu đề frame chuẩn Figma ──
  const FrameLabel = ({ title, subtitle, badge }: { title: string; subtitle?: string; badge?: string }) => (
    <div style={{ marginBottom: 20, textAlign: 'center', position: 'relative' }}>
      {badge && (
        <span style={{
          display: 'inline-block', padding: '3px 10px', borderRadius: 6,
          background: badge === 'Screen' ? 'rgba(255,200,0,0.15)' : badge === 'Modal' ? 'rgba(100,150,255,0.15)' : 'rgba(100,255,150,0.15)',
          color: badge === 'Screen' ? '#FFC800' : badge === 'Modal' ? '#6496FF' : '#64FF96',
          fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase',
          marginBottom: 8,
        }}>{badge}</span>
      )}
      <h3 style={{ color: '#FFC800', fontSize: 18, fontWeight: 800, margin: badge ? '8px 0 0' : 0, letterSpacing: -0.3 }}>{title}</h3>
      <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, fontWeight: 500, margin: '4px 0 0' }}>{subtitle || 'Locket · 430×932'}</p>
    </div>
  );

  // ── Phone Frame chuẩn ──
  const Phone = ({ children, id, title, badge, subtitle }: { children: React.ReactNode; id: string; title: string; badge?: string; subtitle?: string }) => (
    <div id={id} className="sc-item" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', transition: 'transform 0.4s, box-shadow 0.4s' }}>
      <FrameLabel title={title} subtitle={subtitle} badge={badge} />
      <div className="phone" style={{
        width: 430, height: 932, background: '#000', borderRadius: 0,
        overflow: 'hidden', position: 'relative',
        boxShadow: '0 0 0 1px rgba(255,255,255,0.06), 0 24px 80px rgba(0,0,0,0.9)',
      }}>
        {children}
      </div>
    </div>
  );

  return (
    <div
      className="showcase-root"
      style={{
        background: '#030303',
        minHeight: '100vh',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        overflow: 'auto',
        padding: '80px 60px 120px',
      }}
    >
      {/* ── GLOBAL SHOWCASE STYLES ── */}
      <style>{`
        .showcase-root { scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.1) transparent; }
        .showcase-root::-webkit-scrollbar { width: 6px; height: 6px; }
        .showcase-root::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }

        /* ── Grid vị trí giống Figma canvas ── */
        .sc-grid {
          display: grid;
          grid-template-columns: repeat(6, 430px);
          grid-auto-rows: 1040px;
          gap: 48px 56px;
          justify-content: center;
        }

        /* ── Flow Arrows (mũi tên kết nối giữa các frame) ── */
        .flow-arrow {
          display: flex; align-items: center; justify-content: center;
          color: rgba(255,200,0,0.25); font-size: 28px; font-weight: 300;
          pointer-events: none; user-select: none;
        }
        .flow-arrow.h { grid-row: 3; }
        .flow-arrow.v { flex-direction: column; }
      `}</style>

      {/* ── HEADER SHOWCASE ── */}
      <div style={{ textAlign: 'center', marginBottom: 64 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, #FFC800, #FF8C00)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="#000"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" /></svg>
          </div>
          <h1 style={{ color: '#fff', fontSize: 32, fontWeight: 900, margin: 0, letterSpacing: -1 }}>Locket Widget</h1>
        </div>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 15, maxWidth: 500, margin: '0 auto', lineHeight: 1.6 }}>
          UI/UX Design Showcase · iPhone 16 Pro Max · 430×932
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
          {['Screen', 'Modal', 'Flow'].map(b => (
            <span key={b} style={{
              padding: '4px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700,
              background: b === 'Screen' ? 'rgba(255,200,0,0.12)' : b === 'Modal' ? 'rgba(100,150,255,0.12)' : 'rgba(100,255,150,0.12)',
              color: b === 'Screen' ? '#FFC800' : b === 'Modal' ? '#6496FF' : '#64FF96',
            }}>{b}</span>
          ))}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 1: MAIN NAVIGATION FLOW (Hàng ngang chính)
          Calendar ← HOME → Chat List → Chat Detail → Options → Search
         ═══════════════════════════════════════════════════════════════ */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h2 style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, margin: 0 }}>① Luồng điều hướng chính</h2>
          <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12, margin: '6px 0 0' }}>Vuốt ngang · Tab Navigation · Linear Flow</p>
        </div>
        <div style={{ display: 'flex', gap: 56, justifyContent: 'center', alignItems: 'flex-start', overflowX: 'auto', padding: '0 20px' }}>
          <Phone id="SC:CALENDAR" title="Calendar" badge="Screen">
            <div className="bg" />
            <HomeScreen navigateTo={navigateTo} forceTab="calendar" />
          </Phone>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', color: 'rgba(255,200,0,0.3)', fontSize: 24, padding: '0 4px' }}>‹</div>

          <Phone id="SC:HOME" title="HOME ★" badge="Screen" subtitle="Màn hình chính · Locket · 430×932">
            <div className="bg" />
            <HomeScreen navigateTo={navigateTo} forceTab="home" />
          </Phone>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', color: 'rgba(255,200,0,0.3)', fontSize: 24, padding: '0 4px' }}>›</div>

          <Phone id="SC:CHAT_LIST" title="Chat List" badge="Screen">
            <div className="bg" />
            <HomeScreen navigateTo={navigateTo} forceTab="chat" />
          </Phone>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', color: 'rgba(255,200,0,0.3)', fontSize: 24, padding: '0 4px' }}>›</div>

          <Phone id="SC:CHAT_DETAIL" title="Chat Detail" badge="Screen">
            <div className="bg" />
            <HomeScreen navigateTo={navigateTo} forceTab="chat" forceShowDetail={true} forceChatName="Kiệt Tuấn" />
          </Phone>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', color: 'rgba(100,150,255,0.3)', fontSize: 24, padding: '0 4px' }}>›</div>

          <Phone id="SC:CHAT_OPTIONS" title="Chat Options" badge="Modal">
            <div className="bg" />
            <HomeScreen navigateTo={navigateTo} forceTab="chat" forceShowDetail={true} forceChatName="Kiệt Tuấn" forceChatOptions={true} />
          </Phone>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', color: 'rgba(100,150,255,0.3)', fontSize: 24, padding: '0 4px' }}>›</div>

          <Phone id="SC:CHAT_SEARCH" title="Chat Search" badge="Modal">
            <div className="bg" />
            <HomeScreen navigateTo={navigateTo} forceTab="chat" forceShowDetail={true} forceChatName="Kiệt Tuấn" forceSearchMode={true} />
          </Phone>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 2: VERTICAL FLOW từ HOME (Modals & Overlays)
          Friends, Settings, Activity ← HOME → Screenshot → Collabs
         ═══════════════════════════════════════════════════════════════ */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ textAlign: 'center', marginBottom: 40, marginTop: 64 }}>
          <h2 style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, margin: 0 }}>② Modals & Overlays</h2>
          <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12, margin: '6px 0 0' }}>Bottom Sheet · Full Screen · Half Modal</p>
        </div>
        <div style={{ display: 'flex', gap: 56, justifyContent: 'center', alignItems: 'flex-start', overflowX: 'auto', padding: '0 20px', flexWrap: 'wrap' }}>
          <Phone id="SC:FRIENDS" title="Friends" badge="Modal">
            <div style={{ position: 'relative', width: '100%', height: '100%' }}>
              <div className="bg" style={{ position: 'absolute', inset: 0, background: '#000' }} />
              <div style={{ position: 'absolute', inset: 0, background: '#111', zIndex: 10 }}>
                <FriendsModal onClose={() => { }} />
              </div>
            </div>
          </Phone>

          <Phone id="SC:SETTINGS" title="Profile Settings" badge="Modal">
            <div style={{ position: 'relative', width: '100%', height: '100%' }}>
              <div className="bg" style={{ position: 'absolute', inset: 0, background: '#000' }} />
              <div style={{ position: 'absolute', inset: 0, background: '#111', zIndex: 10 }}>
                <SettingsScreen onClose={() => { }} />
              </div>
            </div>
          </Phone>

          <Phone id="SC:ACTIVITY" title="Activity" badge="Modal">
            <div className="bg" />
            <HomeScreen navigateTo={navigateTo} forceTab="home" forceShowViewersModal={true} forceViewersTab="activity" />
          </Phone>

          <Phone id="SC:SWIPE_DRAG" title="Fluid Drag State" badge="Flow" subtitle="Trạng thái giữa tab · Locket · 430×932">
            <div className="bg" />
            <HomeScreen navigateTo={navigateTo} forceTab="home" forceMidDrag={true} />
          </Phone>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 3: CAMERA & COLLAB FLOW
          Screenshot → Collab Modal
         ═══════════════════════════════════════════════════════════════ */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ textAlign: 'center', marginBottom: 40, marginTop: 64 }}>
          <h2 style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, margin: 0 }}>③ Camera & Collab</h2>
          <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12, margin: '6px 0 0' }}>Chụp ảnh · Preview · Gửi bạn bè · Collab</p>
        </div>
        <div style={{ display: 'flex', gap: 56, justifyContent: 'center', alignItems: 'flex-start', overflowX: 'auto', padding: '0 20px' }}>
          <Phone id="SC:SCREENSHOT" title="Photo Preview" badge="Screen">
            <div className="bg" />
            <HomeScreen navigateTo={navigateTo} forceTab="home" forceShowPreview={true} />
          </Phone>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', color: 'rgba(100,150,255,0.3)', fontSize: 24, padding: '0 4px' }}>›</div>

          <Phone id="SC:COLLAB_MODAL" title="Collab Modal" badge="Modal">
            <div className="bg" />
            <HomeScreen navigateTo={navigateTo} forceTab="home" forceShowPreview={true} forceCollabModal={true} />
          </Phone>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 4: HISTORY FEED
          History Latest → History Grid
         ═══════════════════════════════════════════════════════════════ */}
      <div>
        <div style={{ textAlign: 'center', marginBottom: 40, marginTop: 64 }}>
          <h2 style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, margin: 0 }}>④ History Feed</h2>
          <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12, margin: '6px 0 0' }}>Lịch sử ảnh · Vuốt dọc · Grid view</p>
        </div>
        <div style={{ display: 'flex', gap: 56, justifyContent: 'center', alignItems: 'flex-start', overflowX: 'auto', padding: '0 20px' }}>
          <Phone id="SC:HISTORY_1" title="History Latest" badge="Screen">
            <div className="bg" />
            <HomeScreen navigateTo={navigateTo} forceTab="home" forceHistoryIdx={0} />
          </Phone>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', color: 'rgba(100,255,150,0.3)', fontSize: 24, padding: '0 4px' }}>›</div>

          <Phone id="SC:HISTORY_GRID" title="History Grid" badge="Modal">
            <div className="bg" />
            <HomeScreen navigateTo={navigateTo} forceTab="home" forceShowGridModal={true} />
          </Phone>
        </div>
      </div>

      {/* ── Footer ── */}
      <div style={{ textAlign: 'center', marginTop: 80, paddingBottom: 40 }}>
        <p style={{ color: 'rgba(255,255,255,0.15)', fontSize: 12 }}>
          Locket Widget · UI/UX Design System · {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
};

function App() {
  const isShowcase = new URLSearchParams(window.location.search).get('showcase') === 'true';
  const [modal, setModal] = useState<Modal>(null);
  const [closing, setClosing] = useState(false);
  const [captionPending, setCaptionPending] = useState<string | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  // High-performance Gesture State
  const isDragging = useRef(false);
  const dragMode = useRef<'scroll' | 'dismiss' | null>(null);
  const dragStartY = useRef(0);
  const dragStartScroll = useRef(0);
  const currentTranslateY = useRef(0);
  const touchEvents = useRef<{ t: number; y: number }[]>([]);
  const pendingUpdate = useRef(false);

  const openModal = useCallback((screen: string) => {
    setClosing(false);
    setModal(screen as Modal);
  }, []);

  const closeModal = useCallback((skipAnimation: boolean | React.SyntheticEvent = false) => {
    const shouldSkip = typeof skipAnimation === 'boolean' ? skipAnimation : false;
    if (shouldSkip) {
      setTimeout(() => setModal(null), 500);
    } else {
      setClosing(true);
      setTimeout(() => {
        setModal(null);
        setClosing(false);
      }, 300);
    }
  }, []);

  useEffect(() => {
    const sheet = sheetRef.current;
    if (!sheet || !modal || closing) return;

    const handlePointerStart = (clientY: number) => {
      const scrollEl = sheet.querySelector('.settings-scroll') as HTMLElement | null;
      dragStartScroll.current = scrollEl?.scrollTop ?? 0;
      dragStartY.current = clientY;
      dragMode.current = null;
      isDragging.current = true;
      currentTranslateY.current = 0;
      touchEvents.current = [{ t: Date.now(), y: dragStartY.current }];
      sheet.style.transition = 'none';
    };

    const handleTouchStart = (e: TouchEvent) => handlePointerStart(e.touches[0].clientY);
    const handleMouseDown = (e: MouseEvent) => handlePointerStart(e.clientY);

    const handlePointerMove = (clientY: number, e: Event) => {
      if (!isDragging.current) return;
      let deltaY = clientY - dragStartY.current;

      if (!dragMode.current) {
        if (dragStartScroll.current > 0) dragMode.current = 'scroll';
        else if (deltaY > 1) dragMode.current = 'dismiss';
        else if (deltaY < -1) dragMode.current = 'scroll';
        else return;
      }

      if (dragMode.current === 'scroll') {
        currentTranslateY.current = 0;
        const scrollEl = sheet.querySelector('.settings-scroll') as HTMLElement | null;
        if (scrollEl) {
          let rawScroll = dragStartScroll.current - deltaY;
          let maxScroll = scrollEl.scrollHeight - scrollEl.clientHeight;
          if (rawScroll < 0) {
            scrollEl.scrollTop = 0;
            let stretched = rubberBand(-rawScroll, window.innerHeight);
            scrollEl.style.transform = `translateY(${stretched}px)`;
          } else {
            scrollEl.scrollTop = rawScroll;
            scrollEl.style.transform = 'translateY(0)';
          }
        }
      } else if (dragMode.current === 'dismiss') {
        if (deltaY < 0) deltaY = rubberBand(deltaY, window.innerHeight);
        if (e.cancelable) e.preventDefault();
        currentTranslateY.current = deltaY;
      }

      if (!pendingUpdate.current) {
        pendingUpdate.current = true;
        requestAnimationFrame(() => {
          if (sheet) sheet.style.transform = `translateY(${currentTranslateY.current}px)`;
          pendingUpdate.current = false;
        });
      }
    };

    const handleTouchMove = (e: TouchEvent) => handlePointerMove(e.touches[0].clientY, e);
    const handleMouseMove = (e: MouseEvent) => handlePointerMove(e.clientY, e);

    const handlePointerEnd = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      sheet.style.transition = 'transform 0.45s cubic-bezier(0.22, 1, 0.36, 1)';
      if (currentTranslateY.current > window.innerHeight * 0.25) {
        sheet.style.transform = `translateY(100%)`;
        closeModal(true);
      } else {
        sheet.style.transform = `translateY(0)`;
        currentTranslateY.current = 0;
      }
    };

    sheet.addEventListener('touchstart', handleTouchStart);
    sheet.addEventListener('touchmove', handleTouchMove, { passive: false });
    sheet.addEventListener('touchend', handlePointerEnd);
    sheet.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handlePointerEnd);

    return () => {
      sheet.removeEventListener('touchstart', handleTouchStart);
      sheet.removeEventListener('touchmove', handleTouchMove);
      sheet.removeEventListener('touchend', handlePointerEnd);
      sheet.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handlePointerEnd);
    };
  }, [modal, closing, closeModal]);

  const handleCaptionSelect = useCallback((captionId: string) => {
    const text = CAPTION_TEXT_MAP[captionId] ?? '';
    setCaptionPending(text);
    closeModal(true);
  }, [closeModal]);

  if (isShowcase) return <DesignShowcase />;

  return (
    <div className="phone">
      <div className="bg" />
      <HomeScreen navigateTo={openModal} forceCaptionText={captionPending ?? undefined} />
      {modal && (
        <>
          <div className={`modal-backdrop${closing ? ' closing' : ''}`} onClick={closeModal} />
          <div
            ref={sheetRef}
            className={`modal-sheet${closing ? ' closing' : ''}`}
            style={modal === 'captions' ? {
              top: 'auto',
              maxHeight: '90%',
              background: 'linear-gradient(to top, rgba(18,18,20,0.95) 30%, rgba(18,18,20,0.82) 70%, rgba(18,18,20,0.65) 100%)',
              backdropFilter: 'blur(40px)',
              WebkitBackdropFilter: 'blur(40px)'
            } : {}}
          >
            <div className="drag-handle" style={{ cursor: 'grab' }} />
            {modal === 'friends' && <FriendsModal onClose={closeModal} />}
            {modal === 'captions' && <CaptionsModal onClose={closeModal} onSelect={handleCaptionSelect} />}
            {modal === 'settings' && <SettingsScreen onClose={closeModal} />}
          </div>
        </>
      )}
    </div>
  );
}

export default App;