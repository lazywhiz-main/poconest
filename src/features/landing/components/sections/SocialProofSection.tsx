import React from 'react';

interface Testimonial {
  testimonial: string;
  author: string;
  company: string;
}

interface SocialProofSectionProps {
  testimonials: Testimonial[];
}

export const SocialProofSection: React.FC<SocialProofSectionProps> = ({ testimonials }) => {
  return (
    <section style={{
      padding: '80px 20px',
      backgroundColor: 'var(--bg-secondary)'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto'
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
          お客様の声
        </h2>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: '32px'
        }}>
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              style={{
                background: 'var(--bg-primary)',
                padding: '32px',
                borderRadius: '16px',
                border: '1px solid var(--border-color)',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {/* 引用符 */}
              <div style={{
                position: 'absolute',
                top: '16px',
                right: '24px',
                fontSize: '48px',
                color: 'var(--primary-green)',
                opacity: 0.3,
                fontFamily: 'Georgia, serif'
              }}>
                "
              </div>
              
              {/* 評価星 */}
              <div style={{
                marginBottom: '20px',
                fontSize: '20px'
              }}>
                ⭐⭐⭐⭐⭐
              </div>
              
              <p style={{
                fontSize: '1.1rem',
                lineHeight: '1.6',
                color: 'var(--text-primary)',
                marginBottom: '24px',
                fontStyle: 'italic'
              }}>
                {testimonial.testimonial}
              </p>
              
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                {/* アバター */}
                <div style={{
                  width: '48px',
                  height: '48px',
                  background: 'linear-gradient(135deg, var(--primary-green), var(--primary-blue))',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--bg-primary)',
                  fontWeight: '600',
                  fontSize: '18px'
                }}>
                  {testimonial.author[0]}
                </div>
                
                <div>
                  <div style={{
                    fontWeight: '600',
                    color: 'var(--text-primary)',
                    marginBottom: '2px'
                  }}>
                    {testimonial.author}
                  </div>
                  <div style={{
                    fontSize: '0.9rem',
                    color: 'var(--text-secondary)'
                  }}>
                    {testimonial.company}
                  </div>
                </div>
              </div>
              
              {/* 装飾的な背景エレメント */}
              <div style={{
                position: 'absolute',
                bottom: '-40px',
                left: '-40px',
                width: '100px',
                height: '100px',
                background: 'radial-gradient(circle, rgba(0, 255, 136, 0.05) 0%, transparent 70%)',
                borderRadius: '50%'
              }} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}; 