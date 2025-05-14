// Zoomセッションの型定義
export interface ZoomSession {
  id: string;
  title: string;
  date: string;
  duration: number; // 分単位
  participants: {
    id: string;
    name: string;
    email?: string;
    avatar?: string;
  }[];
  recording?: {
    url: string;
    duration: number;
    format: string;
    size?: number;
    accessPassword?: string;
  };
  notes?: string;
  tags?: string[];
  insights?: string[];
  userId: string;
  createdAt: string;
  updatedAt: string;
  meetingId?: string;
  googleDriveLink?: string;
  status: 'upcoming' | 'active' | 'completed' | 'canceled';
}

// Zoomセッションリストの状態管理用
export interface ZoomSessionListState {
  sessions: ZoomSession[];
  loading: boolean;
  error: string | null;
  filter: {
    status?: 'upcoming' | 'active' | 'completed' | 'canceled';
    dateRange?: {
      start: string;
      end: string;
    };
    search?: string;
  };
}

// Zoomセッション詳細の状態管理用
export interface ZoomSessionDetailState {
  session: ZoomSession | null;
  loading: boolean;
  error: string | null;
  relatedCards: string[]; // ボードカードのID
}

// Google Drive連携のための型定義
export interface GoogleDriveDocument {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string;
  iconLink: string;
  createdTime: string;
  modifiedTime: string;
  size?: number;
  thumbnailLink?: string;
} 