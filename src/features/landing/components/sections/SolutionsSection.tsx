import React from 'react';

interface SolutionsSectionProps {
  solutions: string[];
}

export const SolutionsSection: React.FC<SolutionsSectionProps> = ({ solutions }) => {
  return (
    <section style={{
      padding: '80px 20px',
      backgroundColor: 'var(--bg-primary)'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        <h2 style={{
          fontSize: '2.5rem',
          fontWeight: '700',
          textAlign: 'center',
          marginBottom: '60px',
          color: 'var(--text-primary)'
        }}>
          Poconestが解決します
        </h2>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '24px'
        }}>
          {solutions.map((solution, index) => (
            <div
              key={index}
              style={{
                background: 'var(--bg-secondary)',
                padding: '32px',
                borderRadius: '16px',
                border: '1px solid var(--border-color)',
                position: 'relative',
                overflow: 'hidden',
                transition: 'transform 0.3s ease, box-shadow 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 12px 32px rgba(0, 255, 136, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {/* ソリューションアイコン */}
              <div style={{
                width: '48px',
                height: '48px',
                background: 'linear-gradient(135deg, var(--primary-green), var(--primary-blue))',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '20px',
                fontSize: '24px'
              }}>
                ✨
              </div>
              
              <p style={{
                fontSize: '1.1rem',
                lineHeight: '1.6',
                color: 'var(--text-primary)',
                margin: 0
              }}>
                {solution}
              </p>
              
              {/* 装飾的な背景エレメント */}
              <div style={{
                position: 'absolute',
                top: '-20px',
                right: '-20px',
                width: '80px',
                height: '80px',
                background: 'radial-gradient(circle, rgba(0, 255, 136, 0.1) 0%, transparent 70%)',
                borderRadius: '50%'
              }} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}; 