import React, { useState } from 'react';
import { LandingButton } from '../common/LandingButton';

interface LandingHeaderProps {
  onLoginClick: () => void;
  onSignupClick: () => void;
}

export const LandingHeader: React.FC<LandingHeaderProps> = ({
  onLoginClick,
  onSignupClick
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <>
      <header style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: 'var(--bg-primary)',
        borderBottom: '1px solid var(--border-primary)',
        padding: 'var(--space-lg) var(--space-xl)',
        zIndex: 1000
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          {/* ロゴ */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              background: 'var(--primary-green)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 'var(--text-lg)',
              fontWeight: '700',
              color: 'var(--text-inverse)'
            }}>
              P
            </div>
            <div style={{
              fontSize: 'var(--text-2xl)',
              fontWeight: '700',
              color: 'var(--primary-green)',
              fontFamily: 'var(--font-family-text)'
            }}>
              Poconest
            </div>
          </div>

          {/* デスクトップナビゲーション */}
          <nav className="desktop-nav" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '32px'
          }}>
            <a
              href="#features"
              style={{
                color: 'var(--text-secondary)',
                textDecoration: 'none',
                fontSize: 'var(--text-base)',
                fontWeight: '500',
                transition: 'var(--transition-normal)',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--primary-green)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
            >
              機能
            </a>
            <a
              href="#pricing"
              style={{
                color: 'var(--text-secondary)',
                textDecoration: 'none',
                fontSize: 'var(--text-base)',
                fontWeight: '500',
                transition: 'var(--transition-normal)',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--primary-green)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
            >
              価格
            </a>
            <a
              href="#testimonials"
              style={{
                color: 'var(--text-secondary)',
                textDecoration: 'none',
                fontSize: 'var(--text-base)',
                fontWeight: '500',
                transition: 'var(--transition-normal)',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--primary-green)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
            >
              お客様の声
            </a>
          </nav>

          {/* デスクトップアクションボタン */}
          <div className="desktop-actions" style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <LandingButton
              title="ログイン"
              onPress={onLoginClick}
              variant="outline"
              size="sm"
            />
            <LandingButton
              title="無料で始める"
              onPress={onSignupClick}
              variant="primary"
              size="sm"
            />
          </div>

          {/* モバイルハンバーガーメニュー */}
          <button
            className="mobile-menu-button"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            style={{
              display: 'none',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '8px',
              color: 'var(--text-primary)'
            }}
          >
            <div style={{
              width: '24px',
              height: '3px',
              backgroundColor: 'currentColor',
              marginBottom: '4px',
              transition: 'all 0.3s ease',
              transform: isMenuOpen ? 'rotate(45deg) translate(6px, 6px)' : 'none'
            }} />
            <div style={{
              width: '24px',
              height: '3px',
              backgroundColor: 'currentColor',
              marginBottom: '4px',
              transition: 'all 0.3s ease',
              opacity: isMenuOpen ? 0 : 1
            }} />
            <div style={{
              width: '24px',
              height: '3px',
              backgroundColor: 'currentColor',
              transition: 'all 0.3s ease',
              transform: isMenuOpen ? 'rotate(-45deg) translate(6px, -6px)' : 'none'
            }} />
          </button>
        </div>
      </header>

      {/* モバイルメニュー */}
      {isMenuOpen && (
        <div
          className="mobile-menu"
          style={{
            position: 'fixed',
            top: '80px',
            left: 0,
            right: 0,
            backgroundColor: 'var(--bg-primary)',
            borderBottom: '1px solid var(--border-primary)',
            padding: '20px',
            zIndex: 999,
            display: 'none'
          }}
        >
          <nav style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            marginBottom: '20px'
          }}>
            <a
              href="#features"
              onClick={() => setIsMenuOpen(false)}
              style={{
                color: 'var(--text-secondary)',
                textDecoration: 'none',
                fontSize: 'var(--text-lg)',
                fontWeight: '500',
                padding: '12px 0',
                borderBottom: '1px solid var(--border-secondary)'
              }}
            >
              機能
            </a>
            <a
              href="#pricing"
              onClick={() => setIsMenuOpen(false)}
              style={{
                color: 'var(--text-secondary)',
                textDecoration: 'none',
                fontSize: 'var(--text-lg)',
                fontWeight: '500',
                padding: '12px 0',
                borderBottom: '1px solid var(--border-secondary)'
              }}
            >
              価格
            </a>
            <a
              href="#testimonials"
              onClick={() => setIsMenuOpen(false)}
              style={{
                color: 'var(--text-secondary)',
                textDecoration: 'none',
                fontSize: 'var(--text-lg)',
                fontWeight: '500',
                padding: '12px 0',
                borderBottom: '1px solid var(--border-secondary)'
              }}
            >
              お客様の声
            </a>
          </nav>
          
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <LandingButton
              title="ログイン"
              onPress={() => {
                onLoginClick();
                setIsMenuOpen(false);
              }}
              variant="outline"
              size="md"
              fullWidth
            />
            <LandingButton
              title="無料で始める"
              onPress={() => {
                onSignupClick();
                setIsMenuOpen(false);
              }}
              variant="primary"
              size="md"
              fullWidth
            />
          </div>
        </div>
      )}

      <style>
        {`
          @media (max-width: 768px) {
            .desktop-nav,
            .desktop-actions {
              display: none !important;
            }
            
            .mobile-menu-button {
              display: block !important;
            }
            
            .mobile-menu {
              display: block !important;
            }
            
            header {
              padding: 16px 20px !important;
            }
          }
          
          @media (max-width: 480px) {
            header div[style*="fontSize: var(--text-2xl)"] {
              font-size: 20px !important;
            }
          }
        `}
      </style>
    </>
  );
}; 