import { createContext } from 'react';
import { AuthContextProps } from './types';

// デフォルト値を持つコンテキストを作成
const defaultAuthContext: AuthContextProps = {
  user: null,
  profile: null,
  session: null,
  loading: true,
  error: null,
  isAuthenticated: false,
  
  signIn: async () => ({ error: new Error('AuthContext not initialized') }),
  signUp: async () => ({ error: new Error('AuthContext not initialized'), user: null }),
  signOut: async () => ({ error: new Error('AuthContext not initialized') }),
  updateProfile: async () => ({ error: new Error('AuthContext not initialized') }),
  clearError: () => {}
};

// コンテキストの作成
const AuthContext = createContext<AuthContextProps>(defaultAuthContext);

export default AuthContext; 