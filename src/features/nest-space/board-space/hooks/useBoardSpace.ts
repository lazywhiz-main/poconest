import { useCallback, useState, useEffect, useMemo } from 'react';
import { useBoardContext } from '../../../board-space/contexts/BoardContext';
// import { useNestSpace } from '../../contexts/_NestSpaceContext.tsx';
import { useNestSpace } from '@contexts/NestSpaceContext';
import { SpaceType } from 'src/types/nestSpace.types';
import { BoardColumnType, Card, BoardViewSettings } from '../../../../types/board';
import { useChatSpace } from '../../chat-space/hooks/useChatSpace';
import { getCardSources } from '../../../../services/BoardService';
import type { BoardItem } from '../../../../services/SmartClusteringService';
import { v4 as uuidv4 } from 'uuid';

export interface BoardFilter {
  search: string;
  tags: string[];
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
  columnTypes: BoardColumnType[];
  sources: string[];
  priority: ('high' | 'medium' | 'low')[];
  assignee: string[];
  createdBy: string[];
}

export interface BoardSpaceState {
  activeColumn: BoardColumnType;
  filters: BoardFilter;
  selectedCardIds: string[];
  isSelectionMode: boolean;
  viewMode: 'column' | 'grid' | 'timeline' | 'network';
  groupBy: 'none' | 'tag' | 'date' | 'source';
  sortBy: 'createdAt' | 'updatedAt' | 'title';
  sortDirection: 'asc' | 'desc';
  showAIClusteringSuggestions: boolean;
  aiSuggestions: AICardSuggestion[];
  pinnedCards: string[];
  expandedCards: string[];
  relationshipView: boolean;
  zoomLevel: number;
}

export interface AICardSuggestion {
  id: string;
  type: 'tag' | 'cluster' | 'promote' | 'connect';
  description: string;
  affectedCardIds: string[];
  suggestedAction: string;
  confidence: number;
  dismissed: boolean;
}

export interface CardRelationship {
  sourceCardId: string;
  targetCardId: string;
  relationshipType: 'derived' | 'related' | 'referenced' | 'similar';
  strength: number; // 0-1, representing relationship strength
  metadata?: Record<string, unknown>;
}

export const useBoardSpace = () => {
  // Access the main board context and nest space context
  const {
    state,
    dispatch,
    addCards,
    updateCard,
    deleteCard,
    getCardsByColumn,
    // ... other context methods
  } = useBoardContext();
  
  const { isSpaceActive, navigateToSpace } = useNestSpace();
  const { chatSpaceState, chatRooms, messages } = useChatSpace();
  
  // Board space specific state
  const [boardSpaceState, setBoardSpaceState] = useState<BoardSpaceState>({
    activeColumn: 'INBOX',
    filters: {
      search: '',
      tags: [],
      dateRange: { start: null, end: null },
      columnTypes: [],
      sources: [],
      priority: [],
      assignee: [],
      createdBy: [],
    },
    selectedCardIds: [],
    isSelectionMode: false,
    viewMode: 'column',
    groupBy: 'none',
    sortBy: 'updatedAt',
    sortDirection: 'desc',
    showAIClusteringSuggestions: true,
    aiSuggestions: [],
    pinnedCards: [],
    expandedCards: [],
    relationshipView: false,
    zoomLevel: 1,
  });
  
  // Relationships between cards (for graph view)
  const [relationships, setRelationships] = useState<CardRelationship[]>([]);
  
  // Ensure board space is properly activated in the space context
  useEffect(() => {
    if (!isSpaceActive(SpaceType.BOARD)) {
      navigateToSpace(SpaceType.BOARD);
    }
  }, []); // 依存配列を空にして初回のみ実行
  
  // Sync active column with the main board context
  useEffect(() => {
    if (state.filter.columns[0] !== boardSpaceState.activeColumn) {
      dispatch({ type: 'UPDATE_FILTER', payload: { columns: [state.filter.columns[0] || 'INBOX'] } });
    }
  }, [state.filter.columns, dispatch, boardSpaceState.activeColumn]);
  
  // Set the active column
  const setActiveColumn = useCallback((column: BoardColumnType) => {
    dispatch({ type: 'UPDATE_FILTER', payload: { columns: [column] } });
  }, [dispatch]);
  
  // Get cards for a specific column
  const getCardsByColumnLocal = useCallback((column: BoardColumnType): BoardItem[] => {
    return state.cards.filter((card: BoardItem) => card.column_type === column);
  }, [state.cards]);

  // Load card sources
  const loadCardSources = useCallback(async (cardId: string) => {
    const { data: sources, error } = await getCardSources(cardId);
    if (error) {
      console.error('Failed to load card sources:', error);
      return;
    }
    if (sources) {
      updateCard({ id: cardId, metadata: { ...(state.cards.find(c => c.id === cardId)?.metadata || {}), sources } });
    }
  }, [updateCard, state.cards]);

  // Load sources for all cards
  useEffect(() => {
    state.cards.forEach((card: BoardItem) => {
      if (card.metadata?.source && !(card.metadata && card.metadata.sources)) {
        loadCardSources(card.id);
      }
    });
  }, [state.cards, loadCardSources]);
  
  // Get currently displayed cards based on active column and filters
  const filteredCards = useMemo(() => {
    const columnCards = getCardsByColumnLocal(boardSpaceState.activeColumn);
    
    // Apply filters
    return columnCards.filter((card: BoardItem) => {
      // Tag filter
      if (boardSpaceState.filters.tags.length > 0) {
        if (!card.tags || !card.tags.some((tag: string) => boardSpaceState.filters.tags.includes(tag))) {
          return false;
        }
      }
      
      // Search filter
      if (boardSpaceState.filters.search) {
        const searchTerm = boardSpaceState.filters.search.toLowerCase();
        if (!card.title.toLowerCase().includes(searchTerm) &&
            !card.content.toLowerCase().includes(searchTerm) &&
            !(card.tags && card.tags.some((tag: string) => tag.toLowerCase().includes(searchTerm)))) {
          return false;
        }
      }
      
      // Date range filter
      if (boardSpaceState.filters.dateRange.start || boardSpaceState.filters.dateRange.end) {
        const cardDate = new Date(card.updated_at);
        if (boardSpaceState.filters.dateRange.start && cardDate < boardSpaceState.filters.dateRange.start) {
          return false;
        }
        if (boardSpaceState.filters.dateRange.end && cardDate > boardSpaceState.filters.dateRange.end) {
          return false;
        }
      }
      
      // Column type filter
      if (boardSpaceState.filters.columnTypes.length > 0) {
        if (!boardSpaceState.filters.columnTypes.includes(card.column_type)) {
          return false;
        }
      }
      
      // Source filter
      if (boardSpaceState.filters.sources.length > 0) {
        const cardSource = card.metadata?.source || card.metadata?.ai?.generated_by || card.sources?.[0]?.type;
        if (!cardSource || !boardSpaceState.filters.sources.includes(cardSource)) {
          return false;
        }
      }
      
      // Priority filter
      if (boardSpaceState.filters.priority.length > 0) {
        const cardPriority = card.metadata?.priority;
        if (!cardPriority || !boardSpaceState.filters.priority.includes(cardPriority)) {
          return false;
        }
      }
      
      // Assignee filter
      if (boardSpaceState.filters.assignee.length > 0) {
        const cardAssignee = card.metadata?.assignee;
        if (!cardAssignee || !boardSpaceState.filters.assignee.includes(cardAssignee)) {
          return false;
        }
      }
      
      // Created by filter
      if (boardSpaceState.filters.createdBy.length > 0) {
        const cardCreator = card.metadata?.created_by || card.created_by;
        if (!cardCreator || !boardSpaceState.filters.createdBy.includes(cardCreator)) {
          return false;
        }
      }
      
      return true;
    });
  }, [state.cards, boardSpaceState.activeColumn, boardSpaceState.filters, getCardsByColumnLocal]);
  
  // Sort filtered cards based on sort settings
  const sortedCards = useMemo(() => {
    return [...filteredCards].sort((a, b) => {
      let comparison = 0;
      
      // First sort by pinned status
      const aIsPinned = boardSpaceState.pinnedCards.includes(a.id);
      const bIsPinned = boardSpaceState.pinnedCards.includes(b.id);
      
      if (aIsPinned && !bIsPinned) return -1;
      if (!aIsPinned && bIsPinned) return 1;
      
      // Then sort by the selected sort criterion
      switch (boardSpaceState.sortBy) {
        case 'createdAt':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'updatedAt':
          comparison = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
          break;
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        default:
          comparison = a.order_index - b.order_index;
      }
      
      // Apply sort direction
      return boardSpaceState.sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredCards, boardSpaceState.sortBy, boardSpaceState.sortDirection, boardSpaceState.pinnedCards]);
  
  // Toggle card selection
  const toggleCardSelection = useCallback((cardId: string) => {
    setBoardSpaceState(prev => {
      const isSelected = prev.selectedCardIds.includes(cardId);
      const newSelectedIds = isSelected
        ? prev.selectedCardIds.filter(id => id !== cardId)
        : [...prev.selectedCardIds, cardId];
        
      return {
        ...prev,
        selectedCardIds: newSelectedIds,
        isSelectionMode: newSelectedIds.length > 0
      };
    });
  }, []);
  
  // Start selection mode
  const startSelectionMode = useCallback((initialCardId?: string) => {
    setBoardSpaceState(prev => ({
      ...prev,
      isSelectionMode: true,
      selectedCardIds: initialCardId ? [initialCardId] : []
    }));
  }, []);
  
  // Cancel selection mode
  const cancelSelectionMode = useCallback(() => {
    setBoardSpaceState(prev => ({
      ...prev,
      isSelectionMode: false,
      selectedCardIds: []
    }));
  }, []);
  
  // Update filters
  const updateFilters = useCallback((newFilters: Partial<BoardFilter>) => {
    setBoardSpaceState(prev => ({
      ...prev,
      filters: {
        ...prev.filters,
        ...newFilters
      }
    }));
  }, []);
  
  // Clear all filters
  const clearFilters = useCallback(() => {
    setBoardSpaceState(prev => ({
      ...prev,
      filters: {
        search: '',
        tags: [],
        dateRange: { start: null, end: null },
        columnTypes: [],
        sources: [],
        priority: [],
        assignee: [],
        createdBy: [],
      }
    }));
  }, []);
  
  // Change view mode
  const setViewMode = useCallback((mode: BoardSpaceState['viewMode']) => {
    setBoardSpaceState(prev => ({
      ...prev,
      viewMode: mode
    }));
  }, []);
  
  // Toggle pin state for a card
  const togglePinCard = useCallback((cardId: string) => {
    setBoardSpaceState(prev => {
      const isPinned = prev.pinnedCards.includes(cardId);
      return {
        ...prev,
        pinnedCards: isPinned
          ? prev.pinnedCards.filter(id => id !== cardId)
          : [...prev.pinnedCards, cardId]
      };
    });
  }, []);
  
  // Toggle expanded state for a card
  const toggleExpandCard = useCallback((cardId: string) => {
    setBoardSpaceState(prev => {
      const isExpanded = prev.expandedCards.includes(cardId);
      return {
        ...prev,
        expandedCards: isExpanded
          ? prev.expandedCards.filter(id => id !== cardId)
          : [...prev.expandedCards, cardId]
      };
    });
  }, []);
  
  // Change sorting criteria
  const setSorting = useCallback((sortBy: BoardSpaceState['sortBy'], sortDirection: BoardSpaceState['sortDirection']) => {
    setBoardSpaceState(prev => ({
      ...prev,
      sortBy,
      sortDirection
    }));
  }, []);
  
  // Set grouping mode
  const setGroupBy = useCallback((groupBy: BoardSpaceState['groupBy']) => {
    setBoardSpaceState(prev => ({
      ...prev,
      groupBy
    }));
  }, []);
  
  // Generate AI suggestions for card organization
  const generateAISuggestions = useCallback(async () => {
    // In a real implementation, this would call an AI service
    // For now, we'll generate some mock suggestions
    
    const mockSuggestions: AICardSuggestion[] = [
      {
        id: '1',
        type: 'tag' as const,
        description: 'これらのカードに "プロジェクト計画" タグを追加することを推奨します',
        affectedCardIds: sortedCards.slice(0, 3).map(card => card.id),
        suggestedAction: 'タグ "プロジェクト計画" を追加',
        confidence: 0.85,
        dismissed: false
      },
      {
        id: '2',
        type: 'cluster' as const,
        description: 'これらのカードは関連性が高いため、新しいグループを作成することを推奨します',
        affectedCardIds: sortedCards.slice(2, 5).map(card => card.id),
        suggestedAction: '新しいグループを作成',
        confidence: 0.78,
        dismissed: false
      },
      {
        id: '3',
        type: 'promote' as const,
        description: 'このカードは重要な情報を含んでいるため、Insightsに昇格させることを推奨します',
        affectedCardIds: [sortedCards[0]?.id].filter(Boolean),
        suggestedAction: 'Insightsに昇格',
        confidence: 0.92,
        dismissed: false
      }
    ].filter(suggestion => 
      // Only include suggestions where affected cards actually exist
      suggestion.affectedCardIds.length > 0
    );
    
    setBoardSpaceState(prev => ({
      ...prev,
      aiSuggestions: mockSuggestions,
      showAIClusteringSuggestions: true
    }));
    
    return mockSuggestions;
  }, [sortedCards]);
  
  // Dismiss an AI suggestion
  const dismissAISuggestion = useCallback((suggestionId: string) => {
    setBoardSpaceState(prev => ({
      ...prev,
      aiSuggestions: prev.aiSuggestions.map(suggestion => 
        suggestion.id === suggestionId 
          ? { ...suggestion, dismissed: true } 
          : suggestion
      )
    }));
  }, []);
  
  // Apply an AI suggestion
  const applyAISuggestion = useCallback(async (suggestionId: string) => {
    const suggestion = boardSpaceState.aiSuggestions.find(s => s.id === suggestionId);
    if (!suggestion) return false;
    
    try {
      switch (suggestion.type) {
        case 'tag':
          // Extract tag from suggested action
          const tagMatch = suggestion.suggestedAction.match(/"([^"]+)"/);
          if (tagMatch) {
            const tag = tagMatch[1];
            
            // Update each affected card with the new tag
            for (const cardId of suggestion.affectedCardIds) {
              const card = state.cards.find(c => c.id === cardId);
              if (card) {
                const currentTags = card.tags || [];
                if (!currentTags.includes(tag)) {
                  await updateCard({
                    id: cardId,
                    tags: [...currentTags, tag]
                  });
                }
              }
            }
          }
          break;
          
        case 'promote':
          // Promote each card to insights
          for (const cardId of suggestion.affectedCardIds) {
            // await dispatch({ type: 'PROMOTE_CARD_TO_INSIGHT', payload: { cardId } });
          }
          break;
          
        case 'cluster':
          // Select the affected cards
          setBoardSpaceState(prev => ({
            ...prev,
            selectedCardIds: suggestion.affectedCardIds,
            isSelectionMode: true
          }));
          break;
      }
      
      // Mark suggestion as dismissed after applying
      dismissAISuggestion(suggestionId);
      return true;
    } catch (error) {
      console.error('Error applying AI suggestion:', error);
      return false;
    }
  }, [state.cards, dispatch, dismissAISuggestion]);
  
  // Create a card from a chat message
  const createCardFromChatMessage = useCallback(async (messageId: string, chatRoomId: string) => {
    try {
      if (!messages[chatRoomId]) return null;
      
      const message = messages[chatRoomId].find(m => m.id === messageId);
      if (!message) return null;
      
      const chatRoom = chatRooms.find(room => room.id === chatRoomId);
      
      // Create a new card from the message
      const now = new Date().toISOString();
      const newCard: BoardItem = {
        id: uuidv4(),
        board_id: state.boardId ?? '',
        title: message.content.length > 50 
          ? `${message.content.substring(0, 47)}...` 
          : message.content,
        description: message.content,
        content: message.content,
        column_type: 'INBOX',
        created_by: message.sender.id,
        created_by_display_name: message.sender.name || '',
        created_at: now,
        updated_at: now,
        order_index: 0,
        tags: ['チャット', chatRoom?.name || 'メッセージ'],
        is_archived: false,
        metadata: {
          messageId,
          senderName: message.sender.name,
          messageTimestamp: message.created_at,
          isFromChat: true,
          source: 'chat',
          source_message_id: chatRoomId,
        },
      };
      
      await addCards([newCard]);
      return newCard;
    } catch (error) {
      console.error('Error creating card from chat message:', error);
      return null;
    }
  }, [addCards, chatRooms, messages]);
  
  // Find cards related to a specific chat message
  const findCardsFromChatMessage = useCallback((messageId: string, chatRoomId: string) => {
    return state.cards.filter((card: BoardItem) => 
      card.metadata?.source === 'chat' && 
      card.metadata?.source_message_id === chatRoomId && 
      card.metadata?.messageId === messageId
    );
  }, [state.cards]);
  
  // Find chat messages related to a specific card
  const findChatMessagesFromCard = useCallback((cardId: string) => {
    const card = state.cards.find((c: BoardItem) => c.id === cardId);
    if (!card || card.metadata?.source !== 'chat' || !card.metadata?.source_message_id || !card.metadata?.messageId) {
      return [];
    }
    const chatId = card.metadata?.source_message_id;
    const messageId = card.metadata.messageId;
    if (!messages[chatId]) return [];
    return messages[chatId].filter(message => message.id === messageId);
  }, [state.cards, messages]);
  
  // Build the network graph data based on card relationships
  const getNetworkGraphData = useCallback(() => {
    const nodes = sortedCards.map(card => ({
      id: card.id,
      label: card.title,
      column: card.column_type,
      tags: card.tags || [],
      created: card.created_at,
    }));
    
    // Get relationships between cards
    const edges: { from: string; to: string; strength: number; type: string }[] = [];
    
    // Add existing defined relationships
    relationships.forEach(rel => {
      edges.push({
        from: rel.sourceCardId,
        to: rel.targetCardId,
        strength: rel.strength,
        type: rel.relationshipType
      });
    });
    
    // Add relationships from cards in the same theme
    sortedCards.forEach(card => {
      if (card.column_type === 'THEMES' && card.metadata?.relatedInsightIds) {
        const relatedIds = card.metadata.relatedInsightIds as string[];
        relatedIds.forEach(relatedId => {
          if (!edges.some(e => (e.from === card.id && e.to === relatedId) || (e.from === relatedId && e.to === card.id))) {
            edges.push({
              from: card.id,
              to: relatedId,
              strength: 0.9,
              type: 'derived'
            });
          }
        });
      }
    });
    
    return { nodes, edges };
  }, [sortedCards, relationships]);
  
  // BoardCard用の型変換（BoardItem→Card）
  const convertToCard = (item: BoardItem): Card => ({
    id: item.id,
    title: item.title,
    description: item.content,
    column: item.column_type,
    created_at: item.created_at,
    updated_at: item.updated_at,
    created_by: item.created_by,
    updated_by: item.updated_at,
    tags: item.tags,
    order: item.order_index,
    sourceId: item.metadata?.source_message_id,
    metadata: item.metadata,
    sources: item.metadata?.sources,
  });

  // BoardCardで使うカードリスト
  const boardCards = filteredCards.map(convertToCard);

  // 利用可能なユーザーリストを取得（フィルター用）
  const availableUsers = useMemo(() => {
    const users = new Set<string>();
    
    // カードから担当者と作成者を収集
    state.cards.forEach(card => {
      if (card.metadata?.assignee) {
        users.add(card.metadata.assignee);
      }
      if (card.metadata?.created_by || card.created_by) {
        users.add(card.metadata?.created_by || card.created_by);
      }
    });
    
    // ユーザーIDを名前付きオブジェクトに変換
    return Array.from(users).map(userId => ({
      id: userId,
      name: userId // TODO: 実際のユーザー名を取得する実装が必要
    }));
  }, [state.cards]);

  return {
    // External board context
    allCards: state.cards,
    
    // Board space specific state and filtered data
    boardSpaceState,
    filteredCards: boardCards,
    
    // Available users for filtering
    availableUsers,
    
    // Column and filtering functions
    setActiveColumn,
    updateFilters,
    clearFilters,
    
    // Selection functions
    toggleCardSelection,
    startSelectionMode,
    cancelSelectionMode,
    
    // View control functions
    setViewMode,
    setGroupBy,
    setSorting,
    togglePinCard,
    toggleExpandCard,
    
    // AI integration
    generateAISuggestions,
    dismissAISuggestion,
    applyAISuggestion,
    
    // Chat integration
    createCardFromChatMessage,
    findCardsFromChatMessage,
    findChatMessagesFromCard,
    
    // Graph data
    getNetworkGraphData,
    
    // Basic card operations (passed through from board context)
    updateCard,
    deleteCard,
    getCardsByColumn,
    addCards,
    dispatch
  };
}; 