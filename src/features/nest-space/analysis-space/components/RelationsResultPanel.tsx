import React, { useState, useCallback, useMemo } from 'react';
import { THEME_COLORS } from '../../../../constants/theme';
import type { BoardItem } from '../../../../services/SmartClusteringService';

// 統合分析結果のインターフェース（RelationsSidePeakと共通）
interface UnifiedRelationshipSuggestion {
  sourceCardId: string;
  targetCardId: string;
  relationshipType: string;
  suggestedStrength: number;
  confidence: number;
  similarity?: number;
  explanation: string;
  analysisMethod: 'ai' | 'tag_similarity' | 'derived'; // 'unified'を除外してNetworkVisualizationと一致
  methodLabel: string;
  methodIcon: string;
}

interface RelationsResultPanelProps {
  /** 分析結果の提案リスト */
  suggestions: UnifiedRelationshipSuggestion[];
  /** カード情報リスト */
  cards: BoardItem[];
  /** 個別提案の承認 */
  onApproveSuggestion: (suggestion: UnifiedRelationshipSuggestion) => void;
  /** 個別提案の拒否 */
  onRejectSuggestion: (suggestion: UnifiedRelationshipSuggestion) => void;
  /** 手法別一括承認 */
  onApproveMethodSuggestions: (method: 'ai' | 'tag_similarity' | 'derived') => void;
  /** 手法別一括拒否 */
  onRejectMethodSuggestions: (method: 'ai' | 'tag_similarity' | 'derived') => void;
  /** 全体一括承認 */
  onApproveAllSuggestions: () => void;
  /** 全体拒否（結果パネルを閉じる） */
  onRejectAllSuggestions: () => void;
}

/**
 * Relations 分析結果表示・承認パネルコンポーネント
 * 統合関係性提案の表示、フィルタリング、承認/拒否機能を提供
 */
export const RelationsResultPanel: React.FC<RelationsResultPanelProps> = ({
  suggestions,
  cards,
  onApproveSuggestion,
  onRejectSuggestion,
  onApproveMethodSuggestions,
  onRejectMethodSuggestions,
  onApproveAllSuggestions,
  onRejectAllSuggestions,
}) => {
  // 分析手法フィルター状態
  const [methodFilters, setMethodFilters] = useState({
    ai: true,
    tag_similarity: true,
    derived: true,
    unified: true,
  });

  // フィルタリングされた提案リスト
  const filteredSuggestions = useMemo(() => {
    return suggestions.filter(s => methodFilters[s.analysisMethod]);
  }, [suggestions, methodFilters]);

  // 手法別カウント
  const methodCounts = useMemo(() => ({
    ai: suggestions.filter(s => s.analysisMethod === 'ai').length,
    tag_similarity: suggestions.filter(s => s.analysisMethod === 'tag_similarity').length,
    derived: suggestions.filter(s => s.analysisMethod === 'derived').length,
    unified: suggestions.filter(s => s.analysisMethod === 'unified').length,
  }), [suggestions]);

  // スタイル定義
  const styles = {
    container: {
      background: THEME_COLORS.bgTertiary,
      borderRadius: THEME_COLORS.borderRadius.medium,
      border: `1px solid ${THEME_COLORS.borderSecondary}`,
      padding: '16px',
      marginTop: '16px',
    },
    title: {
      fontSize: '14px',
      fontWeight: '600',
      color: THEME_COLORS.textPrimary,
      marginBottom: '16px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    emptyState: {
      textAlign: 'center' as const,
      color: THEME_COLORS.textMuted,
      fontSize: '14px',
      padding: '40px 20px',
    },
    statsSection: {
      marginBottom: '16px',
      padding: '12px',
      background: THEME_COLORS.bgSecondary,
      borderRadius: '8px',
      border: `1px solid ${THEME_COLORS.borderPrimary}`,
    },
    statsTitle: {
      fontSize: '12px',
      color: THEME_COLORS.textSecondary,
      marginBottom: '8px',
      fontWeight: '600',
    },
    statsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: '8px',
      fontSize: '10px',
    },
    statCard: {
      textAlign: 'center' as const,
      padding: '8px',
      background: THEME_COLORS.bgTertiary,
      borderRadius: '6px',
    },
    filterSection: {
      marginBottom: '16px',
      padding: '12px',
      background: THEME_COLORS.bgSecondary,
      borderRadius: '8px',
      border: `1px solid ${THEME_COLORS.borderPrimary}`,
    },
    filterLabel: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      cursor: 'pointer',
      fontSize: '11px',
      color: THEME_COLORS.textSecondary,
    },
    bulkSection: {
      marginBottom: '16px',
      padding: '12px',
      background: THEME_COLORS.bgSecondary,
      borderRadius: '8px',
      border: `1px solid ${THEME_COLORS.borderPrimary}`,
    },
    methodBulkItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '6px',
      background: THEME_COLORS.bgTertiary,
      borderRadius: '6px',
      marginBottom: '6px',
    },
    button: {
      border: 'none',
      borderRadius: '4px',
      padding: '4px 8px',
      fontSize: '9px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    },
    approveBtn: {
      background: THEME_COLORS.primaryGreen,
      color: THEME_COLORS.textInverse,
    },
    rejectBtn: {
      background: THEME_COLORS.primaryRed,
      color: THEME_COLORS.textInverse,
    },
    suggestionItem: {
      background: THEME_COLORS.bgTertiary,
      border: `1px solid ${THEME_COLORS.borderSecondary}`,
      borderRadius: '12px',
      padding: '16px',
      marginBottom: '12px',
      transition: 'all 0.2s ease',
    },
  };

  // 提案がない場合の表示
  if (suggestions.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.title}>
          📊 分析結果表示・承認
        </div>
        <div style={styles.emptyState}>
          新しい関係性の提案はありません
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.title}>
        📊 統合関係性提案 ({suggestions.length})
      </div>

      {/* 分析結果統計 */}
      <div style={styles.statsSection}>
        <div style={styles.statsTitle}>分析結果統計</div>
        <div style={styles.statsGrid}>
          <div style={{
            ...styles.statCard,
            border: `1px solid ${THEME_COLORS.primaryOrange}40`,
          }}>
            <div style={{ color: THEME_COLORS.primaryOrange, fontWeight: '600' }}>
              {methodCounts.ai}
            </div>
            <div style={{ color: THEME_COLORS.textMuted }}>🤖 AI分析</div>
          </div>
          <div style={{
            ...styles.statCard,
            border: `1px solid ${THEME_COLORS.primaryCyan}40`,
          }}>
            <div style={{ color: THEME_COLORS.primaryCyan, fontWeight: '600' }}>
              {methodCounts.tag_similarity}
            </div>
            <div style={{ color: THEME_COLORS.textMuted }}>🏷️ タグ類似</div>
          </div>
          <div style={{
            ...styles.statCard,
            border: `1px solid ${THEME_COLORS.primaryBlue}40`,
          }}>
            <div style={{ color: THEME_COLORS.primaryBlue, fontWeight: '600' }}>
              {methodCounts.derived}
            </div>
            <div style={{ color: THEME_COLORS.textMuted }}>🔗 推論分析</div>
          </div>
          <div style={{
            ...styles.statCard,
            border: `1px solid ${THEME_COLORS.primaryPurple}40`,
          }}>
            <div style={{ color: THEME_COLORS.primaryPurple, fontWeight: '600' }}>
              {methodCounts.unified}
            </div>
            <div style={{ color: THEME_COLORS.textMuted }}>🧠 統合分析</div>
          </div>
        </div>
      </div>

      {/* 分析手法フィルター */}
      <div style={styles.filterSection}>
        <div style={styles.statsTitle}>分析手法フィルター</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {[
            { key: 'ai', label: 'AI分析', icon: '🤖', color: THEME_COLORS.primaryOrange },
            { key: 'tag_similarity', label: 'タグ類似性', icon: '🏷️', color: THEME_COLORS.primaryCyan },
            { key: 'derived', label: '推論分析', icon: '🔗', color: THEME_COLORS.primaryBlue },
            { key: 'unified', label: '統合分析', icon: '🧠', color: THEME_COLORS.primaryPurple }
          ].map(method => (
            <label key={method.key} style={styles.filterLabel}>
              <input
                type="checkbox"
                checked={methodFilters[method.key as keyof typeof methodFilters]}
                onChange={(e) => setMethodFilters(prev => ({
                  ...prev,
                  [method.key]: e.target.checked
                }))}
                style={{
                  accentColor: method.color,
                  width: '12px',
                  height: '12px',
                }}
              />
              <span style={{ fontSize: '12px' }}>{method.icon}</span>
              <span>{method.label}</span>
              <span style={{
                background: method.color,
                color: THEME_COLORS.textInverse,
                padding: '2px 6px',
                borderRadius: '4px',
                fontSize: '10px',
                fontWeight: '600',
              }}>
                {methodCounts[method.key as keyof typeof methodCounts]}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* 手法別一括操作 */}
      <div style={styles.bulkSection}>
        <div style={styles.statsTitle}>手法別一括操作</div>
        <div>
          {[
            { method: 'ai', label: 'AI分析', icon: '🤖', color: THEME_COLORS.primaryOrange },
            { method: 'tag_similarity', label: 'タグ類似性', icon: '🏷️', color: THEME_COLORS.primaryCyan },
            { method: 'derived', label: '推論分析', icon: '🔗', color: THEME_COLORS.primaryBlue }
          ].map(({ method, label, icon, color }) => {
            const methodSuggestions = suggestions.filter(s => s.analysisMethod === method);
            const filteredMethodSuggestions = methodSuggestions.filter(s => 
              methodFilters[method as keyof typeof methodFilters]
            );
            
            if (methodSuggestions.length === 0) return null;
            
            return (
              <div key={method} style={{
                ...styles.methodBulkItem,
                border: `1px solid ${color}40`,
              }}>
                <span style={{ fontSize: '12px' }}>{icon}</span>
                <span style={{
                  fontSize: '11px',
                  color: THEME_COLORS.textSecondary,
                  flex: 1,
                }}>
                  {label} ({filteredMethodSuggestions.length}件)
                </span>
                <button
                  style={{
                    ...styles.button,
                    ...styles.approveBtn,
                    opacity: filteredMethodSuggestions.length > 0 ? 1 : 0.5,
                  }}
                  disabled={filteredMethodSuggestions.length === 0}
                  onClick={() => onApproveMethodSuggestions(method as 'ai' | 'tag_similarity' | 'derived')}
                >
                  承認
                </button>
                <button
                  style={{
                    ...styles.button,
                    ...styles.rejectBtn,
                    opacity: filteredMethodSuggestions.length > 0 ? 1 : 0.5,
                  }}
                  disabled={filteredMethodSuggestions.length === 0}
                  onClick={() => onRejectMethodSuggestions(method as 'ai' | 'tag_similarity' | 'derived')}
                >
                  拒否
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* 全体一括操作 */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '16px',
      }}>
        <button
          style={{
            flex: 1,
            background: THEME_COLORS.primaryGreen,
            color: THEME_COLORS.textInverse,
            border: 'none',
            borderRadius: '8px',
            padding: '8px 12px',
            fontSize: '12px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onClick={onApproveAllSuggestions}
        >
          表示中全て承認 ({filteredSuggestions.length})
        </button>
        <button
          style={{
            flex: 1,
            background: THEME_COLORS.bgTertiary,
            color: THEME_COLORS.textSecondary,
            border: `1px solid ${THEME_COLORS.borderSecondary}`,
            borderRadius: '8px',
            padding: '8px 12px',
            fontSize: '12px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onClick={onRejectAllSuggestions}
        >
          全て拒否
        </button>
      </div>

      {/* 提案リスト */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filteredSuggestions.map((suggestion, index) => {
          const sourceCard = cards.find(c => c.id === suggestion.sourceCardId);
          const targetCard = cards.find(c => c.id === suggestion.targetCardId);
          
          if (!sourceCard || !targetCard) return null;
          
          return (
            <div key={`${suggestion.sourceCardId}-${suggestion.targetCardId}`} style={styles.suggestionItem}>
              {/* カード間の関係 */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '12px',
              }}>
                <div style={{
                  fontSize: '12px',
                  color: THEME_COLORS.textSecondary,
                  background: THEME_COLORS.bgSecondary,
                  padding: '4px 8px',
                  borderRadius: '6px',
                  maxWidth: '120px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {sourceCard.title}
                </div>
                <div style={{
                  fontSize: '14px',
                  color: THEME_COLORS.primaryOrange,
                }}>
                  →
                </div>
                <div style={{
                  fontSize: '12px',
                  color: THEME_COLORS.textSecondary,
                  background: THEME_COLORS.bgSecondary,
                  padding: '4px 8px',
                  borderRadius: '6px',
                  maxWidth: '120px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {targetCard.title}
                </div>
              </div>

              {/* 関係性の詳細 */}
              <div style={{
                fontSize: '11px',
                color: THEME_COLORS.textMuted,
                marginBottom: '12px',
                lineHeight: '1.4',
                background: THEME_COLORS.bgSecondary,
                padding: '8px',
                borderRadius: '6px',
                border: `1px solid ${THEME_COLORS.borderPrimary}`,
              }}>
                <div style={{
                  fontSize: '10px',
                  color: THEME_COLORS.textSecondary,
                  marginBottom: '4px',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                }}>
                  分析詳細
                </div>
                {suggestion.explanation}
                
                {/* 推奨強度情報 */}
                {suggestion.suggestedStrength && (
                  <div style={{
                    marginTop: '6px',
                    fontSize: '10px',
                    color: THEME_COLORS.textMuted,
                  }}>
                    推奨強度: {(suggestion.suggestedStrength * 100).toFixed(1)}%
                  </div>
                )}
                
                {/* 類似度情報 */}
                {suggestion.similarity && suggestion.similarity !== suggestion.confidence && (
                  <div style={{
                    fontSize: '10px',
                    color: THEME_COLORS.textMuted,
                  }}>
                    類似度: {(suggestion.similarity * 100).toFixed(1)}%
                  </div>
                )}
              </div>

              {/* 信頼度とタイプ */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '12px',
              }}>
                <div style={{
                  display: 'flex',
                  gap: '8px',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                }}>
                  {/* 分析手法バッジ */}
                  <span style={{
                    fontSize: '9px',
                    background: suggestion.analysisMethod === 'ai' 
                      ? THEME_COLORS.primaryOrange
                      : suggestion.analysisMethod === 'tag_similarity'
                      ? THEME_COLORS.primaryCyan
                      : suggestion.analysisMethod === 'derived'
                      ? THEME_COLORS.primaryBlue
                      : THEME_COLORS.primaryPurple,
                    color: THEME_COLORS.textInverse,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px',
                  }}>
                    {suggestion.methodIcon}
                    {suggestion.methodLabel}
                  </span>
                  <span style={{
                    fontSize: '9px',
                    background: THEME_COLORS.bgQuaternary,
                    color: THEME_COLORS.textSecondary,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    textTransform: 'uppercase',
                    fontWeight: '600',
                  }}>
                    {suggestion.relationshipType}
                  </span>
                  <span style={{
                    fontSize: '10px',
                    color: THEME_COLORS.textMuted,
                  }}>
                    信頼度: {Math.round(suggestion.confidence * 100)}%
                  </span>
                </div>
              </div>

              {/* アクションボタン */}
              <div style={{
                display: 'flex',
                gap: '8px',
              }}>
                <button
                  style={{
                    flex: 1,
                    background: THEME_COLORS.primaryGreen,
                    color: THEME_COLORS.textInverse,
                    border: 'none',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    fontSize: '11px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  onClick={() => onApproveSuggestion(suggestion)}
                >
                  承認
                </button>
                <button
                  style={{
                    flex: 1,
                    background: 'transparent',
                    color: THEME_COLORS.textMuted,
                    border: `1px solid ${THEME_COLORS.borderSecondary}`,
                    borderRadius: '6px',
                    padding: '6px 12px',
                    fontSize: '11px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  onClick={() => onRejectSuggestion(suggestion)}
                >
                  拒否
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RelationsResultPanel;
