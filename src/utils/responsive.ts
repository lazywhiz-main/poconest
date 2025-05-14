/**
 * ポコの巣 - レスポンシブスタイルユーティリティ
 * 異なるデバイスサイズに対応したスタイリングを簡易化するためのユーティリティ関数
 */
import { Dimensions, Platform, ScaledSize } from 'react-native';
import { BREAKPOINTS } from '@constants/config';

// デバイスの現在のウィンドウサイズを取得
export const useWindowDimensions = (): ScaledSize => {
  return Dimensions.get('window');
};

// 現在のスクリーンサイズを取得
export const useScreenDimensions = (): ScaledSize => {
  return Dimensions.get('screen');
};

// デバイスの種類を判定
export const getDeviceType = (width: number = Dimensions.get('window').width): 'mobile' | 'tablet' | 'desktop' | 'largeDesktop' => {
  if (width < BREAKPOINTS.mobile) return 'mobile';
  if (width < BREAKPOINTS.tablet) return 'tablet';
  if (width < BREAKPOINTS.desktop) return 'desktop';
  return 'largeDesktop';
};

// 現在のデバイスタイプを取得
export const getDeviceTypeSync = (): 'mobile' | 'tablet' | 'desktop' | 'largeDesktop' => {
  return getDeviceType();
};

// 異なるデバイスタイプに基づいて値を選択
export const selectByDeviceSize = <T>(options: {
  mobile?: T;
  tablet?: T;
  desktop?: T;
  largeDesktop?: T;
  default: T;
}, width: number = Dimensions.get('window').width): T => {
  const deviceType = getDeviceType(width);
  
  if (deviceType === 'mobile' && options.mobile !== undefined) return options.mobile;
  if (deviceType === 'tablet' && options.tablet !== undefined) return options.tablet;
  if (deviceType === 'desktop' && options.desktop !== undefined) return options.desktop;
  if (deviceType === 'largeDesktop' && options.largeDesktop !== undefined) return options.largeDesktop;
  
  return options.default;
};

// メディアクエリに似た条件分岐（Webでのプラットフォーム特有の処理を考慮）
export const mediaQuery = {
  // 指定したブレークポイント以上の幅であればtrue
  minWidth: (breakpoint: number, currentWidth: number = Dimensions.get('window').width): boolean => {
    return currentWidth >= breakpoint;
  },
  
  // 指定したブレークポイント以下の幅であればtrue
  maxWidth: (breakpoint: number, currentWidth: number = Dimensions.get('window').width): boolean => {
    return currentWidth <= breakpoint;
  },
  
  // 指定した範囲内の幅であればtrue
  betweenWidth: (
    minBreakpoint: number,
    maxBreakpoint: number,
    currentWidth: number = Dimensions.get('window').width
  ): boolean => {
    return currentWidth >= minBreakpoint && currentWidth <= maxBreakpoint;
  },
  
  // モバイルデバイスであればtrue
  isMobile: (currentWidth: number = Dimensions.get('window').width): boolean => {
    return currentWidth < BREAKPOINTS.tablet;
  },
  
  // タブレットデバイスであればtrue
  isTablet: (currentWidth: number = Dimensions.get('window').width): boolean => {
    return currentWidth >= BREAKPOINTS.tablet && currentWidth < BREAKPOINTS.desktop;
  },
  
  // デスクトップデバイスであればtrue
  isDesktop: (currentWidth: number = Dimensions.get('window').width): boolean => {
    return currentWidth >= BREAKPOINTS.desktop;
  },
  
  // 大型デスクトップデバイスであればtrue
  isLargeDesktop: (currentWidth: number = Dimensions.get('window').width): boolean => {
    return currentWidth >= BREAKPOINTS.largeDesktop;
  },
};

// レスポンシブなパディングとマージンの計算（基本サイズに対する比率で調整）
export const responsiveSpacing = (
  baseSize: number,
  deviceType: 'mobile' | 'tablet' | 'desktop' | 'largeDesktop' = getDeviceTypeSync()
): number => {
  const scaleFactor = {
    mobile: 0.8,
    tablet: 1,
    desktop: 1.2,
    largeDesktop: 1.5,
  };
  
  return baseSize * scaleFactor[deviceType];
};

// フォントサイズをレスポンシブに調整
export const responsiveFontSize = (
  baseSize: number,
  deviceType: 'mobile' | 'tablet' | 'desktop' | 'largeDesktop' = getDeviceTypeSync()
): number => {
  const scaleFactor = {
    mobile: 0.9,
    tablet: 1,
    desktop: 1.1, 
    largeDesktop: 1.2,
  };
  
  return baseSize * scaleFactor[deviceType];
};

// デバイスの向きを取得
export const getDeviceOrientation = (
  width: number = Dimensions.get('window').width,
  height: number = Dimensions.get('window').height
): 'portrait' | 'landscape' => {
  return width < height ? 'portrait' : 'landscape';
};

// React Native Webにおけるイベントリスナーの登録（ウィンドウサイズ変更検出用）
export const addWindowResizeListener = (callback: (dimensions: ScaledSize) => void): (() => void) => {
  if (Platform.OS === 'web') {
    const handleResize = () => {
      callback({
        width: window.innerWidth,
        height: window.innerHeight,
        scale: 1,
        fontScale: 1,
      });
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }
  
  // モバイルプラットフォームの場合
  const subscription = Dimensions.addEventListener('change', ({ window }) => {
    callback(window);
  });
  
  return () => subscription.remove();
};

// Tauriデスクトップアプリケーション用のウィンドウサイズチェック
export const isTauriWindow = (): boolean => {
  return typeof window !== 'undefined' && 'window.__TAURI__' in window;
};

export default {
  getDeviceType,
  selectByDeviceSize,
  mediaQuery,
  responsiveSpacing,
  responsiveFontSize,
  getDeviceOrientation,
  addWindowResizeListener,
  isTauriWindow,
}; 