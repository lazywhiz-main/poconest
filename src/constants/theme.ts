// サンプルデザインに基づくカラー定義
export const THEME_COLORS = {
  // Background
  bgPrimary: '#0f0f23',
  bgSecondary: '#1a1a2e',
  bgTertiary: '#333366',
  bgQuaternary: '#45475a',
  
  // Primary colors
  primaryGreen: '#00ff88',
  primaryGreenDark: '#00cc6a',
  primaryBlue: '#64b5f6',
  primaryOrange: '#ffa500',
  primaryRed: '#ff6b6b',
  primaryPurple: '#9c27b0',
  primaryCyan: '#26c6da',
  primaryYellow: '#ffd93d',
  
  // Text
  textPrimary: '#e2e8f0',
  textSecondary: '#a6adc8',
  textMuted: '#6c7086',
  textInverse: '#0f0f23',
  text: '#e2e8f0', // 汎用テキスト
  textTertiary: '#6c7086', // 3次テキスト
  
  // Border
  borderPrimary: '#333366',
  borderSecondary: '#45475a',
  border: '#333366', // 汎用ボーダー
  
  // Card & Background
  cardBackground: '#1a1a2e', // カード背景
  background: '#0f0f23', // 汎用背景
  
  // Border Radius（統一感のための角の丸さ）
  borderRadius: {
    small: '2px',      // 小さなボタン、バッジ
    medium: '4px',    // 通常のボタン、小さなパネル
    large: '6px',     // パネル、カード
    xlarge: '8px',    // 大きなパネル、ダイアログ
    xxlarge: '12px',   // モーダル、メインダイアログ
    round: '50%',      // 円形（アバター、ノードなど）
  }
};
