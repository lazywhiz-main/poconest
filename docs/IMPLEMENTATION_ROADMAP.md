# 実装ロードマップ: 統計的クラスタリング → AI強化

## 現状分析

### 完了済み実装
- ✅ 統計的外れ値検出（Z-score + IQR分析）
- ✅ 固有名詞・定型文の除外ロジック
- ✅ 構造メタデータ（column_type）の分離
- ✅ 優先順位付きラベル生成戦略（5段階）
- ✅ 日本語対応のラベル美化機能

### 残存課題
- ❌ 複雑すぎるロジックによる保守性の問題
- ❌ 依然として発生する可能性がある意味不明ラベル
- ❌ ドメイン知識の不足（UX/デザイン特化の理解）
- ❌ コンテキスト理解の限界

## 段階的改善計画

### Phase 1: 統計的手法の最適化 【優先度: 高】

**目標**: 現在の統計的アプローチの精度向上と安定化

**実装項目**:
1. **閾値チューニング**
   ```typescript
   // 現在: 固定閾値
   const Z_SCORE_THRESHOLD = 2.0;
   
   // 改善: 適応的閾値
   const adaptiveThreshold = calculateAdaptiveThreshold(cardCount, contentDiversity);
   ```

2. **ドメイン辞書の拡張**
   ```typescript
   const UX_DOMAIN_TERMS = {
     positive: ['usability', 'intuitive', 'accessible', 'efficient'],
     negative: ['confusion', 'friction', 'barrier', 'error'],
     concepts: ['journey', 'persona', 'wireframe', 'prototype'],
     methods: ['testing', 'interview', 'survey', 'analytics']
   };
   ```

3. **統計手法の改良**
   - TF-IDFの重み調整
   - 語幹処理（stemming）の導入
   - 類義語グループ化

**期間**: 1-2週間
**リスク**: 低

---

### Phase 2: AI統合アーキテクチャの設計 【優先度: 高】

**目標**: AIとの統合可能な設計への移行

**実装項目**:
1. **ハイブリッドアーキテクチャの設計**
   ```typescript
   interface LabelingStrategy {
     name: string;
     confidence: number;
     execute(cards: BoardItem[]): Promise<LabelResult>;
   }
   
   class StatisticalStrategy implements LabelingStrategy { }
   class AIStrategy implements LabelingStrategy { }
   class HybridStrategy implements LabelingStrategy { }
   ```

2. **設定可能なフォールバック階層**
   ```typescript
   const LABELING_PIPELINE = [
     { strategy: 'ai', timeout: 5000, fallback: 'statistical' },
     { strategy: 'statistical', timeout: 1000, fallback: 'safe' },
     { strategy: 'safe', timeout: 100, fallback: null }
   ];
   ```

3. **パフォーマンス監視機能**
   - レスポンス時間測定
   - 成功率追跡
   - 品質評価メトリクス

**期間**: 1週間
**リスク**: 中

---

### Phase 3: AI統合の実装 【優先度: 中】

**目標**: AI APIを活用したセマンティックラベル生成

**実装選択肢**:

#### Option A: OpenAI GPT-4 統合
```typescript
class OpenAILabelingStrategy implements LabelingStrategy {
  async execute(cards: BoardItem[]): Promise<LabelResult> {
    const prompt = this.buildPrompt(cards);
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: UX_EXPERT_PROMPT },
        { role: "user", content: prompt }
      ],
      max_tokens: 50,
      temperature: 0.3
    });
    
    return this.parseResponse(response);
  }
}
```

**メリット**: 高精度、安定したAPI
**デメリット**: コスト、レスポンス時間

#### Option B: Claude (Anthropic) 統合
```typescript
class ClaudeLabelingStrategy implements LabelingStrategy {
  async execute(cards: BoardItem[]): Promise<LabelResult> {
    // Claude APIの実装（長いコンテキストに対応）
  }
}
```

**メリット**: 日本語対応、長いコンテキスト
**デメリット**: API制限、新しいサービス

#### Option C: ローカルLLM (Ollama等)
```typescript
class LocalLLMStrategy implements LabelingStrategy {
  async execute(cards: BoardItem[]): Promise<LabelResult> {
    // ローカルLLMの実装
  }
}
```

**メリット**: プライバシー、コスト削減
**デメリット**: パフォーマンス、セットアップ複雑性

**期間**: 2-3週間
**リスク**: 中-高

---

### Phase 4: 品質保証とUI改善 【優先度: 中】

**目標**: ユーザー体験の向上と品質の可視化

**実装項目**:
1. **ラベル品質の可視化**
   ```typescript
   interface LabelQuality {
     confidence: number;
     method: 'statistical' | 'ai' | 'hybrid';
     alternatives: string[];
     reasoning: string;
     userFeedback?: 'good' | 'bad';
   }
   ```

2. **ユーザーフィードバック機能**
   - ラベルの手動編集
   - 品質評価（👍/👎）
   - 学習データとしての活用

3. **設定UI**
   - 戦略選択（統計的 / AI / ハイブリッド）
   - 閾値調整
   - APIキー管理

**期間**: 1-2週間
**リスク**: 低

---

## 推奨実装順序

### 短期 (1-2週間)
1. **Phase 1**: 統計的手法の最適化
   - 最も低リスクで即効性がある
   - 現在のコードベースを活用
   - すぐに改善効果が見込める

### 中期 (3-4週間)
2. **Phase 2**: アーキテクチャ設計
   - 将来の拡張性を確保
   - AI統合の基盤作り

3. **Phase 3A**: OpenAI統合（小規模テスト）
   - 最も確実性が高いAI選択肢
   - プロトタイプとして実装

### 長期 (5-8週間)
4. **Phase 3B**: 他のAI選択肢の検討・実装
5. **Phase 4**: 品質保証とUI改善

---

## リスク評価と対策

### 技術的リスク
- **API制限**: レート制限、コスト増加
  - 対策: キャッシュ機能、バッチ処理
- **レスポンス時間**: AIの応答遅延
  - 対策: タイムアウト、フォールバック

### ビジネスリスク
- **コスト**: AI API使用料
  - 対策: 使用量監視、予算上限設定
- **依存性**: 外部サービスへの依存
  - 対策: 複数プロバイダー対応、オフライン機能

---

## 成功指標

### 定量指標
- **ラベル生成成功率**: 95%以上
- **レスポンス時間**: 3秒以内
- **ユーザー満足度**: 80%以上（手動修正率20%以下）

### 定性指標
- **ラベルの意味性**: 固有名詞・定型文の除去
- **日本語の自然さ**: 読みやすい表現
- **ドメイン適合性**: UX/デザイン用語の適切な使用

---

## 次のアクションアイテム

1. **Phase 1の詳細設計** (今週)
   - 閾値チューニングの実験設計
   - ドメイン辞書の初期版作成

2. **AI統合方針の決定** (来週)
   - OpenAI vs Claude vs ローカルLLMの比較検討
   - コスト・性能・プライバシーの評価

3. **プロトタイプ開発** (2週間後)
   - 選択したAI戦略での小規模実装
   - 統計的手法との比較テスト 