# 音声文字起こしサービス (Google Cloud Run)

## 概要

このサービスは、Google Cloud Run 上で動作する音声文字起こしサービスです。
Supabase Edge Function からの委譲を受け、大容量音声ファイルの処理を行います。

## 特徴

- **無制限のメモリ・CPU**: Edge Function の制約を回避
- **ffmpeg対応**: 様々な音声形式に対応
- **Google Cloud Speech-to-Text**: 高精度な日本語文字起こし
- **話者分割**: 自動的な話者識別
- **非同期処理**: 長時間処理に対応
- **コールバック機能**: 処理完了をSupabaseに通知

## セットアップ

### 1. Google Cloud プロジェクト設定

```bash
# Google Cloud CLI でログイン
gcloud auth login

# プロジェクト設定
gcloud config set project YOUR_PROJECT_ID

# 必要なAPIを有効化
gcloud services enable speech.googleapis.com
gcloud services enable storage.googleapis.com
gcloud services enable run.googleapis.com
```

### 2. サービスアカウント作成

```bash
# サービスアカウント作成
gcloud iam service-accounts create transcription-service \
  --display-name="Transcription Service"

# 権限付与
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:transcription-service@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/speech.client"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:transcription-service@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/storage.objectViewer"
```

### 3. サービスアカウントキー作成

```bash
# キーファイル作成
gcloud iam service-accounts keys create service-account-key.json \
  --iam-account=transcription-service@YOUR_PROJECT_ID.iam.gserviceaccount.com
```

### 4. 環境変数設定

```bash
# .env ファイル作成
cp env.example .env

# 環境変数を編集
GOOGLE_APPLICATION_CREDENTIALS=./service-account-key.json
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
API_KEY=your-secure-api-key
```

### 5. ローカルテスト

```bash
# 依存関係インストール
npm install

# ローカル起動
npm run dev
```

### 6. Google Cloud Run デプロイ

```bash
# Docker イメージビルド
docker build -t gcr.io/YOUR_PROJECT_ID/transcription-service .

# Google Container Registry にプッシュ
docker push gcr.io/YOUR_PROJECT_ID/transcription-service

# Cloud Run にデプロイ
gcloud run deploy transcription-service \
  --image gcr.io/YOUR_PROJECT_ID/transcription-service \
  --platform managed \
  --region asia-northeast1 \
  --allow-unauthenticated \
  --memory 4Gi \
  --cpu 2 \
  --timeout 3600 \
  --set-env-vars "SUPABASE_URL=https://your-project.supabase.co,SUPABASE_SERVICE_ROLE_KEY=your-service-role-key,API_KEY=your-api-key"
```

## API 仕様

### POST /transcribe

音声ファイルの文字起こしを開始します。

**リクエスト:**
```json
{
  "fileUrl": "https://storage.example.com/audio.wav",
  "meetingId": "meeting-uuid",
  "nestId": "nest-uuid",
  "useGoogleCloud": true,
  "callbackUrl": "https://supabase.co/functions/v1/transcription-complete"
}
```

**レスポンス:**
```json
{
  "success": true,
  "jobId": "job_1234567890_abc123",
  "message": "文字起こし処理を開始しました"
}
```

### GET /health

ヘルスチェックエンドポイント

**レスポンス:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## 処理フロー

1. **リクエスト受信**: Supabase Edge Function から処理要求
2. **ファイルダウンロード**: 指定されたURLから音声ファイルを取得
3. **音声変換**: ffmpeg で FLAC 形式に変換
4. **文字起こし**: Google Cloud Speech-to-Text で処理
5. **結果整形**: 話者分割情報を含む結果を整形
6. **コールバック送信**: Supabase に結果を送信

## トラブルシューティング

### よくあるエラー

1. **認証エラー**
   - サービスアカウントキーが正しく設定されているか確認
   - 必要な権限が付与されているか確認

2. **メモリ不足**
   - Cloud Run のメモリ設定を増やす（4Gi推奨）
   - 大きなファイルは分割処理を検討

3. **タイムアウト**
   - Cloud Run のタイムアウト設定を増やす（3600秒推奨）
   - 長時間の音声ファイルは注意

### ログ確認

```bash
# Cloud Run のログを確認
gcloud logs read --service=transcription-service --limit=50
```

## コスト最適化

- **CPU**: 必要に応じて調整（0.5-2 CPU）
- **メモリ**: ファイルサイズに応じて調整（1-4 Gi）
- **インスタンス**: 最小インスタンス数を0に設定
- **タイムアウト**: 適切な値に設定（3600秒推奨）

## セキュリティ

- API キーによる認証
- サービスアカウントの最小権限原則
- HTTPS 通信の強制
- 一時ファイルの自動削除
