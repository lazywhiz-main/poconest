import { useState, useEffect } from 'react';
import { useWindowDimensions, Platform } from 'react-native';
import theme from '../styles/theme';

export interface ResponsiveInfo {
  width: number;
  height: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isLandscape: boolean;
  breakpoint: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

/**
 * レスポンシブデザイン用フック
 * 既存のtheme.tsのbreakpointsと整合性を保ちます
 */
export const useResponsive = (): ResponsiveInfo => {
  const dimensions = useWindowDimensions();
  
  // Web環境でのみwindowサイズを監視
  const [webDimensions, setWebDimensions] = useState(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      return {
        width: window.innerWidth,
        height: window.innerHeight,
      };
    }
    return { width: 0, height: 0 };
  });

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const handleResize = () => {
        setWebDimensions({
          width: window.innerWidth,
          height: window.innerHeight,
        });
      };

      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  // プラットフォームに応じて適切なdimensionsを使用
  const currentDimensions = Platform.OS === 'web' ? webDimensions : dimensions;
  const { width, height } = currentDimensions;

  // breakpointsに基づいた判定（theme.tsと一致）
  const isMobile = width < theme.breakpoints.md; // < 768px
  const isTablet = width >= theme.breakpoints.md && width < theme.breakpoints.lg; // 768px-992px
  const isDesktop = width >= theme.breakpoints.lg; // >= 992px
  const isLandscape = width > height;

  // 現在のブレークポイントを判定
  let breakpoint: 'xs' | 'sm' | 'md' | 'lg' | 'xl' = 'xs';
  if (width >= theme.breakpoints.xl) breakpoint = 'xl';
  else if (width >= theme.breakpoints.lg) breakpoint = 'lg';
  else if (width >= theme.breakpoints.md) breakpoint = 'md';
  else if (width >= theme.breakpoints.sm) breakpoint = 'sm';

  return {
    width,
    height,
    isMobile,
    isTablet,
    isDesktop,
    isLandscape,
    breakpoint,
  };
};

/**
 * レスポンシブ値を取得するヘルパーフック
 * 使用例: const fontSize = useResponsiveValue({ mobile: 14, tablet: 16, desktop: 18 });
 */
export const useResponsiveValue = <T>(values: {
  mobile?: T;
  tablet?: T;
  desktop?: T;
  default: T;
}): T => {
  const { isMobile, isTablet, isDesktop } = useResponsive();
  
  if (isMobile && values.mobile !== undefined) return values.mobile;
  if (isTablet && values.tablet !== undefined) return values.tablet;
  if (isDesktop && values.desktop !== undefined) return values.desktop;
  
  return values.default;
}; 