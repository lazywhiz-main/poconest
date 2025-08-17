import React, { useState } from 'react';
import type { RelationsDuplicationReport, RelationsQualityReport } from '../../services/RelationsAnalysisService';

interface RelationsQualityModalProps {
  isVisible: boolean;
  onClose: () => void;
  duplicationReport: RelationsDuplicationReport | null;
  qualityReport: RelationsQualityReport | null;
  onDeduplicationRequest?: () => void;
}

// 既存のAnalysisResultModalと同じテーマ色を使用
const THEME_COLORS = {
  bgPrimary: '#1a1b1e',
  bgSecondary: '#2b2d31',
  bgTertiary: '#36393f',
  textPrimary: '#dcddde',
  textSecondary: '#b9bbbe',
  textMuted: '#72767d',
  textInverse: '#ffffff',
  borderPrimary: '#40444b',
  borderSecondary: '#4f5660',
  primaryBlue: '#5865f2',
  primaryGreen: '#57f287',
  primaryRed: '#ed4245',
  primaryYellow: '#fee75c',
  primaryCyan: '#1abc9c',
  primaryPurple: '#9b59b6',
  primaryOrange: '#e67e22',
};

/**
 * 🔍 Relations品質分析結果表示モーダル
 */
export const RelationsQualityModal: React.FC<RelationsQualityModalProps> = ({
  isVisible,
  onClose,
  duplicationReport,
  qualityReport,
  onDeduplicationRequest
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'duplicates' | 'quality'>('overview');

  if (!isVisible || !duplicationReport || !qualityReport) return null;

  const getQualityGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return THEME_COLORS.primaryGreen;
      case 'B': return THEME_COLORS.primaryBlue;
      case 'C': return THEME_COLORS.primaryYellow;
      case 'D': return THEME_COLORS.primaryOrange;
      case 'F': return THEME_COLORS.primaryRed;
      default: return THEME_COLORS.textMuted;
    }
  };

  const getSeverityColor = (severity: 'low' | 'medium' | 'high') => {
    switch (severity) {
      case 'low': return THEME_COLORS.primaryGreen;
      case 'medium': return THEME_COLORS.primaryYellow;
      case 'high': return THEME_COLORS.primaryRed;
      default: return THEME_COLORS.textMuted;
    }
  };

  const renderOverviewTab = () => (
    <div style={{ padding: '20px' }}>
      {/* 基本統計カード */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div style={{
          padding: '16px',
          backgroundColor: THEME_COLORS.bgTertiary,
          borderRadius: '8px',
          border: `1px solid ${THEME_COLORS.borderSecondary}`,
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: '24px',
            fontWeight: '700',
            color: THEME_COLORS.primaryBlue,
            marginBottom: '4px'
          }}>
            {duplicationReport.totalRelations}
          </div>
          <div style={{ fontSize: '12px', color: THEME_COLORS.textSecondary }}>
            総Relations数
          </div>
        </div>

        <div style={{
          padding: '16px',
          backgroundColor: THEME_COLORS.bgTertiary,
          borderRadius: '8px',
          border: `1px solid ${THEME_COLORS.borderSecondary}`,
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: '24px',
            fontWeight: '700',
            color: duplicationReport.duplicationRate > 0.1 ? THEME_COLORS.primaryRed : THEME_COLORS.primaryGreen,
            marginBottom: '4px'
          }}>
            {(duplicationReport.duplicationRate * 100).toFixed(1)}%
          </div>
          <div style={{ fontSize: '12px', color: THEME_COLORS.textSecondary }}>
            重複率
          </div>
        </div>

        <div style={{
          padding: '16px',
          backgroundColor: THEME_COLORS.bgTertiary,
          borderRadius: '8px',
          border: `1px solid ${THEME_COLORS.borderSecondary}`,
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: '24px',
            fontWeight: '700',
            color: getQualityGradeColor(qualityReport.qualityGrade),
            marginBottom: '4px'
          }}>
            {qualityReport.qualityGrade}
          </div>
          <div style={{ fontSize: '12px', color: THEME_COLORS.textSecondary }}>
            品質グレード
          </div>
        </div>

        <div style={{
          padding: '16px',
          backgroundColor: THEME_COLORS.bgTertiary,
          borderRadius: '8px',
          border: `1px solid ${THEME_COLORS.borderSecondary}`,
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: '24px',
            fontWeight: '700',
            color: THEME_COLORS.primaryCyan,
            marginBottom: '4px'
          }}>
            {(qualityReport.connectionRatio * 100).toFixed(0)}%
          </div>
          <div style={{ fontSize: '12px', color: THEME_COLORS.textSecondary }}>
            カード接続率
          </div>
        </div>
      </div>

      {/* 重複アクション */}
      {duplicationReport.duplicatePairs > 0 && (
        <div style={{
          padding: '16px',
          backgroundColor: THEME_COLORS.primaryRed + '20',
          borderRadius: '8px',
          border: `1px solid ${THEME_COLORS.primaryRed}40`,
          marginBottom: '24px'
        }}>
          <div style={{
            fontSize: '16px',
            fontWeight: '600',
            color: THEME_COLORS.primaryRed,
            marginBottom: '8px'
          }}>
            ⚠️ {duplicationReport.duplicatePairs}件の重複Relations発見
          </div>
          <div style={{
            fontSize: '14px',
            color: THEME_COLORS.textSecondary,
            marginBottom: '12px'
          }}>
            Relations重複削除を実行して品質を向上できます
          </div>
          {onDeduplicationRequest && (
            <button
              onClick={onDeduplicationRequest}
              style={{
                padding: '8px 16px',
                backgroundColor: THEME_COLORS.primaryRed,
                color: THEME_COLORS.textInverse,
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              🧹 重複削除を実行
            </button>
          )}
        </div>
      )}

      {/* 推奨事項 */}
      {duplicationReport.recommendations.length > 0 && (
        <div style={{
          padding: '16px',
          backgroundColor: THEME_COLORS.bgTertiary,
          borderRadius: '8px',
          border: `1px solid ${THEME_COLORS.borderSecondary}`
        }}>
          <h4 style={{
            margin: '0 0 12px 0',
            color: THEME_COLORS.textPrimary,
            fontSize: '16px',
            fontWeight: '600'
          }}>
            💡 推奨事項
          </h4>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            {duplicationReport.recommendations.map((recommendation, index) => (
              <div key={index} style={{
                padding: '8px',
                backgroundColor: THEME_COLORS.bgSecondary,
                borderRadius: '6px',
                fontSize: '14px',
                color: THEME_COLORS.textSecondary
              }}>
                • {recommendation}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderDuplicatesTab = () => (
    <div style={{ padding: '20px' }}>
      <h3 style={{
        margin: '0 0 16px 0',
        color: THEME_COLORS.textPrimary,
        fontSize: '18px',
        fontWeight: '600'
      }}>
        🔗 重複Relations詳細
      </h3>
      
      {duplicationReport.conflictingRelations.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '40px',
          color: THEME_COLORS.textMuted
        }}>
          重複Relationsは見つかりませんでした ✅
        </div>
      ) : (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          {duplicationReport.conflictingRelations.map((conflict, index) => (
            <div key={index} style={{
              padding: '16px',
              backgroundColor: THEME_COLORS.bgTertiary,
              borderRadius: '8px',
              border: `1px solid ${THEME_COLORS.borderSecondary}`
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '12px'
              }}>
                <div style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: THEME_COLORS.textPrimary
                }}>
                  カードペア: {conflict.cardPair}
                </div>
                <div style={{
                  padding: '4px 8px',
                  backgroundColor: conflict.strengthDifference > 0.3 ? THEME_COLORS.primaryRed + '30' : THEME_COLORS.primaryYellow + '30',
                  color: conflict.strengthDifference > 0.3 ? THEME_COLORS.primaryRed : THEME_COLORS.primaryYellow,
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: '500'
                }}>
                  強度差: {conflict.strengthDifference.toFixed(2)}
                </div>
              </div>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '8px'
              }}>
                {conflict.conflictingRelations.map((rel, relIndex) => (
                  <div key={relIndex} style={{
                    padding: '8px',
                    backgroundColor: THEME_COLORS.bgSecondary,
                    borderRadius: '6px',
                    fontSize: '12px'
                  }}>
                    <div style={{
                      fontWeight: '600',
                      color: THEME_COLORS.textPrimary,
                      marginBottom: '4px'
                    }}>
                      {rel.type.toUpperCase()}
                    </div>
                    <div style={{ color: THEME_COLORS.textSecondary }}>
                      強度: {rel.strength.toFixed(2)} | 信頼度: {rel.confidence.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderQualityTab = () => (
    <div style={{ padding: '20px' }}>
      <h3 style={{
        margin: '0 0 16px 0',
        color: THEME_COLORS.textPrimary,
        fontSize: '18px',
        fontWeight: '600'
      }}>
        📊 Relations品質評価
      </h3>
      
      {/* 品質スコア */}
      <div style={{
        marginBottom: '24px',
        padding: '20px',
        backgroundColor: THEME_COLORS.bgTertiary,
        borderRadius: '8px',
        border: `1px solid ${THEME_COLORS.borderSecondary}`,
        textAlign: 'center'
      }}>
        <div style={{
          fontSize: '48px',
          fontWeight: '700',
          color: getQualityGradeColor(qualityReport.qualityGrade),
          marginBottom: '8px'
        }}>
          {qualityReport.qualityScore}/100
        </div>
        <div style={{
          fontSize: '18px',
          fontWeight: '600',
          color: getQualityGradeColor(qualityReport.qualityGrade)
        }}>
          グレード {qualityReport.qualityGrade}
        </div>
      </div>

      {/* 品質詳細ブレークダウン */}
      {qualityReport.qualityBreakdown && (
        <div style={{
          marginBottom: '24px',
          padding: '20px',
          backgroundColor: THEME_COLORS.bgTertiary,
          borderRadius: '8px',
          border: `1px solid ${THEME_COLORS.borderSecondary}`
        }}>
          <h4 style={{
            margin: '0 0 16px 0',
            color: THEME_COLORS.textPrimary,
            fontSize: '16px',
            fontWeight: '600'
          }}>
            📈 品質詳細分析
          </h4>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '12px'
          }}>
            {/* カード接続率 */}
            <div style={{
              padding: '12px',
              backgroundColor: THEME_COLORS.bgSecondary,
              borderRadius: '6px',
              border: `1px solid ${THEME_COLORS.borderSecondary}`
            }}>
              <div style={{
                fontSize: '12px',
                color: THEME_COLORS.textSecondary,
                marginBottom: '4px'
              }}>
                カード接続率 (重み {Math.round(qualityReport.qualityBreakdown.connectionWeight * 100)}%)
              </div>
              <div style={{
                fontSize: '18px',
                fontWeight: '600',
                color: THEME_COLORS.primaryCyan,
                marginBottom: '2px'
              }}>
                {qualityReport.qualityBreakdown.connectionScore}/100
              </div>
              <div style={{
                fontSize: '11px',
                color: THEME_COLORS.textMuted
              }}>
                貢献: {qualityReport.qualityBreakdown.connectionContribution}pts
              </div>
            </div>

            {/* Relations密度 */}
            <div style={{
              padding: '12px',
              backgroundColor: THEME_COLORS.bgSecondary,
              borderRadius: '6px',
              border: `1px solid ${THEME_COLORS.borderSecondary}`
            }}>
              <div style={{
                fontSize: '12px',
                color: THEME_COLORS.textSecondary,
                marginBottom: '4px'
              }}>
                Relations密度 (重み {Math.round(qualityReport.qualityBreakdown.densityWeight * 100)}%)
              </div>
              <div style={{
                fontSize: '18px',
                fontWeight: '600',
                color: THEME_COLORS.primaryCyan,
                marginBottom: '2px'
              }}>
                {qualityReport.qualityBreakdown.densityScore}/100
              </div>
              <div style={{
                fontSize: '11px',
                color: THEME_COLORS.textMuted
              }}>
                貢献: {qualityReport.qualityBreakdown.densityContribution}pts
              </div>
            </div>

            {/* 強Relations率 */}
            <div style={{
              padding: '12px',
              backgroundColor: THEME_COLORS.bgSecondary,
              borderRadius: '6px',
              border: `1px solid ${THEME_COLORS.borderSecondary}`
            }}>
              <div style={{
                fontSize: '12px',
                color: THEME_COLORS.textSecondary,
                marginBottom: '4px'
              }}>
                強Relations率 (重み {Math.round(qualityReport.qualityBreakdown.strongRelationsWeight * 100)}%)
              </div>
              <div style={{
                fontSize: '18px',
                fontWeight: '600',
                color: THEME_COLORS.primaryCyan,
                marginBottom: '2px'
              }}>
                {qualityReport.qualityBreakdown.strongRelationsScore}/100
              </div>
              <div style={{
                fontSize: '11px',
                color: THEME_COLORS.textMuted
              }}>
                貢献: {qualityReport.qualityBreakdown.strongRelationsContribution}pts
              </div>
            </div>

            {/* 平均強度 */}
            <div style={{
              padding: '12px',
              backgroundColor: THEME_COLORS.bgSecondary,
              borderRadius: '6px',
              border: `1px solid ${THEME_COLORS.borderSecondary}`
            }}>
              <div style={{
                fontSize: '12px',
                color: THEME_COLORS.textSecondary,
                marginBottom: '4px'
              }}>
                平均強度 (重み {Math.round(qualityReport.qualityBreakdown.averageStrengthWeight * 100)}%)
              </div>
              <div style={{
                fontSize: '18px',
                fontWeight: '600',
                color: THEME_COLORS.primaryCyan,
                marginBottom: '2px'
              }}>
                {qualityReport.qualityBreakdown.averageStrengthScore}/100
              </div>
              <div style={{
                fontSize: '11px',
                color: THEME_COLORS.textMuted
              }}>
                貢献: {qualityReport.qualityBreakdown.averageStrengthContribution}pts
              </div>
            </div>
          </div>
          
          {/* 生の数値 */}
          <div style={{
            marginTop: '16px',
            padding: '12px',
            backgroundColor: THEME_COLORS.bgSecondary,
            borderRadius: '6px',
            fontSize: '12px',
            color: THEME_COLORS.textSecondary
          }}>
            <strong>生データ:</strong> 
            接続率 {(qualityReport.qualityBreakdown.details.connectionRatio * 100).toFixed(1)}% | 
            密度 {(qualityReport.qualityBreakdown.details.relationsDensity * 100).toFixed(3)}% | 
            強Relations率 {(qualityReport.qualityBreakdown.details.strongRelationsRatio * 100).toFixed(1)}% | 
            平均強度 {(qualityReport.qualityBreakdown.details.averageStrength * 100).toFixed(1)}%
          </div>
        </div>
      )}

      {/* 問題リスト */}
      {qualityReport.issues.length > 0 && (
        <div>
          <h4 style={{
            margin: '0 0 12px 0',
            color: THEME_COLORS.textPrimary,
            fontSize: '16px',
            fontWeight: '600'
          }}>
            🚨 特定された問題
          </h4>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            {qualityReport.issues.map((issue, index) => (
              <div key={index} style={{
                padding: '12px',
                backgroundColor: getSeverityColor(issue.severity) + '20',
                borderRadius: '8px',
                border: `1px solid ${getSeverityColor(issue.severity)}40`
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '4px'
                }}>
                  <span style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: THEME_COLORS.textPrimary
                  }}>
                    {issue.description}
                  </span>
                  <span style={{
                    padding: '2px 6px',
                    backgroundColor: getSeverityColor(issue.severity),
                    color: THEME_COLORS.textInverse,
                    borderRadius: '4px',
                    fontSize: '10px',
                    fontWeight: '600',
                    textTransform: 'uppercase'
                  }}>
                    {issue.severity}
                  </span>
                </div>
                <div style={{
                  fontSize: '12px',
                  color: THEME_COLORS.textSecondary
                }}>
                  影響: {issue.affectedCount}件 | 推奨: {issue.recommendation}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
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
        {/* Header */}
        <div style={{
          padding: '20px',
          borderBottom: `1px solid ${THEME_COLORS.borderPrimary}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <h2 style={{
              margin: 0,
              color: THEME_COLORS.textPrimary,
              fontSize: '20px',
              fontWeight: '600'
            }}>
              🔍 Relations品質分析
            </h2>
            <div style={{
              marginTop: '4px',
              fontSize: '14px',
              color: THEME_COLORS.textSecondary
            }}>
              Relations重複状況と品質評価
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: THEME_COLORS.textMuted,
              padding: '4px',
              borderRadius: '4px',
              lineHeight: 1
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
            { key: 'duplicates', label: '🔗 重複詳細' },
            { key: 'quality', label: '📈 品質評価' }
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
          {activeTab === 'duplicates' && renderDuplicatesTab()}
          {activeTab === 'quality' && renderQualityTab()}
        </div>
      </div>
    </div>
  );
};

export default RelationsQualityModal;
