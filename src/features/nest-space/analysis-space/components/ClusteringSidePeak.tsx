import React, { useState, useCallback } from 'react';
import { THEME_COLORS } from '../../../../constants/theme';
import { ClusterViewManager } from './ClusterViewManager';
import type { BoardItem } from '../../../../services/SmartClusteringService';

// クラスタリング結果の型定義
interface ClusteringResult {
  clusters: Array<{
    id: number;
    nodes: string[];
    size: number;
    label: string;
  }>;
  unclassifiedNodes: string[];
  totalNodes: number;
  clusterCount: number;
  nodeClusterMap: { [nodeId: string]: number };
}

// 高度解析設定の型定義
interface AdvancedConfig {
  algorithm: 'hdbscan' | 'dbscan' | 'kmeans' | 'hierarchical';
  weights: {
    edgeStrength: number;
    tagSimilarity: number;
    semanticSimilarity: number;
  };
  clustering: {
    minClusterSize: number;
    maxClusterSize: number;
    similarityThreshold: number;
  };
  labeling: {
    useSemanticLabeling: boolean;
    maxLabelsPerCluster: number;
    confidenceThreshold: number;
  };
}

// クラスターラベルの型定義（AnalysisServiceと同じ）
interface ClusterLabel {
  id: string;
  text: string;
  position: { x: number; y: number };
  cardIds: string[];
  confidence?: number;
  theme?: string;
  metadata?: {
    dominantTags?: string[];
    avgConnections?: number;
    centerCard?: string;
  };
}

interface ClusteringSidePeakProps {
  /** 現在の分析モード */
  analysisMode: 'simple' | 'advanced' | 'saved-views';
  /** 分析モード変更 */
  onAnalysisModeChange: (mode: 'simple' | 'advanced' | 'saved-views') => void;
  /** 重み閾値フィルタリング使用フラグ */
  useWeightFiltering: boolean;
  /** 重み閾値フィルタリング切り替え */
  onUseWeightFilteringChange: (use: boolean) => void;
  /** 強度閾値 */
  strengthThreshold: number;
  /** 強度閾値変更 */
  onStrengthThresholdChange: (threshold: number) => void;
  /** フィルタリング結果表示フラグ */
  showFilteredClusters: boolean;
  /** フィルタリング結果表示切り替え */
  onShowFilteredClustersChange: (show: boolean) => void;
  /** 高度解析設定 */
  advancedConfig: AdvancedConfig;
  /** 高度解析設定変更 */
  onAdvancedConfigChange: (config: AdvancedConfig) => void;
  /** シンプルクラスタリング実行 */
  onExecuteSimpleClustering: () => void;
  /** 高度解析実行 */
  onExecuteAdvancedClustering: () => void;
  /** クラスタービュー読み込み */
  onLoadClusterView: (clusterView: any) => void;
  /** 現在のクラスターを保存できるか */
  canSaveCluster: () => boolean;
  /** 現在のクラスターを保存 */
  onSaveCurrentCluster: () => void;
  /** ボードID */
  boardId: string;
  /** カード情報リスト */
  cards: BoardItem[];

  // 表示中のクラスター関連（新規追加）
  /** 現在表示中のクラスターラベル */
  clusterLabels: ClusterLabel[];
  /** ラベル表示フラグ */
  showLabels: boolean;
  /** ラベル表示切り替え */
  onShowLabelsChange: (show: boolean) => void;
  /** クラスタークリック処理 */
  onClusterClick: (clusterId: string) => void;
  /** クラスターズーム処理 */
  onClusterZoom: (clusterId: string) => void;
  /** クラスター削除処理 */
  onClusterDelete: (clusterId: string) => void;
  /** エクスポートモーダル表示 */
  onShowExportModal: () => void;
}

/**
 * Clustering サイドピークコンポーネント
 * タブ1: クラスタリング実施 / タブ2: 表示中のクラスター / タブ3: 保存済みビュー
 */
export const ClusteringSidePeak: React.FC<ClusteringSidePeakProps> = ({
  analysisMode,
  onAnalysisModeChange,
  useWeightFiltering,
  onUseWeightFilteringChange,
  strengthThreshold,
  onStrengthThresholdChange,
  showFilteredClusters,
  onShowFilteredClustersChange,
  advancedConfig,
  onAdvancedConfigChange,
  onExecuteSimpleClustering,
  onExecuteAdvancedClustering,
  onLoadClusterView,
  canSaveCluster,
  onSaveCurrentCluster,
  boardId,
  cards,
  clusterLabels,
  showLabels,
  onShowLabelsChange,
  onClusterClick,
  onClusterZoom,
  onClusterDelete,
  onShowExportModal,
}) => {
  const [activeTab, setActiveTab] = useState<'execution' | 'displayed' | 'saved'>('execution');

  // ボタンホバー効果
  const handleButtonHover = useCallback((e: React.MouseEvent, isEnter: boolean) => {
    const target = e.currentTarget as HTMLElement;
    if (isEnter) {
      target.style.transform = 'translateY(-1px)';
      target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
    } else {
      target.style.transform = 'translateY(0)';
      target.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
    }
  }, []);

  // スタイル定義
  const styles = {
    tabContainer: {
      display: 'flex',
      borderBottom: `1px solid ${THEME_COLORS.borderSecondary}`,
      marginBottom: '20px',
    } as React.CSSProperties,
    tab: {
      flex: 1,
      padding: '12px 16px',
      border: 'none',
      backgroundColor: THEME_COLORS.bgTertiary,
      color: THEME_COLORS.textSecondary,
      fontSize: '13px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      borderBottom: '2px solid transparent',
    } as React.CSSProperties,
    activeTab: {
      backgroundColor: THEME_COLORS.bgPrimary,
      color: THEME_COLORS.textPrimary,
      borderBottom: `2px solid ${THEME_COLORS.primaryGreen}`,
    } as React.CSSProperties,
    content: {
      flex: 1,
      overflow: 'auto',
      padding: '0 4px',
    } as React.CSSProperties,
    section: {
      marginBottom: '24px',
      padding: '16px',
      background: THEME_COLORS.bgSecondary,
      borderRadius: THEME_COLORS.borderRadius.medium,
      border: `1px solid ${THEME_COLORS.borderPrimary}`,
    } as React.CSSProperties,
    sectionTitle: {
      fontSize: '14px',
      fontWeight: '600',
      color: THEME_COLORS.textPrimary,
      marginBottom: '8px',
      fontFamily: 'Space Grotesk, system-ui, sans-serif',
    } as React.CSSProperties,
    sectionDesc: {
      fontSize: '12px',
      color: THEME_COLORS.textSecondary,
      marginBottom: '16px',
      lineHeight: '1.4',
    } as React.CSSProperties,
    buttonGroup: {
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
    } as React.CSSProperties,
    button: {
      padding: '8px 16px',
      border: `1px solid ${THEME_COLORS.borderSecondary}`,
      borderRadius: THEME_COLORS.borderRadius.medium,
      backgroundColor: THEME_COLORS.bgTertiary,
      color: THEME_COLORS.textSecondary,
      fontSize: '12px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    } as React.CSSProperties,
    primaryButton: {
      backgroundColor: THEME_COLORS.primaryGreen,
      color: THEME_COLORS.textInverse,
      borderColor: THEME_COLORS.primaryGreen,
    } as React.CSSProperties,
    disabledButton: {
      opacity: 0.6,
      cursor: 'not-allowed',
    } as React.CSSProperties,
    controlGroup: {
      marginBottom: '16px',
    } as React.CSSProperties,
    controlLabel: {
      display: 'flex',
      alignItems: 'center',
      fontSize: '12px',
      color: THEME_COLORS.textSecondary,
      marginBottom: '8px',
      fontWeight: '600',
    } as React.CSSProperties,
    checkbox: {
      marginRight: '8px',
      accentColor: THEME_COLORS.primaryGreen,
    } as React.CSSProperties,
    slider: {
      width: '100%',
      margin: '8px 0',
      accentColor: THEME_COLORS.primaryGreen,
    } as React.CSSProperties,
    sliderLabels: {
      display: 'flex',
      justifyContent: 'space-between',
      fontSize: '10px',
      color: THEME_COLORS.textMuted,
    } as React.CSSProperties,
    select: {
      width: '100%',
      padding: '8px',
      border: `1px solid ${THEME_COLORS.borderSecondary}`,
      borderRadius: THEME_COLORS.borderRadius.small,
      backgroundColor: THEME_COLORS.bgTertiary,
      color: THEME_COLORS.textSecondary,
      fontSize: '12px',
    } as React.CSSProperties,
    input: {
      width: '100%',
      padding: '6px 8px',
      border: `1px solid ${THEME_COLORS.borderSecondary}`,
      borderRadius: THEME_COLORS.borderRadius.small,
      backgroundColor: THEME_COLORS.bgTertiary,
      color: THEME_COLORS.textSecondary,
      fontSize: '12px',
    } as React.CSSProperties,
  };

  // タブ1: クラスタリング実施
  const renderExecutionTab = () => (
    <div style={styles.content}>
      {/* 分析モード選択 */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>
          🎛️ 分析モード選択
        </div>
        <div style={styles.sectionDesc}>
          用途に応じてクラスタリング手法を選択してください。
        </div>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <button
            style={{
              ...styles.button,
              ...(analysisMode === 'simple' ? styles.primaryButton : {}),
              flex: 1,
            }}
            onClick={() => onAnalysisModeChange('simple')}
            onMouseEnter={(e) => handleButtonHover(e, true)}
            onMouseLeave={(e) => handleButtonHover(e, false)}
          >
            シンプル
          </button>
          <button
            style={{
              ...styles.button,
              ...(analysisMode === 'advanced' ? styles.primaryButton : {}),
              flex: 1,
            }}
            onClick={() => onAnalysisModeChange('advanced')}
            onMouseEnter={(e) => handleButtonHover(e, true)}
            onMouseLeave={(e) => handleButtonHover(e, false)}
          >
            高度解析 🔬
          </button>
        </div>
      </div>

      {/* シンプルモード設定 */}
      {analysisMode === 'simple' && (
        <div style={styles.section}>
          <div style={styles.sectionTitle}>
            ⚡ シンプルクラスタリング設定
          </div>
          <div style={styles.sectionDesc}>
            関係性の強度に基づいてシンプルにクラスタリングを実行します。
          </div>
          
          <div style={styles.controlGroup}>
            <label style={styles.controlLabel}>
              <input
                type="checkbox"
                checked={useWeightFiltering}
                onChange={(e) => onUseWeightFilteringChange(e.target.checked)}
                style={styles.checkbox}
              />
              重み閾値フィルタリングを使用
            </label>
          </div>

          {useWeightFiltering && (
            <div style={styles.controlGroup}>
              <label style={styles.controlLabel}>
                強度閾値: {strengthThreshold.toFixed(2)}
              </label>
              <input
                type="range"
                min="0.1"
                max="0.9"
                step="0.05"
                value={strengthThreshold}
                onChange={(e) => onStrengthThresholdChange(parseFloat(e.target.value))}
                style={styles.slider}
              />
              <div style={styles.sliderLabels}>
                <span>0.1 (緩い)</span>
                <span>0.9 (厳格)</span>
              </div>
            </div>
          )}

          <div style={styles.controlGroup}>
            <label style={styles.controlLabel}>
              <input
                type="checkbox"
                checked={showFilteredClusters}
                onChange={(e) => onShowFilteredClustersChange(e.target.checked)}
                style={styles.checkbox}
              />
              フィルタリング結果をクラスタ表示
            </label>
          </div>

          <div style={styles.buttonGroup}>
            <button
              style={{
                ...styles.button,
                ...styles.primaryButton,
              }}
              onClick={onExecuteSimpleClustering}
              onMouseEnter={(e) => handleButtonHover(e, true)}
              onMouseLeave={(e) => handleButtonHover(e, false)}
            >
              ⚡ シンプルクラスタリング実行
            </button>
          </div>
        </div>
      )}

      {/* 高度解析モード設定 */}
      {analysisMode === 'advanced' && (
        <div style={styles.section}>
          <div style={styles.sectionTitle}>
            🔬 高度解析設定
          </div>
          <div style={styles.sectionDesc}>
            アルゴリズムや重み付けを詳細に設定して高精度なクラスタリングを実行します。
          </div>

          {/* アルゴリズム選択 */}
          <div style={styles.controlGroup}>
            <label style={styles.controlLabel}>
              🧮 クラスタリングアルゴリズム
            </label>
            <select
              value={advancedConfig.algorithm}
              onChange={(e) => onAdvancedConfigChange({
                ...advancedConfig,
                algorithm: e.target.value as any
              })}
              style={styles.select}
            >
              <option value="hdbscan">HDBSCAN (階層密度ベース) 🚀</option>
              <option value="dbscan">DBSCAN (密度ベース)</option>
              <option value="kmeans">K-means (中心ベース)</option>
              <option value="hierarchical">階層クラスタリング</option>
            </select>
          </div>

          {/* 類似性重み設定 */}
          <div style={styles.controlGroup}>
            <label style={styles.controlLabel}>
              ⚖️ 類似性重み設定
            </label>
            
            <div style={{ marginBottom: '12px' }}>
              <label style={{ ...styles.controlLabel, fontSize: '11px' }}>
                エッジ強度: {advancedConfig.weights.edgeStrength.toFixed(1)}
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={advancedConfig.weights.edgeStrength}
                onChange={(e) => onAdvancedConfigChange({
                  ...advancedConfig,
                  weights: {
                    ...advancedConfig.weights,
                    edgeStrength: parseFloat(e.target.value)
                  }
                })}
                style={styles.slider}
              />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ ...styles.controlLabel, fontSize: '11px' }}>
                タグ類似性: {advancedConfig.weights.tagSimilarity.toFixed(1)}
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={advancedConfig.weights.tagSimilarity}
                onChange={(e) => onAdvancedConfigChange({
                  ...advancedConfig,
                  weights: {
                    ...advancedConfig.weights,
                    tagSimilarity: parseFloat(e.target.value)
                  }
                })}
                style={styles.slider}
              />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ ...styles.controlLabel, fontSize: '11px' }}>
                意味的類似性: {advancedConfig.weights.semanticSimilarity.toFixed(1)}
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={advancedConfig.weights.semanticSimilarity}
                onChange={(e) => onAdvancedConfigChange({
                  ...advancedConfig,
                  weights: {
                    ...advancedConfig.weights,
                    semanticSimilarity: parseFloat(e.target.value)
                  }
                })}
                style={styles.slider}
              />
            </div>
          </div>

          {/* クラスタリングパラメータ */}
          <div style={styles.controlGroup}>
            <label style={styles.controlLabel}>
              🎯 クラスタリングパラメータ
            </label>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
              <div>
                <label style={{ ...styles.controlLabel, fontSize: '10px' }}>最小クラスターサイズ</label>
                <input
                  type="number"
                  min="2"
                  max="10"
                  value={advancedConfig.clustering.minClusterSize}
                  onChange={(e) => onAdvancedConfigChange({
                    ...advancedConfig,
                    clustering: {
                      ...advancedConfig.clustering,
                      minClusterSize: parseInt(e.target.value)
                    }
                  })}
                  style={styles.input}
                />
              </div>
              <div>
                <label style={{ ...styles.controlLabel, fontSize: '10px' }}>最大クラスターサイズ</label>
                <input
                  type="number"
                  min="5"
                  max="20"
                  value={advancedConfig.clustering.maxClusterSize}
                  onChange={(e) => onAdvancedConfigChange({
                    ...advancedConfig,
                    clustering: {
                      ...advancedConfig.clustering,
                      maxClusterSize: parseInt(e.target.value)
                    }
                  })}
                  style={styles.input}
                />
              </div>
            </div>

            <div>
              <label style={{ ...styles.controlLabel, fontSize: '10px' }}>
                類似性閾値: {advancedConfig.clustering.similarityThreshold.toFixed(2)}
              </label>
              <input
                type="range"
                min="0.1"
                max="0.9"
                step="0.05"
                value={advancedConfig.clustering.similarityThreshold}
                onChange={(e) => onAdvancedConfigChange({
                  ...advancedConfig,
                  clustering: {
                    ...advancedConfig.clustering,
                    similarityThreshold: parseFloat(e.target.value)
                  }
                })}
                style={styles.slider}
              />
            </div>
          </div>

          <div style={styles.buttonGroup}>
            <button
              style={{
                ...styles.button,
                ...styles.primaryButton,
              }}
              onClick={onExecuteAdvancedClustering}
              onMouseEnter={(e) => handleButtonHover(e, true)}
              onMouseLeave={(e) => handleButtonHover(e, false)}
            >
              🔬 高度解析実行
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // タブ2: 表示中のクラスター
  const renderDisplayedTab = () => (
    <div style={styles.content}>
      {/* ラベル表示制御セクション */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>
          👁️ クラスターラベル表示制御
        </div>
        <div style={styles.sectionDesc}>
          ネットワーク上のクラスターラベルの表示/非表示を制御できます。
        </div>
        
        <div style={styles.controlGroup}>
          <label style={styles.controlLabel}>
            <input
              type="checkbox"
              checked={showLabels}
              onChange={(e) => onShowLabelsChange(e.target.checked)}
              style={styles.checkbox}
            />
            クラスターラベルを表示
          </label>
        </div>
      </div>

      {/* エクスポート機能 */}
      {clusterLabels.length > 0 && (
        <div style={styles.section}>
          <div style={styles.sectionTitle}>
            📊 エクスポート
          </div>
          <div style={styles.sectionDesc}>
            現在表示中のクラスターをCSV、JSON、Excel形式でエクスポートできます。
          </div>
          <button
            style={{
              ...styles.button,
              ...styles.primaryButton,
              width: '100%',
              marginTop: '8px'
            }}
            onClick={onShowExportModal}
            onMouseEnter={handleButtonHover}
            onMouseLeave={(e) => handleButtonHover(e, false)}
          >
            📊 クラスタリング結果をエクスポート
          </button>
        </div>
      )}

      {/* 表示中のクラスター一覧 */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>
          📌 表示中のクラスター一覧
        </div>
        <div style={styles.sectionDesc}>
          現在ネットワーク上に表示されているクラスターの詳細情報です。
        </div>
        
        {clusterLabels.length === 0 ? (
          <div style={{
            textAlign: 'center',
            color: THEME_COLORS.textMuted,
            fontSize: '12px',
            padding: '20px',
            background: THEME_COLORS.bgTertiary,
            borderRadius: THEME_COLORS.borderRadius.medium,
          }}>
            表示中のクラスターがありません
            <br />
            <span style={{ fontSize: '10px' }}>
              「クラスタリング実施」タブで分析を実行してください
            </span>
          </div>
        ) : (
          <div style={{
            maxHeight: '400px',
            overflowY: 'auto',
          }}>
            {clusterLabels.map((cluster, index) => (
              <div
                key={cluster.id}
                style={{
                  background: THEME_COLORS.bgTertiary,
                  border: `1px solid ${THEME_COLORS.borderSecondary}`,
                  borderRadius: '8px',
                  padding: '12px',
                  marginBottom: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onClick={() => onClusterClick(cluster.id)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = THEME_COLORS.primaryGreen;
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = `0 4px 12px ${THEME_COLORS.primaryGreen}20`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = THEME_COLORS.borderSecondary;
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {/* クラスター基本情報 */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '8px',
                }}>
                  <div style={{
                    flex: 1,
                    marginRight: '8px',
                  }}>
                    <div style={{
                      color: THEME_COLORS.textPrimary,
                      fontSize: '12px',
                      fontWeight: '600',
                      marginBottom: '4px',
                      lineHeight: '1.3',
                    }}>
                      {cluster.text}
                    </div>
                    <div style={{
                      color: THEME_COLORS.textMuted,
                      fontSize: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}>
                      <span>📊 {cluster.cardIds.length} カード</span>
                      {cluster.confidence && (
                        <span>🎯 {Math.round(cluster.confidence * 100)}%</span>
                      )}
                    </div>
                  </div>
                  
                  {/* アクションボタン */}
                  <div style={{
                    display: 'flex',
                    gap: '4px',
                  }}>
                    <button
                      style={{
                        background: THEME_COLORS.primaryBlue,
                        border: 'none',
                        borderRadius: '4px',
                        color: THEME_COLORS.textInverse,
                        padding: '4px 8px',
                        fontSize: '10px',
                        cursor: 'pointer',
                        fontWeight: '500',
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onClusterClick(cluster.id);
                      }}
                      onMouseEnter={(e) => handleButtonHover(e, true)}
                      onMouseLeave={(e) => handleButtonHover(e, false)}
                      title="詳細表示"
                    >
                      👁️ 詳細
                    </button>
                    <button
                      style={{
                        background: THEME_COLORS.primaryCyan,
                        border: 'none',
                        borderRadius: '4px',
                        color: THEME_COLORS.textInverse,
                        padding: '4px 8px',
                        fontSize: '10px',
                        cursor: 'pointer',
                        fontWeight: '500',
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onClusterZoom(cluster.id);
                      }}
                      onMouseEnter={(e) => handleButtonHover(e, true)}
                      onMouseLeave={(e) => handleButtonHover(e, false)}
                      title="ズーム"
                    >
                      🔍 ズーム
                    </button>
                    <button
                      style={{
                        background: THEME_COLORS.primaryRed,
                        border: 'none',
                        borderRadius: '4px',
                        color: THEME_COLORS.textInverse,
                        padding: '4px 8px',
                        fontSize: '10px',
                        cursor: 'pointer',
                        fontWeight: '500',
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onClusterDelete(cluster.id);
                      }}
                      onMouseEnter={(e) => handleButtonHover(e, true)}
                      onMouseLeave={(e) => handleButtonHover(e, false)}
                      title="削除"
                    >
                      🗑️ 削除
                    </button>
                  </div>
                </div>
                
                {/* テーマとタグ */}
                {(cluster.theme || cluster.metadata?.dominantTags) && (
                  <div style={{
                    fontSize: '9px',
                    color: THEME_COLORS.textMuted,
                    marginBottom: '8px',
                  }}>
                    {cluster.theme && (
                      <div style={{ marginBottom: '2px' }}>
                        🎨 テーマ: {cluster.theme}
                      </div>
                    )}
                    {cluster.metadata?.dominantTags && cluster.metadata.dominantTags.length > 0 && (
                      <div>
                        🏷️ タグ: {cluster.metadata.dominantTags.slice(0, 3).join(', ')}
                        {cluster.metadata.dominantTags.length > 3 && '...'}
                      </div>
                    )}
                  </div>
                )}

                {/* カード一覧（先頭3件のみ表示） */}
                <div style={{
                  fontSize: '9px',
                  color: THEME_COLORS.textMuted,
                }}>
                  📄 カード:
                  <div style={{
                    marginTop: '4px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                  }}>
                    {cluster.cardIds.slice(0, 3).map(cardId => {
                      const card = cards.find(c => c.id === cardId);
                      return card ? (
                        <div key={cardId} style={{
                          padding: '2px 6px',
                          background: THEME_COLORS.bgQuaternary,
                          borderRadius: '3px',
                          fontSize: '8px',
                          maxWidth: '100%',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                          {card.title}
                        </div>
                      ) : null;
                    })}
                    {cluster.cardIds.length > 3 && (
                      <div style={{
                        fontSize: '8px',
                        color: THEME_COLORS.textMuted,
                        fontStyle: 'italic',
                      }}>
                        +{cluster.cardIds.length - 3} その他のカード
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 統計情報 */}
        {clusterLabels.length > 0 && (
          <div style={{
            marginTop: '16px',
            padding: '12px',
            background: THEME_COLORS.bgQuaternary,
            borderRadius: THEME_COLORS.borderRadius.medium,
            fontSize: '11px',
          }}>
            <div style={{
              color: THEME_COLORS.textSecondary,
              fontWeight: '600',
              marginBottom: '8px',
            }}>
              📊 クラスター統計
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '8px',
              fontSize: '10px',
              color: THEME_COLORS.textMuted,
            }}>
              <div>
                <span style={{ fontWeight: '600' }}>{clusterLabels.length}</span> クラスター
              </div>
              <div>
                <span style={{ fontWeight: '600' }}>
                  {clusterLabels.reduce((total, cluster) => total + cluster.cardIds.length, 0)}
                </span> 総カード数
              </div>
              <div>
                平均: <span style={{ fontWeight: '600' }}>
                  {Math.round(clusterLabels.reduce((total, cluster) => total + cluster.cardIds.length, 0) / clusterLabels.length)}
                </span> カード/クラスター
              </div>
              <div>
                平均信頼度: <span style={{ fontWeight: '600' }}>
                  {Math.round(clusterLabels.reduce((total, cluster) => total + (cluster.confidence || 0), 0) / clusterLabels.length * 100)}
                </span>%
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // タブ3: 保存済みビュー
  const renderSavedTab = () => (
    <div style={styles.content}>
      <div style={styles.section}>
        <div style={styles.sectionTitle}>
          📚 保存済みクラスタービュー
        </div>
        <div style={styles.sectionDesc}>
          過去に保存したクラスタリング結果を呼び出して再表示できます。
        </div>
        
        <ClusterViewManager
          boardId={boardId}
          onLoadView={onLoadClusterView}
          onClose={() => {}} // サイドピーク内なのでクローズ不要
        />

        {/* 現在のクラスターを保存ボタン */}
        {canSaveCluster() && (
          <div style={{ marginTop: '16px' }}>
            <button
              style={{
                ...styles.button,
                ...styles.primaryButton,
                width: '100%',
              }}
              onClick={onSaveCurrentCluster}
              onMouseEnter={(e) => handleButtonHover(e, true)}
              onMouseLeave={(e) => handleButtonHover(e, false)}
            >
              💾 現在のクラスターを保存
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* タブナビゲーション */}
      <div style={styles.tabContainer}>
        <button
          style={{
            ...styles.tab,
            ...(activeTab === 'execution' ? styles.activeTab : {}),
          }}
          onClick={() => setActiveTab('execution')}
        >
          🎛️ クラスタリング実施
        </button>
        <button
          style={{
            ...styles.tab,
            ...(activeTab === 'displayed' ? styles.activeTab : {}),
          }}
          onClick={() => setActiveTab('displayed')}
        >
          📌 表示中のクラスター
        </button>
        <button
          style={{
            ...styles.tab,
            ...(activeTab === 'saved' ? styles.activeTab : {}),
          }}
          onClick={() => setActiveTab('saved')}
        >
          📚 保存済みビュー
        </button>
      </div>

      {/* タブコンテンツ */}
      {activeTab === 'execution' && renderExecutionTab()}
      {activeTab === 'displayed' && renderDisplayedTab()}
      {activeTab === 'saved' && renderSavedTab()}
    </div>
  );
};
