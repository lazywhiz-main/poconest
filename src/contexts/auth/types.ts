import { Session, User } from '@supabase/supabase-js';

// ユーザープロフィールの型定義
export interface UserProfile {
  id: string;
  email: string | null;
  display_name: string;
  avatar_url?: string | null;
  bio?: string | null;
  created_at: string;
  updated_at?: string | null;
}

// 認証状態の型定義
export interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  initialized: boolean;
}

// 認証コンテキストの型定義
export interface AuthContextProps {
  // 状態
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  
  // メソッド
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, displayName: string) => Promise<{ error: Error | null; user: User | null }>;
  signOut: () => Promise<{ error: Error | null }>;
  updateProfile: (data: Partial<UserProfile>) => Promise<{ error: Error | null }>;
  
  // ユーティリティ
  clearError: () => void;
  isAuthenticated: boolean;
} 