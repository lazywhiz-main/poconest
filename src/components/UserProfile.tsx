import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const menuRef = useRef<HTMLDivElement>(null);
  const { logout, user, profile } = useAuth();
  const navigate = useNavigate();

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
    navigate('/notifications');
  };

  const handleProfileClick = () => {
    setMenuOpen(false);
    navigate('/profile');
  };

  const handleAccountSettingsClick = () => {
    setMenuOpen(false);
    navigate('/settings');
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
              <div className="user-dropdown-item" onClick={handleProfileClick}>
                <div className="user-dropdown-icon">
                  <Icon name="user" size={16} color="currentColor" />
                </div>
                <div className="user-dropdown-text">Profile</div>
              </div>
              <div className="user-dropdown-item" onClick={handleAccountSettingsClick}>
                <div className="user-dropdown-icon">
                  <Icon name="settings" size={16} color="currentColor" />
                </div>
                <div className="user-dropdown-text">Settings</div>
              </div>
            </div>
            
            <div className="user-dropdown-section">
              <div className="user-dropdown-item" onClick={handleActivityClick}>
                <div className="user-dropdown-icon">
                  <Icon name="activity" size={16} color="currentColor" />
                </div>
                <div className="user-dropdown-text">Activity</div>
              </div>
              <div className="user-dropdown-item" onClick={handleNotificationsClick}>
                <div className="user-dropdown-icon">
                  <Icon name="bell" size={16} color="currentColor" />
                </div>
                <div className="user-dropdown-text">Notifications</div>
              </div>
            </div>
            
            <div className="user-dropdown-section">
              <div className="user-dropdown-item danger" onClick={handleLogout}>
                <div className="user-dropdown-icon">
                  <Icon name="logout" size={16} color="currentColor" />
                </div>
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
    </>
  );
}; 