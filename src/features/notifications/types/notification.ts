export type NotificationType = 
  | 'ai_insight'           // AI洞察
  | 'ai_summary'           // AI要約完了
  | 'card_extraction'      // カード抽出完了
  | 'transcription'        // 転写完了
  | 'mention'              // メンション
  | 'meeting_update'       // ミーティング更新
  | 'nest_invite'          // NEST招待
  | 'member_join'          // メンバー参加
  | 'system'               // システム通知
  | 'urgent'               // 緊急通知
  | 'knowledge_graph';     // 知識グラフ更新

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export type NotificationStatus = 'unread' | 'read' | 'archived';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  content: string;
  priority: NotificationPriority;
  status: NotificationStatus;
  data: NotificationData;
  createdAt: Date;
  updatedAt?: Date;
  readAt?: Date;
  expiresAt?: Date;
  // UI関連
  actionable?: boolean;
}

export interface NotificationData {
  // ジョブ関連
  jobId?: string;
  jobType?: string;
  meetingId?: string;
  nestId?: string;
  
  // AI関連
  aiInsight?: {
    confidence: number;
    relatedItems: string[];
    recommendations: string[];
  };
  
  // メンション関連
  mentionBy?: {
    userId: string;
    userName: string;
    avatarUrl?: string;
  };
  
  // アクション関連
  actions?: NotificationAction[];
  
  // 結果データ
  result?: any;
  
  // メタデータ
  metadata?: Record<string, any>;
}

export interface NotificationAction {
  id: string;
  label: string;
  type: 'primary' | 'secondary' | 'danger';
  action: 'navigate' | 'api_call' | 'dismiss' | 'copy' | 'download';
  payload?: Record<string, any>;
}

// フィルタリング用
export interface NotificationFilter {
  types?: NotificationType[];
  priorities?: NotificationPriority[];
  status?: NotificationStatus[];
  nestIds?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  searchQuery?: string;
}

// 通知設定
export interface NotificationSettings {
  enabled: boolean;
  browserNotifications: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
  
  // タイプ別設定
  typeSettings: Record<NotificationType, {
    enabled: boolean;
    priority: NotificationPriority;
    showBrowser: boolean;
    showEmail: boolean;
  }>;
  
  // 時間設定
  quietHours?: {
    enabled: boolean;
    start: string; // HH:mm format
    end: string;   // HH:mm format
  };
  
  // バッチ通知設定
  digestSettings?: {
    enabled: boolean;
    frequency: 'hourly' | 'daily' | 'weekly';
    maxItems: number;
  };
}

// API用インターフェース
export interface CreateNotificationRequest {
  userId: string;
  type: NotificationType;
  title: string;
  content: string;
  priority?: NotificationPriority;
  data?: Partial<NotificationData>;
  expiresAt?: Date;
}

export interface UpdateNotificationRequest {
  status?: NotificationStatus;
  readAt?: Date;
  data?: Partial<NotificationData>;
}

export interface NotificationStats {
  total: number;
  unread: number;
  byType: Record<NotificationType, number>;
  byPriority: Record<NotificationPriority, number>;
  recent: number; // 24時間以内
}

// リアルタイム用
export interface NotificationSubscription {
  userId: string;
  types: NotificationType[];
  callback: (notification: Notification) => void;
} 