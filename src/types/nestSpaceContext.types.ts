import { NestSpace, NestSpaceContainer, NestSpaceNavigationState, LayoutType, SpaceType, MemberPresence, NestSpaceView, SpaceRoleType, SpaceActionType } from './index'; // Assuming other types are in src/types/index.ts or similar

// Define action types
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

// State type
export interface NestSpaceState {
  container: NestSpaceContainer | null;
  spaces: Record<string, NestSpace>;
  navigation: NestSpaceNavigationState;
  currentUserRole: SpaceRoleType;
  isLoading: boolean;
  error: string | null;
}

// Action types
export type NestSpaceAction =
  | { type: NestSpaceActionType.SET_CONTAINER; payload: NestSpaceContainer }
  | { type: NestSpaceActionType.ADD_SPACE; payload: NestSpace }
  | { type: NestSpaceActionType.UPDATE_SPACE; payload: { id: string; updates: Partial<NestSpace> } }
  | { type: NestSpaceActionType.REMOVE_SPACE; payload: string }
  | { type: NestSpaceActionType.NAVIGATE_TO_SPACE; payload: string }
  | { type: NestSpaceActionType.GO_BACK; payload?: undefined }
  | { type: NestSpaceActionType.UPDATE_LAYOUT; payload: LayoutType }
  | { type: NestSpaceActionType.UPDATE_VIEW; payload: NestSpaceView }
  | { type: NestSpaceActionType.TOGGLE_SPLIT_VIEW; payload: { spaceId: string; secondarySpaceId?: string; isEnabled?: boolean; splitRatio?: number } }
  | { type: NestSpaceActionType.UPDATE_MEMBER_PRESENCE; payload: MemberPresence }
  | { type: NestSpaceActionType.SET_USER_ROLE; payload: SpaceRoleType }
  | { type: NestSpaceActionType.SET_LOADING; payload: boolean }
  | { type: NestSpaceActionType.SET_ERROR; payload: string | null };

// Context type
export interface NestSpaceContextType extends NestSpaceState {
  navigateToSpace: (spaceId: string) => void;
  goBack: () => void;
  addSpace: (space: NestSpace) => void;
  updateSpace: (id: string, updates: Partial<NestSpace>) => void;
  removeSpace: (id: string) => void;
  toggleSplitView: (params: { spaceId: string; secondarySpaceId?: string; isEnabled?: boolean; splitRatio?: number }) => void;
  updatePresence: (presence: MemberPresence) => void;
  canPerformAction: (action: SpaceActionType) => boolean;
  loadSpaceContainer: (containerId: string) => Promise<void>;
} 