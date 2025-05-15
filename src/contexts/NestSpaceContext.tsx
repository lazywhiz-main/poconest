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
import { NestSpaceContextType } from '../types/nestSpaceContext.types';

const NestSpaceContext = createContext<NestSpaceContextType | undefined>(undefined);

export const NestSpaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  console.log('[NestSpaceProvider] Rendering with Stage 1 logic (reducer + initial state)');
  const [state, dispatch] = useReducer(nestSpaceReducer, initialState); // ★ Restore reducer and initial state
  const { user } = useAuth(); // Keep for now, might be needed by some basic state logic
  // const [isInitialized, setIsInitialized] = useState(false); // Keep commented for now

  // All complex useCallback functions (updatePresence, loadMockData, loadSpaceContainer, etc.) remain commented out or minimal
  const navigateToSpace = (spaceId: string) => console.log('navigateToSpace called with', spaceId);
  const goBack = () => console.log('goBack called');
  // Add other functions as minimal mocks if NestSpaceContextType requires them
  const addSpace = (space: any) => console.log('addSpace called with', space);
  const updateSpace = (id: string, updates: any) => console.log('updateSpace called', id, updates);
  const removeSpace = (id: string) => console.log('removeSpace called', id);
  const toggleSplitView = (params: any) => console.log('toggleSplitView called', params);
  const updatePresence = (presence: any) => console.log('updatePresence called', presence);
  const canPerformAction = (action: any): boolean => { console.log('canPerformAction called', action); return false; };
  const loadSpaceContainer = async (containerId: string): Promise<void> => { console.log('loadSpaceContainer called', containerId); };

  // useEffects remain commented out for now
  /*
  useEffect(() => { ... initializeSpaces ... }, []);
  useEffect(() => { ... handleDimensionsChange ... }, []);
  */

  // Provide a value that matches NestSpaceContextType as much as possible with mocks
  const contextValue: NestSpaceContextType = {
    ...state, // Spread the current state from useReducer
    navigateToSpace,
    goBack,
    addSpace,
    updateSpace,
    removeSpace,
    toggleSplitView,
    updatePresence,
    canPerformAction,
    loadSpaceContainer,
    // Ensure all properties of NestSpaceContextType are present, even if mocked
    // container: state.container, // already in ...state
    // spaces: state.spaces, // already in ...state
    // navigation: state.navigation, // already in ...state
    // currentUserRole: state.currentUserRole, // already in ...state
    // isLoading: state.isLoading, // already in ...state
    // error: state.error, // already in ...state
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