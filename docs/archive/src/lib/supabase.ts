import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 本番環境では環境変数から取得するように修正予定
const supabaseUrl = 'https://fibhpcmpdduwtvnsxuhu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpYmhwY21wZGR1d3R2bnN4dWh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU4OTg4MDYsImV4cCI6MjA2MTQ3NDgwNn0.bnSHA0ee9mRbc4_suyDnPFE_CA_zezklHkWn70mnljE';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: { 'x-application-name': 'poconest' },
  },
});

// 型定義
export interface UserProfile {
  id: string;
  email: string;
  display_name: string;
  avatar_url?: string;
  created_at: string;
  last_seen_at?: string;
  default_nest_id?: string;
}

export interface Nest {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  owner_id: string;
  icon?: string;
  color?: string;
  is_active: boolean;
}

export interface NestMember {
  nest_id: string;
  user_id: string;
  role: 'owner' | 'member';
  joined_at: string;
  last_active_at?: string;
  users?: UserProfile;
}

export interface NestInvitation {
  id: string;
  nest_id: string;
  email: string;
  invited_by: string;
  created_at: string;
  expires_at?: string;
  token: string;
  is_accepted: boolean;
  accepted_at?: string;
  nests?: {
    id: string;
    name: string;
    description?: string;
  };
  inviters?: {
    id: string;
    display_name: string;
    avatar_url?: string;
  };
}

// チャットメッセージの型定義
export interface ChatMessage {
  id: string;
  nest_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  updated_at?: string;
  is_edited: boolean;
  read_by?: string[];
  has_pinned_to_board: boolean;
  reply_to_id?: string;
  metadata?: Record<string, any>;
}

// ボードアイテムの型定義
export type BoardColumnType = 'inbox' | 'insights' | 'themes' | 'zoom';

export interface BoardItem {
  id: string;
  nest_id: string;
  title: string;
  content: string;
  column_type: BoardColumnType;
  created_by: string;
  created_at: string;
  updated_at: string;
  updated_by?: string;
  source_message_id?: string;
  order_index: number;
  tags?: string[];
  is_archived: boolean;
  metadata?: Record<string, any>;
}

export interface NestPrivacySettings {
  inviteRestriction: 'owner_only' | 'members';  // 招待権限の制限
  contentVisibility: 'members_only' | 'public';  // コンテンツの公開範囲
  memberListVisibility: 'public' | 'members_only';  // メンバーリストの公開範囲
}

export interface NestSettings {
  nest_id: string;
  privacy_settings: NestPrivacySettings;
  theme?: string;
  notification_settings?: any;  // 将来の拡張用
  custom_emojis?: any;  // 将来の拡張用
  metadata?: any;  // 将来の拡張用
} 