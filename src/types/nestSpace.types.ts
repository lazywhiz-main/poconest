export enum SpaceType {
  CHAT = 'chat',
  BOARD = 'board',
  MEETING = 'meeting',
  ANALYSIS = 'analysis',
  USER_PROFILE = 'user_profile',
}

export enum LayoutType {
  MOBILE = 'mobile',
  TABLET = 'tablet',
  DESKTOP = 'desktop',
}

// 以下の型定義は src/features/nest-space/types/nestSpace.types.ts に移動済み
/*
export interface SpacePersonalization {
  userId: string;
  theme?: 'light' | 'dark' | 'system';
  backgroundColor?: string;
  fontPreference?: string;
  layoutPreference?: {
    [key in LayoutType]?: {
      isPinned?: boolean;
      position?: 'left' | 'right' | 'top' | 'bottom';
      size?: 'small' | 'medium' | 'large';
    };
  };
}

export interface MemberPresence {
  userId: string;
  userName: string;
  avatarUrl?: string;
  lastActive: Date;
  status: 'online' | 'away' | 'offline';
  currentSpaceId?: string;
}

export interface SpaceMetadata {
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
  viewCount: number;
  version: number;
}

export interface NestSpace {
  id: string;
  name: string;
  type: SpaceType;
  icon?: string;
  description?: string;
  parentId?: string;
  children?: string[];
  content?: any;
  metadata: SpaceMetadata;
  personalization?: SpacePersonalization[];
  members?: string[];
  activeMembers?: MemberPresence[];
}

export interface NestSpaceContainer {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  spaces: NestSpace[];
  members: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface NestSpaceView {
  spaceId: string;
  layout: LayoutType;
  isVisible: boolean;
  splitView?: {
    isEnabled: boolean;
    splitRatio: number;
    secondarySpaceId?: string;
  };
}

export interface NestSpaceNavigationState {
  activeSpaceId: string;
  history: string[];
  views: NestSpaceView[];
  currentLayout: LayoutType;
}

export interface Nest {
  id: string;
  name: string;
  description?: string;
  owner_id: string;
  members?: string[];
  is_active?: boolean;
  created_at: string;
  updated_at: string;
  color?: string;
  icon?: string;
  space_ids: string[];
}
*/ 