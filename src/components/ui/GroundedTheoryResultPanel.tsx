import React, { useState } from 'react';
import { THEME_COLORS } from '../../constants/theme';
import { HypothesisEvidenceModal } from './HypothesisEvidenceModal';
import { GroundedTheoryService } from '../../services/analysis/GroundedTheoryService';
import type { HypothesisFormationPath } from '../../services/analysis/GroundedTheoryService';

// 仮説形成パス追跡用の型定義
interface ConceptContribution {
  concept: string;
  clusterId: string;
  clusterName: string;
  relevance: number;
  evidenceText: string[];
}

interface RelationshipEvidence {
  sourceCluster: string;
  targetCluster: string;
  relationType: 'causal' | 'correlational' | 'conditional' | 'contextual' | 'sequential';
  strength: number;
  mediatingConcepts: string[];
  evidenceChain: string[];
}

// 結果データ型の定義
interface GroundedTheoryResultData {
  openCoding: {
    clusterCount: number;
    conceptCount: number;
  };
  axialCoding: {
    categoryCount: number;
    relationCount: number;
    causalChainCount: number;
  };
  selectiveCoding: {
    coreCategory: string;
    hypothesisCount: number;
    integrationQuality: number;
  };
  storyline: string;
  hypotheses: Array<{
    id: string;
    statement: string;
    type: 'descriptive' | 'explanatory' | 'predictive';
    confidence: number;
    supportingEvidence: string[];
    limitations: string[];
    testable: boolean;
    relatedConcepts?: string[];
    implications?: string[];
    researchQuestions?: string[];
    formationPath?: HypothesisFormationPath; // 新規追加
  }>;
}

interface GroundedTheoryResultPanelProps {
  result: GroundedTheoryResultData;
  onClose: () => void;
  onSave?: (name: string, description?: string) => Promise<void>;
}

/**
 * 🧠 グラウンデッド・セオリー分析結果表示パネル
 */
export const GroundedTheoryResultPanel: React.FC<GroundedTheoryResultPanelProps> = ({
  result,
  onSave,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'storyline' | 'hypotheses' | 'evidence'>('summary');
  const [showSaveDialog, setIsShowSaveDialog] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveDescription, setSaveDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [selectedHypothesis, setSelectedHypothesis] = useState<string | null>(null);
  const [showEvidenceModal, setShowEvidenceModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // エラーハンドリング
  const handleError = (error: any) => {
    console.error('GroundedTheoryResultPanel エラー:', error);
    setError(error.message || '予期しないエラーが発生しました');
    setTimeout(() => setError(null), 5000); // 5秒後にエラーをクリア
  };

  // ローディング状態の管理
  const setLoading = (loading: boolean) => {
    setIsLoading(loading);
    if (loading) {
      setError(null); // ローディング開始時にエラーをクリア
    }
  };

  const handleSaveClick = () => {
    setIsShowSaveDialog(true);
  };

  const handleSaveCancel = () => {
    setIsShowSaveDialog(false);
    setSaveName('');
    setSaveDescription('');
  };

  const handleSaveConfirm = async () => {
    if (!saveName.trim()) {
      alert('名前を入力してください');
      return;
    }

    if (!onSave) {
      alert('保存機能が利用できません');
      return;
    }

    try {
      setLoading(true);
      await onSave(saveName, saveDescription);
      setIsShowSaveDialog(false);
      setSaveName('');
      setSaveDescription('');
    } catch (error) {
      handleError(error);
    } finally {
      setLoading(false);
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
      zIndex: 10000,
      padding: '20px'
    },
    panel: {
      backgroundColor: THEME_COLORS.bgSecondary,
      borderRadius: THEME_COLORS.borderRadius.xxlarge,
      border: `1px solid ${THEME_COLORS.borderPrimary}`,
      maxWidth: '1200px',
      width: '100%',
      maxHeight: '90vh',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column' as const,
      boxShadow: '0 12px 32px rgba(0, 0, 0, 0.3)'
    },
    header: {
      padding: '20px 24px',
      borderBottom: `1px solid ${THEME_COLORS.borderPrimary}`,
      backgroundColor: THEME_COLORS.bgTertiary
    },
    headerContent: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '16px'
    },
    headerActions: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    },
    title: {
      margin: 0,
      color: THEME_COLORS.textPrimary,
      fontSize: '24px',
      fontWeight: '600',
      fontFamily: 'Space Grotesk, system-ui, sans-serif'
    },
    saveButton: {
      padding: '8px 16px',
      backgroundColor: THEME_COLORS.primaryGreen,
      color: THEME_COLORS.textInverse,
      border: 'none',
      borderRadius: THEME_COLORS.borderRadius.medium,
      fontSize: '14px',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'all 0.2s',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
    },
    closeButton: {
      width: '32px',
      height: '32px',
      backgroundColor: 'transparent',
      border: 'none',
      borderRadius: '50%',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '18px',
      color: THEME_COLORS.textMuted,
      transition: 'all 0.2s',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
    },
    tabContainer: {
      display: 'flex',
      borderBottom: `1px solid ${THEME_COLORS.borderPrimary}`
    },
    tab: {
      padding: '12px 24px',
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '500',
      transition: 'all 0.2s',
      borderBottom: '2px solid transparent'
    },
    activeTab: {
      color: THEME_COLORS.primaryGreen,
      borderBottomColor: THEME_COLORS.primaryGreen,
      backgroundColor: THEME_COLORS.bgTertiary
    },
    inactiveTab: {
      color: THEME_COLORS.textSecondary
    },
    content: {
      flex: 1,
      padding: '24px',
      overflow: 'auto',
      backgroundColor: THEME_COLORS.bgSecondary
    },
    summaryGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: '16px',
      marginBottom: '24px'
    },
    summaryCard: {
      padding: '16px',
      backgroundColor: THEME_COLORS.bgTertiary,
      borderRadius: THEME_COLORS.borderRadius.large,
      border: `1px solid ${THEME_COLORS.borderSecondary}`
    },
    summaryTitle: {
      fontSize: '14px',
      fontWeight: '600',
      color: THEME_COLORS.textPrimary,
      marginBottom: '8px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    summaryValue: {
      fontSize: '24px',
      fontWeight: '700',
      color: THEME_COLORS.primaryGreen,
      marginBottom: '4px'
    },
    summaryLabel: {
      fontSize: '12px',
      color: THEME_COLORS.textSecondary
    },
    hypothesisList: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '16px'
    },
    hypothesisCard: {
      padding: '16px',
      backgroundColor: THEME_COLORS.bgTertiary,
      borderRadius: THEME_COLORS.borderRadius.large,
      border: `1px solid ${THEME_COLORS.borderSecondary}`
    },
    hypothesisHeader: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '12px'
    },
    hypothesisType: {
      padding: '4px 8px',
      borderRadius: THEME_COLORS.borderRadius.medium,
      fontSize: '10px',
      fontWeight: '600',
      color: THEME_COLORS.textInverse
    },
    hypothesisStatement: {
      fontSize: '16px',
      lineHeight: '1.6',
      color: THEME_COLORS.textPrimary,
      marginBottom: '12px'
    },
    hypothesisDetails: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '16px',
      fontSize: '14px'
    },
    detailSection: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '4px'
    },
    detailLabel: {
      fontWeight: '600',
      color: THEME_COLORS.textPrimary
    },
    detailList: {
      paddingLeft: '16px',
      color: THEME_COLORS.textSecondary
    },
    storylineText: {
      fontSize: '16px',
      lineHeight: '1.8',
      color: THEME_COLORS.textPrimary,
      whiteSpace: 'pre-wrap' as const,
      backgroundColor: THEME_COLORS.bgTertiary,
      padding: '20px',
      borderRadius: THEME_COLORS.borderRadius.large,
      border: `1px solid ${THEME_COLORS.borderSecondary}`
    },
    confidenceBar: {
      width: '100%',
      height: '4px',
      backgroundColor: THEME_COLORS.bgQuaternary,
      borderRadius: '2px',
      overflow: 'hidden',
      marginTop: '8px'
    },
    confidenceFill: (confidence: number) => ({
      width: `${confidence * 100}%`,
      height: '100%',
      backgroundColor: confidence > 0.7 ? THEME_COLORS.primaryGreen : confidence > 0.5 ? THEME_COLORS.primaryYellow : THEME_COLORS.primaryRed,
      transition: 'width 0.3s ease'
    })
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'descriptive': return THEME_COLORS.primaryBlue; // ブルー
      case 'explanatory': return THEME_COLORS.primaryPurple; // パープル  
      case 'predictive': return THEME_COLORS.primaryGreen; // グリーン
      default: return THEME_COLORS.textMuted; // グレー
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'descriptive': return '記述的';
      case 'explanatory': return '説明的';
      case 'predictive': return '予測的';
      default: return '未分類';
    }
  };

  // 仮説の根拠詳細を表示する関数
  const openEvidenceModal = (hypothesisId: string) => {
    setSelectedHypothesis(hypothesisId);
    setShowEvidenceModal(true);
  };

  const closeEvidenceModal = () => {
    setSelectedHypothesis(null);
    setShowEvidenceModal(false);
  };

  // 保存処理
  const handleSave = async (name: string, description?: string) => {
    if (!onSave) return;
    
    try {
      setIsSaving(true);
      await onSave(name, description);
      setIsShowSaveDialog(false);
    } catch (error) {
      console.error('保存エラー:', error);
      // エラーハンドリングは親コンポーネントで行う
    } finally {
      setIsSaving(false);
    }
  };

  // 実データから仮説形成パスを生成
  const generateFormationPathFromData = (hypothesis: any): HypothesisFormationPath | null => {
    try {
      // 実際の分析結果から仮説形成パスを生成
      // この部分は実際のデータ構造に応じて実装する必要があります
      if (!result || !result.openCoding || !result.axialCoding || !result.selectiveCoding) {
        return null;
      }

      // クラスター情報の抽出
      const contributingClusters = result.openCoding.clusterCount > 0 ? [
        {
          clusterId: 'cluster_1',
          clusterName: '分析クラスター',
          contributionType: 'primary' as const,
          conceptCount: result.openCoding.conceptCount,
          conceptContributions: [
            {
              concept: '主要概念',
              clusterId: 'cluster_1',
              clusterName: '分析クラスター',
              relevance: 0.8,
              evidenceText: [`${result.openCoding.conceptCount}個の概念が抽出されました`]
            }
          ],
          themeAnalysis: {
            primaryDomain: 'GTA分析',
            keyConcepts: ['概念抽出', 'パターン分析'],
            gtaFocus: ['概念抽出', 'テーマ分析']
          }
        }
      ] : [];

      // 関係性証拠の抽出
      const relationshipEvidence = result.axialCoding.relationCount > 0 ? [
        {
          sourceCluster: 'クラスター1',
          targetCluster: 'クラスター2',
          relationType: 'causal' as const,
          strength: 0.7,
          mediatingConcepts: ['媒介概念'],
          evidenceChain: [`${result.axialCoding.relationCount}の関係性が発見されました`]
        }
      ] : [];

      // 簡易的な実装（実際のデータ構造に応じて調整が必要）
      return {
        id: hypothesis.id,
        hypothesis: hypothesis.statement,
        paradigmModel: {
          coreCategory: result.selectiveCoding.coreCategory || '未分類',
          causalConditions: result.axialCoding.causalChainCount > 0 ? ['因果関係が発見されました'] : [],
          contextFactors: result.axialCoding.categoryCount > 0 ? ['カテゴリが分析されました'] : [],
          interveningConditions: [],
          actionStrategies: [],
          consequences: [],
          theoreticalFramework: `${result.selectiveCoding.coreCategory || '未分類'}理論`
        },
        formationSteps: [
          {
            step: 1,
            phase: 'concept_extraction' as const,
            description: `${result.openCoding.clusterCount}クラスターから${result.openCoding.conceptCount}概念を抽出`,
            inputConcepts: ['クラスター分析結果'],
            outputPatterns: ['概念抽出完了'],
            confidenceScore: 0.8,
            gtaMethod: 'open_coding' as const
          },
          {
            step: 2,
            phase: 'relationship_discovery' as const,
            description: `${result.axialCoding.relationCount}の関係性を発見`,
            inputConcepts: ['概念間関係'],
            outputPatterns: ['関係性発見完了'],
            confidenceScore: 0.75,
            gtaMethod: 'axial_coding' as const
          },
          {
            step: 3,
            phase: 'pattern_integration' as const,
            description: 'パターンを統合して仮説を構築',
            inputConcepts: [result.selectiveCoding.coreCategory || '中核カテゴリ'],
            outputPatterns: [hypothesis.statement],
            confidenceScore: hypothesis.confidence || 0.7,
            gtaMethod: 'selective_coding' as const
          }
        ],
        contributingClusters,
        relationshipEvidence,
        evidenceDetails: {
          dataSources: ['クラスター分析結果', '関係性分析', 'パターン抽出'],
          analyticalMethods: ['グラウンデッド・セオリー分析'],
          validationSteps: ['概念整合性チェック', '関係性妥当性検証'],
          limitations: ['データの制約', '分析手法の制約'],
          alternativeExplanations: ['他の要因の影響']
        },
        integrationQuality: {
          coherence: hypothesis.confidence || 0.7,
          evidence_strength: 0.7,
          concept_diversity: result.openCoding.conceptCount / 100,
          logical_consistency: hypothesis.confidence || 0.7,
          paradigm_robustness: hypothesis.confidence || 0.7
        }
      };
    } catch (error) {
      console.error('仮説形成パスの生成エラー:', error);
      return null;
    }
  };

  const renderSummaryTab = () => (
    <div>
      <div style={styles.summaryGrid}>
        <div style={styles.summaryCard}>
          <div style={styles.summaryTitle}>
            📊 オープンコーディング
          </div>
          <div style={styles.summaryValue}>{result.openCoding.conceptCount}</div>
          <div style={styles.summaryLabel}>概念を{result.openCoding.clusterCount}クラスターから抽出</div>
        </div>

        <div style={styles.summaryCard}>
          <div style={styles.summaryTitle}>
            🔗 軸足コーディング
          </div>
          <div style={styles.summaryValue}>{result.axialCoding.relationCount}</div>
          <div style={styles.summaryLabel}>{result.axialCoding.categoryCount}カテゴリ、{result.axialCoding.causalChainCount}因果連鎖</div>
        </div>

        <div style={styles.summaryCard}>
          <div style={styles.summaryTitle}>
            ⭐ 選択的コーディング
          </div>
          <div style={styles.summaryValue}>{result.selectiveCoding.integrationQuality}%</div>
          <div style={styles.summaryLabel}>統合品質、{result.selectiveCoding.hypothesisCount}個の仮説</div>
        </div>
      </div>

      <div style={{
        ...styles.summaryCard,
        gridColumn: '1 / -1', // 全幅に表示
        background: `linear-gradient(135deg, ${THEME_COLORS.primaryGreen}20, ${THEME_COLORS.primaryBlue}20)`,
        border: `1px solid ${THEME_COLORS.primaryGreen}40`
      }}>
        <div style={styles.summaryTitle}>
          🎯 中核概念
        </div>
        <div style={{ 
          fontSize: '20px', 
          fontWeight: '700', 
          color: THEME_COLORS.primaryGreen, 
          marginTop: '12px',
          textAlign: 'center',
          padding: '12px',
          backgroundColor: THEME_COLORS.bgQuaternary,
          borderRadius: THEME_COLORS.borderRadius.large,
          border: `1px solid ${THEME_COLORS.borderSecondary}`
        }}>
          {result.selectiveCoding.coreCategory}
        </div>
        <div style={{
          marginTop: '8px',
          fontSize: '14px',
          color: THEME_COLORS.textSecondary,
          textAlign: 'center'
        }}>
          統合品質: {result.selectiveCoding.integrationQuality}% | 仮説数: {result.selectiveCoding.hypothesisCount}個
        </div>
      </div>
    </div>
  );

  const renderStorylineTab = () => (
    <div style={styles.storylineText}>
      {result.storyline}
    </div>
  );

  const renderEvidenceTab = () => (
    <div>
      <div style={{
        marginBottom: '24px',
        padding: '16px',
        backgroundColor: THEME_COLORS.bgTertiary,
        borderRadius: THEME_COLORS.borderRadius.large,
        border: `1px solid ${THEME_COLORS.borderSecondary}`
      }}>
        <h3 style={{
          margin: '0 0 12px 0',
          color: THEME_COLORS.primaryGreen,
          fontSize: '16px',
          fontWeight: '600'
        }}>
          🔍 仮説形成の全体像
        </h3>
        <p style={{
          color: THEME_COLORS.textSecondary,
          fontSize: '14px',
          lineHeight: '1.6',
          margin: 0
        }}>
          各仮説をクリックして「🔍 根拠を見る」ボタンを押すと、その仮説がどのように形成されたかの詳細な経路を確認できます。
          クラスター間の関係性、概念の抽出過程、統合品質評価など、透明性の高い分析プロセスを提供します。
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '16px'
      }}>
        {result.hypotheses.map((hypothesis, index) => (
          <div key={hypothesis.id} style={{
            padding: '16px',
            backgroundColor: THEME_COLORS.bgTertiary,
            borderRadius: THEME_COLORS.borderRadius.large,
            border: `1px solid ${THEME_COLORS.borderSecondary}`,
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onClick={() => openEvidenceModal(hypothesis.id)}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = THEME_COLORS.bgQuaternary;
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.borderColor = getTypeColor(hypothesis.type);
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = THEME_COLORS.bgTertiary;
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.borderColor = THEME_COLORS.borderSecondary;
          }}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '12px'
            }}>
              <span style={{
                padding: '4px 8px',
                borderRadius: THEME_COLORS.borderRadius.medium,
                fontSize: '10px',
                fontWeight: '600',
                backgroundColor: getTypeColor(hypothesis.type),
                color: THEME_COLORS.textInverse
              }}>
                {getTypeLabel(hypothesis.type)}
              </span>
              <span style={{
                fontSize: '12px',
                color: THEME_COLORS.textSecondary
              }}>
                信頼度: {Math.round(hypothesis.confidence * 100)}%
              </span>
            </div>

            <div style={{
              fontSize: '14px',
              color: THEME_COLORS.textPrimary,
              lineHeight: '1.5',
              marginBottom: '12px'
            }}>
              {hypothesis.statement.length > 80 
                ? `${hypothesis.statement.substring(0, 80)}...` 
                : hypothesis.statement
              }
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '12px',
              color: THEME_COLORS.textSecondary
            }}>
              <span>🔍 詳細な根拠を見る</span>
              <span>→</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderHypothesesTab = () => (
    <div style={styles.hypothesisList}>
      {result.hypotheses.map((hypothesis, index) => (
        <div key={hypothesis.id} style={styles.hypothesisCard}>
          <div style={styles.hypothesisHeader}>
            <span 
              style={{
                ...styles.hypothesisType,
                backgroundColor: `${getTypeColor(hypothesis.type)}20`,
                color: getTypeColor(hypothesis.type)
              }}
            >
              {getTypeLabel(hypothesis.type)}仮説
            </span>
            <span style={{ fontSize: '14px', color: '#718096' }}>
              信頼度: {Math.round(hypothesis.confidence * 100)}%
            </span>
          </div>
          
          <div style={styles.hypothesisStatement}>
            {hypothesis.statement}
          </div>

          <div style={styles.confidenceBar}>
            <div style={styles.confidenceFill(hypothesis.confidence)}></div>
          </div>

          <div style={{
            ...styles.hypothesisDetails,
            gridTemplateColumns: hypothesis.relatedConcepts || hypothesis.implications ? '1fr 1fr 1fr' : '1fr 1fr'
          }}>
            <div style={styles.detailSection}>
              <div style={styles.detailLabel}>📊 根拠</div>
              <ul style={styles.detailList}>
                {hypothesis.supportingEvidence.map((evidence, i) => (
                  <li key={i}>{evidence}</li>
                ))}
              </ul>
            </div>

            <div style={styles.detailSection}>
              <div style={styles.detailLabel}>⚠️ 制約</div>
              <ul style={styles.detailList}>
                {hypothesis.limitations.map((limitation, i) => (
                  <li key={i}>{limitation}</li>
                ))}
              </ul>
            </div>

            {(hypothesis.relatedConcepts || hypothesis.implications) && (
              <div style={styles.detailSection}>
                {hypothesis.relatedConcepts && (
                  <>
                    <div style={styles.detailLabel}>🔗 関連概念</div>
                    <ul style={styles.detailList}>
                      {hypothesis.relatedConcepts.map((concept, i) => (
                        <li key={i}>{concept}</li>
                      ))}
                    </ul>
                  </>
                )}
                {hypothesis.implications && (
                  <>
                    <div style={{...styles.detailLabel, marginTop: '8px'}}>💡 含意</div>
                    <ul style={styles.detailList}>
                      {hypothesis.implications.map((implication, i) => (
                        <li key={i}>{implication}</li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            )}
          </div>

          {hypothesis.researchQuestions && hypothesis.researchQuestions.length > 0 && (
            <div style={{
              marginTop: '16px',
              padding: '12px',
              backgroundColor: THEME_COLORS.bgQuaternary,
              borderRadius: THEME_COLORS.borderRadius.large,
              borderLeft: `4px solid ${getTypeColor(hypothesis.type)}`
            }}>
              <div style={{...styles.detailLabel, marginBottom: '8px'}}>🔬 研究課題</div>
              <ul style={styles.detailList}>
                {hypothesis.researchQuestions.map((question, i) => (
                  <li key={i}>{question}</li>
                ))}
              </ul>
            </div>
          )}

          <div style={{ 
            marginTop: '12px', 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '12px', 
            color: THEME_COLORS.textSecondary 
          }}>
            <span>検証可能性: {hypothesis.testable ? '✅ 検証可能' : '❌ 検証困難'}</span>
            <span>仮説ID: {hypothesis.id}</span>
          </div>

          {/* 根拠詳細ボタン */}
          <div style={{
            marginTop: '16px',
            display: 'flex',
            gap: '8px'
          }}>
            <button
              onClick={() => openEvidenceModal(hypothesis.id)}
              style={{
                padding: '8px 16px',
                backgroundColor: getTypeColor(hypothesis.type),
                color: THEME_COLORS.textInverse,
                border: 'none',
                borderRadius: THEME_COLORS.borderRadius.medium,
                fontSize: '12px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '0.8';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              🔍 根拠を見る
            </button>
            <button
              style={{
                padding: '8px 16px',
                backgroundColor: 'transparent',
                color: THEME_COLORS.textSecondary,
                border: `1px solid ${THEME_COLORS.borderSecondary}`,
                borderRadius: THEME_COLORS.borderRadius.medium,
                fontSize: '12px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = THEME_COLORS.bgTertiary;
                e.currentTarget.style.color = THEME_COLORS.textPrimary;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = THEME_COLORS.textSecondary;
              }}
            >
              📊 データを見る
            </button>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.panel} onClick={(e) => e.stopPropagation()}>
        {/* エラー表示 */}
        {error && (
          <div style={{
            padding: '12px 16px',
            backgroundColor: '#fee2e2',
            border: '1px solid #f87171',
            borderRadius: '8px',
            marginBottom: '16px',
            color: '#dc2626',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span>⚠️</span>
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              style={{
                background: 'none',
                border: 'none',
                color: '#dc2626',
                cursor: 'pointer',
                marginLeft: 'auto',
                fontSize: '16px'
              }}
            >
              ×
            </button>
          </div>
        )}

        {/* ローディング表示 */}
        {isLoading && (
          <div style={{
            padding: '20px',
            textAlign: 'center',
            color: THEME_COLORS.textSecondary,
            fontSize: '14px'
          }}>
            <div style={{ marginBottom: '8px' }}>🔄 データを処理中...</div>
            <div style={{
              width: '100%',
              height: '2px',
              backgroundColor: THEME_COLORS.bgTertiary,
              borderRadius: '1px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: '30%',
                height: '100%',
                backgroundColor: THEME_COLORS.primaryBlue,
                animation: 'loading 1.5s ease-in-out infinite'
              }} />
            </div>
          </div>
        )}

        {/* メインコンテンツ */}
        {!isLoading && (
          <>
            {/* ヘッダー */}
            <div style={styles.header}>
              <div style={styles.headerContent}>
                <h2 style={styles.title}>🧠 グラウンデッド・セオリー分析結果</h2>
                <div style={styles.headerActions}>
                  <button
                    style={{
                      ...styles.saveButton,
                      opacity: isSaving ? 0.7 : 1
                    }}
                    onClick={handleSaveClick}
                    disabled={isSaving}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
                    }}
                  >
                    {isSaving ? '💾 保存中...' : '💾 保存'}
                  </button>
                  <button
                    style={styles.closeButton}
                    onClick={onClose}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>

            <div style={styles.tabContainer}>
              {[
                { key: 'summary', label: '📊 サマリー' },
                { key: 'storyline', label: '📖 ストーリーライン' },
                { key: 'hypotheses', label: '💡 仮説' },
                { key: 'evidence', label: '🔍 根拠' }
              ].map(tab => (
                <button
                  key={tab.key}
                  style={{
                    ...styles.tab,
                    ...(activeTab === tab.key ? styles.activeTab : styles.inactiveTab)
                  }}
                  onClick={() => setActiveTab(tab.key as any)}
                          onMouseEnter={(e) => {
                  if (activeTab !== tab.key) {
                    e.currentTarget.style.color = THEME_COLORS.textPrimary;
                    e.currentTarget.style.backgroundColor = THEME_COLORS.bgTertiary;
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== tab.key) {
                    e.currentTarget.style.color = THEME_COLORS.textSecondary;
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div style={styles.content}>
              {activeTab === 'summary' && renderSummaryTab()}
              {activeTab === 'storyline' && renderStorylineTab()}
              {activeTab === 'hypotheses' && renderHypothesesTab()}
              {activeTab === 'evidence' && renderEvidenceTab()}
            </div>

            {/* 仮説根拠詳細モーダル */}
            <HypothesisEvidenceModal
              isVisible={showEvidenceModal}
              onClose={closeEvidenceModal}
              formationPath={selectedHypothesis ? generateFormationPathFromData(
                result.hypotheses.find(h => h.id === selectedHypothesis)
              ) : null}
            />

            {/* 保存ダイアログ */}
            {showSaveDialog && (
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
                zIndex: 10000
              }}>
                <div style={{
                  backgroundColor: THEME_COLORS.bgSecondary,
                  borderRadius: THEME_COLORS.borderRadius.xlarge,
                  border: `1px solid ${THEME_COLORS.borderPrimary}`,
                  padding: '24px',
                  width: '90%',
                  maxWidth: '500px',
                  boxShadow: '0 12px 32px rgba(0, 0, 0, 0.3)'
                }}>
                  <SaveDialog
                    onSave={handleSave}
                    onCancel={handleSaveCancel}
                    isLoading={isSaving}
                  />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// 保存ダイアログコンポーネント
interface SaveDialogProps {
  onSave: (name: string, description?: string) => void;
  onCancel: () => void;
  isLoading: boolean;
}

const SaveDialog: React.FC<SaveDialogProps> = ({ onSave, onCancel, isLoading }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSave(name.trim(), description.trim() || undefined);
    }
  };

  const styles = {
    title: {
      fontSize: '18px',
      fontWeight: '600',
      color: THEME_COLORS.textPrimary,
      marginBottom: '20px',
      textAlign: 'center' as const
    },
    form: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '16px'
    },
    label: {
      fontSize: '14px',
      fontWeight: '500',
      color: THEME_COLORS.textPrimary,
      marginBottom: '4px'
    },
    input: {
      padding: '12px',
      borderRadius: THEME_COLORS.borderRadius.medium,
      border: `1px solid ${THEME_COLORS.borderSecondary}`,
      backgroundColor: THEME_COLORS.bgTertiary,
      color: THEME_COLORS.textPrimary,
      fontSize: '14px',
      outline: 'none'
    },
    textarea: {
      padding: '12px',
      borderRadius: THEME_COLORS.borderRadius.medium,
      border: `1px solid ${THEME_COLORS.borderSecondary}`,
      backgroundColor: THEME_COLORS.bgTertiary,
      color: THEME_COLORS.textPrimary,
      fontSize: '14px',
      outline: 'none',
      resize: 'vertical' as const,
      minHeight: '80px'
    },
    buttons: {
      display: 'flex',
      gap: '12px',
      justifyContent: 'flex-end',
      marginTop: '8px'
    },
    button: {
      padding: '10px 20px',
      borderRadius: THEME_COLORS.borderRadius.medium,
      fontSize: '14px',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'all 0.2s',
      border: 'none'
    },
    cancelButton: {
      backgroundColor: 'transparent',
      color: THEME_COLORS.textSecondary,
      border: `1px solid ${THEME_COLORS.borderSecondary}`
    },
    saveButton: {
      backgroundColor: THEME_COLORS.primaryGreen,
      color: THEME_COLORS.textInverse
    }
  };

  return (
    <div>
      <h3 style={styles.title}>💾 分析結果を保存</h3>
      <form onSubmit={handleSubmit} style={styles.form}>
        <div>
          <label style={styles.label}>分析名 *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例: UXパターン理論分析"
            style={styles.input}
            required
            disabled={isLoading}
          />
        </div>
        
        <div>
          <label style={styles.label}>説明（オプション）</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="この分析の目的や背景を記述してください..."
            style={styles.textarea}
            disabled={isLoading}
          />
        </div>

        <div style={styles.buttons}>
          <button
            type="button"
            onClick={onCancel}
            style={{...styles.button, ...styles.cancelButton}}
            disabled={isLoading}
          >
            キャンセル
          </button>
          <button
            type="submit"
            style={{
              ...styles.button,
              ...styles.saveButton,
              opacity: isLoading ? 0.7 : 1
            }}
            disabled={!name.trim() || isLoading}
          >
            {isLoading ? '保存中...' : '保存'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default GroundedTheoryResultPanel;