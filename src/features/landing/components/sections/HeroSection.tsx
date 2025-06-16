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
  return (
    <>
      <section style={{ 
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden',
        background: 'linear-gradient(135deg, var(--background) 0%, #1a1a3a 50%, var(--background) 100%)',
        paddingTop: '80px',
        paddingBottom: '40px'
      }}>
        {/* Background decoration */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `
            radial-gradient(circle at 20% 80%, rgba(0, 255, 136, 0.15) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(99, 102, 241, 0.1) 0%, transparent 50%)
          `
        }} />

        <div style={{ 
          maxWidth: '720px',
          margin: '0 auto',
          padding: '0 20px',
          textAlign: 'center',
          position: 'relative',
          zIndex: 2
        }}>
          <div style={{ 
            background: 'rgba(0, 255, 136, 0.12)',
            border: '1px solid rgba(0, 255, 136, 0.3)',
            color: 'var(--primary)',
            padding: '8px 16px',
            borderRadius: '50px',
            fontSize: '12px',
            fontWeight: '600',
            display: 'inline-block',
            marginBottom: '24px',
            animation: 'heroFadeInUp 0.6s ease-out',
            letterSpacing: '0.02em'
          }}>
            🚀 1,200+チームが生産性を31%向上
          </div>

          <div style={{ animation: 'heroFadeInUp 0.8s ease-out 0.2s both' }}>
            <h1 style={{
              fontSize: '32px',
              fontWeight: '700',
              lineHeight: '1.2',
              marginBottom: '16px',
              background: `linear-gradient(135deg, var(--text) 0%, var(--primary) 100%)`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              fontFamily: 'var(--font-family-text)',
              letterSpacing: '-0.02em'
            }}>
              散らばった情報から、<br />戦略的洞察を
            </h1>
          </div>

          <p style={{
            fontSize: '16px',
            color: 'var(--text-muted)',
            marginBottom: '32px',
            lineHeight: '1.5',
            maxWidth: '540px',
            marginLeft: 'auto',
            marginRight: 'auto',
            animation: 'heroFadeInUp 1s ease-out 0.4s both',
            letterSpacing: '0.01em'
          }}>
            AIが24時間365日、チームの会話や資料を分析。<br />
            見落としていた重要な関係性を発見し、次の一手を提案します。
          </p>

          <div style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'center',
            marginBottom: '48px',
            animation: 'heroFadeInUp 1.2s ease-out 0.6s both',
            flexWrap: 'wrap'
          }}>
            <LandingButton 
              title="14日間無料で体験する"
              variant="primary"
              size="md"
              as={Link}
              to="/signup"
              style={{
                padding: '12px 24px',
                fontSize: '14px',
                minWidth: '160px'
              }}
            />
            <LandingButton 
              title="実際のデモを見る"
              variant="secondary" 
              size="md"
              as="a"
              href="#demo"
              style={{
                padding: '12px 24px',
                fontSize: '14px',
                minWidth: '140px'
              }}
            />
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '32px',
            animation: 'heroFadeInUp 1.4s ease-out 0.8s both',
            flexWrap: 'wrap'
          }}>
            <div style={{ textAlign: 'center' }}>
              <span style={{
                fontSize: '24px',
                fontWeight: '700',
                color: 'var(--primary)',
                fontFamily: 'var(--font-family-mono)',
                display: 'block',
                marginBottom: '4px',
                lineHeight: '1'
              }}>90%</span>
              <span style={{
                fontSize: '11px',
                color: 'var(--text-faded)',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                lineHeight: '1.2'
              }}>分析時間削減</span>
            </div>
            <div style={{ textAlign: 'center' }}>
              <span style={{
                fontSize: '24px',
                fontWeight: '700',
                color: 'var(--primary)',
                fontFamily: 'var(--font-family-mono)',
                display: 'block',
                marginBottom: '4px',
                lineHeight: '1'
              }}>3倍</span>
              <span style={{
                fontSize: '11px',
                color: 'var(--text-faded)',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                lineHeight: '1.2'
              }}>洞察発見速度</span>
            </div>
            <div style={{ textAlign: 'center' }}>
              <span style={{
                fontSize: '24px',
                fontWeight: '700',
                color: 'var(--primary)',
                fontFamily: 'var(--font-family-mono)',
                display: 'block',
                marginBottom: '4px',
                lineHeight: '1'
              }}>24h</span>
              <span style={{
                fontSize: '11px',
                color: 'var(--text-faded)',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                lineHeight: '1.2'
              }}>自動監視</span>
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