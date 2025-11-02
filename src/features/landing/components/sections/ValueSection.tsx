import React from 'react';

export const ValueSection: React.FC = () => {
  const styles = {
    value: {
      background: '#1a1a2e',
      borderTop: '1px solid #333366',
      borderBottom: '1px solid #333366',
      padding: '100px 40px',
    },
    container: {
      maxWidth: '1200px',
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
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '32px',
    },
    card: {
      background: '#0f0f23',
      border: '1px solid #333366',
      borderRadius: '4px',
      padding: '32px',
      transition: 'all 0.3s ease',
      cursor: 'pointer',
    },
    label: {
      fontSize: '11px',
      color: '#00ff88',
      textTransform: 'uppercase' as const,
      letterSpacing: '1px',
      marginBottom: '16px',
      fontWeight: 600,
    },
    cardTitle: {
      fontSize: '20px',
      fontWeight: 500,
      marginBottom: '16px',
      color: '#e2e8f0',
    },
    list: {
      listStyle: 'none',
      padding: 0,
      margin: 0,
    },
    listItem: {
      fontSize: '14px',
      color: '#a6adc8',
      marginBottom: '12px',
      paddingLeft: '20px',
      position: 'relative' as const,
    },
  };

  const handleCardHover = (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.borderColor = '#00ff88';
    e.currentTarget.style.transform = 'translateY(-4px)';
  };

  const handleCardLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.borderColor = '#333366';
    e.currentTarget.style.transform = 'translateY(0)';
  };

  const values = [
    {
      label: 'Functional Value',
      title: '機能的価値',
      items: [
        '議事録作成の自動化',
        'アイデアの構造化・可視化',
        'トレンド情報の自動収集・分析',
        '質的データからの理論抽出',
      ],
    },
    {
      label: 'Emotional Value',
      title: '情緒的価値',
      items: [
        '「思考が深まっていく」感覚',
        '「発見」の喜び',
        '知的生産性が上がっている実感',
        'チームの知識が進化している一体感',
      ],
    },
    {
      label: 'Self-actualization Value',
      title: '自己実現的価値',
      items: [
        '「深く考える人」になれる',
        '「洞察を生み出す人」になれる',
        '「トレンドを読む人」になれる',
        '「理論を紡ぐ人」になれる',
      ],
    },
  ];

  return (
    <section style={styles.value}>
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.sectionLabel}>Value Proposition</div>
          <h2 style={styles.title}>Poconestが提供する、3つの価値</h2>
        </div>
        
        <div style={styles.grid}>
          {values.map((value, index) => (
            <div 
              key={index}
              style={styles.card}
              onMouseEnter={handleCardHover}
              onMouseLeave={handleCardLeave}
            >
              <div style={styles.label}>{value.label}</div>
              <h3 style={styles.cardTitle}>{value.title}</h3>
              <ul style={styles.list}>
                {value.items.map((item, itemIndex) => (
                  <li key={itemIndex} style={styles.listItem}>
                    <span style={{ position: 'absolute', left: 0, color: '#00ff88' }}>•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

