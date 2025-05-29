import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  useWindowDimensions, 
  Platform 
} from 'react-native';
import theme from '../../styles/theme';
import { SpaceType } from '../../types/nestSpace.types';

// SVGアイコンコンポーネント
interface IconProps {
  name: string;
  size?: number;
  color?: string;
  style?: any;
}

const Icon: React.FC<IconProps> = ({ name, size = 24, color = 'currentColor', style = {} }) => {
  return (
    <View style={style}>
      <svg 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke={color} 
        strokeWidth="2"
        strokeLinecap="round" 
        strokeLinejoin="round"
      >
        {getIconPath(name)}
      </svg>
    </View>
  );
};

// アイコンパス定義
const getIconPath = (name: string) => {
  switch (name) {
    case 'chat':
      return <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>;
    case 'board':
      return (
        <>
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="3" y1="9" x2="21" y2="9"></line>
          <line x1="9" y1="21" x2="9" y2="9"></line>
        </>
      );
    case 'zoom':
      return (
        <>
          <polygon points="23 7 16 12 23 17 23 7"></polygon>
          <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
        </>
      );
    case 'analytics':
      return (
        <>
          <line x1="18" y1="20" x2="18" y2="10"></line>
          <line x1="12" y1="20" x2="12" y2="4"></line>
          <line x1="6" y1="20" x2="6" y2="14"></line>
          <line x1="2" y1="20" x2="22" y2="20"></line>
        </>
      );
    case 'profile':
      return (
        <>
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </>
      );
    case 'chevron-left':
      return <polyline points="15 18 9 12 15 6"></polyline>;
    case 'chevron-right':
      return <polyline points="9 18 15 12 9 6"></polyline>;
    default:
      return <circle cx="12" cy="12" r="10"></circle>;
  }
};

// アイコンマッピング
const icons = {
  [SpaceType.CHAT]: 'chat',
  [SpaceType.BOARD]: 'board',
  [SpaceType.MEETING]: 'meeting',
  [SpaceType.ANALYSIS]: 'analytics',
  [SpaceType.USER_PROFILE]: 'profile',
};

// アイコンの名前
const spaceNames = {
  [SpaceType.CHAT]: 'チャット',
  [SpaceType.BOARD]: 'ボード',
  [SpaceType.MEETING]: 'ミーティング',
  [SpaceType.ANALYSIS]: '分析',
  [SpaceType.USER_PROFILE]: 'プロフィール',
};

// スペースごとのカラー
const spaceColors = {
  [SpaceType.CHAT]: theme.colors.spaces.chat.primary,      // コーラル
  [SpaceType.BOARD]: theme.colors.spaces.board.primary,    // 黄色
  [SpaceType.MEETING]: theme.colors.spaces.meeting.primary,      // ミント
  [SpaceType.ANALYSIS]: theme.colors.spaces.analysis.primary,  // ディープグリーン
  [SpaceType.USER_PROFILE]: theme.colors.spaces.settings.primary, // 濃いグレー
};

interface AppNavigationProps {
  activeSpace: SpaceType;
  onSelectSpace: (space: SpaceType) => void;
  unreadCounts?: Partial<Record<SpaceType, number>>;
}

/**
 * アプリナビゲーションコンポーネント
 * 
 * モバイルではボトムバー、PCではサイドメニューとして表示される
 * 空間の切り替えを提供する
 */
const AppNavigation: React.FC<AppNavigationProps> = ({
  activeSpace,
  onSelectSpace,
  unreadCounts = {},
}) => {
  const { width } = useWindowDimensions();
  const [isMobile, setIsMobile] = useState(width < theme.breakpoints.md);
  const [isExpanded, setIsExpanded] = useState(true);

  // 画面サイズの変更を監視
  useEffect(() => {
    setIsMobile(width < theme.breakpoints.md);
  }, [width]);

  // すべての空間タイプの配列
  const spaceTypes = Object.values(SpaceType);

  // ナビゲーション項目をレンダリング
  const renderNavItem = (space: SpaceType) => {
    const isActive = activeSpace === space;
    const hasUnread = unreadCounts && unreadCounts[space] && unreadCounts[space] > 0;
    
    // アクティブな空間のアイコンカラーは白、それ以外はグレー
    const iconColor = isActive ? 'white' : theme.colors.text.secondary;
    const spaceColor = spaceColors[space];

    return (
      <TouchableOpacity
        key={space}
        style={[
          isMobile ? styles.bottomNavItem : styles.sideNavItem,
          isActive && (isMobile 
            ? [styles.bottomNavItemActive, { borderTopColor: spaceColor }] 
            : [styles.sideNavItemActive, { backgroundColor: `${spaceColor}10` }])
        ]}
        onPress={() => onSelectSpace(space)}
      >
        <View style={[
          styles.navIconContainer,
          isActive && [styles.activeIconContainer, { backgroundColor: spaceColor }]
        ]}>
          <Icon 
            name={icons[space]} 
            size={20} 
            color={iconColor} 
          />
          {hasUnread && (
            <View style={[styles.badge, { backgroundColor: spaceColor }]}>
              <Text style={styles.badgeText}>
                {unreadCounts?.[space] && unreadCounts[space] > 99 ? '99+' : unreadCounts[space]}
              </Text>
            </View>
          )}
        </View>
        {/* ラベルはモバイル時は非表示 */}
        {(!isMobile && isExpanded) && (
          <Text 
            style={[
              styles.navLabel, 
              isActive && [styles.navLabelActive, { color: spaceColor }],
              isMobile && styles.bottomNavLabel
            ]}
          >
            {spaceNames[space]}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  // モバイル用ボトムナビゲーション
  const renderBottomNavigation = () => (
    <View style={styles.bottomNavContainer}>
      {spaceTypes.map(renderNavItem)}
    </View>
  );

  // PC用サイドナビゲーション
  const renderSideNavigation = () => (
    <View style={[styles.sideNavContainer, !isExpanded && styles.sideNavCollapsed]}>
      {/* ナビゲーション項目 */}
      <View style={styles.navItems}>
        {spaceTypes.map(renderNavItem)}
      </View>
      
      {/* 展開/折りたたみボタン */}
      <TouchableOpacity 
        style={styles.expandButton}
        onPress={() => setIsExpanded(!isExpanded)}
      >
        <Icon 
          name={isExpanded ? 'chevron-left' : 'chevron-right'} 
          size={18} 
          color={theme.colors.text.secondary} 
        />
      </TouchableOpacity>
    </View>
  );

  return isMobile ? renderBottomNavigation() : renderSideNavigation();
};

const styles = StyleSheet.create({
  // ボトムナビゲーション（モバイル）
  bottomNavContainer: {
    flexDirection: 'row',
    height: 60,
    backgroundColor: theme.colors.background.paper,
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? 20 : 0, // iOS のセーフエリア対応
  },
  bottomNavItem: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
  },
  bottomNavItemActive: {
    backgroundColor: theme.colors.background.paper,
    borderTopWidth: 3,
  },
  bottomNavLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  
  // サイドナビゲーション（PC）
  sideNavContainer: {
    width: 220,
    height: '100%',
    backgroundColor: theme.colors.background.paper,
    borderRightWidth: 1,
    borderRightColor: theme.colors.divider,
    flexDirection: 'column',
    transition: 'width 0.3s ease',
  },
  sideNavCollapsed: {
    width: 64,
  },
  navItems: {
    flex: 1,
    paddingTop: theme.spacing.lg,
  },
  sideNavItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.sm,
    marginHorizontal: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
    borderRadius: theme.borderRadius.md,
  },
  sideNavItemActive: {
    // 各空間のハイライト色は renderNavItem で動的に設定するので、背景色の透明度だけ指定
  },
  navIconContainer: {
    position: 'relative',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  activeIconContainer: {
    // 背景色は各空間の色で動的に設定
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    // 背景色は各空間の色で動的に設定
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  navLabel: {
    marginLeft: theme.spacing.md,
    fontSize: theme.fontSizes.sm,
    color: theme.colors.text.secondary,
  },
  navLabelActive: {
    fontWeight: theme.fontWeights.medium as any,
    color: theme.colors.text.primary,
  },
  expandButton: {
    padding: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
    alignItems: 'center',
  },
});

export default AppNavigation; 