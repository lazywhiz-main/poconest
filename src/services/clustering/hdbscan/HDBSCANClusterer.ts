/**
 * HDBSCANメインクラスタラー
 * 全ての段階を統合したメインアルゴリズム実装
 */

import type { NetworkNode, NetworkEdge } from '../../../types/analysis';
import type { BoardItem } from '../../../features/board-space/contexts/BoardContext';
import type { 
  HDBSCANConfig, 
  HDBSCANResult, 
  HDBSCANCluster,
  ProcessingMetrics 
} from '../types/hdbscan';

import { NetworkDistanceCalculator } from './NetworkDistanceCalculator';
import { MutualReachabilityCalculator } from './MutualReachabilityCalculator';
import { HDBSCANHierarchyBuilder } from './HDBSCANHierarchyBuilder';
import { GLOSHOutlierProcessor } from './GLOSHOutlierProcessor';
import { HDBSCANUtils } from './HDBSCANCore';
// import { HDBSCANLogger } from '../../../utils/hdbscanLogger';

// ===========================================
// HDBSCANメインクラスタラー
// ===========================================

export class HDBSCANClusterer {

  /**
   * HDBSCANクラスタリングのメイン実行関数
   */
  static async performClustering(
    nodes: NetworkNode[],
    edges: NetworkEdge[],
    cards: BoardItem[],
    config: HDBSCANConfig
  ): Promise<HDBSCANResult> {
    
    const startTime = performance.now();
    console.log(`🚀 [HDBSCAN] 実行開始: ${nodes.length}ノード, ${edges.length}エッジ`);
    console.log(`⚙️ [HDBSCAN] 設定: minClusterSize=${config.minClusterSize}, algorithm=${config.algorithm}`);
    
    const metrics: ProcessingMetrics = {
      distanceCalculationTime: 0,
      mutualReachabilityTime: 0,
      mstConstructionTime: 0,
      hierarchyExtractionTime: 0,
      stabilityEvaluationTime: 0,
      outlierProcessingTime: 0,
      totalTime: 0,
      memoryUsage: 0,
      cacheHitRate: 0
    };

    try {
      // 1. 前処理・設定検証
      const validatedConfig = this.validateAndNormalizeConfig(config, nodes.length);
      const actualMinSamples = validatedConfig.minSamples || Math.max(2, validatedConfig.minClusterSize - 1);
      
      console.log(`📝 [HDBSCAN] 検証済み設定: minSamples=${actualMinSamples}`);

      // 2. 距離行列計算
      const distanceStartTime = performance.now();
      const distanceCalculator = new NetworkDistanceCalculator(nodes, edges, cards);
      const distanceMatrix = distanceCalculator.calculateDistanceMatrix(validatedConfig.distanceWeights);
      
      // 距離行列の品質検証
      const distanceValidation = NetworkDistanceCalculator.validateDistanceMatrix(distanceMatrix);
      if (!distanceValidation.isValid) {
        throw new Error(`距離行列が無効: ${distanceValidation.errors.join(', ')}`);
      }
      
      // 距離行列の統計情報
      const flatDistances = distanceMatrix.flat().filter(d => d > 0 && d < Infinity);
      const avgDistance = flatDistances.reduce((sum, d) => sum + d, 0) / flatDistances.length;
      const minDistance = Math.min(...flatDistances);
      const maxDistance = Math.max(...flatDistances);
      console.log(`📏 [HDBSCAN] 距離行列統計: min=${minDistance.toFixed(3)}, max=${maxDistance.toFixed(3)}, avg=${avgDistance.toFixed(3)}`);
      
      metrics.distanceCalculationTime = performance.now() - distanceStartTime;
      console.log(`✅ [HDBSCAN] 距離計算完了: ${metrics.distanceCalculationTime.toFixed(0)}ms`);

      // 3. 相互到達可能距離計算
      const mutualStartTime = performance.now();
      const mutualReachability = MutualReachabilityCalculator.calculateMutualReachability(
        nodes, 
        distanceMatrix, 
        actualMinSamples
      );
      
      // 密度品質評価
      const densityQuality = MutualReachabilityCalculator.evaluateDensityQuality(mutualReachability, nodes);
      console.log(`📊 [HDBSCAN] 密度品質: ${(densityQuality.qualityScore * 100).toFixed(1)}%, 外れ値比率: ${(densityQuality.outlierRatio * 100).toFixed(1)}%`);
      
      metrics.mutualReachabilityTime = performance.now() - mutualStartTime;
      console.log(`✅ [HDBSCAN] 相互到達可能距離計算完了: ${metrics.mutualReachabilityTime.toFixed(0)}ms`);

      // 4. 階層構造構築
      const hierarchyStartTime = performance.now();
      const hierarchy = HDBSCANHierarchyBuilder.buildDensityBasedHierarchy(
        nodes, 
        mutualReachability, 
        validatedConfig.minClusterSize
      );
      metrics.hierarchyExtractionTime = performance.now() - hierarchyStartTime;
      console.log(`✅ [HDBSCAN] 階層構造構築完了: ${metrics.hierarchyExtractionTime.toFixed(0)}ms`);

      // 5. 安定性評価
      const stabilityStartTime = performance.now();
      const stabilityScores = HDBSCANHierarchyBuilder.calculateClusterStability(
        hierarchy, 
        validatedConfig.minClusterSize
      );
      
      // 6. クラスター選択
      console.log(`🔍 [HDBSCAN] 階層構造詳細: 葉ノード=${hierarchy.leaves.length}, 全ノード=${this.countHierarchyNodes(hierarchy.root)}`);
      
      // 安定性スコア詳細
      const stabilityEntries = Object.entries(stabilityScores);
      console.log(`📊 [HDBSCAN] 安定性スコア分析: 総クラスター=${stabilityEntries.length}`);
      stabilityEntries.forEach(([id, score]) => {
        if (score.nodeCount >= validatedConfig.minClusterSize) {
          console.log(`  - [HDBSCAN] ${id}: 安定性=${score.stability.toFixed(3)}, サイズ=${score.nodeCount}, 永続性=${score.persistence.toFixed(3)}`);
        }
      });
      
      const selectedClusters = HDBSCANHierarchyBuilder.selectClustersWithAdvancedCriteria(
        hierarchy, 
        stabilityScores, 
        validatedConfig.minClusterSize,
        validatedConfig.clusterSelectionEpsilon || 0.0
      );
      
      console.log(`🎯 選択結果: ${selectedClusters.length}クラスター選択 (最小サイズ=${validatedConfig.minClusterSize})`);
      selectedClusters.forEach((cluster, i) => {
        console.log(`  選択クラスター${i+1}: サイズ=${cluster.nodeIds.length}, ID=${cluster.id}`);
      });
      
      metrics.stabilityEvaluationTime = performance.now() - stabilityStartTime;
      console.log(`✅ 安定性評価・選択完了: ${selectedClusters.length}クラスター選択, ${metrics.stabilityEvaluationTime.toFixed(0)}ms`);

      // 7. 外れ値処理
      const outlierStartTime = performance.now();
      const outlierScores = GLOSHOutlierProcessor.calculateGLOSHScores(
        hierarchy, 
        stabilityScores, 
        selectedClusters, 
        nodes
      );
      
      // 外れ値再配属（設定に応じて）
      const reassignmentResult = GLOSHOutlierProcessor.reassignOutliers(
        outlierScores, 
        selectedClusters, 
        nodes,
        validatedConfig.outlierAssignmentThreshold
      );
      
      metrics.outlierProcessingTime = performance.now() - outlierStartTime;
      console.log(`✅ 外れ値処理完了: ${reassignmentResult.reassigned.length}再配属, ${reassignmentResult.remaining.length}外れ値, ${metrics.outlierProcessingTime.toFixed(0)}ms`);

      // 8. 結果形式変換
      const finalClusters = this.convertToHDBSCANClusters(
        selectedClusters, 
        stabilityScores, 
        nodes, 
        cards
      );

      // 9. 品質評価
      const hierarchyQuality = HDBSCANHierarchyBuilder.evaluateHierarchyQuality(hierarchy, stabilityScores);
      const nodeMapping = HDBSCANUtils.createNodeMapping(nodes.map(n => n.id));
      const clusterQuality = HDBSCANUtils.calculateClusterQuality(
        selectedClusters, 
        distanceMatrix, 
        nodeMapping
      );

      // 10. 統計計算
      const totalProcessingTime = performance.now() - startTime;
      metrics.totalTime = totalProcessingTime;
      
      const totalNodes = nodes.length;
      const clusteredNodes = finalClusters.reduce((sum, cluster) => sum + cluster.nodeIds.length, 0);
      const outlierNodes = reassignmentResult.remaining.length;
      const coverageRatio = clusteredNodes / totalNodes;
      
      // キャッシュ統計
      const cacheStats = distanceCalculator.getCacheStats();
      metrics.cacheHitRate = (cacheStats.graph + cacheStats.semantic) / (totalNodes * totalNodes) || 0;

      console.log(`🎉 HDBSCAN完了: ${totalProcessingTime.toFixed(0)}ms`);
      console.log(`📊 結果: ${finalClusters.length}クラスター, カバー率${(coverageRatio * 100).toFixed(1)}%, 品質${(hierarchyQuality.qualityScore * 100).toFixed(1)}%`);

      // 結果オブジェクト構築
      const result: HDBSCANResult = {
        clusters: finalClusters,
        outliers: reassignmentResult.remaining,
        
        clusterTree: hierarchy,
        stabilityScores,
        outlierScores,
        
        statistics: {
          totalNodes,
          clusteredNodes,
          outlierNodes,
          coverageRatio,
          averageStability: hierarchyQuality.averageStability,
          maxOutlierScore: Math.max(...Object.values(outlierScores).map(s => s.score))
        },
        
        algorithm: 'hdbscan',
        config: validatedConfig,
        processingTime: totalProcessingTime,
        
        qualityMetrics: {
          silhouetteScore: clusterQuality.silhouette || 0,
          modularityScore: undefined, // 必要に応じて実装
          intraClusterDistance: clusterQuality.intraDistance || 0,
          interClusterDistance: clusterQuality.interDistance || 0
        }
      };

      return result;

    } catch (error) {
      console.error('❌ HDBSCAN実行エラー:', error);
      throw new Error(`HDBSCAN処理エラー: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 階層ノード数をカウント（デバッグ用）
   */
  private static countHierarchyNodes(node: any): number {
    if (!node) return 0;
    return 1 + (node.children || []).reduce((sum: number, child: any) => sum + this.countHierarchyNodes(child), 0);
  }

  /**
   * 設定の検証と正規化
   */
  private static validateAndNormalizeConfig(config: HDBSCANConfig, nodeCount: number): HDBSCANConfig {
    const normalized = { ...config };
    
    // minClusterSizeの検証
    if (normalized.minClusterSize < 2) {
      console.warn(`⚠️ minClusterSize=${normalized.minClusterSize}は小さすぎます。2に調整します。`);
      normalized.minClusterSize = 2;
    }
    
    if (normalized.minClusterSize > nodeCount / 2) {
      console.warn(`⚠️ minClusterSize=${normalized.minClusterSize}は大きすぎます。${Math.floor(nodeCount / 2)}に調整します。`);
      normalized.minClusterSize = Math.floor(nodeCount / 2);
    }
    
    // minSamplesの自動計算
    if (!normalized.minSamples) {
      normalized.minSamples = Math.max(2, normalized.minClusterSize - 1);
    }
    
    // 距離重みの正規化
    const totalWeight = normalized.distanceWeights.graph + 
                       normalized.distanceWeights.semantic + 
                       normalized.distanceWeights.structural;
    
    if (totalWeight === 0) {
      console.warn('⚠️ 距離重みの合計が0です。デフォルト値を使用します。');
      normalized.distanceWeights = { graph: 0.5, semantic: 0.3, structural: 0.2 };
    } else if (Math.abs(totalWeight - 1.0) > 0.01) {
      // 正規化
      normalized.distanceWeights.graph /= totalWeight;
      normalized.distanceWeights.semantic /= totalWeight;
      normalized.distanceWeights.structural /= totalWeight;
      console.log(`📏 距離重みを正規化: graph=${normalized.distanceWeights.graph.toFixed(2)}, semantic=${normalized.distanceWeights.semantic.toFixed(2)}, structural=${normalized.distanceWeights.structural.toFixed(2)}`);
    }
    
    return normalized;
  }

  /**
   * 階層クラスターをHDBSCANCluster形式に変換
   */
  private static convertToHDBSCANClusters(
    hierarchicalClusters: Array<any>, // HierarchicalClusterNode
    stabilityScores: any, // StabilityScores
    nodes: NetworkNode[],
    cards: BoardItem[]
  ): HDBSCANCluster[] {
    
    return hierarchicalClusters.map((cluster, index) => {
      const stability = stabilityScores[cluster.id];
      const centroidNode = this.calculateCentroid(cluster.nodeIds, nodes);
      const { dominantTags, dominantTypes } = this.calculateDominantFeatures(cluster.nodeIds, cards);
      
      return {
        id: cluster.id,
        nodeIds: cluster.nodeIds,
        
        // 階層情報
        stability: stability?.stability || 0,
        persistence: stability?.persistence || 0,
        birthLevel: stability?.birthLevel || 0,
        deathLevel: stability?.deathLevel || 0,
        
        // 従来互換性
        nodes: cluster.nodeIds,
        centroid: centroidNode,
        cohesion: this.calculateCohesion(cluster.nodeIds, nodes),
        separation: this.calculateSeparation(cluster.nodeIds, hierarchicalClusters, index, nodes),
        semanticTheme: this.generateSemanticTheme(cluster.nodeIds, cards),
        dominantTags,
        dominantTypes,
        confidence: Math.min(1.0, (stability?.stability || 0) * 2), // 安定性をconfidenceに変換
        suggestedLabel: this.generateClusterLabel(cluster.nodeIds, cards, dominantTags),
        alternativeLabels: this.generateAlternativeLabels(cluster.nodeIds, cards),
        reasoning: `HDBSCAN階層分析による自動クラスター (安定性: ${(stability?.stability || 0).toFixed(2)})`,
        
        // HDBSCAN固有
        membershipProbabilities: this.calculateMembershipProbabilities(cluster.nodeIds),
        isLeafCluster: cluster.children?.length === 0,
        children: cluster.children?.map((c: any) => c.id) || [],
        parent: cluster.parent?.id
      };
    });
  }

  /**
   * クラスターの重心計算
   */
  private static calculateCentroid(nodeIds: string[], nodes: NetworkNode[]): NetworkNode {
    const clusterNodes = nodes.filter(node => nodeIds.includes(node.id));
    
    if (clusterNodes.length === 0) {
      throw new Error('クラスターノードが見つかりません');
    }
    
    // 重心座標計算
    const avgX = clusterNodes.reduce((sum, node) => sum + node.x, 0) / clusterNodes.length;
    const avgY = clusterNodes.reduce((sum, node) => sum + node.y, 0) / clusterNodes.length;
    
    // 最も中心に近いノードを重心として選択
    let centroid = clusterNodes[0];
    let minDistance = Infinity;
    
    for (const node of clusterNodes) {
      const distance = Math.sqrt(Math.pow(node.x - avgX, 2) + Math.pow(node.y - avgY, 2));
      if (distance < minDistance) {
        minDistance = distance;
        centroid = node;
      }
    }
    
    return centroid;
  }

  /**
   * 支配的特徴の計算
   */
  private static calculateDominantFeatures(
    nodeIds: string[], 
    cards: BoardItem[]
  ): { dominantTags: string[]; dominantTypes: string[] } {
    
    const clusterCards = cards.filter(card => nodeIds.includes(card.id));
    
    // タグ頻度計算
    const tagCounts: { [tag: string]: number } = {};
    const typeCounts: { [type: string]: number } = {};
    
    clusterCards.forEach(card => {
      // タグ
      (card.tags || []).forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
      
      // タイプ
      const type = card.column_type;
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });
    
    // 上位タグ・タイプを選択
    const dominantTags = Object.entries(tagCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([tag]) => tag);
    
    const dominantTypes = Object.entries(typeCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 2)
      .map(([type]) => type);
    
    return { dominantTags, dominantTypes };
  }

  /**
   * クラスター内結合度計算
   */
  private static calculateCohesion(nodeIds: string[], nodes: NetworkNode[]): number {
    if (nodeIds.length <= 1) return 1.0;
    
    const clusterNodes = nodes.filter(node => nodeIds.includes(node.id));
    
    // 平均ペア距離の逆数
    let totalDistance = 0;
    let pairCount = 0;
    
    for (let i = 0; i < clusterNodes.length; i++) {
      for (let j = i + 1; j < clusterNodes.length; j++) {
        const distance = Math.sqrt(
          Math.pow(clusterNodes[i].x - clusterNodes[j].x, 2) + 
          Math.pow(clusterNodes[i].y - clusterNodes[j].y, 2)
        );
        totalDistance += distance;
        pairCount++;
      }
    }
    
    const avgDistance = pairCount > 0 ? totalDistance / pairCount : 0;
    return avgDistance > 0 ? 1 / (1 + avgDistance) : 1.0;
  }

  /**
   * クラスター間分離度計算
   */
  private static calculateSeparation(
    nodeIds: string[], 
    allClusters: any[], 
    currentIndex: number, 
    nodes: NetworkNode[]
  ): number {
    
    const currentNodes = nodes.filter(node => nodeIds.includes(node.id));
    let minSeparation = Infinity;
    
    for (let i = 0; i < allClusters.length; i++) {
      if (i === currentIndex) continue;
      
      const otherCluster = allClusters[i];
      const otherNodes = nodes.filter(node => otherCluster.nodeIds.includes(node.id));
      
      // 最近クラスター間距離
      for (const currentNode of currentNodes) {
        for (const otherNode of otherNodes) {
          const distance = Math.sqrt(
            Math.pow(currentNode.x - otherNode.x, 2) + 
            Math.pow(currentNode.y - otherNode.y, 2)
          );
          minSeparation = Math.min(minSeparation, distance);
        }
      }
    }
    
    return minSeparation === Infinity ? 1.0 : Math.min(1.0, minSeparation / 100);
  }

  /**
   * 意味的テーマ生成
   */
  private static generateSemanticTheme(nodeIds: string[], cards: BoardItem[]): string {
    const clusterCards = cards.filter(card => nodeIds.includes(card.id));
    
    if (clusterCards.length === 0) return '空クラスター';
    
    // タイプ別グループ化
    const typeGroups: { [type: string]: number } = {};
    clusterCards.forEach(card => {
      const type = card.column_type;
      typeGroups[type] = (typeGroups[type] || 0) + 1;
    });
    
    const dominantType = Object.entries(typeGroups)
      .sort(([,a], [,b]) => b - a)[0][0];
    
    // テーマ生成
    const typeLabels: { [key: string]: string } = {
      'INBOX': '収集・整理',
      'IDEAS': 'アイデア創出',
      'ACTIONS': '実行・行動',
      'DOING': '進行中作業',
      'DONE': '完了項目',
      'ISSUES': '課題・問題'
    };
    
    return typeLabels[dominantType] || '混合項目';
  }

  /**
   * 所属確率計算
   */
  private static calculateMembershipProbabilities(nodeIds: string[]): { [nodeId: string]: number } {
    const probabilities: { [nodeId: string]: number } = {};
    
    // 簡易実装: 全ノードが100%所属
    nodeIds.forEach(nodeId => {
      probabilities[nodeId] = 1.0;
    });
    
    return probabilities;
  }

  /**
   * クラスターラベル生成
   */
  private static generateClusterLabel(
    nodeIds: string[], 
    cards: BoardItem[], 
    dominantTags: string[]
  ): string {
    
    if (dominantTags.length > 0) {
      return dominantTags.slice(0, 2).join('・');
    }
    
    const clusterCards = cards.filter(card => nodeIds.includes(card.id));
    if (clusterCards.length > 0 && clusterCards[0].title) {
      return `${clusterCards[0].title.substring(0, 10)}...等`;
    }
    
    return `クラスター(${nodeIds.length}項目)`;
  }

  /**
   * 代替ラベル生成
   */
  private static generateAlternativeLabels(nodeIds: string[], cards: BoardItem[]): string[] {
    return [
      `${nodeIds.length}項目グループ`,
      '関連項目集合',
      '密度ベースクラスター'
    ];
  }
}
