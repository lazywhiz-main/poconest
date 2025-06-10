import React, { useState, useRef, useEffect } from 'react';
import '../styles/nestlist.css';
import { useAuth } from '../contexts/AuthContext';
import Icon from './ui/Icon';

export const ServiceHeader: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false);
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

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="header">
      <div className="header-content">
        <div className="logo">
          <div className="logo-horizontal">
            <div className="logo-icon-circle">
              <div className="network-nodes">
                <div className="network-node node-1"></div>
                <div className="network-node node-2"></div>
                <div className="network-node node-3"></div>
                <div className="network-connection conn-1"></div>
                <div className="network-connection conn-2"></div>
              </div>
            </div>
            <div className="logo-text-group">
              <div className="logo-text">poconest</div>
              <div className="logo-tagline">Connect • Share • Nest</div>
            </div>
          </div>
        </div>
        <div className="header-controls" ref={menuRef}>
          <div className="global-actions">
            <button className="global-action-btn" title="Notifications">
              <Icon name="bell" size={18} />
              <div className="notification-count">3</div>
            </button>
            <button className="global-action-btn" title="Toggle Theme">
              <Icon name="moon" size={18} />
            </button>
            <button className="global-action-btn" title="Global Search">
              <Icon name="search" size={18} />
            </button>
          </div>
          
          <div className="user-profile" onClick={() => setMenuOpen(!menuOpen)}>
            <div className="user-avatar">
              {profile?.display_name ? getInitials(profile.display_name) : 'U'}
            </div>
            <div className="user-info">
              <div className="user-name">{profile?.display_name || 'Unknown User'}</div>
              <div className="user-status">Developer • Online</div>
            </div>
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
                  <div className="user-dropdown-item">
                    <div className="user-dropdown-icon">📊</div>
                    <div className="user-dropdown-text">Activity</div>
                  </div>
                  <div className="user-dropdown-item">
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
        </div>
      </div>
    </header>
  );
}; 