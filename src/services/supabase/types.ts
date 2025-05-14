import { PostgrestError, RealtimeChannel, Session, SupabaseClient, User } from '@supabase/supabase-js';

// ========== 認証関連の型定義 ==========

export interface UserProfile {
  id: string;
  email: string | null;
  display_name: string;
  avatar_url?: string | null;
  bio?: string | null;
  created_at: string;
  updated_at?: string | null;
}

export interface AuthResponse {
  user: User | null;
  session: Session | null;
  error: Error | null;
}

// ========== チャット関連の型定義 ==========

export interface ChatMessage {
  id: string;
  chat_room_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
  deleted_at?: string | null;
}

export interface ChatRoom {
  id: string;
  name: string;
  description?: string | null;
  created_at: string;
  updated_at?: string | null;
  creator_id: string;
  is_direct_message: boolean;
  participants?: ChatParticipant[];
  last_message?: ChatMessage;
}

export interface ChatParticipant {
  id: string;
  chat_room_id: string;
  user_id: string;
  joined_at: string;
  left_at?: string | null;
  profile?: UserProfile;
}

// ========== ボード関連の型定義 ==========

export interface Board {
  id: string;
  name: string;
  description?: string | null;
  created_at: string;
  updated_at?: string | null;
  owner_id: string;
  is_public: boolean;
}

export interface BoardColumn {
  id: string;
  board_id: string;
  name: string;
  order: number;
  created_at: string;
  updated_at?: string | null;
}

export interface BoardCard {
  id: string;
  column_id: string;
  content: string;
  order: number;
  created_at: string;
  updated_at?: string | null;
  creator_id: string;
  color?: string | null;
  origin_message_id?: string | null;
}

// ========== API関連の型定義 ==========

export interface ApiResponse<T> {
  data: T | null;
  error: Error | PostgrestError | null;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  count: number | null;
  next: number | null;
}

export interface SubscriptionHandler<T = any> {
  callback: (payload: T) => void;
  channel: RealtimeChannel;
}

// ========== その他のアプリケーション固有の型 ==========

export interface InsightTag {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface Insight {
  id: string;
  content: string;
  created_at: string;
  creator_id: string;
  origin_message_id?: string | null;
  tags?: InsightTag[];
}

// ========== Supabaseクライアント拡張型 ==========

export interface ExtendedSupabaseClient extends SupabaseClient {
  _isOffline?: boolean;
  _pendingOperations?: PendingOperation[];
}

export interface PendingOperation {
  id: string;
  type: 'insert' | 'update' | 'delete';
  table: string;
  data: any;
  filter?: Record<string, any>;
  timestamp: number;
  retryCount: number;
} 