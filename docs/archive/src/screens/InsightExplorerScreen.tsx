import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BrandColors } from '../constants/Colors';
import InsightCard from '../components/InsightCard';
import { useInsight } from '../contexts/InsightContext';
import { useBoard } from '../contexts/BoardContext';
import { Insight, InsightType, InsightPriority, InsightQuery } from '../types/insight';

// 画面の幅を取得
const { width } = Dimensions.get('window');
// 1行に表示するカードの数 (幅に応じて調整)
const numColumns = width > 768 ? 2 : 1;

const InsightExplorerScreen = () => {
  const { insights, loading, error, searchInsights, saveInsightToBoard, markAsReviewed } = useInsight();
  const { saveInsightToBoard: boardSaveInsight } = useBoard();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<InsightType[]>([]);
  const [selectedPriorities, setSelectedPriorities] = useState<InsightPriority[]>([]);
  const [filteredInsights, setFilteredInsights] = useState<Insight[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [sortBy, setSortBy] = useState<'createdAt' | 'priority'>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);
  
  // 初期データの読み込み
  useEffect(() => {
    fetchInsights();
  }, []);
  
  // 検索条件が変わったときに検索を実行
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchInsights();
    }, 300);
    
    return () => clearTimeout(timer);
  }, [searchQuery, selectedTypes, selectedPriorities, sortBy, sortDirection]);
  
  // インサイトの取得
  const fetchInsights = async () => {
    setIsSearching(true);
    
    const query: InsightQuery = {
      searchText: searchQuery,
      types: selectedTypes.length > 0 ? selectedTypes : undefined,
      priority: selectedPriorities.length > 0 ? selectedPriorities : undefined,
    };
    
    try {
      const results = await searchInsights(query);
      
      // ソート
      const sorted = [...results].sort((a, b) => {
        if (sortBy === 'createdAt') {
          const dateA = new Date(a.createdAt).getTime();
          const dateB = new Date(b.createdAt).getTime();
          return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
        } else {
          // priorityでのソート (HIGH > MEDIUM > LOW)
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          const priorityA = priorityOrder[a.priority] || 0;
          const priorityB = priorityOrder[b.priority] || 0;
          return sortDirection === 'asc' ? priorityA - priorityB : priorityB - priorityA;
        }
      });
      
      setFilteredInsights(sorted);
    } catch (err) {
      console.error('インサイト検索エラー:', err);
    } finally {
      setIsSearching(false);
    }
  };
  
  // インサイトタイプの切り替え
  const toggleType = (type: InsightType) => {
    setSelectedTypes(prev => 
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };
  
  // 優先度の切り替え
  const togglePriority = (priority: InsightPriority) => {
    setSelectedPriorities(prev => 
      prev.includes(priority)
        ? prev.filter(p => p !== priority)
        : [...prev, priority]
    );
  };
  
  // ソート順の切り替え
  const toggleSortDirection = () => {
    setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
  };
  
  // ソートフィールドの切り替え
  const toggleSortField = () => {
    setSortBy(prev => prev === 'createdAt' ? 'priority' : 'createdAt');
  };
  
  // インサイトをボードに保存
  const handleSaveToBoard = async (insight: Insight) => {
    if (insight.isSaved) return;
    
    try {
      // まずボードにカードとして保存
      const card = await boardSaveInsight(insight);
      
      // インサイトを保存済みとしてマーク
      await saveInsightToBoard(insight.id, card.id);
      
      // リストを更新
      fetchInsights();
    } catch (err) {
      console.error('ボード保存エラー:', err);
    }
  };
  
  // インサイトをレビュー済みとしてマーク
  const handleMarkAsReviewed = async (insight: Insight) => {
    if (insight.isReviewed) return;
    
    try {
      await markAsReviewed(insight.id);
      
      // リストを更新
      fetchInsights();
    } catch (err) {
      console.error('レビュー更新エラー:', err);
    }
  };
  
  // インサイトカードレンダリング
  const renderInsightItem = ({ item }: { item: Insight }) => (
    <View style={styles.insightCardContainer}>
      <InsightCard
        insight={item}
        onPress={() => handleMarkAsReviewed(item)}
        onEdit={() => console.log('Edit insight', item.id)}
        onDelete={() => console.log('Delete insight', item.id)}
      />
      {!item.isSaved && (
        <TouchableOpacity
          style={styles.saveToBooardButton}
          onPress={() => handleSaveToBoard(item)}
        >
          <Ionicons name="add-circle" size={24} color={BrandColors.primary} />
          <Text style={styles.saveButtonText}>ボードに保存</Text>
        </TouchableOpacity>
      )}
    </View>
  );
  
  // フィルターUIレンダリング
  const renderFilters = () => (
    <View style={styles.filtersContainer}>
      {/* インサイトタイプフィルター */}
      <View style={styles.filterSection}>
        <Text style={styles.filterSectionTitle}>タイプ</Text>
        <ScrollView 
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterOptions}
        >
          {Object.values(InsightType).map(type => (
            <TouchableOpacity
              key={type}
              style={[
                styles.filterOption,
                selectedTypes.includes(type) && styles.filterOptionSelected
              ]}
              onPress={() => toggleType(type)}
            >
              <Text style={[
                styles.filterOptionText,
                selectedTypes.includes(type) && styles.filterOptionTextSelected
              ]}>
                {getTypeLabel(type)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      
      {/* 優先度フィルター */}
      <View style={styles.filterSection}>
        <Text style={styles.filterSectionTitle}>優先度</Text>
        <ScrollView 
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterOptions}
        >
          {Object.values(InsightPriority).map(priority => (
            <TouchableOpacity
              key={priority}
              style={[
                styles.filterOption,
                selectedPriorities.includes(priority) && styles.filterOptionSelected
              ]}
              onPress={() => togglePriority(priority)}
            >
              <Text style={[
                styles.filterOptionText,
                selectedPriorities.includes(priority) && styles.filterOptionTextSelected
              ]}>
                {getPriorityLabel(priority)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      
      {/* ソートオプション */}
      <View style={styles.filterSection}>
        <Text style={styles.filterSectionTitle}>並び替え</Text>
        <View style={styles.sortOptions}>
          <TouchableOpacity
            style={[
              styles.sortOption,
              sortBy === 'createdAt' && styles.sortOptionSelected
            ]}
            onPress={toggleSortField}
          >
            <Text style={[
              styles.sortOptionText,
              sortBy === 'createdAt' && styles.sortOptionTextSelected
            ]}>日付</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.sortOption,
              sortBy === 'priority' && styles.sortOptionSelected
            ]}
            onPress={toggleSortField}
          >
            <Text style={[
              styles.sortOptionText,
              sortBy === 'priority' && styles.sortOptionTextSelected
            ]}>優先度</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.sortDirectionButton}
            onPress={toggleSortDirection}
          >
            <Ionicons
              name={sortDirection === 'asc' ? 'arrow-up' : 'arrow-down'}
              size={18}
              color={BrandColors.text.secondary}
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
  
  return (
    <SafeAreaView style={styles.container}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>インサイト探索</Text>
        <TouchableOpacity 
          style={styles.filterButton}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Ionicons 
            name={showFilters ? "options" : "options-outline"} 
            size={24} 
            color={BrandColors.primary} 
          />
        </TouchableOpacity>
      </View>
      
      {/* 検索バー */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={BrandColors.text.tertiary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="インサイトを検索..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={BrandColors.text.tertiary}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => setSearchQuery('')}
          >
            <Ionicons name="close-circle" size={18} color={BrandColors.text.tertiary} />
          </TouchableOpacity>
        )}
      </View>
      
      {/* フィルター */}
      {showFilters && renderFilters()}
      
      {/* インサイトリスト */}
      {loading || isSearching ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BrandColors.primary} />
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : filteredInsights.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="search" size={64} color={BrandColors.text.tertiary} />
          <Text style={styles.emptyText}>
            {searchQuery
              ? `「${searchQuery}」に一致するインサイトは見つかりませんでした`
              : 'インサイトがありません'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredInsights}
          renderItem={renderInsightItem}
          keyExtractor={item => item.id}
          numColumns={numColumns}
          contentContainerStyle={styles.insightsList}
          columnWrapperStyle={numColumns > 1 ? styles.row : undefined}
        />
      )}
    </SafeAreaView>
  );
};

// ヘルパー関数
const getTypeLabel = (type: InsightType): string => {
  switch (type) {
    case InsightType.SUMMARY:
      return '要約';
    case InsightType.KEYWORD:
      return 'キーワード';
    case InsightType.ACTION_ITEM:
      return 'タスク';
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

const getPriorityLabel = (priority: InsightPriority): string => {
  switch (priority) {
    case InsightPriority.HIGH:
      return '高';
    case InsightPriority.MEDIUM:
      return '中';
    case InsightPriority.LOW:
      return '低';
    default:
      return '中';
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BrandColors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: BrandColors.backgroundVariants.light,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: BrandColors.text.primary,
  },
  filterButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: BrandColors.backgroundVariants.medium,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: `${BrandColors.text.tertiary}30`,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: BrandColors.text.primary,
  },
  clearButton: {
    padding: 4,
  },
  filtersContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: `${BrandColors.text.tertiary}20`,
  },
  filterSection: {
    marginBottom: 12,
  },
  filterSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: BrandColors.text.secondary,
    marginBottom: 8,
  },
  filterOptions: {
    flexDirection: 'row',
  },
  filterOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: `${BrandColors.text.tertiary}20`,
    borderRadius: 16,
    marginRight: 8,
  },
  filterOptionSelected: {
    backgroundColor: BrandColors.primary,
  },
  filterOptionText: {
    fontSize: 14,
    color: BrandColors.text.secondary,
  },
  filterOptionTextSelected: {
    color: '#fff',
  },
  sortOptions: {
    flexDirection: 'row',
    alignItems: 'center',
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  errorText: {
    color: '#FF3B30',
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  emptyText: {
    color: BrandColors.text.secondary,
    textAlign: 'center',
    marginTop: 16,
    fontSize: 16,
  },
  insightsList: {
    padding: 16,
  },
  row: {
    flex: 1,
    justifyContent: 'space-between',
  },
  insightCardContainer: {
    flex: 1,
    marginBottom: 16,
    marginHorizontal: numColumns > 1 ? 8 : 0,
  },
  saveToBooardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    backgroundColor: `${BrandColors.primary}10`,
    borderRadius: 8,
    marginTop: 8,
  },
  saveButtonText: {
    marginLeft: 8,
    fontSize: 14,
    color: BrandColors.primary,
    fontWeight: '600',
  },
});

export default InsightExplorerScreen; 