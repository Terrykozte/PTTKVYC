import { useCallback, useRef, useState } from 'react';
import { MOCK_FRIENDS } from '../mockData';

const Chevron = () => (
  <svg className="settings-chevron" width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path d="M9 6l6 6-6 6" stroke="rgba(255,255,255,.35)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const Row = ({ icon, label, right, labelColor, id }: { icon: React.ReactNode; label: string; right?: React.ReactNode; labelColor?: string; id?: string }) => (
  <div 
    className="settings-row"
    data-name={`Settings / Row / ${label}`}
    id={id}
  >
    <div className="settings-row-left">
      <div className="settings-row-icon" data-name="Icon">{icon}</div>
      <span className="settings-row-label" style={labelColor ? { color: labelColor } : undefined} data-name="Label">{label}</span>
    </div>
    {right || <Chevron />}
  </div>
);

const Toggle = ({ on, onToggle }: { on: boolean; onToggle: () => void }) => (
  <button className={`toggle-track${on ? ' on' : ''}`} onClick={(e) => { e.stopPropagation(); onToggle(); }}>
    <div className="toggle-knob" />
  </button>
);

/* ── SHARE SHEET ── */
function ShareSheet({ link, onClose }: { link: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(link); } catch { }
    setCopied(true);
    setTimeout(() => { setCopied(false); onClose(); }, 1200);
  };
  return (
    <div className="share-sheet-backdrop" onClick={onClose}>
      <div className="share-sheet" onClick={e => e.stopPropagation()}>
        <div className="share-sheet-handle" />
        <div className="share-sheet-link">{link}</div>
        <div className="share-sheet-actions">
          <button className="share-action-btn" onClick={handleCopy}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" /></svg>
            <span>{copied ? 'Copied!' : 'Copy Link'}</span>
          </button>
          <button className="share-action-btn">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" /></svg>
            <span>Mail</span>
          </button>
          <button className="share-action-btn">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z" /></svg>
            <span>Message</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SettingsScreen({ onClose }: { onClose: () => void }) {
  const [friends] = useState(MOCK_FRIENDS);
  const [myPrivacySettings, setMyPrivacySettings] = useState({
    anonymousCollab: false,
    hideCollab: false,
    readReceipts: true
  });
  
  const setPrivacy = (key: string, val: boolean) => {
    setMyPrivacySettings(prev => ({ ...prev, [key]: val }));
  };

  const [goldBadge, setGoldBadge] = useState(false);
  const { anonymousCollab, hideCollab, readReceipts } = myPrivacySettings;
  const [showShare, setShowShare] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef(0);
  const isDragging = useRef(false);

  const handleDragStart = useCallback((clientY: number) => {
    if (scrollRef.current && scrollRef.current.scrollTop > 0) return;
    dragStartY.current = clientY;
    isDragging.current = true;
  }, []);

  const handleDragEnd = useCallback((clientY: number) => {
    if (!isDragging.current) return;
    isDragging.current = false;
    const dy = clientY - dragStartY.current;
    if (dy > 100) onClose();
  }, [onClose]);

  return (
    <>
      <div
        style={{ cursor: 'grab', touchAction: 'none', flexShrink: 0, padding: '4px 0 8px' }}
        onMouseDown={e => handleDragStart(e.clientY)}
        onMouseUp={e => handleDragEnd(e.clientY)}
        onTouchStart={e => handleDragStart(e.touches[0].clientY)}
        onTouchEnd={e => handleDragEnd(e.changedTouches[0].clientY)}
      />

      <div className="settings-scroll" ref={scrollRef}>
        {/* ── LOCKET GOLD BADGE ── */}
        <div style={{ position: 'relative' }}>
          <div className="gold-badge-corner">
            <svg viewBox="0 0 100 100" width="72" height="72">
              <defs>
                <path id="arcTop" d="M15,50 A35,35 0 0,1 85,50" />
                <path id="arcBot" d="M15,50 A35,35 0 0,0 85,50" />
              </defs>
              <circle cx="50" cy="50" r="38" fill="none" stroke="rgba(255,205,0,0.15)" strokeWidth="5" />
              <text fill="#FFD700" fontSize="10" fontWeight="800" letterSpacing="2">
                <textPath href="#arcTop" startOffset="50%" textAnchor="middle">LOCKET GOLD</textPath>
              </text>
              <text fill="#FFD700" fontSize="10" fontWeight="800" letterSpacing="2">
                <textPath href="#arcBot" startOffset="50%" textAnchor="middle">SINCE 2025</textPath>
              </text>
              <path d="M50 62l-1.5-1.3C41 54 37 50 37 45.5 37 42 40 39 43.5 39c2 0 3.9.9 5 2.4L50 43.8l1.5-2.4c1.1-1.5 3-2.4 5-2.4C60 39 63 42 63 45.5c0 4.5-4 8-11.5 15.2L50 62z" fill="#FFD700" />
            </svg>
          </div>

          {/* ── PROFILE SECTION ── */}
          <div className="profile-section">
            <div className="avatar-ring-outer">
              <div className="avatar-ring-inner">
                <svg width="44" height="44" viewBox="0 0 24 24" fill="rgba(255,255,255,.75)">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
              </div>
            </div>

            <div className="profile-name">Terrykozte</div>

            <button className="profile-link-btn" onClick={() => setShowShare(true)}>
              locket.cam/terrykozte
              <svg width="12" height="12" viewBox="0 0 24 24" fill="rgba(255,255,255,.45)" style={{ marginLeft: 4 }}>
                <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z" />
              </svg>
            </button>

            <div className="profile-btns">
              <button className="profile-btn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                  <path d="M16 11c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 3-1.34 3-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5C15 14.17 10.33 13 8 13z" />
                </svg>
                {friends.length} Friends
              </button>
              <button className="profile-btn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                  <path d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z" />
                </svg>
                Share
              </button>
            </div>

            <div 
              className="gold-card"
              data-name="Card / Locket Gold / Promo"
            >
              <div className="gold-card-left">
                <div className="gold-heart-icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="#FFD700">
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                  </svg>
                </div>
                <div className="gold-card-text">
                  <strong data-name="Title">Locket Gold</strong>
                  <span data-name="Subtitle">Member since 5 Nov 2025</span>
                </div>
              </div>
              <Chevron />
            </div>
          </div>
        </div>

        {/* ── WIDGETS ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '28px 4px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="rgba(255,255,255,.6)"><path d="M13 13v8h8v-8h-8zM3 21h8v-8H3v8zM3 3v8h8V3H3zm13.66-1.31L11 7.34 16.66 13l5.66-5.66-5.66-5.65z" /></svg>
            <span style={{ fontSize: 17, fontWeight: 800, color: '#fff' }}>Widgets</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#FFD700' }}>New</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#FFD700"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z" /></svg>
          </div>
        </div>

        <div className="widget-card-scroll">
          <div className="widget-card">
            <div className="widget-circle">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="#FFD700"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" /></svg>
            </div>
            <span className="widget-card-label">Create</span>
          </div>
        </div>

        {/* ── LOCKET GOLD SECTION ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '28px 4px 12px' }}>
          <span style={{ fontSize: 17, fontWeight: 800, color: '#fff' }}>Locket Gold</span>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#FFD700' }}>View Features</span>
        </div>
        <div className="settings-card">
          <Row icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="#FFD700"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>} label="Change app icon" />
          <Row icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="#FFD700"><path d="M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z" /></svg>} label="Camera theme" />
          <Row icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="#FFD700"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" /></svg>} label="Locket Gold badge" right={
            <Toggle on={goldBadge} onToggle={() => setGoldBadge(!goldBadge)} />
          } />
        </div>

        {/* ── WIDGET SETUP ── */}
        <div className="settings-section-title">Widget Setup</div>
        <div className="settings-card">
          <Row icon={<span style={{ fontSize: 18 }}>🤖</span>} label="How to add the widget" />
        </div>

        {/* ── GENERAL ── */}
        <div className="settings-section-title">General</div>
        <div className="settings-card">
          <Row icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="#fff"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" /></svg>} label="Notifications" />
          <Row icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="#fff"><path d="M12 6c1.11 0 2-.9 2-2 0-.38-.1-.73-.29-1.03L12 0l-1.71 2.97c-.19.3-.29.65-.29 1.03 0 1.1.9 2 2 2zm4.6 9.99l-1.07-1.07-1.08 1.07c-1.3 1.3-3.58 1.31-4.89 0l-1.07-1.07-1.09 1.07C6.75 16.64 5.88 17 4.96 17c-.73 0-1.4-.23-1.96-.61V21c0 .55.45 1 1 1h16c.55 0 1-.45 1-1v-4.61c-.56.38-1.23.61-1.96.61-.92 0-1.79-.36-2.44-1.01zM18 9h-5V7h-2v2H6c-1.66 0-3 1.34-3 3v1.54c0 1.08.88 1.96 1.96 1.96.52 0 1.02-.2 1.38-.57l2.14-2.13 2.13 2.13c.74.74 2.03.74 2.77 0l2.14-2.13 2.13 2.13c.37.37.86.57 1.38.57 1.08 0 1.96-.88 1.96-1.96V12c.01-1.66-1.33-3-2.99-3z" /></svg>} label="Edit birthday" />
          <Row icon={<span style={{ color: '#fff', fontSize: 16, fontWeight: 800 }}>Aa</span>} label="Edit name" />
          <Row icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="#fff"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></svg>} label="Edit profile photo" />
          <Row icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="#fff"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" /></svg>} label="Phone number" />
          <Row icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="#fff"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V8l8 5 8-5v10zm-8-7L4 6h16l-8 5z" /></svg>} label="Add email address" />
          <Row icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="#fff"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" /></svg>} label="Unlink music provider" />
        </div>

        {/* ── SUPPORT ── */}
        <div className="settings-section-title">Support</div>
        <div className="settings-card">
          <Row icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="#fff"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" /></svg>} label="Help Center" />
          <Row icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="#fff"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" /></svg>} label="Report a problem" />
          <Row icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="#fff"><path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7 12h-2v-2h2v2zm0-4h-2V6h2v4z" /></svg>} label="Make a suggestion" />
          <Row icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="#fff"><path d="M12 6v3l4-4-4-4v3c-4.42 0-8 3.58-8 8 0 1.57.46 3.03 1.24 4.26L6.7 14.8c-.45-.83-.7-1.79-.7-2.8 0-3.31 2.69-6 6-6zm6.76 1.74L17.3 9.2c.44.84.7 1.79.7 2.8 0 3.31-2.69 6-6 6v-3l-4 4 4 4v-3c4.42 0 8-3.58 8-8 0-1.57-.46-3.03-1.24-4.26z" /></svg>} label="Restore purchases" />
        </div>

        {/* ── PRIVACY & SAFETY ── */}
        <div className="settings-section-title">Privacy & Safety</div>
        <div className="settings-card">
          <Row icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="#fff"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM4 12c0-4.42 3.58-8 8-8 1.85 0 3.55.63 4.9 1.69L5.69 16.9C4.63 15.55 4 13.85 4 12zm8 8c-1.85 0-3.55-.63-4.9-1.69L18.31 7.1C19.37 8.45 20 10.15 20 12c0 4.42-3.58 8-8 8z" /></svg>} label="Blocked accounts" />
          <Row icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="#4CAF50"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" /></svg>} label="Send read receipts" right={
            <Toggle on={readReceipts} onToggle={() => setPrivacy('readReceipts', !readReceipts)} />
          } />
          
          <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '0 16px' }} />
          
          <Row 
            icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="#fff"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg>} 
            label="Anonymous Collab" 
            right={<Toggle on={anonymousCollab} onToggle={() => setPrivacy('anonymousCollab', !anonymousCollab)} />}
          />
          <Row 
            icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="#fff"><path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/></svg>} 
            label="Hide Collab (Ghost Mode)" 
            right={<Toggle on={hideCollab} onToggle={() => setPrivacy('hideCollab', !hideCollab)} />}
          />
          
          <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '0 16px' }} />
          <Row icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="#fff"><path d="M12.65 10C11.83 7.67 9.61 6 7 6c-3.31 0-6 2.69-6 6s2.69 6 6 6c2.61 0 4.83-1.67 5.65-4H17v4h4v-4h2v-4H12.65zM7 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z" /></svg>} label="Privacy and Data" />
        </div>

        {/* ── ABOUT ── */}
        <div className="settings-section-title">About</div>
        <div className="settings-card">
          <Row icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="#fff"><path d="M12.53 5.47a.75.75 0 00-1.06 0l-4.5 4.5a.75.75 0 001.06 1.06l3.22-3.22V21a.75.75 0 001.5 0V7.81l3.22 3.22a.75.75 0 001.06-1.06l-4.5-4.5z M6 3a.75.75 0 000 1.5h12a.75.75 0 000-1.5H6z" /></svg>} label="TikTok" />
          <Row icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="5" stroke="#fff" strokeWidth="1.8" fill="none" /><circle cx="12" cy="12" r="5" stroke="#fff" strokeWidth="1.8" fill="none" /><circle cx="18" cy="6" r="1.5" fill="#fff" /></svg>} label="Instagram" />
          <Row icon={<span style={{ fontSize: 16, fontWeight: 900, color: '#fff' }}>𝕏</span>} label="X (Twitter)" />
          <Row icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="#fff"><path d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z" /></svg>} label="Share Locket" />
          <Row icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="#FFD700"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" /></svg>} label="Rate Locket" />
          <Row icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="rgba(255,255,255,.5)"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zM6 20V4h7v5h5v11H6z" /></svg>} label="Terms of Service" />
          <Row icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="rgba(255,255,255,.5)"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zM15.1 8H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" /></svg>} label="Privacy Policy" />
        </div>

        {/* ── DANGER ZONE ── */}
        <div 
          className="settings-section-title" 
          style={{ color: 'rgba(255,80,80,.7)' }}
          data-name="Settings / Section / Danger Zone"
        >Danger Zone</div>
        <div className="settings-card">
          <Row icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="#ff4444"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" /></svg>} label="Delete account" labelColor="#ff4444" />
          <Row 
            icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="rgba(255,255,255,.7)"><path d="M10.09 15.59L11.5 17l5-5-5-5-1.41 1.41L12.67 11H3v2h9.67l-2.58 2.59zM19 3H5c-1.11 0-2 .9-2 2v4h2V5h14v14H5v-4H3v4c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" /></svg>} 
            label="Sign out" 
            id="BTN:SIGN_OUT"
          />
        </div>

        <div style={{ textAlign: 'center', padding: '20px 0 30px', fontSize: 13, color: 'rgba(255,255,255,.3)' }}>
          Weather data provided by 🍎 Weather
        </div>
      </div>

      {showShare && <ShareSheet link="https://locket.cam/terrykozte" onClose={() => setShowShare(false)} />}
    </>
  );
}
