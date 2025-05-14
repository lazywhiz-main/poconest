import React from 'react';
import { View, StyleSheet, SafeAreaView, Platform } from 'react-native';
import AppNavigation from '../navigation/AppNavigation';
import { SpaceType } from '../../types/nestSpace.types';
import theme from '../../styles/theme';

interface AppLayoutProps {
  children: React.ReactNode;
  activeSpace: SpaceType;
  onSelectSpace: (space: SpaceType) => void;
  unreadCounts?: Partial<Record<SpaceType, number>>;
}

/**
 * アプリケーションの基本レイアウト
 * 
 * ナビゲーションとコンテンツエリアを配置する
 * プラットフォームに応じた適切なレイアウト調整を行う
 */
const AppLayout: React.FC<AppLayoutProps> = ({
  children,
  activeSpace,
  onSelectSpace,
  unreadCounts,
}) => {
  const isDesktop = Platform.OS === 'web';
  
  // モバイルレイアウト（ボトムナビゲーション）
  if (!isDesktop) {
    return (
      <SafeAreaView style={styles.container}>
        {/* コンテンツエリア */}
        <View style={styles.contentCardMobile}>
          {children}
        </View>

        {/* ボトムナビゲーション */}
        <View style={styles.navCardMobile}>
          <AppNavigation
            activeSpace={activeSpace}
            onSelectSpace={onSelectSpace}
            unreadCounts={unreadCounts}
          />
        </View>
      </SafeAreaView>
    );
  }
  
  // デスクトップレイアウト（サイドナビゲーション）
  return (
    <View style={styles.container}>
      <View style={styles.desktopContentContainer}>
        {/* サイドナビゲーション */}
        <View style={styles.navCardDesktop}>
        <AppNavigation
          activeSpace={activeSpace}
          onSelectSpace={onSelectSpace}
          unreadCounts={unreadCounts}
        />
        </View>
      
        {/* コンテンツエリア */}
        <View style={styles.contentCardDesktop}>
        {children}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.default,
    padding: 12,
    flexDirection: 'column',
  },
  desktopContentContainer: {
    flex: 1,
    flexDirection: 'row',
    gap: 12,
  },
  navCardDesktop: {
    backgroundColor: 'white',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  contentCardDesktop: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  contentCardMobile: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  navCardMobile: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
});

export default AppLayout; 