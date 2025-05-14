# PocoNest セキュリティ実装ドキュメント

## 現状の課題

現在のアプリケーションでは、以下の問題が確認されています：

1. **RLSポリシーの無限再帰エラー**:
   ```
   Error fetching invitations: infinite recursion detected in policy for relation "nest_members"
   Error fetching nest members: infinite recursion detected in policy for relation "nest_members"
   ```

2. **ナビゲーション構造の問題**:
   ```
   WARN Found screens with the same name nested inside one another. Check:
   MainTabs, MainTabs > MainTabs
   ```

3. **認証に関する課題**:
   - ユーザー登録は成功するもののログインに問題あり
   - メール確認が必要かどうかの設定が不明確

## セキュリティ実装計画

### 1. RLSポリシーの修正

#### a. ユーザープロフィール (`users` テーブル)

```sql
-- 自分のプロフィールの閲覧・編集ポリシー
CREATE POLICY "Users manage own profile"
  ON public.users
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Nestメンバーのプロフィール閲覧ポリシー
CREATE POLICY "View profiles of nest members"
  ON public.users
  FOR SELECT
  USING (
    id IN (
      SELECT user_id FROM public.nest_members
      WHERE nest_id IN (
        SELECT nest_id FROM public.nest_members
        WHERE user_id = auth.uid()
      )
    )
  );
```

#### b. Nest (`nests` テーブル)

```sql
-- Nest閲覧ポリシー
CREATE POLICY "View nests as member"
  ON public.nests
  FOR SELECT
  USING (
    id IN (
      SELECT nest_id FROM public.nest_members
      WHERE user_id = auth.uid()
    )
  );

-- Nest編集ポリシー
CREATE POLICY "Update owned nests"
  ON public.nests
  FOR UPDATE
  USING (owner_id = auth.uid());

-- Nest作成ポリシー
CREATE POLICY "Create own nests"
  ON public.nests
  FOR INSERT
  WITH CHECK (owner_id = auth.uid());
```

#### c. Nestメンバーシップ (`nest_members` テーブル)

```sql
-- メンバー閲覧ポリシー
CREATE POLICY "View members of joined nests"
  ON public.nest_members
  FOR SELECT
  USING (
    nest_id IN (
      SELECT nest_id FROM public.nest_members
      WHERE user_id = auth.uid()
    )
  );

-- メンバー追加ポリシー（オーナー権限）
CREATE POLICY "Add members as nest owner"
  ON public.nest_members
  FOR INSERT
  WITH CHECK (
    nest_id IN (
      SELECT id FROM public.nests
      WHERE owner_id = auth.uid()
    )
  );

-- メンバー退出ポリシー（自分自身）
CREATE POLICY "Remove self from nest"
  ON public.nest_members
  FOR DELETE
  USING (user_id = auth.uid());
```

#### d. 招待 (`nest_invitations` テーブル)

```sql
-- 招待閲覧ポリシー
CREATE POLICY "View relevant invitations"
  ON public.nest_invitations
  FOR SELECT
  USING (
    email = (SELECT email FROM public.users WHERE id = auth.uid())
    OR
    nest_id IN (
      SELECT id FROM public.nests
      WHERE owner_id = auth.uid()
    )
  );

-- 招待作成ポリシー
CREATE POLICY "Create invitations as owner"
  ON public.nest_invitations
  FOR INSERT
  WITH CHECK (
    nest_id IN (
      SELECT id FROM public.nests
      WHERE owner_id = auth.uid()
    )
  );
```

#### e. チャットメッセージ (`chat_messages` テーブル)

```sql
-- メッセージ閲覧ポリシー
CREATE POLICY "View messages in joined nests"
  ON public.chat_messages
  FOR SELECT
  USING (
    nest_id IN (
      SELECT nest_id FROM public.nest_members
      WHERE user_id = auth.uid()
    )
  );

-- メッセージ投稿ポリシー
CREATE POLICY "Create messages in joined nests"
  ON public.chat_messages
  FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND
    nest_id IN (
      SELECT nest_id FROM public.nest_members
      WHERE user_id = auth.uid()
    )
  );

-- メッセージ編集ポリシー
CREATE POLICY "Update own messages"
  ON public.chat_messages
  FOR UPDATE
  USING (sender_id = auth.uid());
```

#### f. ボードアイテム (`board_items` テーブル)

```sql
-- ボード閲覧ポリシー
CREATE POLICY "Access board items in joined nests"
  ON public.board_items
  FOR ALL
  USING (
    nest_id IN (
      SELECT nest_id FROM public.nest_members
      WHERE user_id = auth.uid()
    )
  );
```

### 2. RLSポリシー実装手順

既存ポリシーを削除し、新しいポリシーを設定する際は以下のSQLを実行します：

```sql
-- すべての既存ポリシーを削除
DO $$
DECLARE
    policy_rec RECORD;
BEGIN
    FOR policy_rec IN
        SELECT policyname, tablename
        FROM pg_policies
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_rec.policyname, policy_rec.tablename);
    END LOOP;
END
$$;

-- 上記で定義した新しいポリシーをここに順次追加
```

### 3. 認証機能強化

#### a. メール確認設定

- **開発環境**: メール確認を無効化（Supabaseダッシュボード → Authentication → Email → Confirm email → オフ）
- **本番環境**: メール確認を有効化し、適切なSMTPサーバーを設定

#### b. パスワード要件

- **開発環境**: 最小6文字程度の簡易設定
- **本番環境**: 
  - 最小8文字
  - 少なくとも1つの大文字、小文字、数字、特殊文字を含む
  - 辞書攻撃に弱いパスワードを禁止

#### c. セッション管理設定

Supabaseダッシュボードで以下を設定：
- Authentication → Settings → Session expiry: 1 week（開発用）、1 day（本番用）
- JWT expiry: 1 hour

### 4. サーバーサイド検証

#### a. RPC関数の実装例

```sql
-- Nest作成関数
CREATE OR REPLACE FUNCTION create_nest(p_name TEXT, p_description TEXT, p_color TEXT)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id uuid;
  v_nest_id uuid;
  v_result json;
BEGIN
  -- 認証チェック
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  
  -- 入力検証
  IF p_name IS NULL OR length(trim(p_name)) < 2 THEN
    RETURN json_build_object('success', false, 'error', 'Name must be at least 2 characters');
  END IF;
  
  -- Nestの作成
  INSERT INTO nests (name, description, color, owner_id)
  VALUES (p_name, p_description, p_color, v_user_id)
  RETURNING id INTO v_nest_id;
  
  -- メンバーシップの作成
  INSERT INTO nest_members (nest_id, user_id, role)
  VALUES (v_nest_id, v_user_id, 'owner');
  
  RETURN json_build_object('success', true, 'nest_id', v_nest_id);
END;
$$;

-- 招待承認関数
CREATE OR REPLACE FUNCTION accept_invitation(invitation_token TEXT)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_invitation record;
  v_user_id uuid;
  v_result json;
BEGIN
  -- 認証チェック
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  
  -- 招待の検証
  SELECT * INTO v_invitation 
  FROM nest_invitations 
  WHERE token = invitation_token AND is_accepted = false
  LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invalid or expired invitation');
  END IF;
  
  -- ユーザーのメールアドレス検証
  DECLARE 
    v_user_email text;
  BEGIN
    SELECT email INTO v_user_email FROM public.users WHERE id = v_user_id;
    
    IF v_user_email != v_invitation.email THEN
      RETURN json_build_object('success', false, 'error', 'Invitation was sent to a different email address');
    END IF;
  END;
  
  -- メンバーとして追加
  INSERT INTO nest_members (nest_id, user_id, role)
  VALUES (v_invitation.nest_id, v_user_id, 'member')
  ON CONFLICT (nest_id, user_id) 
  DO NOTHING;
  
  -- 招待を承認済みに更新
  UPDATE nest_invitations 
  SET is_accepted = true, accepted_at = now()
  WHERE id = v_invitation.id;
  
  RETURN json_build_object('success', true);
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;
```

#### b. トリガー関数

```sql
-- ユーザー作成時のトリガー
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_nest_id uuid;
BEGIN
  -- ユーザープロフィールの作成
  INSERT INTO public.users (id, email, display_name, created_at)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'display_name', SPLIT_PART(new.email, '@', 1)),
    NOW()
  );
  
  -- デフォルトのNestを作成
  INSERT INTO public.nests (name, description, owner_id)
  VALUES (
    'My Nest',
    'My personal workspace',
    new.id
  )
  RETURNING id INTO v_nest_id;
  
  -- ユーザーをNestのメンバーとして追加
  INSERT INTO public.nest_members (nest_id, user_id, role)
  VALUES (v_nest_id, new.id, 'owner');
  
  -- デフォルトNestをユーザープロフィールに設定
  UPDATE public.users 
  SET default_nest_id = v_nest_id
  WHERE id = new.id;
  
  RETURN new;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in handle_new_user: %', SQLERRM;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- トリガーの設定
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Nest削除時のトリガー
CREATE OR REPLACE FUNCTION handle_nest_deletion()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM nest_members WHERE nest_id = OLD.id;
  DELETE FROM nest_invitations WHERE nest_id = OLD.id;
  DELETE FROM chat_messages WHERE nest_id = OLD.id;
  DELETE FROM board_items WHERE nest_id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_nest_deleted
  BEFORE DELETE ON nests
  FOR EACH ROW EXECUTE PROCEDURE handle_nest_deletion();
```

### 5. フロントエンド実装

#### a. 入力検証

```typescript
// Nest作成時の検証
const validateNestData = (data: NestFormData): string | null => {
  if (!data.name || data.name.trim().length < 2) {
    return 'Nest名は2文字以上で入力してください';
  }
  
  if (data.description && data.description.length > 500) {
    return '説明は500文字以内で入力してください';
  }
  
  return null; // 検証通過
};

// メッセージ投稿時の検証
const validateMessage = (message: string): string | null => {
  if (!message || message.trim().length === 0) {
    return 'メッセージを入力してください';
  }
  
  if (message.length > 2000) {
    return 'メッセージは2000文字以内で入力してください';
  }
  
  return null;
};
```

#### b. エラーハンドリング

```typescript
// エラーハンドリング共通コード
const handleSupabaseError = (error: any, fallbackMessage: string): string => {
  console.error('Error:', error);
  
  // エラーコードに応じた処理
  if (error.code === '23505') { // 一意性制約違反
    return '同じ名前の項目がすでに存在します';
  } else if (error.code === '23503') { // 外部キー制約違反
    return '関連する項目が存在しないため操作できません';
  } else if (error.code === '42501') { // 権限エラー
    return 'この操作を実行する権限がありません';
  } else if (error.message) {
    return error.message;
  }
  
  return fallbackMessage;
};
```

### 6. ナビゲーション修正

`MainTabNavigator.tsx` のスクリーン名を変更して、警告を解消します：

```typescript
// RootStackParamList型定義を更新
type RootStackParamList = {
  TabsScreen: undefined; // MainTabsから変更
  CreateNest: undefined;
  NestSettings: { nestId: string };
};

// スクリーン名を変更
<Stack.Navigator>
  <Stack.Screen name="TabsScreen" component={MainTabs} />
  {/* 他のスクリーン */}
</Stack.Navigator>
```

関連ファイルも更新：
- `HomeScreen.tsx`
- `CreateNestScreen.tsx`
- その他の画面で`MainTabs`参照を使用している箇所

### 7. 監視とロギング（本番環境用）

#### a. アクティビティログテーブル

```sql
-- アクティビティログテーブル
CREATE TABLE activity_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users,
  action_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id uuid,
  details jsonb,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ログ記録関数
CREATE OR REPLACE FUNCTION log_activity(
  p_action_type TEXT,
  p_entity_type TEXT,
  p_entity_id uuid,
  p_details jsonb DEFAULT NULL
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO activity_logs (user_id, action_type, entity_type, entity_id, details, ip_address)
  VALUES (
    auth.uid(),
    p_action_type,
    p_entity_type,
    p_entity_id,
    p_details,
    current_setting('request.headers', true)::json->>'x-real-ip'
  );
END;
$$;
```

#### b. 定期メンテナンス処理

```sql
-- 古い招待を自動的に無効化するバッチ関数
CREATE OR REPLACE FUNCTION cleanup_expired_invitations()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE nest_invitations
  SET is_accepted = true
  WHERE expires_at < NOW() AND is_accepted = false;
END;
$$;
```

## 実装優先度

1. **最優先**: RLSポリシーの修正（無限再帰エラー解消）
   - 全ポリシーのリセットと新規作成

2. **次に優先**: ナビゲーション警告の解消
   - `MainTabs` → `TabsScreen` への名前変更

3. **高優先度**: 認証フロー確認
   - メール確認設定の確認
   - 新規登録後のログインフロー確認

4. **中優先度**: データアクセス制御の完成
   - RPC関数の作成
   - トリガーの充実
   - フロントエンドの整合性確保

5. **低優先度**: ログと監視機能
   - 本番環境向けの実装

## メモ

- 開発環境では簡易的なRLSポリシーを使用し、本番環境では厳格に設定する
- メール認証は本番環境でのみ必須に設定
- `MainTabs`と`TabsScreen`の名前をアプリ全体で統一する
- 開発中はコンソールログを積極的に利用してデバッグする
- 将来的にはウェブフックを利用したアクティビティ通知も検討する

## 将来的な拡張

- WebSocketを使用したリアルタイム更新
- プッシュ通知の統合
- 多要素認証の実装
- 外部認証プロバイダ（Google, Apple）の統合 