import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { useAuth } from '@contexts/AuthContext';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';

// Import screens
import LoginScreen from '@screens/auth/LoginScreen';
// Import other screens as needed

/**
 * Main navigation component that handles auth state and routing
 */
const Navigation: React.FC = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Show loading indicator while checking auth state
  if (loading) {
    return null; // Replace with LoadingScreen if needed
  }

  // Decide which navigation stack to render based on auth state
  return user ? <AuthenticatedRoutes /> : <UnauthenticatedRoutes />;
};

/**
 * Routes for authenticated users
 */
const AuthenticatedRoutes: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Only redirect if we're on the login page
    if (location.pathname === '/login' || location.pathname === '/') {
      navigate('/nest-list', { replace: true });
    }
  }, [navigate, location]);

  // /nest-listや他の認証済みページの場合はOutletで子ルートを表示
  return <Outlet />;
};

/**
 * Routes for unauthenticated users
 */
const UnauthenticatedRoutes: React.FC = () => {
  return <LoginScreen />;
};

export default Navigation; 