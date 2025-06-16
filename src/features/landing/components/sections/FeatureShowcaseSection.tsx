import React from 'react';
import { LandingButton } from '../common/LandingButton';

interface FeatureShowcaseSectionProps {}

export const FeatureShowcaseSection: React.FC<FeatureShowcaseSectionProps> = () => {
  const features = [
    {
      id: 'discovery',
      title: '深層発見',
      subtitle: 'Surface the Hidden Wisdom',
      description: '膨大な情報の中から、見えない知識の糸を発見。AIが人間の認知限界を超えて、新たな理解の地平を開きます。',
      benefits: [
        '潜在知識の発見',
        '認知バイアスの排除',
        '多角的思考支援',
        '直感的洞察'
      ],
      mockupContent: (
        <div style={{
          background: 'var(--surface)',
          borderRadius: '16px',
          padding: '24px',
          height: '420px',
          position: 'relative',
          overflow: 'hidden',
          border: '1px solid rgba(0, 255, 136, 0.1)'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
            borderBottom: '1px solid var(--surface-light)',
            paddingBottom: '12px'
          }}>
            <h4 style={{ 
              color: 'var(--text)', 
              fontSize: '18px', 
              margin: 0,
              fontWeight: '600'
            }}>
              💡 発見された知識
            </h4>
            <div style={{
              background: 'rgba(0, 255, 136, 0.15)',
              color: 'var(--primary)',
              padding: '6px 16px',
              borderRadius: '24px',
              fontSize: '12px',
              fontWeight: '600',
              border: '1px solid rgba(0, 255, 136, 0.3)'
            }}>
              深層分析完了
            </div>
          </div>

          {/* Discovery Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[
              {
                title: '創造性の源流',
                insight: '最も革新的なアイデアは、異分野の知識が偶然交差する瞬間に生まれている',
                confidence: '95%',
                type: 'パターン発見',
                icon: '🌟'
              },
              {
                title: '意思決定の盲点',
                insight: 'チームの最適解は、個々の専門性を融合させた時に現れる未知の領域にある',
                confidence: '91%',
                type: '認知洞察',
                icon: '🔍'
              },
              {
                title: '知識の進化',
                insight: '表面的な問題解決ではなく、根本的な思考フレームワークの転換が必要',
                confidence: '88%',
                type: '構造分析',
                icon: '🧠'
              }
            ].map((discovery, index) => (
              <div
                key={index}
                style={{
                  background: 'var(--background)',
                  border: '1px solid var(--surface-light)',
                  borderRadius: '10px',
                  padding: '12px',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.border = '1px solid rgba(0, 255, 136, 0.4)';
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 255, 136, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.border = '1px solid var(--surface-light)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '8px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '16px' }}>{discovery.icon}</span>
                    <h5 style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: 'var(--text)',
                      margin: 0
                    }}>
                      {discovery.title}
                    </h5>
                  </div>
                  <div style={{
                    background: 'rgba(0, 255, 136, 0.1)',
                    color: 'var(--primary)',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '10px',
                    fontWeight: '600'
                  }}>
                    {discovery.confidence}
                  </div>
                </div>
                <p style={{
                  fontSize: '13px',
                  lineHeight: '1.5',
                  color: 'var(--text-muted)',
                  margin: '0 0 8px 0'
                }}>
                  {discovery.insight}
                </p>
                <div style={{
                  fontSize: '11px',
                  color: 'var(--primary)',
                  fontWeight: '500'
                }}>
                  {discovery.type}
                </div>
              </div>
            ))}
          </div>
        </div>
      )
    },
    {
      id: 'synthesis',
      title: '知識統合',
      subtitle: 'Connect the Dots of Understanding',
      description: '分散した知識の断片を織り上げ、新たな理解の織物を創造。複雑性の中から本質的な関係性を浮かび上がらせます。',
      benefits: [
        '概念間の融合',
        'システム的思考',
        '創発的洞察',
        '統合的理解'
      ],
      mockupContent: (
        <div style={{
          background: 'var(--surface)',
          borderRadius: '16px',
          padding: '24px',
          height: '420px',
          position: 'relative',
          border: '1px solid rgba(0, 255, 136, 0.1)'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px'
          }}>
            <h4 style={{ 
              color: 'var(--text)', 
              fontSize: '18px', 
              margin: 0,
              fontWeight: '600'
            }}>
              🕸️ 知識の織物
            </h4>
            <div style={{
              background: 'var(--primary)',
              color: 'var(--background)',
              padding: '6px 16px',
              borderRadius: '24px',
              fontSize: '12px',
              fontWeight: '600'
            }}>
              統合分析
            </div>
          </div>

          {/* Knowledge Web Visualization */}
          <div style={{
            position: 'relative',
            height: '320px',
            background: 'var(--background)',
            borderRadius: '12px',
            border: '1px solid var(--surface-light)',
            overflow: 'hidden'
          }}>
            {/* Central Concept */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '80px',
              height: '80px',
              background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '24px'
            }}>
              🌟
            </div>

            {/* Connected Concepts */}
            {[
              { x: 20, y: 20, icon: '🧠', label: '認知科学', connection: 'strong' },
              { x: 80, y: 30, icon: '📊', label: 'データ哲学', connection: 'medium' },
              { x: 15, y: 80, icon: '🎨', label: '創造理論', connection: 'strong' },
              { x: 85, y: 85, icon: '🔮', label: '未来洞察', connection: 'medium' },
              { x: 60, y: 10, icon: '🌊', label: '複雑系理論', connection: 'strong' },
              { x: 10, y: 50, icon: '💎', label: '本質抽出', connection: 'medium' }
            ].map((concept, index) => (
              <div key={index}>
                {/* Connection Line */}
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  width: `${Math.sqrt(Math.pow(concept.x - 50, 2) + Math.pow(concept.y - 50, 2))}%`,
                  height: '1px',
                  background: concept.connection === 'strong' 
                    ? 'rgba(0, 255, 136, 0.6)' 
                    : 'rgba(0, 255, 136, 0.3)',
                  transformOrigin: '0 50%',
                  transform: `rotate(${Math.atan2(concept.y - 50, concept.x - 50) * 180 / Math.PI}deg)`,
                  zIndex: 1
                }} />
                
                {/* Concept Node */}
                <div style={{
                  position: 'absolute',
                  top: `${concept.y}%`,
                  left: `${concept.x}%`,
                  transform: 'translate(-50%, -50%)',
                  width: '40px',
                  height: '40px',
                  background: 'var(--surface)',
                  border: '2px solid var(--primary)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '16px',
                  zIndex: 2,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}>
                  {concept.icon}
                </div>

                {/* Label */}
                <div style={{
                  position: 'absolute',
                  top: `${concept.y + 8}%`,
                  left: `${concept.x}%`,
                  transform: 'translateX(-50%)',
                  fontSize: '10px',
                  color: 'var(--text-muted)',
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                  zIndex: 3
                }}>
                  {concept.label}
                </div>
              </div>
            ))}

            {/* Synthesis Insight */}
            <div style={{
              position: 'absolute',
              bottom: '16px',
              left: '16px',
              right: '16px',
              background: 'rgba(0, 255, 136, 0.05)',
              border: '1px solid rgba(0, 255, 136, 0.2)',
              borderRadius: '8px',
              padding: '12px',
              fontSize: '11px',
              color: 'var(--text-muted)'
            }}>
              💡 <strong style={{ color: 'var(--primary)' }}>統合洞察:</strong> 
              認知科学と創造理論の交点に、革新的なアイデア生成メカニズムが発見されました
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'revelation',
      title: '洞察生成',
      subtitle: 'Unlock New Dimensions of Understanding',
      description: '知識の深層から新たな真実を浮上させ、未来への道筋を照らす洞察を生成。人間の想像を超えた視点を提供します。',
      benefits: [
        '未知の視点獲得',
        '戦略的洞察',
        '創造的解決策',
        '次元を超えた理解'
      ],
      mockupContent: (
        <div style={{
          background: 'var(--surface)',
          borderRadius: '16px',
          padding: '24px',
          height: '560px',
          position: 'relative',
          border: '1px solid rgba(0, 255, 136, 0.1)',
          overflow: 'auto'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px'
          }}>
            <h4 style={{ 
              color: 'var(--text)', 
              fontSize: '18px', 
              margin: 0,
              fontWeight: '600'
            }}>
              ✨ 生成された洞察
            </h4>
            <div style={{
              background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
              color: 'white',
              padding: '6px 16px',
              borderRadius: '24px',
              fontSize: '12px',
              fontWeight: '600'
            }}>
              深層洞察
            </div>
          </div>

          {/* Insight Cards in the style of actual card UI */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[
              {
                category: '哲学的洞察',
                title: '知識の本質的変容',
                content: '情報から知識への変換は、単なるデータ処理ではなく、意味の創造と価値の発見である。真の洞察は、既知の境界を超えた時に生まれる。',
                depth: '深層',
                resonance: '97%',
                tags: ['存在論', '認識論', '創造性'],
                icon: '🔮'
              },
              {
                category: '創造的示唆',
                title: '革新の源泉',
                content: '最も革新的なソリューションは、制約の中で生まれる。限界こそが創造性の触媒となり、新たな可能性の扉を開く。',
                depth: '中層',
                resonance: '94%',
                tags: ['イノベーション', '制約理論', '可能性'],
                icon: '💡'
              },
              {
                category: '戦略的展望',
                title: '未来の設計図',
                content: '持続可能な成長は、現在の最適化ではなく、未来の可能性に対する投資から生まれる。今日の種が明日の森となる。',
                depth: '表層',
                resonance: '91%',
                tags: ['戦略', '持続性', '投資'],
                icon: '🌱'
              }
            ].map((insight, index) => (
              <div
                key={index}
                style={{
                  background: 'var(--background)',
                  border: '1px solid var(--surface-light)',
                  borderRadius: '10px',
                  padding: '12px',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.border = '1px solid rgba(0, 255, 136, 0.4)';
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 255, 136, 0.1)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.border = '1px solid var(--surface-light)';
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '8px'
                }}>
                  <div style={{
                    background: 'rgba(0, 255, 136, 0.1)',
                    color: 'var(--primary)',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    fontSize: '10px',
                    fontWeight: '600'
                  }}>
                    {insight.category}
                  </div>
                  <div style={{
                    background: `${insight.depth === '深層' ? 'rgba(255, 100, 100, 0.1)' : 
                                  insight.depth === '中層' ? 'rgba(255, 200, 100, 0.1)' : 
                                  'rgba(100, 200, 255, 0.1)'}`,
                    color: `${insight.depth === '深層' ? '#ff6464' : 
                            insight.depth === '中層' ? '#ffc864' : 
                            '#64c8ff'}`,
                    padding: '2px 6px',
                    borderRadius: '8px',
                    fontSize: '9px',
                    fontWeight: '600'
                  }}>
                    {insight.depth}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '18px' }}>{insight.icon}</span>
                  <h5 style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: 'var(--text)',
                    margin: 0
                  }}>
                    {insight.title}
                  </h5>
                </div>

                <p style={{
                  fontSize: '12px',
                  lineHeight: '1.5',
                  color: 'var(--text-muted)',
                  margin: '0 0 12px 0'
                }}>
                  {insight.content}
                </p>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {insight.tags.map((tag, tagIndex) => (
                      <span
                        key={tagIndex}
                        style={{
                          background: 'rgba(0, 255, 136, 0.05)',
                          color: 'var(--primary)',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '9px',
                          fontWeight: '500'
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div style={{
                    fontSize: '10px',
                    color: 'var(--text-muted)'
                  }}>
                    共鳴度: <span style={{ color: 'var(--primary)' }}>{insight.resonance}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )
    }
  ];

  return (
    <section style={{
      padding: '80px 0',
      background: 'var(--background)',
      position: 'relative'
    }}>
      {/* Background Pattern */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'radial-gradient(circle at 30% 80%, rgba(0, 255, 136, 0.03) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(0, 255, 136, 0.03) 0%, transparent 50%)',
        pointerEvents: 'none'
      }} />

      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 20px',
        position: 'relative'
      }}>
        <div style={{
          textAlign: 'center',
          marginBottom: '60px'
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
            AIが発見する、隠れた洞察
          </h2>
          <p style={{
            fontSize: '16px',
            color: 'var(--text-muted)',
            maxWidth: '600px',
            margin: '0 auto',
            lineHeight: '1.5'
          }}>
            AIが解き明かす、人間の認知を超えた洞察の世界
          </p>
        </div>

        {/* Feature Sections - スクロール形式 */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '80px'
        }}>
          {features.map((feature, index) => (
            <div
              key={feature.id}
              style={{
                display: 'grid',
                gridTemplateColumns: index % 2 === 0 ? '1fr 1fr' : '1fr 1fr',
                gap: '60px',
                alignItems: 'center',
                opacity: 0,
                transform: 'translateY(40px)',
                animation: `fadeInUp 0.8s ease-out ${index * 0.2}s forwards`
              }}
            >
              {/* Feature Info */}
              <div style={{ order: index % 2 === 0 ? 1 : 2 }}>
                <div style={{
                  background: 'rgba(0, 255, 136, 0.1)',
                  color: 'var(--primary)',
                  padding: '8px 16px',
                  borderRadius: '20px',
                  fontSize: '14px',
                  fontWeight: '600',
                  display: 'inline-block',
                  marginBottom: '16px'
                }}>
                  {feature.subtitle}
                </div>
                
                <h3 style={{
                  fontSize: '36px',
                  fontWeight: '700',
                  marginBottom: '20px',
                  color: 'var(--text)',
                  fontFamily: 'var(--font-family-text)'
                }}>
                  {feature.title}
                </h3>
                
                <p style={{
                  fontSize: '18px',
                  lineHeight: '1.6',
                  color: 'var(--text-muted)',
                  marginBottom: '32px'
                }}>
                  {feature.description}
                </p>
                
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '16px',
                  marginBottom: '32px'
                }}>
                  {feature.benefits.map((benefit, benefitIndex) => (
                    <div
                      key={benefitIndex}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px',
                        background: 'var(--surface)',
                        borderRadius: '8px',
                        border: '1px solid var(--surface-light)'
                      }}
                    >
                      <div style={{
                        width: '6px',
                        height: '6px',
                        background: 'var(--primary)',
                        borderRadius: '50%'
                      }} />
                      <span style={{
                        fontSize: '14px',
                        color: 'var(--text)',
                        fontWeight: '500'
                      }}>
                        {benefit}
                      </span>
                    </div>
                  ))}
                </div>

                <LandingButton
                  title="体験してみる"
                  variant="primary"
                  size="lg"
                  as="a"
                  href="#"
                />
              </div>

              {/* Feature Demo */}
              <div style={{ order: index % 2 === 0 ? 2 : 1 }}>
                {feature.mockupContent}
              </div>
            </div>
          ))}
        </div>

        {/* Final CTA */}
        <div style={{
          textAlign: 'center',
          marginTop: '120px',
          padding: '60px 40px',
          background: 'linear-gradient(135deg, rgba(0, 255, 136, 0.05) 0%, rgba(0, 255, 136, 0.02) 100%)',
          borderRadius: '20px',
          border: '1px solid rgba(0, 255, 136, 0.1)'
        }}>
          <h3 style={{
            fontSize: '32px',
            fontWeight: '700',
            marginBottom: '16px',
            color: 'var(--text)',
            fontFamily: 'var(--font-family-text)'
          }}>
            洞察の旅を始めませんか？
          </h3>
          <p style={{
            fontSize: '18px',
            color: 'var(--text-muted)',
            marginBottom: '32px',
            maxWidth: '600px',
            margin: '0 auto 32px'
          }}>
            あなたの知識から、未知の価値を発見する冒険が待っています
          </p>
          <LandingButton
            title="無料で始める"
            variant="primary"
            size="lg"
            as="a"
            href="#"
          />
        </div>
      </div>

      <style>
        {`
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(40px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
          
          @media (max-width: 968px) {
            section div[style*="grid-template-columns"] {
              grid-template-columns: 1fr !important;
              gap: 40px !important;
            }
            section div[style*="order"] {
              order: unset !important;
            }
            section h2 {
              font-size: 36px !important;
            }
            section h3 {
              font-size: 28px !important;
            }
            section div[style*="gap: 80px"] {
              gap: 60px !important;
            }
          }
          
          @media (max-width: 768px) {
            /* セクション全体の余白縮小 */
            section {
              padding: 60px 0 !important;
            }
            /* 外側カードの余白を縮小 */
            section div[style*="padding: '24px'"] {
              padding: 16px !important;
              height: auto !important;
            }
            /* 内側カードの余白を縮小 */
            section div[style*="padding: '12px'"] {
              padding: 8px !important;
            }
            /* マージンとギャップを調整 */
            section div[style*="marginBottom: '20px'"] {
              margin-bottom: 12px !important;
            }
            section div[style*="gap: '16px'"] {
              gap: 8px !important;
            }
            section div[style*="gap: 80px"] {
              gap: 40px !important;
            }
            section div[style*="marginBottom: '60px'"] {
              margin-bottom: 40px !important;
            }
          }
          
          @media (max-width: 480px) {
            /* 極小画面での更なる余白削減 */
            section {
              padding: 40px 0 !important;
            }
            section div[style*="padding: '24px'"] {
              padding: 10px !important;
            }
            section div[style*="padding: '12px'"] {
              padding: 6px !important;
            }
            section div[style*="gap: '16px'"] {
              gap: 6px !important;
            }
            section div[style*="gap: 80px"] {
              gap: 30px !important;
            }
            section div[style*="marginBottom: '60px'"] {
              margin-bottom: 30px !important;
            }
          }
        `}
      </style>
    </section>
  );
}; 