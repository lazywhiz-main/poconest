/**
 * ポコの巣 - 共通スタイル定義
 * クロスプラットフォーム（Web、モバイル、デスクトップ）で一貫して使用するスタイルシステム
 */
import { Platform } from 'react-native';
import { BRAND_COLORS } from './Colors';

// スペーシング - マージン、パディングなどの間隔の一貫性を保つための値
export const SPACING = {
  xs: 4,    // 極小間隔
  sm: 8,    // 小間隔
  md: 16,   // 中間隔
  lg: 24,   // 大間隔
  xl: 32,   // 特大間隔
  xxl: 48,  // 超大間隔
};

// フォントサイズ - 異なる役割のテキストのサイズ
export const FONT_SIZE = {
  xs: 10,   // 補足テキスト
  sm: 12,   // 小テキスト
  md: 14,   // 標準テキスト
  lg: 16,   // 大テキスト
  xl: 20,   // 見出し
  xxl: 24,  // 大見出し
  xxxl: 32, // 特大見出し
};

// ライン高さ - テキストの可読性を高めるための行間
export const LINE_HEIGHT = {
  xs: 1.1,  // タイト
  sm: 1.3,  // コンパクト
  md: 1.5,  // 標準
  lg: 1.8,  // 広め
  xl: 2.0,  // 特広
};

// フォントウェイト - 異なるプラットフォームで一貫したフォントの太さ
export const FONT_WEIGHT = {
  thin: Platform.select({ ios: '100', android: '100', default: '100' }),
  light: Platform.select({ ios: '300', android: '300', default: '300' }),
  regular: Platform.select({ ios: '400', android: '400', default: '400' }),
  medium: Platform.select({ ios: '500', android: '500', default: '500' }),
  semibold: Platform.select({ ios: '600', android: '600', default: '600' }),
  bold: Platform.select({ ios: '700', android: '700', default: '700' }),
  black: Platform.select({ ios: '900', android: '900', default: '900' }),
};

// フォントファミリー - 各プラットフォームで最適なフォント
export const FONT_FAMILY = {
  sans: Platform.select({
    ios: 'System',
    android: 'Roboto',
    default: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  }),
  mono: Platform.select({
    ios: 'Menlo',
    android: 'monospace',
    default: 'SFMono-Regular, Consolas, "Liberation Mono", Menlo, Courier, monospace',
  }),
};

// 角丸 - 要素の角を丸くする半径
export const BORDER_RADIUS = {
  xs: 2,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  round: 9999, // 完全な丸（ボタンやアバターに）
};

// シャドウ - 各プラットフォームで一貫したシャドウスタイル
export const SHADOW = {
  // 弱いシャドウ
  sm: Platform.select({
    ios: {
      shadowColor: BRAND_COLORS.black,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.18,
      shadowRadius: 1.0,
    },
    android: {
      elevation: 1,
    },
    default: {
      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
    },
  }),
  // 中程度のシャドウ
  md: Platform.select({
    ios: {
      shadowColor: BRAND_COLORS.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.23,
      shadowRadius: 2.62,
    },
    android: {
      elevation: 3,
    },
    default: {
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.15)',
    },
  }),
  // 強いシャドウ
  lg: Platform.select({
    ios: {
      shadowColor: BRAND_COLORS.black,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 4.65,
    },
    android: {
      elevation: 6,
    },
    default: {
      boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
    },
  }),
  // 特に強いシャドウ
  xl: Platform.select({
    ios: {
      shadowColor: BRAND_COLORS.black,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.44,
      shadowRadius: 10.32,
    },
    android: {
      elevation: 12,
    },
    default: {
      boxShadow: '0 8px 16px rgba(0, 0, 0, 0.3)',
    },
  }),
};

// z-index - 重なり順を管理するための一貫した値
export const Z_INDEX = {
  base: 0,
  content: 1,
  overlay: 10,
  modal: 100,
  toast: 1000,
  tooltip: 1500,
  popover: 2000,
};

// アニメーション - トランジションの持続時間
export const ANIMATION = {
  fast: 150,
  normal: 300,
  slow: 500,
};

// 共通コンポーネントスタイル - 頻繁に使用されるコンポーネントの基本スタイル
export const COMPONENT_STYLES = {
  // コンテナ
  container: {
    padding: SPACING.md,
    backgroundColor: BRAND_COLORS.background.light,
  },
  
  // カード
  card: {
    backgroundColor: BRAND_COLORS.background.light,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginVertical: SPACING.sm,
    ...SHADOW.md,
  },
  
  // 入力フィールド
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: BRAND_COLORS.lightGray,
    borderRadius: BORDER_RADIUS.sm,
    paddingHorizontal: SPACING.md,
    fontSize: FONT_SIZE.md,
    // @ts-ignore - Web用のスタイルは型チェックではエラーになるが実行時には問題なし
    outlineStyle: Platform.OS === 'web' ? 'none' : undefined,
  },
  
  // ボタン
  button: {
    backgroundColor: BRAND_COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  
  // テキスト
  text: {
    fontSize: FONT_SIZE.md,
    color: BRAND_COLORS.text.primary,
    // @ts-ignore - Web用のスタイルは型チェックではエラーになるが実行時には問題なし
    fontFamily: FONT_FAMILY.sans,
  },
};

export default {
  spacing: SPACING,
  fontSize: FONT_SIZE,
  lineHeight: LINE_HEIGHT,
  fontWeight: FONT_WEIGHT,
  fontFamily: FONT_FAMILY,
  borderRadius: BORDER_RADIUS,
  shadow: SHADOW,
  zIndex: Z_INDEX,
  animation: ANIMATION,
  componentStyles: COMPONENT_STYLES,
}; 