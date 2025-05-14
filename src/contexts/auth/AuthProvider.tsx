import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import { Session, User } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@services/supabase';
import AuthContext from './AuthContext';
import { UserProfile, AuthState } from './types';
import { getJapaneseErrorMessage } from './utils';

// LocalStorage/AsyncStorageのキー
const SESSION_STORAGE_KEY = 'supabase_session';

// StorageアダプターをPlatformに基づいて実装
const storage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }
    return await AsyncStorage.getItem(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
    } else {
      await AsyncStorage.setItem(key, value);
    }
  },
  async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
    } else {
      await AsyncStorage.removeItem(key);
    }
  }
};

// AuthProviderコンポーネント
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 状態の初期化
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    session: null,
    loading: false,
    error: null,
    initialized: false,
  });

  // ステート更新を追跡するためのref
  const userRef = useRef<User | null>(null);
  const sessionRef = useRef<Session | null>(null);

  // エラーをクリアする関数
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // ユーザープロフィールの取得
  const fetchUserProfile = useCallback(async (userId: string) => {
    try {
      console.log('AuthProvider: プロフィール取得開始', { userId });

      if (!userRef.current || userRef.current.id !== userId) {
        throw new Error('ユーザーIDが一致しません。再度ログインしてください。');
      }

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('プロフィール取得エラー:', error);
        
        if (error.code === 'PGRST116') {
          console.log('プロフィールが存在しないため、新規作成を試みます');
          // プロフィールが存在しない場合は作成
          const { data: newProfile, error: createError } = await supabase
            .from('users')
            .insert({
              id: userId,
              email: userRef.current.email,
              display_name: userRef.current.email?.split('@')[0] || 'ユーザー',
              created_at: new Date().toISOString(),
            })
            .select()
            .single();

          if (createError) {
            console.error('プロフィール作成エラー:', createError);
            throw new Error(`プロフィールの作成に失敗しました: ${createError.message}`);
          }

          if (newProfile) {
            console.log('プロフィール作成成功:', newProfile);
            setState(prev => ({ ...prev, profile: newProfile as UserProfile }));
            return;
          }
        }
        throw new Error(`プロフィールの取得に失敗しました: ${error.message}`);
      }

      if (data) {
        console.log('プロフィール取得成功:', data);
        setState(prev => ({ ...prev, profile: data as UserProfile }));
      } else {
        throw new Error('プロフィールの取得に失敗しました: データが存在しません');
      }
    } catch (err: any) {
      console.error('プロフィール取得エラー:', err.message);
      setState(prev => ({ 
        ...prev, 
        error: err.message || getJapaneseErrorMessage('unknown', err.message) 
      }));
      
      // エラーが発生した場合は状態をクリア
      if (err.message.includes('ユーザーセッション') || err.message.includes('ユーザーID')) {
        setState(prev => ({ 
          ...prev,
          user: null,
          session: null,
          profile: null,
        }));
        userRef.current = null;
        sessionRef.current = null;
      }
    }
  }, []);

  // セッション設定とユーザー更新
  const setSessionAndUser = useCallback(async (session: Session | null) => {
    try {
      if (session?.user) {
        // ステートとrefを更新
        userRef.current = session.user;
        sessionRef.current = session;
        
        setState(prev => ({
          ...prev,
          user: session.user,
          session: session,
          isAuthenticated: true,
        }));
        
        // セッションをストレージに保存
        if (session) {
          await storage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
        }
        
        // プロフィール取得
        await fetchUserProfile(session.user.id);
      } else {
        // ログアウト時のクリーンアップ
        userRef.current = null;
        sessionRef.current = null;
        
        setState(prev => ({
          ...prev,
          user: null,
          session: null,
          profile: null,
          isAuthenticated: false,
        }));
        
        // ストレージからセッションを削除
        await storage.removeItem(SESSION_STORAGE_KEY);
      }
    } catch (err: any) {
      console.error('セッション設定エラー:', err.message);
      setState(prev => ({ ...prev, error: err.message }));
    }
  }, [fetchUserProfile]);

  // セッション初期化
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setState(prev => ({ ...prev, loading: true }));
        console.log('AuthProvider: セッション初期化開始');
        
        // 保存されたセッションを取得
        let storedSession: Session | null = null;
        try {
          const storedSessionStr = await storage.getItem(SESSION_STORAGE_KEY);
          if (storedSessionStr) {
            storedSession = JSON.parse(storedSessionStr);
            console.log('AuthProvider: 保存済みセッションを復元');
          }
        } catch (storageErr) {
          console.error('AuthProvider: セッション復元エラー', storageErr);
        }
        
        // Supabaseから現在のセッションを取得
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('セッション取得エラー:', error);
          throw error;
        }
        
        // セッションがあればそれを使用、なければ保存されたセッションを試す
        if (session) {
          await setSessionAndUser(session);
        } else if (storedSession) {
          try {
            const { data, error } = await supabase.auth.setSession(storedSession);
            if (error) {
              console.error('保存されたセッション復元エラー:', error);
              await storage.removeItem(SESSION_STORAGE_KEY);
            } else if (data?.session) {
              await setSessionAndUser(data.session);
            }
          } catch (err) {
            console.error('セッション復元エラー:', err);
            await storage.removeItem(SESSION_STORAGE_KEY);
          }
        } else {
          // セッションがない場合
          await setSessionAndUser(null);
        }
      } catch (err: any) {
        console.error('認証初期化エラー:', err.message);
        setState(prev => ({ ...prev, error: err.message }));
      } finally {
        setState(prev => ({ ...prev, loading: false, initialized: true }));
      }
    };

    initializeAuth();
    
    // 認証状態変更の監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        console.log('AuthProvider: 認証状態変更', _event);
        
        await setSessionAndUser(session);
        setState(prev => ({ ...prev, loading: false }));
      }
    );
    
    // クリーンアップ
    return () => {
      subscription.unsubscribe();
    };
  }, [setSessionAndUser]);

  // ログイン機能
  const signIn = async (email: string, password: string) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      console.log('AuthProvider: ログイン開始', email);
      
      // 入力検証
      if (!email || !password) {
        throw new Error('メールアドレスとパスワードを入力してください');
      }
      
      if (!email.includes('@')) {
        throw new Error('有効なメールアドレスを入力してください');
      }
      
      // Supabase認証によるログイン
      const { data, error } = await supabase.auth.signInWithPassword({
        email, password
      });
      
      if (error) {
        console.error('AuthProvider: ログインエラー', error.message);
        throw new Error(getJapaneseErrorMessage(error.name, error.message));
      }
      
      // 成功
      console.log('AuthProvider: ログイン成功', data.user?.id);
      
      return { error: null };
    } catch (err: any) {
      console.error('ログインエラー:', err.message);
      setState(prev => ({ ...prev, error: err.message }));
      return { error: err };
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  };

  // 新規登録機能
  const signUp = async (email: string, password: string, displayName: string) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      console.log('AuthProvider: 新規登録開始', email);
      
      // 入力検証
      if (!email.includes('@')) {
        throw new Error('有効なメールアドレスを入力してください');
      }
      
      if (password.length < 6) {
        throw new Error('パスワードは6文字以上で設定してください');
      }
      
      if (!displayName || displayName.length < 2) {
        throw new Error('表示名は2文字以上で設定してください');
      }
      
      // Supabase認証による新規ユーザー登録
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
        console.error('サインアップエラー:', error);
        throw new Error(getJapaneseErrorMessage(error.name, error.message));
      }
      
      if (!data.user) {
        console.error('ユーザーデータが存在しません');
        throw new Error('ユーザー登録に失敗しました');
      }
      
      console.log('ユーザー登録成功:', data.user.id);
      
      // 成功
      return { error: null, user: data.user };
    } catch (err: any) {
      console.error('新規登録エラー:', err.message);
      setState(prev => ({ ...prev, error: err.message }));
      return { error: err, user: null };
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  };

  // ログアウト機能
  const signOut = async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      console.log('AuthProvider: ログアウト開始');
      
      // ストレージからセッションを削除
      await storage.removeItem(SESSION_STORAGE_KEY);
      
      // Supabase認証によるログアウト
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('ログアウトエラー:', error);
        throw error;
      }
      
      console.log('AuthProvider: ログアウト成功');
      
      return { error: null };
    } catch (err: any) {
      console.error('ログアウトエラー:', err.message);
      setState(prev => ({ ...prev, error: err.message }));
      return { error: err };
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  };

  // プロフィール更新機能
  const updateProfile = async (data: Partial<UserProfile>) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      if (!state.user) {
        throw new Error('ユーザーが認証されていません');
      }
      
      // プロフィール更新
      const { error } = await supabase
        .from('users')
        .update({
          ...data,
          updated_at: new Date().toISOString()
        })
        .eq('id', state.user.id);
        
      if (error) {
        throw error;
      }
      
      // 成功したら現在のプロフィールを更新
      if (state.profile) {
        setState(prev => ({ 
          ...prev, 
          profile: { ...prev.profile!, ...data, updated_at: new Date().toISOString() } 
        }));
      }
      
      return { error: null };
    } catch (err: any) {
      console.error('プロフィール更新エラー:', err.message);
      setState(prev => ({ ...prev, error: err.message }));
      return { error: err };
    } finally {
      setState(prev => ({ ...prev, loading: false }));
    }
  };

  // プロバイダー値
  const value = {
    // 状態
    user: state.user,
    profile: state.profile,
    session: state.session,
    loading: state.loading,
    error: state.error,
    isAuthenticated: Boolean(state.user && state.session),
    
    // メソッド
    signIn,
    signUp,
    signOut,
    updateProfile,
    clearError,
  };

  return (
    <AuthContext.Provider value={value}>
      {state.initialized ? children : null}
    </AuthContext.Provider>
  );
}; 