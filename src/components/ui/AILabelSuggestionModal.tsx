import React, { useState, useEffect } from 'react';
import { AILabelingSuggestion, AILabelingService } from '../../services/ai/AILabelingService';
import { BoardItem } from '../../services/SmartClusteringService';
import { THEME_COLORS } from '../../constants/theme';

interface AILabelSuggestionModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSelectLabel: (label: string) => void;
  cards: BoardItem[];
  clusterId: string;
  currentLabel: string;
  userId?: string;
}

const AILabelSuggestionModal: React.FC<AILabelSuggestionModalProps> = ({
  isVisible,
  onClose,
  onSelectLabel,
  cards,
  clusterId,
  currentLabel,
  userId
}) => {
  const [suggestions, setSuggestions] = useState<AILabelingSuggestion | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAlternative, setSelectedAlternative] = useState<string>('');
  const [customLabel, setCustomLabel] = useState<string>('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  useEffect(() => {
    // デバッグログ削除（パフォーマンス向上のため無効化）
    // console.log('🎯 [AILabelSuggestionModal] useEffect triggered');
    // console.log('🎯 [AILabelSuggestionModal] isVisible:', isVisible);
    // console.log('🎯 [AILabelSuggestionModal] cards.length:', cards.length);
    // console.log('🎯 [AILabelSuggestionModal] clusterId:', clusterId);
    
    if (isVisible && cards.length > 0) {
      // console.log('🎯 [AILabelSuggestionModal] 条件を満たすため、AI提案生成を開始');
      generateSuggestions();
    } else {
      // console.log('🎯 [AILabelSuggestionModal] 条件を満たさないため、AI提案生成をスキップ');
    }
  }, [isVisible, cards, clusterId]);

  const generateSuggestions = async () => {
    // console.log('🎯 [AILabelSuggestionModal] === generateSuggestions開始 ===');
    setIsLoading(true);
    try {
      const result = await AILabelingService.generateAILabelSuggestions(
        cards,
        clusterId,
        userId,
        {
          use_ai_enhancement: true,
          include_alternatives: true,
          learn_from_history: true,
          generate_detailed_reasoning: true,
          preferred_style: 'descriptive',
          min_confidence_threshold: 0.6
        }
      );
      console.log('🎯 [AILabelSuggestionModal] AI提案生成完了:', result);
      setSuggestions(result);
    } catch (error) {
      console.error('🎯 [AILabelSuggestionModal] AI提案生成エラー:', error);
      
      // APIキーエラーの場合は明確なメッセージを設定
      if (error instanceof Error && error.message === 'AI_API_KEY_REQUIRED') {
        setSuggestions({
          primary: 'APIキーが未設定',
          alternatives: [],
          confidence: 0,
          reasoning: 'AI提案機能を使用するには、OpenAIまたはGemini APIキーの設定が必要です',
          generation_method: 'statistical',
          keywords: []
        });
      } else {
        setSuggestions({
          primary: 'エラーが発生しました',
          alternatives: [],
          confidence: 0,
          reasoning: 'AI提案の生成中にエラーが発生しました。しばらく後に再試行してください',
          generation_method: 'statistical',
          keywords: []
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectLabel = async (label: string) => {
    // ユーザーの選択を学習データとして保存
    if (userId && label !== currentLabel) {
      await AILabelingService.saveUserLabelEdit(
        userId,
        currentLabel,
        label,
        {
          card_count: cards.length,
          dominant_tags: cards.flatMap(c => c.tags || []).slice(0, 3),
          theme: 'general'
        }
      );
    }
    
    onSelectLabel(label);
    onClose();
  };

  const handleCustomSubmit = () => {
    if (customLabel.trim()) {
      handleSelectLabel(customLabel.trim());
    }
  };

  if (!isVisible) {
    console.log('🎯 [AILabelSuggestionModal] モーダル非表示のためrenderをスキップ');
    return null;
  }

  console.log('🎯 [AILabelSuggestionModal] モーダルをレンダリング中...');

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
        maxWidth: '600px',
        maxHeight: '80vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* ヘッダー */}
        <div style={{
          padding: '20px',
          borderBottom: `1px solid ${THEME_COLORS.borderPrimary}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <h2 style={{
              color: THEME_COLORS.textPrimary,
              fontSize: '18px',
              fontWeight: '600',
              margin: 0,
              fontFamily: 'JetBrains Mono, monospace',
            }}>
              🤖 AI支援ラベル提案
            </h2>
            <p style={{
              color: THEME_COLORS.textMuted,
              fontSize: '12px',
              margin: '4px 0 0 0',
            }}>
              {cards.length}個のカードを分析してラベル候補を生成
            </p>
          </div>
          <button
            style={{
              background: 'transparent',
              border: 'none',
              color: THEME_COLORS.textMuted,
              fontSize: '20px',
              cursor: 'pointer',
              padding: '0',
              width: '24px',
              height: '24px',
            }}
            onClick={onClose}
          >
            ×
          </button>
        </div>

        {/* コンテンツ */}
        <div style={{
          padding: '20px',
          overflowY: 'auto',
          flex: 1,
        }}>
          {isLoading ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '40px 20px',
            }}>
              <div style={{
                color: THEME_COLORS.primaryGreen,
                fontSize: '14px',
                marginBottom: '12px',
              }}>
                🧠 AI分析中...
              </div>
              <div style={{
                width: '200px',
                height: '4px',
                backgroundColor: THEME_COLORS.bgTertiary,
                borderRadius: '2px',
                overflow: 'hidden',
              }}>
                <div style={{
                  width: '100%',
                  height: '100%',
                  background: `linear-gradient(90deg, ${THEME_COLORS.primaryGreen} 0%, ${THEME_COLORS.primaryBlue} 100%)`,
                  animation: 'loading 2s linear infinite',
                  transform: 'translateX(-100%)',
                }} />
              </div>
            </div>
          ) : suggestions ? (
            <>
              {/* メイン提案 */}
              <div style={{
                backgroundColor: THEME_COLORS.bgTertiary,
                border: `2px solid ${THEME_COLORS.primaryGreen}`,
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '16px',
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '8px',
                }}>
                  <div style={{
                    color: THEME_COLORS.primaryGreen,
                    fontSize: '12px',
                    fontWeight: '600',
                    fontFamily: 'JetBrains Mono, monospace',
                  }}>
                    🏆 推奨ラベル (信頼度: {Math.round(suggestions.confidence * 100)}%)
                  </div>
                  <div style={{
                    fontSize: '10px',
                    color: THEME_COLORS.textMuted,
                    backgroundColor: THEME_COLORS.bgQuaternary,
                    padding: '2px 6px',
                    borderRadius: '4px',
                  }}>
                    {suggestions.generation_method === 'ai_enhanced' ? 'AI強化' : '統計分析'}
                  </div>
                </div>
                
                <button
                  style={{
                    background: 'transparent',
                    border: `1px solid ${THEME_COLORS.primaryGreen}`,
                    borderRadius: '6px',
                    color: THEME_COLORS.textPrimary,
                    padding: '8px 12px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    width: '100%',
                    marginBottom: '8px',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = THEME_COLORS.primaryGreen;
                    e.currentTarget.style.color = THEME_COLORS.textInverse;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = THEME_COLORS.textPrimary;
                  }}
                  onClick={() => handleSelectLabel(suggestions.primary)}
                >
                  {suggestions.primary}
                </button>
                
                <div style={{
                  color: THEME_COLORS.textSecondary,
                  fontSize: '11px',
                  lineHeight: '1.4',
                }}>
                  💡 {suggestions.reasoning}
                </div>
              </div>

              {/* 代替案 */}
              {suggestions.alternatives.length > 0 && (
                <div style={{
                  marginBottom: '16px',
                }}>
                  <div style={{
                    color: THEME_COLORS.textMuted,
                    fontSize: '12px',
                    fontWeight: '600',
                    marginBottom: '8px',
                    fontFamily: 'JetBrains Mono, monospace',
                  }}>
                    🔄 代替案
                  </div>
                  
                  {suggestions.alternatives.map((alt, index) => (
                    <button
                      key={index}
                      style={{
                        background: selectedAlternative === alt 
                          ? THEME_COLORS.primaryBlue 
                          : 'transparent',
                        border: `1px solid ${THEME_COLORS.borderSecondary}`,
                        borderRadius: '6px',
                        color: selectedAlternative === alt 
                          ? THEME_COLORS.textInverse 
                          : THEME_COLORS.textSecondary,
                        padding: '8px 12px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        width: '100%',
                        marginBottom: '4px',
                        textAlign: 'left',
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        if (selectedAlternative !== alt) {
                          e.currentTarget.style.borderColor = THEME_COLORS.primaryBlue;
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedAlternative !== alt) {
                          e.currentTarget.style.borderColor = THEME_COLORS.borderSecondary;
                        }
                      }}
                      onClick={() => {
                        setSelectedAlternative(alt);
                        handleSelectLabel(alt);
                      }}
                    >
                      {alt}
                    </button>
                  ))}
                </div>
              )}

              {/* キーワード情報 */}
              {suggestions.keywords.length > 0 && (
                <div style={{
                  marginBottom: '16px',
                }}>
                  <div style={{
                    color: THEME_COLORS.textMuted,
                    fontSize: '12px',
                    fontWeight: '600',
                    marginBottom: '8px',
                    fontFamily: 'JetBrains Mono, monospace',
                  }}>
                    🔍 抽出キーワード
                  </div>
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '6px',
                  }}>
                    {suggestions.keywords.map((keyword, index) => (
                      <span
                        key={index}
                        style={{
                          backgroundColor: THEME_COLORS.bgQuaternary,
                          color: THEME_COLORS.textSecondary,
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '10px',
                          border: `1px solid ${THEME_COLORS.borderSecondary}`,
                        }}
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* カスタム入力 */}
              <div>
                <button
                  style={{
                    background: 'transparent',
                    border: `1px dashed ${THEME_COLORS.borderSecondary}`,
                    borderRadius: '6px',
                    color: THEME_COLORS.textMuted,
                    padding: '8px 12px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    width: '100%',
                    marginBottom: showCustomInput ? '8px' : '0',
                  }}
                  onClick={() => setShowCustomInput(!showCustomInput)}
                >
                  ✏️ カスタムラベルを入力
                </button>

                {showCustomInput && (
                  <div>
                    <input
                      type="text"
                      value={customLabel}
                      onChange={(e) => setCustomLabel(e.target.value)}
                      placeholder="独自のラベルを入力..."
                      style={{
                        width: '100%',
                        background: THEME_COLORS.bgPrimary,
                        border: `1px solid ${THEME_COLORS.borderPrimary}`,
                        borderRadius: '4px',
                        color: THEME_COLORS.textPrimary,
                        padding: '8px',
                        fontSize: '12px',
                        marginBottom: '8px',
                        outline: 'none',
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleCustomSubmit();
                        } else if (e.key === 'Escape') {
                          setShowCustomInput(false);
                          setCustomLabel('');
                        }
                      }}
                      autoFocus
                    />
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        style={{
                          background: THEME_COLORS.primaryGreen,
                          border: 'none',
                          borderRadius: '4px',
                          color: THEME_COLORS.textInverse,
                          padding: '6px 12px',
                          fontSize: '11px',
                          cursor: 'pointer',
                          flex: 1,
                        }}
                        onClick={handleCustomSubmit}
                        disabled={!customLabel.trim()}
                      >
                        適用
                      </button>
                      <button
                        style={{
                          background: THEME_COLORS.textMuted,
                          border: 'none',
                          borderRadius: '4px',
                          color: THEME_COLORS.textInverse,
                          padding: '6px 12px',
                          fontSize: '11px',
                          cursor: 'pointer',
                          flex: 1,
                        }}
                        onClick={() => {
                          setShowCustomInput(false);
                          setCustomLabel('');
                        }}
                      >
                        キャンセル
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '40px 20px',
              color: THEME_COLORS.textMuted,
            }}>
              AI提案の生成に失敗しました
            </div>
          )}
        </div>
      </div>

      <style>
        {`
          @keyframes loading {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
        `}
      </style>
    </div>
  );
};

export default AILabelSuggestionModal;
