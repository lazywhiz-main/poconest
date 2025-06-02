import { supabase } from './supabase/client';
import { v4 as uuidv4 } from 'uuid';
import { ChatMessage, ChatUser, UIMessage } from 'src/types/nestSpace.types';
import { ChatRoom } from 'src/features/nest-space/chat-space/types/chat.types';

/**
 * チャットサービス
 * 
 * Supabaseを使用してチャットのバックエンド機能を提供する
 */
export class ChatService {
  /**
   * チャットルーム一覧を取得
   */
  async getChatRooms(nestId?: string): Promise<ChatRoom[]> {
    try {
      console.log('ChatService: getChatRooms started for NEST:', nestId);
      // Supabaseからチャットルームを取得
      const { data: spaces, error: spacesError } = await supabase
        .from('spaces')
        .select('id, name, description, nest_id, created_at')
        .eq('type', 'chat')
        .eq('nest_id', nestId); // Add NEST ID filter
        
      if (spacesError) throw spacesError;
      
      console.log('ChatService: spaces fetched:', spaces);
      
      if (!spaces || spaces.length === 0) {
        console.log('ChatService: No spaces found for NEST:', nestId);
        return [];
      }
      
      // 各空間のチャットルームを取得
      const chatRooms: ChatRoom[] = [];
      
      for (const space of spaces) {
        const { data: rooms, error: roomsError } = await supabase
          .from('chat_rooms')
          .select('id, name, description, created_at, last_activity, is_public')
          .eq('space_id', space.id)
          .order('created_at', { ascending: false });
          
        if (roomsError) throw roomsError;
        
        if (rooms && rooms.length > 0) {
          // 未読メッセージのカウント
          for (const room of rooms) {
            // 最後の活動時間を取得
            const lastActivity = room.last_activity || room.created_at;
            
            // 現在のユーザーIDを取得
            const { data: userData } = await supabase.auth.getUser();
            const currentUserId = userData.user?.id || '';
            
            // 未読カウントを取得 (現在のユーザーのメッセージではないものかつ既読になっていないもの)
            const { count, error: countError } = await supabase
              .from('chat_messages')
              .select('*', { count: 'exact', head: true })
              .eq('chat_id', room.id)
              .eq('is_read', false)
              .neq('sender_id', currentUserId);
              
            if (countError) {
              console.error('未読カウント取得エラー:', countError);
            }
            
            chatRooms.push({
              id: room.id,
              name: room.name,
              description: room.description,
              lastActivity: lastActivity,
              unreadCount: count || 0,
              spaceId: space.id,
              nestId: space.nest_id
            });
          }
        }
      }
      
      // 最終活動時間の降順でソート
      return chatRooms.sort((a, b) => 
        new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
      );
    } catch (error) {
      console.error('チャットルームの取得に失敗しました:', error);
      return []; // エラー時は空配列を返す
    }
  }
  
  /**
   * 特定のチャットルームのメッセージを取得
   */
  async getChatMessages(roomId: string): Promise<UIMessage[]> {
    try {
      console.log('ChatService: getChatMessages started for room:', roomId);
      // Supabaseからメッセージを取得
      const { data, error } = await supabase
        .from('chat_messages')
        .select(`
          id,
          chat_id,
          content,
          sender_id,
          created_at,
          updated_at,
          is_read,
          read_by
        `)
        .eq('chat_id', roomId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      
      console.log('ChatService: messages fetched:', data);
      
      if (!data || data.length === 0) {
        console.log('ChatService: No messages found for room:', roomId);
        return [];
      }
      
      // 現在のユーザーIDを取得
      const { data: userData } = await supabase.auth.getUser();
      const currentUserId = userData.user?.id || '';
      
      // sender_id一覧をユニーク抽出
      const senderIds = [...new Set(data.map(msg => msg.sender_id))];
      // usersテーブルから一括取得
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, display_name, avatar_url')
        .in('id', senderIds);
      if (usersError) throw usersError;
      type UserRow = { id: string; display_name: string; avatar_url?: string | null };
      const userMap = Object.fromEntries(((usersData as UserRow[]) || []).map(u => [u.id, u]));
      // UIMessage形式に変換
      const messages: UIMessage[] = data.map(msg => {
        const isSelf = msg.sender_id === currentUserId;
        const userInfo = userMap[msg.sender_id];
        const sender: ChatUser = {
          id: msg.sender_id,
          name: userInfo?.display_name || 'ユーザー',
          avatarUrl: userInfo?.avatar_url ?? undefined,
          isBot: false,
        };
        return {
          id: msg.id,
          chatId: msg.chat_id,
          content: msg.content,
          sender: sender,
          created_at: msg.created_at,
          is_read: msg.is_read || isSelf,
          pending: false
        };
      });
      
      return messages;
    } catch (error) {
      console.error(`チャットメッセージの取得に失敗しました (${roomId}):`, error);
      const mockData = this.getMockMessages();
      return mockData[roomId] || []; // エラー時はモックデータを返す
    }
  }
  
  /**
   * メッセージを送信
   */
  async sendMessage(roomId: string, content: string, sender: ChatUser): Promise<UIMessage> {
    try {
      const messageId = uuidv4();
      const now = new Date().toISOString();
      
      // 現在のユーザーIDを取得
      const { data: userData } = await supabase.auth.getUser();
      const currentUserId = userData.user?.id;
      
      if (!currentUserId) {
        throw new Error('認証されていません');
      }
      
      // メッセージをSupabaseに保存
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          id: messageId,
          chat_id: roomId,
          content,
          sender_id: currentUserId,
          created_at: now,
          updated_at: now,
          is_read: false,
          read_by: []
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // チャットルームの最終活動時間を更新
      await supabase
        .from('chat_rooms')
        .update({ last_activity: now })
        .eq('id', roomId);
      
      // 送信したメッセージを返す
      return {
        id: messageId,
        chatId: roomId,
        content,
        sender,
        created_at: now,
        is_read: true, // 自分のメッセージは既読
        pending: false
      };
    } catch (error) {
      console.error('メッセージの送信に失敗しました:', error);
      throw error;
    }
  }
  
  /**
   * チャットルームを新規作成
   */
  async createChatRoom(spaceId: string, name: string, description?: string): Promise<ChatRoom> {
    try {
      const roomId = uuidv4();
      const now = new Date().toISOString();
      
      // チャットルームをSupabaseに保存
      const { data, error } = await supabase
        .from('chat_rooms')
        .insert({
          id: roomId,
          space_id: spaceId,
          name,
          description,
          created_at: now,
          last_activity: now,
          is_public: true
        })
        .select('*, spaces!space_id(nest_id)')
        .single();
      
      if (error) throw error;
      
      const spaceInfo = data.spaces as unknown as { nest_id: string };
      
      // 作成したルームを返す
      return {
        id: roomId,
        name,
        description,
        lastActivity: now,
        unreadCount: 0,
        spaceId: spaceId,
        nestId: spaceInfo?.nest_id
      };
    } catch (error) {
      console.error('チャットルームの作成に失敗しました:', error);
      throw error;
    }
  }
  
  /**
   * リアルタイム更新のサブスクリプションを設定
   */
  subscribeToMessages(roomId: string, onMessage: (message: UIMessage) => void): () => void {
    // Supabaseのリアルタイムチャンネルを設定
    const subscription = supabase
      .channel(`chat:${roomId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `chat_id=eq.${roomId}`
      }, async (payload) => {
        try {
          // メッセージデータを取得
          const msg = payload.new;
          
          // ユーザー情報を取得
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('display_name, avatar_url')
            .eq('id', msg.sender_id)
            .single();
          
          if (userError) throw userError;
          
          const sender: ChatUser = {
            id: msg.sender_id,
            name: userData?.display_name || 'ユーザー',
            avatarUrl: userData?.avatar_url ?? undefined,
            isBot: false,
          };
          
          const message: UIMessage = {
            id: msg.id,
            chatId: msg.chat_id,
            content: msg.content,
            sender: sender,
            created_at: msg.created_at,
            is_read: false,
            pending: false
          };
          
          // コールバック呼び出し
          onMessage(message);
        } catch (error) {
          console.error('リアルタイムメッセージ処理エラー:', error);
        }
      })
      .subscribe();
    
    // 解除関数を返す
    return () => {
      subscription.unsubscribe();
    };
  }
  
  /**
   * メッセージを既読にする
   */
  async markAsRead(messageIds: string[]): Promise<void> {
    try {
      if (messageIds.length === 0) return;
      
      // 現在のユーザーIDを取得
      const { data: userData } = await supabase.auth.getUser();
      const currentUserId = userData.user?.id;
      
      if (!currentUserId) return;
      
      // メッセージを既読に更新
      const { error } = await supabase
        .from('chat_messages')
        .update({ 
          is_read: true,
          read_by: supabase.rpc('array_append_unique', {
            arr: [],
            element: currentUserId
          })
        })
        .in('id', messageIds);
      
      if (error) throw error;
      
      console.log(`${messageIds.length}件のメッセージを既読にしました`);
    } catch (error) {
      console.error('メッセージの既読設定に失敗しました:', error);
    }
  }
  
  /**
   * 空間のチャットルーム一覧を取得
   */
  async getChatRoomsBySpaceId(spaceId: string): Promise<ChatRoom[]> {
    try {
      const { data, error } = await supabase
        .from('chat_rooms')
        .select(`
          id, 
          name, 
          description, 
          created_at, 
          last_activity, 
          is_public,
          space_id,
          spaces!space_id(nest_id)
        `)
        .eq('space_id', spaceId)
        .order('created_at', { ascending: true });
        
      if (error) throw error;
      
      if (!data || data.length === 0) {
        return [];
      }
      
      // 現在のユーザーIDを取得
      const { data: userData } = await supabase.auth.getUser();
      const currentUserId = userData.user?.id || '';
      
      // ChatRoom形式に変換
      const rooms: ChatRoom[] = await Promise.all(data.map(async room => {
        // 未読カウントを取得
        const { count, error: countError } = await supabase
          .from('chat_messages')
          .select('*', { count: 'exact', head: true })
          .eq('chat_id', room.id)
          .eq('is_read', false)
          .neq('sender_id', currentUserId);
          
        if (countError) {
          console.error('未読カウント取得エラー:', countError);
        }
        
        const spaceInfo = room.spaces as unknown as { nest_id: string };
        
        return {
          id: room.id,
          name: room.name,
          description: room.description,
          lastActivity: room.last_activity || room.created_at,
          unreadCount: count || 0,
          spaceId: room.space_id,
          nestId: spaceInfo?.nest_id
        };
      }));
      
      return rooms;
    } catch (error) {
      console.error(`空間のチャットルーム取得に失敗しました (${spaceId}):`, error);
      return [];
    }
  }
  
  /**
   * チャットルームを削除
   */
  async deleteChatRoom(roomId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('chat_rooms')
        .delete()
        .eq('id', roomId);
      if (error) throw error;
    } catch (error) {
      console.error('チャットルーム削除エラー:', error);
      throw error;
    }
  }
  
  /**
   * チャットルームのモックデータを生成
   */
  private getMockChatRooms(): ChatRoom[] {
    return [
      {
        id: 'general-chat',
        name: '一般チャット',
        description: 'ポコとの日常会話',
        lastActivity: new Date().toISOString(),
        unreadCount: 0,
      },
      {
        id: 'project-ideas',
        name: 'プロジェクトアイデア',
        description: '新しいプロジェクトのブレインストーミング',
        lastActivity: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 昨日
        unreadCount: 2,
      },
      {
        id: 'daily-tasks',
        name: '日々のタスク',
        description: 'タスク管理と進捗状況',
        lastActivity: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2日前
        unreadCount: 0,
      },
    ];
  }
  
  /**
   * メッセージのモックデータを生成
   */
  private getMockMessages(): Record<string, UIMessage[]> {
    const pocoUser: ChatUser = {
      id: 'poco-bot-id',
      name: 'ポコ',
      isBot: true,
    };
    
    const humanUser: ChatUser = {
      id: 'human-user-id',
      name: 'あなた',
      isBot: false,
    };
    
    const now = Date.now();
    
    return {
      'general-chat': [
        {
          id: uuidv4(),
          chatId: 'general-chat',
          content: 'こんにちは、何かお手伝いできることはありますか？',
          sender: pocoUser,
          created_at: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString(),
          is_read: true,
        },
        {
          id: uuidv4(),
          chatId: 'general-chat',
          content: '最近の天気について教えてください',
          sender: humanUser,
          created_at: new Date(now - 3 * 24 * 60 * 60 * 1000 + 5 * 60 * 1000).toISOString(),
          is_read: true,
        },
        {
          id: uuidv4(),
          chatId: 'general-chat',
          content: '現在の天気は晴れで、気温は約20度です。午後から少し曇りになる予報が出ています。',
          sender: pocoUser,
          created_at: new Date(now - 3 * 24 * 60 * 60 * 1000 + 8 * 60 * 1000).toISOString(),
          is_read: true,
        },
        {
          id: uuidv4(),
          chatId: 'general-chat',
          content: '今日は何をしようかな',
          sender: humanUser,
          created_at: new Date(now - 24 * 60 * 60 * 1000).toISOString(),
          is_read: true,
        },
        {
          id: uuidv4(),
          chatId: 'general-chat',
          content: '天気が良いので散歩やピクニックはいかがでしょうか？あるいは、読書や映画鑑賞も良い過ごし方だと思います。',
          sender: pocoUser,
          created_at: new Date(now - 24 * 60 * 60 * 1000 + 3 * 60 * 1000).toISOString(),
          is_read: true,
        },
      ],
      'project-ideas': [
        {
          id: uuidv4(),
          chatId: 'project-ideas',
          content: '新しいアプリのアイデアを考えています。何かおすすめはありますか？',
          sender: humanUser,
          created_at: new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString(),
          is_read: true,
        },
        {
          id: uuidv4(),
          chatId: 'project-ideas',
          content: '生活習慣の改善を支援するアプリや、地域コミュニティを繋げるプラットフォームなどが最近注目されています。あなたの興味や得意分野は何ですか？',
          sender: pocoUser,
          created_at: new Date(now - 7 * 24 * 60 * 60 * 1000 + 10 * 60 * 1000).toISOString(),
          is_read: true,
        },
        {
          id: uuidv4(),
          chatId: 'project-ideas',
          content: 'プログラミングとデザインが得意です。地域コミュニティのアプリは面白そうですね。',
          sender: humanUser,
          created_at: new Date(now - 3 * 24 * 60 * 60 * 1000).toISOString(),
          is_read: true,
        },
        {
          id: uuidv4(),
          chatId: 'project-ideas',
          content: 'それなら、地域の小さなイベントや集まりを簡単に見つけられるアプリを作ってみてはどうでしょうか？パンデミック後、人々は再び繋がりを求めていますが、既存のプラットフォームは大きなイベント向けで、近所の小さな集まりには適していないことが多いです。',
          sender: pocoUser,
          created_at: new Date(now - 3 * 24 * 60 * 60 * 1000 + 15 * 60 * 1000).toISOString(),
          is_read: true,
        },
      ],
      'daily-tasks': [
        {
          id: uuidv4(),
          chatId: 'daily-tasks',
          content: '今週のタスクを整理したいです',
          sender: humanUser,
          created_at: new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString(),
          is_read: true,
        },
        {
          id: uuidv4(),
          chatId: 'daily-tasks',
          content: 'お手伝いします。まずは今週の主要な目標や完了すべきタスクを教えていただけますか？',
          sender: pocoUser,
          created_at: new Date(now - 5 * 24 * 60 * 60 * 1000 + 3 * 60 * 1000).toISOString(),
          is_read: true,
        },
      ],
    };
  }
}

// シングルトンインスタンスをエクスポート
export const chatService = new ChatService(); 