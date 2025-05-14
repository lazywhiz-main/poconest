import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions
} from 'react-native';
import { TrendData, KeywordNetwork } from '../hooks/useAnalysisSpace';
import { useDataVisualization } from '../hooks/useDataVisualization';

const windowWidth = Dimensions.get('window').width;
const isTabletOrDesktop = windowWidth > 768;

interface TrendVisualizerProps {
  trends: TrendData[];
  keywordNetwork: KeywordNetwork;
  viewMode: 'list' | 'grid' | 'dashboard';
}

const TrendVisualizer: React.FC<TrendVisualizerProps> = ({ 
  trends, 
  keywordNetwork, 
  viewMode 
}) => {
  const [selectedTrendId, setSelectedTrendId] = useState<string | null>(null);
  const [showKeywordNetwork, setShowKeywordNetwork] = useState<boolean>(false);
  
  const { 
    prepareChartData, 
    prepareNetworkData,
    prepareWordCloudData
  } = useDataVisualization();
  
  // 選択されているトレンドを取得
  const selectedTrend = trends.find(trend => trend.id === selectedTrendId);
  
  // キーワードネットワークデータを準備
  const networkData = prepareNetworkData(keywordNetwork);
  
  // 空のデータ状態を表示
  if (trends.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>トレンドデータがありません</Text>
        <Text style={styles.emptyDescription}>
          分析データがまだ生成されていません。新しい分析を実行してください。
        </Text>
      </View>
    );
  }
  
  // トレンドカードコンポーネント
  const TrendCard = ({ trend }: { trend: TrendData }) => {
    // トレンドカラー取得
    const getTrendColor = () => {
      switch (trend.trend) {
        case 'increasing': return '#4CAF50'; // green
        case 'decreasing': return '#F44336'; // red
        case 'fluctuating': return '#FFC107'; // amber
        case 'stable': return '#607D8B'; // blue-grey
        default: return '#4a6da7'; // default blue
      }
    };
    
    // 日付フォーマット
    const formatDateRange = () => {
      const start = new Date(trend.timeRange.start);
      const end = new Date(trend.timeRange.end);
      
      return `${start.toLocaleDateString('ja-JP')} ~ ${end.toLocaleDateString('ja-JP')}`;
    };
    
    return (
      <TouchableOpacity 
        style={[
          styles.trendCard, 
          { borderLeftColor: getTrendColor() },
          selectedTrendId === trend.id && styles.selectedTrendCard
        ]}
        onPress={() => setSelectedTrendId(trend.id)}
      >
        <Text style={styles.trendTitle}>{trend.title}</Text>
        <Text style={styles.trendDescription}>{trend.description}</Text>
        
        <View style={styles.trendFooter}>
          <Text style={styles.trendDate}>{formatDateRange()}</Text>
          <View style={styles.trendSignificance}>
            <View 
              style={[
                styles.significanceIndicator, 
                { backgroundColor: getTrendColor() }
              ]} 
            />
            <Text style={styles.significanceText}>
              重要度: {Math.round(trend.significance * 100)}%
            </Text>
          </View>
        </View>
        
        <View style={styles.keywordsContainer}>
          {trend.relatedKeywords.map((keyword, index) => (
            <View key={index} style={styles.keywordChip}>
              <Text style={styles.keywordText}>{keyword}</Text>
            </View>
          ))}
        </View>
      </TouchableOpacity>
    );
  };
  
  // トレンド詳細ビュー
  const TrendDetailView = () => {
    if (!selectedTrend) return null;
    
    return (
      <View style={styles.detailContainer}>
        <View style={styles.detailHeader}>
          <Text style={styles.detailTitle}>{selectedTrend.title}</Text>
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={() => setSelectedTrendId(null)}
          >
            <Text style={styles.closeButtonText}>×</Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.detailContent}>
          <Text style={styles.detailDescription}>{selectedTrend.description}</Text>
          
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>トレンドチャート</Text>
            <View style={styles.chartPlaceholder}>
              <Text style={styles.placeholderText}>グラフが表示されます</Text>
              {/* 実際の実装ではここに可視化ライブラリを使用 */}
            </View>
          </View>
          
          <View style={styles.detailSection}>
            <Text style={styles.sectionTitle}>関連キーワード</Text>
            <View style={styles.keywordsDetail}>
              {selectedTrend.relatedKeywords.map((keyword, index) => (
                <View key={index} style={styles.keywordChip}>
                  <Text style={styles.keywordText}>{keyword}</Text>
                </View>
              ))}
            </View>
          </View>
          
          <View style={styles.detailSection}>
            <Text style={styles.sectionTitle}>分析期間</Text>
            <Text style={styles.detailText}>
              {new Date(selectedTrend.timeRange.start).toLocaleDateString('ja-JP')} から
              {' '}{new Date(selectedTrend.timeRange.end).toLocaleDateString('ja-JP')} まで
            </Text>
          </View>
          
          <View style={styles.detailSection}>
            <Text style={styles.sectionTitle}>傾向</Text>
            <Text style={styles.detailText}>
              {selectedTrend.trend === 'increasing' && '増加傾向'}
              {selectedTrend.trend === 'decreasing' && '減少傾向'}
              {selectedTrend.trend === 'fluctuating' && '変動傾向'}
              {selectedTrend.trend === 'stable' && '安定傾向'}
            </Text>
          </View>
          
          <View style={styles.detailSection}>
            <Text style={styles.sectionTitle}>重要度</Text>
            <View style={styles.significanceBar}>
              <View 
                style={[
                  styles.significanceFill, 
                  { width: `${selectedTrend.significance * 100}%` }
                ]} 
              />
            </View>
            <Text style={styles.significanceValue}>
              {Math.round(selectedTrend.significance * 100)}%
            </Text>
          </View>
        </ScrollView>
      </View>
    );
  };
  
  // キーワードネットワークビュー
  const KeywordNetworkView = () => {
    return (
      <View style={styles.networkContainer}>
        <View style={styles.networkHeader}>
          <Text style={styles.networkTitle}>キーワードネットワーク</Text>
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={() => setShowKeywordNetwork(false)}
          >
            <Text style={styles.closeButtonText}>×</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.networkContent}>
          <View style={styles.networkPlaceholder}>
            <Text style={styles.placeholderText}>ネットワーク図が表示されます</Text>
            {/* 実際の実装ではここにネットワーク可視化ライブラリを使用 */}
          </View>
          
          <View style={styles.networkInfo}>
            <Text style={styles.networkInfoText}>
              期間: {new Date(keywordNetwork.timeRange.start).toLocaleDateString('ja-JP')} から
              {' '}{new Date(keywordNetwork.timeRange.end).toLocaleDateString('ja-JP')} まで
            </Text>
            <Text style={styles.networkInfoText}>
              ノード数: {keywordNetwork.nodes.length}
            </Text>
            <Text style={styles.networkInfoText}>
              関連性数: {keywordNetwork.links.length}
            </Text>
          </View>
          
          <View style={styles.topKeywordsSection}>
            <Text style={styles.sectionTitle}>トップキーワード</Text>
            <View style={styles.topKeywordsList}>
              {keywordNetwork.nodes
                .sort((a, b) => b.importance - a.importance)
                .slice(0, 5)
                .map(node => (
                  <View key={node.id} style={styles.topKeywordItem}>
                    <Text style={styles.topKeywordText}>{node.label}</Text>
                    <Text style={styles.topKeywordCount}>{node.count}回</Text>
                  </View>
                ))
              }
            </View>
          </View>
        </View>
      </View>
    );
  };
  
  // ダッシュボードレイアウト (タブレット・デスクトップ)
  if (viewMode === 'dashboard' && isTabletOrDesktop) {
    return (
      <View style={styles.dashboardLayout}>
        <View style={styles.sidebarContainer}>
          <View style={styles.sidebarHeader}>
            <Text style={styles.sidebarTitle}>トレンド一覧</Text>
            <TouchableOpacity 
              style={[
                styles.networkButton,
                showKeywordNetwork && styles.activeNetworkButton
              ]}
              onPress={() => {
                setShowKeywordNetwork(!showKeywordNetwork);
                setSelectedTrendId(null);
              }}
            >
              <Text style={styles.networkButtonText}>キーワードネットワーク</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView>
            {trends.map(trend => (
              <TrendCard key={trend.id} trend={trend} />
            ))}
          </ScrollView>
        </View>
        
        <View style={styles.mainContainer}>
          {showKeywordNetwork ? (
            <KeywordNetworkView />
          ) : selectedTrendId ? (
            <TrendDetailView />
          ) : (
            <View style={styles.noSelectionContainer}>
              <Text style={styles.noSelectionText}>
                左側のリストからトレンドを選択するか、
                キーワードネットワークを表示してください
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  }
  
  // リストレイアウト (モバイル)
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>トレンド分析</Text>
        <TouchableOpacity 
          style={styles.networkButton}
          onPress={() => setShowKeywordNetwork(true)}
        >
          <Text style={styles.networkButtonText}>キーワードネットワーク</Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView>
        {trends.map(trend => (
          <TrendCard key={trend.id} trend={trend} />
        ))}
      </ScrollView>
      
      {/* モーダルビュー */}
      {selectedTrendId && (
        <View style={styles.modalOverlay}>
          <TrendDetailView />
        </View>
      )}
      
      {showKeywordNetwork && (
        <View style={styles.modalOverlay}>
          <KeywordNetworkView />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
  },
  dashboardLayout: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebarContainer: {
    width: 320,
    borderRightWidth: 1,
    borderRightColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
  },
  mainContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  sidebarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  sidebarTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
  },
  networkButton: {
    backgroundColor: '#F0F0F0',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  activeNetworkButton: {
    backgroundColor: '#4a6da7',
  },
  networkButtonText: {
    fontSize: 12,
    color: '#666666',
  },
  trendCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    margin: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#4a6da7',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  selectedTrendCard: {
    backgroundColor: '#F0F7FF',
  },
  trendTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 8,
  },
  trendDescription: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
  },
  trendFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  trendDate: {
    fontSize: 12,
    color: '#999999',
  },
  trendSignificance: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  significanceIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  significanceText: {
    fontSize: 12,
    color: '#757575',
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
  chartContainer: {
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#757575',
    marginBottom: 8,
  },
  chartPlaceholder: {
    height: 200,
    backgroundColor: '#F5F5F5',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 16,
    color: '#757575',
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
  detailText: {
    fontSize: 14,
    color: '#333333',
  },
  keywordsDetail: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  significanceBar: {
    height: 8,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
    marginTop: 4,
    marginBottom: 4,
    overflow: 'hidden',
  },
  significanceFill: {
    height: '100%',
    backgroundColor: '#4a6da7',
    borderRadius: 4,
  },
  significanceValue: {
    fontSize: 12,
    color: '#757575',
    textAlign: 'right',
  },
  networkContainer: {
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
  networkHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingBottom: 16,
  },
  networkTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
  },
  networkContent: {
    flex: 1,
  },
  networkPlaceholder: {
    height: 300,
    backgroundColor: '#F5F5F5',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  networkInfo: {
    marginBottom: 16,
  },
  networkInfoText: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
  },
  topKeywordsSection: {
    marginBottom: 16,
  },
  topKeywordsList: {
    backgroundColor: '#F5F5F5',
    borderRadius: 4,
    padding: 12,
  },
  topKeywordItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  topKeywordText: {
    fontSize: 14,
    color: '#333333',
  },
  topKeywordCount: {
    fontSize: 14,
    color: '#757575',
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
  noSelectionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noSelectionText: {
    fontSize: 16,
    color: '#999999',
    textAlign: 'center',
    padding: 32,
  }
});

export default TrendVisualizer; 