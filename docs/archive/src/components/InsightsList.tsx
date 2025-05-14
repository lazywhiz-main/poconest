import React, { useState, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator,
  Dimensions,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import InsightCard from './InsightCard';
import { Insight, InsightType, InsightPriority } from '../types/insight';
import { BrandColors } from '../constants/Colors';

interface InsightsListProps {
  insights: Insight[];
  loading?: boolean;
  error?: string | null;
  onSelect?: (insight: Insight) => void;
  onSave?: (insight: Insight) => void;
  onDelete?: (insightId: string) => void;
  showFilters?: boolean;
}

const InsightsList: React.FC<InsightsListProps> = ({
  insights,
  loading = false,
  error = null,
  onSelect,
  onSave,
  onDelete,
  showFilters = true,
}) => {
  const [sortBy, setSortBy] = useState<'date' | 'priority' | 'type'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [filter, setFilter] = useState<{ type?: InsightType, priority?: InsightPriority }>({});
  
  // スクリーンサイズに応じて1列または2列表示に
  const screenWidth = Dimensions.get('window').width;
  const numColumns = screenWidth > 600 ? 2 : 1;

  // フィルターとソートを適用したインサイトのリスト
  const filteredAndSortedInsights = useMemo(() => {
    let result = [...insights];
    
    // タイプやプライオリティでフィルタリング
    if (filter.type) {
      result = result.filter(insight => insight.type === filter.type);
    }
    
    if (filter.priority) {
      result = result.filter(insight => insight.priority === filter.priority);
    }
    
    // ソート
    result.sort((a, b) => {
      if (sortBy === 'date') {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
      } else if (sortBy === 'priority') {
        const priorityMap = {
          [InsightPriority.HIGH]: 3,
          [InsightPriority.MEDIUM]: 2,
          [InsightPriority.LOW]: 1,
        };
        const priorityA = priorityMap[a.priority];
        const priorityB = priorityMap[b.priority];
        return sortDirection === 'asc' ? priorityA - priorityB : priorityB - priorityA;
      } else if (sortBy === 'type') {
        return sortDirection === 'asc' 
          ? a.type.localeCompare(b.type) 
          : b.type.localeCompare(a.type);
      }
      return 0;
    });
    
    return result;
  }, [insights, filter, sortBy, sortDirection]);

  // ソート方向を切り替え
  const toggleSortDirection = () => {
    setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  // タイプでフィルタリング
  const toggleTypeFilter = (type: InsightType) => {
    setFilter(prev => ({
      ...prev,
      type: prev.type === type ? undefined : type
    }));
  };

  // プライオリティでフィルタリング
  const togglePriorityFilter = (priority: InsightPriority) => {
    setFilter(prev => ({
      ...prev,
      priority: prev.priority === priority ? undefined : priority
    }));
  };

  // 負荷中の表示
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={BrandColors.primary} />
      </View>
    );
  }

  // エラー表示
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={48} color="#FF3B30" />
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  // 結果がない場合の表示
  if (filteredAndSortedInsights.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="document-text-outline" size={48} color={BrandColors.text.tertiary} />
        <Text style={styles.emptyText}>
          {Object.keys(filter).length > 0 
            ? "フィルター条件に一致するインサイトがありません" 
            : "インサイトがまだありません"}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {showFilters && (
        <View style={styles.filterContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScrollContent}
          >
            {/* ソートオプション */}
            <View style={styles.sortOptions}>
              <TouchableOpacity 
                style={[
                  styles.sortOption, 
                  sortBy === 'date' && styles.sortOptionSelected
                ]}
                onPress={() => setSortBy('date')}
              >
                <Text 
                  style={[
                    styles.sortOptionText, 
                    sortBy === 'date' && styles.sortOptionTextSelected
                  ]}
                >
                  日付
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.sortOption, 
                  sortBy === 'priority' && styles.sortOptionSelected
                ]}
                onPress={() => setSortBy('priority')}
              >
                <Text 
                  style={[
                    styles.sortOptionText, 
                    sortBy === 'priority' && styles.sortOptionTextSelected
                  ]}
                >
                  優先度
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.sortOption, 
                  sortBy === 'type' && styles.sortOptionSelected
                ]}
                onPress={() => setSortBy('type')}
              >
                <Text 
                  style={[
                    styles.sortOptionText, 
                    sortBy === 'type' && styles.sortOptionTextSelected
                  ]}
                >
                  種類
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.sortDirectionButton}
                onPress={toggleSortDirection}
              >
                <Ionicons 
                  name={sortDirection === 'asc' ? 'arrow-up' : 'arrow-down'} 
                  size={20} 
                  color={BrandColors.text.secondary} 
                />
              </TouchableOpacity>
            </View>
            
            {/* 区切り線 */}
            <View style={styles.filterDivider} />
            
            {/* タイプフィルター */}
            <View style={styles.filterOptions}>
              {Object.values(InsightType).map(type => (
                <TouchableOpacity 
                  key={type}
                  style={[
                    styles.filterOption,
                    filter.type === type && styles.filterOptionSelected
                  ]}
                  onPress={() => toggleTypeFilter(type)}
                >
                  <Text 
                    style={[
                      styles.filterOptionText,
                      filter.type === type && styles.filterOptionTextSelected
                    ]}
                  >
                    {getTypeLabel(type)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            {/* 区切り線 */}
            <View style={styles.filterDivider} />
            
            {/* プライオリティフィルター */}
            <View style={styles.filterOptions}>
              {Object.values(InsightPriority).map(priority => (
                <TouchableOpacity 
                  key={priority}
                  style={[
                    styles.filterOption,
                    filter.priority === priority && styles.filterOptionSelected
                  ]}
                  onPress={() => togglePriorityFilter(priority)}
                >
                  <Text 
                    style={[
                      styles.filterOptionText,
                      filter.priority === priority && styles.filterOptionTextSelected
                    ]}
                  >
                    {getPriorityLabel(priority)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      )}
      
      <FlatList
        data={filteredAndSortedInsights}
        keyExtractor={item => item.id}
        numColumns={numColumns}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={[styles.cardContainer, { width: numColumns > 1 ? '47%' : '100%' }]}>
            <InsightCard 
              insight={item}
              onPress={() => onSelect && onSelect(item)}
              onDelete={() => onDelete && onDelete(item.id)}
            />
            {!item.isSaved && onSave && (
              <TouchableOpacity 
                style={styles.saveButton}
                onPress={() => onSave(item)}
              >
                <Ionicons name="bookmark-outline" size={16} color={BrandColors.primary} />
                <Text style={styles.saveButtonText}>保存</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      />
    </View>
  );
};

// インサイトタイプのラベル取得
const getTypeLabel = (type: InsightType): string => {
  switch (type) {
    case InsightType.SUMMARY:
      return '要約';
    case InsightType.KEYWORD:
      return 'キーワード';
    case InsightType.ACTION_ITEM:
      return 'アクション';
    case InsightType.QUESTION:
      return '質問';
    case InsightType.DECISION:
      return '決定事項';
    case InsightType.CUSTOM:
      return 'カスタム';
    default:
      return 'その他';
  }
};

// プライオリティのラベル取得
const getPriorityLabel = (priority: InsightPriority): string => {
  switch (priority) {
    case InsightPriority.HIGH:
      return '高';
    case InsightPriority.MEDIUM:
      return '中';
    case InsightPriority.LOW:
      return '低';
    default:
      return '未設定';
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#FF3B30',
    marginTop: 10,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    color: BrandColors.text.secondary,
    marginTop: 16,
    textAlign: 'center',
  },
  filterContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: `${BrandColors.text.tertiary}20`,
  },
  filterScrollContent: {
    paddingRight: 20,
  },
  sortOptions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  sortOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: `${BrandColors.text.tertiary}20`,
    borderRadius: 16,
    marginRight: 8,
  },
  sortOptionSelected: {
    backgroundColor: BrandColors.primary,
  },
  sortOptionText: {
    fontSize: 14,
    color: BrandColors.text.secondary,
  },
  sortOptionTextSelected: {
    color: '#fff',
  },
  sortDirectionButton: {
    padding: 8,
  },
  filterDivider: {
    width: 1,
    height: '80%',
    backgroundColor: `${BrandColors.text.tertiary}30`,
    marginHorizontal: 12,
    alignSelf: 'center',
  },
  filterOptions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  filterOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: `${BrandColors.text.tertiary}20`,
    borderRadius: 16,
    marginRight: 8,
  },
  filterOptionSelected: {
    backgroundColor: BrandColors.secondary,
  },
  filterOptionText: {
    fontSize: 14,
    color: BrandColors.text.secondary,
  },
  filterOptionTextSelected: {
    color: '#fff',
  },
  listContent: {
    padding: 12,
  },
  cardContainer: {
    marginHorizontal: 8,
    marginBottom: 16,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${BrandColors.primary}10`,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 4,
  },
  saveButtonText: {
    color: BrandColors.primary,
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
});

export default InsightsList; 