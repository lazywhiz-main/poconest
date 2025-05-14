import { ReactNode } from 'react';
import { SpaceType } from '../../types/nestSpace.types';

// ナビゲーション履歴のアイテム型
export interface NavigationHistoryItem {
  spaceType: SpaceType;
  timestamp: number;
  contextId?: string;
  state?: Record<string, any>;
  title?: string;
}

// ナビゲーション履歴の状態
export interface NavigationHistoryState {
  items: NavigationHistoryItem[];
  currentIndex: number;
}

// 空間データの型
export interface SpaceData {
  id: SpaceType;
  title: string;
  icon: string;
  shortcut?: string;
  color?: string;
  order?: number;
  isActive: boolean;
  badge?: number | null;
  isVisible?: boolean;
}

// コンテキスト移行データの型
export interface ContextTransition {
  sourceSpaceType: SpaceType;
  targetSpaceType: SpaceType;
  sourceContextId?: string;
  targetContextId?: string;
  transitionType: 'push' | 'replace' | 'reset';
  animationType?: 'slide' | 'fade' | 'none';
  payload?: Record<string, any>;
}

// ビューモードの型
export type ViewMode = 'mobile' | 'tablet' | 'desktop';

// レイアウトモードの型
export type LayoutMode = 'stacked' | 'split' | 'pip';

// ナビゲーションの設定型
export interface NavigationConfig {
  preferredSpaces: SpaceType[];
  defaultSpace: SpaceType;
  layoutMode: LayoutMode;
  showBreadcrumbs: boolean;
  enableAnimations: boolean;
  enableSwipeNavigation: boolean;
  enableKeyboardShortcuts: boolean;
  transitionDuration: number;
  accessibilityOptions: {
    highContrast: boolean;
    largeText: boolean;
    reduceMotion: boolean;
  };
}

// クイック切替アイテムの型
export interface QuickSwitchItem {
  id: string;
  title: string;
  type: SpaceType;
  contextId?: string;
  preview?: ReactNode;
  lastAccessed: number;
}

// ディープリンクの型
export interface DeepLink {
  spaceType: SpaceType;
  contextId?: string;
  action?: string;
  params?: Record<string, string>;
}

// 空間ドックアイテムの型
export interface SpaceDockItem extends SpaceData {
  isExpanded?: boolean;
  children?: SpaceData[];
}

// ナビゲーション状態の型
export interface NavigationState {
  activeSpaceType: SpaceType;
  previousSpaceType: SpaceType | null;
  history: NavigationHistoryItem[];
  viewMode: ViewMode;
  layoutMode: LayoutMode;
  isTransitioning: boolean;
  transitionDirection: 'forward' | 'backward' | 'none';
  contextPath: string[];
  pinnedSpaces: SpaceType[];
  recentSpaces: SpaceType[];
} 