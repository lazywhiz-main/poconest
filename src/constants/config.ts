// Supabase Configuration
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
export const SUPABASE_FUNCTION_URL = import.meta.env.VITE_SUPABASE_FUNCTION_URL;

// 環境変数が未設定の場合はエラーを投げる
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Supabase環境変数が未設定です');
}

// App Configuration
export const APP_NAME = 'ポコの巣';
export const APP_VERSION = '1.0.0';

// Theme Colors
export const COLORS = {
  primary: '#3498db',
  secondary: '#2ecc71',
  accent: '#e74c3c',
  background: '#0f0f23',
  text: '#2c3e50',
  lightText: '#7f8c8d',
  white: '#ffffff',
  black: '#000000',
  gray: '#95a5a6',
  lightGray: '#ecf0f1',
  error: '#e74c3c',
  success: '#2ecc71',
  warning: '#f39c12',
};

// Layout Constants
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// Breakpoints for responsive design
export const BREAKPOINTS = {
  mobile: 480,
  tablet: 768,
  desktop: 1024,
  largeDesktop: 1440,
};

// Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'poconest.auth.token',
  USER_SETTINGS: 'poconest.user.settings',
  THEME: 'poconest.theme',
};

// API Endpoints (for non-Supabase APIs)
export const API = {
  ZOOM: {
    BASE_URL: 'https://api.zoom.us/v2',
  },
};

// Feature Flags
export const FEATURES = {
  ENABLE_ZOOM: true,
  ENABLE_NOTIFICATIONS: true,
  ENABLE_DARK_MODE: true,
  ENABLE_ANALYTICS: false, // Disabled by default
}; 