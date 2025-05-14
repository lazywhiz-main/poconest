// エラーメッセージの日本語化を行うユーティリティ関数

/**
 * Supabaseのエラーコードとメッセージをユーザーフレンドリーな日本語メッセージに変換
 * @param errorCode エラーコード
 * @param errorMessage エラーメッセージ
 * @returns 日本語化されたエラーメッセージ
 */
export const getJapaneseErrorMessage = (errorCode: string, errorMessage: string): string => {
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
    'unknown': 'エラーが発生しました。もう一度お試しください',
  };

  // エラーコードが直接マッチする場合
  if (errorMessages[errorCode]) {
    return errorMessages[errorCode];
  }

  // エラーメッセージからエラーコードを抽出
  for (const code in errorMessages) {
    if (errorMessage?.includes(code)) {
      return errorMessages[code];
    }
  }

  // 特定のエラーメッセージに基づく処理
  if (errorMessage?.includes('Invalid login credentials')) {
    return 'メールアドレスまたはパスワードが間違っています';
  }
  
  if (errorMessage?.includes('Email not confirmed')) {
    return 'メールアドレスの確認が完了していません。受信したメールの確認リンクをクリックしてください';
  }
  
  if (errorMessage?.includes('Invalid email')) {
    return '有効なメールアドレスを入力してください';
  }
  
  if (errorMessage?.includes('Password should be')) {
    return 'パスワードは6文字以上で入力してください';
  }

  // デフォルトのエラーメッセージ
  return errorMessage || 'エラーが発生しました。もう一度お試しください';
};

/**
 * PCかモバイルかを判定
 * @returns boolean: trueの場合はPC、falseの場合はモバイル
 */
export const isDesktop = (): boolean => {
  if (typeof window !== 'undefined') {
    return window.innerWidth >= 1024;
  }
  return false;
};

/**
 * ローカルストレージに保存されたトークンが有効かどうかを確認
 * @returns boolean: trueの場合は有効、falseの場合は無効
 */
export const hasValidToken = (): boolean => {
  try {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('supabase.auth.token');
      if (!token) return false;
      
      const { expires_at } = JSON.parse(token);
      if (!expires_at) return false;
      
      // 有効期限をチェック
      return new Date(expires_at * 1000) > new Date();
    }
    return false;
  } catch (err) {
    console.error('トークン検証エラー:', err);
    return false;
  }
}; 