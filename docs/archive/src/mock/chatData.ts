import { ChatMessage, Chat } from '../types/chat';
// uuid関数の代わりにシンプルなID生成関数を使用
const generateId = () => {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
};

// モックチャットデータ
export const mockChats: Chat[] = [
  {
    id: '1',
    title: 'ポコ（アシスタント）',
    participants: [
      {
        id: 'bot',
        name: 'ポコ',
        avatar: 'https://via.placeholder.com/50',
        isOnline: true,
      }
    ],
    lastMessage: {
      content: 'こんにちは！何かお手伝いできることはありますか？',
      sender: 'bot',
      timestamp: new Date(2023, 8, 15, 9, 30).toISOString(),
      status: 'read',
    },
    updatedAt: new Date(2023, 8, 15, 9, 30).toISOString(),
    createdAt: new Date(2023, 8, 1).toISOString(),
    unreadCount: 0,
    type: 'bot',
  },
  {
    id: '2',
    title: 'プロジェクトチーム',
    participants: [
      {
        id: 'user2',
        name: '田中',
        avatar: 'https://via.placeholder.com/50',
        isOnline: false,
      },
      {
        id: 'user3',
        name: '佐藤',
        avatar: 'https://via.placeholder.com/50',
        isOnline: true,
      }
    ],
    lastMessage: {
      content: '次の会議は明日の14時からですね',
      sender: 'user2',
      timestamp: new Date(2023, 8, 14, 17, 15).toISOString(),
      status: 'delivered',
    },
    updatedAt: new Date(2023, 8, 14, 17, 15).toISOString(),
    createdAt: new Date(2023, 7, 15).toISOString(),
    unreadCount: 2,
    type: 'group',
  },
  {
    id: '3',
    title: '山田',
    participants: [
      {
        id: 'user4',
        name: '山田',
        avatar: 'https://via.placeholder.com/50',
        isOnline: false,
      }
    ],
    lastMessage: {
      content: '資料を確認しました。明日までに修正版を送ります。',
      sender: 'user4',
      timestamp: new Date(2023, 8, 13, 12, 45).toISOString(),
      status: 'read',
    },
    updatedAt: new Date(2023, 8, 13, 12, 45).toISOString(),
    createdAt: new Date(2023, 6, 20).toISOString(),
    unreadCount: 0,
    type: 'direct',
  },
];

// モックメッセージデータ
export const mockMessages: ChatMessage[] = [
  // ポコとのチャット
  {
    id: "mock1",
    chatId: '1',
    content: 'こんにちは！何かお手伝いできることはありますか？',
    createdAt: new Date(2023, 8, 15, 9, 30).toISOString(),
    sender: {
      id: 'bot',
      name: 'ポコ',
      avatar: 'https://via.placeholder.com/40',
      isBot: true,
    },
    status: 'read',
  },
  {
    id: "mock2",
    chatId: '1',
    content: 'プロジェクトの進捗を教えてください',
    createdAt: new Date(2023, 8, 15, 9, 32).toISOString(),
    sender: {
      id: '1',
      name: 'ユーザー',
    },
    status: 'read',
  },
  {
    id: "mock3",
    chatId: '1',
    content: '現在のプロジェクト進捗状況は以下の通りです：\n・デザイン：80%完了\n・フロントエンド：60%完了\n・バックエンド：40%完了\n次のマイルストーンは来週金曜日です。',
    createdAt: new Date(2023, 8, 15, 9, 33).toISOString(),
    sender: {
      id: 'bot',
      name: 'ポコ',
      avatar: 'https://via.placeholder.com/40',
      isBot: true,
    },
    status: 'read',
  },
  
  // プロジェクトチームとのチャット
  {
    id: "mock4",
    chatId: '2',
    content: '皆さん、プロジェクトの進捗状況を教えてください',
    createdAt: new Date(2023, 8, 14, 16, 0).toISOString(),
    sender: {
      id: '1',
      name: 'ユーザー',
    },
    status: 'read',
  },
  {
    id: "mock5",
    chatId: '2',
    content: 'デザインはほぼ完了しています。残りは細かい調整のみです。',
    createdAt: new Date(2023, 8, 14, 16, 10).toISOString(),
    sender: {
      id: 'user2',
      name: '田中',
      avatar: 'https://via.placeholder.com/40',
    },
    status: 'read',
  },
  {
    id: "mock6",
    chatId: '2',
    content: 'バックエンドはAPI開発が遅れています。来週中には完了予定です。',
    createdAt: new Date(2023, 8, 14, 16, 15).toISOString(),
    sender: {
      id: 'user3',
      name: '佐藤',
      avatar: 'https://via.placeholder.com/40',
    },
    status: 'read',
  },
  {
    id: "mock7",
    chatId: '2',
    content: '次の会議は明日の14時からですね',
    createdAt: new Date(2023, 8, 14, 17, 15).toISOString(),
    sender: {
      id: 'user2',
      name: '田中',
      avatar: 'https://via.placeholder.com/40',
    },
    status: 'delivered',
  },
  
  // 山田とのチャット
  {
    id: "mock8",
    chatId: '3',
    content: '企画書のフィードバックをお願いします',
    createdAt: new Date(2023, 8, 13, 10, 0).toISOString(),
    sender: {
      id: '1',
      name: 'ユーザー',
    },
    status: 'read',
  },
  {
    id: "mock9",
    chatId: '3',
    content: '今確認しています。午後には返信します。',
    createdAt: new Date(2023, 8, 13, 10, 15).toISOString(),
    sender: {
      id: 'user4',
      name: '山田',
      avatar: 'https://via.placeholder.com/40',
    },
    status: 'read',
  },
  {
    id: "mock10",
    chatId: '3',
    content: '資料を確認しました。明日までに修正版を送ります。',
    createdAt: new Date(2023, 8, 13, 12, 45).toISOString(),
    sender: {
      id: 'user4',
      name: '山田',
      avatar: 'https://via.placeholder.com/40',
    },
    status: 'read',
  },
]; 