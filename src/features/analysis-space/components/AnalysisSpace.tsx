import React, { useState, useEffect } from 'react';
import NetworkVisualization from '../../nest-space/analysis-space/components/NetworkVisualization';
import { AnalysisService, type NetworkAnalysisData } from '../../../services/AnalysisService';
import { useBoardContext } from '../../board-space/contexts/BoardContext';

interface AnalysisSpaceProps {
  onReturnToSearch?: () => void;
}

const AnalysisSpace: React.FC<AnalysisSpaceProps> = ({ onReturnToSearch }) => {
  const { state: boardState, isLoading: boardLoading } = useBoardContext();
  const [analysisData, setAnalysisData] = useState<NetworkAnalysisData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 現在のNest IDからBoard IDを取得
  const currentNestId = boardState.currentNestId;
  const currentBoardId = boardState.boardId;
  const hasCards = boardState.cards.length > 0;

  // デバッグ情報を追加
  console.log('[AnalysisSpace] Current state:', {
    currentNestId,
    currentBoardId,
    hasCards,
    cardsLength: boardState.cards.length,
    boardLoading,
    loading
  });

  // URLからのNest ID取得も確認
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlNestId = params.get('nestId');
      console.log('[AnalysisSpace] URL nestId:', urlNestId);
      console.log('[AnalysisSpace] BoardState nestId:', currentNestId);
    }
  }, [currentNestId]);

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

  // 分析データを取得する関数
  const fetchNetworkData = async (boardId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('[AnalysisSpace] Fetching network data for board:', boardId);
      const data: NetworkAnalysisData = await AnalysisService.getNetworkAnalysisData(boardId);
      
      console.log('[AnalysisSpace] Retrieved data:', {
        cardsCount: data.cards.length,
        relationshipsCount: data.relationships.length,
        cards: data.cards.map(c => ({ id: c.id, title: c.title })),
        relationships: data.relationships.map(r => ({ 
          id: r.id, 
          from: r.card_id, 
          to: r.related_card_id, 
          type: r.relationship_type 
        }))
      });
      
      if (data.cards.length === 0) {
        console.log('[AnalysisSpace] No cards found for analysis');
        setError('このボードにはカードがありません。まずボードにカードを追加してください。');
        return;
      }

      // 関係性がない場合はサンプルを作成
      if (data.relationships.length === 0) {
        console.log('[AnalysisSpace] No relationships found, creating sample relationships');
        await AnalysisService.createSampleRelationships(boardId);
        // サンプル作成後に再取得
        const updatedData = await AnalysisService.getNetworkAnalysisData(boardId);
        data.relationships = updatedData.relationships;
        console.log('[AnalysisSpace] After sample creation:', {
          relationshipsCount: data.relationships.length
        });
      }

      setAnalysisData(data);
      
      console.log('[AnalysisSpace] Network data loaded successfully:', {
        cards: data.cards.length,
        relationships: data.relationships.length
      });
    } catch (err) {
      console.error('[AnalysisSpace] Failed to fetch network data:', err);
      setError('ネットワークデータの取得に失敗しました。もう一度お試しください。');
    } finally {
      setLoading(false);
    }
  };

  // Board IDが利用可能になったら分析データを取得
  useEffect(() => {
    console.log('[AnalysisSpace] Analysis data fetch check:', {
      currentBoardId,
      hasCards,
      shouldFetch: currentBoardId && hasCards
    });

    if (currentBoardId && hasCards) {
      fetchNetworkData(currentBoardId);
    } else if (currentBoardId && !hasCards) {
      console.log('[AnalysisSpace] Board ID exists but no cards found in BoardContext');
    }
  }, [currentBoardId, hasCards]);

  // サンプルデータ再生成
  const handleRegenerateData = async () => {
    if (!currentBoardId) return;
    
    if (window.confirm('新しいサンプル関係性データを生成しますか？既存の関係性は保持されます。')) {
      setLoading(true);
      try {
        await AnalysisService.createSampleRelationships(currentBoardId);
        await fetchNetworkData(currentBoardId);
      } catch (err) {
        console.error('Failed to regenerate data:', err);
        setError('データの生成に失敗しました。');
      } finally {
        setLoading(false);
      }
    }
  };

  // Board へのナビゲーション
  const handleNavigateToBoard = () => {
    if (typeof window !== 'undefined' && currentNestId) {
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.set('space', 'board');
      window.location.href = currentUrl.toString();
    }
  };

  // ローディング状態
  if (boardLoading || loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingContainer}>
          <div style={styles.loadingContent}>
            {/* ローディングスピナー */}
            <div style={styles.spinnerContainer}>
              <div style={styles.spinner}>
                <div style={styles.spinnerRing}></div>
                <div style={styles.spinnerRingDelay}></div>
              </div>
            </div>
            
            {/* ローディングテキスト */}
            <div style={styles.loadingTitle}>思考の地図を生成中</div>
            <div style={styles.loadingSubtitle}>
              {boardLoading ? 'ボード情報を読み込み中...' : 'カードネットワークを分析しています...'}
            </div>
            
            {/* ステータス表示 */}
            <div style={styles.statusContainer}>
              <div style={styles.statusDot}></div>
              <div style={styles.statusText}>データ取得完了</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Nest が選択されていない
  if (!currentNestId) {
    return (
      <div style={styles.container}>
        <div style={styles.centerContent}>
          <div style={styles.emptyIcon}>🏠</div>
          <div style={styles.emptyTitle}>Nest を選択してください</div>
          <div style={styles.emptyDescription}>
            分析を開始するには、まず Nest を選択する必要があります。
          </div>
        </div>
      </div>
    );
  }

  // カードがない場合
  if (!hasCards) {
    return (
      <div style={styles.container}>
        <div style={styles.centerContent}>
          <div style={styles.emptyIcon}>📊</div>
          <div style={styles.emptyTitle}>カードがありません</div>
          <div style={styles.emptyDescription}>
            ネットワーク分析を行うには、まずボードにカードを追加してください。
            カード間の関係性を分析して、視覚的なネットワークを生成します。
          </div>
          <button style={styles.primaryButton} onClick={handleNavigateToBoard}>
            ボードでカードを作成
          </button>
        </div>
      </div>
    );
  }

  // エラー状態
  if (error) {
  return (
      <div style={styles.container}>
        <div style={styles.centerContent}>
          <div style={styles.errorIcon}>⚠️</div>
          <div style={styles.errorTitle}>データの取得に失敗</div>
          <div style={styles.errorDescription}>{error}</div>
          <div style={styles.buttonGroup}>
            <button 
              style={styles.primaryButton} 
              onClick={() => currentBoardId && fetchNetworkData(currentBoardId)}
            >
              再試行
            </button>
            <button style={styles.secondaryButton} onClick={handleRegenerateData}>
              サンプル生成
            </button>
          </div>
        </div>
      </div>
    );
  }

  // データなし
  if (!analysisData || analysisData.cards.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.centerContent}>
          <div style={styles.emptyIcon}>🔗</div>
          <div style={styles.emptyTitle}>分析データがありません</div>
          <div style={styles.emptyDescription}>
            カードは存在しますが、ネットワーク分析用のデータが見つかりませんでした。
            サンプルデータを生成して分析を開始できます。
          </div>
          <button style={styles.primaryButton} onClick={handleRegenerateData}>
            サンプルデータを生成
          </button>
        </div>
      </div>
    );
  }

  // メイン表示
  return (
    <div style={styles.container}>
      <div style={styles.networkContainer}>
        <NetworkVisualization 
          cards={analysisData.cards}
          relationships={analysisData.relationships}
          config={analysisData.config}
          onNodeSelect={(nodeId) => console.log('Selected node:', nodeId)}
        />
      </div>
    </div>
  );
};

// Web用のCSS-in-JSスタイル
const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    height: '100%',
    backgroundColor: '#0f0f23',
    overflow: 'hidden',
  },
  centerContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'center',
    alignItems: 'center',
    padding: '32px',
    maxWidth: '480px',
    alignSelf: 'center',
  },
  header: {
    backgroundColor: '#FFFFFF',
    borderBottom: '1px solid #F0EDE6',
    padding: '20px 24px',
  },
  headerContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#2D3748',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
  },
  statsContainer: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#F7F2E8',
    padding: '8px 16px',
    borderRadius: '12px',
  },
  statItem: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    minWidth: '60px',
  },
  statValue: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#2D3748',
  },
  statLabel: {
    fontSize: '12px',
    color: '#718096',
    marginTop: '2px',
  },
  statDivider: {
    width: '1px',
    height: '24px',
    backgroundColor: '#E2D5C7',
    margin: '0 12px',
  },
  networkContainer: {
    flex: 1,
    position: 'relative' as const,
    overflow: 'hidden',
  },
  controls: {
    display: 'flex',
    padding: '20px',
    backgroundColor: '#FFFFFF',
    borderTop: '1px solid #F0EDE6',
    justifyContent: 'space-around',
  },
  controlButton: {
    padding: '12px 16px',
    backgroundColor: '#F7F2E8',
    borderRadius: '10px',
    border: '1px solid #E2D5C7',
    minWidth: '100px',
    textAlign: 'center' as const,
    cursor: 'pointer',
    color: '#2D3748',
    fontSize: '14px',
    fontWeight: '500',
  },
  // Empty/Error States
  emptyIcon: {
    fontSize: '64px',
    marginBottom: '16px',
  },
  emptyTitle: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: '8px',
    textAlign: 'center' as const,
  },
  emptyDescription: {
    fontSize: '16px',
    color: '#718096',
    textAlign: 'center' as const,
    lineHeight: '24px',
    marginBottom: '24px',
  },
  errorIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  errorTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#E53E3E',
    marginBottom: '8px',
    textAlign: 'center' as const,
  },
  errorDescription: {
    fontSize: '16px',
    color: '#718096',
    textAlign: 'center' as const,
    lineHeight: '24px',
    marginBottom: '24px',
  },
  // Buttons
  primaryButton: {
    padding: '14px 24px',
    backgroundColor: '#D69E2E',
    borderRadius: '12px',
    margin: '4px 0',
    minWidth: '180px',
    textAlign: 'center' as const,
    color: '#FFFFFF',
    fontSize: '16px',
    fontWeight: '600',
    border: 'none',
    cursor: 'pointer',
  },
  secondaryButton: {
    padding: '14px 24px',
    backgroundColor: '#FFFFFF',
    border: '2px solid #D69E2E',
    borderRadius: '12px',
    margin: '4px 0',
    minWidth: '180px',
    textAlign: 'center' as const,
    color: '#D69E2E',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  buttonGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '8px',
  },
  loadingContainer: {
    flex: 1,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    padding: '20px',
    backgroundColor: 'rgba(26, 26, 46, 0.95)',
    borderRadius: '12px',
    border: '1px solid #333366',
    textAlign: 'center' as const,
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
    backdropFilter: 'blur(12px)',
  },
  spinnerContainer: {
    marginBottom: '20px',
    display: 'flex',
    justifyContent: 'center',
  },
  spinner: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: '#1a1a2e',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative' as const,
  },
  spinnerRing: {
    position: 'absolute' as const,
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    border: '2px solid #00ff88',
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
    animation: 'spin 1s linear infinite',
  },
  spinnerRingDelay: {
    position: 'absolute' as const,
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    border: '2px solid rgba(0, 255, 136, 0.3)',
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
    animation: 'spin 1.5s linear infinite reverse',
  },
  loadingTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#e2e8f0',
    marginBottom: '4px',
    fontFamily: 'Space Grotesk, system-ui, sans-serif',
  },
  loadingSubtitle: {
    fontSize: '14px',
    color: '#a6adc8',
    fontFamily: 'JetBrains Mono, monospace',
  },
  statusContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: '20px',
  },
  statusDot: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    backgroundColor: '#00ff88',
    marginRight: '8px',
    animation: 'pulse 2s ease-in-out infinite',
    boxShadow: '0 0 8px rgba(0, 255, 136, 0.5)',
  },
  statusText: {
    fontSize: '12px',
    color: '#a6adc8',
  },
};

export default AnalysisSpace; 