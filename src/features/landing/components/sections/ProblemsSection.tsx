import React from 'react';
import { TargetType } from '../../config/targetingConfig';

interface ProblemsSectionProps {
  content: {
    problems: string[];
  };
  targetType: TargetType;
}

export const ProblemsSection: React.FC<ProblemsSectionProps> = ({ content, targetType }) => {

  const styles = {
    problem: {
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
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: '32px',
      marginTop: '60px',
    },
    item: {
      textAlign: 'left' as const,
      padding: '24px',
      background: '#0f0f23',
      border: '1px solid #333366',
      borderRadius: '4px',
      transition: 'all 0.3s ease',
      cursor: 'pointer',
    },
    icon: {
      width: '40px',
      height: '40px',
      background: '#333366',
      borderRadius: '2px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '18px',
      marginBottom: '16px',
    },
    itemTitle: {
      fontSize: '16px',
      fontWeight: 500,
      marginBottom: '12px',
      color: '#e2e8f0',
    },
    itemDescription: {
      fontSize: '13px',
      color: '#a6adc8',
      lineHeight: 1.6,
    },
  };

  const handleItemHover = (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.borderColor = '#00ff88';
    e.currentTarget.style.transform = 'translateY(-2px)';
  };

  const handleItemLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.borderColor = '#333366';
    e.currentTarget.style.transform = 'translateY(0)';
  };

  const problems = [
    {
      icon: (
        <svg style={{ width: '18px', height: '18px' }} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M3 12H6L8 8L10 16L12 12H15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="1"/>
          <path d="M15 12H18L20 8L22 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.3"/>
        </svg>
      ),
      title: '議論が消える',
      description: 'ミーティング後の議事録作成に時間がかかり、重要な議論が埋もれてしまう'
    },
    {
      icon: (
        <svg style={{ width: '18px', height: '18px' }} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="6" cy="6" r="2" stroke="currentColor" strokeWidth="1.5"/>
          <circle cx="18" cy="6" r="2" stroke="currentColor" strokeWidth="1.5"/>
          <circle cx="6" cy="18" r="2" stroke="currentColor" strokeWidth="1.5"/>
          <circle cx="18" cy="18" r="2" stroke="currentColor" strokeWidth="1.5"/>
          <circle cx="12" cy="12" r="2" stroke="currentColor" strokeWidth="1.5"/>
        </svg>
      ),
      title: '情報が散在する',
      description: 'Notion、Slack、Miroと情報が分散し、必要な時に見つからない'
    },
    {
      icon: (
        <svg style={{ width: '18px', height: '18px' }} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M12 12L17 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          <circle cx="17" cy="7" r="1.5" fill="currentColor"/>
          <path d="M19 5L21 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      ),
      title: 'トレンドが追えない',
      description: '世界の最新トレンドを追うのに時間がかかり、分析が属人的'
    },
    {
      icon: (
        <svg style={{ width: '18px', height: '18px' }} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="6" cy="12" r="3" stroke="currentColor" strokeWidth="1.5"/>
          <circle cx="18" cy="12" r="3" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M9 12H11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="2 2"/>
          <path d="M13 12H15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="2 2"/>
        </svg>
      ),
      title: '知識が繋がらない',
      description: '過去のアイデアや議論が活用されず、点在したまま'
    }
  ];

  return (
    <section style={styles.problem}>
      <div style={styles.container}>
        <div style={styles.sectionLabel}>The Problem</div>
        <h2 style={styles.title}>知的生産における、4つの断絶</h2>
        <div style={styles.grid}>
          {problems.map((problem, index) => (
            <div 
              key={index}
              style={styles.item}
              onMouseEnter={handleItemHover}
              onMouseLeave={handleItemLeave}
            >
              <div style={styles.icon}>
                {problem.icon}
              </div>
              <h3 style={styles.itemTitle}>{problem.title}</h3>
              <p style={styles.itemDescription}>{problem.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}; 