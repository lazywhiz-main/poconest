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
import { useBoardContext } from '../../../board-space/contexts/BoardContext';
import NetworkVisualization from './NetworkVisualization';
import type { NetworkVisualizationConfig } from '../../../../types/analysis';
import type { BoardItem } from '../../../../services/SmartClusteringService';

// 分析スペースV2のインポート
import AnalysisSpaceV2, { AnalysisSpaceV2TestPage } from '../../../../features/nest-space/analysis-space-v2';

interface AnalysisSpaceProps {
  nestId: string;
}

const AnalysisSpace: React.FC<AnalysisSpaceProps> = ({ nestId }) => {
  const { allCards, boardSpaceState } = useBoardSpace();
  const { state } = useBoardContext();
  const [useBetaVersion, setUseBetaVersion] = useState(false);
  const [showTestPage, setShowTestPage] = useState(false);
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

  // ベータ版の切り替え
  const toggleBetaVersion = () => {
    setUseBetaVersion(!useBetaVersion);
    setShowTestPage(false);
  };

  // テストページの切り替え
  const toggleTestPage = () => {
    setShowTestPage(!showTestPage);
    setUseBetaVersion(false);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <View style={styles.loadingContent}>
            {/* ローディングスピナー */}
            <View style={styles.spinner} />
            <Text style={styles.loadingText}>分析スペースを読み込み中...</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // テストページを表示する場合
  if (showTestPage) {
    return (
      <SafeAreaView style={styles.container}>
        {/* テストページヘッダー */}
        <View style={styles.testHeader}>
          <View style={styles.testHeaderContent}>
            <Text style={styles.testTitle}>🧪 分析スペース V2 テストページ</Text>
            <Text style={styles.testDescription}>
              専用のテスト環境で新しい実装をテストできます。
            </Text>
          </View>
          <TouchableOpacity
            style={styles.testToggleButton}
            onPress={toggleTestPage}
          >
            <Text style={styles.testToggleText}>従来版に戻す</Text>
          </TouchableOpacity>
        </View>
        
        {/* テストページ */}
        <AnalysisSpaceV2TestPage nestId={nestId} />
      </SafeAreaView>
    );
  }

  // ベータ版を使用する場合
  if (useBetaVersion) {
    return (
      <SafeAreaView style={styles.container}>
        {/* ベータ版ヘッダー */}
        <View style={styles.betaHeader}>
          <View style={styles.betaHeaderContent}>
            <Text style={styles.betaTitle}>🚀 分析スペース V2 (ベータ版)</Text>
            <Text style={styles.betaDescription}>
              新しい最適化された実装です。パフォーマンスが大幅に向上しています。
            </Text>
          </View>
          <TouchableOpacity
            style={styles.betaToggleButton}
            onPress={toggleBetaVersion}
          >
            <Text style={styles.betaToggleText}>従来版に戻す</Text>
          </TouchableOpacity>
        </View>
        
        {/* ベータ版の分析スペース */}
        <AnalysisSpaceV2
          cards={filteredCards}
          relationships={networkRelationships}
          onNodeSelect={handleNodeSelect}
          onNodeDoubleClick={handleNodeSelect}
          boardId={state.boardId || 'default-board-id'}
          nestId={nestId}
        />
      </SafeAreaView>
    );
  }

  // 従来版の分析スペース
  return (
    <SafeAreaView style={styles.container}>
      {/* 従来版ヘッダー */}
      <View style={styles.legacyHeader}>
        <View style={styles.legacyHeaderContent}>
          <Text style={styles.legacyTitle}>📊 分析スペース</Text>
          <Text style={styles.legacyDescription}>
            従来の実装です。新しいベータ版をお試しください。
          </Text>
        </View>
        <View style={styles.legacyHeaderActions}>
          <TouchableOpacity
            style={styles.betaToggleButton}
            onPress={toggleBetaVersion}
          >
            <Text style={styles.betaToggleText}>ベータ版を試す</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.testToggleButton}
            onPress={toggleTestPage}
          >
            <Text style={styles.testToggleText}>テストページ</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 従来のネットワーク可視化 */}
      <NetworkVisualization
        cards={filteredCards}
        relationships={networkRelationships}
        config={config}
        onNodeSelect={handleNodeSelect}
        onNodeDoubleClick={handleNodeSelect}
      />
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
  // ベータ版スタイル
  betaHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333366',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  betaHeaderContent: {
    flex: 1,
    marginRight: 10,
  },
  betaTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#00ff88',
    marginBottom: 4,
  },
  betaDescription: {
    fontSize: 12,
    color: '#a6adc8',
  },
  betaToggleButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#1a1a2e',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#333366',
  },
  betaToggleText: {
    fontSize: 12,
    color: '#a6adc8',
    fontWeight: '600',
  },
  // 従来版スタイル
  legacyHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333366',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  legacyHeaderContent: {
    flex: 1,
    marginRight: 10,
  },
  legacyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#00ff88',
    marginBottom: 4,
  },
  legacyDescription: {
    fontSize: 12,
    color: '#a6adc8',
  },
  loadingText: {
    fontSize: 14,
    color: '#a6adc8',
    marginTop: 10,
  },
  
  // テストページスタイル
  testHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333366',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  testHeaderContent: {
    flex: 1,
    marginRight: 10,
  },
  testTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fbbf24',
    marginBottom: 4,
  },
  testDescription: {
    fontSize: 12,
    color: '#a6adc8',
  },
  testToggleButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#1a1a2e',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#333366',
  },
  testToggleText: {
    fontSize: 12,
    color: '#a6adc8',
    fontWeight: '600',
  },
  
  // 従来版ヘッダーアクション
  legacyHeaderActions: {
    display: 'flex',
    flexDirection: 'row',
    gap: 8,
  },
});

export default AnalysisSpace; 