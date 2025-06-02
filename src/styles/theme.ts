/**
 * ポコの巣アプリケーションの共通スタイルテーマ
 */

export const colors = {
  // プライマリカラー（ダークスレート）
  primary: '#4a6da7',
  primaryLight: '#6b8cb8',
  primaryDark: '#2c4a7d',
  
  // セカンダリカラー (コーラル) - より落ち着いた色調に
  secondary: '#f5f5f5',
  secondaryLight: '#ffffff',
  secondaryDark: '#e0e0e0',
  
  // アクセントカラー（ブライトティール）
  accent: '#ff6b6b',
  accentLight: '#ff8e8e',
  accentDark: '#e64a4a',
  
  // アクションカラー（ローズ）
  action: '#4a6da7',
  actionLight: '#6b8cb8',
  actionDark: '#2c4a7d',
  
  // サブカラー
  white: '#FFFFFF',
  lightGray: '#F1F5F9',
  
  // 空間カラー
  spaces: {
    chat: {
      primary: '#FF6B6B',
      background: '#FFF5F5',
      accent: '#FFE3E3',
    },
    board: {
      primary: '#FFD93D',
      background: '#FFF9E6',
      accent: '#FFF3CC',
    },
    meeting: {
      primary: '#4ECDC4',
      background: '#F0FFFD',
      accent: '#E0FFFC',
    },
    analysis: {
      primary: '#2E7D32',
      background: '#F1F8E9',
      accent: '#E8F5E9',
    },
    settings: {
      primary: '#424242',
      background: '#F5F5F5',
      accent: '#EEEEEE',
    },
  },
  
  // ユーティリティカラー
  text: {
    primary: '#333333',
    secondary: '#757575',
    disabled: '#9e9e9e',
    hint: '#94A3B8',
    onDark: '#F9FAFB',
  },
  background: {
    default: '#ffffff',
    paper: '#f5f5f5',
    card: '#ffffff',
  },
  divider: '#E2E8F0',
  border: '#e0e0e0',
  
  // ステータスカラー
  status: {
    success: '#4caf50',
    info: '#2196f3',
    warning: '#ff9800',
    error: '#f44336',
  },
  error: '#f44336',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const fontSizes = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 28,
  title: 32,
};

export const fontWeights = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
};

// モダンなフォントファミリーを定義
export const fontFamily = {
  primary: "'Noto Sans JP', 'Helvetica Neue', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  secondary: "'Montserrat', 'Helvetica Neue', sans-serif",
  mono: "'Roboto Mono', 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace",
  logo: "'Montserrat', 'Helvetica Neue', sans-serif",
};

export const borderRadius = {
  xs: 2,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  round: '50%',
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2.0,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3.0,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5.0,
    elevation: 8,
  },
};

// レスポンシブなデザインのブレークポイント
export const breakpoints = {
  xs: 0,
  sm: 576,
  md: 768,
  lg: 992,
  xl: 1200,
};

// アニメーション設定
export const animations = {
  transition: {
    quick: '0.1s ease',
    default: '0.2s ease',
    slow: '0.3s ease-in-out',
  },
};

// テーマオブジェクト
const theme = {
  colors,
  spacing,
  fontSizes,
  fontWeights,
  fontFamily,
  borderRadius,
  shadows,
  breakpoints,
  animations,
};

export default theme; 