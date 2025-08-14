# クラスタリング・Relations最適化実装計画

## 📋 **プロジェクト概要**

**目標**: HDBSCAN + Relations統合によるクラスタリング精度向上と関係性重複問題の解決

**背景**: 
- Relations生成とクラスタリングでsemantic類似度が重複評価されている
- 同一カードペアに複数のRelations（ai, derived, tag_similarity）が作成される
- ラベリングが抽象的すぎて特徴的キーワードが隠れる

## 🎯 **解決方針**

### **Core Strategy: Relations-First Clustering**
1. **Relations品質統合**: 重複削除・品質向上
2. **HDBSCAN最適化**: Relations豊富度に応じた動的重み調整
3. **ラベリング転換**: キーワード保持型プロンプト

---

## 📑 **Phase 1: Relations重複削除・品質統合**

### **1.1 Relations重複分析・可視化**
```typescript
// 実装ファイル: src/services/RelationsAnalysisService.ts
interface RelationsDuplicationReport {
  totalRelations: number;
  duplicatePairs: number;
  typeDistribution: Record<RelationType, number>;
  qualityMetrics: {
    averageStrength: number;
    confidenceDistribution: number[];
    typeConflicts: Array<{
      cardPair: string;
      conflictingTypes: RelationType[];
      strengthDifference: number;
    }>;
  };
}

class RelationsAnalysisService {
  static async analyzeDuplication(boardId: string): Promise<RelationsDuplicationReport>
  static async findConflictingRelations(boardId: string): Promise<ConflictingRelation[]>
  static async generateQualityReport(boardId: string): Promise<RelationsQualityReport>
}
```

**完了条件**:
- [ ] 重複Relations検出機能実装
- [ ] 品質レポート生成機能実装
- [ ] 重複率・品質指標の可視化UI追加

### **1.2 Relations統合・重複削除機能**
```typescript
// 実装ファイル: src/services/RelationsDeduplicationService.ts
interface RelationsDeduplicationStrategy {
  priority: RelationType[]; // ['ai', 'derived', 'tag_similarity', 'manual']
  qualityThreshold: number;
  strengthDifferenceThreshold: number;
  keepHighestQuality: boolean;
}

class RelationsDeduplicationService {
  static async deduplicateRelations(
    boardId: string, 
    strategy: RelationsDeduplicationStrategy
  ): Promise<DeduplicationResult>
  
  static async selectBestRelation(
    conflictingRelations: CardRelationship[]
  ): Promise<CardRelationship>
  
  static async bulkDeleteRedundantRelations(
    boardId: string,
    relationsToDelete: string[]
  ): Promise<BulkDeleteResult>
}
```

**完了条件**:
- [ ] Relations重複削除サービス実装
- [ ] 優先順位ベース統合ロジック実装
- [ ] UI: Relations重複削除ボタン追加（NetworkVisualization）

### **1.3 Relations生成時重複防止**
```typescript
// 修正ファイル: src/services/AIAnalysisService.ts, src/services/AnalysisService.ts
// 新規機能: 全Relationsタイプ横断重複チェック

// AIAnalysisService.suggestRelationships() 修正
static async suggestRelationships(cards: BoardItem[]): Promise<SuggestedRelationship[]> {
  // 1. 既存Relations全タイプをチェック（ai, derived, tag_similarity, manual）
  const existingRelations = await this.getExistingAllTypeRelations(cards);
  const existingPairs = new Set(existingRelations.map(r => this.createPairKey(r)));
  
  // 2. 重複ペアをスキップしてAI Relations生成
  // 3. 重複統計レポート生成
}

// AnalysisService.generateDerivedRelationships() 修正  
static async generateDerivedRelationships(boardId: string): Promise<AnalysisResult> {
  // 1. AI Relations・Manual Relationsをチェック
  // 2. 既存ペアを除外してDerived Relations生成
  // 3. より厳格な品質フィルタリング追加
}
```

**完了条件**:
- [ ] AIAnalysisService重複防止機能追加
- [ ] AnalysisService重複防止機能追加
- [ ] Relations生成統計・レポート機能強化

---

## 📑 **Phase 2: HDBSCAN重み最適化・動的調整**

### **2.1 Relations豊富度分析**
```typescript
// 実装ファイル: src/services/clustering/RelationsCoverageAnalyzer.ts
interface RelationsCoverageMetrics {
  totalNodes: number;
  connectedNodes: number;
  connectionRatio: number; // connectedNodes / totalNodes
  averageConnectionsPerNode: number;
  relationsDensity: number; // actualRelations / maxPossibleRelations
  strongRelationsRatio: number; // strength > 0.7
  clusteringRecommendedWeights: DistanceWeights;
}

class RelationsCoverageAnalyzer {
  static analyzeRelationsCoverage(
    nodes: NetworkNode[], 
    edges: NetworkEdge[]
  ): RelationsCoverageMetrics
  
  static recommendOptimalWeights(
    coverageMetrics: RelationsCoverageMetrics
  ): DistanceWeights
  
  static detectNetworkCharacteristics(
    nodes: NetworkNode[], 
    edges: NetworkEdge[]
  ): NetworkCharacteristics
}
```

**完了条件**:
- [ ] Relations豊富度分析機能実装
- [ ] ネットワーク特性分析機能実装
- [ ] 最適重み推奨システム実装

### **2.2 動的重み調整機能**
```typescript
// 修正ファイル: src/services/clustering/hdbscan/HDBSCANProvider.ts
// 新規機能: Relations豊富度に応じた動的重み計算

private static calculateOptimalWeights(
  nodes: NetworkNode[], 
  edges: NetworkEdge[]
): DistanceWeights {
  const coverage = RelationsCoverageAnalyzer.analyzeRelationsCoverage(nodes, edges);
  
  // Relations豊富度に応じた重み調整
  if (coverage.connectionRatio > 0.7) {
    // Relations豊富 → Relations重視
    return { graph: 0.70, semantic: 0.20, structural: 0.10 };
  } else if (coverage.connectionRatio > 0.4) {
    // Relations中程度 → バランス型
    return { graph: 0.50, semantic: 0.40, structural: 0.10 };
  } else {
    // Relations少ない → Semantic重視  
    return { graph: 0.25, semantic: 0.65, structural: 0.10 };
  }
}

static convertToHDBSCANConfig(config: ClusteringConfig): HDBSCANConfig {
  // 既存コードに動的重み計算を統合
  const optimalWeights = this.calculateOptimalWeights(nodes, edges);
  
  return {
    // ... 既存設定
    distanceWeights: optimalWeights // 🔧 動的重み適用
  };
}
```

**完了条件**:
- [ ] 動的重み計算ロジック実装
- [ ] HDBSCANProvider重み調整機能統合
- [ ] 重み調整の効果検証・ログ機能追加

### **2.3 クラスタリング品質評価強化**
```typescript
// 実装ファイル: src/services/clustering/ClusteringQualityEvaluator.ts
interface EnhancedClusterQuality {
  // 既存指標
  silhouetteScore: number;
  modularityScore: number;
  
  // 新規指標
  relationsUtilizationScore: number;  // Relations活用度
  semanticCoherenceScore: number;     // クラスター内意味的一貫性
  crossClusterSeparationScore: number; // クラスター間分離度
  optimalClusterCountScore: number;   // 最適クラスター数との差
  
  // 総合評価
  overallQualityScore: number;
  qualityGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  improvementRecommendations: string[];
}

class ClusteringQualityEvaluator {
  static evaluateEnhancedQuality(
    clusters: SmartCluster[],
    relations: CardRelationship[],
    cards: BoardItem[]
  ): EnhancedClusterQuality
  
  static compareClusteringResults(
    results: ClusteringResult[]
  ): ClusteringComparison
  
  static generateQualityReport(
    quality: EnhancedClusterQuality
  ): ClusteringQualityReport
}
```

**完了条件**:
- [ ] 強化された品質評価指標実装
- [ ] クラスタリング結果比較機能実装
- [ ] 品質レポートUI表示機能追加

---

## 📑 **Phase 3: ラベリング改善・キーワード保持**

### **3.1 キーワード保持型プロンプト設計**
```typescript
// 修正ファイル: src/services/ai/AILabelingService.ts
// 新規プロンプト戦略: 抽象化削減・キーワード強調

private static buildKeywordPreservingPrompt(
  cardSummary: any[],
  statisticalResult: any,
  userContext: any,
  config: AILabelingConfig
): string {
  const newPrompt = `
あなたは優秀な質的データ分析の専門家です。以下のカード群の**特徴的なキーワードを保持**しつつ、意味のあるクラスターラベルを生成してください。

## 🎯 新しいラベリング指針

### 【重要】キーワード保持ルール
1. **カード群の最も特徴的なキーワード2-3個を必ず含める**
2. **抽象化しすぎず、具体性を残す**  
3. **「・」「×」「→」などで特徴キーワードを繋ぐ**
4. **地名・人名・専門用語などの重要情報を隠さない**

### ✅ 良いラベル例
- "宇都宮・餃子店・大学生体験"（地名・業種・対象保持）
- "アンケート設計→データ分析→課題発見"（手法フロー保持）
- "パン屋×地域住民×コミュニティ形成"（要素関係保持）
- "リモートワーク・生産性・チーム連携"（概念関係保持）

### ❌ 避けるべき例  
- "地域連携活動"（抽象的すぎ・キーワード消失）
- "教育価値創造"（汎用的すぎ・具体性無し）
- "課題解決手法"（特徴が見えない）
- "コミュニティ活性化"（キーワード隠蔽）

## 分析対象のカード群（${cardSummary.length}枚）
${cardSummary.map((card, i) => `
${i + 1}. 【${card.type}】${card.title}
   内容: ${card.content}
   タグ: ${card.tags.join(', ')}`).join('\n')}

## ラベル生成手順
1. **キーワード抽出**: カード群から最重要キーワード3-5個を特定
2. **関係性分析**: キーワード間の関係（並列・順序・因果・手段）を理解
3. **ラベル構築**: 適切な接続詞で特徴キーワードを繋げる
4. **具体性保持**: 抽象化レベルを適度に留める（medium程度）

## 出力形式（JSON）
{
  "primary": "特徴キーワード・保持・具体的ラベル",
  "alternatives": [
    "観点1: キーワード並列形式", 
    "観点2: キーワード→関係性形式", 
    "観点3: キーワード×統合形式"
  ],
  "extractedKeywords": ["キーワード1", "キーワード2", "キーワード3"],
  "reasoning": "なぜこれらのキーワードを選び、どう繋げたかの説明",
  "confidence": 0.85,
  "abstractionLevel": "medium"
}`;

  return newPrompt;
}
```

**完了条件**:
- [ ] キーワード保持型プロンプト実装
- [ ] 抽象化レベル制御機能追加
- [ ] キーワード抽出・評価機能強化

### **3.2 ラベル品質評価システム**
```typescript
// 実装ファイル: src/services/ai/LabelQualityEvaluator.ts
interface LabelQualityMetrics {
  keywordPreservationScore: number;  // キーワード保持度
  abstractionLevelScore: number;     // 適切な抽象化レベル
  uniquenessScore: number;          // 他クラスターとの差別化
  clarityScore: number;             // 理解しやすさ
  businessRelevanceScore: number;   // ビジネス文脈での意味
  
  overallQuality: number;
  qualityGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  improvementSuggestions: string[];
}

class LabelQualityEvaluator {
  static evaluateLabelQuality(
    label: string,
    originalCards: BoardItem[],
    allClusterLabels: string[]
  ): LabelQualityMetrics
  
  static extractImportantKeywords(
    cards: BoardItem[]
  ): Array<{ keyword: string; importance: number; source: 'title' | 'content' | 'tags' }>
  
  static measureKeywordPreservation(
    label: string,
    importantKeywords: Array<{ keyword: string; importance: number }>
  ): number
}
```

**完了条件**:
- [ ] ラベル品質評価システム実装
- [ ] キーワード重要度分析機能実装
- [ ] ラベル改善提案機能追加

### **3.3 ユーザーフィードバック学習**
```typescript
// 実装ファイル: src/services/ai/LabelLearningService.ts
interface UserLabelFeedback {
  originalLabel: string;
  userEditedLabel: string;
  clusterId: string;
  timestamp: string;
  feedbackType: 'keyword_addition' | 'abstraction_reduction' | 'clarity_improvement' | 'complete_rewrite';
  extractedPatterns: string[];
}

class LabelLearningService {
  static async recordUserLabelEdit(
    userId: string,
    labelFeedback: UserLabelFeedback
  ): Promise<void>
  
  static async analyzeLabelingPatterns(
    userId: string
  ): Promise<UserLabelingPreferences>
  
  static async generatePersonalizedPrompt(
    basePrompt: string,
    userPreferences: UserLabelingPreferences
  ): Promise<string>
  
  static async improvePromptsFromFeedback(
    feedbackHistory: UserLabelFeedback[]
  ): Promise<PromptImprovements>
}
```

**完了条件**:
- [ ] ユーザーフィードバック記録システム実装
- [ ] ラベリングパターン分析機能実装
- [ ] 個人化プロンプト生成機能実装

---

## 📑 **Phase 4: 統合テスト・品質検証**

### **4.1 A/Bテスト環境構築**
```typescript
// 実装ファイル: src/services/testing/ClusteringABTestService.ts
interface ClusteringExperiment {
  experimentId: string;
  name: string;
  description: string;
  
  controlGroup: {
    algorithm: 'hdbscan_original';
    distanceWeights: DistanceWeights;
    labelingStrategy: 'original_abstract';
  };
  
  treatmentGroup: {
    algorithm: 'hdbscan_optimized';
    distanceWeights: 'dynamic'; // 動的調整
    labelingStrategy: 'keyword_preserving';
  };
  
  metrics: ClusteringComparisonMetrics;
  duration: string;
  sampleSize: number;
}

class ClusteringABTestService {
  static async createExperiment(config: ClusteringExperiment): Promise<string>
  static async runClusteringComparison(experimentId: string): Promise<ABTestResults>
  static async analyzeExperimentResults(experimentId: string): Promise<ExperimentAnalysis>
}
```

### **4.2 性能ベンチマーク**
```typescript
// 実装ファイル: src/services/testing/ClusteringBenchmarkService.ts
interface BenchmarkSuite {
  testCases: Array<{
    name: string;
    nodeCount: number;
    relationsCount: number;
    complexity: 'low' | 'medium' | 'high';
    expectedClusters: number;
  }>;
  
  algorithms: Array<{
    name: string;
    config: ClusteringConfig;
  }>;
  
  metrics: Array<{
    name: string;
    calculator: (result: ClusteringResult) => number;
  }>;
}

class ClusteringBenchmarkService {
  static async runBenchmarkSuite(suite: BenchmarkSuite): Promise<BenchmarkResults>
  static async generatePerformanceReport(results: BenchmarkResults): Promise<PerformanceReport>
  static async identifyOptimalConfigurations(results: BenchmarkResults): Promise<OptimalConfig[]>
}
```

### **4.3 ユーザー受容テスト**
```typescript
// 実装ファイル: src/services/testing/UserAcceptanceTestService.ts
interface UserTestScenario {
  scenarioId: string;
  name: string;
  description: string;
  testSteps: UserTestStep[];
  expectedOutcomes: string[];
  successCriteria: string[];
}

class UserAcceptanceTestService {
  static async designTestScenarios(): Promise<UserTestScenario[]>
  static async conductUserTest(scenarioId: string, userId: string): Promise<UserTestResult>
  static async analyzeUserFeedback(testResults: UserTestResult[]): Promise<UserAcceptanceReport>
}
```

**完了条件**:
- [ ] A/Bテスト環境・機能実装
- [ ] 性能ベンチマーク実装・実行
- [ ] ユーザー受容テスト実施・分析

---

## 📑 **Phase 5: UI/UX改善・機能統合**

### **5.1 Relations管理UI強化**
```typescript
// 修正ファイル: src/features/nest-space/analysis-space/components/NetworkVisualization.tsx
// 新規UI要素追加

// 1. Relations品質ダッシュボード
const RelationsQualityDashboard = () => (
  <div style={styles.qualityDashboard}>
    <h3>🔗 Relations品質状況</h3>
    <div style={styles.metricsGrid}>
      <QualityMetric label="重複率" value={duplicationRate} threshold={0.1} />
      <QualityMetric label="カバー率" value={coverageRate} threshold={0.7} />
      <QualityMetric label="平均強度" value={averageStrength} threshold={0.6} />
    </div>
    <button onClick={handleDeduplication}>🧹 重複削除実行</button>
  </div>
);

// 2. クラスタリング品質レポート
const ClusteringQualityReport = () => (
  <div style={styles.qualityReport}>
    <h3>📊 クラスタリング品質</h3>
    <QualityGrade grade={clusteringQuality.grade} />
    <MetricsBreakdown metrics={clusteringQuality} />
    <ImprovementSuggestions suggestions={clusteringQuality.recommendations} />
  </div>
);

// 3. 動的重み調整表示
const DynamicWeightsDisplay = () => (
  <div style={styles.weightsDisplay}>
    <h4>⚖️ 自動調整された重み</h4>
    <WeightBar label="Relations" value={currentWeights.graph} />
    <WeightBar label="Semantic" value={currentWeights.semantic} />
    <WeightBar label="Structural" value={currentWeights.structural} />
    <small>Relations豊富度: {relationsCoverage}%</small>
  </div>
);
```

### **5.2 ラベル編集UX改善**
```typescript
// 修正ファイル: src/components/ui/cluster detail components
// キーワード保持型ラベル編集UI

const EnhancedLabelEditor = () => {
  return (
    <div style={styles.labelEditor}>
      {/* 現在のラベル表示 */}
      <div style={styles.currentLabel}>
        <h4>現在のラベル</h4>
        <span style={styles.labelText}>{currentLabel}</span>
        <LabelQualityBadge quality={labelQuality} />
      </div>
      
      {/* キーワード候補表示 */}
      <div style={styles.keywordSuggestions}>
        <h5>🔑 重要キーワード</h5>
        <div style={styles.keywordTags}>
          {importantKeywords.map(keyword => (
            <KeywordTag 
              key={keyword.text} 
              keyword={keyword}
              onToggle={handleKeywordToggle}
            />
          ))}
        </div>
      </div>
      
      {/* AI提案ラベル */}
      <div style={styles.aiSuggestions}>
        <h5>🤖 AI提案ラベル</h5>
        {aiSuggestions.map(suggestion => (
          <SuggestionCard 
            key={suggestion.id}
            suggestion={suggestion}
            onSelect={handleSuggestionSelect}
          />
        ))}
      </div>
      
      {/* 手動編集 */}
      <div style={styles.manualEdit}>
        <h5>✏️ 手動編集</h5>
        <input 
          value={editedLabel}
          onChange={handleLabelEdit}
          placeholder="キーワードを「・」で繋げて入力..."
        />
        <button onClick={handleSaveLabel}>保存</button>
      </div>
    </div>
  );
};
```

### **5.3 分析結果レポート機能**
```typescript
// 実装ファイル: src/components/ui/AnalysisReportModal.tsx
const AnalysisReportModal = () => {
  return (
    <Modal title="📊 分析レポート" onClose={onClose}>
      <Tabs>
        <Tab label="🔗 Relations品質">
          <RelationsQualityReport />
        </Tab>
        <Tab label="🏢 クラスタリング結果">
          <ClusteringResultsReport />
        </Tab>
        <Tab label="🏷️ ラベル品質">
          <LabelQualityReport />
        </Tab>
        <Tab label="📈 改善提案">
          <ImprovementRecommendations />
        </Tab>
        <Tab label="📋 実行ログ">
          <ExecutionLogs />
        </Tab>
      </Tabs>
    </Modal>
  );
};
```

**完了条件**:
- [ ] Relations品質ダッシュボードUI実装
- [ ] 強化されたラベル編集UI実装
- [ ] 分析レポート機能実装・統合

---

## 🚀 **実装スケジュール**

### **Week 1: Phase 1 (Relations重複削除)**
- Day 1-2: Relations重複分析機能実装
- Day 3-4: Relations統合・削除機能実装  
- Day 5-7: Relations生成時重複防止機能実装

### **Week 2: Phase 2 (HDBSCAN最適化)**
- Day 1-2: Relations豊富度分析機能実装
- Day 3-4: 動的重み調整機能実装
- Day 5-7: クラスタリング品質評価強化

### **Week 3: Phase 3 (ラベリング改善)**
- Day 1-2: キーワード保持型プロンプト実装
- Day 3-4: ラベル品質評価システム実装
- Day 5-7: ユーザーフィードバック学習機能実装

### **Week 4: Phase 4-5 (テスト・UI改善)**
- Day 1-2: A/Bテスト・ベンチマーク実装
- Day 3-4: UI/UX改善実装
- Day 5-7: 統合テスト・品質検証・ドキュメント整備

---

## 📊 **成功指標 (KPI)**

### **定量指標**
- **Relations重複率**: 現在値 → 目標 <5%
- **Relations豊富度**: カバー率 >70%を維持
- **クラスタリング品質**: 総合スコア >85%
- **ラベル品質**: キーワード保持率 >80%
- **ユーザー満足度**: NPS >8.0

### **定性指標**
- [ ] Relations重複問題の解決
- [ ] 直感的なクラスター形成
- [ ] 特徴的キーワードが見えるラベル
- [ ] ユーザーが理解しやすい分析結果
- [ ] システム全体の信頼性向上

---

## 🔄 **継続的改善計画**

### **Phase 6: 機械学習強化 (Future)**
- Relations品質予測モデル
- 最適クラスタリングパラメータ自動調整
- ユーザー嗜好学習型ラベル生成

### **Phase 7: 高度分析機能 (Future)**
- 時系列クラスタリング変化分析
- クロスボード関係性分析
- AIによる洞察自動生成

---

**プロジェクト責任者**: AI Assistant  
**作成日**: 2024年12月27日  
**最終更新**: 2024年12月27日  
**ステータス**: 計画策定完了 → 実装準備中

---

*この計画書は実装の進行に応じて随時更新されます。*
