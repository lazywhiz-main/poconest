import { ChatUser } from './nestSpace.types';

export interface Message {
  id: string;
  text: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  timestamp: string;
  isSelf?: boolean;
}

export interface Channel {
  id: string;
  name: string;
  description?: string;
  isPublic?: boolean;
  members?: string[]; // user IDs
  lastActivity?: string;
  unreadCount?: number;
}

export interface ChatState {
  activeChannelId: string | null;
  channels: Channel[];
  messages: Record<string, Message[]>;
  users: Record<string, ChatUser>;
  currentUserId: string | null;
} 