# トレンドインサイト機能 実装計画書

## プロジェクト概要

**目的**: Design Radar - 製品発見・分析システムをPoconestプロジェクト内に統合  
**アプローチ**: オプションA - 独立した製品発見・分析スペースとして実装  
**開始日**: 2025-11-02  
**推定期間**: 4週間

## コンセプト

チーム協業ツールPoconestに、デザイン製品やトレンドを自動収集・分析・蓄積する機能を追加。AIによる深掘り調査と定期的なインサイトレポート生成により、チームがトレンドを見逃さない仕組みを提供。

## デザインシステム仕様

### カラーパレット（Poconest統一仕様）

```css
/* 背景色 */
--bg-primary: #0f0f23;      /* メイン背景 */
--bg-secondary: #1a1a2e;    /* カード・パネル背景 */
--bg-tertiary: #333366;     /* ボタン・タブ背景 */
--bg-quaternary: #45475a;   /* ホバー状態 */

/* テキスト色 */
--text-primary: #e2e8f0;    /* メインテキスト */
--text-secondary: #a6adc8;  /* セカンダリテキスト */
--text-faded: #6c7086;      /* フェードテキスト・メタ情報 */

/* アクセント色 */
--primary-green: #00ff88;   /* プライマリアクション */
--primary-blue: #64b5f6;    /* セカンダリアクション */
--primary-orange: #ffa500;  /* 警告・注意 */
--primary-red: #ff6b6b;     /* エラー・危険 */

/* ボーダー */
--border-primary: #333366;
--border-secondary: #45475a;

/* フォント */
--font-primary: 'Space Grotesk', sans-serif;
--font-mono: 'JetBrains Mono', monospace;
```

### タイポグラフィ

```css
/* 見出し */
h1: 28px, 700, #00ff88, Space Grotesk, uppercase, letter-spacing: 2px
h2: 18px, 600, #64b5f6, Space Grotesk
h3: 14px, 600, #e2e8f0, Space Grotesk

/* 本文 */
body: 13px, 400, #a6adc8, Space Grotesk, line-height: 1.4
small: 11px, 500, #6c7086, Space Grotesk

/* コード・メタ */
mono: 10px, 500, #6c7086, JetBrains Mono, uppercase
```

### コンポーネントスタイル

**カード**
```css
background: #1a1a2e
border: 1px solid #333366
border-radius: 4px
padding: 20px
transition: all 0.2s ease

hover:
  border-color: #45475a
  transform: translateY(-1px)
```

**ボタン**
```css
primary:
  background: #00ff88
  color: #0f0f23
  border: 1px solid #00ff88
  
secondary:
  background: #1a1a2e
  color: #e2e8f0
  border: 1px solid #333366
  
hover:
  background: #333366
  transform: translateY(-1px)
```

**タグ・バッジ**
```css
background: #333366
color: #a6adc8
padding: 2px 6px
border-radius: 2px
font-size: 10px
font-weight: 500
text-transform: uppercase
font-family: 'JetBrains Mono'
```

## データベーススキーマ

### products テーブル
```sql
CREATE TABLE trend_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nest_id UUID NOT NULL REFERENCES nests(id) ON DELETE CASCADE,
  
  -- 基本情報
  title_original TEXT NOT NULL,
  title_ja TEXT NOT NULL,
  url TEXT NOT NULL,
  summary_ja TEXT,
  
  -- スコアリング (0-10点)
  score_concept_shift DECIMAL(3,1) DEFAULT 0,
  score_category_disruption DECIMAL(3,1) DEFAULT 0,
  score_philosophical_pricing DECIMAL(3,1) DEFAULT 0,
  score_experience_change DECIMAL(3,1) DEFAULT 0,
  score_total DECIMAL(4,1) GENERATED ALWAYS AS (
    score_concept_shift + 
    score_category_disruption + 
    score_philosophical_pricing + 
    score_experience_change
  ) STORED,
  
  -- メタデータ
  category TEXT,
  brand_designer TEXT,
  price_value TEXT,
  release_date DATE,
  
  -- ステータス管理
  status TEXT DEFAULT '新着' CHECK (status IN ('新着', '調査中(L1)', '調査中(L2)', '調査中(L3)', '完了', '除外')),
  reason_text TEXT,
  
  -- タイムスタンプ
  discovered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  created_by UUID REFERENCES auth.users(id),
  
  CONSTRAINT valid_scores CHECK (
    score_concept_shift >= 0 AND score_concept_shift <= 10 AND
    score_category_disruption >= 0 AND score_category_disruption <= 10 AND
    score_philosophical_pricing >= 0 AND score_philosophical_pricing <= 10 AND
    score_experience_change >= 0 AND score_experience_change <= 10
  )
);

CREATE INDEX idx_trend_products_nest ON trend_products(nest_id);
CREATE INDEX idx_trend_products_status ON trend_products(status);
CREATE INDEX idx_trend_products_score ON trend_products(score_total DESC);
CREATE INDEX idx_trend_products_discovered ON trend_products(discovered_at DESC);
```

### investigations テーブル
```sql
CREATE TABLE trend_investigations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES trend_products(id) ON DELETE CASCADE,
  
  level INT NOT NULL CHECK (level IN (1, 2, 3)),
  result_text TEXT NOT NULL,
  
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  duration_seconds INT,
  
  UNIQUE(product_id, level)
);

CREATE INDEX idx_trend_investigations_product ON trend_investigations(product_id);
```

### insights テーブル
```sql
CREATE TABLE trend_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nest_id UUID NOT NULL REFERENCES nests(id) ON DELETE CASCADE,
  
  period_type TEXT NOT NULL CHECK (period_type IN ('月次', '四半期', 'カスタム')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  report_content TEXT NOT NULL,
  
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  generated_by TEXT DEFAULT 'AI'
);

CREATE INDEX idx_trend_insights_nest ON trend_insights(nest_id);
CREATE INDEX idx_trend_insights_period ON trend_insights(period_start DESC);
```

### user_notes テーブル
```sql
CREATE TABLE trend_user_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES trend_products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  
  note_content TEXT NOT NULL,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_trend_user_notes_product ON trend_user_notes(product_id);
CREATE INDEX idx_trend_user_notes_user ON trend_user_notes(user_id);
```

## 実装ステップ詳細

### Week 1: 基盤構築 ✅ 進行中

#### Day 1-2: データベースとルーティング
- [x] ドキュメント作成
- [ ] データベーススキーマ作成・マイグレーション実行
- [ ] Supabaseポリシー設定（RLS）
- [ ] ルーティング設定（`/trend-insights`）
- [ ] アイコン作成（trending-upは完了）

#### Day 3-4: 基本UIコンポーネント
- [ ] TrendInsightsSpace.tsx 再実装（デザインシステム準拠）
- [ ] 製品リストビュー（カードグリッド）
- [ ] フィルターバー実装
- [ ] 空状態の表示

#### Day 5-7: データ表示と基本操作
- [ ] サンプルデータ投入
- [ ] 製品カードコンポーネント
- [ ] スコア表示UI
- [ ] ソート・フィルター機能

**Week 1 完了基準**:
- トレンドインサイトスペースが表示される
- サンプル製品データがカード型で表示される
- フィルター・ソートが動作する
- デザインが既存スペースと統一されている

### Week 2: データ収集とAI統合 ✅ 完了

#### Day 8-10: RSS収集システム
- [x] Supabase Edge Function作成（RSS収集）
- [x] 情報源設定（Dezeen, Yanko Design）
- [x] 収集データのパース処理
- [x] UI統合（手動収集ボタン、進捗表示）
- [ ] 日次cron設定（次フェーズで実装予定）

#### Day 11-12: AIスコアリング
- [x] OpenAI API統合
- [x] スコアリングプロンプト作成
- [x] スコア自動計算機能（4軸評価）
- [x] 該当理由生成

#### Day 13-14: 段階的調査システム
- [x] Level 1調査（基本情報）実装
- [x] Level 2調査（文脈と背景）実装
- [x] Level 3調査（深層分析）実装
- [x] 製品詳細モーダル実装
- [x] 調査結果のアコーディオン表示

**Week 2 完了基準**: ✅
- RSS収集が手動実行できる
- AIスコアリングが動作する
- 手動で調査トリガーができる
- 調査結果が製品詳細に表示される

**実装済みファイル**:
- `/supabase/functions/collect-trend-products/index.ts` - RSS収集Edge Function
- `/supabase/functions/investigate-product/index.ts` - 段階的調査Edge Function
- `/src/features/trend-insights/services/TrendCollectionService.ts` - 収集サービス
- `/src/features/trend-insights/services/TrendInvestigationService.ts` - 調査サービス
- `/src/features/trend-insights/components/ProductDetailModal.tsx` - 製品詳細モーダル

### Week 3: インサイト生成と詳細ページ

#### Day 15-17: 製品詳細ページ ✅ 完了
- [x] 詳細ページレイアウト
- [x] スコア詳細表示
- [x] 調査タイムライン（アコーディオン）
- [x] ユーザーメモ機能
- [x] 関連製品表示

#### Day 18-19: パターン検出 ✅ 完了
- [x] ブランド/デザイナー分析（SQLビュー + サービス実装）
- [x] カテゴリー傾向分析（SQLビュー + サービス実装）
- [x] 時系列トレンド分析（週次・月次ビュー）
- [x] パターン検出UI実装
- [x] 分析結果キャッシュシステム（`trend_analysis_cache`テーブル）
- [x] 分析実行と結果ロードの分離

#### Day 20-21: 月次レポート生成
- [ ] レポート生成AIプロンプト
- [ ] 統計データ集計
- [ ] レポート表示UI
- [ ] ダッシュボード統計

**Week 3 完了基準**:
- 製品詳細ページが完全に機能する
- 月次レポートが自動生成される
- ダッシュボードに統計が表示される
- パターン検出が動作する

### Week 4: 最適化とポリッシュ

#### Day 22-24: UI/UX改善
- [ ] アニメーション追加
- [ ] レスポンシブ対応
- [ ] ローディング状態改善
- [ ] エラーハンドリング強化

#### Day 25-26: 通知システム
- [ ] 新製品通知
- [ ] 調査完了通知
- [ ] 週次ダイジェスト
- [ ] 月次レポート通知

#### Day 27-28: 最終調整
- [ ] パフォーマンス最適化
- [ ] バグ修正
- [ ] ドキュメント更新
- [ ] デモデータ準備

**Week 4 完了基準**:
- すべての機能が安定動作する
- 通知システムが機能する
- パフォーマンスが良好
- ドキュメントが完備

## ファイル構造

```
src/
├── features/
│   └── trend-insights/
│       ├── components/
│       │   ├── TrendInsightsSpace.tsx          # メイン画面
│       │   ├── ProductCard.tsx                 # 製品カード
│       │   ├── ProductDetailView.tsx           # 製品詳細
│       │   ├── FilterBar.tsx                   # フィルターバー
│       │   ├── ScoreDisplay.tsx                # スコア表示
│       │   ├── InvestigationTimeline.tsx       # 調査タイムライン
│       │   ├── MonthlyReportView.tsx           # 月次レポート
│       │   └── DashboardStats.tsx              # ダッシュボード統計
│       ├── contexts/
│       │   └── TrendInsightsContext.tsx        # 状態管理
│       ├── hooks/
│       │   ├── useTrendProducts.ts             # 製品データフック
│       │   ├── useInvestigations.ts            # 調査管理フック
│       │   └── useInsights.ts                  # インサイトフック
│       ├── services/
│       │   ├── TrendProductService.ts          # 製品CRUD
│       │   ├── AIAnalysisService.ts            # AI分析
│       │   ├── RSSCollectorService.ts          # RSS収集
│       │   └── InsightGeneratorService.ts      # レポート生成
│       └── types/
│           └── trend-insights.types.ts         # 型定義
├── services/
│   └── openai.ts                               # OpenAI共通設定
└── App.tsx                                     # ルーティング追加

supabase/
├── migrations/
│   └── 20251102_create_trend_insights_tables.sql
└── functions/
    ├── rss-collector/
    │   └── index.ts                            # RSS収集Function
    └── ai-scorer/
        └── index.ts                            # AIスコアリングFunction

docs/
├── trend-insights-implementation-plan.md       # 本ファイル
├── trend-insights-api.md                       # API仕様
└── trend-insights-user-guide.md                # ユーザーガイド
```

## API仕様（概要）

### REST API
```typescript
GET    /api/trend-products?nestId={id}          // 製品一覧
GET    /api/trend-products/{id}                 // 製品詳細
POST   /api/trend-products                      // 製品作成
PUT    /api/trend-products/{id}                 // 製品更新
DELETE /api/trend-products/{id}                 // 製品削除

POST   /api/trend-investigations/{productId}    // 調査実行
GET    /api/trend-insights?nestId={id}          // インサイト一覧
POST   /api/trend-insights/generate             // レポート生成
```

### Supabase Edge Functions
```typescript
POST /functions/v1/rss-collector                // RSS収集実行
POST /functions/v1/ai-scorer                    // AIスコアリング実行
```

## テスト計画

### Unit Tests
- [ ] TrendProductService CRUD操作
- [ ] AIAnalysisService スコアリング
- [ ] フィルター・ソートロジック

### Integration Tests
- [ ] RSS収集 → DB保存フロー
- [ ] AIスコアリング → 製品更新フロー
- [ ] 調査実行 → 結果表示フロー

### E2E Tests
- [ ] 製品一覧表示
- [ ] フィルター操作
- [ ] 製品詳細閲覧
- [ ] 調査トリガー
- [ ] レポート閲覧

## リスクと対策

### リスク1: AI APIコスト超過
**対策**: 
- スコアリングはキャッシュ活用
- 調査レベルは手動トリガー優先
- トークン数制限を設定

### リスク2: RSS収集の不安定性
**対策**:
- リトライ機構（3回まで）
- エラーログ記録
- 手動収集バックアップ

### リスク3: データ量増加
**対策**:
- ページネーション実装
- 古いデータのアーカイブ
- インデックス最適化

## 成功指標

1. **機能完成度**: すべての主要機能が動作
2. **デザイン統一性**: 既存スペースとの完全な一貫性
3. **パフォーマンス**: 製品リスト表示 < 2秒
4. **ユーザビリティ**: 直感的な操作フロー
5. **自動化**: RSS収集・スコアリングが無人で動作

## 次のステップ

1. ✅ 本ドキュメント作成
2. 🔄 仮実装の削除
3. ⏭️ Week 1 Day 1-2 開始（データベースセットアップ）

