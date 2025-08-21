import { useState, useCallback, useEffect, useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import { 
  NavigationState, 
  NavigationConfig, 
  ViewMode, 
  LayoutMode, 
  DeepLink,
  SpaceData
} from '../types/navigation.types';
import { SpaceType } from 'src/types/nestSpace.types';
import { useNavigationHistory } from './useNavigationHistory';
import { useContextTransition } from './useContextTransition';

// ビューポートサイズに基づいたビューモードの決定
const getViewModeFromDimensions = (width: number): ViewMode => {
  if (width >= 1024) return 'desktop';
  if (width >= 768) return 'tablet';
  return 'mobile';
};

// デフォルトのナビゲーション設定
const defaultConfig: NavigationConfig = {
  preferredSpaces: [SpaceType.CHAT, SpaceType.BOARD, SpaceType.ANALYSIS, SpaceType.MEETING],
  defaultSpace: SpaceType.CHAT,
  layoutMode: 'stacked',
  showBreadcrumbs: true,
  enableAnimations: true,
  enableSwipeNavigation: true,
  enableKeyboardShortcuts: true,
  transitionDuration: 250,
  accessibilityOptions: {
    highContrast: false,
    largeText: false,
    reduceMotion: false
  }
};

// 空間データの初期設定
const initialSpaceData: SpaceData[] = [
  {
    id: SpaceType.CHAT,
    title: 'チャット',
    icon: 'message-circle',
    shortcut: 'C',
    color: '#4a6da7',
    order: 0,
    isActive: true,
    badge: null,
    isVisible: true
  },
  {
    id: SpaceType.BOARD,
    title: 'ボード',
    icon: 'layout',
    shortcut: 'B',
    color: '#43a047',
    order: 1,
    isActive: false,
    badge: null,
    isVisible: true
  },
  {
    id: SpaceType.ANALYSIS,
    title: '分析',
    icon: 'bar-chart-2',
    shortcut: 'A',
    color: '#7e57c2',
    order: 2,
    isActive: false,
    badge: null,
    isVisible: true
  },
  {
    id: 'analysis-beta' as SpaceType,
    title: '分析（beta）',
    icon: 'zap',
    shortcut: 'B',
    color: '#00ff88',
    order: 3,
    isActive: false,
    badge: 1,
    isVisible: true
  },
  {
    id: SpaceType.USER_PROFILE,
    title: 'プロフィール',
    icon: 'user-profile',
    shortcut: 'P',
    color: '#757575',
    order: 4,
    isActive: false,
    badge: null,
    isVisible: true
  }
];

/**
 * ナビゲーション設定を取得する
 */
const loadNavigationConfig = (): NavigationConfig => {
  try {
    const storedConfig = localStorage.getItem('nest_navigation_config');
    if (storedConfig) {
      return { ...defaultConfig, ...JSON.parse(storedConfig) };
    }
  } catch (error) {
    console.error('Failed to load navigation config:', error);
  }
  return defaultConfig;
};

/**
 * 空間ナビゲーションを管理するフック
 */
export const useSpaceNavigation = (initialConfig?: Partial<NavigationConfig>) => {
  // デバイスのビューポートサイズを取得
  const { width } = useWindowDimensions();
  
  // ビューモードの状態（レスポンシブ）
  const [viewMode, setViewMode] = useState<ViewMode>(getViewModeFromDimensions(width));
  
  // レイアウトモードの状態
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('stacked');
  
  // ナビゲーション設定
  const [config, setConfig] = useState<NavigationConfig>(() => {
    const storedConfig = loadNavigationConfig();
    return { ...storedConfig, ...initialConfig };
  });
  
  // 空間データの状態
  const [spacesData, setSpacesData] = useState<SpaceData[]>(initialSpaceData);
  
  // ピン留めされた空間の状態
  const [pinnedSpaces, setPinnedSpaces] = useState<SpaceType[]>([]);
  
  // 最近使用した空間の状態
  const [recentSpaces, setRecentSpaces] = useState<SpaceType[]>([]);
  
  // コンテキストパスの状態
  const [contextPath, setContextPath] = useState<string[]>([]);
  
  // 履歴管理フックの使用
  const {
    historyState,
    currentItem,
    pushHistory,
    replaceHistory,
    goBack,
    goForward,
    getLastVisitedState,
    clearHistory,
    canGoBack,
    canGoForward
  } = useNavigationHistory();
  
  // コンテキスト遷移フックの使用
  const {
    transition,
    isTransitioning,
    navigateToSpace: performTransition,
    cancelTransition,
    getTransitionDirection,
    transitionDuration
  } = useContextTransition(
    viewMode, 
    layoutMode, 
    config.enableAnimations
  );
  
  // 現在のアクティブな空間タイプ
  const activeSpaceType = useMemo<SpaceType>(() => {
    return currentItem?.spaceType || config.defaultSpace;
  }, [currentItem, config.defaultSpace]);
  
  // 前の空間タイプ
  const previousSpaceType = useMemo<SpaceType | null>(() => {
    if (historyState.currentIndex <= 0) return null;
    return historyState.items[historyState.currentIndex - 1]?.spaceType || null;
  }, [historyState]);
  
  // ナビゲーション状態
  const navigationState = useMemo<NavigationState>(() => ({
    activeSpaceType,
    previousSpaceType,
    history: historyState.items,
    viewMode,
    layoutMode,
    isTransitioning,
    transitionDirection: getTransitionDirection(),
    contextPath,
    pinnedSpaces,
    recentSpaces
  }), [
    activeSpaceType,
    previousSpaceType, 
    historyState.items, 
    viewMode, 
    layoutMode, 
    isTransitioning,
    getTransitionDirection,
    contextPath,
    pinnedSpaces,
    recentSpaces
  ]);
  
  // 画面サイズの変更を監視してビューモードを更新
  useEffect(() => {
    const newViewMode = getViewModeFromDimensions(width);
    if (viewMode !== newViewMode) {
      setViewMode(newViewMode);
      
      // タブレットやデスクトップに変更された場合、適切なレイアウトモードに調整
      if (newViewMode !== 'mobile') {
        setLayoutMode(prev => 
          prev === 'stacked' && newViewMode === 'desktop' ? 'split' : prev
        );
      } else {
        // モバイルになった場合は常にスタック表示
        setLayoutMode('stacked');
      }
    }
  }, [width, viewMode]);
  
  // キーボードショートカットのイベントリスナー
  useEffect(() => {
    if (!config.enableKeyboardShortcuts || viewMode === 'mobile') return;
    
    const handleKeyDown = (event: KeyboardEvent) => {
      // Metaキー（MacのCommand）またはCtrlキーを押しながら
      if ((event.metaKey || event.ctrlKey) && !event.shiftKey && !event.altKey) {
        // 空間ショートカットをチェック
        const targetSpace = spacesData.find(space => 
          space.shortcut?.toLowerCase() === event.key.toLowerCase() && space.isVisible
        );
        
        if (targetSpace) {
          event.preventDefault();
          navigateToSpace(targetSpace.id);
        }
        
        // 戻る・進むナビゲーション
        if (event.key === '[' && canGoBack) {
          event.preventDefault();
          navigateBack();
        } else if (event.key === ']' && canGoForward) {
          event.preventDefault();
          navigateForward();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    config.enableKeyboardShortcuts, 
    viewMode, 
    spacesData, 
    canGoBack, 
    canGoForward
  ]);
  
  // 空間への遷移
  const navigateToSpace = useCallback((
    spaceType: SpaceType,
    options: {
      contextId?: string;
      state?: Record<string, any>;
      replace?: boolean;
      reset?: boolean;
      skipHistory?: boolean;
    } = {}
  ) => {
    const { contextId, state, replace = false, reset = false, skipHistory = false } = options;
    
    // 遷移タイプの決定
    const transitionType = reset ? 'reset' : (replace ? 'replace' : 'push');
    
    // コンテキスト遷移の実行
    performTransition(spaceType, {
      targetContextId: contextId,
      transitionType,
      payload: state
    });
    
    // 空間データの更新
    setSpacesData(prev => prev.map(space => ({
      ...space,
      isActive: space.id === spaceType
    })));
    
    // 履歴の更新（スキップが指定されていない場合）
    if (!skipHistory) {
      const historyItem = {
        spaceType,
        contextId,
        state,
        title: spacesData.find(s => s.id === spaceType)?.title
      };
      
      if (replace || reset) {
        replaceHistory(historyItem);
      } else {
        pushHistory(historyItem);
      }
    }
    
    // 最近使用した空間リストの更新
    setRecentSpaces(prev => {
      const filtered = prev.filter(s => s !== spaceType);
      return [spaceType, ...filtered].slice(0, 5);
    });
    
  }, [performTransition, spacesData, pushHistory, replaceHistory]);
  
  // ディープリンクによる遷移
  const navigateToDeepLink = useCallback((deepLink: DeepLink) => {
    navigateToSpace(deepLink.spaceType, {
      contextId: deepLink.contextId,
      state: deepLink.params ? { action: deepLink.action, ...deepLink.params } : undefined
    });
  }, [navigateToSpace]);
  
  // 履歴で前に戻る
  const navigateBack = useCallback(() => {
    if (!canGoBack) return;
    
    goBack();
    
    // 前の履歴アイテムを取得して空間を更新
    const previousItem = historyState.items[historyState.currentIndex - 1];
    if (previousItem) {
      performTransition(previousItem.spaceType, {
        targetContextId: previousItem.contextId,
        transitionType: 'reset',
        payload: previousItem.state
      });
      
      setSpacesData(prev => prev.map(space => ({
        ...space,
        isActive: space.id === previousItem.spaceType
      })));
    }
  }, [canGoBack, goBack, historyState, performTransition]);
  
  // 履歴で次に進む
  const navigateForward = useCallback(() => {
    if (!canGoForward) return;
    
    goForward();
    
    // 次の履歴アイテムを取得して空間を更新
    const nextItem = historyState.items[historyState.currentIndex + 1];
    if (nextItem) {
      performTransition(nextItem.spaceType, {
        targetContextId: nextItem.contextId,
        transitionType: 'push',
        payload: nextItem.state
      });
      
      setSpacesData(prev => prev.map(space => ({
        ...space,
        isActive: space.id === nextItem.spaceType
      })));
    }
  }, [canGoForward, goForward, historyState, performTransition]);
  
  // 最後に訪れた特定の空間に遷移
  const navigateToLastVisited = useCallback((spaceType: SpaceType) => {
    const lastVisited = getLastVisitedState(spaceType);
    if (lastVisited) {
      navigateToSpace(spaceType, {
        contextId: lastVisited.contextId,
        state: lastVisited.state
      });
    } else {
      // 履歴がない場合は新しく遷移
      navigateToSpace(spaceType);
    }
  }, [getLastVisitedState, navigateToSpace]);
  
  // レイアウトモードの切り替え
  const setLayout = useCallback((mode: LayoutMode) => {
    setLayoutMode(mode);
    
    // レイアウト設定を保存
    setConfig(prev => {
      const newConfig = { ...prev, layoutMode: mode };
      try {
        localStorage.setItem('nest_navigation_config', JSON.stringify(newConfig));
      } catch (error) {
        console.error('Failed to save layout mode:', error);
      }
      return newConfig;
    });
  }, []);
  
  // 空間のピン留め状態を切り替え
  const togglePinSpace = useCallback((spaceType: SpaceType) => {
    setPinnedSpaces(prev => {
      if (prev.includes(spaceType)) {
        return prev.filter(type => type !== spaceType);
      } else {
        return [...prev, spaceType];
      }
    });
  }, []);
  
  // コンテキストパスの設定
  const updateContextPath = useCallback((path: string[]) => {
    setContextPath(path);
  }, []);
  
  // バッジ数の更新
  const updateSpaceBadge = useCallback((spaceType: SpaceType, count: number | null) => {
    setSpacesData(prev => prev.map(space => 
      space.id === spaceType ? { ...space, badge: count } : space
    ));
  }, []);
  
  // 特定の空間が現在アクティブかどうか
  const isSpaceActive = useCallback((spaceType: SpaceType) => {
    return activeSpaceType === spaceType;
  }, [activeSpaceType]);
  
  // ナビゲーション設定の更新
  const updateNavigationConfig = useCallback((updates: Partial<NavigationConfig>) => {
    setConfig(prev => {
      const newConfig = { ...prev, ...updates };
      try {
        localStorage.setItem('nest_navigation_config', JSON.stringify(newConfig));
      } catch (error) {
        console.error('Failed to save navigation config:', error);
      }
      return newConfig;
    });
  }, []);
  
  return {
    navigationState,
    config,
    spacesData,
    transition,
    isTransitioning,
    transitionDuration,
    navigateToSpace,
    navigateToDeepLink,
    navigateBack,
    navigateForward,
    navigateToLastVisited,
    setLayout,
    togglePinSpace,
    updateContextPath,
    updateSpaceBadge,
    isSpaceActive,
    updateNavigationConfig,
    canGoBack,
    canGoForward
  };
}; 