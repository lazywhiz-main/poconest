import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView
} from 'react-native';
import { SpaceType } from '../../types/nestSpace.types';

// SVGアイコンのラッパーコンポーネント
// 実際の実装では適切なアイコンライブラリを使用すること
const Icon = ({ name, color, size = 16 }: { name: string; color: string; size?: number }) => {
  return (
    <View style={{ width: size, height: size, backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color, fontSize: size * 0.5 }}>{name[0].toUpperCase()}</Text>
    </View>
  );
};

// 空間タイプごとのアイコンとカラーのマッピング
const SPACE_CONFIGS: Record<SpaceType, { icon: string; color: string }> = {
  [SpaceType.CHAT]: { icon: 'message-circle', color: '#4a6da7' },
  [SpaceType.BOARD]: { icon: 'layout', color: '#43a047' },
  [SpaceType.ANALYSIS]: { icon: 'bar-chart-2', color: '#7e57c2' },
  [SpaceType.MEETING]: { icon: 'video', color: '#7e57c2' },
  [SpaceType.USER_PROFILE]: { icon: 'user', color: '#757575' },
  [SpaceType.ZOOM]: { icon: 'video', color: '#2196f3' },
  [SpaceType.SETTINGS]: { icon: 'settings', color: '#757575' },
  [SpaceType.INSIGHTS]: { icon: 'bar-chart', color: '#7e57c2' }
};

interface ContextBreadcrumbProps {
  contextPath: string[];
  activeSpace: SpaceType;
  onPathClick?: (path: string, index: number) => void;
  compact?: boolean;
}

/**
 * コンテキストパンくずコンポーネント
 * 現在のナビゲーションコンテキストを表示
 */
const ContextBreadcrumb: React.FC<ContextBreadcrumbProps> = ({
  contextPath,
  activeSpace,
  onPathClick,
  compact = false
}) => {
  // 空間アイコンと名前のマッピング
  const getSpaceName = (spaceType: SpaceType): string => {
    switch (spaceType) {
      case SpaceType.CHAT:
        return 'チャット';
      case SpaceType.BOARD:
        return 'ボード';
      case SpaceType.ANALYSIS:
        return '分析';
      case SpaceType.MEETING:
        return 'ミーティング';
      case SpaceType.USER_PROFILE:
        return 'プロフィール';
      default:
        return '不明';
    }
  };

  // パンくずのクリックハンドラー
  const handlePathClick = (path: string, index: number) => {
    if (onPathClick) {
      onPathClick(path, index);
    }
  };

  // コンパクトモードのパンくず
  if (compact) {
    const spaceConfig = SPACE_CONFIGS[activeSpace];
    const lastPathSegment = contextPath.length > 0 ? contextPath[contextPath.length - 1] : null;
    
    return (
      <View style={styles.compactContainer}>
        <View style={[styles.compactSpaceIndicator, { backgroundColor: spaceConfig.color }]}>
          <Icon name={spaceConfig.icon} color="#FFFFFF" size={14} />
        </View>
        <Text style={styles.compactSpaceTitle}>{getSpaceName(activeSpace)}</Text>
        {lastPathSegment && (
          <>
            <Icon name="chevron-right" color="#9e9e9e" size={16} />
            <Text style={styles.compactPathSegment} numberOfLines={1} ellipsizeMode="tail">
              {lastPathSegment}
            </Text>
          </>
        )}
      </View>
    );
  }

  // 通常モードのパンくず
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      <View style={styles.breadcrumbContainer}>
        {/* 空間タイプ表示 */}
        <View style={styles.spaceContainer}>
          <View style={[
            styles.spaceIconContainer,
            { backgroundColor: SPACE_CONFIGS[activeSpace].color }
          ]}>
            <Icon name={SPACE_CONFIGS[activeSpace].icon} color="#FFFFFF" />
          </View>
          <Text style={styles.spaceTitle}>{getSpaceName(activeSpace)}</Text>
        </View>
        
        {/* パスセグメント */}
        {contextPath.length > 0 && (
          <View style={styles.pathContainer}>
            <Icon name="chevron-right" color="#9e9e9e" />
            
            {contextPath.map((path, index) => (
              <React.Fragment key={index}>
                {index > 0 && <Icon name="chevron-right" color="#9e9e9e" />}
                <TouchableOpacity
                  style={styles.pathSegment}
                  onPress={() => handlePathClick(path, index)}
                >
                  <Text 
                    style={[
                      styles.pathText,
                      index === contextPath.length - 1 && styles.activePathText
                    ]}
                    numberOfLines={1}
                    ellipsizeMode="middle"
                  >
                    {path}
                  </Text>
                </TouchableOpacity>
              </React.Fragment>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  breadcrumbContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  spaceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  spaceIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  spaceTitle: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333333',
  },
  pathContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  pathSegment: {
    marginHorizontal: 4,
  },
  pathText: {
    fontSize: 14,
    color: '#757575',
    maxWidth: 150,
  },
  activePathText: {
    color: '#333333',
    fontWeight: '500',
  },
  // コンパクトモード用スタイル
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  compactSpaceIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  compactSpaceTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#333333',
    marginRight: 4,
  },
  compactPathSegment: {
    fontSize: 12,
    color: '#757575',
    maxWidth: 100,
  }
});

export default ContextBreadcrumb; 