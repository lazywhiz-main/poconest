/**
 * 機能フラグ管理ユーティリティ
 * デプロイ環境に応じた機能の有効/無効を制御
 */

export interface FeatureFlags {
  useResponsiveChat: boolean;
  useBottomNavigation: boolean;
  enableBetaFeatures: boolean;
}

// デバイス検出ユーティリティ
const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  // User Agent による検出
  const userAgent = navigator.userAgent.toLowerCase();
  const mobileKeywords = ['mobile', 'android', 'iphone', 'ipad', 'ipod', 'blackberry', 'windows phone'];
  const isMobileUA = mobileKeywords.some(keyword => userAgent.includes(keyword));
  
  // 画面サイズによる検出（768px未満をモバイルとみなす）
  const isMobileScreen = window.innerWidth < 768;
  
  // タッチデバイス検出
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  
  return isMobileUA || (isMobileScreen && isTouchDevice);
};

/**
 * 現在の機能フラグを取得
 */
export const getFeatureFlags = (): FeatureFlags => {
  const isProduction = import.meta.env.PROD;
  const isDevelopment = import.meta.env.DEV;
  
  // 開発環境では環境変数で制御
  if (isDevelopment) {
    return {
      useResponsiveChat: import.meta.env.VITE_USE_RESPONSIVE_CHAT === 'true',
      useBottomNavigation: import.meta.env.VITE_USE_BOTTOM_NAV === 'true',
      enableBetaFeatures: import.meta.env.VITE_ENABLE_BETA === 'true',
    };
  }

  if (isProduction) {
    // 本番環境では環境変数が設定されている場合はそれを優先
    const envResponsiveChat = import.meta.env.VITE_USE_RESPONSIVE_CHAT;
    const envBottomNav = import.meta.env.VITE_USE_BOTTOM_NAV;
    
    if (envResponsiveChat !== undefined || envBottomNav !== undefined) {
      return {
        useResponsiveChat: envResponsiveChat === 'true',
        useBottomNavigation: envBottomNav === 'true',
        enableBetaFeatures: false,
      };
    }
    
    // 環境変数が未設定の場合、デバイス検出による自動切り替え
    const isMobile = isMobileDevice();
    
    return {
      useResponsiveChat: isMobile, // モバイルデバイスのみレスポンシブ有効
      useBottomNavigation: isMobile, // モバイルデバイスのみボトムナビ有効
      enableBetaFeatures: false,
    };
  }

  // フォールバック（安全な設定）
  return {
    useResponsiveChat: false,
    useBottomNavigation: false,
    enableBetaFeatures: false,
  };
};

/**
 * デバイスサイズに基づく機能判定
 */
export const shouldUseResponsiveFeatures = (): {
  useResponsiveChat: boolean;
  useBottomNavigation: boolean;
} => {
  const flags = getFeatureFlags();
  const isDesktopSize = typeof window !== 'undefined' && window.innerWidth >= 992;

  return {
    // デスクトップサイズでは常に従来版を使用
    useResponsiveChat: flags.useResponsiveChat && !isDesktopSize,
    useBottomNavigation: flags.useBottomNavigation && !isDesktopSize,
  };
};

/**
 * 機能フラグのデバッグ情報を出力
 */
export const logFeatureFlags = (): void => {
  if (import.meta.env.DEV) {
    const flags = getFeatureFlags();
    const responsive = shouldUseResponsiveFeatures();
    
    console.group('🎯 Feature Flags');
    console.log('Environment:', import.meta.env.MODE);
    console.log('Raw flags:', flags);
    console.log('Applied flags:', responsive);
    console.log('Screen width:', window.innerWidth);
    console.groupEnd();
  }
};

// 個別のフラグを取得するヘルパー関数
export const useResponsiveFeatures = () => {
  const flags = getFeatureFlags();
  return {
    shouldUseResponsiveChat: flags.useResponsiveChat,
    shouldUseBottomNavigation: flags.useBottomNavigation,
    isBetaEnabled: flags.enableBetaFeatures,
  };
}; 