import React from 'react';
import '../styles/nestlist.css';
import Icon from './ui/Icon';
import { UserProfile } from './UserProfile';

export const ServiceHeader: React.FC = () => {
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
        <div className="header-controls">
          <div className="global-actions">
            <button className="global-action-btn" title="Notifications">
              <Icon name="bell" size={18} />
              <div className="notification-count">3</div>
            </button>
            <button className="global-action-btn" title="Global Search">
              <Icon name="search" size={18} />
            </button>
          </div>
          
          <UserProfile />
        </div>
      </div>
    </header>
  );
}; 