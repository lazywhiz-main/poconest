import React, { useState } from 'react';
import Icon from './ui/Icon';
import { UserProfile } from './UserProfile';
import { useResponsive } from '../hooks/useResponsive';
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

export const ResponsiveLayout: React.FC<LayoutProps> = ({
    children,
    workspaceTitle,
    menuSections,
    onMenuItemClick,
    nestId,
    onSettingsClick,
}) => {
    const { isMobile, isTablet } = useResponsive();
    const [sideMenuOpen, setSideMenuOpen] = useState(!isMobile);

    const handleMenuItemClick = (itemId: string) => {
        onMenuItemClick(itemId);
        // モバイルでメニュー項目をクリックしたらメニューを閉じる
        if (isMobile) {
            setSideMenuOpen(false);
        }
    };

    return (
        <div style={{ height: '100vh', background: '#0f0f23', display: 'flex', flexDirection: 'column' }}>
            {/* ヘッダー（レスポンシブ対応） */}
            <header 
                className="workspace-header" 
                style={{ 
                    width: '100vw', 
                    minWidth: 0, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    padding: isMobile ? '8px 16px' : '12px 20px' // モバイルでパディング調整
                }}
            >
                {/* モバイル用ハンバーガーメニュー */}
                {isMobile && (
                    <button 
                        onClick={() => setSideMenuOpen(!sideMenuOpen)}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#e2e8f0',
                            padding: '4px',
                            cursor: 'pointer',
                            marginRight: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                        title="メニューを開く"
                    >
                        <Icon name="more" size={20} />
                    </button>
                )}
                
                <div 
                    className="workspace-title" 
                    style={{ 
                        cursor: 'pointer',
                        fontSize: isMobile ? '14px' : '16px' // モバイルでフォントサイズ調整
                    }}
                    onClick={() => window.location.href = '/nest-list'}
                >
                    {workspaceTitle}
                </div>
                
                <div className="header-controls">
                    {/* デスクトップ時のみ全ての操作を表示 */}
                    {!isMobile && (
                        <div className="global-actions">
                            <button className="global-action-btn" title="Notifications">
                                <Icon name="bell" size={18} />
                                <div className="notification-count">3</div>
                            </button>
                            <button className="global-action-btn" title="Global Search">
                                <Icon name="search" size={18} />
                            </button>
                        </div>
                    )}
                    
                    <UserProfile />
                </div>
            </header>

            {/* サイドメニュー＋メインエリア */}
            <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
                {/* サイドメニュー（レスポンシブ対応） */}
                <nav
                    className="side-menu nav-responsive"
                    style={{
                        height: '100%',
                        minHeight: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        width: isMobile ? '280px' : isTablet ? '160px' : '200px', // デバイス別幅調整
                        position: isMobile ? 'fixed' : 'relative', // モバイルで固定位置
                        top: isMobile ? '60px' : 'auto', // ヘッダー分下げる
                        left: 0,
                        zIndex: isMobile ? 1000 : 'auto',
                        transform: isMobile ? (sideMenuOpen ? 'translateX(0)' : 'translateX(-100%)') : 'none',
                        transition: 'transform 0.3s ease',
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
                                    onClick={() => handleMenuItemClick(item.id)}
                                >
                                    <div className="menu-icon">{item.icon}</div>
                                    <div 
                                        className="menu-text"
                                        style={{
                                            fontSize: isTablet ? '12px' : '13px' // タブレットで小さく
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

                {/* モバイル用オーバーレイ */}
                {isMobile && sideMenuOpen && (
                    <div 
                        className="overlay active"
                        onClick={() => setSideMenuOpen(false)}
                        style={{
                            position: 'fixed',
                            top: '60px', // ヘッダー分下げる
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'rgba(15, 15, 35, 0.8)', // 既存の背景色に合わせる
                            zIndex: 999,
                        }}
                    />
                )}

                {/* メインコンテンツエリア */}
                <main 
                    style={{ 
                        flex: 1, 
                        minHeight: 0, 
                        overflow: 'hidden',
                        marginLeft: isMobile ? 0 : undefined // モバイルではマージンなし
                    }}
                >
                    {children}
                </main>
            </div>
        </div>
    );
}; 