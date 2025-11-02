import React from 'react';
import { Link } from 'react-router-dom';
import { TargetType } from '../../config/targetingConfig';
import { LandingButton } from '../common/LandingButton';

interface HeroSectionProps {
  content: {
    headline: string;
    subtext: string;
    ctaText: string;
  };
  targetType: TargetType;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ content, targetType }) => {
  const styles = {
    hero: {
      padding: '140px 40px 100px',
      maxWidth: '1400px',
      margin: '0 auto',
      position: 'relative' as const,
    },
    heroGrid: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '80px',
      alignItems: 'center',
    },
    heroContent: {
      // Left column
    },
    title: {
      fontSize: '56px',
      fontWeight: 700,
      lineHeight: 1.1,
      marginBottom: '24px',
      color: '#e2e8f0',
    },
    highlight: {
      color: '#00ff88',
      position: 'relative' as const,
      display: 'inline-block',
    },
    tagline: {
      fontSize: '20px',
      color: '#a6adc8',
      marginBottom: '40px',
      lineHeight: 1.6,
    },
    heroCta: {
      display: 'flex',
      gap: '16px',
      alignItems: 'center',
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
      textDecoration: 'none',
      display: 'inline-block',
    },
    btnSecondary: {
      background: 'transparent',
      color: '#00ff88',
      padding: '10px 24px',
      border: '1px solid #00ff88',
      borderRadius: '2px',
      fontSize: '13px',
      fontWeight: 600,
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      textTransform: 'uppercase' as const,
      letterSpacing: '1px',
      textDecoration: 'none',
      display: 'inline-block',
    },
    heroVisual: {
      position: 'relative' as const,
      height: '500px',
    },
    visualCard: {
      position: 'absolute' as const,
      background: '#1a1a2e',
      border: '1px solid #333366',
      borderRadius: '4px',
      padding: '20px',
      transition: 'all 0.3s ease',
      cursor: 'pointer',
    },
    cardTag: {
      fontSize: '10px',
      color: '#6c7086',
      textTransform: 'uppercase' as const,
      letterSpacing: '1px',
      marginBottom: '8px',
      fontFamily: 'JetBrains Mono, monospace',
    },
    cardTitle: {
      fontSize: '14px',
      fontWeight: 500,
      color: '#e2e8f0',
      marginBottom: '8px',
    },
    cardDescription: {
      fontSize: '12px',
      color: '#a6adc8',
      lineHeight: 1.5,
    },
    cardStatus: {
      display: 'inline-block',
      padding: '2px 6px',
      background: '#00ff88',
      color: '#0f0f23',
      fontSize: '10px',
      fontWeight: 600,
      borderRadius: '2px',
      marginTop: '8px',
    },
  };

  const handleCardHover = (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.transform = 'translateY(-4px)';
    e.currentTarget.style.borderColor = '#00ff88';
  };

  const handleCardLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.transform = 'translateY(0)';
    e.currentTarget.style.borderColor = '#333366';
  };

  return (
    <>
      <section style={styles.hero}>
        <div style={styles.heroGrid}>
          <div style={styles.heroContent}>
            <h1 style={styles.title}>
              思考が進化する、<br/>
              <span style={styles.highlight}>知的生産空間</span>
            </h1>
            <p style={styles.tagline}>
              対話、整理、収集、分析。<br/>
              あらゆる知的活動が繋がり、進化する。<br/>
              Poconestは、あなたの思考のエコシステムです。
            </p>
            <div style={styles.heroCta}>
              <Link to="/login" style={styles.btnPrimary}>無料で始める</Link>
              <a href="#features" style={styles.btnSecondary}>詳しく見る</a>
            </div>
          </div>
          
          <div style={styles.heroVisual}>
            {/* 背景の大きなRipple Effectロゴ */}
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', opacity: 0.15, zIndex: 0 }}>
              <svg width="400" height="400" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="60" cy="60" r="8" fill="#00ff88"/>
                <circle cx="60" cy="60" r="20" stroke="#00ff88" strokeWidth="2" opacity="0.8"/>
                <circle cx="60" cy="60" r="35" stroke="#00ff88" strokeWidth="1.5" opacity="0.5"/>
                <circle cx="60" cy="60" r="50" stroke="#00ff88" strokeWidth="1" opacity="0.3"/>
                <line x1="60" y1="10" x2="60" y2="25" stroke="#00ff88" strokeWidth="2" strokeLinecap="round"/>
                <line x1="110" y1="60" x2="95" y2="60" stroke="#00ff88" strokeWidth="2" strokeLinecap="round"/>
                <line x1="60" y1="110" x2="60" y2="95" stroke="#00ff88" strokeWidth="2" strokeLinecap="round"/>
                <line x1="10" y1="60" x2="25" y2="60" stroke="#00ff88" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            
            <div
              style={{...styles.visualCard, top: 0, left: 0, width: '240px', zIndex: 1}}
              onMouseEnter={handleCardHover}
              onMouseLeave={handleCardLeave}
            >
              <div style={styles.cardTag}>Meeting → Board</div>
              <div style={styles.cardTitle}>チームブレスト議事録</div>
              <div style={styles.cardDescription}>音声から自動でカード生成され、アイデアが構造化される</div>
              <span style={styles.cardStatus}>Auto-synced</span>
            </div>
            
            <div
              style={{...styles.visualCard, top: '80px', right: '40px', width: '200px', zIndex: 1}}
              onMouseEnter={handleCardHover}
              onMouseLeave={handleCardLeave}
            >
              <div style={styles.cardTag}>Trend Insight</div>
              <div style={styles.cardTitle}>革新性スコア: 8.5</div>
              <div style={styles.cardDescription}>世界のデザイントレンドを自動収集・分析</div>
            </div>
            
            <div
              style={{...styles.visualCard, bottom: '100px', left: '60px', width: '220px', zIndex: 1}}
              onMouseEnter={handleCardHover}
              onMouseLeave={handleCardLeave}
            >
              <div style={styles.cardTag}>Analysis</div>
              <div style={styles.cardTitle}>ユーザーインサイト抽出</div>
              <div style={styles.cardDescription}>質的データから理論を自動生成</div>
            </div>
            
            <div
              style={{...styles.visualCard, bottom: '20px', right: 0, width: '180px', zIndex: 1}}
              onMouseEnter={handleCardHover}
              onMouseLeave={handleCardLeave}
            >
              <div style={styles.cardTag}>Network Map</div>
              <div style={styles.cardTitle}>知識の繋がり</div>
              <div style={styles.cardDescription}>アイデアが自動で関連付けされる</div>
            </div>
          </div>
        </div>
      </section>

      <style>
        {`
          @keyframes heroFadeInUp {
            from {
              transform: translateY(30px);
              opacity: 0;
            }
            to {
              transform: translateY(0);
              opacity: 1;
            }
          }

          @media (max-width: 768px) {
            .hero-section {
              padding-top: 60px !important;
              padding-bottom: 30px !important;
            }
            .hero-section h1 {
              font-size: 28px !important;
              line-height: 1.3 !important;
            }
            .hero-section p {
              font-size: 15px !important;
              margin-bottom: 24px !important;
            }
            .hero-stats {
              gap: 24px !important;
              flex-direction: column !important;
            }
            .hero-stats > div {
              display: flex !important;
              align-items: center !important;
              gap: 8px !important;
            }
            .hero-stats span:first-child {
              font-size: 20px !important;
            }
            .hero-stats span:last-child {
              font-size: 10px !important;
            }
          }

          @media (max-width: 480px) {
            .hero-section h1 {
              font-size: 24px !important;
            }
            .hero-section p {
              font-size: 14px !important;
            }
            .hero-buttons {
              flex-direction: column !important;
              align-items: center !important;
            }
          }
        `}
      </style>
    </>
  );
}; 