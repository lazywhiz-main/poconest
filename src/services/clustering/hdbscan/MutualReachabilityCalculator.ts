/**
 * 相互到達可能距離計算
 * HDBSCAN特有の密度推定による距離補正
 */

import type { NetworkNode } from '../../../types/analysis';
import type { MutualReachabilityResult } from '../types/hdbscan';

// ===========================================
// 相互到達可能距離計算
// ===========================================

export class MutualReachabilityCalculator {
  
  /**
   * 相互到達可能距離行列を計算
   * core_distance(a,b) = max(core_distance(a), core_distance(b), distance(a,b))
   */
  static calculateMutualReachability(
    nodes: NetworkNode[],
    distanceMatrix: number[][],
    minSamples: number
  ): MutualReachabilityResult {
    console.log(`🔄 相互到達可能距離計算開始: ${nodes.length}ノード, minSamples=${minSamples}`);
    
    const n = nodes.length;
    const actualMinSamples = Math.min(minSamples, n - 1);
    
    // 1. 各ノードのコア距離を計算
    const coreDistances = this.calculateCoreDistances(distanceMatrix, actualMinSamples);
    
    // 2. k-距離行列を構築（デバッグ・分析用）
    const kDistances = this.calculateKDistances(distanceMatrix, actualMinSamples);
    
    // 3. 相互到達可能距離行列を構築
    const mutualReachabilityMatrix = this.buildMutualReachabilityMatrix(
      distanceMatrix, 
      coreDistances
    );
    
    console.log(`✅ 相互到達可能距離計算完了`);
    console.log(`📊 コア距離統計: min=${Math.min(...coreDistances).toFixed(3)}, max=${Math.max(...coreDistances).toFixed(3)}, avg=${(coreDistances.reduce((a,b)=>a+b,0)/n).toFixed(3)}`);
    
    return {
      distances: mutualReachabilityMatrix,
      coreDistances,
      kDistances
    };
  }

  /**
   * 各ノードのコア距離を計算
   * core_distance(x) = k番目に近い隣接ノードまでの距離
   */
  private static calculateCoreDistances(
    distanceMatrix: number[][],
    minSamples: number
  ): number[] {
    const n = distanceMatrix.length;
    const coreDistances: number[] = new Array(n);
    
    for (let i = 0; i < n; i++) {
      // i番目のノードから全ての他ノードへの距離を取得
      const distances = distanceMatrix[i]
        .map((dist, idx) => ({ distance: dist, index: idx }))
        .filter(item => item.index !== i) // 自分自身を除外
        .sort((a, b) => a.distance - b.distance); // 距離でソート
      
      // k番目（minSamples番目）の距離をコア距離とする
      if (distances.length >= minSamples) {
        coreDistances[i] = distances[minSamples - 1].distance;
      } else {
        // ノード数がminSamplesより少ない場合は最大距離
        coreDistances[i] = distances.length > 0 ? 
          distances[distances.length - 1].distance : 
          Infinity;
      }
    }
    
    return coreDistances;
  }

  /**
   * k-距離行列を計算（分析・デバッグ用）
   */
  private static calculateKDistances(
    distanceMatrix: number[][],
    minSamples: number
  ): number[][] {
    const n = distanceMatrix.length;
    const kDistances: number[][] = Array(n).fill(null).map(() => Array(minSamples).fill(0));
    
    for (let i = 0; i < n; i++) {
      const distances = distanceMatrix[i]
        .map((dist, idx) => ({ distance: dist, index: idx }))
        .filter(item => item.index !== i)
        .sort((a, b) => a.distance - b.distance);
      
      for (let k = 0; k < Math.min(minSamples, distances.length); k++) {
        kDistances[i][k] = distances[k].distance;
      }
    }
    
    return kDistances;
  }

  /**
   * 相互到達可能距離行列を構築
   */
  private static buildMutualReachabilityMatrix(
    distanceMatrix: number[][],
    coreDistances: number[]
  ): number[][] {
    const n = distanceMatrix.length;
    const mutualMatrix: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));
    
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        // 相互到達可能距離 = max(core_distance(i), core_distance(j), distance(i,j))
        const mutualDistance = Math.max(
          coreDistances[i],
          coreDistances[j],
          distanceMatrix[i][j]
        );
        
        mutualMatrix[i][j] = mutualDistance;
        mutualMatrix[j][i] = mutualDistance; // 対称行列
      }
    }
    
    return mutualMatrix;
  }

  /**
   * 密度推定の品質評価
   */
  static evaluateDensityQuality(
    result: MutualReachabilityResult,
    nodes: NetworkNode[]
  ): {
    densityVariance: number;
    outlierRatio: number;
    separationIndex: number;
    qualityScore: number;
  } {
    const { coreDistances, distances } = result;
    const n = nodes.length;
    
    // 1. 密度の分散（小さい方が良い）
    const avgCoreDistance = coreDistances.reduce((sum, dist) => sum + dist, 0) / n;
    const densityVariance = coreDistances.reduce(
      (sum, dist) => sum + Math.pow(dist - avgCoreDistance, 2), 
      0
    ) / n;
    
    // 2. 外れ値比率の推定（コア距離が平均+2σを超えるノード）
    const threshold = avgCoreDistance + 2 * Math.sqrt(densityVariance);
    const outliers = coreDistances.filter(dist => dist > threshold).length;
    const outlierRatio = outliers / n;
    
    // 3. 分離度指標（相互到達可能距離 vs 元の距離の比）
    let totalOriginal = 0;
    let totalMutual = 0;
    let pairCount = 0;
    
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        totalOriginal += distances[i][j];
        totalMutual += distances[i][j]; // 既にmutual reachability
        pairCount++;
      }
    }
    
    const separationIndex = pairCount > 0 ? totalMutual / totalOriginal : 1;
    
    // 4. 総合品質スコア（0-1, 高い方が良い）
    const qualityScore = Math.max(0, Math.min(1, 
      (1 - densityVariance) * 0.4 +
      (1 - outlierRatio) * 0.3 +
      (separationIndex > 1 ? Math.min(separationIndex / 2, 1) : 0) * 0.3
    ));
    
    return {
      densityVariance,
      outlierRatio,
      separationIndex,
      qualityScore
    };
  }

  /**
   * 適応的minSamples推定
   * データの特性に基づいて最適なminSamplesを提案
   */
  static estimateOptimalMinSamples(
    nodes: NetworkNode[],
    distanceMatrix: number[][],
    minClusterSize: number
  ): {
    recommended: number;
    analysis: {
      datasetSize: number;
      dimensionality: number;
      sparsity: number;
      recommendation: string;
    };
  } {
    const n = nodes.length;
    
    // 1. データセットサイズベース
    const sizeBasedMinSamples = Math.max(2, Math.min(minClusterSize - 1, Math.floor(n / 20)));
    
    // 2. 疎密度ベース（エッジ密度から推定）
    let connectionCount = 0;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        if (distanceMatrix[i][j] < 0.5) { // 強い接続と見なす閾値
          connectionCount++;
        }
      }
    }
    const sparsity = 1 - (2 * connectionCount) / (n * (n - 1));
    const sparsityBasedMinSamples = sparsity > 0.8 ? 2 : sparsity > 0.5 ? 3 : 4;
    
    // 3. 次元数推定（ノード属性の多様性から）
    const dimensionality = this.estimateDimensionality(nodes);
    const dimensionalityBasedMinSamples = Math.max(2, Math.min(6, Math.ceil(Math.log2(dimensionality))));
    
    // 4. 統合推定
    const candidates = [sizeBasedMinSamples, sparsityBasedMinSamples, dimensionalityBasedMinSamples];
    const recommended = Math.round(candidates.reduce((sum, val) => sum + val, 0) / candidates.length);
    
    // 5. 推奨理由の生成
    let recommendation = '';
    if (sparsity > 0.8) {
      recommendation = '疎なネットワークのため小さなminSamplesを推奨';
    } else if (n < 50) {
      recommendation = '小規模データセットのため控えめなminSamplesを推奨';
    } else if (dimensionality > 10) {
      recommendation = '高次元データのためやや大きなminSamplesを推奨';
    } else {
      recommendation = 'バランスの取れたminSamplesを推奨';
    }
    
    return {
      recommended: Math.max(2, Math.min(recommended, minClusterSize - 1)),
      analysis: {
        datasetSize: n,
        dimensionality,
        sparsity,
        recommendation
      }
    };
  }

  /**
   * ノード属性から次元数を推定
   */
  private static estimateDimensionality(nodes: NetworkNode[]): number {
    if (nodes.length === 0) return 1;
    
    const sample = nodes[0];
    let dimensions = 2; // x, y座標
    
    // 属性の多様性をチェック
    if (sample.tags && sample.tags.length > 0) dimensions += 3; // タグ次元
    if (sample.type) dimensions += 1; // タイプ次元
    if (sample.content && sample.content.length > 0) dimensions += 2; // 内容次元
    if (sample.metadata) dimensions += Object.keys(sample.metadata).length; // メタデータ次元
    
    return dimensions;
  }

  /**
   * 相互到達可能距離の可視化データ生成
   */
  static generateVisualizationData(
    result: MutualReachabilityResult,
    nodes: NetworkNode[]
  ): {
    coreDistanceHistogram: { range: string; count: number }[];
    densityMap: { nodeId: string; density: number; rank: number }[];
    distanceComparison: { original: number; mutual: number; ratio: number }[];
  } {
    const { coreDistances, distances } = result;
    const n = nodes.length;
    
    // 1. コア距離ヒストグラム
    const bins = 10;
    const minDist = Math.min(...coreDistances);
    const maxDist = Math.max(...coreDistances);
    const binSize = (maxDist - minDist) / bins;
    
    const histogram = Array(bins).fill(0).map((_, i) => ({
      range: `${(minDist + i * binSize).toFixed(2)}-${(minDist + (i + 1) * binSize).toFixed(2)}`,
      count: 0
    }));
    
    coreDistances.forEach(dist => {
      const binIndex = Math.min(bins - 1, Math.floor((dist - minDist) / binSize));
      histogram[binIndex].count++;
    });
    
    // 2. 密度マップ（密度=1/コア距離）
    const densityMap = nodes.map((node, i) => ({
      nodeId: node.id,
      density: coreDistances[i] > 0 ? 1 / coreDistances[i] : Infinity,
      rank: 0
    }))
    .sort((a, b) => b.density - a.density)
    .map((item, rank) => ({ ...item, rank: rank + 1 }));
    
    // 3. 距離比較（サンプリング）
    const sampleSize = Math.min(100, (n * (n - 1)) / 2);
    const distanceComparison: { original: number; mutual: number; ratio: number }[] = [];
    
    for (let i = 0; i < n && distanceComparison.length < sampleSize; i++) {
      for (let j = i + 1; j < n && distanceComparison.length < sampleSize; j++) {
        const original = distances[i][j]; // 既にmutual reachability
        const mutual = distances[i][j];
        distanceComparison.push({
          original,
          mutual,
          ratio: original > 0 ? mutual / original : 1
        });
      }
    }
    
    return {
      coreDistanceHistogram: histogram,
      densityMap,
      distanceComparison
    };
  }
}
