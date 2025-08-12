# カード抽出ロジック改善内容（2025年8月11日）

## 改善概要

ユーザーの要求に応じて、以下の2つの改善を実装しました：

1. **抽出数の3パターンでのカスタマイズ**
2. **引用文の長さ改善（プロンプト改善）**

## 1. 抽出数の3パターンでのカスタマイズ

### 実装内容

#### バックエンド（Edge Function）
- `CardExtractionSettings` インターフェースを追加
- 3つの粒度レベル（coarse, medium, fine）に対応
- 各カラムタイプごとの最大カード数と全体の最大カード数を設定可能

#### 粒度レベル別の設定
- **coarse（ざっくり）**: 全体で15枚、各カラム3枚まで
- **medium（標準）**: 全体で30枚、各カラム6枚まで（デフォルト）
- **fine（細かめ）**: 全体で50枚、各カラム10枚まで

#### フロントエンド
- `CardExtractionSettings` 型定義を追加
- `CARD_EXTRACTION_PRESETS` 定数でプリセット設定を提供

### 使用方法

```typescript
// Edge Function呼び出し時に設定を渡す
const response = await fetch('/functions/v1/extract-cards-from-meeting', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    meeting_id: 'meeting-id',
    extraction_settings: CARD_EXTRACTION_PRESETS.fine // 細かめ設定
  })
});
```

## 2. 引用文の長さ改善（プロンプト改善）

### 改善内容

#### 変更前
```
- 前後の文脈が分かるよう、十分なボリューム（各発言30-50文字程度）で引用してください
- 長すぎる引用は避け、要点を簡潔に表現してください
```

#### 変更後
```
- 前後の文脈が分かるよう、十分なボリュームで引用してください
- 発言の要点と文脈を適切に含め、理解しやすい長さで引用してください
```

### 改善のポイント

- **文字数制限の削除**: 30-50文字という固定制限を削除
- **文脈重視**: 発言の要点と文脈を適切に含めることを重視
- **理解しやすさ**: ユーザーが理解しやすい長さでの引用を推奨

## 実装ファイル

### バックエンド
- `supabase/functions/extract-cards-from-meeting/index.ts`
  - カード抽出設定の型定義と関数を追加
  - プロンプトに抽出設定を反映
  - 引用文の長さに関する指示を改善

### フロントエンド
- `src/features/meeting-space/types/meeting.ts`
  - `CardExtractionSettings` 型定義を追加
  - `CARD_EXTRACTION_PRESETS` 定数を追加

### バックアップ
- `current_card_extraction_prompt_20250811.md`
  - 改善前のプロンプトを保存（ロールバック用）

## 使用方法

### 1. 粒度設定の変更

```typescript
import { CARD_EXTRACTION_PRESETS } from '@/features/meeting-space/types/meeting';

// ざっくり設定
const coarseSettings = CARD_EXTRACTION_PRESETS.coarse;

// 細かめ設定
const fineSettings = CARD_EXTRACTION_PRESETS.fine;
```

### 2. カスタム設定

```typescript
const customSettings: CardExtractionSettings = {
  extractionGranularity: 'medium',
  maxCardsPerColumn: {
    INBOX: 8,
    QUESTIONS: 5,
    INSIGHTS: 7,
    THEMES: 4,
    ACTIONS: 6
  },
  maxTotalCards: 30
};
```

## 注意事項

1. **既存の動作**: 設定を指定しない場合は従来通りの動作（medium設定）
2. **プロンプトの変更**: 引用文の長さに関する指示が変更されている
3. **品質監視**: 改善後も品質が維持されているか監視が必要
4. **ロールバック**: 問題が発生した場合は `current_card_extraction_prompt_20250811.md` の内容で復旧可能

## 今後の拡張可能性

1. **ユーザー設定の保存**: 各ユーザーやネストごとの好み設定を保存
2. **動的調整**: ミーティングの長さや内容に応じた自動調整
3. **A/Bテスト**: 異なる設定での品質比較
4. **フィードバック機能**: ユーザーからの品質評価に基づく調整
