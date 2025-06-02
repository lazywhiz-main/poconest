import { Dimensions } from 'react-native';
import {
  // hasPermission // This seems to be used by canPerformAction, which might stay in context or be passed around
} from '../types'; // Assuming these are from a central types index

// Define action types (moved from NestSpaceContext)
export enum NestSpaceActionType {
  SET_CONTAINER = 'SET_CONTAINER',
  ADD_SPACE = 'ADD_SPACE',
  UPDATE_SPACE = 'UPDATE_SPACE',
  REMOVE_SPACE = 'REMOVE_SPACE',
  NAVIGATE_TO_SPACE = 'NAVIGATE_TO_SPACE',
  GO_BACK = 'GO_BACK',
  UPDATE_LAYOUT = 'UPDATE_LAYOUT',
  UPDATE_VIEW = 'UPDATE_VIEW',
  TOGGLE_SPLIT_VIEW = 'TOGGLE_SPLIT_VIEW',
  UPDATE_MEMBER_PRESENCE = 'UPDATE_MEMBER_PRESENCE',
  SET_USER_ROLE = 'SET_USER_ROLE',
  SET_LOADING = 'SET_LOADING',
  SET_ERROR = 'SET_ERROR',
}

// State type (moved from NestSpaceContext)
export interface NestSpaceState {
  container: any;
  spaces: Record<string, any>;
  navigation: any;
  currentUserRole: any;
  isLoading: boolean;
  error: string | null;
}

// Action types (moved from NestSpaceContext)
export type NestSpaceAction =
  | { type: NestSpaceActionType.SET_CONTAINER; payload: any }
  | { type: NestSpaceActionType.ADD_SPACE; payload: any }
  | { type: NestSpaceActionType.UPDATE_SPACE; payload: { id: string; updates: Partial<any> } }
  | { type: NestSpaceActionType.REMOVE_SPACE; payload: string }
  | { type: NestSpaceActionType.NAVIGATE_TO_SPACE; payload: string }
  | { type: NestSpaceActionType.GO_BACK; payload?: undefined }
  | { type: NestSpaceActionType.UPDATE_LAYOUT; payload: any }
  | { type: NestSpaceActionType.UPDATE_VIEW; payload: any }
  | { type: NestSpaceActionType.TOGGLE_SPLIT_VIEW; payload: { spaceId: string; secondarySpaceId?: string; isEnabled?: boolean; splitRatio?: number } }
  | { type: NestSpaceActionType.UPDATE_MEMBER_PRESENCE; payload: any }
  | { type: NestSpaceActionType.SET_USER_ROLE; payload: any }
  | { type: NestSpaceActionType.SET_LOADING; payload: boolean }
  | { type: NestSpaceActionType.SET_ERROR; payload: string | null };

// Helper function to determine layout based on screen width (moved from NestSpaceContext)
export const determineLayout = (): any => {
  const { width } = Dimensions.get('window');
  if (width < 768) return LayoutType.MOBILE;
  if (width < 1024) return LayoutType.TABLET;
  return LayoutType.DESKTOP;
};

// Initial state (moved from NestSpaceContext, uses types defined above)
export const initialNestSpaceState: NestSpaceState = {
  container: null,
  spaces: {},
  navigation: {
    activeSpaceId: '',
    history: [],
    views: [],
    currentLayout: determineLayout(),
  },
  currentUserRole: SpaceRoleType.GUEST,
  isLoading: false,
  error: null,
};

// Reducer function (moved from NestSpaceContext, uses types defined above)
export const nestSpaceReducer = (state: NestSpaceState, action: NestSpaceAction): NestSpaceState => {
  switch (action.type) {
    case NestSpaceActionType.SET_CONTAINER:
      return { ...state, container: action.payload, isLoading: false };
    case NestSpaceActionType.ADD_SPACE:
      return { ...state, spaces: { ...state.spaces, [action.payload.id]: action.payload } };
    case NestSpaceActionType.UPDATE_SPACE:
      return { ...state, spaces: { ...state.spaces, [action.payload.id]: { ...state.spaces[action.payload.id], ...action.payload.updates } } };
    case NestSpaceActionType.REMOVE_SPACE: {
      const { [action.payload]: removed, ...remainingSpaces } = state.spaces;
      return { ...state, spaces: remainingSpaces };
    }
    case NestSpaceActionType.NAVIGATE_TO_SPACE:
      return { ...state, navigation: { ...state.navigation, activeSpaceId: action.payload, history: [...state.navigation.history, action.payload] } };
    case NestSpaceActionType.GO_BACK: {
      if (state.navigation.history.length <= 1) return state;
      const newHistory = [...state.navigation.history];
      newHistory.pop();
      const previousSpaceId = newHistory[newHistory.length - 1];
      return { ...state, navigation: { ...state.navigation, activeSpaceId: previousSpaceId, history: newHistory } };
    }
    case NestSpaceActionType.UPDATE_LAYOUT:
      return { ...state, navigation: { ...state.navigation, currentLayout: action.payload } };
    case NestSpaceActionType.UPDATE_VIEW: {
      const viewIndex = state.navigation.views.findIndex(view => view.spaceId === action.payload.spaceId);
      const updatedViews = [...state.navigation.views];
      if (viewIndex >= 0) updatedViews[viewIndex] = action.payload; else updatedViews.push(action.payload);
      return { ...state, navigation: { ...state.navigation, views: updatedViews } };
    }
    case NestSpaceActionType.TOGGLE_SPLIT_VIEW: {
      const viewToUpdate = state.navigation.views.find(view => view.spaceId === action.payload.spaceId);
      if (!viewToUpdate) return state;
      const isEnabled = action.payload.isEnabled !== undefined ? action.payload.isEnabled : !viewToUpdate.splitView?.isEnabled;
      const updatedView: any = { ...viewToUpdate, splitView: { isEnabled, splitRatio: action.payload.splitRatio || 0.5, secondarySpaceId: action.payload.secondarySpaceId } };
      return { ...state, navigation: { ...state.navigation, views: state.navigation.views.map(view => view.spaceId === action.payload.spaceId ? updatedView : view) } };
    }
    case NestSpaceActionType.UPDATE_MEMBER_PRESENCE: {
      const updatedSpaces = { ...state.spaces };
      for (const spaceId in updatedSpaces) {
        const space = updatedSpaces[spaceId];
        const memberPresence = space.activeMembers || [];
        const memberIndex = memberPresence.findIndex(member => member.userId === action.payload.userId);
        if (memberIndex >= 0) {
          const updatedMembers = [...memberPresence];
          updatedMembers[memberIndex] = action.payload;
          updatedSpaces[spaceId] = { ...space, activeMembers: updatedMembers };
        } else if (space.members?.includes(action.payload.userId)) {
          updatedSpaces[spaceId] = { ...space, activeMembers: [...memberPresence, action.payload] };
        }
      }
      return { ...state, spaces: updatedSpaces };
    }
    case NestSpaceActionType.SET_USER_ROLE:
      return { ...state, currentUserRole: action.payload };
    case NestSpaceActionType.SET_LOADING:
      return { ...state, isLoading: action.payload };
    case NestSpaceActionType.SET_ERROR:
      return { ...state, error: action.payload, isLoading: false };
    default:
      return state;
  }
}; 