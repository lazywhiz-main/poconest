import React, { createContext, useContext, useReducer, useEffect, useCallback, useMemo } from 'react';
import { Dimensions, Platform } from 'react-native';

// Import types from our type definitions
import {
  LayoutType,
  SpaceState,
  SpaceNavigationAction,
  MemberPresence,
  SpaceMetadata,
  SpacePersonalization,
  NestSpaceContextType,
  SpaceType,
  Nest
} from '../types/nestSpace.types';

// Import space-related components once implemented
// import { useNest } from '@features/nest/contexts/NestContext';
// import { useAuth } from '@contexts/AuthContext';

// Temporary mock for the Nest context (replace with actual implementation)
const mockNest: Nest = {
  id: 'mock-nest-id',
  name: 'Mock NEST',
  description: 'テスト用NEST',
  owner_id: 'user-1',
  color: '#3498db',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  space_ids: [],
  is_active: true
};

const mockUser = {
  id: 'user-1',
  displayName: 'テストユーザー'
};

// 初期空間定義
const defaultSpaces: SpaceMetadata[] = [
  {
    id: 'chat-space',
    type: SpaceType.CHAT,
    title: 'チャット',
    icon: 'chatbubbles-outline',
    color: '#3498db',
    badge: 0,
    hasUnread: false,
  },
  {
    id: 'board-space',
    type: SpaceType.BOARD,
    title: 'ボード',
    icon: 'grid-outline',
    color: '#2ecc71',
    badge: 0,
    hasUnread: false,
  },
  {
    id: 'meeting-space',
    type: SpaceType.MEETING,
    title: 'ミーティング',
    icon: 'videocam-outline',
    color: '#9b59b6',
    badge: 0,
    hasUnread: false,
  },
  {
    id: 'analysis-space',
    type: SpaceType.ANALYSIS,
    title: '分析',
    icon: 'bar-chart-outline',
    color: '#f39c12',
    badge: 0,
    hasUnread: false,
  }
];

// 画面サイズに基づいたレイアウトタイプを決定
const getInitialLayoutType = (): LayoutType => {
  if (Platform.OS !== 'web') {
    return LayoutType.MOBILE;
  }
  
  const { width } = Dimensions.get('window');
  if (width < 768) {
    return LayoutType.MOBILE;
  } else if (width < 1024) {
    return LayoutType.TABLET;
  } else {
    return LayoutType.DESKTOP;
  }
};

// 初期状態
const initialSpaceState: SpaceState = {
  activeSpaceType: SpaceType.CHAT,
  availableSpaces: defaultSpaces,
  layoutType: getInitialLayoutType(),
  sidebarOpen: getInitialLayoutType() !== LayoutType.MOBILE,
  loading: false,
  memberPresence: [],
  personalization: {
    theme: 'system',
    fontSize: 'medium',
    compactMode: false,
  },
};

// スペース状態リデューサー
const spaceReducer = (state: SpaceState, action: SpaceNavigationAction): SpaceState => {
  switch (action.type) {
    case 'NAVIGATE_TO_SPACE':
      return {
        ...state,
        activeSpaceType: action.payload,
        lastActiveSpace: {
          ...state.lastActiveSpace,
          [mockNest.id]: action.payload,
        },
      };
      
    case 'TOGGLE_SIDEBAR':
      return {
        ...state,
        sidebarOpen: !state.sidebarOpen,
      };
      
    case 'SET_LAYOUT_TYPE':
      return {
        ...state,
        layoutType: action.payload,
        // モバイルレイアウトの場合はサイドバーを閉じる
        sidebarOpen: action.payload !== LayoutType.MOBILE ? state.sidebarOpen : false,
      };
      
    case 'UPDATE_MEMBER_PRESENCE':
      const updatedPresence = [...state.memberPresence];
      const existingIndex = updatedPresence.findIndex(
        (member) => member.userId === action.payload.userId
      );
      
      if (existingIndex >= 0) {
        updatedPresence[existingIndex] = {
          ...updatedPresence[existingIndex],
          ...action.payload,
        };
      } else {
        updatedPresence.push(action.payload);
      }
      
      return {
        ...state,
        memberPresence: updatedPresence,
      };
      
    case 'UPDATE_PERSONALIZATION':
      return {
        ...state,
        personalization: {
          ...state.personalization,
          ...action.payload,
        },
      };
      
    case 'ENABLE_SPLIT_VIEW':
      return {
        ...state,
        splitView: {
          enabled: true,
          primarySpace: action.payload.primary,
          secondarySpace: action.payload.secondary,
          splitRatio: action.payload.ratio || 0.5,
        },
      };
      
    case 'DISABLE_SPLIT_VIEW':
      return {
        ...state,
        splitView: {
          enabled: false,
        },
      };
      
    case 'SET_SPLIT_RATIO':
      if (!state.splitView?.enabled) return state;
      
      return {
        ...state,
        splitView: {
          ...state.splitView,
          splitRatio: action.payload,
        },
      };
      
    default:
      return state;
  }
};

// コンテキストの作成
const NestSpaceContext = createContext<NestSpaceContextType | undefined>(undefined);

// --- 型定義のローカル化 ---
// export type SpaceNavigationAction =
//   | { type: 'NAVIGATE_TO_SPACE'; payload: SpaceType }
//   | { type: 'TOGGLE_SIDEBAR' }
//   | { type: 'SET_LAYOUT_TYPE'; payload: LayoutType }
//   | { type: 'UPDATE_MEMBER_PRESENCE'; payload: MemberPresence }
//   | { type: 'UPDATE_PERSONALIZATION'; payload: Partial<SpacePersonalization> }
//   | { type: 'ENABLE_SPLIT_VIEW'; payload: { primary: SpaceType; secondary: SpaceType; ratio?: number } }
//   | { type: 'DISABLE_SPLIT_VIEW' }
//   | { type: 'SET_SPLIT_RATIO'; payload: number };
// 
// export interface SpaceState {
//   activeSpaceType: SpaceType;
//   lastActiveSpace?: { [nestId: string]: SpaceType };
//   availableSpaces: SpaceMetadata[];
//   layoutType: LayoutType;
//   sidebarOpen: boolean;
//   loading: boolean;
//   memberPresence: MemberPresence[];
//   personalization: SpacePersonalization;
//   splitView?: {
//     enabled: boolean;
//     primarySpace?: SpaceType;
//     secondarySpace?: SpaceType;
//     splitRatio?: number;
//   };
// }
// 
// export interface NestSpaceContextType {
//   currentNest: any;
//   nestMembers: MemberPresence[];
//   spaceState: SpaceState;
//   dispatch: React.Dispatch<SpaceNavigationAction>;
//   navigateToSpace: (spaceType: SpaceType) => void;
//   toggleSidebar: () => void;
//   updatePresence: (presenceData: Partial<MemberPresence>) => void;
//   updatePersonalization: (settings: Partial<SpacePersonalization>) => void;
//   enableSplitView: (primary: SpaceType, secondary: SpaceType, ratio?: number) => void;
//   disableSplitView: () => void;
//   setSplitRatio: (ratio: number) => void;
//   isSpaceActive: (spaceType: SpaceType) => boolean;
//   getSpaceMetadata: (spaceType: SpaceType) => SpaceMetadata | undefined;
//   getMemberPresence: (userId: string) => MemberPresence | undefined;
// }
// 
// export interface MemberPresence {
//   userId: string;
//   displayName: string;
//   avatarUrl?: string;
//   online: boolean;
//   lastSeen?: number;
//   currentSpace?: SpaceType;
//   currentItemId?: string;
//   action?: 'viewing' | 'editing' | 'idle';
//   device?: 'mobile' | 'tablet' | 'desktop';
//   cursorPosition?: { x: number; y: number };
// }

/**
 * NEST空間プロバイダーコンポーネント
 */
export const NestSpaceProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // 実際の実装ではNESTコンテキストとAuthコンテキストを使用
  // const { currentNest, nestMembers } = useNest();
  // const { user } = useAuth();
  
  // 状態管理
  const [spaceState, dispatch] = useReducer(spaceReducer, initialSpaceState);
  
  // 画面サイズの変化を監視してレイアウトタイプを更新
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    
    const handleResize = () => {
      const { width } = Dimensions.get('window');
      let newLayoutType: LayoutType;
      
      if (width < 768) {
        newLayoutType = LayoutType.MOBILE;
      } else if (width < 1024) {
        newLayoutType = LayoutType.TABLET;
      } else {
        newLayoutType = LayoutType.DESKTOP;
      }
      
      if (newLayoutType !== spaceState.layoutType) {
        dispatch({ type: 'SET_LAYOUT_TYPE', payload: newLayoutType });
      }
    };
    
    // イベントリスナー登録
    window.addEventListener('resize', handleResize);
    
    // クリーンアップ
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [spaceState.layoutType]);
  
  // 自分のプレゼンス情報を更新し共有
  useEffect(() => {
    // Mock implementation - replace with actual Supabase/Firebase/etc. presence
    const myPresence: MemberPresence = {
      userId: mockUser.id,
      displayName: mockUser.displayName,
      online: true,
      currentSpace: spaceState.activeSpaceType,
      lastSeen: Date.now(),
      device: spaceState.layoutType === LayoutType.MOBILE 
        ? 'mobile' 
        : spaceState.layoutType === LayoutType.TABLET
          ? 'tablet'
          : 'desktop',
      action: 'viewing',
    };
    
    dispatch({ type: 'UPDATE_MEMBER_PRESENCE', payload: myPresence });
    
    // 実装時には以下のようなサブスクリプション処理を追加
    // const channel = supabase.channel(`nest-presence-${currentNest.id}`);
    // channel.subscribe(...)
    // return () => { channel.unsubscribe(); }
  }, [
    spaceState.activeSpaceType, 
    spaceState.layoutType
  ]);
  
  // 空間ナビゲーション
  const navigateToSpace = useCallback((spaceType: SpaceType) => {
    dispatch({ type: 'NAVIGATE_TO_SPACE', payload: spaceType });
  }, []);
  
  // サイドバー切り替え
  const toggleSidebar = useCallback(() => {
    dispatch({ type: 'TOGGLE_SIDEBAR' });
  }, []);
  
  // プレゼンス更新
  const updatePresence = useCallback((presenceData: Partial<MemberPresence>) => {
    dispatch({
      type: 'UPDATE_MEMBER_PRESENCE',
      payload: {
        userId: mockUser.id,
        displayName: mockUser.displayName,
        online: true,
        ...presenceData,
      },
    });
  }, []);
  
  // パーソナライゼーション設定更新
  const updatePersonalization = useCallback((settings: Partial<SpacePersonalization>) => {
    dispatch({ type: 'UPDATE_PERSONALIZATION', payload: settings });
    
    // 実際の実装では永続化する
    // localStorage.setItem('nestSpacePersonalization', JSON.stringify({
    //   ...spaceState.personalization,
    //   ...settings,
    // }));
  }, []);
  
  // スプリットビュー有効化
  const enableSplitView = useCallback((primary: SpaceType, secondary: SpaceType, ratio?: number) => {
    if (spaceState.layoutType === LayoutType.MOBILE) return; // モバイルでは非対応
    
    dispatch({
      type: 'ENABLE_SPLIT_VIEW',
      payload: { primary, secondary, ratio },
    });
  }, [spaceState.layoutType]);
  
  // スプリットビュー無効化
  const disableSplitView = useCallback(() => {
    dispatch({ type: 'DISABLE_SPLIT_VIEW' });
  }, []);
  
  // スプリット比率設定
  const setSplitRatio = useCallback((ratio: number) => {
    dispatch({ type: 'SET_SPLIT_RATIO', payload: Math.max(0.2, Math.min(0.8, ratio)) });
  }, []);
  
  // 空間がアクティブかどうかをチェック
  const isSpaceActive = useCallback((spaceType: SpaceType): boolean => {
    if (spaceState.splitView?.enabled) {
      return spaceType === spaceState.splitView.primarySpace ||
             spaceType === spaceState.splitView.secondarySpace;
    }
    
    return spaceType === spaceState.activeSpaceType;
  }, [
    spaceState.activeSpaceType,
    spaceState.splitView?.enabled,
    spaceState.splitView?.primarySpace,
    spaceState.splitView?.secondarySpace,
  ]);
  
  // 空間メタデータを取得
  const getSpaceMetadata = useCallback((spaceType: SpaceType): SpaceMetadata | undefined => {
    return spaceState.availableSpaces.find((space: SpaceMetadata) => space.type === spaceType);
  }, [spaceState.availableSpaces]);
  
  // メンバーのプレゼンス情報を取得
  const getMemberPresence = useCallback((userId: string): MemberPresence | undefined => {
    return spaceState.memberPresence.find((member: MemberPresence) => member.userId === userId);
  }, [spaceState.memberPresence]);
  
  // コンテキスト値
  const contextValue = useMemo(
    () => ({
      currentNest: mockNest,
      nestMembers: spaceState.memberPresence,
      spaceState,
      dispatch,
      navigateToSpace,
      toggleSidebar,
      updatePresence,
      updatePersonalization,
      enableSplitView,
      disableSplitView,
      setSplitRatio,
      isSpaceActive,
      getSpaceMetadata,
      getMemberPresence,
    }),
    [
      spaceState,
      navigateToSpace,
      toggleSidebar,
      updatePresence,
      updatePersonalization,
      enableSplitView,
      disableSplitView,
      setSplitRatio,
      isSpaceActive,
      getSpaceMetadata,
      getMemberPresence,
    ]
  );
  
  return (
    <NestSpaceContext.Provider value={contextValue}>
      {children}
    </NestSpaceContext.Provider>
  );
};

/**
 * NEST空間コンテキストを使用するためのカスタムフック
 */
export const useNestSpace = (): NestSpaceContextType => {
  const context = useContext(NestSpaceContext);
  
  if (context === undefined) {
    throw new Error('useNestSpace must be used within a NestSpaceProvider');
  }
  
  return context;
}; 