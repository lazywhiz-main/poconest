import React from 'react';

export const PersonasSection: React.FC = () => {
  const styles = {
    personas: {
      padding: '100px 40px',
      maxWidth: '1400px',
      margin: '0 auto',
    },
    header: {
      textAlign: 'center' as const,
      marginBottom: '80px',
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
      marginBottom: '20px',
      color: '#e2e8f0',
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: '32px',
    },
    card: {
      background: '#1a1a2e',
      border: '1px solid #333366',
      borderRadius: '4px',
      padding: '32px',
      transition: 'all 0.3s ease',
      cursor: 'pointer',
    },
    personaHeader: {
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      marginBottom: '24px',
    },
    avatar: {
      width: '60px',
      height: '60px',
      background: '#333366',
      borderRadius: '2px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '24px',
    },
    info: {
      flex: 1,
    },
    name: {
      fontSize: '20px',
      fontWeight: 500,
      marginBottom: '4px',
      color: '#e2e8f0',
    },
    role: {
      fontSize: '13px',
      color: '#6c7086',
    },
    challenge: {
      background: '#0f0f23',
      border: '1px solid #333366',
      borderRadius: '2px',
      padding: '16px',
      marginBottom: '20px',
    },
    challengeTitle: {
      fontSize: '12px',
      color: '#00ff88',
      textTransform: 'uppercase' as const,
      letterSpacing: '1px',
      marginBottom: '8px',
      fontWeight: 600,
    },
    challengeText: {
      fontSize: '14px',
      color: '#a6adc8',
      lineHeight: 1.6,
    },
    value: {
      fontSize: '14px',
      color: '#e2e8f0',
      lineHeight: 1.6,
    },
    highlight: {
      color: '#00ff88',
    },
  };

  const handleCardHover = (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.borderColor = '#00ff88';
  };

  const handleCardLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.borderColor = '#333366';
  };

  const personas = [
    {
      name: 'デザインスタジオ代表',
      role: '32歳 / 5人規模のプロダクトデザインスタジオ経営',
      icon: (
        <svg style={{ width: '32px', height: '32px' }} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 3L8 7L12 11L16 7L12 3Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
          <circle cx="6" cy="18" r="2" stroke="currentColor" strokeWidth="1.5"/>
          <circle cx="12" cy="18" r="2" stroke="currentColor" strokeWidth="1.5"/>
          <circle cx="18" cy="18" r="2" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M12 11V16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M10 16L6 16M14 16L18 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      ),
      challenge: '議事録作成に時間を取られ、過去の議論が埋もれてしまう。トレンド収集が属人的で、企画の説得力に欠ける。',
      value: 'ミーティング後、議事録を書く必要がなくなり、トレンドとアイデアが自動で繋がる。「思考の外部記憶」として機能。',
    },
    {
      name: 'UXリサーチャー',
      role: '28歳 / 事業会社・質的研究専門',
      icon: (
        <svg style={{ width: '32px', height: '32px' }} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="10" cy="10" r="6" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M14.5 14.5L19 19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          <circle cx="10" cy="8.5" r="1.5" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M7 13C7 11.8954 7.89543 11 9 11H11C12.1046 11 13 11.8954 13 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      ),
      challenge: '文字起こしに時間とコストがかかり、質的分析が手作業で大変。インサイトの質が自分のスキルに依存。',
      value: '文字起こし時間がゼロになり、グラウンデッド・セオリー分析が3倍速に。「思考のパートナー」として機能。',
    },
    {
      name: 'スタートアップCEO',
      role: '35歳 / シード〜シリーズA段階',
      icon: (
        <svg style={{ width: '32px', height: '32px' }} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="18" cy="6" r="3" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M3 20L7 16L11 18L15 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="18" cy="6" r="1" fill="currentColor"/>
          <path d="M15 12L18 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      ),
      challenge: '情報が散在し、意思決定の材料を集めるのに時間がかかる。過去の議論や仮説が整理されていない。',
      value: '議論、仮説、トレンドが自動で繋がり、ピボット判断の精度とスピードが向上。「意思決定の羅針盤」として機能。',
    },
    {
      name: 'プロダクトデザイナー',
      role: '26歳 / フリーランス・家具/空間デザイン',
      icon: (
        <svg style={{ width: '32px', height: '32px' }} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M4 20L8 4L12 20L16 4L20 20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="12" cy="8" r="2" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M10 10L8 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M14 10L16 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      ),
      challenge: 'インスピレーション収集が散発的で、「なぜこのデザインが良いのか」を言語化できない。トレンドの表面しか追えていない。',
      value: 'トレンドが自動収集され、AIがスコアリング。過去のアイデアと新しいトレンドが繋がる。「インスピレーションの泉」として機能。',
    },
  ];

  return (
    <section style={styles.personas}>
      <div style={styles.header}>
        <div style={styles.sectionLabel}>Use Cases</div>
        <h2 style={styles.title}>こんな人に、最適です</h2>
      </div>
      
      <div style={styles.grid}>
        {personas.map((persona, index) => (
          <div 
            key={index}
            style={styles.card}
            onMouseEnter={handleCardHover}
            onMouseLeave={handleCardLeave}
          >
            <div style={styles.personaHeader}>
              <div style={styles.avatar}>
                {persona.icon}
              </div>
              <div style={styles.info}>
                <h3 style={styles.name}>{persona.name}</h3>
                <div style={styles.role}>{persona.role}</div>
              </div>
            </div>
            
            <div style={styles.challenge}>
              <div style={styles.challengeTitle}>課題</div>
              <div style={styles.challengeText}>{persona.challenge}</div>
            </div>
            
            <div style={styles.value}>
              <strong style={styles.highlight}>Poconestで実現</strong><br/>
              {persona.value}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

