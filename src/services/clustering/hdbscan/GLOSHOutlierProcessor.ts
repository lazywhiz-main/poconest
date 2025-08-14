/**
 * GLOSH (Global-Local Outlier Score from Hierarchies) 外れ値処理
 * HDBSCAN階層構造から外れ値スコアを計算し、外れ値を適切に処理
 */

import type { NetworkNode } from '../../../types/analysis';
import type { 
  ClusterTree, 
  HierarchicalClusterNode, 
  OutlierScores,
  StabilityScores,
  HDBSCANCluster 
} from '../types/hdbscan';

// ===========================================
// GLOSH外れ値処理
// ===========================================

export class GLOSHOutlierProcessor {

  /**
   * GLOSH外れ値スコアの計算
   */
  static calculateGLOSHScores(
    hierarchy: ClusterTree,
    stabilityScores: StabilityScores,
    selectedClusters: HierarchicalClusterNode[],
    nodes: NetworkNode[]
  ): OutlierScores {
    console.log(`🔍 GLOSH外れ値スコア計算開始: ${nodes.length}ノード`);
    
    const outlierScores: OutlierScores = {};
    
    // 各ノードに対してGLOSHスコアを計算
    nodes.forEach(node => {
      const score = this.calculateNodeOutlierScore(
        node.id, 
        hierarchy, 
        stabilityScores, 
        selectedClusters
      );
      
      outlierScores[node.id] = score;
    });
    
    // 外れ値統計
    const scores = Object.values(outlierScores).map(s => s.score);
    const avgScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    const maxScore = Math.max(...scores);
    const outlierCount = Object.values(outlierScores).filter(s => s.isOutlier).length;
    
    console.log(`✅ GLOSH計算完了: 平均スコア=${avgScore.toFixed(3)}, 最大=${maxScore.toFixed(3)}, 外れ値=${outlierCount}個`);
    
    return outlierScores;
  }

  /**
   * 個別ノードの外れ値スコア計算
   */
  private static calculateNodeOutlierScore(
    nodeId: string,
    hierarchy: ClusterTree,
    stabilityScores: StabilityScores,
    selectedClusters: HierarchicalClusterNode[]
  ): {
    score: number;
    isOutlier: boolean;
    nearestCluster?: string;
    distanceToCluster?: number;
  } {
    
    // 1. ノードが属する最小クラスターを特定
    const containingCluster = this.findContainingCluster(nodeId, selectedClusters);
    
    if (!containingCluster) {
      // どのクラスターにも属さない → 完全な外れ値
      return {
        score: 1.0,
        isOutlier: true,
        nearestCluster: this.findNearestCluster(nodeId, selectedClusters),
        distanceToCluster: undefined
      };
    }
    
    // 2. クラスター内でのローカル外れ値スコア計算
    const localScore = this.calculateLocalOutlierScore(
      nodeId, 
      containingCluster, 
      hierarchy, 
      stabilityScores
    );
    
    // 3. グローバル外れ値スコア計算
    const globalScore = this.calculateGlobalOutlierScore(
      nodeId, 
      containingCluster, 
      hierarchy, 
      stabilityScores
    );
    
    // 4. 統合スコア（ローカル + グローバル）
    const combinedScore = Math.max(localScore, globalScore);
    
    // 5. 外れ値判定（閾値0.7）
    const isOutlier = combinedScore > 0.7;
    
    return {
      score: combinedScore,
      isOutlier,
      nearestCluster: containingCluster.id,
      distanceToCluster: this.calculateDistanceToClusterCore(nodeId, containingCluster)
    };
  }

  /**
   * ノードを含むクラスターを特定
   */
  private static findContainingCluster(
    nodeId: string, 
    clusters: HierarchicalClusterNode[]
  ): HierarchicalClusterNode | undefined {
    return clusters.find(cluster => cluster.nodeIds.includes(nodeId));
  }

  /**
   * 最も近いクラスターを特定
   */
  private static findNearestCluster(
    nodeId: string, 
    clusters: HierarchicalClusterNode[]
  ): string | undefined {
    // 簡易実装: 最初のクラスターを返す
    // 実際は距離計算が必要
    return clusters.length > 0 ? clusters[0].id : undefined;
  }

  /**
   * ローカル外れ値スコア計算
   * クラスター内での相対的な外れ度
   */
  private static calculateLocalOutlierScore(
    nodeId: string,
    cluster: HierarchicalClusterNode,
    hierarchy: ClusterTree,
    stabilityScores: StabilityScores
  ): number {
    
    // ノードが所属するλレベルでの安定性を取得
    const nodeBirthLevel = this.findNodeBirthLevel(nodeId, hierarchy);
    const clusterScore = stabilityScores[cluster.id];
    
    if (!clusterScore || nodeBirthLevel === undefined) {
      return 0.5; // デフォルト中程度スコア
    }
    
    // クラスターの密度分布内での位置
    const clusterBirthLevel = clusterScore.birthLevel;
    const clusterDeathLevel = clusterScore.deathLevel;
    
    if (clusterBirthLevel === clusterDeathLevel) {
      return 0.0; // 安定なクラスター
    }
    
    // 正規化された相対位置（0=中心、1=境界）
    const relativePosition = Math.abs(nodeBirthLevel - clusterBirthLevel) / 
                            Math.abs(clusterBirthLevel - clusterDeathLevel);
    
    return Math.min(1.0, Math.max(0.0, relativePosition));
  }

  /**
   * グローバル外れ値スコア計算
   * 全体の階層構造での相対位置
   */
  private static calculateGlobalOutlierScore(
    nodeId: string,
    cluster: HierarchicalClusterNode,
    hierarchy: ClusterTree,
    stabilityScores: StabilityScores
  ): number {
    
    const clusterScore = stabilityScores[cluster.id];
    if (!clusterScore) return 0.5;
    
    // 全クラスターの安定性分布での位置
    const allStabilities = Object.values(stabilityScores).map(s => s.stability);
    const avgStability = allStabilities.reduce((sum, s) => sum + s, 0) / allStabilities.length;
    const stdStability = Math.sqrt(
      allStabilities.reduce((sum, s) => sum + Math.pow(s - avgStability, 2), 0) / allStabilities.length
    );
    
    // 標準偏差に基づく外れ値スコア
    if (stdStability === 0) return 0.0;
    
    const zScore = Math.abs(clusterScore.stability - avgStability) / stdStability;
    const globalScore = Math.min(1.0, zScore / 3.0); // 3σを最大とする
    
    // 低安定性クラスターのノードは外れ値候補
    return clusterScore.stability < avgStability ? globalScore : Math.max(0.0, globalScore - 0.3);
  }

  /**
   * ノードの誕生レベル（密度）を特定
   */
  private static findNodeBirthLevel(
    nodeId: string, 
    hierarchy: ClusterTree
  ): number | undefined {
    
    const findInNode = (node: HierarchicalClusterNode): number | undefined => {
      // このノードが対象ノードを含む最小のノードかチェック
      if (node.nodeIds.includes(nodeId)) {
        // 子ノードにも含まれているかチェック
        for (const child of node.children) {
          const childResult = findInNode(child);
          if (childResult !== undefined) {
            return childResult; // より小さなクラスターでの誕生レベル
          }
        }
        // このレベルが最小
        return node.birthLevel;
      }
      return undefined;
    };
    
    return findInNode(hierarchy.root);
  }

  /**
   * クラスターコアまでの距離計算
   */
  private static calculateDistanceToClusterCore(
    nodeId: string, 
    cluster: HierarchicalClusterNode
  ): number {
    // 簡易実装: クラスターサイズの逆数
    // 実際は空間的距離やグラフ距離を使用
    return cluster.nodeIds.length > 0 ? 1.0 / cluster.nodeIds.length : 1.0;
  }

  /**
   * 外れ値の再配属処理
   */
  static reassignOutliers(
    outlierScores: OutlierScores,
    selectedClusters: HierarchicalClusterNode[],
    nodes: NetworkNode[],
    reassignmentThreshold: number = 0.3
  ): {
    reassigned: Array<{ nodeId: string; clusterId: string; confidence: number }>;
    remaining: string[];
  } {
    console.log(`🔄 外れ値再配属処理開始: 閾値=${reassignmentThreshold}`);
    
    const reassigned: Array<{ nodeId: string; clusterId: string; confidence: number }> = [];
    const remaining: string[] = [];
    
    Object.entries(outlierScores).forEach(([nodeId, scoreInfo]) => {
      if (scoreInfo.isOutlier && scoreInfo.score <= 0.9) { // 完全外れ値でない場合
        
        // 最適な配属先を探索
        const bestCluster = this.findBestClusterForOutlier(
          nodeId, 
          selectedClusters, 
          nodes,
          reassignmentThreshold
        );
        
        if (bestCluster) {
          reassigned.push({
            nodeId,
            clusterId: bestCluster.clusterId,
            confidence: bestCluster.confidence
          });
          
          // クラスターにノードを追加
          const cluster = selectedClusters.find(c => c.id === bestCluster.clusterId);
          if (cluster && !cluster.nodeIds.includes(nodeId)) {
            cluster.nodeIds.push(nodeId);
          }
        } else {
          remaining.push(nodeId);
        }
      } else if (scoreInfo.isOutlier) {
        remaining.push(nodeId); // 完全外れ値は再配属しない
      }
    });
    
    console.log(`✅ 外れ値再配属完了: ${reassigned.length}個再配属, ${remaining.length}個残存`);
    
    return { reassigned, remaining };
  }

  /**
   * 外れ値ノードの最適配属先を探索
   */
  private static findBestClusterForOutlier(
    nodeId: string,
    clusters: HierarchicalClusterNode[],
    nodes: NetworkNode[],
    threshold: number
  ): { clusterId: string; confidence: number } | null {
    
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return null;
    
    let bestCluster: { clusterId: string; confidence: number } | null = null;
    
    for (const cluster of clusters) {
      // クラスターとの親和性を評価
      const affinity = this.calculateClusterAffinity(node, cluster, nodes);
      
      if (affinity >= threshold && (!bestCluster || affinity > bestCluster.confidence)) {
        bestCluster = {
          clusterId: cluster.id,
          confidence: affinity
        };
      }
    }
    
    return bestCluster;
  }

  /**
   * ノードとクラスターの親和性計算
   */
  private static calculateClusterAffinity(
    node: NetworkNode,
    cluster: HierarchicalClusterNode,
    allNodes: NetworkNode[]
  ): number {
    
    // クラスター内ノードとの類似性を計算
    let totalSimilarity = 0;
    let comparisonCount = 0;
    
    for (const clusterNodeId of cluster.nodeIds) {
      const clusterNode = allNodes.find(n => n.id === clusterNodeId);
      if (!clusterNode) continue;
      
      // 簡易類似性計算（タグベース）
      const similarity = this.calculateNodeSimilarity(node, clusterNode);
      totalSimilarity += similarity;
      comparisonCount++;
    }
    
    return comparisonCount > 0 ? totalSimilarity / comparisonCount : 0;
  }

  /**
   * ノード間類似性計算（簡易版）
   */
  private static calculateNodeSimilarity(nodeA: NetworkNode, nodeB: NetworkNode): number {
    // タイプ類似性
    const typeSimilarity = nodeA.type === nodeB.type ? 0.3 : 0;
    
    // タグ類似性
    const tagsA = new Set(nodeA.tags || []);
    const tagsB = new Set(nodeB.tags || []);
    const tagIntersection = new Set(Array.from(tagsA).filter(tag => tagsB.has(tag)));
    const tagUnion = new Set([...tagsA, ...tagsB]);
    const tagSimilarity = tagUnion.size > 0 ? (tagIntersection.size / tagUnion.size) * 0.7 : 0;
    
    return Math.min(1.0, typeSimilarity + tagSimilarity);
  }

  /**
   * 外れ値分析レポート生成
   */
  static generateOutlierReport(
    outlierScores: OutlierScores,
    nodes: NetworkNode[]
  ): {
    summary: {
      totalNodes: number;
      outlierCount: number;
      outlierRatio: number;
      averageScore: number;
      highRiskOutliers: number;
    };
    distribution: Array<{ range: string; count: number }>;
    topOutliers: Array<{
      nodeId: string;
      title: string;
      score: number;
      reasons: string[];
    }>;
  } {
    
    const scores = Object.values(outlierScores);
    const totalNodes = scores.length;
    const outlierCount = scores.filter(s => s.isOutlier).length;
    const averageScore = scores.reduce((sum, s) => sum + s.score, 0) / totalNodes;
    const highRiskOutliers = scores.filter(s => s.score > 0.9).length;
    
    // スコア分布
    const bins = [
      { range: '0.0-0.2', count: 0 },
      { range: '0.2-0.4', count: 0 },
      { range: '0.4-0.6', count: 0 },
      { range: '0.6-0.8', count: 0 },
      { range: '0.8-1.0', count: 0 }
    ];
    
    scores.forEach(s => {
      const binIndex = Math.min(4, Math.floor(s.score * 5));
      bins[binIndex].count++;
    });
    
    // トップ外れ値
    const topOutliers = Object.entries(outlierScores)
      .sort(([,a], [,b]) => b.score - a.score)
      .slice(0, 10)
      .map(([nodeId, scoreInfo]) => {
        const node = nodes.find(n => n.id === nodeId);
        const reasons: string[] = [];
        
        if (scoreInfo.score > 0.9) reasons.push('高外れ値スコア');
        if (!scoreInfo.nearestCluster) reasons.push('クラスター未所属');
        if (scoreInfo.distanceToCluster && scoreInfo.distanceToCluster > 0.8) reasons.push('クラスター中心から遠い');
        
        return {
          nodeId,
          title: node?.title || 'Unknown',
          score: scoreInfo.score,
          reasons
        };
      });
    
    return {
      summary: {
        totalNodes,
        outlierCount,
        outlierRatio: outlierCount / totalNodes,
        averageScore,
        highRiskOutliers
      },
      distribution: bins,
      topOutliers
    };
  }

  /**
   * 外れ値可視化データ生成
   */
  static generateOutlierVisualization(
    outlierScores: OutlierScores,
    nodes: NetworkNode[]
  ): {
    outlierNodes: Array<{
      nodeId: string;
      x: number;
      y: number;
      score: number;
      color: string;
      size: number;
    }>;
    scoreHeatmap: Array<{
      x: number;
      y: number;
      intensity: number;
    }>;
  } {
    
    const outlierNodes = nodes.map(node => {
      const scoreInfo = outlierScores[node.id];
      const score = scoreInfo?.score || 0;
      
      // スコアに基づく色とサイズ
      const color = score > 0.7 ? '#ff4757' : score > 0.4 ? '#ffa502' : '#2ed573';
      const size = Math.max(4, Math.min(20, 4 + score * 16));
      
      return {
        nodeId: node.id,
        x: node.x,
        y: node.y,
        score,
        color,
        size
      };
    });
    
    // スコアヒートマップ（グリッドベース）
    const gridSize = 20;
    const scoreHeatmap: Array<{ x: number; y: number; intensity: number }> = [];
    
    // 座標範囲を計算
    const xMin = Math.min(...nodes.map(n => n.x));
    const xMax = Math.max(...nodes.map(n => n.x));
    const yMin = Math.min(...nodes.map(n => n.y));
    const yMax = Math.max(...nodes.map(n => n.y));
    
    const xStep = (xMax - xMin) / gridSize;
    const yStep = (yMax - yMin) / gridSize;
    
    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        const x = xMin + i * xStep;
        const y = yMin + j * yStep;
        
        // 周辺ノードの外れ値スコアから強度を計算
        let totalScore = 0;
        let count = 0;
        
        nodes.forEach(node => {
          const distance = Math.sqrt(Math.pow(node.x - x, 2) + Math.pow(node.y - y, 2));
          if (distance < Math.max(xStep, yStep) * 2) {
            const scoreInfo = outlierScores[node.id];
            totalScore += scoreInfo?.score || 0;
            count++;
          }
        });
        
        const intensity = count > 0 ? totalScore / count : 0;
        
        scoreHeatmap.push({ x, y, intensity });
      }
    }
    
    return {
      outlierNodes,
      scoreHeatmap
    };
  }
}
