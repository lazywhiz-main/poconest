import React from 'react';
import { LandingButton } from '../common/LandingButton';

interface CTASectionProps {
  content: {
    headline: string;
    subtext: string;
    ctaText: string;
  };
}

export const CTASection: React.FC<CTASectionProps> = ({ content }) => {
  const handleCTAClick = () => {
    // 後でサインアップページに遷移
    console.log('CTA clicked');
  };

  return (
    <section style={{
      padding: '100px 20px',
      backgroundColor: 'var(--bg-secondary)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* 背景装飾 */}
      <div style={{
        position: 'absolute',
        top: '10%',
        left: '10%',
        width: '200px',
        height: '200px',
        background: 'radial-gradient(circle, var(--primary-green)20 0%, transparent 70%)',
        borderRadius: '50%',
        filter: 'blur(80px)'
      }} />
      <div style={{
        position: 'absolute',
        bottom: '10%',
        right: '10%',
        width: '300px',
        height: '300px',
        background: 'radial-gradient(circle, var(--primary-blue)20 0%, transparent 70%)',
        borderRadius: '50%',
        filter: 'blur(100px)'
      }} />
      
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        textAlign: 'center',
        position: 'relative',
        zIndex: 1
      }}>
        <h2 style={{
          fontSize: '2.5rem',
          fontWeight: '700',
          marginBottom: '24px',
          color: 'var(--text-primary)',
          lineHeight: '1.2'
        }}>
          今すぐ始めて、洞察の力を実感してください
        </h2>
        
        <p style={{
          fontSize: '1.25rem',
          lineHeight: '1.6',
          marginBottom: '40px',
          color: 'var(--text-secondary)',
          maxWidth: '600px',
          margin: '0 auto 40px'
        }}>
          14日間の無料トライアルで、Poconestがもたらす変化を体験。
          クレジットカード不要、いつでもキャンセル可能。
        </p>
        
        <div style={{
          display: 'flex',
          gap: '16px',
          justifyContent: 'center',
          flexWrap: 'wrap'
        }}>
          <LandingButton
            title={content.ctaText}
            onPress={handleCTAClick}
            variant="primary"
            size="lg"
          />
          
          <LandingButton
            title="デモを見る"
            onPress={() => console.log('Demo clicked')}
            variant="outline"
            size="lg"
          />
        </div>
        
        {/* 信頼性指標 */}
        <div style={{
          marginTop: '60px',
          display: 'flex',
          justifyContent: 'center',
          gap: '40px',
          flexWrap: 'wrap'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: '2rem',
              fontWeight: '700',
              color: 'var(--primary-green)',
              marginBottom: '8px'
            }}>
              500+
            </div>
            <div style={{
              fontSize: '0.9rem',
              color: 'var(--text-secondary)'
            }}>
              利用チーム
            </div>
          </div>
          
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: '2rem',
              fontWeight: '700',
              color: 'var(--primary-green)',
              marginBottom: '8px'
            }}>
              99.9%
            </div>
            <div style={{
              fontSize: '0.9rem',
              color: 'var(--text-secondary)'
            }}>
              稼働率
            </div>
          </div>
          
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: '2rem',
              fontWeight: '700',
              color: 'var(--primary-green)',
              marginBottom: '8px'
            }}>
              4.8★
            </div>
            <div style={{
              fontSize: '0.9rem',
              color: 'var(--text-secondary)'
            }}>
              満足度
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}; 