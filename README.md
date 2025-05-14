# ポコの巣 (PocoNest)

マイクロSNSアプリケーション - React Native Web + Tauri

## プロジェクト概要

「ポコの巣」は、2人用のマイクロSNSアプリケーションで、以下の主要機能を提供します：

- 1:1チャット
- ボード（カンバン方式のメモ管理）
- Zoom会議連携
- クイックメモ

## 技術スタック

- **フロントエンド**：React Native Web
- **デスクトップ**：Tauri（Rust）
- **モバイル**：React Native
- **データベース**：Supabase
- **認証**：Supabase Auth

## 開発環境のセットアップ

### 前提条件

- Node.js 16+
- Rust (Tauri用)
- Android Studio (Android開発用)
- Xcode (iOS開発用)

### インストール手順

1. リポジトリのクローン:

```bash
git clone https://github.com/yourusername/poconest.git
cd poconest
```

2. 依存関係のインストール:

```bash
npm install
```

3. 開発サーバーの起動:

- Webアプリケーション:

```bash
npm run dev
```

- Tauriアプリケーション:

```bash
npm run tauri dev
```

- iOSアプリケーション:

```bash
npm run start:ios
```

- Androidアプリケーション:

```bash
npm run start:android
```

## プロジェクト構造

```
src/
├── components/         # 共通UIコンポーネント
│   ├── common/         # 基本UI要素（ボタン、入力フィールドなど）
│   ├── layout/         # レイアウト関連（ヘッダー、サイドバーなど）
│   └── features/       # 機能固有のコンポーネント
├── screens/            # 画面コンポーネント
│   ├── auth/           # 認証関連画面（ログイン、登録など）
│   ├── board/          # ボード機能画面
│   ├── chat/           # チャット機能画面
│   └── ... 
├── contexts/           # コンテキストAPIによる状態管理
├── hooks/              # カスタムフック
├── services/           # APIやバックエンド連携
│   └── supabase/       # Supabase連携コード
├── utils/              # ユーティリティ関数
├── constants/          # 定数定義（色、テーマ、設定など）
├── types/              # TypeScript型定義
├── navigation/         # ナビゲーション設定
├── assets/             # 静的アセット（画像、フォントなど）
└── platform/           # プラットフォーム固有のコード
    ├── web/            # Web固有の実装
    ├── mobile/         # モバイル固有の実装
    └── desktop/        # Tauri固有の実装
```

## 環境変数

`.env`ファイルを作成し、以下の変数を設定してください：

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## ビルド方法

- **Webアプリケーション**:

```bash
npm run build
```

- **Tauriアプリケーション**:

```bash
npm run tauri build
```

## 貢献ガイドライン

貢献する前に、以下のガイドラインをご確認ください：

1. `main`ブランチから機能ブランチを作成
2. 変更点をコミット
3. プルリクエストを作成

## ライセンス

[MIT License](LICENSE)