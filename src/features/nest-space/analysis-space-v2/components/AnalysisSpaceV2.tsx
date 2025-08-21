import React, { memo, useMemo, useState } from 'react';
import { useAnalysisSpace } from '../contexts/AnalysisSpaceContext';
import NetworkCanvas from './NetworkCanvas';
import RelationsSidePeak from './RelationsSidePeak';
import ClusteringSidePeak from './ClusteringSidePeak';
import type { NetworkData } from '../types';

interface AnalysisSpaceV2Props {
  cards: any[]; // 既存のBoardItem型を使用
  relationships: Array<{
    card_id: string;
    related_card_id: string;
    strength: number;
    relationship_type: string;
  }>;
  onNodeSelect?: (nodeId: string) => void;
  onNodeDoubleClick?: (nodeId: string) => void;
}

// データ変換関数（既存のデータ形式から新しい形式へ）
const transformData = (cards: any[], relationships: any[]): NetworkData => {
  const nodes = cards.map(card => ({
    id: card.id,
    x: card.x || Math.random() * 1000,
    y: card.y || Math.random() * 1000,
    size: Math.max(1, (card.tags?.length || 1) * 2),
    type: card.column_type || 'INBOX',
    title: card.title || 'Untitled',
    tags: card.tags || [],
    metadata: {
      description: card.description,
      created_at: card.created_at,
      updated_at: card.updated_at,
    }
  }));

  const edges = relationships.map(rel => ({
    id: `${rel.card_id}-${rel.related_card_id}`,
    source: rel.card_id,
    target: rel.related_card_id,
    strength: rel.strength || 0.5,
    type: rel.relationship_type || 'manual',
    metadata: {
      created_at: new Date().toISOString(),
    }
  }));

  return { nodes, edges };
};

// 分析スペースV2のメインコンポーネント
const AnalysisSpaceV2: React.FC<AnalysisSpaceV2Props> = memo(({
  cards,
  relationships,
  onNodeSelect,
  onNodeDoubleClick
}) => {
  const { state, setActiveSidePanel, setNetworkData } = useAnalysisSpace();

  // データを新しい形式に変換
  const networkData = useMemo(() => {
    return transformData(cards, relationships);
  }, [cards, relationships]);

  // ネットワークデータをコンテキストに設定
  React.useEffect(() => {
    setNetworkData(networkData);
  }, [networkData, setNetworkData]);

  // サイドパネルの切り替え
  const handleSidePanelToggle = (panelType: 'relations' | 'clustering' | 'theory' | 'view' | 'search') => {
    if (state.activeSidePanel === panelType) {
      setActiveSidePanel(null);
    } else {
      setActiveSidePanel(panelType);
    }
  };

  // エラーメッセージの表示
  if (state.error) {
    return (
      <div style={styles.errorContainer}>
        <div style={styles.errorMessage}>
          <span style={styles.errorIcon}>⚠️</span>
          {state.error}
          <button 
            onClick={() => setActiveSidePanel(null)}
            style={styles.errorCloseButton}
          >
            ✕
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* ヘッダー */}
      <div style={styles.header}>
        <div style={styles.title}>
          🚀 分析スペース V2 (ベータ版)
        </div>
        <div style={styles.controls}>
          <button
            onClick={() => handleSidePanelToggle('relations')}
            style={{
              ...styles.controlButton,
              ...(state.activeSidePanel === 'relations' && styles.activeButton)
            }}
          >
            🔗 関連性
          </button>
          <button
            onClick={() => handleSidePanelToggle('clustering')}
            style={{
              ...styles.controlButton,
              ...(state.activeSidePanel === 'clustering' && styles.activeButton)
            }}
          >
            🎯 クラスタリング
          </button>
          <button
            onClick={() => handleSidePanelToggle('theory')}
            style={{
              ...styles.controlButton,
              ...(state.activeSidePanel === 'theory' && styles.activeButton)
            }}
          >
            💡 理論構築
          </button>
          <button
            onClick={() => handleSidePanelToggle('view')}
            style={{
              ...styles.controlButton,
              ...(state.activeSidePanel === 'view' && styles.activeButton)
            }}
          >
            👁️ ビュー
          </button>
          <button
            onClick={() => handleSidePanelToggle('search')}
            style={{
              ...styles.controlButton,
              ...(state.activeSidePanel === 'search' && styles.activeButton)
            }}
          >
            🔍 検索
          </button>
        </div>
      </div>

      {/* メインコンテンツエリア */}
      <div style={styles.content}>
        {/* ネットワークキャンバス */}
        <div style={styles.canvasContainer}>
          <NetworkCanvas
            data={networkData}
            onNodeClick={onNodeSelect}
            onNodeDoubleClick={onNodeDoubleClick}
          />
        </div>

        {/* サイドパネル */}
        {state.activeSidePanel && (
          <div style={styles.sidePanel}>
            <div style={styles.sidePanelHeader}>
              <span style={styles.sidePanelTitle}>
                {state.activeSidePanel === 'relations' && '🔗 関連性分析'}
                {state.activeSidePanel === 'clustering' && '🎯 クラスタリング'}
                {state.activeSidePanel === 'theory' && '💡 理論構築'}
                {state.activeSidePanel === 'view' && '👁️ ビュー管理'}
                {state.activeSidePanel === 'search' && '🔍 検索・フィルター'}
              </span>
              <button
                onClick={() => setActiveSidePanel(null)}
                style={styles.closeButton}
              >
                ✕
              </button>
            </div>
            <div style={styles.sidePanelContent}>
              {state.activeSidePanel === 'relations' && (
                <RelationsSidePeak
                  isOpen={true}
                  onClose={() => setActiveSidePanel(null)}
                />
              )}
              {state.activeSidePanel === 'clustering' && (
                <ClusteringSidePeak
                  isOpen={true}
                  onClose={() => setActiveSidePanel(null)}
                />
              )}
              {(state.activeSidePanel === 'theory' || 
                state.activeSidePanel === 'view' || 
                state.activeSidePanel === 'search') && (
                <div style={styles.placeholderContent}>
                  🚧 {state.activeSidePanel} パネルの実装中...
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ローディング表示 */}
      {state.isLoading && (
        <div style={styles.loadingOverlay}>
          <div style={styles.loadingSpinner}>⏳</div>
          <div style={styles.loadingText}>分析中...</div>
        </div>
      )}
    </div>
  );
});

AnalysisSpaceV2.displayName = 'AnalysisSpaceV2';

// スタイル定義
const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    height: '100vh',
    backgroundColor: '#0f0f23',
    color: '#e2e8f0',
  },
  
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 24px',
    backgroundColor: '#1a1a2e',
    borderBottom: '1px solid #333366',
    zIndex: 100,
  },
  
  title: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#00ff88',
  },
  
  controls: {
    display: 'flex',
    gap: '8px',
  },
  
  controlButton: {
    padding: '8px 16px',
    backgroundColor: '#232345',
    color: '#e2e8f0',
    border: '1px solid #333366',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.2s ease',
    '&:hover': {
      backgroundColor: '#2a2a4a',
    },
  },
  
  activeButton: {
    backgroundColor: '#00ff88',
    color: '#0f0f23',
    borderColor: '#00ff88',
  },
  
  content: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },
  
  canvasContainer: {
    flex: 1,
    position: 'relative' as const,
  },
  
  sidePanel: {
    width: '400px',
    backgroundColor: '#1a1a2e',
    borderLeft: '1px solid #333366',
    display: 'flex',
    flexDirection: 'column' as const,
  },
  
  sidePanelHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    borderBottom: '1px solid #333366',
    backgroundColor: '#232345',
  },
  
  sidePanelTitle: {
    fontSize: '16px',
    fontWeight: '600',
  },
  
  closeButton: {
    padding: '4px 8px',
    backgroundColor: 'transparent',
    color: '#e2e8f0',
    border: 'none',
    cursor: 'pointer',
    fontSize: '16px',
    borderRadius: '4px',
    '&:hover': {
      backgroundColor: '#333366',
    },
  },
  
  sidePanelContent: {
    flex: 1,
    padding: '16px',
    overflow: 'auto',
  },
  
  placeholderContent: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '200px',
    color: '#a6adc8',
    fontSize: '16px',
    fontStyle: 'italic',
  },
  
  loadingOverlay: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 15, 35, 0.8)',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  
  loadingSpinner: {
    fontSize: '48px',
    marginBottom: '16px',
    animation: 'spin 1s linear infinite',
  },
  
  loadingText: {
    fontSize: '18px',
    color: '#e2e8f0',
  },
  
  errorContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    backgroundColor: '#0f0f23',
  },
  
  errorMessage: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px 24px',
    backgroundColor: '#dc2626',
    color: '#ffffff',
    borderRadius: '8px',
    fontSize: '16px',
  },
  
  errorIcon: {
    fontSize: '20px',
  },
  
  errorCloseButton: {
    padding: '4px 8px',
    backgroundColor: 'transparent',
    color: '#ffffff',
    border: '1px solid #ffffff',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    '&:hover': {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
  },
};

export default AnalysisSpaceV2;
