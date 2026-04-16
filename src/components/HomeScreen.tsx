import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PickedLocation } from './LocationPickerModal';
import LocationPickerModal from './LocationPickerModal';
import MapsArchiveView from './MapsArchiveView';

import { COLLAB_PRIVACY, MOCK_FRIENDS, MOCKED_IDENTITIES, getMonthlyChallengeConfig } from '../mockData';
import ChallengeModal from './ChallengeModal';
import { type ContextPhoto, type Message } from './ChatDetailScreen';
import HistoryFeed from './HistoryFeed';
import MemoryDetailModal from './MemoryDetailModal';
import MonthDetailModal from './MonthDetailModal';
import MessagesScreen, { type MessagesScreenHandle } from './MessagesScreen';

const HAS_NEW_CONTENT = true;
const UNREAD_MESSAGES = 1;

type NavTab = 'calendar' | 'home' | 'chat';

const TEXT_STYLES = [
  { label: 'Classic', family: "'Inter', sans-serif", size: 16, weight: 600, italic: false },
  { label: 'Bold', family: "'Inter', sans-serif", size: 18, weight: 900, italic: false },
  { label: 'Typewriter', family: "'Courier New', monospace", size: 15, weight: 500, italic: false },
  { label: 'Elegant', family: "Georgia, serif", size: 17, weight: 400, italic: true },
  { label: 'Handwriting', family: "'Comic Sans MS', cursive", size: 16, weight: 400, italic: false },
  { label: 'Impact', family: "Impact, sans-serif", size: 18, weight: 900, italic: false },
];
const VIEWFINDER_SIZE = 430;

// ─── HISTORY FEED DATA ───────────────────────────────────────────────────
export interface HistoryItem {
  id: string;
  image: string;
  caption: string | null;
  sender: string;            // 'You' or friend name
  senderColor: string;
  time: string;
  // Privacy-aware audience list (who can see this post)
  sendTo: string[];          // ['all'] means everyone; else list of names like 'P2','P3'
  // Multi-collab: list of collab partners with their own sendTo lists
  collabPartners?: Array<{
    name: string;
    color: string;
    avatar?: string;
    sendTo: string[];        // who THIS collab partner has in their audience
    hideCollab?: boolean;    // if true → hide collab on their side
    anonymousCollab?: boolean; // if true → show as 'Someone' on their side
  }>;
  captionEdited?: boolean;    // Flag to track if the caption has already been edited once
  date?: string;              // ISO date: "2026-04-12" — used by Memories wall
  isChallenge?: boolean;      // true if this photo was sent from a Challenge slot
  challengeTag?: string;      // e.g. "W1 - Buổi sáng"
  location?: {
    name: string;             // Display name e.g. "Quận 1, TP.HCM"
    mapX: number;             // 0–100 map x-position percentage
    mapY: number;             // 0–100 map y-position (0=north, 100=south)
  };
  // Reactions mapping: { userName: emoji }
  reactions?: Record<string, string>;
  // Who has actually viewed/opened this post (name → time string)
  viewedBy?: Record<string, string>;
  // ── Collab Request System ──
  collabStatus?: 'pending' | 'accepted';  // undefined = normal post
  collabInviter?: string;                  // who initiated the collab (name)
  collabInviterColor?: string;
  collabInviterAvatar?: string;
}

const INITIAL_HISTORY: HistoryItem[] = [
  {
    id: 'collab-1',
    image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800&q=80',
    caption: 'Collab 🔥',
    sender: 'P1',
    senderColor: '#4169E1',
    time: 'Just now',
    date: '2026-04-13',
    sendTo: ['P2', 'P3', 'P4', 'P5'],
    location: { name: 'Quận 1, TP.HCM', mapX: 65, mapY: 79 },
    collabStatus: 'accepted',
    collabInviter: 'P1',
    viewedBy: { 'P2': '1m ago', 'P3': '3m ago', 'P5': '10m ago' },
    collabPartners: [
      {
        name: 'P2',
        color: '#FF8C00',
        avatar: 'https://i.pravatar.cc/100?img=11',
        sendTo: ['P1', 'P3', 'P4', 'P5', 'P6'],
      },
      {
        name: 'P3',
        color: '#4169E1',
        avatar: 'https://i.pravatar.cc/100?img=12',
        sendTo: ['P1', 'P2', 'P4', 'P5'],
        anonymousCollab: true,
      },
    ]
  },
  {
    id: '1',
    image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&q=80',
    caption: 'Ngày buồn nhất trong năm',
    sender: 'P4',
    senderColor: '#32CD32',
    time: '1h',
    date: '2026-04-13',
    sendTo: ['all'],
    location: { name: 'Quận 3, TP.HCM', mapX: 64, mapY: 79 },
  },
  {
    id: '2',
    image: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&q=80',
    caption: null,
    sender: 'P1',
    senderColor: '#4169E1',
    time: '3h',
    date: '2026-04-12',
    sendTo: ['P2', 'P3', 'P5'],
    viewedBy: { 'P2': '2h ago', 'P5': '3h ago' },
  },
  {
    id: '3',
    image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800&q=80',
    caption: 'Chill cuối tuần 🌊',
    sender: 'P2',
    senderColor: '#FF8C00',
    time: '5h',
    date: '2026-04-12',
    sendTo: ['all'],
    location: { name: 'Vũng Tàu', mapX: 72, mapY: 84 },
  },
  {
    id: '4',
    image: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=800&q=80',
    caption: 'Ăn sáng nè',
    sender: 'P5',
    senderColor: '#FF69B4',
    time: 'Yesterday',
    date: '2026-04-08',
    sendTo: ['P2', 'P3', 'P4'],
    location: { name: 'Chợ Bến Thành, TP.HCM', mapX: 65, mapY: 79 },
    collabPartners: [
      {
        name: 'P4',
        color: '#32CD32',
        avatar: 'https://i.pravatar.cc/100?img=13',
        sendTo: ['all'],
        hideCollab: true,
      }
    ]
  },
  {
    id: '5',
    image: 'https://images.unsplash.com/photo-1488161628813-04466f872be2?w=800&q=80',
    caption: 'Cuộc sống mà 😌',
    sender: 'P6',
    senderColor: '#FF4500',
    time: '2d',
    date: '2026-04-05',
    sendTo: ['all'],
    location: { name: 'Quận 7, TP.HCM', mapX: 64, mapY: 81 },
  },
  // ── Collab Request (pending — P7 invited P1) ──
  {
    id: 'collab-req-1',
    image: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&q=80',
    caption: 'Weekend vibes 🌤',
    sender: 'P7',
    senderColor: '#00CED1',
    time: '3d',
    date: '2026-04-10',
    sendTo: ['P1', 'P3'],
    collabStatus: 'pending',
    collabInviter: 'P7',
    collabInviterColor: '#00CED1',
    collabInviterAvatar: 'https://i.pravatar.cc/100?img=16',
  },
  // ── Jan 2026 ──
  {
    id: 'm-jan-1',
    image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&q=80',
    caption: 'Cà phê sáng ☕',
    sender: 'P1', senderColor: '#4169E1', time: '5 Jan',
    date: '2026-01-05', sendTo: ['all'],
    location: { name: 'Thủ Đức, TP.HCM', mapX: 67, mapY: 77 },
  },
  {
    id: 'm-jan-2',
    image: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=800&q=80',
    caption: 'Hoàng hôn đẹp quá 🌅',
    sender: 'P2', senderColor: '#FF8C00', time: '10 Jan',
    date: '2026-01-10', sendTo: ['all'],
    location: { name: 'Vũng Tàu', mapX: 72, mapY: 84 },
  },
  {
    id: 'm-jan-3',
    image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80',
    caption: 'Street food ngon 🍜',
    sender: 'P1', senderColor: '#4169E1', time: '15 Jan',
    date: '2026-01-15', sendTo: ['P2', 'P3'],
    location: { name: 'Chợ Bến Thành, TP.HCM', mapX: 65, mapY: 79 },
  },
  {
    id: 'm-jan-4',
    image: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&q=80',
    caption: 'Tụ tập bạn bè 🎉',
    sender: 'P3', senderColor: '#6A5ACD', time: '20 Jan',
    date: '2026-01-20', sendTo: ['all'],
    location: { name: 'Quận 3, TP.HCM', mapX: 64, mapY: 79 },
  },
  {
    id: 'm-jan-5',
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80',
    caption: 'Biển Vũng Tàu 🏖️',
    sender: 'P1', senderColor: '#4169E1', time: '28 Jan',
    date: '2026-01-28', sendTo: ['all'],
    location: { name: 'Vũng Tàu', mapX: 72, mapY: 84 },
  },
  // ── Feb 2026 ──
  {
    id: 'm-feb-1',
    image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&q=80',
    caption: 'Tết về rồi 🧧',
    sender: 'P4', senderColor: '#32CD32', time: '1 Feb',
    date: '2026-02-01', sendTo: ['all'],
    location: { name: 'Quận 5, TP.HCM', mapX: 65, mapY: 80 },
  },
  {
    id: 'm-feb-2',
    image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80',
    caption: 'Sáng mùng 5 Tết ⛺',
    sender: 'P1', senderColor: '#4169E1', time: '5 Feb',
    date: '2026-02-05', sendTo: ['all'],
    location: { name: 'Đà Lạt', mapX: 62, mapY: 68 },
  },
  {
    id: 'm-feb-3',
    image: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&q=80',
    caption: 'Rừng thông Đà Lạt 🌲',
    sender: 'P2', senderColor: '#FF8C00', time: '10 Feb',
    date: '2026-02-10', sendTo: ['P1', 'P3'],
    location: { name: 'Đà Lạt', mapX: 62, mapY: 68 },
  },
  {
    id: 'm-feb-4',
    image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80',
    caption: 'Valentine dinner ❤️',
    sender: 'P5', senderColor: '#FF69B4', time: '14 Feb',
    date: '2026-02-14', sendTo: ['P1'],
    location: { name: 'Quận 1, TP.HCM', mapX: 65, mapY: 79 },
  },
  {
    id: 'm-feb-5',
    image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80',
    caption: 'Bữa sáng ngon 🥣',
    sender: 'P1', senderColor: '#4169E1', time: '22 Feb',
    date: '2026-02-22', sendTo: ['all'],
    location: { name: 'Thủ Đức, TP.HCM', mapX: 67, mapY: 77 },
  },
  // ── Mar 2026 ──
  {
    id: 'm-mar-1',
    image: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800&q=80',
    caption: 'Chạy bộ sáng 🏃',
    sender: 'P1', senderColor: '#4169E1', time: '3 Mar',
    date: '2026-03-03', sendTo: ['all'],
    location: { name: 'Thủ Đức, TP.HCM', mapX: 67, mapY: 77 },
  },
  {
    id: 'm-mar-2',
    image: 'https://images.unsplash.com/photo-1518895949257-7621c3c786d7?w=800&q=80',
    caption: 'Ngày Quốc tế Phụ nữ 🌹',
    sender: 'P3', senderColor: '#6A5ACD', time: '8 Mar',
    date: '2026-03-08', sendTo: ['all'],
    location: { name: 'Quận 1, TP.HCM', mapX: 65, mapY: 79 },
  },
  {
    id: 'm-mar-3',
    image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80',
    caption: 'Đi biển Mũi Né 🌊',
    sender: 'P2', senderColor: '#FF8C00', time: '12 Mar',
    date: '2026-03-12', sendTo: ['all'],
    location: { name: 'Mũi Né, Phan Thiết', mapX: 70, mapY: 74 },
  },
  {
    id: 'm-mar-4',
    image: 'https://images.unsplash.com/photo-1490730141103-6cac27aaab94?w=800&q=80',
    caption: 'Đà Nẵng đẹp quá 🏙️',
    sender: 'P1', senderColor: '#4169E1', time: '18 Mar',
    date: '2026-03-18', sendTo: ['P2', 'P3', 'P4'],
    location: { name: 'Đà Nẵng', mapX: 62, mapY: 44 },
  },
  {
    id: 'm-mar-5',
    image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80',
    caption: 'Quán ăn ngon 😋',
    sender: 'P4', senderColor: '#32CD32', time: '22 Mar',
    date: '2026-03-22', sendTo: ['all'],
    location: { name: 'Quận 1, TP.HCM', mapX: 65, mapY: 79 },
  },
  {
    id: 'm-mar-6',
    image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&q=80',
    caption: 'Cuối tuần chill 😎',
    sender: 'P1', senderColor: '#4169E1', time: '28 Mar',
    date: '2026-03-28', sendTo: ['all'],
    location: { name: 'Thủ Đức, TP.HCM', mapX: 67, mapY: 77 },
  },
  // ── Friend photos with location (for MapsArchiveView "All" filter) ──
  {
    id: 'f-loc-1',
    image: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800&q=80',
    caption: 'Cà phê Landmark 81 ☕',
    sender: 'Kiệt Tuấn', senderColor: 'hsl(220, 70%, 55%)', time: '2d',
    date: '2026-04-12', sendTo: ['all'],
    location: { name: 'Landmark 81', mapX: 52, mapY: 69 },
  },
  {
    id: 'f-loc-2',
    image: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=800&q=80',
    caption: 'Phố đi bộ 🎶',
    sender: 'Nguyên Trần', senderColor: 'hsl(200, 65%, 55%)', time: '3d',
    date: '2026-04-11', sendTo: ['all'],
    location: { name: 'Phố đi bộ Nguyễn Huệ', mapX: 65, mapY: 79 },
  },
  {
    id: 'f-loc-3',
    image: 'https://images.unsplash.com/photo-1488161628813-04466f872be2?w=800&q=80',
    caption: 'Nhà thờ Đức Bà 🕍',
    sender: 'Bảo Nguyễn', senderColor: 'hsl(340, 65%, 55%)', time: '5d',
    date: '2026-04-09', sendTo: ['all'],
    location: { name: 'Nhà thờ Đức Bà', mapX: 65, mapY: 78 },
  },
  {
    id: 'f-loc-4',
    image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80',
    caption: 'Bến Thành tấp nập 🍜',
    sender: 'trơn trunk kúc 🌻', senderColor: 'hsl(50, 70%, 55%)', time: '6d',
    date: '2026-04-08', sendTo: ['all'],
    location: { name: 'Chợ Bến Thành', mapX: 65, mapY: 79 },
  },
  {
    id: 'f-loc-5',
    image: 'https://images.unsplash.com/photo-1470115636492-6d2b56f9146d?w=800&q=80',
    caption: 'Vinhomes chill 🌿',
    sender: 'mây pé', senderColor: 'hsl(310, 60%, 55%)', time: '7d',
    date: '2026-04-07', sendTo: ['all'],
    location: { name: 'Vinhomes Central Park', mapX: 52, mapY: 70 },
  },
  {
    id: 'f-loc-6',
    image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80',
    caption: 'Crescent Mall dinner 🍽️',
    sender: 'Trang ✨', senderColor: 'hsl(350, 65%, 60%)', time: '8d',
    date: '2026-04-06', sendTo: ['all'],
    location: { name: 'Crescent Mall', mapX: 51, mapY: 80 },
  },
  {
    id: 'f-loc-7',
    image: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=800&q=80',
    caption: 'Mũi Né xanh 🌊',
    sender: 'Sóc Nhỏ', senderColor: 'hsl(90, 65%, 50%)', time: '10d',
    date: '2026-04-04', sendTo: ['all'],
    location: { name: 'Mũi Né, Phan Thiết', mapX: 70, mapY: 74 },
  },
  {
    id: 'f-loc-8',
    image: 'https://images.unsplash.com/photo-1490730141103-6cac27aaab94?w=800&q=80',
    caption: 'Đà Nẵng chill 🏖️',
    sender: 'Nyny 💕', senderColor: 'hsl(210, 70%, 60%)', time: '12d',
    date: '2026-04-02', sendTo: ['all'],
    location: { name: 'Đà Nẵng', mapX: 62, mapY: 44 },
  },
];
// Current viewer identity (internal ID)
const DEFAULT_VIEWER = 'P1';

/** Helper to resolve display name and check if a user is the viewer */
const getDisplayName = (name: string, viewerId: string) => {
  if (name === viewerId || (name === 'You' && viewerId === 'P1')) return 'You';
  return name;
};

const getIdentity = (name: string) => MOCKED_IDENTITIES.find(id => id.name === name) || { name, color: '#888', avatar: '' };

// ───────────────────────────────────────────────────────────────────────────

interface HomeScreenProps {
  navigateTo: (screen: string) => void;
  forceTab?: NavTab;
  forceHistoryIdx?: number;
  forceShowViewersModal?: boolean;
  forceViewersSnapPoint?: 'half' | 'full';
  forceViewersTab?: 'activity' | 'reactions';
  forceShowPreview?: boolean;
  forceCapturedImage?: string;
  forceCollabModal?: boolean;
  forceEmptyActivity?: boolean;
  forceShowGridModal?: boolean;
  forceShowFriendsModal?: boolean;
  forceMidDrag?: boolean;
  forceShowDetail?: boolean;
  forceChatName?: string;
  forceChatColor?: string;
  forceChatOptions?: boolean;
  forceSearchMode?: boolean;
  forceCaptionText?: string;
}

// -- Custom Components for UI Modernization --
interface ViewerRowProps {
  identity: { name: string; color: string; avatar?: string };
  reaction?: string;
  time: string;
  isSelf?: boolean;
  onReply?: () => void;
  onAddFriend?: () => void;
  isAdded?: boolean;
  hasViewed?: boolean;
  isSent?: boolean; // received but not viewed yet
}

const ViewerRow: React.FC<ViewerRowProps> = ({ identity, reaction, time, isSelf, onReply, onAddFriend, isAdded, isSent }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 14,
    padding: '12px 24px',
    width: '100%',
    boxSizing: 'border-box',
    borderBottom: '1px solid rgba(255,255,255,0.03)',
    background: isSelf ? 'rgba(255,215,0,0.03)' : 'transparent',
    transition: 'background 0.2s',
    position: 'relative',
    opacity: isSent ? 0.45 : 1,
  }}>
    {/* Avatar */}
    <div style={{
      width: 46, height: 46, borderRadius: '50%',
      backgroundColor: identity.color,
      backgroundImage: identity.avatar ? `url(${identity.avatar})` : 'none',
      backgroundSize: 'cover',
      boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
      border: '1.5px solid rgba(255,255,255,0.1)',
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      flexShrink: 0
    }}>
      {!identity.avatar && <span style={{ color: '#fff', fontSize: 16, fontWeight: 800 }}>{identity.name.charAt(0)}</span>}
    </div>

    {/* Name & Time */}
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ color: '#fff', fontSize: 16, fontWeight: 700 }}>{identity.name}</span>
        {isSelf && <span style={{ fontSize: 10, background: 'rgba(255,215,0,0.2)', color: '#FFD700', padding: '1px 6px', borderRadius: 6, fontWeight: 800 }}>YOU</span>}
        {onAddFriend && !isAdded && <span style={{ fontSize: 10, background: 'rgba(100,180,255,0.15)', color: '#64B4FF', padding: '1px 6px', borderRadius: 6, fontWeight: 700 }}>via Collab</span>}
      </div>
      <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, fontWeight: 500 }}>
        {isSent ? 'Sent · not yet viewed' : time}
      </span>
    </div>

    {/* Reaction & Action */}
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      {reaction ? (
        <div style={{
          fontSize: 22,
          animation: 'popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          background: 'rgba(255,255,255,0.06)',
          width: 38, height: 38, borderRadius: 12,
          display: 'flex', justifyContent: 'center', alignItems: 'center'
        }}>
          {reaction}
        </div>
      ) : onAddFriend ? (
        <button
          onClick={onAddFriend}
          style={{
            background: isAdded ? 'rgba(100,180,255,0.15)' : 'rgba(100,180,255,0.2)',
            borderRadius: 18, padding: '8px 14px',
            color: isAdded ? 'rgba(100,180,255,0.6)' : '#64B4FF',
            fontSize: 12, fontWeight: 800, cursor: isAdded ? 'default' : 'pointer',
            border: `1px solid ${isAdded ? 'rgba(100,180,255,0.2)' : 'rgba(100,180,255,0.35)'}`,
            transition: 'all 0.2s',
            display: 'flex', alignItems: 'center', gap: 5,
            whiteSpace: 'nowrap'
          }}
        >
          {isAdded ? (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="#64B4FF"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>
              Added
            </>
          ) : (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="#64B4FF"><path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></svg>
              Add Friend
            </>
          )}
        </button>
      ) : (
        !isSelf && onReply && !isSent && (
          <button
            onClick={onReply}
            style={{
              background: 'rgba(255,255,255,0.08)',
              borderRadius: 18, padding: '8px 16px',
              color: '#fff', fontSize: 12, fontWeight: 800, cursor: 'pointer',
              border: '1px solid rgba(255,255,255,0.1)',
              transition: 'all 0.2s'
            }}
          >
            Reply
          </button>
        )
      )}
    </div>
  </div>
);

// ── Memories Viewer Modal (CSS Scroll Snap, 60fps swipe) ──
const MemoriesViewerModal = ({ initialPhoto, historyItems, viewerIdentity, onClose }: { initialPhoto: HistoryItem; historyItems: HistoryItem[]; viewerIdentity: string; onClose: () => void }) => {
  const myMemories = useMemo(() => {
    return historyItems.filter((i) => {
      const isSender = i.sender === viewerIdentity || i.sender === 'You';
      const isPartner = i.collabPartners?.some(p => p.name === viewerIdentity || p.name === 'You');
      return (isSender || isPartner) && !!i.image;
    });
  }, [historyItems, viewerIdentity]);

  const [currentIndex, setCurrentIndex] = useState(() => {
    const idx = myMemories.findIndex((m) => m.id === initialPhoto.id);
    return idx !== -1 ? idx : 0;
  });

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      const width = scrollRef.current.offsetWidth;
      scrollRef.current.scrollTo({ left: currentIndex * width, behavior: 'instant' as ScrollBehavior });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const width = e.currentTarget.offsetWidth;
    const newIndex = Math.round(e.currentTarget.scrollLeft / width);
    if (newIndex !== currentIndex && newIndex >= 0 && newIndex < myMemories.length) {
      setCurrentIndex(newIndex);
    }
  };

  const currentItem = myMemories[currentIndex];
  const dateObj = currentItem?.date ? new Date(currentItem.date) : new Date();
  const yr = dateObj.getFullYear();
  const mo = dateObj.toLocaleDateString('en-US', { month: 'long' });
  const dy = dateObj.getDate();
  const suf = dy % 10 === 1 && dy !== 11 ? 'st' : dy % 10 === 2 && dy !== 12 ? 'nd' : dy % 10 === 3 && dy !== 13 ? 'rd' : 'th';

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 9500, backgroundColor: '#111', display: 'flex', flexDirection: 'column', animation: 'fadeInOverlay 0.2s ease-out' }}>
      {/* Header: [X]  year / Month Day  [share] */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px 12px', flexShrink: 0 }}>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: 4 }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
        </button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: 700 }}>{yr}</div>
          <div style={{ color: 'white', fontSize: 17, fontWeight: 900, letterSpacing: -0.3 }}>{mo} {dy}{suf}</div>
        </div>
        <button style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: 4, opacity: 0.6 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" /></svg>
        </button>
      </div>

      {/* Swipeable carousel — CSS Scroll Snap */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        style={{ flex: 1, display: 'flex', overflowX: 'auto', scrollSnapType: 'x mandatory', scrollbarWidth: 'none', touchAction: 'pan-x', WebkitOverflowScrolling: 'touch' }}
      >
        {myMemories.map((item) => (
          <div key={item.id} style={{ flex: '0 0 100%', width: '100%', scrollSnapAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 20px' }}>
            <div style={{ position: 'relative', width: '100%', aspectRatio: '1/1', borderRadius: 36, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)' }}>
              <img src={item.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              {item.caption && (
                <div style={{ position: 'absolute', bottom: 18, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
                  <div style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', padding: '9px 18px', borderRadius: 22, color: 'white', fontSize: 15, fontWeight: 700, maxWidth: '85%', textAlign: 'center' }}>{item.caption}</div>
                </div>
              )}
            </div>
            <div style={{ marginTop: 18, color: 'rgba(255,255,255,0.35)', fontSize: 15, fontWeight: 700, letterSpacing: 0.5 }}>
              {item.time || (item.date ? new Date(item.date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false }) : '')}
            </div>
          </div>
        ))}
      </div>

      {/* Thumbnails: show +-2 around current */}
      <div style={{ padding: '16px 0 36px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        {myMemories.map((item, idx) => {
          if (Math.abs(idx - currentIndex) > 2) return null;
          const isActive = idx === currentIndex;
          const size = isActive ? 56 : 42;
          return (
            <div key={item.id}
              onClick={() => { if (scrollRef.current) scrollRef.current.scrollTo({ left: idx * scrollRef.current.offsetWidth, behavior: 'smooth' }); }}
              style={{ width: size, height: size, borderRadius: 14, overflow: 'hidden', transition: 'all 0.3s cubic-bezier(0.19,1,0.22,1)', opacity: isActive ? 1 : 0.4, border: isActive ? '2px solid white' : '2px solid transparent', cursor: 'pointer', flexShrink: 0 }}
            >
              <img src={item.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default function HomeScreen({
  navigateTo,
  forceTab,
  forceHistoryIdx,
  forceShowViewersModal,
  forceViewersSnapPoint,
  forceViewersTab,
  forceShowPreview,
  forceCapturedImage,
  forceCollabModal,
  forceEmptyActivity,
  forceShowGridModal,
  forceChatOptions,
  forceShowFriendsModal,
  forceMidDrag,
  forceShowDetail,
  forceSearchMode,
  forceCaptionText,
  ...props
}: HomeScreenProps) {
  const { forceChatName, forceChatColor } = props;
  const [mode, setMode] = useState<'camera' | 'preview'>(forceShowPreview ? 'preview' : 'camera');
  const [capturedImage, setCapturedImage] = useState<string | null>(forceCapturedImage || null);

  const [flashOn, setFlashOn] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [focusPoint, setFocusPoint] = useState<{ x: number, y: number } | null>(null);
  const [fired, setFired] = useState(false);
  const [flashOv, setFlashOv] = useState(false);

  const [flipKey, setFlipKey] = useState(0);
  const [containerWidth, setContainerWidth] = useState(window.innerWidth > 500 ? 500 : window.innerWidth);

  useEffect(() => {
    const handleResize = () => {
      if (mainSliderRef.current) {
        setContainerWidth(mainSliderRef.current.getBoundingClientRect().width);
      } else {
        setContainerWidth(window.innerWidth > 500 ? 500 : window.innerWidth);
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize(); // Initial measure
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [activeTab, setActiveTab] = useState<NavTab>(() => {
    if (forceTab) return forceTab;
    const urlTab = new URLSearchParams(window.location.search).get('tab');
    if (urlTab === 'calendar' || urlTab === 'home' || urlTab === 'chat') return urlTab as NavTab;
    return 'home';
  });

  // ── URL PARAMETER SYNC ──
  useEffect(() => {
    // Prevent URL jitter in Showcase mode
    const isShowcase = new URLSearchParams(window.location.search).get('showcase') === 'true';
    if (isShowcase || forceTab || forceShowDetail) return;

    const url = new URL(window.location.href);
    const currentTab = url.searchParams.get('tab');
    if (currentTab !== activeTab) {
      url.searchParams.set('tab', activeTab);
      window.history.replaceState({}, '', url.pathname + url.search);
    }
  }, [activeTab]);
  // History thumbnail shows the latest friend's photo (not user's own)
  const [selectedImg, setSelectedImg] = useState<string | null>(
    INITIAL_HISTORY.find(item => item.sender !== DEFAULT_VIEWER && item.sender !== 'You')?.image ?? null
  );
  const [imageSource, setImageSource] = useState<'camera' | 'gallery'>(forceHistoryIdx !== undefined ? 'gallery' : 'camera');
  const [isCameraFlipping, setIsCameraFlipping] = useState(false);

  // ── DYNAMIC BACKGROUND SYNC ──
  useEffect(() => {
    const root = document.documentElement;
    if (activeTab === 'chat') {
      root.style.setProperty('--bg-top', '#000000');
      root.style.setProperty('--bg-mid', '#080808');
      root.style.setProperty('--bg-bottom', '#000000');
    } else if (activeTab === 'calendar') {
      root.style.setProperty('--bg-top', '#060e1b');
      root.style.setProperty('--bg-mid', '#0a1a32');
      root.style.setProperty('--bg-bottom', '#060e1b');
    } else {
      root.style.setProperty('--bg-top', '#0c5d5d');
      root.style.setProperty('--bg-mid', '#145580');
      root.style.setProperty('--bg-bottom', '#06122a');
    }
  }, [activeTab]);

  // Advanced Cropper State
  const [cropScale, setCropScale] = useState(1);
  const [cropPos, setCropPos] = useState({ x: 0, y: 0 });
  const [imgMeta, setImgMeta] = useState({ w: 0, h: 0, initialScale: 1 });
  const cropDragRef = useRef({
    isDragging: false,
    lastX: 0,
    lastY: 0,
    rafId: 0,
    vx: 0,
    vy: 0,
    lastTime: 0
  });

  // Camera hardware state
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facingModeState, setFacingModeState] = useState<'user' | 'environment'>('user');
  const [flipNextIsCW, setFlipNextIsCW] = useState(true);

  // Preview Mode State
  const [downloading, setDownloading] = useState(false);
  const [message, setMessage] = useState('');

  // Apply caption selected from CaptionsModal
  useEffect(() => {
    if (!forceCaptionText) return;
    setMessage(forceCaptionText);
    setMode('preview');
  }, [forceCaptionText]);

  // Swipeable compose area (0 = "Add a message", 1 = "Challenge", 2 = "Location")
  const [composePageIndex, setComposePageIndex] = useState(0);
  const [composeDragX, setComposeDragX] = useState(0);
  const composeSwipeRef = useRef({ active: false, startX: 0, lastX: 0, startTime: 0, hasMoved: false });
  const blockComposeClickRef = useRef(false);

  const handleComposePointerDown = (e: React.PointerEvent) => {
    composeSwipeRef.current = { active: true, startX: e.clientX, lastX: e.clientX, startTime: Date.now(), hasMoved: false };
  };

  const handleComposePointerMove = (e: React.PointerEvent) => {
    if (!composeSwipeRef.current.active) return;
    const delta = e.clientX - composeSwipeRef.current.startX;
    if (Math.abs(delta) > 8) {
      composeSwipeRef.current.hasMoved = true;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }
    setComposeDragX(delta);
    composeSwipeRef.current.lastX = e.clientX;
  };

  const handleComposePointerUp = (e: React.PointerEvent) => {
    if (!composeSwipeRef.current.active) return;
    composeSwipeRef.current.active = false;
    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);

    const delta = e.clientX - composeSwipeRef.current.startX;
    const time = Date.now() - composeSwipeRef.current.startTime;
    const velocity = delta / (time || 1);

    if (composeSwipeRef.current.hasMoved) {
      blockComposeClickRef.current = true;
      setTimeout(() => { blockComposeClickRef.current = false; }, 40);
    }

    let nextIndex = composePageIndex;
    if (Math.abs(delta) > 50 || Math.abs(velocity) > 0.5) {
      if (delta < 0 && composePageIndex < 2) nextIndex++;
      else if (delta > 0 && composePageIndex > 0) nextIndex--;
    }

    setComposePageIndex(nextIndex);
    setComposeDragX(0); // Transition handled by CSS
  };

  // Compute current challenge week from today's date
  const _today = new Date();
  const _currentMonth = _today.getMonth() + 1;
  const _currentDay = _today.getDate();
  const _currentWeekNum = _currentDay <= 7 ? 1 : _currentDay <= 14 ? 2 : _currentDay <= 21 ? 3 : 4;
  const _currentWeekTheme = getMonthlyChallengeConfig(_currentMonth)[_currentWeekNum - 1].theme;
  const _currentDayOfWeek = ((_currentDay - 1) % 7) + 1;

  // Missing mock state for preview compose area
  const [isRecordingPreview, setIsRecordingPreview] = useState(false);
  const [recordingTimePreview, setRecordingTimePreview] = useState(0);
  const [showStickerPickerPreview, setShowStickerPickerPreview] = useState(false);

  const toggleRecordingPreview = () => setIsRecordingPreview(!isRecordingPreview);
  const handleSendTextPreview = () => setMessage('');
  const handleSendHeartPreview = () => { };
  const handleSendStickerPreview = (s: string) => setShowStickerPickerPreview(false);

  const [isAllSelected, setIsAllSelected] = useState(true);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [textStyle] = useState(0); // index into TEXT_STYLES
  const [isCollabModalOpen, setIsCollabModalOpen] = useState(forceCollabModal || false);
  const [selectedCollabFriends, setSelectedCollabFriends] = useState<string[]>([]);
  const [isSendingCollab, setIsSendingCollab] = useState(false);
  const [collabSyncTarget, setCollabSyncTarget] = useState<string | null>(null);
  const [collabSearch, setCollabSearch] = useState('');
  const [sheetOffset, setSheetOffset] = useState(0);
  const [isSheetDragging, setIsSheetDragging] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showAiCaptions, setShowAiCaptions] = useState(false);
  const [aiCaptionLoading, setAiCaptionLoading] = useState(false);
  const [aiCaptionSuggestions, setAiCaptionSuggestions] = useState<string[]>([]);

  // Perspective / Identity Simulation
  const [viewerIdentity, setViewerIdentity] = useState(DEFAULT_VIEWER);
  // History state to allow "Delete Collab" and dynamic filtering
  const [historyItems, setHistoryItems] = useState(INITIAL_HISTORY);
  const [currentHistoryIdx, setCurrentHistoryIdx] = useState(forceHistoryIdx ?? -1);

  // -- Activity Reply State --
  const [repliedViewer, setRepliedViewer] = useState<{ name: string; reaction: string; identity: any } | null>(null);

  const isFriend = (name: string) => {
    if (name === 'You' || name === viewerIdentity) return true;
    return MOCK_FRIENDS.some(f => f.name === name);
  };

  const sortAvatars = (partners: any[], viewerId: string) => {
    return [...partners].sort((a, b) => {
      const aIsMe = a.name === viewerId || a.name === 'You';
      const bIsMe = b.name === viewerId || b.name === 'You';
      if (aIsMe) return -1;
      if (bIsMe) return 1;

      const aIsFriend = MOCK_FRIENDS.some(f => f.name === a.name);
      const bIsFriend = MOCK_FRIENDS.some(f => f.name === b.name);
      if (aIsFriend && !bIsFriend) return -1;
      if (!aIsFriend && bIsFriend) return 1;

      return 0;
    });
  };

  // ── MESSAGING SHARED STATE ──
  const [allChats, setAllChats] = useState<Record<string, Message[]>>({
    'P2': [
      { id: '1', type: 'text', content: 'Hey! Did you see the photo?', sender: 'other', timestamp: '10:02 AM', timestampNum: Date.now() - 1000 * 60 * 60 * 14 },
      { id: '2', type: 'text', content: 'Yeah, looks awesome! 🔥', sender: 'me', timestamp: '10:05 AM', status: 'read', timestampNum: Date.now() - 1000 * 60 * 60 * 14 + 180000 },
      { id: '3', type: 'text', content: 'Vừa chụp lúc nãy à?', sender: 'other', timestamp: '10:06 AM', contextPhoto: { url: INITIAL_HISTORY[0].image, caption: INITIAL_HISTORY[0].caption }, timestampNum: Date.now() - 1000 * 60 * 60 * 14 + 240000 },
      { id: '4', type: 'voice', content: 'Voice Message', sender: 'other', timestamp: '10:07 AM', voiceDuration: '0:12', contextPhoto: { url: INITIAL_HISTORY[0].image, caption: INITIAL_HISTORY[0].caption }, timestampNum: Date.now() - 1000 * 60 * 60 * 14 + 300000 },
      { id: '5', type: 'text', content: 'Gửi cho tao bản gốc với nhé', sender: 'other', timestamp: '10:08 AM', contextPhoto: { url: INITIAL_HISTORY[0].image, caption: INITIAL_HISTORY[0].caption }, timestampNum: Date.now() - 1000 * 60 * 60 * 14 + 360000 },
    ]
  });
  const [unreadChats, setUnreadChats] = useState<Set<string>>(new Set(['P2']));

  const handleMarkAsRead = (name: string) => {
    if (unreadChats.has(name)) {
      setUnreadChats(prev => {
        const next = new Set(prev);
        next.delete(name);
        return next;
      });
    }
  };

  // -- Messaging Logic --
  const handleSendHeart = (targetName: string, context?: ContextPhoto) => {
    // Reactions from history no longer enter the chat list.
    // Instead, we update the current history item's reactions state.
    if (currentHistoryIdx >= 0 && historyItems[currentHistoryIdx]) {
      const itemId = historyItems[currentHistoryIdx].id;
      setHistoryItems(prev => prev.map(item =>
        item.id === itemId
          ? { ...item, reactions: { ...(item.reactions || {}), [viewerIdentity]: '❤️' } }
          : item
      ));
    }

    // Also add to chat if we have a target
    if (targetName) {
      const newMessage: Message = {
        id: Date.now().toString(),
        type: 'text',
        content: '❤️',
        sender: 'me',
        status: 'sent',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestampNum: Date.now(),
        contextPhoto: context
      };
      setAllChats(prev => ({
        ...prev,
        [targetName]: [...(prev[targetName] || []), newMessage]
      }));
    }

    spawnParticles('❤️');
  };

  const handleSendSticker = (targetName: string, emoji: string, context?: ContextPhoto) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      type: 'text',
      content: emoji,
      sender: 'me',
      status: 'sent',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timestampNum: Date.now(),
      contextPhoto: context
    };
    setAllChats(prev => ({
      ...prev,
      [targetName]: [...(prev[targetName] || []), newMessage]
    }));
    spawnParticles(emoji);
  };

  const handleSendVoice = (targetName: string, duration: string, context?: ContextPhoto) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      type: 'voice',
      content: duration,
      sender: 'me',
      status: 'sent',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timestampNum: Date.now(),
      contextPhoto: context
    };
    setAllChats(prev => ({
      ...prev,
      [targetName]: [...(prev[targetName] || []), newMessage]
    }));
    spawnParticles(
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFC800" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="22" />
      </svg>
    );
  };

  const handleSendTextMessage = (targetName: string, text: string, context?: ContextPhoto) => {
    if (!text.trim()) return;
    const newMessage: Message = {
      id: Date.now().toString(),
      type: 'text',
      content: text,
      sender: 'me',
      status: 'sent',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timestampNum: Date.now(),
      contextPhoto: context
    };
    setAllChats(prev => ({
      ...prev,
      [targetName]: [...(prev[targetName] || []), newMessage]
    }));
    spawnParticles(
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFC800" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    );
  };

  const handleSendHistoryReply = (text: string) => {
    if (!repliedViewer || !text.trim()) return;
    const currentItem = historyItems[currentHistoryIdx];
    if (!currentItem) return;

    const targetName = repliedViewer.name;
    const newMessage: Message = {
      id: Date.now().toString(),
      type: 'text',
      content: text,
      sender: 'me',
      status: 'sent',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timestampNum: Date.now(),
      replyToReact: {
        icon: repliedViewer.reaction,
        imageUrl: currentItem.image
      },
      contextPhoto: {
        url: currentItem.image,
        caption: currentItem.caption,
        collabs: currentItem.collabPartners
      }
    };

    setAllChats(prev => ({
      ...prev,
      [targetName]: [...(prev[targetName] || []), newMessage]
    }));
    spawnParticles(repliedViewer.reaction);
    setRepliedViewer(null);
    setShowViewersModal(false);
    // Giữ nguyên màn hình hiện tại — không chuyển sang tab chat
  };
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [historyStickerPickerId, setHistoryStickerPickerId] = useState<string | null>(null);

  const cyclePerspective = () => {
    const ids = ['P1', 'P2', 'P3', 'P5'];
    const next = ids[(ids.indexOf(viewerIdentity) + 1) % ids.length];
    setViewerIdentity(next);
  };

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000 * 60);
    return () => clearInterval(timer);
  }, []);

  const sheetDragRef = useRef({ isDown: false, startY: 0, lastY: 0, lastT: 0, vel: 0 });

  const navPillRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastSelectedIdRef = useRef<string>('all');

  // Horizontal Scroll Physics State
  const hScrollRef = useRef<HTMLDivElement>(null);
  const allButtonRef = useRef<HTMLDivElement>(null);

  // Auto-center "All" in the audience carousel when entering preview
  useEffect(() => {
    if (mode === 'preview' && allButtonRef.current) {
      setTimeout(() => {
        allButtonRef.current?.scrollIntoView({ behavior: 'auto', inline: 'center', block: 'nearest' });
      }, 50);
    }
  }, [mode]);

  // Custom Drag Quán Tính (Cho phép vuốt cực mượt trên máy tính như thật)
  const hDragState = useRef({
    isDown: false,
    startX: 0, startY: 0,
    scrollL: 0,
    vel: 0, raf: 0,
    lastX: 0, lastT: 0,
    directionLocked: 'none' as 'none' | 'horizontal' | 'vertical' | 'prevented',
    hasMoved: false
  });
  const blockFriendClickRef = useRef(false);

  const hSetDown = (e: React.PointerEvent) => {
    if (!hScrollRef.current) return;

    hDragState.current.isDown = true;
    hDragState.current.startX = e.pageX;
    hDragState.current.startY = e.pageY;
    hDragState.current.scrollL = hScrollRef.current.scrollLeft;
    hDragState.current.lastX = e.pageX;
    hDragState.current.lastT = Date.now();
    hDragState.current.directionLocked = 'none';
    hDragState.current.vel = 0;
    hDragState.current.hasMoved = false;

    cancelAnimationFrame(hDragState.current.raf);
  };

  const hSetMove = (e: React.PointerEvent) => {
    if (!hScrollRef.current || !hDragState.current.isDown) return;

    const dx = e.pageX - hDragState.current.startX;
    const dy = e.pageY - hDragState.current.startY;

    // --- ANGLE DETECTION & AXIS LOCKING ---
    if (hDragState.current.directionLocked === 'none') {
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return; // Wait for enough movement

      const angle = Math.abs(Math.atan2(dy, dx) * 180 / Math.PI);
      // Lock horizontal if angle is shallow (< 40 degrees)
      if (angle < 40 || angle > 140) {
        hDragState.current.directionLocked = 'horizontal';
      } else {
        hDragState.current.directionLocked = 'prevented'; // Mostly vertical swipe, ignore
        hDragState.current.isDown = false;
        return;
      }
    }

    if (hDragState.current.directionLocked !== 'horizontal') return;

    if (Math.abs(dx) > 10) hDragState.current.hasMoved = true;

    // Capture pointer to ensure smooth drag even if leaving the div
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

    const now = Date.now();
    const dt = Math.max(1, now - hDragState.current.lastT);
    const instantaneousVel = (hDragState.current.lastX - e.pageX) / dt;

    // Low-pass filter for smooth velocity tracking
    hDragState.current.vel = hDragState.current.vel * 0.4 + instantaneousVel * 0.6;
    hDragState.current.lastX = e.pageX;
    hDragState.current.lastT = now;

    let newScroll = hDragState.current.scrollL - dx;

    // ELASTIC RUBBER BANDING
    const maxScroll = hScrollRef.current.scrollWidth - hScrollRef.current.clientWidth;
    if (newScroll < 0) {
      newScroll = rubberBand(newScroll, 200, 0.4);
    } else if (newScroll > maxScroll) {
      newScroll = maxScroll + rubberBand(newScroll - maxScroll, 200, 0.4);
    }

    hScrollRef.current.scrollLeft = newScroll;
  };

  const hSetUp = (e: React.PointerEvent) => {
    if (!hDragState.current.isDown || !hScrollRef.current) return;
    hDragState.current.isDown = false;

    if (hDragState.current.hasMoved) {
      blockFriendClickRef.current = true;
      setTimeout(() => { blockFriendClickRef.current = false; }, 40);
    }

    (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);

    const scrollEl = hScrollRef.current;
    let velocity = hDragState.current.vel * 16;

    // PREMIUM DRIFT: Lower friction for a "heavy mass" drifting feel
    const friction = 0.978;
    const stiffness = 85;   // Softer snap
    const damping = 28;    // Higher damping for magnetic settle

    const runInertia = () => {
      if (hDragState.current.isDown || !scrollEl) return;

      // MOMENTUM PHASE (Gliding)
      scrollEl.scrollLeft += velocity;
      velocity *= friction;

      const maxScroll = scrollEl.scrollWidth - scrollEl.clientWidth;

      // Transition to SNAPPING PHASE when very slow (Allows for long drifts)
      if (Math.abs(velocity) < 1.0) {
        const items = scrollEl.querySelectorAll('.h-item');
        let closestX = scrollEl.scrollLeft;
        let minDiff = Infinity;
        const centerX = scrollEl.scrollLeft + scrollEl.clientWidth / 2;

        items.forEach((item: any) => {
          const itemCenter = item.offsetLeft + item.clientWidth / 2;
          const diff = Math.abs(centerX - itemCenter);
          if (diff < minDiff) {
            minDiff = diff;
            closestX = itemCenter - scrollEl.clientWidth / 2;
          }
        });

        const force = -stiffness * (scrollEl.scrollLeft - closestX) - damping * velocity;
        velocity += force * 0.016;

        if (Math.abs(scrollEl.scrollLeft - closestX) < 0.2 && Math.abs(velocity) < 0.2) {
          scrollEl.scrollLeft = closestX;
          return;
        }
      }

      // ELASTIC BOUNCE
      if (scrollEl.scrollLeft < 0) {
        const bounceForce = -400 * scrollEl.scrollLeft - 40 * velocity;
        velocity += bounceForce * 0.016;
      } else if (scrollEl.scrollLeft > maxScroll) {
        const bounceForce = -400 * (scrollEl.scrollLeft - maxScroll) - 40 * velocity;
        velocity += bounceForce * 0.016;
      }

      hDragState.current.raf = requestAnimationFrame(runInertia);
    };

    hDragState.current.raf = requestAnimationFrame(runInertia);
  };

  const tabs: NavTab[] = ['calendar', 'home', 'chat'];
  const [isChatDetailOpen, setIsChatDetailOpen] = useState(false);
  const historyFeedRef = useRef<HTMLDivElement>(null);
  const homeSlideRef = useRef<HTMLDivElement>(null);
  const inHistoryFromForce = forceHistoryIdx !== undefined && forceHistoryIdx >= 0;
  const [isInHistory, setIsInHistory] = useState(inHistoryFromForce);
  const [showViewersModal, setShowViewersModal] = useState(forceShowViewersModal || false);
  const [showSharePanel, setShowSharePanel] = useState(false);
  const [showGridModal, setShowGridModal] = useState(forceShowGridModal || false);
  const [viewersSheetOffset, setViewersSheetOffset] = useState(0);
  const [historyFilter, setHistoryFilter] = useState('Everyone');
  const [showHistoryFilterModal, setShowHistoryFilterModal] = useState(false);

  // — Module 4: Non-friend viewers (arrived via collab audience expansion) —
  const NON_FRIEND_VIEWERS = [
    { id: 'nf-1', name: 'Alex', color: '#E06C75', avatar: 'https://i.pravatar.cc/100?img=33', time: '12m ago', hideFromNonFriends: false },
    { id: 'nf-2', name: 'Minh', color: '#56B6C2', avatar: 'https://i.pravatar.cc/100?img=37', time: '25m ago', hideFromNonFriends: true },
    { id: 'nf-3', name: 'Linh', color: '#C678DD', avatar: 'https://i.pravatar.cc/100?img=44', time: '1h ago', hideFromNonFriends: false },
  ];
  const [addedFriends, setAddedFriends] = useState<Set<string>>(new Set());

  // --- New Particle System for Floating bubbles ---
  interface Particle {
    id: string;
    x: number;
    delay: number;
    icon: string | React.ReactNode;
    size: number;
  }
  const [particles, setParticles] = useState<Particle[]>([]);

  const spawnParticles = (icon: string | React.ReactNode, count: number = 6) => {
    const newParticles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      newParticles.push({
        id: Math.random().toString(36).substr(2, 9),
        x: 20 + Math.random() * 60, // random horizontal position 20% to 80%
        delay: Math.random() * 0.5,
        icon,
        size: 24 + Math.random() * 16
      });
    }
    setParticles(prev => [...prev, ...newParticles]);
    // Clean up after animation duration (2s + max 0.5s delay)
    setTimeout(() => {
      setParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id)));
    }, 3000);
  };
  const [isViewersDragging, setIsViewersDragging] = useState(false);
  const [viewersSnapPoint, setViewersSnapPoint] = useState<'half' | 'full'>(forceViewersSnapPoint || 'half');
  const [activeViewersTab, setActiveViewersTab] = useState<'activity' | 'reactions'>(forceViewersTab || 'activity');
  const [isFriendsModalOpen, setIsFriendsModalOpen] = useState(forceShowFriendsModal || false);
  const viewersDragRef = useRef({ isDown: false, startY: 0, lastY: 0, lastT: 0, vel: 0 });

  // — Deep-link state for replies from Activity —
  const [activeReplyEmoji, setActiveReplyEmoji] = useState<string | undefined>(undefined);
  const [activeReplyContext, setActiveReplyContext] = useState<any>(undefined);
  const [deepLinkChatName, setDeepLinkChatName] = useState<string | undefined>(undefined);
  const [deepLinkChatColor, setDeepLinkChatColor] = useState<string | undefined>(undefined);

  // ── Challenge & Memories state ──
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  const [challengeImages, setChallengeImages] = useState<Record<string, string>>({});
  // Tự động chọn thử thách hôm nay (14/04/2026 -> Tháng 4, Tuần 2, Ngày 7)
  const [activeChallengeSlot, setActiveChallengeSlot] = useState<{
    week: 'W1' | 'W2' | 'W3' | 'W4'; dayIndex: number; theme: string; month: number;
  } | null>({ month: 4, week: 'W2', dayIndex: 6, theme: 'Thiên nhiên' });
  const [showMemoryDetail, setShowMemoryDetail] = useState(false);
  const [showMapView, setShowMapView] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<PickedLocation | null>(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [selectedCalendarPhoto, setSelectedCalendarPhoto] = useState<HistoryItem | null>(null);
  const [showMonthDetail, setShowMonthDetail] = useState<{ month: number; year: number } | null>(null);

  // Caption pages — at function scope so handleSend can reference them
  const captionPages = [
    { emoji: 'Aa', label: 'Text', bg: '#2C2C2E', textColor: 'white', fw: 800 },
    { emoji: '⭐', label: 'Review', bg: '#2C2C2E', textColor: 'white', fw: 700 },
    { emoji: '🎵', label: 'Now Playing', bg: '#2C2C2E', textColor: 'white', fw: 700 },
    { emoji: '📍', label: selectedLocation ? selectedLocation.name : 'Location', bg: selectedLocation ? 'linear-gradient(135deg,#1a7a5e,#0f5c45)' : '#2C2C2E', textColor: 'white', fw: 700, isLocation: true },
    { emoji: '☀️', label: 'Weather', bg: 'linear-gradient(135deg,#4DB6FF,#007DFF)', textColor: 'white', fw: 700, shadow: '0 4px 12px rgba(0,125,255,0.3)' },
    { emoji: '🕒', label: '9:39 PM', bg: '#2C2C2E', textColor: 'white', fw: 700 },
    { emoji: '🔥', label: '2', bg: 'linear-gradient(135deg,#FFD500,#FF9900)', textColor: '#333', fw: 800, shadow: '0 4px 12px rgba(255,153,0,0.3)' },
    { emoji: '🪩', label: 'Party Time!', bg: 'linear-gradient(90deg,#99FF99,#FFFF66)', textColor: '#111', fw: 800, shadow: '0 4px 12px rgba(153,255,153,0.2)' },
    { emoji: '🌙', label: 'Goodnight', bg: 'linear-gradient(135deg,#6B46C1,#312E81)', textColor: 'white', fw: 700, shadow: '0 4px 12px rgba(107,70,193,0.3)' },
    { emoji: '🕶️', label: 'OOTD', bg: '#F2F2F7', textColor: '#1C1C1E', fw: 800 },
    { emoji: '🥰', label: 'Miss you', bg: 'linear-gradient(135deg,#FF453A,#FF3B30)', textColor: 'white', fw: 800, shadow: '0 4px 12px rgba(255,59,48,0.3)' },
  ] as const;

  const [activeCollabDetailId, setActiveCollabDetailId] = useState<string | null>(null);
  const [editingCaptionId, setEditingCaptionId] = useState<string | null>(null);
  const [pendingCaption, setPendingCaption] = useState('');


  // Fix 3: Discard pending caption edit khi user scroll sang ảnh khác
  useEffect(() => {
    setEditingCaptionId(null);
    setPendingCaption('');
  }, [currentHistoryIdx]);

  const handleHomeVerticalScroll = useCallback(() => {
    if (!homeSlideRef.current) return;
    const el = homeSlideRef.current;
    const h = el.clientHeight;
    const scrollY = el.scrollTop;
    const pageIdx = Math.round(scrollY / h);
    const inHistory = pageIdx >= 1;
    setIsInHistory(inHistory);
    setCurrentHistoryIdx(inHistory ? pageIdx - 1 : -1);
  }, []);

  const bnavDOMRef = useRef<HTMLDivElement>(null);
  const headerDOMRef = useRef<HTMLDivElement>(null);

  const handleDetailProgress = (prog: number) => {
    const opacity = 1 - prog;
    const ty = prog * 20;

    if (bnavDOMRef.current) {
      bnavDOMRef.current.style.opacity = String(opacity);
      bnavDOMRef.current.style.transform = `translateY(${ty}px)`;
      bnavDOMRef.current.style.pointerEvents = prog > 0.5 ? 'none' : 'auto';
    }
    if (headerDOMRef.current) {
      headerDOMRef.current.style.opacity = String(opacity);
    }
  };

  const scrollToHistory = () => {
    if (homeSlideRef.current) {
      const h = homeSlideRef.current.getBoundingClientRect().height;
      homeSlideRef.current.scrollTo({
        top: h,
        behavior: 'smooth'
      });
    }
  };
  const messagesRef = useRef<MessagesScreenHandle>(null);
  const isProgrammaticScroll = useRef(false);
  const isInitialMount = useRef(true);

  const rollcallBtnRef = useRef<HTMLButtonElement>(null);
  const mapBtnRef = useRef<HTMLButtonElement>(null);
  const friendsBtnRef = useRef<HTMLButtonElement>(null);
  const titleTextRef = useRef<HTMLHeadingElement>(null);

  const hwZoomRange = useRef<{ min: number; max: number }>({ min: 0.5, max: 6 });

  // TikTok Header Refs
  const histTabRef = useRef<HTMLButtonElement>(null);
  const homeTabRef = useRef<HTMLButtonElement>(null);
  const chatTabRef = useRef<HTMLButtonElement>(null);
  const topTabsIndicatorRef = useRef<HTMLDivElement>(null);

  const switchTab = (tab: NavTab) => {
    const targetIdx = tabs.indexOf(tab);

    if (indicatorRef.current) {
      indicatorRef.current.style.transition = 'transform 0.4s cubic-bezier(0.19, 1, 0.22, 1)';
      indicatorRef.current.style.transform = `translateX(${targetIdx * 52}px)`;
    }

    if (tab === activeTab && !isProgrammaticScroll.current) return;

    isProgrammaticScroll.current = true;
    setActiveTab(tab);

    if (mainSliderRef.current) {
      const container = mainSliderRef.current;
      const width = container.offsetWidth;

      container.style.scrollSnapType = 'none';

      container.scrollTo({
        left: targetIdx * width,
        behavior: 'smooth'
      });
    }

    setTimeout(() => {
      isProgrammaticScroll.current = false;
      if (mainSliderRef.current) {
        mainSliderRef.current.style.scrollSnapType = 'x mandatory';
      }
      const isHome = tab === 'home';
      const friendsO = isHome ? '1' : '0';
      const friendsSc = isHome ? 'scale(1)' : 'scale(0.82)';

      const isCalendar = tab === 'calendar';
      const mapO = isCalendar ? '1' : '0';
      const mapSc = isCalendar ? 'scale(1)' : 'scale(0.8)';

      if (friendsBtnRef.current) {
        friendsBtnRef.current.style.opacity = friendsO;
        friendsBtnRef.current.style.transform = friendsSc;
      }
      if (rollcallBtnRef.current) {
        rollcallBtnRef.current.style.opacity = friendsO;
        rollcallBtnRef.current.style.transform = isHome ? 'scale(1)' : 'scale(0.8)';
      }
      if (mapBtnRef.current) {
        mapBtnRef.current.style.opacity = mapO;
        mapBtnRef.current.style.transform = mapSc;
      }
      const titleO = isHome ? '0' : '1';
      const titleSc = isHome ? 'scale(0.78)' : 'scale(1)';
      if (titleTextRef.current) {
        titleTextRef.current.style.opacity = titleO;
        titleTextRef.current.style.transform = titleSc;
      }
    }, 450);
  };

  const rubberBand = (distance: number, dimension: number, constant: number = 0.55) => {
    const sign = distance < 0 ? -1 : 1;
    const absDist = Math.abs(distance);
    return sign * (absDist * dimension * constant) / (dimension + constant * absDist);
  };

  const scrollLockState = useRef({
    isVerticalDragging: false,
    isHorizontalDragging: false,
  });

  const mainDragState = useRef({

    isDown: false,
    direction: 'none' as 'none' | 'horizontal' | 'vertical',
    startX: 0,
    startY: 0,
    startScrollL: 0,
    startScrollT: 0,
    lastX: 0,
    lastY: 0,
    lastTime: 0,
    velX: 0,
    velY: 0,
    snapWidth: 0,
    snapHeight: 0,

    raf: 0,
    alignRAF: 0,

    isDraggingTab: false,
    tabStartScrollL: 0,
    tabStartX: 0
  });

  const handleMainPointerDown = (e: React.PointerEvent) => {
    if (!mainSliderRef.current || mode === 'preview' || isChatDetailOpen) return;
    if ((e.target as HTMLElement).closest('.bnav-pill')) return;
    // Bỏ JS Physics cho thiết bị cảm ứng để tận dụng Native CSS Scroll Snap mượt mà nhất
    if (e.pointerType !== 'mouse') return;

    const el = mainSliderRef.current;
    const vertEl = homeSlideRef.current;

    mainDragState.current.isDown = true;
    mainDragState.current.direction = 'none';
    mainDragState.current.startX = e.pageX;
    mainDragState.current.startY = e.pageY;
    mainDragState.current.startScrollL = el.scrollLeft;
    mainDragState.current.startScrollT = vertEl ? vertEl.scrollTop : 0;
    mainDragState.current.lastX = e.pageX;
    mainDragState.current.lastY = e.pageY;
    mainDragState.current.lastTime = Date.now();
    mainDragState.current.velX = 0;
    mainDragState.current.velY = 0;
    mainDragState.current.snapWidth = el.getBoundingClientRect().width;
    mainDragState.current.snapHeight = vertEl ? vertEl.clientHeight : 0;

    el.style.scrollSnapType = 'none';
    el.style.scrollBehavior = 'auto';
    if (vertEl) {
      vertEl.style.scrollSnapType = 'none';
      vertEl.style.scrollBehavior = 'auto';
    }
    if (indicatorRef.current) indicatorRef.current.style.transition = 'none';
    if (bgOverlayRef.current) bgOverlayRef.current.style.transition = 'none';

    cancelAnimationFrame(mainDragState.current.raf);

    const onMove = (ev: PointerEvent) => {
      if (!mainDragState.current.isDown) return;

      const now = Date.now();
      const dt = Math.max(1, now - mainDragState.current.lastTime);
      const dx = ev.pageX - mainDragState.current.lastX;
      const dy = ev.pageY - mainDragState.current.lastY;

      mainDragState.current.velX = -dx / dt;
      mainDragState.current.velY = -dy / dt;
      mainDragState.current.lastX = ev.pageX;
      mainDragState.current.lastY = ev.pageY;
      mainDragState.current.lastTime = now;

      const totalDx = ev.pageX - mainDragState.current.startX;
      const totalDy = ev.pageY - mainDragState.current.startY;

      if (mainDragState.current.direction === 'none') {
        if (Math.abs(totalDx) < 12 && Math.abs(totalDy) < 12) return;

        if (Math.abs(totalDx) >= Math.abs(totalDy)) {
          mainDragState.current.direction = 'horizontal';
          scrollLockState.current.isHorizontalDragging = true;
          if (homeSlideRef.current) homeSlideRef.current.style.pointerEvents = 'none';
        } else {
          if (activeTab !== 'home' || !homeSlideRef.current) {
            mainDragState.current.isDown = false;
            restoreScrollers();
            return;
          }
          mainDragState.current.direction = 'vertical';
          scrollLockState.current.isVerticalDragging = true;
          if (mainSliderRef.current) mainSliderRef.current.style.pointerEvents = 'none';
        }
      }

      // — HORIZONTAL DRAG —
      if (mainDragState.current.direction === 'horizontal' && mainSliderRef.current) {
        const width = mainDragState.current.snapWidth || mainSliderRef.current.offsetWidth;
        const maxScroll = mainSliderRef.current.scrollWidth - mainSliderRef.current.offsetWidth;
        let newLeft = mainDragState.current.startScrollL - totalDx;

        if (newLeft < 0) newLeft = rubberBand(newLeft, width);
        else if (newLeft > maxScroll) newLeft = maxScroll + rubberBand(newLeft - maxScroll, width);

        mainSliderRef.current.scrollLeft = newLeft;
      }

      // — VERTICAL DRAG —
      if (mainDragState.current.direction === 'vertical' && homeSlideRef.current) {
        const h = mainDragState.current.snapHeight || homeSlideRef.current.clientHeight;
        const maxScroll = homeSlideRef.current.scrollHeight - homeSlideRef.current.clientHeight;
        let newTop = mainDragState.current.startScrollT - totalDy;

        if (newTop < 0) newTop = rubberBand(newTop, h);
        else if (newTop > maxScroll) newTop = maxScroll + rubberBand(newTop - maxScroll, h);

        homeSlideRef.current.scrollTop = newTop;
      }
    };

    const restoreScrollers = () => {
      scrollLockState.current.isHorizontalDragging = false;
      scrollLockState.current.isVerticalDragging = false;
      if (bgOverlayRef.current) bgOverlayRef.current.style.transition = 'opacity 0.28s ease-out';
      if (mainSliderRef.current) {
        mainSliderRef.current.style.pointerEvents = 'auto';
        mainSliderRef.current.style.scrollSnapType = 'x mandatory';
      }
      if (homeSlideRef.current) {
        homeSlideRef.current.style.pointerEvents = 'auto';
        homeSlideRef.current.style.scrollSnapType = 'y mandatory';
      }
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      if (!mainDragState.current.isDown) return;
      mainDragState.current.isDown = false;

      const dir = mainDragState.current.direction;

      // — SNAP HORIZONTAL —
      if (dir === 'horizontal' && mainSliderRef.current) {
        const width = mainDragState.current.snapWidth || mainSliderRef.current.getBoundingClientRect().width;
        const startScroll = mainDragState.current.startScrollL;
        const currentScroll = mainSliderRef.current.scrollLeft;
        const deltaX = currentScroll - startScroll;
        const startIndex = Math.round(startScroll / width);
        let step = 0;

        if (Math.abs(deltaX) > width * 0.2 || Math.abs(mainDragState.current.velX) > 0.5) {
          step = deltaX > 0 ? 1 : -1;
        }

        let targetIndex = Math.max(0, Math.min(tabs.length - 1, startIndex + step));
        const targetX = targetIndex * width;

        isProgrammaticScroll.current = true;
        if (indicatorRef.current) {
          indicatorRef.current.style.transition = 'transform 0.4s cubic-bezier(0.19, 1, 0.22, 1)';
          indicatorRef.current.style.transform = `translateX(${targetIndex * 52}px)`;
        }
        mainSliderRef.current.scrollTo({ left: targetX, behavior: 'smooth' });
        setTimeout(() => {
          isProgrammaticScroll.current = false;
          setActiveTab(tabs[targetIndex]);
        }, 400);
      }

      // — SNAP VERTICAL —
      if (dir === 'vertical' && homeSlideRef.current) {
        const el = homeSlideRef.current;
        const h = mainDragState.current.snapHeight || el.clientHeight;
        const startTop = mainDragState.current.startScrollT;
        const delta = el.scrollTop - startTop;
        const startIdx = Math.round(startTop / h);
        let step = 0;

        if (Math.abs(delta) > h * 0.2 || Math.abs(mainDragState.current.velY) > 0.4) {
          step = delta > 0 ? 1 : -1;
        }

        const totalPages = 1 + historyItems.length;
        const targetIdx = Math.max(0, Math.min(totalPages - 1, startIdx + step));
        el.scrollTo({ top: targetIdx * h, behavior: 'smooth' });
      }

      restoreScrollers();
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };


  // --- PHẦN 2: KÉO ĐỘC LẬP TẠI BOTTOM TAB ---
  const handleTabDragStart = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!mainSliderRef.current || !navPillRef.current || isChatDetailOpen) return;

    // Chặn người dùng vuốt trên màn hình chính khi đang xử lý bottom tab
    mainDragState.current.isDraggingTab = true;

    const pillRect = navPillRef.current.getBoundingClientRect();
    const tabWidth = 52; // Kích thước chuẩn của mỗi tab

    // Hàm căn giữa cục nền trắng vào đúng ngón tay
    const updateIndicator = (clientX: number, instant = false) => {
      let localX = clientX - pillRect.left;
      let targetX = localX - (tabWidth / 2);

      // Giới hạn không cho chạy văng ra ngoài khoảng 3 tab (0px -> 104px)
      targetX = Math.max(0, Math.min(104, targetX));

      if (indicatorRef.current) {
        indicatorRef.current.style.transition = instant
          ? 'none'
          : 'transform 0.25s cubic-bezier(0.19, 1, 0.22, 1)';
        indicatorRef.current.style.transform = `translateX(${targetX}px)`;
      }
      return targetX;
    };

    // Vừa chạm vào: Nền trắng chạy ngay đến ngón tay
    let currentIndX = updateIndicator(e.clientX, false);

    const onMove = (ev: PointerEvent) => {
      if (!mainDragState.current.isDraggingTab) return;
      // Đang giữ và kéo: Nền trắng bám sát theo ngón tay (tắt transition để bám sát mượt mà)
      currentIndX = updateIndicator(ev.clientX, true);
    };

    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);

      mainDragState.current.isDraggingTab = false;

      // Tính xem khi thả tay ra, nền trắng đang đậu ở tab số mấy
      const targetIdx = Math.round(currentIndX / tabWidth);
      const targetTab = tabs[targetIdx];

      // KHI THẢ TAY: Lúc này mới ra lệnh cho màn hình (Screen) chạy sang
      switchTab(targetTab);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  // Initial Scroll to Home (Middle)
  useEffect(() => {
    if (mainSliderRef.current) {
      const width = mainSliderRef.current.getBoundingClientRect().width;
      const idx = tabs.indexOf(activeTab);
      let targetX = idx * width;
      let targetNavX = idx * 52;

      // Simulate half-way drag specifically from Home to ChatList for Showcase
      if (forceMidDrag) {
        targetX += width * 0.5;
        targetNavX += 26; // Half of 52px
      }

      // Only force scrollTo if it was a button click (programmatic)
      if (isProgrammaticScroll.current) {
        // Enable transition for button-driven tab jumps
        if (indicatorRef.current) {
          indicatorRef.current.style.transition = 'transform 0.5s cubic-bezier(0.19, 1, 0.22, 1)';
        }
        mainSliderRef.current.scrollTo({ left: targetX, behavior: 'smooth' });
      } else {
        if (isInitialMount.current) {
          mainSliderRef.current.scrollLeft = targetX;
          isInitialMount.current = false;
        }
        if (forceMidDrag && indicatorRef.current) {
          indicatorRef.current.style.transition = 'none';
          indicatorRef.current.style.transform = `translateX(${targetNavX}px)`;
        }
      }
    }
  }, [activeTab, forceMidDrag]);



  const [bgOpacity, setBgOpacity] = useState(0);
  const bgOverlayRef = useRef<HTMLDivElement>(null);

  const startCamera = async (forceFacing?: 'user' | 'environment') => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      const targetFacing = forceFacing || facingModeState;
      const constraints = {
        video: { facingMode: targetFacing }
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (e) {
      console.warn("Camera access denied or no hardware available", e);
    }
  };

  useEffect(() => {
    startCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  // Detect hw zoom range whenever stream changes
  useEffect(() => {
    if (streamRef.current) {
      const track = streamRef.current.getVideoTracks()[0];
      const caps = track?.getCapabilities?.() as MediaTrackCapabilities & { zoom?: { min: number; max: number } };
      if (caps?.zoom) {
        hwZoomRange.current = { min: caps.zoom.min, max: caps.zoom.max };
      } else {
        // Fallback for software zoom range if hw caps are missing
        hwZoomRange.current = { min: 0.5, max: 6 };
      }
    }
  }, [streamRef.current]);

  // Helper to detect if we are using the front camera
  const isFrontCamera = useCallback(() => {
    return facingModeState === 'user';
  }, [facingModeState]);

  const handleShutter = useCallback(async () => {
    if (!streamRef.current) {
      console.warn('No active camera stream (proceeding with dummy capture)');
    }

    const isFront = isFrontCamera();
    const track = streamRef.current?.getVideoTracks()[0];
    const caps = track?.getCapabilities() as any;

    try {
      // Trigger flash logic
      if (flashOn) {
        if (isFront) {
          // Trắng toàn màn hình chờ chiếu sáng mặt
          setFlashOv(true);
          await new Promise(resolve => setTimeout(resolve, 350));

          // Mô phỏng tiếng chụp ảnh "click"
          try {
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioContext) {
              const ctx = new AudioContext();
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.connect(gain);
              gain.connect(ctx.destination);
              osc.type = 'square';
              osc.frequency.setValueAtTime(400, ctx.currentTime);
              osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.1);
              gain.gain.setValueAtTime(0.3, ctx.currentTime);
              gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
              osc.start(ctx.currentTime);
              osc.stop(ctx.currentTime + 0.1);
            }
          } catch (e) {
            console.warn('AudioContext not supported', e);
          }
        } else if (caps?.torch) {
          // Hardware torch for back camera
          try {
            await track?.applyConstraints({ advanced: [{ torch: true }] as any });
            await new Promise(resolve => setTimeout(resolve, 150)); // wait for light to stabilize
          } catch (e) {
            console.warn('Torch failed', e);
          }
        }
      }

      requestAnimationFrame(() => {
        setFired(true);

        // Capture the frame securely via offscreen Canvas
        if (videoRef.current) {
          const video = videoRef.current;
          const canvas = document.createElement('canvas');

          // Ensure we have valid dimensions
          const vw = video.videoWidth || video.clientWidth || 430;
          const vh = video.videoHeight || video.clientHeight || 430;

          // We want a pure 1:1 center crop
          const size = Math.min(vw, vh);
          const startX = (vw - size) / 2;
          const startY = (vh - size) / 2;

          canvas.width = VIEWFINDER_SIZE;
          canvas.height = VIEWFINDER_SIZE;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            // Mirror the capture to match the mirrored live preview
            ctx.translate(VIEWFINDER_SIZE, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(video, startX, startY, size, size, 0, 0, VIEWFINDER_SIZE, VIEWFINDER_SIZE);
            const imgData = canvas.toDataURL('image/jpeg', 0.95);
            setCapturedImage(imgData);
            setImageSource('camera');

            setImgMeta({ w: VIEWFINDER_SIZE, h: VIEWFINDER_SIZE, initialScale: 1 });
            setCropScale(1);
            setCropPos({ x: 0, y: 0 });

            setTimeout(() => {
              setFired(false);
              setMode('preview');
            }, 300);
          }
        } else {
          setFired(false);
        }
      });
    } catch (err) {
      console.error('Shutter failure:', err);
      setFired(false);
    }

    // Reset flash/torch after capture
    setTimeout(async () => {
      setFlashOv(false);
      if (flashOn && !isFront && caps?.torch) {
        try {
          await track?.applyConstraints({ advanced: [{ torch: false }] as any });
        } catch (e) { }
      }
    }, 600);
  }, [mode, flashOn, isFrontCamera]);

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const raw = e.target.value;
    const rawLines = raw.split('\n');
    // Strict limits: max 3 lines, max 26 chars per line
    const validLines = rawLines.slice(0, 3).map(line => line.slice(0, 26));
    setMessage(validLines.join('\n'));
  };

  const AI_CAPTION_POOL = [
    'chilling ✨', 'another day 🌙', 'caught me in 4k 📸',
    'this is the life 🤩', 'living my best life rn', 'don\'t mind me ☀️',
    'today was a good day 💙', 'just being me 🤍', 'no thoughts, vibes only 🫧',
    'main character energy 🎬', 'somewhere between tired & happy 🫠', 'life lately 🌿',
    'blink and you\'ll miss it 👁️', 'soft hours 🌸', 'golden hour hits diff 🌅',
    'moment captured 📷', 'unfiltered 💫', 'real life, no filter 🙂',
  ];
  const handleAiCaptionClick = () => {
    if (aiCaptionLoading) return;
    
    // 🪄 MAGIC: Pick a random caption and fill immediately if clicking wand
    const random = AI_CAPTION_POOL[Math.floor(Math.random() * AI_CAPTION_POOL.length)];
    setMessage(random);
    
    // Still show suggestions for more variety
    if (showAiCaptions) { setShowAiCaptions(false); return; }
    setAiCaptionLoading(true);
    setShowAiCaptions(true);
    setAiCaptionSuggestions([]);
    setTimeout(() => {
      const shuffled = [...AI_CAPTION_POOL].sort(() => Math.random() - 0.5).slice(0, 5);
      setAiCaptionSuggestions(shuffled);
      setAiCaptionLoading(false);
    }, 800);
  };

  // Close AI caption panel when swiping away from message page
  useEffect(() => {
    if (composePageIndex !== 0) setShowAiCaptions(false);
  }, [composePageIndex]);

  const handleDownload = () => {
    if (downloading || !capturedImage) return;
    setDownloading(true);
    setTimeout(() => setDownloading(false), 2000);
  };

  const handlePreviewCancel = () => {
    setMode('camera');
    setCapturedImage(null);
    setImageSource('camera');
    setMessage('');
    setCropScale(1);
    setCropPos({ x: 0, y: 0 });
    setActiveChallengeSlot(null);
    setSelectedCollabFriends([]);
    setSelectedFriends([]);
    setIsAllSelected(true);
    setSelectedLocation(null);
    setComposePageIndex(0);
  };

  const handleSelectChallengeSlot = () => {
    // ChallengeModal is view-only from compose — just close it
    setShowChallengeModal(false);
  };

  // Simulate saving to DB by exporting cropped image to Local Folder
  const handleSend = () => {
    if (!capturedImage || isSendingCollab) return;
    if (!isAllSelected && selectedFriends.length === 0) return;

    // --- MOCK SENDING TRANSITION (WITH COLLAB) ---
    setIsSendingCollab(true);

    const canvas = document.createElement('canvas');
    canvas.width = VIEWFINDER_SIZE;
    canvas.height = VIEWFINDER_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      // 1:1 Square cropped drawing
      ctx.fillStyle = '#080808';
      ctx.fillRect(0, 0, VIEWFINDER_SIZE, VIEWFINDER_SIZE);

      ctx.save();
      ctx.translate(VIEWFINDER_SIZE / 2, VIEWFINDER_SIZE / 2);
      ctx.translate(cropPos.x, cropPos.y);
      ctx.scale(cropScale, cropScale);
      ctx.drawImage(img, -imgMeta.w / 2, -imgMeta.h / 2, imgMeta.w, imgMeta.h);
      ctx.restore();

      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);

      // ── Build audience list ──
      const sendTo: string[] = isAllSelected
        ? ['all']
        : selectedFriends.filter(Boolean);

      // ── Build collab partners ──
      const collabPartners: HistoryItem['collabPartners'] = selectedCollabFriends.map(name => {
        const friend = MOCK_FRIENDS.find(f => f.name === name);
        const privacy = COLLAB_PRIVACY[name] || {};
        return {
          name,
          color: friend?.color || '#888',
          avatar: friend?.avatar,
          // Collab partner shares same audience + their OWN friends
          // Simplified: they send to 'all' unless overridden
          sendTo: ['all'],
          hideCollab: privacy.hideCollab,
          anonymousCollab: privacy.anonymousCollab,
        };
      });

      // ── Determine challenge state (solely by which compose page is active) ──
      const isChallengePost = composePageIndex === 1;
      const dayWithinWeek = _currentDay - (_currentWeekNum - 1) * 7;

      let finalCaption: string | null;
      if (isChallengePost) {
        finalCaption = `Challenge M${_currentMonth}W${_currentWeekNum}D${dayWithinWeek}: ${_currentWeekTheme}`;
      } else {
        finalCaption = message.trim()
          ? (selectedLocation ? `${message.trim()} • 📍 ${selectedLocation.name}` : message.trim())
          : (selectedLocation ? `📍 ${selectedLocation.name}` : null);
      }

      const resolvedSlot = isChallengePost ? {
        week: `W${_currentWeekNum}` as 'W1' | 'W2' | 'W3' | 'W4',
        dayIndex: (_currentDay - 1) % 7,
        theme: _currentWeekTheme,
        month: _currentMonth,
      } : null;

      // ── Insert at top of history feed ──
      const newItem: HistoryItem = {
        id: `sent-${Date.now()}`,
        image: dataUrl,
        caption: finalCaption,
        sender: viewerIdentity,
        senderColor: '#4169E1',
        time: 'Just now',
        date: new Date().toISOString().split('T')[0],
        sendTo,
        collabPartners: collabPartners.length > 0 ? collabPartners : undefined,
        isChallenge: isChallengePost,
        challengeTag: resolvedSlot
          ? `W${_currentWeekNum} D${dayWithinWeek} - ${resolvedSlot.theme}` : undefined,
        location: selectedLocation ?? undefined,
      };

      setHistoryItems(prev => [newItem, ...prev]);

      // Save challenge slot image if applicable
      if (resolvedSlot) {
        const slotKey = `M${resolvedSlot.month}-${resolvedSlot.week}-${resolvedSlot.dayIndex}`;
        setChallengeImages(prev => ({ ...prev, [slotKey]: dataUrl }));
      }

      // Simulate network delay
      setTimeout(() => {
        setFlashOn(false);
        setFired(false);
        if (flashOn) {
          setFlashOv(true);
        } else {
          // Alternative subtle 'shutter pulse' if flash is off
          if (bgOverlayRef.current) {
            bgOverlayRef.current.style.transition = 'opacity 0.1s';
            bgOverlayRef.current.style.opacity = '0.5';
            setTimeout(() => { 
              if (bgOverlayRef.current) bgOverlayRef.current.style.opacity = '0';
            }, 100);
          }
        }

        setTimeout(() => {
          setFlashOv(false);
          setMode('camera');
          setIsSendingCollab(false);
          setSelectedCollabFriends([]);
          setMessage('');
          setCropScale(1);
          setCropPos({ x: 0, y: 0 });
          setImageSource('camera');
          setCapturedImage(null);
          setActiveChallengeSlot(null);
          setSelectedLocation(null);
          setComposePageIndex(0);

          // Scroll to top of history to show newly posted item
          setTimeout(() => scrollToHistory(), 100);
        }, 300);
      }, selectedCollabFriends.length > 0 ? 1000 : 400);
    };
    img.src = capturedImage;
  };

  // CROPPING LOGIC
  const handleCropZoom = (e: React.WheelEvent) => {
    const delta = -e.deltaY;
    const factor = 1.1;
    const zoomDir = delta > 0 ? factor : 1 / factor;

    const newScale = Math.min(imgMeta.initialScale * 5, Math.max(imgMeta.initialScale, cropScale * zoomDir));
    if (newScale === cropScale) return;

    // Zoom-to-cursor math
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left - VIEWFINDER_SIZE / 2;
    const mouseY = e.clientY - rect.top - VIEWFINDER_SIZE / 2;

    const ratio = newScale / cropScale;
    let newX = mouseX - (mouseX - cropPos.x) * ratio;
    let newY = mouseY - (mouseY - cropPos.y) * ratio;

    // Clamp to ensure coverage
    const limitX = Math.max(0, (imgMeta.w * newScale - VIEWFINDER_SIZE) / 2);
    const limitY = Math.max(0, (imgMeta.h * newScale - VIEWFINDER_SIZE) / 2);
    newX = Math.min(limitX, Math.max(-limitX, newX));
    newY = Math.min(limitY, Math.max(-limitY, newY));

    setCropScale(newScale);
    setCropPos({ x: newX, y: newY });
  };

  const handleCropDragStart = (x: number, y: number) => {
    cropDragRef.current.isDragging = true;
    cropDragRef.current.lastX = x;
    cropDragRef.current.lastY = y;
    cropDragRef.current.lastTime = Date.now();
    cropDragRef.current.vx = 0;
    cropDragRef.current.vy = 0;
    if (cropDragRef.current.rafId) cancelAnimationFrame(cropDragRef.current.rafId);
  };

  const handleCropDragMove = (x: number, y: number) => {
    if (!cropDragRef.current.isDragging) return;

    // Normalize movement by devicePixelRatio for smoothness
    const dx = (x - cropDragRef.current.lastX) / (window.devicePixelRatio || 1);
    const dy = (y - cropDragRef.current.lastY) / (window.devicePixelRatio || 1);

    const now = Date.now();
    const dt = Math.max(1, now - cropDragRef.current.lastTime);

    // Smooth velocity tracking
    cropDragRef.current.vx = dx / dt;
    cropDragRef.current.vy = dy / dt;
    cropDragRef.current.lastX = x;
    cropDragRef.current.lastY = y;
    cropDragRef.current.lastTime = now;

    if (cropDragRef.current.rafId) cancelAnimationFrame(cropDragRef.current.rafId);

    setCropPos(prev => {
      let newX = prev.x + dx;
      let newY = prev.y + dy;

      const limitX = Math.max(0, (imgMeta.w * cropScale - VIEWFINDER_SIZE) / 2);
      const limitY = Math.max(0, (imgMeta.h * cropScale - VIEWFINDER_SIZE) / 2);

      // Công thức đàn hồi Rubber Band chuẩn (giống vuốt Settings)
      const rubberBand = (distance: number, dimension: number) => {
        const constant = 0.55;
        return (distance * dimension * constant) / (dimension + constant * distance);
      };

      const calcPhysics = (pos: number, limit: number) => {
        if (pos > limit) return limit + rubberBand(pos - limit, VIEWFINDER_SIZE);
        if (pos < -limit) return -limit - rubberBand(-limit - pos, VIEWFINDER_SIZE);
        return pos;
      };

      return { x: calcPhysics(newX, limitX), y: calcPhysics(newY, limitY) };
    });
  };

  const handleCropDragEnd = () => {
    if (!cropDragRef.current.isDragging) return;
    cropDragRef.current.isDragging = false;

    const runPhysics = () => {
      setCropPos(prev => {
        let { x, y } = prev;
        let { vx, vy } = cropDragRef.current;

        const limitX = Math.max(0, (imgMeta.w * cropScale - VIEWFINDER_SIZE) / 2);
        const limitY = Math.max(0, (imgMeta.h * cropScale - VIEWFINDER_SIZE) / 2);

        let pX = 0; let pY = 0;

        if (x > limitX) pX = limitX - x;
        else if (x < -limitX) pX = -limitX - x;

        if (y > limitY) pY = limitY - y;
        else if (y < -limitY) pY = -limitY - y;

        // Mượt mà hút về mép màn hình (Spring forces for snapback)
        vx += pX * 0.018;
        vy += pY * 0.018;

        // Quán tính lướt mềm mại (Friction)
        vx *= 0.88;
        vy *= 0.88;

        x += vx * 16;
        y += vy * 16;

        cropDragRef.current.vx = vx;
        cropDragRef.current.vy = vy;

        // Stop condition
        const speed = Math.abs(vx) + Math.abs(vy);
        const distanceToValidState = Math.abs(pX) + Math.abs(pY);

        if (speed < 0.05 && distanceToValidState < 0.2) {
          // Post-Interaction Constraint Enforcement -> Perfectly lock inside bounds upon settling
          return {
            x: Math.min(limitX, Math.max(-limitX, x)),
            y: Math.min(limitY, Math.max(-limitY, y))
          };
        }

        cropDragRef.current.rafId = requestAnimationFrame(runPhysics);
        return { x, y };
      });
    };

    runPhysics();
  };

  // Zoom: cycle through available levels on button click
  const cycleZoom = () => {
    const steps = [0.5, 1, 2, 6];
    const idx = steps.indexOf(zoomLevel);
    const nextIdx = (idx + 1) % steps.length;
    applyZoom(steps[nextIdx]);
  };

  // Apply zoom to camera hardware — NO CSS scaling
  const applyZoom = (level: number) => {
    // Clamp to device limits
    const clamped = Math.min(Math.max(level, hwZoomRange.current.min), hwZoomRange.current.max);
    setZoomLevel(clamped);
    if (streamRef.current) {
      const track = streamRef.current.getVideoTracks()[0];
      try {
        track.applyConstraints({ advanced: [{ zoom: clamped } as any] });
      } catch (e) {
        console.warn('Hardware zoom not supported', e);
      }
    }
  };

  // Mouse wheel zoom (PC)
  const handleWheelZoom = (e: React.WheelEvent) => {
    if (mode !== 'camera') return;
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.1 : -0.1;
    const newZoom = Math.min(hwZoomRange.current.max, Math.max(hwZoomRange.current.min, zoomLevel + delta));
    applyZoom(Number(newZoom.toFixed(1)));
  };

  // Tap to focus
  const handleFocusTap = (e: React.MouseEvent<HTMLDivElement>) => {
    if (mode !== 'camera') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setFocusPoint({ x, y });
    setTimeout(() => setFocusPoint(null), 1500);
  };



  // Flip: alternates hardware camera and CCW/CW animation
  const handleFlip = useCallback(() => {
    if (isCameraFlipping) return;
    // Bật animation Flip Camera mượt mà 
    setIsCameraFlipping(true);

    // Đợi một khoảng blur (giống iOS) rồi mới switch Hardware Camera 
    setTimeout(() => {
      const nextFacing = facingModeState === 'user' ? 'environment' : 'user';
      setFacingModeState(nextFacing);
      startCamera(nextFacing);
      
      setFlipKey(prev => prev + 1);
      setFlipNextIsCW(!flipNextIsCW);
    }, 150);

    setTimeout(() => {
      setIsCameraFlipping(false);
    }, 550);
  }, [flipNextIsCW, facingModeState]);

  const flipStyle: React.CSSProperties = flipKey > 0 ? {
    animation: `flipRotate${flipNextIsCW ? 'CCW' : 'CW'} 0.4s cubic-bezier(.4,0,.2,1)`
  } : {};

  const mainSliderRef = useRef<HTMLDivElement>(null);

  // Sync header states whenever mode or tab changes
  useEffect(() => {
    handleSliderScroll();
  }, [mode, activeTab, isInHistory]);

  const handleSliderScroll = () => {
    if (!mainSliderRef.current) return;
    const scrollX = mainSliderRef.current.scrollLeft;
    const container = mainSliderRef.current;
    const width = container.getBoundingClientRect().width;
    if (width === 0) return;

    // Bidirectional Background Dimming Logic:
    // Fades to dark navy when moving AWAY from the center (Home) in either direction.
    // Direct DOM manipulation (no React setState) → true 60fps, zero re-render lag.
    const progressToHome = (scrollX - width) / width;
    const opacity = Math.max(0, Math.min(1, Math.abs(progressToHome)));
    if (bgOverlayRef.current) {
      bgOverlayRef.current.style.opacity = String(opacity);
    }
    setBgOpacity(opacity); // still keep for header gradient color sync

    // ── Header cross-fade ────────────────────────────────────────────────────
    // p: 0 = home, 1 = chat, -1 = calendar
    const p = Math.max(-1, Math.min(1, progressToHome));
    // awayP: khoảng cách khỏi home, 0→1 cho cả 2 hướng
    const awayP = Math.abs(p);

    // Cross-fade timeline (dùng awayP 0→1):
    //   Friends pill:   fade OUT  từ awayP=0 → 0.55  (đi trước)
    //   Title text:     fade IN   từ awayP=0.45 → 1  (đến sau, overlap ở 0.45–0.55)
    //
    // Ví dụ: 0 1 2 3 4 5 (awayP mapped to 0→1)
    //   Friends:  ████░░  (full→0 ở vị trí 0→4, xong ở 4)
    //   Title:      ░████ (bắt đầu ở vị trí 2, full ở 5)
    //   → giao nhau ở vị trí 2→4

    // Friends pill: full khi awayP=0 và ở camera mode, mờ hoàn toàn khi rời home hoặc khi vào preview
    const baseOpacity = mode === 'camera' ? 1 : 0;
    const friendsOpacity = Math.max(0, baseOpacity - awayP / 0.6);
    const friendsScale = 0.82 + Math.min(friendsOpacity, 1) * 0.18;

    if (friendsBtnRef.current) {
      friendsBtnRef.current.style.opacity = String(friendsOpacity);
      friendsBtnRef.current.style.transform = `scale(${friendsScale})`;
      // click được khi đang ở vùng home (opacity đủ lớn)
      friendsBtnRef.current.style.pointerEvents = friendsOpacity > 0.3 ? 'auto' : 'none';
    }

    // Rollcall đi kèm với Friends (cùng timeline)
    if (rollcallBtnRef.current) {
      rollcallBtnRef.current.style.opacity = String(friendsOpacity);
      rollcallBtnRef.current.style.transform = `scale(${0.8 + friendsOpacity * 0.2})`;
      rollcallBtnRef.current.style.pointerEvents = friendsOpacity > 0.3 ? 'auto' : 'none';
    }

    // Map button: full khi awayP = -1 (calendar), mờ khi rời calendar
    const mapOpacity = Math.max(0, 1 - Math.abs(p + 1) / 0.6);
    if (mapBtnRef.current) {
      mapBtnRef.current.style.opacity = String(mapOpacity);
      mapBtnRef.current.style.transform = `scale(${0.8 + mapOpacity * 0.2})`;
      mapBtnRef.current.style.pointerEvents = mapOpacity > 0.3 ? 'auto' : 'none';
    }

    // Title text: ẩn khi awayP < 0.4, hiện đầy đủ khi awayP = 1.
    const titleRaw = (awayP - 0.4) / 0.6;
    let titleOpacity = Math.max(0, Math.min(1, titleRaw));

    // Nếu đang ở preview trên tab Home, hiện title (Send to...)
    if (mode === 'preview' && awayP < 0.3) {
      titleOpacity = 1;
    }
    const titleScale = 0.78 + titleOpacity * 0.22;

    if (titleTextRef.current) {
      titleTextRef.current.style.opacity = String(titleOpacity);
      titleTextRef.current.style.transform = `scale(${titleScale})`;
    }

    // Avatar: KHÔNG animation, giữ nguyên
    // ─────────────────────────────────────────────────────────────────────────

    if (isProgrammaticScroll.current) return;

    // REAL-TIME LINKED INDICATOR SYNC
    const progress = scrollX / width; // 0=History, 1=Home, 2=Chats

    if (!mainDragState.current.isDraggingTab) {
      if (indicatorRef.current) {
        indicatorRef.current.style.transform = `translateX(${progress * 52}px)`;
      }
    }

    // TIKTOK HEADER ANIMATION (Interpation between tabs)
    const updateTabStyle = (ref: React.RefObject<HTMLButtonElement | null>, tabIdx: number) => {
      if (!ref.current) return;
      const dist = Math.abs(progress - tabIdx);
      const activeP = Math.max(0, 1 - dist); // 1 = fully active, 0 = fully inactive
      
      const opacity = 0.5 + activeP * 0.5;
      const scale = 0.9 + activeP * 0.15;
      const weight = activeP > 0.8 ? '800' : '700';
      
      ref.current.style.opacity = String(opacity);
      ref.current.style.transform = `scale(${scale})`;
      ref.current.style.fontWeight = weight;
      ref.current.style.textShadow = activeP > 0.6 ? '0 0 10px rgba(255,255,255,0.3)' : 'none';
    };

    updateTabStyle(histTabRef, 0);
    updateTabStyle(homeTabRef, 1);
    updateTabStyle(chatTabRef, 2);

    // TOP TAB INDICATOR SLIDE
    if (topTabsIndicatorRef.current) {
      // Logic: 0=History, 1=Home, 2=Chats
      // History is at approx -80px from center, Chats at +80px
      const indicatorX = (progress - 1) * 85; 
      topTabsIndicatorRef.current.style.transform = `translateX(${indicatorX}px)`;
      topTabsIndicatorRef.current.style.opacity = '1';
    }

    // (Đã xóa thao tác ép Scroll bằng JS, để Native CSS Scroll Snap tự quyết định điểm dừng 60fps)


    const idx = Math.round(scrollX / width);
    if (tabs[idx] && tabs[idx] !== activeTab) {
      setActiveTab(tabs[idx]);
    }
  };

  const mainHomeContent = (
    <>


      {/* Flip animation keyframes + textarea placeholder */}
      <style>{`
        @keyframes flipRotateCW {
          from { transform: rotate(0deg); }
          to   { transform: rotate(180deg); }
        }
        @keyframes flipRotateCCW {
          from { transform: rotate(0deg); }
          to   { transform: rotate(-180deg); }
        }
        .msg-textarea::placeholder {
          color: rgba(255,255,255,0.4);
        }
        .msg-textarea:focus::placeholder {
          color: rgba(255,255,255,0.35);
        }
        .friend-selector-scroll::-webkit-scrollbar {
          display: none;
        }
        @keyframes focusPulse {
          0% { opacity: 1; transform: scale(1.2); }
          30% { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(0.9); }
        }
        @keyframes slideUpModal {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
      `}</style>

      {/* TOP SPACER — accounts for the GlobalHeader overlay height */}
      <div style={{ height: 130, flexShrink: 0 }} />

      {/* VIEWFINDER 1:1 FULL WIDTH */}
      <div className="vf-wrap" onWheel={handleWheelZoom}>
        <div
          style={{
            background: 'black',
            transformOrigin: 'center center',
            transition: isCameraFlipping ? 'transform 0.55s cubic-bezier(0.4, 0, 0.2, 1), filter 0.55s ease, opacity 0.55s ease' : 'none',
            transform: isCameraFlipping ? 'rotateY(180deg) scale(0.95)' : 'rotateY(0deg) scale(1)',
            filter: isCameraFlipping ? 'blur(16px)' : 'blur(0)',
            opacity: isCameraFlipping ? 0.6 : 1,
            borderRadius: 40
          }}
        >
          <div
            className="vf"
            style={{
              overflow: 'hidden',
              position: 'relative',
              cursor: cropDragRef.current.isDragging ? 'grabbing' : 'grab',
              userSelect: 'none',
              touchAction: mode === 'preview' && imageSource === 'gallery' ? 'none' : 'pan-x pan-y',
              backgroundColor: '#1C1C1E' // Slightly lighter background for the cropping area exposure
            }}
            onClick={handleFocusTap}
            onWheel={(e) => {
              if (mode === 'preview' && imageSource === 'gallery') {
                handleCropZoom(e);
              }
            }}
            onMouseDown={(e) => {
              if (mode === 'preview' && imageSource === 'gallery') {
                handleCropDragStart(e.clientX, e.clientY);
              }
            }}
            onMouseMove={(e) => {
              if (mode === 'preview' && imageSource === 'gallery' && cropDragRef.current.isDragging) {
                handleCropDragMove(e.clientX, e.clientY);
              }
            }}
            onMouseUp={handleCropDragEnd}
            onMouseLeave={handleCropDragEnd}
            onTouchStart={(e) => {
              if (mode === 'preview' && imageSource === 'gallery') {
                handleCropDragStart(e.touches[0].clientX, e.touches[0].clientY);
              }
            }}
            onTouchMove={(e) => {
              if (mode === 'preview' && imageSource === 'gallery' && cropDragRef.current.isDragging) {
                handleCropDragMove(e.touches[0].clientX, e.touches[0].clientY);
              }
            }}
            onTouchEnd={handleCropDragEnd}
          >
            {/* Cropper / Preview Image */}
            {mode === 'preview' && capturedImage && (
              <img
                src={capturedImage}
                alt="clipping"
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  width: 'auto',
                  height: 'auto',
                  objectFit: 'none',
                  userSelect: 'none',
                  WebkitUserDrag: 'none',
                  transformOrigin: 'center center',
                  transform: `translate(calc(-50% + ${cropPos.x}px), calc(-50% + ${cropPos.y}px)) scale(${cropScale})`,
                  pointerEvents: 'none' // Prevent img from capturing drag events, handled by wrapper
                } as any}
              />
            )}

            {/* Live Video Feed */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                position: 'absolute',
                top: 0, left: 0,
                zIndex: 1,
                opacity: mode === 'preview' ? 0 : 1,
                transform: facingModeState === 'user' ? 'scaleX(-1)' : 'none' // Chỉ mirror cho cam trước
              }}
            />
            {/* Focus indicator */}
            {focusPoint && (
              <div style={{
                position: 'absolute',
                left: focusPoint.x, top: focusPoint.y,
                width: 65, height: 65,
                border: '2px solid #FFD700',
                borderRadius: 4,
                zIndex: 10,
                pointerEvents: 'none',
                transform: 'translate(-50%, -50%)',
                animation: 'focusPulse 1.5s ease-out forwards'
              }} />
            )}

            <button className="vf-flash-btn" style={{ zIndex: 3, display: mode === 'preview' ? 'none' : 'flex' }} onClick={(e) => { e.stopPropagation(); setFlashOn(!flashOn); }}>
              <svg viewBox="0 0 24 24" fill={flashOn ? "#1D9BF0" : "white"}>
                <path d="M7 2v11h3v9l7-12h-4l4-8z" opacity={flashOn ? 1 : 0.65} />
              </svg>
            </button>
            <button
              className="vf-zoom-btn"
              style={{
                zIndex: 3,
                display: mode === 'preview' ? 'none' : 'flex'
              }}
              onClick={(e) => { e.stopPropagation(); cycleZoom(); }}
            >
              <span>{zoomLevel}x</span>
            </button>

            {/* MESSAGE COMPOSE AREA — swipeable pager (Message → Challenge → Location) */}
            {mode === 'preview' && (() => {
              const pagerWidth = containerWidth * 0.85; // Use 85% of container width for the pager
              const trackOffset = -(composePageIndex * pagerWidth) + composeDragX;

              return (
                <div style={{
                  position: 'absolute', bottom: 16, left: 0, width: '100%', zIndex: 10, // Đã hạ bottom từ 36 xuống 16
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                }}>
                  {/* Pager Viewport */}
                  <div
                    onPointerDown={handleComposePointerDown}
                    onPointerMove={handleComposePointerMove}
                    onPointerUp={handleComposePointerUp}
                    onPointerCancel={handleComposePointerUp}
                    style={{
                      width: pagerWidth, height: 44, overflow: 'hidden', position: 'relative',
                      touchAction: 'none', cursor: composeSwipeRef.current.active ? 'grabbing' : 'grab'
                    }}
                  >
                    <div style={{
                      display: 'flex', width: `${pagerWidth * 3}px`, height: '100%',
                      transform: `translateX(${trackOffset}px)`,
                      transition: composeSwipeRef.current.active ? 'none' : 'transform 0.3s cubic-bezier(0.2, 0, 0.2, 1)',
                    }}>
                      {/* PAGE 0: Message */}
                      <div style={{ width: pagerWidth, height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative' }}>
                        {/* AI captions suggestions panel */}
                        {showAiCaptions && (
                          <div style={{
                            position: 'absolute', bottom: 'calc(100% + 10px)', left: '50%', transform: 'translateX(-50%)',
                            background: 'rgba(28,28,30,0.96)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
                            borderRadius: 18, padding: '10px 10px', minWidth: 220,
                            border: '1px solid rgba(255,255,255,0.1)',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                            display: 'flex', flexDirection: 'column', gap: 4, zIndex: 10,
                          }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginBottom: 4, letterSpacing: 0.5 }}>
                              🪄 AI Suggestions
                            </div>
                            {aiCaptionLoading ? (
                              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, padding: '10px 0' }}>
                                {[0,1,2].map(i => (
                                  <div key={i} style={{
                                    width: 6, height: 6, borderRadius: '50%',
                                    background: 'rgba(255,255,255,0.6)',
                                    animation: `dotPulse 0.9s ease-in-out ${i * 0.2}s infinite`,
                                  }} />
                                ))}
                              </div>
                            ) : (
                              aiCaptionSuggestions.map((s, i) => (
                                <button key={i} onClick={() => { setMessage(s); setShowAiCaptions(false); }} style={{
                                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.07)',
                                  borderRadius: 12, padding: '8px 14px',
                                  color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                                  textAlign: 'left', transition: 'background 0.15s',
                                }}>{s}</button>
                              ))
                            )}
                          </div>
                        )}

                        {/* Input pill center + Wand button right */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, width: '100%', padding: '0 20px' }}>
                          <div style={{
                            background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                            borderRadius: 22, padding: '0 16px', flex: 1, maxWidth: 300, height: 42,
                            display: 'flex', justifyContent: 'center', alignItems: 'center',
                            border: composePageIndex === 0 ? '1px solid rgba(255,255,255,0.2)' : '1px solid transparent',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                            transition: 'all 0.3s'
                          }}>
                            <input
                              className="msg-textarea"
                              value={message}
                              onChange={(e) => setMessage(e.target.value.slice(0, 40))}
                              placeholder="Add a message"
                              style={{
                                width: '100%',
                                textAlign: 'center', background: 'transparent', border: 'none', outline: 'none', color: 'white',
                                fontSize: 14, fontWeight: 700
                              }}
                            />
                          </div>
                          <button
                            onClick={handleAiCaptionClick}
                            className="ai-wand-bounce"
                            style={{
                              width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                              background: 'rgba(255,255,255,0.15)',
                              backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
                              border: '1px solid rgba(255,255,255,0.1)',
                              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 18, transition: 'all 0.2s',
                              boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
                              opacity: aiCaptionLoading ? 0.5 : 1,
                            }}
                          >🪄</button>
                        </div>
                      </div>

                      {/* PAGE 1: Challenge (auto-computed from today, view-only) */}
                      <div style={{ width: pagerWidth, height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <div
                          onClick={() => {
                            if (blockComposeClickRef.current) return;
                            setShowChallengeModal(true); // open for VIEWING only
                          }}
                          style={{
                            background: 'rgba(255,200,0,0.14)',
                            backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
                            borderRadius: 22, padding: '0 20px', width: 'max-content', maxWidth: '90%', height: 40,
                            display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center',
                            border: '1px solid rgba(255,200,0,0.3)',
                            cursor: 'pointer'
                          }}
                        >
                          <span style={{ color: '#FFC800', fontSize: 14, fontWeight: 800 }}>⚡</span>
                          <span style={{ color: 'white', fontSize: 14, fontWeight: 800, letterSpacing: -0.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {`M${_currentMonth}W${_currentWeekNum}D${_currentDay - (_currentWeekNum - 1) * 7}: ${_currentWeekTheme}`}
                          </span>
                        </div>
                      </div>

                      {/* PAGE 2: Location */}
                      <div style={{ width: pagerWidth, height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <div
                          onClick={() => {
                            if (blockComposeClickRef.current) return;
                            setShowLocationPicker(true);
                          }}
                          style={{
                            background: selectedLocation ? 'rgba(26,122,94,0.18)' : 'rgba(255,255,255,0.12)',
                            backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
                            borderRadius: 22, padding: '0 20px', width: 'max-content', maxWidth: '90%', height: 40, // Dùng max-content để ôm sát chữ
                            display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center',
                            border: selectedLocation ? '1px solid rgba(26,122,94,0.3)' : '1px solid rgba(255,255,255,0.1)',
                            cursor: 'pointer'
                          }}
                        >
                          <span style={{ fontSize: 14 }}>📍</span>
                          <span style={{ color: 'white', fontSize: 14, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {selectedLocation ? selectedLocation.name : 'Vị trí'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              );
            })()}

          </div>
        </div>
      </div>

      {/* Pagination dots (Only in Preview) */}
      {mode === 'preview' && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 12, marginBottom: 4 }}>
          {[0, 1, 2, 3, 4, 5, 6].map((idx) => (
            <div key={idx} style={{
              width: 6, height: 6, borderRadius: '50%',
              background: idx === 0 ? 'white' : 'rgba(255,255,255,0.3)',
              transition: 'all 0.3s'
            }} />
          ))}
        </div>
      )}

      <div style={{ height: 16 }} />

      {/* CONTROLS — positions FIXED, only icons swap */}
      <div className="controls">
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              const url = URL.createObjectURL(file);
              const img = new Image();
              img.onload = () => {
                const initialScale = Math.max(VIEWFINDER_SIZE / img.width, VIEWFINDER_SIZE / img.height);
                setImgMeta({ w: img.width, h: img.height, initialScale });
                setCropScale(initialScale);
                setCropPos({ x: 0, y: 0 });
                setCapturedImage(url);
                setSelectedImg(url);
                setMode('preview');
                setImageSource('gallery');
              };
              img.src = url;
            }
          }}
        />

        {/* LEFT: Gallery / X — same position */}
        <button className="btn-gallery" onClick={mode === 'camera' ? () => fileInputRef.current?.click() : handlePreviewCancel}>
          {mode === 'camera' ? (
            <svg viewBox="0 0 24 24" fill="none" width="54" height="54">
              <rect x="3" y="3" width="18" height="18" rx="4" fill="rgba(255,255,255,0.1)" stroke="white" strokeWidth="2" />
              <circle cx="8.5" cy="8.5" r="1.5" fill="white" />
              <path d="M21 15l-5-5L5 21" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" width="42" height="42">
              <path d="M18 6L6 18M6 6l12 12" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          )}
        </button>

        {/* CENTER: Shutter / Send — same position, same wrapper */}
        <div className="shutter">
          {mode === 'camera' ? (
            <>
              <div className="shutter-ring" />
              <button
                className={`shutter-btn${fired ? ' fired' : ''}`}
                onClick={handleShutter}
              />
            </>
          ) : (
            <button
              onClick={handleSend}
              disabled={isSendingCollab}
              style={{
                width: 90, height: 90, borderRadius: '50%',
                background: isAllSelected || selectedFriends.length > 0 ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.08)',
                border: 'none', cursor: isSendingCollab ? 'default' : 'pointer',
                display: 'flex', justifyContent: 'center', alignItems: 'center',
                transition: 'all 0.25s',
                opacity: isSendingCollab ? 0.6 : (isAllSelected || selectedFriends.length > 0 ? 1 : 0.4),
                pointerEvents: isSendingCollab || (!isAllSelected && selectedFriends.length === 0) ? 'none' : 'auto',
                position: 'relative'
              }}
            >
              {isSendingCollab ? (
                <div style={{
                  width: 30, height: 30, borderRadius: '50%', border: '3px solid rgba(255,255,255,0.2)',
                  borderTopColor: 'white', animation: 'spin 0.8s linear infinite'
                }} />
              ) : (
                <svg viewBox="0 0 24 24" fill="none" width="34" height="34">
                  <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="white" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
                </svg>
              )}
              <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
              `}</style>
            </button>
          )}
        </div>

        {/* RIGHT: Flip / Aa — same position */}
        <button
          className="btn-flip"
          onClick={mode === 'camera' ? handleFlip : () => navigateTo('captions')}
          data-name="Button / Camera / Flip-Aa"
          id={mode === 'camera' ? "BTN:FLIP_CAMERA" : "BTN:OPEN_CAPTIONS"}
        >
          {mode === 'camera' ? (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              transform: 'rotate(60deg)'
            }}>
              <svg
                key={flipKey}
                viewBox="0 0 24 24"
                fill="#FFFFFF"
                width="54" height="54"
                style={flipStyle}
              >
                <g transform="translate(24, 0) scale(-1, 1)">
                  <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z" />
                </g>
              </svg>
            </div>
          ) : (
            <div
              className="btn-aa-stylized"
              data-name="Button / Action / Aa"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
                {/* Aa Text */}
                <text x="21" y="27" fontSize="15" fontWeight="800" fill="white" textAnchor="middle" fontFamily="sans-serif">Aa</text>

                {/* Partial circle: starts at top right, goes CCW around */}
                <path d="M 26 9 A 14 14 0 1 0 34 25" stroke="white" strokeWidth="2.5" strokeLinecap="round" />

                {/* Authentic 4-Point Star Sparkle 1 (Large) */}
                <path d="M 35 11 Q 35 15 39 15 Q 35 15 35 19 Q 35 15 31 15 Q 35 15 35 11" fill="white" />

                {/* Authentic 4-Point Star Sparkle 2 (Small) */}
                <path d="M 29 4 Q 29 7 32 7 Q 29 7 29 10 Q 29 7 26 7 Q 29 7 29 4" fill="white" />
              </svg>
            </div>
          )}
        </button>
      </div>

      {/* HISTORY / FRIEND SELECTOR — same position */}
      <div className="history-area" style={{ marginBottom: 12 }}>
        {mode === 'camera' ? (
          <button
            className="btn-history"
            onClick={() => scrollToHistory()}
            data-name="Button / Action / History"
            id="BTN:SCROLL_TO_HISTORY"
            style={{
              background: 'rgba(255,255,255,0.06)', borderRadius: 20,
              padding: '4px 14px 4px 6px', display: 'flex', alignItems: 'center', gap: 10
            }}
          >
            <div
              className="hist-thumb"
              data-name="History / Thumbnail"
              style={{
                width: 32, height: 32, borderRadius: 10,
                ...(selectedImg ? { backgroundImage: `url(${selectedImg})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {})
              }}
            />
            <span className="hist-label" style={{ fontSize: 16, fontWeight: 800 }}>History</span>
            <div className="hist-chev">
              <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
                <path d="M6 9L12 15L18 9" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </button>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%' }}>
            {/* 1. SELECT (Friend Carousel) - ON TOP */}
            <div
              ref={hScrollRef}
              className="friend-selector-scroll disable-scrollbar"
              onPointerDown={hSetDown}
              onPointerMove={hSetMove}
              onPointerUp={hSetUp}
              onPointerLeave={hSetUp}
              style={{
                display: 'flex', gap: 20, alignItems: 'center', width: '100%',
                overflowX: 'auto', scrollbarWidth: 'none',
                touchAction: 'manipulation',
                WebkitOverflowScrolling: 'touch',
                paddingRight: '50%', paddingLeft: '50%',
                paddingTop: 10, paddingBottom: 10, marginTop: -10, marginBottom: -10,
                scrollSnapType: 'x mandatory'
              }}
            >
              {[
                { id: 'collab', name: 'Collabs', color: 'rgba(255,255,255,0.08)' },
                { id: 'all', name: 'All', color: '#444' },
                ...MOCK_FRIENDS
              ].map(f => {
                if (f.id === 'collab') {
                  return (
                    <div
                      key="collab-btn"
                      className="h-item"
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0,
                        width: 50, scrollSnapAlign: 'center'
                      }}
                    >
                      <div
                        onClick={() => {
                          if (blockFriendClickRef.current) return;
                          setIsCollabModalOpen(true);
                        }}
                        style={{
                          width: 44, height: 44, borderRadius: '50%',
                          backgroundColor: 'rgba(255,255,255,0.1)',
                          display: 'flex', justifyContent: 'center', alignItems: 'center',
                          cursor: 'pointer', border: '2.5px solid rgba(255,255,255,0.2)'
                        }}
                      >
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
                          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                          <circle cx="18" cy="9" r="3" fill="none" stroke="white" strokeWidth="2" />
                        </svg>
                      </div>
                      <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 700 }}>Collabs</span>
                    </div>
                  );
                }

                if (f.id === 'all') {
                  return (
                    <div
                      key="all"
                      ref={allButtonRef}
                      className="h-item"
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0,
                        width: 50, scrollSnapAlign: 'center'
                      }}
                    >
                      <div
                        onClick={() => {
                          if (blockFriendClickRef.current) return;
                          setIsAllSelected(true);
                          setSelectedFriends([]);
                        }}
                        style={{
                          width: 44, height: 44, borderRadius: '50%',
                          backgroundColor: '#444',
                          display: 'flex', justifyContent: 'center', alignItems: 'center',
                          cursor: 'pointer', border: isAllSelected ? '2.5px solid #FFC800' : '2.5px solid rgba(255,255,255,0.2)'
                        }}
                      >
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
                          <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5s-3 1.34-3 3 1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5z" />
                        </svg>
                      </div>
                      <span style={{ color: isAllSelected ? '#FFC800' : 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 700 }}>All</span>
                    </div>
                  );
                }

                const isSelected = selectedFriends.includes(f.id);
                return (
                  <div
                    key={f.id}
                    className="h-item"
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0,
                      width: 50, scrollSnapAlign: 'center'
                    }}
                  >
                    <div
                      onClick={(e) => {
                        if (blockFriendClickRef.current) return;
                        const unifiedList = [{ id: 'all', name: 'All', color: '#444' }, ...MOCK_FRIENDS];
                        const currentIdx = unifiedList.findIndex(x => x.id === f.id);
                        const lastIdx = unifiedList.findIndex(x => x.id === lastSelectedIdRef.current);
                        const diff = currentIdx - lastIdx;

                        if (f.id === 'all') {
                          setIsAllSelected(true);
                          setSelectedFriends([]);
                        } else {
                          const isFirstIndivSelection = isAllSelected;
                          if (isAllSelected) setIsAllSelected(false);
                          const isDeselecting = selectedFriends.includes(f.id);
                          if (isDeselecting) {
                            setSelectedFriends(prev => prev.filter(id => id !== f.id));
                            setSelectedCollabFriends(prev => prev.filter(id => id !== f.id));
                          } else {
                            setSelectedFriends(prev => [...prev, f.id]);
                          }

                          const container = hScrollRef.current;
                          if (container) {
                            const cRect = container.getBoundingClientRect();
                            const eRect = e.currentTarget.getBoundingClientRect();
                            const targetScrollLeft = container.scrollLeft + (eRect.left - cRect.left) - (cRect.width / 2) + (eRect.width / 2);
                            container.scrollTo({ left: targetScrollLeft, behavior: 'smooth' });
                          }
                        }
                        lastSelectedIdRef.current = f.id;
                      }}
                      style={{
                        width: 44, height: 44, borderRadius: '50%',
                        border: isSelected ? '2.5px solid #FFC800' : '2.5px solid rgba(255,255,255,0.25)',
                        padding: 2, transition: 'all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
                        transform: isSelected ? 'scale(1.15)' : 'scale(1)',
                        cursor: 'pointer'
                      }}
                    >
                      <div style={{
                        width: '100%', height: '100%', borderRadius: '50%',
                        backgroundColor: f.color,
                        display: 'flex', justifyContent: 'center', alignItems: 'center',
                        ...('avatar' in f ? { backgroundImage: `url(${f.avatar})`, backgroundSize: 'cover' } : {})
                      }} />
                    </div>
                    <span style={{ color: isSelected ? '#FFC800' : 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 700 }}>
                      {f.name.length > 5 ? f.name.slice(0, 5) + '...' : f.name}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* 2. COLLABS (Badge) - BELOW SELECT */}
            {(isAllSelected || selectedFriends.length > 0) && (isCollabModalOpen || selectedCollabFriends.length > 0) && (
              <div style={{
                width: '100%', height: 50, display: 'flex', justifyContent: 'center', alignItems: 'center',
                animation: 'fadeIn 0.3s ease'
              }}>
                <div
                  onClick={() => setIsCollabModalOpen(true)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 16px 8px 8px',
                    background: 'rgba(255,184,0,0.15)',
                    borderRadius: 24, border: '1.5px solid rgba(255,200,0,0.3)',
                    cursor: 'pointer', backdropFilter: 'blur(20px)',
                    transition: 'transform 0.2s',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    {selectedCollabFriends.length > 0 ? (
                      selectedCollabFriends.map((fid, fi) => {
                        const f = MOCK_FRIENDS.find(x => x.id === fid);
                        return (
                          <div key={fi} style={{
                            width: 28, height: 28, borderRadius: '50%',
                            backgroundColor: f?.color || '#444',
                            backgroundImage: f?.avatar ? `url(${f.avatar})` : 'none',
                            backgroundSize: 'cover',
                            border: '2px solid #111',
                            marginLeft: fi === 0 ? 0 : -8,
                            zIndex: 10 - fi
                          }} />
                        );
                      })
                    ) : (
                      <div style={{
                        width: 28, height: 28, borderRadius: '50%',
                        background: 'rgba(255,255,255,0.15)',
                        display: 'flex', justifyContent: 'center', alignItems: 'center'
                      }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <span style={{ color: '#FFC800', fontSize: 13, fontWeight: 800 }}>
                    {selectedCollabFriends.length > 0
                      ? `Collabbing with ${MOCK_FRIENDS.find(x => x.id === selectedCollabFriends[0])?.name || 'them'}${selectedCollabFriends.length > 1 ? ` +${selectedCollabFriends.length - 1}` : ''}`
                      : 'Select a collaborator'
                    }
                  </span>
                  <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(255,200,0,0.2)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#FFC800" strokeWidth="4">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );

  return (
    <>
      {/* GLOBAL STATIONARY HEADER OVERLAY — fades out as ChatDetail opens via headerDOMRef */}
      <div
        ref={headerDOMRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 110,
          zIndex: 1000,
          pointerEvents: isChatDetailOpen ? 'none' : 'auto',
          // Note: container is auto to allow interaction with buttons; none-padding is handled by children if needed
          opacity: 1,  // controlled via direct DOM by handleDetailProgress
        }}
      >

        {/* Unified Fade Overlay — covers status bar + header, content scrolls behind */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 130, // Slightly reduced to match the unblocked items but keep a smooth fade
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.5) 45%, rgba(0,0,0,0) 100%)',
          transition: 'opacity 0.3s ease',
          pointerEvents: 'none'
        }} />

        {/* Global Header Content */}
        <div
          className="topbar"
          data-name="Container / Header / Topbar"
          style={{
            paddingTop: 50,
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            width: '100%',
            paddingLeft: 20,
            paddingRight: 20
          }}
        >
          {/* 1. LEFT CORNER: Map icon and Rollcall icons (both overlap, opacity controlled by refs) */}
          <div style={{ position: 'absolute', left: 20, top: 40, height: 60, display: 'flex', alignItems: 'center', zIndex: 200 }}>
            {/* Map Button (Visible in Calendar/Memories tab) */}
            {/* Map Button (Hiện ra khi ở tab Calendar/Memories) */}
            <button
              ref={mapBtnRef}
              onClick={() => { if (!isChatDetailOpen) setShowMapView(true); }}
              data-name="Button / Header / Map"
              id="BTN:MAP_VIEW"
              className="btn-roll" // Đổi từ btn-avatar thành btn-roll để giống y hệt Rollcall
              style={{
                position: 'absolute',
                left: 0,
                // Xóa width, height, border, background cũ để nó nhận từ class .btn-roll
                transformOrigin: 'left center', // Phải giống hệt rollcallBtnRef
                willChange: 'transform, opacity',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                pointerEvents: isChatDetailOpen ? 'none' : 'auto',
                opacity: activeTab === 'calendar' ? 1 : 0,
                transform: activeTab === 'calendar' ? 'scale(1)' : 'scale(0.8)',
                zIndex: 201, // Đảm bảo nằm trên để nhận click khi hiện ra
              }}
            >
              {/* Icon Map đơn giản để cảm giác chỉ đổi icon */}
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 6v14l6-3 6 3 6-3V3l-6 3-6-3z" />
                <line x1="7" y1="3" x2="7" y2="17" />
                <line x1="13" y1="6" x2="13" y2="20" />
              </svg>
            </button>

            {/* Rollcall Button (Visible in Home tab) */}
            <button
              ref={rollcallBtnRef}
              className="btn-roll"
              data-name="Button / Header / Rollcall"
              id="BTN:ROLLCALL"
              onClick={() => { if (!isChatDetailOpen) setShowChallengeModal(true); }}
              style={{
                position: 'absolute',
                left: 0,
                transformOrigin: 'left center',
                willChange: 'transform, opacity',
                opacity: activeTab === 'home' ? 1 : 0,
                transform: activeTab === 'home' ? 'scale(1)' : 'scale(0.8)',
                pointerEvents: isChatDetailOpen ? 'none' : 'auto',
              }}
            >
              <svg viewBox="0 0 32 32" fill="none" width="34" height="34">
                <path d="M6 12L6 20L10 20L22 26L22 6L10 12Z" fill="rgba(255,255,255,0.9)" />
                <rect x="3" y="12.5" width="4" height="7" rx="1.5" fill="rgba(255,255,255,0.9)" />
                <line x1="24.5" y1="12" x2="27.5" y2="10.5" stroke="rgba(255,255,255,0.75)" strokeWidth="2" strokeLinecap="round" />
                <line x1="24.5" y1="16" x2="28.5" y2="16" stroke="rgba(255,255,255,0.75)" strokeWidth="2" strokeLinecap="round" />
                <line x1="24.5" y1="20" x2="27.5" y2="21.5" stroke="rgba(255,255,255,0.75)" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {/* 2. CENTER PIECE: Perfectly Centered Pill & Title */}
          <div style={{
            flex: 1,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            position: 'absolute',
            left: 0, right: 0, top: 40, height: 60,
            pointerEvents: 'none',
            zIndex: 100
          }}>
            {/* ── TIKTOK STYLE TOP TABS (History | Locket | Chats) ── */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 24, pointerEvents: 'auto', position: 'relative'
            }}>
              <button
                ref={histTabRef}
                onClick={() => switchTab('calendar')}
                style={{
                  background: 'none', border: 'none', color: 'white', fontSize: 17, 
                  padding: '8px 4px', cursor: 'pointer', outline: 'none', transition: 'text-shadow 0.2s',
                  willChange: 'transform, opacity'
                }}
              >History</button>
              
              <button
                ref={homeTabRef}
                onClick={() => switchTab('home')}
                style={{
                  background: 'none', border: 'none', color: 'white', fontSize: 18, 
                  padding: '8px 4px', cursor: 'pointer', outline: 'none', transition: 'text-shadow 0.2s',
                  willChange: 'transform, opacity'
                }}
              >Locket</button>

              <button
                ref={chatTabRef}
                onClick={() => switchTab('chat')}
                style={{
                  background: 'none', border: 'none', color: 'white', fontSize: 17, 
                  padding: '8px 4px', cursor: 'pointer', outline: 'none', transition: 'text-shadow 0.2s',
                  willChange: 'transform, opacity'
                }}
              >Chats</button>

              {/* TikTok-style Dot Underline */}
              <div 
                ref={topTabsIndicatorRef}
                style={{
                  position: 'absolute', bottom: -2, left: 'calc(50% - 3px)',
                  width: 6, height: 6, borderRadius: '50%', background: 'white',
                  boxShadow: '0 0 8px rgba(255,255,255,0.8)',
                  pointerEvents: 'none', willChange: 'transform'
                }}
              />
            </div>

            {/* Title text overlay (Secondary title like "Send to..." or "Monthly Recap") */}
            <h1
              ref={titleTextRef}
              style={{
                position: 'absolute', color: 'white', fontSize: 20, fontWeight: 800,
                opacity: 0, pointerEvents: 'none', transition: 'none'
              }}
            >
              {mode === 'preview' ? (composePageIndex === 0 ? 'Send to...' : (composePageIndex === 1 ? 'Challenges' : 'Location')) : (activeTab === 'calendar' ? 'History' : 'Chats')}
            </h1>
          </div>

          {/* 3. RIGHT CORNER: Avatar */}
          <div style={{ pointerEvents: isChatDetailOpen ? 'none' : 'auto', position: 'absolute', right: 20, top: 40, height: 60, display: 'flex', alignItems: 'center', zIndex: 200 }}>
            {mode === 'preview' ? (
              imageSource !== 'gallery' && (
                <button
                  onClick={handleDownload}
                  data-name="Button / Header / Download"
                  id="BTN:DOWNLOAD_PHOTO"
                  style={{ width: 44, height: 44, background: 'rgba(255,255,255,0.1)', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', border: 'none', padding: 0, cursor: 'pointer', pointerEvents: isChatDetailOpen ? 'none' : 'auto' }}
                >
                  {downloading ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="11" fill="#FFC800" />
                      <path d="M7 12l3 3 7-7" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                      <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
                    </svg>
                  )}
                </button>
              )
            ) : (
              <button
                className="btn-avatar"
                onClick={() => navigateTo('settings')}
                data-name="Button / Header / Profile"
                id="GOTO:SETTINGS"
                style={{ pointerEvents: isChatDetailOpen ? 'none' : 'auto' }}
              >
                <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 0. Dynamic Background Overlay for Chat/Calendar Transition */}
      {/* opacity được update trực tiếp qua bgOverlayRef → 60fps không qua React state */}
      <div
        ref={bgOverlayRef}
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: '#060e1b', /* Deep Midnight Navy */
          opacity: bgOpacity,          /* initial value; after mount controlled via ref */
          zIndex: 5,
          pointerEvents: 'none',
          transition: 'opacity 0.18s ease-out' /* mượt dần khi programmatic tab switch */
        }}
      />

      {/* GESTURE ENGINE FOR BOTTOM SHEET (Collab Modal) */}
      <style>{`
        .sheet-container {
          transition: transform 0.4s cubic-bezier(0.32, 1, 0.67, 1);
        }
        .sheet-container.dragging {
          transition: none;
        }
      `}</style>

      {/* TOP-LEVEL FLASH OVERLAY (Must cover everything including Bottom Nav) */}
      <div
        className={`flash-ov${flashOv ? ' on' : ''}`}
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 2000,
          backgroundColor: 'white',
          opacity: flashOv ? 1 : 0,
          pointerEvents: 'none',
          transition: 'opacity 0.15s ease-out'
        }}
      />

      {/* 1. HORIZONTAL SLIDER CONTAINER (Master Nav Hub) */}
      <div
        ref={mainSliderRef}
        onScroll={handleSliderScroll}
        onPointerDown={(e) => {
          // Custom gesture engine now handles both mouse and touch for premium smoothness
          handleMainPointerDown(e);
        }}
        onTouchStart={() => {
          // Disable bg overlay transition during native touch drag → instant opacity follow
          if (bgOverlayRef.current) bgOverlayRef.current.style.transition = 'none';
        }}
        onTouchEnd={() => {
          // Re-enable transition after touch release
          if (bgOverlayRef.current) bgOverlayRef.current.style.transition = 'opacity 0.18s ease-out';
        }}
        style={{
          position: 'absolute', inset: 0,
          display: 'flex', overflowX: (isChatDetailOpen || mode === 'preview') ? 'hidden' : 'auto',
          scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch', zIndex: 50,
          paddingBottom: 0,
          // Allow native horizontal and vertical gestures while maintaining focus
          touchAction: (isChatDetailOpen || mode === 'preview') ? 'none' : 'pan-x pan-y',
          scrollSnapType: 'x mandatory'
        }}
        className="hide-scrollbar"
      >
        <style>{`
          .hide-scrollbar::-webkit-scrollbar { display: none; }
          .screen-item { scroll-snap-align: center; flex: 0 0 100%; width: 100%; height: 100%; scroll-snap-stop: always; }
        `}</style>

        {/* 1.1 MEMORIES (LEFT TAB) — Locket-style dot calendar */}
        <div style={{
          flex: '0 0 100%',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          paddingTop: 0,
          paddingLeft: 20,
          paddingRight: 20,
          alignItems: 'center',
          overflowY: 'auto',
          pointerEvents: activeTab === 'calendar' ? 'auto' : 'none'
        }}>
          <div style={{ height: 150, flexShrink: 0 }} />

          {/* "First Memory" banner */}
          {(() => {
            const allDated = historyItems.filter(i => i.date && i.sender === 'P1' || i.date && i.sender === 'You');
            const firstDate = allDated.length > 0
              ? allDated.reduce((min, i) => (i.date! < min ? i.date! : min), allDated[0].date!)
              : '2026-01-05';
            const [fy, fm, fd] = firstDate.split('-').map(Number);
            const MONTH_SHORT_NAMES = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            return (
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingBottom: 28 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: 12 }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="3" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                    <path d="M12 14l1 1 2-2" strokeWidth="2" />
                  </svg>
                </div>
                <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, fontWeight: 600, textAlign: 'center', lineHeight: 1.5 }}>
                  Your first Memory was sent on<br />
                  <span style={{ color: 'rgba(255,255,255,0.8)', fontWeight: 800, fontSize: 14 }}>
                    {fd} {MONTH_SHORT_NAMES[fm]} {fy}
                  </span>
                </div>
                <div style={{ width: 1, height: 36, background: 'rgba(255,255,255,0.1)', marginTop: 18, borderRadius: 1 }} />
              </div>
            );
          })()}

          {/* Dot-calendar months: Jan–Jun 2026 */}
          {(() => {
            const MONTH_NAMES = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
            const today = new Date();
            const todayYear = today.getFullYear();
            const todayMonth = today.getMonth() + 1;
            const todayDay = today.getDate();
            const WEEKDAY_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

            return [1, 2, 3, 4, 5, 6].map(monthNum => {
              const year = 2026;
              const isCurrent = monthNum === todayMonth && year === todayYear;
              const isFuture = monthNum > todayMonth || year > todayYear;
              const datePrefix = `${year}-${String(monthNum).padStart(2, '0')}-`;
              // Private Memories: only show MY own photos
              const monthPhotos = historyItems.filter(item =>
                item.date?.startsWith(datePrefix) &&
                (item.sender === viewerIdentity || item.sender === 'You')
              );

              // day → first photo for that day (for thumbnail)
              const photosByDay: Record<number, HistoryItem | undefined> = {};
              monthPhotos.forEach(item => {
                if (item.date) {
                  const day = parseInt(item.date.slice(8, 10), 10);
                  if (!photosByDay[day]) photosByDay[day] = item;
                }
              });

              const daysInMonth = new Date(year, monthNum, 0).getDate();
              const firstDayRaw = new Date(year, monthNum - 1, 1).getDay();
              const firstDayOffset = (firstDayRaw + 6) % 7; // 0=Mon
              const totalCells = Math.ceil((firstDayOffset + daysInMonth) / 7) * 7;
              const photoCount = monthPhotos.length;

              return (
                <div key={monthNum} style={{ width: '100%', marginBottom: 36, opacity: isFuture ? 0.35 : 1 }}>
                  {/* Month header */}
                  <div
                    onClick={() => !isFuture && setShowMonthDetail({ month: monthNum, year })}
                    style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10, cursor: (!isFuture) ? 'pointer' : 'default' }}
                  >
                    <span style={{ color: isCurrent ? '#FFC800' : 'white', fontSize: 20, fontWeight: 900, letterSpacing: -0.5 }}>
                      {MONTH_NAMES[monthNum]}
                      <span style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 700, fontSize: 14, marginLeft: 8 }}>2026</span>
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {isCurrent && (
                        <span style={{ background: '#FFC800', color: '#111', fontSize: 9, fontWeight: 800, borderRadius: 5, padding: '2px 6px', textTransform: 'uppercase', letterSpacing: 0.5 }}>Now</span>
                      )}
                      {photoCount > 0 && (
                        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, fontWeight: 700 }}>{photoCount} memories</span>
                      )}
                    </div>
                  </div>

                  {/* Weekday labels */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
                    {WEEKDAY_LABELS.map(d => (
                      <div key={d} style={{ textAlign: 'center', color: 'rgba(255,255,255,0.18)', fontSize: 9, fontWeight: 700 }}>{d}</div>
                    ))}
                  </div>

                  {/* Photo thumbnail grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3 }}>
                    {Array.from({ length: totalCells }, (_, cellIdx) => {
                      const dayNum = cellIdx - firstDayOffset + 1;
                      const isValid = dayNum >= 1 && dayNum <= daysInMonth;
                      if (!isValid) return <div key={cellIdx} style={{ aspectRatio: '1/1' }} />;
                      const isToday = isCurrent && dayNum === todayDay;
                      const isFutureDay = isCurrent && dayNum > todayDay;
                      const photo = photosByDay[dayNum];
                      const hasPhoto = !!photo;
                      return (
                        <div
                          key={cellIdx}
                          onClick={() => hasPhoto && photo && setSelectedCalendarPhoto(photo)}
                          style={{
                            aspectRatio: '1/1', borderRadius: 8, overflow: 'hidden',
                            position: 'relative',
                            cursor: hasPhoto ? 'pointer' : 'default',
                            border: isToday
                              ? '2px solid #FFC800'
                              : hasPhoto ? '1px solid rgba(255,255,255,0.1)' : 'none',
                            background: hasPhoto ? 'transparent'
                              : isFutureDay ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.04)',
                            transition: 'transform 0.15s ease',
                          }}
                        >
                          {hasPhoto && photo ? (
                            <>
                              <img src={photo.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                              <div style={{
                                position: 'absolute', inset: 0,
                                background: 'linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.5) 100%)',
                              }} />
                              <div style={{
                                position: 'absolute', bottom: 1, left: 0, right: 0, textAlign: 'center',
                              }}>
                                <span style={{
                                  fontSize: 8, fontWeight: 800,
                                  color: isToday ? '#FFC800' : 'rgba(255,255,255,0.9)',
                                  textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                                }}>{dayNum}</span>
                              </div>
                            </>
                          ) : (
                            <div style={{
                              width: '100%', height: '100%',
                              display: 'flex', justifyContent: 'center', alignItems: 'center',
                            }}>
                              <span style={{
                                fontSize: 10, fontWeight: 700,
                                color: isToday ? '#FFC800' : isFutureDay ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.22)',
                              }}>{dayNum}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Vertical connector to next month */}
                  {monthNum < 6 && (
                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
                      <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.08)', borderRadius: 1 }} />
                    </div>
                  )}
                </div>
              );
            });
          })()}

          <div style={{ height: 80, flexShrink: 0 }} />
        </div>

        {/* 1.2 HOME (CENTER TAB) — vertical snap container: [Camera] ↕ [History] */}
        <div
          ref={homeSlideRef}
          className="hide-scrollbar"
          onScroll={handleHomeVerticalScroll}
          style={{
            flex: '0 0 100%',
            width: '100%',
            height: '100%',
            position: 'relative',
            overflowY: mode === 'preview' ? 'hidden' : 'auto',
            overflowX: 'hidden',
            scrollSnapType: 'y mandatory',
            touchAction: mode === 'preview' ? 'none' : 'pan-x pan-y',
            WebkitOverflowScrolling: 'touch',
            pointerEvents: activeTab === 'home' ? 'auto' : 'none'
          }}
        >
          {/* ── PAGE 1: Camera / Home ── */}
          <div className="screen-item" style={{ position: 'relative' }}>
            {mainHomeContent}
          </div>


          {/* ── HISTORY PAGES: Privacy-aware multi-collab rendering (Modularized) ── */}
          <HistoryFeed
            historyItems={historyItems}
            viewerIdentity={viewerIdentity}
            getIdentity={getIdentity}
            editingCaptionId={editingCaptionId}
            setEditingCaptionId={setEditingCaptionId}
            pendingCaption={pendingCaption}
            setPendingCaption={setPendingCaption}
            setShowViewersModal={setShowViewersModal}
            setHistoryItems={setHistoryItems}
            historyStickerPickerId={historyStickerPickerId}
            setHistoryStickerPickerId={setHistoryStickerPickerId}
            handleSendTextMessage={handleSendTextMessage}
            handleSendHeart={handleSendHeart}
            handleSendSticker={handleSendSticker}
            handleSendVoice={handleSendVoice}
            activeCollabDetailId={activeCollabDetailId}
            setActiveCollabDetailId={setActiveCollabDetailId}
            historyFeedRef={historyFeedRef}
            MOCK_FRIENDS={MOCK_FRIENDS}
            onNavigateToChat={(senderName, senderColor, _ctx) => {
              setDeepLinkChatName(senderName);
              setDeepLinkChatColor(senderColor);
              setTimeout(() => setActiveTab('chat'), 200);
            }}
            onAcceptCollab={(itemId) => {
              setHistoryItems(prev => prev.map(i =>
                i.id === itemId
                  ? {
                    ...i,
                    collabStatus: 'accepted' as const,
                    collabPartners: [
                      ...(i.collabPartners || []),
                      {
                        name: 'You',
                        color: '#FFD700',
                        avatar: undefined, // Will be filled by getIdentity
                        sendTo: ['all'],
                      },
                    ],
                  }
                  : i
              ));
            }}
            onDeclineCollab={(itemId) => {
              setHistoryItems(prev => prev.map(i =>
                i.id === itemId ? { ...i, collabStatus: 'declined' as any } : i
              ));
            }}
            onLeaveCollab={(itemId) => {
              setHistoryItems(prev => prev.map(i =>
                i.id === itemId
                  ? { ...i, collabStatus: undefined, collabPartners: undefined, collabInviter: undefined, collabInviterColor: undefined, collabInviterAvatar: undefined }
                  : i
              ));
            }}
            isFriend={isFriend}
            sortAvatars={sortAvatars}
          />
        </div>

        {/* ── PARTICLE SYSTEM (Floating Icons) ── */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 5000, overflow: 'hidden' }}>
          {particles.map(p => (
            <div
              key={p.id}
              style={{
                position: 'absolute',
                left: `${p.x}%`,
                bottom: -50,
                fontSize: p.size,
                animation: `floatUpFade 2s ease-out ${p.delay}s forwards`,
                opacity: 0,
                filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))'
              }}
            >
              {p.icon}
            </div>
          ))}
          <style>{`
            @keyframes floatUpFade {
              0% { transform: translateY(0) scale(0.5); opacity: 0; }
              20% { opacity: 1; transform: translateY(-100px) scale(1.1); }
              100% { transform: translateY(-600px) scale(1); opacity: 0; }
            }
          `}</style>
        </div>


        {/* 1.3 CHAT (RIGHT TAB) */}
        <div style={{
          flex: '0 0 100%',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          paddingTop: 0,
          overflowY: 'hidden',
          pointerEvents: activeTab === 'chat' ? 'auto' : 'none'
        }}>
          <MessagesScreen
            ref={messagesRef}
            onToggleDetail={(isOpen) => setIsChatDetailOpen(isOpen)}
            onDetailProgress={handleDetailProgress}
            onChatSelect={() => { }}
            allChats={allChats}
            onUpdateChat={(name, updater) => {
              setAllChats(prev => {
                const prevMsgs = prev[name] || [];
                const nextMsgs = typeof updater === 'function' ? (updater as any)(prevMsgs) : updater;
                return { ...prev, [name]: nextMsgs };
              });
            }}
            unreadChats={unreadChats}
            onMarkAsRead={handleMarkAsRead}
            forceShowDetail={forceShowDetail || !!deepLinkChatName}
            forceChatName={deepLinkChatName || props.forceChatName}
            forceChatColor={deepLinkChatColor || props.forceChatColor}
            forceChatOptions={forceChatOptions}
            forceSearchMode={forceSearchMode}
            forceReplyEmoji={activeReplyEmoji}
            forceContextPhoto={activeReplyContext}
            onDeepLinkConsumed={() => {
              setDeepLinkChatName(undefined);
              setDeepLinkChatColor(undefined);
              setActiveReplyEmoji(undefined);
              setActiveReplyContext(undefined);
            }}
            handleSendTextMessage={handleSendTextMessage}
            handleSendHeart={handleSendHeart}
            handleSendSticker={handleSendSticker}
            handleSendVoice={handleSendVoice}
          />
        </div>
      </div>

      {/* 2. VERTICAL HISTORY MODAL (Swipe Down reveal) */}
      <style>{`
        @keyframes slideUpSheet {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
        @keyframes fadeInOverlay {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>

      {/* Clean App View: Removed OS Shell (Status Bar / Home Indicator) */}
      <div
        ref={bnavDOMRef}
        className="bnav"
        style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 115,
          opacity: mode === 'preview' ? 0 : 1,
          pointerEvents: isChatDetailOpen ? 'none' : (mode === 'preview' ? 'none' : 'auto'),
          transform: 'translateY(0)',
          willChange: 'opacity, transform',
        }}
      >
        {/* Activity Pill Removed */}


        {/* ── Grid button (bottom-left) ── */}
        <button
          onClick={() => setShowGridModal(true)}
          style={{
            position: 'absolute', left: 20, bottom: 24, zIndex: 2,
            background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', padding: 8,
            borderRadius: '50%',
            opacity: isInHistory && activeTab === 'home' ? 1 : 0,
            transform: isInHistory && activeTab === 'home' ? 'scale(1)' : 'scale(0.7)',
            transition: 'opacity 0.35s ease, transform 0.35s ease',
            pointerEvents: isInHistory && activeTab === 'home' ? 'auto' : 'none',
            display: 'flex', justifyContent: 'center', alignItems: 'center'
          }}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
            <rect x="2" y="2" width="9" height="9" rx="2" fill="rgba(255,255,255,0.75)" />
            <rect x="13" y="2" width="9" height="9" rx="2" fill="rgba(255,255,255,0.75)" />
            <rect x="2" y="13" width="9" height="9" rx="2" fill="rgba(255,255,255,0.75)" />
            <rect x="13" y="13" width="9" height="9" rx="2" fill="rgba(255,255,255,0.75)" />
          </svg>
        </button>



        {/* ── Share/Options button (bottom-right) ── */}
        <button
          onClick={() => setShowSharePanel(true)}
          style={{
            position: 'absolute', right: 20, bottom: 24, zIndex: 2,
            background: 'none', border: 'none', cursor: 'pointer', padding: 8,
            opacity: isInHistory && activeTab === 'home' ? 1 : 0,
            transform: isInHistory && activeTab === 'home' ? 'scale(1)' : 'scale(0.7)',
            transition: 'opacity 0.35s ease, transform 0.35s ease',
            pointerEvents: isInHistory && activeTab === 'home' ? 'auto' : 'none',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12v7a2 2 0 002 2h12a2 2 0 002-2v-7" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" y1="2" x2="12" y2="15" />
          </svg>
        </button>

        {/* ── PILL NAV — always the same pill, center icon swaps with fade ── */}
        <div
          className="bnav-pill"
          ref={navPillRef}
          onPointerDown={handleTabDragStart}
          data-name="Container / Navigation / Pill"
          style={{
            touchAction: 'none',
            opacity: isChatDetailOpen ? 0 : 1,
            pointerEvents: isChatDetailOpen ? 'none' : 'auto',
            transform: isChatDetailOpen ? 'translateY(24px)' : (mode === 'preview' ? 'translateY(20px)' : 'translateY(0)'),
            transition: 'opacity 0.25s ease, transform 0.25s ease'
          }}
        >
          <div
            className="nav-indicator"
            ref={indicatorRef}
            data-name="Nav / Active Indicator"
            style={{ transform: `translateX(${tabs.indexOf(activeTab) * 52}px)` }}
          />

          {/* Left: Calendar icon (always the same) */}
          <button
            className={`nav-item${activeTab === 'calendar' ? ' active' : ''}`}
            data-name="Tab / Navigation / Calendar"
            id="GOTO:TAB_CALENDAR"
          >
            <svg viewBox="0 0 24 24" fill="none" width="24" height="24">
              <rect x="2" y="2" width="5.5" height="5.5" rx="1.3" fill="rgba(255,255,255,.75)" />
              <rect x="9.25" y="2" width="5.5" height="5.5" rx="1.3" fill="rgba(255,255,255,.75)" />
              <rect x="16.5" y="2" width="5.5" height="5.5" rx="1.3" fill="rgba(255,255,255,.75)" />
              <rect x="2" y="9.25" width="5.5" height="5.5" rx="1.3" fill="rgba(255,255,255,.75)" />
              <rect x="9.25" y="9.25" width="5.5" height="5.5" rx="1.3" fill="rgba(255,255,255,.75)" />
              <rect x="16.5" y="9.25" width="5.5" height="5.5" rx="1.3" fill="rgba(255,255,255,.75)" />
              <rect x="2" y="16.5" width="5.5" height="5.5" rx="1.3" fill="rgba(255,255,255,.75)" />
              <rect x="9.25" y="16.5" width="5.5" height="5.5" rx="1.3" fill="rgba(255,255,255,.75)" />
              <rect x="16.5" y="16.5" width="5.5" height="5.5" rx="1.3" fill="rgba(255,255,255,.75)" />
            </svg>
            {HAS_NEW_CONTENT && <div className="nav-dot-new" />}
          </button>

          {/* Center: Home icon ↔ Camera Shot icon (cross-fade) */}
          <button
            className={`nav-item${activeTab === 'home' ? ' active' : ''}`}
            data-name="Tab / Navigation / Home"
            id="GOTO:TAB_HOME"
            onClick={() => {
              if (isInHistory && homeSlideRef.current) {
                homeSlideRef.current.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
            style={{ position: 'relative' }}
          >
            {/* Home icon — fades out in History */}
            <svg viewBox="0 0 24 24" fill="white" width="24" height="24" style={{
              position: 'absolute',
              opacity: isInHistory && activeTab === 'home' ? 0 : 1,
              transform: isInHistory && activeTab === 'home' ? 'scale(0.6)' : 'scale(1)',
              transition: 'opacity 0.35s ease, transform 0.35s ease',
            }}>
              <path d="M4 21V10L12 3L20 10V21H15V15C15 13.34 13.66 12 12 12C10.34 12 9 13.34 9 15V21H4Z" />
            </svg>
            {/* Camera Shot circle — fades in during History */}
            {/* Camera Shot circle — fades in during History */}
            <div style={{
              width: 22, height: 22, borderRadius: '50%',
              border: '2.5px solid rgba(255,255,255,0.9)',
              opacity: isInHistory && activeTab === 'home' ? 1 : 0,
              transform: isInHistory && activeTab === 'home' ? 'scale(1)' : 'scale(0.6)',
              transition: 'opacity 0.35s ease, transform 0.35s ease',
            }}>
              <div style={{
                width: '100%', height: '100%', borderRadius: '50%',
                background: 'rgba(255,255,255,0.85)',
                transform: 'scale(0.75)',
              }} />
            </div>
          </button>

          {/* Right: Chat icon (always the same) */}
          <button
            className={`nav-item${activeTab === 'chat' ? ' active' : ''}`}
            data-name="Tab / Navigation / Chat"
            id="GOTO:TAB_CHAT"
          >
            <svg viewBox="0 0 24 24" fill="white" width="24" height="24" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }}>
              <path d="M12 2C6.48 2 2 6.48 2 12c0 1.54.36 2.98.98 4.27L2 22l5.73-1c1.29.62 2.73.98 4.27.98 5.52 0 10-4.48 10-10S17.52 2 12 2z" />
            </svg>
            {UNREAD_MESSAGES > 0 && (
              <div className="nav-badge-unread">
                <span>{UNREAD_MESSAGES}</span>
              </div>
            )}
          </button>
        </div>
      </div>

      {/* ── CHALLENGE MODAL ── */}
      {showChallengeModal && (
        <ChallengeModal
          onClose={() => setShowChallengeModal(false)}
          challengeImages={challengeImages}
          onSelectSlot={handleSelectChallengeSlot}
        />
      )}

      {/* ── FULL-SCREEN CALENDAR PHOTO VIEWER (LOCKET STYLE) ── */}
      {selectedCalendarPhoto && (
        <MemoriesViewerModal
          initialPhoto={selectedCalendarPhoto}
          historyItems={historyItems}
          viewerIdentity={viewerIdentity}
          onClose={() => setSelectedCalendarPhoto(null)}
        />
      )}

      {/* ── MONTH DETAIL MODAL ── */}
      {showMonthDetail && (
        <MonthDetailModal
          month={showMonthDetail.month}
          year={showMonthDetail.year}
          historyItems={historyItems}
          challengeImages={challengeImages}
          viewerIdentity={viewerIdentity}
          onClose={() => setShowMonthDetail(null)}
        />
      )}

      {/* ── MEMORY DETAIL MODAL ── */}
      {showMemoryDetail && (
        <MemoryDetailModal
          historyItems={historyItems}
          challengeImages={challengeImages}
          viewerIdentity={viewerIdentity}
          onClose={() => setShowMemoryDetail(false)}
        />
      )}

      {/* ── MAP VIEW MODAL ── */}
      {showMapView && (
        <MapsArchiveView
          historyItems={historyItems}
          viewerIdentity={viewerIdentity}
          onClose={() => setShowMapView(false)}
        />
      )}

      {/* ── LOCATION PICKER MODAL ── */}
      {showLocationPicker && (
        <LocationPickerModal
          selectedLocation={selectedLocation}
          onSelect={(loc) => { setSelectedLocation(loc); setShowLocationPicker(false); }}
          onClose={() => setShowLocationPicker(false)}
        />
      )}

      {/* ── VIEWERS MODAL (Now a standard Bottom Sheet like Friends/Profile) ── */}
      {showViewersModal && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 7500,
          background: `rgba(0,0,0,${Math.max(0, 0.6 - viewersSheetOffset * 0.001)})`,
          animation: 'fadeInOverlay 0.3s ease-out',
        }} onClick={() => { setShowViewersModal(false); setViewersSheetOffset(0); }}>
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              top: 'calc(100% * 2 / 7)',
              background: 'rgba(18, 18, 18, 0.98)',
              backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)',
              borderRadius: '32px 32px 0 0',
              display: 'flex', flexDirection: 'column',
              boxShadow: '0 -20px 60px rgba(0,0,0,0.7)',
              transform: `translateY(${viewersSheetOffset}px)`,
              transition: isViewersDragging ? 'none' : 'transform 0.5s cubic-bezier(0.19, 1, 0.22, 1)',
              animation: 'slideUpSheet 0.45s cubic-bezier(0.16, 1, 0.3, 1)',
              overflow: 'hidden'
            }}
            className={`sheet-container ${isViewersDragging ? 'dragging' : ''}`}
          >
            {/* Standard Grab Handle */}
            <div
              onPointerDown={(e) => {
                viewersDragRef.current.isDown = true;
                viewersDragRef.current.startY = e.pageY - viewersSheetOffset;
                viewersDragRef.current.lastY = e.pageY;
                viewersDragRef.current.lastT = Date.now();
                setIsViewersDragging(true);
                (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
              }}
              onPointerMove={(e) => {
                if (!viewersDragRef.current.isDown) return;
                const dy = Math.max(0, e.pageY - viewersDragRef.current.startY);
                const now = Date.now();
                const dt = Math.max(1, now - viewersDragRef.current.lastT);
                viewersDragRef.current.vel = (e.pageY - viewersDragRef.current.lastY) / dt;
                viewersDragRef.current.lastY = e.pageY;
                viewersDragRef.current.lastT = now;
                setViewersSheetOffset(dy);
              }}
              onPointerUp={() => {
                if (!viewersDragRef.current.isDown) return;
                viewersDragRef.current.isDown = false;
                setIsViewersDragging(false);
                if (viewersSheetOffset > 150 || viewersDragRef.current.vel > 0.5) {
                  setShowViewersModal(false);
                  setTimeout(() => setViewersSheetOffset(0), 400);
                } else {
                  setViewersSheetOffset(0);
                }
              }}
              style={{ padding: '12px 0 20px', cursor: 'grab', touchAction: 'none' }}
            >
              <div style={{ width: 36, height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.2)', margin: '0 auto' }} />
            </div>

            {/* Header Content */}
            <div style={{ padding: '0 24px 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 style={{ color: '#fff', fontSize: 19, fontWeight: 900, margin: 0, letterSpacing: -0.5 }}>Activity</h3>
            </div>

            <div className="settings-scroll" style={{ flex: 1, overflowY: 'auto', paddingBottom: 60 }}>
              {(() => {
                const currentItem = historyItems[currentHistoryIdx];
                if (!currentItem) return null;

                const collabPartners = currentItem.collabPartners || [];
                const viewedBy = currentItem.viewedBy || {};

                // My friends who received this post
                const myFriendRecipients = MOCK_FRIENDS.filter(f =>
                  currentItem.sendTo.includes('all') || currentItem.sendTo.includes(f.name)
                );

                const viewedFriends = myFriendRecipients.filter(f => viewedBy[f.name]);
                const sentButNotViewed = myFriendRecipients.filter(f => !viewedBy[f.name]);

                // Non-friend viewers from collab partners' audience
                const myFriendNames = new Set(MOCK_FRIENDS.map(f => f.name));
                const collabNonFriends: Array<{ id: string; name: string; color: string; avatar: string; time: string }> = [];
                collabPartners.forEach(partner => {
                  const partnerAudience = partner.sendTo.includes('all')
                    ? NON_FRIEND_VIEWERS
                    : NON_FRIEND_VIEWERS.filter(nf => partner.sendTo.includes(nf.name));
                  partnerAudience.forEach(nf => {
                    if (!myFriendNames.has(nf.name) && !collabNonFriends.find(x => x.id === nf.id)) {
                      collabNonFriends.push(nf);
                    }
                  });
                });

                const totalViewCount = viewedFriends.length + collabNonFriends.length;

                return (
                  <>
                    {/* ── Viewed section ── */}
                    <div style={{ padding: '20px 24px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.5 }}>
                        Viewed · {totalViewCount}
                      </span>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="rgba(255,255,255,0.25)"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
                    </div>

                    {viewedFriends.length === 0 && collabNonFriends.length === 0 && (
                      <div style={{ padding: '16px 24px', color: 'rgba(255,255,255,0.25)', fontSize: 14, fontWeight: 600 }}>
                        No one has viewed yet
                      </div>
                    )}

                    {viewedFriends.map((f) => {
                      const reactionEmoji = currentItem?.reactions?.[f.name];
                      return (
                        <ViewerRow
                          key={f.id}
                          identity={f}
                          reaction={reactionEmoji}
                          time={viewedBy[f.name]}
                          onReply={() => {
                            setRepliedViewer({
                              name: f.name,
                              reaction: reactionEmoji || '❤️',
                              identity: f
                            });
                          }}
                        />
                      );
                    })}

                    {/* Non-friend collab viewers with Add Friend button */}
                    {collabNonFriends.map((nf) => (
                      <ViewerRow
                        key={nf.id}
                        identity={nf}
                        time={nf.time}
                        onAddFriend={() => setAddedFriends(prev => new Set(prev).add(nf.id))}
                        isAdded={addedFriends.has(nf.id)}
                      />
                    ))}

                    {/* ── Sent but not yet viewed ── */}
                    {sentButNotViewed.length > 0 && (
                      <>
                        <div style={{ padding: '20px 24px 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.5 }}>
                            Sent · {sentButNotViewed.length}
                          </span>
                        </div>
                        {sentButNotViewed.map((f) => (
                          <ViewerRow
                            key={f.id}
                            identity={f}
                            time=""
                            isSent
                            onReply={() => {}}
                          />
                        ))}
                      </>
                    )}
                  </>
                );
              })()}
            </div>

            {/* REPLY INPUT BAR (Module 1 Polish) */}
            {repliedViewer && (
              <div style={{
                padding: '16px 16px 38px',
                background: 'rgba(18,18,18,0.95)',
                backdropFilter: 'blur(40px)',
                borderTop: '1.5px solid rgba(255,255,255,0.12)',
                boxShadow: '0 -20px 50px rgba(0,0,0,0.6)',
                animation: 'slideUpSheet 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                zIndex: 20
              }}>
                {/* Context Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, padding: '0 4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ position: 'relative', width: 34, height: 34 }}>
                      <img src={historyItems[currentHistoryIdx].image} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)' }} alt="" />
                      <div style={{ position: 'absolute', top: -5, left: -5, background: '#000', borderRadius: '50%', width: 14, height: 14, display: 'flex', justifyContent: 'center', alignItems: 'center', border: '1px solid rgba(255,255,255,0.3)', fontSize: 10 }}>
                        {repliedViewer.reaction}
                      </div>
                    </div>
                    <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 700 }}>Replied to {repliedViewer.name}</span>
                  </div>
                  <button onClick={() => setRepliedViewer(null)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', width: 26, height: 26, borderRadius: '50%', fontSize: 16 }}>×</button>
                </div>

                {/* The "Send a Message" Style Input (Module 5 Style Match) */}
                <div style={{
                  height: 54, background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(25px)',
                  borderRadius: 27, display: 'flex', alignItems: 'center', padding: '0 6px 0 18px', gap: 8,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                  border: '1px solid rgba(255,255,255,0.15)',
                }}>
                  <input
                    autoFocus
                    placeholder={`Reply to ${repliedViewer.name}...`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSendHistoryReply((e.target as HTMLInputElement).value);
                      }
                    }}
                    style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'white', fontSize: 15, fontWeight: 600 }}
                  />

                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <button
                      onClick={(e) => {
                        const input = (e.currentTarget.parentElement?.previousSibling as HTMLInputElement);
                        handleSendHistoryReply(input.value);
                      }}
                      style={{
                        width: 42, height: 42, borderRadius: '50%',
                        background: '#FFD700', border: 'none',
                        display: 'flex', justifyContent: 'center', alignItems: 'center',
                        boxShadow: '0 4px 12px rgba(255,215,0,0.3)',
                        cursor: 'pointer'
                      }}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="3"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── SHARE / OPTIONS PANEL (Bottom Sheet) ── */}
      {showSharePanel && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.45)', animation: 'fadeInOverlay 0.3s ease-out' }} onClick={() => setShowSharePanel(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute', bottom: 12, left: 12, right: 12,
              background: 'rgba(25,25,25,0.7)', backdropFilter: 'blur(45px)',
              borderRadius: 36, padding: '24px 20px 42px',
              border: '1px solid rgba(255,255,255,0.08)',
              animation: 'slideUpModal 0.4s cubic-bezier(0.19, 1, 0.22, 1)',
              display: 'flex', flexDirection: 'column', gap: 24,
              boxShadow: '0 -20px 60px rgba(0,0,0,0.6)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.2)', marginBottom: 8 }} />
              <button
                onClick={() => setShowSharePanel(false)}
                style={{ position: 'absolute', right: 0, top: -4, background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: 28, height: 28, color: '#fff', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            <h3 style={{ color: '#fff', fontSize: 18, fontWeight: 800, textAlign: 'center', margin: 0 }}>Share to...</h3>

            {/* Social Row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 10px' }}>
              {[
                { label: 'Messages', color: '#34C759', icon: 'M' },
                { label: 'Instagram', color: '#E1306C', icon: 'I' },
                { label: 'Snapchat', color: '#FFFC00', icon: 'S' },
                { label: 'Report', color: 'rgba(255,255,255,0.1)', icon: '🚩' },
                { label: 'Block', color: 'rgba(255,255,255,0.1)', icon: '🚫' }
              ].map((social, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 56, height: 56, borderRadius: '50%', backgroundColor: social.color, display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#fff', fontSize: 22 }}>
                    {social.icon}
                  </div>
                  <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: 600 }}>{social.label}</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => {
                  const currentItem = historyItems[currentHistoryIdx];
                  if (currentItem && currentItem.sender === viewerIdentity) {
                    if (currentItem.collabPartners && currentItem.collabPartners.length > 0) {
                      setShowViewersModal(true);
                      setViewersSnapPoint('full');
                    } else {
                      setIsFriendsModalOpen(true);
                    }
                  }
                  setShowSharePanel(false);
                }}
                style={{ flex: 1, height: 50, borderRadius: 25, background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                <span>{(historyItems[currentHistoryIdx]?.collabPartners?.length ?? 0) > 0 ? 'Fix Collabs' : 'Add Collabs'}</span>
              </button>
              <button
                style={{ flex: 1, height: 50, borderRadius: 25, background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                <span>Location <span style={{ fontSize: 14 }}>📍</span></span>
              </button>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button style={{ flex: 1, height: 54, borderRadius: 27, background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', fontSize: 16, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                Save
              </button>
              <button
                onClick={() => {
                  setHistoryItems(prev => prev.filter((_, i) => i !== currentHistoryIdx));
                  setShowSharePanel(false);
                }}
                style={{ flex: 1, height: 54, borderRadius: 27, background: 'rgba(255,69,58,0.15)', border: 'none', color: '#FF453A', fontSize: 16, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── GRID MODAL (3-column photo grid of History) ── */}
      {showGridModal && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 6000,
          background: 'rgba(0,0,0,0.7)',
          animation: 'fadeInOverlay 0.25s ease-out',
          display: 'flex', flexDirection: 'column',
        }} onClick={() => setShowGridModal(false)}>
          {/* Header */}
          <div style={{
            padding: '56px 20px 16px', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }} onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setShowGridModal(false)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: 4, WebkitTapHighlightColor: 'transparent',
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <span style={{ color: '#fff', fontSize: 18, fontWeight: 800 }}>History</span>
            <div style={{ width: 32 }} />
          </div>

          {/* Grid */}
          <div
            onClick={e => e.stopPropagation()}
            className="settings-scroll"
            style={{
              flex: 1, overflowY: 'auto', padding: '0 6px 40px',
              display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 3, alignContent: 'start',
            }}
          >
            {historyItems.map((item, idx) => (
              <button
                key={item.id}
                onClick={() => {
                  setShowGridModal(false);
                  // Scroll to this history page
                  if (homeSlideRef.current) {
                    const h = homeSlideRef.current.clientHeight;
                    homeSlideRef.current.scrollTo({ top: (idx + 1) * h, behavior: 'smooth' });
                  }
                }}
                style={{
                  aspectRatio: '1/1', position: 'relative',
                  background: '#1C1C1E', border: 'none',
                  borderRadius: 8, overflow: 'hidden',
                  cursor: 'pointer', padding: 0,
                }}
              >
                <img src={item.image} alt="" style={{
                  width: '100%', height: '100%', objectFit: 'cover',
                }} />
                {/* Sender chip overlay */}
                <div style={{
                  position: 'absolute', bottom: 6, left: 6, right: 6,
                  display: 'flex', alignItems: 'center', gap: 4,
                }}>
                  {item.sender !== 'You' && (
                    <div style={{
                      width: 18, height: 18, borderRadius: '50%',
                      backgroundColor: item.senderColor, flexShrink: 0,
                      display: 'flex', justifyContent: 'center', alignItems: 'center',
                    }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="rgba(255,255,255,0.85)">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                      </svg>
                    </div>
                  )}
                  <span style={{
                    color: '#fff', fontSize: 10, fontWeight: 700,
                    textShadow: '0 1px 4px rgba(0,0,0,0.8)',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>{item.sender === 'You' ? 'You' : item.sender}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 4. PHOTO COLLAB MODAL (Request Collab Selection - High Fidelity Bottom Sheet) */}
      {isCollabModalOpen && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 5500,
          background: 'rgba(0,0,0,0.5)',
          animation: 'fadeInOverlay 0.3s ease-out'
        }}>
          <div
            onClick={() => setIsCollabModalOpen(false)}
            style={{ position: 'absolute', inset: 0 }}
          />
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, top: 44,
            background: 'rgba(28, 28, 30, 0.95)',
            backdropFilter: 'blur(25px)', WebkitBackdropFilter: 'blur(25px)',
            borderRadius: '16px 16px 0 0',
            display: 'flex', flexDirection: 'column',
            boxShadow: '0 -10px 40px rgba(0,0,0,0.5)',
            transform: `translateY(${sheetOffset}px)`,
            zIndex: 5000
          }} className={`sheet-container${isSheetDragging ? ' dragging' : ''}`}>
            {/* Drag Handle Area (Large touch target for gestures) */}
            <div
              onPointerDown={(e) => {
                sheetDragRef.current.isDown = true;
                sheetDragRef.current.startY = e.pageY - sheetOffset;
                sheetDragRef.current.lastY = e.pageY;
                sheetDragRef.current.lastT = Date.now();
                setIsSheetDragging(true);
                (e.currentTarget as any).setPointerCapture(e.pointerId);
              }}
              onPointerMove={(e) => {
                if (!sheetDragRef.current.isDown) return;
                const dy = e.pageY - sheetDragRef.current.startY;
                const now = Date.now();
                const dt = Math.max(1, now - sheetDragRef.current.lastT);
                sheetDragRef.current.vel = (e.pageY - sheetDragRef.current.lastY) / dt;
                sheetDragRef.current.lastY = e.pageY;
                sheetDragRef.current.lastT = now;

                if (dy < 0) {
                  // HARD CLAMP AT 0 (No upward dragging allowed)
                  setSheetOffset(0);
                } else {
                  setSheetOffset(dy);
                }
              }}
              onPointerUp={(e) => {
                if (!sheetDragRef.current.isDown) return;
                sheetDragRef.current.isDown = false;
                setIsSheetDragging(false);
                (e.currentTarget as any).releasePointerCapture(e.pointerId);

                const threshold = 160;
                const velocityThreshold = 0.5;

                if (sheetOffset > threshold || sheetDragRef.current.vel > velocityThreshold) {
                  // Dismiss animation
                  setSheetOffset(window.innerHeight);
                  setTimeout(() => {
                    setIsCollabModalOpen(false);
                    setSheetOffset(0);
                  }, 300);
                } else {
                  setSheetOffset(0);
                }
              }}
              style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 0 20px', cursor: 'grab', touchAction: 'none' }}
            >
              <div style={{ width: 40, height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.2)', marginBottom: 15 }} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: 'white', fontSize: 19, fontWeight: 800 }}>Ask who to collab with</div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, fontWeight: 500 }}>Send a request to someone to ask for a collab</div>
              </div>
            </div>


            {/* Search Bar */}
            <div style={{ padding: '0 20px 10px' }}>
              <div style={{
                background: 'rgba(255,255,255,0.08)', borderRadius: 16, padding: '12px 16px',
                display: 'flex', alignItems: 'center', gap: 10
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="3">
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" />
                </svg>
                <input
                  placeholder="Search"
                  value={collabSearch}
                  onChange={(e) => setCollabSearch(e.target.value)}
                  style={{ background: 'none', border: 'none', color: 'white', flex: 1, outline: 'none', fontSize: 16 }}
                />
              </div>
            </div>

            {/* Friends List */}
            <div className="settings-scroll" style={{ flex: 1, overflowY: 'auto', padding: '10px 20px' }}>
              {MOCK_FRIENDS.filter(f => f.name.toLowerCase().includes(collabSearch.toLowerCase())).map(f => {
                const isCollabed = selectedCollabFriends.includes(f.id);
                return (
                  <div
                    key={f.id}
                    onClick={() => {
                      if (isCollabed) {
                        setSelectedCollabFriends(prev => prev.filter(id => id !== f.id));
                      } else {
                        setSelectedCollabFriends(prev => [...prev, f.id]);
                        // Sync: Also select as recipient
                        setSelectedFriends(prev => prev.includes(f.id) ? prev : [...prev, f.id]);
                        setIsAllSelected(false);
                      }
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0',
                      borderBottom: '1px solid rgba(255,255,255,0.03)', cursor: 'pointer'
                    }}
                  >
                    <div style={{
                      width: 44, height: 44, borderRadius: '50%',
                      backgroundColor: f.color,
                      backgroundImage: `url(${f.avatar})`,
                      backgroundSize: 'cover'
                    }} />
                    <div style={{ flex: 1, color: 'white', fontWeight: 600 }}>{f.name}</div>
                    <div style={{
                      width: 24, height: 24, borderRadius: '50%',
                      border: isCollabed ? 'none' : '2px solid rgba(255,255,255,0.2)',
                      background: isCollabed ? '#FFC800' : 'none',
                      display: 'flex', justifyContent: 'center', alignItems: 'center'
                    }}>
                      {isCollabed && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="4">
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* FADE-OUT GRADIENT AT BOTTOM (Depth effect) */}
            <div style={{
              position: 'absolute', bottom: 106, left: 0, right: 0, height: 60,
              background: 'linear-gradient(to top, rgba(28,28,30,1) 0%, rgba(28,28,30,0) 100%)',
              pointerEvents: 'none', zIndex: 10
            }} />

            {/* Footer with Confirm Button */}
            <div style={{ padding: '20px 20px 50px', background: 'transparent' }}>
              <button
                onClick={() => {
                  // Confirm effect: Slide down
                  const newPartners = selectedCollabFriends.filter(id => !selectedFriends.includes(id) && !isAllSelected);
                  if (newPartners.length > 0) {
                    setCollabSyncTarget(newPartners[0]);
                  } else {
                    setSheetOffset(window.innerHeight);
                    setTimeout(() => {
                      setIsCollabModalOpen(false);
                      setSheetOffset(0);
                    }, 350);
                  }
                }}
                style={{
                  width: '100%', height: 56, borderRadius: 28, background: '#FFC800',
                  color: 'black', fontWeight: 800, fontSize: 17, border: 'none', cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(255,200,0,0.3)'
                }}
              >
                Collabs
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. HISTORY FILTER MODAL (Everyone/You/Friends) */}
      {showHistoryFilterModal && (
        <div
          style={{
            position: 'absolute', inset: 0, zIndex: 6500,
            background: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
            animation: 'fadeInOverlay 0.25s ease-out',
            display: 'flex', flexDirection: 'column',
          }}
          onClick={() => setShowHistoryFilterModal(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position: 'absolute', bottom: 0, left: 0, right: 0, top: 120,
              background: 'rgba(28,28,30,0.96)',
              borderRadius: '32px 32px 0 0',
              display: 'flex', flexDirection: 'column',
              boxShadow: '0 -10px 40px rgba(0,0,0,0.5)',
              animation: 'slideUpSheet 0.38s cubic-bezier(0.32,1,0.67,1)',
            }}
          >
            {/* Header / Drag Handle */}
            <div style={{ padding: '16px 0 10px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: 36, height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.25)', marginBottom: 20 }} />
              <span style={{ color: '#fff', fontSize: 18, fontWeight: 800 }}>Filter History</span>
            </div>

            {/* List */}
            <div className="settings-scroll" style={{ flex: 1, overflowY: 'auto', padding: '10px 0 40px' }}>
              {/* Static Options */}
              {[
                { id: 'everyone', name: 'Everyone', icon: '🌎' },
                { id: 'you', name: 'You', icon: '👤' },
              ].map(opt => (
                <div
                  key={opt.id}
                  onClick={() => {
                    setHistoryFilter(opt.name);
                    setShowHistoryFilterModal(false);
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '14px 28px',
                    borderBottom: '1px solid rgba(255,255,255,0.03)',
                    cursor: 'pointer',
                    background: historyFilter === opt.name ? 'rgba(255,255,255,0.05)' : 'transparent',
                  }}
                >
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%',
                    background: 'rgba(255,255,255,0.1)',
                    display: 'flex', justifyContent: 'center', alignItems: 'center',
                    fontSize: 20
                  }}>
                    {opt.icon}
                  </div>
                  <span style={{
                    color: historyFilter === opt.name ? '#FFC800' : '#fff',
                    fontSize: 17, fontWeight: 800, flex: 1
                  }}>
                    {opt.name}
                  </span>
                  {historyFilter === opt.name && (
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FFC800' }} />
                  )}
                </div>
              ))}

              {/* Friends List */}
              <div style={{ padding: '24px 28px 10px', color: 'rgba(255,255,255,0.4)', fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Followed Friends
              </div>
              {MOCK_FRIENDS.map(f => (
                <div
                  key={f.id}
                  onClick={() => {
                    setHistoryFilter(f.name);
                    setShowHistoryFilterModal(false);
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '14px 28px',
                    borderBottom: '1px solid rgba(255,255,255,0.03)',
                    cursor: 'pointer',
                    background: historyFilter === f.name ? 'rgba(255,255,255,0.05)' : 'transparent',
                  }}
                >
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%',
                    backgroundColor: f.color,
                    display: 'flex', justifyContent: 'center', alignItems: 'center'
                  }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="rgba(255,255,255,0.85)">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                    </svg>
                  </div>
                  <span style={{
                    color: historyFilter === f.name ? '#FFC800' : '#fff',
                    fontSize: 17, fontWeight: 800, flex: 1
                  }}>
                    {f.name}
                  </span>
                  {historyFilter === f.name && (
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FFC800' }} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {collabSyncTarget && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 130, background: 'rgba(0,0,0,0.6)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 30,
          backdropFilter: 'blur(8px)'
        }}>
          <div style={{
            background: '#1c1c1e', borderRadius: 32, padding: 24, width: '100%', maxWidth: 320,
            display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center'
          }}>
            <div style={{
              width: 60, height: 60, borderRadius: '50%',
              backgroundColor: MOCK_FRIENDS.find(f => f.id === collabSyncTarget)?.color,
              marginBottom: 16
            }} />
            <div style={{ color: 'white', fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
              Audience Update
            </div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, lineHeight: 1.4, marginBottom: 24 }}>
              {MOCK_FRIENDS.find(f => f.id === collabSyncTarget)?.name} is not in your audience. Add them so they can collab?
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
              <button
                onClick={() => {
                  if (collabSyncTarget) {
                    setSelectedFriends(prev => [...prev, collabSyncTarget]);
                    setIsAllSelected(false);
                    setCollabSyncTarget(null);
                    // If no more partners to sync, close selection
                    const remaining = selectedCollabFriends.slice(selectedCollabFriends.indexOf(collabSyncTarget) + 1).filter(id => !selectedFriends.includes(id) && !isAllSelected);
                    if (remaining.length === 0) setIsCollabModalOpen(false);
                    else setCollabSyncTarget(remaining[0]);
                  }
                }}
                style={{ height: 50, borderRadius: 25, background: '#FFC800', border: 'none', color: 'black', fontWeight: 700, fontSize: 15 }}
              >
                Send to {MOCK_FRIENDS.find(f => f.id === collabSyncTarget)?.name}
              </button>
              <button
                onClick={() => {
                  // Hủy collab với người này nếu không add vào audience
                  setSelectedCollabFriends(prev => prev.filter(id => id !== collabSyncTarget));
                  setCollabSyncTarget(null);
                }}
                style={{ height: 50, borderRadius: 25, background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', fontWeight: 600, fontSize: 15 }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── GLOBAL MODAL FOR VIEWING HISTORY PARTNERS ── */}
      {activeCollabDetailId && (
        <div
          onClick={(e) => { e.stopPropagation(); setActiveCollabDetailId(null); }}
          style={{
            position: 'absolute', inset: 0, zIndex: 14000,
            background: 'rgba(0,0,0,0.45)', // Simple shadow, no blur
            animation: 'fadeInOverlay 0.3s ease-out',
            display: 'flex', justifyContent: 'center', alignItems: 'flex-end',
            paddingBottom: 120 // Position above BottomTab (approx 120px)
          }}
        >
          {(() => {
            const item = historyItems.find(i => i.id === activeCollabDetailId);
            if (!item) return null;
            const isMeAuthor = item.sender === viewerIdentity;
            const partners = item.collabPartners || [];
            const visiblePartners = partners.filter((p: any) => {
              if (p.name === item.sender) return false;
              if (p.name === viewerIdentity) return true;
              if (p.hideCollab) return false;
              if (p.sendTo.includes('all')) return true;
              return p.sendTo.includes(viewerIdentity);
            }).map((p: any) => ({
              ...p,
              displayName: p.name === viewerIdentity ? 'You' : (p.anonymousCollab ? 'Anonymous' : p.name),
              displayColor: p.anonymousCollab ? '#888' : p.color,
              displayAvatar: p.anonymousCollab ? undefined : p.avatar,
              isAnonymous: !!p.anonymousCollab,
              isSelf: p.name === viewerIdentity
            })).sort((a: any, b: any) => (a.isSelf ? -1 : b.isSelf ? 1 : 0));

            return (
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  width: 280, background: 'rgba(25, 25, 25, 0.9)',
                  backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)',
                  borderRadius: 32, padding: 24, display: 'flex',
                  flexDirection: 'column', gap: 16,
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  boxShadow: '0 30px 80px rgba(0,0,0,0.8)',
                  animation: 'popIn 0.3s cubic-bezier(0.19, 1, 0.22, 1)'
                }}
              >
                {/* Sender */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%',
                      background: isMeAuthor ? '#FFD700' : item.senderColor,
                      display: 'flex', justifyContent: 'center', alignItems: 'center',
                      border: '1.5px solid rgba(255, 255, 255, 0.1)',
                      backgroundImage: getIdentity(item.sender).avatar ? `url(${getIdentity(item.sender).avatar})` : undefined,
                      backgroundSize: 'cover'
                    }}>
                      {!getIdentity(item.sender).avatar && (
                        <span style={{ color: isMeAuthor ? '#000' : '#fff', fontSize: 14, fontWeight: 800 }}>
                          {(isMeAuthor ? 'You' : item.sender)[0]}
                        </span>
                      )}
                    </div>
                    <span style={{ color: '#fff', fontSize: 15, fontWeight: 800 }}>{isMeAuthor ? 'You' : item.sender}</span>
                  </div>
                  {/* Author can't 'remove' themselves from here yet, but a partner could potentially leave */}
                  {/* For now, only collaborators can be removed / can leave */}
                </div>

                {/* Partners */}
                {visiblePartners.map((p: any, pi: number) => (
                  <div key={pi} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%',
                        background: p.displayColor,
                        flexShrink: 0, display: 'flex', justifyContent: 'center', alignItems: 'center',
                        border: '1.5px solid rgba(255, 255, 255, 0.1)',
                        backgroundImage: p.displayAvatar ? `url(${p.displayAvatar})` : undefined,
                        backgroundSize: 'cover'
                      }}>
                        {p.isAnonymous && <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" /></svg>}
                        {!p.isAnonymous && !p.displayAvatar && <span style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>{p.name[0]}</span>}
                      </div>
                      <span style={{ color: '#fff', fontSize: 15, fontWeight: 800 }}>{p.displayName}</span>
                    </div>

                    {/* REMOVE BUTTON (X) */}
                    {(isMeAuthor || p.isSelf) && (
                      <button
                        onClick={() => {
                          // Simple removal logic: remove partner from state
                          setHistoryItems(prev => prev.map(hi => {
                            if (hi.id === item.id) {
                              const newPartners = (hi.collabPartners || []).filter(pp => pp.name !== p.name);
                              // If I'm the one leaving, also clear collabStatus
                              const statusUpdate = p.isSelf ? { collabStatus: undefined } : {};
                              return { ...hi, collabPartners: newPartners, ...statusUpdate };
                            }
                            return hi;
                          }));
                          if (p.isSelf) setActiveCollabDetailId(null);
                        }}
                        style={{
                          background: 'rgba(255, 255, 255, 0.08)', border: 'none',
                          width: 28, height: 28, borderRadius: '50%',
                          display: 'flex', justifyContent: 'center', alignItems: 'center',
                          cursor: 'pointer'
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      </button>
                    )}
                  </div>
                ))}

                <button
                  onClick={() => setActiveCollabDetailId(null)}
                  style={{ padding: 10, marginTop: 8, background: 'rgba(255, 255, 255, 0.1)', color: 'white', borderRadius: 12, border: 'none', cursor: 'pointer', fontWeight: 700 }}
                >
                  Done
                </button>
              </div>
            );
          })()}
        </div>
      )}
    </>
  );
}
