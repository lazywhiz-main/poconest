import React, { useState, useCallback } from 'react';
import type { ClusterLabel } from '../../services/AnalysisService';
import type { BoardItem } from '../../services/SmartClusteringService';
import { THEME_COLORS } from '../../constants/theme';

interface ClusterDetailModalProps {
  /** 表示するクラスター */
  cluster: ClusterLabel;
  /** ボードのカード一覧 */
  boardCards: BoardItem[];
  /** モーダルの表示状態 */
  isVisible: boolean;
  /** モーダルを閉じる */
  onClose: () => void;
  /** クラスターラベルの更新 */
  onUpdateClusterLabel: (clusterId: string, newText: string) => void;
  /** AI提案ボタンのクリックハンドラー */
  onAISuggestion?: (clusterId: string) => void;
  /** ノード選択ハンドラー（カードクリック時） */
  onNodeSelect?: (nodeId: string) => void;
}

/**
 * クラスター詳細モーダルコンポーネント
 * 分析スペースと理論構築・管理スペースで共有
 */
const ClusterDetailModal: React.FC<ClusterDetailModalProps> = ({
  cluster,
  boardCards,
  isVisible,
  onClose,
  onUpdateClusterLabel,
  onAISuggestion,
  onNodeSelect,
}) => {
  // 編集状態の管理
  const [isEditingClusterLabel, setIsEditingClusterLabel] = useState(false);
  const [editingClusterText, setEditingClusterText] = useState('');

  // クラスターラベル編集開始
  const handleStartEditClusterLabel = useCallback((currentText: string) => {
    setIsEditingClusterLabel(true);
    setEditingClusterText(currentText);
  }, []);

  // クラスターラベル編集保存
  const handleSaveClusterLabel = useCallback(() => {
    if (!editingClusterText.trim()) return;
    
    // 親コンポーネントにラベル更新を通知
    onUpdateClusterLabel(cluster.id, editingClusterText.trim());
    
    // 編集状態を終了
    setIsEditingClusterLabel(false);
    setEditingClusterText('');
    
    console.log('[ClusterDetailModal] クラスターラベル編集完了:', { 
      clusterId: cluster.id, 
      newText: editingClusterText.trim() 
    });
  }, [editingClusterText, cluster.id, onUpdateClusterLabel]);

  // クラスターラベル編集キャンセル
  const handleCancelEditClusterLabel = useCallback(() => {
    setIsEditingClusterLabel(false);
    setEditingClusterText('');
  }, []);

  // AI提案ボタンのクリックハンドラー
  const handleAILabelGeneration = useCallback(() => {
    if (onAISuggestion) {
      onAISuggestion(cluster.id);
    }
  }, [cluster.id, onAISuggestion]);

  if (!isVisible) return null;

  // クラスターに含まれるカードを取得
  const clusterCards = cluster.cardIds
    .map(cardId => boardCards.find(card => card.id === cardId))
    .filter(Boolean) as BoardItem[];

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      backdropFilter: 'blur(4px)',
    }}>
      <div style={{
        background: THEME_COLORS.bgSecondary,
        border: `1px solid ${THEME_COLORS.borderPrimary}`,
        borderRadius: THEME_COLORS.borderRadius.xlarge,
        padding: '24px',
        width: '90%',
        maxWidth: '600px',
        maxHeight: '80vh',
        overflow: 'auto',
        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.3)',
      }}>
        {/* ヘッダー */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
        }}>
          <div style={{
            color: THEME_COLORS.primaryBlue,
            fontSize: '18px',
            fontWeight: '600',
            fontFamily: 'Space Grotesk, system-ui, sans-serif',
          }}>
            🎯 クラスター詳細
          </div>
          <button
            style={{
              background: 'transparent',
              border: 'none',
              color: THEME_COLORS.textMuted,
              fontSize: '20px',
              cursor: 'pointer',
              padding: '4px',
            }}
            onClick={onClose}
          >
            ×
          </button>
        </div>

        {/* クラスター基本情報 */}
        <div style={{
          background: THEME_COLORS.bgTertiary,
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '20px',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '8px',
          }}>
            {isEditingClusterLabel ? (
              // 編集モード
              <>
                <input
                  type="text"
                  value={editingClusterText}
                  onChange={(e) => setEditingClusterText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSaveClusterLabel();
                    } else if (e.key === 'Escape') {
                      handleCancelEditClusterLabel();
                    }
                  }}
                  style={{
                    background: THEME_COLORS.bgPrimary,
                    border: `2px solid ${THEME_COLORS.primaryBlue}`,
                    borderRadius: '4px',
                    color: THEME_COLORS.textPrimary,
                    fontSize: '16px',
                    fontWeight: '600',
                    padding: '4px 8px',
                    outline: 'none',
                    flex: 1,
                    minWidth: '200px',
                  }}
                  autoFocus
                />
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    onClick={handleSaveClusterLabel}
                    style={{
                      background: THEME_COLORS.primaryGreen,
                      border: 'none',
                      borderRadius: '4px',
                      color: THEME_COLORS.textInverse,
                      padding: '4px 8px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: '500',
                    }}
                  >
                    ✓ 保存
                  </button>
                  <button
                    onClick={handleCancelEditClusterLabel}
                    style={{
                      background: THEME_COLORS.textMuted,
                      border: 'none',
                      borderRadius: '4px',
                      color: THEME_COLORS.textInverse,
                      padding: '4px 8px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: '500',
                    }}
                  >
                    ✕ キャンセル
                  </button>
                </div>
              </>
            ) : (
              // 表示モード
              <>
                <div style={{
                  color: THEME_COLORS.textPrimary,
                  fontSize: '16px',
                  fontWeight: '600',
                  flex: 1,
                }}>
                  {cluster.text}
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {onAISuggestion && (
                    <button
                      onClick={handleAILabelGeneration}
                      style={{
                        background: THEME_COLORS.primaryGreen,
                        border: 'none',
                        borderRadius: '4px',
                        color: THEME_COLORS.textInverse,
                        padding: '4px 8px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: '500',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        transition: 'all 0.2s ease',
                      }}
                      title="AI支援ラベル提案"
                    >
                      🤖 AI提案
                    </button>
                  )}
                                     <button
                     onClick={() => handleStartEditClusterLabel(cluster.text)}
                     style={{
                       background: 'transparent',
                       border: `1px solid ${THEME_COLORS.borderSecondary}`,
                       borderRadius: '4px',
                       color: THEME_COLORS.textSecondary,
                       padding: '4px 8px',
                       cursor: 'pointer',
                       fontSize: '12px',
                       fontWeight: '500',
                       display: 'flex',
                       alignItems: 'center',
                       gap: '4px',
                       transition: 'all 0.2s ease',
                     }}
                     onMouseEnter={(e) => {
                       e.currentTarget.style.borderColor = THEME_COLORS.primaryBlue;
                       e.currentTarget.style.color = THEME_COLORS.primaryBlue;
                     }}
                     onMouseLeave={(e) => {
                       e.currentTarget.style.borderColor = THEME_COLORS.borderSecondary;
                       e.currentTarget.style.color = THEME_COLORS.textSecondary;
                     }}
                   >
                     ✏️ 編集
                   </button>
                </div>
              </>
            )}
          </div>
          
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px',
            fontSize: '12px',
            color: THEME_COLORS.textSecondary,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>📊</span>
              <span>{clusterCards.length} カード</span>
            </div>
            {cluster.confidence && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span>🎯</span>
                <span>信頼度: {Math.round(cluster.confidence * 100)}%</span>
              </div>
            )}
            {cluster.theme && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span>🏷️</span>
                <span>テーマ: {cluster.theme}</span>
              </div>
            )}
          </div>

          {/* 統計情報 */}
          {cluster.metadata && (
            <div style={{
              marginTop: '12px',
              padding: '12px',
              background: THEME_COLORS.bgQuaternary,
              borderRadius: '6px',
              fontSize: '11px',
            }}>
              {cluster.metadata.dominantTags && (
                <div style={{ marginBottom: '6px' }}>
                  <span style={{ color: THEME_COLORS.textMuted }}>主要タグ: </span>
                  <span style={{ color: THEME_COLORS.primaryCyan }}>
                    {cluster.metadata.dominantTags.join(', ')}
                  </span>
                </div>
              )}
              {cluster.metadata.dominantTypes && (
                <div>
                  <span style={{ color: THEME_COLORS.textMuted }}>主要タイプ: </span>
                  <span style={{ color: THEME_COLORS.primaryOrange }}>
                    {cluster.metadata.dominantTypes.join(', ')}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* カード一覧 */}
        <div style={{
          color: THEME_COLORS.textPrimary,
          fontSize: '14px',
          fontWeight: '600',
          marginBottom: '12px',
        }}>
          含まれるカード
        </div>

        <div style={{
          maxHeight: '400px',
          overflowY: 'auto',
          border: `1px solid ${THEME_COLORS.borderSecondary}`,
          borderRadius: '8px',
          background: THEME_COLORS.bgTertiary,
        }}>
          {clusterCards.map((card, index) => (
            <div
              key={card.id}
              style={{
                padding: '12px 16px',
                borderBottom: index < clusterCards.length - 1 ? `1px solid ${THEME_COLORS.borderSecondary}` : 'none',
                cursor: 'pointer',
                transition: 'background 0.2s ease',
              }}
              onClick={() => {
                // カードクリック時はノード詳細表示に切り替え
                if (onNodeSelect) {
                  onNodeSelect(card.id);
                  onClose();
                }
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = THEME_COLORS.bgQuaternary;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'transparent';
              }}
            >
              <div style={{
                color: THEME_COLORS.textPrimary,
                fontSize: '13px',
                fontWeight: '600',
                marginBottom: '4px',
              }}>
                {card.title}
              </div>
              
              <div style={{
                color: THEME_COLORS.textSecondary,
                fontSize: '11px',
                lineHeight: '1.4',
                marginBottom: '6px',
              }}>
                {card.content && card.content.length > 100 ? 
                  `${card.content.substring(0, 100)}...` : 
                  card.content || ''
                }
              </div>

              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '6px',
                alignItems: 'center',
              }}>
                {/* カードタイプ */}
                <span style={{
                  background: THEME_COLORS.primaryPurple,
                  color: THEME_COLORS.textInverse,
                  padding: '2px 6px',
                  borderRadius: '3px',
                  fontSize: '9px',
                  fontWeight: '600',
                }}>
                  {card.column_type || 'INSIGHTS'}
                </span>

                {/* 接続数（仮の値） */}
                <span style={{
                  color: THEME_COLORS.textMuted,
                  fontSize: '9px',
                }}>
                  {Math.floor(Math.random() * 5) + 1} connections
                </span>

                {/* タグ */}
                {card.tags && card.tags.length > 0 && (
                  <div style={{
                    display: 'flex',
                    gap: '3px',
                    flexWrap: 'wrap',
                  }}>
                    {card.tags.slice(0, 3).map(tag => (
                      <span
                        key={tag}
                        style={{
                          background: THEME_COLORS.primaryCyan,
                          color: THEME_COLORS.textInverse,
                          padding: '1px 4px',
                          borderRadius: '2px',
                          fontSize: '8px',
                          fontWeight: '500',
                        }}
                      >
                        #{tag}
                      </span>
                    ))}
                    {card.tags.length > 3 && (
                      <span style={{
                        color: THEME_COLORS.textMuted,
                        fontSize: '8px',
                      }}>
                        +{card.tags.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* アクションボタン */}
        <div style={{
          display: 'flex',
          gap: '12px',
          marginTop: '20px',
          justifyContent: 'flex-end',
        }}>
          <button
            style={{
              background: THEME_COLORS.bgQuaternary,
              color: THEME_COLORS.textSecondary,
              border: `1px solid ${THEME_COLORS.borderSecondary}`,
              borderRadius: '6px',
              padding: '8px 16px',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onClick={onClose}
            onMouseEnter={(e) => {
              const target = e.currentTarget as HTMLElement;
              target.style.background = THEME_COLORS.bgTertiary;
            }}
            onMouseLeave={(e) => {
              const target = e.currentTarget as HTMLElement;
              target.style.background = THEME_COLORS.bgQuaternary;
            }}
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClusterDetailModal;
