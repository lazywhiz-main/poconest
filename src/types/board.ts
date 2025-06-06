// Board column types
// NOTE: BoardColumnType is a type alias, not an enum. All values should be uppercase (e.g., 'INBOX').
export type BoardColumnType = 'INBOX' | 'QUESTIONS' | 'INSIGHTS' | 'THEMES' | 'ACTIONS';

// Card interface that represents a board item
export interface Card {
  id: string;
  title: string;
  description: string;
  column: BoardColumnType;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by?: string;
  tags?: string[];
  order: number;
  sourceType?: 'chat' | 'zoom' | 'manual' | 'ai';
  sourceId?: string;
  metadata?: Record<string, any>;
  sources?: {
    id: string;
    type: string;
    label: string;
    meta?: Record<string, any>;
  }[];
}

// Board view settings
export interface BoardViewSettings {
  sortBy: 'createdAt' | 'updatedAt' | 'title';
  sortDirection: 'asc' | 'desc';
  filter: {
    tags?: string[];
    search?: string;
    dateRange?: {
      start: string;
      end: string;
    };
  };
}

// Card relationship type for network visualization
export interface CardRelationship {
  sourceCardId: string;
  targetCardId: string;
  relationshipType: 'derived' | 'related' | 'referenced' | 'similar';
  strength: number; // 0-1, representing relationship strength
  metadata?: Record<string, unknown>;
}

// AI suggestion for card organization
export interface AICardSuggestion {
  id: string;
  type: 'tag' | 'cluster' | 'promote' | 'connect';
  description: string;
  affectedCardIds: string[];
  suggestedAction: string;
  confidence: number;
  dismissed: boolean;
}

// Data for new card creation
export interface CreateCardData {
  title: string;
  description: string;
  column: BoardColumnType;
  tags?: string[];
  sourceType?: 'chat' | 'zoom' | 'manual' | 'ai';
  sourceId?: string;
  metadata?: Record<string, any>;
}

// Data for updating an existing card
export interface UpdateCardData {
  title?: string;
  description?: string;
  column?: BoardColumnType;
  tags?: string[];
  metadata?: Record<string, any>;
}

// AI関連メタデータの型定義
export interface AIMetadata {
  ai?: {
    meeting_id?: string;
    type?: 'task' | 'idea' | 'issue' | 'decision' | 'note';
    priority?: 'high' | 'medium' | 'low';
    assignee?: string;
    deadline?: string;
    generated_by?: string;
    generated_at?: string;
  };
}

// 実際のDBスキーマに対応したボードカードの型定義
export interface BoardCard {
  id: string;
  board_id: string;
  title: string;
  content: string;
  column_type: string; // 'inbox', 'todo', 'review', 'done' など
  order_index: number;
  is_archived: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  updated_by?: string;
  source_message_id?: string;
  metadata: Record<string, any>; // AI情報などを含むJSON
}

// UI用のカード型（AI情報を展開）
export interface BoardCardUI {
  id: string;
  boardId: string;
  title: string;
  content: string;
  columnType: string;
  orderIndex: number;
  isArchived: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  updatedBy?: string;
  sourceMessageId?: string;
  // AI関連情報（metadataから抽出）
  meetingId?: string;
  type?: 'task' | 'idea' | 'issue' | 'decision' | 'note';
  priority?: 'high' | 'medium' | 'low';
  assignee?: string;
  deadline?: string;
  generatedBy?: string;
  generatedAt?: string;
  // その他のメタデータ
  metadata: Record<string, any>;
  sources?: {
    id: string;
    type: string;
    label: string;
    meta?: Record<string, any>;
  }[];
  relatedCards?: {
    id: string;
    title: string;
    label?: string;
  }[];
}

// 変換関数（metadataからAI情報を抽出）
export function toBoardCardUI(card: BoardCard): BoardCardUI {
  const aiData = (card.metadata as AIMetadata)?.ai;
  
  return {
    id: card.id,
    boardId: card.board_id,
    title: card.title,
    content: card.content,
    columnType: card.column_type,
    orderIndex: card.order_index,
    isArchived: card.is_archived,
    createdBy: card.created_by,
    createdAt: card.created_at,
    updatedAt: card.updated_at,
    updatedBy: card.updated_by,
    sourceMessageId: card.source_message_id,
    // AI情報を展開
    meetingId: aiData?.meeting_id,
    type: aiData?.type,
    priority: aiData?.priority,
    assignee: aiData?.assignee,
    deadline: aiData?.deadline,
    generatedBy: aiData?.generated_by,
    generatedAt: aiData?.generated_at,
    metadata: card.metadata,
    sources: (card as any).sources || [],
    relatedCards: (card as any).related_cards || (card as any).relatedCards || [],
  };
}

export function toBoardCard(card: BoardCardUI): BoardCard {
  const aiMetadata: AIMetadata = {
    ai: {
      meeting_id: card.meetingId,
      type: card.type,
      priority: card.priority,
      assignee: card.assignee,
      deadline: card.deadline,
      generated_by: card.generatedBy,
      generated_at: card.generatedAt,
    }
  };

  return {
    id: card.id,
    board_id: card.boardId,
    title: card.title,
    content: card.content,
    column_type: card.columnType,
    order_index: card.orderIndex,
    is_archived: card.isArchived,
    created_by: card.createdBy,
    created_at: card.createdAt,
    updated_at: card.updatedAt,
    updated_by: card.updatedBy,
    source_message_id: card.sourceMessageId,
    metadata: { ...card.metadata, ...aiMetadata },
  };
}

// ボードカラムの型定義
export interface BoardColumn {
  id: string;
  board_id: string;
  title: string;
  position: number;
  created_at: string;
  updated_at: string;
}

// ボードの型定義
export interface Board {
  id: string;
  nest_id: string;
  title: string;
  description?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
} 