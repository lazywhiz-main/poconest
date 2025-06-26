# 文字起こし機能実装設計書

**作成日**: 2025年6月26日  
**ステータス**: Phase 1 実装中

## 📋 概要

PocoNestにおける音声・動画ファイルの文字起こし機能の実装設計と将来拡張計画について記載。

## 🎯 実装フェーズ

### Phase 1: 基本実装（現在）

#### 対応ファイル形式
- **テキストファイル** (.txt): 直接transcript更新
- **音声ファイル** (.mp3, .wav, .m4a): 文字起こしジョブ実行
- **動画ファイル** (.mp4, .webm, .mov): 文字起こしジョブ実行

#### アップロード方式
1. **新規ミーティング作成**: ドラッグ&ドロップ
2. **既存ミーティング追加**: アップロードボタン

#### 処理フロー
```
ファイルアップロード → Supabase Storage保存 → 文字起こしジョブ作成 → TranscriptionProcessor実行 → 結果をDBに保存
```

### Phase 2: 将来拡張（検討中）

#### 追加予定機能
- **クラウドストレージ連携**: Google Drive, Dropbox, OneDrive
- **リアルタイム会議連携**: Zoom, Google Meet, Microsoft Teams
- **高精度文字起こし**: OpenAI Whisper, Google Speech-to-Text
- **資料管理**: PDF, 画像ファイルの保存・管理

## 🏗️ アーキテクチャ設計

### データベース構造

#### meetings テーブル
```sql
- transcript: text          -- 文字起こし結果（ソース問わず統一）
- recording_url: text       -- 音声ファイル参照
- ai_summary: text         -- AI要約結果
```

#### background_jobs テーブル
```sql
- type: 'transcription'    -- ジョブタイプ
- metadata: jsonb          -- 柔軟なメタデータ構造
- status: JobStatus        -- pending/running/completed/failed
- progress: integer        -- 進行状況（0-100）
```

### Storage構造

#### 現在の実装
```
meeting-files/
  └── [meetingId]_[timestamp]_[sanitizedFileName]
```

#### 将来の拡張（予定）
```
meeting-files/
  └── meetings/[meetingId]/
      ├── uploaded/          -- アップロードファイル
      ├── google_drive/      -- Google Drive連携
      ├── zoom/             -- Zoom録画
      └── teams/            -- Teams録画
```

### バックグラウンドジョブシステム

#### TranscriptionProcessor
```javascript
class TranscriptionProcessor {
  async process(job: BackgroundJob) {
    const source = job.metadata.source || 'file_upload';
    
    switch (source) {
      case 'file_upload':     // 現在実装済み
        return await this.processFileUpload(job);
      case 'google_drive':    // 将来実装
        return await this.processGoogleDrive(job);
      case 'zoom_api':        // 将来実装
        return await this.processZoomRecording(job);
    }
  }
}
```

## 📊 メタデータ構造設計

### Phase 1: 現在の実装
```javascript
{
  source: 'file_upload',      // 必須フィールド
  nestId: string,
  userId: string,
  meetingTitle: string,
  fileName: string,
  fileSize: number,
  fileType: string,
  storagePath: string         // Supabase Storage path
}
```

### Phase 2: 将来拡張
```javascript
{
  source: 'file_upload' | 'google_drive' | 'zoom_api' | 'teams_api',
  sourceId?: string,          // 外部サービスID
  externalUrl?: string,       // 外部サービスURL
  accessToken?: string,       // API認証情報（暗号化）
  // ... 既存フィールド
}
```

## 🔧 技術実装詳細

### ファイル名サニタイズ
```javascript
const sanitizedFileName = file.name
  .replace(/[^a-zA-Z0-9.-]/g, '_')  // 英数字、ドット、ハイフン以外をアンダースコアに
  .replace(/_{2,}/g, '_')           // 連続するアンダースコアを1つに
  .toLowerCase();                   // 小文字に統一
```

### Supabase Storage設定
- **バケット名**: `meeting-files`
- **Public bucket**: 有効
- **MIME types**: `audio/*, video/*, text/*`
- **ファイルサイズ制限**: 100MB

### RLSポリシー
```sql
-- アップロード権限
CREATE POLICY "Allow authenticated users to upload files" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'meeting-files' AND auth.role() = 'authenticated');

-- 読み取り権限  
CREATE POLICY "Allow public read access" ON storage.objects
FOR SELECT USING (bucket_id = 'meeting-files');

-- 更新・削除権限
CREATE POLICY "Allow authenticated users to update/delete files" ON storage.objects
FOR UPDATE/DELETE USING (bucket_id = 'meeting-files' AND auth.role() = 'authenticated');
```

## 🎨 UI/UX設計

### 処理状況表示
- **●オレンジ**: 文字起こし処理中
- **●緑**: 文字起こし完了
- **●赤**: 処理失敗

### エラーハンドリング
- ファイルサイズ超過: 100MB制限の明示
- 非対応形式: サポート形式の案内
- アップロード失敗: 具体的なエラーメッセージ

## 📈 将来拡張計画

### 1. Google Drive連携
- **実装時期**: Phase 2
- **技術**: Google Drive API v3
- **認証**: OAuth 2.0
- **処理**: ファイルダウンロード → 文字起こし

### 2. リアルタイム会議連携
- **実装時期**: Phase 3
- **対象**: Zoom, Google Meet, Microsoft Teams
- **技術**: 各サービスのAPI + WebRTC
- **処理**: リアルタイム音声取得 → ストリーミング文字起こし

### 3. 高精度文字起こし
- **実装時期**: Phase 2-3
- **技術**: OpenAI Whisper API
- **機能**: 多言語対応、話者分離、専門用語対応

## 🚨 既知の課題と解決済み問題

### 解決済み
- ✅ **ファイル名問題**: 日本語・特殊文字のサニタイズ
- ✅ **Storage権限**: RLSポリシー設定
- ✅ **ワーカー認識**: TranscriptionProcessor登録
- ✅ **処理フロー**: Blob URL → Storage Path方式

### 対応中
- 🔄 **新規ミーティング作成**: Storage方式への統一
- 🔄 **エラーハンドリング**: 詳細なログ出力

### 今後の課題
- 📋 **パフォーマンス**: 大容量ファイルの処理最適化
- 📋 **コスト管理**: 文字起こしAPI使用量の監視
- 📋 **セキュリティ**: 音声データの暗号化

## 🔗 関連ファイル

### 実装ファイル
- `src/features/nest-space/meeting-space/components/MeetingSpace.tsx`
- `src/services/backgroundJobWorker.ts`
- `src/features/meeting-space/hooks/useBackgroundJobs.ts`

### 設定ファイル
- `supabase/config.toml`
- Supabase Studio: Storage policies

### ドキュメント
- `docs/transcription-feature-implementation.md` (本ファイル)

---

**最終更新**: 2025年6月26日  
**次回レビュー**: Phase 1 完了後 