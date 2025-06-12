# AI使用量トラッキング・課金機能設計

## 概要

poconestで使用されるAI機能のトークン消費量とコストを追跡し、将来的な課金ビジネスの基盤となるシステムの設計ドキュメント。

## 現在のAI機能とモデル使用状況

### 実装済みAI機能

| 機能名 | 使用場所 | プロバイダー | モデル | トークン消費 |
|--------|----------|-------------|--------|-------------|
| **チャット分析** | ChatSpace, ChatScreen | OpenAI/Gemini | gpt-4o, gemini-1.5-pro-latest | 高 |
| **ミーティング要約** | MeetingSpace | OpenAI/Gemini | gpt-4o, gemini-1.5-pro-latest | 高 |
| **カード抽出** | MeetingSpace | OpenAI/Gemini | gpt-4o, gemini-1.5-pro-latest | 中 |
| **埋め込み生成** | AnalysisSpace | OpenAI/Gemini | text-embedding-3-small, text-embedding-004 | 低 |
| **関係性分析** | NetworkVisualization | OpenAI/Gemini | gpt-4o, gemini-1.5-pro-latest | 中 |

### 使用されているモデル一覧

#### OpenAI
- **メインモデル**: `gpt-4o` (チャット分析、要約、カード抽出)
- **埋め込みモデル**: `text-embedding-3-small`
- **音声モデル**: `whisper-1` (将来実装予定)

#### Google Gemini
- **メインモデル**: `gemini-1.5-pro-latest`
- **埋め込みモデル**: `text-embedding-004`

### Edge Functions (Supabase)
- `ai-summary`: ミーティング要約生成
- `ai-embeddings`: テキスト埋め込み生成
- `analyze-chat`: チャット分析
- `extract-cards-from-meeting`: カード抽出
- `ai-health-check`: プロバイダー可用性確認

## Phase 1: 基本ログ機能 (今回実装)

### 1.1 データベース設計

#### `ai_usage_logs` テーブル
```sql
CREATE TABLE ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nest_id UUID REFERENCES nests(id) ON DELETE CASCADE,
  
  -- AI機能識別
  feature_type VARCHAR(50) NOT NULL, -- 'chat_analysis', 'meeting_summary', 'card_extraction', 'embedding', 'relationship_analysis'
  provider VARCHAR(20) NOT NULL,     -- 'openai', 'gemini'
  model VARCHAR(50) NOT NULL,        -- 'gpt-4o', 'gemini-1.5-pro-latest', etc.
  
  -- トークン使用量
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER GENERATED ALWAYS AS (input_tokens + output_tokens) STORED,
  
  -- コスト計算
  estimated_cost_usd DECIMAL(10, 6) NOT NULL DEFAULT 0.0,
  
  -- メタデータ
  request_metadata JSONB,            -- 元のリクエスト情報
  response_metadata JSONB,           -- レスポンス情報（エラー含む）
  
  -- 関連エンティティ
  chat_room_id UUID,                 -- チャット関連の場合
  meeting_id UUID,                   -- ミーティング関連の場合
  board_id UUID,                     -- ボード関連の場合
  
  -- タイムスタンプ
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- インデックス用
  date_key DATE GENERATED ALWAYS AS (DATE(created_at)) STORED
);

-- インデックス
CREATE INDEX idx_ai_usage_logs_user_date ON ai_usage_logs(user_id, date_key);
CREATE INDEX idx_ai_usage_logs_nest_date ON ai_usage_logs(nest_id, date_key);
CREATE INDEX idx_ai_usage_logs_feature ON ai_usage_logs(feature_type, created_at);
CREATE INDEX idx_ai_usage_logs_provider ON ai_usage_logs(provider, created_at);
```

#### `ai_usage_summaries` テーブル (集計用)
```sql
CREATE TABLE ai_usage_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nest_id UUID REFERENCES nests(id) ON DELETE CASCADE,
  
  -- 集計期間
  period_type VARCHAR(10) NOT NULL,  -- 'daily', 'weekly', 'monthly'
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- 集計データ
  total_tokens INTEGER NOT NULL DEFAULT 0,
  total_cost_usd DECIMAL(10, 4) NOT NULL DEFAULT 0.0,
  feature_breakdown JSONB NOT NULL DEFAULT '{}',
  provider_breakdown JSONB NOT NULL DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, nest_id, period_type, period_start)
);
```

### 1.2 サービス実装

#### `AIUsageLogger` サービス
```typescript
interface AIUsageLogEntry {
  userId: string;
  nestId?: string;
  featureType: AIFeatureType;
  provider: 'openai' | 'gemini';
  model: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
  requestMetadata?: any;
  responseMetadata?: any;
  chatRoomId?: string;
  meetingId?: string;
  boardId?: string;
}

type AIFeatureType = 
  | 'chat_analysis'
  | 'meeting_summary' 
  | 'card_extraction'
  | 'embedding'
  | 'relationship_analysis';
```

### 1.3 コスト計算モジュール

#### 料金表 (2024年3月時点)
```typescript
const AI_PRICING = {
  openai: {
    'gpt-4o': {
      inputCostPer1K: 0.005,   // $0.005 per 1K input tokens
      outputCostPer1K: 0.015,  // $0.015 per 1K output tokens
    },
    'text-embedding-3-small': {
      inputCostPer1K: 0.00002, // $0.00002 per 1K tokens
      outputCostPer1K: 0,
    },
    'whisper-1': {
      costPerMinute: 0.006,    // $0.006 per minute
    }
  },
  gemini: {
    'gemini-1.5-pro-latest': {
      inputCostPer1K: 0.0035,  // $0.0035 per 1K input tokens
      outputCostPer1K: 0.0105, // $0.0105 per 1K output tokens
    },
    'text-embedding-004': {
      inputCostPer1K: 0.0001,  // $0.0001 per 1K tokens
      outputCostPer1K: 0,
    }
  }
};
```

### 1.4 既存AI機能への統合

以下の関数にログ機能を追加：

1. **OpenAIProvider**
   - `generateSummary()`
   - `analyzeChat()`
   - `extractCards()`
   - `generateEmbedding()`

2. **GeminiProvider**
   - 同上

3. **AIProviderManager**
   - すべてのAI呼び出しを中継してログを記録

### 1.5 UI実装

#### アクティビティログページ拡張
- **AIUsageTab**: 新しいタブとして追加
- **使用量サマリー**: 当日/今月の統計表示  
- **詳細ログ**: 時系列でのAI使用履歴
- **コスト表示**: 推定料金の表示

#### ヘッダーでの使用量表示
- **進捗バー**: 月間クォータの使用率
- **アラート**: 80%/95%到達時の警告

## Phase 2: 予算・課金管理機能 (将来実装)

### 2.1 ユーザープラン管理

#### `user_subscription_plans` テーブル
```sql
CREATE TABLE user_subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  plan_type VARCHAR(20) NOT NULL,    -- 'free', 'basic', 'professional', 'enterprise'
  monthly_token_quota INTEGER NOT NULL,
  current_period_usage INTEGER NOT NULL DEFAULT 0,
  
  billing_cycle_start DATE NOT NULL,
  billing_cycle_end DATE NOT NULL,
  
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active', 'suspended', 'cancelled'
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id)
);
```

### 2.2 課金プラン設計

| プラン | 月額料金 | トークン上限 | 機能制限 |
|--------|----------|-------------|----------|
| **Free** | $0 | 5,000 tokens | 基本AI機能のみ |
| **Basic** | $9.99 | 25,000 tokens | 全AI機能利用可能 |
| **Professional** | $29.99 | 100,000 tokens | 優先処理・高度分析 |
| **Enterprise** | カスタム | カスタム | 専用サポート・API |

### 2.3 予算管理機能

#### 使用量制限
- **プラン別クォータ**: 月間トークン数制限
- **機能別制限**: 高コスト機能の回数制限
- **NEST別予算**: チーム内でのAI使用量配分

#### アラート・通知
- **使用量警告**: 80%, 95%到達時
- **オーバーエイジ**: 上限超過時の通知・制限
- **コスト予測**: 月末コスト予想の通知

### 2.4 ビジネス分析

#### 分析ダッシュボード
- **収益分析**: プラン別売上、ARPU
- **使用量分析**: 機能別利用率、コスト効率
- **ユーザー行動**: チャーン予測、アップグレード予兆

#### データエクスポート
- **請求書生成**: 月次利用明細
- **分析レポート**: 使用パターン分析
- **API連携**: 外部BI/会計システム

## 実装優先度とマイルストーン

### Milestone 1: 基本ログ機能 (今回)
- [ ] データベーススキーマ作成
- [ ] AIUsageLoggerサービス実装
- [ ] 既存AI機能への統合
- [ ] 基本UI実装 (Activity画面)

### Milestone 2: コスト追跡 (1-2週間後)
- [ ] コスト計算モジュール
- [ ] リアルタイムコスト表示
- [ ] 使用量ダッシュボード

### Milestone 3: 予算管理 (1-2ヶ月後)
- [ ] プラン管理システム
- [ ] 使用量制限機能
- [ ] アラート・通知システム

### Milestone 4: 課金システム (3-6ヶ月後)
- [ ] 決済システム連携 (Stripe等)
- [ ] 請求書生成
- [ ] プラン変更・解約機能

## 技術考慮事項

### パフォーマンス
- **バッチ処理**: 大量ログの非同期処理
- **データ保持**: 古いログの自動アーカイブ
- **キャッシュ**: 使用量サマリーのメモリキャッシュ

### セキュリティ
- **データ暗号化**: 機密情報の暗号化保存
- **アクセス制御**: ユーザー/NEST別データ分離
- **監査ログ**: システム操作の追跡

### 拡張性
- **マルチテナント**: 企業プラン対応
- **API提供**: 外部システム連携
- **カスタム料金**: 大口顧客向け個別料金

## リスク管理

### 技術リスク
- **API料金変動**: プロバイダー料金改定への対応
- **使用量予測**: 不正確なコスト見積もり
- **システム負荷**: 大量ログ処理のパフォーマンス

### ビジネスリスク
- **ユーザー離脱**: 料金制導入による解約
- **競合対応**: 他社料金との競争力
- **規制対応**: AI利用に関する法規制

---

**更新履歴**
- 2024-03-15: 初版作成
- 今後の更新は実装進捗に応じて追記 