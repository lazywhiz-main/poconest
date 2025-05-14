export enum SpaceType {
  CHAT = 'chat',
  BOARD = 'board',
  ZOOM = 'zoom',
  ANALYSIS = 'analysis',
  USER_PROFILE = 'user_profile',
}

export enum LayoutType {
  MOBILE = 'mobile',
  TABLET = 'tablet',
  DESKTOP = 'desktop',
}

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
  children?: string[]; // Array of child space IDs
  content?: any; // Content type will depend on the space type
  metadata: SpaceMetadata;
  personalization?: SpacePersonalization[];
  members?: string[]; // Array of member user IDs
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

// Nest（巣）の型定義
export interface Nest {
  id: string;
  name: string;
  description?: string;
  owner_id: string;                // サンプルデータに合わせて変更
  members?: string[];              // オプショナルに変更
  is_active?: boolean;             // 追加
  created_at: string;              // Date型からstringに変更
  updated_at: string;              // Date型からstringに変更
  color?: string;
  icon?: string;
  space_ids: string[];             // spaceIds -> space_idsに変更
} 