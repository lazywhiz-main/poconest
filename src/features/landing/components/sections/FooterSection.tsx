import React from 'react';

export const FooterSection: React.FC = () => {
  const styles = {
    footer: {
      background: '#1a1a2e',
      borderTop: '1px solid #333366',
      padding: '60px 40px 40px',
    },
    container: {
      maxWidth: '1400px',
      margin: '0 auto',
      display: 'grid',
      gridTemplateColumns: '2fr 1fr 1fr 1fr',
      gap: '60px',
      marginBottom: '40px',
    },
    brand: {
      maxWidth: '320px',
    },
    logo: {
      fontSize: '18px',
      fontWeight: 600,
      color: '#00ff88',
      textTransform: 'uppercase' as const,
      letterSpacing: '2px',
      marginBottom: '16px',
    },
    description: {
      fontSize: '13px',
      color: '#a6adc8',
      lineHeight: 1.6,
    },
    sectionTitle: {
      fontSize: '13px',
      color: '#e2e8f0',
      textTransform: 'uppercase' as const,
      letterSpacing: '1px',
      marginBottom: '16px',
      fontWeight: 600,
    },
    links: {
      listStyle: 'none',
      padding: 0,
      margin: 0,
    },
    link: {
      fontSize: '13px',
      color: '#a6adc8',
      textDecoration: 'none',
      transition: 'color 0.2s ease',
    },
    bottom: {
      maxWidth: '1400px',
      margin: '0 auto',
      paddingTop: '40px',
      borderTop: '1px solid #333366',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    copyright: {
      fontSize: '12px',
      color: '#6c7086',
      fontFamily: 'JetBrains Mono, monospace',
    },
    social: {
      display: 'flex',
      gap: '16px',
    },
    socialLink: {
      width: '32px',
      height: '32px',
      background: '#333366',
      borderRadius: '2px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.2s ease',
      color: '#a6adc8',
      textDecoration: 'none',
      cursor: 'pointer',
    },
  };

  const handleLinkHover = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.currentTarget.style.color = '#00ff88';
  };

  const handleLinkLeave = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.currentTarget.style.color = '#a6adc8';
  };

  const handleSocialHover = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.currentTarget.style.background = '#00ff88';
    e.currentTarget.style.color = '#0f0f23';
  };

  const handleSocialLeave = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.currentTarget.style.background = '#333366';
    e.currentTarget.style.color = '#a6adc8';
  };

  return (
    <footer style={styles.footer}>
      <div style={styles.container}>
        <div style={styles.brand}>
          <div style={styles.logo}>Poconest</div>
          <p style={styles.description}>
            思考が進化する、知的生産空間。対話、整理、収集、分析のすべてが繋がり、あなたの知的資産を蓄積・進化させます。
          </p>
        </div>
        <div>
          <h4 style={styles.sectionTitle}>Product</h4>
          <ul style={styles.links}>
            {['Features', 'Ecosystem', 'Use Cases', 'Pricing'].map((item) => (
              <li key={item} style={{ marginBottom: '12px' }}>
                <a 
                  href={`#${item.toLowerCase().replace(' ', '-')}`} 
                  style={styles.link}
                  onMouseEnter={handleLinkHover}
                  onMouseLeave={handleLinkLeave}
                >
                  {item}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 style={styles.sectionTitle}>Support</h4>
          <ul style={styles.links}>
            {['Documentation', 'Help Center', 'Community', 'Contact'].map((item) => (
              <li key={item} style={{ marginBottom: '12px' }}>
                <a 
                  href="#" 
                  style={styles.link}
                  onMouseEnter={handleLinkHover}
                  onMouseLeave={handleLinkLeave}
                >
                  {item}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 style={styles.sectionTitle}>Legal & Company</h4>
          <ul style={styles.links}>
            <li style={{ marginBottom: '12px' }}>
              <a 
                href="#" 
                style={styles.link}
                onMouseEnter={handleLinkHover}
                onMouseLeave={handleLinkLeave}
              >
                Terms of Service
              </a>
            </li>
            <li style={{ marginBottom: '12px' }}>
              <a 
                href="#" 
                style={styles.link}
                onMouseEnter={handleLinkHover}
                onMouseLeave={handleLinkLeave}
              >
                Privacy Policy
              </a>
            </li>
            <li style={{ marginBottom: '12px' }}>
              <a 
                href="https://lazywhiz.com" 
                target="_blank" 
                rel="noopener noreferrer"
                style={styles.link}
                onMouseEnter={handleLinkHover}
                onMouseLeave={handleLinkLeave}
              >
                About LAZYWHIZ ↗
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div style={styles.bottom}>
        <div style={styles.copyright}>© 2025 Poconest. All rights reserved.</div>
        <div style={styles.social}>
          <a 
            href="#" 
            style={styles.socialLink}
            onMouseEnter={handleSocialHover}
            onMouseLeave={handleSocialLeave}
          >
            𝕏
          </a>
          <a 
            href="#" 
            style={styles.socialLink}
            onMouseEnter={handleSocialHover}
            onMouseLeave={handleSocialLeave}
          >
            in
          </a>
          <a 
            href="#" 
            style={styles.socialLink}
            onMouseEnter={handleSocialHover}
            onMouseLeave={handleSocialLeave}
          >
            →
          </a>
        </div>
      </div>
    </footer>
  );
};
