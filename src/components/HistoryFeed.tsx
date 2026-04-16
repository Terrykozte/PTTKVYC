import React, { useRef, useState } from 'react';

export interface ContextPhoto {
  url: string;
  caption?: string | null;
  collabs?: any[];
}

interface FloatingBubble {
  id: number;
  emoji: string;
  x: number;
  y: number;
}

interface HistoryFeedProps {
  historyItems: any[];
  viewerIdentity: string;
  getIdentity: (name: string) => any;
  editingCaptionId: string | null;
  setEditingCaptionId: (id: string | null) => void;
  pendingCaption: string;
  setPendingCaption: (caption: string) => void;
  setShowViewersModal: (show: boolean) => void;
  setHistoryItems: React.Dispatch<React.SetStateAction<any[]>>;
  historyStickerPickerId: string | null;
  setHistoryStickerPickerId: (id: string | null) => void;
  handleSendTextMessage: (name: string, text: string, context?: ContextPhoto) => void;
  handleSendHeart: (name: string, context?: ContextPhoto) => void;
  handleSendSticker: (name: string, emoji: string, context?: ContextPhoto) => void;
  handleSendVoice: (name: string, duration: string, context?: ContextPhoto) => void;
  activeCollabDetailId: string | null;
  setActiveCollabDetailId: (id: string | null) => void;
  historyFeedRef: React.RefObject<HTMLDivElement | null>;
  MOCK_FRIENDS: any[];
  onNavigateToChat?: (senderName: string, senderColor: string, context: ContextPhoto) => void;
  onAcceptCollab?: (itemId: string) => void;
  onDeclineCollab?: (itemId: string) => void;
  onLeaveCollab?: (itemId: string) => void;
  isFriend: (name: string) => boolean;
  sortAvatars: (partners: any[], viewerId: string) => any[];
}

let _bubbleId = 0;

const HistoryFeed: React.FC<HistoryFeedProps> = ({
  historyItems,
  viewerIdentity,
  getIdentity,
  editingCaptionId,
  setEditingCaptionId,
  pendingCaption,
  setPendingCaption,
  setShowViewersModal,
  setHistoryItems,
  historyStickerPickerId,
  setHistoryStickerPickerId,
  handleSendTextMessage,
  handleSendHeart,
  handleSendSticker,
  handleSendVoice,
  activeCollabDetailId,
  setActiveCollabDetailId,
  historyFeedRef,
  MOCK_FRIENDS,
  onNavigateToChat,
  onAcceptCollab,
  onDeclineCollab,
  onLeaveCollab,
  isFriend,
  sortAvatars,
}) => {
  const [bubbles, setBubbles] = useState<FloatingBubble[]>([]);
  const [leaveConfirmId, setLeaveConfirmId] = useState<string | null>(null);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const spawnBubble = (emoji: string, buttonEl: HTMLElement | null) => {
    const rect = buttonEl?.getBoundingClientRect();
    const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
    const y = rect ? rect.top : window.innerHeight * 0.7;
    const id = ++_bubbleId;
    setBubbles(prev => [...prev, { id, emoji, x, y }]);
    setTimeout(() => setBubbles(prev => prev.filter(b => b.id !== id)), 1200);
  };

  return (
    <>
      {/* Global floating bubbles layer */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 99999 }}>
        {bubbles.map(b => (
          <div
            key={b.id}
            style={{
              position: 'fixed',
              left: b.x,
              top: b.y,
              fontSize: 32,
              transform: 'translate(-50%, -50%)',
              animation: 'bubbleFloat 1.2s cubic-bezier(0.22,1,0.36,1) forwards',
              pointerEvents: 'none',
            }}
          >
            {b.emoji}
          </div>
        ))}

        <style>{`
        @keyframes bubbleFloat {
          0%   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          60%  { opacity: 1; transform: translate(-50%, calc(-50% - 120px)) scale(1.2); }
          100% { opacity: 0; transform: translate(-50%, calc(-50% - 220px)) scale(0.7); }
        }
      `}</style>
      </div>

      {leaveConfirmId && (
        <div
          onClick={() => setLeaveConfirmId(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 99998,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: 300, background: 'rgba(30,30,30,0.95)', backdropFilter: 'blur(30px)',
              borderRadius: 24, padding: 24, textAlign: 'center',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
            }}
          >
            <div style={{ fontSize: 36, marginBottom: 12 }}>🔗</div>
            <h3 style={{ color: '#fff', fontSize: 18, fontWeight: 800, margin: '0 0 8px' }}>
              Remove yourself from this collab?
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, margin: '0 0 20px', lineHeight: 1.5 }}>
              Your photo will no longer be linked with the other collaborators.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setLeaveConfirmId(null)}
                style={{
                  flex: 1, padding: '13px 0', borderRadius: 16,
                  background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.1)',
                  color: '#fff', fontSize: 16, fontWeight: 800, cursor: 'pointer',
                }}
              >Cancel</button>
              <button
                onClick={() => {
                  onLeaveCollab?.(leaveConfirmId);
                  setLeaveConfirmId(null);
                }}
                style={{
                  flex: 1, padding: '13px 0', borderRadius: 16,
                  background: '#FF453A', border: 'none',
                  color: '#fff', fontSize: 16, fontWeight: 800, cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(255,69,58,0.3)',
                }}
              >Remove</button>
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }`}</style>

      {historyItems.map((item, idx) => {
        const isMeAuthor = item.sender === viewerIdentity;
        const partners = item.collabPartners || [];

        const visibleCollabPartners = partners.filter((p: any) => {
          if (p.name === item.sender) return false;
          if (p.name === viewerIdentity) return true;
          if (p.hideCollab) return false;
          if (p.sendTo.includes('all')) return true;
          return p.sendTo.includes(viewerIdentity);
        }).map((p: any) => {
          const anonymous = !!p.anonymousCollab || (!isFriend(p.name) && p.anonymousCollab);
          return {
            ...p,
            displayName: p.name === viewerIdentity ? 'You' : (anonymous ? 'Someone' : p.name),
            displayColor: anonymous ? '#444' : p.color,
            displayAvatar: anonymous ? undefined : p.avatar,
            isAnonymous: anonymous,
            isSelf: p.name === viewerIdentity
          };
        });

        const sortedPartners = sortAvatars(visibleCollabPartners, viewerIdentity);
        const hasCollabs = sortedPartners.length > 0;
        const currentViewers = item.sendTo.includes('all') ? MOCK_FRIENDS.slice(0, 5) : MOCK_FRIENDS.filter((f: any) => item.sendTo.includes(f.name));

        const makeContext = (): ContextPhoto => ({ url: item.image, caption: item.caption, collabs: item.collabPartners });

        return (
          <div
            key={item.id}
            ref={idx === 0 ? historyFeedRef : undefined}
            style={{
              width: '100%',
              height: '100%',
              flex: 'none',
              scrollSnapAlign: 'start',
              scrollSnapStop: 'always',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <div style={{ height: 180, flexShrink: 0 }} />

            <div className="vf-wrap" style={{ position: 'relative' }}>
              <div style={{
                width: '100%', aspectRatio: '1/1', overflow: 'hidden', position: 'relative',
                backgroundColor: '#1C1C1E', borderRadius: 40, border: '1px solid rgba(255,255,255,0.1)'
              }}>
                <img src={item.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />

                {item.collabStatus === 'pending' && !isMeAuthor && (
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: 'linear-gradient(to bottom, transparent 20%, rgba(0,0,0,0.85) 100%)',
                    display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
                    padding: 20, zIndex: 12,
                    animation: 'fadeIn 0.3s ease-out'
                  }}>
                    <div style={{
                      background: 'rgba(30, 30, 30, 0.75)', backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)',
                      borderRadius: 32, padding: 20, border: '1px solid rgba(255,255,255,0.12)',
                      boxShadow: '0 20px 50px rgba(0,0,0,0.4)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
                        <div style={{
                          width: 48, height: 48, borderRadius: '50%',
                          backgroundColor: item.collabInviterColor || item.senderColor,
                          backgroundImage: item.collabInviterAvatar ? `url(${item.collabInviterAvatar})` : undefined,
                          backgroundSize: 'cover', flexShrink: 0,
                          border: '2.5px solid #FFC800', padding: 2
                        }}>
                           {!item.collabInviterAvatar && (
                             <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'rgba(0,0,0,0.2)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                               <span style={{ fontSize: 18, fontWeight: 900, color: 'white' }}>{(item.collabInviter || item.sender)[0]}</span>
                             </div>
                           )}
                        </div>
                        <div>
                          <div style={{ color: '#fff', fontSize: 16, fontWeight: 800 }}>
                            Collab Request
                          </div>
                          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: 600, marginTop: 1 }}>
                            {item.collabInviter || item.sender} wants to join this post
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 10 }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); onDeclineCollab?.(item.id); }}
                          style={{
                            flex: 1, height: 50, borderRadius: 25,
                            background: 'rgba(255,255,255,0.08)', border: 'none',
                            color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer',
                          }}
                        >Decline</button>
                        <button
                          onClick={(e) => { e.stopPropagation(); onAcceptCollab?.(item.id); }}
                          style={{
                            flex: 1, height: 50, borderRadius: 25,
                            background: '#FFC800', border: 'none',
                            color: '#000', fontSize: 15, fontWeight: 800, cursor: 'pointer',
                            boxShadow: '0 8px 24px rgba(255,200,0,0.25)',
                          }}
                        >Accept</button>
                      </div>
                    </div>
                  </div>
                )}

                {item.collabStatus === 'accepted' && isMeAuthor && hasCollabs && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setLeaveConfirmId(item.id); }}
                    style={{
                      position: 'absolute', top: 16, right: 16, zIndex: 12,
                      width: 38, height: 38, borderRadius: '50%',
                      background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(12px)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center',
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                )}

                <div style={{ position: 'absolute', bottom: 18, left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 10 }}>
                  {editingCaptionId === item.id ? (
                    <div style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(20px)', borderRadius: 22, padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 8, border: '1px solid rgba(255,255,255,0.2)' }}>
                      <input
                        autoFocus
                        value={pendingCaption}
                        onChange={(e) => setPendingCaption(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            setHistoryItems(prev => prev.map(hi => hi.id === item.id ? { ...hi, caption: pendingCaption, captionEdited: true } : hi));
                            setEditingCaptionId(null);
                          }
                        }}
                        style={{ background: 'none', border: 'none', outline: 'none', color: '#fff', fontSize: 15, fontWeight: 700, padding: '4px 8px', width: 140 }}
                      />
                      <button
                        onClick={() => {
                          setHistoryItems(prev => prev.map(hi => hi.id === item.id ? { ...hi, caption: pendingCaption, captionEdited: true } : hi));
                          setEditingCaptionId(null);
                        }}
                        style={{ background: '#FFD700', color: '#000', border: 'none', borderRadius: 14, padding: '4px 10px', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}
                      >
                        Save
                      </button>
                    </div>
                  ) : (
                    item.caption && item.collabStatus !== 'pending' ? (
                      <div
                        onClick={(e) => {
                          if (!item.captionEdited && isMeAuthor) {
                            e.stopPropagation();
                            setPendingCaption(item.caption || '');
                            setEditingCaptionId(item.id);
                          }
                        }}
                        style={{
                          background: 'rgba(0,0,0,0.42)', backdropFilter: 'blur(14px)', borderRadius: 22, padding: '9px 20px',
                          cursor: (!item.captionEdited && isMeAuthor) ? 'pointer' : 'default',
                          border: item.captionEdited ? 'none' : '1px solid rgba(255,255,255,0.1)',
                          display: 'flex', alignItems: 'center', gap: 7,
                        }}
                      >
                        <span style={{ color: '#fff', fontSize: 16, fontWeight: 700 }}>{item.caption}</span>
                        {item.captionEdited && isMeAuthor && (
                          <svg aria-label="Đã chỉnh sửa" width="13" height="13" viewBox="0 0 24 24" fill="rgba(255,255,255,0.35)">
                            <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                          </svg>
                        )}
                      </div>
                    ) : (
                      isMeAuthor && !item.captionEdited && !item.collabStatus && (
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            setPendingCaption('');
                            setEditingCaptionId(item.id);
                          }}
                          style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(14px)', borderRadius: 20, padding: '6px 16px', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.2)' }}
                        >
                          <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: 700 }}>Edit</span>
                        </div>
                      )
                    )
                  )}
                </div>
              </div>
            </div>

            <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 20 }}>
              {item.collabStatus === 'pending' && isMeAuthor && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: 'rgba(255,200,0,0.08)', padding: '5px 16px 5px 6px', borderRadius: 20,
                  border: '1px solid rgba(255,200,0,0.2)',
                }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%', background: '#FFD700',
                    display: 'flex', justifyContent: 'center', alignItems: 'center',
                    flexShrink: 0, border: '1.5px solid rgba(255,255,255,0.2)',
                  }}>
                    <span style={{ fontSize: 11, fontWeight: 900, color: '#000' }}>Y</span>
                  </div>
                  <span style={{ color: '#fff', fontSize: 16, fontWeight: 800 }}>You</span>
                  <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 16, fontWeight: 600 }}>{item.time}</span>
                  <span style={{ color: '#FFC800', fontSize: 11, fontWeight: 800, background: 'rgba(255,200,0,0.15)', padding: '2px 8px', borderRadius: 8, marginLeft: 4 }}>
                    Pending
                  </span>
                </div>
              )}

              {/* Pill - Consolidated Single Line View */}
              {!(item.collabStatus === 'pending' && isMeAuthor) && (() => {
                const authorDisplay = isMeAuthor ? 'You' : (!!item.anonymousCollab && !isFriend(item.sender) ? 'Someone' : item.sender);
                const allParticipants = [
                  { 
                    id: 'author', 
                    name: item.sender, 
                    displayName: authorDisplay, 
                    avatar: getIdentity(item.sender).avatar, 
                    color: isMeAuthor ? '#FFD700' : item.senderColor 
                  },
                  ...sortedPartners
                ];

                return (
                  <div
                    onClick={(e) => {
                      if (hasCollabs) {
                        e.stopPropagation();
                        setActiveCollabDetailId(activeCollabDetailId === item.id ? null : item.id);
                      }
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, cursor: hasCollabs ? 'pointer' : 'default',
                      background: 'rgba(255,255,255,0.12)', padding: '5px 14px 5px 6px', borderRadius: 24,
                      border: '1px solid rgba(255,255,255,0.15)',
                      zIndex: activeCollabDetailId === item.id ? 15000 : 1,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)'
                    }}
                  >
                    {/* AVATAR STACK */}
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      {allParticipants.slice(0, 3).map((p, pIdx) => (
                        <div
                          key={p.id || p.name}
                          style={{
                            width: 28, height: 28, borderRadius: '50%',
                            background: p.color || (p as any).displayColor,
                            backgroundImage: (p.avatar || (p as any).displayAvatar) ? `url(${p.avatar || (p as any).displayAvatar})` : undefined,
                            backgroundSize: 'cover', border: '1.5px solid rgba(255,255,255,0.3)',
                            marginLeft: pIdx === 0 ? 0 : -8,
                            zIndex: 10 - pIdx,
                            display: 'flex', justifyContent: 'center', alignItems: 'center',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
                          }}
                        >
                          {!(p.avatar || (p as any).displayAvatar) && (
                            <span style={{ fontSize: 11, fontWeight: 900, color: p.name === viewerIdentity ? '#000' : '#fff' }}>
                              {(p.displayName || p.name)[0]}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* NAMES & TIME */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, maxWidth: 200, overflow: 'hidden' }}>
                      <span style={{ 
                        color: '#fff', fontSize: 14, fontWeight: 800, 
                        whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' 
                      }}>
                        {allParticipants.map(p => p.displayName || (p as any).name).join(', ')}
                      </span>
                      <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, fontWeight: 600 }}>•</span>
                      <span style={{ 
                        color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: 700, 
                        whiteSpace: 'nowrap' 
                      }}>
                        {item.time}
                      </span>
                    </div>

                    {hasCollabs && item.collabStatus !== 'accepted' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 2 }}>
                        <div style={{ width: 1, height: 12, background: 'rgba(255,255,255,0.15)', margin: '0 2px' }} />
                        <span style={{ color: '#FFC800', fontSize: 11, fontWeight: 800 }}>+ collab</span>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ height: 25 }} />
              {isMeAuthor ? (
                <div style={{ padding: '0 40px', display: 'flex', justifyContent: 'center' }}>
                  <button onClick={() => setShowViewersModal(true)} style={{
                    display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.1)',
                    borderRadius: 28, padding: '8px 18px', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer'
                  }}>
                    <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, fontWeight: 700 }}>Activity</span>
                    <div style={{ display: 'flex' }}>
                      {currentViewers.slice(0, 5).map((v: any, vi: number) => (
                        <div key={vi} style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: v.color, border: '2px solid #000', marginLeft: vi === 0 ? 0 : -10, zIndex: 10 - vi }} />
                      ))}
                    </div>
                  </button>
                </div>
              ) : (
                <div style={{ padding: '0 12px' }}>
                  <div
                    style={{
                      height: 54, background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(25px)',
                      WebkitBackdropFilter: 'blur(25px)',
                      borderRadius: 27, display: 'flex', alignItems: 'center', padding: '0 6px 0 16px', gap: 8,
                      boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                      border: '1px solid rgba(255,255,255,0.12)',
                    }}
                  >
                    <input
                      ref={el => { inputRefs.current[item.id] = el; }}
                      placeholder="Send message..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const val = (e.target as HTMLInputElement).value.trim();
                          if (!val) return;
                          const ctx = makeContext();
                          handleSendTextMessage(item.sender, val, ctx);
                          (e.target as HTMLInputElement).value = '';
                          spawnBubble('💬', e.currentTarget);
                        }
                      }}
                      style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'white', fontSize: 15, fontWeight: 600 }}
                    />

                    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      {/* Heart */}
                      <button
                        onClick={(e) => {
                          const ctx = makeContext();
                          handleSendHeart(item.sender, ctx);
                          spawnBubble('❤️', e.currentTarget);
                        }}
                        style={{
                          background: 'none', border: 'none', padding: 8, cursor: 'pointer',
                          transition: 'transform 0.15s',
                        }}
                        onPointerDown={e => (e.currentTarget.style.transform = 'scale(0.82)')}
                        onPointerUp={e => (e.currentTarget.style.transform = 'scale(1)')}
                      >
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="2.5">
                          <path d="M12 21c4-4 8-7.5 8-12 0-3-2-5-4-5-1.5 0-2.5.5-4 2.5C10.5 5.5 9.5 5 8 5 6 5 4 7 4 10c0 4.5 4 8 8 12z" />
                        </svg>
                      </button>

                      {/* Sticker / Emoji */}
                      <div style={{ position: 'relative' }}>
                        <button
                          onClick={() => setHistoryStickerPickerId(historyStickerPickerId === item.id ? null : item.id)}
                          style={{
                            background: 'none', border: 'none', padding: 8, cursor: 'pointer',
                            transition: 'transform 0.15s',
                          }}
                          onPointerDown={e => (e.currentTarget.style.transform = 'scale(0.82)')}
                          onPointerUp={e => (e.currentTarget.style.transform = 'scale(1)')}
                        >
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="2.5">
                            <circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><line x1="9" y1="9" x2="9.01" y2="9" /><line x1="15" y1="9" x2="15.01" y2="9" />
                          </svg>
                        </button>
                        {historyStickerPickerId === item.id && (
                          <div style={{
                            position: 'absolute', bottom: 64, right: 0, width: 228, zIndex: 110,
                            background: 'rgba(15, 15, 15, 0.85)', backdropFilter: 'blur(30px)',
                            WebkitBackdropFilter: 'blur(30px)',
                            padding: '16px 14px', borderRadius: 28, border: '1px solid rgba(255,255,255,0.15)',
                            boxShadow: '0 24px 70px rgba(0,0,0,0.6)',
                            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10,
                            animation: 'popIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                          }}>
                            {['🔥', '👍', '🙏', '😂', '😮', '💀', '💩', '✨'].map(em => (
                              <button
                                key={em}
                                onClick={(e) => {
                                  const ctx = makeContext();
                                  handleSendTextMessage(item.sender, em, ctx);
                                  setHistoryStickerPickerId(null);
                                  spawnBubble(em, e.currentTarget);
                                }}
                                style={{
                                  background: 'none', border: 'none', fontSize: 28, cursor: 'pointer',
                                  borderRadius: 14, padding: 6,
                                  transition: 'transform 0.15s, background 0.15s',
                                  display: 'flex', justifyContent: 'center', alignItems: 'center'
                                }}
                                onPointerDown={e => {
                                  e.currentTarget.style.background = 'rgba(255,255,255,0.12)';
                                  e.currentTarget.style.transform = 'scale(0.82)';
                                }}
                                onPointerUp={e => {
                                  e.currentTarget.style.background = 'none';
                                  e.currentTarget.style.transform = 'scale(1)';
                                }}
                              >
                                {em}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Voice */}
                      <button
                        onClick={(e) => {
                          const ctx = makeContext();
                          handleSendVoice(item.sender, '0:03', ctx);
                          spawnBubble('🎤', e.currentTarget);
                        }}
                        style={{
                          background: 'none', border: 'none', padding: 8, cursor: 'pointer',
                          transition: 'transform 0.15s',
                        }}
                        onPointerDown={e => (e.currentTarget.style.transform = 'scale(0.82)')}
                        onPointerUp={e => (e.currentTarget.style.transform = 'scale(1)')}
                      >
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="2.5">
                          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="22" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              )}
              <div style={{ height: 40 }} />
            </div>
          </div>
        );
      })}
    </>
  );
};

export default HistoryFeed;
