import React from 'react';

export const EcosystemSection: React.FC = () => {
  const styles = {
    ecosystem: {
      background: '#1a1a2e',
      borderTop: '1px solid #333366',
      borderBottom: '1px solid #333366',
      padding: '100px 40px',
    },
    container: {
      maxWidth: '1200px',
      margin: '0 auto',
      textAlign: 'center' as const,
    },
    sectionLabel: {
      fontSize: '11px',
      color: '#00ff88',
      textTransform: 'uppercase' as const,
      letterSpacing: '2px',
      marginBottom: '16px',
      fontWeight: 600,
    },
    title: {
      fontSize: '40px',
      fontWeight: 600,
      marginBottom: '60px',
      color: '#e2e8f0',
    },
    diagram: {
      background: '#0f0f23',
      border: '1px solid #333366',
      borderRadius: '4px',
      padding: '60px',
      marginBottom: '60px',
    },
    flowContainer: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '16px',
      marginBottom: '40px',
    },
    node: {
      background: '#1a1a2e',
      border: '1px solid #333366',
      borderRadius: '4px',
      padding: '24px',
      transition: 'all 0.3s ease',
      minWidth: '180px',
      cursor: 'pointer',
    },
    nodeIcon: {
      width: '48px',
      height: '48px',
      background: '#333366',
      borderRadius: '2px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '24px',
      margin: '0 auto 16px',
    },
    nodeTitle: {
      fontSize: '16px',
      fontWeight: 500,
      marginBottom: '8px',
      color: '#e2e8f0',
    },
    nodeDescription: {
      fontSize: '12px',
      color: '#a6adc8',
      lineHeight: 1.5,
    },
    cycleArrow: {
      position: 'relative' as const,
      marginTop: '40px',
      paddingTop: 0,
      height: '100px',
    },
    cycleLabel: {
      position: 'absolute' as const,
      top: '15px',
      left: '50%',
      transform: 'translateX(-50%)',
      background: '#0f0f23',
      padding: '8px 24px',
      color: '#00ff88',
      fontSize: '14px',
      fontWeight: 500,
      whiteSpace: 'nowrap' as const,
      zIndex: 1,
    },
    description: {
      fontSize: '16px',
      color: '#a6adc8',
      lineHeight: 1.8,
    },
    highlight: {
      color: '#00ff88',
    },
  };

  const handleNodeHover = (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.borderColor = '#00ff88';
    e.currentTarget.style.transform = 'translateY(-4px)';
  };

  const handleNodeLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.borderColor = '#333366';
    e.currentTarget.style.transform = 'translateY(0)';
  };

  return (
    <section style={styles.ecosystem}>
      <div style={styles.container}>
        <div style={styles.sectionLabel}>Ecosystem</div>
        <h2 style={styles.title}>すべてが繋がる、統合体験</h2>
        
        <div style={styles.diagram}>
          <div style={styles.flowContainer}>
            {/* Meeting */}
            <div 
              style={styles.node}
              onMouseEnter={handleNodeHover}
              onMouseLeave={handleNodeLeave}
            >
              <div style={styles.nodeIcon}>
                <svg style={{ width: '24px', height: '24px' }} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M4 12H6L8 8L10 16L12 10L14 14L16 12H20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M8 18H16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M6 20H18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
              <div style={styles.nodeTitle}>Meeting</div>
              <div style={styles.nodeDescription}>音声 → 文字 → カード</div>
            </div>

            {/* Arrow 1 */}
            <div style={{ flexShrink: 0 }}>
              <svg width="60" height="24" viewBox="0 0 60 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M0 12H55M55 12L50 7M55 12L50 17" stroke="#00ff88" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>

            {/* Board */}
            <div 
              style={styles.node}
              onMouseEnter={handleNodeHover}
              onMouseLeave={handleNodeLeave}
            >
              <div style={styles.nodeIcon}>
                <svg style={{ width: '24px', height: '24px' }} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5"/>
                  <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5"/>
                  <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5"/>
                  <rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M10 6.5H14M6.5 10V14M17.5 10V14M10 17.5H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
              <div style={styles.nodeTitle}>Board</div>
              <div style={styles.nodeDescription}>構造化 → 関連付け → 可視化</div>
            </div>

            {/* Arrow 2 */}
            <div style={{ flexShrink: 0 }}>
              <svg width="60" height="24" viewBox="0 0 60 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M0 12H55M55 12L50 7M55 12L50 17" stroke="#00ff88" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>

            {/* Trend */}
            <div 
              style={styles.node}
              onMouseEnter={handleNodeHover}
              onMouseLeave={handleNodeLeave}
            >
              <div style={styles.nodeIcon}>
                <svg style={{ width: '24px', height: '24px' }} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5"/>
                  <circle cx="12" cy="12" r="6" stroke="currentColor" strokeWidth="1.5" opacity="0.5"/>
                  <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" opacity="0.3"/>
                  <path d="M12 3V12L17 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div style={styles.nodeTitle}>Trend</div>
              <div style={styles.nodeDescription}>収集 → スコア → 連携</div>
            </div>

            {/* Arrow 3 */}
            <div style={{ flexShrink: 0 }}>
              <svg width="60" height="24" viewBox="0 0 60 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M0 12H55M55 12L50 7M55 12L50 17" stroke="#00ff88" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>

            {/* Analysis */}
            <div 
              style={styles.node}
              onMouseEnter={handleNodeHover}
              onMouseLeave={handleNodeLeave}
            >
              <div style={styles.nodeIcon}>
                <svg style={{ width: '24px', height: '24px' }} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="6" cy="18" r="1.5" fill="currentColor"/>
                  <circle cx="9" cy="14" r="1.5" fill="currentColor"/>
                  <circle cx="12" cy="16" r="1.5" fill="currentColor"/>
                  <circle cx="15" cy="10" r="1.5" fill="currentColor"/>
                  <circle cx="18" cy="6" r="1.5" fill="currentColor"/>
                  <path d="M6 18L9 14L12 16L15 10L18 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div style={styles.nodeTitle}>Analysis</div>
              <div style={styles.nodeDescription}>分析 → 理論 → 洞察</div>
            </div>
          </div>

          {/* Return arrow to complete the cycle */}
          <div style={styles.cycleArrow}>
            <svg width="100%" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
              {/* Analysisの下から下に降りて、左に曲がり、上に戻る */}
              <path d="M87.5 0 L87.5 30 L12.5 30 L12.5 0" stroke="#00ff88" strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round"/>
              {/* 矢印ヘッド（上向き - Meetingに向かう） */}
              <path d="M12.5 0 L10 5 M12.5 0 L15 5" stroke="#00ff88" strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <div style={styles.cycleLabel}>循環し、進化する</div>
          </div>
        </div>

        <p style={styles.description}>
          ミーティングで生まれた議論がボードカードに、<br/>
          トレンドが自動で集まりアイデアと繋がり、<br/>
          分析から得た洞察が次のミーティングに活かされる。<br/>
          <strong style={styles.highlight}>使えば使うほど、知的資産が蓄積・進化します。</strong>
        </p>
      </div>
    </section>
  );
};
