// ボードのカラム定義
export enum BoardColumnType {
  INBOX = 'inbox',
  INSIGHTS = 'insights',
  THEMES = 'themes',
  ZOOM = 'zoom'
}

// カードの型定義
export interface Card {
  id: string;
  title: string;
  description: string;
  column: BoardColumnType;
  created_at: string;
  updated_at: string;
  user_id: string;
  tags?: string[];
  order: number;
  sourceType?: 'chat' | 'zoom' | 'manual';
  sourceId?: string;
  metadata?: {
    source?: string;
    attachments?: {
      type: 'image' | 'file' | 'link';
      url: string;
      name: string;
    }[];
    [key: string]: any;
  };
}

// ボードの表示設定
export interface BoardViewSettings {
  sortBy: 'createdAt' | 'updatedAt' | 'title';
  sortDirection: 'asc' | 'desc';
  filter: {
    tags?: string[];
    search?: string;
    dateRange?: {
      start: string;
      end: string;
    };
  };
}

// ボードの状態管理用
export interface BoardState {
  cards: Card[];
  loading: boolean;
  error: string | null;
  viewSettings: BoardViewSettings;
} 