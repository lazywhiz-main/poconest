import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Dimensions
} from 'react-native';
import { useBoardSpace } from '../hooks/useBoardSpace';
import { useCardNavigation } from '../hooks/useCardNavigation';
import BoardHeader from '../components/BoardHeader';
import BoardCard from '../components/BoardCard';
import CardEditor from '../components/CardEditor';
import BoardFilterPanel from '../components/BoardFilterPanel';
import FilterChips from '../components/FilterChips';
import { BoardColumnType, Card } from '../../../../types/board';

interface ColumnViewProps {
  cards: Card[];
  onCardPress: (cardId: string) => void;
  selectedCardIds: string[];
}

// Column view component
const ColumnView: React.FC<ColumnViewProps> = ({ cards, onCardPress, selectedCardIds }) => {
  const { boardSpaceState } = useBoardSpace();
  
  // Group cards by columns if we're in column view
  const groupedCards: Record<BoardColumnType, Card[]> = {
    'INBOX': [],
    'QUESTIONS': [],
    'INSIGHTS': [],
    'THEMES': [],
    'ACTIONS': [],
  };
  
  // Sort cards into their columns
  cards.forEach(card => {
    if (groupedCards[card.column]) {
      groupedCards[card.column].push(card);
    }
  });

  return (
    <ScrollView 
      horizontal
      contentContainerStyle={styles.columnsContainer}
      showsHorizontalScrollIndicator={false}
    >
      {Object.entries(groupedCards).map(([column, columnCards]) => (
        <View key={column} style={styles.column}>
          <View style={styles.columnHeader}>
            <Text style={styles.columnTitle}>
              {column === 'INBOX' ? 'Inbox' :
               column === 'QUESTIONS' ? 'Questions' :
               column === 'INSIGHTS' ? 'Insights' :
               column === 'THEMES' ? 'Themes' : 'Actions'}
            </Text>
            <View style={styles.cardCount}>
              <Text style={styles.cardCountText}>{columnCards.length}</Text>
            </View>
          </View>
          <FlatList
            data={columnCards}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <BoardCard 
                card={item} 
                onPress={onCardPress} 
                isSelected={selectedCardIds.includes(item.id)}
              />
            )}
            showsVerticalScrollIndicator={false}
            style={styles.cardList}
            contentContainerStyle={styles.cardListContent}
            ListEmptyComponent={
              <View style={styles.emptyColumn}>
                <Text style={styles.emptyColumnText}>No cards in this column</Text>
              </View>
            }
          />
        </View>
      ))}
    </ScrollView>
  );
};

interface GridViewProps {
  cards: Card[];
  onCardPress: (cardId: string) => void;
  selectedCardIds: string[];
}

// Grid view component
const GridView: React.FC<GridViewProps> = ({ cards, onCardPress, selectedCardIds }) => {
  return (
    <FlatList
      data={cards}
      keyExtractor={item => item.id}
      renderItem={({ item }) => (
        <BoardCard 
          card={item} 
          onPress={onCardPress} 
          isSelected={selectedCardIds.includes(item.id)}
        />
      )}
      numColumns={2}
      columnWrapperStyle={styles.gridRow}
      contentContainerStyle={styles.gridContainer}
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No cards match your criteria</Text>
        </View>
      }
    />
  );
};

interface NetworkViewProps {
  cards: Card[];
}

// Network view placeholder
const NetworkView: React.FC<NetworkViewProps> = ({ cards }) => {
  return (
    <View style={styles.networkContainer}>
      <Text style={styles.networkPlaceholderText}>
        Network view showing {cards.length} cards and their relationships
      </Text>
      <Text style={styles.networkDescription}>
        A full implementation would use a graph visualization library to show card relationships
      </Text>
    </View>
  );
};

// AI Suggestions component
const AISuggestions: React.FC = () => {
  const { boardSpaceState, dismissAISuggestion, applyAISuggestion } = useBoardSpace();
  
  if (!boardSpaceState.showAIClusteringSuggestions || boardSpaceState.aiSuggestions.length === 0) {
    return null;
  }
  
  return (
    <View style={styles.suggestionsContainer}>
      <Text style={styles.suggestionsTitle}>AI Suggestions</Text>
      {boardSpaceState.aiSuggestions
        .filter(suggestion => !suggestion.dismissed)
        .map(suggestion => (
          <View key={suggestion.id} style={styles.suggestionCard}>
            <Text style={styles.suggestionDescription}>{suggestion.description}</Text>
            <View style={styles.suggestionActions}>
              <TouchableOpacity 
                style={styles.suggestionActionButton}
                onPress={() => applyAISuggestion(suggestion.id)}
              >
                <Text style={styles.suggestionActionText}>Apply</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.suggestionActionButton, styles.dismissButton]}
                onPress={() => dismissAISuggestion(suggestion.id)}
              >
                <Text style={styles.suggestionActionText}>Dismiss</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
    </View>
  );
};

const BoardScreen: React.FC = () => {
  const { 
    boardSpaceState, 
    filteredCards,
    updateFilters,
    clearFilters,
    availableUsers
  } = useBoardSpace();
  
  const { 
    navigateToCard
  } = useCardNavigation();

  const { 
    allTags 
  } = useCardNavigation();
  
  const [showSettings, setShowSettings] = useState(false);
  const [showCardEditor, setShowCardEditor] = useState(false);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  
  // Handle card press
  const handleCardPress = (cardId: string) => {
    navigateToCard(cardId);
    setEditingCardId(cardId);
    setShowCardEditor(true);
  };
  
  // Add a new card
  const handleAddCard = () => {
    setEditingCardId(null);
    setShowCardEditor(true);
  };
  
  // Close card editor
  const handleCloseCardEditor = () => {
    setShowCardEditor(false);
    setEditingCardId(null);
  };
  
  // Toggle settings panel
  const toggleSettings = () => {
    setShowSettings(!showSettings);
  };

  // Toggle filters panel
  const toggleFilters = () => {
    setShowFilters(!showFilters);
  };

  // Handle filter changes
  const handleFiltersChange = (newFilters: any) => {
    updateFilters(newFilters);
  };

  // Handle removing individual filters
  const handleRemoveFilter = (key: string, value?: any) => {
    const currentFilters = { ...boardSpaceState.filters };
    
    if (key === 'search') {
      currentFilters.search = '';
    } else if (key === 'dateRange') {
      currentFilters.dateRange = { start: null, end: null };
    } else if (Array.isArray(currentFilters[key as keyof typeof currentFilters])) {
      if (value) {
        // Remove specific value from array
        (currentFilters[key as keyof typeof currentFilters] as any[]) = 
          (currentFilters[key as keyof typeof currentFilters] as any[]).filter(v => v !== value);
      } else {
        // Clear entire array
        (currentFilters[key as keyof typeof currentFilters] as any[]) = [];
      }
    }
    
    updateFilters(currentFilters);
  };

  // Calculate active filters count
  const getActiveFiltersCount = () => {
    let count = 0;
    const filters = boardSpaceState.filters;
    
    if (filters.search) count++;
    if (filters.tags.length > 0) count++;
    if (filters.dateRange.start || filters.dateRange.end) count++;
    if (filters.columnTypes.length > 0) count++;
    if (filters.sources.length > 0) count++;
    if (filters.priority.length > 0) count++;
    if (filters.assignee.length > 0) count++;
    if (filters.createdBy.length > 0) count++;
    
    return count;
  };
  
  return (
    <View style={styles.container}>
      <BoardHeader onToggleSettings={toggleSettings} onToggleFilters={toggleFilters} />
      
      {/* Filter Chips */}
      <FilterChips 
        filters={boardSpaceState.filters}
        onRemoveFilter={handleRemoveFilter}
      />
      
      <View style={styles.contentContainer}>
        <AISuggestions />
        
        {/* Card view based on selected view mode */}
        {boardSpaceState.viewMode === 'column' && (
          <ColumnView 
            cards={filteredCards}
            onCardPress={handleCardPress}
            selectedCardIds={boardSpaceState.selectedCardIds}
          />
        )}
        
        {boardSpaceState.viewMode === 'grid' && (
          <GridView 
            cards={filteredCards}
            onCardPress={handleCardPress}
            selectedCardIds={boardSpaceState.selectedCardIds}
          />
        )}
        
        {boardSpaceState.viewMode === 'network' && (
          <NetworkView cards={filteredCards} />
        )}
      </View>
      
      {/* Floating action button to add new card */}
      <TouchableOpacity style={styles.addButton} onPress={handleAddCard}>
        <Text style={styles.addButtonText}>+</Text>
      </TouchableOpacity>
      
      {/* Card Editor Modal */}
      <CardEditor
        isVisible={showCardEditor}
        onClose={handleCloseCardEditor}
        initialCardId={editingCardId || undefined}
        initialColumn={boardSpaceState.activeColumn}
      />
      
      {/* Settings panel */}
      {showSettings && (
        <View style={styles.settingsPanel}>
          <Text style={styles.settingsPanelTitle}>Board Settings</Text>
          <TouchableOpacity 
            style={styles.settingOption}
            onPress={toggleSettings}
          >
            <Text>Close Settings</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Filters panel */}
      {showFilters && (
        <BoardFilterPanel
          isOpen={showFilters}
          onToggle={() => setShowFilters(!showFilters)}
          filters={boardSpaceState.filters}
          onFiltersChange={handleFiltersChange}
          onClearFilters={clearFilters}
          cards={filteredCards}
          allTags={allTags}
          allUsers={availableUsers}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    position: 'relative',
  },
  contentContainer: {
    flex: 1,
  },
  columnsContainer: {
    padding: 16,
  },
  column: {
    width: Dimensions.get('window').width * 0.8,
    maxWidth: 350,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginRight: 16,
    height: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  columnHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  columnTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  cardCount: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  cardCountText: {
    fontSize: 12,
    color: '#666',
  },
  cardList: {
    flex: 1,
  },
  cardListContent: {
    paddingBottom: 16,
  },
  emptyColumn: {
    padding: 16,
    alignItems: 'center',
  },
  emptyColumnText: {
    color: '#999',
    fontSize: 14,
  },
  gridContainer: {
    padding: 16,
  },
  gridRow: {
    justifyContent: 'space-between',
  },
  networkContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  networkPlaceholderText: {
    fontSize: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  networkDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  addButton: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4a6da7',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 100,
  },
  addButtonText: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  settingsPanel: {
    position: 'absolute',
    right: 16,
    top: 80,
    width: 250,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 200,
  },
  settingsPanelTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    paddingBottom: 8,
  },
  settingOption: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyStateText: {
    color: '#999',
    fontSize: 16,
    textAlign: 'center',
  },
  suggestionsContainer: {
    margin: 16,
    padding: 12,
    backgroundColor: '#FFF9E5',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FFB800',
  },
  suggestionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#5F4500',
  },
  suggestionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#FFE7A0',
  },
  suggestionDescription: {
    fontSize: 14,
    marginBottom: 8,
    color: '#5F4500',
  },
  suggestionActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  suggestionActionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FFB800',
    borderRadius: 4,
    marginLeft: 8,
  },
  dismissButton: {
    backgroundColor: '#F0F0F0',
  },
  suggestionActionText: {
    fontSize: 12,
    color: '#5F4500',
    fontWeight: '600',
  },
});

export default BoardScreen; 