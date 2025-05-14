# PocoNest 認証・ワークスペース要求仕様書

## 1. ワークスペース (Nest) の基本構造

### 1.1 Nest の概念定義
- **名称**: 「ワークスペース」の代わりに「Nest（巣）」という名称を採用
- **コンセプト**: 「秘密の巣穴」「親密な対話の場」「知識が育つ環境」
- **基本的な特性**:
  - プライベートな対話空間
  - 知識の蓄積・成長の場
  - 招待制のクローズド環境

### 1.2 Nest の権限構造
- **オーナー**: 
  - Nest の作成者
  - メンバー招待・削除権限
  - 設定変更権限
  - コンテンツの完全な管理権限
- **メンバー**:
  - 招待を受けて参加したユーザー
  - コンテンツの閲覧・編集権限
  - 制限付きの設定閲覧権限
  - 招待権限なし（初期設計では）

### 1.3 Nest の複数所有と切り替え
- **Nest 一覧**:
  - ユーザーが所有または参加している Nest の一覧
  - 最近使用した Nest の履歴
- **Nest 切り替え機能**:
  - ユーザーが複数の Nest 間を切り替え可能
  - 最後に使用した Nest が次回起動時のデフォルト
- **Nest コンテキストの保持**:
  - Nest ごとのコンテキスト保持
  - Nest 固有のコンテンツとデータの分離

## 2. 認証システム要件

### 2.1 ユーザー認証
- **認証方法**:
  - メールアドレスとパスワードによる認証（基本）
  - ソーシャルログインの検討（後期開発フェーズ）
- **多要素認証**:
  - 機密性を考慮したセキュアな認証方式
  - オプションとしての多要素認証（MLPでは優先度低）
- **ユーザー固有情報**:
  - プロフィール設定（名前、アイコン）
  - 所属 Nest 一覧
  - 個人設定と環境設定

### 2.2 Nest アクセス管理
- **招待フロー**:
  - オーナーによるメール招待
  - 招待リンクの発行と有効期限設定
  - 招待受け入れプロセス
- **アクセス制御**:
  - Row Level Security (RLS) による厳格なアクセス制御
  - Nest ごとのデータ分離
  - ユーザーロールに基づく権限管理

### 2.3 セッション管理
- **認証状態の永続化**:
  - デバイス間でのセッション共有
  - リフレッシュトークンによる安全な認証維持
- **セッションのセキュリティ**:
  - 不正アクセス検知
  - アイドル時のセッションタイムアウト（オプション）
  - デバイス管理と不要なセッションの取り消し

## 3. データモデル設計

### 3.1 コアエンティティ
- **Users**:
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

- **Nests (新規)**:
  ```sql
  CREATE TABLE nests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    owner_id UUID NOT NULL REFERENCES users(id),
    settings JSONB,
    is_active BOOLEAN DEFAULT TRUE
  );
  ```

- **Nest_Members (新規)**:
  ```sql
  CREATE TABLE nest_members (
    nest_id UUID REFERENCES nests(id),
    user_id UUID REFERENCES users(id),
    role TEXT NOT NULL, -- 'owner' or 'member'
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_active_at TIMESTAMP WITH TIME ZONE,
    PRIMARY KEY (nest_id, user_id)
  );
  ```

### 3.2 コンテンツエンティティ（Nest固有）
- **Messages**:
  ```sql
  CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nest_id UUID NOT NULL REFERENCES nests(id), -- Nest 固有
    sender_id UUID NOT NULL REFERENCES users(id),
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_read BOOLEAN DEFAULT FALSE,
    has_pinned_to_board BOOLEAN DEFAULT FALSE
  );
  ```

- **Board Items**:
  ```sql
  CREATE TYPE board_column AS ENUM ('inbox', 'insights', 'themes', 'zoom');

  CREATE TABLE board_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nest_id UUID NOT NULL REFERENCES nests(id), -- Nest 固有
    content TEXT NOT NULL,
    column_type board_column NOT NULL,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    source_message_id UUID REFERENCES messages(id),
    metadata JSONB
  );
  ```

- **Zoom_Sessions**:
  ```sql
  CREATE TABLE zoom_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nest_id UUID NOT NULL REFERENCES nests(id), -- Nest 固有
    topic TEXT NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    duration INTEGER NOT NULL,
    participants JSONB,
    recording_drive_url TEXT,
    recording_drive_id TEXT,
    uploaded_by UUID NOT NULL REFERENCES users(id),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT,
    tags TEXT[],
    board_item_id UUID REFERENCES board_items(id),
    metadata JSONB
  );
  ```

### 3.3 Nest 関連設定とメタデータ
- **Nest_Settings (新規)**:
  ```sql
  CREATE TABLE nest_settings (
    nest_id UUID PRIMARY KEY REFERENCES nests(id),
    theme TEXT DEFAULT 'default',
    notification_settings JSONB,
    privacy_settings JSONB,
    custom_emojis JSONB,
    metadata JSONB
  );
  ```

- **User_Nest_Preferences (新規)**:
  ```sql
  CREATE TABLE user_nest_preferences (
    user_id UUID REFERENCES users(id),
    nest_id UUID REFERENCES nests(id),
    notification_preferences JSONB,
    ui_preferences JSONB,
    last_viewed_board_column board_column,
    PRIMARY KEY (user_id, nest_id)
  );
  ```

## 4. セキュリティ設計

### 4.1 Row Level Security (RLS) ポリシー
- **Nests テーブル**:
  ```sql
  CREATE POLICY nests_policy ON nests
    USING (owner_id = auth.uid() OR 
           EXISTS (SELECT 1 FROM nest_members 
                  WHERE nest_id = nests.id AND user_id = auth.uid()));
  ```

- **Nest_Members テーブル**:
  ```sql
  CREATE POLICY nest_members_policy ON nest_members
    USING (user_id = auth.uid() OR 
           EXISTS (SELECT 1 FROM nests 
                  WHERE id = nest_members.nest_id AND owner_id = auth.uid()));
  ```

- **Messages テーブル**:
  ```sql
  CREATE POLICY messages_policy ON messages
    USING (EXISTS (SELECT 1 FROM nest_members 
                   WHERE nest_id = messages.nest_id AND user_id = auth.uid()));
  ```

- **Board_Items テーブル**:
  ```sql
  CREATE POLICY board_items_policy ON board_items
    USING (EXISTS (SELECT 1 FROM nest_members 
                   WHERE nest_id = board_items.nest_id AND user_id = auth.uid()));
  ```

### 4.2 データ保護
- **暗号化**:
  - 通信の暗号化（HTTPS）
  - センシティブデータの暗号化保存
- **バックアップと復元**:
  - Nest ごとのバックアップ
  - 復元機能（オーナー専用）
- **プライバシー保護**:
  - Nest 間のデータ分離
  - 外部からの不正アクセス防止

## 5. API 設計

### 5.1 認証 API
- `POST /auth/signin` - サインイン
- `POST /auth/signout` - サインアウト
- `GET /auth/user` - 現在のユーザー情報取得
- `PUT /auth/user` - ユーザー情報更新

### 5.2 Nest 管理 API
- `GET /nests` - ユーザーの Nest 一覧取得
- `POST /nests` - 新規 Nest 作成
- `GET /nests/:id` - Nest 詳細取得
- `PUT /nests/:id` - Nest 情報更新
- `DELETE /nests/:id` - Nest 削除（オーナーのみ）

### 5.3 メンバー管理 API
- `GET /nests/:id/members` - Nest メンバー一覧
- `POST /nests/:id/invitations` - 招待作成
- `PUT /invitations/:id/accept` - 招待受け入れ
- `DELETE /nests/:id/members/:userId` - メンバー削除

### 5.4 Nest 切り替え API
- `PUT /users/me/active-nest` - アクティブ Nest 設定
- `GET /users/me/recent-nests` - 最近使用した Nest 一覧

## 6. 優先実装事項

### 6.1 初期フェーズ（MVP）
- 基本認証システム（メール認証）
- シングル Nest 構造（最小限の実装から開始）
- 簡易的なユーザー管理
- 基本的なデータセキュリティ

### 6.2 第二フェーズ
- マルチ Nest 構造の実装
- Nest 間の切り替え機能
- 招待システムの完全実装
- 拡張されたセキュリティ機能

### 6.3 将来的な拡張
- ソーシャルログイン連携
- 高度な権限管理
- Nest テンプレート機能
- コラボレーション機能の拡張

## 7. 技術選定考慮事項

### 7.1 認証プロバイダー
- **Supabase Auth**:
  - 既存計画との整合性
  - RLS との統合が容易
  - JWT ベースの認証

### 7.2 データベース
- **PostgreSQL (Supabase)**:
  - リレーショナルデータの管理に最適
  - RLS によるきめ細かいアクセス制御
  - JSONB 型によるフレキシブルなデータ保存

### 7.3 API 実装
- **Supabase Functions**:
  - サーバーレスで運用コスト削減
  - JWT 検証の自動化
  - エッジでの処理による高速レスポンス

## 8. UI/UX 検討事項

### 8.1 Nest 切り替え UI
- ヘッダー/サイドバーでの現在の Nest 表示
- ドロップダウンによる Nest 切り替え
- Nest アイコンと名前の表示

### 8.2 招待フロー
- シンプルな招待リンク/コード
- 招待受け入れ画面
- 初回参加時のオンボーディング

### 8.3 Nest 作成フロー
- ステップバイステップの作成プロセス
- テンプレート選択オプション
- 初期メンバー招待の統合

## 9. 決定事項

以下の内容で合意に達しました：

1. **認証プロバイダー**: Supabase Auth を採用
2. **データモデル**: 上記提案のモデルを採用
3. **実装優先順位**: 
   - シングル Nest 機能の完成
   - マルチ Nest 構造の基盤実装
   - 招待システムの実装
4. **UI設計**: 
   - Nest 切り替えUIの設計
   - Nest 管理画面のデザイン

## 10. 壁打ち結果と詳細設計

### 10.1 データモデルとRLS詳細設計

#### 10.1.1 テーブル定義の詳細

##### users テーブル
```sql
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_seen_at TIMESTAMP WITH TIME ZONE,
  default_nest_id UUID, -- ユーザーのデフォルトNest（最後に使用したNest）
  settings JSONB, -- ユーザー設定（通知設定、UIテーマ等）
  CONSTRAINT fk_default_nest FOREIGN KEY (default_nest_id) REFERENCES public.nests(id) ON DELETE SET NULL
);

-- RLS ポリシー
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 自分自身のユーザー情報のみ参照可能
CREATE POLICY "users_select_self" ON public.users 
  FOR SELECT USING (auth.uid() = id);

-- 自分自身のユーザー情報のみ更新可能
CREATE POLICY "users_update_self" ON public.users 
  FOR UPDATE USING (auth.uid() = id);

-- Nestメンバーのユーザー情報は参照のみ可能
CREATE POLICY "users_select_nest_members" ON public.users 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.nest_members 
      WHERE 
        nest_members.user_id = users.id AND 
        EXISTS (
          SELECT 1 FROM public.nest_members AS my_memberships
          WHERE 
            my_memberships.user_id = auth.uid() AND 
            my_memberships.nest_id = nest_members.nest_id
        )
    )
  );
```

##### nests テーブル
```sql
CREATE TABLE public.nests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  owner_id UUID NOT NULL REFERENCES public.users(id),
  icon TEXT, -- Nestのアイコン（オプション）
  color TEXT, -- Nestのテーマカラー（オプション）
  is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB, -- 拡張用メタデータ
  CONSTRAINT name_length CHECK (char_length(name) >= 3 AND char_length(name) <= 50)
);

-- RLS ポリシー
ALTER TABLE public.nests ENABLE ROW LEVEL SECURITY;

-- 所有者とメンバーのみ参照可能
CREATE POLICY "nests_select_owner_and_members" ON public.nests 
  FOR SELECT USING (
    owner_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM public.nest_members 
      WHERE nest_id = nests.id AND user_id = auth.uid()
    )
  );

-- 所有者のみ更新可能
CREATE POLICY "nests_update_owner" ON public.nests 
  FOR UPDATE USING (owner_id = auth.uid());

-- 所有者のみ削除可能
CREATE POLICY "nests_delete_owner" ON public.nests 
  FOR DELETE USING (owner_id = auth.uid());

-- 新規作成は認証済みユーザーのみ可能
CREATE POLICY "nests_insert_auth" ON public.nests 
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
```

##### nest_members テーブル
```sql
CREATE TABLE public.nest_members (
  nest_id UUID REFERENCES public.nests(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_active_at TIMESTAMP WITH TIME ZONE,
  PRIMARY KEY (nest_id, user_id)
);

-- RLS ポリシー
ALTER TABLE public.nest_members ENABLE ROW LEVEL SECURITY;

-- 自分自身のメンバーシップは参照可能
CREATE POLICY "nest_members_select_self" ON public.nest_members 
  FOR SELECT USING (user_id = auth.uid());

-- 同じNestのメンバーシップは参照可能
CREATE POLICY "nest_members_select_same_nest" ON public.nest_members 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.nest_members as my_memberships
      WHERE 
        my_memberships.user_id = auth.uid() AND 
        my_memberships.nest_id = nest_members.nest_id
    )
  );

-- Nestの所有者のみメンバー追加可能
CREATE POLICY "nest_members_insert_owner" ON public.nest_members 
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.nests
      WHERE 
        nests.id = nest_members.nest_id AND 
        nests.owner_id = auth.uid()
    )
  );

-- Nestの所有者のみメンバー削除可能
CREATE POLICY "nest_members_delete_owner" ON public.nest_members 
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.nests
      WHERE 
        nests.id = nest_members.nest_id AND 
        nests.owner_id = auth.uid()
    )
  );

-- 自分自身のメンバーシップは削除可能（Nestを離れる）
CREATE POLICY "nest_members_delete_self" ON public.nest_members 
  FOR DELETE USING (user_id = auth.uid());
```

##### nest_invitations テーブル（新規追加）
```sql
CREATE TABLE public.nest_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nest_id UUID NOT NULL REFERENCES public.nests(id) ON DELETE CASCADE,
  email TEXT NOT NULL, -- 招待するメールアドレス
  invited_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE, -- 有効期限
  is_accepted BOOLEAN DEFAULT FALSE,
  accepted_at TIMESTAMP WITH TIME ZONE,
  token TEXT UNIQUE NOT NULL, -- 招待トークン
  CONSTRAINT unique_nest_email UNIQUE (nest_id, email)
);

-- RLS ポリシー
ALTER TABLE public.nest_invitations ENABLE ROW LEVEL SECURITY;

-- Nestの所有者は全ての招待を参照可能
CREATE POLICY "nest_invitations_select_owner" ON public.nest_invitations 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.nests
      WHERE 
        nests.id = nest_invitations.nest_id AND 
        nests.owner_id = auth.uid()
    )
  );

-- 自分宛の招待は参照可能
CREATE POLICY "nest_invitations_select_self" ON public.nest_invitations 
  FOR SELECT USING (email = auth.email()::text);

-- Nestの所有者のみ招待追加可能
CREATE POLICY "nest_invitations_insert_owner" ON public.nest_invitations 
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.nests
      WHERE 
        nests.id = nest_invitations.nest_id AND 
        nests.owner_id = auth.uid()
    )
  );

-- Nestの所有者のみ招待削除可能
CREATE POLICY "nest_invitations_delete_owner" ON public.nest_invitations 
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.nests
      WHERE 
        nests.id = nest_invitations.nest_id AND 
        nests.owner_id = auth.uid()
    )
  );

-- 自分宛の招待のみ更新可能（招待受諾時）
CREATE POLICY "nest_invitations_update_self" ON public.nest_invitations 
  FOR UPDATE USING (email = auth.email()::text);
```

##### messages テーブル
```sql
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nest_id UUID NOT NULL REFERENCES public.nests(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE,
  is_edited BOOLEAN DEFAULT FALSE,
  read_by JSONB DEFAULT '[]'::jsonb, -- 既読ユーザーIDのリスト
  has_pinned_to_board BOOLEAN DEFAULT FALSE,
  reply_to_id UUID REFERENCES public.messages(id),
  metadata JSONB, -- 添付ファイルなどのメタデータ
  CONSTRAINT content_not_empty CHECK (char_length(content) > 0)
);

-- RLS ポリシー
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Nestのメンバーのみメッセージ参照可能
CREATE POLICY "messages_select_members" ON public.messages 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.nest_members
      WHERE 
        nest_members.nest_id = messages.nest_id AND 
        nest_members.user_id = auth.uid()
    )
  );

-- Nestのメンバーのみメッセージ追加可能
CREATE POLICY "messages_insert_members" ON public.messages 
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.nest_members
      WHERE 
        nest_members.nest_id = messages.nest_id AND 
        nest_members.user_id = auth.uid()
    )
  );

-- 自分のメッセージのみ更新可能
CREATE POLICY "messages_update_self" ON public.messages 
  FOR UPDATE USING (sender_id = auth.uid());

-- 自分のメッセージのみ削除可能
CREATE POLICY "messages_delete_self" ON public.messages 
  FOR DELETE USING (sender_id = auth.uid());
```

##### board_items テーブル
```sql
CREATE TYPE board_column AS ENUM ('inbox', 'insights', 'themes', 'zoom');

CREATE TABLE public.board_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nest_id UUID NOT NULL REFERENCES public.nests(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  column_type board_column NOT NULL,
  created_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES public.users(id),
  source_message_id UUID REFERENCES public.messages(id),
  order_index INTEGER NOT NULL DEFAULT 0, -- カラム内での表示順序
  tags TEXT[] DEFAULT '{}', -- タグリスト
  is_archived BOOLEAN DEFAULT FALSE,
  metadata JSONB, -- 拡張用メタデータ
  CONSTRAINT title_not_empty CHECK (char_length(title) > 0)
);

-- RLS ポリシー
ALTER TABLE public.board_items ENABLE ROW LEVEL SECURITY;

-- Nestのメンバーのみボードアイテム参照可能
CREATE POLICY "board_items_select_members" ON public.board_items 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.nest_members
      WHERE 
        nest_members.nest_id = board_items.nest_id AND 
        nest_members.user_id = auth.uid()
    )
  );

-- Nestのメンバーのみボードアイテム追加可能
CREATE POLICY "board_items_insert_members" ON public.board_items 
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.nest_members
      WHERE 
        nest_members.nest_id = board_items.nest_id AND 
        nest_members.user_id = auth.uid()
    )
  );

-- Nestのメンバーはボードアイテム更新可能
CREATE POLICY "board_items_update_members" ON public.board_items 
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.nest_members
      WHERE 
        nest_members.nest_id = board_items.nest_id AND 
        nest_members.user_id = auth.uid()
    )
  );

-- Nestのメンバーはボードアイテム削除可能
CREATE POLICY "board_items_delete_members" ON public.board_items 
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.nest_members
      WHERE 
        nest_members.nest_id = board_items.nest_id AND 
        nest_members.user_id = auth.uid()
    )
  );
```

#### 10.1.2 インデックス設定

効率的なクエリー実行のために以下のインデックスを設定します：

```sql
-- users テーブルのインデックス
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_default_nest ON public.users(default_nest_id);

-- nests テーブルのインデックス
CREATE INDEX idx_nests_owner ON public.nests(owner_id);
CREATE INDEX idx_nests_active ON public.nests(is_active);

-- nest_members テーブルのインデックス
CREATE INDEX idx_nest_members_user ON public.nest_members(user_id);
CREATE INDEX idx_nest_members_nest_role ON public.nest_members(nest_id, role);
CREATE INDEX idx_nest_members_last_active ON public.nest_members(user_id, last_active_at);

-- nest_invitations テーブルのインデックス
CREATE INDEX idx_nest_invitations_email ON public.nest_invitations(email);
CREATE INDEX idx_nest_invitations_nest ON public.nest_invitations(nest_id);
CREATE INDEX idx_nest_invitations_token ON public.nest_invitations(token);
CREATE INDEX idx_nest_invitations_status ON public.nest_invitations(is_accepted, expires_at);

-- messages テーブルのインデックス
CREATE INDEX idx_messages_nest ON public.messages(nest_id);
CREATE INDEX idx_messages_sender ON public.messages(sender_id);
CREATE INDEX idx_messages_created_at ON public.messages(nest_id, created_at);
CREATE INDEX idx_messages_reply_to ON public.messages(reply_to_id);

-- board_items テーブルのインデックス
CREATE INDEX idx_board_items_nest ON public.board_items(nest_id);
CREATE INDEX idx_board_items_column ON public.board_items(nest_id, column_type);
CREATE INDEX idx_board_items_created_by ON public.board_items(created_by);
CREATE INDEX idx_board_items_source ON public.board_items(source_message_id);
CREATE INDEX idx_board_items_tags ON public.board_items USING GIN (tags);
CREATE INDEX idx_board_items_order ON public.board_items(nest_id, column_type, order_index);
```

#### 10.1.3 トリガー関数

データ整合性と自動アクション実行のためのトリガー関数：

```sql
-- 新しいNestが作成されたときにオーナーをメンバーとして自動追加
CREATE OR REPLACE FUNCTION public.handle_new_nest()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.nest_members (nest_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_nest_created
  AFTER INSERT ON public.nests
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_nest();

-- メッセージが更新されたとき、更新時間とis_editedフラグを自動更新
CREATE OR REPLACE FUNCTION public.handle_message_update()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.is_edited = TRUE;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_message_updated
  BEFORE UPDATE ON public.messages
  FOR EACH ROW
  WHEN (OLD.content IS DISTINCT FROM NEW.content)
  EXECUTE PROCEDURE public.handle_message_update();

-- ボードアイテムが更新されたとき、更新時間と更新者IDを自動設定
CREATE OR REPLACE FUNCTION public.handle_board_item_update()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_board_item_updated
  BEFORE UPDATE ON public.board_items
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_board_item_update();
```

#### 10.1.4 リアルタイム通知設定

Supabaseのリアルタイム機能を活用し、以下の変更をクライアントにプッシュ配信します：

```sql
-- リアルタイム通知を有効化するテーブル
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.board_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.nest_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.nest_invitations;

-- メッセージテーブルの変更通知設定
CREATE OR REPLACE FUNCTION public.handle_new_message()
RETURNS TRIGGER AS $$
BEGIN
  -- ここでメッセージ通知のためのロジックを実装
  PERFORM pg_notify(
    'new_message',
    json_build_object(
      'nest_id', NEW.nest_id,
      'message_id', NEW.id,
      'sender_id', NEW.sender_id
    )::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_new_message
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_message();
```

#### 10.1.5 カスタム関数と型

```sql
-- アクティブなNest一覧を取得する関数
CREATE OR REPLACE FUNCTION public.get_user_nests(user_id UUID)
RETURNS TABLE (
  nest_id UUID,
  name TEXT,
  description TEXT,
  role TEXT,
  is_owner BOOLEAN,
  last_active_at TIMESTAMP WITH TIME ZONE
) SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    n.id AS nest_id,
    n.name,
    n.description,
    nm.role,
    n.owner_id = user_id AS is_owner,
    nm.last_active_at
  FROM
    public.nests n
  JOIN
    public.nest_members nm ON n.id = nm.nest_id
  WHERE
    nm.user_id = get_user_nests.user_id AND n.is_active = TRUE
  ORDER BY
    nm.last_active_at DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql;

-- Nestへの招待を処理する関数
CREATE OR REPLACE FUNCTION public.accept_invitation(invitation_token TEXT)
RETURNS BOOLEAN SECURITY DEFINER
AS $$
DECLARE
  inv_record public.nest_invitations;
  user_id UUID;
BEGIN
  -- 認証済みユーザーIDを取得
  user_id := auth.uid();
  
  -- 招待レコードを取得
  SELECT * INTO inv_record
  FROM public.nest_invitations
  WHERE 
    token = invitation_token AND
    is_accepted = FALSE AND
    (expires_at IS NULL OR expires_at > NOW());
    
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- 招待先メールアドレスと現在のユーザーのメールアドレスが一致するか確認
  IF inv_record.email != auth.email()::text THEN
    RETURN FALSE;
  END IF;
  
  -- 既にメンバーでないか確認
  IF EXISTS (
    SELECT 1 FROM public.nest_members
    WHERE nest_id = inv_record.nest_id AND user_id = user_id
  ) THEN
    -- 招待を受諾済みとしてマーク
    UPDATE public.nest_invitations
    SET is_accepted = TRUE, accepted_at = NOW()
    WHERE token = invitation_token;
    RETURN TRUE;
  END IF;
  
  -- メンバーとして追加
  INSERT INTO public.nest_members (nest_id, user_id, role)
  VALUES (inv_record.nest_id, user_id, 'member');
  
  -- 招待を受諾済みとしてマーク
  UPDATE public.nest_invitations
  SET is_accepted = TRUE, accepted_at = NOW()
  WHERE token = invitation_token;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;
```

このデータモデルとRLS設計により、以下の点が実現されます：

1. **セキュアなマルチテナント構造**
   - 各Nestのデータは厳密に分離され、権限のあるユーザーのみアクセス可能
   - RLSポリシーにより細粒度のアクセス制御を実現

2. **効率的なデータアクセス**
   - 適切なインデックス設定により、頻繁に使用されるクエリが最適化
   - JOINやサブクエリの効率化

3. **データ整合性の確保**
   - トリガー関数による自動化されたデータ整合性チェック
   - カスケード削除など、参照整合性の保持

4. **拡張性を考慮した設計**
   - JSONBフィールドによる柔軟なメタデータ保存
   - 将来の機能追加を見据えた構造

*（ここに今後の壁打ち結果と詳細設計を追記していきます）* 

### 10.2 認証フローと状態管理の詳細設計

#### 10.2.1 認証フロー

PocoNestの認証フローは以下のプロセスで構成されます：

1. **初回ユーザー登録**
   ```mermaid
   sequenceDiagram
       Client->>+Supabase Auth: メールアドレス・パスワードでサインアップ
       Supabase Auth-->>-Client: ユーザー作成完了
       Client->>+Supabase DB: ユーザープロフィール作成
       Supabase DB-->>-Client: プロフィール作成完了
       Client->>+Client: デフォルトNest作成
   ```

2. **ログインフロー**
   ```mermaid
   sequenceDiagram
       Client->>+Supabase Auth: メールアドレス・パスワードでログイン
       Supabase Auth-->>-Client: JWT発行
       Client->>+Client: JWTをローカルストレージに保存
       Client->>+Supabase DB: ユーザープロフィール取得
       Supabase DB-->>-Client: プロフィール情報
       Client->>+Supabase DB: デフォルトNest情報取得
       Supabase DB-->>-Client: Nest情報
       Client->>+Client: Nestコンテキスト初期化
   ```

3. **セッション更新フロー**
   ```mermaid
   sequenceDiagram
       Client->>+Client: アプリ起動/再開
       Client->>+Supabase Auth: セッション有効性確認
       alt セッション有効
           Supabase Auth-->>Client: セッション有効
           Client->>+Supabase DB: 最近のNest取得
           Supabase DB-->>-Client: Nest情報
       else セッション期限切れ
           Supabase Auth-->>Client: 再認証要求
           Client->>+Client: ログイン画面表示
       end
   ```

4. **ログアウトフロー**
   ```mermaid
   sequenceDiagram
       Client->>+Supabase Auth: ログアウト要求
       Supabase Auth-->>-Client: セッション無効化
       Client->>+Client: ローカルストレージからJWT削除
       Client->>+Client: アプリ状態リセット
       Client->>+Client: ログイン画面表示
   ```

5. **招待受け入れフロー**
   ```mermaid
   sequenceDiagram
       Client->>+Supabase DB: 招待トークン検証
       Supabase DB-->>Client: 有効な招待
       Client->>+Supabase DB: accept_invitation関数呼び出し
       Supabase DB->>Supabase DB: nest_membersにレコード追加
       Supabase DB->>Supabase DB: 招待状態を更新
       Supabase DB-->>-Client: 参加完了
       Client->>+Client: 新しいNestに切り替え
   ```

#### 10.2.2 認証状態管理

クライアントサイドでの認証状態管理は、React Contextを使用して実装します：

```tsx
// src/contexts/AuthContext.tsx
import React, { createContext, useState, useEffect, useContext } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { ProfileType } from '../types';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: ProfileType | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, displayName: string) => Promise<{ error: any, user: User | null }>;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<ProfileType>) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // セッション状態の監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // プロフィール情報を取得
          await fetchProfile(session.user.id);
        }
        
        setLoading(false);
      }
    );

    // 初期セッション確認
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // プロフィール情報取得
  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
      
    if (error) {
      console.error('Error fetching profile:', error);
      return;
    }
    
    setProfile(data);
  };

  // サインイン
  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    return { error };
  };

  // サインアップ
  const signUp = async (email: string, password: string, displayName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (!error && data.user) {
      // プロフィール作成
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: data.user.id,
          email,
          display_name: displayName,
        });

      if (profileError) {
        console.error('Error creating profile:', profileError);
        return { error: profileError, user: null };
      }
    }

    return { error, user: data.user };
  };

  // サインアウト
  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  // プロフィール更新
  const updateProfile = async (data: Partial<ProfileType>) => {
    if (!user) {
      return { error: new Error('User not authenticated') };
    }

    const { error } = await supabase
      .from('users')
      .update(data)
      .eq('id', user.id);

    if (!error) {
      setProfile({ ...profile, ...data } as ProfileType);
    }

    return { error };
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        loading,
        signIn,
        signUp,
        signOut,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
```

#### 10.2.3 Nest状態管理

Nest（ワークスペース）の状態管理は、以下のようなコンテキストで実装します：

```tsx
// src/contexts/NestContext.tsx
import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { NestType, NestMemberType, NestInvitationType } from '../types';

interface NestContextType {
  currentNest: NestType | null;
  userNests: NestType[];
  nestMembers: NestMemberType[];
  pendingInvitations: NestInvitationType[];
  loading: boolean;
  setCurrentNest: (nestId: string) => Promise<void>;
  createNest: (data: { name: string; description?: string; }) => Promise<{ error: any; nest: NestType | null }>;
  updateNest: (nestId: string, data: Partial<NestType>) => Promise<{ error: any }>;
  inviteMember: (nestId: string, email: string) => Promise<{ error: any; invitation: NestInvitationType | null }>;
  acceptInvitation: (token: string) => Promise<{ error: any }>;
}

const NestContext = createContext<NestContextType | undefined>(undefined);

export const NestProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const { user, profile } = useAuth();
  const [currentNest, setCurrentNestState] = useState<NestType | null>(null);
  const [userNests, setUserNests] = useState<NestType[]>([]);
  const [nestMembers, setNestMembers] = useState<NestMemberType[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<NestInvitationType[]>([]);
  const [loading, setLoading] = useState(true);

  // ユーザーのNest一覧を取得
  useEffect(() => {
    if (user) {
      fetchUserNests();
    } else {
      setUserNests([]);
      setCurrentNestState(null);
      setNestMembers([]);
      setPendingInvitations([]);
    }
  }, [user]);

  // プロフィールのデフォルトNestを設定
  useEffect(() => {
    if (profile?.default_nest_id && userNests.length > 0) {
      const defaultNest = userNests.find(nest => nest.id === profile.default_nest_id);
      if (defaultNest) {
        setCurrentNestState(defaultNest);
        fetchNestMembers(defaultNest.id);
      } else {
        // デフォルトNestがない場合、最初のNestを使用
        setCurrentNestState(userNests[0]);
        fetchNestMembers(userNests[0].id);
      }
      setLoading(false);
    } else if (userNests.length > 0) {
      // デフォルト指定がない場合、最初のNestを使用
      setCurrentNestState(userNests[0]);
      fetchNestMembers(userNests[0].id);
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, [profile, userNests]);

  // 招待を取得
  useEffect(() => {
    if (user) {
      fetchPendingInvitations();
    }
  }, [user]);

  // ユーザーのNest一覧を取得
  const fetchUserNests = async () => {
    if (!user) return;

    // カスタム関数を使用してNest一覧を取得
    const { data, error } = await supabase
      .rpc('get_user_nests', { user_id: user.id });

    if (error) {
      console.error('Error fetching nests:', error);
      return;
    }

    setUserNests(data || []);
  };

  // Nestメンバー一覧を取得
  const fetchNestMembers = async (nestId: string) => {
    const { data, error } = await supabase
      .from('nest_members')
      .select(`
        nest_id,
        user_id,
        role,
        joined_at,
        last_active_at,
        users:user_id (
          id,
          display_name,
          avatar_url,
          email
        )
      `)
      .eq('nest_id', nestId);

    if (error) {
      console.error('Error fetching nest members:', error);
      return;
    }

    setNestMembers(data || []);
  };

  // 保留中の招待を取得
  const fetchPendingInvitations = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('nest_invitations')
      .select(`
        id,
        nest_id,
        email,
        invited_by,
        created_at,
        expires_at,
        token,
        nests:nest_id (
          id,
          name,
          description
        ),
        inviters:invited_by (
          id,
          display_name,
          avatar_url
        )
      `)
      .eq('email', user.email)
      .eq('is_accepted', false)
      .is('expires_at', null)
      .or('expires_at.gt.now');

    if (error) {
      console.error('Error fetching invitations:', error);
      return;
    }

    setPendingInvitations(data || []);
  };

  // 現在のNestを設定
  const setCurrentNest = async (nestId: string) => {
    const nest = userNests.find(n => n.id === nestId);
    if (!nest || !user) return;

    setCurrentNestState(nest);
    fetchNestMembers(nestId);

    // last_active_at を更新
    await supabase
      .from('nest_members')
      .update({ last_active_at: new Date().toISOString() })
      .match({ nest_id: nestId, user_id: user.id });

    // ユーザーのデフォルトNestを更新
    await supabase
      .from('users')
      .update({ default_nest_id: nestId })
      .eq('id', user.id);
  };

  // 新しいNestを作成
  const createNest = async (data: { name: string; description?: string }) => {
    if (!user) {
      return { error: new Error('User not authenticated'), nest: null };
    }

    const { data: newNest, error } = await supabase
      .from('nests')
      .insert({
        name: data.name,
        description: data.description || '',
        owner_id: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating nest:', error);
      return { error, nest: null };
    }

    // Nest一覧を再取得
    await fetchUserNests();
    
    return { error: null, nest: newNest };
  };

  // Nestを更新
  const updateNest = async (nestId: string, data: Partial<NestType>) => {
    const { error } = await supabase
      .from('nests')
      .update(data)
      .eq('id', nestId);

    if (!error) {
      // Nest一覧を再取得
      await fetchUserNests();
      
      // 現在のNestが更新された場合は再設定
      if (currentNest?.id === nestId) {
        const updatedNest = { ...currentNest, ...data };
        setCurrentNestState(updatedNest as NestType);
      }
    }

    return { error };
  };

  // メンバーを招待
  const inviteMember = async (nestId: string, email: string) => {
    if (!user) {
      return { error: new Error('User not authenticated'), invitation: null };
    }

    // トークン生成
    const token = crypto.randomUUID();

    const { data, error } = await supabase
      .from('nest_invitations')
      .insert({
        nest_id: nestId,
        email,
        invited_by: user.id,
        token,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 1週間後
      })
      .select()
      .single();

    if (error) {
      console.error('Error inviting member:', error);
      return { error, invitation: null };
    }

    return { error: null, invitation: data };
  };

  // 招待を受諾
  const acceptInvitation = async (token: string) => {
    const { data, error } = await supabase
      .rpc('accept_invitation', { invitation_token: token });

    if (error) {
      console.error('Error accepting invitation:', error);
      return { error };
    }

    if (data) {
      // 招待受諾成功、Nest一覧を再取得
      await fetchUserNests();
      await fetchPendingInvitations();
    }

    return { error: null };
  };

  return (
    <NestContext.Provider
      value={{
        currentNest,
        userNests,
        nestMembers,
        pendingInvitations,
        loading,
        setCurrentNest,
        createNest,
        updateNest,
        inviteMember,
        acceptInvitation,
      }}
    >
      {children}
    </NestContext.Provider>
  );
};

export const useNest = () => {
  const context = useContext(NestContext);
  if (context === undefined) {
    throw new Error('useNest must be used within a NestProvider');
  }
  return context;
};
```

#### 10.2.4 認証関連の型定義

```tsx
// src/types/index.ts
export interface ProfileType {
  id: string;
  email: string;
  display_name: string;
  avatar_url?: string;
  created_at: string;
  last_seen_at?: string;
  default_nest_id?: string;
  settings?: Record<string, any>;
}

export interface NestType {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  owner_id: string;
  icon?: string;
  color?: string;
  is_active: boolean;
  role?: string; // メンバーとしての自分のロール（クライアント表示用）
  is_owner?: boolean; // 自分がオーナーかどうか（クライアント表示用）
  last_active_at?: string; // 最後にアクセスした時間（クライアント表示用）
}

export interface NestMemberType {
  nest_id: string;
  user_id: string;
  role: 'owner' | 'member';
  joined_at: string;
  last_active_at?: string;
  users: {
    id: string;
    display_name: string;
    avatar_url?: string;
    email: string;
  };
}

export interface NestInvitationType {
  id: string;
  nest_id: string;
  email: string;
  invited_by: string;
  created_at: string;
  expires_at?: string;
  token: string;
  nests: {
    id: string;
    name: string;
    description?: string;
  };
  inviters: {
    id: string;
    display_name: string;
    avatar_url?: string;
  };
}
```

#### 10.2.5 認証関連の統合

アプリケーションレベルでの認証・Nest状態の統合は以下のように行います：

```tsx
// src/App.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NestProvider } from './contexts/NestContext';
import AuthNavigator from './navigation/AuthNavigator';
import MainNavigator from './navigation/MainNavigator';
import LoadingScreen from './screens/LoadingScreen';

// 認証状態に基づいてナビゲーションを分岐
const AppContent = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      {user ? (
        <NestProvider>
          <MainNavigator />
        </NestProvider>
      ) : (
        <AuthNavigator />
      )}
    </NavigationContainer>
  );
};

const App = () => (
  <AuthProvider>
    <AppContent />
  </AuthProvider>
);

export default App;
```

#### 10.2.6 認証画面のコンポーネント例

**ログイン画面**
```tsx
// src/screens/LoginScreen.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { BrandColors } from '../constants/Colors';

const LoginScreen = ({ navigation }: any) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('エラー', 'メールアドレスとパスワードを入力してください');
      return;
    }

    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);

    if (error) {
      Alert.alert('ログインエラー', error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ポコの巣へようこそ</Text>
      <Text style={styles.subtitle}>サインインして続ける</Text>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="メールアドレス"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        
        <TextInput
          style={styles.input}
          placeholder="パスワード"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity 
          style={styles.button}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'ログイン中...' : 'ログイン'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.linkButton}
          onPress={() => navigation.navigate('Register')}
        >
          <Text style={styles.linkText}>
            アカウントをお持ちでない方はこちら
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: BrandColors.background,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: BrandColors.text.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: BrandColors.text.secondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  form: {
    width: '100%',
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    fontSize: 16,
  },
  button: {
    backgroundColor: BrandColors.primary,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  linkButton: {
    padding: 16,
    alignItems: 'center',
  },
  linkText: {
    color: BrandColors.secondary,
    fontSize: 14,
  },
});

export default LoginScreen;
```

**ユーザー登録画面**
```tsx
// src/screens/RegisterScreen.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { BrandColors } from '../constants/Colors';

const RegisterScreen = ({ navigation }: any) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();

  const handleRegister = async () => {
    if (!email || !password || !displayName) {
      Alert.alert('エラー', '全ての項目を入力してください');
      return;
    }

    setLoading(true);
    const { error, user } = await signUp(email, password, displayName);
    setLoading(false);

    if (error) {
      Alert.alert('登録エラー', error.message);
    } else if (user) {
      Alert.alert('登録完了', 'アカウントが作成されました');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>新規アカウント作成</Text>
      <Text style={styles.subtitle}>情報を入力して始める</Text>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="表示名"
          value={displayName}
          onChangeText={setDisplayName}
        />
        
        <TextInput
          style={styles.input}
          placeholder="メールアドレス"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        
        <TextInput
          style={styles.input}
          placeholder="パスワード"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity 
          style={styles.button}
          onPress={handleRegister}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? '登録中...' : 'アカウント作成'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.linkButton}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.linkText}>
            既にアカウントをお持ちの方はこちら
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: BrandColors.background,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: BrandColors.text.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: BrandColors.text.secondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  form: {
    width: '100%',
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    fontSize: 16,
  },
  button: {
    backgroundColor: BrandColors.primary,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  linkButton: {
    padding: 16,
    alignItems: 'center',
  },
  linkText: {
    color: BrandColors.secondary,
    fontSize: 14,
  },
});

export default RegisterScreen;
```

この認証フローと状態管理の実装により、以下の点が実現されます：

1. **スムーズな認証体験**
   - ユーザー登録から認証完了までのシームレスなフロー
   - セッション永続化によるスムーズなアプリ再開

2. **セキュアな認証管理**
   - Supabase Authによる堅牢な認証基盤
   - JWTを使用した安全なセッション管理

3. **コンテキストベースの状態管理**
   - React Contextによる効率的な状態管理
   - アプリ全体で一貫したユーザー・Nest情報へのアクセス

4. **マルチNest対応**
   - ユーザーが複数のNestに所属可能
   - 最後に使用したNestの自動復元
</rewritten_file> 