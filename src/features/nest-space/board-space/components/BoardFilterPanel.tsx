import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Icon } from '../../../../components/Icon';
import { BoardColumnType, Card } from '../../../../types/board';
import SearchFilter from './filters/SearchFilter';
import TagFilter from './filters/TagFilter';
import DateRangeFilter from './filters/DateRangeFilter';
import ColumnTypeFilter from './filters/ColumnTypeFilter';
import SourceFilter from './filters/SourceFilter';
import PriorityFilter from './filters/PriorityFilter';
import AssigneeFilter from './filters/AssigneeFilter';
import CreatedByFilter from './filters/CreatedByFilter';
import FilterActions from './filters/FilterActions';
import FilterChips from './FilterChips';

export interface BoardFilterPanelState {
  isOpen: boolean;
  filters: {
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
  };
}

interface BoardFilterPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  filters: {
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
  };
  onFiltersChange: (filters: any) => void;
  onClearFilters: () => void;
  cards: Card[];
  allTags: string[];
  allUsers: { id: string; name: string }[];
}

const BoardFilterPanel: React.FC<BoardFilterPanelProps> = ({
  isOpen,
  onToggle,
  filters,
  onFiltersChange,
  onClearFilters,
  cards,
  allTags,
  allUsers,
}) => {
  // ボードに存在するカードのソースを動的に取得
  const availableSources = useMemo(() => {
    const sourceSet = new Set<string>();
    
    cards.forEach(card => {
      // metadata.source から取得
      if (card.metadata?.source) {
        sourceSet.add(card.metadata.source);
      }
      
      // metadata.ai.generated_by から取得
      if (card.metadata?.ai?.generated_by) {
        sourceSet.add(card.metadata.ai.generated_by);
      }
      
      // sources 配列から取得
      if (card.sources) {
        card.sources.forEach(source => {
          sourceSet.add(source.type);
        });
      }
      
      // sourceType から取得
      if (card.sourceType) {
        sourceSet.add(card.sourceType);
      }
    });
    
    return Array.from(sourceSet).sort();
  }, [cards]);

  // アクティブフィルターの数を計算
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.search) count++;
    if (filters.tags.length > 0) count++;
    if (filters.dateRange.start || filters.dateRange.end) count++;
    if (filters.columnTypes.length > 0) count++;
    if (filters.sources.length > 0) count++;
    if (filters.priority.length > 0) count++;
    if (filters.assignee.length > 0) count++;
    if (filters.createdBy.length > 0) count++;
    return count;
  }, [filters]);

  if (!isOpen) {
    return (
      <TouchableOpacity
        style={styles.toggleButton}
        onPress={onToggle}
        accessibilityLabel="フィルターパネルを開く"
      >
        <Icon name="filter" size={20} color="#00ff88" />
        {activeFiltersCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{activeFiltersCount}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      {/* フィルターパネルヘッダー */}
      <View style={styles.header}>
        <Text style={styles.title}>フィルター</Text>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={onToggle}
          accessibilityLabel="フィルターパネルを閉じる"
        >
          <Icon name="close" size={20} color="#a6adc8" />
        </TouchableOpacity>
      </View>

      {/* アクティブフィルターの表示 */}
      {activeFiltersCount > 0 && (
        <FilterChips
          filters={filters}
          onRemoveFilter={(key, value) => {
            if (key === 'tags' || key === 'columnTypes' || key === 'sources' || key === 'priority' || key === 'assignee' || key === 'createdBy') {
              onFiltersChange({
                [key]: filters[key].filter(item => item !== value)
              });
            } else if (key === 'dateRange') {
              onFiltersChange({
                dateRange: { start: null, end: null }
              });
            } else if (key === 'search') {
              onFiltersChange({ search: '' });
            }
          }}
        />
      )}

      {/* フィルターコンテンツ */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <SearchFilter
          value={filters.search}
          onChange={(value) => onFiltersChange({ search: value })}
        />
        
        <TagFilter
          selectedTags={filters.tags}
          availableTags={allTags}
          onChange={(tags) => onFiltersChange({ tags })}
        />
        
        <DateRangeFilter
          dateRange={filters.dateRange}
          onChange={(dateRange) => onFiltersChange({ dateRange })}
        />
        
        <ColumnTypeFilter
          selectedTypes={filters.columnTypes}
          onChange={(types) => onFiltersChange({ columnTypes: types })}
        />
        
        <SourceFilter
          selectedSources={filters.sources}
          availableSources={availableSources}
          onChange={(sources) => onFiltersChange({ sources })}
        />
        
        <PriorityFilter
          selectedPriorities={filters.priority}
          onChange={(priorities) => onFiltersChange({ priority: priorities })}
        />
        
        <AssigneeFilter
          selectedAssignees={filters.assignee}
          availableUsers={allUsers}
          onChange={(assignees) => onFiltersChange({ assignee: assignees })}
        />
        
        <CreatedByFilter
          selectedUsers={filters.createdBy}
          onChange={(users) => onFiltersChange({ createdBy: users })}
          availableUsers={allUsers}
        />
      </ScrollView>

      {/* フィルター操作ボタン */}
      <FilterActions
        onClearAll={onClearFilters}
        activeFiltersCount={activeFiltersCount}
      />
    </View>
  );
};

const styles = {
  container: {
    position: 'absolute' as const,
    right: 0,
    top: 0,
    bottom: 0,
    width: 320,
    backgroundColor: '#1a1a2e',
    borderLeftWidth: 1,
    borderLeftColor: '#333366',
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  toggleButton: {
    position: 'absolute' as const,
    right: 20,
    top: 20,
    width: 48,
    height: 48,
    backgroundColor: '#1a1a2e',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#333366',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 999,
  },
  badge: {
    position: 'absolute' as const,
    top: -4,
    right: -4,
    backgroundColor: '#00ff88',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    borderWidth: 2,
    borderColor: '#1a1a2e',
  },
  badgeText: {
    color: '#0f0f23',
    fontSize: 11,
    fontWeight: '600' as const,
    fontFamily: 'JetBrains Mono',
  },
  header: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333366',
    backgroundColor: '#0f0f23',
  },
  title: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#e2e8f0',
    fontFamily: 'Space Grotesk',
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#333366',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
};

export default BoardFilterPanel;
