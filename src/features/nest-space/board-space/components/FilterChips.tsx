import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Icon } from '../../../../components/Icon';

interface FilterChipsProps {
  filters: {
    search: string;
    tags: string[];
    dateRange: {
      start: Date | null;
      end: Date | null;
    };
    columnTypes: string[];
    sources: string[];
    priority: string[];
    assignee: string[];
    createdBy: string[];
  };
  onRemoveFilter: (key: string, value?: any) => void;
}

const FilterChips: React.FC<FilterChipsProps> = ({
  filters,
  onRemoveFilter,
}) => {
  const getFilterChips = () => {
    const chips: Array<{
      key: string;
      label: string;
      value: string;
      icon: string;
      color: string;
    }> = [];

    // 検索フィルター
    if (filters.search) {
      chips.push({
        key: 'search',
        label: '検索',
        value: filters.search,
        icon: 'search',
        color: '#00ff88',
      });
    }

    // タグフィルター
    filters.tags.forEach(tag => {
      chips.push({
        key: 'tags',
        label: 'タグ',
        value: tag,
        icon: 'tag',
        color: '#64b5f6',
      });
    });

    // 日付範囲フィルター
    if (filters.dateRange.start || filters.dateRange.end) {
      let dateLabel = '';
      if (filters.dateRange.start && filters.dateRange.end) {
        dateLabel = `${filters.dateRange.start.toLocaleDateString('ja-JP')} - ${filters.dateRange.end.toLocaleDateString('ja-JP')}`;
      } else if (filters.dateRange.start) {
        dateLabel = `${filters.dateRange.start.toLocaleDateString('ja-JP')} 以降`;
      } else if (filters.dateRange.end) {
        dateLabel = `${filters.dateRange.end.toLocaleDateString('ja-JP')} 以前`;
      }
      
      chips.push({
        key: 'dateRange',
        label: '日付',
        value: dateLabel,
        icon: 'calendar',
        color: '#ffd93d',
      });
    }

    // カラムタイプフィルター
    filters.columnTypes.forEach(type => {
      chips.push({
        key: 'columnTypes',
        label: 'カラム',
        value: type,
        icon: 'columns',
        color: '#9c27b0',
      });
    });

    // ソースフィルター
    filters.sources.forEach(source => {
      chips.push({
        key: 'sources',
        label: 'ソース',
        value: source,
        icon: 'database',
        color: '#26c6da',
      });
    });

    // 優先度フィルター
    filters.priority.forEach(priority => {
      chips.push({
        key: 'priority',
        label: '優先度',
        value: priority === 'high' ? '高' : priority === 'medium' ? '中' : '低',
        icon: 'flag',
        color: priority === 'high' ? '#ff6b6b' : priority === 'medium' ? '#ffd93d' : '#4caf50',
      });
    });

    // 担当者フィルター
    filters.assignee.forEach(assignee => {
      chips.push({
        key: 'assignee',
        label: '担当者',
        value: assignee,
        icon: 'user',
        color: '#ff9800',
      });
    });

    // 作成者フィルター
    filters.createdBy.forEach(creator => {
      chips.push({
        key: 'createdBy',
        label: '作成者',
        value: creator,
        icon: 'edit',
        color: '#607d8b',
      });
    });

    return chips;
  };

  const chips = getFilterChips();

  if (chips.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Icon name="filter" size={14} color="#a6adc8" />
        <Text style={styles.headerText}>アクティブフィルター</Text>
      </View>
      
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsContainer}
      >
        {chips.map((chip, index) => (
          <View key={`${chip.key}-${chip.value}-${index}`} style={styles.chipWrapper}>
            <View style={[styles.chip, { borderColor: chip.color }]}>
              <View style={styles.chipContent}>
                <View style={[styles.chipIcon, { backgroundColor: chip.color }]}>
                  <Icon name={chip.icon} size={12} color="#ffffff" />
                </View>
                <Text style={styles.chipLabel}>{chip.label}</Text>
                <Text style={styles.chipValue}>{chip.value}</Text>
              </View>
              
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => onRemoveFilter(chip.key, chip.value)}
                accessibilityLabel={`フィルター「${chip.label}: ${chip.value}」を削除`}
              >
                <Icon name="x" size={12} color="#a6adc8" />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = {
  container: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#0f0f23',
    borderBottomWidth: 1,
    borderBottomColor: '#333366',
  },
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: 12,
    gap: 6,
  },
  headerText: {
    fontSize: 12,
    color: '#a6adc8',
    fontFamily: 'JetBrains Mono',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  chipsContainer: {
    paddingRight: 20,
  },
  chipWrapper: {
    marginRight: 8,
  },
  chip: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: '#1a1a2e',
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 6,
    paddingLeft: 12,
    paddingRight: 8,
    gap: 8,
  },
  chipContent: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
  },
  chipIcon: {
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  chipLabel: {
    fontSize: 10,
    color: '#a6adc8',
    fontFamily: 'JetBrains Mono',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  chipValue: {
    fontSize: 12,
    color: '#e2e8f0',
    fontFamily: 'Space Grotesk',
    fontWeight: '500' as const,
  },
  removeButton: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#333366',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
};

export default FilterChips;
