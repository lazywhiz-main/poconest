import { BoardColumnType, Card } from '../types/board';

// uuid関数の代わりにシンプルなID生成関数を使用
const generateId = () => {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
};

// ボードのモックデータ
export const mockCards: Card[] = [
  {
    id: '1',
    title: 'プロジェクト企画書作成',
    description: 'ポコネストのプロジェクト企画書を作成する。目標、スケジュール、予算を含める。',
    column: BoardColumnType.INBOX,
    created_at: new Date(2023, 6, 15).toISOString(),
    updated_at: new Date(2023, 6, 15).toISOString(),
    user_id: '1',
    tags: ['仕事', '企画'],
    order: 0,
    sourceType: 'manual'
  },
  {
    id: '2',
    title: 'デザインミーティングの振り返り',
    description: 'デザインチームとのミーティングでの決定事項をまとめる。UIの方向性と次のステップ。',
    column: BoardColumnType.INSIGHTS,
    created_at: new Date(2023, 6, 20).toISOString(),
    updated_at: new Date(2023, 6, 21).toISOString(),
    user_id: '1',
    tags: ['仕事', 'デザイン', 'ミーティング'],
    order: 1,
    sourceType: 'chat',
    sourceId: '123'
  },
  {
    id: '3',
    title: 'ユーザー調査の主な発見',
    description: 'ユーザー調査から得られた主な発見と洞察。ペルソナの更新が必要かも。',
    column: BoardColumnType.THEMES,
    created_at: new Date(2023, 7, 1).toISOString(),
    updated_at: new Date(2023, 7, 5).toISOString(),
    user_id: '1',
    tags: ['リサーチ', 'ユーザー'],
    order: 2,
    sourceType: 'manual'
  },
  {
    id: '4',
    title: 'アプリの新機能アイデア',
    description: 'ユーザーフィードバックと競合分析から得られた新機能のアイデア。優先順位を付ける必要あり。',
    column: BoardColumnType.INSIGHTS,
    created_at: new Date(2023, 7, 10).toISOString(),
    updated_at: new Date(2023, 7, 10).toISOString(),
    user_id: '1',
    tags: ['機能', 'アイデア'],
    order: 3,
    sourceType: 'manual'
  },
  {
    id: '5',
    title: '商品開発計画のレビュー',
    description: '商品開発計画の最新版をレビューして、フィードバックをまとめる。技術チームと協議が必要。',
    column: BoardColumnType.INBOX,
    created_at: new Date(2023, 7, 15).toISOString(),
    updated_at: new Date(2023, 7, 15).toISOString(),
    user_id: '1',
    tags: ['仕事', '計画'],
    order: 4,
    sourceType: 'chat',
    sourceId: '456'
  },
  {
    id: '6',
    title: 'マーケティングキャンペーンのアイデア',
    description: 'ソーシャルメディアでのマーケティングキャンペーンのアイデアブレスト結果。対象ユーザーと訴求ポイント。',
    column: BoardColumnType.INBOX,
    created_at: new Date(2023, 7, 20).toISOString(),
    updated_at: new Date(2023, 7, 20).toISOString(),
    user_id: '1',
    tags: ['マーケティング', 'アイデア'],
    order: 5,
    sourceType: 'chat',
    sourceId: '789'
  },
  {
    id: '7',
    title: 'チーム週次ミーティング',
    description: '週次ミーティングでの進捗報告と次週の計画。各メンバーのタスク割り当て。',
    column: BoardColumnType.ZOOM,
    created_at: new Date(2023, 7, 25).toISOString(),
    updated_at: new Date(2023, 7, 25).toISOString(),
    user_id: '1',
    tags: ['チーム', 'ミーティング', '計画'],
    order: 6,
    sourceType: 'zoom',
    sourceId: '1011',
    metadata: {
      source: 'Zoom',
      attachments: [
        {
          type: 'link',
          url: 'https://example.com/meeting-notes',
          name: 'ミーティングノート'
        }
      ]
    }
  },
  {
    id: '8',
    title: 'ユーザビリティテスト結果',
    description: '最新バージョンのユーザビリティテスト結果。発見された問題点と改善すべき点。',
    column: BoardColumnType.THEMES,
    created_at: new Date(2023, 8, 10).toISOString(),
    updated_at: new Date(2023, 8, 10).toISOString(),
    user_id: '1',
    tags: ['リサーチ', 'UX'],
    order: 7,
    sourceType: 'chat',
    sourceId: '1213'
  }
]; 