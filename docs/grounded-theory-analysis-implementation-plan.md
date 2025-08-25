# Grounded Theory Analysis (GTA) 実装計画

## 現在の状況

### 実装済みコンポーネント
- ✅ `TheoryBuildingSidePeak.tsx` - 理論構築手法の選択UI
- ✅ `GroundedTheoryManager.tsx` - GTA分析の実行・管理UI
- ✅ `GroundedTheoryResultPanel.tsx` - GTA分析結果の表示UI
- ✅ `HypothesisEvidenceModal.tsx` - 仮説形成根拠の詳細表示
- ✅ `GroundedTheoryService.ts` - コアGTAロジック
- ✅ `GroundedTheoryAnalysisService.ts` - GTA分析の実行・保存・管理
- ✅ `SmartClusteringService.ts` - 高度なクラスタリング機能
- ✅ `grounded-theory-analysis` Edge Function - AI支援分析
- ✅ `grounded_theory_analyses` テーブル - データベース構造

### 実装状況
- **GTAの基本機能**: 95% 完了
- **UI統合**: 85% 完了
- **データ連携**: 70% 完了
- **モックデータ置き換え**: 0% 完了

## 実装計画（6週間）

### **Phase 1: データ改善・統合（最優先・2-3週間）** ✅ **統合作業完了**

#### ✅ Week 1: 統合作業（完了）
- ✅ AnalysisSpaceV2.tsxの更新
- ✅ データ変換関数の実装
- ✅ AnalysisSpaceContextの拡張
- ✅ ClusteringSidePeakとの統合
- ✅ TheoryBuildingSidePeakの統合
- ✅ 基本的な統合テスト

#### 🔄 Week 2-3: モックデータの実データ置き換え（進行中）
- ✅ HypothesisEvidenceModal.tsxの実データ連携
- ✅ GroundedTheoryResultPanel.tsxの実データ連携
- ✅ 動的データ表示の実装

### **Phase 2: 厳密なGTA手法の適用（3-4週間）**

#### **Week 4-5: 理論的サンプリングの実装**
- ✅ 理論的サンプリング用の検証モーダルの作成
- 🔄 理論的飽和判定ロジックの実装
- 🔄 サンプリング戦略の実装
- 🔄 継続的サンプリングの仕組み構築

#### **Week 6-7: 定数比較法の強化**
- ✅ 定数比較法用の検証モーダルの作成
- 🔄 概念比較アルゴリズムの実装
- 🔄 カテゴリ比較ロジックの強化
- 🔄 理論的統合の追跡機能

### **Phase 3: ナラティブ構築の強化（2-3週間）**
- Week 8-9: ストーリーライン構築ロジックの改善
- Week 10: 構築経緯の詳細可視化

### **Phase 4: UI改善・粒度調整（1週間）**
- Week 11: 結果の詳細度調整・インタラクティブ探索

## 次のステップ: モックデータの実データ置き換え

### **対象ファイル**
1. **`HypothesisEvidenceModal.tsx`** - 仮説形成根拠の詳細表示
2. **`GroundedTheoryResultPanel.tsx`** - GTA分析結果の表示

### **実装内容**
- モックデータの削除
- 実データ（`GroundedTheoryAnalysis`）との連携
- 動的なデータ表示の実装
- エラーハンドリングの追加

### **成功基準**
- ✅ クラスタリング結果がGTA分析に正しく渡される
- ✅ 既存のGTA分析結果が正しく表示される
- ✅ 新しいGTA分析が正常に実行される
- ✅ モックデータが完全に削除される

## 結論

**Phase 1の統合作業が完了しました！** 🎉

現在、`AnalysisSpaceV2`で`ClusteringSidePeak`のクラスタリング結果が`TheoryBuildingSidePeak`に正しく渡され、GTA分析が実行できる状態になっています。

次のステップは**モックデータの実データ置き換え**です。これにより、GTAの実用的な価値が大幅に向上します。
