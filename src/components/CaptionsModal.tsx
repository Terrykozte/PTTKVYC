import { useRef } from 'react';

export interface CaptionItem {
  id: string;
  label: string;
  emoji?: string;
  text?: string;
  style?: React.CSSProperties;
  textColor?: string;
}

interface CaptionsModalProps {
  onClose: () => void;
  onSelect?: (captionId: string) => void;
}

/**
 * Swipe protection: track pointer start position on each button.
 * If the pointer moved more than 6px total (hypot) → it was a swipe, cancel click.
 */
function useSwipeProtectedClick(onSelect?: (id: string) => void) {
  const dragRef = useRef({ x: 0, y: 0 });

  const onPointerDown = (e: React.PointerEvent) => {
    dragRef.current = { x: e.clientX, y: e.clientY };
  };

  const onClick = (e: React.MouseEvent, id: string) => {
    const dx = e.clientX - dragRef.current.x;
    const dy = e.clientY - dragRef.current.y;
    if (Math.hypot(dx, dy) > 6) return; // was a swipe — ignore
    onSelect?.(id);
  };

  return { onPointerDown, onClick };
}

export default function CaptionsModal({ onClose: _onClose, onSelect }: CaptionsModalProps) {
  const { onPointerDown, onClick } = useSwipeProtectedClick(onSelect);

  const btnProps = (id: string) => ({
    onPointerDown,
    onClick: (e: React.MouseEvent) => onClick(e, id),
  });

  return (
    <div
      className="captions-modal disable-scrollbar"
      data-name="Modal / Captions / Container"
      style={{ padding: '0 20px', height: '100%', overflowY: 'auto' }}
    >
      <h2
        data-name="Modal / Title"
        style={{ fontSize: 16, fontWeight: 700, margin: '8px 0 24px 0', color: 'white', textAlign: 'center' }}
      >
        Captions
      </h2>

      {/* General Section */}
      <h3 data-name="Section / General" style={{ fontSize: 15, fontWeight: 700, color: 'white', margin: '0 0 12px 10px' }}>General</h3>

      <div
        data-name="Grid / General"
        style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 24 }}
      >
        <button
          data-name="Caption / Item / Text"
          id="BTN:CAPTION_TEXT"
          style={{ background: '#2C2C2E', borderRadius: 20, padding: '10px 16px', border: 'none', color: 'white', fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
          {...btnProps('CAPTION_TEXT')}
        >
          <span style={{ fontWeight: 800 }}>Aa</span> Text
        </button>

        <button
          data-name="Caption / Item / Review"
          id="BTN:CAPTION_REVIEW"
          style={{ background: '#2C2C2E', borderRadius: 20, padding: '10px 16px', border: 'none', color: 'white', fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
          {...btnProps('CAPTION_REVIEW')}
        >
          <span style={{ fontSize: 18 }}>⭐</span> Review
        </button>

        <button
          data-name="Caption / Item / Now Playing"
          id="BTN:CAPTION_MUSIC"
          style={{ background: '#2C2C2E', borderRadius: 20, padding: '10px 16px', border: 'none', color: 'white', fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
          {...btnProps('CAPTION_MUSIC')}
        >
          <span style={{ fontSize: 18 }}>🎵</span> Now Playing
        </button>

        <button
          data-name="Caption / Item / Location"
          id="BTN:CAPTION_LOCATION"
          style={{ background: '#2C2C2E', borderRadius: 20, padding: '10px 16px', border: 'none', color: 'white', fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
          {...btnProps('CAPTION_LOCATION')}
        >
          <span style={{ fontSize: 18 }}>📍</span> Location
        </button>

        <button
          data-name="Caption / Item / Weather"
          id="BTN:CAPTION_WEATHER"
          style={{ background: 'linear-gradient(135deg, #4DB6FF, #007DFF)', borderRadius: 20, padding: '10px 16px', border: 'none', color: 'white', fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', boxShadow: '0 4px 12px rgba(0, 125, 255, 0.3)' }}
          {...btnProps('CAPTION_WEATHER')}
        >
          <span style={{ fontSize: 18 }}>☀️</span> Weather
        </button>

        <button
          data-name="Caption / Item / Time"
          id="BTN:CAPTION_TIME"
          style={{ background: '#2C2C2E', borderRadius: 20, padding: '10px 16px', border: 'none', color: 'white', fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}
          {...btnProps('CAPTION_TIME')}
        >
          <span style={{ fontSize: 18 }}>🕒</span> 9:39 PM
        </button>

        <button
          data-name="Caption / Item / Streak"
          id="BTN:CAPTION_STREAK"
          style={{ background: 'linear-gradient(135deg, #FFD500, #FF9900)', borderRadius: 20, padding: '10px 16px', border: 'none', color: '#333', fontSize: 16, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', boxShadow: '0 4px 12px rgba(255, 153, 0, 0.3)' }}
          {...btnProps('CAPTION_STREAK')}
        >
          <span style={{ fontSize: 18 }}>🔥</span> 2
        </button>
      </div>

      {/* Decorative Section */}
      <h3 data-name="Section / Decorative" style={{ fontSize: 15, fontWeight: 700, color: 'white', margin: '0 0 12px 10px' }}>Decorative</h3>

      <div
        data-name="Grid / Decorative"
        style={{ display: 'flex', flexWrap: 'wrap', gap: 10, paddingBottom: 40 }}
      >
        <button
          data-name="Caption / Item / Party"
          id="BTN:CAPTION_PARTY"
          style={{ background: 'linear-gradient(90deg, #99FF99, #FFFF66)', borderRadius: 20, padding: '10px 16px', border: 'none', color: '#111', fontSize: 16, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', boxShadow: '0 4px 12px rgba(153, 255, 153, 0.2)' }}
          {...btnProps('CAPTION_PARTY')}
        >
          <span style={{ fontSize: 18 }}>🪩</span> Party Time!
        </button>

        <button
          data-name="Caption / Item / Goodnight"
          id="BTN:CAPTION_GOODNIGHT"
          style={{ background: 'linear-gradient(135deg, #6B46C1, #312E81)', borderRadius: 20, padding: '10px 16px', border: 'none', color: 'white', fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', boxShadow: '0 4px 12px rgba(107, 70, 193, 0.3)' }}
          {...btnProps('CAPTION_GOODNIGHT')}
        >
          <span style={{ fontSize: 18 }}>🌙</span> Goodnight
        </button>

        <button
          data-name="Caption / Item / OOTD"
          id="BTN:CAPTION_OOTD"
          style={{ background: '#F2F2F7', borderRadius: 20, padding: '10px 16px', border: 'none', color: '#1C1C1E', fontSize: 16, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', boxShadow: '0 4px 12px rgba(255, 255, 255, 0.1)' }}
          {...btnProps('CAPTION_OOTD')}
        >
          <span style={{ fontSize: 18 }}>🕶️</span> OOTD
        </button>

        <button
          data-name="Caption / Item / Miss You"
          id="BTN:CAPTION_MISSYOU"
          style={{ background: 'linear-gradient(135deg, #FF453A, #FF3B30)', borderRadius: 20, padding: '10px 16px', border: 'none', color: 'white', fontSize: 16, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', boxShadow: '0 4px 12px rgba(255, 59, 48, 0.3)' }}
          {...btnProps('CAPTION_MISSYOU')}
        >
          <span style={{ fontSize: 18 }}>🥰</span> Miss you
        </button>
      </div>
    </div>
  );
}
