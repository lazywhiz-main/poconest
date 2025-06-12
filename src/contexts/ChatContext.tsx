import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Platform } from 'react-native';
import { v4 as uuidv4 } from 'uuid';
import { chatService } from '../services/ChatService';
import { supabase } from '../services/supabase/client';
import { useNest } from '../features/nest/contexts/NestContext';
import { ChatMessage, UIMessage, ChatUser } from 'src/types/nestSpace.types';
import { ChatRoom } from 'src/features/nest-space/chat-space/types/chat.types';
import { useAuth } from './AuthContext';


// コンテキストの型定義
interface ChatContextProps {
  chatRooms: ChatRoom[];
  messages: Record<string, UIMessage[]>;
  activeChatRoomId: string | null;
  isPocoTyping: boolean;
  loadingMessages: boolean;
  setActiveChatRoom: (id: string) => void;
  sendMessage: (content: string) => Promise<void>;
  generateSummary: () => Promise<void>;
  showSummary: boolean;
  conversationSummary: string;
  extractAndSaveInsights: (chatId: string) => Promise<void>;
  isExtractingInsights: boolean;
  createChatRoom: (spaceId: string, name: string, description?: string) => Promise<void>;
  getChatRoomsBySpaceId: (spaceId: string) => Promise<ChatRoom[]>;
  isChatRoomsLoaded: boolean;
  deleteChatRoom: (roomId: string) => Promise<void>;
}

// コンテキストの作成
const ChatContext = createContext<ChatContextProps | undefined>(undefined);

// Bot ユーザー定義
const pocoUser: ChatUser = {
  id: 'poco-bot-id',
  name: 'ポコ',
  isBot: true,
};

// 人間のユーザー定義
const humanUser: ChatUser = {
  id: 'human-user-id',
  name: 'あなた',
  isBot: false,
};

// チャットコンテキストプロバイダー
export const ChatProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [messages, setMessages] = useState<Record<string, UIMessage[]>>({});
  const [activeChatRoomId, setActiveChatRoomId] = useState<string | null>(null);
  const [isChatRoomsLoaded, setIsChatRoomsLoaded] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [conversationSummary, setConversationSummary] = useState('');
  const [isExtractingInsights, setIsExtractingInsights] = useState(false);
  const [subscriptions, setSubscriptions] = useState<Record<string, () => void>>({});
  const [isPocoTyping, setIsPocoTyping] = useState(false);
  const { currentNest } = useNest();

  // 初期化時にチャットルーム一覧を取得
  useEffect(() => {
    const fetchChatRooms = async () => {
      try {
        console.log('ChatContext: fetchChatRooms started for NEST:', currentNest?.id);
        if (!currentNest?.id) {
          setChatRooms([]);
          setIsChatRoomsLoaded(true);
          return;
        }
        

        
        const rooms = await chatService.getChatRooms(currentNest.id);
        console.log('ChatContext: fetchChatRooms result:', rooms);
        setChatRooms(rooms);
        setIsChatRoomsLoaded(true);
        if (rooms.length > 0) {
          setActiveChatRoomId(rooms[0].id);
        }
      } catch (error) {
        setIsChatRoomsLoaded(true);
      }
    };
    
    fetchChatRooms();
    
    // Supabaseの認証状態変更をリッスン
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        fetchChatRooms();
      }
    });
    
    return () => {
      // リスナーのクリーンアップ
      if (authListener && authListener.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, [currentNest?.id]);
  
  // アクティブなチャットルームが変更されたらメッセージを取得
  useEffect(() => {
    if (!activeChatRoomId || !currentNest?.id) return;
    
    const fetchMessages = async () => {
      setLoadingMessages(true);
      try {
        console.log('ChatContext: fetchMessages started for room:', activeChatRoomId);
        const msgs = await chatService.getChatMessages(activeChatRoomId);
        console.log('ChatContext: fetchMessages result:', msgs);
        setMessages(prev => ({ ...prev, [activeChatRoomId]: msgs }));
      } catch (error) {
        console.error('メッセージ取得エラー:', error);
      } finally {
        setLoadingMessages(false);
      }
    };
    
    fetchMessages();
    
    // リアルタイム更新のサブスクリプションを設定
    const unsubscribe = chatService.subscribeToMessages(
      activeChatRoomId, 
      (newMessage) => {
        // 新しいメッセージをステートに追加
        setMessages(prev => {
          const currentMessages = prev[activeChatRoomId] || [];
          // 重複を避けるために、既存のメッセージをチェック
          if (currentMessages.some(msg => msg.id === newMessage.id)) {
            return prev;
          }
          return {
            ...prev,
            [activeChatRoomId]: [...currentMessages, newMessage]
          };
        });
        
        // ルーム情報を更新
        setChatRooms(prev => prev.map(room => {
          if (room.id === activeChatRoomId) {
            return {
              ...room,
              lastMessage: newMessage,
              lastActivity: newMessage.created_at,
            };
          }
          return room;
        }));
      }
    );
    
    // 既存のサブスクリプションを解除し、新しいサブスクリプションを保存
    setSubscriptions(prev => {
      // 前のサブスクリプションがあれば解除
      if (prev[activeChatRoomId]) {
        prev[activeChatRoomId]();
      }
      return { ...prev, [activeChatRoomId]: unsubscribe };
    });
    
    // クリーンアップ関数
    return () => {
      if (subscriptions[activeChatRoomId]) {
        subscriptions[activeChatRoomId]();
      }
    };
  }, [activeChatRoomId, currentNest?.id]);

  // チャットルームを選択
  const setActiveChatRoom = (id: string) => {
    setActiveChatRoomId(id);
    
    // 未読メッセージをすべて既読に
    const updatedRooms = chatRooms.map(room => {
      if (room.id === id) {
        return { ...room, unreadCount: 0 };
      }
      return room;
    });
    setChatRooms(updatedRooms);

    // メッセージを既読に
    if (messages[id]) {
      const unreadMessageIds = messages[id]
        .filter(msg => !msg.is_read)
        .map(msg => msg.id);
        
      if (unreadMessageIds.length > 0) {
        // サービスを呼び出して既読に
        chatService.markAsRead(unreadMessageIds);
        
        // ローカルステートも更新
      const updatedMessages = messages[id].map(msg => {
        if (!msg.is_read) {
          return { ...msg, is_read: true };
        }
        return msg;
      });
      setMessages({ ...messages, [id]: updatedMessages });
      }
    }
  };

  // メッセージ送信
  const sendMessage = async (content: string): Promise<void> => {
    if (!activeChatRoomId) return;

    // 現在のユーザー情報を取得
    const currentUser = supabase.auth.getUser();
    const userId = (await currentUser).data.user?.id;
    
    if (!userId) {
      console.error('ユーザーが認証されていません');
      return;
    }
    
    const sender: ChatUser = {
      id: userId,
      name: 'あなた', // 実際のユーザー名はSupabaseから取得する必要がある
      isBot: false,
    };

    // ユーザーメッセージを追加
    const userMessage: UIMessage = {
      id: uuidv4(),
      chatId: activeChatRoomId,
      content,
      sender,
      created_at: new Date().toISOString(),
      is_read: true,
      pending: true // 送信中
    };

    // 一時的にメッセージを表示
    const updatedMessages = {
      ...messages,
      [activeChatRoomId]: [...(messages[activeChatRoomId] || []), userMessage],
    };
    setMessages(updatedMessages);

    // チャットルームのlastMessageを更新
    const updatedRooms = chatRooms.map(room => {
      if (room.id === activeChatRoomId) {
        return {
          ...room,
          lastMessage: userMessage,
          lastActivity: new Date().toISOString(),
        };
      }
      return room;
    });
    setChatRooms(updatedRooms);

    try {
      // サービスを使ってメッセージを送信
      const sentMessage = await chatService.sendMessage(activeChatRoomId, content, sender);
      
      // 送信完了したメッセージで更新
      setMessages(prev => {
        const currentMessages = prev[activeChatRoomId] || [];
        return {
          ...prev,
          [activeChatRoomId]: currentMessages.map(msg => 
            msg.id === userMessage.id ? { ...sentMessage, pending: false } : msg
          )
        };
      });
      
      // ボットの応答を生成
      // setIsPocoTyping(true);
      
      // 遅延をシミュレート
      // await new Promise(resolve => setTimeout(resolve, 1500));

      // ボットの応答をランダムに選択
      // const botResponses = [
      //   'なるほど、興味深いですね。もう少し詳しく教えていただけますか？',
      //   'ご質問ありがとうございます。それについては次のように考えています...',
      //   'それは素晴らしいアイデアです！さらに発展させるために次のステップを考えてみましょう。',
      //   'ご意見ありがとうございます。その点については異なる視点もあります。',
      //   '確かにその通りです。さらに補足すると、最近の研究によると...',
      // ];
      // const randomResponse = botResponses[Math.floor(Math.random() * botResponses.length)];

      // サービスを使ってボットのメッセージを送信
      // const botMessage = await chatService.sendMessage(activeChatRoomId, randomResponse, pocoUser);

      // タイピング状態を解除
      // setIsPocoTyping(false);

      // ボットのメッセージをステートに追加
      // setMessages(prev => {
      //   const currentMessages = prev[activeChatRoomId] || [];
      //   return {
      //     ...prev,
      //     [activeChatRoomId]: [...currentMessages, botMessage]
      //   };
      // });

      // チャットルームのlastMessageを更新
      // setChatRooms(prev => prev.map(room => {
      //   if (room.id === activeChatRoomId) {
      //     return {
      //       ...room,
      //       lastMessage: botMessage,
      //       lastActivity: botMessage.created_at,
      //     };
      //   }
      //   return room;
      // }));
    } catch (error) {
      console.error('メッセージ送信エラー:', error);
      // setIsPocoTyping(false);
      
      // 送信失敗を表示
      setMessages(prev => {
        const currentMessages = prev[activeChatRoomId] || [];
        return {
          ...prev,
          [activeChatRoomId]: currentMessages.map(msg => 
            msg.id === userMessage.id ? { ...msg, pending: false, content: `${msg.content} (送信失敗)` } : msg
          )
        };
      });
    }
  };
  
  // 新しいチャットルームを作成
  const createChatRoom = async (spaceId: string, name: string, description?: string): Promise<void> => {
    try {
      const newRoom = await chatService.createChatRoom(spaceId, name, description);
      setChatRooms(prev => [...prev, newRoom]);
      setActiveChatRoomId(newRoom.id);
    } catch (error) {
      console.error('チャットルーム作成エラー:', error);
    }
  };
  
  // 特定の空間のチャットルームを取得
  const getChatRoomsBySpaceId = async (spaceId: string): Promise<ChatRoom[]> => {
    try {
      return await chatService.getChatRoomsBySpaceId(spaceId);
    } catch (error) {
      console.error('空間のチャットルーム取得エラー:', error);
      return [];
    }
  };

  // 会話要約を生成
  const generateSummary = async (): Promise<void> => {
    if (!activeChatRoomId) return;
    
    // 要約生成中のローディング状態
    setLoadingMessages(true);
    
    // 要約生成を遅延でシミュレート
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // モックの要約を生成
    setConversationSummary(
      `この会話では主に以下のトピックについて話し合われました：\n
1. 新しいプロジェクトのアイデア
2. コミュニティアプリのコンセプト
3. 開発の次のステップ\n
特に、地域コミュニティを繋げるアプリケーションの可能性について焦点が当てられました。`
    );
    
    setShowSummary(true);
    setLoadingMessages(false);
  };

  // インサイト抽出（analyze-chat Edge Functionを直接使用）
  const extractAndSaveInsights = async (chatId: string): Promise<void> => {
    console.log('🔥🔥🔥 [ChatContext] EXTRACT AND SAVE INSIGHTS CALLED 🔥🔥🔥');
    console.log('[ChatContext] Starting extractAndSaveInsights with chatId:', chatId);
    console.log('[ChatContext] Initial auth state check:', {
      user: user,
      hasUser: !!user,
      userId: user?.id,
      userIdType: typeof user?.id
    });
    
    // 一時的にアラートも追加
    alert(`[DEBUG] ChatContext extractAndSaveInsights called with user: ${user?.id || 'undefined'}`);
    
    if (!chatId) return;
    
    setIsExtractingInsights(true);
    
    try {
      // 対象チャットルームの情報とメッセージを取得
      const targetRoom = chatRooms.find(room => room.id === chatId);
      const chatMessages = messages[chatId] || [];
      
      console.log('[ChatContext] Context check:', {
        targetRoomFound: !!targetRoom,
        messageCount: chatMessages.length,
        currentNest: currentNest,
        user: user,
        userHasId: !!user?.id,
        actualUserId: user?.id
      });
      
      if (!targetRoom || chatMessages.length === 0) {
        console.warn('[ChatContext] No room or messages found for chat:', chatId);
        alert('チャットメッセージが見つかりません');
        return;
      }

      if (chatMessages.length < 5) {
        alert('インサイト抽出には最低5件のメッセージが必要です');
        return;
      }

      // ユーザーIDの確認
      const finalUserId = user?.id;
      if (!finalUserId) {
        console.error('[ChatContext] User ID not available:', user);
        alert('ユーザー認証が必要です。ログインしてから再度お試しください。');
        return;
      }

      // メッセージを適切な形式に変換
      const aiMessages = chatMessages.map(msg => ({
        text: msg.content,
        userName: msg.sender?.name || 'Unknown',
        timestamp: msg.created_at || new Date().toISOString()
      }));

      // analyze-chat Edge Functionを直接呼び出し
      const { supabase } = await import('../services/supabase/client');
      
      console.log('[ChatContext] Calling analyze-chat with params:', {
        messageCount: aiMessages.length,
        nestId: currentNest?.id,
        userId: finalUserId,
        spaceId: targetRoom.spaceId,
        hasCurrentNest: !!currentNest,
        currentNestData: currentNest
      });
      
      // nestIdの決定：currentNest?.id -> targetRoom.spaceId -> null の順で優先
      const nestIdToUse = currentNest?.id || targetRoom.spaceId || null;
      
      const { data, error } = await supabase.functions.invoke('analyze-chat', {
        body: {
          messages: aiMessages.slice(-30), // 最新30件のメッセージを分析
          board_id: chatId,
          created_by: finalUserId, // 確認済みのユーザーID
          nestId: nestIdToUse, // 決定されたnestIdを使用
        },
      });

      if (error) {
        console.error('[ChatContext] AI分析エラー:', error);
        alert('AI分析でエラーが発生しました: ' + error.message);
        return;
      }

      if (!data || !data.success) {
        console.warn('[ChatContext] AI分析失敗:', data);
        alert('AI分析に失敗しました');
        return;
      }

      // 成功時の通知
      console.log('[ChatContext] インサイト抽出完了:', data);
      alert('インサイト抽出が完了しました！\n\n結果: ' + (data.markdown ? '分析レポートが生成されました' : 'データが返されました'));
      
    } catch (error) {
      console.error('[ChatContext] インサイト抽出エラー:', error);
      alert('インサイト抽出中にエラーが発生しました');
    } finally {
      setIsExtractingInsights(false);
    }
  };

  // チャットルームを削除
  const deleteChatRoom = async (roomId: string): Promise<void> => {
    try {
      await chatService.deleteChatRoom(roomId);
      setChatRooms(prev => prev.filter(room => room.id !== roomId));
      // アクティブチャットルームが削除された場合はnullに
      setActiveChatRoomId(prev => (prev === roomId ? null : prev));
    } catch (error) {
      console.error('チャットルーム削除エラー:', error);
    }
  };

  // プロバイダーの値を設定
  const value = {
    chatRooms,
    messages,
    activeChatRoomId,
    isPocoTyping,
    loadingMessages,
    setActiveChatRoom,
    sendMessage,
    generateSummary,
    showSummary,
    conversationSummary,
    extractAndSaveInsights,
    isExtractingInsights,
    createChatRoom,
    getChatRoomsBySpaceId,
    isChatRoomsLoaded,
    deleteChatRoom,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

// カスタムフック
export const useChat = (): ChatContextProps => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}; 