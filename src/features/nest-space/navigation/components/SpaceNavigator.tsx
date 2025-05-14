import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  Animated,
  Platform,
  ViewStyle
} from 'react-native';
import { useSpaceNavigation } from '../hooks/useSpaceNavigation';
import { SpaceType } from '../../types/nestSpace.types';
import SpaceDock from './SpaceDock';
import ContextBreadcrumb from './ContextBreadcrumb';
import QuickSwitcher from './QuickSwitcher';

// SVGアイコンのラッパーコンポーネント
// 実際の実装では適切なアイコンライブラリを使用すること
const Icon = ({ name, color, size = 24 }: { name: string; color: string; size?: number }) => {
  return (
    <View style={{ width: size, height: size, backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color, fontSize: size * 0.5 }}>{name[0].toUpperCase()}</Text>
    </View>
  );
};

interface SpaceNavigatorProps {
  initialSpace?: SpaceType;
  showBreadcrumbs?: boolean;
  enableSwipeNavigation?: boolean;
  style?: ViewStyle;
}

/**
 * 空間ナビゲーターコンポーネント
 * デバイスタイプに応じて適切なナビゲーションUIを提供
 */
const SpaceNavigator: React.FC<SpaceNavigatorProps> = ({
  initialSpace = SpaceType.CHAT,
  showBreadcrumbs = true,
  enableSwipeNavigation = true,
  style
}) => {
  const { width } = useWindowDimensions();
  const {
    navigationState,
    spacesData,
    isTransitioning,
    navigateToSpace,
    navigateBack,
    navigateForward,
    canGoBack,
    canGoForward
  } = useSpaceNavigation({
    defaultSpace: initialSpace,
    showBreadcrumbs,
    enableSwipeNavigation
  });

  // アニメーション値
  const [translateX] = useState(new Animated.Value(0));
  const [quickSwitcherVisible, setQuickSwitcherVisible] = useState(false);

  // トランジション時のアニメーション
  useEffect(() => {
    if (isTransitioning) {
      const direction = navigationState.transitionDirection === 'forward' ? -1 : 1;
      
      // 初期値をセット
      translateX.setValue(direction * width * 0.3);
      
      // アニメーション実行
      Animated.timing(translateX, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true
      }).start();
    }
  }, [isTransitioning, navigationState.transitionDirection, translateX, width]);

  // クイックスイッチャーの表示/非表示
  const toggleQuickSwitcher = () => {
    setQuickSwitcherVisible(!quickSwitcherVisible);
  };

  // レンダリングコンテンツ
  const renderNavigationContent = () => {
    const { viewMode } = navigationState;

    if (viewMode === 'desktop') {
      return (
        <View style={styles.desktopContainer}>
          {/* サイドナビゲーション */}
          <View style={styles.sideNav}>
            <SpaceDock 
              vertical 
              spaces={spacesData}
              activeSpace={navigationState.activeSpaceType}
              onSpaceSelect={navigateToSpace}
            />
          </View>
          
          {/* トップバー（パンくず・コントロール） */}
          <View style={styles.topNav}>
            <View style={styles.breadcrumbContainer}>
              {showBreadcrumbs && (
                <ContextBreadcrumb 
                  contextPath={navigationState.contextPath}
                  activeSpace={navigationState.activeSpaceType}
                />
              )}
            </View>
            
            <View style={styles.navControls}>
              <TouchableOpacity
                style={[styles.navButton, !canGoBack && styles.disabledNavButton]}
                onPress={navigateBack}
                disabled={!canGoBack}
              >
                <Icon name="arrow-left" color={canGoBack ? '#333333' : '#cccccc'} size={20} />
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.navButton, !canGoForward && styles.disabledNavButton]}
                onPress={navigateForward}
                disabled={!canGoForward}
              >
                <Icon name="arrow-right" color={canGoForward ? '#333333' : '#cccccc'} size={20} />
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.quickSwitchButton}
                onPress={toggleQuickSwitcher}
              >
                <Icon name="grid" color="#333333" size={20} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      );
    } else if (viewMode === 'tablet') {
      return (
        <View style={styles.tabletContainer}>
          {/* 上部ナビゲーション */}
          <View style={styles.tabletTopNav}>
            <View style={styles.breadcrumbContainer}>
              {showBreadcrumbs && (
                <ContextBreadcrumb 
                  contextPath={navigationState.contextPath}
                  activeSpace={navigationState.activeSpaceType}
                  compact
                />
              )}
            </View>
            
            <View style={styles.navControls}>
              <TouchableOpacity
                style={[styles.navButton, !canGoBack && styles.disabledNavButton]}
                onPress={navigateBack}
                disabled={!canGoBack}
              >
                <Icon name="arrow-left" color={canGoBack ? '#333333' : '#cccccc'} size={20} />
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.navButton, !canGoForward && styles.disabledNavButton]}
                onPress={navigateForward}
                disabled={!canGoForward}
              >
                <Icon name="arrow-right" color={canGoForward ? '#333333' : '#cccccc'} size={20} />
              </TouchableOpacity>
            </View>
          </View>
          
          {/* 下部のタブナビゲーション */}
          <View style={styles.tabletBottomNav}>
            <SpaceDock 
              spaces={spacesData}
              activeSpace={navigationState.activeSpaceType}
              onSpaceSelect={navigateToSpace}
            />
          </View>
        </View>
      );
    } else {
      // モバイルレイアウト
      return (
        <View style={styles.mobileContainer}>
          {/* ボトムタブナビゲーション */}
          <View style={styles.bottomNav}>
            <SpaceDock 
              spaces={spacesData}
              activeSpace={navigationState.activeSpaceType}
              onSpaceSelect={navigateToSpace}
              showLabels={false}
              compact
            />
          </View>
        </View>
      );
    }
  };

  return (
    <View style={[styles.container, style]}>
      {renderNavigationContent()}
      
      {/* クイックスイッチャー（全画面オーバーレイ） */}
      {quickSwitcherVisible && (
        <QuickSwitcher
          onClose={() => setQuickSwitcherVisible(false)}
          onSpaceSelect={(spaceType, contextId) => {
            navigateToSpace(spaceType, { contextId });
            setQuickSwitcherVisible(false);
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // デスクトップスタイル
  desktopContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  sideNav: {
    width: 64,
    backgroundColor: '#f5f5f5',
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
    height: '100%',
  },
  topNav: {
    height: 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    position: 'absolute',
    top: 0,
    left: 64,
    right: 0,
    zIndex: 10,
  },
  // タブレットスタイル
  tabletContainer: {
    flex: 1,
  },
  tabletTopNav: {
    height: 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  tabletBottomNav: {
    height: 56,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  // モバイルスタイル
  mobileContainer: {
    flex: 1,
  },
  bottomNav: {
    height: 56,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  // 共通スタイル
  breadcrumbContainer: {
    flex: 1,
  },
  navControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  disabledNavButton: {
    opacity: 0.5,
  },
  quickSwitchButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    backgroundColor: '#f0f0f0',
  }
});

export default SpaceNavigator; 