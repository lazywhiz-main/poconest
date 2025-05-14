import { useState, useCallback, useEffect } from 'react';
import { 
  NavigationHistoryItem, 
  NavigationHistoryState 
} from '../types/navigation.types';
import { SpaceType } from '../../types/nestSpace.types';

// ローカルストレージキー
const HISTORY_STORAGE_KEY = 'nest_navigation_history';

// 最大履歴アイテム数
const MAX_HISTORY_ITEMS = 50;

/**
 * ナビゲーション履歴を管理するフック
 */
export const useNavigationHistory = () => {
  // 履歴の状態
  const [historyState, setHistoryState] = useState<NavigationHistoryState>({
    items: [],
    currentIndex: -1
  });

  // 初期化時に履歴をロード
  useEffect(() => {
    const loadHistory = () => {
      try {
        const storedHistory = localStorage.getItem(HISTORY_STORAGE_KEY);
        if (storedHistory) {
          const parsedHistory = JSON.parse(storedHistory) as NavigationHistoryState;
          setHistoryState(parsedHistory);
        }
      } catch (error) {
        console.error('Failed to load navigation history:', error);
      }
    };

    loadHistory();
  }, []);

  // 履歴が変更されたら保存
  useEffect(() => {
    if (historyState.items.length > 0) {
      try {
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(historyState));
      } catch (error) {
        console.error('Failed to save navigation history:', error);
      }
    }
  }, [historyState]);

  // 履歴に新しいアイテムを追加
  const pushHistory = useCallback((item: Omit<NavigationHistoryItem, 'timestamp'>) => {
    setHistoryState(prevState => {
      // 現在のインデックス以降のアイテムを削除
      const newItems = prevState.items.slice(0, prevState.currentIndex + 1);
      
      // 新しいアイテムを追加
      const newItem: NavigationHistoryItem = {
        ...item,
        timestamp: Date.now()
      };
      
      // アイテムを追加して最大数を超える場合は古いものを削除
      const updatedItems = [...newItems, newItem]
        .slice(-MAX_HISTORY_ITEMS);
      
      return {
        items: updatedItems,
        currentIndex: updatedItems.length - 1
      };
    });
  }, []);

  // 履歴を置き換え
  const replaceHistory = useCallback((item: Omit<NavigationHistoryItem, 'timestamp'>) => {
    setHistoryState(prevState => {
      if (prevState.currentIndex < 0) {
        // 履歴が空の場合は追加
        const newItem: NavigationHistoryItem = {
          ...item,
          timestamp: Date.now()
        };
        
        return {
          items: [newItem],
          currentIndex: 0
        };
      }
      
      // 現在の履歴を置き換え
      const newItems = [...prevState.items];
      newItems[prevState.currentIndex] = {
        ...item,
        timestamp: Date.now()
      };
      
      return {
        items: newItems,
        currentIndex: prevState.currentIndex
      };
    });
  }, []);

  // 前の履歴に戻る
  const goBack = useCallback(() => {
    setHistoryState(prevState => {
      if (prevState.currentIndex <= 0) {
        return prevState;
      }
      
      return {
        ...prevState,
        currentIndex: prevState.currentIndex - 1
      };
    });
  }, []);

  // 次の履歴に進む
  const goForward = useCallback(() => {
    setHistoryState(prevState => {
      if (prevState.currentIndex >= prevState.items.length - 1) {
        return prevState;
      }
      
      return {
        ...prevState,
        currentIndex: prevState.currentIndex + 1
      };
    });
  }, []);

  // 特定の空間タイプの最新の履歴を取得
  const getLastVisitedState = useCallback((spaceType: SpaceType): NavigationHistoryItem | null => {
    const items = historyState.items;
    for (let i = items.length - 1; i >= 0; i--) {
      if (items[i].spaceType === spaceType) {
        return items[i];
      }
    }
    return null;
  }, [historyState.items]);

  // 履歴をクリア
  const clearHistory = useCallback(() => {
    setHistoryState({
      items: [],
      currentIndex: -1
    });
    try {
      localStorage.removeItem(HISTORY_STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear navigation history:', error);
    }
  }, []);

  // 現在のアイテムを取得
  const currentItem = historyState.currentIndex >= 0 
    ? historyState.items[historyState.currentIndex] 
    : null;

  // 戻る・進むが可能かどうか
  const canGoBack = historyState.currentIndex > 0;
  const canGoForward = historyState.currentIndex < historyState.items.length - 1;

  return {
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
  };
}; 