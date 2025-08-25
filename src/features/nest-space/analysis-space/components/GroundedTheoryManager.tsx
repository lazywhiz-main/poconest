/**
 * グラウンデッド・セオリー分析管理コンポーネント
 * 新規分析実行 + 保存済み分析の管理を統合
 */

import React, { useState, useEffect, useCallback } from 'react';
import { THEME_COLORS } from '../../../../constants/theme';
import { GroundedTheoryService } from '../../../../services/analysis/GroundedTheoryService';
import { GroundedTheoryAnalysisService } from '../../../../services/GroundedTheoryAnalysisService';
import { ClusterLabel } from '../../../../services/AnalysisService';
import { ClusteringResult } from '../../../../services/SmartClusteringService';
import { GroundedTheoryResultPanel } from '../../../../components/ui/GroundedTheoryResultPanel';
import TheoreticalSamplingModal from '../../../../components/ui/TheoreticalSamplingModal';
import ConstantComparisonModal from '../../../../components/ui/ConstantComparisonModal';
import type { 
  SavedGroundedTheoryAnalysis, 
  GroundedTheoryAnalysisSummary,
  GroundedTheoryResultData 
} from '../../../../types/groundedTheoryAnalysis';

interface GroundedTheoryManagerProps {
  currentClusters: ClusterLabel[];
  currentClusteringResult: ClusteringResult | null;
  boardId: string;
  nestId: string;
  onClose?: () => void; // オプショナルに変更（サイドピーク用）
}

interface AnalysisCardProps {
  analysis: SavedGroundedTheoryAnalysis;
  onView: () => void;
  onDelete: () => void;
}

// 分析カードコンポーネント
const AnalysisCard: React.FC<AnalysisCardProps> = ({ analysis, onView, onDelete }) => {
  const styles = {
    card: {
      padding: '12px',
      backgroundColor: THEME_COLORS.bgTertiary,
      borderRadius: THEME_COLORS.borderRadius.medium,
      border: `1px solid ${THEME_COLORS.borderSecondary}`,
      marginBottom: '10px',
      transition: 'all 0.2s ease'
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '12px'
    },
    title: {
      fontSize: '13px',
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
      fontSize: '12px',
      color: THEME_COLORS.textSecondary,
      lineHeight: '1.4',
      marginBottom: '10px'
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
      padding: '5px 10px',
      borderRadius: THEME_COLORS.borderRadius.small,
      fontSize: '11px',
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
      backgroundColor: THEME_COLORS.primaryRed,
      color: THEME_COLORS.textInverse
    }
  };

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <h4 style={styles.title}>{analysis.name}</h4>
        <div style={styles.meta}>
          <span>仮説: {analysis.hypothesisCount}個</span>
          <span>信頼度: {(analysis.confidenceAverage * 100).toFixed(1)}%</span>
        </div>
      </div>
      
      {analysis.description && (
        <p style={styles.description}>{analysis.description}</p>
      )}
      
      <div style={styles.actions}>
        <button
          style={{ ...styles.button, ...styles.viewButton }}
          onClick={onView}
        >
          表示
        </button>
        <button
          style={{ ...styles.button, ...styles.deleteButton }}
          onClick={onDelete}
        >
          削除
        </button>
      </div>
    </div>
  );
};

export const GroundedTheoryManager: React.FC<GroundedTheoryManagerProps> = ({
  currentClusters,
  currentClusteringResult,
  boardId,
  nestId,
  onClose
}) => {
  const [savedAnalyses, setSavedAnalyses] = useState<SavedGroundedTheoryAnalysis[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentAnalysisResult, setCurrentAnalysisResult] = useState<{
    result: GroundedTheoryResultData;
    isNew: boolean;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTheoreticalSamplingModal, setShowTheoreticalSamplingModal] = useState(false);
  const [showConstantComparisonModal, setShowConstantComparisonModal] = useState(false);

  // スタイル定義
  const styles = {
    section: {
      marginBottom: '24px'
    },
    sectionTitle: {
      fontSize: '14px',
      fontWeight: '600',
      color: THEME_COLORS.textPrimary,
      marginBottom: '12px',
      display: 'flex',
      alignItems: 'center',
      gap: '6px'
    },
    newAnalysisSection: {
      padding: '16px',
      backgroundColor: THEME_COLORS.bgTertiary,
      borderRadius: THEME_COLORS.borderRadius.medium,
      border: `1px solid ${THEME_COLORS.borderSecondary}`,
      textAlign: 'center' as const
    },
    newAnalysisButton: {
      padding: '10px 20px',
      backgroundColor: THEME_COLORS.primaryGreen,
      color: THEME_COLORS.textInverse,
      border: 'none',
      borderRadius: THEME_COLORS.borderRadius.medium,
      fontSize: '13px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      marginBottom: '10px'
    },
    warningText: {
      fontSize: '12px',
      color: THEME_COLORS.textMuted,
      margin: 0
    },
    errorText: {
      color: THEME_COLORS.primaryRed,
      fontSize: '12px',
      padding: '10px',
      backgroundColor: THEME_COLORS.primaryRed + '20',
      borderRadius: THEME_COLORS.borderRadius.medium,
      marginBottom: '16px'
    },
    emptyState: {
      textAlign: 'center' as const,
      padding: '30px 16px',
      color: THEME_COLORS.textMuted,
      fontSize: '12px',
      lineHeight: '1.4',
    },
    loadingState: {
      textAlign: 'center' as const,
      padding: '30px 16px',
      color: THEME_COLORS.textSecondary,
      fontSize: '12px',
    }
  };

  // 保存済み分析の取得
  const fetchSavedAnalyses = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await GroundedTheoryAnalysisService.getAnalyses(boardId);
      if (response.success && response.data) {
        setSavedAnalyses(response.data);
      }
    } catch (err) {
      setError('保存済み分析の取得に失敗しました');
      console.error('Failed to fetch saved analyses:', err);
    } finally {
      setIsLoading(false);
    }
  }, [boardId]);

  // 新規分析の実行
  const handleNewAnalysis = useCallback(async () => {
    if (!currentClusters.length || !currentClusteringResult) {
      setError('クラスターデータが不足しています');
      return;
    }

    try {
      setIsAnalyzing(true);
      setError(null);
      
      // クラスターデータをGroundedTheoryServiceで処理可能な形式に変換
      const clusterData = currentClusters.map(cluster => ({
        id: cluster.id,
        name: cluster.text || 'Unnamed Cluster',
        nodes: cluster.cardIds,
        cards: [] // BoardItem[] が必要だが、現在は空配列で対応
      }));

      // まずオープンコーディングを実行
      const openCodingResult = await GroundedTheoryService.performOpenCoding(
        clusterData
      );
      
      // アキシャルコーディングを実行
      const axialCodingResult = await GroundedTheoryService.performAxialCoding(
        openCodingResult
      );
      
      // セレクティブコーディングを実行
      const selectiveCodingResult = await GroundedTheoryService.performSelectiveCoding(
        axialCodingResult
      );

      // 結果をGroundedTheoryResultDataの形式に変換
      const result: GroundedTheoryResultData = {
        openCoding: {
          clusterCount: openCodingResult.length,
          conceptCount: openCodingResult.reduce((sum, r) => sum + r.extractedConcepts.length, 0)
        },
        axialCoding: {
          categoryCount: axialCodingResult.categories?.length || 0,
          relationCount: axialCodingResult.relations?.length || 0,
          causalChainCount: axialCodingResult.causalChains?.length || 0
        },
        selectiveCoding: {
          coreCategory: selectiveCodingResult.coreCategory?.name || '未特定',
          hypothesisCount: selectiveCodingResult.hypotheses?.length || 0,
          integrationQuality: selectiveCodingResult.integration?.coherence || 0
        },
        storyline: selectiveCodingResult.storyline || 'ストーリーラインが生成されませんでした',
        hypotheses: selectiveCodingResult.hypotheses || []
      };

      setCurrentAnalysisResult({
        result,
        isNew: true
      });

    } catch (err) {
      setError('分析の実行に失敗しました');
      console.error('Failed to execute analysis:', err);
    } finally {
      setIsAnalyzing(false);
    }
  }, [currentClusters, currentClusteringResult]);

  // 分析結果の保存
  const handleSaveAnalysis = useCallback(async (result: GroundedTheoryResultData) => {
    try {
      const analysis = await GroundedTheoryAnalysisService.saveAnalysis({
        boardId,
        nestId,
        name: `GTA分析_${new Date().toLocaleDateString('ja-JP')}`,
        description: 'グラウンデッド・セオリー分析の結果',
        analysisType: 'basic_gta',
        analysisResult: result,
        sourceClusters: currentClusters,
        sourceClusteringResult: currentClusteringResult || undefined
      });

      await fetchSavedAnalyses(); // リストを再取得
      setCurrentAnalysisResult(null);
      
    } catch (err) {
      setError('分析結果の保存に失敗しました');
      console.error('Failed to save analysis:', err);
    }
  }, [boardId, nestId, currentClusters, currentClusteringResult]);

  // 保存済み分析の読み込み
  const handleLoadAnalysis = useCallback((analysisId: string) => {
    const analysis = savedAnalyses.find(a => a.id === analysisId);
    if (analysis) {
      setCurrentAnalysisResult({
        result: analysis.analysisResult!,
        isNew: false
      });
    }
  }, [savedAnalyses]);

  // 保存済み分析の削除
  const handleDeleteAnalysis = useCallback(async (analysisId: string) => {
    try {
      await GroundedTheoryAnalysisService.deleteAnalysis(analysisId);
      await fetchSavedAnalyses(); // リストを再取得
    } catch (err) {
      setError('分析の削除に失敗しました');
      console.error('Failed to delete analysis:', err);
    }
  }, []);

  // 初期化
  useEffect(() => {
    fetchSavedAnalyses();
  }, [fetchSavedAnalyses]);

  // 分析結果パネルが表示されている場合
  if (currentAnalysisResult) {
    return (
      <GroundedTheoryResultPanel
        result={currentAnalysisResult.result}
        onSave={() => handleSaveAnalysis(currentAnalysisResult.result)}
        onClose={() => setCurrentAnalysisResult(null)}
      />
    );
  }

  // メインの管理画面
  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: THEME_COLORS.bgSecondary,
      overflow: 'hidden',
    }}>
      {/* ヘッダー（サイドピーク用簡略版） */}
      <div style={{
        padding: '16px 20px',
        borderBottom: `1px solid ${THEME_COLORS.borderSecondary}`,
        flexShrink: 0,
      }}>
        <h3 style={{
          fontSize: '14px',
          fontWeight: '600',
          color: THEME_COLORS.textPrimary,
          margin: 0,
          marginBottom: '4px',
          fontFamily: 'Space Grotesk, system-ui, sans-serif'
        }}>
          🧠 グラウンデッド・セオリー分析管理
        </h3>
        <p style={{
          fontSize: '11px',
          color: THEME_COLORS.textSecondary,
          margin: 0,
          lineHeight: '1.3',
        }}>
          クラスターデータから理論的概念と関係性を抽出します
        </p>
      </div>

      {/* コンテンツエリア */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: '16px 20px',
      }}>
        {error && (
          <div style={styles.errorText}>
            ❌ {error}
          </div>
        )}

        {/* 新規分析実行セクション */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>🚀 新しい分析を実行</h3>
          <div style={styles.newAnalysisSection}>
            <div style={{
              display: 'flex',
              gap: '12px',
              flexWrap: 'wrap'
            }}>
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
              
              <button 
                style={{
                  ...styles.newAnalysisButton,
                  backgroundColor: '#3b82f6',
                  opacity: (!currentClusters.length || isAnalyzing) ? 0.6 : 1,
                  cursor: (!currentClusters.length || isAnalyzing) ? 'not-allowed' : 'pointer'
                }}
                onClick={() => setShowTheoreticalSamplingModal(true)}
                disabled={!currentClusters.length || isAnalyzing}
                onMouseEnter={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.backgroundColor = '#2563eb';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.backgroundColor = '#3b82f6';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }
                }}
              >
                🔬 新しい分析を実行（ベータ）
              </button>
            </div>
            
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

      {/* 理論的サンプリングモーダル */}
              <TheoreticalSamplingModal
          isVisible={showTheoreticalSamplingModal}
          onClose={() => setShowTheoreticalSamplingModal(false)}
          currentAnalysisData={{
            clusters: currentClusters,
            clusteringResult: currentClusteringResult
          }}
          boardId={boardId}
          nestId={nestId}
        />

      {/* 定数比較法モーダル */}
              <ConstantComparisonModal
          isVisible={showConstantComparisonModal}
          onClose={() => setShowConstantComparisonModal(false)}
          currentAnalysisData={{
            clusters: currentClusters,
            clusteringResult: currentClusteringResult
          }}
          boardId={boardId}
          nestId={nestId}
        />
    </div>
  );
};
