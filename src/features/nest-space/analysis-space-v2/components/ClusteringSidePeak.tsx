import React, { useState, useMemo, useCallback } from 'react';
import { useAnalysisSpace } from '../contexts/AnalysisSpaceContext';
import type { NetworkNode, NetworkEdge } from '../types';

interface ClusteringSidePeakProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Cluster {
  id: string;
  name: string;
  nodes: NetworkNode[];
  center: { x: number; y: number };
  color: string;
  size: number;
  density: number;
  cohesion: number;
}

const ClusteringSidePeak: React.FC<ClusteringSidePeakProps> = ({ isOpen, onClose }) => {
  const { state, setSelectedNode } = useAnalysisSpace();
  const { networkData } = state;
  const { selectedNode } = state.network;
  const [clusteringMethod, setClusteringMethod] = useState<'hdbscan' | 'kmeans' | 'community'>('hdbscan');
  const [minClusterSize, setMinClusterSize] = useState(3);
  const [clusterThreshold, setClusterThreshold] = useState(0.5);
  const [showClusterDetails, setShowClusterDetails] = useState(false);

  // クラスタリングアルゴリズムの実行
  const clusters = useMemo(() => {
    if (!networkData || networkData.nodes.length === 0) return [];

    switch (clusteringMethod) {
      case 'hdbscan':
        return performHDBSCAN(networkData.nodes, minClusterSize, clusterThreshold);
      case 'kmeans':
        return performKMeans(networkData.nodes, Math.max(2, Math.floor(networkData.nodes.length / 10)));
      case 'community':
        return performCommunityDetection(networkData.nodes, networkData.edges);
      default:
        return [];
    }
  }, [networkData, clusteringMethod, minClusterSize, clusterThreshold]);

  // クラスタリング統計
  const clusteringStats = useMemo(() => {
    if (clusters.length === 0) return null;

    const totalNodes = clusters.reduce((sum, cluster) => sum + cluster.nodes.length, 0);
    const avgClusterSize = totalNodes / clusters.length;
    const avgDensity = clusters.reduce((sum, cluster) => sum + cluster.density, 0) / clusters.length;
    const avgCohesion = clusters.reduce((sum, cluster) => sum + cluster.cohesion, 0) / clusters.length;

    return {
      totalClusters: clusters.length,
      totalNodes,
      avgClusterSize: avgClusterSize.toFixed(2),
      avgDensity: avgDensity.toFixed(3),
      avgCohesion: avgCohesion.toFixed(3),
      sizeDistribution: clusters.reduce((acc, cluster) => {
        const size = cluster.nodes.length;
        acc[size] = (acc[size] || 0) + 1;
        return acc;
      }, {} as Record<number, number>)
    };
  }, [clusters]);

  // 選択されたクラスタの詳細
  const selectedCluster = useMemo(() => {
    if (!selectedNode) return null;
    return clusters.find(cluster => 
      cluster.nodes.some(node => node.id === selectedNode.id)
    );
  }, [selectedNode, clusters]);

  // クラスタの色を取得
  const getClusterColor = useCallback((index: number): string => {
    const colors = [
      '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
      '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1'
    ];
    return colors[index % colors.length];
  }, []);

  // HDBSCANクラスタリング
  const performHDBSCAN = (nodes: NetworkNode[], minSize: number, threshold: number): Cluster[] => {
    // 簡易的なHDBSCAN実装（実際の実装では専用ライブラリを使用）
    const clusters: Cluster[] = [];
    const visited = new Set<string>();

    for (const node of nodes) {
      if (visited.has(node.id)) continue;

      const cluster = {
        id: `cluster-${clusters.length}`,
        name: `クラスタ ${clusters.length + 1}`,
        nodes: [node],
        center: { x: node.x, y: node.y },
        color: getClusterColor(clusters.length),
        size: 1,
        density: 0,
        cohesion: 0
      };

      // 近傍ノードを探索
      const neighbors = findNeighbors(node, nodes, threshold);
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor.id)) {
          cluster.nodes.push(neighbor);
          visited.add(neighbor.id);
        }
      }

      if (cluster.nodes.length >= minSize) {
        // クラスタの中心と統計を計算
        cluster.size = cluster.nodes.length;
        cluster.center = calculateClusterCenter(cluster.nodes);
        cluster.density = calculateClusterDensity(cluster.nodes, networkData?.edges || []);
        cluster.cohesion = calculateClusterCohesion(cluster.nodes, networkData?.edges || []);
        
        clusters.push(cluster);
      }
    }

    return clusters;
  };

  // K-meansクラスタリング
  const performKMeans = (nodes: NetworkNode[], k: number): Cluster[] => {
    // 簡易的なK-means実装
    const clusters: Cluster[] = [];
    
    // 初期クラスタセンターをランダムに選択
    for (let i = 0; i < k; i++) {
      const randomNode = nodes[Math.floor(Math.random() * nodes.length)];
      clusters.push({
        id: `cluster-${i}`,
        name: `クラスタ ${i + 1}`,
        nodes: [],
        center: { x: randomNode.x, y: randomNode.y },
        color: getClusterColor(i),
        size: 0,
        density: 0,
        cohesion: 0
      });
    }

    // 最大10回の反復
    for (let iteration = 0; iteration < 10; iteration++) {
      // 各ノードを最も近いクラスタに割り当て
      for (const cluster of clusters) {
        cluster.nodes = [];
      }

      for (const node of nodes) {
        let minDistance = Infinity;
        let closestCluster = clusters[0];

        for (const cluster of clusters) {
          const distance = Math.sqrt(
            Math.pow(node.x - cluster.center.x, 2) + 
            Math.pow(node.y - cluster.center.y, 2)
          );
          if (distance < minDistance) {
            minDistance = distance;
            closestCluster = cluster;
          }
        }

        closestCluster.nodes.push(node);
      }

      // クラスタセンターを更新
      for (const cluster of clusters) {
        if (cluster.nodes.length > 0) {
          cluster.center = calculateClusterCenter(cluster.nodes);
          cluster.size = cluster.nodes.length;
          cluster.density = calculateClusterDensity(cluster.nodes, networkData?.edges || []);
          cluster.cohesion = calculateClusterCohesion(cluster.nodes, networkData?.edges || []);
        }
      }
    }

    return clusters.filter(cluster => cluster.nodes.length > 0);
  };

  // コミュニティ検出
  const performCommunityDetection = (nodes: NetworkNode[], edges: NetworkEdge[]): Cluster[] => {
    // 簡易的なコミュニティ検出（Louvain法の簡易版）
    const clusters: Cluster[] = [];
    const nodeCommunities = new Map<string, number>();
    let nextCommunityId = 0;

    // 各ノードを初期コミュニティに割り当て
    for (const node of nodes) {
      nodeCommunities.set(node.id, nextCommunityId++);
    }

    // エッジの重みに基づいてコミュニティを統合
    const sortedEdges = [...edges].sort((a, b) => b.strength - a.strength);
    
    for (const edge of sortedEdges) {
      const sourceCommunity = nodeCommunities.get(edge.source);
      const targetCommunity = nodeCommunities.get(edge.target);
      
      if (sourceCommunity !== undefined && targetCommunity !== undefined && 
          sourceCommunity !== targetCommunity && edge.strength > clusterThreshold) {
        // コミュニティを統合
        for (const [nodeId, communityId] of nodeCommunities.entries()) {
          if (communityId === targetCommunity) {
            nodeCommunities.set(nodeId, sourceCommunity);
          }
        }
      }
    }

    // コミュニティごとにクラスタを作成
    const communityNodes = new Map<number, NetworkNode[]>();
    for (const [nodeId, communityId] of nodeCommunities.entries()) {
      const node = nodes.find(n => n.id === nodeId);
      if (node) {
        if (!communityNodes.has(communityId)) {
          communityNodes.set(communityId, []);
        }
        communityNodes.get(communityId)!.push(node);
      }
    }

    let clusterIndex = 0;
    for (const [communityId, communityNodesList] of communityNodes.entries()) {
      if (communityNodesList.length >= minClusterSize) {
        const cluster: Cluster = {
          id: `cluster-${clusterIndex}`,
          name: `コミュニティ ${clusterIndex + 1}`,
          nodes: communityNodesList,
          center: calculateClusterCenter(communityNodesList),
          color: getClusterColor(clusterIndex),
          size: communityNodesList.length,
          density: calculateClusterDensity(communityNodesList, edges),
          cohesion: calculateClusterCohesion(communityNodesList, edges)
        };
        clusters.push(cluster);
        clusterIndex++;
      }
    }

    return clusters;
  };

  // ヘルパー関数
  const findNeighbors = (node: NetworkNode, allNodes: NetworkNode[], threshold: number): NetworkNode[] => {
    return allNodes.filter(otherNode => {
      if (otherNode.id === node.id) return false;
      const distance = Math.sqrt(
        Math.pow(node.x - otherNode.x, 2) + 
        Math.pow(node.y - otherNode.y, 2)
      );
      return distance < threshold * 100; // スケール調整
    });
  };

  const calculateClusterCenter = (clusterNodes: NetworkNode[]): { x: number; y: number } => {
    const sumX = clusterNodes.reduce((sum, node) => sum + node.x, 0);
    const sumY = clusterNodes.reduce((sum, node) => sum + node.y, 0);
    return {
      x: sumX / clusterNodes.length,
      y: sumY / clusterNodes.length
    };
  };

  const calculateClusterDensity = (clusterNodes: NetworkNode[], allEdges: NetworkEdge[]): number => {
    if (clusterNodes.length <= 1) return 0;
    
    const clusterNodeIds = new Set(clusterNodes.map(n => n.id));
    const internalEdges = allEdges.filter(edge => 
      clusterNodeIds.has(edge.source) && clusterNodeIds.has(edge.target)
    );
    
    const maxPossibleEdges = clusterNodes.length * (clusterNodes.length - 1) / 2;
    return internalEdges.length / maxPossibleEdges;
  };

  const calculateClusterCohesion = (clusterNodes: NetworkNode[], allEdges: NetworkEdge[]): number => {
    if (clusterNodes.length <= 1) return 0;
    
    const clusterNodeIds = new Set(clusterNodes.map(n => n.id));
    const internalEdges = allEdges.filter(edge => 
      clusterNodeIds.has(edge.source) && clusterNodeIds.has(edge.target)
    );
    
    const totalStrength = internalEdges.reduce((sum, edge) => sum + edge.strength, 0);
    return totalStrength / internalEdges.length;
  };

  // クラスタを選択
  const handleClusterSelect = (cluster: Cluster) => {
    if (cluster.nodes.length > 0) {
      setSelectedNode(cluster.nodes[0]);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={styles.container}>
      {/* ヘッダー */}
      <div style={styles.header}>
        <h3 style={styles.title}>🎯 クラスタリング分析</h3>
        <button onClick={onClose} style={styles.closeButton}>×</button>
      </div>

      {/* クラスタリング設定 */}
      <div style={styles.configSection}>
        <h4 style={styles.sectionTitle}>クラスタリング設定</h4>
        
        <div style={styles.configGroup}>
          <label style={styles.configLabel}>アルゴリズム</label>
          <select
            value={clusteringMethod}
            onChange={(e) => setClusteringMethod(e.target.value as any)}
            style={styles.configSelect}
          >
            <option value="hdbscan">HDBSCAN</option>
            <option value="kmeans">K-means</option>
            <option value="community">コミュニティ検出</option>
          </select>
        </div>

        {clusteringMethod === 'hdbscan' && (
          <>
            <div style={styles.configGroup}>
              <label style={styles.configLabel}>最小クラスタサイズ: {minClusterSize}</label>
              <input
                type="range"
                min="2"
                max="20"
                value={minClusterSize}
                onChange={(e) => setMinClusterSize(parseInt(e.target.value))}
                style={styles.configRange}
              />
            </div>
            <div style={styles.configGroup}>
              <label style={styles.configLabel}>閾値: {clusterThreshold}</label>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.1"
                value={clusterThreshold}
                onChange={(e) => setClusterThreshold(parseFloat(e.target.value))}
                style={styles.configRange}
              />
            </div>
          </>
        )}

        {clusteringMethod === 'kmeans' && (
          <div style={styles.configGroup}>
            <label style={styles.configLabel}>
              クラスタ数: {Math.max(2, Math.floor((networkData?.nodes.length || 0) / 10))}
            </label>
            <div style={styles.configNote}>
              K-meansでは自動的にクラスタ数を決定します
            </div>
          </div>
        )}
      </div>

      {/* クラスタリング統計 */}
      {clusteringStats && (
        <div style={styles.statsSection}>
          <h4 style={styles.sectionTitle}>統計サマリー</h4>
          <div style={styles.statsGrid}>
            <div style={styles.statItem}>
              <span style={styles.statLabel}>総クラスタ数</span>
              <span style={styles.statValue}>{clusteringStats.totalClusters}</span>
            </div>
            <div style={styles.statItem}>
              <span style={styles.statLabel}>総ノード数</span>
              <span style={styles.statValue}>{clusteringStats.totalNodes}</span>
            </div>
            <div style={styles.statItem}>
              <span style={styles.statLabel}>平均クラスタサイズ</span>
              <span style={styles.statValue}>{clusteringStats.avgClusterSize}</span>
            </div>
            <div style={styles.statItem}>
              <span style={styles.statLabel}>平均密度</span>
              <span style={styles.statValue}>{clusteringStats.avgDensity}</span>
            </div>
            <div style={styles.statItem}>
              <span style={styles.statLabel}>平均凝集度</span>
              <span style={styles.statValue}>{clusteringStats.avgCohesion}</span>
            </div>
          </div>
        </div>
      )}

      {/* クラスタ一覧 */}
      <div style={styles.clustersSection}>
        <div style={styles.clustersHeader}>
          <h4 style={styles.sectionTitle}>クラスタ一覧</h4>
          <button
            onClick={() => setShowClusterDetails(!showClusterDetails)}
            style={styles.toggleButton}
          >
            {showClusterDetails ? '詳細を隠す' : '詳細を表示'}
          </button>
        </div>
        
        <div style={styles.clustersList}>
          {clusters.map((cluster, index) => (
            <div
              key={cluster.id}
              style={{
                ...styles.clusterItem,
                borderColor: cluster.color,
                backgroundColor: selectedCluster?.id === cluster.id ? '#232345' : '#1a1a2e'
              }}
              onClick={() => handleClusterSelect(cluster)}
            >
              <div style={styles.clusterHeader}>
                <div style={styles.clusterInfo}>
                  <span style={styles.clusterName}>{cluster.name}</span>
                  <span style={styles.clusterSize}>{cluster.nodes.length}個</span>
                </div>
                <div
                  style={{
                    ...styles.clusterColor,
                    backgroundColor: cluster.color
                  }}
                />
              </div>
              
              {showClusterDetails && (
                <div style={styles.clusterDetails}>
                  <div style={styles.clusterMetric}>
                    <span style={styles.metricLabel}>密度:</span>
                    <span style={styles.metricValue}>{cluster.density.toFixed(3)}</span>
                  </div>
                  <div style={styles.clusterMetric}>
                    <span style={styles.metricLabel}>凝集度:</span>
                    <span style={styles.metricValue}>{cluster.cohesion.toFixed(3)}</span>
                  </div>
                  <div style={styles.clusterNodes}>
                    <span style={styles.metricLabel}>ノード:</span>
                    <div style={styles.nodeTags}>
                      {cluster.nodes.slice(0, 5).map(node => (
                        <span key={node.id} style={styles.nodeTag}>
                          {node.title || node.id.slice(0, 8)}
                        </span>
                      ))}
                      {cluster.nodes.length > 5 && (
                        <span style={styles.moreNodes}>+{cluster.nodes.length - 5}</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 選択されたクラスタの詳細 */}
      {selectedCluster && (
        <div style={styles.selectedClusterSection}>
          <h4 style={styles.sectionTitle}>選択されたクラスタ</h4>
          <div style={styles.selectedClusterInfo}>
            <div style={styles.selectedClusterHeader}>
              <span style={styles.selectedClusterName}>{selectedCluster.name}</span>
              <div
                style={{
                  ...styles.selectedClusterColor,
                  backgroundColor: selectedCluster.color
                }}
              />
            </div>
            <div style={styles.selectedClusterStats}>
              <span>サイズ: {selectedCluster.size}</span>
              <span>密度: {selectedCluster.density.toFixed(3)}</span>
              <span>凝集度: {selectedCluster.cohesion.toFixed(3)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
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

  configSection: {
    padding: '16px',
    borderBottom: '1px solid #333366',
  },

  sectionTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#e2e8f0',
    margin: '0 0 12px 0',
  },

  configGroup: {
    marginBottom: '16px',
  },

  configLabel: {
    display: 'block',
    fontSize: '12px',
    color: '#a6adc8',
    marginBottom: '6px',
  },

  configSelect: {
    width: '100%',
    padding: '8px',
    backgroundColor: '#232345',
    color: '#e2e8f0',
    border: '1px solid #333366',
    borderRadius: '4px',
    fontSize: '12px',
  },

  configRange: {
    width: '100%',
    marginTop: '4px',
  },

  configNote: {
    fontSize: '11px',
    color: '#6b7280',
    fontStyle: 'italic',
    marginTop: '4px',
  },

  statsSection: {
    padding: '16px',
    borderBottom: '1px solid #333366',
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

  clustersSection: {
    padding: '16px',
    borderBottom: '1px solid #333366',
  },

  clustersHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },

  toggleButton: {
    padding: '4px 8px',
    backgroundColor: '#232345',
    color: '#e2e8f0',
    border: '1px solid #333366',
    borderRadius: '4px',
    fontSize: '11px',
    cursor: 'pointer',
  },

  clustersList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },

  clusterItem: {
    padding: '12px',
    border: '2px solid',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    '&:hover': {
      backgroundColor: '#232345',
    },
  },

  clusterHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },

  clusterInfo: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '2px',
  },

  clusterName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#e2e8f0',
  },

  clusterSize: {
    fontSize: '11px',
    color: '#a6adc8',
  },

  clusterColor: {
    width: '16px',
    height: '16px',
    borderRadius: '50%',
  },

  clusterDetails: {
    borderTop: '1px solid #333366',
    paddingTop: '8px',
  },

  clusterMetric: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '11px',
    marginBottom: '4px',
  },

  metricLabel: {
    color: '#a6adc8',
  },

  metricValue: {
    color: '#00ff88',
    fontWeight: '500',
  },

  clusterNodes: {
    marginTop: '8px',
  },

  nodeTags: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '4px',
    marginTop: '4px',
  },

  nodeTag: {
    backgroundColor: '#232345',
    color: '#e2e8f0',
    padding: '2px 6px',
    borderRadius: '3px',
    fontSize: '10px',
  },

  moreNodes: {
    color: '#6b7280',
    fontSize: '10px',
    fontStyle: 'italic',
  },

  selectedClusterSection: {
    padding: '16px',
  },

  selectedClusterInfo: {
    backgroundColor: '#232345',
    padding: '12px',
    borderRadius: '6px',
    border: '1px solid #333366',
  },

  selectedClusterHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },

  selectedClusterName: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#e2e8f0',
  },

  selectedClusterColor: {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
  },

  selectedClusterStats: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '11px',
    color: '#a6adc8',
  },
};

export default ClusteringSidePeak;
