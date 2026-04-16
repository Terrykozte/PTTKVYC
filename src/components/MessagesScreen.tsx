import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import ChatDetailScreen, { type Message, type ContextPhoto } from './ChatDetailScreen';
import { MOCK_FRIENDS } from '../mockData';

export interface MessagesScreenHandle {
  goBackToList: () => void;
}

const rubberBand = (dist: number, dim: number, c = 0.55) => {
  const s = dist < 0 ? -1 : 1;
  const a = Math.abs(dist);
  return s * (a * dim * c) / (dim + c * a);
};

const MessagesScreen = forwardRef<
  MessagesScreenHandle,
  {
    onToggleDetail: (isOpen: boolean) => void;
    onDetailProgress: (progress: number) => void; // 0 = ChatList, 1 = ChatDetail
    onChatSelect: (name: string, color: string) => void;
    forceShowDetail?: boolean;
    forceChatName?: string;
    forceChatColor?: string;
    forceChatOptions?: boolean;
    forceSearchMode?: boolean;
    allChats: Record<string, Message[]>;
    onUpdateChat: (name: string, updater: Message[] | ((prev: Message[]) => Message[])) => void;
    unreadChats: Set<string>;
    onMarkAsRead: (name: string) => void;
    handleSendTextMessage?: (name: string, text: string, context?: ContextPhoto) => void;
    handleSendHeart?: (name: string, context?: ContextPhoto) => void;
    handleSendSticker?: (name: string, emoji: string, context?: ContextPhoto) => void;
    handleSendVoice?: (name: string, duration: string, context?: ContextPhoto) => void;
    onDeepLinkConsumed?: () => void;
    forceReplyEmoji?: string;
    forceContextPhoto?: ContextPhoto;
  }
>(({ onToggleDetail, onDetailProgress, forceShowDetail, forceChatName, forceChatColor, forceChatOptions, forceSearchMode, forceReplyEmoji, forceContextPhoto, allChats, onUpdateChat, unreadChats, onMarkAsRead, onDeepLinkConsumed, handleSendTextMessage, handleSendHeart, handleSendSticker, handleSendVoice }, ref) => {

  const [selectedChat, setSelectedChat] = useState<{ name: string; color: string } | null>(() => {
    if (forceChatName) return { name: forceChatName, color: forceChatColor || '#FF8C00' };
    const urlParams = new URLSearchParams(window.location.search);
    const chatName = urlParams.get('chat');
    if (chatName) {
      const friend = MOCK_FRIENDS.find(f => f.name === chatName);
      return { name: chatName, color: friend?.color || '#FF8C00' };
    }
    return null;
  });
  const [isDetailMounted, setIsDetailMounted] = useState(() => {
    if (forceShowDetail) return true;
    const urlParams = new URLSearchParams(window.location.search);
    return !!urlParams.get('chat');
  });

  // ── URL PARAMETER SYNC ──
  useEffect(() => {
    // Prevent URL jitter in Showcase mode
    const isShowcase = new URLSearchParams(window.location.search).get('showcase') === 'true';
    if (isShowcase || forceChatName) return;

    const url = new URL(window.location.href);
    const chatInUrl = url.searchParams.get('chat');
    if (selectedChat) {
      if (chatInUrl !== selectedChat.name) {
        url.searchParams.set('chat', selectedChat.name);
        window.history.replaceState({}, '', url.pathname + url.search);
      }
    } else if (chatInUrl) {
      url.searchParams.delete('chat');
      window.history.replaceState({}, '', url.pathname + url.search);
    }
  }, [selectedChat]);

  const detailOverlayRef = useRef<HTMLDivElement>(null);
  const listPanelRef    = useRef<HTMLDivElement>(null);

  const gesture = useRef({
    active: false,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastTime: 0,
    vel: 0,
    containerW: 0,
    locked: false,
    isOpen: !!selectedChat || forceShowDetail || false,
  });

  const applyProgress = (prog: number) => {
    const w = gesture.current.containerW || window.innerWidth;
    const clamped = Math.max(0, Math.min(1, prog));

    if (detailOverlayRef.current) {
      detailOverlayRef.current.style.transform = `translateX(${(1 - prog) * 100}%)`;
    }
    if (listPanelRef.current) {
      listPanelRef.current.style.transform = `translateX(${-clamped * w * 0.28}px)`;
    }
    onDetailProgress(prog);
  };

  const openDetail = (instantly = false) => {
    gesture.current.isOpen = true;
    onToggleDetail(true);

    if (instantly) {
      applyProgress(1);
      if (detailOverlayRef.current) detailOverlayRef.current.style.transition = 'none';
      if (listPanelRef.current) listPanelRef.current.style.transition = 'none';
      return;
    }

    if (detailOverlayRef.current) detailOverlayRef.current.style.transition = 'transform 0.38s cubic-bezier(0.32, 1, 0.67, 1)';
    if (listPanelRef.current) listPanelRef.current.style.transition = 'transform 0.38s cubic-bezier(0.32, 1, 0.67, 1)';
    requestAnimationFrame(() => applyProgress(1));
  };

  const closeDetail = (vel = 0) => {
    gesture.current.isOpen = false;

    const duration = vel > 0.5 ? Math.max(180, 320 - vel * 80) : 340;

    if (detailOverlayRef.current) {
      detailOverlayRef.current.style.transition = `transform ${duration}ms cubic-bezier(0.32, 1, 0.67, 1)`;
    }
    if (listPanelRef.current) {
      listPanelRef.current.style.transition = `transform ${duration}ms cubic-bezier(0.32, 1, 0.67, 1)`;
    }

    applyProgress(0);

    setTimeout(() => {
      setIsDetailMounted(false);
      onToggleDetail(false);
      onDetailProgress(0);
      if (listPanelRef.current) {
        listPanelRef.current.style.transform = '';
        listPanelRef.current.style.transition = '';
      }
    }, duration + 20);
  };

  useEffect(() => {
    if (forceChatName) {
      setSelectedChat({ name: forceChatName, color: forceChatColor || '#FF8C00' });
      setIsDetailMounted(true);
      setTimeout(() => onDeepLinkConsumed?.(), 400);
    }
  }, [forceChatName, forceChatColor]);

  useEffect(() => {
    if (selectedChat) {
      openDetail(true);
      if (onMarkAsRead) {
        onMarkAsRead(selectedChat.name);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (forceShowDetail && selectedChat) {
      openDetail(true);
    }
  }, [forceShowDetail, selectedChat]);

  const handleChatClick = (name: string, color: string) => {
    setSelectedChat({ name, color });
    setIsDetailMounted(true);
    // instant UI update
    onMarkAsRead?.(name);

    if (detailOverlayRef.current) {
      detailOverlayRef.current.style.transition = 'none';
      detailOverlayRef.current.style.transform = 'translateX(100%)';
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(() => openDetail());
    });
  };

  const handleBackToList = () => closeDetail();

  useImperativeHandle(ref, () => ({ goBackToList: handleBackToList }));

  const onPointerDown = (e: React.PointerEvent) => {
    if (!gesture.current.isOpen) return;
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    Object.assign(gesture.current, {
      active:     true,
      startX:     e.clientX,
      startY:     e.clientY,
      lastX:      e.clientX,
      lastTime:   Date.now(),
      vel:        0,
      locked:     false,
      containerW: detailOverlayRef.current?.offsetWidth ?? window.innerWidth,
    });
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!gesture.current.active) return;
    const dx = e.clientX - gesture.current.startX;
    const dy = Math.abs(e.clientY - gesture.current.startY);

    if (!gesture.current.locked) {
      if (Math.abs(dx) < 6 && dy < 6) return;

      if (dy > Math.abs(dx)) {
        gesture.current.active = false;
        return;
      }

      gesture.current.locked = true;
      if (detailOverlayRef.current) detailOverlayRef.current.style.transition = 'none';
      if (listPanelRef.current)     listPanelRef.current.style.transition     = 'none';
    }

    const w      = gesture.current.containerW;
    const now    = Date.now();
    const dtMs   = Math.max(1, now - gesture.current.lastTime);
    gesture.current.vel    = (gesture.current.lastX - e.clientX) / dtMs;
    gesture.current.lastX  = e.clientX;
    gesture.current.lastTime = now;

    let rawProg = 1 - dx / w;
    if (rawProg > 1) {
      rawProg = 1 + rubberBand(rawProg - 1, 0.8) * 0.25;
    }
    rawProg = Math.max(0, rawProg);

    e.stopPropagation();

    applyProgress(rawProg);
  };

  const onPointerUp = () => {
    if (!gesture.current.active) return;
    
    if (!gesture.current.locked) {
      gesture.current.active = false;
      return;
    }
    gesture.current.active = false;

    const w          = gesture.current.containerW;
    const totalDx    = gesture.current.lastX - gesture.current.startX;
    const vel        = -gesture.current.vel; // positive = swipe right (close)
    const currentProg = Math.max(0, Math.min(1, 1 - totalDx / w));

    const shouldClose = currentProg < 0.7 || vel > 0.25;

    if (shouldClose) {
      closeDetail(Math.abs(vel));
    } else {
      if (detailOverlayRef.current) {
        detailOverlayRef.current.style.transition = 'transform 0.32s cubic-bezier(0.32, 1, 0.67, 1)';
      }
      if (listPanelRef.current) {
        listPanelRef.current.style.transition = 'transform 0.32s cubic-bezier(0.32, 1, 0.67, 1)';
      }
      applyProgress(1);
    }
  };

  const sortedMessages = useMemo(() => {
    return MOCK_FRIENDS.map(friend => {
      const messages = allChats[friend.name] || [];
      const lastMsg = messages[messages.length - 1];
      const isUnread = unreadChats.has(friend.name);
      return {
        ...friend,
        preview: lastMsg ? (lastMsg.type === 'voice' ? 'Voice Message' : lastMsg.content) : "No messages yet",
        time: lastMsg?.timestamp || "",
        lastTimestampNum: lastMsg ? (lastMsg.timestampNum || 0) : 0,
        isUnread
      };
    }).sort((a, b) => {
      // 1. Unread first
      if (a.isUnread && !b.isUnread) return -1;
      if (!a.isUnread && b.isUnread) return 1;
      // 2. Newest first (by timestampNum)
      return b.lastTimestampNum - a.lastTimestampNum;
    });
  }, [allChats, unreadChats]);

  const MessageCard = ({ name, time, preview, color, isUnread = false, onClick }: {
    name: string; time: string; preview: string; color: string; isUnread?: boolean; onClick: () => void;
  }) => (
    <div
      onClick={onClick}
      data-name={`Chat / Item / ${name}`}
      id={`GOTO:CHAT_DETAIL_${name.toUpperCase().replace(/\s+/g, '_')}`}
      style={{
        display: 'flex', gap: 16, padding: '16px 20px',
        width: '100%', boxSizing: 'border-box',
        alignItems: 'center', cursor: 'pointer',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        transition: 'all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)', 
        WebkitTapHighlightColor: 'transparent',
      }}
      onPointerDown={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
      onPointerUp={e => (e.currentTarget.style.background = 'transparent')}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      <div 
        data-name="Avatar / Container"
        style={{
          width: 60, height: 60, borderRadius: '50%', flexShrink: 0,
          border: isUnread ? '2.5px solid #FFC800' : '2.5px solid #2A2A2A',
          padding: 2,
        }}
      >
        <div style={{
          width: '100%', height: '100%', borderRadius: '50%', backgroundColor: color,
          display: 'flex', justifyContent: 'center', alignItems: 'center',
        }}>
          <svg width="34" height="34" viewBox="0 0 24 24" fill="rgba(255,255,255,0.4)">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
          </svg>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, paddingRight: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span data-name="Name" style={{ fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: -0.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</span>
          <span data-name="Time" style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.3)', marginTop: 1, flexShrink: 0 }}>{time}</span>
        </div>
        <div 
          data-name="Message Preview"
          style={{
            fontSize: 15, 
            fontWeight: isUnread ? 800 : 500,
            color: isUnread ? '#fff' : 'rgba(255,255,255,0.4)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            letterSpacing: -0.1,
          }}
        >
          {isUnread ? (preview === "No messages yet" ? "Replied to your Locket!" : preview) : preview}
        </div>
      </div>

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', opacity: 0.3 }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </div>

    </div>
  );

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      <style>{`.msg-list-scroll::-webkit-scrollbar { display: none; }`}</style>
      <div
        ref={listPanelRef}
        style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          background: 'transparent',
          backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
          willChange: 'transform',
        }}
      >
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 110,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 50%, transparent 100%)',
          pointerEvents: 'none', zIndex: 2,
        }} />

        <div className="msg-list-scroll settings-scroll" style={{ flex: 1, overflowY: 'auto', width: '100%' }}>
          <div style={{ display: 'flex', flexDirection: 'column', padding: '82px 0 80px', width: '100%', boxSizing: 'border-box' }}>
            {sortedMessages.map((item) => (
              <MessageCard key={item.name} {...item} onClick={() => handleChatClick(item.name, item.color)} />
            ))}
          </div>
        </div>
      </div>

      {isDetailMounted && selectedChat && (
        <div
          ref={detailOverlayRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          style={{
            position: 'absolute', inset: 0, zIndex: 200,
            transform: 'translateX(100%)',
            willChange: 'transform',
            background: 'transparent',
            touchAction: 'none',
          }}
        >
          <ChatDetailScreen
            name={selectedChat.name}
            color={selectedChat.color}
            onBack={handleBackToList}
            chatMessages={allChats[selectedChat.name] || []}
            setChatMessages={(updater) => onUpdateChat(selectedChat.name, updater)}
            onMarkAsRead={onMarkAsRead}
            forceShowOptions={forceChatOptions}
            forceSearchMode={forceSearchMode}
            handleSendTextMessage={handleSendTextMessage}
            handleSendHeart={handleSendHeart}
            handleSendSticker={handleSendSticker}
            handleSendVoice={handleSendVoice}
            initialReplyEmoji={forceReplyEmoji}
            initialContextPhoto={forceContextPhoto}
          />
        </div>
      )}
    </div>
  );
});

export default MessagesScreen;
