import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@constants/config';
import { ExtendedSupabaseClient } from './types';

// スタック追跡を取得する関数（デバッグ用）
const getStack = () => {
  const stack = new Error().stack;
  return stack ? stack.split('\n').slice(2).join('\n') : '';
};

/**
 * クロスプラットフォーム対応のストレージクラス
 * WebではlocalStorage、ネイティブではAsyncStorageを使用
 */
class CrossPlatformStorage {
  private webStorage: typeof localStorage | null = null;
  private nativeStorage: typeof AsyncStorage | null = null;
  private prefix: string;

  constructor(prefix: string = 'supabase') {
    this.prefix = prefix;
    
    if (Platform.OS === 'web') {
      try {
        // Webの場合はlocalStorageを使用
        this.webStorage = typeof localStorage !== 'undefined' ? localStorage : null;
      } catch (e) {
        console.warn('localStorage is not available:', e);
      }
    } else {
      // ネイティブの場合はAsyncStorageを使用
      this.nativeStorage = AsyncStorage;
    }
  }

  /**
   * キーに対応する値を取得
   */
  async getItem(key: string): Promise<string | null> {
    try {
      const prefixedKey = `${this.prefix}.${key}`;
      
      if (Platform.OS === 'web' && this.webStorage) {
        return this.webStorage.getItem(prefixedKey);
      } else if (this.nativeStorage) {
        return await this.nativeStorage.getItem(prefixedKey);
      }
      
      return null;
    } catch (error) {
      console.error(`Error getting item [${key}]:`, error);
      return null;
    }
  }

  /**
   * キーに対応する値を設定
   */
  async setItem(key: string, value: string): Promise<void> {
    try {
      const prefixedKey = `${this.prefix}.${key}`;
      
      if (Platform.OS === 'web' && this.webStorage) {
        this.webStorage.setItem(prefixedKey, value);
      } else if (this.nativeStorage) {
        await this.nativeStorage.setItem(prefixedKey, value);
      }
    } catch (error) {
      console.error(`Error setting item [${key}]:`, error);
    }
  }

  /**
   * キーに対応する値を削除
   */
  async removeItem(key: string): Promise<void> {
    try {
      const prefixedKey = `${this.prefix}.${key}`;
      
      if (Platform.OS === 'web' && this.webStorage) {
        this.webStorage.removeItem(prefixedKey);
      } else if (this.nativeStorage) {
        await this.nativeStorage.removeItem(prefixedKey);
      }
    } catch (error) {
      console.error(`Error removing item [${key}]:`, error);
    }
  }
}

// ストレージインスタンスの作成
const storage = new CrossPlatformStorage('poconest');

// オフライン検出のためのネットワークリスナー
let isOffline = false;

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    isOffline = false;
    console.log('🌐 オンラインに戻りました');
  });
  
  window.addEventListener('offline', () => {
    isOffline = true;
    console.log('🔌 オフラインになりました');
  });
}

// タイムアウト付きのカスタムfetch関数
const customFetch: typeof fetch = (input, init) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  
  const signal = init?.signal || controller.signal;
  
  return fetch(input, {
    ...init,
    signal,
  }).finally(() => clearTimeout(timeoutId));
};

// Supabaseクライアントの設定オプション
const supabaseOptions = {
  auth: {
    storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  // サーバータイムアウトを10秒に設定
  global: {
    fetch: customFetch
  },
  // デバッグモードを設定（開発環境のみ）
  debug: process.env.NODE_ENV === 'development',
};

// Supabaseクライアントの初期化
export const createSupabaseClient = () => {
  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error(
        'Supabase URL または Anon Keyが設定されていません。' +
        '.env.localファイルにVITE_SUPABASE_URLとVITE_SUPABASE_ANON_KEYを設定してください。'
      );
    }
    
    const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, supabaseOptions) as ExtendedSupabaseClient;
    
    // オフライン状態の追跡
    client._isOffline = isOffline;
    client._pendingOperations = [];
    
    return client;
  } catch (error) {
    console.error('Supabaseクライアントの初期化に失敗しました:', error);
    throw error;
  }
};

// エクスポート用のクライアントインスタンス
export const supabase = createSupabaseClient(); 