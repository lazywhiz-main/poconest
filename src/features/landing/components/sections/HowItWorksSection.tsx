import React from 'react';
import { TargetType } from '../../config/targetingConfig';

interface HowItWorksSectionProps {
  targetType: TargetType;
}

export const HowItWorksSection: React.FC<HowItWorksSectionProps> = ({ targetType }) => {
  const steps = [
    {
      number: '1',
      title: 'データソース接続',
      description: 'Slack、メール、会議ツールなど、既存のデータソースを簡単接続。セキュアな環境で自動的にデータを収集開始。'
    },
    {
      number: '2',
      title: 'AI自動分析',
      description: '最先端のAIが24時間365日、あなたのデータを分析。重要な概念抽出から関係性発見まで、全て自動実行。'
    },
    {
      number: '3',
      title: '洞察活用',
      description: '生成された洞察をダッシュボードで確認。チーム共有から戦略立案まで、実践的に活用。'
    }
  ];

  return (
    <section id="how-it-works" style={{
      padding: '120px 0',
      background: 'var(--surface)'
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
            3ステップで始まる、知的生産性の革命
          </h2>
          <p style={{
            fontSize: '16px',
            color: 'var(--text-muted)',
            maxWidth: '600px',
            margin: '0 auto',
            lineHeight: '1.5'
          }}>
            簡単セットアップで、すぐに価値を実感できます
          </p>
        </div>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '60px',
          position: 'relative',
          maxWidth: '900px',
          margin: '0 auto'
        }}>
          {/* Connection lines between steps */}
          <div style={{
            position: 'absolute',
            top: '40px',
            left: 'calc(33.33% - 40px)',
            width: '80px',
            height: '2px',
            background: 'linear-gradient(90deg, var(--primary), rgba(0, 255, 136, 0.3))',
            zIndex: 0
          }} />
          <div style={{
            position: 'absolute',
            top: '40px',
            left: 'calc(66.66% - 40px)',
            width: '80px',
            height: '2px',
            background: 'linear-gradient(90deg, rgba(0, 255, 136, 0.3), var(--primary))',
            zIndex: 0
          }} />
          
          {steps.map((step, index) => (
            <div
              key={index}
              style={{
                textAlign: 'center',
                position: 'relative',
                zIndex: 1
              }}
            >
              <div style={{
                width: '80px',
                height: '80px',
                background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 32px',
                fontSize: '32px',
                fontWeight: '700',
                color: 'var(--background)',
                boxShadow: '0 8px 24px rgba(0, 255, 136, 0.3)'
              }}>
                {step.number}
              </div>
              
              <h3 style={{
                fontSize: '20px',
                fontWeight: '600',
                marginBottom: '12px',
                color: 'var(--text)',
                lineHeight: '1.3'
              }}>
                {step.title}
              </h3>
              
              <p style={{
                fontSize: '14px',
                color: 'var(--text-muted)',
                lineHeight: '1.5'
              }}>
                {step.description}
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
            section div[style*="grid-template-columns: repeat(3, 1fr)"] {
              grid-template-columns: 1fr !important;
              gap: 40px !important;
            }
            section div[style*="position: absolute"][style*="top: 40px"] {
              display: none !important;
            }
          }
        `}
      </style>
    </section>
  );
}; 