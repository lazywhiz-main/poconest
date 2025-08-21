import React, { memo, useMemo, useState, useCallback, useEffect, useRef, useTransition, Suspense } from 'react';
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
  const [renderPhase, setRenderPhase] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [isPending, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);

  // Intersection Observerによる可視性検出
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          // 可視になったら即座にレンダリング開始
          setRenderPhase(1);
        } else {
          setIsVisible(false);
          setRenderPhase(0);
        }
      },
      {
        threshold: 0.1, // 10%見えたら可視とみなす
        rootMargin: '50px', // 50px手前から可視とみなす
      }
    );

    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
    };
  }, []);

  // データを新しい形式に変換
  const networkData = useMemo(() => {
    return transformData(cards, relationships);
  }, [cards, relationships]);

  // ネットワークデータをコンテキストに設定
  React.useEffect(() => {
    setNetworkData(networkData);
  }, [networkData, setNetworkData]);

  // サイドパネルの切り替え（useTransitionで最適化）
  const handleSidePanelToggle = useCallback((panelType: 'relations' | 'clustering' | 'theory' | 'view' | 'search') => {
    if (state.activeSidePanel === panelType) {
      setActiveSidePanel(null);
      setRenderPhase(1); // 基本表示に戻す
    } else {
      startTransition(() => {
        setActiveSidePanel(panelType);
        setRenderPhase(2); // 即座にサイドパネル表示
      });
    }
  }, [state.activeSidePanel, setActiveSidePanel, startTransition]);

  // サイドパネルを閉じる（useTransitionで最適化）
  const handleCloseSidePanel = useCallback(() => {
    startTransition(() => {
      setActiveSidePanel(null);
      setRenderPhase(1); // 基本表示に戻す
    });
  }, [setActiveSidePanel, startTransition]);

  // レンダリングフェーズの段階的制御
  useEffect(() => {
    if (state.activeSidePanel && renderPhase === 2) {
      // 重いコンテンツを表示
      const timer = setTimeout(() => setRenderPhase(3), 100);
      return () => clearTimeout(timer);
    }
  }, [state.activeSidePanel, renderPhase]);

  // エラーメッセージの表示
  if (state.error) {
    return (
      <div style={styles.errorContainer}>
        <div style={styles.errorMessage}>
          <span style={styles.errorIcon}>⚠️</span>
          {state.error}
          <button 
            onClick={handleCloseSidePanel}
            style={styles.errorCloseButton}
          >
            ✕
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} style={styles.container}>
      {/* ヘッダー */}
      <div style={styles.header}>
        <div style={styles.title}>
          🚀 分析スペース V2 (ベータ版)
          {isPending && <span style={styles.pendingIndicator}> ⏳</span>}
        </div>
        <div style={styles.controls}>
          <button
            onClick={() => handleSidePanelToggle('relations')}
            style={{
              ...styles.controlButton,
              ...(state.activeSidePanel === 'relations' && styles.activeButton)
            }}
            disabled={isPending}
          >
            🔗 関連性
          </button>
          <button
            onClick={() => handleSidePanelToggle('clustering')}
            style={{
              ...styles.controlButton,
              ...(state.activeSidePanel === 'clustering' && styles.activeButton)
            }}
            disabled={isPending}
          >
            🎯 クラスタリング
          </button>
          <button
            onClick={() => handleSidePanelToggle('theory')}
            style={{
              ...styles.controlButton,
              ...(state.activeSidePanel === 'theory' && styles.activeButton)
            }}
            disabled={isPending}
          >
            💡 理論構築
          </button>
          <button
            onClick={() => handleSidePanelToggle('view')}
            style={{
              ...styles.controlButton,
              ...(state.activeSidePanel === 'view' && styles.activeButton)
            }}
            disabled={isPending}
          >
            👁️ ビュー
          </button>
          <button
            onClick={() => handleSidePanelToggle('search')}
            style={{
              ...styles.controlButton,
              ...(state.activeSidePanel === 'search' && styles.activeButton)
            }}
            disabled={isPending}
          >
            🔍 検索
          </button>
        </div>
      </div>

      {/* メインコンテンツエリア */}
      <div style={styles.content}>
        {/* ネットワークキャンバス */}
        <div style={styles.canvasContainer}>
          <Suspense fallback={<div style={styles.loadingFallback}>読み込み中...</div>}>
            <NetworkCanvas
              data={networkData}
              onNodeClick={onNodeSelect}
              onNodeDoubleClick={onNodeDoubleClick}
            />
          </Suspense>
        </div>

        {/* サイドパネル（段階的表示） */}
        {state.activeSidePanel && renderPhase >= 2 && (
          <div style={{
            ...styles.sidePanel,
            ...(renderPhase === 2 && styles.phase2),
            ...(renderPhase === 3 && styles.phase3),
          }}>
            <div style={styles.sidePanelHeader}>
              <span style={styles.sidePanelTitle}>
                {state.activeSidePanel === 'relations' && '🔗 関連性分析'}
                {state.activeSidePanel === 'clustering' && '🎯 クラスタリング'}
                {state.activeSidePanel === 'theory' && '💡 理論構築'}
                {state.activeSidePanel === 'view' && '👁️ ビュー管理'}
                {state.activeSidePanel === 'search' && '🔍 検索・フィルター'}
              </span>
              <button
                onClick={handleCloseSidePanel}
                style={styles.closeButton}
                disabled={isPending}
              >
                ✕
              </button>
            </div>
            <div style={styles.sidePanelContent}>
              {/* Phase 2: 軽量コンテンツ */}
              {renderPhase >= 2 && (
                <Suspense fallback={<div style={styles.loadingFallback}>パネル読み込み中...</div>}>
                  <>
                    {state.activeSidePanel === 'relations' && (
                      <RelationsSidePeak
                        isOpen={true}
                        onClose={handleCloseSidePanel}
                      />
                    )}
                    {state.activeSidePanel === 'clustering' && (
                      <ClusteringSidePeak
                        isOpen={true}
                        onClose={handleCloseSidePanel}
                      />
                    )}
                  </>
                </Suspense>
              )}
              
              {/* Phase 3: 重いコンテンツ */}
              {renderPhase >= 3 && (
                <>
                  {(state.activeSidePanel === 'theory' || 
                    state.activeSidePanel === 'view' || 
                    state.activeSidePanel === 'search') && (
                    <div style={styles.placeholderContent}>
                      🚧 {state.activeSidePanel} パネルの実装中...
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

AnalysisSpaceV2.displayName = 'AnalysisSpaceV2';

// スタイル定義
const styles = {
  // レンダリング制御のためのアニメーション
  '@keyframes slideIn': {
    from: {
      transform: 'translateX(100%)',
      opacity: 0,
    },
    to: {
      transform: 'translateX(0)',
      opacity: 1,
    },
  },
  '@keyframes fadeIn': {
    from: {
      opacity: 0,
      transform: 'translateY(10px)',
    },
    to: {
      opacity: 1,
      transform: 'translateY(0)',
    },
  },
  // 段階的表示のためのスタイル
  phase1: {
    opacity: 1,
    transform: 'translateX(0)',
    transition: 'opacity 0.2s ease-out',
    willChange: 'auto',
  },
  phase2: {
    animation: 'slideIn 0.3s ease-out',
    willChange: 'transform, opacity',
  },
  phase3: {
    animation: 'fadeIn 0.4s ease-out 0.1s both',
    willChange: 'transform, opacity',
  },
  // 初期レンダリング安定化
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    height: '100%',
    backgroundColor: '#0f0f23',
    color: '#ffffff',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    willChange: 'auto',
    contain: 'layout style paint',
    // レンダリング安定化のための追加プロパティ
    transform: 'translateZ(0)', // GPU加速強制
    backfaceVisibility: 'hidden' as const,
    perspective: '1000px',
    transformStyle: 'preserve-3d' as const,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 24px',
    borderBottom: '1px solid #333366',
    backgroundColor: '#1a1a2e',
    willChange: 'auto',
    contain: 'layout style',
    // レンダリング安定化
    transform: 'translateZ(0)',
    backfaceVisibility: 'hidden' as const,
  },
  title: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#00ff88',
  },
  pendingIndicator: {
    fontSize: '16px',
    color: '#ffd700', // 金の色
  },
  controls: {
    display: 'flex',
    gap: '8px',
    willChange: 'auto',
    // レンダリング安定化
    transform: 'translateZ(0)',
  },
  controlButton: {
    padding: '8px 16px',
    border: '1px solid #333366',
    borderRadius: '6px',
    backgroundColor: '#1a1a2e',
    color: '#ffffff',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontSize: '14px',
    willChange: 'auto',
    contain: 'layout style',
    // レンダリング安定化
    transform: 'translateZ(0)',
    backfaceVisibility: 'hidden' as const,
  },
  activeButton: {
    backgroundColor: '#00ff88',
    color: '#000000',
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
    willChange: 'transform, opacity',
    contain: 'layout style paint',
    backfaceVisibility: 'hidden' as const,
    // レンダリング安定化の強化
    transform: 'translateZ(0)',
    perspective: '1000px',
    transformStyle: 'preserve-3d' as const,
    // 初期状態の安定化
    opacity: 1,
  },
  sidePanelHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid #333366',
    backgroundColor: '#2a2a3e',
  },
  sidePanelTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#00ff88',
  },
  closeButton: {
    padding: '4px 8px',
    border: 'none',
    borderRadius: '4px',
    backgroundColor: '#ff4757',
    color: '#ffffff',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'background-color 0.2s ease',
  },
  sidePanelContent: {
    flex: 1,
    padding: '20px',
    overflow: 'auto',
  },
  placeholderContent: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '200px',
    color: '#888888',
    fontSize: '16px',
    fontStyle: 'italic',
  },
  loadingFallback: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: '#888888',
    fontSize: '18px',
    fontWeight: 'bold',
  },
  errorContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    backgroundColor: '#0f0f23',
  },
  errorMessage: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '20px',
    backgroundColor: '#ff4757',
    color: '#ffffff',
    borderRadius: '8px',
    fontSize: '16px',
  },
  errorIcon: {
    fontSize: '20px',
  },
  errorCloseButton: {
    padding: '4px 8px',
    border: 'none',
    borderRadius: '4px',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    color: '#ffffff',
    cursor: 'pointer',
    fontSize: '14px',
    marginLeft: '12px',
  },
};

export default AnalysisSpaceV2;
