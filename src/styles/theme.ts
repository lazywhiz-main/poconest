/**
 * ポコの巣アプリケーションの共通スタイルテーマ
 */

export const colors = {
  // プライマリカラー (薄いグレー系)
  primary: '#E5E7EB',
  primaryLight: '#F3F4F6',
  primaryDark: '#9CA3AF',
  
  // セカンダリカラー (コーラル) - より落ち着いた色調に
  secondary: '#E86C60',
  secondaryLight: '#F09D95',
  secondaryDark: '#D05A4F',
  
  // アクセントカラー (ミント色) - より落ち着いた色調に
  accent: '#47B8A9',
  accentLight: '#7CCDC3',
  accentDark: '#3A9A8E',
  
  // 空間カラー - 彩度と明度のバランスを整えた
  spaces: {
    chat: {
      primary: '#E86C60', // 落ち着いたコーラル
      background: '#FDF5F4',
      accent: '#E86C60',
    },
    board: {
      primary: '#F5AE41', // 深みのある黄色
      background: '#FEF8ED',
      accent: '#F5AE41',
    },
    zoom: {
      primary: '#47B8A9', // 落ち着いたミント
      background: '#F0F9F7',
      accent: '#47B8A9',
    },
    analysis: {
      primary: '#2F87B8', // 青みのあるターコイズ
      background: '#EAF5FA',
      accent: '#2F87B8',
    },
    settings: {
      primary: '#4B5563', // 濃いグレー
      background: '#F8FAFC',
      accent: '#4B5563',
    },
  },
  
  // ユーティリティカラー
  text: {
    primary: '#111827', // 濃いグレー（ほぼ黒）でコントラストを強く
    secondary: '#4B5563',
    disabled: '#9CA3AF',
    hint: '#9CA3AF',
    onDark: '#F9FAFB',
  },
  background: {
    default: '#F3F4F6',
    paper: '#FFFFFF',
    card: '#FFFFFF',
  },
  divider: '#E5E7EB',
  
  // ステータスカラー - WCAG AAに準拠したコントラスト比
  status: {
    success: '#0E9E73', // ディープグリーンと同じ色で統一感
    info: '#2F87B8',    // Analysis色と同じにして統一感を出す
    warning: '#F5AE41', // ボードの色と同じ
    error: '#E86C60', // コーラルと同じ
  },
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