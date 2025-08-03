import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/nestlist.css';
import Icon from './ui/Icon';
import { UserProfile } from './UserProfile';
import { useNotifications } from '../features/notifications/hooks/useNotifications';

export const ServiceHeader: React.FC = () => {
  const navigate = useNavigate();
  const { unreadCount } = useNotifications({ limit: 1 }); // 未読数だけ取得

  const handleNotificationClick = () => {
    navigate('/notifications');
  };

  const handleSearchClick = () => {
    // TODO: グローバル検索機能の実装
    console.log('Search clicked');
  };

  const handleLogoClick = () => {
    navigate('/nest-list');
  };

  return (
    <header className="header">
      <div className="header-content">
        <div className="logo" onClick={handleLogoClick} style={{ cursor: 'pointer' }}>
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
        <div className="header-controls">
          <div className="global-actions">
            <button 
              className="global-action-btn" 
              title="Notifications"
              onClick={handleNotificationClick}
            >
              <Icon name="bell" size={18} />
              {unreadCount > 0 && (
                <div className="notification-count">{unreadCount}</div>
              )}
            </button>
            <button 
              className="global-action-btn" 
              title="Global Search"
              onClick={handleSearchClick}
            >
              <Icon name="search" size={18} />
            </button>
          </div>
          
          <UserProfile />
        </div>
      </div>
    </header>
  );
}; 