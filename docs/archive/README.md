# ポコの巣 - アーカイブプロジェクト

このディレクトリには、元のReact Nativeプロジェクト「ポコの巣」のコードが参照用に保存されています。
新プロジェクト（React Native Web + Tauri）の実装時に、このコードを参考として使用してください。

## プロジェクト概要

「ポコの巣」は、2人用のマイクロSNSアプリケーションで、以下の主要機能を提供します：

- 1:1チャット
- ボード（カンバン方式のメモ管理）
- Zoom会議連携
- クイックメモ

## フォルダ構造

- `components/` - UIコンポーネント
- `contexts/` - React Context による状態管理
- `screens/` - 画面コンポーネント
- `lib/` - ユーティリティ関数
- `supabase/` - Supabase連携コード
- `constants/` - 定数定義
- `types/` - TypeScript型定義

## 主要コンポーネントガイド

### 認証関連
- `contexts/AuthContext.tsx` - 認証状態管理
- `screens/LoginScreen.tsx` - ログイン画面
- `screens/RegisterScreen.tsx` - 登録画面

### チャット関連
- `contexts/MockChatContext.tsx` - チャット状態管理
- `screens/ChatScreen.tsx` - チャット画面
- `components/MessageBubble.tsx` - メッセージ表示コンポーネント

### ボード関連
- `contexts/BoardContext.tsx` - ボード状態管理
- `screens/BoardScreen.tsx` - ボード画面
- `components/Card*.tsx` - カード関連コンポーネント

### Zoom連携
- `screens/ZoomScreen.tsx` - Zoom会議リスト・管理画面

## プラットフォーム固有の実装

元のプロジェクトはReact Native専用で実装されており、以下の点に注意して移植してください：

1. **タッチ操作**
   - 多くのコンポーネントがタッチ操作に最適化されています
   - Web/デスクトップ環境ではマウス操作にも対応する必要があります

2. **レイアウト**
   - モバイル画面サイズ向けに最適化されています
   - Web/デスクトップではレスポンシブデザインに拡張する必要があります

3. **ストレージ**
   - `AsyncStorage` を使用している箇所は Web 環境では `localStorage` に置き換えるか抽象化が必要です

4. **プラットフォーム検出**
   - `Platform.OS === 'ios'` などの条件分岐は、Web 環境を含めるよう拡張が必要です

## Supabase連携

認証、データ保存、リアルタイム更新にSupabaseを使用しています：

- RLS (Row Level Security) でデータアクセス制御
- リアルタイムサブスクリプションでチャットとボードの更新
- ストレージでファイル管理

## 移植時の考慮点

1. **React Native Web への対応**
   - `SafeAreaView` などの RN 専用コンポーネントの Web 対応
   - スタイリングの Web 互換性（単位、レイアウト）

2. **Tauri 固有機能の活用**
   - ファイルシステムアクセス（Zoom録画ファイルなど）
   - システム通知
   - ウィンドウ管理

3. **レスポンシブUI**
   - モバイル、タブレット、デスクトップの各サイズ対応
   - レイアウトの動的調整

4. **開発者向け備考**
   - [その他、移植時に特に注意すべき点や特殊な実装など]

## 注意点

- これらのファイルは参照用であり、直接インポートして使用しないでください
- 必要なコードを新しいプロジェクト構造に合わせて適切に移植してください
- プラットフォーム固有の実装は、適切に抽象化または条件分岐してください