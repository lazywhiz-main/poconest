/**
 * HDBSCAN コアデータ構造とアルゴリズム
 * Union-Find、最小全域木、階層構造の実装
 */

import type { 
  UnionFind, 
  MST, 
  MSTEdge, 
  ClusterTree, 
  HierarchicalClusterNode,
  StabilityScores 
} from '../types/hdbscan';

// ===========================================
// Union-Find (素集合データ構造)
// ===========================================

export class UnionFindImpl implements UnionFind {
  public parent: number[];
  public rank: number[];

  constructor(size: number) {
    this.parent = Array.from({ length: size }, (_, i) => i);
    this.rank = new Array(size).fill(0);
  }

  /**
   * 要素xの根を見つける（経路圧縮あり）
   */
  find(x: number): number {
    if (this.parent[x] !== x) {
      this.parent[x] = this.find(this.parent[x]); // 経路圧縮
    }
    return this.parent[x];
  }

  /**
   * 二つの集合を統合（ランクによる最適化）
   */
  union(x: number, y: number): void {
    const rootX = this.find(x);
    const rootY = this.find(y);

    if (rootX === rootY) return;

    // ランクが小さい方を大きい方の子にする
    if (this.rank[rootX] < this.rank[rootY]) {
      this.parent[rootX] = rootY;
    } else if (this.rank[rootX] > this.rank[rootY]) {
      this.parent[rootY] = rootX;
    } else {
      this.parent[rootY] = rootX;
      this.rank[rootX]++;
    }
  }

  /**
   * 二つの要素が同じ集合に属するかチェック
   */
  connected(x: number, y: number): boolean {
    return this.find(x) === this.find(y);
  }

  /**
   * 全ての集合の代表元を取得
   */
  getComponents(): number[][] {
    const components: { [root: number]: number[] } = {};
    
    for (let i = 0; i < this.parent.length; i++) {
      const root = this.find(i);
      if (!components[root]) {
        components[root] = [];
      }
      components[root].push(i);
    }
    
    return Object.values(components);
  }
}

// ===========================================
// 最小全域木 (Minimum Spanning Tree)
// ===========================================

export class MSTBuilder {
  /**
   * Kruskalのアルゴリズムで最小全域木を構築
   */
  static buildMST(
    nodeCount: number,
    nodeIds: string[],
    distanceMatrix: number[][]
  ): MST {
    console.log(`🌳 MST構築開始: ${nodeCount}ノード`);
    
    // 全エッジを生成
    const edges: MSTEdge[] = [];
    for (let i = 0; i < nodeCount; i++) {
      for (let j = i + 1; j < nodeCount; j++) {
        edges.push({
          source: i,
          target: j,
          weight: distanceMatrix[i][j],
          sourceId: nodeIds[i],
          targetId: nodeIds[j]
        });
      }
    }

    // エッジを重みでソート
    edges.sort((a, b) => a.weight - b.weight);
    
    // Kruskalのアルゴリズム
    const unionFind = new UnionFindImpl(nodeCount);
    const mstEdges: MSTEdge[] = [];
    let totalWeight = 0;

    for (const edge of edges) {
      if (!unionFind.connected(edge.source, edge.target)) {
        unionFind.union(edge.source, edge.target);
        mstEdges.push(edge);
        totalWeight += edge.weight;
        
        // MST完成チェック（n-1 エッジ）
        if (mstEdges.length === nodeCount - 1) {
          break;
        }
      }
    }

    console.log(`✅ MST構築完了: ${mstEdges.length}エッジ, 総重み: ${totalWeight.toFixed(3)}`);

    return {
      edges: mstEdges,
      totalWeight,
      nodeCount
    };
  }

  /**
   * MSTを隣接リスト形式に変換
   */
  static toAdjacencyList(mst: MST): Map<number, Array<{ neighbor: number; weight: number }>> {
    const adjacencyList = new Map<number, Array<{ neighbor: number; weight: number }>>();
    
    // 初期化
    for (let i = 0; i < mst.nodeCount; i++) {
      adjacencyList.set(i, []);
    }
    
    // エッジを追加
    for (const edge of mst.edges) {
      adjacencyList.get(edge.source)!.push({ neighbor: edge.target, weight: edge.weight });
      adjacencyList.get(edge.target)!.push({ neighbor: edge.source, weight: edge.weight });
    }
    
    return adjacencyList;
  }
}

// ===========================================
// 階層的クラスター抽出
// ===========================================

export class HierarchyExtractor {
  /**
   * MSTから階層的クラスター構造を抽出
   */
  static extractHierarchy(
    mst: MST,
    nodeIds: string[],
    minClusterSize: number
  ): ClusterTree {
    console.log(`🏗️ 階層構造抽出開始: minClusterSize=${minClusterSize}`);
    
    // エッジを重みの降順でソート（大きい重みから切断）
    const sortedEdges = [...mst.edges].sort((a, b) => b.weight - a.weight);
    
    // 葉ノード（実際のデータポイント）を作成
    const leaves: HierarchicalClusterNode[] = nodeIds.map((nodeId, index) => ({
      id: `leaf-${nodeId}`,
      nodeIds: [nodeId],
      children: [],
      birthLevel: 0,
      deathLevel: Infinity,
      persistence: Infinity,
      stability: 0,
      isSelected: false
    }));

    // Union-Findで連結成分を管理
    const unionFind = new UnionFindImpl(nodeIds.length);
    const clusters: HierarchicalClusterNode[] = [...leaves];
    const nodeToCluster = new Map<string, HierarchicalClusterNode>();
    
    // 初期設定
    leaves.forEach(leaf => {
      nodeToCluster.set(leaf.nodeIds[0], leaf);
    });

    // エッジを順次処理（階層的にクラスターを形成）
    for (let level = 0; level < sortedEdges.length; level++) {
      const edge = sortedEdges[level];
      const threshold = edge.weight;
      
      const sourceRoot = unionFind.find(edge.source);
      const targetRoot = unionFind.find(edge.target);
      
      if (sourceRoot !== targetRoot) {
        // 新しいクラスターを作成
        unionFind.union(edge.source, edge.target);
        
        const sourceCluster = this.findClusterByNodeIndex(clusters, sourceRoot, nodeIds);
        const targetCluster = this.findClusterByNodeIndex(clusters, targetRoot, nodeIds);
        
        if (sourceCluster && targetCluster) {
          const mergedCluster: HierarchicalClusterNode = {
            id: `cluster-${level}-${Date.now()}`,
            nodeIds: [...sourceCluster.nodeIds, ...targetCluster.nodeIds],
            children: [sourceCluster, targetCluster],
            birthLevel: threshold,
            deathLevel: Infinity,
            persistence: 0,
            stability: 0,
            isSelected: false
          };
          
          // 親子関係設定
          sourceCluster.parent = mergedCluster;
          targetCluster.parent = mergedCluster;
          sourceCluster.deathLevel = threshold;
          targetCluster.deathLevel = threshold;
          
          clusters.push(mergedCluster);
          
          // ノードマッピング更新
          mergedCluster.nodeIds.forEach(nodeId => {
            nodeToCluster.set(nodeId, mergedCluster);
          });
        }
      }
    }

    // ルートノードを見つける
    const root = clusters.find(c => !c.parent) || clusters[clusters.length - 1];
    if (root) {
      root.deathLevel = Math.max(...sortedEdges.map(e => e.weight)) + 1;
    }

    // 持続性を計算
    this.calculatePersistence(clusters);
    
    console.log(`✅ 階層構造抽出完了: ${clusters.length}クラスター`);

    return {
      root: root!,
      leaves,
      selectedClusters: [] // 後で選択アルゴリズムで決定
    };
  }

  /**
   * ノードインデックスからクラスターを見つける
   */
  private static findClusterByNodeIndex(
    clusters: HierarchicalClusterNode[],
    nodeIndex: number,
    nodeIds: string[]
  ): HierarchicalClusterNode | undefined {
    const nodeId = nodeIds[nodeIndex];
    return clusters.find(cluster => 
      cluster.nodeIds.includes(nodeId) && !cluster.parent
    );
  }

  /**
   * 各クラスターの持続性を計算
   */
  private static calculatePersistence(clusters: HierarchicalClusterNode[]): void {
    for (const cluster of clusters) {
      if (cluster.deathLevel !== Infinity) {
        cluster.persistence = cluster.deathLevel - cluster.birthLevel;
      } else {
        cluster.persistence = Infinity;
      }
    }
  }
}

// ===========================================
// クラスター安定性評価
// ===========================================

export class StabilityEvaluator {
  /**
   * 各クラスターの安定性を評価
   */
  static evaluateStability(
    tree: ClusterTree,
    minClusterSize: number
  ): StabilityScores {
    console.log(`📊 安定性評価開始: minClusterSize=${minClusterSize}`);
    
    const stabilityScores: StabilityScores = {};
    
    // 全てのクラスターについて安定性を計算
    this.calculateStabilityRecursive(tree.root, stabilityScores, minClusterSize);
    
    console.log(`✅ 安定性評価完了: ${Object.keys(stabilityScores).length}クラスター`);
    
    return stabilityScores;
  }

  /**
   * 再帰的に安定性を計算
   */
  private static calculateStabilityRecursive(
    node: HierarchicalClusterNode,
    scores: StabilityScores,
    minClusterSize: number
  ): number {
    // 葉ノードの場合
    if (node.children.length === 0) {
      const stability = node.persistence !== Infinity ? node.persistence : 0;
      node.stability = stability;
      
      scores[node.id] = {
        stability,
        persistence: node.persistence,
        birthLevel: node.birthLevel,
        deathLevel: node.deathLevel,
        nodeCount: node.nodeIds.length
      };
      
      return stability;
    }

    // 子ノードの安定性を再帰計算
    let childStabilitySum = 0;
    for (const child of node.children) {
      childStabilitySum += this.calculateStabilityRecursive(child, scores, minClusterSize);
    }

    // 自身の安定性計算
    let ownStability = 0;
    if (node.nodeIds.length >= minClusterSize && node.persistence !== Infinity) {
      ownStability = node.nodeIds.length * node.persistence;
    }

    // より安定な方を選択
    const totalStability = Math.max(ownStability, childStabilitySum);
    node.stability = totalStability;
    
    scores[node.id] = {
      stability: totalStability,
      persistence: node.persistence,
      birthLevel: node.birthLevel,
      deathLevel: node.deathLevel,
      nodeCount: node.nodeIds.length
    };

    return totalStability;
  }

  /**
   * Excess of Mass (EoM) 基準でクラスターを選択
   */
  static selectOptimalClusters(
    tree: ClusterTree,
    stabilityScores: StabilityScores,
    minClusterSize: number
  ): HierarchicalClusterNode[] {
    console.log(`🎯 最適クラスター選択開始`);
    
    const selectedClusters: HierarchicalClusterNode[] = [];
    
    // ルートから開始してEoM基準で選択
    this.selectClustersRecursive(tree.root, selectedClusters, stabilityScores, minClusterSize);
    
    // 選択されたクラスターをマーク
    for (const cluster of selectedClusters) {
      cluster.isSelected = true;
    }

    console.log(`✅ 最適クラスター選択完了: ${selectedClusters.length}クラスター選択`);
    
    tree.selectedClusters = selectedClusters;
    return selectedClusters;
  }

  /**
   * 再帰的にクラスターを選択（EoM基準）
   */
  private static selectClustersRecursive(
    node: HierarchicalClusterNode,
    selected: HierarchicalClusterNode[],
    scores: StabilityScores,
    minClusterSize: number
  ): void {
    const nodeScore = scores[node.id];
    
    // 最小サイズ未満は選択しない
    if (node.nodeIds.length < minClusterSize) {
      return;
    }

    // 葉ノードの場合、選択
    if (node.children.length === 0) {
      selected.push(node);
      return;
    }

    // 子ノードの安定性合計
    let childStabilitySum = 0;
    for (const child of node.children) {
      const childScore = scores[child.id];
      if (childScore && child.nodeIds.length >= minClusterSize) {
        childStabilitySum += childScore.stability;
      }
    }

    // 自身の安定性 vs 子ノード安定性
    if (nodeScore.stability >= childStabilitySum) {
      // 自身を選択
      selected.push(node);
    } else {
      // 子ノードを再帰選択
      for (const child of node.children) {
        this.selectClustersRecursive(child, selected, scores, minClusterSize);
      }
    }
  }
}

// ===========================================
// ユーティリティ関数
// ===========================================

export class HDBSCANUtils {
  /**
   * ノードIDからインデックスのマッピングを作成
   */
  static createNodeMapping(nodeIds: string[]): Map<string, number> {
    const mapping = new Map<string, number>();
    nodeIds.forEach((id, index) => {
      mapping.set(id, index);
    });
    return mapping;
  }

  /**
   * 距離行列の対称性をチェック
   */
  static validateDistanceMatrix(matrix: number[][]): boolean {
    const n = matrix.length;
    
    for (let i = 0; i < n; i++) {
      if (matrix[i].length !== n) return false;
      
      for (let j = 0; j < n; j++) {
        if (Math.abs(matrix[i][j] - matrix[j][i]) > 1e-6) return false;
        if (i === j && matrix[i][j] !== 0) return false;
      }
    }
    
    return true;
  }

  /**
   * クラスター品質指標を計算
   */
  static calculateClusterQuality(
    clusters: HierarchicalClusterNode[],
    distanceMatrix: number[][],
    nodeMapping: Map<string, number>
  ): { silhouette: number; intraDistance: number; interDistance: number } {
    
    if (!clusters || clusters.length === 0 || !distanceMatrix || distanceMatrix.length === 0) {
      return { silhouette: 0, intraDistance: 0, interDistance: 0 };
    }

    let totalIntraDistance = 0;
    let totalInterDistance = 0;
    let silhouetteSum = 0;
    let totalPoints = 0;

    for (const cluster of clusters) {
      if (cluster.nodeIds.length < 2) continue;

      // クラスター内距離計算
      let intraSum = 0;
      let intraCount = 0;
      
      for (let i = 0; i < cluster.nodeIds.length; i++) {
        for (let j = i + 1; j < cluster.nodeIds.length; j++) {
          const idx1 = nodeMapping.get(cluster.nodeIds[i])!;
          const idx2 = nodeMapping.get(cluster.nodeIds[j])!;
          intraSum += distanceMatrix[idx1][idx2];
          intraCount++;
        }
      }
      
      if (intraCount > 0) {
        totalIntraDistance += intraSum / intraCount;
      }
      
      totalPoints += cluster.nodeIds.length;
    }

    // クラスター間距離計算
    let interSum = 0;
    let interCount = 0;
    
    for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        const cluster1 = clusters[i];
        const cluster2 = clusters[j];
        
        let pairSum = 0;
        let pairCount = 0;
        
        for (const node1 of cluster1.nodeIds) {
          for (const node2 of cluster2.nodeIds) {
            const idx1 = nodeMapping.get(node1)!;
            const idx2 = nodeMapping.get(node2)!;
            pairSum += distanceMatrix[idx1][idx2];
            pairCount++;
          }
        }
        
        if (pairCount > 0) {
          interSum += pairSum / pairCount;
          interCount++;
        }
      }
    }
    
    if (interCount > 0) {
      totalInterDistance = interSum / interCount;
    }

    // 簡易シルエット係数（詳細実装は別途）
    const silhouette = totalInterDistance > 0 ? 
      (totalInterDistance - totalIntraDistance) / Math.max(totalInterDistance, totalIntraDistance) : 0;

    return {
      silhouette: Math.max(-1, Math.min(1, silhouette)), // -1 to 1 範囲に制限
      intraDistance: clusters.length > 0 ? totalIntraDistance / clusters.length : 0,
      interDistance: totalInterDistance
    };
  }
}
