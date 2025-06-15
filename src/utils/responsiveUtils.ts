import { Platform } from 'react-native';
import theme from '../styles/theme';

/**
 * レスポンシブデザイン用ユーティリティ関数
 * 既存のtheme.tsと一貫性を保ちながらレスポンシブ機能を提供
 */

export interface ResponsiveValue<T> {
  mobile?: T;
  tablet?: T;
  desktop?: T;
  default: T;
}

/**
 * CSS clamp()関数を使用したレスポンシブフォントサイズ（Web専用）
 */
export const responsiveFontSize = (
  base: number,
  mobile?: number,
  desktop?: number
): any => {
  if (Platform.OS === 'web') {
    const minSize = mobile || base * 0.8;
    const maxSize = desktop || base;
    return {
      fontSize: `clamp(${minSize}px, ${base}px, ${maxSize}px)`,
    };
  }
  return { fontSize: base };
};

/**
 * レスポンシブスペーシング
 */
export const responsiveSpacing = (
  desktop: number,
  tablet?: number,
  mobile?: number
): any => {
  if (Platform.OS === 'web') {
    const minSpacing = mobile || desktop * 0.5;
    const midSpacing = tablet || desktop * 0.75;
    return {
      padding: `clamp(${minSpacing}px, ${midSpacing}px, ${desktop}px)`,
    };
  }
  return { padding: desktop };
};

/**
 * 幅に基づいてレスポンシブ値を選択
 */
export const getResponsiveValue = <T>(
  width: number,
  values: ResponsiveValue<T>
): T => {
  if (width < theme.breakpoints.md && values.mobile !== undefined) {
    return values.mobile;
  }
  if (width >= theme.breakpoints.md && width < theme.breakpoints.lg && values.tablet !== undefined) {
    return values.tablet;
  }
  if (width >= theme.breakpoints.lg && values.desktop !== undefined) {
    return values.desktop;
  }
  return values.default;
};

/**
 * レスポンシブ幅計算
 */
export const responsiveWidth = (
  values: ResponsiveValue<number | string>
) => ({
  width: Platform.OS === 'web' 
    ? `min(${values.default}, 100vw)`
    : values.default
});

/**
 * Grid用のレスポンシブカラム計算
 */
export const responsiveGridColumns = (
  minWidth: number = 300
): any => {
  if (Platform.OS === 'web') {
    return {
      gridTemplateColumns: `repeat(auto-fill, minmax(${minWidth}px, 1fr))`,
    };
  }
  return {};
};

/**
 * メディアクエリ文字列生成（Web専用）
 */
export const mediaQuery = {
  mobile: `@media (max-width: ${theme.breakpoints.md - 1}px)`,
  tablet: `@media (min-width: ${theme.breakpoints.md}px) and (max-width: ${theme.breakpoints.lg - 1}px)`,
  desktop: `@media (min-width: ${theme.breakpoints.lg}px)`,
  maxWidth: (width: number) => `@media (max-width: ${width}px)`,
  minWidth: (width: number) => `@media (min-width: ${width}px)`,
};

/**
 * セーフエリア対応（モバイル用）
 */
export const safeArea = {
  paddingTop: Platform.OS === 'ios' ? 'env(safe-area-inset-top)' : 0,
  paddingBottom: Platform.OS === 'ios' ? 'env(safe-area-inset-bottom)' : 0,
  paddingLeft: Platform.OS === 'ios' ? 'env(safe-area-inset-left)' : 0,
  paddingRight: Platform.OS === 'ios' ? 'env(safe-area-inset-right)' : 0,
}; 