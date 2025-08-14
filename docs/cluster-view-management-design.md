# クラスタービュー管理機能 設計・実装ドキュメント

**作成日**: 2025年1月2日  
**ステータス**: Phase 1 実装開始

## 📋 概要

分析スペース内でのクラスタリング結果の保存・管理・呼び出し機能の実装設計。
既存のクラスター表示UI/UXを完全に踏襲し、自然な形で保存・復元機能を統合する。

## 🎯 機能要件

### 核心要件
1. **保存機能**: 現在のクラスタリング結果を名前付きで保存
2. **一覧表示**: 保存済みクラスタービューの管理
3. **呼び出し機能**: 保存されたビューの完全復元
4. **左下表示**: 既存のクラスター表示領域との完全互換性
5. **グランデッドセオリー連携**: 復元されたクラスターでの分析継続

### UI/UX要件
- **既存UI踏襲**: 現在の左下フィルター領域表示を完全再現
- **自然な統合**: クラスタリング制御パネルへのタブ追加
- **一貫した操作感**: 作成時と復元時で同じUI体験

## 🏗️ アーキテクチャ設計

### データ構造

#### SavedClusterView インターフェース
```typescript
interface SavedClusterView {
  id: string;
  name: string;
  description?: string;
  boardId: string;
  nestId: string;
  
  // 🔑 既存のクラスター表示データをそのまま保存
  clusterLabels: ClusterLabel[];              // 左下表示用データ
  smartClusteringResult: ClusteringResult;    // 完全なクラスタリング結果
  filteredClusters: string[][];               // フィルタ済みクラスター
  
  // 描画・ビジュアル状態
  nodePositions: { [nodeId: string]: { x: number, y: number } };
  showFilteredClusters: boolean;
  showLabels: boolean;
  
  // メタデータ
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}
```

#### 既存型の活用
```typescript
// AnalysisService.ts の既存型をそのまま使用
interface ClusterLabel {
  id: string;
  text: string;                    // クラスター名・ラベル
  position: { x: number; y: number }; // 表示位置
  theme: string;                   // セマンティックテーマ
  confidence: number;              // 信頼度
  cardIds: string[];              // 所属カードID配列
  metadata: {
    dominantTags: string[];       // 支配的タグ
    dominantTypes: string[];      // 支配的タイプ
    cardCount: number;            // カード数
  };
}

// SmartClusteringService.ts の既存型
interface ClusteringResult {
  clusters: SmartCluster[];
  outliers: string[];
  quality: ClusterQualityMetrics;
  algorithm: string;
  parameters: ClusteringConfig;
  // ... 他のプロパティ
}
```

### データベース設計

```sql
CREATE TABLE cluster_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id TEXT NOT NULL,
  nest_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  
  -- クラスター表示データ（既存形式をJSONBで保存）
  cluster_labels JSONB NOT NULL,           -- ClusterLabel[]
  smart_clustering_result JSONB NOT NULL,  -- ClusteringResult
  filtered_clusters JSONB NOT NULL,        -- string[][]
  
  -- 描画・ビジュアル状態
  node_positions JSONB NOT NULL,           -- { [nodeId: string]: { x: number, y: number } }
  show_filtered_clusters BOOLEAN NOT NULL DEFAULT true,
  show_labels BOOLEAN NOT NULL DEFAULT true,
  
  -- メタデータ
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by TEXT NOT NULL,
  
  -- インデックス用
  FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
);

-- インデックス
CREATE INDEX idx_cluster_views_board_id ON cluster_views(board_id);
CREATE INDEX idx_cluster_views_nest_id ON cluster_views(nest_id);
CREATE INDEX idx_cluster_views_created_at ON cluster_views(created_at DESC);
```

## 🎨 UI設計

### クラスタリング制御パネルの拡張

#### 現在
```
┌─ クラスタリング制御パネル ────────────────┐
│ [シンプル] [高度解析 🔬]                  │
├─────────────────────────────────────────┤
│ (設定・実行パネル)                       │
└─────────────────────────────────────────┘
```

#### 拡張後
```
┌─ クラスタリング制御パネル ──────────────────────────┐
│ [シンプル] [高度解析 🔬] [保存済みビュー 📚] ← 🆕追加 │
├──────────────────────────────────────────────────┤
│ 📚 保存済みクラスタービュー                        │
│                                                  │
│ ┌─ UXパターン分析 ──────────────────────────────┐ │
│ │ 作成: 2024/01/15 | 3クラスター | 87%信頼度     │ │
│ │ [📊 表示] [✏️ 編集] [🗑 削除]                 │ │
│ └────────────────────────────────────────────┘ │
│ ┌─ 要件カテゴリ分析 ────────────────────────────┐ │
│ │ 作成: 2024/01/12 | 5クラスター | 92%信頼度     │ │
│ │ [📊 表示] [✏️ 編集] [🗑 削除]                 │ │
│ └────────────────────────────────────────────┘ │
│                                                  │
│ [+ 現在のクラスターを保存] ← 🆕 現在の状態を保存   │
└──────────────────────────────────────────────────┘
```

### 左下フィルター領域（変更なし）

**既存のクラスタータブUIをそのまま使用**:
- `ClusterLabel[]` 配列の表示
- クラスターカードUI
- アクションボタン（👁️ 詳細、🔍 ズーム、🗑️ 削除）
- **保存・復元で完全に同じ表示を再現**

## 🔄 機能フロー

### A. 保存フロー
```
1. 🎛️ Clustering パネル → 高度解析実行
2. smartClusteringResult が生成される
3. Auto Labels → clusterLabels が生成される
4. 左下フィルター領域（clusters タブ）に表示
   ↓
5. 🆕「このクラスターを保存」ボタン表示
6. ボタンクリック → 保存ダイアログ
7. 名前・説明入力 → 保存実行
8. 現在の全状態を SavedClusterView として保存
   - clusterLabels
   - smartClusteringResult  
   - filteredClusters
   - nodePositions
   - 表示状態
```

### B. 呼び出しフロー
```
1. 🎛️ Clustering パネル → 保存済みビュータブ
2. ビューリスト表示・選択
3. 「📊 表示」ボタンクリック
   ↓
4. SavedClusterView を読み込み
5. 既存状態を完全復元:
   - setClusterLabels(saved.clusterLabels)
   - setSmartClusteringResult(saved.smartClusteringResult)
   - setFilteredClusters(saved.filteredClusters)
   - setNodePositions(saved.nodePositions)
   - 表示状態復元
   ↓
6. 左下フィルター領域に同じ表示が復活
7. setActiveFilterTab('clusters') で自動切替
8. グラウンデッド・セオリー分析ボタンが有効化
```

## 🛠️ 実装計画

### Phase 1: 基本保存・読み込み機能 【開始】

#### 1.1 データベース設計
- [x] `cluster_views` テーブル作成 ✅
- [x] マイグレーションファイル作成 ✅
- [x] インデックス設定 ✅

#### 1.2 サービス層実装
- [x] `ClusterViewService` クラス作成 ✅
- [x] 基本CRUD操作実装 ✅
  - `saveClusterView()` ✅
  - `getClusterViews()` ✅
  - `getClusterView()` ✅
  - `deleteClusterView()` ✅

#### 1.3 UI実装
- [x] `analysisMode` 型拡張 ('saved-views' 追加) ✅
- [x] 保存済みビュータブ追加 ✅
- [x] 「現在のクラスターを保存」ボタン追加 ✅
- [x] 保存ダイアログコンポーネント ✅
- [x] ビューリスト表示コンポーネント ✅

#### 1.4 状態管理
- [x] 保存・読み込み関数実装 ✅
- [x] 既存状態との統合 ✅
- [x] エラーハンドリング ✅

### Phase 2: 管理・編集機能

#### 2.1 編集機能
- [ ] ビュー名・説明の編集
- [ ] 編集ダイアログ実装
- [ ] 更新処理

#### 2.2 削除機能
- [ ] 削除確認ダイアログ
- [ ] 削除処理実装

#### 2.3 UX向上
- [ ] プレビュー機能
- [ ] 検索・フィルタ機能
- [ ] ソート機能

### Phase 3: 拡張機能

#### 3.1 共有・コラボレーション
- [ ] ビューの共有機能
- [ ] 権限管理
- [ ] チーム内での可視性制御

#### 3.2 エクスポート・インポート
- [ ] JSON形式でのエクスポート
- [ ] 他ボードへのインポート
- [ ] バックアップ機能

#### 3.3 自動化・履歴
- [ ] 自動保存機能
- [ ] 変更履歴管理
- [ ] テンプレート機能

## 🔧 技術仕様

### ファイル構成
```
src/
├── services/
│   └── ClusterViewService.ts          # 🆕 メインサービス
├── types/
│   └── clusterView.ts                 # 🆕 型定義
├── features/nest-space/analysis-space/components/
│   ├── NetworkVisualization.tsx       # 📝 拡張
│   ├── ClusterViewManager.tsx         # 🆕 ビュー管理
│   └── SaveClusterDialog.tsx          # 🆕 保存ダイアログ
└── supabase/migrations/
    └── xxxx_create_cluster_views.sql  # 🆕 マイグレーション
```

### 依存関係
- **既存**: `ClusterLabel`, `ClusteringResult`, `SmartCluster`
- **新規**: Supabase, React状態管理
- **UI**: 既存テーマ・スタイルシステム

## 🎯 成功指標

### 機能指標
- [ ] 保存・復元時の状態完全一致
- [ ] 左下表示UI の完全再現
- [ ] グラウンデッド・セオリー分析の継続実行
- [ ] エラー率 < 1%

### UX指標
- [ ] 既存操作との一貫性
- [ ] 保存・読み込み時間 < 2秒
- [ ] 直感的な操作フロー
- [ ] ユーザビリティテスト通過

## 📚 参考資料

### 既存実装ファイル
- `src/services/AnalysisService.ts` - ClusterLabel 型定義
- `src/services/SmartClusteringService.ts` - ClusteringResult 型定義
- `src/features/nest-space/analysis-space/components/NetworkVisualization.tsx` - 既存UI実装

### 関連ドキュメント
- `docs/STATISTICAL_CLUSTERING_APPROACH.md` - クラスタリング手法
- `docs/IMPLEMENTATION_ROADMAP.md` - 全体実装計画

---

**📝 更新履歴**
- 2025/01/02: 初回作成・Phase 1 設計完了
