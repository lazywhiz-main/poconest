// チャットメッセージの型定義
export interface ChatMessage {
  id: string;
  nest_id: string;
  chat_room_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  updated_at?: string;
  is_edited: boolean;
  read_by?: Record<string, number>; // ユーザーIDとタイムスタンプのマッピング
  has_pinned_to_board: boolean;
  reply_to_id?: string;
  metadata?: Record<string, any>;
}

// UI表示用のメッセージ型
export interface UIMessage extends ChatMessage {
  sender: {
    id: string;
    name: string;
    avatar?: string;
    isBot?: boolean;
  };
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  attachments?: {
    id: string;
    type: 'image' | 'file' | 'link';
    url: string;
    name: string;
    size?: number;
    preview?: string;
  }[];
}

// チャットルームの型定義
export interface ChatRoom {
  id: string;
  nest_id: string;
  name: string;
  description?: string;
  created_at: string;
  created_by: string;
  is_default: boolean;
  is_archived: boolean;
  metadata?: Record<string, any>;
}

// UI表示用のチャットルーム型
export interface UIChatRoom extends ChatRoom {
  participants?: {
    id: string;
    name: string;
    avatar?: string;
    isOnline?: boolean;
  }[];
  lastMessage?: {
    content: string;
    sender_id: string;
    sender_name: string;
    timestamp: string;
    status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  };
  unreadCount: number;
}

// チャットリストの状態管理用
export interface ChatListState {
  chatRooms: UIChatRoom[];
  loading: boolean;
  error: string | null;
  activeChatRoomId: string | null;
}

// チャットメッセージの状態管理用
export interface ChatMessageState {
  messages: UIMessage[];
  loading: boolean;
  error: string | null;
  sending: boolean;
  loadingMore: boolean;
  hasMore: boolean;
}

// メッセージ作成用のデータ型
export interface CreateMessageData {
  nest_id: string;
  chat_room_id: string;
  content: string;
  reply_to_id?: string;
  metadata?: Record<string, any>;
}

// 既読情報の型
export interface ReadStatus {
  user_id: string;
  timestamp: number;
}

// メッセージフィルター用の型
export interface MessageFilter {
  sender_id?: string;
  from_date?: string;
  to_date?: string;
  has_attachment?: boolean;
  is_pinned?: boolean;
}

// Insight（洞察）の型定義
export interface Insight {
  id: string;
  content: string;
  chat_room_id: string;
  message_ids: string[];
  type: 'action' | 'decision' | 'question' | 'idea';
  priority: 'low' | 'medium' | 'high';
  timestamp: number;
  tags?: string[];
} 