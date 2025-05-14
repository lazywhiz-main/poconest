import { StyleSheet, Platform, Dimensions } from 'react-native';
import { COLORS, SPACING, BREAKPOINTS } from '@constants/config';

// ウィンドウの幅に基づいて現在のブレイクポイントを取得
const getScreenType = () => {
  const { width } = Dimensions.get('window');
  if (width < BREAKPOINTS.mobile) return 'small';
  if (width < BREAKPOINTS.tablet) return 'mobile';
  if (width < BREAKPOINTS.desktop) return 'tablet';
  return 'desktop';
};

export const createStyles = (
  backgroundColor = COLORS.white,
  borderBottomColor = COLORS.lightGray
) => {
  const screenType = getScreenType();
  
  return StyleSheet.create({
    header: {
      height: Platform.select({
        ios: 64,
        android: 56,
        web: screenType === 'desktop' ? 72 : 60, // デスクトップではより大きく
      }),
      paddingTop: Platform.select({
        ios: 20, // iOSはステータスバー分のパディング
        android: 0,
        web: 0,
      }),
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: Platform.select({
        web: screenType === 'desktop' ? SPACING.xl : SPACING.lg,
        default: SPACING.md,
      }),
      backgroundColor,
      borderBottomWidth: 1,
      borderBottomColor,
      ...Platform.select({
        web: {
          boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.1)',
        },
        default: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.1,
          shadowRadius: 3,
          elevation: 3,
        },
      }),
    },
    leftContainer: {
      flex: screenType === 'desktop' ? 0.2 : 1, // デスクトップでは比率を調整
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-start',
    },
    titleContainer: {
      flex: screenType === 'desktop' ? 0.6 : 2, // デスクトップでは比率を調整
      alignItems: 'center',
      justifyContent: 'center',
    },
    rightContainer: {
      flex: screenType === 'desktop' ? 0.2 : 1, // デスクトップでは比率を調整
      flexDirection: 'row',
      justifyContent: 'flex-end',
      alignItems: 'center',
    },
    backButton: {
      padding: SPACING.xs,
      marginRight: SPACING.xs,
      borderRadius: 8,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    titleTextContainer: {
      alignItems: Platform.select({
        web: screenType === 'desktop' ? 'center' : 'flex-start',
        default: 'center',
      }),
      overflow: 'hidden',
    },
    title: {
      fontSize: Platform.select({
        web: screenType === 'desktop' ? 20 : 18,
        default: 18,
      }),
      fontWeight: '600',
      color: COLORS.text,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 12,
      color: COLORS.lightText,
      marginTop: 2,
    },
    emoji: {
      fontSize: 22,
      marginRight: SPACING.sm,
    },
    actionButton: {
      padding: SPACING.xs,
      borderRadius: 8,
      backgroundColor: `${COLORS.primary}15`, // 透明度15%のプライマリカラー
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: SPACING.sm,
    },
    actionButtonText: {
      color: COLORS.primary,
      fontWeight: '600',
    },
    // レスポンシブ対応のスタイル
    mobileOnly: {
      display: screenType === 'mobile' || screenType === 'small' ? 'flex' : 'none',
    },
    tabletUp: {
      display: screenType === 'tablet' || screenType === 'desktop' ? 'flex' : 'none',
    },
    desktopOnly: {
      display: screenType === 'desktop' ? 'flex' : 'none',
    },
  });
};

// デフォルトスタイルをエクスポート
export default createStyles(); 