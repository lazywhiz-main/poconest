/**
 * HDBSCAN固有の型定義
 */

import type { NetworkNode, NetworkEdge } from '../../../types/analysis';
import type { BoardItem } from '../../../features/board-space/contexts/BoardContext';

// ===========================================
// コアデータ構造
// ===========================================

export interface HDBSCANConfig {
  algorithm: 'hdbscan';
  
  // 主要パラメータ
  minClusterSize: number;           // 最小クラスターサイズ (3-6推奨)
  minSamples?: number;              // 最小サンプル数 (自動計算)
  
  // 距離計算重み
  distanceWeights: {
    graph: number;        // グラフ構造重み (0.5推奨)
    semantic: number;     // 意味的類似性重み (0.3推奨)  
    structural: number;   // 構造的類似性重み (0.2推奨)
  };
  
  // クラスター選択
  clusterSelectionMethod: 'eom' | 'leaf';  // Excess of Mass推奨
  clusterSelectionEpsilon?: number;        // 追加安定性閾値
  
  // 外れ値処理
  allowSingletons: boolean;         // 単独クラスター許可
  outlierAssignmentThreshold: number; // 外れ値配属閾値 (0.3推奨)
}

// Union-Find (素集合データ構造)
export interface UnionFind {
  parent: number[];
  rank: number[];
  find(x: number): number;
  union(x: number, y: number): void;
  connected(x: number, y: number): boolean;
}

// 最小全域木のエッジ
export interface MSTEdge {
  source: number;      // ソースノードインデックス
  target: number;      // ターゲットノードインデックス
  weight: number;      // エッジ重み（距離）
  sourceId: string;    // ソースノードID
  targetId: string;    // ターゲットノードID
}

// 最小全域木
export interface MST {
  edges: MSTEdge[];
  totalWeight: number;
  nodeCount: number;
}

// 階層クラスターノード
export interface HierarchicalClusterNode {
  id: string;
  nodeIds: string[];           // 含まれるノードID
  children: HierarchicalClusterNode[];
  parent?: HierarchicalClusterNode;
  birthLevel: number;          // クラスターが形成されるレベル
  deathLevel: number;          // クラスターが消失するレベル
  persistence: number;         // 持続性 = deathLevel - birthLevel
  stability: number;           // クラスター安定性
  isSelected: boolean;         // 最終選択されたクラスターか
}

// 階層クラスター木
export interface ClusterTree {
  root: HierarchicalClusterNode;
  leaves: HierarchicalClusterNode[];    // 葉ノード（実際のデータポイント）
  selectedClusters: HierarchicalClusterNode[];  // 選択されたクラスター
}

// クラスター安定性スコア
export interface StabilityScores {
  [clusterId: string]: {
    stability: number;
    persistence: number;
    birthLevel: number;
    deathLevel: number;
    nodeCount: number;
  };
}

// 外れ値スコア（GLOSH: Global-Local Outlier Score from Hierarchies）
export interface OutlierScores {
  [nodeId: string]: {
    score: number;        // 外れ値スコア (0-1, 高いほど外れ値)
    isOutlier: boolean;   // 外れ値判定
    nearestCluster?: string; // 最も近いクラスターID
    distanceToCluster?: number; // クラスターまでの距離
  };
}

// ===========================================
// HDBSCAN結果
// ===========================================

export interface HDBSCANCluster {
  id: string;
  nodeIds: string[];
  centroid: NetworkNode;
  stability: number;
  persistence: number;
  birthLevel: number;
  deathLevel: number;
  
  // 従来のSmartCluster互換性
  nodes: string[];              // nodeIdsのエイリアス
  cohesion: number;
  separation: number;
  semanticTheme: string;
  dominantTags: string[];
  dominantTypes: string[];
  confidence: number;
  suggestedLabel: string;
  alternativeLabels: string[];
  reasoning: string;
  
  // HDBSCAN固有情報
  membershipProbabilities?: { [nodeId: string]: number };
  isLeafCluster: boolean;       // 葉クラスターか
  children?: string[];          // 子クラスターID
  parent?: string;              // 親クラスターID
}

export interface HDBSCANResult {
  clusters: HDBSCANCluster[];
  outliers: string[];
  
  // 階層構造情報
  clusterTree: ClusterTree;
  stabilityScores: StabilityScores;
  outlierScores: OutlierScores;
  
  // 統計情報
  statistics: {
    totalNodes: number;
    clusteredNodes: number;
    outlierNodes: number;
    coverageRatio: number;       // カバー率
    averageStability: number;    // 平均安定性
    maxOutlierScore: number;     // 最大外れ値スコア
  };
  
  // メタデータ
  algorithm: 'hdbscan';
  config: HDBSCANConfig;
  processingTime: number;       // 処理時間 (ms)
  qualityMetrics: {
    silhouetteScore?: number;
    modularityScore?: number;
    intraClusterDistance: number;
    interClusterDistance: number;
  };
}

// ===========================================
// 距離計算
// ===========================================

export interface DistanceWeights {
  graph: number;
  semantic: number;
  structural: number;
}

export interface DistanceMetrics {
  graphDistance: number;
  semanticDistance: number;
  structuralDistance: number;
  combinedDistance: number;
}

export interface MutualReachabilityResult {
  distances: number[][];        // 相互到達可能距離行列
  coreDistances: number[];      // 各ノードのコア距離
  kDistances: number[][];       // k-距離行列
}

// ===========================================
// パフォーマンス・キャッシュ
// ===========================================

export interface HDBSCANCache {
  distanceMatrix?: number[][];
  mutualReachability?: MutualReachabilityResult;
  mst?: MST;
  nodeHash: string;
  configHash: string;
  timestamp: number;
}

export interface ProcessingMetrics {
  distanceCalculationTime: number;
  mutualReachabilityTime: number;
  mstConstructionTime: number;
  hierarchyExtractionTime: number;
  stabilityEvaluationTime: number;
  outlierProcessingTime: number;
  totalTime: number;
  memoryUsage: number;
  cacheHitRate: number;
}

// ===========================================
// デフォルト設定
// ===========================================

export const HDBSCAN_DEFAULTS: HDBSCANConfig = {
  algorithm: 'hdbscan',
  minClusterSize: 4,
  minSamples: undefined, // 自動計算: Math.max(2, minClusterSize - 1)
  distanceWeights: {
    graph: 0.5,      // グラフ接続を重視
    semantic: 0.3,   // 内容類似性
    structural: 0.2  // 構造類似性
  },
  clusterSelectionMethod: 'eom',
  clusterSelectionEpsilon: 0.0,
  allowSingletons: false,
  outlierAssignmentThreshold: 0.3
};

// パフォーマンス設定
export const HDBSCAN_PERFORMANCE = {
  MAX_CACHE_SIZE: 10,
  BATCH_SIZE_THRESHOLD: 200,     // この以上のノード数で段階的処理
  MEMORY_LIMIT_MB: 512,          // メモリ使用量上限
  PROCESSING_TIMEOUT_MS: 60000,  // 処理タイムアウト
  DISTANCE_PRECISION: 6          // 距離計算精度
};
