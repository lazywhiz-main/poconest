/**
 * 機能フラグ管理ユーティリティ
 * デプロイ環境に応じた機能の有効/無効を制御
 */

export interface FeatureFlags {
  useResponsiveChat: boolean;
  useBottomNavigation: boolean;
  enableBetaFeatures: boolean;
}

/**
 * 現在の機能フラグを取得
 */
export const getFeatureFlags = (): FeatureFlags => {
  // 開発環境では環境変数を使用
  if (import.meta.env.DEV) {
    return {
      useResponsiveChat: import.meta.env.VITE_USE_RESPONSIVE_CHAT === 'true',
      useBottomNavigation: import.meta.env.VITE_USE_BOTTOM_NAV === 'true',
      enableBetaFeatures: import.meta.env.VITE_ENABLE_BETA_FEATURES === 'true',
    };
  }

  // 本番環境では段階的にロールアウト
  const isProduction = import.meta.env.PROD;
  const isStaging = import.meta.env.VITE_ENVIRONMENT === 'staging';
  
  if (isStaging) {
    // ステージング環境では新機能を有効化
    return {
      useResponsiveChat: true,
      useBottomNavigation: true,
      enableBetaFeatures: true,
    };
  }

  if (isProduction) {
    // 本番環境では安定版を使用（将来的に段階的に有効化）
    return {
      useResponsiveChat: false, // TODO: Phase 3で true に変更
      useBottomNavigation: false, // TODO: Phase 3で true に変更
      enableBetaFeatures: false,
    };
  }

  // デフォルト（安全側）
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