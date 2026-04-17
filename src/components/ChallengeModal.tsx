import { useCallback, useEffect, useRef, useState } from 'react';
import { type WeekKey, getMonthlyChallengeConfig, WEEK_IMAGES } from '../mockData';

type MonthState = 'past' | 'current' | 'future';
type ViewState = 'months' | 'weeks';
type WeekState = 'past' | 'active' | 'hidden';

// ─── Dynamic date constants ───────────────────────────────────────────────────
const _now = new Date();
const _year = _now.getFullYear();
const _curMonth = _now.getMonth() + 1;
const _curDay = _now.getDate();
const _curWeekNum = _curDay <= 7 ? 1 : _curDay <= 14 ? 2 : _curDay <= 21 ? 3 : 4;
const _curSlotDay = (_curDay - 1) % 7; // 0-based index within week slot

const MONTH_NAMES_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const MONTH_DATA: { num: number; name: string; label: string; state: MonthState }[] =
  MONTH_NAMES_EN.map((enName, i) => {
    const num = i + 1;
    const state: MonthState = num < _curMonth ? 'past' : num === _curMonth ? 'current' : 'future';
    return { num, name: `Tháng ${num}`, label: `${enName} ${_year}`, state };
  });

interface ChallengeModalProps {
  onClose: () => void;
  challengeImages: Record<string, string>;
  onSelectSlot: (week: WeekKey, dayIndex: number, theme: string, month: number) => void;
}

export default function ChallengeModal({ onClose, challengeImages, onSelectSlot }: ChallengeModalProps) {
  const [activeTab, setActiveTab] = useState<'rollcall' | 'challenge'>('challenge');
  const [view, setView] = useState<ViewState>('months');
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [sheetOffset, setSheetOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [viewingThemeImage, setViewingThemeImage] = useState<string | null>(null);
  // Week photo slider state
  const [weekSlider, setWeekSlider] = useState<{
    month: number;
    weekKey: WeekKey;
    startIdx: number;
  } | null>(null);
  const dragRef = useRef({ isDown: false, startY: 0, lastY: 0, lastT: 0, vel: 0 });

  const handlePointerDown = (e: React.PointerEvent) => {
    dragRef.current.isDown = true;
    dragRef.current.startY = e.pageY - sheetOffset;
    dragRef.current.lastY = e.pageY;
    dragRef.current.lastT = Date.now();
    setIsDragging(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current.isDown) return;
    const dy = Math.max(0, e.pageY - dragRef.current.startY);
    const now = Date.now();
    const dt = Math.max(1, now - dragRef.current.lastT);
    dragRef.current.vel = (e.pageY - dragRef.current.lastY) / dt;
    dragRef.current.lastY = e.pageY;
    dragRef.current.lastT = now;
    setSheetOffset(dy);
  };

  const handlePointerUp = () => {
    if (!dragRef.current.isDown) return;
    dragRef.current.isDown = false;
    setIsDragging(false);
    if (sheetOffset > 150 || dragRef.current.vel > 0.5) {
      onClose();
      setTimeout(() => setSheetOffset(0), 400);
    } else {
      setSheetOffset(0);
    }
  };

  const handleMonthClick = (monthNum: number, state: MonthState) => {
    if (state === 'future') return;
    setSelectedMonth(monthNum);
    setView('weeks');
  };

  const handleBack = () => {
    if (view === 'weeks') {
      setSelectedMonth(null);
      setView('months');
    }
  };

  const monthData = MONTH_DATA.find(m => m.num === selectedMonth);
  const isPastMonth = monthData?.state === 'past';
  const isCurrentMonth = monthData?.state === 'current';

  return (
    <div
      style={{
        position: 'absolute', inset: 0, zIndex: 7500,
        background: `rgba(0,0,0,${Math.max(0, 0.6 - sheetOffset * 0.001)})`,
        animation: 'fadeInOverlay 0.3s ease-out',
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, top: 44,
          background: 'rgba(18,18,18,0.98)',
          backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)',
          borderRadius: '32px 32px 0 0',
          display: 'flex', flexDirection: 'column',
          boxShadow: '0 -20px 60px rgba(0,0,0,0.7)',
          transform: `translateY(${sheetOffset}px)`,
          transition: isDragging ? 'none' : 'transform 0.5s cubic-bezier(0.19, 1, 0.22, 1)',
          animation: 'slideUpSheet 0.45s cubic-bezier(0.16, 1, 0.3, 1)',
          overflow: 'hidden',
        }}
      >
        {/* Drag Handle */}
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          style={{ padding: '12px 0 8px', cursor: 'grab', touchAction: 'none', flexShrink: 0 }}
        >
          <div style={{ width: 36, height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.2)', margin: '0 auto' }} />
        </div>

        {/* Header */}
        <div style={{ padding: '0 20px 14px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          {view !== 'months' && (
            <button
              onClick={handleBack}
              style={{ background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', borderRadius: '50%', width: 36, height: 36, display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0 }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          )}

          <div style={{ flex: 1, display: 'flex', justifyContent: view === 'months' ? 'center' : 'flex-start' }}>
            {view === 'months' ? (
              <div style={{
                display: 'flex', position: 'relative',
                background: 'rgba(255,255,255,0.08)',
                borderRadius: 22, padding: 3,
                border: '1px solid rgba(255,255,255,0.08)',
                width: 220,
              }}>
                <div style={{
                  position: 'absolute', top: 3, bottom: 3, width: '50%',
                  background: 'white', borderRadius: 19,
                  transition: 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1)',
                  transform: activeTab === 'rollcall' ? 'translateX(0)' : 'translateX(100%)',
                  pointerEvents: 'none',
                }} />
                {(['rollcall', 'challenge'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    style={{
                      flex: 1, border: 'none', background: 'transparent', cursor: 'pointer',
                      padding: '8px 0', borderRadius: 19, position: 'relative', zIndex: 1,
                      fontSize: 14, fontWeight: 800,
                      color: activeTab === tab ? '#111' : 'rgba(255,255,255,0.55)',
                      transition: 'color 0.2s ease',
                    }}
                  >
                    {tab === 'rollcall' ? 'RollCall' : 'Challenge'}
                  </button>
                ))}
              </div>
            ) : view === 'weeks' && monthData ? (
              <div>
                <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                  Challenge
                </div>
                <h3 style={{ color: 'white', fontSize: 20, fontWeight: 900, margin: '3px 0 0', letterSpacing: -0.3 }}>
                  {monthData.label}
                </h3>
              </div>
            ) : null}
          </div>

          <button
            onClick={onClose}
            style={{ background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', borderRadius: '50%', width: 36, height: 36, display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0 }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', flexShrink: 0 }} />

        <div className="settings-scroll" style={{ flex: 1, overflowY: 'auto', paddingBottom: 60 }}>

          {/* ── RollCall ── */}
          {activeTab === 'rollcall' && view === 'months' && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200, flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 40 }}>📣</div>
              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 15, fontWeight: 700 }}>Coming soon</span>
            </div>
          )}

          {activeTab === 'challenge' && view === 'months' && (
            <div>
              <div style={{ padding: '14px 20px 6px' }}>
                <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.2 }}>
                  {_year}
                </span>
              </div>

              {MONTH_DATA.map((m, idx) => {
                const filledCount = Object.keys(challengeImages).filter(k => k.startsWith(`M${m.num}-`)).length;
                const isFuture = m.state === 'future';
                const isCurrent = m.state === 'current';

                return (
                  <div
                    key={m.num}
                    onClick={() => handleMonthClick(m.num, m.state)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 16,
                      padding: '18px 20px',
                      cursor: isFuture ? 'default' : 'pointer',
                      opacity: isFuture ? 0.32 : 1,
                      background: isCurrent ? 'rgba(255,200,0,0.05)' : 'transparent',
                      borderTop: idx === 0 ? 'none' : '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    <div style={{
                      width: 48, height: 48, borderRadius: 14, flexShrink: 0,
                      background: isCurrent ? 'rgba(255,200,0,0.12)' : 'rgba(255,255,255,0.07)',
                      border: isCurrent ? '1px solid rgba(255,200,0,0.28)' : '1px solid rgba(255,255,255,0.08)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <span style={{ fontSize: 14, fontWeight: 900, color: isCurrent ? '#FFC800' : 'rgba(255,255,255,0.55)' }}>
                        M{m.num}
                      </span>
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                        <span style={{ color: 'white', fontWeight: 800, fontSize: 17 }}>{m.name}</span>
                        <span style={{
                          fontSize: 11, fontWeight: 800,
                          color: isCurrent ? '#FFC800' : m.state === 'past' ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.22)',
                          background: isCurrent ? 'rgba(255,200,0,0.14)' : 'rgba(255,255,255,0.06)',
                          padding: '2px 8px', borderRadius: 8,
                        }}>
                          {isCurrent ? '⚡ Opening' : m.state === 'past' ? 'Đã qua' : 'Sắp tới'}
                        </span>
                      </div>
                      <div style={{ color: 'rgba(255,255,255,0.32)', fontSize: 13, fontWeight: 600, marginBottom: !isFuture ? 10 : 0 }}>
                        {m.label}
                      </div>
                      {!isFuture && (
                        <div style={{ display: 'flex', gap: 3 }}>
                          {Array.from({ length: 28 }, (_, i) => (
                            <div key={i} style={{
                              width: 6, height: 6, borderRadius: '50%',
                              background: i < filledCount ? '#FFC800' : 'rgba(255,255,255,0.1)',
                            }} />
                          ))}
                        </div>
                      )}
                    </div>

                    {!isFuture && (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {view === 'weeks' && selectedMonth !== null && monthData && (
            <div>
              {isPastMonth && (
                <div style={{
                  margin: '12px 20px 4px',
                  padding: '11px 16px',
                  background: 'rgba(255,255,255,0.05)', borderRadius: 14,
                  color: 'rgba(255,255,255,0.35)', fontSize: 13, fontWeight: 700,
                  display: 'flex', alignItems: 'center', gap: 7,
                }}>
                  ✅ Tháng đã kết thúc — xem lại kỷ niệm
                </div>
              )}

              {getMonthlyChallengeConfig(selectedMonth).map((week) => {
                const filledCount = Array.from({ length: 7 }, (_, i) => challengeImages[`M${selectedMonth}-${week.key}-${i}`]).filter(Boolean).length;

                const getWeekState = (key: string): WeekState => {
                  if (!isCurrentMonth) return isPastMonth ? 'past' : 'hidden';
                  const wNum = parseInt(key.replace('W', ''));
                  if (wNum < _curWeekNum) return 'past';
                  if (wNum === _curWeekNum) return 'active';
                  return 'hidden';
                };

                const weekState = getWeekState(week.key);
                const isPast = weekState === 'past';
                const isActive = weekState === 'active';
                const isHidden = weekState === 'hidden';

                // Completion status for Past weeks (spec: Successfully Completed vs Failed/Ended)
                const completion: 'success' | 'failed' | 'none' =
                  !isPast ? 'none' : filledCount === 7 ? 'success' : 'failed';

                // Find the user's first photo for this week (for banner)
                const userCoverImg = Array.from({ length: 7 }, (_, i) => challengeImages[`M${selectedMonth}-${week.key}-${i}`]).find(Boolean);
                const themeImg = WEEK_IMAGES[week.key];

                return (
                  <div
                    key={week.key}
                    style={{
                      margin: '0 12px 14px',
                      borderRadius: 16,
                      overflow: 'hidden',
                      border: '1px solid rgba(255,255,255,0.07)',
                      opacity: isHidden ? 0.6 : 1,
                      position: 'relative'
                    }}
                  >
                    <div style={{ position: 'relative', height: 120, overflow: 'hidden' }}>
                      {/* Main background: user's cover photo if available, otherwise theme image */}
                      <img
                        src={userCoverImg || themeImg}
                        alt={week.theme}
                        style={{
                          width: '100%', height: '100%', objectFit: 'cover', display: 'block',
                          filter: isPast && !userCoverImg ? 'grayscale(0.4)' : 'none',
                        }}
                      />
                      {/* Dark gradient overlay */}
                      <div style={{
                        position: 'absolute', inset: 0,
                        background: 'linear-gradient(to bottom, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.6) 100%)',
                      }} />

                      {/* Theme name */}
                      <div style={{
                        position: 'absolute', bottom: 10, left: 14,
                        color: 'white', fontSize: 16, fontWeight: 900, letterSpacing: -0.3,
                        textShadow: '0 1px 6px rgba(0,0,0,0.6)',
                      }}>
                        {week.theme}
                      </div>

                      {/* Completion badge overlay — covers ALL three UI states */}
                      {(isPast || isActive) && (
                        <div style={{
                          position: 'absolute', inset: 0,
                          background: isPast ? 'rgba(0,0,0,0.15)' : 'transparent',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {completion === 'success' && (
                            <div style={{
                              padding: '5px 14px',
                              background: 'linear-gradient(135deg, rgba(52,199,89,0.92), rgba(36,163,72,0.92))',
                              borderRadius: 22, display: 'flex', alignItems: 'center', gap: 7,
                              border: '1px solid rgba(255,255,255,0.35)',
                              boxShadow: '0 6px 20px rgba(52,199,89,0.35)',
                              backdropFilter: 'blur(8px)',
                            }}>
                              <span style={{ fontSize: 13 }}>🏆</span>
                              <span style={{ color: '#fff', fontSize: 11.5, fontWeight: 900, letterSpacing: 0.2 }}>
                                Hoàn thành 7/7 ngày
                              </span>
                            </div>
                          )}
                          {completion === 'failed' && (
                            <div style={{
                              padding: '5px 14px',
                              background: 'rgba(30,30,30,0.78)',
                              borderRadius: 22, display: 'flex', alignItems: 'center', gap: 7,
                              border: '1px solid rgba(255,69,58,0.35)',
                              backdropFilter: 'blur(8px)',
                            }}>
                              <span style={{ fontSize: 13 }}>⏰</span>
                              <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: 11.5, fontWeight: 800 }}>
                                Đã kết thúc · {filledCount}/7
                              </span>
                            </div>
                          )}
                          {isActive && (
                            <div style={{
                              position: 'absolute', top: 12, left: 12,
                              padding: '4px 12px',
                              background: 'linear-gradient(135deg, rgba(255,200,0,0.95), rgba(255,140,0,0.92))',
                              borderRadius: 16, display: 'flex', alignItems: 'center', gap: 6,
                              boxShadow: '0 4px 14px rgba(255,200,0,0.35)',
                            }}>
                              <span style={{
                                width: 6, height: 6, borderRadius: '50%', background: '#fff',
                                boxShadow: '0 0 0 2px rgba(255,255,255,0.3)',
                                animation: 'pulse 1.6s ease-in-out infinite',
                              }} />
                              <span style={{ color: '#000', fontSize: 10.5, fontWeight: 900, letterSpacing: 0.3 }}>
                                ĐANG DIỄN RA · {filledCount}/7
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Theme sample thumbnail — top-right */}
                      {userCoverImg && (
                        <div
                          onClick={(e) => { e.stopPropagation(); setViewingThemeImage(themeImg); }}
                          style={{
                            position: 'absolute', top: 8, right: 52,
                            width: 40, height: 40, borderRadius: 10, overflow: 'hidden',
                            border: '2px solid rgba(255,255,255,0.5)',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                            cursor: 'pointer',
                          }}
                        >
                          <img src={themeImg} alt="Theme" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                          <div style={{
                            position: 'absolute', inset: 0,
                            background: 'rgba(0,0,0,0.15)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                              <circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                            </svg>
                          </div>
                        </div>
                      )}

                      {/* Week key badge */}
                      <div style={{
                        position: 'absolute', top: 10, right: 12,
                        background: 'rgba(0,0,0,0.45)',
                        backdropFilter: 'blur(8px)',
                        borderRadius: 10, padding: '4px 10px',
                        color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: 900,
                      }}>
                        {week.key}
                      </div>
                    </div>

                    <div style={{
                      padding: '14px 16px',
                      background: 'rgba(255,255,255,0.04)',
                    }}>
                      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: 700, marginBottom: 12 }}>
                        {week.days}
                      </div>

                      {/* 7-slot grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
                        {Array.from({ length: 7 }, (_, dayIndex) => {
                          const slotKey = `M${selectedMonth}-${week.key}-${dayIndex}`;
                          const img = challengeImages[slotKey];

                          // Dynamic today identification
                          const isToday = selectedMonth === _curMonth && week.key === `W${_curWeekNum}` && dayIndex === _curSlotDay;

                          // Slot status based on actual current date
                          let status: 'past' | 'today' | 'future' = 'future';
                          const weekNum = parseInt(week.key.replace('W', ''));

                          if (selectedMonth! < _curMonth) status = 'past';
                          else if (selectedMonth! > _curMonth) status = 'future';
                          else {
                            if (weekNum < _curWeekNum) status = 'past';
                            else if (weekNum > _curWeekNum) status = 'future';
                            else {
                              if (dayIndex < _curSlotDay) status = 'past';
                              else if (dayIndex > _curSlotDay) status = 'future';
                              else status = 'today';
                            }
                          }

                          const canAdd = !img && status === 'today';

                          return (
                            <div
                              key={dayIndex}
                              onClick={() => {
                                if (img) {
                                  setWeekSlider({ month: selectedMonth!, weekKey: week.key, startIdx: dayIndex });
                                  return;
                                }
                                if (canAdd) onSelectSlot(week.key, dayIndex, week.theme, selectedMonth!);
                              }}
                              style={{
                                aspectRatio: '1/1', borderRadius: 10, overflow: 'hidden',
                                background: img ? 'transparent' : (isToday ? 'rgba(255,200,0,0.1)' : 'rgba(255,255,255,0.05)'),
                                border: img ? '1px solid rgba(255,255,255,0.08)' : (isToday
                                  ? '1.5px solid rgba(255,200,0,0.4)'
                                  : '1.5px dashed rgba(255,255,255,0.07)'),
                                cursor: (canAdd || img) ? 'pointer' : 'default',
                                position: 'relative',
                                filter: (status !== 'today' && !img) ? 'grayscale(1) opacity(0.6)' : 'none',
                                transition: 'all 0.2s ease',
                              }}
                            >
                              {img ? (
                                <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                              ) : (
                                <div style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                  {status === 'past' ? (
                                    <span style={{ color: 'rgba(255,0,0,0.4)', fontSize: 16, fontWeight: 900 }}>X</span>
                                  ) : status === 'future' ? (
                                    <span style={{ fontSize: 12, opacity: 0.3 }}>🔒</span>
                                  ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                                      <span style={{ color: '#FFC800', fontSize: 18, fontWeight: 200, lineHeight: 1 }}>+</span>
                                      <span style={{ color: '#FFC800', fontSize: 8, fontWeight: 700 }}>LIVE</span>
                                    </div>
                                  )}
                                </div>
                              )}
                              {img && (
                                <div style={{
                                  position: 'absolute', bottom: 2, right: 2,
                                  width: 14, height: 14, borderRadius: '50%',
                                  background: '#FFC800', display: 'flex', justifyContent: 'center', alignItems: 'center',
                                }}>
                                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12" />
                                  </svg>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Hidden/Future Overlay */}
                    {isHidden && (
                      <div style={{
                        position: 'absolute', inset: 0,
                        background: 'rgba(18,18,18,0.85)', backdropFilter: 'blur(4px)',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12,
                        zIndex: 10
                      }}>
                        <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: 20 }}>
                          {'👁️'}
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ color: 'white', fontWeight: 800, fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 }}>Coming Soon</div>
                          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 700, marginTop: 2 }}>Tuần này đang ẩn</div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

        </div>

        {/* Theme Image Viewer */}
        {viewingThemeImage && (
          <div
            onClick={() => setViewingThemeImage(null)}
            style={{
              position: 'absolute', inset: 0, zIndex: 9999,
              background: 'rgba(0,0,0,0.92)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16,
              borderRadius: '32px 32px 0 0',
            }}
          >
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1 }}>
              Theme Sample
            </div>
            <img
              src={viewingThemeImage}
              alt=""
              style={{ maxWidth: '90%', maxHeight: '75%', borderRadius: 16, objectFit: 'contain' }}
            />
            <button
              onClick={() => setViewingThemeImage(null)}
              style={{
                position: 'absolute', top: 20, right: 20,
                background: 'rgba(255,255,255,0.15)', border: 'none',
                borderRadius: '50%', width: 36, height: 36,
                color: 'white', fontSize: 20, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >×</button>
          </div>
        )}

        {/* Week Photo Slider — full-screen swipeable viewer scoped to 7 days */}
        {weekSlider && (
          <WeekViewerModal
            month={weekSlider.month}
            weekKey={weekSlider.weekKey}
            startIdx={weekSlider.startIdx}
            challengeImages={challengeImages}
            onClose={() => setWeekSlider(null)}
          />
        )}
      </div>
    </div>
  );
}

// ─── WeekViewerModal ────────────────────────────────────────────────────────
// Full-screen swipeable photo slider scoped to 7 days of a specific week.
// CSS Scroll Snap for smooth horizontal swiping, thumbnail strip at bottom.

function WeekViewerModal({
  month,
  weekKey,
  startIdx,
  challengeImages,
  onClose,
}: {
  month: number;
  weekKey: WeekKey;
  startIdx: number;
  challengeImages: Record<string, string>;
  onClose: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(startIdx);

  // Build the 7 slots for this week
  const slots = Array.from({ length: 7 }, (_, i) => {
    const key = `M${month}-${weekKey}-${i}`;
    return { dayIndex: i, image: challengeImages[key] || null };
  });

  // Get the week config for the theme name
  const weekConfig = getMonthlyChallengeConfig(month).find(w => w.key === weekKey);
  const themeName = weekConfig?.theme || weekKey;

  // Scroll to the starting index on mount
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const timer = setTimeout(() => {
      const w = el.clientWidth;
      el.scrollTo({ left: startIdx * w, behavior: 'auto' });
    }, 30);
    return () => clearTimeout(timer);
  }, [startIdx]);

  // Track scroll position to update active index
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const w = el.clientWidth;
    if (w === 0) return;
    const idx = Math.round(el.scrollLeft / w);
    setActiveIdx(Math.max(0, Math.min(6, idx)));
  }, []);

  const scrollToIdx = (idx: number) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ left: idx * el.clientWidth, behavior: 'smooth' });
  };

  return (
    <div
      style={{
        position: 'absolute', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.96)',
        display: 'flex', flexDirection: 'column',
        borderRadius: '32px 32px 0 0',
        overflow: 'hidden',
        animation: 'fadeInOverlay 0.25s ease-out',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 20px 8px',
        flexShrink: 0,
      }}>
        <div>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 }}>
            {weekKey} — {themeName}
          </div>
          <div style={{ color: 'white', fontSize: 17, fontWeight: 900, marginTop: 2 }}>
            Ngày {activeIdx + 1} / 7
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'rgba(255,255,255,0.12)', border: 'none', cursor: 'pointer',
            borderRadius: '50%', width: 36, height: 36,
            display: 'flex', justifyContent: 'center', alignItems: 'center',
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Horizontal scroll snap container */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        style={{
          flex: 1,
          display: 'flex',
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <style>{`.wk-slider-scroll::-webkit-scrollbar { display: none; }`}</style>
        {slots.map((slot, idx) => (
          <div
            key={idx}
            style={{
              flex: '0 0 100%',
              width: '100%',
              height: '100%',
              scrollSnapAlign: 'start',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 20,
            }}
          >
            {slot.image ? (
              <img
                src={slot.image}
                alt={`Day ${idx + 1}`}
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  borderRadius: 18,
                  objectFit: 'contain',
                  boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
                }}
              />
            ) : (
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
                color: 'rgba(255,255,255,0.25)',
              }}>
                <div style={{
                  width: 64, height: 64, borderRadius: 16,
                  border: '2px dashed rgba(255,255,255,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 24,
                }}>
                  📷
                </div>
                <span style={{ fontSize: 13, fontWeight: 700 }}>Chưa có ảnh</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Thumbnail strip at bottom */}
      <div style={{
        flexShrink: 0,
        padding: '12px 16px 24px',
        display: 'flex',
        justifyContent: 'center',
        gap: 8,
      }}>
        {slots.map((slot, idx) => (
          <div
            key={idx}
            onClick={() => scrollToIdx(idx)}
            style={{
              width: 44, height: 44, borderRadius: 10, overflow: 'hidden',
              flexShrink: 0, cursor: 'pointer',
              border: idx === activeIdx
                ? '2.5px solid #FFD60A'
                : '2px solid rgba(255,255,255,0.1)',
              boxShadow: idx === activeIdx ? '0 0 12px rgba(255,214,10,0.3)' : 'none',
              transition: 'border-color 0.2s, box-shadow 0.2s',
              background: slot.image ? 'transparent' : 'rgba(255,255,255,0.06)',
            }}
          >
            {slot.image ? (
              <img src={slot.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            ) : (
              <div style={{
                width: '100%', height: '100%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'rgba(255,255,255,0.2)', fontSize: 10, fontWeight: 800,
              }}>
                D{idx + 1}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
