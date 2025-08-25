import React, { useState, useCallback, useEffect } from 'react';
import { THEME_COLORS } from '../../constants/theme';
import { TheoreticalSamplingService, type SamplingCriteria, type TheoreticalSamplingAnalysis } from '../../services/analysis/TheoreticalSamplingService';
import { ConceptAnalysisService, type ConceptAnalysis } from '../../services/analysis/ConceptAnalysisService';
import { GroundedTheoryAnalysisService } from '../../services/GroundedTheoryAnalysisService';
import type { ClusterLabel } from '../../services/AnalysisService';
import type { ClusteringResult } from '../../services/SmartClusteringService';

// 理論的サンプリングの型定義
interface TheoreticalSamplingState {
  saturationCriteria: {
    newConceptThreshold: number;        // 新概念の出現率
    relationshipStability: number;      // 関係性の安定性
    categoryCompleteness: number;       // カテゴリの完全性
  };
  samplingStrategy: {
    purpose: 'concept_development' | 'relationship_exploration' | 'theory_validation';
    focus: 'negative_cases' | 'extreme_cases' | 'theoretical_variation';
    dataSource: 'existing_clusters' | 'new_data_collection' | 'external_sources';
  };
  samplingProgress: {
    currentRound: number;
    totalRounds: number;
    conceptsDiscovered: number;
    newConceptsThisRound: number;
    relationshipsStabilized: number;
    categoriesCompleted: number;
  };
  saturationAnalysis: {
    isSaturated: boolean;
    saturationScore: number;
    remainingGaps: string[];
    nextSamplingTargets: string[];
  };
}

interface TheoreticalSamplingModalProps {
  isVisible: boolean;
  onClose: () => void;
  currentAnalysisData?: {
    clusters: ClusterLabel[];
    clusteringResult: ClusteringResult | null;
  };
  boardId: string;
  nestId: string;
}

/**
 * 🔬 理論的サンプリング検証モーダル
 * 既存のUIを壊さずに理論的サンプリングの機能を検証
 */
export const TheoreticalSamplingModal: React.FC<TheoreticalSamplingModalProps> = ({
  isVisible,
  onClose,
  currentAnalysisData,
  boardId,
  nestId
}) => {
  const [activeTab, setActiveTab] = useState<'saturation' | 'progress' | 'concepts' | 'saved'>('saturation');
  const [criteria, setCriteria] = useState<SamplingCriteria>({
    newConceptThreshold: 0.1,    // 10%以下で飽和
    relationshipStability: 0.8,   // 80%以上で安定
    categoryCompleteness: 0.9    // 90%以上で完全
  });
  const [currentAnalysis, setCurrentAnalysis] = useState<TheoreticalSamplingAnalysis | null>(null);
  const [analysisHistory, setAnalysisHistory] = useState<TheoreticalSamplingAnalysis[]>([]);
  const [conceptAnalysis, setConceptAnalysis] = useState<ConceptAnalysis | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedAnalyses, setSavedAnalyses] = useState<any[]>([]);
  const [isLoadingSaved, setIsLoadingSaved] = useState(false);

  // 飽和基準の更新
  const updateSaturationCriteria = useCallback((updates: Partial<SamplingCriteria>) => {
    setCriteria(prev => ({ ...prev, ...updates }));
  }, []);

  // 理論的飽和の判定（実データ分析）
  const performTheoreticalSamplingAnalysis = useCallback(() => {
    if (!currentAnalysisData?.clusters) {
      console.warn('クラスターデータがありません');
      return;
    }
    
    console.log('🔬 理論的サンプリング分析実行中...');
    
    try {
      const previousAnalysis = analysisHistory.length > 0 ? analysisHistory[analysisHistory.length - 1] : undefined;
      
      const analysis = TheoreticalSamplingService.analyzeTheoreticalSaturation(
        currentAnalysisData.clusters,
        currentAnalysisData.clusteringResult,
        criteria,
        previousAnalysis
      );
      
      setCurrentAnalysis(analysis);
      
      // 概念分析も同時に実行
      const conceptAnalysisResult = ConceptAnalysisService.analyzeConcepts(
        currentAnalysisData.clusters,
        currentAnalysisData.clusteringResult
      );
      
      setConceptAnalysis(conceptAnalysisResult);
      
      console.log('✅ 理論的サンプリング分析完了', analysis);
      console.log('✅ 概念分析完了', conceptAnalysisResult);
    } catch (error) {
      console.error('❌ 理論的サンプリング分析エラー:', error);
    }
  }, [currentAnalysisData, criteria, analysisHistory]);

  // サンプリング戦略の実行
  const executeSamplingStrategy = useCallback(() => {
    if (!currentAnalysis) {
      console.warn('分析結果がありません');
      return;
    }
    
    // 現在の分析を履歴に追加
    setAnalysisHistory(prev => [...prev, currentAnalysis]);
    
    // 新しい分析を実行
    performTheoreticalSamplingAnalysis();
  }, [currentAnalysis, performTheoreticalSamplingAnalysis]);

  // 分析結果の保存
  const saveAnalysisResults = useCallback(async () => {
    if (!currentAnalysisData?.clusters || !currentAnalysis || !conceptAnalysis) {
      console.warn('保存するデータがありません');
      return;
    }
    
    setIsSaving(true);
    
    try {
      // 現在の日時を分析名に使用
      const now = new Date();
      const analysisName = `理論的サンプリング分析 ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`;
      
      // PropsからboardIdとnestIdを取得
      
      const saveResult = await GroundedTheoryAnalysisService.saveEnhancedAnalysis({
        name: analysisName,
        description: `理論的サンプリング分析結果（飽和スコア: ${(currentAnalysis.saturationAnalysis.saturationScore * 100).toFixed(1)}%）`,
        boardId,
        nestId,
        analysisType: 'theoretical_sampling',
        
        // 拡張分析結果
        conceptAnalysisResult: conceptAnalysis,
        theoreticalSamplingAnalysis: currentAnalysis,
        samplingCriteria: criteria,
        
        // 一時的な回避策：analysis_resultのNOT NULL制約対応
        analysisResult: {
          openCoding: { clusterCount: 0, conceptCount: conceptAnalysis?.conceptDetails.length || 0 },
          axialCoding: { categoryCount: 0, relationCount: conceptAnalysis?.conceptRelationships.length || 0, causalChainCount: 0 },
          selectiveCoding: { coreCategory: 'サンプリング分析', hypothesisCount: 0, integrationQuality: currentAnalysis.saturationAnalysis.saturationScore },
          storyline: conceptAnalysis?.narrativeHypothesis.mainStoryline || '理論的サンプリング分析により生成されたストーリーライン',
          hypotheses: []
        },
        
        // 入力データ
        sourceClusters: currentAnalysisData.clusters,
        sourceClusteringResult: currentAnalysisData.clusteringResult || undefined,
        
        // 品質メトリクス
        qualityMetrics: {
          overallQuality: currentAnalysis.saturationAnalysis.saturationScore,
          saturationScore: currentAnalysis.saturationAnalysis.saturationScore,
          conceptDiversity: currentAnalysis.qualityMetrics.conceptDiversity,
          relationshipDensity: currentAnalysis.qualityMetrics.relationshipDensity,
          coherenceScore: currentAnalysis.qualityMetrics.clusterCoherence,
          evidenceStrength: currentAnalysis.qualityMetrics.theoreticalDepth,
          logicalConsistency: 0.8 // デフォルト値
        }
      });
      
      if (saveResult.success) {
        console.log('✅ 分析結果を保存しました:', saveResult.data);
        alert('分析結果を保存しました！');
        // 保存後に一覧を再読み込み
        await loadSavedAnalyses();
      } else {
        console.error('❌ 保存エラー:', saveResult.error);
        alert(`保存に失敗しました: ${saveResult.error}`);
      }
    } catch (error) {
      console.error('❌ 予期しないエラー:', error);
      alert('保存中にエラーが発生しました');
    } finally {
      setIsSaving(false);
    }
  }, [currentAnalysisData, currentAnalysis, conceptAnalysis, criteria]);

  // 保存された分析結果を読み込み
  const loadSavedAnalyses = useCallback(async () => {
    setIsLoadingSaved(true);
    try {
      console.log('🔍 [loadSavedAnalyses] 開始 - boardId:', boardId);
      const result = await GroundedTheoryAnalysisService.getAnalyses(boardId);
      console.log('🔍 [loadSavedAnalyses] 取得結果:', result);
      
      if (result.success && result.data) {
        console.log('🔍 [loadSavedAnalyses] 全分析結果:', result.data);
        // 理論的サンプリング分析のみをフィルタリング
        const samplingAnalyses = result.data.filter((analysis: any) => {
          console.log('🔍 [loadSavedAnalyses] 分析タイプ確認:', analysis.analysisType, analysis.name);
          return analysis.analysisType === 'theoretical_sampling';
        });
        console.log('🔍 [loadSavedAnalyses] フィルタリング結果:', samplingAnalyses);
        setSavedAnalyses(samplingAnalyses);
        console.log('✅ 保存された分析結果を読み込みました:', samplingAnalyses);
      } else {
        console.warn('保存された分析結果の読み込みに失敗:', result.error);
      }
    } catch (error) {
      console.error('❌ 分析結果読み込みエラー:', error);
    } finally {
      setIsLoadingSaved(false);
    }
  }, [boardId]);

  // 保存された分析結果を詳細表示
  const loadSavedAnalysis = useCallback(async (analysisId: string) => {
    try {
      const result = await GroundedTheoryAnalysisService.loadEnhancedAnalysis(analysisId);
      if (result.success && result.data) {
        const analysis = result.data;
        if (analysis.theoreticalSamplingAnalysis) {
          setCurrentAnalysis(analysis.theoreticalSamplingAnalysis);
        }
        if (analysis.conceptAnalysisResult) {
          setConceptAnalysis(analysis.conceptAnalysisResult);
        }
        if (analysis.samplingCriteria) {
          setCriteria(analysis.samplingCriteria);
        }
        console.log('✅ 保存された分析結果を読み込みました:', analysis);
      } else {
        console.warn('分析結果の詳細読み込みに失敗:', result.error);
      }
    } catch (error) {
      console.error('❌ 分析結果詳細読み込みエラー:', error);
    }
  }, []);

  // 初期化時に分析を実行と保存された分析結果を読み込み
  useEffect(() => {
    if (isVisible) {
      if (currentAnalysisData?.clusters) {
        performTheoreticalSamplingAnalysis();
      }
      loadSavedAnalyses();
    }
  }, [isVisible, currentAnalysisData, performTheoreticalSamplingAnalysis, loadSavedAnalyses]);

  // 基準変更時に再分析
  useEffect(() => {
    if (currentAnalysisData?.clusters) {
      performTheoreticalSamplingAnalysis();
    }
  }, [criteria, performTheoreticalSamplingAnalysis]);

  if (!isVisible) return null;

  const renderSaturationTab = () => (
    <div>
      <h3 style={{
        margin: '0 0 20px 0',
        fontSize: '18px',
        fontWeight: '600',
        color: THEME_COLORS.textPrimary
      }}>
        🎯 理論的飽和の判定
      </h3>
      
      {/* 飽和基準の設定 */}
      <div style={{ marginBottom: '24px' }}>
        <h4 style={{
          margin: '0 0 16px 0',
          fontSize: '16px',
          fontWeight: '600',
          color: THEME_COLORS.textPrimary
        }}>
          📊 飽和基準の設定
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
              新概念出現率閾値
            </label>
            <input
              type="range"
              min="0"
              max="0.3"
              step="0.05"
              value={criteria.newConceptThreshold}
              onChange={(e) => updateSaturationCriteria({ 
                newConceptThreshold: parseFloat(e.target.value) 
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
              {(criteria.newConceptThreshold * 100).toFixed(0)}%
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
              関係性安定性閾値
            </label>
            <input
              type="range"
              min="0.5"
              max="1"
              step="0.05"
              value={criteria.relationshipStability}
              onChange={(e) => updateSaturationCriteria({ 
                relationshipStability: parseFloat(e.target.value) 
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
              {(criteria.relationshipStability * 100).toFixed(0)}%
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
              カテゴリ完全性閾値
            </label>
            <input
              type="range"
              min="0.5"
              max="1"
              step="0.05"
              value={criteria.categoryCompleteness}
              onChange={(e) => updateSaturationCriteria({ 
                categoryCompleteness: parseFloat(e.target.value) 
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
              {(criteria.categoryCompleteness * 100).toFixed(0)}%
            </div>
          </div>
        </div>
      </div>
      
      {/* 飽和状態の表示 */}
      {currentAnalysis ? (
        <div style={{
          padding: '20px',
          backgroundColor: currentAnalysis.saturationAnalysis.isSaturated 
            ? THEME_COLORS.primaryGreen + '20' 
            : THEME_COLORS.primaryOrange + '20',
          borderRadius: '12px',
          border: `2px solid ${currentAnalysis.saturationAnalysis.isSaturated 
            ? THEME_COLORS.primaryGreen 
            : THEME_COLORS.primaryOrange}`
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '16px'
          }}>
            <span style={{
              fontSize: '24px'
            }}>
              {currentAnalysis.saturationAnalysis.isSaturated ? '✅' : '🔄'}
            </span>
            <div>
              <h4 style={{
                margin: '0 0 4px 0',
                fontSize: '16px',
                fontWeight: '600',
                color: THEME_COLORS.textPrimary
              }}>
                {currentAnalysis.saturationAnalysis.isSaturated 
                  ? '理論的飽和達成！' 
                  : '理論的飽和未達成'
                }
              </h4>
              <div style={{
                fontSize: '14px',
                color: THEME_COLORS.textSecondary
              }}>
                飽和スコア: {(currentAnalysis.saturationAnalysis.saturationScore * 100).toFixed(1)}%
              </div>
            </div>
          </div>
          
          {currentAnalysis.saturationAnalysis.remainingGaps.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <h5 style={{
                margin: '0 0 8px 0',
                fontSize: '14px',
                fontWeight: '600',
                color: THEME_COLORS.textPrimary
              }}>
                📋 残存ギャップ
              </h5>
              <ul style={{
                margin: 0,
                paddingLeft: '20px',
                fontSize: '14px',
                color: THEME_COLORS.textSecondary
              }}>
                {currentAnalysis.saturationAnalysis.remainingGaps.map((gap, index) => (
                  <li key={index}>{gap}</li>
                ))}
              </ul>
            </div>
          )}
          
          {currentAnalysis.saturationAnalysis.nextSamplingTargets.length > 0 && (
            <div>
              <h5 style={{
                margin: '0 0 8px 0',
                fontSize: '14px',
                fontWeight: '600',
                color: THEME_COLORS.textPrimary
              }}>
                🎯 次のサンプリングターゲット
              </h5>
              <ul style={{
                margin: 0,
                paddingLeft: '20px',
                fontSize: '14px',
                color: THEME_COLORS.textSecondary
              }}>
                {currentAnalysis.saturationAnalysis.nextSamplingTargets.map((target, index) => (
                  <li key={index}>{target}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div style={{
          padding: '20px',
          backgroundColor: THEME_COLORS.bgTertiary,
          borderRadius: '12px',
          textAlign: 'center',
          color: THEME_COLORS.textSecondary
        }}>
          🔄 分析中...
        </div>
      )}
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
        📈 サンプリング進捗
      </h3>

      {currentAnalysis ? (
        <>
          {/* 進捗概要 */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
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
                {currentAnalysis.samplingProgress.currentRound}
              </div>
              <div style={{
                fontSize: '14px',
                fontWeight: '600',
                color: THEME_COLORS.textPrimary,
                marginBottom: '4px'
              }}>
                現在のラウンド
              </div>
              <div style={{
                fontSize: '12px',
                color: THEME_COLORS.textSecondary
              }}>
                全{currentAnalysis.samplingProgress.totalRounds}ラウンド中
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
                {currentAnalysis.samplingProgress.conceptsDiscovered}
              </div>
              <div style={{
                fontSize: '14px',
                fontWeight: '600',
                color: THEME_COLORS.textPrimary,
                marginBottom: '4px'
              }}>
                発見された概念
              </div>
              <div style={{
                fontSize: '12px',
                color: THEME_COLORS.textSecondary
              }}>
                今ラウンド: +{currentAnalysis.samplingProgress.newConceptsThisRound}
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
                {currentAnalysis.samplingProgress.relationshipsStabilized}
              </div>
              <div style={{
                fontSize: '14px',
                fontWeight: '600',
                color: THEME_COLORS.textPrimary,
                marginBottom: '4px'
              }}>
                安定化した関係性
              </div>
              <div style={{
                fontSize: '12px',
                color: THEME_COLORS.textSecondary
              }}>
                安定性: {currentAnalysis.samplingProgress.conceptsDiscovered > 0 ? 
                  ((currentAnalysis.samplingProgress.relationshipsStabilized / currentAnalysis.samplingProgress.conceptsDiscovered) * 100).toFixed(1) : 0}%
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
                {currentAnalysis.samplingProgress.categoriesCompleted}
              </div>
              <div style={{
                fontSize: '14px',
                fontWeight: '600',
                color: THEME_COLORS.textPrimary,
                marginBottom: '4px'
              }}>
                完成したカテゴリ
              </div>
              <div style={{
                fontSize: '12px',
                color: THEME_COLORS.textSecondary
              }}>
                完成度: {((currentAnalysis.samplingProgress.categoriesCompleted / 6) * 100).toFixed(1)}%
              </div>
            </div>
          </div>

          {/* 次のサンプリング実行 */}
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
              🚀 次のサンプリングラウンドを実行
            </h4>

            <div style={{
              fontSize: '14px',
              color: THEME_COLORS.textSecondary,
              marginBottom: '20px',
              lineHeight: '1.5'
            }}>
              現在のクラスター数: {currentAnalysisData?.clusters?.length || 0}<br/>
              分析の品質スコア: {(currentAnalysis.qualityMetrics.conceptDiversity * 100).toFixed(1)}%
            </div>

            <button
              onClick={executeSamplingStrategy}
              disabled={currentAnalysis.samplingProgress.currentRound >= currentAnalysis.samplingProgress.totalRounds}
              style={{
                padding: '12px 24px',
                backgroundColor: currentAnalysis.samplingProgress.currentRound >= currentAnalysis.samplingProgress.totalRounds
                  ? THEME_COLORS.textMuted
                  : THEME_COLORS.primaryBlue,
                color: THEME_COLORS.textInverse,
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: currentAnalysis.samplingProgress.currentRound >= currentAnalysis.samplingProgress.totalRounds
                  ? 'not-allowed'
                  : 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {currentAnalysis.samplingProgress.currentRound >= currentAnalysis.samplingProgress.totalRounds
                ? '✅ サンプリング完了'
                : '🔄 次のラウンドを実行'
              }
            </button>
          </div>
        </>
      ) : (
        <div style={{
          padding: '20px',
          backgroundColor: THEME_COLORS.bgTertiary,
          borderRadius: '12px',
          textAlign: 'center',
          color: THEME_COLORS.textSecondary
        }}>
          🔄 分析中...
        </div>
      )}
    </div>
  );

  const renderConceptsTab = () => (
    <div>
      <h3 style={{
        margin: '0 0 20px 0',
        fontSize: '18px',
        fontWeight: '600',
        color: THEME_COLORS.textPrimary
      }}>
        🧠 概念の詳細分析
      </h3>

      {conceptAnalysis ? (
        <>
          {/* 概念詳細セクション */}
          <div style={{ marginBottom: '24px' }}>
            <h4 style={{
              margin: '0 0 16px 0',
              fontSize: '16px',
              fontWeight: '600',
              color: THEME_COLORS.textPrimary
            }}>
              📊 個別概念の詳細
            </h4>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '16px'
            }}>
              {conceptAnalysis.conceptDetails.map(concept => (
                <div key={concept.id} style={{
                  padding: '16px',
                  backgroundColor: THEME_COLORS.bgQuaternary,
                  borderRadius: '8px',
                  border: `1px solid ${THEME_COLORS.borderSecondary}`
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '12px'
                  }}>
                    <h5 style={{
                      margin: 0,
                      fontSize: '14px',
                      fontWeight: '600',
                      color: THEME_COLORS.textPrimary
                    }}>
                      {concept.name}
                    </h5>
                    <div style={{
                      fontSize: '12px',
                      color: THEME_COLORS.textSecondary
                    }}>
                      信頼度: {(concept.confidence * 100).toFixed(0)}%
                    </div>
                  </div>
                  
                  <div style={{
                    fontSize: '12px',
                    color: THEME_COLORS.textSecondary,
                    marginBottom: '8px'
                  }}>
                    {concept.description}
                  </div>
                  
                  <div style={{
                    fontSize: '11px',
                    color: THEME_COLORS.textMuted,
                    marginBottom: '8px'
                  }}>
                    カード数: {concept.cardCount} | キーワード: {concept.keywords.slice(0, 3).join(', ')}
                  </div>
                  
                  {concept.dominantThemes.length > 0 && (
                    <div style={{
                      fontSize: '11px',
                      color: THEME_COLORS.primaryBlue,
                      marginBottom: '4px'
                    }}>
                      主要テーマ: {concept.dominantThemes.slice(0, 2).join(', ')}
                    </div>
                  )}
                  
                  {concept.variationFactors.length > 0 && (
                    <div style={{
                      fontSize: '11px',
                      color: THEME_COLORS.primaryOrange
                    }}>
                      注意点: {concept.variationFactors[0]}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 概念間関係性セクション */}
          <div style={{ marginBottom: '24px' }}>
            <h4 style={{
              margin: '0 0 16px 0',
              fontSize: '16px',
              fontWeight: '600',
              color: THEME_COLORS.textPrimary
            }}>
              🔗 概念間の関係性
            </h4>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
              gap: '16px'
            }}>
              {conceptAnalysis.conceptRelationships.slice(0, 6).map((relation, index) => (
                <div key={index} style={{
                  padding: '16px',
                  backgroundColor: THEME_COLORS.bgTertiary,
                  borderRadius: '8px',
                  border: `1px solid ${THEME_COLORS.borderSecondary}`
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '12px'
                  }}>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: THEME_COLORS.textPrimary
                    }}>
                      {relation.sourceConcept} → {relation.targetConcept}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: THEME_COLORS.primaryGreen
                    }}>
                      強度: {(relation.strength * 100).toFixed(0)}%
                    </div>
                  </div>
                  
                  <div style={{
                    fontSize: '12px',
                    color: THEME_COLORS.primaryBlue,
                    marginBottom: '8px'
                  }}>
                                         関係性タイプ: {getRelationshipTypeLabel(relation.relationshipType)}
                  </div>
                  
                  {relation.evidence.length > 0 && (
                    <div style={{
                      fontSize: '11px',
                      color: THEME_COLORS.textSecondary
                    }}>
                      証拠: {relation.evidence[0]}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ナラティブ仮説セクション */}
          <div style={{ marginBottom: '24px' }}>
            <h4 style={{
              margin: '0 0 16px 0',
              fontSize: '16px',
              fontWeight: '600',
              color: THEME_COLORS.textPrimary
            }}>
              📖 ナラティブ仮説
            </h4>
            
            <div style={{
              padding: '20px',
              backgroundColor: THEME_COLORS.primaryBlue + '10',
              borderRadius: '12px',
              border: `1px solid ${THEME_COLORS.primaryBlue}`
            }}>
              <h5 style={{
                margin: '0 0 12px 0',
                fontSize: '15px',
                fontWeight: '600',
                color: THEME_COLORS.textPrimary
              }}>
                🎭 メインストーリーライン
              </h5>
              <div style={{
                fontSize: '14px',
                color: THEME_COLORS.textPrimary,
                lineHeight: '1.6',
                marginBottom: '16px'
              }}>
                {conceptAnalysis.narrativeHypothesis.mainStoryline}
              </div>
              
              <h5 style={{
                margin: '0 0 12px 0',
                fontSize: '15px',
                fontWeight: '600',
                color: THEME_COLORS.textPrimary
              }}>
                🎬 キープロットポイント
              </h5>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '12px',
                marginBottom: '16px'
              }}>
                {conceptAnalysis.narrativeHypothesis.keyPlotPoints.map((plot, index) => (
                  <div key={index} style={{
                    padding: '12px',
                    backgroundColor: THEME_COLORS.bgQuaternary,
                    borderRadius: '6px',
                    border: `1px solid ${THEME_COLORS.borderSecondary}`
                  }}>
                    <div style={{
                      fontSize: '12px',
                      fontWeight: '600',
                      color: THEME_COLORS.primaryBlue,
                      marginBottom: '4px'
                    }}>
                      {plot.sequence}. {plot.description}
                    </div>
                    <div style={{
                      fontSize: '11px',
                      color: THEME_COLORS.textSecondary
                    }}>
                      関与概念: {plot.involvedConcepts.join(', ')}
                    </div>
                  </div>
                ))}
              </div>
              
              <h5 style={{
                margin: '0 0 12px 0',
                fontSize: '15px',
                fontWeight: '600',
                color: THEME_COLORS.textPrimary
              }}>
                🎭 キャラクター役割
              </h5>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '12px'
              }}>
                {conceptAnalysis.narrativeHypothesis.characterRoles.map((role, index) => (
                  <div key={index} style={{
                    padding: '12px',
                    backgroundColor: THEME_COLORS.bgQuaternary,
                    borderRadius: '6px',
                    border: `1px solid ${THEME_COLORS.borderSecondary}`
                  }}>
                    <div style={{
                      fontSize: '12px',
                      fontWeight: '600',
                      color: getRoleColor(role.role),
                      marginBottom: '4px'
                    }}>
                                             {getRoleLabel(role.role)}: {role.concept}
                    </div>
                    <div style={{
                      fontSize: '11px',
                      color: THEME_COLORS.textSecondary
                    }}>
                      {role.motivation}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 理論的構造セクション */}
          <div>
            <h4 style={{
              margin: '0 0 16px 0',
              fontSize: '16px',
              fontWeight: '600',
              color: THEME_COLORS.textPrimary
            }}>
              🏗️ 理論的構造
            </h4>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '16px'
            }}>
              <div style={{
                padding: '16px',
                backgroundColor: THEME_COLORS.primaryGreen + '10',
                borderRadius: '8px',
                border: `1px solid ${THEME_COLORS.primaryGreen}`
              }}>
                <h5 style={{
                  margin: '0 0 8px 0',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: THEME_COLORS.textPrimary
                }}>
                  💎 コア概念
                </h5>
                <div style={{
                  fontSize: '12px',
                  color: THEME_COLORS.textSecondary
                }}>
                  {conceptAnalysis.theoreticalStructure.coreConcepts.length > 0 
                    ? conceptAnalysis.theoreticalStructure.coreConcepts.join(', ')
                    : 'コア概念なし'
                  }
                </div>
              </div>
              
              <div style={{
                padding: '16px',
                backgroundColor: THEME_COLORS.primaryBlue + '10',
                borderRadius: '8px',
                border: `1px solid ${THEME_COLORS.primaryBlue}`
              }}>
                <h5 style={{
                  margin: '0 0 8px 0',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: THEME_COLORS.textPrimary
                }}>
                  🔧 サポート概念
                </h5>
                <div style={{
                  fontSize: '12px',
                  color: THEME_COLORS.textSecondary
                }}>
                  {conceptAnalysis.theoreticalStructure.supportingConcepts.length > 0 
                    ? conceptAnalysis.theoreticalStructure.supportingConcepts.join(', ')
                    : 'サポート概念なし'
                  }
                </div>
              </div>
              
              <div style={{
                padding: '16px',
                backgroundColor: THEME_COLORS.primaryOrange + '10',
                borderRadius: '8px',
                border: `1px solid ${THEME_COLORS.primaryOrange}`
              }}>
                <h5 style={{
                  margin: '0 0 8px 0',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: THEME_COLORS.textPrimary
                }}>
                  🔍 理論的ギャップ
                </h5>
                <div style={{
                  fontSize: '12px',
                  color: THEME_COLORS.textSecondary
                }}>
                  {conceptAnalysis.theoreticalStructure.theoreticalGaps.length > 0 
                    ? conceptAnalysis.theoreticalStructure.theoreticalGaps.slice(0, 2).join('; ')
                    : 'ギャップなし'
                  }
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div style={{
          padding: '20px',
          backgroundColor: THEME_COLORS.bgTertiary,
          borderRadius: '12px',
          textAlign: 'center',
          color: THEME_COLORS.textSecondary
        }}>
          🔄 概念分析中...
        </div>
      )}
    </div>
  );

  // 保存済みタブのレンダリング
  const renderSavedTab = () => (
    <div>
      <h3 style={{
        margin: '0 0 20px 0',
        fontSize: '18px',
        fontWeight: '600',
        color: THEME_COLORS.textPrimary
      }}>
        💾 保存された分析結果
      </h3>

      {/* デバッグ情報 */}
      <div style={{
        padding: '12px',
        backgroundColor: THEME_COLORS.bgTertiary,
        borderRadius: '8px',
        marginBottom: '16px',
        fontSize: '12px',
        color: THEME_COLORS.textSecondary
      }}>
        <strong>🔍 デバッグ情報:</strong><br/>
        boardId: {boardId}<br/>
        読み込み状態: {isLoadingSaved ? '読み込み中' : '完了'}<br/>
        保存済み件数: {savedAnalyses.length}件<br/>
        全分析結果: {JSON.stringify(savedAnalyses.map(a => ({ id: a.id, name: a.name, type: a.analysisType })))}
        <br/><br/>
        <button
          onClick={loadSavedAnalyses}
          style={{
            padding: '4px 8px',
            backgroundColor: THEME_COLORS.primaryBlue,
            color: THEME_COLORS.textInverse,
            border: 'none',
            borderRadius: '4px',
            fontSize: '11px',
            cursor: 'pointer'
          }}
        >
          🔄 手動再読み込み
        </button>
      </div>

      {isLoadingSaved ? (
        <div style={{
          padding: '20px',
          textAlign: 'center',
          color: THEME_COLORS.textSecondary
        }}>
          🔄 読み込み中...
        </div>
      ) : savedAnalyses.length === 0 ? (
        <div style={{
          padding: '20px',
          backgroundColor: THEME_COLORS.bgTertiary,
          borderRadius: '12px',
          textAlign: 'center',
          color: THEME_COLORS.textSecondary
        }}>
          📭 保存された分析結果がありません
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
          gap: '16px'
        }}>
          {savedAnalyses.map((analysis) => (
            <div key={analysis.id} style={{
              padding: '16px',
              backgroundColor: THEME_COLORS.bgQuaternary,
              borderRadius: '8px',
              border: `1px solid ${THEME_COLORS.borderSecondary}`,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onClick={() => loadSavedAnalysis(analysis.id)}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = THEME_COLORS.bgTertiary;
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = THEME_COLORS.bgQuaternary;
              e.currentTarget.style.transform = 'translateY(0)';
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '12px'
              }}>
                <h4 style={{
                  margin: 0,
                  fontSize: '16px',
                  fontWeight: '600',
                  color: THEME_COLORS.textPrimary
                }}>
                  {analysis.name}
                </h4>
                <div style={{
                  fontSize: '12px',
                  color: THEME_COLORS.textMuted
                }}>
                  {new Date(analysis.createdAt).toLocaleDateString('ja-JP')}
                </div>
              </div>
              
              {analysis.description && (
                <div style={{
                  fontSize: '14px',
                  color: THEME_COLORS.textSecondary,
                  marginBottom: '12px'
                }}>
                  {analysis.description}
                </div>
              )}
              
              <div style={{
                display: 'flex',
                gap: '8px',
                flexWrap: 'wrap'
              }}>
                <div style={{
                  padding: '4px 8px',
                  backgroundColor: THEME_COLORS.primaryGreen + '20',
                  color: THEME_COLORS.primaryGreen,
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: '500'
                }}>
                  概念数: {analysis.conceptCount || 0}
                </div>
                <div style={{
                  padding: '4px 8px',
                  backgroundColor: THEME_COLORS.primaryBlue + '20',
                  color: THEME_COLORS.primaryBlue,
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: '500'
                }}>
                  信頼度: {((analysis.confidenceAverage || 0) * 100).toFixed(0)}%
                </div>
                <div style={{
                  padding: '4px 8px',
                  backgroundColor: THEME_COLORS.primaryOrange + '20',
                  color: THEME_COLORS.primaryOrange,
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: '500'
                }}>
                  作成者: {analysis.createdBy}
                </div>
              </div>
              
              <div style={{
                marginTop: '12px',
                fontSize: '12px',
                color: THEME_COLORS.textMuted,
                textAlign: 'center'
              }}>
                💡 クリックして詳細を表示
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ヘルパー関数
  const getRelationshipTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      'causal': '因果関係',
      'hierarchical': '階層関係',
      'temporal': '時間的関係',
      'semantic': '意味的関係',
      'contrastive': '対比関係'
    };
    return labels[type] || type;
  };

  const getRoleLabel = (role: string): string => {
    const labels: Record<string, string> = {
      'protagonist': '主人公',
      'antagonist': '対立者',
      'supporting': 'サポート',
      'catalyst': '触媒',
      'resolution': '解決者'
    };
    return labels[role] || role;
  };

  const getRoleColor = (role: string): string => {
    const colors: Record<string, string> = {
      'protagonist': THEME_COLORS.primaryGreen,
      'antagonist': THEME_COLORS.primaryRed,
      'supporting': THEME_COLORS.primaryBlue,
      'catalyst': THEME_COLORS.primaryPurple,
      'resolution': THEME_COLORS.primaryOrange
    };
    return colors[role] || THEME_COLORS.textPrimary;
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
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: '20px'
    }} onClick={onClose}>
      <div style={{
        backgroundColor: THEME_COLORS.bgSecondary,
        borderRadius: THEME_COLORS.borderRadius.xxlarge,
        border: `1px solid ${THEME_COLORS.borderPrimary}`,
        maxWidth: '800px',
        width: '100%',
        maxHeight: '80vh',
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
              🔬 理論的サンプリング検証モーダル
            </h2>
            <div style={{
              marginTop: '4px',
              fontSize: '14px',
              color: THEME_COLORS.textSecondary
            }}>
              既存のUIを壊さずに理論的サンプリングの機能を検証
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {currentAnalysis && conceptAnalysis && (
              <button
                onClick={saveAnalysisResults}
                disabled={isSaving}
                style={{
                  padding: '8px 16px',
                  backgroundColor: isSaving ? THEME_COLORS.textMuted : THEME_COLORS.primaryGreen,
                  color: THEME_COLORS.textInverse,
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                  opacity: isSaving ? 0.6 : 1,
                  transition: 'all 0.2s'
                }}
              >
                {isSaving ? '💾 保存中...' : '💾 分析結果を保存'}
              </button>
            )}
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
        </div>

        {/* Navigation */}
        <div style={{
          display: 'flex',
          borderBottom: `1px solid ${THEME_COLORS.borderPrimary}`
        }}>
          {[
            { key: 'saturation', label: '🎯 飽和判定', color: THEME_COLORS.primaryGreen },
            { key: 'progress', label: '📈 進捗管理', color: THEME_COLORS.primaryPurple },
            { key: 'concepts', label: '🧠 概念分析', color: THEME_COLORS.primaryBlue },
            { key: 'saved', label: '💾 保存済み', color: THEME_COLORS.primaryOrange }
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
          {activeTab === 'saturation' && renderSaturationTab()}
          {activeTab === 'progress' && renderProgressTab()}
          {activeTab === 'concepts' && renderConceptsTab()}
          {activeTab === 'saved' && renderSavedTab()}
        </div>
      </div>
    </div>
  );
};

export default TheoreticalSamplingModal;
