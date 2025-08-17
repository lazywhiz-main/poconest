/**
 * HDBSCANプロバイダー
 * 既存システムとの統合と互換性を提供
 */

import type { NetworkNode, NetworkEdge } from '../../../types/analysis';
import type { BoardItem } from '../../../features/board-space/contexts/BoardContext';
import type { ClusteringConfig, ClusteringResult, SmartCluster } from '../SmartClusteringService';
import type { HDBSCANConfig, HDBSCANResult } from '../types/hdbscan';

import { HDBSCANClusterer } from './HDBSCANClusterer';

// ===========================================
// HDBSCANプロバイダー
// ===========================================

export class HDBSCANProvider {

  /**
   * 既存のClusteringConfigからHDBSCANConfigへの変換
   */
  static convertToHDBSCANConfig(config: ClusteringConfig): HDBSCANConfig {
    return {
      minClusterSize: config.minClusterSize,
      maxClusterSize: config.maxClusterSize,
      minSamples: config.minPts || Math.max(2, config.minClusterSize - 1),
      
      distanceWeights: {
        graph: 0.35,       // 🔧 Relations重み強化（20% → 35%）
        semantic: 0.50,    // 🔧 内容とRelationsのバランス（75% → 50%） 
        structural: 0.15   // 🔧 構造情報活用拡大（5% → 15%）
      },
      
      clusterSelectionEpsilon: 0.0,
      outlierAssignmentThreshold: 0.5, // より積極的にクラスターに割り当て（外れ値を減らす）
      
      algorithm: 'hdbscan' as const,
      
      // 詳細設定
      distanceMetric: 'combined',
      enableHierarchyOptimization: true,
      useAdaptiveMinSamples: true,
      
      // 性能設定
      enableCaching: true,
      enableParallelProcessing: false, // Phase 4で実装予定
      
      // デバッグ設定
      verboseLogging: config.debug || false
    };
  }

  /**
   * HDBSCANResultを既存のClusteringResultに変換
   */
  static convertToClusteringResult(
    hdbscanResult: HDBSCANResult,
    originalNodes: NetworkNode[],
    originalEdges: NetworkEdge[],
    originalCards: BoardItem[]
  ): ClusteringResult {
    
    // HDBSCANClusterをSmartClusterに変換
    const smartClusters: SmartCluster[] = hdbscanResult.clusters.map(cluster => ({
      id: cluster.id,
      nodes: cluster.nodeIds,
      centroid: cluster.centroid,
      
      // 品質指標
      cohesion: cluster.cohesion,
      separation: cluster.separation,
      semanticTheme: cluster.semanticTheme,
      
      // ラベリング
      dominantTags: cluster.dominantTags,
      dominantTypes: cluster.dominantTypes,
      confidence: cluster.confidence,
      suggestedLabel: cluster.suggestedLabel,
      alternativeLabels: cluster.alternativeLabels,
      reasoning: cluster.reasoning,
      
      // HDBSCAN固有情報を付加属性として保持
      membershipStrength: cluster.membershipProbabilities,
      overlappingNodes: [], // HDBSCANでは基本的に重複なし
      
      // 拡張情報
      metadata: {
        algorithm: 'hdbscan',
        stability: cluster.stability,
        persistence: cluster.persistence,
        birthLevel: cluster.birthLevel,
        deathLevel: cluster.deathLevel,
        isLeafCluster: cluster.isLeafCluster,
        hierarchyDepth: cluster.children?.length || 0
      }
    }));

    // ノード-クラスターマッピング
    const nodeMemberships: { [nodeId: string]: any } = {};
    hdbscanResult.clusters.forEach(cluster => {
      cluster.nodeIds.forEach(nodeId => {
        nodeMemberships[nodeId] = {
          clusterId: cluster.id,
          membershipStrength: cluster.membershipProbabilities?.[nodeId] || 1.0,
          confidence: cluster.confidence,
          isCore: true, // HDBSCANでは階層的にコアを判定
          stabilityScore: cluster.stability
        };
      });
    });

    // カバレッジ統計
    const totalNodes = originalNodes.length;
    const clusteredNodes = hdbscanResult.statistics.clusteredNodes;
    const outlierNodes = hdbscanResult.statistics.outlierNodes;
    
    const coverageStats = {
      totalNodes,
      clusteredNodes,
      outlierNodes,
      coverageRatio: hdbscanResult.statistics.coverageRatio,
      
      // 詳細統計
      clusterCount: smartClusters.length,
      averageClusterSize: clusteredNodes / Math.max(1, smartClusters.length),
      largestClusterSize: Math.max(...smartClusters.map(c => c.nodes.length), 0),
      smallestClusterSize: Math.min(...smartClusters.map(c => c.nodes.length), 0),
      
      // 品質指標
      averageStability: hdbscanResult.statistics.averageStability,
      overallQuality: hdbscanResult.qualityMetrics?.silhouetteScore || 0,
      
      // アルゴリズム情報
      algorithmUsed: 'hdbscan',
      processingTimeMs: hdbscanResult.processingTime
    };

    return {
      clusters: smartClusters,
      outliers: hdbscanResult.outliers,
      nodeMemberships,
      coverageStats,
      
      // 拡張情報
      hierarchyInfo: {
        clusterTree: hdbscanResult.clusterTree,
        stabilityScores: hdbscanResult.stabilityScores,
        outlierScores: hdbscanResult.outlierScores
      },
      
      qualityMetrics: {
        silhouette: hdbscanResult.qualityMetrics?.silhouetteScore || 0,
        modularity: hdbscanResult.qualityMetrics?.modularityScore || 0,
        stability: hdbscanResult.statistics.averageStability
      },
      
      // 既存システム互換性のためのquality
      quality: {
        silhouetteScore: hdbscanResult.qualityMetrics?.silhouetteScore || 0,
        modularityScore: hdbscanResult.qualityMetrics?.modularityScore || 0,
        stabilityScore: hdbscanResult.statistics.averageStability,
        overallScore: hdbscanResult.statistics.averageStability // 安定性を総合スコアとして使用
      }
    };
  }

  /**
   * メインのクラスタリング実行（既存システム互換）
   */
  static async performClustering(
    nodes: NetworkNode[],
    edges: NetworkEdge[],
    cards: BoardItem[],
    config: ClusteringConfig
  ): Promise<ClusteringResult> {
    
    console.log(`🎯 HDBSCANプロバイダー実行開始: ${nodes.length}ノード`);
    
    try {
      // 1. 設定変換
      const hdbscanConfig = this.convertToHDBSCANConfig(config);
      
      console.log(`⚙️ HDBSCAN設定: minClusterSize=${hdbscanConfig.minClusterSize}, minSamples=${hdbscanConfig.minSamples}`);
      
      // 2. HDBSCAN実行
      const hdbscanResult = await HDBSCANClusterer.performClustering(
        nodes, 
        edges, 
        cards, 
        hdbscanConfig
      );
      
      // 3. 結果変換
      const clusteringResult = this.convertToClusteringResult(
        hdbscanResult, 
        nodes, 
        edges, 
        cards
      );
      
      console.log(`✅ HDBSCANプロバイダー完了: ${clusteringResult.clusters.length}クラスター, カバー率${(clusteringResult.coverageStats.coverageRatio * 100).toFixed(1)}%`);
      
      return clusteringResult;
      
    } catch (error) {
      console.error('❌ HDBSCANプロバイダーエラー:', error);
      
      // フォールバック用の空結果を返す
      return {
        clusters: [],
        outliers: nodes.map(n => n.id),
        nodeMemberships: {},
        coverageStats: {
          totalNodes: nodes.length,
          clusteredNodes: 0,
          outlierNodes: nodes.length,
          coverageRatio: 0,
          clusterCount: 0,
          averageClusterSize: 0,
          largestClusterSize: 0,
          smallestClusterSize: 0,
          averageStability: 0,
          overallQuality: 0,
          algorithmUsed: 'hdbscan',
          processingTimeMs: 0
        }
      };
    }
  }

  /**
   * HDBSCANの詳細結果取得（拡張機能）
   */
  static async performDetailedClustering(
    nodes: NetworkNode[],
    edges: NetworkEdge[],
    cards: BoardItem[],
    config: HDBSCANConfig
  ): Promise<HDBSCANResult> {
    return await HDBSCANClusterer.performClustering(nodes, edges, cards, config);
  }

  /**
   * パフォーマンス分析
   */
  static analyzePerformance(
    nodes: NetworkNode[],
    edges: NetworkEdge[],
    config: ClusteringConfig
  ): {
    estimatedTime: number;
    memoryUsage: number;
    complexity: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
    recommendation: string;
  } {
    
    const nodeCount = nodes.length;
    const edgeCount = edges.length;
    
    // 時間複雑度推定: O(n log n) for MST + O(n²) for distance matrix
    const estimatedTime = nodeCount < 100 ? 
      nodeCount * Math.log(nodeCount) * 10 : // 小規模: 100ms程度
      nodeCount < 500 ? 
      nodeCount * nodeCount * 0.001 : // 中規模: 250ms程度
      nodeCount * nodeCount * 0.002; // 大規模: 500ms以上
    
    // メモリ使用量推定: 距離行列 + 階層構造
    const memoryUsage = (nodeCount * nodeCount * 8) + (nodeCount * 100); // bytes
    
    // 複雑度判定
    let complexity: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
    if (nodeCount < 50) {
      complexity = 'LOW';
    } else if (nodeCount < 200) {
      complexity = 'MEDIUM';
    } else if (nodeCount < 1000) {
      complexity = 'HIGH';
    } else {
      complexity = 'EXTREME';
    }
    
    // 推奨事項
    let recommendation = '';
    switch (complexity) {
      case 'LOW':
        recommendation = 'すべての機能を有効にして実行可能';
        break;
      case 'MEDIUM':
        recommendation = 'デフォルト設定で良好なパフォーマンス';
        break;
      case 'HIGH':
        recommendation = 'minClusterSizeを大きくして最適化を推奨';
        break;
      case 'EXTREME':
        recommendation = 'サンプリングまたは事前フィルタリングを推奨';
        break;
    }
    
    return {
      estimatedTime,
      memoryUsage,
      complexity,
      recommendation
    };
  }

  /**
   * 設定最適化の提案
   */
  static suggestOptimalConfig(
    nodes: NetworkNode[],
    edges: NetworkEdge[],
    cards: BoardItem[],
    userPreferences?: {
      prioritizeSpeed?: boolean;
      prioritizeAccuracy?: boolean;
      expectedClusterCount?: number;
    }
  ): HDBSCANConfig {
    
    const nodeCount = nodes.length;
    const edgeCount = edges.length;
    
    // 基本設定
    let minClusterSize = Math.max(2, Math.min(8, Math.floor(nodeCount / 10)));
    
    // ユーザー設定に基づく調整
    if (userPreferences?.prioritizeSpeed) {
      minClusterSize = Math.min(minClusterSize * 1.5, 10);
    } else if (userPreferences?.prioritizeAccuracy) {
      minClusterSize = Math.max(minClusterSize * 0.8, 2);
    }
    
    if (userPreferences?.expectedClusterCount) {
      // 期待クラスター数から逆算
      const expectedSize = Math.floor(nodeCount / userPreferences.expectedClusterCount);
      minClusterSize = Math.max(2, Math.min(expectedSize, minClusterSize));
    }
    
    // エッジ密度に基づく距離重み調整
    const edgeDensity = (2 * edgeCount) / (nodeCount * (nodeCount - 1));
    const graphWeight = edgeDensity > 0.1 ? 0.6 : 0.4; // 密なグラフならグラフ重視
    const semanticWeight = 0.5 - graphWeight * 0.5;
    const structuralWeight = 1.0 - graphWeight - semanticWeight;
    
    return {
      minClusterSize,
      minSamples: Math.max(2, minClusterSize - 1),
      
      distanceWeights: {
        graph: graphWeight,
        semantic: semanticWeight,
        structural: structuralWeight
      },
      
      clusterSelectionEpsilon: userPreferences?.prioritizeAccuracy ? 0.1 : 0.0,
      outlierAssignmentThreshold: 0.3,
      
      algorithm: 'hdbscan',
      distanceMetric: 'combined',
      enableHierarchyOptimization: true,
      useAdaptiveMinSamples: true,
      
      enableCaching: true,
      enableParallelProcessing: nodeCount > 200,
      
      verboseLogging: false
    };
  }

  /**
   * 結果比較（DBSCAN vs HDBSCAN）
   */
  static async compareWithDBSCAN(
    nodes: NetworkNode[],
    edges: NetworkEdge[],
    cards: BoardItem[],
    config: ClusteringConfig,
    dbscanResult: ClusteringResult
  ): Promise<{
    hdbscanResult: ClusteringResult;
    comparison: {
      coverageImprovement: number;
      clusterCountChange: number;
      qualityImprovement: number;
      processingTimeRatio: number;
      recommendation: 'HDBSCAN' | 'DBSCAN' | 'EQUIVALENT';
    };
  }> {
    
    // HDBSCAN実行
    const hdbscanResult = await this.performClustering(nodes, edges, cards, config);
    
    // 比較指標計算
    const coverageImprovement = hdbscanResult.coverageStats.coverageRatio - 
                               dbscanResult.coverageStats.coverageRatio;
    
    const clusterCountChange = hdbscanResult.coverageStats.clusterCount - 
                              dbscanResult.coverageStats.clusterCount;
    
    const qualityImprovement = (hdbscanResult.coverageStats.overallQuality || 0) - 
                              (dbscanResult.coverageStats.overallQuality || 0);
    
    const processingTimeRatio = (hdbscanResult.coverageStats.processingTimeMs || 1) / 
                               Math.max(1, dbscanResult.coverageStats.processingTimeMs || 1);
    
    // 推奨判定
    let recommendation: 'HDBSCAN' | 'DBSCAN' | 'EQUIVALENT';
    
    if (coverageImprovement > 0.1 || qualityImprovement > 0.1) {
      recommendation = 'HDBSCAN';
    } else if (coverageImprovement < -0.05 || processingTimeRatio > 3) {
      recommendation = 'DBSCAN';
    } else {
      recommendation = 'EQUIVALENT';
    }
    
    return {
      hdbscanResult,
      comparison: {
        coverageImprovement,
        clusterCountChange,
        qualityImprovement,
        processingTimeRatio,
        recommendation
      }
    };
  }
}
