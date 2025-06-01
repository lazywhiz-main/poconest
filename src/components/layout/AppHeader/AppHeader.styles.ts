import { StyleSheet, Platform } from 'react-native';
import { COLORS } from '@constants/config';
import { SPACING } from '@constants/spacing';
import { getScreenType } from '@utils/screen';

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
        web: screenType === 'desktop' ? 72 : 60,
      }),
      paddingTop: Platform.select({
        ios: 20,
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
          position: 'relative',
          top: 0,
          zIndex: 100,
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
      flex: screenType === 'desktop' ? 0.2 : 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-start',
    },
    titleContainer: {
      flex: screenType === 'desktop' ? 0.6 : 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rightContainer: {
      flex: screenType === 'desktop' ? 0.2 : 1,
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
    title: {
      fontSize: Platform.select({
        web: screenType === 'desktop' ? 24 : 20,
        default: 18,
      }),
      fontWeight: '600',
      color: COLORS.text,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: Platform.select({
        web: screenType === 'desktop' ? 16 : 14,
        default: 14,
      }),
      color: COLORS.secondary,
      textAlign: 'center',
      marginTop: 4,
    },
    actionButton: {
      padding: SPACING.sm,
      borderRadius: 8,
      backgroundColor: COLORS.primary,
      marginLeft: SPACING.sm,
    },
    actionButtonText: {
      color: COLORS.white,
      fontSize: 14,
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