import React, { createContext, useContext, useReducer, useEffect, useState, useCallback } from 'react';
// import { Dimensions } from 'react-native'; // determineLayout is in utils
import { useAuth } from './AuthContext';
import {
  // NestSpace, // Types used by actions, keep if actions are being re-added
  // NestSpaceContainer, // For MOCK_CONTAINER, keep if re-adding
  // LayoutType, // For determineLayout (in utils)
  // SpaceType, // For MOCK_SPACES, keep if re-adding
  // MemberPresence, // For updatePresence, keep if re-adding
  // SpaceRoleType, // For MOCK_CONTAINER/initialState, keep if re-adding
  SpaceActionType,
  hasPermission // For canPerformAction, keep if re-adding
} from '../types'; 
// import { nestSpaceService } from '../services/NestSpaceService'; // Keep commented for now
import {
  // determineLayout, // Imported from utils
  initialNestSpaceState as initialState, // Use the one from utils
  nestSpaceReducer, // Use the one from utils
  NestSpaceActionType, 
  NestSpaceState, 
} from './nestSpaceUtils'; 
import { NestSpaceContextType, SpaceType, LayoutType, SpaceNavigationAction, SpaceState, MemberPresence, SpaceMetadata } from '../features/nest-space/types/nestSpace.types';
import { supabase } from '@services/supabase';

const NestSpaceContext = createContext<NestSpaceContextType | undefined>(undefined);

export const NestSpaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  console.log('[NestSpaceProvider] Rendering with Stage 1 logic (reducer + initial state)');
  const [state, dispatch] = useReducer(nestSpaceReducer, initialState);
  const { user } = useAuth();

  // --- 追加: spaces取得用state ---
  const [spaces, setSpaces] = useState<Record<string, any>>({});
  const [spacesLoading, setSpacesLoading] = useState(false);
  const [spacesError, setSpacesError] = useState<string | null>(null);

  // --- 追加: currentNestIdの取得（仮: localStorageから取得） ---
  const [currentNestId, setCurrentNestId] = useState<string | null>(null);
  useEffect(() => {
    const id = localStorage.getItem('currentNestId');
    setCurrentNestId(id);
  }, []);

  // --- 追加: currentNestの取得 ---
  const [currentNest, setCurrentNest] = useState<any>(null);
  useEffect(() => {
    if (!currentNestId) return;
    supabase
      .from('nests')
      .select('*')
      .eq('id', currentNestId)
      .single()
      .then(({ data, error }) => {
        if (!error && data) {
          setCurrentNest(data);
        } else {
          setCurrentNest(null);
        }
      });
  }, [currentNestId]);

  // --- 追加: spaces取得ロジック ---
  useEffect(() => {
    if (!currentNestId) return;
    setSpacesLoading(true);
    setSpacesError(null);
    supabase
      .from('spaces')
      .select('*')
      .eq('nest_id', currentNestId)
      .then(({ data, error }) => {
        if (error) {
          setSpacesError(error.message);
          setSpaces({});
        } else {
          // NestSpace型に変換し、Record<string, NestSpace>にまとめる
          const record: Record<string, any> = {};
          (data || []).forEach((s: any) => {
            record[s.id] = {
              id: s.id,
              name: s.name,
              type: s.type as SpaceType,
              icon: s.icon,
              description: s.description,
              content: {}, // TODO: 空間タイプごとに初期化
              metadata: {
                createdAt: new Date(s.created_at),
                createdBy: s.created_by || '',
                updatedAt: new Date(s.updated_at),
                updatedBy: s.updated_by || '',
                viewCount: 0,
                version: 1,
              },
              personalization: [],
              members: [],
              activeMembers: [],
            };
          });
          setSpaces(record);
        }
        setSpacesLoading(false);
      });
  }, [currentNestId]);

  // --- 今後の拡張設計コメント ---
  // 例: chat空間が作られた時は、chat_roomsテーブルに#generalルームを自動生成するなど
  // ここでspacesのtypeを見て、必要な初期データを各テーブルにinsertするロジックを追加予定

  // --- 既存のモック関数群 ---
  const navigateToSpace = (spaceId: string) => console.log('navigateToSpace called with', spaceId);
  const goBack = () => console.log('goBack called');
  const addSpace = (space: any) => console.log('addSpace called with', space);
  const updateSpace = (id: string, updates: any) => console.log('updateSpace called', id, updates);
  const removeSpace = (id: string) => console.log('removeSpace called', id);
  const toggleSplitView = (params: any) => console.log('toggleSplitView called', params);
  const updatePresence = (presence: any) => console.log('updatePresence called', presence);
  const canPerformAction = (action: any): boolean => { console.log('canPerformAction called', action); return false; };
  const loadSpaceContainer = async (containerId: string): Promise<void> => { console.log('loadSpaceContainer called', containerId); };

  // --- 必要なコールバックを追加 ---
  // availableSpacesをspaces stateから生成
  const availableSpaces = Object.values(spaces).map((s: any) => ({
    id: s.id,
    type: s.type,
    title: s.name,
    icon: s.icon,
    color: s.color || '#888',
    // 必要に応じて他のSpaceMetadataプロパティも追加
  }));

  const spaceState: SpaceState = {
    activeSpaceType: state.navigation.activeSpaceId as SpaceType,
    availableSpaces, // ←ここを修正
    layoutType: state.navigation.currentLayout as LayoutType,
    sidebarOpen: false, // TODO: 必要に応じてstateから取得
    loading: state.isLoading,
    memberPresence: [], // TODO: 必要に応じてstateから取得
    personalization: {}, // TODO: 必要に応じてstateから取得
    splitView: undefined, // TODO: 必要に応じてstateから取得
  };
  // const spaceState: SpaceState = {
  //   activeSpaceType: state.navigation.activeSpaceId as SpaceType,
  //   availableSpaces: [], // TODO: 必要に応じてstateから取得
  //   layoutType: state.navigation.currentLayout as LayoutType,
  //   sidebarOpen: false, // TODO: 必要に応じてstateから取得
  //   loading: state.isLoading,
  //   memberPresence: [], // TODO: 必要に応じてstateから取得
  //   personalization: {}, // TODO: 必要に応じてstateから取得
  //   splitView: undefined, // TODO: 必要に応じてstateから取得
  // };
  const dispatchAction = dispatch as React.Dispatch<SpaceNavigationAction>;

  const toggleSidebar = useCallback(() => {
    dispatchAction({ type: 'TOGGLE_SIDEBAR' });
  }, [dispatchAction]);

  const updatePersonalization = useCallback((settings: Partial<any>) => {
    dispatchAction({ type: 'UPDATE_PERSONALIZATION', payload: settings });
  }, [dispatchAction]);

  const enableSplitView = useCallback((primary: SpaceType, secondary: SpaceType, ratio?: number) => {
    dispatchAction({ type: 'ENABLE_SPLIT_VIEW', payload: { primary, secondary, ratio } });
  }, [dispatchAction]);

  const disableSplitView = useCallback(() => {
    dispatchAction({ type: 'DISABLE_SPLIT_VIEW' });
  }, [dispatchAction]);

  const setSplitRatio = useCallback((ratio: number) => {
    dispatchAction({ type: 'SET_SPLIT_RATIO', payload: ratio });
  }, [dispatchAction]);

  const isSpaceActive = useCallback((spaceType: SpaceType): boolean => {
    if (spaceState.splitView?.enabled) {
      return (
        spaceType === spaceState.splitView.primarySpace ||
        spaceType === spaceState.splitView.secondarySpace
      );
    }
    return spaceType === spaceState.activeSpaceType;
  }, [spaceState]);

  const getSpaceMetadata = useCallback((spaceType: SpaceType): SpaceMetadata | undefined => {
    return spaceState.availableSpaces.find(space => space.type === spaceType);
  }, [spaceState.availableSpaces]);

  const getMemberPresence = useCallback((userId: string): MemberPresence | undefined => {
    return spaceState.memberPresence.find(member => member.userId === userId);
  }, [spaceState.memberPresence]);

  const contextValue: NestSpaceContextType = {
    currentNest,
    nestMembers: spaceState.memberPresence,
    spaceState,
    dispatch: dispatchAction,
    navigateToSpace: (spaceType) => dispatchAction({ type: 'NAVIGATE_TO_SPACE', payload: spaceType }),
    toggleSidebar,
    updatePresence: (presenceData) => dispatchAction({ type: 'UPDATE_MEMBER_PRESENCE', payload: presenceData as MemberPresence }),
    updatePersonalization,
    enableSplitView,
    disableSplitView,
    setSplitRatio,
    isSpaceActive,
    getSpaceMetadata,
    getMemberPresence,
  };

  return (
    <NestSpaceContext.Provider value={contextValue}>
      {children}
    </NestSpaceContext.Provider>
  );
};

export const useNestSpace = (): NestSpaceContextType => {
  const context = useContext(NestSpaceContext);
  if (context === undefined) {
    throw new Error('useNestSpace must be used within a NestSpaceProvider (Stage 1)');
  }
  return context;
};

// All other imports like useAuth, nestSpaceService, nestSpaceUtils are removed as their logic is not used.
// All other functions like loadMockData, loadSpaceContainer, useEffects are removed.

// NestSpaceContext is now file-local again, defined before Provider
// const NestSpaceContext = createContext<NestSpaceContextType | undefined>(undefined);

// export const NestSpaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
//   const [state, dispatch] = useReducer(nestSpaceReducer, initialState);
//   const { user } = useAuth();
//   const [isInitialized, setIsInitialized] = useState(false);

//   const updatePresence = useCallback((presence: MemberPresence) => {
//     dispatch({ type: NestSpaceActionType.UPDATE_MEMBER_PRESENCE, payload: presence });
//     if (user) {
//       nestSpaceService.updateUserPresence(presence).catch((error) => {
//         console.error('Failed to update presence in realtime:', error);
//       });
//     }
//   }, [user]);

//   const loadMockData = useCallback(() => {
//     const MOCK_CONTAINER: NestSpaceContainer = {
//       id: 'container-1',
//       name: 'ポコの巣',
//       description: 'Shared workspace for Poko',
//       ownerId: user?.id || 'user-1',
//       spaces: [],
//       members: [user?.id || 'user-1', 'user-2'],
//       createdAt: new Date(),
//       updatedAt: new Date(),
//     };

//     const MOCK_SPACES: NestSpace[] = [
//       {
//         id: SpaceType.CHAT,
//         name: 'Chat',
//         type: SpaceType.CHAT,
//         icon: 'message',
//         description: 'Chat space for communication',
//         content: { messages: [] },
//         metadata: {
//           createdAt: new Date(),
//           createdBy: user?.id || 'user-1',
//           updatedAt: new Date(),
//           updatedBy: user?.id || 'user-1',
//           viewCount: 0,
//           version: 1,
//         },
//         members: [user?.id || 'user-1'],
//         activeMembers: [],
//       },
//       {
//         id: SpaceType.BOARD,
//         name: 'Board',
//         type: SpaceType.BOARD,
//         icon: 'grid',
//         description: 'Kanban board for tasks',
//         content: { columns: [], cards: [] },
//         metadata: {
//           createdAt: new Date(),
//           createdBy: user?.id || 'user-1',
//           updatedAt: new Date(),
//           updatedBy: user?.id || 'user-1',
//           viewCount: 0,
//           version: 1,
//         },
//         members: [user?.id || 'user-1'],
//         activeMembers: [],
//       },
//       {
//         id: SpaceType.ZOOM,
//         name: 'Zoom',
//         type: SpaceType.ZOOM,
//         icon: 'video',
//         description: 'Zoom integration for meetings',
//         content: { meetings: [] },
//         metadata: {
//           createdAt: new Date(),
//           createdBy: user?.id || 'user-1',
//           updatedAt: new Date(),
//           updatedBy: user?.id || 'user-1',
//           viewCount: 0,
//           version: 1,
//         },
//         members: [user?.id || 'user-1'],
//         activeMembers: [],
//       },
//       {
//         id: SpaceType.ANALYSIS,
//         name: 'Analysis',
//         type: SpaceType.ANALYSIS,
//         icon: 'analytics',
//         description: 'Data analysis and insights',
//         content: { insights: [] },
//         metadata: {
//           createdAt: new Date(),
//           createdBy: user?.id || 'user-1',
//           updatedAt: new Date(),
//           updatedBy: user?.id || 'user-1',
//           viewCount: 0,
//           version: 1,
//         },
//         members: [user?.id || 'user-1'],
//         activeMembers: [],
//       },
//     ];

//     dispatch({ type: NestSpaceActionType.SET_CONTAINER, payload: MOCK_CONTAINER });
//     
//     MOCK_SPACES.forEach((space) => {
//       dispatch({ type: NestSpaceActionType.ADD_SPACE, payload: space });
//     });
//     
//     if (MOCK_SPACES.length > 0) {
//       dispatch({ type: NestSpaceActionType.NAVIGATE_TO_SPACE, payload: MOCK_SPACES[0].id });
//       
//       MOCK_SPACES.forEach((space) => {
//         dispatch({
//           type: NestSpaceActionType.UPDATE_VIEW,
//           payload: {
//             spaceId: space.id,
//             layout: state.navigation.currentLayout,
//             isVisible: true,
//           },
//         });
//       });
//     }
//     
//     if (MOCK_CONTAINER.ownerId === user?.id) {
//       dispatch({ type: NestSpaceActionType.SET_USER_ROLE, payload: SpaceRoleType.OWNER });
//     } else if (MOCK_CONTAINER.members.includes(user?.id || '')) {
//       dispatch({ type: NestSpaceActionType.SET_USER_ROLE, payload: SpaceRoleType.MEMBER });
//     }
//     
//     if (user && MOCK_SPACES.length > 0) {
//       updatePresence({
//         userId: user.id,
//         userName: user.user_metadata?.name || 'Anonymous',
//         avatarUrl: user.user_metadata?.avatar_url,
//         lastActive: new Date(),
//         status: 'online',
//         currentSpaceId: MOCK_SPACES[0].id,
//       });
//     }
//     
//     setIsInitialized(true);
//     dispatch({ type: NestSpaceActionType.SET_LOADING, payload: false });
//   }, [user, state.navigation.currentLayout, updatePresence]);

//   const loadSpaceContainer = useCallback(async (containerId: string): Promise<void> => {
//     try {
//       dispatch({ type: NestSpaceActionType.SET_LOADING, payload: true });
//       
//       if (!user) {
//         throw new Error('User not authenticated');
//       }
//       
//       const container = await nestSpaceService.getContainerDetails(containerId);
//       
//       dispatch({ type: NestSpaceActionType.SET_CONTAINER, payload: container });
//       
//       let spaces = container.spaces;
//       if (spaces.length === 0) {
//         spaces = await nestSpaceService.getOrCreateDefaultSpaces(containerId, user.id);
//       }
//       
//       spaces.forEach(space => {
//         dispatch({ type: NestSpaceActionType.ADD_SPACE, payload: space });
//         dispatch({
//           type: NestSpaceActionType.UPDATE_VIEW,
//           payload: {
//             spaceId: space.id,
//             layout: state.navigation.currentLayout,
//             isVisible: true,
//           },
//         });
//       });
//       
//       if (spaces.length > 0) {
//         const chatSpace = spaces.find(space => space.type === SpaceType.CHAT);
//         const firstSpace = chatSpace || spaces[0];
//         
//         dispatch({ type: NestSpaceActionType.NAVIGATE_TO_SPACE, payload: firstSpace.id });
//       }
//       
//       if (container.ownerId === user.id) {
//         dispatch({ type: NestSpaceActionType.SET_USER_ROLE, payload: SpaceRoleType.OWNER });
//       } else if (container.members.includes(user.id)) {
//         dispatch({ type: NestSpaceActionType.SET_USER_ROLE, payload: SpaceRoleType.MEMBER });
//       }
//       
//       dispatch({ type: NestSpaceActionType.SET_LOADING, payload: false });
//     } catch (error) {
//       console.error('Error loading space container:', error);
//       dispatch({ 
//         type: NestSpaceActionType.SET_ERROR, 
//         payload: error instanceof Error ? error.message : 'Failed to load workspace' 
//       });
//       
//       loadMockData();
//     }
//   }, [user, state.navigation.currentLayout, loadMockData]);

//   useEffect(() => {
//     const initializeSpaces = async () => {
//       if (user && !isInitialized) {
//         dispatch({ type: NestSpaceActionType.SET_LOADING, payload: true });
//         
//         try {
//           const containers = await nestSpaceService.getUserContainers(user.id);
//           
//           if (containers.length === 0) {
//             console.warn('No containers found for user, using mock data');
//             loadMockData();
//             return;
//           }
//           
//           const containerId = containers[0].id;
//           
//           await loadSpaceContainer(containerId);
//           
//           setIsInitialized(true);
//         } catch (error) {
//           console.error('Error initializing nest spaces:', error);
//           dispatch({ 
//             type: NestSpaceActionType.SET_ERROR, 
//             payload: error instanceof Error ? error.message : 'Unknown error' 
//           });
//           
//           loadMockData();
//         }
//       }
//     };
//     
//     initializeSpaces();
//   }, [user, isInitialized, loadMockData, loadSpaceContainer]);

//   useEffect(() => {
//     const handleDimensionsChange = () => {
//       const newLayout = determineLayout();
//       if (newLayout !== state.navigation.currentLayout) {
//         dispatch({ type: NestSpaceActionType.UPDATE_LAYOUT, payload: newLayout });
//       }
//     };

//     const dimensionsListener = Dimensions.addEventListener('change', handleDimensionsChange);

//     return () => {
//       dimensionsListener?.remove();
//     };
//   }, [state.navigation.currentLayout]);

//   const navigateToSpace = useCallback((spaceId: string) => {
//     dispatch({ type: NestSpaceActionType.NAVIGATE_TO_SPACE, payload: spaceId });
//     
//     if (user) {
//       updatePresence({
//         userId: user.id,
//         userName: user.user_metadata?.name || 'Anonymous',
//         avatarUrl: user.user_metadata?.avatar_url,
//         lastActive: new Date(),
//         status: 'online',
//         currentSpaceId: spaceId,
//       });
//     }
//   }, [user, updatePresence]);

//   const goBack = useCallback(() => dispatch({ type: NestSpaceActionType.GO_BACK }), []);
//   const addSpace = useCallback((space: NestSpace) => dispatch({ type: NestSpaceActionType.ADD_SPACE, payload: space }), []);
//   const updateSpace = useCallback((id: string, updates: Partial<NestSpace>) => dispatch({ type: NestSpaceActionType.UPDATE_SPACE, payload: { id, updates } }), []);
//   const removeSpace = useCallback((id: string) => dispatch({ type: NestSpaceActionType.REMOVE_SPACE, payload: id }), []);
//   const toggleSplitView = useCallback((params: { spaceId: string; secondarySpaceId?: string; isEnabled?: boolean; splitRatio?: number }) => dispatch({ type: NestSpaceActionType.TOGGLE_SPLIT_VIEW, payload: params as any }), []);
//   const canPerformAction = useCallback((action: SpaceActionType): boolean => hasPermission(state.currentUserRole, action), [state.currentUserRole]);

//   const contextValue: NestSpaceContextType = {
//     ...state,
//     navigateToSpace,
//     goBack,
//     addSpace,
//     updateSpace,
//     removeSpace,
//     toggleSplitView,
//     updatePresence,
//     canPerformAction,
//     loadSpaceContainer,
//   };

//   return (
//     <NestSpaceContext.Provider value={contextValue}>
//       {children}
//     </NestSpaceContext.Provider>
//   );
// };

// Re-introduce and export a simple useNestSpace hook
// export const useNestSpace = (): NestSpaceContextType => {
//   const context = useContext(NestSpaceContext);
//   if (context === undefined) {
//     throw new Error('useNestSpace must be used within a NestSpaceProvider');
//   }
//   return context;
// }; 