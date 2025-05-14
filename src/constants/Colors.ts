/**
 * ポコの巣 - ブランドカラー定義
 * クロスプラットフォーム（Web、モバイル、デスクトップ）で一貫して使用するカラーシステム
 */

// ブランドカラー - アプリケーション全体で使用される主要な色
export const BRAND_COLORS = {
  // プライマリカラー
  primary: '#3498db', // ブルー
  secondary: '#2ecc71', // グリーン
  accent: '#e74c3c', // レッド
  
  // テキストカラー
  text: {
    primary: '#2c3e50',   // ダークブルー（メインテキスト）
    secondary: '#7f8c8d', // グレー（サブテキスト）
    tertiary: '#95a5a6',  // ライトグレー（薄いテキスト）
    inverse: '#ffffff',   // 白（暗い背景上のテキスト）
  },
  
  // 状態カラー
  success: '#2ecc71', // グリーン
  error: '#e74c3c',   // レッド
  warning: '#f39c12', // オレンジ
  info: '#3498db',    // ブルー
  
  // 背景色バリエーション
  background: {
    default: '#f5f5f5', // デフォルト背景
    light: '#ffffff',   // 明るい背景
    medium: '#ecf0f1',  // やや暗い背景
    dark: '#bdc3c7',    // 暗い背景
  },
  
  // 基本色
  white: '#ffffff',
  black: '#000000',
  gray: '#95a5a6',
  lightGray: '#ecf0f1',
  
  // NEST機能用カラー
  nest: {
    inbox: '#A5D6A7',   // ミントグリーン
    insights: '#FFB74D', // オレンジ
    themes: '#9575CD',   // パープル
    zoom: '#64B5F6',     // ライトブルー
  },
};

// ダークモード/ライトモード用のテーマカラー
export const THEME_COLORS = {
  light: {
    text: BRAND_COLORS.text.primary,
    background: BRAND_COLORS.background.default,
    card: BRAND_COLORS.background.light,
    border: BRAND_COLORS.lightGray,
    notification: BRAND_COLORS.accent,
    shadow: 'rgba(0, 0, 0, 0.1)',
    tint: BRAND_COLORS.primary,
    tabIconDefault: BRAND_COLORS.text.tertiary,
    tabIconSelected: BRAND_COLORS.primary,
  },
  dark: {
    text: '#ffffff',
    background: '#1a1a1a',
    card: '#2a2a2a',
    border: '#3a3a3a',
    notification: BRAND_COLORS.accent,
    shadow: 'rgba(0, 0, 0, 0.3)',
    tint: BRAND_COLORS.primary,
    tabIconDefault: '#7f8c8d',
    tabIconSelected: BRAND_COLORS.primary,
  },
};

// 後方互換性のために現在のCOLORSオブジェクトの形式も提供
export const COLORS = {
  primary: BRAND_COLORS.primary,
  secondary: BRAND_COLORS.secondary,
  accent: BRAND_COLORS.accent,
  background: BRAND_COLORS.background.default,
  text: BRAND_COLORS.text.primary,
  lightText: BRAND_COLORS.text.secondary,
  white: BRAND_COLORS.white,
  black: BRAND_COLORS.black,
  gray: BRAND_COLORS.gray,
  lightGray: BRAND_COLORS.lightGray,
  error: BRAND_COLORS.error,
  success: BRAND_COLORS.success,
  warning: BRAND_COLORS.warning,
};

export default {
  brand: BRAND_COLORS,
  light: THEME_COLORS.light,
  dark: THEME_COLORS.dark,
}; 