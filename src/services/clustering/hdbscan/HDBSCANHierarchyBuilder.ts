/**
 * HDBSCAN階層構造構築
 * 密度ベースの階層クラスター形成と安定性評価
 */

import type { NetworkNode } from '../../../types/analysis';
import type { 
  ClusterTree, 
  HierarchicalClusterNode, 
  StabilityScores,
  MutualReachabilityResult,
  MST 
} from '../types/hdbscan';
import { MSTBuilder } from './HDBSCANCore';

// ===========================================
// HDBSCAN階層構造構築
// ===========================================

export class HDBSCANHierarchyBuilder {

  /**
   * 密度ベース階層構造の構築
   * 相互到達可能距離を使用した高度な階層形成
   */
  static buildDensityBasedHierarchy(
    nodes: NetworkNode[],
    mutualReachability: MutualReachabilityResult,
    minClusterSize: number
  ): ClusterTree {
    console.log(`🏗️ HDBSCAN階層構造構築開始: ${nodes.length}ノード, minClusterSize=${minClusterSize}`);
    
    // 1. 相互到達可能距離でMSTを構築
    const nodeIds = nodes.map(node => node.id);
    const mst = MSTBuilder.buildMST(nodes.length, nodeIds, mutualReachability.distances);
    
    // 2. 密度レベルに基づく階層形成
    const hierarchy = this.extractDensityHierarchy(mst, nodeIds, nodes, mutualReachability, minClusterSize);
    
    // 3. λ値（1/距離）による階層ソート
    this.assignLambdaValues(hierarchy);
    
    // 4. 最小クラスターサイズによるフィルタリング
    this.filterByMinClusterSize(hierarchy, minClusterSize);
    
    console.log(`✅ HDBSCAN階層構造構築完了: ${hierarchy.leaves.length}葉, ${this.countNodes(hierarchy.root)}総ノード`);
    
    return hierarchy;
  }

  /**
   * 密度階層の抽出
   */
  private static extractDensityHierarchy(
    mst: MST,
    nodeIds: string[],
    nodes: NetworkNode[],
    mutualReachability: MutualReachabilityResult,
    minClusterSize: number
  ): ClusterTree {
    
    // エッジをλ値（1/距離）の降順でソート
    const sortedEdges = mst.edges
      .map(edge => ({
        ...edge,
        lambda: edge.weight > 0 ? 1 / edge.weight : Infinity
      }))
      .sort((a, b) => b.lambda - a.lambda); // λ値の大きい順（距離の小さい順）
    
    // 葉ノード（データポイント）を作成
    const leaves: HierarchicalClusterNode[] = nodeIds.map((nodeId, index) => ({
      id: `point-${nodeId}`,
      nodeIds: [nodeId],
      children: [],
      birthLevel: Infinity, // データポイントは最高密度で「誕生」
      deathLevel: 0, // 低密度で「死亡」
      persistence: Infinity,
      stability: 0,
      isSelected: false
    }));

    // クラスターID生成用
    let clusterIdCounter = 0;
    const getNextClusterId = () => `hdbscan-cluster-${clusterIdCounter++}`;

    // Union-Findによる連結成分管理
    const nodeToCluster = new Map<string, HierarchicalClusterNode>();
    leaves.forEach(leaf => {
      nodeToCluster.set(leaf.nodeIds[0], leaf);
    });

    const allClusters: HierarchicalClusterNode[] = [...leaves];
    
    // エッジを順次処理して階層形成
    console.log(`🌳 階層構築開始: ${sortedEdges.length}エッジを処理`);
    let mergeCount = 0;
    
    for (let edgeIndex = 0; edgeIndex < sortedEdges.length; edgeIndex++) {
      const edge = sortedEdges[edgeIndex];
      const lambda = edge.lambda;
      
      const sourceCluster = nodeToCluster.get(edge.sourceId);
      const targetCluster = nodeToCluster.get(edge.targetId);
      
      if (!sourceCluster || !targetCluster || sourceCluster === targetCluster) {
        continue; // 既に同じクラスターまたは無効
      }
      
      // 新しいクラスターを作成
      const mergedCluster: HierarchicalClusterNode = {
        id: getNextClusterId(),
        nodeIds: [...sourceCluster.nodeIds, ...targetCluster.nodeIds],
        children: [sourceCluster, targetCluster],
        birthLevel: lambda,
        deathLevel: 0, // 後で設定
        persistence: 0,
        stability: 0,
        isSelected: false
      };
      
      // 親子関係設定
      sourceCluster.parent = mergedCluster;
      targetCluster.parent = mergedCluster;
      sourceCluster.deathLevel = lambda;
      targetCluster.deathLevel = lambda;
      
      allClusters.push(mergedCluster);
      mergeCount++;
      
      // マッピング更新
      mergedCluster.nodeIds.forEach(nodeId => {
        nodeToCluster.set(nodeId, mergedCluster);
      });
      
      if (mergeCount <= 5 || mergeCount % 20 === 0) {
        console.log(`  マージ${mergeCount}: λ=${lambda.toFixed(3)}, サイズ${sourceCluster.nodeIds.length}+${targetCluster.nodeIds.length}=${mergedCluster.nodeIds.length}`);
      }
    }
    
    console.log(`🌳 階層構築完了: ${mergeCount}回のマージ, ${allClusters.length}総クラスター`);
    
    // 統計情報
    const clusterSizes = allClusters.map(c => c.nodeIds.length);
    const avgSize = clusterSizes.reduce((sum, size) => sum + size, 0) / clusterSizes.length;
    const maxSize = Math.max(...clusterSizes);
    console.log(`📊 クラスターサイズ分布: avg=${avgSize.toFixed(1)}, max=${maxSize}, min=${Math.min(...clusterSizes)}`);

    // ルートノードを特定
    const root = allClusters.find(cluster => !cluster.parent);
    if (!root) {
      throw new Error('階層構造のルートが見つかりません');
    }
    
    root.deathLevel = 0; // ルートは最低密度まで生存
    
    return {
      root,
      leaves,
      selectedClusters: [] // 後でstability評価で決定
    };
  }

  /**
   * λ値（密度レベル）の割り当て
   */
  private static assignLambdaValues(hierarchy: ClusterTree): void {
    const assignRecursive = (node: HierarchicalClusterNode): void => {
      // λ = 1/距離 の関係を使用
      if (node.birthLevel !== Infinity && node.birthLevel > 0) {
        node.birthLevel = node.birthLevel; // 既にλ値として設定済み
      }
      
      for (const child of node.children) {
        assignRecursive(child);
      }
    };
    
    assignRecursive(hierarchy.root);
  }

  /**
   * 最小クラスターサイズによるフィルタリング
   */
  private static filterByMinClusterSize(hierarchy: ClusterTree, minClusterSize: number): void {
    const filterRecursive = (node: HierarchicalClusterNode): boolean => {
      // 子ノードを再帰的にフィルタ
      node.children = node.children.filter(child => filterRecursive(child));
      
      // 自身のサイズチェック
      return node.nodeIds.length >= minClusterSize || node.children.length === 0; // 葉ノードは保持
    };
    
    filterRecursive(hierarchy.root);
  }

  /**
   * クラスター安定性の詳細計算
   */
  static calculateClusterStability(
    hierarchy: ClusterTree,
    minClusterSize: number
  ): StabilityScores {
    console.log(`📊 HDBSCANクラスター安定性計算開始`);
    
    const stabilityScores: StabilityScores = {};
    
    // 全クラスターの安定性を計算
    this.calculateStabilityRecursive(hierarchy.root, stabilityScores, minClusterSize);
    
    // 安定性統計
    const scores = Object.values(stabilityScores).map(s => s.stability);
    const avgStability = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    const maxStability = Math.max(...scores);
    
    console.log(`✅ 安定性計算完了: 平均=${avgStability.toFixed(3)}, 最大=${maxStability.toFixed(3)}`);
    
    return stabilityScores;
  }

  /**
   * 再帰的安定性計算（拡張版）
   */
  private static calculateStabilityRecursive(
    node: HierarchicalClusterNode,
    scores: StabilityScores,
    minClusterSize: number
  ): number {
    
    if (node.children.length === 0) {
      // 葉ノード（データポイント）
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

    // 子クラスターの安定性を計算
    let childStabilitySum = 0;
    for (const child of node.children) {
      childStabilitySum += this.calculateStabilityRecursive(child, scores, minClusterSize);
    }

    // 自身の安定性計算（拡張式）
    let ownStability = 0;
    if (node.nodeIds.length >= minClusterSize) {
      const λBirth = node.birthLevel;
      const λDeath = node.deathLevel;
      
      if (λBirth !== Infinity && λDeath >= 0) {
        // 安定性 = ∑(λDeath - λBirth) * |cluster|
        ownStability = (λBirth - λDeath) * node.nodeIds.length;
      }
    }

    // Excess of Mass (EoM) 選択: より安定な方を選択
    const totalStability = Math.max(ownStability, childStabilitySum);
    node.stability = totalStability;
    
    scores[node.id] = {
      stability: totalStability,
      persistence: node.birthLevel - node.deathLevel,
      birthLevel: node.birthLevel,
      deathLevel: node.deathLevel,
      nodeCount: node.nodeIds.length
    };

    return totalStability;
  }

  /**
   * 拡張クラスター選択（EoM + 追加基準）
   */
  static selectClustersWithAdvancedCriteria(
    hierarchy: ClusterTree,
    stabilityScores: StabilityScores,
    minClusterSize: number,
    selectionEpsilon: number = 0.0
  ): HierarchicalClusterNode[] {
    console.log(`🎯 [HDBSCAN] 拡張クラスター選択開始: selectionEpsilon=${selectionEpsilon}`);
    
    const selectedClusters: HierarchicalClusterNode[] = [];
    
    // 1. まず従来のEoM基準で選択（サイズ制限付き）
    const totalNodes = hierarchy.leaves.length; // 葉ノード数を総ノード数として使用
    this.selectClustersRecursiveAdvanced(
      hierarchy.root, 
      selectedClusters, 
      stabilityScores, 
      minClusterSize,
      selectionEpsilon,
      totalNodes
    );
    
    console.log(`📊 [HDBSCAN] EoM基準選択結果: ${selectedClusters.length}クラスター`);
    
    // 1.5. EoM選択の重複チェック・除去
    const filteredClusters = this.removeDuplicateClusters(selectedClusters);
    selectedClusters.length = 0;
    selectedClusters.push(...filteredClusters);
    
    console.log(`🔍 [HDBSCAN] 重複除去後: ${selectedClusters.length}クラスター`);
    
    // 2. 目標クラスター数（10-15個）に向けた積極的な追加選択
    const targetClusterCount = Math.floor(totalNodes / 10); // 平均10カード/クラスターで計算（より細かく）
    const maxTargetCount = Math.floor(totalNodes / 7); // 最大15個程度まで許可
    
    if (selectedClusters.length < targetClusterCount) {
      console.log(`⚠️ [HDBSCAN] クラスター数が目標より少ないです（${selectedClusters.length}個 < 目標${targetClusterCount}-${maxTargetCount}個）。積極的な追加選択を実行...`);
      
      // より小さなクラスターも積極的に追加
      const additionalClusters = this.selectAdditionalClusters(
        hierarchy,
        stabilityScores,
        2, // 2カード以上のクラスターを許可（より細かく）
        selectedClusters
      );
      
      selectedClusters.push(...additionalClusters);
      console.log(`🔄 [HDBSCAN] 追加選択完了: +${additionalClusters.length}クラスター (合計: ${selectedClusters.length}個)`);
    } else if (selectedClusters.length > maxTargetCount) {
      console.log(`ℹ️ [HDBSCAN] クラスター数が上限を超過（${selectedClusters.length}個 > ${maxTargetCount}個）`);
    } else {
      console.log(`✅ [HDBSCAN] クラスター数が目標範囲です（${selectedClusters.length}個、目標${targetClusterCount}-${maxTargetCount}個）。追加選択をスキップ`);
    }
    
    // 選択フラグを設定
    selectedClusters.forEach(cluster => {
      cluster.isSelected = true;
    });
    
    hierarchy.selectedClusters = selectedClusters;
    
    console.log(`✅ [HDBSCAN] 最終クラスター選択完了: ${selectedClusters.length}クラスター選択`);
    
    return selectedClusters;
  }

  /**
   * 拡張基準による再帰クラスター選択
   */
  private static selectClustersRecursiveAdvanced(
    node: HierarchicalClusterNode,
    selected: HierarchicalClusterNode[],
    scores: StabilityScores,
    minClusterSize: number,
    selectionEpsilon: number,
    totalNodes: number = 116 // デフォルト値として現在のノード数を設定
  ): void {
    
    const nodeScore = scores[node.id];
    if (!nodeScore || node.nodeIds.length < minClusterSize) {
      return;
    }

    // 葉ノードの場合、条件を満たせば選択
    if (node.children.length === 0) {
      selected.push(node);
      return;
    }

    // 子ノードの安定性合計
    let childStabilitySum = 0;
    const validChildren = node.children.filter(child => {
      const childScore = scores[child.id];
      return childScore && child.nodeIds.length >= minClusterSize;
    });

    for (const child of validChildren) {
      const childScore = scores[child.id];
      if (childScore) {
        childStabilitySum += childScore.stability;
      }
    }

    // 拡張判定基準
    const stabilityDifference = nodeScore.stability - childStabilitySum;
    const relativeImprovement = childStabilitySum > 0 ? stabilityDifference / childStabilitySum : 0;
    
    // サイズ制限：細かい粒度を保つ（3-15カード目標）
    const maxReasonableSize = Math.min(15, Math.floor(totalNodes * 0.15)); // 15カードまたは全ノードの15%まで
    const isReasonableSize = nodeScore.nodeCount <= maxReasonableSize;
    
    // 選択判定（サイズ制限付き）
    const shouldSelectSelf = isReasonableSize && (
      nodeScore.stability >= childStabilitySum + selectionEpsilon ||
      relativeImprovement > 0.05 || // 5%以上の改善（緩和）
      (nodeScore.persistence > 0.3 && nodeScore.stability > 0.05) || // より寛容な閾値
      (nodeScore.nodeCount >= minClusterSize && nodeScore.stability > 0.02) // 最低限の基準
    );
    
    if (!isReasonableSize) {
      console.log(`📏 [HDBSCAN] クラスター${node.id}をサイズ制限で除外: ${nodeScore.nodeCount}ノード (制限: ≤${maxReasonableSize})`);
    }

    if (shouldSelectSelf) {
      // 自身を選択
      selected.push(node);
    } else {
      // 子ノードを再帰選択
      for (const child of node.children) {
        this.selectClustersRecursiveAdvanced(child, selected, scores, minClusterSize, selectionEpsilon, totalNodes);
      }
    }
  }

  /**
   * 追加クラスター選択（少なすぎる場合の補完）
   */
  private static selectAdditionalClusters(
    hierarchy: ClusterTree,
    stabilityScores: StabilityScores,
    relaxedMinSize: number,
    alreadySelected: HierarchicalClusterNode[]
  ): HierarchicalClusterNode[] {
    
    const selectedIds = new Set(alreadySelected.map(c => c.id));
    const additionalClusters: HierarchicalClusterNode[] = [];
    
    // 1. 安定性スコア順でソート（より多くのクラスター候補）
    const maxAdditionSize = 20; // 追加選択サイズ上限を拡大（15 → 20）
    const candidateClusters = Object.entries(stabilityScores)
      .filter(([id, score]) => 
        !selectedIds.has(id) && 
        score.nodeCount >= relaxedMinSize && 
        score.nodeCount <= maxAdditionSize && 
        score.stability > 0.01 && // より寛容な安定性閾値（0.02 → 0.01）
        score.persistence > 0.005 // より寛容な持続性（0.01 → 0.005）
      )
      .sort(([,a], [,b]) => {
        // 小さめのクラスターで安定性が高いものを優先
        const aScore = a.stability / Math.log(a.nodeCount + 1); // サイズ補正済み安定性
        const bScore = b.stability / Math.log(b.nodeCount + 1);
        return bScore - aScore;
      })
      .slice(0, 15); // 候補数を拡大（10 → 15）
    
    console.log(`📏 [HDBSCAN] 追加選択サイズ制限: ≤${maxAdditionSize}ノード`);
    
    console.log(`📋 [HDBSCAN] 追加候補: ${candidateClusters.length}個`);
    
    // 2. 葉ノードと中間ノードをバランス良く選択
    let leafCount = 0;
    let intermediateCount = 0;
    
    for (const [clusterId, score] of candidateClusters) {
      const clusterNode = this.findClusterNodeById(hierarchy, clusterId);
      if (!clusterNode) continue;
      
      const isLeaf = clusterNode.children.length === 0;
      
      // 小さなクラスターを積極的に追加（10-15個目標）
      if ((isLeaf && leafCount < 12) || (!isLeaf && intermediateCount < 6)) {
        
        // 重複チェック: 既存クラスターとの類似度確認
        const hasSignificantOverlap = additionalClusters.some(existing => {
          const intersection = clusterNode.nodeIds.filter(id => existing.nodeIds.includes(id)).length;
          const union = new Set([...clusterNode.nodeIds, ...existing.nodeIds]).size;
          const jaccardSimilarity = intersection / union;
          
          if (jaccardSimilarity > 0.7) { // 70%以上重複は除外
            console.log(`    ⚠️ [HDBSCAN] 重複検出: ${clusterId} と既存クラスターの類似度=${(jaccardSimilarity * 100).toFixed(1)}% (除外)`);
            return true;
          }
          return false;
        });
        
        if (!hasSignificantOverlap) {
          additionalClusters.push(clusterNode);
          
          if (isLeaf) leafCount++;
          else intermediateCount++;
          
          console.log(`  + [HDBSCAN] 追加: ${clusterId} (サイズ=${score.nodeCount}, 安定性=${score.stability.toFixed(3)}, ${isLeaf ? '葉' : '中間'})`);
        }
        
        // 最大15個まで（10-15個目標）
        if (additionalClusters.length >= 15) break;
      }
    }
    
    return additionalClusters;
  }

  /**
   * 重複クラスターの除去
   */
  private static removeDuplicateClusters(clusters: HierarchicalClusterNode[]): HierarchicalClusterNode[] {
    const uniqueClusters: HierarchicalClusterNode[] = [];
    
    for (const cluster of clusters) {
      let isDuplicate = false;
      
      for (const existing of uniqueClusters) {
        // Jaccard類似度計算
        const intersection = cluster.nodeIds.filter(id => existing.nodeIds.includes(id)).length;
        const union = new Set([...cluster.nodeIds, ...existing.nodeIds]).size;
        const jaccardSimilarity = intersection / union;
        
        if (jaccardSimilarity > 0.8) { // 80%以上重複は重複とみなす
          console.log(`🔄 [HDBSCAN] 重複クラスター除去: ${cluster.id} (類似度=${(jaccardSimilarity * 100).toFixed(1)}% vs ${existing.id})`);
          
          // より小さいクラスターまたは安定性の低いクラスターを除外
          if (cluster.nodeIds.length < existing.nodeIds.length || 
              (cluster.stability || 0) < (existing.stability || 0)) {
            isDuplicate = true;
            break;
          } else {
            // 既存のクラスターを新しいものに置き換え
            const existingIndex = uniqueClusters.indexOf(existing);
            uniqueClusters[existingIndex] = cluster;
            isDuplicate = true;
            break;
          }
        }
      }
      
      if (!isDuplicate) {
        uniqueClusters.push(cluster);
      }
    }
    
    console.log(`✂️ [HDBSCAN] 重複除去: ${clusters.length} → ${uniqueClusters.length}クラスター`);
    return uniqueClusters;
  }

  /**
   * クラスターIDでノードを検索
   */
  private static findClusterNodeById(hierarchy: ClusterTree, clusterId: string): HierarchicalClusterNode | null {
    const searchRecursive = (node: HierarchicalClusterNode): HierarchicalClusterNode | null => {
      if (node.id === clusterId) return node;
      
      for (const child of node.children) {
        const result = searchRecursive(child);
        if (result) return result;
      }
      
      return null;
    };
    
    return searchRecursive(hierarchy.root);
  }

  /**
   * 階層品質評価
   */
  static evaluateHierarchyQuality(
    hierarchy: ClusterTree,
    stabilityScores: StabilityScores
  ): {
    hierarchyDepth: number;
    averageStability: number;
    stabilityVariance: number;
    clusterSizeDistribution: { size: number; count: number }[];
    qualityScore: number;
  } {
    
    // 1. 階層の深さ
    const calculateDepth = (node: HierarchicalClusterNode): number => {
      if (node.children.length === 0) return 1;
      return 1 + Math.max(...node.children.map(child => calculateDepth(child)));
    };
    const hierarchyDepth = calculateDepth(hierarchy.root);

    // 2. 安定性統計
    const stabilities = Object.values(stabilityScores).map(s => s.stability);
    const averageStability = stabilities.reduce((sum, s) => sum + s, 0) / stabilities.length;
    const stabilityVariance = stabilities.reduce(
      (sum, s) => sum + Math.pow(s - averageStability, 2), 
      0
    ) / stabilities.length;

    // 3. クラスターサイズ分布
    const sizeCounts: { [size: number]: number } = {};
    Object.values(stabilityScores).forEach(score => {
      const size = score.nodeCount;
      sizeCounts[size] = (sizeCounts[size] || 0) + 1;
    });
    
    const clusterSizeDistribution = Object.entries(sizeCounts)
      .map(([size, count]) => ({ size: parseInt(size), count }))
      .sort((a, b) => a.size - b.size);

    // 4. 総合品質スコア
    const depthScore = Math.max(0, Math.min(1, hierarchyDepth / 10)); // 深すぎず浅すぎず
    const stabilityScore = Math.max(0, Math.min(1, averageStability));
    const varianceScore = Math.max(0, Math.min(1, 1 - stabilityVariance)); // 分散は小さい方が良い
    
    const qualityScore = (depthScore * 0.3 + stabilityScore * 0.5 + varianceScore * 0.2);

    return {
      hierarchyDepth,
      averageStability,
      stabilityVariance,
      clusterSizeDistribution,
      qualityScore
    };
  }

  /**
   * 階層構造の可視化データ生成
   */
  static generateHierarchyVisualization(
    hierarchy: ClusterTree,
    stabilityScores: StabilityScores
  ): {
    dendrogram: Array<{
      id: string;
      parentId?: string;
      level: number;
      size: number;
      stability: number;
      isSelected: boolean;
    }>;
    lambdaLevels: Array<{
      lambda: number;
      activeClusters: number;
      totalNodes: number;
    }>;
  } {
    
    const dendrogram: Array<{
      id: string;
      parentId?: string;
      level: number;
      size: number;
      stability: number;
      isSelected: boolean;
    }> = [];

    // デンドログラム構築
    const buildDendrogram = (node: HierarchicalClusterNode, level: number = 0): void => {
      const score = stabilityScores[node.id];
      
      dendrogram.push({
        id: node.id,
        parentId: node.parent?.id,
        level,
        size: node.nodeIds.length,
        stability: score?.stability || 0,
        isSelected: node.isSelected
      });

      node.children.forEach(child => buildDendrogram(child, level + 1));
    };

    buildDendrogram(hierarchy.root);

    // λレベル分析
    const lambdaLevels: Array<{
      lambda: number;
      activeClusters: number;
      totalNodes: number;
    }> = [];

    // λ値を収集してソート
    const allLambdas = Array.from(new Set(
      Object.values(stabilityScores)
        .flatMap(score => [score.birthLevel, score.deathLevel])
        .filter(lambda => lambda !== Infinity && lambda > 0)
    )).sort((a, b) => b - a); // 降順

    allLambdas.forEach(lambda => {
      let activeClusters = 0;
      let totalNodes = 0;

      Object.entries(stabilityScores).forEach(([clusterId, score]) => {
        if (score.birthLevel >= lambda && score.deathLevel < lambda) {
          activeClusters++;
          totalNodes += score.nodeCount;
        }
      });

      lambdaLevels.push({
        lambda,
        activeClusters,
        totalNodes
      });
    });

    return {
      dendrogram,
      lambdaLevels
    };
  }

  // ユーティリティメソッド
  private static countNodes(node: HierarchicalClusterNode): number {
    return 1 + node.children.reduce((sum, child) => sum + this.countNodes(child), 0);
  }
}
