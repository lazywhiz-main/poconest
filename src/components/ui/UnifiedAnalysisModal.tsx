import React, { useState } from 'react';
import { THEME_COLORS } from '../../constants/theme';
import type { UnifiedAnalysisResult } from '../../services/UnifiedRelationsService';

interface UnifiedAnalysisModalProps {
  isVisible: boolean;
  onClose: () => void;
  result: UnifiedAnalysisResult | null;
}

const UnifiedAnalysisModal: React.FC<UnifiedAnalysisModalProps> = ({ 
  isVisible, 
  onClose, 
  result 
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'details' | 'experimental'>('overview');
  
  if (!isVisible || !result) return null;

  const getQualityGradeColor = (score: number): string => {
    if (score >= 0.9) return THEME_COLORS.primaryGreen;
    if (score >= 0.8) return THEME_COLORS.primaryCyan;
    if (score >= 0.7) return THEME_COLORS.primaryBlue;
    if (score >= 0.6) return THEME_COLORS.primaryOrange;
    return THEME_COLORS.primaryRed;
  };

  const getQualityGrade = (score: number): string => {
    if (score >= 0.9) return 'A';
    if (score >= 0.8) return 'B';
    if (score >= 0.7) return 'C';
    if (score >= 0.6) return 'D';
    return 'F';
  };

  const renderOverviewTab = () => (
    <div style={{ padding: '20px' }}>
      {/* サマリーメトリクス */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '16px',
        marginBottom: '24px',
      }}>
        <div style={{
          padding: '16px',
          backgroundColor: THEME_COLORS.bgTertiary,
          borderRadius: '8px',
          border: `1px solid ${THEME_COLORS.borderSecondary}`,
          textAlign: 'center',
        }}>
          <div style={{
            fontSize: '24px',
            fontWeight: '700',
            color: THEME_COLORS.primaryBlue,
            marginBottom: '4px',
          }}>
            {result.generatedRelations}
          </div>
          <div style={{
            fontSize: '12px',
            color: THEME_COLORS.textSecondary,
          }}>
            生成Relations
          </div>
        </div>

        <div style={{
          padding: '16px',
          backgroundColor: THEME_COLORS.bgTertiary,
          borderRadius: '8px',
          border: `1px solid ${THEME_COLORS.borderSecondary}`,
          textAlign: 'center',
        }}>
          <div style={{
            fontSize: '24px',
            fontWeight: '700',
            color: getQualityGradeColor(result.qualityMetrics.averageScore),
            marginBottom: '4px',
          }}>
            {getQualityGrade(result.qualityMetrics.averageScore)}
          </div>
          <div style={{
            fontSize: '12px',
            color: THEME_COLORS.textSecondary,
          }}>
            品質グレード
          </div>
        </div>

        <div style={{
          padding: '16px',
          backgroundColor: THEME_COLORS.bgTertiary,
          borderRadius: '8px',
          border: `1px solid ${THEME_COLORS.borderSecondary}`,
          textAlign: 'center',
        }}>
          <div style={{
            fontSize: '24px',
            fontWeight: '700',
            color: THEME_COLORS.primaryCyan,
            marginBottom: '4px',
          }}>
            {(result.qualityMetrics.averageScore * 100).toFixed(0)}%
          </div>
          <div style={{
            fontSize: '12px',
            color: THEME_COLORS.textSecondary,
          }}>
            平均品質
          </div>
        </div>

        <div style={{
          padding: '16px',
          backgroundColor: THEME_COLORS.bgTertiary,
          borderRadius: '8px',
          border: `1px solid ${THEME_COLORS.borderSecondary}`,
          textAlign: 'center',
        }}>
          <div style={{
            fontSize: '24px',
            fontWeight: '700',
            color: THEME_COLORS.primaryGreen,
            marginBottom: '4px',
          }}>
            {(result.qualityMetrics.highQualityRatio * 100).toFixed(0)}%
          </div>
          <div style={{
            fontSize: '12px',
            color: THEME_COLORS.textSecondary,
          }}>
            高品質率
          </div>
        </div>
      </div>
    </div>
  );

  const renderDetailsTab = () => (
    <div style={{ padding: '20px' }}>
      <h3 style={{
        margin: '0 0 16px 0',
        color: THEME_COLORS.textPrimary,
        fontSize: '18px',
        fontWeight: '600',
      }}>
        📊 処理統計詳細
      </h3>
      
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '12px',
        marginBottom: '24px',
      }}>
        <div style={{
          padding: '12px',
          backgroundColor: THEME_COLORS.bgTertiary,
          borderRadius: '6px',
          border: `1px solid ${THEME_COLORS.borderSecondary}`,
        }}>
          <div style={{
            fontSize: '12px',
            color: THEME_COLORS.textSecondary,
            marginBottom: '4px',
          }}>
            総カードペア数
          </div>
          <div style={{
            fontSize: '18px',
            fontWeight: '600',
            color: THEME_COLORS.textPrimary,
          }}>
            {result.summary.totalPairs}
          </div>
        </div>

        <div style={{
          padding: '12px',
          backgroundColor: THEME_COLORS.bgTertiary,
          borderRadius: '6px',
          border: `1px solid ${THEME_COLORS.borderSecondary}`,
        }}>
          <div style={{
            fontSize: '12px',
            color: THEME_COLORS.textSecondary,
            marginBottom: '4px',
          }}>
            品質フィルター通過
          </div>
          <div style={{
            fontSize: '18px',
            fontWeight: '600',
            color: THEME_COLORS.primaryCyan,
          }}>
            {result.summary.filteredPairs}
          </div>
        </div>

        <div style={{
          padding: '12px',
          backgroundColor: THEME_COLORS.bgTertiary,
          borderRadius: '6px',
          border: `1px solid ${THEME_COLORS.borderSecondary}`,
        }}>
          <div style={{
            fontSize: '12px',
            color: THEME_COLORS.textSecondary,
            marginBottom: '4px',
          }}>
            平均信頼度
          </div>
          <div style={{
            fontSize: '18px',
            fontWeight: '600',
            color: THEME_COLORS.primaryBlue,
          }}>
            {(result.qualityMetrics.averageConfidence * 100).toFixed(1)}%
          </div>
        </div>

        <div style={{
          padding: '12px',
          backgroundColor: THEME_COLORS.bgTertiary,
          borderRadius: '6px',
          border: `1px solid ${THEME_COLORS.borderSecondary}`,
        }}>
          <div style={{
            fontSize: '12px',
            color: THEME_COLORS.textSecondary,
            marginBottom: '4px',
          }}>
            処理時間
          </div>
          <div style={{
            fontSize: '18px',
            fontWeight: '600',
            color: THEME_COLORS.primaryPurple,
          }}>
            {result.processingTime}ms
          </div>
        </div>
      </div>

      {/* Relations一覧 */}
      {result.relationships.length > 0 && (
        <div>
          <h4 style={{
            margin: '0 0 12px 0',
            color: THEME_COLORS.textPrimary,
            fontSize: '16px',
            fontWeight: '600',
          }}>
            🔗 生成Relations一覧
          </h4>
          <div style={{
            backgroundColor: THEME_COLORS.bgTertiary,
            borderRadius: '8px',
            border: `1px solid ${THEME_COLORS.borderSecondary}`,
            overflow: 'hidden',
          }}>
            <div style={{
              maxHeight: '300px',
              overflow: 'auto',
            }}>
              {result.relationships.map((rel, index) => (
                <div key={index} style={{
                  padding: '12px 16px',
                  borderBottom: index < result.relationships.length - 1 ? `1px solid ${THEME_COLORS.borderSecondary}` : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}>
                  {/* Card A */}
                  <div style={{
                    flex: '1',
                    minWidth: 0,
                  }}>
                    <div style={{
                      color: THEME_COLORS.textPrimary,
                      fontSize: '13px',
                      fontWeight: '500',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {rel.similarity.cardA.title}
                    </div>
                    <div style={{
                      color: THEME_COLORS.textMuted,
                      fontSize: '11px',
                    }}>
                      {rel.similarity.cardA.type}
                    </div>
                  </div>

                  {/* Arrow */}
                  <div style={{
                    color: THEME_COLORS.primaryCyan,
                    fontSize: '14px',
                    fontWeight: '600',
                  }}>
                    ↔
                  </div>

                  {/* Card B */}
                  <div style={{
                    flex: '1',
                    minWidth: 0,
                  }}>
                    <div style={{
                      color: THEME_COLORS.textPrimary,
                      fontSize: '13px',
                      fontWeight: '500',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {rel.similarity.cardB.title}
                    </div>
                    <div style={{
                      color: THEME_COLORS.textMuted,
                      fontSize: '11px',
                    }}>
                      {rel.similarity.cardB.type}
                    </div>
                  </div>

                  {/* Score */}
                  <div style={{
                    textAlign: 'right',
                    minWidth: '60px',
                  }}>
                    <div style={{
                      color: getQualityGradeColor(rel.similarity.overallScore),
                      fontSize: '14px',
                      fontWeight: '600',
                    }}>
                      {(rel.similarity.overallScore * 100).toFixed(0)}%
                    </div>
                    <div style={{
                      color: THEME_COLORS.textMuted,
                      fontSize: '10px',
                    }}>
                      {rel.relationship.relationship_type}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderExperimentalTab = () => (
    <div style={{ padding: '20px' }}>
      <h3 style={{
        margin: '0 0 16px 0',
        color: THEME_COLORS.textPrimary,
        fontSize: '18px',
        fontWeight: '600',
      }}>
        🧪 実験版機能について
      </h3>
      
      <div style={{
        padding: '16px',
        backgroundColor: THEME_COLORS.bgTertiary,
        borderRadius: '8px',
        border: `1px solid ${THEME_COLORS.primaryOrange}`,
        borderLeft: `4px solid ${THEME_COLORS.primaryOrange}`,
        marginBottom: '24px',
      }}>
        <h4 style={{
          margin: '0 0 8px 0',
          color: THEME_COLORS.textPrimary,
          fontSize: '14px',
          fontWeight: '600',
        }}>
          📋 統合Relations分析の特徴
        </h4>
        <div style={{
          fontSize: '12px',
          color: THEME_COLORS.textSecondary,
          lineHeight: '1.5',
        }}>
          この統合分析は実験版機能です。既存のAI・Tag・Derived分析を統合し、
          計算重複を排除して高品質なRelationsを生成します。
          <br />
          <strong>特徴:</strong> 4つの類似度指標を統合評価、動的重み付け、品質フィルタリング
        </div>
      </div>

      {/* アルゴリズム詳細 */}
      <div style={{
        padding: '16px',
        backgroundColor: THEME_COLORS.bgTertiary,
        borderRadius: '8px',
        border: `1px solid ${THEME_COLORS.borderSecondary}`,
        marginBottom: '16px',
      }}>
        <h4 style={{
          margin: '0 0 12px 0',
          color: THEME_COLORS.textPrimary,
          fontSize: '14px',
          fontWeight: '600',
        }}>
          🔬 アルゴリズム詳細
        </h4>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px',
        }}>
          <div style={{
            padding: '8px',
            backgroundColor: THEME_COLORS.bgSecondary,
            borderRadius: '6px',
            fontSize: '12px',
          }}>
            <div style={{
              fontWeight: '600',
              color: THEME_COLORS.textPrimary,
              marginBottom: '4px',
            }}>
              セマンティック類似度
            </div>
            <div style={{ color: THEME_COLORS.textSecondary }}>
              AI埋め込みベースの意味的類似性
            </div>
          </div>
          <div style={{
            padding: '8px',
            backgroundColor: THEME_COLORS.bgSecondary,
            borderRadius: '6px',
            fontSize: '12px',
          }}>
            <div style={{
              fontWeight: '600',
              color: THEME_COLORS.textPrimary,
              marginBottom: '4px',
            }}>
              構造的類似度
            </div>
            <div style={{ color: THEME_COLORS.textSecondary }}>
              タグ・タイプベースの構造類似性
            </div>
          </div>
          <div style={{
            padding: '8px',
            backgroundColor: THEME_COLORS.bgSecondary,
            borderRadius: '6px',
            fontSize: '12px',
          }}>
            <div style={{
              fontWeight: '600',
              color: THEME_COLORS.textPrimary,
              marginBottom: '4px',
            }}>
              コンテキスト類似度
            </div>
            <div style={{ color: THEME_COLORS.textSecondary }}>
              時系列・作成者ベースの文脈類似性
            </div>
          </div>
          <div style={{
            padding: '8px',
            backgroundColor: THEME_COLORS.bgSecondary,
            borderRadius: '6px',
            fontSize: '12px',
          }}>
            <div style={{
              fontWeight: '600',
              color: THEME_COLORS.textPrimary,
              marginBottom: '4px',
            }}>
              コンテンツ類似度
            </div>
            <div style={{ color: THEME_COLORS.textSecondary }}>
              テキスト内容ベースの直接類似性
            </div>
          </div>
        </div>
      </div>

      {/* フィードバック要請 */}
      <div style={{
        padding: '12px',
        backgroundColor: THEME_COLORS.primaryBlue + '20',
        borderRadius: '8px',
        border: `1px solid ${THEME_COLORS.primaryBlue}40`,
      }}>
        <div style={{
          fontSize: '12px',
          color: THEME_COLORS.textPrimary,
          fontWeight: '600',
          marginBottom: '4px',
        }}>
          💬 フィードバックをお聞かせください
        </div>
        <div style={{
          fontSize: '11px',
          color: THEME_COLORS.textSecondary,
          lineHeight: '1.4',
        }}>
          この統合分析の結果はいかがでしたか？品質や有用性について、
          開発チームまでフィードバックをいただけると幸いです。
        </div>
      </div>
    </div>
  );

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 9999,
    }}>
      <div style={{
        backgroundColor: THEME_COLORS.bgSecondary,
        borderRadius: '12px',
        border: `1px solid ${THEME_COLORS.borderPrimary}`,
        width: '90%',
        maxWidth: '800px',
        maxHeight: '90%',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* ヘッダー */}
        <div style={{
          padding: '20px',
          borderBottom: `1px solid ${THEME_COLORS.borderSecondary}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <h2 style={{
              margin: 0,
              color: THEME_COLORS.textPrimary,
              fontSize: '20px',
              fontWeight: '600',
            }}>
              🧠 統合Relations分析結果
            </h2>
            <p style={{
              margin: '4px 0 0 0',
              color: THEME_COLORS.textSecondary,
              fontSize: '14px',
            }}>
              統合Relations生成の詳細結果
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              color: THEME_COLORS.textSecondary,
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            ×
          </button>
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          borderBottom: `1px solid ${THEME_COLORS.borderPrimary}`,
          backgroundColor: THEME_COLORS.bgTertiary,
        }}>
          {[
            { key: 'overview', label: '📊 概要' },
            { key: 'details', label: '🔗 Relations詳細' },
            { key: 'experimental', label: '🧪 実験版情報' }
          ].map(tab => (
            <button
              key={tab.key}
              style={{
                flex: 1,
                padding: '12px 16px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.2s',
                color: activeTab === tab.key ? THEME_COLORS.primaryBlue : THEME_COLORS.textMuted,
                borderBottom: activeTab === tab.key ? `2px solid ${THEME_COLORS.primaryBlue}` : '2px solid transparent',
                backgroundColor: activeTab === tab.key ? THEME_COLORS.bgSecondary : 'transparent'
              }}
              onClick={() => setActiveTab(tab.key as any)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          backgroundColor: THEME_COLORS.bgSecondary
        }}>
          {activeTab === 'overview' && renderOverviewTab()}
          {activeTab === 'details' && renderDetailsTab()}
          {activeTab === 'experimental' && renderExperimentalTab()}
        </div>
      </div>
    </div>
  );
};

export default UnifiedAnalysisModal;
