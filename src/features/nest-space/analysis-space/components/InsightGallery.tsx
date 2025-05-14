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
import { useAnalysisSpace, AIInsight } from '../hooks/useAnalysisSpace';
import { useInsightFilters } from '../hooks/useInsightFilters';

const windowWidth = Dimensions.get('window').width;
const isTabletOrDesktop = windowWidth > 768;

interface InsightCardProps {
  insight: AIInsight;
  onPress: (id: string) => void;
  isSelected?: boolean;
}

const InsightCard: React.FC<InsightCardProps> = ({ 
  insight, 
  onPress, 
  isSelected = false 
}) => {
  const { toggleInsightStar, toggleInsightArchive } = useAnalysisSpace();
  
  // Convert insight type to Japanese
  const typeLabels: Record<string, string> = {
    'communication': 'コミュニケーション',
    'trend': 'トレンド',
    'topic': 'トピック',
    'activity': 'アクティビティ',
    'relationship': '関係性'
  };
  
  // Format date
  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('ja-JP', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };
  
  // Get color based on confidence
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return '#4CAF50'; // green
    if (confidence >= 0.6) return '#8BC34A'; // light green
    if (confidence >= 0.4) return '#FFC107'; // amber
    if (confidence >= 0.2) return '#FF9800'; // orange
    return '#F44336'; // red
  };
  
  // Format confidence as percentage
  const formatConfidence = (confidence: number) => {
    return `${Math.round(confidence * 100)}%`;
  };
  
  return (
    <TouchableOpacity 
      style={[
        styles.card, 
        isSelected && styles.selectedCard,
        insight.isStarred && styles.starredCard,
        insight.isArchived && styles.archivedCard
      ]} 
      onPress={() => onPress(insight.id)}
    >
      <View style={styles.cardHeader}>
        <View style={styles.typeContainer}>
          <Text style={styles.typeLabel}>{typeLabels[insight.type] || insight.type}</Text>
        </View>
        <View style={styles.confidenceContainer}>
          <View 
            style={[
              styles.confidenceIndicator, 
              { backgroundColor: getConfidenceColor(insight.confidence) }
            ]}
          />
          <Text style={styles.confidenceText}>
            確信度: {formatConfidence(insight.confidence)}
          </Text>
        </View>
      </View>
      
      <Text style={styles.cardTitle}>{insight.title}</Text>
      <Text style={styles.cardDescription} numberOfLines={3}>
        {insight.description}
      </Text>
      
      <View style={styles.cardFooter}>
        <View style={styles.keywordsContainer}>
          {insight.keywords.slice(0, 3).map((keyword, index) => (
            <View key={index} style={styles.keywordChip}>
              <Text style={styles.keywordText}>{keyword}</Text>
            </View>
          ))}
          
          {insight.keywords.length > 3 && (
            <View style={styles.keywordChip}>
              <Text style={styles.keywordText}>+{insight.keywords.length - 3}</Text>
            </View>
          )}
        </View>
        
        <Text style={styles.dateText}>{formatDate(insight.timestamp)}</Text>
      </View>
      
      <View style={styles.cardActions}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => toggleInsightStar(insight.id)}
        >
          <Text>{insight.isStarred ? '★' : '☆'}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => toggleInsightArchive(insight.id)}
        >
          <Text>{insight.isArchived ? '🗄️' : '📂'}</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

interface InsightDetailViewProps {
  insight: AIInsight;
  onClose: () => void;
}

const InsightDetailView: React.FC<InsightDetailViewProps> = ({ insight, onClose }) => {
  const { navigateToRelatedContent } = useAnalysisSpace();
  
  if (!insight) return null;
  
  // Format date
  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('ja-JP', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  return (
    <View style={styles.detailContainer}>
      <View style={styles.detailHeader}>
        <Text style={styles.detailTitle}>{insight.title}</Text>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeButtonText}>×</Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.detailContent}>
        <Text style={styles.detailDescription}>{insight.description}</Text>
        
        <View style={styles.detailSection}>
          <Text style={styles.sectionTitle}>キーワード</Text>
          <View style={styles.keywordsDetail}>
            {insight.keywords.map((keyword, index) => (
              <View key={index} style={styles.keywordChip}>
                <Text style={styles.keywordText}>{keyword}</Text>
              </View>
            ))}
          </View>
        </View>
        
        {(insight.relatedItemIds?.cardIds?.length > 0 || 
          insight.relatedItemIds?.messageIds?.length > 0 || 
          insight.relatedItemIds?.chatRoomIds?.length > 0) && (
          <View style={styles.detailSection}>
            <Text style={styles.sectionTitle}>関連アイテム</Text>
            
            {insight.relatedItemIds?.cardIds?.length > 0 && (
              <View style={styles.relatedItemSection}>
                <Text style={styles.relatedItemTitle}>カード</Text>
                {insight.relatedItemIds?.cardIds?.map((cardId, index) => (
                  <TouchableOpacity 
                    key={index}
                    style={styles.relatedItem}
                    onPress={() => navigateToRelatedContent(cardId, 'board')}
                  >
                    <Text style={styles.relatedItemText}>カード #{index + 1}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            
            {insight.relatedItemIds?.chatRoomIds?.length > 0 && (
              <View style={styles.relatedItemSection}>
                <Text style={styles.relatedItemTitle}>チャットルーム</Text>
                {insight.relatedItemIds?.chatRoomIds?.map((roomId, index) => (
                  <TouchableOpacity 
                    key={index}
                    style={styles.relatedItem}
                    onPress={() => navigateToRelatedContent(roomId, 'chat')}
                  >
                    <Text style={styles.relatedItemText}>チャットルーム #{index + 1}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            
            {insight.relatedItemIds?.messageIds?.length > 0 && (
              <View style={styles.relatedItemSection}>
                <Text style={styles.relatedItemTitle}>メッセージ</Text>
                {insight.relatedItemIds?.messageIds?.map((messageId, index) => (
                  <TouchableOpacity 
                    key={index}
                    style={styles.relatedItem}
                  >
                    <Text style={styles.relatedItemText}>メッセージ #{index + 1}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}
        
        {insight.visualType && insight.visualData && (
          <View style={styles.detailSection}>
            <Text style={styles.sectionTitle}>ビジュアライゼーション</Text>
            <View style={styles.visualizationPlaceholder}>
              <Text style={styles.visualizationText}>
                {insight.visualType === 'chart' && 'グラフ表示'}
                {insight.visualType === 'graph' && 'ネットワーク表示'}
                {insight.visualType === 'timeline' && 'タイムライン表示'}
                {insight.visualType === 'heatmap' && 'ヒートマップ表示'}
              </Text>
            </View>
          </View>
        )}
        
        <View style={styles.detailFooter}>
          <Text style={styles.detailDate}>生成日時: {formatDate(insight.timestamp)}</Text>
        </View>
      </ScrollView>
    </View>
  );
};

interface FilterBarProps {
  onFilterChange: () => void;
}

const FilterBar: React.FC<FilterBarProps> = ({ onFilterChange }) => {
  const { 
    filterState, 
    hasActiveFilters, 
    clearAllFilters,
    availableTypes,
    toggleTypeFilter
  } = useInsightFilters();
  
  const typeLabels: Record<string, string> = {
    'communication': 'コミュニケーション',
    'trend': 'トレンド',
    'topic': 'トピック',
    'activity': 'アクティビティ',
    'relationship': '関係性'
  };
  
  return (
    <View style={styles.filterBar}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {availableTypes.map(type => (
          <TouchableOpacity
            key={type}
            style={[
              styles.filterChip,
              filterState.types.includes(type) && styles.activeFilterChip
            ]}
            onPress={() => {
              toggleTypeFilter(type);
              onFilterChange();
            }}
          >
            <Text 
              style={[
                styles.filterChipText,
                filterState.types.includes(type) && styles.activeFilterChipText
              ]}
            >
              {typeLabels[type] || type}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      
      {hasActiveFilters && (
        <TouchableOpacity
          style={styles.clearFiltersButton}
          onPress={() => {
            clearAllFilters();
            onFilterChange();
          }}
        >
          <Text style={styles.clearFiltersText}>クリア</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

interface InsightGalleryProps {
  insights: AIInsight[];
  viewMode: 'list' | 'grid' | 'dashboard';
}

const InsightGallery: React.FC<InsightGalleryProps> = ({ 
  insights, 
  viewMode 
}) => {
  const [selectedInsightId, setSelectedInsightId] = useState<string | null>(null);
  const { selectInsight } = useAnalysisSpace();
  
  const handleInsightSelect = (insightId: string) => {
    setSelectedInsightId(insightId);
    selectInsight(insightId);
  };
  
  const handleCloseDetail = () => {
    setSelectedInsightId(null);
    selectInsight(null);
  };
  
  const selectedInsight = insights.find(insight => insight.id === selectedInsightId);
  
  // Display empty state
  if (insights.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>洞察が見つかりません</Text>
        <Text style={styles.emptyDescription}>
          現在の検索条件に一致する洞察がありません。フィルターを変更するか、新しい分析を生成してください。
        </Text>
      </View>
    );
  }
  
  // Handle the responsive layout
  const renderContent = () => {
    // Desktop/Tablet Dashboard View with detail panel
    if (viewMode === 'dashboard' && isTabletOrDesktop) {
      return (
        <View style={styles.dashboardLayout}>
          <View style={styles.insightListContainer}>
            <FilterBar onFilterChange={() => {}} />
            <FlatList
              data={insights}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <InsightCard 
                  insight={item} 
                  onPress={handleInsightSelect}
                  isSelected={item.id === selectedInsightId}
                />
              )}
              showsVerticalScrollIndicator={false}
            />
          </View>
          
          <View style={styles.insightDetailContainer}>
            {selectedInsight ? (
              <InsightDetailView 
                insight={selectedInsight}
                onClose={handleCloseDetail}
              />
            ) : (
              <View style={styles.noSelectionContainer}>
                <Text style={styles.noSelectionText}>
                  洞察を選択して詳細を表示
                </Text>
              </View>
            )}
          </View>
        </View>
      );
    }
    
    // Grid view (2 columns)
    if (viewMode === 'grid') {
      return (
        <>
          <FilterBar onFilterChange={() => {}} />
          <FlatList
            data={insights}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <InsightCard 
                insight={item} 
                onPress={handleInsightSelect}
                isSelected={item.id === selectedInsightId}
              />
            )}
            numColumns={2}
            columnWrapperStyle={styles.gridColumnWrapper}
            showsVerticalScrollIndicator={false}
          />
          
          {selectedInsight && (
            <View style={styles.modalOverlay}>
              <InsightDetailView 
                insight={selectedInsight}
                onClose={handleCloseDetail}
              />
            </View>
          )}
        </>
      );
    }
    
    // Default list view
    return (
      <>
        <FilterBar onFilterChange={() => {}} />
        <FlatList
          data={insights}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <InsightCard 
              insight={item} 
              onPress={handleInsightSelect}
              isSelected={item.id === selectedInsightId}
            />
          )}
          showsVerticalScrollIndicator={false}
        />
        
        {selectedInsight && (
          <View style={styles.modalOverlay}>
            <InsightDetailView 
              insight={selectedInsight}
              onClose={handleCloseDetail}
            />
          </View>
        )}
      </>
    );
  };
  
  return (
    <View style={styles.container}>
      {renderContent()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  dashboardLayout: {
    flex: 1,
    flexDirection: 'row',
  },
  insightListContainer: {
    flex: 1,
    borderRightWidth: isTabletOrDesktop ? 1 : 0,
    borderRightColor: '#E0E0E0',
  },
  insightDetailContainer: {
    flex: 1.5,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    margin: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  selectedCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#4a6da7',
  },
  starredCard: {
    borderTopWidth: 2,
    borderTopColor: '#FFC107',
  },
  archivedCard: {
    opacity: 0.7,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  typeContainer: {
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  typeLabel: {
    fontSize: 12,
    color: '#757575',
  },
  confidenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  confidenceIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  confidenceText: {
    fontSize: 12,
    color: '#757575',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  keywordsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  keywordChip: {
    backgroundColor: 'rgba(74, 109, 167, 0.1)',
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginRight: 4,
    marginBottom: 4,
  },
  keywordText: {
    fontSize: 12,
    color: '#4a6da7',
  },
  dateText: {
    fontSize: 12,
    color: '#999999',
  },
  cardActions: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
  },
  actionButton: {
    padding: 4,
    marginLeft: 4,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBar: {
    flexDirection: 'row',
    padding: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  filterChip: {
    backgroundColor: '#F0F0F0',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  activeFilterChip: {
    backgroundColor: '#4a6da7',
  },
  filterChipText: {
    fontSize: 12,
    color: '#666666',
  },
  activeFilterChipText: {
    color: '#FFFFFF',
  },
  clearFiltersButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  clearFiltersText: {
    fontSize: 12,
    color: '#F44336',
  },
  gridColumnWrapper: {
    justifyContent: 'space-between',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#757575',
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#999999',
    textAlign: 'center',
  },
  detailContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    width: isTabletOrDesktop ? '100%' : '90%',
    maxWidth: 800,
    maxHeight: isTabletOrDesktop ? '100%' : '80%',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingBottom: 16,
  },
  detailTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#757575',
  },
  detailContent: {
    flex: 1,
  },
  detailDescription: {
    fontSize: 16,
    color: '#333333',
    marginBottom: 16,
    lineHeight: 24,
  },
  detailSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#757575',
    marginBottom: 8,
  },
  keywordsDetail: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  relatedItemSection: {
    marginBottom: 12,
  },
  relatedItemTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#757575',
    marginBottom: 4,
  },
  relatedItem: {
    backgroundColor: '#F5F5F5',
    borderRadius: 4,
    padding: 8,
    marginBottom: 4,
  },
  relatedItemText: {
    fontSize: 14,
    color: '#333333',
  },
  visualizationPlaceholder: {
    height: 200,
    backgroundColor: '#F5F5F5',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  visualizationText: {
    fontSize: 16,
    color: '#757575',
  },
  detailFooter: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingTop: 16,
  },
  detailDate: {
    fontSize: 12,
    color: '#999999',
    textAlign: 'right',
  },
  noSelectionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noSelectionText: {
    fontSize: 16,
    color: '#999999',
  }
});

export default InsightGallery; 