# ポコの巣 MLP詳細設計

## データモデル

### ユーザーモデル
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_seen_at TIMESTAMP WITH TIME ZONE
);
```

### チャットメッセージモデル
```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_read BOOLEAN DEFAULT FALSE,
  has_pinned_to_board BOOLEAN DEFAULT FALSE
);
```

### ボードアイテムモデル
```sql
CREATE TYPE board_column AS ENUM ('inbox', 'insights', 'zoom');

CREATE TABLE board_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content TEXT NOT NULL,
  column_type board_column NOT NULL,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  source_message_id UUID REFERENCES messages(id),
  metadata JSONB
);
```

### Zoom連携モデル
```sql
CREATE TABLE zoom_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  topic TEXT NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  duration INTEGER NOT NULL, -- 分単位
  participants JSONB,
  recording_drive_url TEXT, -- Google Driveの共有URL
  recording_drive_id TEXT,  -- Google DriveのファイルID
  uploaded_by UUID NOT NULL REFERENCES users(id),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  tags TEXT[],
  board_item_id UUID REFERENCES board_items(id),
  metadata JSONB -- 将来的なフィールド拡張用
);
```

## API設計

### 認証API
- `POST /auth/signin` - メールアドレス認証
- `POST /auth/signout` - ログアウト
- `GET /auth/user` - 現在のユーザー情報取得

### チャットAPI
- `GET /messages` - メッセージ一覧取得（ページネーション対応）
- `POST /messages` - メッセージ送信
- `PUT /messages/:id/read` - メッセージ既読化
- `POST /messages/:id/pin-to-board` - メッセージをボードに追加

### ボードAPI
- `GET /board-items` - ボードアイテム一覧取得（カラムフィルタ対応）
- `POST /board-items` - ボードアイテム作成
- `PUT /board-items/:id` - ボードアイテム更新
- `PUT /board-items/:id/move` - ボードアイテムのカラム移動
- `DELETE /board-items/:id` - ボードアイテム削除

### Zoom連携API
- `GET /zoom-sessions` - Zoomセッション一覧取得
- `POST /zoom-sessions` - Zoomセッション情報追加（メタデータのみ）
- `PUT /zoom-sessions/:id` - Zoomセッション情報更新
- `POST /zoom-sessions/:id/add-drive-link` - Google Driveリンク追加
- `POST /zoom-sessions/:id/add-to-board` - ボードアイテムとして追加

## セキュリティ設計

### Row Level Security (RLS) ポリシー
```sql
-- ユーザーは自分自身のデータのみ閲覧可能
CREATE POLICY users_policy ON users
  USING (id = auth.uid() OR id IN (SELECT friend_id FROM user_friends WHERE user_id = auth.uid()));

-- メッセージは会話参加者のみ閲覧可能
CREATE POLICY messages_policy ON messages
  USING (sender_id = auth.uid() OR auth.uid() IN (SELECT 
    CASE WHEN sender_id = user_pair.user1_id THEN user_pair.user2_id
         ELSE user_pair.user1_id END
    FROM user_pair
    WHERE sender_id IN (user_pair.user1_id, user_pair.user2_id)
  ));

-- ボードアイテムは同じペアのユーザーのみ閲覧可能
CREATE POLICY board_items_policy ON board_items
  USING (created_by = auth.uid() OR auth.uid() IN (SELECT 
    CASE WHEN created_by = user_pair.user1_id THEN user_pair.user2_id
         ELSE user_pair.user1_id END 
    FROM user_pair
    WHERE created_by IN (user_pair.user1_id, user_pair.user2_id)
  ));

-- Zoomセッションは同じペアのユーザーのみ閲覧可能
CREATE POLICY zoom_sessions_policy ON zoom_sessions
  USING (uploaded_by = auth.uid() OR auth.uid() IN (SELECT 
    CASE WHEN uploaded_by = user_pair.user1_id THEN user_pair.user2_id
         ELSE user_pair.user1_id END 
    FROM user_pair
    WHERE uploaded_by IN (user_pair.user1_id, user_pair.user2_id)
  ));
```

## UI/UX設計

### タブ構成
MLPではシンプルに2つのタブのみに絞る：
1. 💬 **Chat** - 1:1チャット画面
2. 🗂️ **Board** - 3カラムのボード画面（Inbox / Insights / Zoom）

### チャット画面
- シンプルなチャットバブルUI
- 入力フィールド + 送信ボタン
- メッセージ長押しでアクションメニュー表示（ボードに保存など）
- メッセージの既読ステータス表示

### ボード画面
- 3カラム表示（Inbox / Insights / Zoom）
- カード形式のアイテム表示
- ドラッグ&ドロップでカラム間移動
- 長押しでカードアクション表示（編集・削除）
- Zoomカラムには特別なアイコンとメタデータ表示

### クイックメモ機能
- 画面右下に常駐する浮動アクションボタン（FAB）
- タップでシンプルなメモ入力モーダル表示
- 保存先カラム選択肢（デフォルトはInbox）
- 音声入力オプション

### Zoom連携機能（Phase 1簡易版）
- ボード画面のZoomカラムに「+」ボタン
- タップでZoomセッション情報入力フォーム
  - トピック
  - 日時
  - 参加者（簡易入力）
  - Google Driveリンク（録画ファイル参照用）
  - タグ付け
  - 簡易メモ
- Google Drive連携
  - 既にDriveにアップロード済みの録画URLを入力
  - 共有設定確認
- プレビュー表示（サムネイルとインライン再生）

### アニメーション要素
- チャットメッセージ送信時のポコアニメーション（シンプル版）
- FABタップ時の展開アニメーション
- ボードカード移動時の軽いバウンスエフェクト
- Zoomセッション追加時の特別アニメーション

## テクニカルアーキテクチャ

### フロントエンド
- **フレームワーク**: React Native + Expo
- **状態管理**: Redux Toolkit
- **API通信**: React Query
- **UI要素**: React Native Paper
- **アニメーション**: React Native Reanimated
- **外部連携**: Google Drive SDK（閲覧・共有機能）

### バックエンド
- **サーバー**: Supabase
- **データベース**: PostgreSQL
- **認証**: Supabase Auth
- **リアルタイム**: Supabase Realtime
- **ストレージ**: 大容量ファイルはGoogle Drive参照、サムネイル等の小サイズデータのみSupabase Storage

### クライアント-サーバー連携
- REST APIによる基本データ操作
- Websocketによるリアルタイムメッセージング
- JWT認証トークンによるセキュリティ
- Google Drive APIによる外部ファイル参照

## パフォーマンス目標
- アプリ起動→チャット表示: ≤ 2秒
- メッセージ送信レイテンシ: ≤ 0.5秒
- FAB→メモ入力モーダル表示: ≤ 0.3秒
- メモ作成→Board反映: ≤ 1秒
- Zoom情報入力→表示: ≤ 2秒
- Google Drive動画再生開始: ≤ 5秒

## テスト戦略
- **ユニットテスト**: 主要ロジックのみカバレッジ70%目標
- **E2Eテスト**: 主要ユースケース（認証・メッセージ送信・ボード操作・Zoom追加）
- **パフォーマンステスト**: 上記パフォーマンス目標の検証
- **ユーザビリティテスト**: 開発チーム2名による日常的な実使用

## デプロイ戦略
- Expo EASによるOTAアップデート
- TestFlightを活用した内部テスト配布
- Supabase環境は開発/本番の2環境構成 