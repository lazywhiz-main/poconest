/**
 * インサイト関連の型定義
 */

// インサイトの種類
export enum InsightType {
  SUMMARY = 'summary',
  KEY_POINT = 'key_point',
  ACTION_ITEM = 'action_item',
  QUESTION = 'question',
  KEYWORD = 'keyword',
  DECISION = 'decision',
  CUSTOM = 'custom'
}

// インサイトの優先度
export enum InsightPriority {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

// インサイトの型
export interface Insight {
  id: string;
  type: InsightType;
  content: string;
  priority: InsightPriority;
  sourceChatId: string;
  sourceMessageIds: string[];
  createdAt: string;
  updatedAt?: string;
  isReviewed: boolean;
  isSaved: boolean;
  category?: string;
  metadata?: Record<string, any>;
  cardId?: string;
  context?: string;  // 会話の文脈情報
}

// 新しいインサイト作成用の型（必須フィールドのみ）
export interface InsightInput {
  type: InsightType;
  content: string;
  sourceChatId: string;
  sourceMessageIds: string[];
  priority?: InsightPriority;
  category?: string;
  metadata?: Record<string, any>;
}

// インサイト検索クエリの型
export interface InsightQuery {
  types?: InsightType[];
  chatIds?: string[];
  isReviewed?: boolean;
  isSaved?: boolean;
  priority?: InsightPriority[];
  category?: string;
  searchText?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'priority' | 'type';
  sortDirection?: 'asc' | 'desc';
}

export interface InsightGenerationSettings {
  autoGenerate: boolean;
  minMessageCount: number;
  contextWindowSize: number;
  notificationPreference: 'immediate' | 'batched' | 'silent';
  priorityThreshold: InsightPriority;
} 