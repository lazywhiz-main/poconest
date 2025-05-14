// User types
export interface User {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  created_at: string;
}

// Chat types
export interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  is_read: boolean;
  attachments?: Attachment[];
}

export interface Attachment {
  id: string;
  file_url: string;
  file_name: string;
  file_type: string;
  file_size: number;
  message_id: string;
}

// Board types
export interface BoardColumn {
  id: string;
  title: string;
  order: number;
}

export interface BoardCard {
  id: string;
  title: string;
  content?: string;
  column_id: string;
  order: number;
  created_at: string;
  updated_at: string;
  labels?: string[];
  color?: string;
}

// Zoom types
export interface ZoomMeeting {
  id: string;
  topic: string;
  start_time: string;
  duration: number;
  join_url: string;
  password?: string;
  recording_url?: string;
}

// Theme types
export type ThemeMode = 'light' | 'dark' | 'system';

export interface Theme {
  mode: ThemeMode;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    card: string;
    text: string;
    border: string;
    error: string;
    success: string;
  };
}

// Nest Space types
export * from './nestSpace.types';
export * from './spacePermission.types'; 