import { NetworkNode, NetworkEdge } from '../types/analysis';

// BoardItem interface definition
export interface BoardItem {
  id: string;
  title: string;
  content?: string;
  tags?: string[];
  column_type: string;
  created_at?: string;
  updated_at?: string;
  order_index?: number;
  is_archived?: boolean;
  metadata?: any;
  board_id: string;
  nest_id?: string;
  created_by?: string;
  created_by_display_name?: string;
  description?: string;
  insights?: { id: string; title: string }[];
  themes?: { id: string; title: string }[];
  sources?: any[];
  referencedBy?: { id: string; title: string; column_type: string }[];
  related_cards?: any[];
}

export interface ClusteringConfig {
  algorithm: 'dbscan' | 'hierarchical' | 'community' | 'semantic' | 'hdbscan';
  minClusterSize: number;
  maxClusterSize: number;
  similarityThreshold: number;
  useSemanticAnalysis: boolean;
  useTagSimilarity: boolean;
  useContentSimilarity: boolean;
  weightStrength: number;
  weightSemantic: number;
  weightTag: number;
  
  // HDBSCAN固有設定（オプション）
  minPts?: number;
  debug?: boolean;
}

export interface SmartCluster {
  id: string;
  nodes: string[];
  centroid: NetworkNode;
  cohesion: number;
  separation: number;
  semanticTheme: string;
  dominantTags: string[];
  dominantTypes: string[];
  confidence: number;
  suggestedLabel: string;
  alternativeLabels: string[];
  reasoning: string;
  // 新機能: 重複許可クラスタリング
  membershipStrength?: { [nodeId: string]: number }; // ノードの所属強度 (0-1)
  overlappingNodes?: string[]; // 他クラスターとの重複ノード
}

// ノード視点でのクラスター所属情報
export interface NodeClusterMembership {
  nodeId: string;
  primaryCluster: string;      // メイン所属クラスター
  secondaryClusters: Array<{   // サブ所属クラスター
    clusterId: string;
    strength: number;          // 所属強度 (0-1)
    role: 'bridge' | 'peripheral' | 'shared'; // 役割
  }>;
  totalClusters: number;       // 所属クラスター総数
  isFullyCovered: boolean;     // どこかに確実に所属しているか
}

export interface ClusteringResult {
  clusters: SmartCluster[];
  outliers: string[];
  quality: ClusterQualityMetrics;
  algorithm: string;
  parameters: ClusteringConfig;
  // 新機能: ノード包含情報
  nodeMemberships?: { [nodeId: string]: NodeClusterMembership };
  coverageStats?: {
    totalNodes: number;
    coveredNodes: number;
    coverageRatio: number;
    overlappingNodes: number;
    averageMemberships: number;
  };
}

export interface ClusterQualityMetrics {
  silhouetteScore: number;
  modularityScore: number;
  intraClusterDistance: number;
  interClusterDistance: number;
  coverageRatio: number;
}

export class SmartClusteringService {
  
  /**
   * 高度なクラスタリング実行
   */
  static async performSmartClustering(
    nodes: NetworkNode[],
    edges: NetworkEdge[],
    cards: BoardItem[],
    config: ClusteringConfig
  ): Promise<ClusteringResult> {
    console.log('🧠 Starting Smart Clustering Analysis...');
    
    // 1. 類似度行列の計算
    const similarityMatrix = await this.calculateSimilarityMatrix(nodes, edges, cards, config);
    
    // 2. アルゴリズム選択と実行
    let clusters: SmartCluster[];
    let outliers: string[] = [];
    
    switch (config.algorithm) {
      case 'dbscan':
        ({ clusters, outliers } = await this.performDBSCAN(nodes, similarityMatrix, config));
        break;
      case 'hierarchical':
        clusters = await this.performHierarchicalClustering(nodes, similarityMatrix, config);
        break;
      case 'community':
        clusters = await this.performCommunityDetection(nodes, edges, config);
        break;
      case 'semantic':
        clusters = await this.performSemanticClustering(nodes, cards, config);
        break;
      case 'hdbscan':
        return await this.performHDBSCAN(nodes, edges, cards, config);
      default:
        clusters = await this.performHybridClustering(nodes, edges, cards, config);
    }
    
    // 3. クラスター品質評価
    const quality = this.evaluateClusterQuality(clusters, outliers, similarityMatrix);
    
    // 4. セマンティックラベル生成
    for (const cluster of clusters) {
      const clusterCards = cluster.nodes.map(id => cards.find(c => c.id === id)).filter(Boolean) as BoardItem[];
      const labelResult = await this.generateSemanticLabel(clusterCards, cluster);
      cluster.suggestedLabel = labelResult.primary;
      cluster.alternativeLabels = labelResult.alternatives;
      cluster.reasoning = labelResult.reasoning;
      cluster.confidence = labelResult.confidence;
    }
    
    console.log(`✅ Smart Clustering Complete: ${clusters.length} clusters, ${outliers.length} outliers`);
    
    // 新機能: 包含的クラスタリング後処理
    const { enhancedClusters, nodeMemberships, coverageStats } = await this.applyInclusiveClustering(
      nodes, 
      edges, 
      cards, 
      clusters, 
      outliers, 
      similarityMatrix, 
      config
    );
    
    console.log(`🎯 包含的クラスタリング完了: カバー率 ${(coverageStats.coverageRatio * 100).toFixed(1)}%, 平均所属数 ${coverageStats.averageMemberships.toFixed(1)}`);
    
    return {
      clusters: enhancedClusters,
      outliers: coverageStats.totalNodes > coverageStats.coveredNodes ? 
        nodes.filter(n => !nodeMemberships[n.id]?.isFullyCovered).map(n => n.id) : [],
      quality,
      algorithm: config.algorithm,
      parameters: config,
      nodeMemberships,
      coverageStats
    };
  }
  
  /**
   * 包含的クラスタリング: 全ノードをカバー、重複許可
   */
  private static async applyInclusiveClustering(
    nodes: NetworkNode[],
    edges: NetworkEdge[],
    cards: BoardItem[],
    initialClusters: SmartCluster[],
    initialOutliers: string[],
    similarityMatrix: number[][],
    config: ClusteringConfig
  ): Promise<{
    enhancedClusters: SmartCluster[];
    nodeMemberships: { [nodeId: string]: NodeClusterMembership };
    coverageStats: {
      totalNodes: number;
      coveredNodes: number;
      coverageRatio: number;
      overlappingNodes: number;
      averageMemberships: number;
    };
  }> {
    
    console.log(`🔄 包含的クラスタリング開始: ${initialClusters.length} 初期クラスター, ${initialOutliers.length} 外れ値`);
    
    const nodeMemberships: { [nodeId: string]: NodeClusterMembership } = {};
    const enhancedClusters = [...initialClusters];
    
    // 1. 初期クラスターメンバーの所属情報設定
    for (const cluster of enhancedClusters) {
      cluster.membershipStrength = {};
      cluster.overlappingNodes = [];
      
      for (const nodeId of cluster.nodes) {
        cluster.membershipStrength[nodeId] = 1.0; // 初期メンバーは100%所属
        
        if (!nodeMemberships[nodeId]) {
          nodeMemberships[nodeId] = {
            nodeId,
            primaryCluster: cluster.id,
            secondaryClusters: [],
            totalClusters: 1,
            isFullyCovered: true
          };
        }
      }
    }
    
    // 2. 外れ値を関係性に基づいて再配属
    const reassignedOutliers = new Set<string>();
    
    for (const outlierId of initialOutliers) {
      const nodeIdx = nodes.findIndex(n => n.id === outlierId);
      if (nodeIdx === -1) continue;
      
      // このノードの全ての関係性を調査
      const connections = edges.filter(e => e.source === outlierId || e.target === outlierId);
      
      if (connections.length === 0) {
        console.log(`⚠️ ${outlierId} は孤立ノード - 単独クラスター作成`);
        // 完全孤立ノードは単独クラスターに
        const singletonCluster = await this.createSingletonCluster(outlierId, nodes, cards);
        enhancedClusters.push(singletonCluster);
        
        nodeMemberships[outlierId] = {
          nodeId: outlierId,
          primaryCluster: singletonCluster.id,
          secondaryClusters: [],
          totalClusters: 1,
          isFullyCovered: true
        };
        reassignedOutliers.add(outlierId);
        continue;
      }
      
      // 関係性のあるノードを含むクラスターを探索
      const candidateClusters: Array<{
        cluster: SmartCluster;
        strength: number;
        connectionCount: number;
      }> = [];
      
      for (const cluster of enhancedClusters) {
        let connectionCount = 0;
        let totalStrength = 0;
        
        for (const connection of connections) {
          const connectedNodeId = connection.source === outlierId ? connection.target : connection.source;
          if (cluster.nodes.includes(connectedNodeId)) {
            connectionCount++;
            totalStrength += connection.strength || 0.5;
          }
        }
        
        if (connectionCount > 0) {
          const avgStrength = totalStrength / connectionCount;
          candidateClusters.push({
            cluster,
            strength: avgStrength,
            connectionCount
          });
        }
      }
      
      // 候補クラスターを強度順にソート
      candidateClusters.sort((a, b) => (b.strength * b.connectionCount) - (a.strength * a.connectionCount));
      
      if (candidateClusters.length > 0) {
        // 最強候補をプライマリに
        const primaryCandidate = candidateClusters[0];
        if (primaryCandidate.strength >= 0.3) { // 最低閾値
          
          primaryCandidate.cluster.nodes.push(outlierId);
          primaryCandidate.cluster.membershipStrength![outlierId] = primaryCandidate.strength;
          
          nodeMemberships[outlierId] = {
            nodeId: outlierId,
            primaryCluster: primaryCandidate.cluster.id,
            secondaryClusters: [],
            totalClusters: 1,
            isFullyCovered: true
          };
          
          // セカンダリ候補も追加（強度0.4以上）
          for (let i = 1; i < candidateClusters.length && i < 3; i++) {
            const secondaryCandidate = candidateClusters[i];
            if (secondaryCandidate.strength >= 0.4) {
              
              secondaryCandidate.cluster.overlappingNodes!.push(outlierId);
              secondaryCandidate.cluster.membershipStrength![outlierId] = secondaryCandidate.strength;
              
              nodeMemberships[outlierId].secondaryClusters.push({
                clusterId: secondaryCandidate.cluster.id,
                strength: secondaryCandidate.strength,
                role: secondaryCandidate.connectionCount >= 2 ? 'bridge' : 'peripheral'
              });
              nodeMemberships[outlierId].totalClusters++;
            }
          }
          
          reassignedOutliers.add(outlierId);
          console.log(`📌 ${outlierId} を ${nodeMemberships[outlierId].totalClusters}個のクラスターに配属`);
        }
      }
    }
    
    // 3. 既存クラスター間での重複配属（Bridge Node Detection）
    this.detectAndAssignBridgeNodes(enhancedClusters, nodes, edges, nodeMemberships, similarityMatrix);
    
    // 4. 統計計算
    const totalNodes = nodes.length;
    const coveredNodeIds = Object.keys(nodeMemberships).filter(id => nodeMemberships[id].isFullyCovered);
    const overlappingNodeIds = Object.keys(nodeMemberships).filter(id => nodeMemberships[id].totalClusters > 1);
    const totalMemberships = Object.values(nodeMemberships).reduce((sum, m) => sum + m.totalClusters, 0);
    
    const coverageStats = {
      totalNodes,
      coveredNodes: coveredNodeIds.length,
      coverageRatio: coveredNodeIds.length / totalNodes,
      overlappingNodes: overlappingNodeIds.length,
      averageMemberships: totalMemberships / coveredNodeIds.length || 0
    };
    
    console.log(`📊 包含的クラスタリング結果:`);
    console.log(`   - 総ノード: ${totalNodes}`);
    console.log(`   - カバー済み: ${coveredNodeIds.length} (${(coverageStats.coverageRatio * 100).toFixed(1)}%)`);
    console.log(`   - 重複ノード: ${overlappingNodeIds.length}`);
    console.log(`   - 平均所属数: ${coverageStats.averageMemberships.toFixed(2)}`);
    
    return {
      enhancedClusters,
      nodeMemberships,
      coverageStats
    };
  }
  
  /**
   * ブリッジノード検出と重複配属
   */
  private static detectAndAssignBridgeNodes(
    clusters: SmartCluster[],
    nodes: NetworkNode[],
    edges: NetworkEdge[],
    nodeMemberships: { [nodeId: string]: NodeClusterMembership },
    similarityMatrix: number[][]
  ): void {
    
    // クラスター間接続を分析
    for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        const clusterA = clusters[i];
        const clusterB = clusters[j];
        
        // クラスター間の接続ノードを探索
        const bridgeCandidates: { nodeId: string; strength: number }[] = [];
        
        for (const nodeA of clusterA.nodes) {
          for (const nodeB of clusterB.nodes) {
            const connection = edges.find(e => 
              (e.source === nodeA && e.target === nodeB) || 
              (e.source === nodeB && e.target === nodeA)
            );
            
            if (connection && connection.strength && connection.strength >= 0.5) {
              // 強い接続があるノードを両方のクラスターの候補に
              bridgeCandidates.push({ nodeId: nodeA, strength: connection.strength });
              bridgeCandidates.push({ nodeId: nodeB, strength: connection.strength });
            }
          }
        }
        
        // 重複度の高いノードをブリッジノードとして両クラスターに配属
        const uniqueBridges = [...new Map(bridgeCandidates.map(b => [b.nodeId, b])).values()];
        
        for (const bridge of uniqueBridges) {
          if (bridge.strength >= 0.6) { // ブリッジ閾値
            
            const currentMembership = nodeMemberships[bridge.nodeId];
            if (currentMembership) {
              
              // まだセカンダリに含まれていないクラスターを追加
              const otherCluster = clusterA.nodes.includes(bridge.nodeId) ? clusterB : clusterA;
              const alreadyMember = currentMembership.secondaryClusters.some(sc => sc.clusterId === otherCluster.id);
              
              if (!alreadyMember && currentMembership.primaryCluster !== otherCluster.id) {
                
                otherCluster.overlappingNodes!.push(bridge.nodeId);
                otherCluster.membershipStrength![bridge.nodeId] = bridge.strength;
                
                currentMembership.secondaryClusters.push({
                  clusterId: otherCluster.id,
                  strength: bridge.strength,
                  role: 'bridge'
                });
                currentMembership.totalClusters++;
                
                console.log(`🌉 ${bridge.nodeId} をブリッジノードとして ${otherCluster.id} に追加配属`);
              }
            }
          }
        }
      }
    }
  }
  
  /**
   * 単独クラスター作成
   */
  private static async createSingletonCluster(
    nodeId: string,
    nodes: NetworkNode[],
    cards: BoardItem[]
  ): Promise<SmartCluster> {
    const node = nodes.find(n => n.id === nodeId);
    const card = cards.find(c => c.id === nodeId);
    
    return {
      id: `singleton-${nodeId}`,
      nodes: [nodeId],
      centroid: node!,
      cohesion: 1.0,
      separation: 0.0,
      semanticTheme: '独立項目',
      dominantTags: card?.tags?.slice(0, 3) || [],
      dominantTypes: [card?.column_type || 'INBOX'],
      confidence: 0.8,
      suggestedLabel: `独立項目: ${card?.title?.substring(0, 20) || nodeId}`,
      alternativeLabels: ['個別項目', '独立要素'],
      reasoning: '他との関係性が薄い独立項目として分類',
      membershipStrength: { [nodeId]: 1.0 },
      overlappingNodes: []
    };
  }

  /**
   * 多次元類似度行列の計算
   */
  private static async calculateSimilarityMatrix(
    nodes: NetworkNode[],
    edges: NetworkEdge[],
    cards: BoardItem[],
    config: ClusteringConfig
  ): Promise<number[][]> {
    const n = nodes.length;
    const matrix: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));
    
    // ノードIDからインデックスへのマッピング
    const nodeIndexMap = new Map(nodes.map((node, index) => [node.id, index]));
    
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const nodeA = nodes[i];
        const nodeB = nodes[j];
        const cardA = cards.find(c => c.id === nodeA.id);
        const cardB = cards.find(c => c.id === nodeB.id);
        
        if (!cardA || !cardB) continue;
        
        let similarity = 0;
        
        // 1. エッジ強度による類似度
        if (config.weightStrength > 0) {
          const edge = edges.find(e => 
            (e.source === nodeA.id && e.target === nodeB.id) ||
            (e.source === nodeB.id && e.target === nodeA.id)
          );
          const edgeStrength = edge ? edge.strength : 0;
          similarity += edgeStrength * config.weightStrength;
        }
        
        // 2. タグ類似度
        if (config.useTagSimilarity && config.weightTag > 0) {
          const tagSimilarity = this.calculateTagSimilarity(cardA.tags || [], cardB.tags || []);
          similarity += tagSimilarity * config.weightTag;
        }
        
        // 3. セマンティック類似度
        if (config.useSemanticAnalysis && config.weightSemantic > 0) {
          const semanticSimilarity = await this.calculateSemanticSimilarity(cardA, cardB);
          similarity += semanticSimilarity * config.weightSemantic;
        }
        
        // 4. コンテンツ類似度
        if (config.useContentSimilarity) {
          const contentSimilarity = this.calculateContentSimilarity(cardA, cardB);
          similarity += contentSimilarity * 0.2; // 固定重み
        }
        
        matrix[i][j] = matrix[j][i] = Math.min(1, similarity);
      }
    }
    
    return matrix;
  }
  
  /**
   * DBSCAN クラスタリング
   */
  private static async performDBSCAN(
    nodes: NetworkNode[],
    similarityMatrix: number[][],
    config: ClusteringConfig
  ): Promise<{ clusters: SmartCluster[], outliers: string[] }> {
    // より包含性の高い動的パラメータ調整
    const nodeCount = nodes.length;
    
    // 包含率を高めるため、より寛容なパラメータに調整
    const adaptiveEps = Math.max(0.4, Math.min(0.9, 1.2 - config.similarityThreshold)); // より大きなeps
    const adaptiveMinPts = Math.max(2, Math.min(config.minClusterSize, Math.max(2, Math.floor(nodeCount / 12)))); // より小さなminPts
    
    console.log(`🔧 DBSCAN Parameters (高包含率): eps=${adaptiveEps.toFixed(2)}, minPts=${adaptiveMinPts}, nodes=${nodeCount}`);
    console.log(`🎯 目標: 高い包含率でより多くのノードをクラスター化`);
    
    const eps = adaptiveEps;
    const minPts = adaptiveMinPts;
    const n = nodes.length;
    
    const labels = Array(n).fill(-1); // -1: 未分類, -2: ノイズ, 0以上: クラスターID
    let clusterId = 0;
    
    // 距離行列（1 - 類似度）
    const distanceMatrix = similarityMatrix.map(row => row.map(sim => 1 - sim));
    
    const getNeighbors = (pointIdx: number): number[] => {
      const neighbors: number[] = [];
      for (let i = 0; i < n; i++) {
        if (i !== pointIdx && distanceMatrix[pointIdx][i] <= eps) {
          neighbors.push(i);
        }
      }
      return neighbors;
    };
    
    const expandCluster = (pointIdx: number, neighbors: number[], clusterId: number) => {
      labels[pointIdx] = clusterId;
      
      for (let i = 0; i < neighbors.length; i++) {
        const neighborIdx = neighbors[i];
        
        if (labels[neighborIdx] === -2) { // ノイズから復活
          labels[neighborIdx] = clusterId;
        }
        
        if (labels[neighborIdx] !== -1) continue; // 既に処理済み
        
        labels[neighborIdx] = clusterId;
        const neighborNeighbors = getNeighbors(neighborIdx);
        
        if (neighborNeighbors.length >= minPts) {
          neighbors.push(...neighborNeighbors);
        }
      }
    };
    
    // DBSCAN実行
    for (let i = 0; i < n; i++) {
      if (labels[i] !== -1) continue; // 既に処理済み
      
      const neighbors = getNeighbors(i);
      
      if (neighbors.length < minPts) {
        labels[i] = -2; // ノイズ
      } else {
        expandCluster(i, neighbors, clusterId);
        clusterId++;
      }
    }
    
    // 結果をSmartCluster形式に変換
    const clusterMap = new Map<number, number[]>();
    const outliers: string[] = [];
    
    labels.forEach((label, index) => {
      if (label === -2) {
        outliers.push(nodes[index].id);
      } else if (label >= 0) {
        if (!clusterMap.has(label)) {
          clusterMap.set(label, []);
        }
        clusterMap.get(label)!.push(index);
      }
    });
    
    const clusters: SmartCluster[] = [];
    for (const [clusterLabel, nodeIndices] of clusterMap) {
      // クラスターサイズ制限チェック
      if (nodeIndices.length >= config.minClusterSize && 
          nodeIndices.length <= config.maxClusterSize) {
        const clusterNodes = nodeIndices.map(idx => nodes[idx]);
        const cluster = await this.createSmartCluster(
          `dbscan-${clusterLabel}`,
          clusterNodes,
          similarityMatrix,
          nodeIndices
        );
        clusters.push(cluster);
      } else if (nodeIndices.length > config.maxClusterSize) {
        // 大きすぎるクラスターは分割
        console.log(`⚠️ Cluster ${clusterLabel} too large (${nodeIndices.length}), splitting...`);
        const splitIndices = nodeIndices.slice(0, config.maxClusterSize);
        const remainingIndices = nodeIndices.slice(config.maxClusterSize);
        
        const clusterNodes = splitIndices.map(idx => nodes[idx]);
        const cluster = await this.createSmartCluster(
          `dbscan-${clusterLabel}`,
          clusterNodes,
          similarityMatrix,
          splitIndices
        );
        clusters.push(cluster);
        
        // 残りは外れ値に
        remainingIndices.forEach(idx => outliers.push(nodes[idx].id));
      } else {
        // 小さすぎるクラスターは外れ値に
        nodeIndices.forEach(idx => outliers.push(nodes[idx].id));
      }
    }
    
    console.log(`📊 DBSCAN初期結果: ${clusters.length} clusters, ${outliers.length} outliers`);
    
    // セカンダリクラスタリング: 外れ値を既存クラスターに統合または小さなクラスターを作成
    if (outliers.length > 0) {
      const { additionalClusters, remainingOutliers } = await this.performSecondaryClusteringForOutliers(
        nodes, 
        outliers, 
        clusters, 
        similarityMatrix, 
        config
      );
      
      clusters.push(...additionalClusters);
      outliers.length = 0; // 配列をクリア
      outliers.push(...remainingOutliers);
      
      console.log(`📊 セカンダリクラスタリング後: ${clusters.length} total clusters, ${outliers.length} final outliers`);
    }
    
    return { clusters, outliers };
  }
  
  /**
   * セカンダリクラスタリング: 外れ値をできるだけクラスター化
   */
  private static async performSecondaryClusteringForOutliers(
    nodes: NetworkNode[],
    outlierIds: string[],
    existingClusters: SmartCluster[],
    similarityMatrix: number[][],
    config: ClusteringConfig
  ): Promise<{ additionalClusters: SmartCluster[], remainingOutliers: string[] }> {
    
    console.log(`🔄 セカンダリクラスタリング開始: ${outlierIds.length} outliers`);
    
    const outlierNodes = nodes.filter(node => outlierIds.includes(node.id));
    const outlierIndices = outlierNodes.map(node => nodes.findIndex(n => n.id === node.id));
    
    const additionalClusters: SmartCluster[] = [];
    const remainingOutliers: string[] = [];
    
    // 戦略1: 既存クラスターへの最近傍統合
    const assignedToExisting = new Set<string>();
    
    for (const outlierId of outlierIds) {
      const outlierIdx = nodes.findIndex(n => n.id === outlierId);
      if (outlierIdx === -1) continue;
      
      let bestCluster: SmartCluster | null = null;
      let bestSimilarity = 0;
      
      // 各既存クラスターとの平均類似度を計算
      for (const cluster of existingClusters) {
        const clusterNodeIndices = cluster.nodes.map(id => nodes.findIndex(n => n.id === id));
        let totalSimilarity = 0;
        let validCount = 0;
        
        for (const clusterNodeIdx of clusterNodeIndices) {
          if (clusterNodeIdx !== -1 && outlierIdx < similarityMatrix.length && clusterNodeIdx < similarityMatrix[outlierIdx].length) {
            totalSimilarity += similarityMatrix[outlierIdx][clusterNodeIdx];
            validCount++;
          }
        }
        
        if (validCount > 0) {
          const avgSimilarity = totalSimilarity / validCount;
          // より寛容な閾値で統合
          if (avgSimilarity > 0.3 && avgSimilarity > bestSimilarity) {
            bestSimilarity = avgSimilarity;
            bestCluster = cluster;
          }
        }
      }
      
      if (bestCluster) {
        bestCluster.nodes.push(outlierId);
        assignedToExisting.add(outlierId);
        console.log(`📌 ${outlierId} を既存クラスター ${bestCluster.id} に統合 (類似度: ${bestSimilarity.toFixed(2)})`);
      }
    }
    
    // 戦略2: 残りの外れ値で小さなクラスターを作成
    const unassignedOutliers = outlierIds.filter(id => !assignedToExisting.has(id));
    
    while (unassignedOutliers.length >= 2) {
      const clusterCandidates: string[] = [];
      const baseOutlier = unassignedOutliers[0];
      const baseIdx = nodes.findIndex(n => n.id === baseOutlier);
      
      clusterCandidates.push(baseOutlier);
      
      // 最も類似度の高い1-2個のノードを探す
      const similarities: { id: string, similarity: number }[] = [];
      
      for (let i = 1; i < unassignedOutliers.length; i++) {
        const otherId = unassignedOutliers[i];
        const otherIdx = nodes.findIndex(n => n.id === otherId);
        
        if (baseIdx !== -1 && otherIdx !== -1 && 
            baseIdx < similarityMatrix.length && otherIdx < similarityMatrix[baseIdx].length) {
          const sim = similarityMatrix[baseIdx][otherIdx];
          similarities.push({ id: otherId, similarity: sim });
        }
      }
      
      similarities.sort((a, b) => b.similarity - a.similarity);
      
      // 上位1-2個を小クラスターに追加（閾値を緩く）
      for (const item of similarities.slice(0, 2)) {
        if (item.similarity > 0.2) { // とても緩い閾値
          clusterCandidates.push(item.id);
        }
      }
      
      if (clusterCandidates.length >= 2) {
        // 小さなクラスターを作成
        const cluster = await this.createSmallCluster(
          clusterCandidates.map(id => nodes.find(n => n.id === id)!),
          `secondary-${additionalClusters.length}`,
          config
        );
        
        additionalClusters.push(cluster);
        
        // unassignedOutliersから削除
        clusterCandidates.forEach(id => {
          const index = unassignedOutliers.indexOf(id);
          if (index > -1) unassignedOutliers.splice(index, 1);
        });
        
        console.log(`🆕 小クラスター作成: ${clusterCandidates.length} nodes`);
      } else {
        // 統合できない場合は残り外れ値に
        remainingOutliers.push(unassignedOutliers.shift()!);
      }
    }
    
    // 1個だけ残った場合は外れ値に
    remainingOutliers.push(...unassignedOutliers);
    
    console.log(`✅ セカンダリクラスタリング完了: +${additionalClusters.length} clusters, ${remainingOutliers.length} final outliers`);
    
    return { additionalClusters, remainingOutliers };
  }
  
  /**
   * 小さなクラスターを作成
   */
  private static async createSmallCluster(
    clusterNodes: NetworkNode[],
    clusterId: string,
    config: ClusteringConfig
  ): Promise<SmartCluster> {
    const centroid = clusterNodes[0]; // 簡略化
    const nodeIds = clusterNodes.map(n => n.id);
    
    return {
      id: clusterId,
      nodes: nodeIds,
      centroid,
      cohesion: 0.6, // デフォルト値
      separation: 0.4,
      semanticTheme: 'その他関連項目',
      dominantTags: [],
      dominantTypes: [],
      confidence: 0.5,
      suggestedLabel: `関連項目群(${nodeIds.length})`,
      alternativeLabels: ['その他', '関連項目', '補助的要素'],
      reasoning: 'セカンダリクラスタリングにより生成'
    };
  }

  /**
   * 統計学的テキスト分析による合理的キーワード抽出（改良版）
   */
  private static extractKeywords(text: string): string[] {
    // 1. 基本的な前処理
    const stopWords = new Set([
      'の', 'を', 'に', 'は', 'が', 'と', 'で', 'から', 'まで', 'について', 'による',
      'する', 'した', 'して', 'される', 'できる', 'ある', 'いる', 'なる', 'もの',
      'こと', 'これ', 'それ', 'あれ', 'この', 'その', 'あの', 'ここ', 'そこ', 'あそこ',
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'とか', 'なんか', 'でも', 'だから', 'そう', 'はい', 'いえ', 'まあ', 'ちょっと', 'えーと'
    ]);

    // 2. 固有名詞・サービス名パターン（簡潔版）
    const properNounPatterns = [
      /^[A-Z][a-z]+[A-Z][a-z]+/, // CamelCase
      /^[A-Z][a-z]{2,8}$/, // 一般的な固有名詞
      /mina|john|jane|alex|mike|sarah|speaker|user|admin/i,
      /notebook|llm|gpt|claude|openai|slack|zoom/i,
      /^\d+$/, /^[a-zA-Z]$/ // 数字・単一文字
    ];

    // 3. 初期単語抽出
    const allWords = text
      .toLowerCase()
      .replace(/[^\w\s\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g, ' ')
      .split(/\s+/)
      .filter(word => {
        if (word.length < 2) return false;
        if (stopWords.has(word)) return false;
        if (properNounPatterns.some(pattern => pattern.test(word))) return false;
        return true;
      });

    // 4. 統計学的外れ値検出による固定見出し除去
    const wordFreq: { [word: string]: number } = {};
    allWords.forEach(word => {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    });

    const frequencies = Object.values(wordFreq);
    if (frequencies.length === 0) return [];

    // 5. Z-score + IQR併用による外れ値検出
    const mean = frequencies.reduce((a, b) => a + b, 0) / frequencies.length;
    const variance = frequencies.reduce((acc, freq) => acc + Math.pow(freq - mean, 2), 0) / frequencies.length;
    const stdDev = Math.sqrt(variance);

    // IQR計算
    const sortedFreqs = [...frequencies].sort((a, b) => a - b);
    const q1 = sortedFreqs[Math.floor(sortedFreqs.length * 0.25)];
    const q3 = sortedFreqs[Math.floor(sortedFreqs.length * 0.75)];
    const iqr = q3 - q1;

    console.log('📊 SmartClustering Statistical Analysis:', {
      totalWords: allWords.length,
      uniqueWords: Object.keys(wordFreq).length,
      mean: Math.round(mean * 100) / 100,
      stdDev: Math.round(stdDev * 100) / 100,
      q1, q3, iqr
    });

    // 6. 統計的フィルタリング（固定見出し・定型文除去）
    const validKeywords = Object.entries(wordFreq)
      .filter(([word, freq]) => {
        // Z-scoreチェック（異常に高い頻度を除外）
        const zScore = stdDev > 0 ? (freq - mean) / stdDev : 0;
        if (zScore > 2.0) { // 2σ以上は固定見出し・定型文の可能性
          console.log(`❌ SmartClustering Statistical outlier excluded: "${word}" (freq: ${freq}, z-score: ${Math.round(zScore * 100) / 100})`);
          return false;
        }

        // IQR外れ値チェック（補助的）
        const iqrThreshold = q3 + (1.5 * iqr);
        if (freq > iqrThreshold && freq > 3) {
          console.log(`❌ SmartClustering IQR outlier excluded: "${word}" (freq: ${freq}, threshold: ${Math.round(iqrThreshold)})`);
          return false;
        }

        // 意味的価値チェック（簡潔版）
        if (word.length < 3 && !/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(word)) {
          return false; // 短い英単語を除外（日本語は2文字以上OK）
        }

        return true;
      })
      .sort(([, a], [, b]) => b - a) // 頻度順
      .slice(0, 20) // 上位20個まで
      .map(([word]) => word);

    console.log('✅ SmartClustering Valid keywords after statistical filtering:', validKeywords.slice(0, 10));
    return validKeywords;
  }

  /**
   * 統計学的に合理的なクラスターラベル生成
   */
  private static async generateSemanticLabel(
    cards: BoardItem[],
    cluster: SmartCluster
  ): Promise<{
    primary: string;
    alternatives: string[];
    reasoning: string;
    confidence: number;
  }> {
    try {
      // 1. タグ頻度分析（最も信頼性が高い）
      const tagFreq: { [tag: string]: number } = {};
      cards.forEach(card => {
        card.tags?.forEach(tag => {
          tagFreq[tag] = (tagFreq[tag] || 0) + 1;
        });
      });

      // 2. 統計的キーワード抽出
      const allText = cards
        .map(card => `${card.title} ${card.content || ''}`)
        .join(' ');
      const keywords = this.extractKeywords(allText);

      // 3. 統計的共起分析
      const cooccurrenceTerms = this.analyzeStatisticalCooccurrence(cards, keywords);

      console.log(`🎯 SmartClustering Rational Analysis (${cards.length} cards):`, {
        dominantTags: Object.entries(tagFreq).sort(([,a], [,b]) => b - a).slice(0, 3),
        topKeywords: keywords.slice(0, 5),
        cooccurrenceTerms: cooccurrenceTerms.slice(0, 3)
      });

      // 4. 合理的ラベル生成戦略（効果順）
      const strategies = [
        // 戦略1: 高頻度タグ（最も信頼性が高い）
        () => {
          if (Object.keys(tagFreq).length > 0) {
            const topTag = Object.keys(tagFreq).reduce((a, b) => tagFreq[a] > tagFreq[b] ? a : b);
            const coverage = tagFreq[topTag] / cards.length;
            
            if (coverage >= 0.6) { // 60%以上のカードが共有
              const beautified = this.beautifyTagLabel(topTag);
              if (beautified) {
                return {
                  label: beautified,
                  confidence: 0.85 + (coverage * 0.1),
                  reasoning: `タグ「${topTag}」が${Math.round(coverage * 100)}%のカードで共有`
                };
              }
            }
          }
          return null;
        },

        // 戦略2: 意味的キーワード組み合わせ
        () => {
          if (keywords.length >= 2) {
            const keyword1 = keywords[0];
            const keyword2 = keywords[1];
            
            if (keyword1.length >= 3 && keyword2.length >= 3) {
              const combined = this.createMeaningfulCombination(keyword1, keyword2);
              return {
                label: combined,
                confidence: 0.75,
                reasoning: `キーワード「${keyword1}」「${keyword2}」の組み合わせ`
              };
            }
          }
          return null;
        },

        // 戦略3: 統計的共起語
        () => {
          if (cooccurrenceTerms.length > 0) {
            const topCooccurrence = cooccurrenceTerms[0];
            if (topCooccurrence.frequency >= 2) {
              return {
                label: this.beautifyLabel(topCooccurrence.term),
                confidence: 0.7,
                reasoning: `共起語「${topCooccurrence.term}」(${topCooccurrence.frequency}回)`
              };
            }
          }
          return null;
        },

        // 戦略4: 単一キーワード
        () => {
          if (keywords.length > 0) {
            return {
              label: this.beautifyLabel(keywords[0]),
              confidence: 0.6,
              reasoning: `主要キーワード「${keywords[0]}」`
            };
          }
          return null;
        },

        // 戦略5: カード数ベースのフォールバック
        () => {
          const clusterIndex = cluster.id;
          if (cards.length >= 5) return { label: `主要テーマ ${clusterIndex}`, confidence: 0.4, reasoning: `${cards.length}個の大規模グループ` };
          if (cards.length >= 3) return { label: `関連項目 ${clusterIndex}`, confidence: 0.3, reasoning: `${cards.length}個の関連グループ` };
          return { label: `グループ ${clusterIndex}`, confidence: 0.2, reasoning: `${cards.length}個の小グループ` };
        }
      ];

      // 戦略を順次実行
      for (const strategy of strategies) {
        const result = strategy();
        if (result && result.label && result.label.length > 0 && result.label.length <= 25) {
          console.log(`✅ SmartClustering Selected strategy: "${result.label}" (confidence: ${result.confidence})`);
          
          return {
            primary: result.label,
            alternatives: this.generateAlternativeLabels(cards, keywords, tagFreq),
            reasoning: result.reasoning,
            confidence: result.confidence
          };
        }
      }

      // 完全フォールバック
      return {
        primary: `クラスター ${cluster.id}`,
        alternatives: [],
        reasoning: `${cards.length}個のカードで構成`,
        confidence: 0.1
      };

    } catch (error) {
      console.error('SmartClustering Label generation error:', error);
      return {
        primary: `クラスター ${cluster.id}`,
        alternatives: [],
        reasoning: 'ラベル生成エラー',
        confidence: 0.1
      };
    }
  }

  /**
   * 統計的共起分析（改良版）
   */
  private static analyzeStatisticalCooccurrence(cards: BoardItem[], keywords: string[]): Array<{term: string, frequency: number}> {
    const termPairs = new Map<string, number>();
    
    // 各カードのキーワードセットを取得
    const cardKeywords = cards.map(card => {
      const cardText = `${card.title} ${card.content || ''}`;
      return new Set(this.extractKeywords(cardText));
    });

    // ペアワイズ共起分析
    for (let i = 0; i < cardKeywords.length; i++) {
      for (let j = i + 1; j < cardKeywords.length; j++) {
        const intersection = new Set([...cardKeywords[i]].filter(x => cardKeywords[j].has(x)));
        
        intersection.forEach(term => {
          if (term.length >= 3 && keywords.includes(term)) { // 統計的に有効なキーワードのみ
            termPairs.set(term, (termPairs.get(term) || 0) + 1);
          }
        });
      }
    }

    return Array.from(termPairs.entries())
      .map(([term, frequency]) => ({ term, frequency }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 5);
  }

  /**
   * タグラベルの美化
   */
  private static beautifyTagLabel(tag: string): string | null {
    const tagMapping: { [key: string]: string } = {
      'ux': 'UXリサーチ',
      'ui': 'UI設計',
      'design': 'デザイン',
      'research': 'リサーチ',
      'test': 'テスト分析',
      'accessibility': 'アクセシビリティ',
      'usability': 'ユーザビリティ',
      'prototype': 'プロトタイプ',
      'feedback': 'フィードバック',
      'analysis': '分析結果'
    };

    return tagMapping[tag.toLowerCase()] || (tag.length >= 3 ? tag.toUpperCase() : null);
  }

  /**
   * 意味的な組み合わせラベル作成
   */
  private static createMeaningfulCombination(word1: string, word2: string): string {
    // 自然な日本語組み合わせパターン
    const combinations: { [key: string]: string } = {
      'design,analysis': 'デザイン分析',
      'user,research': 'ユーザーリサーチ',
      'test,result': 'テスト結果',
      'feedback,analysis': 'フィードバック分析',
      'prototype,test': 'プロトタイプテスト',
      'interface,design': 'インターフェース設計'
    };

    const key1 = `${word1},${word2}`;
    const key2 = `${word2},${word1}`;
    
    if (combinations[key1]) return combinations[key1];
    if (combinations[key2]) return combinations[key2];
    
    // デフォルトの組み合わせ（15文字以内）
    const combined = `${word1}・${word2}`;
    return combined.length <= 15 ? combined : word1;
  }

  /**
   * 代替ラベル生成
   */
  private static generateAlternativeLabels(cards: BoardItem[], keywords: string[], tagFreq: { [tag: string]: number }): string[] {
    const alternatives: string[] = [];
    
    // 上位2-3個のキーワードから代替案を生成
    keywords.slice(1, 4).forEach(keyword => {
      if (keyword.length >= 3) {
        alternatives.push(this.beautifyLabel(keyword));
      }
    });
    
    // 上位2個のタグから代替案を生成
    Object.entries(tagFreq)
      .sort(([,a], [,b]) => b - a)
      .slice(1, 3)
      .forEach(([tag]) => {
        const beautified = this.beautifyTagLabel(tag);
        if (beautified && !alternatives.includes(beautified)) {
          alternatives.push(beautified);
        }
      });

    return alternatives.slice(0, 3); // 最大3個まで
  }

  /**
   * 基本的なラベル美化
   */
  private static beautifyLabel(keyword: string): string {
    const labelMap: { [key: string]: string } = {
      'user': 'ユーザー',
      'design': 'デザイン', 
      'interface': 'インターフェース',
      'usability': 'ユーザビリティ',
      'accessibility': 'アクセシビリティ',
      'research': 'リサーチ',
      'analysis': '分析',
      'feedback': 'フィードバック',
      'improvement': '改善',
      'feature': '機能',
      'workflow': 'ワークフロー',
      'process': 'プロセス',
      'strategy': '戦略',
      'concept': 'コンセプト',
      'prototype': 'プロトタイプ'
    };
    
    return labelMap[keyword.toLowerCase()] || 
           keyword.charAt(0).toUpperCase() + keyword.slice(1);
  }

  /**
   * タグラベル変換
   */
  private static getTagLabel(tag: string): string {
    const tagLabels: { [key: string]: string } = {
      'ux': 'UX',
      'ui': 'UI',
      'design': 'デザイン',
      'research': 'リサーチ',
      'usability': 'ユーザビリティ',
      'accessibility': 'アクセシビリティ',
      'user': 'ユーザー',
      'interface': 'インターフェース',
      'prototype': 'プロトタイプ',
      'wireframe': 'ワイヤーフレーム',
      'mockup': 'モックアップ',
      'testing': 'テスト',
      'feedback': 'フィードバック',
      'analysis': '分析',
      'strategy': '戦略'
    };
    
    return tagLabels[tag.toLowerCase()] || tag.toUpperCase();
  }
  
  /**
   * ラベルがセマンティックに有効かチェック（固有名詞排除）
   */
  private static isValidSemanticLabel(label: string): boolean {
    if (!label || label.length === 0) return false;
    
    // 固有名詞パターンの完全チェック
    const properNounPatterns = [
      /^[A-Z][a-z]+$/,  // 単純な固有名詞
      /^[A-Z][a-z]+[A-Z][a-z]+/,  // CamelCase
      /mina|john|jane|alex|mike|sarah|david|tom|lisa|anna|ken|yuki|taro|hanako/i,
      /speaker|user|admin|moderator|participant|member/i,
      /notebook|llm|gpt|claude|openai|anthropic/i,
      /twitter|facebook|instagram|youtube|slack|zoom/i,
      /react|vue|angular|python|java|javascript/i,
      /^\d+$/, // 数字のみ
      /^[a-zA-Z]$/ // 単一文字
    ];
    
    // 固有名詞パターンに一致する場合は無効
    if (properNounPatterns.some(pattern => pattern.test(label))) {
      return false;
    }
    
    // セマンティックに意味のある語かチェック
    const meaningfulPatterns = [
      // 日本語の意味のある概念語
      /^(分析|設計|開発|改善|検証|評価|調査|研究|実装|運用|管理|企画|計画|戦略|手法|方法|技術|機能|システム|プロセス|ワークフロー|インターフェース|ユーザビリティ|アクセシビリティ|セキュリティ|パフォーマンス|品質|効率|生産性|創造性|革新|変更|更新|最適化|自動化|可視化|標準化)/,
      // 英語の意味のある概念語
      /^(analysis|design|development|improvement|verification|evaluation|research|implementation|operation|management|planning|strategy|method|technology|function|system|process|workflow|interface|usability|accessibility|security|performance|quality|efficiency|productivity|creativity|innovation|change|update|optimization|automation|visualization|standardization)/i,
      // カテゴリ系の語
      /^(insights?|themes?|questions?|actions?|ideas?|concepts?|problems?|solutions?|observations?|hypotheses?)$/i,
      // 一般的な形容詞・名詞（日本語）
      /^(重要|主要|基本|基礎|応用|実践|実用|実際|現実|理想|具体|抽象|全体|部分|個別|共通|特定|一般|特別|普通|通常|異常|正常|標準|独自|固有|共有|公開|非公開|内部|外部|前面|背面|上位|下位|同等|類似|相違|対照|対応|関連|無関係).*$/,
      // 一般的な形容詞・名詞（英語）
      /^(important|main|basic|fundamental|applied|practical|actual|real|ideal|concrete|abstract|whole|part|individual|common|specific|general|special|normal|usual|standard|unique|shared|public|private|internal|external|upper|lower|similar|different|related|relevant).*$/i
    ];
    
    return meaningfulPatterns.some(pattern => pattern.test(label)) || label.length >= 4;
  }
  
  /**
   * 安全なラベルリストを生成（ホワイトリスト方式）
   */
  private static generateSafeLabels(dominantTags: string[], _unusedType: string, cardCount: number): string[] {
    const labels: string[] = [];
    
    // タグベースの安全なラベル（構造メタデータ除外）
    if (dominantTags.length > 0) {
      const tag = dominantTags[0];
      if (this.isValidSemanticLabel(tag)) {
        const tagMapping: { [key: string]: string[] } = {
          'ux': ['UX Research', 'User Experience', 'UX Design'],
          'design': ['Design Work', 'Design Process', 'Design Thinking'],
          'research': ['Research Findings', 'Research Process', 'Study Results'],
          'testing': ['Testing Results', 'Test Analysis', 'Quality Assurance'],
          'prototype': ['Prototype Development', 'Prototyping', 'Design Iteration'],
          'accessibility': ['Accessibility Standards', 'A11y Guidelines', 'Inclusive Design'],
          'usability': ['Usability Testing', 'User Testing', 'Usability Analysis'],
          'feedback': ['User Feedback', 'Review Comments', 'Input Analysis'],
          'analysis': ['Data Analysis', 'Analytical Findings', 'Research Analysis'],
          'ui': ['UI Design', 'Interface Design', 'User Interface'],
          'wireframe': ['Wireframing', 'Layout Design', 'Structure Planning'],
          'mockup': ['Visual Design', 'Design Mockups', 'Visual Prototypes']
        };
        
        const mappedLabels = tagMapping[tag.toLowerCase()];
        if (mappedLabels) {
          labels.push(...mappedLabels);
        } else {
          // 汎用的なタグラベル
          labels.push(
            `${tag.charAt(0).toUpperCase() + tag.slice(1)} Related`,
            `${tag.toUpperCase()} Items`,
            `${tag} Discussion`
          );
        }
      }
    }
    
    // カード数ベースの汎用ラベル
    if (cardCount >= 7) {
      labels.push('Major Discussion', 'Core Theme', 'Primary Topic');
    } else if (cardCount >= 4) {
      labels.push('Important Topic', 'Key Discussion', 'Focus Area');
    } else if (cardCount >= 2) {
      labels.push('Related Items', 'Discussion Points', 'Connected Ideas');
    } else {
      labels.push('Single Item', 'Individual Point', 'Standalone Note');
    }
    
    // コンテンツベースの汎用ラベル
    labels.push(
      'Discussion Group',
      'Related Content',
      'Topic Cluster',
      'Content Group',
      'Information Set'
    );
    
    return [...new Set(labels)]; // 重複除去
  }
  
  /**
   * 保守的な信頼度計算
   */
  private static calculateConservativeLabelConfidence(
    cards: BoardItem[],
    keywords: string[],
    dominantTags: string[],
    label: string
  ): number {
    let confidence = 0.3; // 保守的なベース信頼度
    
    // ラベルが有効な場合のみ信頼度を上げる
    if (this.isValidSemanticLabel(label)) {
      confidence += 0.2;
    }
    
    // カード数による調整（保守的）
    if (cards.length >= 5) confidence += 0.15;
    if (cards.length >= 3) confidence += 0.1;
    
    // キーワードの一貫性（保守的）
    const validKeywords = keywords.filter(k => this.isValidSemanticLabel(k));
    if (validKeywords.length > 0) confidence += 0.1;
    if (validKeywords.length > 2) confidence += 0.05;
    
    // タグの一貫性（保守的）
    const validTags = dominantTags.filter(t => this.isValidSemanticLabel(t));
    if (validTags.length > 0) confidence += 0.1;
    
    return Math.min(0.85, confidence); // 最大85%に制限
  }
  
  // ヘルパーメソッド
  private static calculateTagSimilarity(tagsA: string[], tagsB: string[]): number {
    if (tagsA.length === 0 && tagsB.length === 0) return 0;
    if (tagsA.length === 0 || tagsB.length === 0) return 0;
    
    const setA = new Set(tagsA);
    const setB = new Set(tagsB);
    const intersection = new Set([...setA].filter(x => setB.has(x)));
    const union = new Set([...setA, ...setB]);
    
    return intersection.size / union.size; // Jaccard係数
  }
  
  private static async calculateSemanticSimilarity(cardA: BoardItem, cardB: BoardItem): Promise<number> {
    // 実装では、埋め込みベクトルのコサイン類似度を計算
    // 簡略版では、テキストの重複度を使用
    const textA = `${cardA.title} ${cardA.content || ''}`.toLowerCase();
    const textB = `${cardB.title} ${cardB.content || ''}`.toLowerCase();
    
    const wordsA = new Set(textA.split(/\s+/).filter(w => w.length > 2));
    const wordsB = new Set(textB.split(/\s+/).filter(w => w.length > 2));
    
    if (wordsA.size === 0 && wordsB.size === 0) return 0;
    if (wordsA.size === 0 || wordsB.size === 0) return 0;
    
    const intersection = new Set([...wordsA].filter(x => wordsB.has(x)));
    const union = new Set([...wordsA, ...wordsB]);
    
    return intersection.size / union.size;
  }
  
  private static calculateContentSimilarity(cardA: BoardItem, cardB: BoardItem): number {
    // タイトルとコンテンツの類似度
    const titleSim = this.calculateTextSimilarity(cardA.title, cardB.title);
    const contentSim = this.calculateTextSimilarity(cardA.content || '', cardB.content || '');
    
    return (titleSim * 0.7 + contentSim * 0.3);
  }
  
  private static calculateTextSimilarity(textA: string, textB: string): number {
    if (!textA && !textB) return 1;
    if (!textA || !textB) return 0;
    
    const wordsA = textA.toLowerCase().split(/\s+/);
    const wordsB = textB.toLowerCase().split(/\s+/);
    
    const setA = new Set(wordsA);
    const setB = new Set(wordsB);
    
    const intersection = new Set([...setA].filter(x => setB.has(x)));
    const union = new Set([...setA, ...setB]);
    
    return intersection.size / union.size;
  }
  
  private static async createSmartCluster(
    id: string,
    nodes: NetworkNode[],
    similarityMatrix: number[][] | number[][],
    nodeIndices: number[]
  ): Promise<SmartCluster> {
    // クラスターの中心ノード（最も接続数が多い）
    const centroid = nodes.reduce((prev, current) => 
      current.connectionCount > prev.connectionCount ? current : prev
    );
    
    // 結束度計算（クラスター内の平均類似度）
    let cohesion = 0;
    if (similarityMatrix.length > 0 && nodeIndices.length > 1) {
      let totalSimilarity = 0;
      let pairCount = 0;
      
      for (let i = 0; i < nodeIndices.length; i++) {
        for (let j = i + 1; j < nodeIndices.length; j++) {
          totalSimilarity += similarityMatrix[nodeIndices[i]][nodeIndices[j]];
          pairCount++;
        }
      }
      
      cohesion = pairCount > 0 ? totalSimilarity / pairCount : 0;
    }
    
    // タグとタイプの分析
    const tagFreq: { [tag: string]: number } = {};
    const typeFreq: { [type: string]: number } = {};
    
    nodes.forEach(node => {
      // ノードのメタデータからタグとタイプを取得
      // 実装では、対応するカードデータから取得
      if (node.metadata?.tags) {
        (node.metadata.tags as string[]).forEach((tag: string) => {
          tagFreq[tag] = (tagFreq[tag] || 0) + 1;
        });
      }
      if (node.metadata?.type) {
        typeFreq[node.metadata.type] = (typeFreq[node.metadata.type] || 0) + 1;
      }
    });
    
    const dominantTags = Object.entries(tagFreq)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([tag]) => tag);
    
    const dominantTypes = Object.entries(typeFreq)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 2)
      .map(([type]) => type);
    
    return {
      id,
      nodes: nodes.map(n => n.id),
      centroid,
      cohesion,
      separation: 0, // 他クラスターとの分離度（後で計算）
      semanticTheme: dominantTags[0] || 'general',
      dominantTags,
      dominantTypes,
      confidence: cohesion,
      suggestedLabel: '', // 後で生成
      alternativeLabels: [],
      reasoning: ''
    };
  }
  
  private static evaluateClusterQuality(
    clusters: SmartCluster[],
    outliers: string[],
    similarityMatrix: number[][]
  ): ClusterQualityMetrics {
    if (clusters.length === 0) {
      return {
        silhouetteScore: 0,
        modularityScore: 0,
        intraClusterDistance: 0,
        interClusterDistance: 0,
        coverageRatio: 0
      };
    }
    
    // 簡略版の品質メトリクス
    const avgCohesion = clusters.reduce((sum, c) => sum + c.cohesion, 0) / clusters.length;
    const totalNodes = clusters.reduce((sum, c) => sum + c.nodes.length, 0) + outliers.length;
    const coverageRatio = totalNodes > 0 ? clusters.reduce((sum, c) => sum + c.nodes.length, 0) / totalNodes : 0;
    
    return {
      silhouetteScore: avgCohesion, // 簡略版
      modularityScore: avgCohesion * 0.8, // 簡略版
      intraClusterDistance: 1 - avgCohesion,
      interClusterDistance: avgCohesion * 1.2, // 簡略版
      coverageRatio
    };
  }
  
  private static generateLabelReasoning(
    cards: BoardItem[],
    keywords: string[],
    dominantTags: string[],
    _unusedType: string
  ): string {
    const reasons: string[] = [];
    
    if (keywords.length > 0) {
      reasons.push(`キーワード「${keywords[0]}」が頻出`);
    }
    
    if (dominantTags.length > 0) {
      reasons.push(`タグ「${dominantTags[0]}」が共通`);
    }
    
    reasons.push(`${cards.length}個のカードで構成`);
    
    return reasons.join('、');
  }
  
  // 追加のヘルパーメソッド（簡略実装）
  private static async performHierarchicalClustering(
    nodes: NetworkNode[],
    similarityMatrix: number[][],
    config: ClusteringConfig
  ): Promise<SmartCluster[]> {
    // 階層クラスタリングの簡略実装
    return [];
  }
  
  private static async performCommunityDetection(
    nodes: NetworkNode[],
    edges: NetworkEdge[],
    config: ClusteringConfig
  ): Promise<SmartCluster[]> {
    // コミュニティ検出の簡略実装
    return [];
  }
  
  private static async performSemanticClustering(
    nodes: NetworkNode[],
    cards: BoardItem[],
    config: ClusteringConfig
  ): Promise<SmartCluster[]> {
    // セマンティッククラスタリングの簡略実装
    return [];
  }
  
  private static async performHybridClustering(
    nodes: NetworkNode[],
    edges: NetworkEdge[],
    cards: BoardItem[],
    config: ClusteringConfig
  ): Promise<SmartCluster[]> {
    // ハイブリッドクラスタリングの簡略実装
    return [];
  }
  
  /**
   * N-gram抽出で意味のある複合語を検出
   */
  private static extractNGrams(text: string, n: number = 2): Array<{phrase: string, score: number}> {
    // 前処理：句読点で文を分割
    const sentences = text.split(/[。．！？\.\!\?]/).filter(s => s.trim().length > 0);
    
    const ngramFreq: { [ngram: string]: number } = {};
    
    sentences.forEach(sentence => {
      const words = sentence
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 1);
      
      // N-gram生成
      for (let i = 0; i <= words.length - n; i++) {
        const ngram = words.slice(i, i + n).join(' ');
        
        // 意味のありそうなN-gramのみを選択
        if (this.isValidNGram(words.slice(i, i + n))) {
          ngramFreq[ngram] = (ngramFreq[ngram] || 0) + 1;
        }
      }
    });
    
    // スコア付きで返す
    return Object.entries(ngramFreq)
      .map(([phrase, freq]) => ({
        phrase,
        score: freq / Math.log(text.length + 1) // 文書長で正規化
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10); // 上位10個
  }
  
  /**
   * N-gramが意味のある組み合わせかチェック
   */
  private static isValidNGram(words: string[]): boolean {
    // ストップワードのみの組み合わせは除外
    const stopWords = new Set([
      'の', 'を', 'に', 'は', 'が', 'と', 'で', 'から', 'まで', 'について', 'による',
      'する', 'した', 'して', 'される', 'できる', 'ある', 'いる', 'なる', 'もの',
      'こと', 'これ', 'それ', 'あれ', 'この', 'その', 'あの',
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'
    ]);
    
    // 少なくとも1つは意味のある単語を含む必要がある
    const meaningfulWords = words.filter(word => 
      word.length > 2 && !stopWords.has(word)
    );
    
    if (meaningfulWords.length === 0) return false;
    
    // 固有名詞パターンチェック（N-gram用）
    const entityPatterns = [
      /^[A-Z][a-z]{2,8}$/,  // 固有名詞
      /^[A-Z][a-z]+[0-9]+$/,  // 名前+数字
      /notebook|llm|gpt|claude|ai/i, // AI関連
      /speaker|発言者|moderator|admin|user/i, // 役割名
    ];
    
    // 固有名詞が含まれている場合は除外
    if (words.some(word => entityPatterns.some(pattern => pattern.test(word)))) {
      return false;
    }
    
    // 日本語の自然なパターンをチェック
    const naturalPatterns = [
      /\w+(の|による|での|への)\w+/, // "〜の〜" "〜による〜"等
      /\w+(改善|向上|分析|検証|設計|開発)/, // 動作を表す語が含まれる
      /\w+(手法|方法|プロセス|アプローチ)/, // 手段を表す語が含まれる
      /(ユーザー|デザイン|インターフェース)\w+/, // ドメイン語が含まれる
    ];
    
    const combinedText = words.join(' ');
    const hasNaturalPattern = naturalPatterns.some(pattern => pattern.test(combinedText));
    
    return hasNaturalPattern || meaningfulWords.length >= 2;
  }
  
  private static beautifyPhrase(phrase: string): string {
    // フレーズを美しく整形
    const words = phrase.split(' ');
    
    // 各単語を美化
    const beautifiedWords = words.map(word => this.beautifyLabel(word));
    
    // 日本語の自然な表現に変換
    const naturalPatterns = [
      { pattern: /(\w+)\s+(改善|向上)/, replacement: '$1の$2' },
      { pattern: /(\w+)\s+(分析|検証)/, replacement: '$1$2' },
      { pattern: /(\w+)\s+(手法|方法)/, replacement: '$1$2' },
      { pattern: /(\w+)\s+(プロセス|アプローチ)/, replacement: '$1$2' },
      { pattern: /(ユーザー|デザイン|インターフェース)\s+(\w+)/, replacement: '$1$2' },
    ];
    
    let result = beautifiedWords.join(' ');
    
    naturalPatterns.forEach(({ pattern, replacement }) => {
      result = result.replace(pattern, replacement);
    });
    
    return result;
  }
  
  private static createSemanticCombination(keyword: string, tag: string): string {
    // キーワードとタグから意味のある組み合わせを生成
    const beautifiedKeyword = this.beautifyLabel(keyword);
    const beautifiedTag = this.getTagLabel(tag);
    
    // 組み合わせパターン
    const combinationPatterns = [
      // タグが手法系の場合
      () => {
        if (['research', 'analysis', 'testing', 'evaluation'].includes(tag.toLowerCase())) {
          return `${beautifiedKeyword}${beautifiedTag}`;
        }
        return null;
      },
      
      // キーワードが動作系の場合
      () => {
        if (keyword.match(/(改善|向上|分析|検証|設計|開発)/)) {
          return `${beautifiedTag}の${beautifiedKeyword}`;
        }
        return null;
      },
      
      // デフォルト組み合わせ
      () => {
        if (beautifiedKeyword.length + beautifiedTag.length <= 20) {
          return `${beautifiedTag}${beautifiedKeyword}`;
        }
        return null;
      }
    ];
    
    for (const pattern of combinationPatterns) {
      const result = pattern();
      if (result) return result;
    }
    
    return beautifiedKeyword; // フォールバック
  }

  /**
   * HDBSCAN実行（統合メソッド）
   */
  private static async performHDBSCAN(
    nodes: NetworkNode[],
    edges: NetworkEdge[],
    cards: BoardItem[],
    config: ClusteringConfig
  ): Promise<ClusteringResult> {
    console.log('🎯 HDBSCAN実行開始');
    
    try {
      // HDBSCANProviderを動的インポート（バンドルサイズ最適化）
      const { HDBSCANProvider } = await import('./clustering/hdbscan/HDBSCANProvider');
      
      // HDBSCANプロバイダーで実行
      const result = await HDBSCANProvider.performClustering(nodes, edges, cards as any, config);
      
      console.log(`✅ HDBSCAN完了: ${result.clusters.length}クラスター`);
      
      // 既存システムとの互換性を保証するため、結果形式を調整
      return {
        ...result,
        algorithm: 'hdbscan' as const,
        parameters: config
      };
      
    } catch (error) {
      console.error('❌ HDBSCAN実行エラー:', error);
      
      // フォールバック: DBSCANで実行
      console.warn('🔄 フォールバック: DBSCANで実行します');
      const fallbackConfig = { ...config, algorithm: 'dbscan' as const };
      const similarityMatrix = await this.calculateSimilarityMatrix(nodes, edges, cards, fallbackConfig);
      const { clusters, outliers } = await this.performDBSCAN(nodes, similarityMatrix, fallbackConfig);
      
      // 品質評価
      const quality = this.evaluateClusterQuality(clusters, outliers, similarityMatrix);

      return {
        clusters,
        outliers,
        quality,
        algorithm: 'dbscan',
        parameters: fallbackConfig,
        
        // エラー情報を含める
        error: {
          message: 'HDBSCAN実行エラー、DBSCANにフォールバック',
          originalError: error instanceof Error ? error.message : String(error)
        }
      } as ClusteringResult;
    }
  }
} 