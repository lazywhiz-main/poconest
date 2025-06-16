import React from 'react';

interface Feature {
  title: string;
  description: string;
  icon: string;
}

interface FeaturesSectionProps {
  features: Feature[];
}

export const FeaturesSection: React.FC<FeaturesSectionProps> = ({ features }) => {
  return (
    <section id="features" style={{
      padding: '120px 0',
      background: 'var(--background)'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 20px'
      }}>
        <div style={{
          textAlign: 'center',
          marginBottom: '80px'
        }}>
          <h2 style={{
            fontSize: '32px',
            fontWeight: '700',
            marginBottom: '16px',
            color: 'var(--text)',
            fontFamily: 'var(--font-family-text)',
            lineHeight: '1.3',
            letterSpacing: '-0.02em'
          }}>
            あなたのチームを加速する、3つの力
          </h2>
          <p style={{
            fontSize: '16px',
            color: 'var(--text-muted)',
            maxWidth: '600px',
            margin: '0 auto',
            lineHeight: '1.5'
          }}>
            POCONESTの核心機能が、組織の知的生産性を劇的に向上させます
          </p>
        </div>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
          gap: '40px'
        }}>
          {features.map((feature, index) => (
            <div
              key={index}
              style={{
                background: 'var(--surface)',
                padding: '40px 32px',
                borderRadius: '16px',
                border: '1px solid var(--surface-light)',
                textAlign: 'center',
                position: 'relative',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.borderColor = 'var(--primary)';
                e.currentTarget.style.boxShadow = '0 20px 40px rgba(0, 255, 136, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = 'var(--surface-light)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{
                fontSize: '48px',
                marginBottom: '24px',
                height: '64px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {feature.icon}
              </div>
              
              <h3 style={{
                fontSize: '20px',
                fontWeight: '600',
                marginBottom: '12px',
                color: 'var(--text)',
                lineHeight: '1.3'
              }}>
                {feature.title}
              </h3>
              
              <p style={{
                fontSize: '14px',
                color: 'var(--text-muted)',
                lineHeight: '1.5',
                marginBottom: '16px'
              }}>
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      <style>
        {`
          @media (max-width: 768px) {
            section h2 {
              font-size: 36px !important;
            }
            section div[style*="grid-template-columns: repeat(auto-fit, minmax(350px, 1fr))"] {
              grid-template-columns: 1fr !important;
            }
          }
        `}
      </style>
    </section>
  );
}; 