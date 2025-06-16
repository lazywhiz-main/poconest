# 統計的クラスタリング分析アプローチ

## 概要

本システムでは、統計学的手法を用いてカードクラスタリングにおけるラベリング品質の向上を図っています。従来の単純なパターンマッチングではなく、統計的外れ値検出と意味的分析を組み合わせることで、より合理的で意味のあるクラスターラベルを生成します。

## 主要な課題と解決策

### 1. 固定見出し・定型文の問題

**課題**: カードに含まれる繰り返しテンプレート見出しが、意味のないラベルとして選択される

**統計的解決策**:
- **Z-score分析**: 異常に高い頻度で出現する単語を統計的に検出
- **IQR (四分位範囲) 分析**: 補助的な外れ値検出手法
- **閾値**: 2σ（標準偏差の2倍）以上の頻度を示す単語を定型文として除外

```typescript
// Z-score計算による外れ値検出
const zScore = (freq - mean) / stdDev;
if (zScore > 2.0) {
  // 固定見出し・定型文として除外
  excludeWord(word);
}

// IQR外れ値検出（補助）
const iqrThreshold = q3 + (1.5 * iqr);
if (freq > iqrThreshold && freq > 3) {
  excludeWord(word);
}
```

### 2. 固有名詞の混入問題

**課題**: 話者名（Mina等）や固有のサービス名がクラスターラベルに使用される

**解決策**:
- **正規表現パターン**: CamelCase、大文字始まりなどの固有名詞パターンを検出
- **文脈分析**: 発話者パターン（「〜さん」「〜が言った」）の特定
- **ブラックリスト**: 一般的な人名・サービス名のパターンマッチング

```typescript
const properNounPatterns = [
  /^[A-Z][a-z]+[A-Z][a-z]+/,  // CamelCase
  /^[A-Z][a-z]{2,8}$/,         // 一般的な固有名詞
  /mina|john|jane|speaker/i,   // 一般的な人名
  /slack|zoom|teams/i          // サービス名
];
```

### 3. 構造メタデータの除外

**課題**: UI の column_type（INSIGHTS、THEMES等）がセマンティック分析に混入

**解決策**:
- **分析対象の限定**: title、content、tagsのみを分析対象とする
- **構造情報の分離**: UIメタデータとセマンティックコンテンツを明確に分離

## 統計的ラベル生成戦略

### 優先順位付きアプローチ

1. **高頻度タグ分析**（信頼度: 85-95%）
   - 60%以上のカードで共有されるタグ
   - 最も信頼性の高い指標

2. **意味的キーワード組み合わせ**（信頼度: 75%）
   - 統計的に有意なキーワード2つの組み合わせ
   - 自然な日本語表現への変換

3. **統計的共起分析**（信頼度: 70%）
   - 2回以上共起する用語の抽出
   - ペアワイズ分析による関連性評価

4. **単一キーワード**（信頼度: 60%）
   - 統計的フィルタリング済みの主要キーワード

5. **安全なフォールバック**（信頼度: 20-40%）
   - カード数に基づく階層的ラベル

### ラベル美化処理

```typescript
const labelMapping = {
  'ux': 'UXリサーチ',
  'design': 'デザイン',
  'research': 'リサーチ',
  'analysis': '分析結果',
  // ... その他のマッピング
};
```

## 実装状況

### 完了済み
- ✅ 統計的外れ値検出（Z-score + IQR）
- ✅ 固有名詞パターン除外
- ✅ 構造メタデータの分離
- ✅ 優先順位付きラベル生成戦略
- ✅ 日本語対応のラベル美化

### SmartClusteringService の実装
- ✅ `extractKeywords()`: 統計的キーワード抽出
- ✅ `generateSemanticLabel()`: 合理的ラベル生成
- ✅ `analyzeStatisticalCooccurrence()`: 共起分析
- ✅ `beautifyTagLabel()` / `beautifyLabel()`: ラベル美化

## 統計的指標とログ出力

システムは以下の統計情報を出力し、分析の透明性を確保します：

```typescript
console.log('📊 SmartClustering Statistical Analysis:', {
  totalWords: allWords.length,
  uniqueWords: Object.keys(wordFreq).length,
  mean: Math.round(mean * 100) / 100,
  stdDev: Math.round(stdDev * 100) / 100,
  q1, q3, iqr
});
```

## 品質保証

- **統計的根拠**: すべての除外判定に統計的閾値を使用
- **段階的フィルタリング**: 6段階の品質チェック
- **信頼度スコア**: 各ラベルに0.1-0.95の信頼度を付与
- **代替案生成**: メインラベルに加えて最大3個の代替ラベルを提供

## ログ出力例

```
🎯 SmartClustering Rational Analysis (5 cards):
  dominantTags: [['ux', 3], ['design', 2]]
  topKeywords: ['interface', 'usability', 'feedback']
  cooccurrenceTerms: [{'term': 'user', 'frequency': 2}]

✅ SmartClustering Selected strategy: "UXリサーチ" (confidence: 0.89)

❌ SmartClustering Statistical outlier excluded: "said" (freq: 8, z-score: 2.34)
❌ SmartClustering IQR outlier excluded: "meeting" (freq: 6, threshold: 4)
```

## 性能特性

- **処理速度**: O(n log n) - nはユニーク単語数
- **メモリ効率**: 単語頻度マップのみを保持
- **スケーラビリティ**: 1000カード程度まで実用的

## 今後の改善案

1. **機械学習の導入**: TF-IDFの改良、word2vec等の語彙埋め込み
2. **AIラベル生成**: OpenAI/Claude APIとの統合
3. **ドメイン適応**: UXリサーチ特化の用語辞書拡張
4. **多言語対応**: 英語コンテンツの混在への対応 