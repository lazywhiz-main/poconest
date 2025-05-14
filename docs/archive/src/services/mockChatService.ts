import { ChatRoom, UIChatRoom, ChatMessage, UIMessage, CreateMessageData } from '../types/chat';
import { v4 as uuidv4 } from 'uuid';

/**
 * モックチャットサービス
 * RLSの問題が解決できない場合にフロントエンドでモックデータを使用するためのサービス
 */
export class MockChatService {
  private chatRooms: UIChatRoom[] = [];
  private messages: Record<string, UIMessage[]> = {};
  private userId: string;
  private userName: string;
  private nestId: string;

  constructor(userId: string, userName: string, nestId: string) {
    this.userId = userId;
    this.userName = userName;
    this.nestId = nestId;
    
    // モックデータの初期化
    this.initializeMockData();
  }

  /**
   * モックデータの初期化
   */
  private initializeMockData(): void {
    // デフォルトチャットルームの作成
    const generalRoom: UIChatRoom = {
      id: uuidv4(),
      nest_id: this.nestId,
      name: 'General',
      description: 'メインチャットルーム',
      created_at: new Date().toISOString(),
      created_by: this.userId,
      is_default: true,
      is_archived: false,
      participants: [
        {
          id: this.userId,
          name: this.userName,
          isOnline: true
        }
      ],
      unreadCount: 0
    };

    // チャットルームリストに追加
    this.chatRooms.push(generalRoom);
    
    // 空のメッセージ配列を初期化
    this.messages[generalRoom.id] = [];
    
    // テストメッセージを追加
    this.addWelcomeMessage(generalRoom.id);
  }

  /**
   * ウェルカムメッセージの追加
   */
  private addWelcomeMessage(chatRoomId: string): void {
    const welcomeMessage: UIMessage = {
      id: uuidv4(),
      nest_id: this.nestId,
      chat_room_id: chatRoomId,
      sender_id: 'system',
      content: 'チャットルームへようこそ！このチャットはモックデータを使用しています。',
      created_at: new Date().toISOString(),
      is_edited: false,
      has_pinned_to_board: false,
      sender: {
        id: 'system',
        name: 'システム',
        isBot: true
      },
      status: 'read'
    };
    
    this.messages[chatRoomId].push(welcomeMessage);
  }

  /**
   * チャットルーム一覧の取得
   */
  public getChatRooms(): UIChatRoom[] {
    return [...this.chatRooms];
  }

  /**
   * 特定のチャットルームのメッセージを取得
   */
  public getMessages(chatRoomId: string): UIMessage[] {
    return [...(this.messages[chatRoomId] || [])];
  }

  /**
   * チャットルームの作成
   */
  public createChatRoom(name: string, description?: string): UIChatRoom {
    const newChatRoom: UIChatRoom = {
      id: uuidv4(),
      nest_id: this.nestId,
      name,
      description,
      created_at: new Date().toISOString(),
      created_by: this.userId,
      is_default: false,
      is_archived: false,
      participants: [
        {
          id: this.userId,
          name: this.userName,
          isOnline: true
        }
      ],
      unreadCount: 0
    };
    
    this.chatRooms.push(newChatRoom);
    this.messages[newChatRoom.id] = [];
    
    // 作成メッセージを追加
    this.addWelcomeMessage(newChatRoom.id);
    
    return newChatRoom;
  }

  /**
   * メッセージの送信
   */
  public sendMessage(chatRoomId: string, content: string, replyToId?: string): UIMessage {
    const newMessage: UIMessage = {
      id: uuidv4(),
      nest_id: this.nestId,
      chat_room_id: chatRoomId,
      sender_id: this.userId,
      content: content.trim(),
      created_at: new Date().toISOString(),
      is_edited: false,
      has_pinned_to_board: false,
      reply_to_id: replyToId,
      sender: {
        id: this.userId,
        name: this.userName,
        isBot: false
      },
      status: 'sent'
    };
    
    // メッセージ配列がなければ初期化
    if (!this.messages[chatRoomId]) {
      this.messages[chatRoomId] = [];
    }
    
    // メッセージを追加
    this.messages[chatRoomId].push(newMessage);
    
    // チャットルームの最終メッセージを更新
    this.updateLastMessage(chatRoomId, newMessage);
    
    return newMessage;
  }

  /**
   * チャットルームの最終メッセージを更新
   */
  private updateLastMessage(chatRoomId: string, message: UIMessage): void {
    const chatRoomIndex = this.chatRooms.findIndex(room => room.id === chatRoomId);
    
    if (chatRoomIndex >= 0) {
      this.chatRooms[chatRoomIndex] = {
        ...this.chatRooms[chatRoomIndex],
        lastMessage: {
          content: message.content,
          sender_id: message.sender_id,
          sender_name: message.sender.name,
          timestamp: message.created_at,
          status: 'sent'
        }
      };
    }
  }

  /**
   * メッセージを既読にする
   */
  public markMessagesAsRead(chatRoomId: string, messageIds: string[]): void {
    if (!this.messages[chatRoomId]) return;
    
    this.messages[chatRoomId] = this.messages[chatRoomId].map(msg => {
      if (messageIds.includes(msg.id)) {
        return {
          ...msg,
          status: 'read',
          read_by: {
            ...msg.read_by,
            [this.userId]: Date.now()
          }
        };
      }
      return msg;
    });
    
    // チャットルームの未読カウントをリセット
    const chatRoomIndex = this.chatRooms.findIndex(room => room.id === chatRoomId);
    if (chatRoomIndex >= 0) {
      this.chatRooms[chatRoomIndex].unreadCount = 0;
    }
  }

  /**
   * メッセージの削除
   */
  public deleteMessage(chatRoomId: string, messageId: string): void {
    if (!this.messages[chatRoomId]) return;
    
    this.messages[chatRoomId] = this.messages[chatRoomId].filter(msg => msg.id !== messageId);
  }
} 