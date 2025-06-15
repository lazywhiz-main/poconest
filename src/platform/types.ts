/**
 * プラットフォーム抽象化レイヤーの型定義
 */

export interface PlatformDimensions {
  width: number;
  height: number;
}

export interface PlatformInfo {
  OS: 'web' | 'ios' | 'android' | 'windows' | 'macos';
  isWeb: boolean;
  isMobile: boolean;
  isDesktop: boolean;
}

export interface NavigationAPI {
  navigate: (screen: string, params?: any) => void;
  goBack: () => void;
  canGoBack: () => boolean;
  reset: (routes: any[]) => void;
}

export interface StorageAPI {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
  clear: () => Promise<void>;
}

export interface IconAPI {
  render: (name: string, size?: number, color?: string) => React.ReactElement;
  getAvailableIcons: () => string[];
}

export interface StyleAPI {
  create: (styles: any) => any;
  flatten: (styles: any) => any;
  compose: (...styles: any[]) => any;
}

/**
 * プラットフォーム統合API
 */
export interface PlatformAPI {
  info: PlatformInfo;
  dimensions: PlatformDimensions;
  navigation: NavigationAPI;
  storage: StorageAPI;
  icons: IconAPI;
  styles: StyleAPI;
}

/**
 * レスポンシブコンテキスト
 */
export interface ResponsiveContext {
  breakpoint: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  orientation: 'portrait' | 'landscape';
  safeArea: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
} 