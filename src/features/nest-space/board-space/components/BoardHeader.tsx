import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Platform
} from 'react-native';
import { useBoardSpace } from '../hooks/useBoardSpace';
import { useCardNavigation } from '../hooks/useCardNavigation';
import { useNestSpace } from '@contexts/NestSpaceContext';
import { BoardColumnType } from 'src/types/board';
const BOARD_COLUMN_TYPES = ['INBOX', 'QUESTIONS', 'INSIGHTS', 'THEMES', 'ACTIONS'] as const;

// Placeholder for icons - in a real implementation, you'd import from a library
const Icon = ({ name, size = 20, color = '#000' }: { name: string; size?: number; color?: string }) => (
  <Text style={{ fontSize: size, color }}>{name === 'search' ? '🔍' : name === 'filter' ? '🔖' : name === 'grid' ? '⊞' : name === 'column' ? '☰' : name === 'network' ? '🌐' : name === 'tag' ? '🏷️' : name === 'settings' ? '⚙️' : '•'}</Text>
);

// Column labels for display
const COLUMN_LABELS: Record<string, string> = {
  INBOX: 'Inbox',
  INSIGHTS: 'Insights',
  THEMES: 'Themes',
  ZOOM: 'Zoom',
  QUESTIONS: 'Questions',
  ACTIONS: 'Actions',
};

interface BoardHeaderProps {
  onToggleSettings?: () => void;
  onToggleFilters?: () => void;
}

const BoardHeader: React.FC<BoardHeaderProps> = ({ 
  onToggleSettings,
  onToggleFilters
}) => {
  const { 
    boardSpaceState, 
    setActiveColumn, 
    setViewMode,
    updateFilters,
    clearFilters,
    generateAISuggestions,
  } = useBoardSpace();
  
  const { allTags, filterByTag } = useCardNavigation();
  
  const [isSearching, setIsSearching] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [showTagFilter, setShowTagFilter] = useState(false);
  
  // Handle search input
  const handleSearch = (text: string) => {
    setSearchText(text);
    updateFilters({ search: text });
  };
  
  // Toggle search mode
  const toggleSearch = () => {
    if (isSearching) {
      setSearchText('');
      clearFilters();
    }
    setIsSearching(!isSearching);
  };
  
  // Handle tag selection
  const handleTagSelect = (tag: string | null) => {
    filterByTag(tag);
    updateFilters({ tags: tag ? [tag] : [] });
    setShowTagFilter(false);
  };
  
  // Generate AI suggestions for organization
  const handleAISuggestions = async () => {
    await generateAISuggestions();
  };
  
  return (
    <View style={styles.container}>
      {/* Column tabs */}
      <View style={styles.columnTabs}>
        {BOARD_COLUMN_TYPES.map((column) => (
          <TouchableOpacity
            key={column}
            style={[
              styles.columnTab,
              boardSpaceState.activeColumn === column && styles.activeColumnTab
            ]}
            onPress={() => setActiveColumn(column)}
          >
            <Text 
              style={[
                styles.columnTabText,
                boardSpaceState.activeColumn === column && styles.activeColumnTabText
              ]}
            >
              {COLUMN_LABELS[column]}
            </Text>
            {boardSpaceState.activeColumn === column && (
              <View style={styles.activeIndicator} />
            )}
          </TouchableOpacity>
        ))}
      </View>
      
      <View style={styles.controls}>
        {isSearching ? (
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="カードを検索..."
              value={searchText}
              onChangeText={handleSearch}
              autoFocus
            />
            <TouchableOpacity 
              style={styles.searchButton}
              onPress={toggleSearch}
            >
              <Text>×</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.controlButtons}>
            <TouchableOpacity 
              style={styles.controlButton}
              onPress={toggleSearch}
            >
              <Icon name="search" />
            </TouchableOpacity>
            
            {/* Debug: Filter button */}
            <TouchableOpacity 
              style={[
                styles.controlButton, 
                { 
                  borderWidth: 3, 
                  borderColor: 'red', 
                  backgroundColor: 'yellow',
                  width: 50,
                  height: 50,
                  marginLeft: 10,
                  marginRight: 10
                }
              ]}
              onPress={onToggleFilters}
            >
              <Text style={{ fontSize: 20, color: '#000', fontWeight: 'bold' }}>🔖</Text>
            </TouchableOpacity>
            {/* Filter button rendered */}
            
            <TouchableOpacity 
              style={styles.controlButton}
              onPress={() => setViewMode('column')}
            >
              <Icon 
                name="column" 
                color={boardSpaceState.viewMode === 'column' ? '#4a6da7' : '#000'}
              />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.controlButton}
              onPress={() => setViewMode('grid')}
            >
              <Icon 
                name="grid" 
                color={boardSpaceState.viewMode === 'grid' ? '#4a6da7' : '#000'}
              />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.controlButton}
              onPress={() => setViewMode('network')}
            >
              <Icon 
                name="network" 
                color={boardSpaceState.viewMode === 'network' ? '#000' : '#000'}
              />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.controlButton}
              onPress={handleAISuggestions}
            >
              <Text style={{ fontSize: 20 }}>💡</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.controlButton}
              onPress={onToggleSettings}
            >
              <Icon name="settings" />
            </TouchableOpacity>
          </View>
        )}
      </View>
      
      {/* Tag filter panel - simplified version for quick access */}
      {showTagFilter && (
        <View style={styles.tagFilterPanel}>
          <TouchableOpacity 
            style={styles.tagOption}
            onPress={() => handleTagSelect(null)}
          >
            <Text style={styles.tagOptionText}>すべて表示</Text>
          </TouchableOpacity>
          
          {allTags.map(tag => (
            <TouchableOpacity 
              key={tag}
              style={styles.tagOption}
              onPress={() => handleTagSelect(tag)}
            >
              <Icon name="tag" size={14} />
              <Text style={styles.tagOptionText}>{tag}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 0,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    backgroundColor: '#F5F5F5',
    height: 56,
    minHeight: 56,
    maxHeight: 56,
  },
  columnTabs: {
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%',
    paddingHorizontal: 0,
    paddingTop: 0,
    marginRight: 16,
  },
  columnTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 8,
    position: 'relative',
  },
  activeColumnTab: {
    backgroundColor: 'rgba(74, 109, 167, 0.1)',
  },
  columnTabText: {
    fontSize: 14,
    color: '#666',
  },
  activeColumnTabText: {
    color: '#4a6da7',
    fontWeight: 'bold',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#4a6da7',
    borderRadius: 1,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%',
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  controlButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%',
  },
  controlButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 4,
    paddingHorizontal: 8,
    height: 36,
    marginVertical: 0,
  },
  searchInput: {
    flex: 1,
    height: 32,
    fontSize: 16,
    paddingVertical: 0,
    paddingHorizontal: 8,
    backgroundColor: 'transparent',
    borderWidth: 0,
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      },
    }),
  },
  searchButton: {
    padding: 4,
  },
  tagFilterPanel: {
    backgroundColor: '#FFF',
    borderRadius: 4,
    margin: 8,
    padding: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tagOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(74, 109, 167, 0.1)',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    margin: 4,
  },
  tagOptionText: {
    fontSize: 12,
    marginLeft: 4,
  },
});

export default BoardHeader; 