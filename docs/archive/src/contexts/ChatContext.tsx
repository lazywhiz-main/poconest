import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { ChatRoom, UIChatRoom, ChatMessage, UIMessage, CreateMessageData } from '../types/chat';
import { useAuth } from './AuthContext';
import { useNest } from './NestContext';
import { supabase } from '../lib/supabase';
import { useBoard } from './BoardContext';
import { Insight } from '../types/insight';
import { PocoAssistantService } from '../services/pocoAssistantService';

// チャットのコンテキスト型
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

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, profile } = useAuth();
  const { currentNest, nestMembers } = useNest();
  const { saveInsightToBoard } = useBoard();
  
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
  
  // Pocoアシスタントサービスの初期化
  useEffect(() => {
    if (user) {
      const assistant = new PocoAssistantService(user.id);
      setPocoAssistant(assistant);
    }
  }, [user]);

  // チャットルームのサブスクリプション
  useEffect(() => {
    if (!currentNest) return;

    // チャットルームの変更を監視
    const subscription = supabase
      .channel(`chat_rooms:${currentNest.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'chat_rooms',
        filter: `nest_id=eq.${currentNest.id}`
      }, async (payload) => {
        console.log('チャットルーム変更:', payload);
        await fetchChatRooms();
      })
      .subscribe();

    // 初期データの取得
    fetchChatRooms();

    return () => {
      subscription.unsubscribe();
    };
  }, [currentNest]);

  // アクティブチャットルームのメッセージサブスクリプション
  useEffect(() => {
    if (!activeChatRoomId) return;

    // すでにメッセージが読み込まれていなければ取得
    if (!messages[activeChatRoomId]) {
      fetchMessages(activeChatRoomId);
    }

    // メッセージの変更を監視
    const subscription = supabase
      .channel(`messages:${activeChatRoomId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'messages',
        filter: `chat_room_id=eq.${activeChatRoomId}`
      }, async (payload) => {
        console.log('メッセージ変更:', payload);
        
        if (payload.eventType === 'INSERT') {
          const newMessage = payload.new as ChatMessage;
          await handleNewMessage(newMessage);
        } else if (payload.eventType === 'UPDATE') {
          const updatedMessage = payload.new as ChatMessage;
          await handleUpdatedMessage(updatedMessage);
        } else if (payload.eventType === 'DELETE') {
          const deletedMessageId = payload.old.id;
          handleDeletedMessage(deletedMessageId);
        }
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [activeChatRoomId]);

  // チャットルーム一覧を取得
  const fetchChatRooms = async () => {
    if (!currentNest || !user) return;

    try {
      setLoadingChatRooms(true);
      setError(null);

      // チャットルーム一覧を取得
      const { data: chatRoomsData, error: chatRoomsError } = await supabase
        .from('chat_rooms')
        .select('*')
        .eq('nest_id', currentNest.id)
        .eq('is_archived', false)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: true });

      if (chatRoomsError) {
        throw chatRoomsError;
      }

      if (!chatRoomsData || chatRoomsData.length === 0) {
        // チャットルームがない場合はデフォルトのGeneral作成
        await createDefaultChatRoom();
        return;
      }

      // 最新のメッセージを取得
      const chatRoomsWithLastMessage: UIChatRoom[] = await Promise.all(
        (chatRoomsData as ChatRoom[]).map(async (room) => {
          // 最新メッセージを取得
          const { data: lastMessageData } = await supabase
            .from('messages')
            .select('id, content, sender_id, created_at')
            .eq('chat_room_id', room.id)
            .order('created_at', { ascending: false })
            .limit(1);

          // 未読メッセージ数を取得
          const { data: unreadData, error: unreadError } = await supabase
            .from('messages')
            .select('id')
            .eq('chat_room_id', room.id)
            .not('read_by', 'cs', `{"${user.id}"}`);

          // 送信者の名前を取得
          let senderName = "";
          if (lastMessageData && lastMessageData.length > 0) {
            const sender = nestMembers.find(m => m.user_id === lastMessageData[0].sender_id);
            senderName = sender?.users?.display_name || "Unknown";
          }

          return {
            ...room,
            participants: nestMembers.map(m => ({
              id: m.user_id,
              name: m.users?.display_name || '',
              avatar: m.users?.avatar_url,
              isOnline: false // オンライン状態は別途管理
            })),
            lastMessage: lastMessageData && lastMessageData.length > 0 ? {
              content: lastMessageData[0].content,
              sender_id: lastMessageData[0].sender_id,
              sender_name: senderName,
              timestamp: lastMessageData[0].created_at,
              status: 'read' // デフォルト
            } : undefined,
            unreadCount: unreadError ? 0 : (unreadData?.length || 0)
          };
        })
      );

      setChatRooms(chatRoomsWithLastMessage);

      // アクティブなチャットルームがない場合は最初のものを選択
      if (!activeChatRoomId && chatRoomsWithLastMessage.length > 0) {
        setActiveChatRoomId(chatRoomsWithLastMessage[0].id);
      }

    } catch (err: any) {
      console.error('チャットルーム取得エラー:', err.message);
      setError(err.message || 'チャットルームの取得に失敗しました');
    } finally {
      setLoadingChatRooms(false);
    }
  };

  // デフォルトのチャットルーム作成
  const createDefaultChatRoom = async () => {
    if (!currentNest || !user) return;

    try {
      // General チャットルームを作成
      const result = await createChatRoom('General', 'メインチャットルーム');
      
      if (result) {
        console.log('デフォルトチャットルーム作成完了:', result);
      }
    } catch (err) {
      console.error('デフォルトチャットルーム作成エラー:', err);
    }
  };

  // チャットルーム作成
  const createChatRoom = async (name: string, description?: string): Promise<ChatRoom | null> => {
    if (!currentNest || !user) return null;

    try {
      setError(null);

      const { data, error } = await supabase
        .from('chat_rooms')
        .insert({
          nest_id: currentNest.id,
          name,
          description,
          created_by: user.id,
          is_default: false
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      await fetchChatRooms();
      return data as ChatRoom;
    } catch (err: any) {
      console.error('チャットルーム作成エラー:', err.message);
      setError(err.message || 'チャットルームの作成に失敗しました');
      return null;
    }
  };

  // メッセージ取得
  const fetchMessages = async (chatRoomId: string, limit: number = 50, before?: string): Promise<UIMessage[]> => {
    if (!currentNest || !user) return [];

    try {
      setLoadingMessages(true);
      setError(null);

      let query = supabase
        .from('messages')
        .select('*')
        .eq('chat_room_id', chatRoomId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (before) {
        query = query.lt('created_at', before);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      // メッセージをUIフォーマットに変換
      const uiMessages = await Promise.all(
        (data || []).map(async (msg: ChatMessage) => {
          // 送信者情報を取得
          const sender = nestMembers.find(m => m.user_id === msg.sender_id);
          
          return {
            ...msg,
            sender: {
              id: msg.sender_id,
              name: sender?.users?.display_name || 'Unknown',
              avatar: sender?.users?.avatar_url,
              isBot: false // TODO: ボット判定
            },
            status: msg.read_by && msg.read_by[user.id] ? 'read' : 'delivered'
          } as UIMessage;
        })
      );

      // 古い順にソート
      const sortedMessages = uiMessages.sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

      // メッセージを状態に格納
      setMessages(prev => ({
        ...prev,
        [chatRoomId]: sortedMessages
      }));

      // 既読マーク
      if (sortedMessages.length > 0) {
        const unreadMessageIds = sortedMessages
          .filter(msg => msg.sender_id !== user.id && (!msg.read_by || !msg.read_by[user.id]))
          .map(msg => msg.id);
          
        if (unreadMessageIds.length > 0) {
          markMessagesAsRead(chatRoomId, unreadMessageIds);
        }
      }

      return sortedMessages;
    } catch (err: any) {
      console.error('メッセージ取得エラー:', err.message);
      setError(err.message || 'メッセージの取得に失敗しました');
      return [];
    } finally {
      setLoadingMessages(false);
    }
  };

  // メッセージの既読マーク
  const markMessagesAsRead = async (chatRoomId: string, messageIds: string[]): Promise<boolean> => {
    if (!user || messageIds.length === 0) return false;

    try {
      const { data, error } = await supabase
        .rpc('mark_messages_as_read', {
          p_chat_room_id: chatRoomId,
          p_message_ids: messageIds
        });

      if (error) {
        throw error;
      }

      // チャットルームの未読カウントを更新
      setChatRooms(prev => prev.map(room => 
        room.id === chatRoomId 
          ? { ...room, unreadCount: room.unreadCount - messageIds.length } 
          : room
      ));

      return true;
    } catch (err) {
      console.error('既読マークエラー:', err);
      return false;
    }
  };

  // 新しいメッセージの処理
  const handleNewMessage = async (newMessage: ChatMessage) => {
    if (!user) return;

    try {
      // 送信者情報を取得
      const sender = nestMembers.find(m => m.user_id === newMessage.sender_id);
      
      const uiMessage: UIMessage = {
        ...newMessage,
        sender: {
          id: newMessage.sender_id,
          name: sender?.users?.display_name || 'Unknown',
          avatar: sender?.users?.avatar_url,
          isBot: false // TODO: ボット判定
        },
        status: 'delivered'
      };

      // メッセージを追加
      setMessages(prev => {
        const roomMessages = [...(prev[newMessage.chat_room_id] || [])];
        // 重複を防ぐために既存メッセージを確認
        const existingIndex = roomMessages.findIndex(m => m.id === newMessage.id);
        
        if (existingIndex >= 0) {
          // 既存のメッセージを更新
          roomMessages[existingIndex] = uiMessage;
        } else {
          // 新しいメッセージを追加
          roomMessages.push(uiMessage);
          // タイムスタンプでソート
          roomMessages.sort((a, b) => 
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
        }
        
        return {
          ...prev,
          [newMessage.chat_room_id]: roomMessages
        };
      });

      // 自分のメッセージでなければ、未読カウントを増やす
      if (newMessage.sender_id !== user.id) {
        setChatRooms(prev => prev.map(room => 
          room.id === newMessage.chat_room_id 
            ? { 
                ...room, 
                unreadCount: activeChatRoomId === room.id ? room.unreadCount : room.unreadCount + 1,
                lastMessage: {
                  content: newMessage.content,
                  sender_id: newMessage.sender_id,
                  sender_name: sender?.users?.display_name || 'Unknown',
                  timestamp: newMessage.created_at,
                  status: 'delivered'
                }
              } 
            : room
        ));

        // アクティブチャットルームなら既読マーク
        if (activeChatRoomId === newMessage.chat_room_id) {
          await markMessagesAsRead(newMessage.chat_room_id, [newMessage.id]);
        }
      }
    } catch (err) {
      console.error('新規メッセージ処理エラー:', err);
    }
  };

  // 更新されたメッセージの処理
  const handleUpdatedMessage = async (updatedMessage: ChatMessage) => {
    if (!messages[updatedMessage.chat_room_id]) return;

    // メッセージを更新
    setMessages(prev => {
      const roomMessages = [...(prev[updatedMessage.chat_room_id] || [])];
      const index = roomMessages.findIndex(m => m.id === updatedMessage.id);
      
      if (index >= 0) {
        // 既存のUIプロパティを保持しながら更新
        roomMessages[index] = {
          ...roomMessages[index],
          ...updatedMessage
        };
      }
      
      return {
        ...prev,
        [updatedMessage.chat_room_id]: roomMessages
      };
    });
  };

  // 削除されたメッセージの処理
  const handleDeletedMessage = (deletedMessageId: string) => {
    // すべてのチャットルームから削除されたメッセージを探す
    Object.keys(messages).forEach(roomId => {
      if (messages[roomId].some(m => m.id === deletedMessageId)) {
        setMessages(prev => ({
          ...prev,
          [roomId]: prev[roomId].filter(m => m.id !== deletedMessageId)
        }));
      }
    });
  };

  // メッセージ送信
  const sendMessage = async (content: string, replyToId?: string): Promise<UIMessage | null> => {
    if (!content.trim() || !activeChatRoomId || !currentNest || !user) return null;

    try {
      setError(null);

      // optimistic update
      const tempId = `temp-${Date.now()}`;
      const now = new Date().toISOString();
      const tempMessage: UIMessage = {
        id: tempId,
        nest_id: currentNest.id,
        chat_room_id: activeChatRoomId,
        sender_id: user.id,
        content: content.trim(),
        created_at: now,
        is_edited: false,
        has_pinned_to_board: false,
        reply_to_id: replyToId,
        sender: {
          id: user.id,
          name: profile?.display_name || user.email?.split('@')[0] || 'User',
          avatar: profile?.avatar_url,
          isBot: false
        },
        status: 'sending'
      };

      // 一時的にメッセージを追加
      setMessages(prev => ({
        ...prev,
        [activeChatRoomId]: [...(prev[activeChatRoomId] || []), tempMessage]
      }));

      // メッセージをデータベースに保存
      const messageData: CreateMessageData = {
        nest_id: currentNest.id,
        chat_room_id: activeChatRoomId,
        content: content.trim(),
        reply_to_id: replyToId
      };

      const { data, error } = await supabase
        .from('messages')
        .insert(messageData)
        .select()
        .single();

      if (error) {
        throw error;
      }

      // 一時メッセージを実際のメッセージに置き換え
      const actualMessage = data as ChatMessage;
      const uiMessage: UIMessage = {
        ...actualMessage,
        sender: tempMessage.sender,
        status: 'sent'
      };

      setMessages(prev => ({
        ...prev,
        [activeChatRoomId]: prev[activeChatRoomId].map(m => 
          m.id === tempId ? uiMessage : m
        )
      }));

      // チャットルームの最後のメッセージを更新
      setChatRooms(prev => prev.map(room => 
        room.id === activeChatRoomId 
          ? { 
              ...room, 
              lastMessage: {
                content: content.trim(),
                sender_id: user.id,
                sender_name: profile?.display_name || user.email?.split('@')[0] || 'User',
                timestamp: now,
                status: 'sent'
              }
            } 
          : room
      ));

      return uiMessage;
    } catch (err: any) {
      console.error('メッセージ送信エラー:', err.message);
      setError(err.message || 'メッセージの送信に失敗しました');

      // エラーの場合、一時メッセージを失敗状態に
      if (activeChatRoomId) {
        setMessages(prev => ({
          ...prev,
          [activeChatRoomId]: prev[activeChatRoomId].map(m => 
            m.status === 'sending' ? { ...m, status: 'failed' } : m
          )
        }));
      }

      return null;
    }
  };

  // アクティブチャットルームの変更
  const setActiveChatRoom = (chatRoomId: string) => {
    setActiveChatRoomId(chatRoomId);
    
    // 未読状態をリセット
    setChatRooms(prev => 
      prev.map(room => 
        room.id === chatRoomId ? { ...room, unreadCount: 0 } : room
      )
    );
    
    // サマリー表示状態をリセット
    setShowSummary(false);

    // メッセージをロード
    if (!messages[chatRoomId]) {
      fetchMessages(chatRoomId);
    } else {
      // 未読メッセージを既読マーク
      const unreadMessageIds = messages[chatRoomId]
        .filter(msg => msg.sender_id !== user?.id && (!msg.read_by || !msg.read_by[user?.id || '']))
        .map(msg => msg.id);
        
      if (unreadMessageIds.length > 0) {
        markMessagesAsRead(chatRoomId, unreadMessageIds);
      }
    }
  };

  // 特定のチャットからインサイトを抽出
  const extractInsightFromChat = async (chatRoomId: string): Promise<string[]> => {
    if (!pocoAssistant) return [];
    
    const chatMessages = messages[chatRoomId] || [];
    if (chatMessages.length === 0) return [];
    
    return pocoAssistant.extractKeywordsFromConversation(chatMessages);
  };

  // 特定のチャットから洞察を抽出してボードに保存
  const extractAndSaveInsights = async (chatRoomId: string): Promise<void> => {
    if (!pocoAssistant) return;
    
    try {
      setIsExtractingInsights(true);
      
      const chatMessages = messages[chatRoomId] || [];
      if (chatMessages.length === 0) return;
      
      // 自動洞察抽出
      const insights: Insight[] = await pocoAssistant.extractInsights(chatRoomId, chatMessages);
      
      if (insights.length > 0) {
        // 洞察をボードに保存
        for (const insight of insights) {
          await saveInsightToBoard(insight);
        }
        
        // 洞察抽出成功通知メッセージを作成
        if (user) {
          const notificationMessage: CreateMessageData = {
            nest_id: currentNest?.id || '',
            chat_room_id: chatRoomId,
            content: `${insights.length}件の洞察を抽出し、ボードに保存しました。「ボード」タブで確認できます。`,
            metadata: {
              isAutomatedMessage: true,
              insightCount: insights.length
            }
          };
          
          await supabase
            .from('messages')
            .insert(notificationMessage);
        }
      }
    } catch (error) {
      console.error('Error extracting insights:', error);
      // エラーメッセージを表示
      if (user && currentNest) {
        const errorMessage: CreateMessageData = {
          nest_id: currentNest.id,
          chat_room_id: chatRoomId,
          content: `洞察の抽出中にエラーが発生しました。`,
          metadata: {
            isError: true
          }
        };
        
        await supabase
          .from('messages')
          .insert(errorMessage);
      }
    } finally {
      setIsExtractingInsights(false);
    }
  };

  // 会話のサマリーを生成
  const generateSummary = async (): Promise<void> => {
    if (!pocoAssistant || !activeChatRoomId) return;
    
    try {
      setIsPocoTyping(true);
      
      const chatMessages = messages[activeChatRoomId] || [];
      if (chatMessages.length < 5) {
        // メッセージが少なすぎる場合
        setConversationSummary('会話の要約を生成するにはもう少しメッセージが必要です。');
      } else {
        // 会話の要約を生成
        const summary = await pocoAssistant.generateConversationSummary(chatMessages);
        setConversationSummary(summary);
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
    <ChatContext.Provider
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
        setActiveChatRoom,
        sendMessage,
        createChatRoom,
        fetchMessages,
        markMessagesAsRead,
        extractInsightFromChat,
        extractAndSaveInsights,
        generateSummary
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}; 