export type WeekKey = 'W1' | 'W2' | 'W3' | 'W4';

export interface WeekConfig {
  key: WeekKey;
  theme: string;
  days: string;
}

export const WEEKS: WeekConfig[] = [
  { key: 'W1', theme: 'Buổi sáng',  days: 'Ngày 1–7'   },
  { key: 'W2', theme: 'Thiên nhiên', days: 'Ngày 8–14'  },
  { key: 'W3', theme: 'Bạn bè',      days: 'Ngày 15–21' },
  { key: 'W4', theme: 'Ẩm thực',     days: 'Ngày 22–28' },
];

export const WEEK_IMAGES: Record<WeekKey, string> = {
  W1: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80',
  W2: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=600&q=80',
  W3: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=600&q=80',
  W4: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80',
};

export const MOCKED_IDENTITIES = [
  { name: 'P1', color: '#4169E1', avatar: 'https://i.pravatar.cc/100?img=1' },
  { name: 'P2', color: '#FF8C00', avatar: 'https://i.pravatar.cc/100?img=11' },
  { name: 'P3', color: '#6A5ACD', avatar: 'https://i.pravatar.cc/100?img=12' },
  { name: 'P4', color: '#32CD32', avatar: 'https://i.pravatar.cc/100?img=13' },
  { name: 'P5', color: '#FF69B4', avatar: 'https://i.pravatar.cc/100?img=14' },
  { name: 'P6', color: '#FF4500', avatar: 'https://i.pravatar.cc/100?img=15' },
  { name: 'P7', color: '#00CED1', avatar: 'https://i.pravatar.cc/100?img=16' },
  { name: 'P8', color: '#9370DB', avatar: 'https://i.pravatar.cc/100?img=17' },
  { name: 'P9', color: '#F08080', avatar: 'https://i.pravatar.cc/100?img=18' },
  { name: 'P10', color: '#A9A9A9', avatar: 'https://i.pravatar.cc/100?img=19' },
  { name: 'P11', color: '#FFD700', avatar: 'https://i.pravatar.cc/100?img=20' },
];

export const MOCK_FRIENDS = [
  ...MOCKED_IDENTITIES.map((id, i) => ({
    id: String(i + 1),
    ...id
  })),
  ...Array.from({ length: 9 }).map((_, i) => ({
    id: String(i + 11),
    name: `P${i + 12}`,
    color: `hsl(${i * 63 + 200}, 70%, 65%)`,
    avatar: `https://i.pravatar.cc/100?img=${(i % 50) + 21}`
  }))
];

/** Collab Privacy Settings per friend (simulated user profile settings) */
export const COLLAB_PRIVACY: Record<string, { hideCollab?: boolean; anonymousCollab?: boolean }> = {
  'P2': { hideCollab: false, anonymousCollab: false },
  'P3': { anonymousCollab: true },  // P3 chọn Ẩn danh – hiển thị là "Someone"
  'P4': { hideCollab: true },        // P4 chọn Ẩn Collab hoàn toàn
  'P5': { hideCollab: false, anonymousCollab: false },
  'P6': { hideCollab: false, anonymousCollab: false },
};
