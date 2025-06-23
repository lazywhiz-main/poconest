import React from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from './ui/Icon';
import { UserProfile } from './UserProfile';
import { useNotifications } from '../features/notifications/hooks/useNotifications';

interface LayoutProps {
    children?: React.ReactNode;
    workspaceTitle: string;
    menuSections: {
        title: string;
        items: {
            id: string;
            icon: React.ReactNode;
            text: string;
            badge?: number;
            isActive?: boolean;
        }[];
    }[];
    onMenuItemClick: (itemId: string) => void;
    nestId: string;
    onSettingsClick?: () => void;
}

export const Layout: React.FC<LayoutProps> = ({
    children,
    workspaceTitle,
    menuSections,
    onMenuItemClick,
    nestId,
    onSettingsClick,
}) => {
    const navigate = useNavigate();
    const { unreadCount } = useNotifications({ limit: 1 }); // 未読数だけ取得

    const handleNotificationClick = () => {
        navigate('/notifications');
    };

    return (
        <div style={{ height: '100vh', background: '#0f0f23', display: 'flex', flexDirection: 'column' }}>
            {/* ヘッダー（ブラウザ横幅いっぱい） */}
            <header className="workspace-header" style={{ width: '100vw', minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div 
                    className="workspace-title" 
                    style={{ cursor: 'pointer' }}
                    onClick={() => window.location.href = '/nest-list'}
                >
                    {workspaceTitle}
                </div>
                <div className="header-controls">
                    <div className="global-actions">
                        <button className="global-action-btn" title="Notifications" onClick={handleNotificationClick}>
                            <Icon name="bell" size={18} />
                            {unreadCount > 0 && (
                                <div className="notification-count">{unreadCount}</div>
                            )}
                        </button>
                        <button className="global-action-btn" title="Global Search">
                            <Icon name="search" size={18} />
                        </button>
                    </div>
                    
                    <UserProfile />
                </div>
            </header>
            {/* サイドメニュー＋メインエリア */}
            <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
                <nav
                  className="side-menu"
                  style={{
                    height: '100%',
                    minHeight: 0,
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                    {/* サイドメニュー上部にSPACESラベルを追加 */}
                    <div style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: '#6c7086',
                        textTransform: 'uppercase',
                        letterSpacing: 1,
                        padding: '0 20px 8px',
                        marginBottom: 8,
                    }}>SPACES</div>
                    {menuSections.map((section, idx) => (
                        <div className="menu-section" key={idx}>
                            {section.title && (
                                <div className="menu-section-title">{section.title}</div>
                            )}
                            {section.items.map(item => (
                                <div
                                    key={item.id}
                                    className={
                                        'menu-item' + (item.isActive ? ' active' : '')
                                    }
                                    onClick={() => onMenuItemClick(item.id)}
                                >
                                    <div className="menu-icon">{item.icon}</div>
                                    <div className="menu-text">{item.text}</div>
                                    {item.badge && (
                                        <div className="menu-badge">{item.badge}</div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ))}
                </nav>
                {/* children（スペース本体） */}
                <main style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>{children}</main>
            </div>
        </div>
    );
}; 