import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fibhpcmpdduwtvnsxuhu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpYmhwY21wZGR1d3R2bnN4dWh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU4OTg4MDYsImV4cCI6MjA2MTQ3NDgwNn0.bnSHA0ee9mRbc4_suyDnPFE_CA_zezklHkWn70mnljE';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// チャットメッセージの型定義
export interface ChatMessage {
  id: string;
  content: string;
  sender_id: string;
  receiver_id: string;
  created_at: string;
  is_read: boolean;
}

// チャットルームの型定義
export interface ChatRoom {
  id: string;
  user1_id: string;
  user2_id: string;
  created_at: string;
  last_message: string;
  last_message_at: string;
} 