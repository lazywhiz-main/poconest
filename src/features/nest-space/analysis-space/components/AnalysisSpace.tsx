import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Platform
} from 'react-native';
import { useBoardSpace } from '../../board-space/hooks/useBoardSpace';
import NetworkVisualization from './NetworkVisualization';
import type { NetworkVisualizationConfig } from '../../../../types/analysis';
import type { BoardItem } from '../../../board-space/contexts/BoardContext';

interface AnalysisSpaceProps {
  nestId: string;
}

const AnalysisSpace: React.FC<AnalysisSpaceProps> = ({ nestId }) => {
  const { allCards, boardSpaceState } = useBoardSpace();
  const [config, setConfig] = useState<NetworkVisualizationConfig>({
    viewMode: 'circular',
    layoutType: 'circular',
    showEdgeLabels: false,
    showNodeLabels: true,
    nodeSize: 'connection_based',
    edgeFilter: {
      minStrength: 0.1,
      types: ['semantic', 'manual', 'derived', 'tag_similarity', 'ai', 'unified'],
    },
    nodeFilter: {
      types: ['INBOX', 'QUESTIONS', 'INSIGHTS', 'THEMES', 'ACTIONS'],
    },
  });
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // スピナーアニメーション用のCSS注入
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const style = document.createElement('style');
      style.textContent = `
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `;
      document.head.appendChild(style);
      
      return () => {
        document.head.removeChild(style);
      };
    }
  }, []);

  // フィルタリング
  const filteredCards = allCards.filter((card: BoardItem) => {
    if (config.nodeFilter.types && !config.nodeFilter.types.includes(card.column_type)) {
      return false;
    }
    return true;
  });

  // 関係性データの変換（既存のrelated_cardsから）
  const networkRelationships = allCards.flatMap((card: BoardItem) => 
    (card.related_cards || []).map((relatedCard: BoardItem) => ({
      card_id: card.id,
      related_card_id: relatedCard.id,
      strength: 0.7, // デフォルト値
      relationship_type: 'manual' as const,
    }))
  );

  const handleNodeSelect = (nodeId: string) => {
    setSelectedNodeId(nodeId);
  };

  const handleViewModeChange = (viewMode: 'circular' | 'card' | 'hybrid') => {
    setConfig(prev => ({ ...prev, viewMode }));
  };

  const handleFilterChange = (key: string, value: any) => {
    setConfig(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  // ローディング状態の判定（カードが空の場合をローディングとみなす）
  const isLoading = allCards.length === 0;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <View style={styles.loadingContent}>
            {/* ローディングスピナー */}
            <View style={styles.spinnerContainer}>
              <View style={styles.spinner}>
                <View style={styles.spinnerRing} />
                <View style={[styles.spinnerRing, styles.spinnerRingDelay]} />
              </View>
            </View>
            
            {/* ローディングテキスト */}
            <Text style={styles.loadingTitle}>思考の地図を生成中</Text>
            <Text style={styles.loadingSubtitle}>カードネットワークを分析しています...</Text>
            
            {/* ステータス表示 */}
            <View style={styles.statusContainer}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>データ取得完了</Text>
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* ヘッダー */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>カードネットワーク分析</Text>
        <Text style={styles.headerSubtitle}>
          {filteredCards.length}個のカード • {networkRelationships.length}個の関係性
        </Text>
      </View>

      {/* 表示モード切り替え */}
      <View style={styles.controlPanel}>
        <View style={styles.viewModeSelector}>
          <TouchableOpacity
            style={[
              styles.viewModeButton,
              config.viewMode === 'circular' && styles.activeViewModeButton
            ]}
            onPress={() => handleViewModeChange('circular')}
          >
            <Text style={[
              styles.viewModeButtonText,
              config.viewMode === 'circular' && styles.activeViewModeButtonText
            ]}>
              ノード型
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.viewModeButton,
              config.viewMode === 'card' && styles.activeViewModeButton
            ]}
            onPress={() => handleViewModeChange('card')}
          >
            <Text style={[
              styles.viewModeButtonText,
              config.viewMode === 'card' && styles.activeViewModeButtonText
            ]}>
              カード型
            </Text>
          </TouchableOpacity>
        </View>

        {/* フィルター */}
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => handleFilterChange('showNodeLabels', !config.showNodeLabels)}
        >
          <Text style={styles.filterButtonText}>
            {config.showNodeLabels ? '🏷️' : '🏷️'} ラベル
          </Text>
        </TouchableOpacity>
      </View>

      {/* ネットワーク可視化 */}
      <View style={styles.networkContainer}>
        <NetworkVisualization
          cards={filteredCards}
          relationships={networkRelationships}
          config={config}
          onNodeSelect={handleNodeSelect}
        />
      </View>

      {/* 選択されたノードの詳細 */}
      {selectedNodeId && (
        <View style={styles.detailPanel}>
          {(() => {
            const selectedCard = filteredCards.find((card: BoardItem) => card.id === selectedNodeId);
            if (!selectedCard) return null;
            
            return (
              <>
                <Text style={styles.detailTitle}>{selectedCard.title}</Text>
                <Text style={styles.detailType}>{selectedCard.column_type}</Text>
                <Text style={styles.detailContent} numberOfLines={3}>
                  {selectedCard.content}
                </Text>
                {selectedCard.tags && selectedCard.tags.length > 0 && (
                  <View style={styles.tagContainer}>
                    {selectedCard.tags.map((tag: string, index: number) => (
                      <Text key={index} style={styles.tag}>
                        #{tag}
                      </Text>
                    ))}
                  </View>
                )}
              </>
            );
          })()}
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f23',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333366',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#00ff88',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#a6adc8',
  },
  controlPanel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333366',
  },
  viewModeSelector: {
    flexDirection: 'row',
    backgroundColor: '#1a1a2e',
    borderRadius: 8,
    padding: 2,
  },
  viewModeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  activeViewModeButton: {
    backgroundColor: '#00ff88',
  },
  viewModeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#a6adc8',
  },
  activeViewModeButtonText: {
    color: '#0f0f23',
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#1a1a2e',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#333366',
  },
  filterButtonText: {
    fontSize: 12,
    color: '#a6adc8',
    fontWeight: '600',
  },
  networkContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    padding: 20,
    backgroundColor: 'rgba(26, 26, 46, 0.95)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333366',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  spinnerContainer: {
    marginBottom: 20,
  },
  spinner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1a1a2e',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  spinnerRing: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#00ff88',
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
    position: 'absolute',
    animation: 'spin 1s linear infinite',
  },
  spinnerRingDelay: {
    borderColor: 'rgba(0, 255, 136, 0.3)',
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
    animation: 'spin 1.5s linear infinite reverse',
  },
  loadingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#e2e8f0',
    marginBottom: 4,
    fontFamily: 'Space Grotesk, system-ui, sans-serif',
    textAlign: 'center',
  },
  loadingSubtitle: {
    fontSize: 14,
    color: '#a6adc8',
    fontFamily: 'JetBrains Mono, monospace',
    textAlign: 'center',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#00ff88',
    marginRight: 8,
    animation: 'pulse 2s ease-in-out infinite',
    boxShadow: '0 0 8px rgba(0, 255, 136, 0.5)',
  },
  statusText: {
    fontSize: 12,
    color: '#a6adc8',
  },
  detailPanel: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 280,
    backgroundColor: 'rgba(26, 26, 46, 0.95)',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333366',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  detailTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e2e8f0',
    marginBottom: 4,
  },
  detailType: {
    fontSize: 11,
    fontWeight: '600',
    color: '#00ff88',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  detailContent: {
    fontSize: 13,
    color: '#a6adc8',
    lineHeight: 18,
    marginBottom: 12,
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    fontSize: 10,
    color: '#64b5f6',
    backgroundColor: 'rgba(100, 181, 246, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(100, 181, 246, 0.3)',
  },
});

export default AnalysisSpace; 