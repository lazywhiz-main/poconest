import React, { createContext, useState, useContext, useEffect } from 'react';
import { Platform } from 'react-native';
import { supabase } from '@services/supabase/index';
import { Session, User, AuthChangeEvent } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FIRST_SIGNIN_KEY = 'poconest.first_signin_shown';

interface AuthContextProps {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ error: any | null }>;
  register: (email: string, password: string, name: string) => Promise<{ error: any | null }>;
  logout: () => Promise<void>;
  isFirstSignIn: boolean;
  setFirstSignInShown: () => Promise<void>;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFirstSignIn, setIsFirstSignIn] = useState(false);

  // Expose initSession for use in login
  const initSession = async () => {
    setLoading(true);
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error('Error fetching session:', error.message);
    }
    if (data && data.session) {
      setSession(data.session);
      setUser(data.session.user);
      // Check if this is the first sign-in for this user
      const userId = data.session.user.id;
      let shown = false;
      if (Platform.OS === 'web') {
        shown = localStorage.getItem(`${FIRST_SIGNIN_KEY}:${userId}`) === '1';
      } else {
        const val = await AsyncStorage.getItem(`${FIRST_SIGNIN_KEY}:${userId}`);
        shown = val === '1';
      }
      setIsFirstSignIn(!shown);
    }
    setLoading(false);
  };

  useEffect(() => {
    initSession();

    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        setSession(session);
        setUser(session?.user ?? null);
      }
    );

    // Cleanup subscription on unmount
    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error) {
      await initSession();
    }
    return { error };
  };

  const register = async (email: string, password: string, name: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name }
      }
    });
    return { error };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    if (Platform.OS === 'web') {
      localStorage.removeItem('supabase.auth.token');
    }
  };

  // Mark first sign-in as shown
  const setFirstSignInShown = async () => {
    if (!user) return;
    const key = `${FIRST_SIGNIN_KEY}:${user.id}`;
    if (Platform.OS === 'web') {
      localStorage.setItem(key, '1');
    } else {
      await AsyncStorage.setItem(key, '1');
    }
    setIsFirstSignIn(false);
  };

  // Compute authentication state
  const isAuthenticated = !!user && !!session;

  return (
    <AuthContext.Provider value={{ user, session, loading, isAuthenticated, login, register, logout, isFirstSignIn, setFirstSignInShown }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextProps => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 