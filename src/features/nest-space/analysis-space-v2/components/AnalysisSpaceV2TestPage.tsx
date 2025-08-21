import React, { useState, useMemo } from 'react';
import { useBoardSpace } from '../../board-space/hooks/useBoardSpace';
import AnalysisSpaceV2 from './AnalysisSpaceV2';
import type { BoardItem } from '../../../../services/SmartClusteringService';

interface AnalysisSpaceV2TestPageProps {
  nestId: string;
}

const AnalysisSpaceV2TestPage: React.FC<AnalysisSpaceV2TestPageProps> = ({ nestId }) => {
  const { allCards, boardSpaceState } = useBoardSpace();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showDebugInfo, setShowDebugInfo] = useState(false);

  // サンプルデータの生成（テスト用）
  const sampleData = useMemo(() => {
    if (allCards.length === 0) {
      // カードがない場合はサンプルデータを生成
      return {
        cards: [
          {
            id: 'sample-1',
            title: 'サンプルカード1',
            content: 'これはテスト用のサンプルカードです。',
            column_type: 'INBOX',
            tags: ['テスト', 'サンプル'],
            x: 100,
            y: 100,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: 'sample-2',
            title: 'サンプルカード2',
            content: '分析スペースV2のテスト用カードです。',
            column_type: 'INSIGHTS',
            tags: ['分析', 'V2'],
            x: 300,
            y: 200,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: 'sample-3',
            title: 'サンプルカード3',
            content: 'パフォーマンステスト用のカードです。',
            column_type: 'THEMES',
            tags: ['パフォーマンス', '最適化'],
            x: 500,
            y: 150,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
        relationships: [
          {
            card_id: 'sample-1',
            related_card_id: 'sample-2',
            strength: 0.8,
            relationship_type: 'semantic',
          },
          {
            card_id: 'sample-2',
            related_card_id: 'sample-3',
            strength: 0.6,
            relationship_type: 'manual',
          },
          {
            card_id: 'sample-1',
            related_card_id: 'sample-3',
            strength: 0.4,
            relationship_type: 'derived',
          },
        ],
      };
    }

    // 実際のカードデータがある場合はそれを使用
    const filteredCards = allCards.filter((card: BoardItem) => 
      card.column_type && ['INBOX', 'QUESTIONS', 'INSIGHTS', 'THEMES', 'ACTIONS'].includes(card.column_type)
    );

    const relationships = allCards.flatMap((card: BoardItem) => 
      (card.related_cards || []).map((relatedCard: BoardItem) => ({
        card_id: card.id,
        related_card_id: relatedCard.id,
        strength: 0.7,
        relationship_type: 'manual' as const,
      }))
    );

    return { cards: filteredCards, relationships };
  }, [allCards]);

  const handleNodeSelect = (nodeId: string) => {
    setSelectedNodeId(nodeId);
    console.log('🔍 ノード選択:', nodeId);
  };

  const handleNodeDoubleClick = (nodeId: string) => {
    console.log('🔍 ノードダブルクリック:', nodeId);
    // カード詳細モーダルを開くなどの処理
  };

  const handleEdgeClick = (edgeId: string) => {
    console.log('🔗 エッジクリック:', edgeId);
  };

  const toggleDebugInfo = () => {
    setShowDebugInfo(!showDebugInfo);
  };

  return (
    <div style={styles.container}>
      {/* ヘッダー */}
      <div style={styles.header}>
        <div style={styles.headerContent}>
          <h1 style={styles.title}>🚀 分析スペース V2 テストページ</h1>
          <p style={styles.description}>
            新しい最適化された分析スペースの実装をテストできます。
          </p>
        </div>
        <div style={styles.headerActions}>
          <button
            onClick={toggleDebugInfo}
            style={styles.debugButton}
          >
            {showDebugInfo ? '🔒 デバッグ情報を隠す' : '🔓 デバッグ情報を表示'}
          </button>
        </div>
      </div>

      {/* デバッグ情報 */}
      {showDebugInfo && (
        <div style={styles.debugPanel}>
          <h3 style={styles.debugTitle}>デバッグ情報</h3>
          <div style={styles.debugContent}>
            <div style={styles.debugSection}>
              <strong>データ統計:</strong>
              <ul>
                <li>カード数: {sampleData.cards.length}</li>
                <li>関係性数: {sampleData.relationships.length}</li>
                <li>選択されたノード: {selectedNodeId || 'なし'}</li>
              </ul>
            </div>
            <div style={styles.debugSection}>
              <strong>カードタイプ分布:</strong>
              <ul>
                {Object.entries(
                  sampleData.cards.reduce((acc, card) => {
                    acc[card.column_type] = (acc[card.column_type] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>)
                ).map(([type, count]) => (
                  <li key={type}>{type}: {count}個</li>
                ))}
              </ul>
            </div>
            <div style={styles.debugSection}>
              <strong>関係性タイプ分布:</strong>
              <ul>
                {Object.entries(
                  sampleData.relationships.reduce((acc, rel) => {
                    acc[rel.relationship_type] = (acc[rel.relationship_type] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>)
                ).map(([type, count]) => (
                  <li key={type}>{type}: {count}個</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* メインコンテンツ */}
      <div style={styles.mainContent}>
        <AnalysisSpaceV2
          cards={sampleData.cards}
          relationships={sampleData.relationships}
          onNodeSelect={handleNodeSelect}
          onNodeDoubleClick={handleNodeDoubleClick}
        />
      </div>

      {/* 選択されたノードの情報 */}
      {selectedNodeId && (
        <div style={styles.nodeInfoPanel}>
          <h3 style={styles.nodeInfoTitle}>選択されたノード</h3>
          <div style={styles.nodeInfoContent}>
            {(() => {
              const selectedCard = sampleData.cards.find(card => card.id === selectedNodeId);
              if (!selectedCard) return <p>ノードが見つかりません</p>;
              
              return (
                <div>
                  <h4 style={styles.nodeTitle}>{selectedCard.title}</h4>
                  <p style={styles.nodeType}>タイプ: {selectedCard.column_type}</p>
                  <p style={styles.nodeContent}>{selectedCard.content}</p>
                  {selectedCard.tags && selectedCard.tags.length > 0 && (
                    <div style={styles.nodeTags}>
                      <strong>タグ:</strong>
                      {selectedCard.tags.map((tag, index) => (
                        <span key={index} style={styles.tag}>#{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

// スタイル定義
const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#0f0f23',
    color: '#e2e8f0',
  },
  
  header: {
    padding: '24px',
    backgroundColor: '#1a1a2e',
    borderBottom: '1px solid #333366',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  
  headerContent: {
    flex: 1,
  },
  
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#00ff88',
    margin: '0 0 8px 0',
  },
  
  description: {
    fontSize: '16px',
    color: '#a6adc8',
    margin: 0,
  },
  
  headerActions: {
    display: 'flex',
    gap: '12px',
  },
  
  debugButton: {
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
  
  debugPanel: {
    padding: '20px',
    backgroundColor: '#1a1a2e',
    borderBottom: '1px solid #333366',
  },
  
  debugTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#e2e8f0',
    margin: '0 0 16px 0',
  },
  
  debugContent: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px',
  },
  
  debugSection: {
    backgroundColor: '#232345',
    padding: '16px',
    borderRadius: '8px',
    border: '1px solid #333366',
  },
  
  mainContent: {
    height: 'calc(100vh - 200px)',
    minHeight: '600px',
  },
  
  nodeInfoPanel: {
    position: 'fixed' as const,
    bottom: '20px',
    right: '20px',
    width: '300px',
    maxHeight: '400px',
    backgroundColor: '#1a1a2e',
    border: '1px solid #333366',
    borderRadius: '8px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
    zIndex: 1000,
  },
  
  nodeInfoTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#e2e8f0',
    margin: '0',
    padding: '16px',
    borderBottom: '1px solid #333366',
    backgroundColor: '#232345',
    borderRadius: '8px 8px 0 0',
  },
  
  nodeInfoContent: {
    padding: '16px',
    maxHeight: '300px',
    overflow: 'auto',
  },
  
  nodeTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#00ff88',
    margin: '0 0 8px 0',
  },
  
  nodeType: {
    fontSize: '14px',
    color: '#a6adc8',
    margin: '0 0 8px 0',
  },
  
  nodeContent: {
    fontSize: '14px',
    color: '#e2e8f0',
    margin: '0 0 12px 0',
    lineHeight: '1.5',
  },
  
  nodeTags: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '8px',
    alignItems: 'center',
  },
  
  tag: {
    backgroundColor: '#333366',
    color: '#e2e8f0',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
  },
};

export default AnalysisSpaceV2TestPage;
