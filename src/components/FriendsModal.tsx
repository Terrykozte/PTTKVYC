import { useRef, useState } from 'react';
import { MOCK_FRIENDS } from '../mockData';

export default function FriendsModal({ onClose: _onClose }: { onClose: () => void }) {
  const [friends, setFriends] = useState(MOCK_FRIENDS);
  const removeFriend = (id: string) => setFriends(prev => prev.filter(f => f.id !== id));
  const [searchFocused, setSearchFocused] = useState(false);
  const [showAllFriends, setShowAllFriends] = useState(false);
  const [searchText, setSearchText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="settings-scroll" style={{ padding: '20px 20px', paddingBottom: 80, display: 'flex', flexDirection: 'column' }}>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0, color: 'white', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>❤️‍🔥</span> {friends.length} Friends
        </h2>
        <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 600, marginTop: 4 }}>Invite a friend to continue</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 26, overflow: 'hidden' }}>
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center',
          background: 'rgba(255,255,255,0.12)',
          borderRadius: 12, height: 44, padding: '0 8px',
          transition: 'all 0.35s cubic-bezier(0.25, 1, 0.5, 1)'
        }}>

          <div style={{ flex: searchFocused ? 0 : 1, transition: 'flex 0.35s cubic-bezier(0.25, 1, 0.5, 1)' }} />

          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            flex: searchFocused ? 1 : '0 0 auto',
            transition: 'all 0.35s cubic-bezier(0.25, 1, 0.5, 1)'
          }}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              placeholder={searchFocused ? "Search or add friends" : "Add a new friend"}
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              style={{
                background: 'none', border: 'none', outline: 'none',
                color: 'white', fontSize: 16, fontWeight: 700,
                width: searchFocused ? '100%' : '140px',
                WebkitTextFillColor: 'white',
                transition: 'width 0.35s cubic-bezier(0.25, 1, 0.5, 1)'
              }}
            />
          </div>

          <div style={{ flex: searchFocused ? 0 : 1, transition: 'flex 0.35s cubic-bezier(0.25, 1, 0.5, 1)' }} />
        </div>

        <div style={{
          width: searchFocused ? 76 : 0,
          opacity: searchFocused ? 1 : 0,
          transform: searchFocused ? 'translateX(0)' : 'translateX(40px)',
          transition: 'all 0.35s cubic-bezier(0.25, 1, 0.5, 1)',
          display: 'flex', justifyContent: 'flex-end', overflow: 'hidden'
        }}>
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              setSearchFocused(false); setSearchText(''); inputRef.current?.blur();
            }}
            style={{
              background: 'none', border: 'none', color: 'white',
              fontSize: 16, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', padding: 0
            }}
          >
            Cancel
          </button>
        </div>
      </div>

      {!searchFocused && (
        <>
          {/* 1. FIND FRIENDS FROM OTHER APPS */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <svg viewBox="0 0 24 24" fill="white" width="18" height="18">
              <path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
            <span style={{ color: 'white', fontSize: 15, fontWeight: 700 }}>Find friends from other apps</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 32 }}>
            {[
              { name: 'Telegram', bg: '#1D9BF0', icon: 'M12 2L2 12l4 2 2 6 3-3 5 5 6-22-22 10z' },
              { name: 'Insta', bg: 'linear-gradient(45deg, #f09433 0%,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888 100%)', icon: '' },
              { name: 'WhatsApp', bg: '#25D366', icon: '' },
              { name: 'Others', bg: '#444', icon: '' }
            ].map((app, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: app.bg, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  {app.name === 'Telegram' && <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M2.06 10.87l19.5-7.5c.87-.33 1.63.42 1.3 1.28l-6.5 18c-.3.83-1.4.98-1.92.27l-4.41-5.91-3.66 3.42c-.2.19-.48.24-.73.13s-.42-.35-.42-.62v-4.52l12.44-11.23c.27-.24-.13-.6-.44-.38L5.27 12.3l-5.69-1.78c-.75-.23-.8-1.25-.09-1.58z" fill="white" /></svg>}
                  {app.name === 'Insta' && <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></svg>}
                  {app.name === 'WhatsApp' && <svg width="28" height="28" viewBox="0 0 24 24" fill="white"><path d="M20.5 3.5c-2.3-2.3-5.3-3.5-8.5-3.5C5.4 0 0 5.4 0 12c0 2.1.5 4.1 1.6 5.9L0 24l6.3-1.6C8.1 23.5 10 24 12 24c6.6 0 12-5.4 12-12 0-3.2-1.2-6.2-3.5-8.5zm-8.5 18.5c-1.8 0-3.5-.5-5-1.4l-.4-.2-3.7 1 1-3.6-.2-.4C2.5 15.6 2 13.9 2 12c0-5.5 4.5-10 10-10s10 4.5 10 10-4.5 10-10 10zm5.6-7.6c-.3-.2-1.8-.9-2.1-1-.3-.1-.5-.2-.7.2-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-.3-.2-1.3-.5-2.5-1.5-1-1-1.6-1.6-1.8-1.8-.2-.3 0-.4.1-.6.1-.1.3-.4.4-.5.1-.2.2-.3.3-.5s.1-.4 0-.6c-.1-.2-.7-1.8-.9-2.4-.2-.6-.5-.5-.7-.5-.2 0-.4 0-.6 0s-.6.2-.9.5c-.3.3-1.1 1.1-1.1 2.7s1.2 3.1 1.3 3.3c.2.2 2.2 3.4 5.4 4.8 2.2 1 2.8 1 3.8.9 1-.1 1.8-.7 2.1-1.4.3-.7.3-1.2.2-1.4-.1-.1-.3-.2-.6-.4z" /></svg>}
                  {app.name === 'Others' && <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>}
                </div>
                <span style={{ color: 'white', fontSize: 13, fontWeight: 700 }}>{app.name}</span>
              </div>
            ))}
          </div>

          {/* 2. YOUR FRIENDS */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <svg viewBox="0 0 24 24" fill="white" width="18" height="18">
              <path d="M16 11c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 3-1.34 3-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5C15 14.17 10.33 13 8 13zm8 0c-.29 0-.62.02-.97.05C16.19 13.9 17 15.02 17 16.5V19h6v-2.5C23 14.17 18.33 13 16 13z" />
            </svg>
            <span style={{ color: 'white', fontSize: 15, fontWeight: 700 }}>Your Friends</span>
          </div>

          <div 
            data-name="Section / Your Friends"
            style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 20 }}
          >
            {(showAllFriends ? friends : friends.slice(0, 3)).map(f => (
              <div 
                key={f.id} 
                data-name={`Friend / Item / ${f.name}`}
                style={{ display: 'flex', alignItems: 'center', gap: 14 }}
              >
                <div 
                  data-name="Avatar / Friend"
                  style={{ width: 48, height: 48, borderRadius: '50%', border: '2.5px solid #FFC800', padding: 2 }}
                >
                  <div style={{ width: '100%', height: '100%', borderRadius: '50%', backgroundImage: `url(${f.avatar})`, backgroundSize: 'cover', backgroundColor: f.color }} />
                </div>
                <span data-name="Name" style={{ color: 'white', fontSize: 16, fontWeight: 700, flex: 1 }}>{f.name}</span>
                <button
                  onClick={() => removeFriend(f.id)}
                  data-name="Button / Action / Remove"
                  style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', padding: 5 }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
            ))}
          </div>

          {friends.length > 3 && (
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
              <button
                onClick={() => setShowAllFriends(prev => !prev)}
                style={{ background: 'rgba(255,255,255,0.12)', color: 'white', fontSize: 15, fontWeight: 700, border: 'none', borderRadius: 20, padding: '10px 20px', cursor: 'pointer' }}
              >
                {showAllFriends ? 'Show less' : 'Show more'}
              </button>
            </div>
          )}
        </>
      )}

      {/* 3. SHARE YOUR LOCKET LINK */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" />
        </svg>
        <span style={{ color: 'white', fontSize: 15, fontWeight: 700 }}>Share your Locket link</span>
      </div>

      <div 
        data-name="Section / Share Link"
        style={{ display: 'flex', flexDirection: 'column', gap: 4 }}
      >
        {[
          { name: 'Messenger', bg: '#00B2FF', icon: 'M12 2C6.48 2 2 6.14 2 11.25c0 2.92 1.55 5.51 3.96 7.21v3.31c0 .48.55.76.94.47l3.66-2.65c1.13.34 2.33.52 3.6.52 5.52 0 10-4.14 10-9.25S17.52 2 12 2zm1.09 11.96l-2.45-2.64-4.8 2.64 5.3-5.6 2.45 2.64 4.8-2.64-5.3 5.6z' },
          { name: 'Instagram DMs', bg: 'linear-gradient(45deg, #f09433 0%,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888 100%)', icon: '' },
          { name: 'Instagram Story', bg: 'linear-gradient(45deg, #f09433 0%,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888 100%)', icon: '' },
          { name: 'Messages', bg: '#25D366', icon: '' },
          { name: 'Other apps', bg: '#444', icon: '' }
        ].map((app, i) => (
          <div 
            key={i} 
            data-name={`Share / Option / ${app.name}`}
            style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 0', cursor: 'pointer' }}
          >
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: app.bg, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              {app.name === 'Messenger' && <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d={app.icon} /></svg>}
              {app.name.includes('Instagram') && <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></svg>}
              {app.name === 'Messages' && <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z" /></svg>}
              {app.name === 'Other apps' && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>}
            </div>
            <span data-name="Label" style={{ color: 'white', fontSize: 16, fontWeight: 700, flex: 1 }}>{app.name}</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </div>
        ))}
      </div>
    </div>
  );
}
