import { AuthError, AuthResponse as SupabaseAuthResponse, AuthTokenResponse, Session, User } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import { supabase } from './client';
import { ApiResponse, AuthResponse, UserProfile } from './types';

/**
 * エラーハンドリング用のラッパー関数
 */
const handleAuthError = (error: AuthError | null): string => {
  if (!error) return 'エラーが発生しました';
  
  // エラーメッセージの日本語化
  const errorMessages: Record<string, string> = {
    'invalid_credentials': 'メールアドレスまたはパスワードが間違っています',
    'email_not_confirmed': 'メールアドレスの確認が必要です',
    'user_not_found': 'ユーザーが見つかりません',
    'invalid_login_credentials': 'メールアドレスまたはパスワードが間違っています',
    'email_signup_disabled': 'メールによるサインアップが無効になっています',
    'phone_signup_disabled': '電話番号によるサインアップが無効になっています',
    'unauthorized_role': '権限がありません',
    'password_recovery_disabled': 'パスワード回復が無効になっています',
    'rate_limit_exceeded': 'リクエスト数が多すぎます。しばらく時間をおいてお試しください',
  };
  
  // エラーメッセージの変換
  if (errorMessages[error.name]) {
    return errorMessages[error.name];
  }
  
  // 特定のエラーメッセージに基づく処理
  if (error.message.includes('Invalid login credentials')) {
    return 'メールアドレスまたはパスワードが間違っています';
  }
  
  if (error.message.includes('Email not confirmed')) {
    return 'メールアドレスの確認が完了していません。受信したメールの確認リンクをクリックしてください';
  }
  
  if (error.message.includes('Invalid email')) {
    return '有効なメールアドレスを入力してください';
  }
  
  if (error.message.includes('Password should be')) {
    return 'パスワードは6文字以上で入力してください';
  }
  
  return error.message || 'エラーが発生しました。もう一度お試しください';
};

/**
 * メールアドレスとパスワードでログイン
 */
export const signInWithEmail = async (
  email: string,
  password: string
): Promise<AuthResponse> => {
  try {
    // バリデーション
    if (!email || !email.includes('@')) {
      return { 
        user: null, 
        session: null,
        error: new Error('有効なメールアドレスを入力してください') 
      };
    }
    
    if (!password || password.length < 6) {
      return { 
        user: null, 
        session: null,
        error: new Error('パスワードは6文字以上で入力してください') 
      };
    }
    
    // Supabaseへのログインリクエスト
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      return {
        user: null,
        session: null,
        error: new Error(handleAuthError(error))
      };
    }
    
    return {
      user: data.user,
      session: data.session,
      error: null
    };
  } catch (error: any) {
    console.error('ログインエラー:', error.message);
    return {
      user: null,
      session: null,
      error: new Error(error.message || 'ログイン処理中にエラーが発生しました')
    };
  }
};

/**
 * メールアドレスとパスワードで新規登録
 */
export const signUpWithEmail = async (
  email: string,
  password: string,
  displayName: string
): Promise<AuthResponse> => {
  try {
    // バリデーション
    if (!email || !email.includes('@')) {
      return { 
        user: null, 
        session: null,
        error: new Error('有効なメールアドレスを入力してください') 
      };
    }
    
    if (!password || password.length < 6) {
      return { 
        user: null, 
        session: null,
        error: new Error('パスワードは6文字以上で入力してください') 
      };
    }
    
    if (!displayName || displayName.trim().length < 2) {
      return {
        user: null,
        session: null,
        error: new Error('名前は2文字以上で入力してください')
      };
    }
    
    // Supabaseへの新規登録リクエスト
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName
        }
      }
    });
    
    if (error) {
      return {
        user: null,
        session: null,
        error: new Error(handleAuthError(error))
      };
    }
    
    // ユーザープロフィールの作成
    if (data.user) {
      try {
        await createUserProfile(data.user.id, {
          email: data.user.email || '',
          display_name: displayName,
          created_at: new Date().toISOString()
        });
      } catch (profileError: any) {
        console.warn('プロフィール作成エラー:', profileError.message);
        // プロフィール作成のエラーはユーザー作成自体を失敗とはしない
      }
    }
    
    return {
      user: data.user,
      session: data.session,
      error: null
    };
  } catch (error: any) {
    console.error('新規登録エラー:', error.message);
    return {
      user: null,
      session: null,
      error: new Error(error.message || '登録処理中にエラーが発生しました')
    };
  }
};

/**
 * ログアウト
 */
export const signOut = async (): Promise<{ error: Error | null }> => {
  try {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      return { error: new Error(handleAuthError(error)) };
    }
    
    // Webの場合は追加のクリーンアップ
    if (Platform.OS === 'web' && typeof localStorage !== 'undefined') {
      localStorage.removeItem('supabase.auth.token');
      localStorage.removeItem('poconest.auth.session');
    }
    
    return { error: null };
  } catch (error: any) {
    console.error('ログアウトエラー:', error.message);
    return { error: new Error(error.message || 'ログアウト処理中にエラーが発生しました') };
  }
};

/**
 * パスワードリセットメールの送信
 */
export const sendPasswordResetEmail = async (
  email: string
): Promise<{ error: Error | null }> => {
  try {
    // バリデーション
    if (!email || !email.includes('@')) {
      return { error: new Error('有効なメールアドレスを入力してください') };
    }
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    });
    
    if (error) {
      return { error: new Error(handleAuthError(error)) };
    }
    
    return { error: null };
  } catch (error: any) {
    console.error('パスワードリセットメール送信エラー:', error.message);
    return { error: new Error(error.message || 'パスワードリセットメール送信中にエラーが発生しました') };
  }
};

/**
 * パスワードの更新
 */
export const updatePassword = async (
  password: string
): Promise<{ error: Error | null }> => {
  try {
    // バリデーション
    if (!password || password.length < 6) {
      return { error: new Error('パスワードは6文字以上で入力してください') };
    }
    
    const { error } = await supabase.auth.updateUser({
      password
    });
    
    if (error) {
      return { error: new Error(handleAuthError(error)) };
    }
    
    return { error: null };
  } catch (error: any) {
    console.error('パスワード更新エラー:', error.message);
    return { error: new Error(error.message || 'パスワード更新中にエラーが発生しました') };
  }
};

/**
 * 現在のセッションを取得
 */
export const getCurrentSession = async (): Promise<{ session: Session | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      return { session: null, error: new Error(handleAuthError(error)) };
    }
    
    return { session: data.session, error: null };
  } catch (error: any) {
    console.error('セッション取得エラー:', error.message);
    return { session: null, error: new Error(error.message || 'セッション取得中にエラーが発生しました') };
  }
};

/**
 * 現在のユーザーを取得
 */
export const getCurrentUser = async (): Promise<{ user: User | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase.auth.getUser();
    
    if (error) {
      return { user: null, error: new Error(handleAuthError(error)) };
    }
    
    return { user: data.user, error: null };
  } catch (error: any) {
    console.error('ユーザー取得エラー:', error.message);
    return { user: null, error: new Error(error.message || 'ユーザー取得中にエラーが発生しました') };
  }
};

/**
 * ユーザープロフィールの取得
 */
export const getUserProfile = async (userId: string): Promise<ApiResponse<UserProfile>> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) {
      return { data: null, error: new Error(error.message) };
    }
    
    return { data: data as UserProfile, error: null };
  } catch (error: any) {
    console.error('プロフィール取得エラー:', error.message);
    return { data: null, error: new Error(error.message || 'プロフィール取得中にエラーが発生しました') };
  }
};

/**
 * ユーザープロフィールの作成
 */
export const createUserProfile = async (
  userId: string,
  profile: Omit<UserProfile, 'id'>
): Promise<ApiResponse<UserProfile>> => {
  try {
    const newProfile = {
      ...profile,
      id: userId,
      created_at: profile.created_at || new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('users')
      .insert([newProfile])
      .select()
      .single();
    
    if (error) {
      return { data: null, error: new Error(error.message) };
    }
    
    return { data: data as UserProfile, error: null };
  } catch (error: any) {
    console.error('プロフィール作成エラー:', error.message);
    return { data: null, error: new Error(error.message || 'プロフィール作成中にエラーが発生しました') };
  }
};

/**
 * ユーザープロフィールの更新
 */
export const updateUserProfile = async (
  userId: string,
  updates: Partial<UserProfile>
): Promise<ApiResponse<UserProfile>> => {
  try {
    // 更新不可フィールドを除外
    const { id, created_at, ...validUpdates } = updates;
    
    const updatedData = {
      ...validUpdates,
      updated_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('users')
      .update(updatedData)
      .eq('id', userId)
      .select()
      .single();
    
    if (error) {
      return { data: null, error: new Error(error.message) };
    }
    
    return { data: data as UserProfile, error: null };
  } catch (error: any) {
    console.error('プロフィール更新エラー:', error.message);
    return { data: null, error: new Error(error.message || 'プロフィール更新中にエラーが発生しました') };
  }
}; 