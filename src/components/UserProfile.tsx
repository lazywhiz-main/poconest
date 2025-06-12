import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ActivityPage } from '../features/activity/ActivityPage';
import Icon from './ui/Icon';

interface UserProfileProps {
  compact?: boolean; // コンパクト表示かどうか
  className?: string;
}

export const UserProfile: React.FC<UserProfileProps> = ({ 
  compact = false, 
  className = '' 
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showActivityPage, setShowActivityPage] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { logout, user, profile } = useAuth();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (e) {
      alert('ログアウトに失敗しました');
    }
  };

  const handleActivityClick = () => {
    setMenuOpen(false);
    setShowActivityPage(true);
  };

  const handleNotificationsClick = () => {
    setMenuOpen(false);
    setShowNotifications(true);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>
      <div className={`user-profile ${className}`} onClick={() => setMenuOpen(!menuOpen)} ref={menuRef}>
        <div className="user-avatar">
          {profile?.display_name ? getInitials(profile.display_name) : 'U'}
        </div>
        {!compact && (
          <div className="user-info">
            <div className="user-name" style={{ textTransform: 'none' }}>
              {profile?.display_name || 'Unknown User'}
            </div>
            <div className="user-status">Developer • Online</div>
          </div>
        )}
        <div className="user-dropdown-arrow">▼</div>
        
        {menuOpen && (
          <div className="user-dropdown">
            <div className="user-dropdown-section">
              <div className="user-dropdown-item">
                <div className="user-dropdown-icon">👤</div>
                <div className="user-dropdown-text">Profile</div>
              </div>
              <div className="user-dropdown-item">
                <div className="user-dropdown-icon">⚙</div>
                <div className="user-dropdown-text">Account Settings</div>
              </div>
              <div className="user-dropdown-item">
                <div className="user-dropdown-icon">🎛</div>
                <div className="user-dropdown-text">Preferences</div>
              </div>
            </div>
            
            <div className="user-dropdown-section">
              <div className="user-dropdown-item" onClick={handleActivityClick}>
                <div className="user-dropdown-icon">📊</div>
                <div className="user-dropdown-text">Activity</div>
              </div>
              <div className="user-dropdown-item" onClick={handleNotificationsClick}>
                <div className="user-dropdown-icon">🔔</div>
                <div className="user-dropdown-text">Notifications</div>
                <div className="notification-badge">3</div>
              </div>
            </div>
            
            <div className="user-dropdown-section">
              <div className="user-dropdown-item danger" onClick={handleLogout}>
                <div className="user-dropdown-icon">🚪</div>
                <div className="user-dropdown-text">Sign Out</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Activity Page Modal */}
      {showActivityPage && (
        <ActivityPage onClose={() => setShowActivityPage(false)} />
      )}

      {/* Notifications Modal (temporary placeholder) */}
      {showNotifications && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#1a1a2e',
            borderRadius: '12px',
            width: '600px',
            maxWidth: '90vw',
            maxHeight: '80vh',
            border: '1px solid #333366',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '20px 24px',
              borderBottom: '1px solid #333366'
            }}>
              <h2 style={{ color: '#e2e8f0', margin: 0, fontSize: '20px' }}>
                🔔 通知
              </h2>
              <button
                onClick={() => setShowNotifications(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#a6adc8',
                  cursor: 'pointer',
                  fontSize: '18px',
                  padding: '4px'
                }}
              >
                ✕
              </button>
            </div>
            <div style={{ 
              padding: '24px', 
              color: '#a6adc8',
              textAlign: 'center',
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              通知機能は開発中です。近日公開予定！
            </div>
          </div>
        </div>
      )}
    </>
  );
}; 