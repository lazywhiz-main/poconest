import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import { Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile } from '../lib/supabase';

// 認証コンテキストの型定義
type AuthContextType = {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, displayName: string) => Promise<{ error: Error | null, user: User | null }>;
  signOut: () => Promise<{ error: Error | null }>;
  updateProfile: (data: Partial<UserProfile>) => Promise<{ error: Error | null }>;
};

// デフォルト値を持つコンテキストを作成
const defaultContext: AuthContextType = {
  user: null,
  profile: null,
  session: null,
  loading: true,
  error: null,
  signIn: async () => ({ error: new Error('AuthContext not initialized') }),
  signUp: async () => ({ error: new Error('AuthContext not initialized'), user: null }),
  signOut: async () => ({ error: new Error('AuthContext not initialized') }),
  updateProfile: async () => ({ error: new Error('AuthContext not initialized') }),
};

// コンテキストの作成
const AuthContext = createContext<AuthContextType>(defaultContext);

// エラーメッセージの日本語化
const getJapaneseErrorMessage = (errorCode: string, errorMessage: string): string => {
  // Supabaseの一般的なエラーコードに対応する日本語メッセージ
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

  // エラーメッセージからエラーコードを抽出
  for (const code in errorMessages) {
    if (errorMessage.includes(code)) {
      return errorMessages[code];
    }
  }

  // 特定のエラーメッセージに基づく処理
  if (errorMessage.includes('Invalid login credentials')) {
    return 'メールアドレスまたはパスワードが間違っています';
  }
  
  if (errorMessage.includes('Email not confirmed')) {
    return 'メールアドレスの確認が完了していません。受信したメールの確認リンクをクリックしてください';
  }
  
  if (errorMessage.includes('Invalid email')) {
    return '有効なメールアドレスを入力してください';
  }
  
  if (errorMessage.includes('Password should be')) {
    return 'パスワードは6文字以上で入力してください';
  }

  // デフォルトのエラーメッセージ
  return errorMessage || 'エラーが発生しました。もう一度お試しください';
};

// プロバイダーコンポーネント
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // ステート更新を追跡するためのref
  const userRef = useRef<User | null>(null);
  const sessionRef = useRef<Session | null>(null);

  // セッション監視のセットアップ
  useEffect(() => {
    setLoading(true);
    console.log('AuthProvider: セッション取得開始');
    
    // 現在のセッションを取得
    const initializeAuth = async () => {
      try {
        // AsyncStorageからセッションを復元
        let storedSession = null;
        try {
          const storedSessionStr = await AsyncStorage.getItem('supabase_session');
          if (storedSessionStr) {
            storedSession = JSON.parse(storedSessionStr);
            console.log('AuthProvider: 保存済みセッションを復元');
          }
        } catch (storageErr) {
          console.error('AuthProvider: セッション復元エラー', storageErr);
        }

        // Supabaseから現在のセッションを取得
        const { data: { session }, error } = await supabase.auth.getSession();
        console.log('AuthProvider: セッション取得結果:', session, error);
        
        // セッションが存在する場合
        if (session?.user) {
          // ステートとrefを同期的に更新
          userRef.current = session.user;
          sessionRef.current = session;
          
          // 状態更新を同期的に行う
          await Promise.all([
            new Promise<void>(resolve => {
              setUser(session.user);
              resolve();
            }),
            new Promise<void>(resolve => {
              setSession(session);
              resolve();
            })
          ]);
          
          console.log('AuthProvider: ステート更新完了', {
            hasUser: !!userRef.current,
            hasSession: !!sessionRef.current,
            userId: userRef.current?.id
          });
          
          // プロフィール取得前に少し待機して状態の更新を確実にする
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // プロフィール取得
          await fetchUserProfile(session.user.id);
        } else if (storedSession?.user) {
          // 保存されたセッションがある場合は復元を試みる
          console.log('AuthProvider: 保存されたセッションを復元試行');
          const { data, error } = await supabase.auth.setSession(storedSession);
          
          if (error) {
            console.error('AuthProvider: セッション復元エラー', error);
            // 復元に失敗した場合は保存されたセッションを削除
            await AsyncStorage.removeItem('supabase_session');
          } else if (data?.session?.user) {
            // 復元成功
            const session = data.session;
            userRef.current = session.user;
            sessionRef.current = session;
            
            // 状態更新を同期的に行う
            await Promise.all([
              new Promise<void>(resolve => {
                setUser(session.user);
                resolve();
              }),
              new Promise<void>(resolve => {
                setSession(session);
                resolve();
              })
            ]);
            
            await fetchUserProfile(session.user.id);
          }
        } else {
          // セッションが存在しない場合は状態をクリア
          setUser(null);
          setSession(null);
          setProfile(null);
          userRef.current = null;
          sessionRef.current = null;
        }
      } catch (err) {
        console.error('AuthProvider: セッション取得エラー', err);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
    
    // セッション状態の変化を監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        console.log('AuthProvider: 認証状態変更', _event, {
          hasSession: !!session,
          userId: session?.user?.id,
          userEmail: session?.user?.email
        });
        
        if (session?.user) {
          // ステートとrefを同期的に更新
          userRef.current = session.user;
          sessionRef.current = session;
          
          // 状態更新を同期的に行う
          await Promise.all([
            new Promise<void>(resolve => {
              setUser(session.user);
              resolve();
            }),
            new Promise<void>(resolve => {
              setSession(session);
              resolve();
            })
          ]);
          
          console.log('AuthProvider: ステート更新完了', {
            hasUser: !!userRef.current,
            hasSession: !!sessionRef.current,
            userId: userRef.current?.id
          });
          
          // プロフィール取得前に少し待機して状態の更新を確実にする
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // プロフィール取得
          if (userRef.current?.id) {
            await fetchUserProfile(userRef.current.id);
          }
        } else {
          // ログアウト時のクリーンアップ
          setUser(null);
          setSession(null);
          setProfile(null);
          userRef.current = null;
          sessionRef.current = null;
        }
        
        setLoading(false);
      }
    );
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // ユーザープロフィールの取得
  const fetchUserProfile = async (userId: string) => {
    try {
      console.log('AuthProvider: プロフィール取得開始', {
        currentUser: userRef.current?.id,
        hasUser: !!userRef.current,
        isMatch: userRef.current?.id === userId,
        userId
      });

      if (!userRef.current) {
        throw new Error('ユーザーセッションが見つかりません。再度ログインしてください。');
      }

      if (userRef.current.id !== userId) {
        throw new Error('ユーザーIDが一致しません。アプリを再起動してください。');
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
            setProfile(newProfile as UserProfile);
            return;
          }
        }
        throw new Error(`プロフィールの取得に失敗しました: ${error.message}`);
      }

      if (data) {
        console.log('プロフィール取得成功:', data);
        setProfile(data as UserProfile);
      } else {
        throw new Error('プロフィールの取得に失敗しました: データが存在しません');
      }
    } catch (err: any) {
      console.error('プロフィール取得エラー:', err.message);
      setError(err.message || getJapaneseErrorMessage(err.code, err.message));
      // エラーが発生した場合はステートをクリア
      if (err.message.includes('ユーザーセッション')) {
        setUser(null);
        setSession(null);
        setProfile(null);
        userRef.current = null;
        sessionRef.current = null;
      }
    }
  };

  // ログイン機能
  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);
      
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
      setUser(data.user);
      setSession(data.session);
      
      // セッションをAsyncStorageに保存 (追加のバックアップ)
      if (data.session) {
        try {
          await AsyncStorage.setItem('supabase_session', JSON.stringify(data.session));
          console.log('AuthProvider: セッションをAsyncStorageに保存');
        } catch (storageErr) {
          console.error('AuthProvider: セッション保存エラー', storageErr);
        }
      }
      
      return { error: null };
    } catch (err: any) {
      console.error('AuthContext: Error signing in:', err.message);
      setError(err.message);
      return { error: err };
    } finally {
      setLoading(false);
    }
  };

  // 新規登録機能
  const signUp = async (email: string, password: string, displayName: string) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('サインアッププロセス開始:', { email, displayName });
      
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
      
      console.log('入力検証通過');
      
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
      
      console.log('Supabaseレスポンス:', { data, error });
      
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
      console.error('AuthContext: Error signing up:', err.message);
      setError(err.message);
      return { error: err, user: null };
    } finally {
      setLoading(false);
    }
  };

  // ログアウト機能
  const signOut = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('AuthProvider: ログアウト開始');
      
      // AsyncStorageからセッションを削除 (追加のクリーンアップ)
      try {
        await AsyncStorage.removeItem('supabase_session');
        console.log('AuthProvider: AsyncStorageからセッションを削除');
      } catch (storageErr) {
        console.error('AuthProvider: セッション削除エラー', storageErr);
      }
      
      // Supabase認証によるログアウト
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('AuthProvider: ログアウトエラー', error);
        throw error;
      }
      
      console.log('AuthProvider: ログアウト成功');
      
      // ステート更新
      setUser(null);
      setSession(null);
      setProfile(null);
      
      return { error: null };
    } catch (err: any) {
      console.error('AuthContext: Error signing out:', err.message);
      setError(err.message);
      return { error: err };
    } finally {
      setLoading(false);
    }
  };

  // プロフィール更新機能
  const updateProfile = async (data: Partial<UserProfile>) => {
    try {
      setLoading(true);
      setError(null);
      
      if (!user) {
        throw new Error('ユーザーが認証されていません');
      }
      
      // プロフィール更新
      const { error } = await supabase
        .from('users')
        .update(data)
        .eq('id', user.id);
        
      if (error) {
        throw error;
      }
      
      // 成功したら現在のプロフィールを更新
      if (profile) {
        setProfile({ ...profile, ...data });
      }
      
      return { error: null };
    } catch (err: any) {
      console.error('AuthContext: Error updating profile:', err.message);
      setError(err.message);
      return { error: err };
    } finally {
      setLoading(false);
    }
  };

  // コンテキストの値
  const value = {
    user,
    profile,
    session,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    updateProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// カスタムフック
export function useAuth() {
  const context = useContext(AuthContext);
  return context;
} 