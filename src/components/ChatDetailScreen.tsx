import { useEffect, useRef, useState } from 'react';

export interface ContextPhoto {
  url: string;
  caption?: string | null;
  collabs?: any[];
}

export interface Message {
  id: string;
  type: 'text' | 'image' | 'voice' | 'reaction' | 'sticker';
  content: string;
  sender: 'me' | 'other';
  timestamp?: string;
  timestampNum?: number; // For precise sorting
  dateHeader?: string;
  reactions?: string[];
  status?: 'read' | 'sent';
  replyTo?: { senderName: string; content: string; isImage?: boolean };
  voiceDuration?: string;
  contextPhoto?: ContextPhoto;
  replyToReact?: { icon: string; imageUrl: string };
  isEdited?: boolean;
  originalContent?: string;
}

function deriveWarmBg(hex: string): string {
  if (!hex.startsWith('#')) hex = '#888888';
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const br = Math.round(0.94 * 13 + 0.06 * r);
  const bg = Math.round(0.94 * 13 + 0.06 * g);
  const bb = Math.round(0.94 * 15 + 0.06 * b);
  return `rgba(${br},${bg},${bb}, 0.82)`;
}

export default function ChatDetailScreen(props: {
  name: string;
  color: string;
  onBack?: () => void;
  hideHeader?: boolean;
  forceShowOptions?: boolean;
  forceSearchMode?: boolean;
  chatMessages: Message[];
  setChatMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  onMarkAsRead?: (name: string) => void;
  initialReplyEmoji?: string;
  initialContextPhoto?: ContextPhoto;
  handleSendTextMessage?: (name: string, text: string, context?: ContextPhoto) => void;
  handleSendHeart?: (name: string, context?: ContextPhoto) => void;
  handleSendSticker?: (name: string, emoji: string, context?: ContextPhoto) => void;
  handleSendVoice?: (name: string, duration: string, context?: ContextPhoto) => void;
}) {
  const {
    name,
    color,
    onBack,
    hideHeader = false,
    forceShowOptions = false,
    forceSearchMode = false,
    chatMessages,
    setChatMessages,
    onMarkAsRead,
    initialReplyEmoji,
    initialContextPhoto,
    handleSendTextMessage,
    handleSendHeart,
    handleSendSticker,
    handleSendVoice
  } = props;

  const [inputText, setInputText] = useState('');
  const [showMenu, setShowMenu] = useState(forceShowOptions || false);
  const [showSearch, setShowSearch] = useState(forceSearchMode || false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [searchIndex, setSearchIndex] = useState(0);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [voiceProgress, setVoiceProgress] = useState(0); // 0-100
  const [voiceSpeed, setVoiceSpeed] = useState(1); // 1, 1.5, 2
  
  // -- Edit Message States --
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [contextMenuMsg, setContextMenuMsg] = useState<Message | null>(null);
  const [showEditHistoryId, setShowEditHistoryId] = useState<string | null>(null);
  const [longPressActiveId, setLongPressActiveId] = useState<string | null>(null);
  const [msgMenuPos, setMsgMenuPos] = useState({ x: 0, y: 0 });
  const mainContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialReplyEmoji && initialContextPhoto) {
      setReplyingTo({
        id: 'replying-to-context',
        type: 'image',
        content: '',
        sender: 'other',
        contextPhoto: initialContextPhoto
      });
      setInputText(initialReplyEmoji);
    }
  }, [initialReplyEmoji, initialContextPhoto]);

  useEffect(() => {
    if (onMarkAsRead) {
      onMarkAsRead(name);
    }
  }, [name, onMarkAsRead]);

  const [swipingId, setSwipingId] = useState<string | null>(null);
  const swipeDelta = useRef(0);
  const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const startX = useRef(0);
  const isDragging = useRef(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const warmBg = deriveWarmBg(color.startsWith('#') ? color : '#888888');

  const [isRecording, setIsRecording] = useState(false);
  const [isPausedRecording, setIsPausedRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordingBars, setRecordingBars] = useState<number[]>([]);
  const [showEmojiSheet, setShowEmojiSheet] = useState(false);
  const [activeSheetTab, setActiveSheetTab] = useState<'emoji' | 'stickers'>('emoji');
  const [sheetDragY, setSheetDragY] = useState(0);
  const [isDraggingSheet, setIsDraggingSheet] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef(0);

  const [quickEmoji, setQuickEmoji] = useState('❤️');
  const [isSetQuickEmojiMode, setIsSetQuickEmojiMode] = useState(false);
  const longPressTimer = useRef<any>(null);
  const longPressTriggered = useRef(false);

  useEffect(() => {
    let timerInterval: any;
    let waveInterval: any;

    if (isRecording && !isPausedRecording) {
      // Timer (seconds)
      timerInterval = setInterval(() => setRecordingTime(t => t + 1), 1000);

      // Waveform (perfectly synced at 70ms)
      waveInterval = setInterval(() => {
        setRecordingBars(prev => {
          const newVal = Math.random() > 0.3 ? (Math.random() * 20 + 4) : (Math.random() * 6 + 2);
          const MAX_BARS = 32;
          return [...prev, newVal].slice(-MAX_BARS);
        });
      }, 70);
    }

    return () => {
      clearInterval(timerInterval);
      clearInterval(waveInterval);
    };
  }, [isRecording, isPausedRecording]);

  useEffect(() => {
    let interval: any;
    if (playingVoiceId) {
      interval = setInterval(() => {
        setVoiceProgress(prev => {
          if (prev >= 100) {
            setPlayingVoiceId(null);
            return 0;
          }
          return prev + (1.5 * voiceSpeed);
        });
      }, 100);
    } else {
      setVoiceProgress(0);
    }
    return () => clearInterval(interval);
  }, [playingVoiceId, voiceSpeed]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  interface Cluster {
    sender: 'me' | 'other';
    contextPhoto?: ContextPhoto;
    messages: Message[];
  }

  const clusters: Cluster[] = [];

  const filteredMessages = chatMessages.filter(m => m.type !== 'reaction');

  filteredMessages.forEach((msg, i) => {
    const prevMsg = i > 0 ? filteredMessages[i - 1] : null;
    const sameSender = prevMsg && prevMsg.sender === msg.sender;
    const sameContext = prevMsg && prevMsg.contextPhoto?.url === msg.contextPhoto?.url;
    const hasDateHeader = !!msg.dateHeader;

    if (sameSender && sameContext && !hasDateHeader) {
      clusters[clusters.length - 1].messages.push(msg);
    } else {
      clusters.push({
        sender: msg.sender,
        contextPhoto: msg.contextPhoto,
        messages: [msg]
      });
    }
  });

  const ContextPhotoBubble = ({ photo, isMe }: { photo: ContextPhoto, isMe: boolean }) => {
    // Build avatar info for bottom-left overlay
    // Logic: The "Owner" of the post should be the primary avatar.
    // If it's a collab, Me + Partners sorted.
    const hasCollabs = photo.collabs && photo.collabs.length > 0;

    // Prioritize the feed owner. 
    // In chat detail, if isMe is true, 'me' replied to 'them'. 'name' is 'them'.
    // If isMe is false, 'them' replied to 'me'. 'name' is still 'them'.
    const ownerName = isMe ? name : 'Me'; // Simple heuristic: the other person's name or 'Me'
    const ownerIdentity = ownerName === 'Me' ? { name: 'You', color: '#FFD700', avatar: '' } : { name, color, avatar: '' };

    return (
      <div style={{
        width: '80%',
        aspectRatio: '1 / 1',
        borderRadius: 28,
        overflow: 'hidden',
        marginBottom: 12,
        boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
        opacity: 0.98,
        border: '1.5px solid rgba(255,255,255,0.18)',
        marginLeft: !isMe ? 40 : 'auto',
        position: 'relative'
      }}>
        <img src={photo.url} alt="Context" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />

        {/* Top-left: Chat context avatars (Module 5 Polish) */}
        <div style={{
          position: 'absolute', top: 12, left: 12,
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
          borderRadius: 16, padding: '4px 10px 4px 4px',
          border: '1px solid rgba(255,255,255,0.08)'
        }}>
          {/* Stacked avatars for collabs */}
          {hasCollabs ? (
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {/* Primary avatar (the person whose feed it is) */}
              <div style={{
                width: 24, height: 24, borderRadius: '50%',
                background: ownerIdentity.color,
                border: '2px solid rgba(0,0,0,0.4)',
                display: 'flex', justifyContent: 'center', alignItems: 'center',
                zIndex: 10, flexShrink: 0,
              }}>
                <span style={{ fontSize: 10, fontWeight: 900, color: '#fff' }}>
                  {ownerIdentity.name.charAt(0)}
                </span>
              </div>
              {photo.collabs!.slice(0, 2).map((c: any, ci: number) => (
                <div key={ci} style={{
                  width: 24, height: 24, borderRadius: '50%',
                  backgroundColor: c.color || '#888',
                  border: '2px solid rgba(0,0,0,0.4)',
                  marginLeft: -8, zIndex: 9 - ci, flexShrink: 0,
                  display: 'flex', justifyContent: 'center', alignItems: 'center',
                }}>
                  <span style={{ fontSize: 10, fontWeight: 900, color: '#fff' }}>{(c.name || '?').charAt(0)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{
              width: 24, height: 24, borderRadius: '50%',
              background: ownerIdentity.color,
              border: '2px solid rgba(0,0,0,0.4)',
              display: 'flex', justifyContent: 'center', alignItems: 'center',
              flexShrink: 0,
            }}>
              <span style={{ fontSize: 10, fontWeight: 900, color: '#fff' }}>
                {ownerIdentity.name.charAt(0)}
              </span>
            </div>
          )}
          <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: 800 }}>
            {ownerIdentity.name}
          </span>
        </div>

        {photo.caption && (
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            background: 'linear-gradient(transparent, rgba(0,0,0,0.85))',
            padding: '24px 12px 12px',
            color: '#fff', fontSize: 13, fontWeight: 700,
            textAlign: 'center',
            letterSpacing: -0.2
          }}>
            {photo.caption}
          </div>
        )}
      </div>
    );
  };

  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  useEffect(() => {
    if (!showSearch) scrollToBottom();
  }, [chatMessages, showSearch]);

  const handleSendMessage = () => {
    if (!inputText.trim()) return;

    if (editingMsgId) {
      // -- SAVE EDIT --
      const newMessages = chatMessages.map(m => {
        if (m.id === editingMsgId) {
          return {
            ...m,
            content: inputText,
            isEdited: true,
            originalContent: m.originalContent || m.content // preserve original if edited multiple times
          };
        }
        return m;
      });
      setChatMessages(newMessages);
      setEditingMsgId(null);
      setInputText('');
      return;
    }

    if (handleSendTextMessage) {
      const replyCtx = (replyingTo?.type === 'image' || replyingTo?.contextPhoto?.url)
        ? { url: replyingTo.contextPhoto?.url || '', caption: replyingTo.content }
        : undefined;
      handleSendTextMessage(name, inputText, replyCtx);
    } else {
      const newMessage: Message = {
        id: Date.now().toString(),
        type: 'text',
        content: inputText,
        sender: 'me',
        status: 'sent',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestampNum: Date.now(),
        replyTo: replyingTo ? { senderName: replyingTo.sender === 'me' ? 'You' : name, content: replyingTo.content, isImage: replyingTo.type === 'image' } : undefined
      };
      setChatMessages(prev => [...prev, newMessage]);
    }
    setInputText('');
    setReplyingTo(null);
  };

  const handleSelectEmoji = (emoji: string) => {
    if (isSetQuickEmojiMode) {
      setQuickEmoji(emoji);
      setIsSetQuickEmojiMode(false);
      setShowEmojiSheet(false);
    } else {
      if (handleSendTextMessage) {
        const replyCtxEmoji = (replyingTo?.type === 'image' || replyingTo?.contextPhoto?.url)
          ? { url: replyingTo.contextPhoto?.url || '', caption: replyingTo.content }
          : undefined;
        handleSendTextMessage(name, emoji, replyCtxEmoji);
      } else if (emoji === '❤️' && handleSendHeart) {
        handleSendHeart(name);
      } else {
        const newMessage: Message = {
          id: Date.now().toString(),
          type: 'text',
          content: emoji,
          sender: 'me',
          status: 'sent',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          timestampNum: Date.now(),
          replyTo: replyingTo ? { senderName: replyingTo.sender === 'me' ? 'You' : name, content: replyingTo.content, isImage: replyingTo.type === 'image' } : undefined
        };
        setChatMessages(prev => [...prev, newMessage]);
      }
      setShowEmojiSheet(false);
      setReplyingTo(null);
    }
  };

  const handleSelectSticker = (stickerUrl: string) => {
    if (handleSendSticker) {
      handleSendSticker(name, stickerUrl);
    } else {
      const newMessage: Message = {
        id: Date.now().toString(),
        type: 'sticker',
        content: stickerUrl,
        sender: 'me',
        status: 'sent',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestampNum: Date.now()
      };
      setChatMessages(prev => [...prev, newMessage]);
    }
    setShowEmojiSheet(false);
  };

  const handleCancelRecording = () => {
    setIsRecording(false);
    setIsPausedRecording(false);
    setRecordingTime(0);
    setRecordingBars([]);
  };

  const handleTogglePauseRecording = () => {
    setIsPausedRecording(!isPausedRecording);
  };

  const handleStopAndSendVoice = () => {
    if (!isRecording) return;
    const durationArr = recordingBars.map(h => Math.round(h));
    const durationStr = `0:${recordingTime < 10 ? '0' + recordingTime : recordingTime}`;

    if (handleSendVoice) {
      handleSendVoice(name, durationStr);
    } else {
      const newMessage: Message = {
        id: Date.now().toString(),
        type: 'voice',
        content: durationStr,
        sender: 'me',
        status: 'sent',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestampNum: Date.now()
      };
      setChatMessages(prev => [...prev, newMessage]);
    }
    setIsRecording(false);
    setIsPausedRecording(false);
    setRecordingTime(0);
    setRecordingBars([]);
  };

  const toggleRecording = () => {
    if (!isRecording) {
      setIsRecording(true);
      setIsPausedRecording(false);
      setRecordingTime(0);
      setRecordingBars([]);
    }
  };

  useEffect(() => {
    let interval: any;
    if (isRecording) {
      setRecordingTime(0);
      interval = setInterval(() => setRecordingTime(t => t + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  useEffect(() => {
    if (!showSearch || !searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const q = searchQuery.toLowerCase();
    const results = chatMessages.filter(m => m.type === 'text' && m.content.toLowerCase().includes(q)).map(m => m.id);
    setSearchResults(results);
    setSearchIndex(0);

    if (results.length > 0) {
      setTimeout(() => {
        safeScrollToMatch(results[0]);
      }, 50);
    }
  }, [showSearch, searchQuery, chatMessages]);

  const safeScrollToMatch = (msgId: string) => {
    const el = messageRefs.current[msgId];
    if (el && scrollRef.current) {
      const container = scrollRef.current;
      const elTop = el.offsetTop;
      
      // Use a smaller offset (around the header height) to keep the message visible
      // without creating a huge void at the top, especially on smaller screens.
      const offset = showSearch ? 100 : 130;
      container.scrollTo({
        top: elTop - offset, 
        behavior: 'smooth'
      });
    }
  };

  const handleNextSearch = () => {
    if (searchResults.length === 0) return;
    const nextIdx = (searchIndex + 1) % searchResults.length;
    setSearchIndex(nextIdx);
    safeScrollToMatch(searchResults[nextIdx]);
  };

  const handlePrevSearch = () => {
    if (searchResults.length === 0) return;
    const prevIdx = (searchIndex - 1 + searchResults.length) % searchResults.length;
    setSearchIndex(prevIdx);
    safeScrollToMatch(searchResults[prevIdx]);
  };

  const renderBubbleContent = (msg: Message, isMe: boolean) => {
    const isMatchActive = showSearch && searchQuery.trim() && searchResults[searchIndex] === msg.id;

    if (msg.type === 'voice') {
      const bars = [4, 8, 12, 16, 10, 6, 8, 4, 14, 8, 5, 12, 6, 4, 10, 8, 12, 6, 4, 10, 6, 8, 12, 4, 10, 6, 14, 8, 5, 10];
      const isPlaying = playingVoiceId === msg.id;
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: 230, padding: '4px 2px' }}>
          <button
            onClick={() => setPlayingVoiceId(isPlaying ? null : msg.id)}
            style={{
              width: 38, height: 38, borderRadius: '50%',
              background: isMe ? '#fff' : color,
              border: 'none', display: 'flex', justifyContent: 'center', alignItems: 'center',
              flexShrink: 0, cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
              transition: 'all 0.2s cubic-bezier(0.19, 1, 0.22, 1)'
            }}
            onPointerDown={e => e.currentTarget.style.transform = 'scale(0.9)'}
            onPointerUp={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            {isPlaying ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill={isMe ? color : 'white'}><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill={isMe ? color : 'white'} style={{ marginLeft: 2 }}><path d="M8 5v14l11-7z" /></svg>
            )}
          </button>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {/* Waveform Visualization */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 2, height: 26, position: 'relative' }}>
              {bars.map((h, i) => {
                const barProgress = (i / bars.length) * 100;
                const isActive = isPlaying && voiceProgress > barProgress;
                return (
                  <div key={i} style={{
                    width: 3, height: h, borderRadius: 1.5,
                    background: isActive ? '#fff' : 'rgba(255,255,255,0.3)',
                    transition: 'background 0.1s ease',
                    opacity: isActive ? 1 : 0.6
                  }} />
                );
              })}
              {/* Progress Line */}
              {isPlaying && (
                <div style={{
                  position: 'absolute', left: `${voiceProgress}%`, top: 0, bottom: 0,
                  width: 2, background: '#fff', borderRadius: 1,
                  boxShadow: '0 0 8px #fff',
                  transition: 'left 0.1s linear'
                }} />
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
              <div style={{ minWidth: 45 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.7)', fontFamily: 'SF Pro Text, monospace' }}>
                  {isPlaying ? `0:${Math.floor((voiceProgress / 100) * parseInt(msg.content.split(':')[1] || "0")).toString().padStart(2, '0')}` : (msg.content === "Voice Message" ? "0:10" : msg.content)}
                </span>
              </div>
              <div style={{ width: 42, display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const nextSpeed = voiceSpeed === 1 ? 1.5 : (voiceSpeed === 1.5 ? 2 : 1);
                    setVoiceSpeed(nextSpeed);
                  }}
                  style={{
                    background: voiceSpeed > 1 ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.15)',
                    border: 'none', borderRadius: 10,
                    width: 42, height: 20, fontSize: 10, fontWeight: 900,
                    color: voiceSpeed > 1 ? color : 'rgba(255,255,255,1)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: voiceSpeed > 1 ? '0 4px 10px rgba(0,0,0,0.15)' : 'none'
                  }}
                >
                  {voiceSpeed}x
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (msg.type === 'reaction') {
      return (
        <div style={{
          fontSize: 60,
          lineHeight: 1,
          padding: '4px 0',
          filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.15))',
          animation: 'popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
        }}>
          {msg.content}
        </div>
      );
    }

    if (msg.type === 'sticker') {
      return (
        <div style={{
          width: 140, height: 140,
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          animation: 'popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
        }}>
          <img
            src={msg.content}
            alt="Sticker"
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
            onLoad={(e) => (e.currentTarget.style.opacity = '1')}
          />
        </div>
      );
    }

    // Default: text bubble — includes optional replyTo quote
    const accentColor = isMe ? '#000' : '#fff';
    const quoteBg = isMe ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)';

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {(msg.contextPhoto || msg.replyToReact) && (
          <div style={{
            background: quoteBg,
            borderRadius: 12,
            padding: 6,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 4,
            border: `1px solid ${isMe ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)'}`,
          }}>
            <div style={{ width: 32, height: 32, borderRadius: 6, overflow: 'hidden', flexShrink: 0, position: 'relative' }}>
              <img src={msg.contextPhoto?.url || msg.replyToReact?.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Context" />
              {msg.replyToReact && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'rgba(0,0,0,0.3)', fontSize: 16 }}>
                  {msg.replyToReact.icon}
                </div>
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: isMe ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {msg.replyToReact ? 'React Reply' : 'Reply to Post'}
              </div>
              <div style={{ fontSize: 12, color: isMe ? 'rgba(0,0,0,0.7)' : '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {msg.replyToReact ? `Reacted with ${msg.replyToReact.icon}` : (msg.contextPhoto?.caption || 'Photo')}
              </div>
            </div>
          </div>
        )}

        {msg.replyTo && (
          <div style={{
            background: quoteBg,
            borderRadius: 12,
            padding: '6px 10px',
            borderLeft: `3.5px solid ${isMe ? '#000' : '#FFB800'}`,
            marginBottom: 2,
          }}>
            <div style={{ fontSize: 11, fontWeight: 900, color: isMe ? 'rgba(0,0,0,0.6)' : '#FFB800', marginBottom: 1 }}>
              {msg.replyTo.senderName}
            </div>
            <div style={{ fontSize: 13, color: isMe ? 'rgba(0,0,0,0.85)' : '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 220 }}>
              {msg.replyTo.isImage ? '📷 Photo' : msg.replyTo.content}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
          {(() => {
            if (!isMatchActive || !searchQuery.trim()) {
              return <span style={{ fontSize: 16 }}>{msg.content}</span>;
            }
            const lower = msg.content.toLowerCase();
            const idx = lower.indexOf(searchQuery.toLowerCase());
            if (idx === -1) return <span style={{ fontSize: 16 }}>{msg.content}</span>;
            return (
              <span style={{ fontSize: 16 }}>
                {msg.content.slice(0, idx)}
                <mark style={{ background: 'rgba(255,200,0,0.85)', borderRadius: 3, padding: '0 2px', color: 'inherit' }}>
                  {msg.content.slice(idx, idx + searchQuery.length)}
                </mark>
                {msg.content.slice(idx + searchQuery.length)}
              </span>
            );
          })()}
          
          {msg.isEdited && (
            <div 
              onClick={(e) => {
                e.stopPropagation();
                setShowEditHistoryId(msg.id);
              }}
              style={{ 
                fontSize: 10, 
                fontWeight: 800, 
                color: isMe ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.4)', 
                marginTop: 2,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 2
              }}
            >
              (đã chỉnh sửa) ℹ️
            </div>
          )}
        </div>
      </div>
    );

  };

  const renderMessage = (msg: Message, isMe: boolean, isFirstInGroup: boolean, isLastInGroup: boolean) => {
    const handlePointerDown = (e: React.PointerEvent) => {
      // Laptop friendly: Chuột trái click hoặc kéo
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      e.stopPropagation();
      isDragging.current = true;
      startX.current = e.clientX;
      swipeDelta.current = 0;
      setSwipingId(msg.id);
      
      if (messageRefs.current[msg.id]) messageRefs.current[msg.id]!.style.transition = 'none';
      e.currentTarget.setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
      if (!isDragging.current || swipingId !== msg.id) return;
      const dx = e.clientX - startX.current;
      const maxDrag = 60;
      let clamped = dx;

      // Them: Swipe Right (positive dx)
      // Me: Swipe Left (negative dx)
      if (!isMe) {
        if (dx < 0) clamped = 0;
        else if (dx > maxDrag) clamped = maxDrag + (dx - maxDrag) * 0.2;
      } else {
        if (dx > 0) clamped = 0;
        else if (dx < -maxDrag) clamped = -maxDrag + (dx + maxDrag) * 0.2;
      }

      swipeDelta.current = clamped;
      if (messageRefs.current[msg.id]) {
        messageRefs.current[msg.id]!.style.transform = `translateX(${clamped}px)`;
      }
    };

    const handlePointerUp = (e: React.PointerEvent) => {
      if (!isDragging.current || swipingId !== msg.id) return;
      isDragging.current = false;
      
      const absDelta = Math.abs(swipeDelta.current);
      
      // 1. CLICK DETECTED (Threshold 20px for laptops) -> Show Menu
      if (absDelta < 20) {
        if (mainContainerRef.current) {
          const bubbleRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
          const containerRect = mainContainerRef.current.getBoundingClientRect();
          
          const localX = bubbleRect.left - containerRect.left + (bubbleRect.width / 2);
          const localY_bubbleTop = bubbleRect.top - containerRect.top;
          const localY_bubbleBottom = bubbleRect.bottom - containerRect.top;
          
          // Detect space below (Menu height is ~150px)
          const spaceBelow = containerRect.height - localY_bubbleBottom;
          const showBelow = spaceBelow > 180;
          
          const finalY = showBelow ? localY_bubbleBottom + 8 : localY_bubbleTop - 158;
          
          setMsgMenuPos({ x: localX, y: finalY });
          setContextMenuMsg(msg);
        }
      } 
      // 2. SWIPE DETECTED -> Reply
      else {
        // Trigger threshold: 40px
        const triggered = !isMe ? (swipeDelta.current > 40) : (swipeDelta.current < -40);

        if (triggered) {
          setReplyingTo(msg);
          setTimeout(() => {
            const inputEl = document.querySelector('input[data-name="Input / Message"]') as HTMLInputElement;
            if (inputEl) inputEl.focus();
          }, 100);
        }
      }

      if (messageRefs.current[msg.id]) {
        messageRefs.current[msg.id]!.style.transition = 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
        messageRefs.current[msg.id]!.style.transform = `translateX(0px)`;
      }
      setTimeout(() => setSwipingId(null), 300);
      e.currentTarget.releasePointerCapture(e.pointerId);
    };

    return (
      <div key={msg.id} style={{
        position: 'relative',
        width: '100%',
        marginBottom: 4,
        display: 'flex',
        justifyContent: isMe ? 'flex-end' : 'flex-start',
        animation: 'msgSlideIn 0.28s cubic-bezier(0.34,1.56,0.64,1)',
      }}>
        {/* Swipable Bubble container */}
        <div
          ref={(el) => { messageRefs.current[msg.id] = el; }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          style={msg.type === 'reaction' ? {
            background: 'none',
            touchAction: 'pan-y'
          } : {
            padding: msg.type === 'voice' ? '8px 16px' : '11px 18px',
            borderRadius: isMe
              ? (isFirstInGroup ? '20px 20px 6px 20px' : '20px 6px 6px 20px')
              : (isFirstInGroup ? '20px 20px 20px 6px' : '6px 20px 20px 6px'),
            color: isMe ? '#000' : '#fff',
            fontSize: 16,
            fontWeight: 600,
            lineHeight: 1.4,
            width: 'fit-content',
            touchAction: 'pan-y',
            opacity: swipingId === msg.id ? 0.65 : 1,
            transition: 'opacity 0.15s ease, transform 0.15s ease',
            border: msg.type === 'sticker' ? 'none' : (isMe ? 'none' : '1.5px solid rgba(255,255,255,0.06)'),
            backgroundColor: msg.type === 'sticker' ? 'transparent' : (isMe ? '#FFB800' : 'rgba(255,255,255,0.12)'),
            boxShadow: msg.type === 'sticker' ? 'none' : (isMe ? '0 4px 15px rgba(255,184,0,0.2)' : '0 4px 15px rgba(0,0,0,0.2)'),
            maxWidth: '78vw',
          }}
        >
          {renderBubbleContent(msg, isMe)}
        </div>
      </div>
    );
  };
  return (
    <>
      <div ref={mainContainerRef} style={{
        width: '100%', height: '100%',
        display: 'flex', flexDirection: 'column',
        position: 'relative',
        background: warmBg,
        backdropFilter: 'blur(75px)',
        WebkitBackdropFilter: 'blur(75px)',
      }}>
        <style>{`
        @keyframes fadeInOverlay { from { opacity: 0; } to { opacity: 1; } }
        @keyframes voiceWave { 0%, 100% { transform: scaleY(1); } 50% { transform: scaleY(2); } }
        @keyframes msgSlideIn {
          from { opacity: 0; transform: translateY(10px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0)   scale(1); }
        }
        @keyframes popIn {
          from { opacity: 0; transform: scale(0.7); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>

        {/* ── HEADER ── */}
        {!hideHeader && (
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0,
            zIndex: 10, display: 'flex', flexDirection: 'column'
          }}>
            {/* Warm gradient fade behind header */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: showSearch ? 130 : 110,
              background: 'linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 55%, transparent 100%)',
              pointerEvents: 'none',
              transition: 'height 0.3s ease'
            }} />

            <div style={{
              display: 'flex', alignItems: 'center',
              justifyContent: 'space-between',
              padding: '52px 12px 12px',
              position: 'relative', zIndex: 2
            }}>
              {/* Back — always visible */}
              <button
                onClick={showSearch ? () => { setShowSearch(false); setSearchQuery(''); } : onBack}
                data-name="Button / Header / Back"
                id="BTN:BACK_X_TOGGLE"
                style={{
                  background: 'none', border: 'none',
                  padding: '10px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 2,
                  WebkitTapHighlightColor: 'transparent',
                  transition: 'transform 0.2s ease'
                }}
              >
                {showSearch ? (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
                    stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                ) : (
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
                    stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                )}
              </button>

              {/* Center: shows avatar+name OR search bar depending on mode */}
              {!showSearch && (
                <div
                  data-name="Header / Chat Info"
                  style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 8 }}
                >
                  <div
                    data-name="Avatar / Current"
                    style={{
                      width: 34, height: 34, borderRadius: '50%',
                      backgroundColor: color,
                      display: 'flex', justifyContent: 'center', alignItems: 'center',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                      flexShrink: 0,
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="rgba(255,255,255,0.9)">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                    </svg>
                  </div>
                  <span data-name="Chat / Name" style={{ color: '#fff', fontSize: 17, fontWeight: 800, letterSpacing: -0.2 }}>{name}</span>
                </div>
              )}

              {showSearch ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: 'white', opacity: 0.6, marginRight: 4 }}>
                    {searchResults.length > 0 ? `${searchIndex + 1}/${searchResults.length}` : '0'}
                  </span>
                  <button
                    onClick={handlePrevSearch}
                    style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer' }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 15l-6-6-6 6" /></svg>
                  </button>
                  <button
                    onClick={handleNextSearch}
                    style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer' }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <button
                    onClick={() => setShowSearch(true)}
                    style={{ background: 'none', border: 'none', padding: '6px 10px', cursor: 'pointer' }}
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
                    </svg>
                  </button>

                  <div ref={menuRef} style={{ position: 'relative' }}>
                    <button
                      onClick={() => setShowMenu(v => !v)}
                      style={{ background: 'none', border: 'none', padding: '6px 10px', cursor: 'pointer' }}
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                        <circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" />
                      </svg>
                    </button>

                    {showMenu && (
                      <div
                        style={{
                          position: 'absolute', top: 50, right: 0, zIndex: 1000,
                          width: 200, background: 'rgba(28,28,28,0.75)', backdropFilter: 'blur(35px)', WebkitBackdropFilter: 'blur(35px)',
                          borderRadius: 20, boxShadow: '0 12px 40px rgba(0,0,0,0.4)', overflow: 'hidden',
                          border: '1px solid rgba(255,255,255,0.08)',
                          animation: 'popIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                          padding: '6px 0'
                        }}
                      >
                        <button onClick={() => setShowMenu(false)} style={{ width: '100%', padding: '12px 16px', border: 'none', background: 'none', textAlign: 'left', fontWeight: 600, color: 'white', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><line x1="17" y1="8" x2="23" y2="14"></line><line x1="23" y1="8" x2="17" y2="14"></line></svg>
                          Remove friends
                        </button>
                        <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '0 8px' }} />
                        <button onClick={() => setShowMenu(false)} style={{ width: '100%', padding: '12px 16px', border: 'none', background: 'none', textAlign: 'left', fontWeight: 600, color: 'white', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                          Report
                        </button>
                        <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '0 8px' }} />
                        <button onClick={() => setShowMenu(false)} style={{ width: '100%', padding: '12px 16px', border: 'none', background: 'none', textAlign: 'left', fontWeight: 600, color: '#FF453A', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>
                          Block
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}




        {/* ── MESSAGE LIST ── */}
        <div
          className="settings-scroll"
          ref={scrollRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            paddingTop: hideHeader ? 40 : (showSearch ? 85 : 130), // Tối ưu padding-top để giảm khoảng trống khi search
            paddingBottom: showSearch ? 80 : 10, // Đảm bảo input bar không che mất tin nhắn cuối
            paddingLeft: 0,
            paddingRight: 0,
            display: 'flex',
            flexDirection: 'column',
            transition: 'all 0.4s cubic-bezier(0.19, 1, 0.22, 1)',
            overflowX: 'hidden'
          }}
        >

          {clusters.map((cluster, ci) => {
            const isMe = cluster.sender === 'me';
            const photo = cluster.contextPhoto;

            return (
              <div
                key={ci}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  marginBottom: 20, // Increased gap between clusters for clarity
                  padding: '0 14px',
                  width: '100%'
                }}
              >
                {/* Messages grow from top down (chronological) */}

                {photo && <ContextPhotoBubble photo={photo} isMe={isMe} />}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%' }}>
                  {cluster.messages.map((m, mi) => {
                    const isLast = mi === cluster.messages.length - 1;

                    return (
                      <div
                        key={m.id}
                        style={{
                          display: 'flex',
                          flexDirection: isMe ? 'row-reverse' : 'row',
                          alignItems: 'flex-end',
                          width: '100%'
                        }}
                      >
                        {!isMe && (
                          <div style={{ width: 40, marginRight: 0, flexShrink: 0, display: 'flex', justifyContent: 'flex-start' }}>
                            {isLast ? (
                              <div
                                data-name="Avatar / Other"
                                style={{
                                  width: 32, height: 32, borderRadius: '50%',
                                  backgroundColor: color,
                                  display: 'flex', justifyContent: 'center', alignItems: 'center',
                                  boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                                  marginBottom: 4
                                }}
                              >
                                <div style={{ color: '#fff', fontSize: 13, fontWeight: '800' }}>
                                  {name.charAt(0)}
                                </div>
                              </div>
                            ) : (
                              <div style={{ width: 32 }} /> // Maintain the 40px column
                            )}
                          </div>
                        )}

                        <div style={{
                          flex: 1,
                          display: 'flex',
                          justifyContent: isMe ? 'flex-end' : 'flex-start'
                        }}>
                          {renderMessage(m, isMe, mi === 0, isLast)}
                        </div>

                        {isMe && <div style={{ width: 10 }} />}
                      </div>
                    );
                  })}
                  {isMe && ci === clusters.length - 1 && (
                    <div style={{
                      alignSelf: 'flex-end',
                      fontSize: 11,
                      fontWeight: 800,
                      color: 'rgba(0,0,0,0.3)',
                      marginTop: 2,
                      marginRight: 10,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 3
                    }}>
                      <span>Seen</span>
                      <span style={{ fontSize: 9 }}>{filteredMessages[filteredMessages.length - 1].timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── INPUT BAR ── */}
        <div style={{
          padding: `0 14px max(14px, env(safe-area-inset-bottom))`,
          flexShrink: 0,
          background: `linear-gradient(to top, ${warmBg} 60%, transparent 100%)`,
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{
            overflow: 'hidden',
            transition: 'all 0.3s cubic-bezier(0.2, 1, 0.3, 1)',
            height: replyingTo ? 40 : 0,
            opacity: replyingTo ? 1 : 0,
            marginBottom: replyingTo ? 8 : 0
          }}>
            {replyingTo && (
              <div data-name="Input / Replying To Indicator" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: 'rgba(255,255,255,0.4)', borderRadius: 12, padding: '8px 12px',
                borderLeft: `4px solid ${replyingTo.sender === 'me' ? '#E8A020' : color || '#333'}`
              }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(0,0,0,0.5)' }}>
                    {replyingTo.sender === 'me' ? 'Đang trả lời chính mình' : `Đang trả lời ${name}`}
                  </span>
                  <span style={{ fontSize: 13, color: 'rgba(0,0,0,0.8)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '280px' }}>
                    {replyingTo.type === 'image' ? '📷 Ảnh' : replyingTo.content}
                  </span>
                </div>
                <button
                  onClick={() => setReplyingTo(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" stroke="rgba(0,0,0,0.5)" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
          </div>

          <div
            data-name="Input / Container / Pill"
            style={{
              height: isRecording ? 60 : 54,
              borderRadius: isRecording ? 27 : 27,
              background: isRecording ? 'rgba(30,30,35,0.95)' : (showSearch ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.12)'),
              backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)',
              border: '1px solid rgba(255,255,255,0.12)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
              display: 'flex', alignItems: 'center',
              padding: isRecording ? '0 12px' : '0 6px 0 16px',
              gap: 4,
              overflow: 'hidden',
              transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
              position: 'relative'
            }}
          >
            {showSearch ? (
              /* SEARCH MODE PILL */
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="3" strokeLinecap="round">
                  <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
                </svg>
                <input
                  autoFocus
                  type="text"
                  placeholder="Search messages..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{
                    flex: 1, background: 'none', border: 'none', outline: 'none',
                    fontSize: 16, fontWeight: 600, color: 'rgba(255,255,255,0.8)'
                  }}
                />
              </div>
            ) : isRecording ? (
              /* SINGLE ROW VOICE RECORDING UI */
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, height: '100%' }}>
                <button
                  onClick={handleCancelRecording}
                  style={{
                    width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,0.1)',
                    border: 'none', display: 'flex', justifyContent: 'center', alignItems: 'center',
                    cursor: 'pointer', flexShrink: 0
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                </button>

                <button
                  onClick={handleTogglePauseRecording}
                  style={{
                    width: 34, height: 34, borderRadius: '50%', background: isPausedRecording ? '#FFB800' : 'rgba(255,255,255,0.1)',
                    border: 'none', display: 'flex', justifyContent: 'center', alignItems: 'center',
                    cursor: 'pointer', flexShrink: 0
                  }}
                >
                  {isPausedRecording ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="black"><path d="M8 5v14l11-7z" /></svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>
                  )}
                </button>

                <div style={{ flex: 1, height: 36, display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.06)', borderRadius: 12, padding: '0 10px', overflow: 'hidden' }}>
                  <div style={{
                    flex: 1, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'flex-start',
                    gap: 2, overflow: 'hidden', maskImage: 'linear-gradient(to right, transparent, black 5%, black 95%, transparent)',
                    WebkitMaskImage: 'linear-gradient(to right, transparent, black 5%, black 95%, transparent)'
                  }}>
                    {recordingBars.map((h, i) => (
                      <div key={i} style={{
                        width: 3, height: h,
                        backgroundColor: isPausedRecording ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.8)',
                        borderRadius: 1.5, flexShrink: 0
                      }} />
                    ))}
                  </div>
                </div>

                <div style={{ flexShrink: 0, minWidth: 42, display: 'flex', justifyContent: 'center' }}>
                  <span style={{ color: 'white', fontWeight: 850, fontSize: 13, fontFamily: 'monospace' }}>
                    0:{recordingTime < 10 ? '0' + recordingTime : recordingTime}
                  </span>
                </div>

                <button
                  onClick={handleStopAndSendVoice}
                  style={{
                    width: 38, height: 38, borderRadius: '50%',
                    background: '#FFB800', border: 'none',
                    display: 'flex', justifyContent: 'center', alignItems: 'center',
                    cursor: 'pointer', flexShrink: 0,
                    boxShadow: '0 4px 12px rgba(255,184,0,0.3)',
                    transition: 'all 0.2s cubic-bezier(0.19, 1, 0.22, 1)'
                  }}
                  onPointerDown={e => e.currentTarget.style.transform = 'scale(0.85)'}
                  onPointerUp={e => e.currentTarget.style.transform = 'scale(1)'}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
                </button>
              </div>
            ) : (
              /* NORMAL MESSAGING PILL */
              <>
                <input
                  type="text"
                  data-name="Input / Message"
                  placeholder="Send message..."
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                  style={{
                    flex: 1, background: 'none', border: 'none',
                    color: 'rgba(255,255,255,0.85)',
                    fontSize: 16, outline: 'none',
                    fontWeight: 500,
                    minWidth: 0,
                    padding: '0 8px'
                  }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {inputText.trim() || replyingTo ? (
                    <button onClick={handleSendMessage} style={{ width: 38, height: 38, borderRadius: '50%', background: '#E8A020', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', boxShadow: '0 4px 12px rgba(232,160,32,0.3)', flexShrink: 0 }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
                    </button>
                  ) : (
                    <>
                      <button
                        onPointerDown={(e) => {
                          longPressTriggered.current = false;
                          e.currentTarget.querySelector('span')!.style.transform = 'scale(0.8)';
                          longPressTimer.current = setTimeout(() => {
                            longPressTriggered.current = true;
                            setIsSetQuickEmojiMode(true);
                            setShowEmojiSheet(true);
                            setSheetDragY(0);
                          }, 500);
                        }}
                        onPointerUp={(e) => {
                          clearTimeout(longPressTimer.current);
                          const span = e.currentTarget.querySelector('span');
                          if (span) span.style.transform = 'scale(1)';
                          if (!longPressTriggered.current) handleSelectEmoji(quickEmoji);
                        }}
                        onPointerLeave={() => clearTimeout(longPressTimer.current)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 4 }}
                      >
                        <span style={{ fontSize: 22, transition: 'transform 0.15s' }}>
                          {quickEmoji}
                        </span>
                      </button>

                      <button
                        onClick={() => { setShowEmojiSheet(true); setSheetDragY(0); }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 4 }}
                      >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><line x1="9" y1="9" x2="9.01" y2="9" /><line x1="15" y1="9" x2="15.01" y2="9" /></svg>
                      </button>

                      <button onClick={toggleRecording} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 4 }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="22" /></svg>
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── FULL EMOJI BOTTOM SHEET ── */}
      {showEmojiSheet && (
        <div
          onClick={() => { setShowEmojiSheet(false); setIsSetQuickEmojiMode(false); setSheetDragY(0); }}
          style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 20000, animation: 'fadeIn 0.2s', touchAction: 'none' }}
        >
          <div
            ref={sheetRef}
            onClick={e => e.stopPropagation()}
            style={{
              position: 'absolute', bottom: 0, left: 0, right: 0, height: '78%',
              background: 'rgba(20, 20, 20, 0.85)', backdropFilter: 'blur(50px)', WebkitBackdropFilter: 'blur(50px)',
              borderRadius: '32px 32px 0 0', display: 'flex', flexDirection: 'column',
              transform: `translateY(${sheetDragY}px)`,
              transition: !isDraggingSheet ? 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)' : 'none',
              boxShadow: '0 -10px 40px rgba(0,0,0,0.5)',
              borderTop: '1px solid rgba(255,255,255,0.1)',
              touchAction: 'none'
            }}
          >
            <div
              onPointerDown={(e) => {
                setIsDraggingSheet(true);
                dragStartY.current = e.clientY - sheetDragY;
                (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
              }}
              onPointerMove={(e) => {
                if (!isDraggingSheet) return;
                const dy = e.clientY - dragStartY.current;
                if (dy < 0) {
                  setSheetDragY(dy * 0.3);
                } else {
                  setSheetDragY(dy);
                }
                if (dy > 120 && typeof window.navigator.vibrate === 'function') {
                  window.navigator.vibrate(5);
                }
              }}
              onPointerUp={(e) => {
                if (!isDraggingSheet) return;
                setIsDraggingSheet(false);
                (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);

                if (sheetDragY > 150) {
                  setShowEmojiSheet(false);
                  setIsSetQuickEmojiMode(false);
                  setSheetDragY(0);
                } else {
                  setSheetDragY(0);
                }
              }}
              style={{ display: 'flex', flexDirection: 'column', cursor: 'grab', touchAction: 'none', zIndex: 10, padding: '12px 0 0' }}
            >
              <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
                <div style={{ width: 36, height: 5, borderRadius: 2.5, background: 'rgba(255,255,255,0.2)' }} />
              </div>

              <div style={{ padding: '8px 24px 8px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>
                    {isSetQuickEmojiMode ? `Quick Emoji ${quickEmoji}` : (activeSheetTab === 'emoji' ? 'Emoji' : 'Stickers')}
                  </h3>
                  {activeSheetTab === 'emoji' && (
                    <button
                      onClick={() => setIsSetQuickEmojiMode(!isSetQuickEmojiMode)}
                      onPointerDown={e => e.stopPropagation()}
                      style={{
                        padding: '8px 14px', borderRadius: 12, fontSize: 13, fontWeight: 700,
                        background: isSetQuickEmojiMode ? '#E8A020' : 'rgba(255,255,255,0.1)',
                        color: 'white', border: 'none', cursor: 'pointer', zIndex: 11
                      }}
                    >
                      {isSetQuickEmojiMode ? 'Done' : 'Set Quick'}
                    </button>
                  )}
                </div>

                {!isSetQuickEmojiMode && (
                  <div
                    onPointerDown={e => e.stopPropagation()}
                    style={{
                      background: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 3,
                      display: 'flex', position: 'relative'
                    }}
                  >
                    <div style={{
                      position: 'absolute', top: 3, bottom: 3,
                      left: activeSheetTab === 'emoji' ? 3 : '50%',
                      width: 'calc(50% - 3px)', background: 'rgba(255,255,255,0.15)',
                      borderRadius: 9, transition: 'all 0.3s cubic-bezier(0.2, 1, 0.3, 1)',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                    }} />
                    <button
                      onClick={() => setActiveSheetTab('emoji')}
                      onPointerDown={e => e.stopPropagation()}
                      style={{ flex: 1, padding: '8px 0', border: 'none', background: 'none', color: '#fff', fontSize: 14, fontWeight: 700, position: 'relative', cursor: 'pointer', zIndex: 1 }}
                    >Emoji</button>
                    <button
                      onClick={() => setActiveSheetTab('stickers')}
                      onPointerDown={e => e.stopPropagation()}
                      style={{ flex: 1, padding: '8px 0', border: 'none', background: 'none', color: '#fff', fontSize: 14, fontWeight: 700, position: 'relative', cursor: 'pointer', zIndex: 1 }}
                    >Stickers</button>
                  </div>
                )}
              </div>
            </div>

            <div style={{ padding: '0 24px 16px' }}>
              <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 14, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="3" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>
                <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 15, fontWeight: 600 }}>Search</span>
              </div>
            </div>

            <div style={{ flex: 1, width: '100%', overflow: 'hidden', position: 'relative' }}>
              <div style={{
                display: 'flex', width: '200%', height: '100%',
                transition: 'transform 0.4s cubic-bezier(0.19, 1, 0.22, 1)',
                transform: `translateX(${activeSheetTab === 'emoji' ? '0%' : '-50%'})`,
                willChange: 'transform'
              }}>
                <div className="settings-scroll" style={{ width: '50%', height: '100%', overflowY: 'auto', padding: '0 16px 40px', touchAction: 'pan-y' }}>
                  <div style={{ padding: '10px 8px', fontSize: 12, fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Suggested</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 4 }}>
                    {['🔥', '🫶', '🥲', '💗', '🫠', '😅', '💕', '😱', '💛', '😋', '😍', '🤍'].map(e => (
                      <button key={e} onClick={() => handleSelectEmoji(e)} style={{ background: 'none', border: 'none', fontSize: 32, cursor: 'pointer', padding: 10, transition: 'transform 0.1s' }} onPointerDown={el => el.currentTarget.style.transform = 'scale(0.85)'} onPointerUp={el => el.currentTarget.style.transform = 'scale(1)'}>{e}</button>
                    ))}
                  </div>
                  <div style={{ padding: '24px 8px 10px', fontSize: 12, fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Popular</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 4 }}>
                    {['💛', '🫶', '😍', '🔥', '😅', '💗', '😭', '😋', '🥺', '🥰', '🥲', '🤩', '😆', '😱', '😎', '🫢', '🧐', '🫠', '❤️‍🔥', '💕', '💘', '❤️', '💖', '💋', '🤍', '💚', '💙', '💜', '🧡', '🖤'].map(e => (
                      <button key={e} onClick={() => handleSelectEmoji(e)} style={{ background: 'none', border: 'none', fontSize: 32, cursor: 'pointer', padding: 10, transition: 'transform 0.1s' }} onPointerDown={el => el.currentTarget.style.transform = 'scale(0.85)'} onPointerUp={el => el.currentTarget.style.transform = 'scale(1)'}>{e}</button>
                    ))}
                  </div>
                  <div style={{ padding: '24px 8px 10px', fontSize: 12, fontWeight: 800, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 0.5 }}>All</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 10 }}>
                    {['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗'].map(e => (
                      <button key={e} onClick={() => handleSelectEmoji(e)} style={{ background: 'none', border: 'none', fontSize: 32, cursor: 'pointer', padding: 10, transition: 'transform 0.1s' }} onPointerDown={el => el.currentTarget.style.transform = 'scale(0.85)'} onPointerUp={el => el.currentTarget.style.transform = 'scale(1)'}>{e}</button>
                    ))}
                  </div>
                </div>

                <div className="settings-scroll" style={{ width: '50%', height: '100%', overflowY: 'auto', padding: '0 16px 40px', touchAction: 'pan-y' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, padding: '10px 8px' }}>
                    {[
                      'https://images.unsplash.com/photo-1614027164847-1b2809eb189d?w=200&h=200&fit=crop&q=80',
                      'https://images.unsplash.com/photo-1593085512500-5d55148d6f0d?w=200&h=200&fit=crop&q=80',
                      'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=200&h=200&fit=crop&q=80',
                      'https://images.unsplash.com/photo-1579353977828-2a4eab540b9a?w=200&h=200&fit=crop&q=80',
                      'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=200&h=200&fit=crop&q=80',
                      'https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?w=200&h=200&fit=crop&q=80',
                      'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=200&h=200&fit=crop&q=80',
                      'https://images.unsplash.com/photo-1535223289827-42f1e9919769?w=200&h=200&fit=crop&q=80'
                    ].map((url, i) => (
                      <button
                        key={i}
                        onClick={() => handleSelectSticker(url)}
                        style={{
                          background: 'rgba(255,255,255,0.03)', border: 'none', borderRadius: 16,
                          aspectRatio: '1 / 1', overflow: 'hidden', cursor: 'pointer',
                          display: 'flex', justifyContent: 'center', alignItems: 'center',
                          padding: 10, transition: 'transform 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                        }}
                        onPointerDown={el => el.currentTarget.style.transform = 'scale(0.9) rotate(-3deg)'}
                        onPointerUp={el => el.currentTarget.style.transform = 'scale(1) rotate(0deg)'}
                      >
                        <img
                          src={url}
                          style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 8, opacity: 0, transition: 'opacity 0.4s ease' }}
                          onLoad={e => (e.currentTarget.style.opacity = '1')}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ── MESSAGE CONTEXT MENU ── */}
      {contextMenuMsg && (
        <div 
          onClick={() => setContextMenuMsg(null)}
          style={{
            position: 'absolute', inset: 0, zIndex: 1000000,
            background: 'rgba(0,0,0,0.5)',
            animation: 'fadeInOverlay 0.2s ease-out'
          }}
        >
          <div 
            style={{
              position: 'absolute',
              top: Math.max(10, Math.min(msgMenuPos.y, (mainContainerRef.current?.offsetHeight || 800) - 160)),
              left: Math.max(10, Math.min(msgMenuPos.x - 90, (mainContainerRef.current?.offsetWidth || 430) - 190)),
              background: '#1C1C1E', // Solid high-contrast background
              borderRadius: 16,
              padding: 6,
              minWidth: 180,
              boxShadow: '0 20px 60px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.1)',
              animation: 'popIn 0.2s cubic-bezier(0.19, 1, 0.22, 1)',
              pointerEvents: 'auto'
            }}
            onClick={e => e.stopPropagation()}
          >
            {contextMenuMsg.sender === 'me' && (Date.now() - (contextMenuMsg.timestampNum || 0) < 3600000) && (
              <button 
                onClick={() => {
                  setEditingMsgId(contextMenuMsg.id);
                  setInputText(contextMenuMsg.content);
                  setContextMenuMsg(null);
                }}
                style={{
                  width: '100%', padding: '12px 16px', display: 'flex', alignItems: 'center',
                  background: 'none', border: 'none', color: '#fff', fontSize: 14, fontWeight: 700,
                  cursor: 'pointer', textAlign: 'left', borderRadius: 10,
                  transition: 'background 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                Chỉnh sửa
              </button>
            )}
            <button 
              onClick={() => {
                setReplyingTo(contextMenuMsg);
                setContextMenuMsg(null);
                setTimeout(() => {
                  const inputEl = document.querySelector('input[data-name="Input / Message"]') as HTMLInputElement;
                  if (inputEl) inputEl.focus();
                }, 100);
              }}
              style={{
                width: '100%', padding: '12px 16px', display: 'flex', alignItems: 'center',
                background: 'none', border: 'none', color: '#fff', fontSize: 14, fontWeight: 700,
                cursor: 'pointer', textAlign: 'left', borderRadius: 10,
                transition: 'background 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              Trả lời
            </button>
            <button 
              onClick={() => {
                navigator.clipboard.writeText(contextMenuMsg.content);
                setContextMenuMsg(null);
              }}
              style={{
                width: '100%', padding: '12px 16px', display: 'flex', alignItems: 'center',
                background: 'none', border: 'none', color: '#fff', fontSize: 14, fontWeight: 700,
                cursor: 'pointer', textAlign: 'left', borderRadius: 10,
                transition: 'background 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              Sao chép
            </button>
          </div>
        </div>
      )}

      {/* ── EDIT HISTORY MODAL ── */}
      {showEditHistoryId && (
        <div 
          onClick={() => setShowEditHistoryId(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 10000,
            background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(5px)',
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            animation: 'fadeInOverlay 0.2s ease-out'
          }}
        >
          <div 
            style={{
              width: '85%', maxWidth: 350,
              background: 'rgba(30,30,32,0.98)',
              borderRadius: 24, padding: 24,
              boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
              border: '1px solid rgba(255,255,255,0.1)',
              animation: 'popIn 0.3s cubic-bezier(0.19, 1, 0.22, 1)'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, color: '#fff', fontSize: 18, fontWeight: 800 }}>Lịch sử chỉnh sửa</h3>
              <button 
                onClick={() => setShowEditHistoryId(null)}
                style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 20 }}
              >✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 900, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: 6, letterSpacing: 0.5 }}>
                  Bản gốc
                </div>
                <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 14, color: 'rgba(255,255,255,0.6)', fontSize: 15, border: '1px solid rgba(255,255,255,0.05)' }}>
                  {chatMessages.find(m => m.id === showEditHistoryId)?.originalContent}
                </div>
              </div>
              
              <div>
                <div style={{ fontSize: 12, fontWeight: 900, color: '#4CAF50', textTransform: 'uppercase', marginBottom: 6, letterSpacing: 0.5 }}>
                  Đã chỉnh sửa
                </div>
                <div style={{ background: 'rgba(76,175,80,0.1)', borderRadius: 12, padding: 14, color: '#fff', fontSize: 15, border: '1px solid rgba(76,175,80,0.2)' }}>
                  {chatMessages.find(m => m.id === showEditHistoryId)?.content}
                </div>
              </div>
            </div>

            <button 
              onClick={() => setShowEditHistoryId(null)}
              style={{
                width: '100%', marginTop: 24, padding: '14px 0',
                background: '#fff', color: '#000', borderRadius: 14,
                border: 'none', fontSize: 15, fontWeight: 800, cursor: 'pointer'
              }}
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </>
  );
}
