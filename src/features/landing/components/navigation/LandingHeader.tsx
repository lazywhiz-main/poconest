import React from 'react';

interface LandingHeaderProps {
  onLoginClick: () => void;
  onSignupClick: () => void;
}

export const LandingHeader: React.FC<LandingHeaderProps> = ({
  onLoginClick,
  onSignupClick
}) => {
  const styles = {
    header: {
      position: 'fixed' as const,
      top: 0,
      left: 0,
      right: 0,
      background: 'rgba(15, 15, 35, 0.95)',
      backdropFilter: 'blur(10px)',
      borderBottom: '1px solid #333366',
      zIndex: 1000,
      padding: '16px 0',
    },
    container: {
      maxWidth: '1400px',
      margin: '0 auto',
      padding: '0 40px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    logoContainer: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      cursor: 'pointer',
    },
    logoText: {
      fontSize: '18px',
      fontWeight: 600,
      color: '#00ff88',
      textTransform: 'uppercase' as const,
      letterSpacing: '2px',
    },
    nav: {
      display: 'flex',
      gap: '32px',
      alignItems: 'center',
    },
    navLink: {
      fontSize: '13px',
      color: '#a6adc8',
      textDecoration: 'none',
      transition: 'color 0.2s ease',
      textTransform: 'uppercase' as const,
      letterSpacing: '1px',
      cursor: 'pointer',
    },
    btnPrimary: {
      background: '#00ff88',
      color: '#0f0f23',
      padding: '10px 24px',
      border: 'none',
      borderRadius: '2px',
      fontSize: '13px',
      fontWeight: 600,
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      textTransform: 'uppercase' as const,
      letterSpacing: '1px',
    },
  };

  const handleLinkHover = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.currentTarget.style.color = '#00ff88';
  };

  const handleLinkLeave = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.currentTarget.style.color = '#a6adc8';
  };

  const handleButtonHover = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.background = '#00ffaa';
    e.currentTarget.style.transform = 'translateY(-1px)';
  };

  const handleButtonLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.background = '#00ff88';
    e.currentTarget.style.transform = 'translateY(0)';
  };

  return (
    <header style={styles.header}>
      <div style={styles.container}>
        <div style={styles.logoContainer}>
          {/* Ripple Effect Logo */}
          <svg width="32" height="32" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="60" cy="60" r="8" fill="#00ff88"/>
            <circle cx="60" cy="60" r="20" stroke="#00ff88" strokeWidth="2" opacity="0.8"/>
            <circle cx="60" cy="60" r="35" stroke="#00ff88" strokeWidth="1.5" opacity="0.5"/>
            <circle cx="60" cy="60" r="50" stroke="#00ff88" strokeWidth="1" opacity="0.3"/>
            <line x1="60" y1="10" x2="60" y2="25" stroke="#00ff88" strokeWidth="2" strokeLinecap="round"/>
            <line x1="110" y1="60" x2="95" y2="60" stroke="#00ff88" strokeWidth="2" strokeLinecap="round"/>
            <line x1="60" y1="110" x2="60" y2="95" stroke="#00ff88" strokeWidth="2" strokeLinecap="round"/>
            <line x1="10" y1="60" x2="25" y2="60" stroke="#00ff88" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <div style={styles.logoText}>Poconest</div>
        </div>
        <nav style={styles.nav}>
          <a 
            href="#features" 
            style={styles.navLink}
            onMouseEnter={handleLinkHover}
            onMouseLeave={handleLinkLeave}
          >
            Features
          </a>
          <a 
            href="#ecosystem" 
            style={styles.navLink}
            onMouseEnter={handleLinkHover}
            onMouseLeave={handleLinkLeave}
          >
            Ecosystem
          </a>
          <a 
            href="#personas" 
            style={styles.navLink}
            onMouseEnter={handleLinkHover}
            onMouseLeave={handleLinkLeave}
          >
            Use Cases
          </a>
          <button 
            style={styles.btnPrimary}
            onClick={onSignupClick}
            onMouseEnter={handleButtonHover}
            onMouseLeave={handleButtonLeave}
          >
            Get Started
          </button>
        </nav>
      </div>
    </header>
  );
};
