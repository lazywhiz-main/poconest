# PocoNest

会議の文字起こしと分析を行うWebアプリケーション

## 機能

- 音声・動画ファイルの文字起こし（Google Cloud Speech-to-Text）
- 話者分割機能
- 会議の分析と要約
- カード抽出機能
- リアルタイムコラボレーション

## セットアップ

### 必要な環境変数

`.env`ファイルを作成し、以下の環境変数を設定してください：

```env
# Supabase
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# OpenAI
VITE_OPENAI_API_KEY=your_openai_api_key

# Google Cloud Speech-to-Text
VITE_GOOGLE_CLOUD_API_KEY=your_google_cloud_api_key

# Gemini
VITE_GEMINI_API_KEY=your_gemini_api_key
```

### Google Cloud Speech-to-Text API設定

1. Google Cloud Consoleでプロジェクトを作成
2. Speech-to-Text APIを有効化
3. APIキーを作成
4. Google Cloud Storageバケットを作成（`poconest-audio-files`）

### インストール

```bash
npm install
npm run dev
```

## 技術スタック

- React + TypeScript
- Supabase (Database, Auth, Storage)
- Google Cloud Speech-to-Text API
- OpenAI API
- Gemini API