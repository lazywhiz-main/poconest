import { ZoomSession, GoogleDriveDocument } from '../types/zoom';

// uuid関数の代わりにシンプルなID生成関数を使用（必要な場合）
const generateId = () => {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
};

// モックZoomセッションデータ
export const mockZoomSessions: ZoomSession[] = [
  {
    id: '1',
    title: 'プロジェクト立ち上げミーティング',
    date: new Date(2023, 8, 15, 13, 0).toISOString(),
    duration: 60, // 分単位
    participants: [
      { id: '1', name: 'あなた', email: 'you@example.com' },
      { id: '2', name: '田中', email: 'tanaka@example.com' },
      { id: '3', name: '佐藤', email: 'sato@example.com' },
      { id: '4', name: '山田', email: 'yamada@example.com' }
    ],
    recording: {
      url: 'https://zoom.us/rec/share/example-recording-1',
      duration: 3600,
      format: 'mp4',
      size: 125000000,
    },
    notes: 'プロジェクトの目標と役割分担について話し合いました。初期のマイルストーンを設定し、次回のミーティング日程を決定しました。',
    tags: ['プロジェクト計画', '立ち上げ', '重要'],
    insights: [
      '田中さんがデザインを担当',
      '佐藤さんがバックエンド開発を担当',
      '山田さんがフロントエンド開発を担当',
      '最初のデモは3週間後に予定'
    ],
    userId: '1',
    createdAt: new Date(2023, 8, 15, 14, 0).toISOString(),
    updatedAt: new Date(2023, 8, 15, 14, 0).toISOString(),
    meetingId: '123456789',
    googleDriveLink: 'https://drive.google.com/drive/folders/example-folder-1',
    status: 'completed',
  },
  {
    id: '2',
    title: 'ウィークリースクラム',
    date: new Date(2023, 8, 18, 10, 0).toISOString(),
    duration: 30, // 分単位
    participants: [
      { id: '1', name: 'あなた', email: 'you@example.com' },
      { id: '2', name: '田中', email: 'tanaka@example.com' },
      { id: '3', name: '佐藤', email: 'sato@example.com' }
    ],
    recording: {
      url: 'https://zoom.us/rec/share/example-recording-2',
      duration: 1800,
      format: 'mp4',
      size: 75000000,
    },
    notes: '各メンバーが先週の進捗と今週の予定を共有しました。いくつかの障害について議論し、解決策を見つけました。',
    tags: ['スクラム', '定例会議'],
    insights: [
      'デザインの最初のドラフトが完了',
      'APIの基本構造が実装済み',
      'フロントエンドのコンポーネント設計に遅れあり',
      '来週のマイルストーンを1週間延期'
    ],
    userId: '1',
    createdAt: new Date(2023, 8, 18, 10, 30).toISOString(),
    updatedAt: new Date(2023, 8, 18, 10, 30).toISOString(),
    meetingId: '987654321',
    googleDriveLink: 'https://drive.google.com/drive/folders/example-folder-2',
    status: 'completed',
  },
  {
    id: '3',
    title: 'クライアントミーティング',
    date: new Date(2023, 8, 20, 15, 0).toISOString(),
    duration: 45, // 分単位
    participants: [
      { id: '1', name: 'あなた', email: 'you@example.com' },
      { id: '5', name: '鈴木（クライアント）', email: 'suzuki@client.com' },
      { id: '6', name: '高橋（クライアント）', email: 'takahashi@client.com' }
    ],
    recording: {
      url: 'https://zoom.us/rec/share/example-recording-3',
      duration: 2700,
      format: 'mp4',
      size: 95000000,
    },
    notes: 'クライアントに現在の進捗状況を報告し、フィードバックを受けました。いくつかの機能について仕様の変更リクエストがありました。',
    tags: ['クライアント', '進捗報告', '要件変更'],
    insights: [
      'ダッシュボードのデザイン変更が必要',
      'レポート機能の追加要望あり',
      '納期は予定通り',
      '次回の進捗報告は2週間後'
    ],
    userId: '1',
    createdAt: new Date(2023, 8, 20, 15, 45).toISOString(),
    updatedAt: new Date(2023, 8, 20, 16, 0).toISOString(),
    meetingId: '456789123',
    googleDriveLink: 'https://drive.google.com/drive/folders/example-folder-3',
    status: 'completed',
  },
  {
    id: '4',
    title: 'デザインレビュー',
    date: new Date(2023, 8, 22, 11, 0).toISOString(),
    duration: 60, // 分単位
    participants: [
      { id: '1', name: 'あなた', email: 'you@example.com' },
      { id: '2', name: '田中', email: 'tanaka@example.com' },
      { id: '7', name: '中村（UXコンサルタント）', email: 'nakamura@ux.com' }
    ],
    recording: {
      url: 'https://zoom.us/rec/share/example-recording-4',
      duration: 3600,
      format: 'mp4',
      size: 120000000,
    },
    notes: '現在のデザインをレビューし、UXの改善点について議論しました。いくつかの画面で使いやすさの問題が指摘されました。',
    tags: ['デザイン', 'UX', 'レビュー'],
    insights: [
      'ナビゲーションの構造を簡略化する必要あり',
      'モバイル対応に問題あり、修正が必要',
      'カラースキームの調整を推奨',
      '次回のレビューで修正版を確認'
    ],
    userId: '1',
    createdAt: new Date(2023, 8, 22, 12, 0).toISOString(),
    updatedAt: new Date(2023, 8, 22, 12, 15).toISOString(),
    meetingId: '321654987',
    googleDriveLink: 'https://drive.google.com/drive/folders/example-folder-4',
    status: 'completed',
  },
  {
    id: '5',
    title: 'テクニカルディスカッション',
    date: new Date(2023, 8, 25, 14, 0).toISOString(),
    duration: 90, // 分単位
    participants: [
      { id: '1', name: 'あなた', email: 'you@example.com' },
      { id: '3', name: '佐藤', email: 'sato@example.com' },
      { id: '4', name: '山田', email: 'yamada@example.com' },
      { id: '8', name: '小林（インフラ担当）', email: 'kobayashi@infra.com' }
    ],
    recording: undefined, // 録画なし
    notes: 'アプリケーションのアーキテクチャとインフラについて議論しました。スケーラビリティとパフォーマンスの問題について解決策を検討しました。',
    tags: ['技術', 'アーキテクチャ', 'インフラ'],
    insights: [
      'データベース設計の見直しが必要',
      'キャッシング戦略を実装する',
      'APIのレスポンスタイムに問題あり',
      'マイクロサービスアーキテクチャへの移行を検討'
    ],
    userId: '1',
    createdAt: new Date(2023, 8, 25, 15, 30).toISOString(),
    updatedAt: new Date(2023, 8, 25, 15, 45).toISOString(),
    meetingId: '789123456',
    googleDriveLink: 'https://drive.google.com/drive/folders/example-folder-5',
    status: 'completed',
  },
  {
    id: '6',
    title: '次期プロジェクト計画',
    date: new Date(2023, 9, 5, 13, 0).toISOString(),
    duration: 120, // 分単位
    participants: [],  // まだ参加者が確定していない
    recording: undefined,
    notes: '',
    tags: ['計画', '次期プロジェクト'],
    insights: [],
    userId: '1',
    createdAt: new Date(2023, 8, 28, 10, 0).toISOString(),
    updatedAt: new Date(2023, 8, 28, 10, 0).toISOString(),
    meetingId: '',
    googleDriveLink: '',
    status: 'upcoming',
  },
];

// モックGoogleドキュメント
export const mockGoogleDriveDocuments: GoogleDriveDocument[] = [
  {
    id: 'doc1',
    name: 'プロジェクト計画書.docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    webViewLink: 'https://drive.google.com/file/d/example-doc-1',
    iconLink: 'https://drive-thirdparty.googleusercontent.com/16/type/application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    createdTime: new Date(2023, 8, 15, 14, 30).toISOString(),
    modifiedTime: new Date(2023, 8, 15, 16, 30).toISOString(),
    size: 1500000,
    thumbnailLink: 'https://drive.google.com/thumbnail?id=example-doc-1',
  },
  {
    id: 'doc2',
    name: 'ウィークリーレポート.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    webViewLink: 'https://drive.google.com/file/d/example-doc-2',
    iconLink: 'https://drive-thirdparty.googleusercontent.com/16/type/application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    createdTime: new Date(2023, 8, 18, 11, 0).toISOString(),
    modifiedTime: new Date(2023, 8, 18, 12, 0).toISOString(),
    size: 850000,
    thumbnailLink: 'https://drive.google.com/thumbnail?id=example-doc-2',
  },
  {
    id: 'doc3',
    name: 'クライアント提案資料.pptx',
    mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    webViewLink: 'https://drive.google.com/file/d/example-doc-3',
    iconLink: 'https://drive-thirdparty.googleusercontent.com/16/type/application/vnd.openxmlformats-officedocument.presentationml.presentation',
    createdTime: new Date(2023, 8, 19, 10, 0).toISOString(),
    modifiedTime: new Date(2023, 8, 20, 14, 0).toISOString(),
    size: 2500000,
    thumbnailLink: 'https://drive.google.com/thumbnail?id=example-doc-3',
  },
  {
    id: 'doc4',
    name: 'デザインガイドライン.pdf',
    mimeType: 'application/pdf',
    webViewLink: 'https://drive.google.com/file/d/example-doc-4',
    iconLink: 'https://drive-thirdparty.googleusercontent.com/16/type/application/pdf',
    createdTime: new Date(2023, 8, 22, 13, 0).toISOString(),
    modifiedTime: new Date(2023, 8, 22, 17, 0).toISOString(),
    size: 1200000,
    thumbnailLink: 'https://drive.google.com/thumbnail?id=example-doc-4',
  },
  {
    id: 'doc5',
    name: 'アーキテクチャ設計書.pdf',
    mimeType: 'application/pdf',
    webViewLink: 'https://drive.google.com/file/d/example-doc-5',
    iconLink: 'https://drive-thirdparty.googleusercontent.com/16/type/application/pdf',
    createdTime: new Date(2023, 8, 24, 9, 0).toISOString(),
    modifiedTime: new Date(2023, 8, 25, 16, 30).toISOString(),
    size: 1800000,
    thumbnailLink: 'https://drive.google.com/thumbnail?id=example-doc-5',
  },
]; 