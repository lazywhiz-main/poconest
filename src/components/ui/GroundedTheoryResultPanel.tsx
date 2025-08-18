import React, { useState } from 'react';
import { THEME_COLORS } from '../../constants/theme';
import { HypothesisEvidenceModal } from './HypothesisEvidenceModal';

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

interface HypothesisFormationPath {
  id: string;
  hypothesis: string;
  
  // パラダイムモデルの構成要素
  paradigmModel: {
    coreCategory: string;
    causalConditions: string[];
    contextFactors: string[];
    interveningConditions: string[];
    actionStrategies: string[];
    consequences: string[];
    theoreticalFramework: string;
  };
  
  formationSteps: Array<{
    step: number;
    phase: 'concept_extraction' | 'relationship_discovery' | 'pattern_integration' | 'hypothesis_synthesis' | 'paradigm_construction';
    description: string;
    inputConcepts: string[];
    outputPatterns: string[];
    confidenceScore: number;
    gtaMethod: 'open_coding' | 'axial_coding' | 'selective_coding';
  }>;
  
  contributingClusters: Array<{
    clusterId: string;
    clusterName: string;
    contributionType: 'primary' | 'secondary' | 'supporting';
    conceptCount: number;
    conceptContributions: ConceptContribution[];
    themeAnalysis?: {
      primaryDomain: string;
      keyConcepts: string[];
      gtaFocus: string[];
    };
  }>;
  
  relationshipEvidence: RelationshipEvidence[];
  
  // 根拠の詳細情報
  evidenceDetails: {
    dataSources: string[];
    analyticalMethods: string[];
    validationSteps: string[];
    limitations: string[];
    alternativeExplanations: string[];
  };
  
  integrationQuality: {
    coherence: number;
    evidence_strength: number;
    concept_diversity: number;
    logical_consistency: number;
    paradigm_robustness: number;
  };
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
  onClose,
  onSave
}) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'storyline' | 'hypotheses' | 'evidence'>('summary');
  const [selectedHypothesis, setSelectedHypothesis] = useState<string | null>(null);
  const [showEvidenceModal, setShowEvidenceModal] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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
      setShowSaveDialog(false);
    } catch (error) {
      console.error('保存エラー:', error);
      // エラーハンドリングは親コンポーネントで行う
    } finally {
      setIsSaving(false);
    }
  };

  // モック関数: 実際の実装では GroundedTheoryService から取得
  const generateMockFormationPath = (hypothesis: any): HypothesisFormationPath => {
    return {
      id: hypothesis.id,
      hypothesis: hypothesis.statement,
      paradigmModel: {
        coreCategory: '地域体験価値創造',
        causalConditions: ['地域連携の基盤', '教育機関の存在', '体験価値の認識'],
        contextFactors: ['地域文化', '大学資源', '参加者ニーズ'],
        interveningConditions: ['行政支援', '民間協力', '技術革新'],
        actionStrategies: ['体験プログラム開発', '地域連携強化', '価値創造手法'],
        consequences: ['地域活性化', '教育効果向上', '体験価値向上'],
        theoreticalFramework: '地域連携型体験価値創造理論'
      },
      formationSteps: [
        {
          step: 1,
          phase: 'concept_extraction',
          description: 'クラスター「宇都宮・宇都宮大学」から地域教育関連概念を抽出',
          inputConcepts: ['地域', '大学', '学生'],
          outputPatterns: ['地域連携', '教育機関活用'],
          confidenceScore: 0.75,
          gtaMethod: 'open_coding'
        },
        {
          step: 2,
          phase: 'relationship_discovery',
          description: 'エンターテーメント体験クラスターとの強い関係性を発見',
          inputConcepts: ['体験価値', 'エンターテーメント', '参加型'],
          outputPatterns: ['体験価値創造', '参加者エンゲージメント'],
          confidenceScore: 0.68,
          gtaMethod: 'axial_coding'
        },
        {
          step: 3,
          phase: 'pattern_integration',
          description: '地域×教育×体験の三位一体パターンを統合',
          inputConcepts: ['地域連携', '体験価値創造', '参加者エンゲージメント'],
          outputPatterns: ['複合的価値創造'],
          confidenceScore: 0.82,
          gtaMethod: 'axial_coding'
        },
        {
          step: 4,
          phase: 'hypothesis_synthesis',
          description: 'エンターテーメント性仮説の統合的構築',
          inputConcepts: ['複合的価値創造', '参加者体験'],
          outputPatterns: ['食体験エンターテーメント性理論'],
          confidenceScore: 0.76,
          gtaMethod: 'selective_coding'
        }
      ],
      contributingClusters: [
        {
          clusterId: 'cluster_1',
          clusterName: '宇都宮・宇都宮大学',
          contributionType: 'primary',
          conceptCount: 8,
          conceptContributions: [
            {
              concept: '地域連携',
              clusterId: 'cluster_1',
              clusterName: '宇都宮・宇都宮大学',
              relevance: 0.85,
              evidenceText: ['大学と地域の連携事例', '学生参加の地域イベント']
            },
            {
              concept: '教育価値',
              clusterId: 'cluster_1', 
              clusterName: '宇都宮・宇都宮大学',
              relevance: 0.72,
              evidenceText: ['実践的学習機会', '地域理解の深化']
            }
          ]
        },
        {
          clusterId: 'cluster_2',
          clusterName: 'エンターテーメント・体験',
          contributionType: 'primary',
          conceptCount: 6,
          conceptContributions: [
            {
              concept: '体験価値',
              clusterId: 'cluster_2',
              clusterName: 'エンターテーメント・体験',
              relevance: 0.91,
              evidenceText: ['参加型体験の価値', '感情的エンゲージメント']
            },
            {
              concept: 'エンターテーメント性',
              clusterId: 'cluster_2',
              clusterName: 'エンターテーメント・体験', 
              relevance: 0.88,
              evidenceText: ['楽しさの要素', '参加者満足度']
            }
          ]
        }
      ],
      relationshipEvidence: [
        {
          sourceCluster: '宇都宮・宇都宮大学',
          targetCluster: 'エンターテーメント・体験',
          relationType: 'causal',
          strength: 0.73,
          mediatingConcepts: ['参加型体験', '地域交流'],
          evidenceChain: [
            '大学生の地域参加',
            '体験価値の認識',
            'エンターテーメント効果の発現'
          ]
        }
      ],
      evidenceDetails: {
        dataSources: ['クラスター分析結果', '関係性分析', 'パターン抽出'],
        analyticalMethods: ['グラウンデッド・セオリー分析', 'クラスター分析', '関係性分析'],
        validationSteps: ['概念整合性チェック', '関係性妥当性検証', 'パターン一貫性確認'],
        limitations: ['サンプルサイズの制限', '分析手法の制約', '文脈依存性'],
        alternativeExplanations: ['地域特性による偶然の一致', '他の要因の影響']
      },
      integrationQuality: {
        coherence: 0.81,
        evidence_strength: 0.75,
        concept_diversity: 0.68,
        logical_consistency: 0.79,
        paradigm_robustness: 0.76
      }
    };
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
        <div style={styles.header}>
          <h2 style={styles.title}>🧠 グラウンデッド・セオリー分析結果</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {onSave && (
              <button
                style={{
                  padding: '8px 16px',
                  backgroundColor: THEME_COLORS.primaryGreen,
                  color: THEME_COLORS.textInverse,
                  border: 'none',
                  borderRadius: THEME_COLORS.borderRadius.medium,
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  opacity: isSaving ? 0.7 : 1
                }}
                onClick={() => setShowSaveDialog(true)}
                disabled={isSaving}
                onMouseEnter={(e) => {
                  if (!isSaving) {
                    e.currentTarget.style.backgroundColor = '#00cc77';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSaving) {
                    e.currentTarget.style.backgroundColor = THEME_COLORS.primaryGreen;
                    e.currentTarget.style.transform = 'translateY(0)';
                  }
                }}
              >
                {isSaving ? '💾 保存中...' : '💾 この分析を保存'}
              </button>
            )}
            <button 
              style={styles.closeButton}
              onClick={onClose}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#e2e8f0';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              ×
            </button>
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
          formationPath={selectedHypothesis ? generateMockFormationPath(
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
                onCancel={() => setShowSaveDialog(false)}
                isLoading={isSaving}
              />
            </div>
          </div>
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