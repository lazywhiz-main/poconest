/**
 * グラウンデッド・セオリー分析管理コンポーネント
 * 新規分析実行 + 保存済み分析の管理を統合
 */

import React, { useState, useEffect } from 'react';
import { THEME_COLORS } from '../../../../constants/theme';
import { GroundedTheoryAnalysisService } from '../../../../services/GroundedTheoryAnalysisService';
import { GroundedTheoryResultPanel } from '../../../../components/ui/GroundedTheoryResultPanel';
import type { 
  SavedGroundedTheoryAnalysis, 
  GroundedTheoryAnalysisSummary,
  AnalysisExecutionParams,
  GroundedTheoryResultData 
} from '../../../../types/groundedTheoryAnalysis';
import type { ClusterLabel } from '../../../../services/AnalysisService';
import type { ClusteringResult } from '../../../../services/SmartClusteringService';

interface GroundedTheoryManagerProps {
  currentClusters: ClusterLabel[];
  currentClusteringResult: ClusteringResult | null;
  boardId: string;
  nestId: string;
  onClose?: () => void; // オプショナルに変更（サイドピーク用）
}

interface AnalysisCardProps {
  analysis: GroundedTheoryAnalysisSummary;
  onView: () => void;
  onDelete: () => void;
}

// 分析カードコンポーネント
const AnalysisCard: React.FC<AnalysisCardProps> = ({ analysis, onView, onDelete }) => {
  const styles = {
    card: {
      padding: '16px',
      backgroundColor: THEME_COLORS.bgTertiary,
      borderRadius: THEME_COLORS.borderRadius.large,
      border: `1px solid ${THEME_COLORS.borderSecondary}`,
      marginBottom: '12px',
      transition: 'all 0.2s ease'
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '12px'
    },
    title: {
      fontSize: '16px',
      fontWeight: '600',
      color: THEME_COLORS.textPrimary,
      margin: 0
    },
    meta: {
      fontSize: '12px',
      color: THEME_COLORS.textSecondary,
      display: 'flex',
      gap: '12px',
      marginBottom: '8px'
    },
    description: {
      fontSize: '14px',
      color: THEME_COLORS.textSecondary,
      lineHeight: '1.4',
      marginBottom: '12px'
    },
    coreCategory: {
      display: 'inline-block',
      padding: '4px 8px',
      backgroundColor: THEME_COLORS.primaryGreen + '20',
      color: THEME_COLORS.primaryGreen,
      borderRadius: THEME_COLORS.borderRadius.medium,
      fontSize: '12px',
      fontWeight: '500',
      marginBottom: '12px'
    },
    actions: {
      display: 'flex',
      gap: '8px',
      alignItems: 'center'
    },
    button: {
      padding: '6px 12px',
      borderRadius: THEME_COLORS.borderRadius.medium,
      fontSize: '12px',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      border: 'none'
    },
    viewButton: {
      backgroundColor: THEME_COLORS.primaryBlue,
      color: THEME_COLORS.textInverse
    },
    deleteButton: {
      backgroundColor: 'transparent',
      color: THEME_COLORS.textMuted,
      border: `1px solid ${THEME_COLORS.borderSecondary}`
    }
  };

  return (
    <div 
      style={styles.card}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = THEME_COLORS.bgQuaternary;
        e.currentTarget.style.transform = 'translateY(-1px)';
        e.currentTarget.style.borderColor = THEME_COLORS.primaryGreen;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = THEME_COLORS.bgTertiary;
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.borderColor = THEME_COLORS.borderSecondary;
      }}
    >
      <div style={styles.header}>
        <h3 style={styles.title}>{analysis.name}</h3>
      </div>
      
      <div style={styles.meta}>
        <span>📊 {analysis.hypothesisCount}仮説</span>
        <span>🎯 {Math.round(analysis.confidenceAverage * 100)}%信頼度</span>
        <span>💭 {analysis.conceptCount}概念</span>
        <span>📅 {analysis.createdAt.toLocaleDateString()}</span>
      </div>

      {analysis.description && (
        <div style={styles.description}>
          {analysis.description}
        </div>
      )}

      <div style={styles.coreCategory}>
        🎯 {analysis.coreCategory}
      </div>

      <div style={styles.actions}>
        <button
          style={{...styles.button, ...styles.viewButton}}
          onClick={onView}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#4A90E2';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = THEME_COLORS.primaryBlue;
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          📊 表示
        </button>
        <button
          style={{...styles.button, ...styles.deleteButton}}
          onClick={onDelete}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = THEME_COLORS.primaryRed;
            e.currentTarget.style.color = THEME_COLORS.textInverse;
            e.currentTarget.style.borderColor = THEME_COLORS.primaryRed;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = THEME_COLORS.textMuted;
            e.currentTarget.style.borderColor = THEME_COLORS.borderSecondary;
          }}
        >
          🗑️ 削除
        </button>
      </div>
    </div>
  );
};

// メインコンポーネント
export const GroundedTheoryManager: React.FC<GroundedTheoryManagerProps> = ({
  currentClusters,
  currentClusteringResult,
  boardId,
  nestId,
  onClose
}) => {
  const [savedAnalyses, setSavedAnalyses] = useState<GroundedTheoryAnalysisSummary[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentAnalysisResult, setCurrentAnalysisResult] = useState<{
    result: GroundedTheoryResultData;
    isNew: boolean;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 保存済み分析の取得
  const loadSavedAnalyses = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await GroundedTheoryAnalysisService.getAnalysisSummaries(boardId);
      
      if (response.success && response.data) {
        setSavedAnalyses(response.data);
      } else {
        setError(response.error || '分析結果の取得に失敗しました');
      }
    } catch (error) {
      console.error('分析結果取得エラー:', error);
      setError('予期しないエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSavedAnalyses();
  }, [boardId]);

  // 新しい分析を実行
  const handleNewAnalysis = async () => {
    try {
      setIsAnalyzing(true);
      setError(null);
      
      const params: AnalysisExecutionParams = {
        clusters: currentClusters,
        clusteringResult: currentClusteringResult || undefined,
        parameters: {
          mode: 'standard',
          confidenceThreshold: 0.6,
          maxHypotheses: 5,
          codingDepth: 3
        }
      };

      const executionResult = await GroundedTheoryAnalysisService.performAnalysis(params);
      
      setCurrentAnalysisResult({
        result: executionResult.result,
        isNew: true
      });
      
    } catch (error) {
      console.error('分析実行エラー:', error);
      setError(error instanceof Error ? error.message : '分析の実行に失敗しました');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 保存済み分析を読み込み
  const handleLoadAnalysis = async (analysisId: string) => {
    try {
      setIsLoading(true);
      const response = await GroundedTheoryAnalysisService.getAnalysis(analysisId);
      
      if (response.success && response.data) {
        setCurrentAnalysisResult({
          result: response.data.analysisResult,
          isNew: false
        });
      } else {
        setError(response.error || '分析結果の読み込みに失敗しました');
      }
    } catch (error) {
      console.error('分析読み込みエラー:', error);
      setError('予期しないエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  // 分析結果を保存
  const handleSaveAnalysis = async (name: string, description?: string) => {
    if (!currentAnalysisResult?.isNew) return;

    try {
      const response = await GroundedTheoryAnalysisService.saveAnalysis({
        name,
        description,
        boardId,
        nestId,
        analysisResult: currentAnalysisResult.result,
        sourceClusters: currentClusters,
        sourceClusteringResult: currentClusteringResult || undefined
      });

      if (response.success) {
        // 保存成功 → リストを更新して管理画面に戻る
        await loadSavedAnalyses();
        setCurrentAnalysisResult(null);
      } else {
        setError(response.error || '保存に失敗しました');
      }
    } catch (error) {
      console.error('保存エラー:', error);
      setError('予期しないエラーが発生しました');
    }
  };

  // 分析結果を削除
  const handleDeleteAnalysis = async (analysisId: string) => {
    if (!confirm('この分析結果を削除しますか？')) return;

    try {
      const response = await GroundedTheoryAnalysisService.deleteAnalysis(analysisId);
      
      if (response.success) {
        await loadSavedAnalyses(); // リストを更新
      } else {
        setError(response.error || '削除に失敗しました');
      }
    } catch (error) {
      console.error('削除エラー:', error);
      setError('予期しないエラーが発生しました');
    }
  };

  const styles = {
    overlay: {
      position: 'fixed' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '20px'
    },
    panel: {
      backgroundColor: THEME_COLORS.bgSecondary,
      borderRadius: THEME_COLORS.borderRadius.xxlarge,
      border: `1px solid ${THEME_COLORS.borderPrimary}`,
      maxWidth: '900px',
      width: '100%',
      maxHeight: '90vh',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column' as const
    },
    header: {
      padding: '20px 24px',
      borderBottom: `1px solid ${THEME_COLORS.borderPrimary}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    },
    title: {
      fontSize: '20px',
      fontWeight: '600',
      color: THEME_COLORS.textPrimary,
      margin: 0
    },
    closeButton: {
      background: 'none',
      border: 'none',
      fontSize: '24px',
      cursor: 'pointer',
      color: THEME_COLORS.textMuted,
      padding: '4px',
      borderRadius: THEME_COLORS.borderRadius.medium,
      lineHeight: 1
    },
    content: {
      flex: 1,
      padding: '24px',
      overflow: 'auto'
    },
    section: {
      marginBottom: '32px'
    },
    sectionTitle: {
      fontSize: '18px',
      fontWeight: '600',
      color: THEME_COLORS.textPrimary,
      marginBottom: '16px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    newAnalysisSection: {
      padding: '20px',
      backgroundColor: THEME_COLORS.bgTertiary,
      borderRadius: THEME_COLORS.borderRadius.large,
      border: `1px solid ${THEME_COLORS.borderSecondary}`,
      textAlign: 'center' as const
    },
    newAnalysisButton: {
      padding: '12px 24px',
      backgroundColor: THEME_COLORS.primaryGreen,
      color: THEME_COLORS.textInverse,
      border: 'none',
      borderRadius: THEME_COLORS.borderRadius.large,
      fontSize: '16px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      marginBottom: '12px'
    },
    warningText: {
      fontSize: '14px',
      color: THEME_COLORS.textMuted,
      margin: 0
    },
    errorText: {
      color: THEME_COLORS.primaryRed,
      fontSize: '14px',
      padding: '12px',
      backgroundColor: THEME_COLORS.primaryRed + '20',
      borderRadius: THEME_COLORS.borderRadius.medium,
      marginBottom: '16px'
    },
    emptyState: {
      textAlign: 'center' as const,
      padding: '40px 20px',
      color: THEME_COLORS.textMuted
    },
    loadingState: {
      textAlign: 'center' as const,
      padding: '40px 20px',
      color: THEME_COLORS.textSecondary
    }
  };

  // 分析結果表示モード
  if (currentAnalysisResult) {
    return (
      <GroundedTheoryResultPanel
        result={currentAnalysisResult.result}
        onClose={() => setCurrentAnalysisResult(null)}
        onSave={currentAnalysisResult.isNew ? handleSaveAnalysis : undefined}
      />
    );
  }

  // 管理画面モード
  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>🧠 グラウンデッド・セオリー分析管理</h2>
          <button 
            style={styles.closeButton}
            onClick={onClose}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = THEME_COLORS.bgTertiary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            ×
          </button>
        </div>

        <div style={styles.content}>
          {error && (
            <div style={styles.errorText}>
              ❌ {error}
            </div>
          )}

          {/* 新規分析実行セクション */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>🚀 新しい分析を実行</h3>
            <div style={styles.newAnalysisSection}>
              <button 
                style={{
                  ...styles.newAnalysisButton,
                  opacity: (!currentClusters.length || isAnalyzing) ? 0.6 : 1,
                  cursor: (!currentClusters.length || isAnalyzing) ? 'not-allowed' : 'pointer'
                }}
                onClick={handleNewAnalysis}
                disabled={!currentClusters.length || isAnalyzing}
                onMouseEnter={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.backgroundColor = '#00cc77';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.backgroundColor = THEME_COLORS.primaryGreen;
                    e.currentTarget.style.transform = 'translateY(0)';
                  }
                }}
              >
                {isAnalyzing ? '🔬 分析実行中...' : '🚀 新しく分析を実行'}
              </button>
              
              {!currentClusters.length && (
                <p style={styles.warningText}>
                  先にクラスタリングを実行してください
                </p>
              )}
              
              {currentClusters.length > 0 && (
                <p style={styles.warningText}>
                  現在のクラスター: {currentClusters.length}個 ({currentClusters.reduce((sum, c) => sum + c.cardIds.length, 0)}概念)
                </p>
              )}
            </div>
          </div>

          {/* 保存済み分析リスト */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>📚 保存済み分析結果</h3>
            
            {isLoading ? (
              <div style={styles.loadingState}>
                🔄 読み込み中...
              </div>
            ) : savedAnalyses.length === 0 ? (
              <div style={styles.emptyState}>
                📭 保存済み分析がありません<br/>
                新しい分析を実行して結果を保存してください
              </div>
            ) : (
              <div>
                {savedAnalyses.map(analysis => (
                  <AnalysisCard
                    key={analysis.id}
                    analysis={analysis}
                    onView={() => handleLoadAnalysis(analysis.id)}
                    onDelete={() => handleDeleteAnalysis(analysis.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
