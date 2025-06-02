/**
 * チャット関連の型定義
 */

/**
 * チャットユーザーの型定義
 */
export interface ChatUser {
  id: string;
  name: string;
  isBot: boolean;
  avatarUrl?: string;
}

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
 * チャットメッセージの型定義
 */
export interface ChatMessage {
  id: string;
  chatId: string;
  content: string;
  sender: ChatUser;
  created_at: string;
  is_read: boolean;
}

/**
 * UI表示用のメッセージ型
 */
export interface UIMessage extends ChatMessage {
  pending?: boolean;
}

/**
 * スレッドの型定義
 */
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
  title?: string;
  isActive?: boolean;
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