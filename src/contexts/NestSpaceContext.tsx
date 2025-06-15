import React, { createContext, useContext, useReducer, useEffect, useState, useCallback, useMemo } from 'react';
// import { Dimensions } from 'react-native'; // determineLayout is in utils
import { useAuth } from './AuthContext';
import { useNest } from '../features/nest/contexts/NestContext';
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
  const { currentNest } = useNest();
  const { user } = useAuth();
  
  // 最初に動作していたシンプルなreducer
  const simpleReducer = (state: any, action: any) => {
    switch (action.type) {
      case 'NAVIGATE_TO_SPACE':
        return { ...state, activeSpaceId: action.payload };
      case 'SET_LOADING':
        return { ...state, isLoading: action.payload };
      case 'TOGGLE_SIDEBAR':
        return { ...state, sidebarOpen: !state.sidebarOpen };
      case 'SET_AVAILABLE_SPACES':
        return { ...state, availableSpaces: action.payload };
      default:
        return state;
    }
  };
  
  const simpleInitialState = {
    activeSpaceId: 'chat',
    isLoading: false,
    sidebarOpen: false,
    availableSpaces: []
  };
  
  const [state, dispatch] = useReducer(simpleReducer, simpleInitialState);
  
  // 現在のNESTに紐づくspaceを読み込む
  useEffect(() => {
    const loadSpaces = async () => {
      if (!currentNest?.id) {
        dispatch({ type: 'SET_AVAILABLE_SPACES', payload: [] });
        return;
      }
      
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        
        const { data: spacesData, error } = await supabase
          .from('spaces')
          .select('*')
          .eq('nest_id', currentNest.id)
          .eq('is_active', true);
        
        if (error) throw error;
        
        // SpaceMetadata形式に変換
        const availableSpaces: SpaceMetadata[] = (spacesData || []).map(space => ({
          id: space.id,
          type: space.type as SpaceType,
          title: space.name,
          icon: space.icon || getDefaultSpaceIcon(space.type),
          color: getDefaultSpaceColor(space.type),
          badge: 0,
          hasUnread: false,
        }));
        
        dispatch({ type: 'SET_AVAILABLE_SPACES', payload: availableSpaces });
      } catch (error) {
        console.error('Failed to load spaces:', error);
        dispatch({ type: 'SET_AVAILABLE_SPACES', payload: [] });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };
    
    loadSpaces();
  }, [currentNest?.id]);
  
  // デフォルトのアイコンとカラーを取得するヘルパー関数
  const getDefaultSpaceIcon = (spaceType: string): string => {
    switch (spaceType) {
      case 'chat': return 'chatbubbles-outline';
      case 'board': return 'grid-outline';
      case 'meeting': return 'videocam-outline';
      case 'analysis': return 'bar-chart-outline';
      default: return 'apps-outline';
    }
  };
  
  const getDefaultSpaceColor = (spaceType: string): string => {
    switch (spaceType) {
      case 'chat': return '#3498db';
      case 'board': return '#2ecc71';
      case 'meeting': return '#9b59b6';
      case 'analysis': return '#f39c12';
      default: return '#95a5a6';
    }
  };
  
  // 関数をuseCallbackでメモ化
  const navigateToSpace = useCallback((spaceType: any) => {
    dispatch({ type: 'NAVIGATE_TO_SPACE', payload: spaceType });
  }, []);

  const toggleSidebar = useCallback(() => {
    dispatch({ type: 'TOGGLE_SIDEBAR' });
  }, []);

  const updatePresence = useCallback(() => {}, []);
  const updatePersonalization = useCallback(() => {}, []);
  const enableSplitView = useCallback(() => {}, []);
  const disableSplitView = useCallback(() => {}, []);
  const setSplitRatio = useCallback(() => {}, []);

  // 最初に動作していた実装
  const spaceState: SpaceState = useMemo(() => {
    return {
      activeSpaceType: state.activeSpaceId as SpaceType,
      availableSpaces: state.availableSpaces,
      layoutType: 'desktop' as LayoutType,
      sidebarOpen: state.sidebarOpen,
      loading: state.isLoading,
      memberPresence: [],
      personalization: {
        theme: 'system',
        fontSize: 'medium',
        compactMode: false,
      },
      splitView: undefined,
    };
  }, [state.activeSpaceId, state.isLoading, state.sidebarOpen, state.availableSpaces]);

  // ユーティリティ関数もuseCallbackでメモ化
  const isSpaceActive = useCallback((spaceType: any) => {
    if (spaceState.splitView?.enabled) {
      return (
        spaceType === spaceState.splitView.primarySpace ||
        spaceType === spaceState.splitView.secondarySpace
      );
    }
    return spaceType === spaceState.activeSpaceType;
  }, [spaceState]);

  const getSpaceMetadata = useCallback((spaceType: any) => {
    return spaceState.availableSpaces.find(space => space.type === spaceType);
  }, [spaceState]);

  const getMemberPresence = useCallback((userId: string) => {
    return spaceState.memberPresence.find(member => member.userId === userId);
  }, [spaceState]);

  const contextValue = useMemo(() => {
    // NestContext.NestをnestSpace.types.Nestに変換
    const convertedNest = currentNest ? {
      ...currentNest,
      status: 'active' as const,
      emoji: currentNest.icon,
      tags: [],
      space_ids: currentNest.space_ids || [],
    } : null;
    
    return {
      currentNest: convertedNest,
      nestMembers: [],
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
    };
  }, [currentNest, spaceState, navigateToSpace, toggleSidebar, updatePresence, updatePersonalization, enableSplitView, disableSplitView, setSplitRatio, isSpaceActive, getSpaceMetadata, getMemberPresence]);

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