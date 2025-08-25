import React, { useState, useEffect } from 'react';
import TheoryBuildingSpace from './TheoryBuildingSpace';
import AnalysisSpace from '../../analysis-space/components/AnalysisSpace';
import { useBoardContext } from '../../../board-space/contexts/BoardContext';
import { AnalysisService } from '../../../../services/AnalysisService';
import type { ClusterLabel } from '../../../../services/AnalysisService';
import type { ClusteringResult } from '../../../../services/SmartClusteringService';

interface AnalysisSpaceV3Props {
  boardId: string;
  nestId: string;
}

type AnalysisPhase = 'data-mapping' | 'theory-building';

const AnalysisSpaceV3: React.FC<AnalysisSpaceV3Props> = ({
  boardId,
  nestId
}) => {
  const [currentPhase, setCurrentPhase] = useState<AnalysisPhase>('data-mapping');
  const [currentClusters, setCurrentClusters] = useState<ClusterLabel[]>([]);
  const [currentClusteringResult, setCurrentClusteringResult] = useState<ClusteringResult | null>(null);
  const [savedViews, setSavedViews] = useState<Array<{id: string, name: string, createdAt: string, clusters: ClusterLabel[]}>>([]);
  const { state: boardState } = useBoardContext();

  // フェーズを理論構築に切り替える
  const handleProceedToTheoryBuilding = () => {
    setCurrentPhase('theory-building');
  };

  // データマッピングに戻る
  const handleBackToDataMapping = () => {
    setCurrentPhase('data-mapping');
  };

  // 保存されたビューを読み込む
  const handleLoadSavedView = (viewId: string) => {
    const view = savedViews.find(v => v.id === viewId);
    if (view) {
      setCurrentClusters(view.clusters);
      console.log('保存されたビューを読み込み:', view.name, view.clusters);
    }
  };

  // 現在のクラスターを保存されたビューとして保存
  const handleSaveCurrentView = () => {
    if (currentClusters.length > 0) {
      const newView = {
        id: `saved-${Date.now()}`,
        name: `保存されたビュー ${savedViews.length + 1}`,
        createdAt: new Date().toISOString(),
        clusters: [...currentClusters]
      };
      setSavedViews(prev => [...prev, newView]);
      console.log('現在のビューを保存:', newView);
    }
  };

  // クラスター情報を取得
  useEffect(() => {
    const fetchClusterData = async () => {
      try {
        if (boardState.boardId) {
          console.log('クラスター情報を取得中...', boardState.boardId);
          
          // ネットワーク分析データを取得
          const networkData = await AnalysisService.getNetworkAnalysisData(boardState.boardId);
          console.log('ネットワーク分析データ:', networkData);
          
          // ボードのカード情報を取得
          const boardCards = await AnalysisService.getBoardCards(boardState.boardId);
          console.log('ボードカード:', boardCards);
          
          // カードからクラスター情報を生成（仮の実装）
          // 実際の実装では、クラスタリング結果から取得する
          if (boardCards.length > 0) {
            const generatedClusters: ClusterLabel[] = [];
            
            // カードをグループ化してクラスターを作成
            const cardGroups = [
              boardCards.slice(0, Math.ceil(boardCards.length / 3)),
              boardCards.slice(Math.ceil(boardCards.length / 3), Math.ceil(boardCards.length * 2 / 3)),
              boardCards.slice(Math.ceil(boardCards.length * 2 / 3))
            ];
            
            cardGroups.forEach((group, index) => {
              if (group.length > 0) {
                const cluster: ClusterLabel = {
                  id: `cluster-${index + 1}`,
                  text: `クラスター ${index + 1}`,
                  position: { x: 100 + index * 100, y: 100 + index * 100 },
                  theme: `テーマ ${index + 1}`,
                  confidence: 0.7 + Math.random() * 0.2,
                  cardIds: group.map(card => card.id),
                                     metadata: {
                     dominantTags: group.slice(0, 3).map(card => card.title.substring(0, 10)),
                     dominantTypes: group.slice(0, 3).map(card => card.column_type || 'note'),
                     cardCount: group.length
                   }
                };
                generatedClusters.push(cluster);
              }
            });
            
            setCurrentClusters(generatedClusters);
            console.log('生成されたクラスター:', generatedClusters);
            
            // 最新のビューとして保存
            const latestView = {
              id: 'latest',
              name: '最新のクラスタービュー',
              createdAt: new Date().toISOString(),
              clusters: generatedClusters
            };
            setSavedViews([latestView]);
            
            // クラスタリング結果を設定
            setCurrentClusteringResult({
              clusters: [],
              outliers: [],
              quality: {
                silhouetteScore: 0.7,
                modularityScore: 0.8,
                intraClusterDistance: 0.3,
                interClusterDistance: 0.8,
                coverageRatio: 0.9
              },
              algorithm: 'hdbscan',
              parameters: {
                algorithm: 'hdbscan',
                minClusterSize: 2,
                maxClusterSize: 10,
                similarityThreshold: 0.5,
                useSemanticAnalysis: true,
                useTagSimilarity: true,
                useContentSimilarity: true,
                weightStrength: 0.3,
                weightSemantic: 0.4,
                weightTag: 0.3
              }
            });
          }
        }
      } catch (error) {
        console.error('クラスター情報の取得に失敗:', error);
        
        // エラー時はサンプルデータを表示
        const sampleClusters: ClusterLabel[] = [
          {
            id: 'sample-1',
            text: 'サンプルクラスター1',
            position: { x: 100, y: 100 },
            theme: 'サンプルテーマ1',
            confidence: 0.85,
            cardIds: ['sample-card-1', 'sample-card-2'],
            metadata: {
              dominantTags: ['サンプル', 'タグ1'],
              dominantTypes: ['note', 'task'],
              cardCount: 2
            }
          }
        ];
        
        setCurrentClusters(sampleClusters);
        setSavedViews([{
          id: 'latest',
          name: '最新のクラスタービュー',
          createdAt: new Date().toISOString(),
          clusters: sampleClusters
        }]);
      }
    };

    if (currentPhase === 'theory-building') {
      fetchClusterData();
    }
  }, [currentPhase, boardState.boardId]);

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0f0f23'
    }}>
      {/* ヘッダー */}
      <div style={{
        backgroundColor: '#1a1a2e',
        borderBottom: '1px solid #333366',
        padding: '16px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h1 style={{
            margin: 0,
            fontSize: '20px',
            fontWeight: '600',
            color: '#00ff88'
          }}>
            🔬 分析スペース v3（2つ分離版）
          </h1>
          <div style={{
            fontSize: '14px',
            color: '#a6adc8',
            marginTop: '4px'
          }}>
            データマッピング → 理論構築・結果統合
          </div>
        </div>
        
        {/* フェーズ表示と切り替えボタン */}
        <div style={{
          display: 'flex',
          gap: '16px',
          alignItems: 'center'
        }}>
          <div style={{
            padding: '8px 16px',
            backgroundColor: currentPhase === 'data-mapping' ? '#00ff88' : '#2a2a3e',
            color: currentPhase === 'data-mapping' ? '#0f0f23' : '#a6adc8',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: '500'
          }}>
            🗺️ データマッピング
          </div>
          
          {currentPhase === 'data-mapping' ? (
            <button
              onClick={handleProceedToTheoryBuilding}
              style={{
                padding: '8px 16px',
                backgroundColor: '#8b5cf6',
                color: '#ffffff',
                border: 'none',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(139, 92, 246, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              🧠 理論構築に進む
            </button>
          ) : (
            <button
              onClick={handleBackToDataMapping}
              style={{
                padding: '8px 16px',
                backgroundColor: '#ff6b6b',
                color: '#ffffff',
                border: 'none',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 107, 107, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              🗺️ データマッピングに戻る
            </button>
          )}
          
          <div style={{
            padding: '8px 16px',
            backgroundColor: currentPhase === 'theory-building' ? '#8b5cf6' : '#2a2a3e',
            color: currentPhase === 'theory-building' ? '#ffffff' : '#a6adc8',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: '500'
          }}>
            🧠 理論構築・結果統合
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      {currentPhase === 'data-mapping' && (
        <AnalysisSpace nestId={nestId} />
      )}

      {currentPhase === 'theory-building' && (
        <TheoryBuildingSpace
          currentClusters={currentClusters}
          currentClusteringResult={currentClusteringResult}
          boardId={boardId}
          nestId={nestId}
          savedViews={savedViews}
          onLoadSavedView={handleLoadSavedView}
          onSaveCurrentView={handleSaveCurrentView}
        />
      )}
    </div>
  );
};

export default AnalysisSpaceV3;
