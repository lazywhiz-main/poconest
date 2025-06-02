export enum SpaceType {
  CHAT = 'chat',
  BOARD = 'board',
  MEETING = 'meeting',
  ANALYSIS = 'analysis',
  USER_PROFILE = 'user_profile',
  ZOOM = 'zoom',
  SETTINGS = 'settings',
  INSIGHTS = 'insights',
}

export enum LayoutType {
  MOBILE = 'mobile',
  TABLET = 'tablet',
  DESKTOP = 'desktop',
}

export interface Thread {
  id: string;
  parentMessageId: string;
  roomId: string;
  participants: string[];
  lastMessage?: UIMessage;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
  messages: UIMessage[];
  title: string;
  isActive: boolean;
}

export interface ChatUser {
  id: string;
  name: string;
  isBot: boolean;
  avatarUrl?: string;
}

export interface ChatMessage {
  id: string;
  chatId: string;
  content: string;
  sender: ChatUser;
  created_at: string;
  is_read: boolean;
}

export interface UIMessage extends ChatMessage {
  pending?: boolean;
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