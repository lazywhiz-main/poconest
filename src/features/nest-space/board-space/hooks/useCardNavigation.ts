import { useCallback, useState, useEffect, useMemo } from 'react';
import { useBoardSpace } from './useBoardSpace';
import { BoardColumnType } from '../../../../types/board';

export interface CardNavigationState {
  history: string[];
  currentCardId: string | null;
  expandedColumns: BoardColumnType[];
  searchResults: string[];
  isSearching: boolean;
  selectedTag: string | null;
  groupedView: boolean;
}

export const useCardNavigation = () => {
  const { 
    boardSpaceState,
    filteredCards,
    allCards,
    toggleCardSelection
  } = useBoardSpace();
  
  const [navigationState, setNavigationState] = useState<CardNavigationState>({
    history: [],
    currentCardId: null,
    expandedColumns: [BoardColumnType.INBOX], // Start with Inbox expanded
    searchResults: [],
    isSearching: false,
    selectedTag: null,
    groupedView: false
  });
  
  // When a card is viewed, add it to the history
  const navigateToCard = useCallback((cardId: string) => {
    setNavigationState(prev => {
      // Don't add the same card twice in a row
      if (prev.currentCardId === cardId) return prev;
      
      // Add to history
      const newHistory = prev.currentCardId 
        ? [...prev.history, prev.currentCardId]
        : prev.history;
        
      return {
        ...prev,
        currentCardId: cardId,
        history: newHistory
      };
    });
  }, []);
  
  // Go back to the previous card
  const goBack = useCallback(() => {
    setNavigationState(prev => {
      if (prev.history.length === 0) return prev;
      
      // Get the last card from history
      const newHistory = [...prev.history];
      const previousCardId = newHistory.pop();
      
      return {
        ...prev,
        currentCardId: previousCardId || null,
        history: newHistory
      };
    });
  }, []);
  
  // Toggle column expansion for grouped view
  const toggleColumnExpansion = useCallback((column: BoardColumnType) => {
    setNavigationState(prev => {
      const isExpanded = prev.expandedColumns.includes(column);
      
      return {
        ...prev,
        expandedColumns: isExpanded
          ? prev.expandedColumns.filter(c => c !== column)
          : [...prev.expandedColumns, column]
      };
    });
  }, []);
  
  // Search cards by text in title or description
  const searchCards = useCallback((searchText: string) => {
    if (!searchText.trim()) {
      setNavigationState(prev => ({
        ...prev,
        searchResults: [],
        isSearching: false
      }));
      return;
    }
    
    const lowerCaseSearch = searchText.toLowerCase();
    const results = allCards.filter(card => 
      card.title.toLowerCase().includes(lowerCaseSearch) || 
      card.description.toLowerCase().includes(lowerCaseSearch)
    ).map(card => card.id);
    
    setNavigationState(prev => ({
      ...prev,
      searchResults: results,
      isSearching: true
    }));
  }, [allCards]);
  
  // Clear search results
  const clearSearch = useCallback(() => {
    setNavigationState(prev => ({
      ...prev,
      searchResults: [],
      isSearching: false
    }));
  }, []);
  
  // Filter cards by tag
  const filterByTag = useCallback((tag: string | null) => {
    setNavigationState(prev => ({
      ...prev,
      selectedTag: tag
    }));
  }, []);
  
  // Get all unique tags from cards
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    allCards.forEach(card => {
      if (card.tags) {
        card.tags.forEach(tag => tagSet.add(tag));
      }
    });
    return Array.from(tagSet).sort();
  }, [allCards]);
  
  // Group cards by column for organized display
  const groupedCards = useMemo(() => {
    const groups: Record<BoardColumnType, typeof filteredCards> = {
      [BoardColumnType.INBOX]: [],
      [BoardColumnType.INSIGHTS]: [],
      [BoardColumnType.THEMES]: [],
      [BoardColumnType.ZOOM]: [],
    };
    
    filteredCards.forEach(card => {
      groups[card.column].push(card);
    });
    
    return groups;
  }, [filteredCards]);
  
  // Get cards grouped by tag
  const cardsByTag = useMemo(() => {
    const tagGroups: Record<string, typeof filteredCards> = {};
    
    // Create an "Untagged" group
    tagGroups['Untagged'] = [];
    
    filteredCards.forEach(card => {
      if (!card.tags || card.tags.length === 0) {
        tagGroups['Untagged'].push(card);
      } else {
        card.tags.forEach(tag => {
          if (!tagGroups[tag]) {
            tagGroups[tag] = [];
          }
          tagGroups[tag].push(card);
        });
      }
    });
    
    return tagGroups;
  }, [filteredCards]);
  
  // Toggle between normal and grouped view
  const toggleGroupedView = useCallback(() => {
    setNavigationState(prev => ({
      ...prev,
      groupedView: !prev.groupedView
    }));
  }, []);
  
  // Find the previous and next cards in the current view
  const getAdjacentCards = useCallback((cardId: string) => {
    const currentIndex = filteredCards.findIndex(card => card.id === cardId);
    if (currentIndex === -1) return { prev: null, next: null };
    
    const prevCard = currentIndex > 0 ? filteredCards[currentIndex - 1] : null;
    const nextCard = currentIndex < filteredCards.length - 1 ? filteredCards[currentIndex + 1] : null;
    
    return {
      prev: prevCard ? prevCard.id : null,
      next: nextCard ? nextCard.id : null
    };
  }, [filteredCards]);
  
  // Navigate to the next card
  const goToNextCard = useCallback(() => {
    if (!navigationState.currentCardId) return;
    
    const { next } = getAdjacentCards(navigationState.currentCardId);
    if (next) {
      navigateToCard(next);
    }
  }, [getAdjacentCards, navigateToCard, navigationState.currentCardId]);
  
  // Navigate to the previous card
  const goToPrevCard = useCallback(() => {
    if (!navigationState.currentCardId) return;
    
    const { prev } = getAdjacentCards(navigationState.currentCardId);
    if (prev) {
      navigateToCard(prev);
    }
  }, [getAdjacentCards, navigateToCard, navigationState.currentCardId]);
  
  // Check if a card is visible based on search/filter state
  const isCardVisible = useCallback((cardId: string) => {
    if (navigationState.isSearching) {
      return navigationState.searchResults.includes(cardId);
    }
    
    if (navigationState.selectedTag) {
      const card = allCards.find(c => c.id === cardId);
      return card?.tags?.includes(navigationState.selectedTag) || false;
    }
    
    return true;
  }, [navigationState.isSearching, navigationState.searchResults, navigationState.selectedTag, allCards]);
  
  return {
    navigationState,
    navigateToCard,
    goBack,
    toggleColumnExpansion,
    searchCards,
    clearSearch,
    filterByTag,
    allTags,
    groupedCards,
    cardsByTag,
    toggleGroupedView,
    goToNextCard,
    goToPrevCard,
    isCardVisible
  };
}; 