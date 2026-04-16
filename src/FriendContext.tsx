import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

/* ─── Types ─── */
export interface Friend {
  id: string;
  name: string;
  color: string;
  avatar: string;
}

export interface ContextPhoto {
  url: string;
  caption?: string;
  collabs?: string[];
}

export interface ChatMessage {
  id: string;
  friendId: string;
  text?: string;
  voiceUrl?: string;
  voiceDuration?: number;
  time: string;
  fromMe: boolean;
  contextPhoto?: ContextPhoto;
  type?: 'text' | 'voice' | 'reaction';
}

export interface FriendRequest {
  id: string;
  name: string;
  color: string;
  avatar: string;
  direction: 'sent' | 'received';
}

export interface MyPrivacySettings {
  anonymousCollab: boolean;
  hideCollab: boolean;
  readReceipts: boolean;
}

interface FriendContextValue {
  friends: Friend[];
  friendRequests: FriendRequest[];
  chatMessages: Record<string, ChatMessage[]>;
  myPrivacySettings: MyPrivacySettings;
  setPrivacy: <K extends keyof MyPrivacySettings>(key: K, value: MyPrivacySettings[K]) => void;
  addFriend: (friend: Friend) => void;
  removeFriend: (id: string) => void;
  sendFriendRequest: (name: string) => void;
  acceptFriendRequest: (requestId: string) => void;
  declineFriendRequest: (requestId: string) => void;
  addChatMessage: (friendId: string, text?: string, fromMe?: boolean, contextPhoto?: ContextPhoto, type?: 'text' | 'voice' | 'reaction') => void;
  getLastMessage: (friendId: string) => ChatMessage | null;
  getFriendsWithChat: () => Friend[];
}

const FriendContext = createContext<FriendContextValue | null>(null);

/* ─── Suggested People (pool to send requests to) ─── */
export const SUGGESTED_PEOPLE: Friend[] = [
  { id: 's1', name: 'Kiệt Tuấn', color: 'hsl(220, 70%, 55%)', avatar: 'https://i.pravatar.cc/100?img=11' },
  { id: 's2', name: 'Bảo Nguyễn', color: 'hsl(340, 65%, 55%)', avatar: 'https://i.pravatar.cc/100?img=12' },
  { id: 's3', name: 'Bẻo En 🐸', color: 'hsl(120, 60%, 50%)', avatar: 'https://i.pravatar.cc/100?img=13' },
  { id: 's4', name: 'Tổng Tài Miền Tây', color: 'hsl(40, 70%, 55%)', avatar: 'https://i.pravatar.cc/100?img=14' },
  { id: 's5', name: 'Đời buồn JQK', color: 'hsl(280, 65%, 55%)', avatar: 'https://i.pravatar.cc/100?img=15' },
  { id: 's6', name: 'Gái quê 🎋', color: 'hsl(160, 60%, 50%)', avatar: 'https://i.pravatar.cc/100?img=16' },
  { id: 's7', name: 'Nguyên Trần', color: 'hsl(200, 65%, 55%)', avatar: 'https://i.pravatar.cc/100?img=17' },
  { id: 's8', name: 'trơn trunk kúc 🌻', color: 'hsl(50, 70%, 55%)', avatar: 'https://i.pravatar.cc/100?img=18' },
  { id: 's9', name: 'mây pé', color: 'hsl(310, 60%, 55%)', avatar: 'https://i.pravatar.cc/100?img=19' },
  { id: 's10', name: 'Sóc Nhỏ', color: 'hsl(90, 65%, 50%)', avatar: 'https://i.pravatar.cc/100?img=20' },
  { id: 's11', name: 'Trang ✨', color: 'hsl(350, 65%, 60%)', avatar: 'https://i.pravatar.cc/100?img=21' },
  { id: 's12', name: 'Nyny 💕', color: 'hsl(210, 70%, 60%)', avatar: 'https://i.pravatar.cc/100?img=22' },
  { id: 's13', name: 'Anh Khoa Bo', color: 'hsl(45, 70%, 60%)', avatar: 'https://i.pravatar.cc/100?img=23' },
  { id: 's14', name: 'Tiên Nguyễn', color: 'hsl(140, 60%, 55%)', avatar: 'https://i.pravatar.cc/100?img=24' },
  { id: 's15', name: 'Hoàng Phúc', color: 'hsl(270, 60%, 60%)', avatar: 'https://i.pravatar.cc/100?img=25' },
  { id: 's16', name: 'Hà My', color: 'hsl(190, 65%, 55%)', avatar: 'https://i.pravatar.cc/100?img=26' },
  { id: 's17', name: 'Thủy Tiên', color: 'hsl(30, 70%, 55%)', avatar: 'https://i.pravatar.cc/100?img=27' },
  { id: 's18', name: 'Khánh Linh', color: 'hsl(300, 60%, 55%)', avatar: 'https://i.pravatar.cc/100?img=28' },
  { id: 's19', name: 'Minh Quân', color: 'hsl(170, 65%, 50%)', avatar: 'https://i.pravatar.cc/100?img=29' },
  { id: 's20', name: 'Vy Trần', color: 'hsl(60, 70%, 55%)', avatar: 'https://i.pravatar.cc/100?img=30' },
];

/* ─── All 20 initial friends ─── */
export const INITIAL_FRIENDS: Friend[] = SUGGESTED_PEOPLE;

/* ─── Pre-seeded Chat Data ─── */
const SEED_CHATS: Record<string, Partial<ChatMessage>[]> = {
  's1': [{ text: 'Replied to your Locket!', time: '14h', fromMe: false }],
  's2': [{ text: 'Replied to your Locket!', time: '2d', fromMe: false }],
  's3': [{ text: 'Dam ko', time: '7d', fromMe: false }],
  's4': [{ text: ':))', time: '25 Mar', fromMe: false }],
  's5': [{ text: 'Mất chim r', time: '25 Mar', fromMe: false }],
  's6': [{ text: 'Mất rồi', time: '19 Mar', fromMe: false }],
  
  // Long Chat Example for s7 (Nguyên Trần)
  's7': [
    { text: 'Hey! Did you see the photo?', time: '9:41', fromMe: false },
    { text: 'Yeah, looks awesome! 🔥', time: '9:42', fromMe: true },
    { 
      contextPhoto: { 
        url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=600',
        caption: 'Collab moment'
      },
      text: 'Vừa chụp lúc nãy à?',
      time: '9:45',
      fromMe: true
    },
    { text: 'Gửi cho tao bản gốc với nhé', time: '9:46', fromMe: true },
    { text: 'Okok đợi tí', time: '9:47', fromMe: false },
    { text: 'Đang upload lên drive', time: '9:47', fromMe: false },
    { text: 'Check mail đi nhé, tao gửi rồi đó!', time: '9:50', fromMe: false },
    { text: 'Cảm ơn nhé! 🫡', time: '9:52', fromMe: true }
  ],

  // Short Chat Example for s8 (trơn trunk kúc 🌻)
  's8': [
    { text: 'Replied to your Locket!', time: '10:15', fromMe: false },
    { text: 'Thanks! ✨', time: '10:16', fromMe: true }
  ],

  's9': [{ text: 'mây reacted 💛 to "Hong"', time: '25 Feb', type: 'reaction', fromMe: false }],
  's10': [{ text: 'Replied to your Locket!', time: '20 Feb', fromMe: false }],
};

export function FriendProvider({ children }: { children: ReactNode }) {
  const [friends, setFriends] = useState<Friend[]>(() => INITIAL_FRIENDS);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [myPrivacySettings, setMyPrivacySettings] = useState<MyPrivacySettings>({
    anonymousCollab: false,
    hideCollab: false,
    readReceipts: true,
  });
  const setPrivacy = useCallback(<K extends keyof MyPrivacySettings>(key: K, value: MyPrivacySettings[K]) => {
    setMyPrivacySettings(prev => ({ ...prev, [key]: value }));
  }, []);
  const [chatMessages, setChatMessages] = useState<Record<string, ChatMessage[]>>(() => {
    // Pre-load chats for all friends that have seed data
    const initial: Record<string, ChatMessage[]> = {};
    Object.keys(SEED_CHATS).forEach(id => {
      const seed = SEED_CHATS[id];
      if (seed) {
        initial[id] = seed.map((msg, i) => ({
          id: `${id}-${i}`,
          friendId: id,
          text: msg.text || '',
          time: msg.time || '12:00',
          fromMe: msg.fromMe || false,
          contextPhoto: msg.contextPhoto,
          type: msg.type || 'text'
        }));
      }
    });
    return initial;
  });

  const addFriend = useCallback((friend: Friend) => {
    setFriends(prev => {
      if (prev.find(f => f.id === friend.id)) return prev;
      return [...prev, friend];
    });
  }, []);

  const removeFriend = useCallback((id: string) => {
    setFriends(prev => prev.filter(f => f.id !== id));
  }, []);

  const sendFriendRequest = useCallback((name: string) => {
    const person = SUGGESTED_PEOPLE.find(p => p.name.toLowerCase().includes(name.toLowerCase()));
    if (!person) return;
    if (friendRequests.find(r => r.id === person.id)) return;
    if (friends.find(f => f.id === person.id)) return;

    setFriendRequests(prev => [...prev, { ...person, direction: 'sent' }]);

    setTimeout(() => {
      setFriendRequests(prev => prev.map(r =>
        r.id === person.id ? { ...r, direction: 'received' as const } : r
      ));
    }, 2000);
  }, [friendRequests, friends]);

  const acceptFriendRequest = useCallback((requestId: string) => {
    const request = friendRequests.find(r => r.id === requestId);
    if (!request) return;

    const newFriend: Friend = {
      id: request.id, name: request.name,
      color: request.color, avatar: request.avatar,
    };
    setFriends(prev => [...prev, newFriend]);
    setFriendRequests(prev => prev.filter(r => r.id !== requestId));

    const seedData = SEED_CHATS[requestId];
    if (seedData) {
      setChatMessages(prev => ({
        ...prev,
        [requestId]: seedData.map((msg, i) => ({
          id: `${requestId}-${i}`, 
          friendId: requestId,
          text: msg.text || '', 
          time: msg.time || '12:00', 
          fromMe: msg.fromMe || false,
          contextPhoto: msg.contextPhoto,
          type: msg.type || 'text'
        }))
      }));
    }
  }, [friendRequests]);

  const declineFriendRequest = useCallback((requestId: string) => {
    setFriendRequests(prev => prev.filter(r => r.id !== requestId));
  }, []);

  const addChatMessage = useCallback((friendId: string, text?: string, fromMe: boolean = true, contextPhoto?: ContextPhoto, type: 'text' | 'voice' | 'reaction' = 'text') => {
    const now = new Date();
    const timeStr = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
    setChatMessages(prev => ({
      ...prev,
      [friendId]: [...(prev[friendId] || []), {
        id: `${friendId}-${Date.now()}`, friendId,
        text, time: timeStr, fromMe,
        contextPhoto, type
      }]
    }));
  }, []);

  const getLastMessage = useCallback((friendId: string): ChatMessage | null => {
    const msgs = chatMessages[friendId];
    if (!msgs || msgs.length === 0) return null;
    return msgs[msgs.length - 1];
  }, [chatMessages]);

  const getFriendsWithChat = useCallback((): Friend[] => {
    return friends.filter(f => chatMessages[f.id] && chatMessages[f.id].length > 0);
  }, [friends, chatMessages]);

  return (
    <FriendContext.Provider value={{
      friends, friendRequests, chatMessages,
      myPrivacySettings, setPrivacy,
      addFriend, removeFriend, sendFriendRequest,
      acceptFriendRequest, declineFriendRequest,
      addChatMessage, getLastMessage, getFriendsWithChat,
    }}>
      {children}
    </FriendContext.Provider>
  );
}

export function useFriendStore() {
  const ctx = useContext(FriendContext);
  if (!ctx) throw new Error('useFriendStore must be used within FriendProvider');
  return ctx;
}
