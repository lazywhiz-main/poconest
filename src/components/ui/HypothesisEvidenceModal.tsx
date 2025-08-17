import React, { useState } from 'react';
import { THEME_COLORS } from '../../constants/theme';

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

interface HypothesisEvidenceModalProps {
  isVisible: boolean;
  onClose: () => void;
  formationPath: HypothesisFormationPath | null;
}

/**
 * 🔍 仮説根拠詳細モーダル
 */
export const HypothesisEvidenceModal: React.FC<HypothesisEvidenceModalProps> = ({
  isVisible,
  onClose,
  formationPath
}) => {
  const [activeSection, setActiveSection] = useState<'path' | 'paradigm' | 'clusters' | 'relationships' | 'quality'>('path');

  if (!isVisible || !formationPath) return null;

  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case 'concept_extraction': return THEME_COLORS.primaryBlue;
      case 'relationship_discovery': return THEME_COLORS.primaryPurple;
      case 'pattern_integration': return THEME_COLORS.primaryOrange;
      case 'hypothesis_synthesis': return THEME_COLORS.primaryGreen;
      default: return THEME_COLORS.textMuted;
    }
  };

  const getPhaseLabel = (phase: string) => {
    switch (phase) {
      case 'concept_extraction': return '概念抽出';
      case 'relationship_discovery': return '関係性発見';
      case 'pattern_integration': return 'パターン統合';
      case 'hypothesis_synthesis': return '仮説統合';
      default: return '未知';
    }
  };

  const getRelationTypeLabel = (type: string) => {
    switch (type) {
      case 'causal': return '因果関係';
      case 'correlational': return '相関関係';
      case 'conditional': return '条件関係';
      case 'contextual': return '文脈関係';
      case 'sequential': return '順序関係';
      default: return 'その他';
    }
  };

  const renderParadigmModelSection = () => (
    <div>
      <h3 style={{
        margin: '0 0 20px 0',
        fontSize: '18px',
        fontWeight: '600',
        color: THEME_COLORS.textPrimary
      }}>
        🏗️ パラダイムモデル構成
      </h3>
      
      <div style={{ marginBottom: '20px' }}>
        <div style={{
          padding: '16px',
          backgroundColor: THEME_COLORS.bgSecondary,
          borderRadius: '8px',
          border: `1px solid ${THEME_COLORS.borderPrimary}`
        }}>
          <h4 style={{
            margin: '0 0 12px 0',
            fontSize: '16px',
            fontWeight: '600',
            color: THEME_COLORS.primaryGreen
          }}>
            🎯 中核カテゴリ: {formationPath.paradigmModel.coreCategory}
          </h4>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '16px',
            marginTop: '16px'
          }}>
            <div>
              <h5 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600' }}>🔗 因果条件</h5>
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                {formationPath.paradigmModel.causalConditions.map((condition, index) => (
                  <li key={index} style={{ marginBottom: '4px' }}>{condition}</li>
                ))}
              </ul>
            </div>
            
            <div>
              <h5 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600' }}>🌍 文脈要因</h5>
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                {formationPath.paradigmModel.contextFactors.map((factor, index) => (
                  <li key={index} style={{ marginBottom: '4px' }}>{factor}</li>
                ))}
              </ul>
            </div>
            
            <div>
              <h5 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600' }}>⚡ 介在条件</h5>
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                {formationPath.paradigmModel.interveningConditions.map((condition, index) => (
                  <li key={index} style={{ marginBottom: '4px' }}>{condition}</li>
                ))}
              </ul>
            </div>
            
            <div>
              <h5 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600' }}>🎬 行動戦略</h5>
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                {formationPath.paradigmModel.actionStrategies.map((strategy, index) => (
                  <li key={index} style={{ marginBottom: '4px' }}>{strategy}</li>
                ))}
              </ul>
            </div>
          </div>
          
          <div style={{ marginTop: '16px' }}>
            <h5 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600' }}>📈 結果・帰結</h5>
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              {formationPath.paradigmModel.consequences.map((consequence, index) => (
                <li key={index} style={{ marginBottom: '4px' }}>{consequence}</li>
              ))}
            </ul>
          </div>
          
          <div style={{ marginTop: '16px' }}>
            <h5 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600' }}>📚 理論的枠組み</h5>
            <p style={{ margin: 0, fontStyle: 'italic' }}>{formationPath.paradigmModel.theoreticalFramework}</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderFormationPathSection = () => (
    <div>
      <h3 style={{
        margin: '0 0 20px 0',
        color: THEME_COLORS.primaryGreen,
        fontSize: '18px',
        fontWeight: '600'
      }}>
        🧠 仮説形成パス
      </h3>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        {formationPath.formationSteps.map((step, index) => (
          <div key={step.step} style={{
            padding: '16px',
            backgroundColor: THEME_COLORS.bgQuaternary,
            borderRadius: THEME_COLORS.borderRadius.large,
            border: `1px solid ${THEME_COLORS.borderSecondary}`,
            borderLeft: `4px solid ${getPhaseColor(step.phase)}`
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '12px'
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: getPhaseColor(step.phase),
                color: THEME_COLORS.textInverse,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                fontWeight: '600'
              }}>
                {step.step}
              </div>
              
              <div>
                <div style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: THEME_COLORS.textPrimary
                }}>
                  {getPhaseLabel(step.phase)}
                </div>
                <div style={{
                  fontSize: '12px',
                  color: THEME_COLORS.textSecondary
                }}>
                  信頼度: {Math.round(step.confidenceScore * 100)}%
                </div>
              </div>
            </div>

            <div style={{
              fontSize: '14px',
              color: THEME_COLORS.textPrimary,
              lineHeight: '1.6',
              marginBottom: '12px'
            }}>
              {step.description}
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '16px',
              fontSize: '12px'
            }}>
              <div>
                <div style={{
                  fontWeight: '600',
                  color: THEME_COLORS.textPrimary,
                  marginBottom: '4px'
                }}>
                  📥 入力概念
                </div>
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '4px'
                }}>
                  {step.inputConcepts.map((concept, i) => (
                    <span key={i} style={{
                      padding: '2px 6px',
                      backgroundColor: THEME_COLORS.bgTertiary,
                      color: THEME_COLORS.textSecondary,
                      borderRadius: THEME_COLORS.borderRadius.small,
                      fontSize: '11px'
                    }}>
                      {concept}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <div style={{
                  fontWeight: '600',
                  color: THEME_COLORS.textPrimary,
                  marginBottom: '4px'
                }}>
                  📤 出力パターン
                </div>
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '4px'
                }}>
                  {step.outputPatterns.map((pattern, i) => (
                    <span key={i} style={{
                      padding: '2px 6px',
                      backgroundColor: getPhaseColor(step.phase) + '20',
                      color: getPhaseColor(step.phase),
                      borderRadius: THEME_COLORS.borderRadius.small,
                      fontSize: '11px',
                      fontWeight: '500'
                    }}>
                      {pattern}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderClustersSection = () => (
    <div>
      <h3 style={{
        margin: '0 0 20px 0',
        color: THEME_COLORS.primaryBlue,
        fontSize: '18px',
        fontWeight: '600'
      }}>
        🏢 貢献クラスター
      </h3>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        {formationPath.contributingClusters.map((cluster, index) => (
          <div key={cluster.clusterId} style={{
            padding: '16px',
            backgroundColor: THEME_COLORS.bgQuaternary,
            borderRadius: THEME_COLORS.borderRadius.large,
            border: `1px solid ${THEME_COLORS.borderSecondary}`
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '12px'
            }}>
              <div>
                <div style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: THEME_COLORS.textPrimary
                }}>
                  {cluster.clusterName}
                </div>
                <div style={{
                  fontSize: '12px',
                  color: THEME_COLORS.textSecondary
                }}>
                  {cluster.conceptCount}個の概念貢献
                </div>
              </div>
              
              <div style={{
                padding: '4px 8px',
                borderRadius: THEME_COLORS.borderRadius.medium,
                fontSize: '11px',
                fontWeight: '600',
                backgroundColor: cluster.contributionType === 'primary' ? THEME_COLORS.primaryGreen + '20' :
                                 cluster.contributionType === 'secondary' ? THEME_COLORS.primaryOrange + '20' :
                                 THEME_COLORS.textMuted + '20',
                color: cluster.contributionType === 'primary' ? THEME_COLORS.primaryGreen :
                       cluster.contributionType === 'secondary' ? THEME_COLORS.primaryOrange :
                       THEME_COLORS.textMuted
              }}>
                {cluster.contributionType === 'primary' ? '主要' :
                 cluster.contributionType === 'secondary' ? '副次' : '支援'}
              </div>
            </div>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              {cluster.conceptContributions.map((contribution, i) => (
                <div key={i} style={{
                  padding: '8px',
                  backgroundColor: THEME_COLORS.bgTertiary,
                  borderRadius: THEME_COLORS.borderRadius.medium,
                  fontSize: '12px'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '4px'
                  }}>
                    <span style={{
                      fontWeight: '600',
                      color: THEME_COLORS.textPrimary
                    }}>
                      {contribution.concept}
                    </span>
                    <span style={{
                      color: THEME_COLORS.textSecondary
                    }}>
                      関連度: {Math.round(contribution.relevance * 100)}%
                    </span>
                  </div>
                  <div style={{
                    color: THEME_COLORS.textSecondary,
                    fontSize: '11px'
                  }}>
                    {contribution.evidenceText.join(', ')}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderRelationshipsSection = () => (
    <div>
      <h3 style={{
        margin: '0 0 20px 0',
        color: THEME_COLORS.primaryPurple,
        fontSize: '18px',
        fontWeight: '600'
      }}>
        🔗 関係性証拠
      </h3>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        {formationPath.relationshipEvidence.map((relationship, index) => (
          <div key={index} style={{
            padding: '16px',
            backgroundColor: THEME_COLORS.bgQuaternary,
            borderRadius: THEME_COLORS.borderRadius.large,
            border: `1px solid ${THEME_COLORS.borderSecondary}`
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '12px'
            }}>
              <div style={{
                fontSize: '14px',
                fontWeight: '600',
                color: THEME_COLORS.textPrimary
              }}>
                {relationship.sourceCluster}
              </div>
              
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <div style={{
                  padding: '2px 6px',
                  backgroundColor: THEME_COLORS.primaryPurple + '20',
                  color: THEME_COLORS.primaryPurple,
                  borderRadius: THEME_COLORS.borderRadius.small,
                  fontSize: '10px',
                  fontWeight: '600'
                }}>
                  {getRelationTypeLabel(relationship.relationType)}
                </div>
                <span style={{
                  color: THEME_COLORS.textSecondary,
                  fontSize: '12px'
                }}>
                  強度: {Math.round(relationship.strength * 100)}%
                </span>
              </div>
              
              <div style={{
                fontSize: '14px',
                fontWeight: '600',
                color: THEME_COLORS.textPrimary
              }}>
                {relationship.targetCluster}
              </div>
            </div>

            {relationship.mediatingConcepts.length > 0 && (
              <div style={{ marginBottom: '8px' }}>
                <div style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  color: THEME_COLORS.textPrimary,
                  marginBottom: '4px'
                }}>
                  🔄 媒介概念
                </div>
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '4px'
                }}>
                  {relationship.mediatingConcepts.map((concept, i) => (
                    <span key={i} style={{
                      padding: '2px 6px',
                      backgroundColor: THEME_COLORS.bgTertiary,
                      color: THEME_COLORS.textSecondary,
                      borderRadius: THEME_COLORS.borderRadius.small,
                      fontSize: '11px'
                    }}>
                      {concept}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div>
              <div style={{
                fontSize: '12px',
                fontWeight: '600',
                color: THEME_COLORS.textPrimary,
                marginBottom: '4px'
              }}>
                📋 証拠連鎖
              </div>
              <ol style={{
                margin: 0,
                paddingLeft: '16px',
                color: THEME_COLORS.textSecondary,
                fontSize: '12px'
              }}>
                {relationship.evidenceChain.map((evidence, i) => (
                  <li key={i}>{evidence}</li>
                ))}
              </ol>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderQualitySection = () => (
    <div>
      <h3 style={{
        margin: '0 0 20px 0',
        color: THEME_COLORS.primaryOrange,
        fontSize: '18px',
        fontWeight: '600'
      }}>
        📊 統合品質評価
      </h3>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px'
      }}>
        {[
          { key: 'coherence', label: '一貫性', description: '論理的整合性', color: THEME_COLORS.primaryGreen },
          { key: 'evidence_strength', label: '証拠強度', description: '根拠の確実性', color: THEME_COLORS.primaryBlue },
          { key: 'concept_diversity', label: '概念多様性', description: '視点の豊富さ', color: THEME_COLORS.primaryPurple },
          { key: 'logical_consistency', label: '論理一貫性', description: '推論の妥当性', color: THEME_COLORS.primaryOrange }
        ].map(metric => {
          const value = formationPath.integrationQuality[metric.key as keyof typeof formationPath.integrationQuality];
          return (
            <div key={metric.key} style={{
              padding: '16px',
              backgroundColor: THEME_COLORS.bgQuaternary,
              borderRadius: THEME_COLORS.borderRadius.large,
              border: `1px solid ${THEME_COLORS.borderSecondary}`,
              textAlign: 'center'
            }}>
              <div style={{
                fontSize: '24px',
                fontWeight: '700',
                color: metric.color,
                marginBottom: '4px'
              }}>
                {Math.round(value * 100)}%
              </div>
              
              <div style={{
                fontSize: '14px',
                fontWeight: '600',
                color: THEME_COLORS.textPrimary,
                marginBottom: '4px'
              }}>
                {metric.label}
              </div>
              
              <div style={{
                fontSize: '12px',
                color: THEME_COLORS.textSecondary
              }}>
                {metric.description}
              </div>

              {/* プログレスバー */}
              <div style={{
                width: '100%',
                height: '4px',
                backgroundColor: THEME_COLORS.bgTertiary,
                borderRadius: '2px',
                marginTop: '8px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${value * 100}%`,
                  height: '100%',
                  backgroundColor: metric.color,
                  transition: 'width 0.3s ease'
                }} />
              </div>
            </div>
          );
        })}
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
        maxWidth: '1000px',
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
          justifyContent: 'space-between'
        }}>
          <div>
            <h2 style={{
              margin: 0,
              color: THEME_COLORS.textPrimary,
              fontSize: '20px',
              fontWeight: '600'
            }}>
              🔍 仮説形成の根拠詳細
            </h2>
            <div style={{
              marginTop: '4px',
              fontSize: '14px',
              color: THEME_COLORS.textSecondary
            }}>
              {formationPath.hypothesis.length > 60 
                ? `${formationPath.hypothesis.substring(0, 60)}...`
                : formationPath.hypothesis
              }
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
            { key: 'path', label: '🧠 形成パス', color: THEME_COLORS.primaryGreen },
            { key: 'paradigm', label: '🏗️ パラダイム', color: THEME_COLORS.primaryBlue },
            { key: 'clusters', label: '🏢 クラスター', color: THEME_COLORS.primaryBlue },
            { key: 'relationships', label: '🔗 関係性', color: THEME_COLORS.primaryPurple },
            { key: 'quality', label: '📊 品質評価', color: THEME_COLORS.primaryOrange }
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
                color: activeSection === section.key ? section.color : THEME_COLORS.textSecondary,
                borderBottomColor: activeSection === section.key ? section.color : 'transparent',
                backgroundColor: activeSection === section.key ? THEME_COLORS.bgTertiary : 'transparent'
              }}
              onClick={() => setActiveSection(section.key as any)}
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
          {activeSection === 'path' && renderFormationPathSection()}
          {activeSection === 'paradigm' && renderParadigmModelSection()}
          {activeSection === 'clusters' && renderClustersSection()}
          {activeSection === 'relationships' && renderRelationshipsSection()}
          {activeSection === 'quality' && renderQualitySection()}
        </div>
      </div>
    </div>
  );
};

export default HypothesisEvidenceModal;
