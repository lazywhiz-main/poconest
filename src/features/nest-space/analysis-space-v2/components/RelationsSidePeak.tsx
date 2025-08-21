import React, { useState, useMemo } from 'react';
import { useAnalysisSpace } from '../contexts/AnalysisSpaceContext';
import type { NetworkEdge, NetworkNode } from '../types';

interface RelationsSidePeakProps {
  isOpen: boolean;
  onClose: () => void;
}

const RelationsSidePeak: React.FC<RelationsSidePeakProps> = ({ isOpen, onClose }) => {
  const { state } = useAnalysisSpace();
  const { networkData } = state;
  const { selectedNode } = state.network;
  const [selectedEdgeType, setSelectedEdgeType] = useState<string>('all');
  const [minStrength, setMinStrength] = useState(0.1);
  const [showOnlyConnected, setShowOnlyConnected] = useState(false);

  // 関連性の統計情報
  const relationshipStats = useMemo(() => {
    if (!networkData) return null;

    const stats = networkData.edges.reduce((acc, edge) => {
      const type = edge.type || 'unknown';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const totalEdges = networkData.edges.length;
    const avgStrength = networkData.edges.reduce((sum, edge) => sum + edge.strength, 0) / totalEdges;

    return {
      totalEdges,
      avgStrength,
      typeDistribution: stats,
      strengthRange: {
        min: Math.min(...networkData.edges.map(e => e.strength)),
        max: Math.max(...networkData.edges.map(e => e.strength)),
      }
    };
  }, [networkData]);

  // 選択されたノードの関連性
  const selectedNodeRelations = useMemo(() => {
    if (!selectedNode || !networkData) return [];

    return networkData.edges.filter(edge => 
      edge.source === selectedNode.id || edge.target === selectedNode.id
    );
  }, [selectedNode, networkData]);

  // フィルタリングされた関連性
  const filteredEdges = useMemo(() => {
    if (!networkData) return [];

    return networkData.edges.filter(edge => {
      // エッジタイプフィルター
      if (selectedEdgeType !== 'all' && edge.type !== selectedEdgeType) {
        return false;
      }

      // 強度フィルター
      if (edge.strength < minStrength) {
        return false;
      }

      // 選択されたノードとの接続フィルター
      if (showOnlyConnected && selectedNode) {
        return edge.source === selectedNode.id || edge.target === selectedNode.id;
      }

      return true;
    });
  }, [networkData, selectedEdgeType, minStrength, showOnlyConnected, selectedNode]);

  // 関連性の可視化データ
  const visualizationData = useMemo(() => {
    if (!relationshipStats) return null;

    const { typeDistribution, strengthRange } = relationshipStats;
    
    return {
      typeChart: Object.entries(typeDistribution).map(([type, count]) => ({
        type,
        count,
        percentage: (count / relationshipStats.totalEdges) * 100
      })),
      strengthHistogram: Array.from({ length: 10 }, (_, i) => {
        const binStart = strengthRange.min + (i * (strengthRange.max - strengthRange.min) / 10);
        const binEnd = strengthRange.min + ((i + 1) * (strengthRange.max - strengthRange.min) / 10);
        const count = filteredEdges.filter(edge => 
          edge.strength >= binStart && edge.strength < binEnd
        ).length;
        
        return {
          range: `${binStart.toFixed(2)}-${binEnd.toFixed(2)}`,
          count,
          percentage: (count / filteredEdges.length) * 100
        };
      })
    };
  }, [relationshipStats, filteredEdges]);

  if (!isOpen) return null;

  return (
    <div style={styles.container}>
      {/* ヘッダー */}
      <div style={styles.header}>
        <h3 style={styles.title}>🔗 関連性分析</h3>
        <button onClick={onClose} style={styles.closeButton}>×</button>
      </div>

      {/* 統計サマリー */}
      {relationshipStats && (
        <div style={styles.statsSection}>
          <h4 style={styles.sectionTitle}>統計サマリー</h4>
          <div style={styles.statsGrid}>
            <div style={styles.statItem}>
              <span style={styles.statLabel}>総関連性数</span>
              <span style={styles.statValue}>{relationshipStats.totalEdges}</span>
            </div>
            <div style={styles.statItem}>
              <span style={styles.statLabel}>平均強度</span>
              <span style={styles.statValue}>{relationshipStats.avgStrength.toFixed(3)}</span>
            </div>
            <div style={styles.statItem}>
              <span style={styles.statLabel}>強度範囲</span>
              <span style={styles.statValue}>
                {relationshipStats.strengthRange.min.toFixed(3)} - {relationshipStats.strengthRange.max.toFixed(3)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* フィルター */}
      <div style={styles.filterSection}>
        <h4 style={styles.sectionTitle}>フィルター</h4>
        
        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>関連性タイプ</label>
          <select
            value={selectedEdgeType}
            onChange={(e) => setSelectedEdgeType(e.target.value)}
            style={styles.filterSelect}
          >
            <option value="all">すべて</option>
            {relationshipStats && Object.keys(relationshipStats.typeDistribution).map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>最小強度: {minStrength}</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={minStrength}
            onChange={(e) => setMinStrength(parseFloat(e.target.value))}
            style={styles.filterRange}
          />
        </div>

        <div style={styles.filterGroup}>
          <label style={styles.filterLabel}>
            <input
              type="checkbox"
              checked={showOnlyConnected}
              onChange={(e) => setShowOnlyConnected(e.target.checked)}
              style={styles.filterCheckbox}
            />
            選択されたノードとの関連性のみ
          </label>
        </div>
      </div>

      {/* タイプ分布チャート */}
      {visualizationData && (
        <div style={styles.chartSection}>
          <h4 style={styles.sectionTitle}>タイプ分布</h4>
          <div style={styles.chartContainer}>
            {visualizationData.typeChart.map((item, index) => (
              <div key={index} style={styles.chartBar}>
                <div style={styles.barContainer}>
                  <div 
                    style={{
                      ...styles.bar,
                      width: `${item.percentage}%`,
                      backgroundColor: getTypeColor(item.type)
                    }}
                  />
                </div>
                <div style={styles.barLabel}>
                  <span style={styles.barType}>{item.type}</span>
                  <span style={styles.barCount}>{item.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 強度分布ヒストグラム */}
      {visualizationData && (
        <div style={styles.chartSection}>
          <h4 style={styles.sectionTitle}>強度分布</h4>
          <div style={styles.chartContainer}>
            {visualizationData.strengthHistogram.map((bin, index) => (
              <div key={index} style={styles.histogramBar}>
                <div style={styles.barContainer}>
                  <div 
                    style={{
                      ...styles.bar,
                      height: `${Math.max(bin.percentage * 2, 4)}px`,
                      backgroundColor: '#00ff88'
                    }}
                  />
                </div>
                <div style={styles.histogramLabel}>
                  <span style={styles.histogramRange}>{bin.range}</span>
                  <span style={styles.histogramCount}>{bin.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 選択されたノードの関連性 */}
      {selectedNode && selectedNodeRelations.length > 0 && (
        <div style={styles.relationsSection}>
          <h4 style={styles.sectionTitle}>
            {selectedNode.title || selectedNode.id} の関連性
          </h4>
          <div style={styles.relationsList}>
            {selectedNodeRelations.map((edge, index) => {
              const targetNode = networkData?.nodes.find(n => 
                n.id === (edge.source === selectedNode.id ? edge.target : edge.source)
              );
              
              return (
                <div key={index} style={styles.relationItem}>
                  <div style={styles.relationHeader}>
                    <span style={styles.relationType}>{edge.type || 'unknown'}</span>
                    <span style={styles.relationStrength}>{edge.strength.toFixed(3)}</span>
                  </div>
                  <div style={styles.relationTarget}>
                    → {targetNode?.title || targetNode?.id}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* フィルタリング結果 */}
      <div style={styles.resultsSection}>
        <h4 style={styles.sectionTitle}>フィルタリング結果</h4>
        <div style={styles.resultsInfo}>
          <span>表示中の関連性: {filteredEdges.length}</span>
          {filteredEdges.length !== relationshipStats?.totalEdges && (
            <span style={styles.filteredNote}>
              (フィルター適用済み)
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// タイプ別の色を取得
const getTypeColor = (type: string): string => {
  const colorMap: Record<string, string> = {
    semantic: '#4f46e5',
    manual: '#059669',
    derived: '#dc2626',
    tag_similarity: '#ea580c',
    ai: '#7c3aed',
    unified: '#0891b2',
    unknown: '#6b7280'
  };
  
  return colorMap[type] || colorMap.unknown;
};

// スタイル定義
const styles = {
  container: {
    width: '320px',
    height: '100%',
    backgroundColor: '#1a1a2e',
    borderLeft: '1px solid #333366',
    overflow: 'auto',
    display: 'flex',
    flexDirection: 'column' as const,
  },

  header: {
    padding: '16px',
    borderBottom: '1px solid #333366',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  title: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#e2e8f0',
    margin: 0,
  },

  closeButton: {
    background: 'none',
    border: 'none',
    color: '#a6adc8',
    fontSize: '20px',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '4px',
    '&:hover': {
      backgroundColor: '#232345',
    },
  },

  statsSection: {
    padding: '16px',
    borderBottom: '1px solid #333366',
  },

  sectionTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#e2e8f0',
    margin: '0 0 12px 0',
  },

  statsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
  },

  statItem: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
  },

  statLabel: {
    fontSize: '12px',
    color: '#a6adc8',
  },

  statValue: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#00ff88',
  },

  filterSection: {
    padding: '16px',
    borderBottom: '1px solid #333366',
  },

  filterGroup: {
    marginBottom: '16px',
  },

  filterLabel: {
    display: 'block',
    fontSize: '12px',
    color: '#a6adc8',
    marginBottom: '6px',
  },

  filterSelect: {
    width: '100%',
    padding: '8px',
    backgroundColor: '#232345',
    color: '#e2e8f0',
    border: '1px solid #333366',
    borderRadius: '4px',
    fontSize: '12px',
  },

  filterRange: {
    width: '100%',
    marginTop: '4px',
  },

  filterCheckbox: {
    marginRight: '8px',
  },

  chartSection: {
    padding: '16px',
    borderBottom: '1px solid #333366',
  },

  chartContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },

  chartBar: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
  },

  barContainer: {
    height: '20px',
    backgroundColor: '#232345',
    borderRadius: '4px',
    overflow: 'hidden',
  },

  bar: {
    height: '100%',
    transition: 'width 0.3s ease',
  },

  barLabel: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '11px',
    color: '#a6adc8',
  },

  barType: {
    fontWeight: '500',
  },

  barCount: {
    color: '#00ff88',
  },

  histogramBar: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: '8px',
    height: '60px',
  },

  histogramLabel: {
    display: 'flex',
    flexDirection: 'column' as const,
    fontSize: '10px',
    color: '#a6adc8',
    minWidth: '60px',
  },

  histogramRange: {
    marginBottom: '2px',
  },

  histogramCount: {
    color: '#00ff88',
    fontWeight: '500',
  },

  relationsSection: {
    padding: '16px',
    borderBottom: '1px solid #333366',
  },

  relationsList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },

  relationItem: {
    padding: '8px',
    backgroundColor: '#232345',
    borderRadius: '4px',
    border: '1px solid #333366',
  },

  relationHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '4px',
  },

  relationType: {
    fontSize: '11px',
    color: '#a6adc8',
    backgroundColor: '#1a1a2e',
    padding: '2px 6px',
    borderRadius: '3px',
  },

  relationStrength: {
    fontSize: '11px',
    color: '#00ff88',
    fontWeight: '500',
  },

  relationTarget: {
    fontSize: '12px',
    color: '#e2e8f0',
  },

  resultsSection: {
    padding: '16px',
  },

  resultsInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '12px',
    color: '#a6adc8',
  },

  filteredNote: {
    color: '#fbbf24',
    fontSize: '11px',
  },
};

export default RelationsSidePeak;
