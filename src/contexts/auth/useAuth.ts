import { useContext } from 'react';
import AuthContext from './AuthContext';
import { AuthContextProps } from './types';

/**
 * 認証コンテキストを使用するためのカスタムフック
 * @returns 認証コンテキストの値と関数
 * @throws コンテキストプロバイダーの外で使用された場合にエラーを投げる
 * @example
 * const { user, profile, signIn, signOut } = useAuth();
 */
export const useAuth = (): AuthContextProps => {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};

export default useAuth; 