import { useCallback, useState, useEffect, useMemo } from 'react';
import { useBoard } from '@contexts/BoardContext';
import { useNestSpace } from '../../contexts/_NestSpaceContext';
import { SpaceType } from '../../types/nestSpace.types';
import { BoardColumnType, Card, BoardViewSettings } from '../../../../types/board';
import { useChatSpace } from '../../chat-space/hooks/useChatSpace';

export interface BoardFilter {
  tags?: string[];
  search?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  source?: 'chat' | 'zoom' | 'manual' | 'all';
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
    cards, 
    activeColumn: contextActiveColumn, 
    setActiveColumn: setContextActiveColumn,
    getCardsByColumn,
    addCard,
    updateCard,
    deleteCard,
    moveCard,
    promoteCardToInsight,
    promoteInsightToTheme,
    findRelatedCards,
  } = useBoard();
  
  const { isSpaceActive, navigateToSpace } = useNestSpace();
  
  // Access chat context for integration
  const { chatSpaceState, chatRooms, messages } = useChatSpace();
  
  // Board space specific state
  const [boardSpaceState, setBoardSpaceState] = useState<BoardSpaceState>({
    activeColumn: BoardColumnType.INBOX,
    filters: {},
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
  }, [isSpaceActive, navigateToSpace]);
  
  // Sync active column with the main board context
  useEffect(() => {
    if (contextActiveColumn !== boardSpaceState.activeColumn) {
      setContextActiveColumn(boardSpaceState.activeColumn);
    }
  }, [boardSpaceState.activeColumn, contextActiveColumn, setContextActiveColumn]);
  
  // Set the active column
  const setActiveColumn = useCallback((column: BoardColumnType) => {
    setBoardSpaceState(prev => ({
      ...prev,
      activeColumn: column,
      selectedCardIds: [],
      isSelectionMode: false
    }));
  }, []);
  
  // Get currently displayed cards based on active column and filters
  const filteredCards = useMemo(() => {
    const columnCards = getCardsByColumn(boardSpaceState.activeColumn);
    
    // Apply filters
    return columnCards.filter(card => {
      // Tag filter
      if (boardSpaceState.filters.tags && boardSpaceState.filters.tags.length > 0) {
        if (!card.tags || !card.tags.some(tag => boardSpaceState.filters.tags?.includes(tag))) {
          return false;
        }
      }
      
      // Search filter
      if (boardSpaceState.filters.search) {
        const searchTerm = boardSpaceState.filters.search.toLowerCase();
        if (!card.title.toLowerCase().includes(searchTerm) &&
            !card.description.toLowerCase().includes(searchTerm) &&
            !(card.tags && card.tags.some(tag => tag.toLowerCase().includes(searchTerm)))) {
          return false;
        }
      }
      
      // Date range filter
      if (boardSpaceState.filters.dateRange) {
        const cardDate = new Date(card.updated_at);
        if (cardDate < boardSpaceState.filters.dateRange.start ||
            cardDate > boardSpaceState.filters.dateRange.end) {
          return false;
        }
      }
      
      // Source filter
      if (boardSpaceState.filters.source && boardSpaceState.filters.source !== 'all') {
        if (card.sourceType !== boardSpaceState.filters.source) {
          return false;
        }
      }
      
      return true;
    });
  }, [boardSpaceState.activeColumn, boardSpaceState.filters, getCardsByColumn]);
  
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
          comparison = a.order - b.order;
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
      filters: {}
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
        type: 'tag',
        description: 'これらのカードに "プロジェクト計画" タグを追加することを推奨します',
        affectedCardIds: sortedCards.slice(0, 3).map(card => card.id),
        suggestedAction: 'タグ "プロジェクト計画" を追加',
        confidence: 0.85,
        dismissed: false
      },
      {
        id: '2',
        type: 'cluster',
        description: 'これらのカードは関連性が高いため、新しいグループを作成することを推奨します',
        affectedCardIds: sortedCards.slice(2, 5).map(card => card.id),
        suggestedAction: '新しいグループを作成',
        confidence: 0.78,
        dismissed: false
      },
      {
        id: '3',
        type: 'promote',
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
              const card = cards.find(c => c.id === cardId);
              if (card) {
                const currentTags = card.tags || [];
                if (!currentTags.includes(tag)) {
                  await updateCard(cardId, {
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
            await promoteCardToInsight(cardId);
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
  }, [boardSpaceState.aiSuggestions, cards, dismissAISuggestion, promoteCardToInsight, updateCard]);
  
  // Create a card from a chat message
  const createCardFromChatMessage = useCallback(async (messageId: string, chatRoomId: string) => {
    try {
      if (!messages[chatRoomId]) return null;
      
      const message = messages[chatRoomId].find(m => m.id === messageId);
      if (!message) return null;
      
      const chatRoom = chatRooms.find(room => room.id === chatRoomId);
      
      // Create a new card from the message
      const now = new Date().toISOString();
      const newCardData = {
        title: message.content.length > 50 
          ? `${message.content.substring(0, 47)}...` 
          : message.content,
        description: message.content,
        column: BoardColumnType.INBOX,
        user_id: message.sender.id,
        tags: ['チャット', chatRoom?.name || 'メッセージ'],
        order: 0,
        sourceType: 'chat' as const,
        sourceId: chatRoomId,
        metadata: {
          messageId,
          senderName: message.sender.name,
          messageTimestamp: message.created_at,
          isFromChat: true
        }
      };
      
      const newCard = await addCard(newCardData);
      return newCard;
    } catch (error) {
      console.error('Error creating card from chat message:', error);
      return null;
    }
  }, [addCard, chatRooms, messages]);
  
  // Find cards related to a specific chat message
  const findCardsFromChatMessage = useCallback((messageId: string, chatRoomId: string) => {
    return cards.filter(card => 
      card.sourceType === 'chat' && 
      card.sourceId === chatRoomId && 
      card.metadata?.messageId === messageId
    );
  }, [cards]);
  
  // Find chat messages related to a specific card
  const findChatMessagesFromCard = useCallback((cardId: string) => {
    const card = cards.find(c => c.id === cardId);
    if (!card || card.sourceType !== 'chat' || !card.sourceId || !card.metadata?.messageId) {
      return [];
    }
    
    const chatId = card.sourceId;
    const messageId = card.metadata.messageId;
    
    if (!messages[chatId]) return [];
    
    return messages[chatId].filter(message => message.id === messageId);
  }, [cards, messages]);
  
  // Build the network graph data based on card relationships
  const getNetworkGraphData = useCallback(() => {
    const nodes = sortedCards.map(card => ({
      id: card.id,
      label: card.title,
      column: card.column,
      tags: card.tags || [],
      created: card.created_at,
      sourceType: card.sourceType
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
      if (card.column === BoardColumnType.THEMES && card.metadata?.relatedInsightIds) {
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
  
  return {
    // External board context
    allCards: cards,
    
    // Board space specific state and filtered data
    boardSpaceState,
    filteredCards: sortedCards,
    
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
    addCard,
    updateCard,
    deleteCard,
    moveCard,
    promoteCardToInsight,
    promoteInsightToTheme,
    findRelatedCards
  };
}; 