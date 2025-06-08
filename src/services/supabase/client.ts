import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@constants/config';

// Supabaseクライアントの設定オプション（Web用に最適化）
const supabaseOptions = {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce' as const,
    storage: localStorage,
    storageKey: 'supabase.auth.token',
    debug: import.meta.env.DEV ? true : false,
  },
  global: {
    headers: {
      'X-Client-Info': 'poconest-web',
    },
  },
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
    
    const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, supabaseOptions);
    
    console.log('✅ Supabase client initialized successfully', {
      url: SUPABASE_URL,
      hasAnonKey: !!SUPABASE_ANON_KEY,
      options: supabaseOptions,
    });
    
    return client;
  } catch (error) {
    console.error('❌ Supabaseクライアントの初期化に失敗しました:', error);
    throw error;
  }
};

// エクスポート用のクライアントインスタンス
export const supabase = createSupabaseClient(); 