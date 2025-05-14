import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView
} from 'react-native';
import { SpaceData } from '../types/navigation.types';
import { SpaceType } from '../../types/nestSpace.types';

// SVGアイコンのラッパーコンポーネント
// 実際の実装では適切なアイコンライブラリを使用すること
const Icon = ({ name, color, size = 24 }: { name: string; color: string; size?: number }) => {
  // ユーザープロフィールアイコンの特別なケース
  if (name === 'user-profile') {
    return (
      <View style={{ width: size, height: size, backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color, fontSize: size * 0.5 }}>👤</Text>
      </View>
    );
  }
  
  return (
    <View style={{ width: size, height: size, backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color, fontSize: size * 0.5 }}>{name[0].toUpperCase()}</Text>
    </View>
  );
};

interface SpaceDockProps {
  spaces: SpaceData[];
  activeSpace: SpaceType;
  onSpaceSelect: (spaceType: SpaceType) => void;
  vertical?: boolean;
  showLabels?: boolean;
  compact?: boolean;
}

/**
 * 空間ドックコンポーネント
 * 空間ナビゲーションのアイコンを表示
 */
const SpaceDock: React.FC<SpaceDockProps> = ({
  spaces,
  activeSpace,
  onSpaceSelect,
  vertical = false,
  showLabels = true,
  compact = false
}) => {
  // 表示するスペースをフィルタリングして並べ替え
  const visibleSpaces = spaces
    .filter(space => space.isVisible !== false)
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  // スペースアイコンをレンダリング
  const renderSpaceIcon = (space: SpaceData) => {
    const isActive = space.id === activeSpace;
    const iconSize = compact ? 20 : 24;
    
    return (
      <TouchableOpacity
        key={space.id}
        style={[
          styles.spaceButton,
          vertical && styles.verticalSpaceButton,
          compact && styles.compactSpaceButton,
          isActive && styles.activeSpaceButton
        ]}
        onPress={() => onSpaceSelect(space.id)}
      >
        <View style={styles.iconContainer}>
          <Icon
            name={space.icon}
            color={isActive ? space.color || '#4a6da7' : '#757575'}
            size={iconSize}
          />
          
          {space.badge !== null && space.badge !== undefined && space.badge > 0 && (
            <View style={[styles.badge, { backgroundColor: space.color || '#4a6da7' }]}>
              <Text style={styles.badgeText}>
                {space.badge > 99 ? '99+' : space.badge}
              </Text>
            </View>
          )}
        </View>
        
        {showLabels && (
          <Text
            style={[
              styles.spaceLabel,
              isActive && { color: space.color || '#4a6da7' },
              compact && styles.compactSpaceLabel
            ]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {space.title}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[
      styles.container,
      vertical ? styles.verticalContainer : styles.horizontalContainer
    ]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        horizontal={!vertical}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
      >
        {visibleSpaces.map(renderSpaceIcon)}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
  },
  horizontalContainer: {
    height: 56,
    width: '100%',
  },
  verticalContainer: {
    width: 64,
    height: '100%',
  },
  scrollContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  spaceButton: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  verticalSpaceButton: {
    width: 64,
    height: 64,
  },
  compactSpaceButton: {
    padding: 4,
  },
  activeSpaceButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  iconContainer: {
    position: 'relative',
    marginBottom: 4,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  spaceLabel: {
    fontSize: 12,
    color: '#757575',
    textAlign: 'center',
    marginTop: 2,
  },
  compactSpaceLabel: {
    fontSize: 10,
  }
});

export default SpaceDock; 