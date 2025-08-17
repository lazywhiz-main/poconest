import React from 'react';
import { AnalysisResult } from '../../../../services/AnalysisService';

interface AnalysisResultModalProps {
  isVisible: boolean;
  onClose: () => void;
  result: AnalysisResult | null;
  analysisType: 'tag_similarity' | 'derived' | 'unified' | null;
}

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

const AnalysisResultModal: React.FC<AnalysisResultModalProps> = ({
  isVisible,
  onClose,
  result,
  analysisType
}) => {
  if (!isVisible || !result) return null;

  const getAnalysisTypeDisplayName = () => {
    switch (analysisType) {
      case 'tag_similarity':
        return 'タグ類似性分析';
      case 'derived':
        return '推論関係性分析';
      case 'unified':
        return '統合Relations分析';
      default:
        return '関係性分析';
    }
  };

  const getAnalysisTypeColor = () => {
    switch (analysisType) {
      case 'tag_similarity':
        return THEME_COLORS.primaryCyan;
      case 'derived':
        return THEME_COLORS.primaryBlue;
      case 'unified':
        return THEME_COLORS.primaryPurple;
      default:
        return THEME_COLORS.primaryGreen;
    }
  };

  const getStrengthColor = (strength: number) => {
    if (strength >= 0.8) return THEME_COLORS.primaryGreen;
    if (strength >= 0.6) return THEME_COLORS.primaryYellow;
    if (strength >= 0.4) return THEME_COLORS.primaryOrange;
    return THEME_COLORS.primaryRed;
  };

  const truncateText = (text: string, maxLength: number = 30) => {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

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
              fontWeight: '600',
            }}>
              {getAnalysisTypeDisplayName()} 結果
            </h2>
            <div style={{
              marginTop: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}>
              <span style={{
                color: result.success ? THEME_COLORS.primaryGreen : THEME_COLORS.primaryRed,
                fontSize: '14px',
                fontWeight: '600',
              }}>
                {result.success ? '✓ 成功' : '✗ 失敗'}
              </span>
              <span style={{
                color: THEME_COLORS.textSecondary,
                fontSize: '14px',
              }}>
                {result.relationshipsCreated} 件の関係性を作成
              </span>
              <span style={{
                color: THEME_COLORS.textMuted,
                fontSize: '12px',
              }}>
                {result.processingTime}ms
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: THEME_COLORS.textMuted,
              fontSize: '24px',
              cursor: 'pointer',
              padding: '4px',
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: '20px',
        }}>
          {/* Summary Stats */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: '24px',
          }}>
            {/* タググループ統計 */}
            {analysisType === 'tag_similarity' && result.details.tagGroups && result.details.tagGroups.length > 0 && (
              <div style={{
                backgroundColor: THEME_COLORS.bgTertiary,
                borderRadius: '8px',
                padding: '16px',
                border: `1px solid ${THEME_COLORS.borderSecondary}`,
              }}>
                <h4 style={{
                  margin: '0 0 12px 0',
                  color: THEME_COLORS.primaryCyan,
                  fontSize: '14px',
                  fontWeight: '600',
                }}>
                  主要なタググループ
                </h4>
                {result.details.tagGroups.slice(0, 3).map((group, index) => (
                  <div key={index} style={{
                    marginBottom: '8px',
                    fontSize: '12px',
                  }}>
                    <div style={{ color: THEME_COLORS.textPrimary }}>
                      「{group.tags.join(', ')}」
                    </div>
                    <div style={{ color: THEME_COLORS.textMuted }}>
                      {group.count} 件の関係性
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ルール分解統計 */}
            {analysisType === 'derived' && result.details.ruleBreakdown && Object.keys(result.details.ruleBreakdown).length > 0 && (
              <div style={{
                backgroundColor: THEME_COLORS.bgTertiary,
                borderRadius: '8px',
                padding: '16px',
                border: `1px solid ${THEME_COLORS.borderSecondary}`,
              }}>
                <h4 style={{
                  margin: '0 0 12px 0',
                  color: THEME_COLORS.primaryBlue,
                  fontSize: '14px',
                  fontWeight: '600',
                }}>
                  適用ルール内訳
                </h4>
                {Object.entries(result.details.ruleBreakdown).map(([rule, count]) => (
                  <div key={rule} style={{
                    marginBottom: '8px',
                    fontSize: '12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                  }}>
                    <span style={{ color: THEME_COLORS.textPrimary }}>
                      {rule}
                    </span>
                    <span style={{ color: THEME_COLORS.textSecondary }}>
                      {count} 件
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* カードタイプ統計 */}
            {result.details.cardTypes && Object.keys(result.details.cardTypes).length > 0 && (
              <div style={{
                backgroundColor: THEME_COLORS.bgTertiary,
                borderRadius: '8px',
                padding: '16px',
                border: `1px solid ${THEME_COLORS.borderSecondary}`,
              }}>
                <h4 style={{
                  margin: '0 0 12px 0',
                  color: THEME_COLORS.primaryGreen,
                  fontSize: '14px',
                  fontWeight: '600',
                }}>
                  カードタイプ
                </h4>
                {Object.entries(result.details.cardTypes).map(([type, count]) => (
                  <div key={type} style={{
                    marginBottom: '8px',
                    fontSize: '12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                  }}>
                    <span style={{ color: THEME_COLORS.textPrimary }}>
                      {type}
                    </span>
                    <span style={{ color: THEME_COLORS.textSecondary }}>
                      {count} 枚
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Relationships List */}
          {result.relationships.length > 0 && (
            <div>
              <h3 style={{
                margin: '0 0 16px 0',
                color: THEME_COLORS.textPrimary,
                fontSize: '16px',
                fontWeight: '600',
              }}>
                作成された関係性 ({result.relationships.length} 件)
              </h3>
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
                        }}>
                          {truncateText(rel.cardA.title)}
                        </div>
                        <div style={{
                          color: THEME_COLORS.textMuted,
                          fontSize: '11px',
                        }}>
                          {rel.cardA.type}
                        </div>
                      </div>

                      {/* Arrow */}
                      <div style={{
                        color: getAnalysisTypeColor(),
                        fontSize: '18px',
                        fontWeight: 'bold',
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
                        }}>
                          {truncateText(rel.cardB.title)}
                        </div>
                        <div style={{
                          color: THEME_COLORS.textMuted,
                          fontSize: '11px',
                        }}>
                          {rel.cardB.type}
                        </div>
                      </div>

                      {/* Strength */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}>
                        <div style={{
                          backgroundColor: getStrengthColor(rel.strength),
                          color: THEME_COLORS.textInverse,
                          fontSize: '10px',
                          fontWeight: '600',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          minWidth: '40px',
                          textAlign: 'center',
                        }}>
                          {Math.round(rel.strength * 100)}%
                        </div>
                      </div>

                      {/* Explanation */}
                      <div style={{
                        flex: '1',
                        minWidth: 0,
                        color: THEME_COLORS.textSecondary,
                        fontSize: '11px',
                      }}>
                        {rel.explanation}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Errors */}
          {result.details.errors && result.details.errors.length > 0 && (
            <div style={{ marginTop: '24px' }}>
              <h3 style={{
                margin: '0 0 16px 0',
                color: THEME_COLORS.primaryRed,
                fontSize: '16px',
                fontWeight: '600',
              }}>
                エラー・警告
              </h3>
              <div style={{
                backgroundColor: THEME_COLORS.bgTertiary,
                borderRadius: '8px',
                border: `1px solid ${THEME_COLORS.primaryRed}`,
                padding: '16px',
              }}>
                {result.details.errors.map((error, index) => (
                  <div key={index} style={{
                    color: THEME_COLORS.primaryRed,
                    fontSize: '13px',
                    marginBottom: index < result.details.errors!.length - 1 ? '8px' : 0,
                  }}>
                    • {error}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 20px',
          borderTop: `1px solid ${THEME_COLORS.borderPrimary}`,
          display: 'flex',
          justifyContent: 'flex-end',
        }}>
          <button
            onClick={onClose}
            style={{
              backgroundColor: getAnalysisTypeColor(),
              color: THEME_COLORS.textInverse,
              border: 'none',
              borderRadius: '6px',
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
            }}
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};

export default AnalysisResultModal; 