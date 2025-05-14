import React from 'react';
import { Platform } from 'react-native';
import { useAuth } from '@contexts/AuthContext';

// Import screens
import LoginScreen from '@screens/auth/LoginScreen';
// Import other screens as needed

/**
 * Main navigation component that handles auth state and routing
 */
const Navigation: React.FC = () => {
  const { user, loading } = useAuth();

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
  // This will be implemented with React Navigation (mobile) or React Router (web)
  // For now, return placeholder
  return (
    <div>
      <p>Authenticated Routes (Home, Chat, Board, etc.)</p>
    </div>
  );
};

/**
 * Routes for unauthenticated users
 */
const UnauthenticatedRoutes: React.FC = () => {
  // Return the login screen directly for simplicity
  // Later, this will be set up with proper navigation
  return <LoginScreen />;
};

export default Navigation; 