import React from 'react';
import { LandingButton } from '../common/LandingButton';

interface PricingSectionProps {
  pricing: {
    emphasis: string;
    ctaText: string;
  };
}

export const PricingSection: React.FC<PricingSectionProps> = ({ pricing }) => {
  const plans = [
    {
      name: 'Starter',
      price: '¥9,800',
      period: '/ month',
      features: [
        '5ユーザーまで',
        '基本的なAI分析',
        '3つのデータソース接続',
        'メール & チャットサポート',
        '月間1,000件の分析'
      ],
      highlighted: false
    },
    {
      name: 'Professional',
      price: '¥29,800',
      period: '/ month',
      features: [
        '25ユーザーまで',
        '高度なAI分析 & 洞察生成',
        '無制限データソース接続',
        '専用サポート & オンボーディング',
        '月間10,000件の分析',
        'カスタムダッシュボード',
        'API連携'
      ],
      highlighted: true
    },
    {
      name: 'Enterprise',
      price: '要相談',
      period: '/ month',
      features: [
        '無制限ユーザー',
        'カスタムAIモデル',
        '専用環境 & セキュリティ',
        '24/7専任サポート',
        '無制限分析',
        '高度なセキュリティ機能',
        'SLA保証'
      ],
      highlighted: false
    }
  ];

  return (
    <section id="pricing" style={{
      padding: '60px 0',
      background: 'var(--background)'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 20px'
      }}>
        <div style={{ 
          textAlign: 'center', 
          marginBottom: '40px'
        }}>
          <h2 style={{
            fontSize: '28px',
            fontWeight: '700',
            marginBottom: '12px',
            color: 'var(--text)',
            fontFamily: 'var(--font-family-text)',
            lineHeight: '1.3',
            letterSpacing: '-0.02em'
          }}>
            シンプルで透明な料金体系
          </h2>
          <p style={{
            fontSize: '15px',
            color: 'var(--text-muted)',
            maxWidth: '480px',
            margin: '0 auto',
            lineHeight: '1.5',
            letterSpacing: '0.01em'
          }}>
            チームサイズに合わせて選択。14日間の無料トライアルでリスクゼロでお試し
          </p>
        </div>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '20px',
          alignItems: 'stretch'
        }}>
          {plans.map((plan, index) => (
            <div
              key={index}
              style={{
                background: 'var(--surface)',
                padding: '24px 20px',
                borderRadius: '8px',
                border: plan.highlighted 
                  ? '2px solid var(--primary)' 
                  : '1px solid var(--surface-light)',
                position: 'relative',
                textAlign: 'center',
                transform: plan.highlighted ? 'scale(1.02)' : 'scale(1)',
                boxShadow: plan.highlighted 
                  ? '0 12px 24px rgba(0, 255, 136, 0.15)' 
                  : '0 4px 12px rgba(0, 0, 0, 0.1)',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                if (!plan.highlighted) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.borderColor = 'var(--primary)';
                  e.currentTarget.style.boxShadow = '0 8px 16px rgba(0, 255, 136, 0.12)';
                }
              }}
              onMouseLeave={(e) => {
                if (!plan.highlighted) {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = 'var(--surface-light)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                }
              }}
            >
              {plan.highlighted && (
                <div style={{
                  position: 'absolute',
                  top: '-10px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'var(--primary)',
                  color: 'var(--background)',
                  padding: '4px 12px',
                  borderRadius: '16px',
                  fontSize: '11px',
                  fontWeight: '600',
                  letterSpacing: '0.02em'
                }}>
                  おすすめ
                </div>
              )}
              
              <h3 style={{
                fontSize: '18px',
                fontWeight: '700',
                marginBottom: '6px',
                color: 'var(--text)',
                fontFamily: 'var(--font-family-text)',
                lineHeight: '1.2'
              }}>
                {plan.name}
              </h3>
              
              <div style={{
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'center',
                gap: '4px'
              }}>
                <span style={{
                  fontSize: '28px',
                  fontWeight: '700',
                  color: plan.highlighted ? 'var(--primary)' : 'var(--text)',
                  fontFamily: 'var(--font-family-mono)',
                  lineHeight: '1'
                }}>
                  {plan.price}
                </span>
                <span style={{
                  fontSize: '13px',
                  color: 'var(--text-muted)',
                  lineHeight: '1.4'
                }}>
                  {plan.period}
                </span>
              </div>
              
              <ul style={{
                listStyle: 'none',
                padding: 0,
                margin: '0 0 20px 0',
                textAlign: 'left'
              }}>
                {plan.features.map((feature, featureIndex) => (
                  <li
                    key={featureIndex}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '8px',
                      marginBottom: '6px',
                      fontSize: '13px',
                      color: 'var(--text-muted)',
                      lineHeight: '1.4'
                    }}
                  >
                    <span style={{
                      color: 'var(--primary)',
                      fontWeight: '600',
                      fontSize: '12px',
                      marginTop: '1px',
                      minWidth: '12px'
                    }}>
                      ✓
                    </span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              
              <LandingButton
                title={plan.highlighted ? '無料で始める' : 'プランを選ぶ'}
                variant={plan.highlighted ? 'primary' : 'secondary'}
                size="sm"
                as="a"
                href="/signup"
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  fontSize: '13px',
                  fontWeight: '600'
                }}
              />
            </div>
          ))}
        </div>

        <div style={{
          textAlign: 'center',
          marginTop: '32px',
          padding: '20px',
          background: 'var(--surface)',
          borderRadius: '8px',
          border: '1px solid var(--border-primary)'
        }}>
          <p style={{
            fontSize: '13px',
            color: 'var(--text-muted)',
            margin: '0 0 12px 0',
            lineHeight: '1.4'
          }}>
            💡 すべてのプランに14日間の無料トライアル付き。クレジットカード不要でお試しいただけます。
          </p>
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '16px',
            flexWrap: 'wrap'
          }}>
            <LandingButton
              title="デモを予約"
              variant="secondary"
              size="sm"
              as="a"
              href="#demo"
              style={{
                padding: '8px 16px',
                fontSize: '12px',
                minWidth: '100px'
              }}
            />
            <LandingButton
              title="お問い合わせ"
              variant="secondary"
              size="sm"
              as="a"
              href="/contact"
              style={{
                padding: '8px 16px',
                fontSize: '12px',
                minWidth: '100px'
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}; 