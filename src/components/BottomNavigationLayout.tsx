import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from './ui/Icon';
import { UserProfile } from './UserProfile';
import { useResponsive } from '../hooks/useResponsive';
import { useNotifications } from '../features/notifications/hooks/useNotifications';
import '../styles/responsive.css';

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

export const BottomNavigationLayout: React.FC<LayoutProps> = ({
    children,
    workspaceTitle,
    menuSections,
    onMenuItemClick,
    nestId,
    onSettingsClick,
}) => {
    const navigate = useNavigate();
    const { isMobile, isTablet } = useResponsive();
    const { unreadCount } = useNotifications({ limit: 1 }); // 未読数だけ取得

    // デバッグ情報
    console.log('🎯 BottomNavigationLayout loaded:', { isMobile, isTablet, screenWidth: window.innerWidth });

    // メニューアイテムを平坦化（ボトムナビ用）
    const menuItems = menuSections.flatMap(section => section.items);

    const handleMenuItemClick = (itemId: string) => {
        onMenuItemClick(itemId);
    };

    const handleNotificationClick = () => {
        navigate('/notifications');
    };

    return (
        <div style={{ 
            height: '100vh', 
            background: '#0f0f23', 
            display: 'flex', 
            flexDirection: 'column',
            overflow: 'hidden'
        }}>
            {/* ヘッダー（レスポンシブ対応） */}
            <header 
                className="workspace-header" 
                style={{ 
                    width: '100vw', 
                    minWidth: 0, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    padding: isMobile ? '8px 16px' : '12px 20px',
                    flexShrink: 0,
                    zIndex: 100
                }}
            >
                <div 
                    className="workspace-title" 
                    style={{ 
                        cursor: 'pointer',
                        fontSize: isMobile ? '14px' : '16px'
                    }}
                    onClick={() => window.location.href = '/nest-list'}
                >
                    {workspaceTitle}
                </div>
                
                <div className="header-controls">
                    {/* デスクトップ時のみ全ての操作を表示 */}
                    {!isMobile && (
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
                    )}
                    
                    <UserProfile />
                </div>
            </header>

            {/* メインレイアウト */}
            <div style={{ 
                display: 'flex', 
                flex: 1, 
                minHeight: 0,
                overflow: 'hidden'
            }}>
                {/* デスクトップ・タブレット用サイドメニュー */}
                {!isMobile && (
                    <nav
                        className="side-menu"
                        style={{
                            height: '100%',
                            minHeight: 0,
                            display: 'flex',
                            flexDirection: 'column',
                            width: isTablet ? '160px' : '200px',
                            flexShrink: 0
                        }}
                    >
                        {/* SPACESラベル */}
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
                                        onClick={() => handleMenuItemClick(item.id)}
                                    >
                                        <div className="menu-icon">{item.icon}</div>
                                        <div 
                                            className="menu-text"
                                            style={{
                                                fontSize: isTablet ? '12px' : '13px'
                                            }}
                                        >
                                            {item.text}
                                        </div>
                                        {item.badge && (
                                            <div className="menu-badge">{item.badge}</div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ))}
                    </nav>
                )}

                {/* メインコンテンツエリア */}
                <main 
                    style={{ 
                        flex: 1, 
                        minHeight: 0, 
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        paddingBottom: isMobile ? '64px' : 0 // ボトムナビ分のスペース
                    }}
                >
                    {children}
                </main>
            </div>

            {/* モバイル用ボトムナビゲーション */}
            {isMobile && (
                <nav 
                    style={{
                        position: 'fixed',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: '64px',
                        background: '#1a1a2e',
                        borderTop: '1px solid #333366',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-around',
                        paddingBottom: 'env(safe-area-inset-bottom)', // iOS対応
                        zIndex: 1000,
                        boxSizing: 'border-box'
                    }}
                >
                    {menuItems.map(item => (
                        <button
                            key={item.id}
                            onClick={() => handleMenuItemClick(item.id)}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: item.isActive ? '#00ff88' : '#a6adc8',
                                cursor: 'pointer',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                minWidth: '44px',
                                minHeight: '44px',
                                padding: '4px',
                                transition: 'all 0.2s ease',
                                position: 'relative',
                                flex: 1,
                                maxWidth: '80px'
                            }}
                            title={item.text}
                        >
                            {/* アイコン部分 */}
                            <div 
                                style={{
                                    marginBottom: '2px',
                                    transform: item.isActive ? 'scale(1.1)' : 'scale(1)',
                                    transition: 'transform 0.2s ease'
                                }}
                            >
                                {item.icon}
                            </div>
                            
                            {/* ラベル */}
                            <span 
                                style={{
                                    fontSize: '10px',
                                    fontWeight: item.isActive ? '600' : '400',
                                    lineHeight: 1,
                                    textAlign: 'center',
                                    maxWidth: '100%',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                {item.text}
                            </span>

                            {/* バッジ */}
                            {item.badge && (
                                <div 
                                    style={{
                                        position: 'absolute',
                                        top: '4px',
                                        right: '8px',
                                        background: '#ff6b6b',
                                        color: '#ffffff',
                                        fontSize: '10px',
                                        fontWeight: '600',
                                        padding: '2px 6px',
                                        borderRadius: '10px',
                                        minWidth: '16px',
                                        textAlign: 'center',
                                        lineHeight: 1,
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
                                    }}
                                >
                                    {item.badge}
                                </div>
                            )}

                            {/* アクティブインジケーター */}
                            {item.isActive && (
                                <div 
                                    style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: '50%',
                                        transform: 'translateX(-50%)',
                                        width: '4px',
                                        height: '2px',
                                        background: '#00ff88',
                                        borderRadius: '0 0 2px 2px'
                                    }}
                                />
                            )}
                        </button>
                    ))}
                </nav>
            )}
        </div>
    );
}; 