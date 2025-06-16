import React, { useState } from 'react';
import { TargetType } from '../../config/targetingConfig';
import { LandingButton } from '../common/LandingButton';

interface ProblemsSectionProps {
  content: {
    problems: Array<{
      icon: string;
      title: string;
      description: string;
    }>;
  };
  targetType: TargetType;
}

type DemoTab = 'slack' | 'meeting' | 'feedback';

export const ProblemsSection: React.FC<ProblemsSectionProps> = ({ content, targetType }) => {
  const [activeTab, setActiveTab] = useState<DemoTab>('slack');

  const demoContent = {
    slack: [
      {
        tag: '関係性発見',
        confidence: 87,
        text: '「ユーザビリティ改善」の議論と「売上向上」の相関を検出 → 改善優先度を上位に推奨'
      },
      {
        tag: 'パターン認識',
        confidence: 92,
        text: '過去3回の会議で「リソース不足」が言及 → プロジェクト遅延リスクを事前警告'
      },
      {
        tag: '提案生成',
        confidence: 78,
        text: 'チーム間の情報共有頻度から、週次同期会議の新設を提案'
      }
    ],
    meeting: [
      {
        tag: '議題分析',
        confidence: 94,
        text: '「予算承認」が3週連続で未解決 → 意思決定プロセスのボトルネック特定'
      },
      {
        tag: '感情分析',
        confidence: 89,
        text: 'チームの士気低下を検出 → 1on1ミーティングの実施を推奨'
      },
      {
        tag: '行動項目',
        confidence: 96,
        text: '未完了タスクの担当者パターンから、負荷分散の必要性を示唆'
      }
    ],
    feedback: [
      {
        tag: '顧客ニーズ',
        confidence: 91,
        text: '「使いやすさ」と「機能充実」の要望が拮抗 → UI/UX優先開発を提案'
      },
      {
        tag: '満足度予測',
        confidence: 85,
        text: 'レスポンス速度改善により、顧客満足度15%向上の見込み'
      },
      {
        tag: '競合分析',
        confidence: 88,
        text: '他社乗り換え理由から、価格戦略の見直しポイントを特定'
      }
    ]
  };

  const problems = [
    {
      icon: '⏰',
      title: '分析に週2日を消費',
      description: 'Slackログ、会議録、ドキュメントを手動で読み返し、パターンを探す作業に膨大な時間'
    },
    {
      icon: '👁',
      title: '重要な関係性を見落とし',
      description: '人間の認知限界により、データ間の隠れた相関や因果関係を発見できない'
    },
    {
      icon: '📚',
      title: '過去の知見が埋もれる',
      description: '組織に蓄積された貴重な洞察が検索不可能な状態で散らばり、再利用されない'
    }
  ];

  const solutions = [
    {
      icon: '⚡',
      title: '3秒で自動分析完了',
      description: 'AIが瞬時に全データを解析し、重要なパターンや洞察を自動抽出。人的工数を90%削減'
    },
    {
      icon: '🔍',
      title: '隠れた関係性を発見',
      description: '高度なAI分析により、人間では気づけない複雑な相関関係や因果パターンを特定'
    },
    {
      icon: '🧠',
      title: '組織知を活用可能に',
      description: '全ての洞察を構造化し、検索・活用可能な状態で蓄積。組織の集合知を最大化'
    }
  ];

  return (
    <>
      {/* Interactive Demo Section */}
      <section id="demo" style={{
        padding: '60px 0 70px 0',
        background: 'var(--surface)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1.2fr',
            gap: '48px',
            alignItems: 'center'
          }}>
            <div style={{ paddingLeft: '0px' }}>
              <h2 style={{
                fontSize: '28px',
                fontWeight: '700',
                marginBottom: '16px',
                color: 'var(--text)',
                fontFamily: 'var(--font-family-text)',
                lineHeight: '1.3',
                letterSpacing: '-0.02em'
              }}>
                AIが見つける、<br />人間が見落とす洞察
              </h2>
              
              <p style={{
                fontSize: '15px',
                color: 'var(--text-muted)',
                marginBottom: '24px',
                lineHeight: '1.5',
                letterSpacing: '0.01em'
              }}>
                実際のSlackメッセージから、わずか数秒で重要なパターンを発見。<br />
                右のデモで、POCONESTの分析力を体験してください。
              </p>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
                marginBottom: '24px'
              }}>
                <div style={{
                  padding: '12px 12px',
                  background: 'rgba(0, 255, 136, 0.08)',
                  borderRadius: '6px',
                  borderLeft: '2px solid var(--primary)',
                  transition: 'all 0.3s ease'
                }}>
                  <div style={{
                    fontSize: '18px',
                    fontWeight: '700',
                    color: 'var(--primary)',
                    fontFamily: 'var(--font-family-mono)',
                    marginBottom: '2px',
                    lineHeight: '1'
                  }}>73%</div>
                  <div style={{
                    fontSize: '11px',
                    color: 'var(--text-muted)',
                    lineHeight: '1.3'
                  }}>ユーザーが見落とす関係性</div>
                </div>
                
                <div style={{
                  padding: '12px 12px',
                  background: 'rgba(0, 255, 136, 0.08)',
                  borderRadius: '6px',
                  borderLeft: '2px solid var(--primary)',
                  transition: 'all 0.3s ease'
                }}>
                  <div style={{
                    fontSize: '18px',
                    fontWeight: '700',
                    color: 'var(--primary)',
                    fontFamily: 'var(--font-family-mono)',
                    marginBottom: '2px',
                    lineHeight: '1'
                  }}>3秒</div>
                  <div style={{
                    fontSize: '11px',
                    color: 'var(--text-muted)',
                    lineHeight: '1.3'
                  }}>平均分析完了時間</div>
                </div>
              </div>

              <LandingButton 
                title="無料デモを予約"
                variant="primary"
                size="sm"
                as="a"
                href="#pricing"
                style={{
                  padding: '10px 20px',
                  fontSize: '13px',
                  minWidth: '120px'
                }}
              />
            </div>

            <div style={{
              background: 'var(--background)',
              borderRadius: '12px',
              padding: '20px',
              border: '1px solid var(--border-primary)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
            }}>
              <div style={{
                display: 'flex',
                gap: '8px',
                marginBottom: '16px',
                borderBottom: '1px solid var(--border-primary)',
                paddingBottom: '12px'
              }}>
                {(['slack', 'meeting', 'feedback'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      border: 'none',
                      background: activeTab === tab ? 'var(--primary)' : 'transparent',
                      color: activeTab === tab ? 'var(--background)' : 'var(--text-muted)',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      textTransform: 'capitalize'
                    }}
                  >
                    {tab === 'slack' ? 'Slack' : tab === 'meeting' ? '会議' : 'フィードバック'}
                  </button>
                ))}
              </div>

              <div style={{ minHeight: '200px' }}>
                {demoContent[activeTab].map((item, index) => (
                  <div
                    key={index}
                    style={{
                      padding: '10px 12px',
                      background: 'var(--surface)',
                      borderRadius: '6px',
                      marginBottom: '8px',
                      border: '1px solid var(--border-secondary)',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '6px'
                    }}>
                      <span style={{
                        fontSize: '10px',
                        fontWeight: '600',
                        background: 'var(--primary)',
                        color: 'var(--background)',
                        padding: '2px 6px',
                        borderRadius: '10px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        {item.tag}
                      </span>
                      <span style={{
                        fontSize: '11px',
                        color: 'var(--primary)',
                        fontFamily: 'var(--font-family-mono)',
                        fontWeight: '600'
                      }}>
                        {item.confidence}%
                      </span>
                    </div>
                    <p style={{
                      fontSize: '12px',
                      color: 'var(--text-muted)',
                      lineHeight: '1.4',
                      margin: 0
                    }}>
                      {item.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problems Section */}
      <section style={{
        padding: '60px 0',
        background: 'var(--background)'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h2 style={{
              fontSize: '28px',
              fontWeight: '700',
              marginBottom: '12px',
              color: 'var(--text)',
              fontFamily: 'var(--font-family-text)',
              lineHeight: '1.3',
              letterSpacing: '-0.02em'
            }}>
              なぜチームの洞察が活用されないのか？
            </h2>
            <p style={{
              fontSize: '15px',
              color: 'var(--text-muted)',
              maxWidth: '480px',
              margin: '0 auto',
              lineHeight: '1.5'
            }}>
              多くの組織が抱える、情報分析と活用の課題
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '20px',
            marginBottom: '48px'
          }}>
            {problems.map((problem, index) => (
              <div
                key={index}
                style={{
                  background: 'var(--surface)',
                  padding: '20px 20px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-primary)',
                  textAlign: 'center',
                  transition: 'all 0.3s ease'
                }}
              >
                <div style={{
                  fontSize: '28px',
                  marginBottom: '12px',
                  lineHeight: '1'
                }}>
                  {problem.icon}
                </div>
                <h3 style={{
                  fontSize: '16px',
                  fontWeight: '700',
                  marginBottom: '8px',
                  color: 'var(--text)',
                  lineHeight: '1.3'
                }}>
                  {problem.title}
                </h3>
                <p style={{
                  fontSize: '13px',
                  color: 'var(--text-muted)',
                  lineHeight: '1.4',
                  margin: 0
                }}>
                  {problem.description}
                </p>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h2 style={{
              fontSize: '28px',
              fontWeight: '700',
              marginBottom: '12px',
              color: 'var(--text)',
              fontFamily: 'var(--font-family-text)',
              lineHeight: '1.3',
              letterSpacing: '-0.02em'
            }}>
              POCONESTが解決します
            </h2>
            <p style={{
              fontSize: '15px',
              color: 'var(--text-muted)',
              maxWidth: '480px',
              margin: '0 auto',
              lineHeight: '1.5'
            }}>
              AI駆動型分析で、組織の洞察力を革命的に向上
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '20px'
          }}>
            {solutions.map((solution, index) => (
              <div
                key={index}
                style={{
                  background: 'var(--surface)',
                  padding: '20px 20px',
                  borderRadius: '8px',
                  border: '1px solid var(--primary)',
                  textAlign: 'center',
                  transition: 'all 0.3s ease'
                }}
              >
                <div style={{
                  fontSize: '28px',
                  marginBottom: '12px',
                  lineHeight: '1'
                }}>
                  {solution.icon}
                </div>
                <h3 style={{
                  fontSize: '16px',
                  fontWeight: '700',
                  marginBottom: '8px',
                  color: 'var(--primary)',
                  lineHeight: '1.3'
                }}>
                  {solution.title}
                </h3>
                <p style={{
                  fontSize: '13px',
                  color: 'var(--text-muted)',
                  lineHeight: '1.4',
                  margin: 0
                }}>
                  {solution.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}; 