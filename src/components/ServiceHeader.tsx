import React, { useState, useRef, useEffect } from 'react';
import '../styles/nestlist.css';
import { useAuth } from '../contexts/AuthContext';

export const ServiceHeader: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { logout } = useAuth();

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

  return (
    <header className="header">
      <div className="header-content">
        <div className="logo">
          <div className="logo-icon" aria-hidden="true">P</div>
          <div className="logo-text">poconest</div>
        </div>
        <nav className="main-nav" role="navigation" aria-label="メインナビゲーション">
          <a href="#" className="nav-item active" aria-current="page">
            <span className="nav-icon">🏠</span>
            <span className="nav-label">NEST LIST</span>
          </a>
          <a href="#" className="nav-item">
            <span className="nav-icon">⚙️</span>
            <span className="nav-label">設定</span>
          </a>
        </nav>
        <div className="search-box" role="search">
          <span className="search-icon" aria-hidden="true">🔍</span>
          <input
            type="text"
            className="search-input"
            placeholder="検索... (Ctrl+K)"
            id="searchInput"
          />
          <div className="search-shortcut">⌘K</div>
        </div>
        <div className="header-actions" ref={menuRef}>
          <button className="notification-btn" title="通知" aria-label="通知を確認">
            <span className="notification-icon">🔔</span>
            <span className="notification-badge">3</span>
          </button>
          <button className="user-menu" aria-label="ユーザーメニューを開く" onClick={() => setMenuOpen((v) => !v)}>
            <div className="user-avatar" aria-hidden="true">P</div>
            <div className="user-name">ユーザー名</div>
            <span className="dropdown-arrow">▼</span>
          </button>
          {menuOpen && (
            <div className="user-dropdown" role="menu">
              <button className="user-dropdown-item" onClick={handleLogout} role="menuitem">ログアウト</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}; 