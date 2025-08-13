# HDBSCAN実装詳細

## 📋 概要

本ドキュメントは、ネットワーク可視化におけるクラスタリングアルゴリズムをDBSCANからHDBSCANへ移行する実装詳細を記載します。

### 実装目標
- **ノード包含率**: 60% → **95%+**
- **単独クラスター**: 大幅削減
- **関係性尊重**: エッジ接続ノードの適切な配属
- **パラメータ簡素化**: 直感的な設定

---

## 🎯 HDBSCANアルゴリズム概要

### 基本原理
1. **階層的密度推定**: データの密度に応じて可変半径でクラスター形成
2. **相互到達可能距離**: 各点の局所密度を考慮した距離計算
3. **クラスター安定性評価**: 最も安定したクラスターを自動選択
4. **外れ値スコア**: GLOSHによる外れ値の定量評価

### DBSCANとの違い

| 特徴 | DBSCAN | HDBSCAN |
|------|--------|---------|
| **半径** | 固定 (eps) | 可変（密度適応） |
| **パラメータ** | eps, minPts | minClusterSize |
| **クラスター数** | 結果依存 | 安定性で自動決定 |
| **外れ値処理** | バイナリ | 確率的スコア |
| **階層構造** | なし | デンドログラム |

---

## 🏗️ 実装アーキテクチャ

### ディレクトリ構造
```
src/services/clustering/
├── hdbscan/
│   ├── HDBSCANCore.ts           # コアデータ構造・アルゴリズム
│   ├── HDBSCANClusterer.ts      # メインクラスタリングロジック
│   ├── NetworkDistanceCalculator.ts  # ネットワーク特化距離計算
│   ├── ClusterStabilityEvaluator.ts  # 安定性評価
│   └── OutlierProcessor.ts      # 外れ値処理
├── HDBSCANProvider.ts           # 既存システム統合
├── ClusteringCache.ts           # パフォーマンス最適化
└── types/
    ├── hdbscan.ts              # HDBSCAN固有型定義
    └── clustering.ts           # 共通型拡張

src/components/clustering/
├── HDBSCANInfoPanel.tsx        # HDBSCAN情報表示
├── ClusterHierarchyView.tsx    # 階層構造可視化
└── AlgorithmComparison.tsx     # アルゴリズム比較

workers/
└── hdbscan-worker.js           # Web Worker実装
```

---

## 🔧 コアコンポーネント

### 1. HDBSCANCore.ts
```typescript
export class HDBSCANCore {
  // Union-Find (素集合データ構造)
  class UnionFind {
    private parent: number[];
    private rank: number[];
    
    find(x: number): number;
    union(x: number, y: number): void;
  }
  
  // 最小全域木
  class MST {
    edges: Array<{ source: number; target: number; weight: number }>;
    
    build(distances: number[][]): void;
    getClusterHierarchy(): ClusterTree;
  }
}
```

### 2. NetworkDistanceCalculator.ts
```typescript
export class NetworkDistanceCalculator {
  // 統合距離関数
  calculateDistance(
    nodeA: NetworkNode, 
    nodeB: NetworkNode, 
    weights: DistanceWeights
  ): number {
    return (
      weights.graph * this.calculateGraphDistance(nodeA, nodeB) +
      weights.semantic * this.calculateSemanticDistance(nodeA, nodeB) +
      weights.structural * this.calculateStructuralDistance(nodeA, nodeB)
    );
  }
  
  private calculateGraphDistance(nodeA: NetworkNode, nodeB: NetworkNode): number;
  private calculateSemanticDistance(nodeA: NetworkNode, nodeB: NetworkNode): number;
  private calculateStructuralDistance(nodeA: NetworkNode, nodeB: NetworkNode): number;
}
```

### 3. HDBSCANClusterer.ts
```typescript
export class HDBSCANClusterer {
  // メインクラスタリング処理
  async performClustering(
    nodes: NetworkNode[],
    edges: NetworkEdge[],
    config: HDBSCANConfig
  ): Promise<HDBSCANResult> {
    
    // 1. 相互到達可能距離計算
    const mutualReachability = this.calculateMutualReachability(nodes, config);
    
    // 2. 最小全域木構築
    const mst = this.buildMST(mutualReachability);
    
    // 3. 階層的クラスター抽出
    const hierarchy = this.extractHierarchy(mst);
    
    // 4. 安定性評価・最適クラスター選択
    const selectedClusters = this.selectOptimalClusters(hierarchy, config);
    
    // 5. 外れ値処理
    const finalResult = this.processOutliers(selectedClusters, config);
    
    return finalResult;
  }
}
```

---

## ⚙️ 設定・パラメータ

### HDBSCANConfig インターフェース
```typescript
interface HDBSCANConfig extends ClusteringConfig {
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
```

### 推奨設定値
```typescript
const HDBSCAN_DEFAULTS: HDBSCANConfig = {
  algorithm: 'hdbscan',
  minClusterSize: 4,
  minSamples: undefined, // 自動計算: Math.max(2, minClusterSize - 1)
  distanceWeights: {
    graph: 0.5,      // グラフ接続を重視
    semantic: 0.3,   // 内容類似性
    structural: 0.2  // 構造類似性
  },
  clusterSelectionMethod: 'eom',
  allowSingletons: false,
  outlierAssignmentThreshold: 0.3
};
```

---

## 🚀 性能最適化

### 1. Web Workers活用
```typescript
// workers/hdbscan-worker.js
self.onmessage = function(e) {
  const { nodes, edges, config } = e.data;
  
  // バックグラウンドでHDBSCAN処理
  const clusterer = new HDBSCANClusterer();
  const result = clusterer.performClustering(nodes, edges, config);
  
  self.postMessage(result);
};
```

### 2. 段階的処理
```typescript
class OptimizedHDBSCAN {
  // 大規模データの段階的処理
  async processLargeDataset(
    nodes: NetworkNode[], 
    batchSize: number = 200
  ): Promise<ClusteringResult> {
    
    if (nodes.length <= batchSize) {
      return this.processSmallDataset(nodes);
    }
    
    // 段階的クラスタリング
    const batches = this.createBatches(nodes, batchSize);
    const batchResults = await Promise.all(
      batches.map(batch => this.processSmallDataset(batch))
    );
    
    // バッチ結果の統合
    return this.mergeBatchResults(batchResults);
  }
}
```

### 3. キャッシュ戦略
```typescript
class ClusteringCache {
  // 距離行列キャッシュ
  private distanceCache = new Map<string, number[][]>();
  
  getCachedDistance(nodeHash: string): number[][] | null {
    return this.distanceCache.get(nodeHash) || null;
  }
  
  setCachedDistance(nodeHash: string, matrix: number[][]): void {
    // LRU eviction
    if (this.distanceCache.size > 10) {
      const firstKey = this.distanceCache.keys().next().value;
      this.distanceCache.delete(firstKey);
    }
    this.distanceCache.set(nodeHash, matrix);
  }
}
```

---

## 🎨 UI/UX統合

### 1. アルゴリズム選択UI
```typescript
// NetworkVisualization.tsx
const AlgorithmSelector: React.FC = () => {
  return (
    <div className="algorithm-selector">
      <label>クラスタリングアルゴリズム:</label>
      <select 
        value={config.algorithm} 
        onChange={(e) => handleAlgorithmChange(e.target.value as 'dbscan' | 'hdbscan')}
      >
        <option value="dbscan">DBSCAN (従来)</option>
        <option value="hdbscan">HDBSCAN (推奨)</option>
      </select>
    </div>
  );
};
```

### 2. HDBSCAN固有パラメータUI
```typescript
const HDBSCANControls: React.FC = () => {
  return (
    <div className="hdbscan-controls">
      <div className="parameter-group">
        <label>最小クラスターサイズ: {config.minClusterSize}</label>
        <input
          type="range"
          min="2"
          max="8"
          step="1"
          value={config.minClusterSize}
          onChange={(e) => updateConfig('minClusterSize', parseInt(e.target.value))}
        />
      </div>
      
      <div className="parameter-group">
        <label>距離重み設定</label>
        <div className="weight-controls">
          <label>グラフ: {config.distanceWeights.graph}</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={config.distanceWeights.graph}
            onChange={(e) => updateDistanceWeight('graph', parseFloat(e.target.value))}
          />
        </div>
      </div>
    </div>
  );
};
```

### 3. 結果表示の拡張
```typescript
const HDBSCANResultDisplay: React.FC<{ result: HDBSCANResult }> = ({ result }) => {
  return (
    <div className="hdbscan-result">
      <div className="cluster-info">
        <h3>クラスター情報</h3>
        <p>総クラスター数: {result.clusters.length}</p>
        <p>ノード包含率: {((result.coveredNodes / result.totalNodes) * 100).toFixed(1)}%</p>
        <p>平均安定性: {result.averageStability.toFixed(2)}</p>
      </div>
      
      <div className="outlier-info">
        <h3>外れ値情報</h3>
        <p>外れ値数: {result.outliers.length}</p>
        <p>最高外れ値スコア: {Math.max(...result.outlierScores).toFixed(2)}</p>
      </div>
    </div>
  );
};
```

---

## 📊 品質評価・監視

### 評価指標
```typescript
interface HDBSCANMetrics {
  // カバー率
  coverage: {
    total: number;      // 総ノード数
    covered: number;    // クラスター配属済み
    ratio: number;      // カバー率 (目標: 95%+)
  };
  
  // クラスター品質
  quality: {
    silhouetteScore: number;    // シルエット係数
    stabilityScore: number;     // 平均安定性
    modularityScore: number;    // モジュラリティ
  };
  
  // 性能
  performance: {
    processingTime: number;     // 処理時間 (ms)
    memoryUsage: number;        // メモリ使用量 (MB)
    cacheHitRate: number;       // キャッシュヒット率
  };
}
```

### 監視・ログ
```typescript
class HDBSCANMonitor {
  logClusteringResult(result: HDBSCANResult, metrics: HDBSCANMetrics): void {
    console.log(`🎯 HDBSCAN完了: ${metrics.coverage.ratio.toFixed(1)}% カバー, ${metrics.quality.stabilityScore.toFixed(2)} 安定性`);
    
    // 警告条件
    if (metrics.coverage.ratio < 0.9) {
      console.warn(`⚠️ カバー率低下: ${metrics.coverage.ratio.toFixed(1)}% (目標: 95%+)`);
    }
    
    if (metrics.performance.processingTime > 30000) {
      console.warn(`⚠️ 処理時間長期化: ${metrics.performance.processingTime}ms (目標: 30秒以内)`);
    }
  }
}
```

---

## 🧪 テスト戦略

### ユニットテスト
```typescript
// tests/clustering/hdbscan.test.ts
describe('HDBSCANClusterer', () => {
  test('小規模データセットでの基本動作', () => {
    const nodes = createTestNodes(10);
    const edges = createTestEdges(nodes);
    const config = { ...HDBSCAN_DEFAULTS, minClusterSize: 2 };
    
    const result = clusterer.performClustering(nodes, edges, config);
    
    expect(result.clusters.length).toBeGreaterThan(0);
    expect(result.coverage.ratio).toBeGreaterThan(0.8);
  });
  
  test('大規模データセットでの性能', async () => {
    const nodes = createTestNodes(500);
    const edges = createTestEdges(nodes);
    
    const startTime = performance.now();
    const result = await clusterer.performClustering(nodes, edges, HDBSCAN_DEFAULTS);
    const processingTime = performance.now() - startTime;
    
    expect(processingTime).toBeLessThan(30000); // 30秒以内
    expect(result.coverage.ratio).toBeGreaterThan(0.9); // 90%以上カバー
  });
});
```

### 統合テスト
```typescript
describe('HDBSCAN統合テスト', () => {
  test('既存DBSCANとの結果比較', async () => {
    const testData = await loadRealUserData();
    
    const dbscanResult = await dbscanProvider.performClustering(testData);
    const hdbscanResult = await hdbscanProvider.performClustering(testData);
    
    // HDBSCANの方がカバー率が高いことを確認
    expect(hdbscanResult.coverage.ratio).toBeGreaterThan(dbscanResult.coverage.ratio);
    
    // 処理時間が許容範囲内であることを確認
    expect(hdbscanResult.processingTime).toBeLessThan(dbscanResult.processingTime * 2);
  });
});
```

---

## 📝 実装チェックリスト

### Phase 1: 基礎アルゴリズム実装
- [ ] `HDBSCANCore.ts` - UnionFind, MST実装
- [ ] `NetworkDistanceCalculator.ts` - 距離関数実装
- [ ] `HDBSCANClusterer.ts` - メインアルゴリズム
- [ ] 基本的なユニットテスト作成

### Phase 2: システム統合
- [ ] `HDBSCANProvider.ts` - 既存インターフェース適応
- [ ] `clustering.ts` - 型定義拡張
- [ ] UI統合 - アルゴリズム選択
- [ ] 設定UI - HDBSCANパラメータ

### Phase 3: 性能最適化
- [ ] Web Workers実装
- [ ] キャッシュシステム
- [ ] 段階的処理
- [ ] メモリ使用量最適化

### Phase 4: 視覚化・UX
- [ ] `HDBSCANInfoPanel.tsx` - 詳細情報表示
- [ ] 階層構造可視化
- [ ] 安定性・外れ値スコア表示
- [ ] アルゴリズム比較機能

### Phase 5: テスト・監視
- [ ] 包括的ユニットテスト
- [ ] 統合テスト
- [ ] 性能ベンチマーク
- [ ] 監視・ログシステム

---

## 📚 参考資料

### 学術論文
- Campello, R. J., Moulavi, D., & Sander, J. (2013). "Density-based clustering based on hierarchical density estimates"
- McInnes, L., Healy, J., & Astels, S. (2017). "hdbscan: Hierarchical density based clustering"

### 実装参考
- scikit-learn HDBSCAN実装
- HDBSCAN Python library
- Fast approximate HDBSCAN (FAHDBSCAN)

### 最終更新
- 日付: 2025年1月13日
- 作成者: AI Assistant
- 目的: HDBSCAN移行実装ガイド
