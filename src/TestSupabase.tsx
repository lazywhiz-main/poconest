import React from 'react';
import { supabase } from './services/supabase/client';

const TestSupabase: React.FC = () => {
  const handleTest = async () => {
    console.log('TestSupabase button clicked');
    try {
      // 認証状態の確認
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      console.log('Current session:', session);
      console.log('Session error:', sessionError);

      if (!session) {
        console.error('No active session found');
        return;
      }

      // クライアントの状態確認
      console.log('Supabase client:', {
        hasAuth: !!supabase.auth,
        isOffline: supabase._isOffline
      });

      // クエリ実行
      console.log('Executing users query...');
      const { data, error } = await supabase
        .from('users')
        .select('id, display_name, avatar_url')
        .eq('id', session.user.id)
        .single();
      
      console.log('TestSupabase result:', { data, error });
    } catch (e) {
      console.error('TestSupabase error:', e);
    }
  };

  return <button onClick={handleTest}>Test Supabase users select</button>;
};

export default TestSupabase; 