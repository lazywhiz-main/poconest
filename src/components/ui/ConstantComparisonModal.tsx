import React, { useState, useCallback, useEffect } from 'react';
import { THEME_COLORS } from '../../constants/theme';

// 定数比較法の型定義
interface ConstantComparisonState {
  comparisonCriteria: {
    conceptSimilarity: number;        // 概念の類似性閾値
    relationshipStrength: number;     // 関係性の強度閾値
    categoryCoherence: number;        // カテゴリの一貫性閾値
  };
  comparisonStrategy: {
    method: 'open_coding' | 'axial_coding' | 'selective_coding';
    focus: 'concept_development' | 'relationship_mapping' | 'category_integration';
    comparisonType: 'incident_to_incident' | 'concept_to_concept' | 'category_to_category';
  };
  comparisonProgress: {
    currentRound: number;
    totalComparisons: number;
    conceptsCompared: number;
    relationshipsIdentified: number;
    categoriesFormed: number;
    theoreticalIntegration: number;
  };
  comparisonResults: {
    conceptClusters: Array<{
      id: string;
      name: string;
      concepts: string[];
      coherence: number;
      relationships: string[];
    }>;
    relationshipPatterns: Array<{
      id: string;
      type: string;
      strength: number;
      concepts: string[];
      evidence: string[];
    }>;
    theoreticalFramework: {
      coreCategory: string;
      supportingCategories: string[];
      integrationLevel: number;
      gaps: string[];
    };
  };
}

interface ConstantComparisonModalProps {
  isVisible: boolean;
  onClose: () => void;
  currentAnalysisData?: any; // 現在の分析データ
  boardId: string;
  nestId: string;
}

/**
 * 🔄 定数比較法検証モーダル
 * 既存のUIを壊さずに定数比較法の機能を検証
 */
export const ConstantComparisonModal: React.FC<ConstantComparisonModalProps> = ({
  isVisible,
  onClose,
  currentAnalysisData,
  boardId,
  nestId
}) => {
  const [activeTab, setActiveTab] = useState<'criteria' | 'strategy' | 'progress' | 'results'>('criteria');
  const [comparisonState, setComparisonState] = useState<ConstantComparisonState>({
    comparisonCriteria: {
      conceptSimilarity: 0.7,        // 70%以上で類似
      relationshipStrength: 0.6,     // 60%以上で関係性あり
      categoryCoherence: 0.8         // 80%以上で一貫性あり
    },
    comparisonStrategy: {
      method: 'open_coding',
      focus: 'concept_development',
      comparisonType: 'incident_to_incident'
    },
    comparisonProgress: {
      currentRound: 1,
      totalComparisons: 25,
      conceptsCompared: 18,
      relationshipsIdentified: 12,
      categoriesFormed: 6,
      theoreticalIntegration: 0.65
    },
    comparisonResults: {
      conceptClusters: [
        {
          id: 'cluster1',
          name: 'コミュニケーション',
          concepts: ['対話', '共有', '理解', '協調'],
          coherence: 0.85,
          relationships: ['促進', '強化', '改善']
        },
        {
          id: 'cluster2',
          name: '学習',
          concepts: ['知識', 'スキル', '成長', '発展'],
          coherence: 0.78,
          relationships: ['促進', '支援', '評価']
        }
      ],
      relationshipPatterns: [
        {
          id: 'rel1',
          type: '因果関係',
          strength: 0.75,
          concepts: ['コミュニケーション', '学習'],
          evidence: ['対話による知識共有', '協調学習の効果']
        },
        {
          id: 'rel2',
          type: '相互依存',
          strength: 0.68,
          concepts: ['理解', '成長'],
          evidence: ['理解の深化による成長', '成長による理解の向上']
        }
      ],
      theoreticalFramework: {
        coreCategory: '相互学習システム',
        supportingCategories: ['コミュニケーション基盤', '学習促進要因', '成長支援メカニズム'],
        integrationLevel: 0.72,
        gaps: ['長期効果の測定', '個別要因の分離', '外部要因の影響']
      }
    }
  });

  // 比較基準の更新
  const updateComparisonCriteria = useCallback((updates: Partial<ConstantComparisonState['comparisonCriteria']>) => {
    setComparisonState(prev => ({
      ...prev,
      comparisonCriteria: { ...prev.comparisonCriteria, ...updates }
    }));
  }, []);

  // 比較戦略の更新
  const updateComparisonStrategy = useCallback((updates: Partial<ConstantComparisonState['comparisonStrategy']>) => {
    setComparisonState(prev => ({
      ...prev,
      comparisonStrategy: { ...prev.comparisonStrategy, ...updates }
    }));
  }, []);

  // 概念比較の実行
  const executeConceptComparison = useCallback(() => {
    const { comparisonCriteria, comparisonProgress } = comparisonState;
    
    // 概念比較のシミュレーション
    const newConceptsCompared = Math.min(comparisonProgress.conceptsCompared + 3, comparisonProgress.totalComparisons);
    const newRelationships = Math.min(comparisonProgress.relationshipsIdentified + 2, newConceptsCompared);
    const newCategories = Math.min(comparisonProgress.categoriesFormed + 1, 8);
    
    // 理論的統合レベルの計算
    const integrationLevel = (
      (newConceptsCompared / comparisonProgress.totalComparisons) * 0.4 +
      (newRelationships / newConceptsCompared) * 0.3 +
      (newCategories / 8) * 0.3
    );
    
    setComparisonState(prev => ({
      ...prev,
      comparisonProgress: {
        ...prev.comparisonProgress,
        currentRound: prev.comparisonProgress.currentRound + 1,
        conceptsCompared: newConceptsCompared,
        relationshipsIdentified: newRelationships,
        categoriesFormed: newCategories,
        theoreticalIntegration: integrationLevel
      }
    }));
  }, [comparisonState]);

  // 初期化
  useEffect(() => {
    if (isVisible) {
      // 初期データの設定
    }
  }, [isVisible]);

  if (!isVisible) return null;

  const renderCriteriaTab = () => (
    <div>
      <h3 style={{
        margin: '0 0 20px 0',
        fontSize: '18px',
        fontWeight: '600',
        color: THEME_COLORS.textPrimary
      }}>
        📊 比較基準の設定
      </h3>
      
      {/* 比較基準の設定 */}
      <div style={{ marginBottom: '24px' }}>
        <h4 style={{
          margin: '0 0 16px 0',
          fontSize: '16px',
          fontWeight: '600',
          color: THEME_COLORS.textPrimary
        }}>
          🎯 比較基準の調整
        </h4>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '16px'
        }}>
          <div>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: '500',
              color: THEME_COLORS.textPrimary
            }}>
              概念類似性閾値
            </label>
            <input
              type="range"
              min="0.5"
              max="0.9"
              step="0.05"
              value={comparisonState.comparisonCriteria.conceptSimilarity}
              onChange={(e) => updateComparisonCriteria({ 
                conceptSimilarity: parseFloat(e.target.value) 
              })}
              style={{
                width: '100%',
                height: '6px',
                borderRadius: '3px',
                background: THEME_COLORS.bgTertiary,
                outline: 'none'
              }}
            />
            <div style={{
              fontSize: '12px',
              color: THEME_COLORS.textSecondary,
              marginTop: '4px'
            }}>
              {(comparisonState.comparisonCriteria.conceptSimilarity * 100).toFixed(0)}%
            </div>
          </div>
          
          <div>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: '500',
              color: THEME_COLORS.textPrimary
            }}>
              関係性強度閾値
            </label>
            <input
              type="range"
              min="0.4"
              max="0.8"
              step="0.05"
              value={comparisonState.comparisonCriteria.relationshipStrength}
              onChange={(e) => updateComparisonCriteria({ 
                relationshipStrength: parseFloat(e.target.value) 
              })}
              style={{
                width: '100%',
                height: '6px',
                borderRadius: '3px',
                background: THEME_COLORS.bgTertiary,
                outline: 'none'
              }}
            />
            <div style={{
              fontSize: '12px',
              color: THEME_COLORS.textSecondary,
              marginTop: '4px'
            }}>
              {(comparisonState.comparisonCriteria.relationshipStrength * 100).toFixed(0)}%
            </div>
          </div>
          
          <div>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: '500',
              color: THEME_COLORS.textPrimary
            }}>
              カテゴリ一貫性閾値
            </label>
            <input
              type="range"
              min="0.6"
              max="0.95"
              step="0.05"
              value={comparisonState.comparisonCriteria.categoryCoherence}
              onChange={(e) => updateComparisonCriteria({ 
                categoryCoherence: parseFloat(e.target.value) 
              })}
              style={{
                width: '100%',
                height: '6px',
                borderRadius: '3px',
                background: THEME_COLORS.bgTertiary,
                outline: 'none'
              }}
            />
            <div style={{
              fontSize: '12px',
              color: THEME_COLORS.textSecondary,
              marginTop: '4px'
            }}>
              {(comparisonState.comparisonCriteria.categoryCoherence * 100).toFixed(0)}%
            </div>
          </div>
        </div>
      </div>
      
      {/* 現在の基準での分析結果 */}
      <div style={{
        padding: '20px',
        backgroundColor: THEME_COLORS.bgQuaternary,
        borderRadius: '12px',
        border: `1px solid ${THEME_COLORS.borderSecondary}`
      }}>
        <h4 style={{
          margin: '0 0 16px 0',
          fontSize: '16px',
          fontWeight: '600',
          color: THEME_COLORS.textPrimary
        }}>
          📈 現在の基準での分析結果
        </h4>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '16px'
        }}>
          <div style={{
            textAlign: 'center',
            padding: '16px',
            backgroundColor: THEME_COLORS.bgTertiary,
            borderRadius: '8px'
          }}>
            <div style={{
              fontSize: '24px',
              fontWeight: '700',
              color: THEME_COLORS.primaryBlue,
              marginBottom: '8px'
            }}>
              {comparisonState.comparisonResults.conceptClusters.length}
            </div>
            <div style={{
              fontSize: '14px',
              fontWeight: '600',
              color: THEME_COLORS.textPrimary
            }}>
              概念クラスター
            </div>
          </div>
          
          <div style={{
            textAlign: 'center',
            padding: '16px',
            backgroundColor: THEME_COLORS.bgTertiary,
            borderRadius: '8px'
          }}>
            <div style={{
              fontSize: '24px',
              fontWeight: '700',
              color: THEME_COLORS.primaryGreen,
              marginBottom: '8px'
            }}>
              {comparisonState.comparisonResults.relationshipPatterns.length}
            </div>
            <div style={{
              fontSize: '14px',
              fontWeight: '600',
              color: THEME_COLORS.textPrimary
            }}>
              関係性パターン
            </div>
          </div>
          
          <div style={{
            textAlign: 'center',
            padding: '16px',
            backgroundColor: THEME_COLORS.bgTertiary,
            borderRadius: '8px'
          }}>
            <div style={{
              fontSize: '24px',
              fontWeight: '700',
              color: THEME_COLORS.primaryPurple,
              marginBottom: '8px'
            }}>
              {(comparisonState.comparisonResults.theoreticalFramework.integrationLevel * 100).toFixed(0)}%
            </div>
            <div style={{
              fontSize: '14px',
              fontWeight: '600',
              color: THEME_COLORS.textPrimary
            }}>
              統合レベル
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStrategyTab = () => (
    <div>
      <h3 style={{
        margin: '0 0 20px 0',
        fontSize: '18px',
        fontWeight: '600',
        color: THEME_COLORS.textPrimary
      }}>
        🎯 比較戦略の設定
      </h3>
      
      {/* 比較手法 */}
      <div style={{ marginBottom: '24px' }}>
        <h4 style={{
          margin: '0 0 16px 0',
          fontSize: '16px',
          fontWeight: '600',
          color: THEME_COLORS.textPrimary
        }}>
          🔄 比較手法の選択
        </h4>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '12px'
        }}>
          {[
            { key: 'open_coding', label: 'オープンコーディング', description: '概念の自由な比較と分類' },
            { key: 'axial_coding', label: 'アキシャルコーディング', description: '関係性の体系的比較' },
            { key: 'selective_coding', label: 'セレクティブコーディング', description: '理論的統合の比較' }
          ].map(method => (
            <button
              key={method.key}
              style={{
                padding: '16px',
                border: `2px solid ${comparisonState.comparisonStrategy.method === method.key 
                  ? THEME_COLORS.primaryBlue 
                  : THEME_COLORS.borderSecondary}`,
                borderRadius: '8px',
                backgroundColor: comparisonState.comparisonStrategy.method === method.key 
                  ? THEME_COLORS.primaryBlue + '20' 
                  : THEME_COLORS.bgTertiary,
                cursor: 'pointer',
                transition: 'all 0.2s',
                textAlign: 'left'
              }}
              onClick={() => updateComparisonStrategy({ method: method.key as any })}
            >
              <div style={{
                fontSize: '14px',
                fontWeight: '600',
                color: comparisonState.comparisonStrategy.method === method.key 
                  ? THEME_COLORS.primaryBlue 
                  : THEME_COLORS.textPrimary,
                marginBottom: '4px'
              }}>
                {method.label}
              </div>
              <div style={{
                fontSize: '12px',
                color: comparisonState.comparisonStrategy.method === method.key 
                  ? THEME_COLORS.primaryBlue 
                  : THEME_COLORS.textPrimary,
                lineHeight: '1.4'
              }}>
                {method.description}
              </div>
            </button>
          ))}
        </div>
      </div>
      
      {/* 比較焦点 */}
      <div style={{ marginBottom: '24px' }}>
        <h4 style={{
          margin: '0 0 16px 0',
          fontSize: '16px',
          fontWeight: '600',
          color: THEME_COLORS.textPrimary
        }}>
          🎯 比較焦点の設定
        </h4>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '12px'
        }}>
          {[
            { key: 'concept_development', label: '概念開発', description: '概念の精緻化と統合' },
            { key: 'relationship_mapping', label: '関係性マッピング', description: '関係性の体系的把握' },
            { key: 'category_integration', label: 'カテゴリ統合', description: '理論的統合の促進' }
          ].map(focus => (
            <button
              key={focus.key}
              style={{
                padding: '16px',
                border: `2px solid ${comparisonState.comparisonStrategy.focus === focus.key 
                  ? THEME_COLORS.primaryGreen 
                  : THEME_COLORS.borderSecondary}`,
                borderRadius: '8px',
                backgroundColor: comparisonState.comparisonStrategy.focus === focus.key 
                  ? THEME_COLORS.primaryGreen + '20' 
                  : THEME_COLORS.bgTertiary,
                cursor: 'pointer',
                transition: 'all 0.2s',
                textAlign: 'left'
              }}
              onClick={() => updateComparisonStrategy({ focus: focus.key as any })}
            >
              <div style={{
                fontSize: '14px',
                fontWeight: '600',
                color: comparisonState.comparisonStrategy.focus === focus.key 
                  ? THEME_COLORS.primaryGreen 
                  : THEME_COLORS.textPrimary,
                marginBottom: '4px'
              }}>
                {focus.label}
              </div>
              <div style={{
                fontSize: '12px',
                color: comparisonState.comparisonStrategy.focus === focus.key 
                  ? THEME_COLORS.primaryGreen 
                  : THEME_COLORS.textPrimary,
                lineHeight: '1.4'
              }}>
                {focus.description}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderProgressTab = () => (
    <div>
      <h3 style={{
        margin: '0 0 20px 0',
        fontSize: '18px',
        fontWeight: '600',
        color: THEME_COLORS.textPrimary
      }}>
        📈 比較進捗の管理
      </h3>
      
      {/* 進捗概要 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div style={{
          padding: '20px',
          backgroundColor: THEME_COLORS.bgQuaternary,
          borderRadius: '12px',
          border: `1px solid ${THEME_COLORS.borderSecondary}`,
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: '32px',
            fontWeight: '700',
            color: THEME_COLORS.primaryBlue,
            marginBottom: '8px'
          }}>
            {comparisonState.comparisonProgress.currentRound}
          </div>
          <div style={{
            fontSize: '14px',
            fontWeight: '600',
            color: THEME_COLORS.textPrimary,
            marginBottom: '4px'
          }}>
            現在のラウンド
          </div>
        </div>
        
        <div style={{
          padding: '20px',
          backgroundColor: THEME_COLORS.bgQuaternary,
          borderRadius: '12px',
          border: `1px solid ${THEME_COLORS.borderSecondary}`,
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: '32px',
            fontWeight: '700',
            color: THEME_COLORS.primaryGreen,
            marginBottom: '8px'
          }}>
            {comparisonState.comparisonProgress.conceptsCompared}
          </div>
          <div style={{
            fontSize: '14px',
            fontWeight: '600',
            color: THEME_COLORS.textPrimary,
            marginBottom: '4px'
          }}>
            比較済み概念
          </div>
          <div style={{
            fontSize: '12px',
            color: THEME_COLORS.textSecondary
          }}>
            全{comparisonState.comparisonProgress.totalComparisons}中
          </div>
        </div>
        
        <div style={{
          padding: '20px',
          backgroundColor: THEME_COLORS.bgQuaternary,
          borderRadius: '12px',
          border: `1px solid ${THEME_COLORS.borderSecondary}`,
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: '32px',
            fontWeight: '700',
            color: THEME_COLORS.primaryPurple,
            marginBottom: '8px'
          }}>
            {comparisonState.comparisonProgress.relationshipsIdentified}
          </div>
          <div style={{
            fontSize: '14px',
            fontWeight: '600',
            color: THEME_COLORS.textPrimary,
            marginBottom: '4px'
          }}>
            特定された関係性
          </div>
        </div>
        
        <div style={{
          padding: '20px',
          backgroundColor: THEME_COLORS.bgQuaternary,
          borderRadius: '12px',
          border: `1px solid ${THEME_COLORS.borderSecondary}`,
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: '32px',
            fontWeight: '700',
            color: THEME_COLORS.primaryOrange,
            marginBottom: '8px'
          }}>
            {comparisonState.comparisonProgress.categoriesFormed}
          </div>
          <div style={{
            fontSize: '14px',
            fontWeight: '600',
            color: THEME_COLORS.textPrimary,
            marginBottom: '4px'
          }}>
            形成されたカテゴリ
          </div>
        </div>
      </div>
      
      {/* 次の比較実行 */}
      <div style={{
        padding: '20px',
        backgroundColor: THEME_COLORS.bgTertiary,
        borderRadius: '12px',
        border: `1px solid ${THEME_COLORS.borderSecondary}`,
        textAlign: 'center'
      }}>
        <h4 style={{
          margin: '0 0 16px 0',
          fontSize: '16px',
          fontWeight: '600',
          color: THEME_COLORS.textPrimary
        }}>
          🚀 次の比較ラウンドを実行
        </h4>
        
        <div style={{
          fontSize: '14px',
          color: THEME_COLORS.textSecondary,
          marginBottom: '20px',
          lineHeight: '1.5'
        }}>
          現在の戦略: {comparisonState.comparisonStrategy.method === 'open_coding' ? 'オープンコーディング' :
                       comparisonState.comparisonStrategy.method === 'axial_coding' ? 'アキシャルコーディング' : 'セレクティブコーディング'} 
          + {comparisonState.comparisonStrategy.focus === 'concept_development' ? '概念開発' :
              comparisonState.comparisonStrategy.focus === 'relationship_mapping' ? '関係性マッピング' : 'カテゴリ統合'}
        </div>
        
        <button
          onClick={executeConceptComparison}
          disabled={comparisonState.comparisonProgress.conceptsCompared >= comparisonState.comparisonProgress.totalComparisons}
          style={{
            padding: '12px 24px',
            backgroundColor: comparisonState.comparisonProgress.conceptsCompared >= comparisonState.comparisonProgress.totalComparisons
              ? THEME_COLORS.textMuted
              : THEME_COLORS.primaryBlue,
            color: THEME_COLORS.textInverse,
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: comparisonState.comparisonProgress.conceptsCompared >= comparisonState.comparisonProgress.totalComparisons
              ? 'not-allowed'
              : 'pointer',
            transition: 'all 0.2s'
          }}
        >
          {comparisonState.comparisonProgress.conceptsCompared >= comparisonState.comparisonProgress.totalComparisons
            ? '✅ 比較完了'
            : '🔄 次のラウンドを実行'
          }
        </button>
      </div>
    </div>
  );

  const renderResultsTab = () => (
    <div>
      <h3 style={{
        margin: '0 0 20px 0',
        fontSize: '18px',
        fontWeight: '600',
        color: THEME_COLORS.textPrimary
      }}>
        📊 比較結果の分析
      </h3>
      
      {/* 概念クラスター */}
      <div style={{ marginBottom: '24px' }}>
        <h4 style={{
          margin: '0 0 16px 0',
          fontSize: '16px',
          fontWeight: '600',
          color: THEME_COLORS.textPrimary
        }}>
          🎯 概念クラスター
        </h4>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '16px'
        }}>
          {comparisonState.comparisonResults.conceptClusters.map(cluster => (
            <div
              key={cluster.id}
              style={{
                padding: '20px',
                backgroundColor: THEME_COLORS.bgQuaternary,
                borderRadius: '12px',
                border: `1px solid ${THEME_COLORS.borderSecondary}`
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '16px'
              }}>
                <h5 style={{
                  margin: 0,
                  fontSize: '16px',
                  fontWeight: '600',
                  color: THEME_COLORS.textPrimary
                }}>
                  {cluster.name}
                </h5>
                <div style={{
                  padding: '4px 8px',
                  backgroundColor: THEME_COLORS.primaryGreen + '20',
                  color: THEME_COLORS.primaryGreen,
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: '600'
                }}>
                  {(cluster.coherence * 100).toFixed(0)}% 一貫性
                </div>
              </div>
              
              <div style={{ marginBottom: '12px' }}>
                <div style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: THEME_COLORS.textPrimary,
                  marginBottom: '8px'
                }}>
                  概念:
                </div>
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '8px'
                }}>
                  {cluster.concepts.map(concept => (
                    <span
                      key={concept}
                      style={{
                        padding: '4px 8px',
                        backgroundColor: THEME_COLORS.bgTertiary,
                        color: THEME_COLORS.textPrimary,
                        borderRadius: '4px',
                        fontSize: '12px'
                      }}
                    >
                      {concept}
                    </span>
                  ))}
                </div>
              </div>
              
              <div>
                <div style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: THEME_COLORS.textPrimary,
                  marginBottom: '8px'
                }}>
                  関係性:
                </div>
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '8px'
                }}>
                  {cluster.relationships.map(rel => (
                    <span
                      key={rel}
                      style={{
                        padding: '4px 8px',
                        backgroundColor: THEME_COLORS.primaryBlue + '20',
                        color: THEME_COLORS.primaryBlue,
                        borderRadius: '4px',
                        fontSize: '12px'
                      }}
                    >
                      {rel}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* 理論的統合フレームワーク */}
      <div style={{
        padding: '20px',
        backgroundColor: THEME_COLORS.bgTertiary,
        borderRadius: '12px',
        border: `1px solid ${THEME_COLORS.borderSecondary}`
      }}>
        <h4 style={{
          margin: '0 0 16px 0',
          fontSize: '16px',
          fontWeight: '600',
          color: THEME_COLORS.textPrimary
        }}>
          🏗️ 理論的統合フレームワーク
        </h4>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '20px'
        }}>
          <div>
            <h5 style={{
              margin: '0 0 12px 0',
              fontSize: '14px',
              fontWeight: '600',
              color: THEME_COLORS.textPrimary
            }}>
              コアカテゴリ
            </h5>
            <div style={{
              fontSize: '18px',
              fontWeight: '700',
              color: THEME_COLORS.primaryBlue,
              marginBottom: '8px'
            }}>
              {comparisonState.comparisonResults.theoreticalFramework.coreCategory}
            </div>
            <div style={{
              fontSize: '14px',
              color: THEME_COLORS.textSecondary
            }}>
              理論の中心となる概念
            </div>
          </div>
          
          <div>
            <h5 style={{
              margin: '0 0 12px 0',
              fontSize: '14px',
              fontWeight: '600',
              color: THEME_COLORS.textPrimary
            }}>
              統合レベル
            </h5>
            <div style={{
              fontSize: '18px',
              fontWeight: '700',
              color: THEME_COLORS.primaryGreen,
              marginBottom: '8px'
            }}>
              {(comparisonState.comparisonResults.theoreticalFramework.integrationLevel * 100).toFixed(1)}%
            </div>
            <div style={{
              fontSize: '14px',
              color: THEME_COLORS.textSecondary
            }}>
              理論の統合度
            </div>
          </div>
        </div>
        
        <div style={{ marginTop: '20px' }}>
          <h5 style={{
            margin: '0 0 12px 0',
            fontSize: '14px',
            fontWeight: '600',
            color: THEME_COLORS.textPrimary
          }}>
            サポートカテゴリ
          </h5>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px'
          }}>
            {comparisonState.comparisonResults.theoreticalFramework.supportingCategories.map(category => (
              <span
                key={category}
                style={{
                  padding: '6px 12px',
                  backgroundColor: THEME_COLORS.primaryPurple + '20',
                  color: THEME_COLORS.primaryPurple,
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '500'
                }}
              >
                {category}
              </span>
            ))}
          </div>
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
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: '20px'
    }} onClick={onClose}>
      <div style={{
        backgroundColor: THEME_COLORS.bgSecondary,
        borderRadius: THEME_COLORS.borderRadius.xxlarge,
        border: `1px solid ${THEME_COLORS.borderPrimary}`,
        maxWidth: '1200px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }} onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: `1px solid ${THEME_COLORS.borderPrimary}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: THEME_COLORS.bgTertiary
        }}>
          <div>
            <h2 style={{
              margin: 0,
              color: THEME_COLORS.textPrimary,
              fontSize: '20px',
              fontWeight: '600'
            }}>
              🔄 定数比較法検証モーダル
            </h2>
            <div style={{
              marginTop: '4px',
              fontSize: '14px',
              color: THEME_COLORS.textSecondary
            }}>
              既存のUIを壊さずに定数比較法の機能を検証
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
              borderRadius: THEME_COLORS.borderRadius.medium,
              lineHeight: 1
            }}
          >
            ×
          </button>
        </div>

        {/* Navigation */}
        <div style={{
          display: 'flex',
          borderBottom: `1px solid ${THEME_COLORS.borderPrimary}`
        }}>
          {[
            { key: 'criteria', label: '📊 比較基準', color: THEME_COLORS.primaryBlue },
            { key: 'strategy', label: '🎯 比較戦略', color: THEME_COLORS.primaryGreen },
            { key: 'progress', label: '📈 比較進捗', color: THEME_COLORS.primaryPurple },
            { key: 'results', label: '📊 比較結果', color: THEME_COLORS.primaryOrange }
          ].map(section => (
            <button
              key={section.key}
              style={{
                padding: '12px 20px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.2s',
                borderBottom: '2px solid transparent',
                color: activeTab === section.key ? section.color : THEME_COLORS.textSecondary,
                borderBottomColor: activeTab === section.key ? section.color : 'transparent',
                backgroundColor: activeTab === section.key ? THEME_COLORS.bgTertiary : 'transparent'
              }}
              onClick={() => setActiveTab(section.key as any)}
            >
              {section.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{
          flex: 1,
          padding: '24px',
          overflow: 'auto',
          backgroundColor: THEME_COLORS.bgSecondary
        }}>
          {activeTab === 'criteria' && renderCriteriaTab()}
          {activeTab === 'strategy' && renderStrategyTab()}
          {activeTab === 'progress' && renderProgressTab()}
          {activeTab === 'results' && renderResultsTab()}
        </div>
      </div>
    </div>
  );
};

export default ConstantComparisonModal;
