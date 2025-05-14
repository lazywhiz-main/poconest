import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ChatRoom, UIChatRoom, ChatMessage, UIMessage } from '../types/chat';
import { useAuth } from './AuthContext';
import { useNest } from './NestContext';
import { MockChatService } from '../services/mockChatService';
import { Insight } from '../types/insight';
import { PocoAssistantService } from '../services/pocoAssistantService';

// チャットのコンテキスト型（本物のChatContextと同じインターフェイス）
interface ChatContextType {
  chatRooms: UIChatRoom[];
  messages: Record<string, UIMessage[]>;
  activeChatRoomId: string | null;
  isPocoTyping: boolean;
  conversationSummary: string;
  showSummary: boolean;
  loadingChatRooms: boolean;
  loadingMessages: boolean;
  error: string | null;
  isExtractingInsights: boolean;
  setActiveChatRoom: (chatRoomId: string) => void;
  sendMessage: (content: string, replyToId?: string) => Promise<UIMessage | null>;
  createChatRoom: (name: string, description?: string) => Promise<ChatRoom | null>;
  fetchMessages: (chatRoomId: string, limit?: number, before?: string) => Promise<UIMessage[]>;
  markMessagesAsRead: (chatRoomId: string, messageIds: string[]) => Promise<boolean>;
  extractInsightFromChat: (chatRoomId: string) => Promise<string[]>;
  extractAndSaveInsights: (chatRoomId: string) => Promise<void>;
  generateSummary: () => Promise<void>;
}

const MockChatContext = createContext<ChatContextType | undefined>(undefined);

export const MockChatProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, profile } = useAuth();
  const { currentNest } = useNest();
  
  const [chatService, setChatService] = useState<MockChatService | null>(null);
  const [chatRooms, setChatRooms] = useState<UIChatRoom[]>([]);
  const [messages, setMessages] = useState<Record<string, UIMessage[]>>({});
  const [activeChatRoomId, setActiveChatRoomId] = useState<string | null>(null);
  const [isPocoTyping, setIsPocoTyping] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [conversationSummary, setConversationSummary] = useState('');
  const [pocoAssistant, setPocoAssistant] = useState<PocoAssistantService | null>(null);
  const [isExtractingInsights, setIsExtractingInsights] = useState(false);
  const [loadingChatRooms, setLoadingChatRooms] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // モックチャットサービスの初期化
  useEffect(() => {
    if (user && profile && currentNest) {
      const service = new MockChatService(
        user.id,
        profile.display_name || user.email?.split('@')[0] || 'User',
        currentNest.id
      );
      setChatService(service);
      
      // チャットルームを取得
      const rooms = service.getChatRooms();
      setChatRooms(rooms);
      
      // アクティブチャットルーム設定
      if (rooms.length > 0) {
        setActiveChatRoomId(rooms[0].id);
        
        // 初期メッセージも取得
        const initialMessages = service.getMessages(rooms[0].id);
        setMessages({ [rooms[0].id]: initialMessages });
      }
      
      // Pocoアシスタントの初期化
      const assistant = new PocoAssistantService(user.id);
      setPocoAssistant(assistant);
    }
  }, [user, profile, currentNest]);
  
  // チャットルームの選択
  const handleSetActiveChatRoom = (chatRoomId: string) => {
    setActiveChatRoomId(chatRoomId);
    
    // メッセージが未取得の場合は取得
    if (!messages[chatRoomId] && chatService) {
      const roomMessages = chatService.getMessages(chatRoomId);
      setMessages(prev => ({
        ...prev,
        [chatRoomId]: roomMessages
      }));
    }
    
    // 未読カウントをリセット
    setChatRooms(prev => prev.map(room => 
      room.id === chatRoomId 
        ? { ...room, unreadCount: 0 }
        : room
    ));
  };
  
  // メッセージの送信
  const handleSendMessage = async (content: string, replyToId?: string): Promise<UIMessage | null> => {
    if (!content.trim() || !activeChatRoomId || !chatService) return null;
    
    try {
      // モックサービスでメッセージ送信
      const newMessage = chatService.sendMessage(activeChatRoomId, content, replyToId);
      
      // メッセージリストを更新
      setMessages(prev => ({
        ...prev,
        [activeChatRoomId]: [
          ...(prev[activeChatRoomId] || []),
          newMessage
        ]
      }));
      
      // チャットルームリストも更新
      setChatRooms(prev => prev.map(room => 
        room.id === activeChatRoomId
          ? {
              ...room,
              lastMessage: {
                content: newMessage.content,
                sender_id: newMessage.sender_id,
                sender_name: newMessage.sender.name,
                timestamp: newMessage.created_at,
                status: 'sent'
              }
            }
          : room
      ));
      
      return newMessage;
    } catch (err: any) {
      console.error('メッセージ送信エラー:', err.message);
      setError(err.message || 'メッセージの送信に失敗しました');
      return null;
    }
  };
  
  // チャットルーム作成
  const handleCreateChatRoom = async (name: string, description?: string): Promise<ChatRoom | null> => {
    if (!chatService) return null;
    
    try {
      // モックサービスでチャットルーム作成
      const newChatRoom = chatService.createChatRoom(name, description);
      
      // チャットルームリストを更新
      setChatRooms(prev => [...prev, newChatRoom]);
      
      return newChatRoom;
    } catch (err: any) {
      console.error('チャットルーム作成エラー:', err.message);
      setError(err.message || 'チャットルームの作成に失敗しました');
      return null;
    }
  };
  
  // メッセージ取得
  const handleFetchMessages = async (chatRoomId: string): Promise<UIMessage[]> => {
    if (!chatService) return [];
    
    try {
      setLoadingMessages(true);
      
      // モックサービスからメッセージ取得
      const roomMessages = chatService.getMessages(chatRoomId);
      
      // メッセージリストを更新
      setMessages(prev => ({
        ...prev,
        [chatRoomId]: roomMessages
      }));
      
      return roomMessages;
    } catch (err: any) {
      console.error('メッセージ取得エラー:', err.message);
      setError(err.message || 'メッセージの取得に失敗しました');
      return [];
    } finally {
      setLoadingMessages(false);
    }
  };
  
  // メッセージを既読に
  const handleMarkMessagesAsRead = async (chatRoomId: string, messageIds: string[]): Promise<boolean> => {
    if (!chatService) return false;
    
    try {
      // モックサービスで既読マーク
      chatService.markMessagesAsRead(chatRoomId, messageIds);
      
      return true;
    } catch (err) {
      console.error('既読マークエラー:', err);
      return false;
    }
  };
  
  // 会話からキーワード抽出
  const handleExtractInsightFromChat = async (chatRoomId: string): Promise<string[]> => {
    if (!pocoAssistant) return [];
    
    const chatMessages = messages[chatRoomId] || [];
    if (chatMessages.length === 0) return [];
    
    return pocoAssistant.extractKeywordsFromConversation(chatMessages);
  };
  
  // 会話から洞察を抽出してボードに保存
  const handleExtractAndSaveInsights = async (chatRoomId: string): Promise<void> => {
    if (!pocoAssistant || !chatService) return;
    
    try {
      setIsExtractingInsights(true);
      
      const chatMessages = messages[chatRoomId] || [];
      if (chatMessages.length === 0) return;
      
      // この実装ではボードへの保存はスキップ
      // 実際のアプリでは、ボードへの保存ロジックを実装
      
      // 成功メッセージを表示
      const successMessage: UIMessage = {
        id: Date.now().toString(),
        nest_id: currentNest?.id || '',
        chat_room_id: chatRoomId,
        sender_id: 'system',
        content: 'インサイトの抽出に成功しました（モック実装）',
        created_at: new Date().toISOString(),
        is_edited: false,
        has_pinned_to_board: false,
        sender: {
          id: 'system',
          name: 'システム',
          isBot: true
        },
        status: 'read',
        metadata: {
          isAutomatedMessage: true
        }
      };
      
      // メッセージリストを更新
      setMessages(prev => ({
        ...prev,
        [chatRoomId]: [
          ...(prev[chatRoomId] || []),
          successMessage
        ]
      }));
      
    } catch (error) {
      console.error('Error extracting insights:', error);
      
      // エラーメッセージを表示
      const errorMessage: UIMessage = {
        id: Date.now().toString(),
        nest_id: currentNest?.id || '',
        chat_room_id: chatRoomId,
        sender_id: 'system',
        content: 'インサイトの抽出に失敗しました',
        created_at: new Date().toISOString(),
        is_edited: false,
        has_pinned_to_board: false,
        sender: {
          id: 'system',
          name: 'システム',
          isBot: true
        },
        status: 'read',
        metadata: {
          isError: true
        }
      };
      
      // メッセージリストを更新
      setMessages(prev => ({
        ...prev,
        [chatRoomId]: [
          ...(prev[chatRoomId] || []),
          errorMessage
        ]
      }));
    } finally {
      setIsExtractingInsights(false);
    }
  };
  
  // 会話のサマリーを生成
  const handleGenerateSummary = async (): Promise<void> => {
    if (!pocoAssistant || !activeChatRoomId) return;
    
    try {
      setIsPocoTyping(true);
      
      const chatMessages = messages[activeChatRoomId] || [];
      if (chatMessages.length < 5) {
        // メッセージが少なすぎる場合
        setConversationSummary('会話の要約を生成するにはもう少しメッセージが必要です。');
      } else {
        // 会話の要約を生成
        setConversationSummary('これは会話のサマリーです（モック実装）。実際のアプリでは、AIが会話の要点をまとめます。');
      }
      
      // 要約の表示
      setShowSummary(true);
    } catch (error) {
      console.error('Error generating summary:', error);
      setConversationSummary('会話の要約を生成できませんでした。');
    } finally {
      setIsPocoTyping(false);
    }
  };
  
  return (
    <MockChatContext.Provider
      value={{
        chatRooms,
        messages,
        activeChatRoomId,
        isPocoTyping,
        conversationSummary,
        showSummary,
        loadingChatRooms,
        loadingMessages,
        error,
        isExtractingInsights,
        setActiveChatRoom: handleSetActiveChatRoom,
        sendMessage: handleSendMessage,
        createChatRoom: handleCreateChatRoom,
        fetchMessages: handleFetchMessages,
        markMessagesAsRead: handleMarkMessagesAsRead,
        extractInsightFromChat: handleExtractInsightFromChat,
        extractAndSaveInsights: handleExtractAndSaveInsights,
        generateSummary: handleGenerateSummary
      }}
    >
      {children}
    </MockChatContext.Provider>
  );
};

export const useMockChat = () => {
  const context = useContext(MockChatContext);
  if (context === undefined) {
    throw new Error('useMockChat must be used within a MockChatProvider');
  }
  return context;
}; 