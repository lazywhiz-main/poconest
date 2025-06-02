export type { UIMessage, Thread, ChatUser, ChatMessage } from 'src/types/nestSpace.types';
import type { UIMessage, Thread } from 'src/types/nestSpace.types';
import { SpaceType, Nest } from 'src/types/nestSpace.types';

/**
 * チャットルームの型定義
 */
export interface ChatRoom {
  id: string;
  name: string;
  description?: string;
  lastMessage?: UIMessage;
  lastActivity: string;
  unreadCount: number;
  spaceId?: string;
  nestId?: string;
}

/**
 * メッセージ入力状態
 */
export interface MessageInputState {
  content: string;
  isTyping: boolean;
  attachments: {
    type: 'image' | 'file';
    url?: string;
    file?: File;
    preview?: string;
  }[];
}

/**
 * チャットルームの状態
 */
export interface ChatRoomState {
  activeRoomId: string | null;
  rooms: ChatRoom[];
  messages: Record<string, UIMessage[]>;
  threads: Record<string, Thread>;
  loading: boolean;
  error: string | null;
  inputState: MessageInputState;
} 