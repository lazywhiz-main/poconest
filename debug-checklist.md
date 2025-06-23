# 通知システム デバッグチェックリスト

## 🔍 基本確認事項

### 1. 認証状況
- [ ] ユーザーがログインしているか
- [ ] `user.id` が正しく取得されているか
- [ ] AuthContextが正常に動作しているか

### 2. データベース接続
- [ ] Supabaseクライアントが正しく初期化されているか
- [ ] `notifications`テーブルが存在するか
- [ ] RLS（Row Level Security）が正しく設定されているか

### 3. 通知作成
- [ ] `NotificationService.createNotification`メソッドが正常に動作するか
- [ ] 必須フィールドが全て提供されているか
- [ ] データベーススキーマと一致しているか

## 🛠️ デバッグ手順

### Step 1: ブラウザの開発者ツールを開く
```
F12キー または 右クリック → 検証
```

### Step 2: NotificationTester にアクセス
```
http://localhost:5181/notification-tester
```

### Step 3: コンソールログを確認
- エラーメッセージの詳細を確認
- ネットワークタブでAPIリクエスト/レスポンスを確認

### Step 4: データベース接続テスト
1. 「データベース接続テスト」ボタンをクリック
2. 結果を確認：
   - ✅ 成功: `データベース接続OK - 通知数: X`
   - ❌ 失敗: エラーメッセージを確認

### Step 5: 基本通知テスト
1. 各通知タイプのボタンを順番にクリック
2. 結果を確認：
   - ✅ 成功: `通知が作成されました: notification-id`
   - ❌ 失敗: エラーメッセージを分析

### Step 6: 通知ページで確認
1. `/notifications` ページにアクセス
2. 作成された通知が表示されるかを確認
3. 通知の詳細が正しく表示されるかを確認

## ❗ よくあるエラーと対処法

### エラー1: "User not authenticated"
**原因**: ユーザーがログインしていない
**対処**: `/auth/login` でログインしてからテスト

### エラー2: "Table 'notifications' doesn't exist"
**原因**: データベーステーブルが作成されていない
**対処**: Supabaseダッシュボードでテーブル作成を確認

### エラー3: "Permission denied"
**原因**: RLS設定でアクセスが拒否されている
**対処**: Supabaseでテーブルのセキュリティ設定を確認

### エラー4: "Column doesn't exist"
**原因**: データベーススキーマとコードが一致していない
**対処**: スキーマ定義を確認して同期

### エラー5: "Invalid input syntax for type uuid"
**原因**: UUIDフォーマットが正しくない
**対処**: IDフィールドのフォーマットを確認

## 🔧 詳細デバッグ情報

### Supabaseでの確認事項
1. テーブル構造:
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  priority TEXT DEFAULT 'normal',
  status TEXT DEFAULT 'unread',
  data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE,
  is_sticky BOOLEAN DEFAULT FALSE
);
```

2. RLS設定:
```sql
-- ユーザーは自分の通知のみアクセス可能
CREATE POLICY "Users can access own notifications" ON notifications
FOR ALL USING (auth.uid() = user_id);
```

### ネットワークタブでの確認事項
- HTTPステータスコード（200が正常）
- リクエストボディの内容
- レスポンスボディのエラーメッセージ
- 認証ヘッダーの有無

### コンソールログでの確認事項
- `[NotificationService]` プレフィックスのログ
- エラースタックトレース
- Supabaseクライアントのエラー

## 📝 テスト結果記録用

| テスト項目 | 結果 | エラー内容 | 対処法 |
|------------|------|------------|--------|
| データベース接続 | [ ] | | |
| AI Insight通知 | [ ] | | |
| AI Summary通知 | [ ] | | |
| Card Extraction通知 | [ ] | | |
| ジョブ完了通知 | [ ] | | |
| 通知一覧表示 | [ ] | | |
| 既読マーク | [ ] | | | 