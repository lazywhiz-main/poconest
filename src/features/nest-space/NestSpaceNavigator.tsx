import React, { useEffect, useState } from 'react';
import { View, StyleSheet, useWindowDimensions, ViewStyle } from 'react-native';
import { SpaceNavigator } from './navigation';
import { useNestSpace } from './contexts/_NestSpaceContext';
import { SpaceType } from './types/nestSpace.types';

// PiP (Picture-in-Picture) 表示用のコンポーネント
const PictureInPicture: React.FC<{
  sourceSpaceType: SpaceType;
  children: React.ReactNode;
  onClose: () => void;
  style?: ViewStyle;
}> = ({ children, style }) => {
  return (
    <View style={[styles.pipContainer, style]}>
      {children}
    </View>
  );
};

interface NestSpaceNavigatorProps {
  defaultSpace?: SpaceType;
  children?: React.ReactNode;
  enableMultitasking?: boolean;
  enableAnimations?: boolean;
  style?: ViewStyle;
}

/**
 * NESTスペースナビゲーターコンポーネント
 * 空間間の移動と空間内のコンテンツ表示を管理
 */
const NestSpaceNavigator: React.FC<NestSpaceNavigatorProps> = ({
  defaultSpace = SpaceType.CHAT,
  children,
  enableMultitasking = true,
  enableAnimations = true,
  style
}) => {
  const { width } = useWindowDimensions();
  const nestSpace = useNestSpace();
  
  // 現在のレイアウトモード
  const [layoutMode, setLayoutMode] = useState<'stacked' | 'split' | 'pip'>('stacked');
  
  // PiP表示用の状態
  const [pipContent, setPipContent] = useState<{
    spaceType: SpaceType;
    content: React.ReactNode;
  } | null>(null);
  
  // 画面サイズに応じてレイアウトモードを調整
  useEffect(() => {
    if (width >= 1200 && enableMultitasking) {
      setLayoutMode('split');
    } else if (width >= 768 && enableMultitasking) {
      setLayoutMode('pip');
    } else {
      setLayoutMode('stacked');
    }
  }, [width, enableMultitasking]);
  
  // レイアウトモードの変更時の処理
  useEffect(() => {
    // スタックモードになった場合はPiPをクリア
    if (layoutMode === 'stacked' && pipContent) {
      setPipContent(null);
    }
  }, [layoutMode, pipContent]);
  
  // PiP表示を閉じるハンドラー
  const closePip = () => {
    setPipContent(null);
  };
  
  // 現在のアクティブな空間のコンテンツを表示
  const renderActiveSpaceContent = () => {
    // 子要素がある場合はそれを表示（外部からコンテンツを注入するケース）
    if (children) {
      return children;
    }
    
    // アクティブな空間に基づいてコンテンツをレンダリング
    switch (nestSpace.spaceState.activeSpaceType) {
      case SpaceType.CHAT:
        return (
          <View style={styles.spaceContent}>
            {/* チャット空間のコンテンツ */}
            {/* 実際の実装では、ChatSpaceScreen などのコンポーネントを表示 */}
          </View>
        );
      case SpaceType.BOARD:
        return (
          <View style={styles.spaceContent}>
            {/* ボード空間のコンテンツ */}
            {/* 実際の実装では、BoardSpaceScreen などのコンポーネントを表示 */}
          </View>
        );
      case SpaceType.ANALYSIS:
        return (
          <View style={styles.spaceContent}>
            {/* 分析空間のコンテンツ */}
            {/* 実際の実装では、AnalysisSpaceScreen などのコンポーネントを表示 */}
          </View>
        );
      case SpaceType.ZOOM:
        return (
          <View style={styles.spaceContent}>
            {/* Zoom空間のコンテンツ */}
            {/* 実際の実装では、ZoomSpaceScreen などのコンポーネントを表示 */}
          </View>
        );
      default:
        return null;
    }
  };
  
  // 分割表示用のセカンダリコンテンツをレンダリング
  const renderSecondaryContent = () => {
    // PiPモードの場合
    if (layoutMode === 'pip' && pipContent) {
      return (
        <PictureInPicture
          sourceSpaceType={pipContent.spaceType}
          onClose={closePip}
          style={styles.pipView}
        >
          {pipContent.content}
        </PictureInPicture>
      );
    }
    
    // 分割表示モードの場合（セカンダリビュー）
    if (layoutMode === 'split') {
      return (
        <View style={styles.splitSecondaryView}>
          {/* セカンダリコンテンツがあれば表示 */}
          {/* 実際の実装では、別の空間や関連コンテンツを表示 */}
        </View>
      );
    }
    
    return null;
  };
  
  return (
    <View style={[styles.container, style]}>
      {/* メインコンテンツエリア */}
      <View style={[
        styles.contentContainer,
        layoutMode === 'split' && styles.splitContentContainer
      ]}>
        {/* 空間のコンテンツ */}
        <View style={[
          styles.mainContent,
          layoutMode === 'split' && styles.splitMainContent
        ]}>
          {renderActiveSpaceContent()}
        </View>
        
        {/* セカンダリコンテンツ（分割表示やPiP） */}
        {renderSecondaryContent()}
      </View>
      
      {/* ナビゲーション */}
      <SpaceNavigator
        initialSpace={defaultSpace}
        showBreadcrumbs={true}
        enableSwipeNavigation={enableAnimations}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  contentContainer: {
    flex: 1,
    position: 'relative',
  },
  mainContent: {
    flex: 1,
  },
  spaceContent: {
    flex: 1,
  },
  // 分割表示モード
  splitContentContainer: {
    flexDirection: 'row',
  },
  splitMainContent: {
    flex: 0.65, // 65%のスペース
  },
  splitSecondaryView: {
    flex: 0.35, // 35%のスペース
    borderLeftWidth: 1,
    borderLeftColor: '#e0e0e0',
  },
  // PiPモード
  pipContainer: {
    position: 'absolute',
    right: 16,
    bottom: 80, // ボトムナビゲーションの上にマージンを取る
    width: 300,
    height: 200,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    overflow: 'hidden',
  },
  pipView: {
    zIndex: 100,
  }
});

export default NestSpaceNavigator; 