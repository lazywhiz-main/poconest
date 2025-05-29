// Board column types
export enum BoardColumnType {
  INBOX = 'inbox',
  INSIGHTS = 'insights',
  THEMES = 'themes',
  ZOOM = 'zoom'
}

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