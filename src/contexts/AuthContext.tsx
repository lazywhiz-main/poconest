import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '@services/supabase/client';
import { Session, User, AuthChangeEvent } from '@supabase/supabase-js';

const FIRST_SIGNIN_KEY = 'poconest.first_signin_shown';

interface UserProfile {
  id: string;
  display_name: string;
  avatar_url?: string;
  email?: string;
}

interface AuthContextProps {
  user: User | null;
  profile: UserProfile | null;
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
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFirstSignIn, setIsFirstSignIn] = useState(false);

  const fetchUserProfile = async (userId: string) => {
    console.log('fetchUserProfile start', userId);
    try {
      const { data, error } = await supabase.from('users').select().eq('id', userId).single();
      console.log('fetchUserProfile query result', { data, error });
      if (error) {
        console.error('Profile fetch error:', error);
        return null;
      }
      return data;
    } catch (error) {
      console.error('Error in fetchUserProfile CATCH:', error);
      return null;
    }
  };

  useEffect(() => {
    console.log('🚀 AuthProvider initializing...');
    
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        console.log('Initial session check:', { 
          hasSession: !!session, 
          userId: session?.user?.id,
          email: session?.user?.email,
          error: error?.message 
        });

        if (session && !error) {
          setSession(session);
          setUser(session.user);
          
          // Fetch profile (but don't let it block loading)
          fetchUserProfile(session.user.id)
            .then(setProfile)
            .catch(error => {
              console.error('Profile fetch failed:', error);
              setProfile(null);
            });
          
          // Check first sign-in status
          const shown = localStorage.getItem(`${FIRST_SIGNIN_KEY}:${session.user.id}`) === '1';
          setIsFirstSignIn(!shown);
        } else {
          setSession(null);
          setUser(null);
          setProfile(null);
        }
      } catch (error) {
        console.error('Error getting initial session:', error);
        setSession(null);
        setUser(null);
        setProfile(null);
      } finally {
        console.log('🏁 Initial session check complete, setting loading to false');
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        console.log('🔄 Auth state change:', event, session?.user?.email || 'no-user');
        
        try {
          if (session?.user) {
            setSession(session);
            setUser(session.user);
            
            // Fetch profile (but don't let it block loading)
            fetchUserProfile(session.user.id)
              .then(setProfile)
              .catch(error => {
                console.error('Profile fetch failed in auth change:', error);
                setProfile(null);
              });
            
            // Check first sign-in status
            const shown = localStorage.getItem(`${FIRST_SIGNIN_KEY}:${session.user.id}`) === '1';
            setIsFirstSignIn(!shown);
          } else {
            setSession(null);
            setUser(null);
            setProfile(null);
            setIsFirstSignIn(false);
          }
        } catch (error) {
          console.error('Error in auth state change handler:', error);
          setSession(null);
          setUser(null);
          setProfile(null);
        }
        // Note: Don't set loading to false here as it's only for initial load
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // Compute authentication state
  const isAuthenticated = !!user && !!session;

  useEffect(() => {
    console.log('[AuthContext] State:', { 
      hasUser: !!user, 
      hasSession: !!session, 
      hasProfile: !!profile,
      loading, 
      isAuthenticated,
      userId: user?.id,
      email: user?.email 
    });
  }, [user, session, profile, loading, isAuthenticated]);

  const login = async (email: string, password: string) => {
    console.log('🔑 Login attempt for:', email);
    setLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email, 
        password 
      });
      
      console.log('Login result:', { 
        hasSession: !!data.session, 
        hasUser: !!data.user,
        error: error?.message 
      });
      
      return { error };
    } catch (error) {
      console.error('Login error:', error);
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, password: string, name: string) => {
    console.log('📝 Register attempt for:', email);
    setLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name }
        }
      });
      
      console.log('Register result:', { 
        hasSession: !!data.session, 
        hasUser: !!data.user,
        error: error?.message 
      });
      
      return { error };
    } catch (error) {
      console.error('Register error:', error);
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    console.log('🚪 Logout attempt');
    setLoading(true);
    
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Logout error:', error);
      } else {
        console.log('✅ Logout successful');
        // Clear local state immediately
        setUser(null);
        setProfile(null);
        setSession(null);
        setIsFirstSignIn(false);
      }
    } catch (error) {
      console.error('Logout exception:', error);
    } finally {
      setLoading(false);
    }
  };

  const setFirstSignInShown = async () => {
    if (!user) return;
    const key = `${FIRST_SIGNIN_KEY}:${user.id}`;
    localStorage.setItem(key, '1');
    setIsFirstSignIn(false);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      session, 
      loading, 
      isAuthenticated, 
      login, 
      register, 
      logout, 
      isFirstSignIn, 
      setFirstSignInShown 
    }}>
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