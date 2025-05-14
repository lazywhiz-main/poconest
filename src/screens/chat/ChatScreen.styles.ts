import { StyleSheet, Platform, Dimensions } from 'react-native';
import { COLORS, SPACING, BREAKPOINTS } from '@constants/config';

// ウィンドウの幅に基づいて現在のブレイクポイントを取得する関数
const getScreenType = () => {
  const { width } = Dimensions.get('window');
  if (width < BREAKPOINTS.mobile) return 'small';
  if (width < BREAKPOINTS.tablet) return 'mobile';
  if (width < BREAKPOINTS.desktop) return 'tablet';
  return 'desktop';
};

// スタイルを動的に生成する関数
export const createChatStyles = () => {
  const screenType = getScreenType();
  const isDesktop = screenType === 'desktop';
  const isTablet = screenType === 'tablet';
  const isMobile = screenType === 'mobile' || screenType === 'small';
  
  // 画面サイズに応じてサイドバーの幅を調整
  const sidebarWidth = isDesktop ? 280 : isTablet ? 250 : '85%';
  
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.background,
    },
    safeArea: {
      flex: 1,
    },
    keyboardAvoidingView: {
      flex: 1,
    },
    content: {
      flex: 1,
      flexDirection: 'row',
    },
    // チャットリスト（サイドバー）スタイル
    chatList: {
      width: sidebarWidth,
      borderRightWidth: 1,
      borderRightColor: COLORS.lightGray,
      paddingVertical: SPACING.sm,
      backgroundColor: COLORS.white,
    },
    // モバイル用のサイドバースタイル（オーバーレイ表示）
    mobileChatList: {
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      zIndex: 10,
      elevation: 5,
      shadowColor: '#000',
      shadowOffset: { width: 2, height: 0 },
      shadowOpacity: 0.2,
      shadowRadius: 3,
    },
    // セクションタイトル
    sectionTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      marginLeft: SPACING.md,
      marginVertical: SPACING.sm,
      color: COLORS.text,
    },
    // チャットルームリストアイテム
    chatItem: {
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.lightGray,
    },
    chatItemContent: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    // 選択されたチャットルーム
    selectedChat: {
      backgroundColor: `${COLORS.primary}15`,
    },
    // アバターコンテナ
    avatarContainer: {
      width: 40,
      height: 40,
      marginRight: SPACING.sm,
      borderRadius: 20,
      overflow: 'hidden',
      backgroundColor: COLORS.lightGray,
      justifyContent: 'center',
      alignItems: 'center',
    },
    defaultAvatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: `${COLORS.primary}20`,
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarText: {
      fontSize: 16,
      fontWeight: 'bold',
      color: COLORS.primary,
    },
    // チャット情報
    chatItemInfo: {
      flex: 1,
    },
    chatName: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 2,
      color: COLORS.text,
    },
    lastMessage: {
      fontSize: 12,
      color: COLORS.lightText,
      marginRight: 24, // 未読バッジのスペース確保
    },
    // 未読バッジ
    unreadBadge: {
      position: 'absolute',
      right: 0,
      top: 10,
      backgroundColor: COLORS.primary,
      width: 20,
      height: 20,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
    },
    unreadText: {
      color: COLORS.white,
      fontSize: 12,
      fontWeight: 'bold',
    },
    // メインチャットエリア
    chatArea: {
      flex: 1,
      backgroundColor: COLORS.white,
      display: 'flex',
      flexDirection: 'column',
    },
    // メッセージコンテナ
    messageContainer: {
      flex: 1,
      position: 'relative',
      ...Platform.select({
        web: {
          overflowY: 'auto' as any,
        },
      }),
    },
    flatList: {
      flex: 1,
    },
    messageList: {
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
    },
    // 入力エリア
    inputContainer: {
      flexDirection: 'row',
      padding: SPACING.sm,
      borderTopWidth: 1,
      borderTopColor: COLORS.lightGray,
      backgroundColor: COLORS.white,
      minHeight: 60,
      alignItems: 'flex-end',
    },
    input: {
      flex: 1,
      borderWidth: 1,
      borderColor: COLORS.lightGray,
      borderRadius: 20,
      paddingHorizontal: 15,
      paddingVertical: 8,
      marginRight: 10,
      fontSize: 16,
      maxHeight: 120,
      minHeight: 40,
      ...Platform.select({
        web: {
          outlineStyle: 'none' as any,
        },
      }),
    },
    sendButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: COLORS.primary,
      justifyContent: 'center',
      alignItems: 'center',
      alignSelf: 'flex-end',
    },
    sendButtonIcon: {
      color: COLORS.white,
      fontSize: 20,
    },
    // ローディングインジケータ
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      marginTop: SPACING.sm,
      color: COLORS.lightText,
    },
    // 空のチャットメッセージ
    emptyChatMessage: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyChatText: {
      color: COLORS.lightText,
      fontSize: 16,
    },
    // ヘッダーの右側部分
    headerRight: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    headerButton: {
      padding: 8,
      marginLeft: 8,
      borderRadius: 8,
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: `${COLORS.primary}15`,
    },
    // モーダル関連
    modalContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
      backgroundColor: COLORS.white,
      borderRadius: 12,
      padding: SPACING.lg,
      width: isDesktop ? '30%' : isTablet ? '50%' : '85%',
      maxWidth: 400,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: SPACING.md,
      color: COLORS.text,
    },
    modalButton: {
      padding: SPACING.sm,
      borderRadius: 8,
      backgroundColor: COLORS.primary,
      alignItems: 'center',
      marginTop: SPACING.md,
    },
    modalButtonText: {
      color: COLORS.white,
      fontWeight: '600',
    },
    // 要約表示
    summaryContainer: {
      backgroundColor: `${COLORS.primary}10`,
      padding: SPACING.md,
      borderRadius: 8,
      marginHorizontal: SPACING.md,
      marginVertical: SPACING.sm,
    },
    summaryTitle: {
      fontWeight: 'bold',
      marginBottom: SPACING.xs,
      color: COLORS.text,
    },
    summaryText: {
      color: COLORS.text,
      lineHeight: 20,
    },
  });
};

// デフォルトスタイルをエクスポート
export default createChatStyles(); 