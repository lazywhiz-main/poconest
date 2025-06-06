import { supabase } from './supabase/client';

export interface UserInfo {
  id: string;
  display_name: string;
  email: string;
  avatar_url?: string;
}

// ユーザー情報を取得
export async function getUserById(userId: string): Promise<UserInfo | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, display_name, email, avatar_url')
      .eq('id', userId)
      .single();

    if (error || !data) {
      console.warn('ユーザー情報取得エラー:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('ユーザー情報取得エラー:', error);
    return null;
  }
}

// 複数ユーザーの情報を一括取得
export async function getUsersByIds(userIds: string[]): Promise<Record<string, UserInfo>> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, display_name, email, avatar_url')
      .in('id', userIds);

    if (error || !data) {
      console.warn('複数ユーザー情報取得エラー:', error);
      return {};
    }

    return data.reduce((acc, user) => {
      acc[user.id] = user;
      return acc;
    }, {} as Record<string, UserInfo>);
  } catch (error) {
    console.error('複数ユーザー情報取得エラー:', error);
    return {};
  }
} 