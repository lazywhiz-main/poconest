import React, { useState, useCallback, useEffect } from 'react';
import { ClusterViewService } from '../../../../services/ClusterViewService';
import { useBoardContext } from '../../../../features/board-space/contexts/BoardContext';
import { useAuth } from '../../../../contexts/AuthContext';
import ClusterDetailModal from '../../../../components/ui/ClusterDetailModal';
import AILabelSuggestionModal from '../../../../components/ui/AILabelSuggestionModal';
import { TheoreticalSamplingService } from '../../../../services/analysis/TheoreticalSamplingService';
import { ConstantComparisonService } from '../../../../services/analysis/ConstantComparisonService';
import { NarrativeConstructionService } from '../../../../services/analysis/NarrativeConstructionService';
import type { ClusterLabel } from '../../../../services/AnalysisService';
import type { ClusteringResult, BoardItem } from '../../../../services/SmartClusteringService';
import type { SavedClusterView } from '../../../../types/clusterView';

interface TheoryBuildingSpaceProps {
  /** 現在のクラスターラベル */
  currentClusters?: ClusterLabel[];
  /** 現在のクラスタリング結果 */
  currentClusteringResult?: ClusteringResult | null;
  /** ボードID */
  boardId: string;
  /** ネストID */
  nestId: string;
  /** 保存されたビュー */
  savedViews?: Array<{id: string, name: string, createdAt: string, clusters: ClusterLabel[]}>;
  /** 保存されたビューを読み込む */
  onLoadSavedView?: (viewId: string) => void;
  /** 現在のビューを保存 */
  onSaveCurrentView?: () => void;
}

/**
 * Theory Building スペースコンポーネント
 * 仮説抽出と理論構築の分析手法を管理
 */
const TheoryBuildingSpace: React.FC<TheoryBuildingSpaceProps> = ({
  currentClusters: propCurrentClusters = [],
  currentClusteringResult,
  boardId: propBoardId,
  nestId,
  savedViews: propSavedViews = [],
  onLoadSavedView,
  onSaveCurrentView,
}) => {
  const { state: boardState } = useBoardContext();
  const { user: authUser } = useAuth();
  
  // 実際のボードIDを取得（BoardContextから）
  const actualBoardId = boardState.boardId || propBoardId;
  
  console.log('🔍 [TheoryBuildingSpace] ボードID確認:', {
    propBoardId,
    actualBoardId,
    boardStateBoardId: boardState.boardId
  });

  // カードIDからタイトルを取得する関数
  const getCardTitle = useCallback((cardId: string): string => {
    const card = boardState.cards.find(c => c.id === cardId);
    return card?.title || cardId;
  }, [boardState.cards]);

  const [selectedMethod, setSelectedMethod] = useState<string>('grounded-theory');
  const [showClusterDetails, setShowClusterDetails] = useState(false);
  const [selectedCluster, setSelectedCluster] = useState<ClusterLabel | null>(null);
  const [selectedView, setSelectedView] = useState<string>('latest');
  
  // 内部状態でクラスターとビューを管理
  const [internalClusters, setInternalClusters] = useState<ClusterLabel[]>([]);
  const [internalSavedViews, setInternalSavedViews] = useState<Array<{id: string, name: string, createdAt: string, clusters: ClusterLabel[]}>>([]);
  const [isLoading, setIsLoading] = useState(false);

  // AI提案モーダルの状態
  const [showAILabelModal, setShowAILabelModal] = useState(false);
  const [aiLabelTargetCluster, setAILabelTargetCluster] = useState<{
    id: string;
    cards: BoardItem[];
    currentLabel: string;
  } | null>(null);

  // Grounded Theory Approachタブのアクティブ状態
  const [activeGTAApproachTab, setActiveGTAApproachTab] = useState<'theoretical-sampling' | 'constant-comparison' | 'narrative-construction'>('theoretical-sampling');

  // 理論的サンプリングの基準と結果
  const [theoreticalSamplingCriteria, setTheoreticalSamplingCriteria] = useState({
    newConceptThreshold: 0.1, // 新概念出現率閾値
    relationshipStability: 0.7, // 関係性安定性閾値
    categoryCompleteness: 0.8, // カテゴリ完全性閾値
  });
  const [theoreticalSamplingResult, setTheoreticalSamplingResult] = useState<any>(null);
  const [isTheoreticalSamplingRunning, setIsTheoreticalSamplingRunning] = useState(false);

  // 定数比較法の基準と結果
  const [constantComparisonCriteria, setConstantComparisonCriteria] = useState({
    conceptSimilarity: 0.7, // 概念類似性閾値
    relationshipStrength: 0.6, // 関係性強度閾値
    categoryCoherence: 0.8, // カテゴリ一貫性閾値
  });
  const [constantComparisonResult, setConstantComparisonResult] = useState<any>(null);
  const [isConstantComparisonRunning, setIsConstantComparisonRunning] = useState(false);

  // ナラティブ構築の設定
  const [narrativeConstructionConfig, setNarrativeConstructionConfig] = useState({
    storyStructure: 'linear' as 'linear' | 'circular' | 'network',
    focusArea: 'concept_development' as 'concept_development' | 'relationship_evolution' | 'theory_formation',
    detailLevel: 'medium' as 'high' | 'medium' | 'low',
  });
  const [narrativeConstructionResult, setNarrativeConstructionResult] = useState<any>(null);
  const [isNarrativeConstructionRunning, setIsNarrativeConstructionRunning] = useState(false);

  // 実際に使用するクラスターとビュー（propsから来るものか内部状態か）
  const currentClusters = propCurrentClusters.length > 0 ? propCurrentClusters : internalClusters;
  const savedViews = propSavedViews.length > 0 ? propSavedViews : internalSavedViews;

  // ボタンホバー効果
  const handleButtonHover = useCallback((e: React.MouseEvent, isEnter: boolean) => {
    const target = e.currentTarget as HTMLElement;
    if (isEnter) {
      target.style.transform = 'translateY(-1px)';
      target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
    } else {
      target.style.transform = 'translateY(0)';
      target.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
    }
  }, []);

  // データマッピングに戻る
  const handleBackToDataMapping = useCallback(() => {
    window.location.href = `/nest-top?nestId=${nestId}&space=analytics-beta`;
  }, [nestId]);

  // クラスター詳細を表示
  const handleClusterClick = useCallback((cluster: ClusterLabel) => {
    setSelectedCluster(cluster);
    setShowClusterDetails(true);
  }, []);

  // クラスター詳細モーダルを閉じる
  const handleCloseClusterDetails = useCallback(() => {
    setShowClusterDetails(false);
    setSelectedCluster(null);
  }, []);

  // クラスターラベル更新の関数
  const handleUpdateClusterLabel = useCallback((clusterId: string, newText: string) => {
    console.log('✏️ [TheoryBuildingSpace] クラスターラベル更新:', { clusterId, newText });
    
    // 現在のクラスターを更新（内部状態の場合）
    if (propCurrentClusters.length === 0) {
      setInternalClusters(prev => prev.map(cluster => 
        cluster.id === clusterId 
          ? { ...cluster, text: newText }
          : cluster
      ));
    }
    
    // 必要に応じて保存されたビューも更新
    // TODO: ClusterViewServiceを使って保存されたビューも更新
  }, [propCurrentClusters.length]);

  // AI支援ラベル生成の関数
  const handleAILabelGeneration = useCallback((clusterId: string) => {
    console.log('🤖 [TheoryBuildingSpace] AI提案ボタンがクリックされました:', clusterId);
    
    // クラスターに含まれるカードを取得
    const cluster = currentClusters.find(label => label.id === clusterId);
    if (!cluster) {
      console.error('🤖 [TheoryBuildingSpace] クラスターが見つかりません:', clusterId);
      return;
    }

    const clusterCards = cluster.cardIds
      .map(cardId => boardState.cards.find(card => card.id === cardId))
      .filter(Boolean) as BoardItem[];

    if (clusterCards.length === 0) {
      console.error('🤖 [TheoryBuildingSpace] クラスターにカードがありません');
      return;
    }

    const targetCluster = {
      id: clusterId,
      cards: clusterCards,
      currentLabel: cluster.text
    };
    
    setAILabelTargetCluster(targetCluster);
    setShowAILabelModal(true);
  }, [currentClusters, boardState.cards]);

  // AI提案選択ハンドラー
  const handleAILabelSelect = useCallback((newLabel: string) => {
    if (!aiLabelTargetCluster) return;

    // クラスターラベルを更新
    setInternalClusters(prev => prev.map(cluster => 
      cluster.id === aiLabelTargetCluster.id 
        ? { ...cluster, text: newLabel }
        : cluster
    ));

    console.log('[TheoryBuildingSpace] AIラベル適用:', {
      clusterId: aiLabelTargetCluster.id,
      oldLabel: aiLabelTargetCluster.currentLabel,
      newLabel
    });

    // モーダルを閉じる
    setShowAILabelModal(false);
    setAILabelTargetCluster(null);
  }, [aiLabelTargetCluster]);

  // AI提案モーダルを閉じる
  const handleAILabelModalClose = useCallback(() => {
    setShowAILabelModal(false);
    setAILabelTargetCluster(null);
  }, []);

  // ノード選択ハンドラー
  const handleNodeSelect = useCallback((nodeId: string) => {
    console.log('🎯 [TheoryBuildingSpace] ノード選択:', nodeId);
    
    // データマッピングメニューに遷移（現在のメニューがデータマッピングでなければ）
    const currentSpace = new URLSearchParams(window.location.search).get('space');
    if (currentSpace !== 'analytics-beta') {
      window.location.href = `/nest-top?nestId=${nestId}&space=analytics-beta`;
    }
    
    // ノードセレクトも呼び出す（データマッピングページで）
    // TODO: データマッピングページでノードセレクトを実行する方法を検討
  }, [nestId]);

  // ビューを読み込む
  const handleLoadView = useCallback(async () => {
    if (selectedView === 'latest') return;
    
    try {
      setIsLoading(true);
      console.log('TheoryBuildingSpace: 保存されたビューを読み込み中...', selectedView);
      
      // 特定のビューを読み込み
      const response = await ClusterViewService.getClusterView(selectedView);
      if (response.success && response.data) {
        const view = response.data;
        console.log('TheoryBuildingSpace: ビュー読み込み完了:', view.name, view.clusterLabels);
        
        if (onLoadSavedView) {
          onLoadSavedView(selectedView);
        } else {
          setInternalClusters(view.clusterLabels || []);
        }
      } else {
        console.error('TheoryBuildingSpace: ビューの読み込みに失敗:', response.error);
      }
    } catch (error) {
      console.error('TheoryBuildingSpace: ビューの読み込みでエラー:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedView, onLoadSavedView]);

  // 現在のビューを保存
  const handleSaveCurrentView = useCallback(async () => {
    if (currentClusters.length === 0) return;
    
    try {
      setIsLoading(true);
      console.log('TheoryBuildingSpace: 現在のビューを保存中...');
      
             // smartClusteringResultがnullの場合は保存をスキップ
       if (!currentClusteringResult) {
         console.log('TheoryBuildingSpace: smartClusteringResultがnullのため保存をスキップ');
         return;
       }
       
       const saveInput = {
         boardId: actualBoardId,
         nestId,
         name: `保存されたビュー ${savedViews.length + 1}`,
         description: '理論構築・管理スペースから保存',
         clusterLabels: currentClusters,
         smartClusteringResult: currentClusteringResult,
         filteredClusters: [],
         nodePositions: {},
         showFilteredClusters: false,
         showLabels: true
       };
      
      const response = await ClusterViewService.saveClusterView(saveInput);
      if (response.success) {
        console.log('TheoryBuildingSpace: ビュー保存完了:', response.data);
        
        // 保存されたビューの一覧を更新
        await loadSavedViews();
        
        if (onSaveCurrentView) {
          onSaveCurrentView();
        }
      } else {
        console.error('TheoryBuildingSpace: ビューの保存に失敗:', response.error);
      }
    } catch (error) {
      console.error('TheoryBuildingSpace: ビューの保存でエラー:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentClusters, currentClusteringResult, actualBoardId, nestId, savedViews.length, onSaveCurrentView]);

  // 保存されたビューの一覧を読み込み
  const loadSavedViews = useCallback(async () => {
    try {
      console.log('🔍 [TheoryBuildingSpace] デバッグ開始 - boardId:', actualBoardId);
      
      // 保存されたビューの一覧を取得
      console.log('🔍 [TheoryBuildingSpace] getClusterViews呼び出し開始...');
      const viewsResponse = await ClusterViewService.getClusterViews(actualBoardId);
      console.log('🔍 [TheoryBuildingSpace] getClusterViews結果:', viewsResponse);
      
      if (viewsResponse.success && viewsResponse.data) {
        const views = viewsResponse.data.map(view => ({
          id: view.id,
          name: view.name,
          createdAt: view.createdAt.toISOString(),
          clusters: view.clusterLabels || []
        }));
        
        console.log('🔍 [TheoryBuildingSpace] 変換後のビュー:', views);
        
        // 最新のビューを最初に追加
        console.log('🔍 [TheoryBuildingSpace] getLatestClusterView呼び出し開始...');
        const latestResponse = await ClusterViewService.getLatestClusterView(actualBoardId);
        console.log('🔍 [TheoryBuildingSpace] getLatestClusterView結果:', latestResponse);
        
        if (latestResponse.success && latestResponse.data) {
          const latestView = {
            id: 'latest',
            name: '最新のクラスタービュー',
            createdAt: latestResponse.data.createdAt.toISOString(),
            clusters: latestResponse.data.clusterLabels || []
          };
          
          console.log('🔍 [TheoryBuildingSpace] 最新ビュー:', latestView);
          
          setInternalSavedViews([latestView, ...views]);
          
          // 最新のビューをデフォルトで表示
          if (internalClusters.length === 0) {
            console.log('🔍 [TheoryBuildingSpace] 最新ビューをデフォルト表示に設定');
            setInternalClusters(latestView.clusters);
          }
        } else {
          console.log('🔍 [TheoryBuildingSpace] 最新ビューなし、通常のビューのみ設定');
          setInternalSavedViews(views);
        }
        
        console.log('🔍 [TheoryBuildingSpace] 最終的なinternalSavedViews:', [latestResponse.success && latestResponse.data ? 'latest' : 'なし', ...views.map(v => v.name)]);
      } else {
        console.log('🔍 [TheoryBuildingSpace] 保存されたビューがありません - エラー:', viewsResponse.error);
        setInternalSavedViews([]);
      }
    } catch (error) {
      console.error('❌ [TheoryBuildingSpace] 保存されたビューの一覧読み込みでエラー:', error);
      setInternalSavedViews([]);
    }
  }, [actualBoardId, internalClusters.length]);

  // 保存されたクラスタービューを読み込み
  useEffect(() => {
    if (actualBoardId) {
      loadSavedViews();
    }
  }, [actualBoardId, loadSavedViews]);

  // 理論的サンプリング分析を実行する関数
  const handleTheoreticalSamplingAnalysis = useCallback(async () => {
    if (!currentClusters.length) {
      alert('クラスターが読み込まれていません。データマッピングでクラスタリングを実行してください。');
      return;
    }

    setIsTheoreticalSamplingRunning(true);
    setTheoreticalSamplingResult(null); // 結果をクリア

    try {
      console.log('🔬 [TheoryBuildingSpace] 理論的サンプリング分析を実行します...');
      const result = await TheoreticalSamplingService.analyzeTheoreticalSaturation(
        currentClusters,
        currentClusteringResult || null,
        theoreticalSamplingCriteria
      );
      console.log('🔬 [TheoryBuildingSpace] 理論的サンプリング分析結果:', result);
      setTheoreticalSamplingResult(result);
    } catch (error) {
      console.error('❌ [TheoryBuildingSpace] 理論的サンプリング分析でエラー:', error);
      alert('理論的サンプリング分析中にエラーが発生しました。');
    } finally {
      setIsTheoreticalSamplingRunning(false);
    }
  }, [currentClusters, currentClusteringResult, theoreticalSamplingCriteria]);

  // 定数比較法分析を実行する関数
  const handleConstantComparisonAnalysis = useCallback(async () => {
    if (!currentClusters.length) {
      alert('クラスターが読み込まれていません。データマッピングでクラスタリングを実行してください。');
      return;
    }

    setIsConstantComparisonRunning(true);
    setConstantComparisonResult(null); // 結果をクリア

    try {
      console.log('🔬 [TheoryBuildingSpace] 定数比較法分析を実行します...');
      const result = await ConstantComparisonService.analyzeConstantComparison(
        currentClusters,
        constantComparisonCriteria
      );
      console.log('🔬 [TheoryBuildingSpace] 定数比較法分析結果:', result);
      setConstantComparisonResult(result);
    } catch (error) {
      console.error('❌ [TheoryBuildingSpace] 定数比較法分析でエラー:', error);
      alert('定数比較法分析中にエラーが発生しました。');
    } finally {
      setIsConstantComparisonRunning(false);
    }
  }, [currentClusters, constantComparisonCriteria]);

  // ナラティブ構築を実行する関数
  const handleNarrativeConstruction = useCallback(async () => {
    if (!currentClusters.length) {
      alert('クラスターが読み込まれていません。データマッピングでクラスタリングを実行してください。');
      return;
    }

    setIsNarrativeConstructionRunning(true);
    setNarrativeConstructionResult(null); // 結果をクリア

    try {
      console.log('📖 [TheoryBuildingSpace] ナラティブ構築を実行します...');
      const result = await NarrativeConstructionService.constructNarrativeStoryline(
        currentClusters,
        currentClusteringResult || null,
        narrativeConstructionConfig
      );
      console.log('📖 [TheoryBuildingSpace] ナラティブ構築結果:', result);
      setNarrativeConstructionResult(result);
    } catch (error) {
      console.error('❌ [TheoryBuildingSpace] ナラティブ構築でエラー:', error);
      alert('ナラティブ構築中にエラーが発生しました。');
    } finally {
      setIsNarrativeConstructionRunning(false);
    }
  }, [currentClusters, currentClusteringResult, narrativeConstructionConfig]);

  // 分析手法情報（元のTheoryBuildingSidePeakと同じ + Coming Soon追加）
  const analysismethods = [
    {
      id: 'grounded-theory',
      name: 'Grounded Theory Analysis',
      icon: '🧠',
      description: 'データから理論を構築する質的分析手法。概念の抽出、カテゴリ化、関係性の発見を通じて理論を形成します。',
      isAvailable: true,
    },
    {
      id: 'narrative-analysis',
      name: 'Narrative Analysis',
      icon: '📖',
      description: 'ストーリーやナラティブの構造を分析し、意味や価値観を探求する手法。物語の流れ、登場人物の関係性、文化的背景を理解するのに有効です。',
      isAvailable: false,
    },
    {
      id: 'thematic-analysis',
      name: 'Thematic Analysis',
      icon: '🎭',
      description: 'データ内のパターンやテーマを識別し、分析する質的分析手法。反復される概念や意味のパターンを体系的に整理し、データの核心的な意味を抽出します。',
      isAvailable: false,
    },
    {
      id: 'content-analysis',
      name: 'Content Analysis',
      icon: '📊',
      description: 'テキスト内容を定量的・定性的に分析し、パターンや傾向を抽出する手法。頻度分析、共起分析、感情分析などを組み合わせて包括的な理解を目指します。',
      isAvailable: false,
    },
    {
      id: 'discourse-analysis',
      name: 'Discourse Analysis',
      icon: '💬',
      description: '言語やコミュニケーションの構造を分析し、社会的・文化的な意味を探求する手法。権力関係、イデオロギー、社会的規範の理解に有効です。',
      isAvailable: false,
    },
    {
      id: 'phenomenological-analysis',
      name: 'Phenomenological Analysis',
      icon: '🌟',
      description: '人間の経験や意識の本質を理解するための手法。主観的な体験を深く探求し、現象の本質的な意味を明らかにします。',
      isAvailable: false,
    },
  ];

  // スタイル定義 - 元のTheoryBuildingSidePeakと同じ
  const styles = {
    container: {
      display: 'flex',
      height: '100vh',
      backgroundColor: '#0f0f23',
      color: '#ffffff',
    } as React.CSSProperties,
    leftPanel: {
      width: '400px',
      backgroundColor: '#1a1a2e',
      borderRight: '1px solid #333366',
      padding: '20px',
      overflowY: 'auto',
    } as React.CSSProperties,
    rightPanel: {
      flex: 1,
      padding: '0',
      overflowY: 'auto',
    } as React.CSSProperties,
    section: {
      marginBottom: '24px',
    } as React.CSSProperties,
    sectionTitle: {
      fontSize: '14px',
      fontWeight: '600',
      color: '#00ff88',
      marginBottom: '8px',
      fontFamily: 'Space Grotesk, system-ui, sans-serif',
    } as React.CSSProperties,
    sectionDesc: {
      fontSize: '12px',
      color: '#a6adc8',
      marginBottom: '16px',
      lineHeight: '1.4',
    } as React.CSSProperties,
    viewSelector: {
      marginBottom: '16px',
    } as React.CSSProperties,
    viewDropdown: {
      width: '100%',
      padding: '8px 12px',
      border: '1px solid #333366',
      borderRadius: '6px',
      backgroundColor: '#2a2a3e',
      color: '#ffffff',
      fontSize: '12px',
      marginBottom: '8px',
    } as React.CSSProperties,
    loadButton: {
      width: '100%',
      padding: '8px 16px',
      backgroundColor: '#00ff88',
      color: '#0f0f23',
      border: 'none',
      borderRadius: '6px',
      fontSize: '12px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    } as React.CSSProperties,
    saveButton: {
      width: '100%',
      padding: '8px 16px',
      backgroundColor: '#8b5cf6',
      color: '#ffffff',
      border: 'none',
      borderRadius: '6px',
      fontSize: '12px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      marginTop: '8px',
    } as React.CSSProperties,
    clusterList: {
      marginTop: '16px',
    } as React.CSSProperties,
    clusterItem: {
      background: '#2a2a3e',
      border: '1px solid #333366',
      borderRadius: '8px',
      padding: '12px',
      marginBottom: '8px',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    } as React.CSSProperties,
    clusterItemHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: '8px',
    } as React.CSSProperties,
    clusterName: {
      color: '#ffffff',
      fontSize: '12px',
      fontWeight: '600',
      marginBottom: '4px',
      lineHeight: '1.3',
    } as React.CSSProperties,
    clusterSize: {
      color: '#a6adc8',
      fontSize: '10px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    } as React.CSSProperties,
    methodSelection: {
      padding: '20px',
      borderBottom: '1px solid #333366',
      backgroundColor: '#1a1a2e',
    } as React.CSSProperties,
    methodGrid: {
      display: 'grid',
      gridTemplateColumns: '1fr',
      gap: '8px',
    } as React.CSSProperties,
    methodButton: {
      padding: '12px 16px',
      border: '1px solid #333366',
      borderRadius: '6px',
      backgroundColor: '#2a2a3e',
      color: '#a6adc8',
      fontSize: '12px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      textAlign: 'left',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    } as React.CSSProperties,
    selectedMethodButton: {
      backgroundColor: '#8b5cf6',
      color: '#ffffff',
      borderColor: '#8b5cf6',
    } as React.CSSProperties,
    disabledMethodButton: {
      opacity: 0.6,
      cursor: 'not-allowed',
    } as React.CSSProperties,
    tabContainer: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '4px',
      marginBottom: '20px',
      borderBottom: '1px solid #333366',
      paddingBottom: '16px',
    } as React.CSSProperties,
    tab: {
      padding: '10px 16px',
      border: '1px solid #333366',
      borderRadius: '6px 6px 0 0',
      backgroundColor: '#2a2a3e',
      color: '#a6adc8',
      fontSize: '11px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      borderBottom: 'none',
      position: 'relative',
      top: '1px',
    } as React.CSSProperties,
    activeTab: {
      backgroundColor: '#8b5cf6',
      color: '#ffffff',
      borderColor: '#8b5cf6',
      borderBottom: '1px solid #8b5cf6',
    } as React.CSSProperties,
    disabledTab: {
      opacity: 0.5,
      cursor: 'not-allowed',
      backgroundColor: '#1a1a2e',
    } as React.CSSProperties,
    tabContent: {
      background: '#1a1a2e',
      border: '1px solid #333366',
      borderRadius: '8px',
      padding: '16px',
      minHeight: '120px',
    } as React.CSSProperties,
    methodHeader: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      marginBottom: '12px',
    } as React.CSSProperties,
    methodIcon: {
      fontSize: '24px',
    } as React.CSSProperties,
    methodTitle: {
      fontSize: '16px',
      fontWeight: '700',
      color: '#ffffff',
      marginBottom: '3px',
    } as React.CSSProperties,
    methodStatus: {
      fontSize: '11px',
      padding: '3px 6px',
      borderRadius: '3px',
      fontWeight: '600',
    } as React.CSSProperties,
    statusAvailable: {
      backgroundColor: '#00ff88',
      color: '#0f0f23',
    } as React.CSSProperties,
    statusComingSoon: {
      backgroundColor: '#f59e0b',
      color: '#ffffff',
    } as React.CSSProperties,
    methodDescription: {
      fontSize: '13px',
      color: '#a6adc8',
      lineHeight: '1.5',
      marginBottom: '12px',
    } as React.CSSProperties,
    comingSoonNote: {
      fontSize: '11px',
      color: '#f59e0b',
      fontStyle: 'italic',
      padding: '10px',
      backgroundColor: 'rgba(245, 158, 11, 0.1)',
      border: '1px solid rgba(245, 158, 11, 0.3)',
      borderRadius: '4px',
      marginTop: '12px',
    } as React.CSSProperties,
  };

  return (
    <div style={styles.container}>
      {/* 左側: データマッピング結果 */}
      <div style={styles.leftPanel}>
        <div style={styles.section}>
          <div style={{
            ...styles.sectionTitle,
            display: 'flex',
            alignItems: 'center',
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ marginRight: '8px' }}>
              <path d="M3 3v18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            データマッピング結果
          </div>
          <div style={styles.sectionDesc}>
            クラスタリング結果と保存されたビューを管理します。
          </div>
        </div>

        {/* ビュー選択 */}
        <div style={styles.viewSelector}>
          <select
            value={selectedView}
            onChange={(e) => setSelectedView(e.target.value)}
            style={styles.viewDropdown}
          >
            {savedViews.map(view => (
              <option key={view.id} value={view.id}>
                {view.name}
              </option>
            ))}
          </select>
          <button
            onClick={handleLoadView}
            style={styles.loadButton}
            onMouseEnter={(e) => handleButtonHover(e, true)}
            onMouseLeave={(e) => handleButtonHover(e, false)}
            disabled={isLoading || selectedView === 'latest'}
          >
            {isLoading ? '⏳ 読み込み中...' : '📥 読み込み'}
          </button>
          <button
            onClick={handleSaveCurrentView}
            style={styles.saveButton}
            onMouseEnter={(e) => handleButtonHover(e, true)}
            onMouseLeave={(e) => handleButtonHover(e, false)}
            disabled={currentClusters.length === 0 || isLoading}
          >
            💾 現在のビューを保存
          </button>
        </div>

        {/* クラスターリスト */}
        <div style={styles.clusterList}>
          {isLoading ? (
            <div style={{
              textAlign: 'center',
              color: '#a6adc8',
              fontSize: '12px',
              padding: '20px',
              background: '#2a2a3e',
              borderRadius: '6px',
            }}>
              ⏳ クラスター情報を読み込み中...
            </div>
          ) : currentClusters.length === 0 ? (
            <div style={{
              textAlign: 'center',
              color: '#a6adc8',
              fontSize: '12px',
              padding: '20px',
              background: '#2a2a3e',
              borderRadius: '6px',
            }}>
              クラスターが読み込まれていません
              <br />
              <span style={{ fontSize: '10px' }}>
                データマッピングでクラスタリングを実行してください
              </span>
            </div>
          ) : (
            currentClusters.map((cluster, index) => (
              <div
                key={cluster.id}
                style={styles.clusterItem}
                onClick={() => handleClusterClick(cluster)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#00ff88';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 255, 136, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#333366';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {/* クラスター基本情報 */}
                <div style={styles.clusterItemHeader}>
                  <div style={{ flex: 1, marginRight: '8px' }}>
                    <div style={styles.clusterName}>
                      {cluster.text || 'Unnamed Cluster'}
                    </div>
                    <div style={styles.clusterSize}>
                      <span>📊 {cluster.cardIds?.length || 0} カード</span>
                      {cluster.confidence && (
                        <span>🎯 {Math.round(cluster.confidence * 100)}%</span>
                      )}
                    </div>
                  </div>
                  
                  {/* アクションボタン */}
                  <div style={{
                    display: 'flex',
                    gap: '4px',
                  }}>
                    <button
                      style={{
                        background: '#3b82f6',
                        border: 'none',
                        borderRadius: '4px',
                        color: '#ffffff',
                        padding: '4px 8px',
                        fontSize: '10px',
                        cursor: 'pointer',
                        fontWeight: '500',
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleClusterClick(cluster);
                      }}
                      onMouseEnter={(e) => handleButtonHover(e, true)}
                      onMouseLeave={(e) => handleButtonHover(e, false)}
                      title="詳細表示"
                    >
                      👁️ 詳細
                    </button>
                  </div>
                </div>
                
                {/* テーマとタグ */}
                {(cluster.theme || cluster.metadata?.dominantTags) && (
                  <div style={{
                    fontSize: '9px',
                    color: '#a6adc8',
                    marginBottom: '8px',
                  }}>
                    {cluster.theme && (
                      <div style={{ marginBottom: '2px' }}>
                        🎨 テーマ: {cluster.theme}
                      </div>
                    )}
                    {cluster.metadata?.dominantTags && cluster.metadata.dominantTags.length > 0 && (
                      <div>
                        🏷️ タグ: {cluster.metadata.dominantTags.slice(0, 3).join(', ')}
                        {cluster.metadata.dominantTags.length > 3 && '...'}
                      </div>
                    )}
                  </div>
                )}

                {/* カード一覧（先頭3件のみ表示） */}
                <div style={{
                  fontSize: '9px',
                  color: '#a6adc8',
                }}>
                  📄 カード:
                  <div style={{
                    marginTop: '4px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                  }}>
                    {cluster.cardIds?.slice(0, 3).map(cardId => (
                      <div key={cardId} style={{
                        padding: '2px 6px',
                        background: '#1a1a2e',
                        borderRadius: '3px',
                        fontSize: '8px',
                        maxWidth: '100%',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {getCardTitle(cardId)}
                      </div>
                    ))}
                    {cluster.cardIds && cluster.cardIds.length > 3 && (
                      <div style={{
                        fontSize: '8px',
                        color: '#a6adc8',
                        fontStyle: 'italic',
                      }}>
                        +{cluster.cardIds.length - 3} その他のカード
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 右側: 分析手法選択とGroundedTheoryManager */}
      <div style={styles.rightPanel}>
        {/* 分析手法選択セクション */}
        <div style={styles.methodSelection}>
          <div style={{
            ...styles.sectionTitle,
            display: 'flex',
            alignItems: 'center',
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ marginRight: '8px' }}>
              <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z" stroke="currentColor" strokeWidth="2"/>
            </svg>
            理論構築・仮説抽出手法
          </div>
          
          {/* タブナビゲーション */}
          <div style={{
            display: 'flex',
            background: '#1a1a2e',
            borderBottom: '1.5px solid #333366',
            padding: '0',
            margin: '20px 0 0 0',
            borderRadius: '0',
          }}>
            {analysismethods.map((method) => (
              <button
                key={method.id}
                style={{
                  padding: '12px 20px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  fontWeight: '600',
                  color: selectedMethod === method.id ? '#00ff88' : '#e2e8f0',
                  letterSpacing: '0.5px',
                  border: 'none',
                  background: selectedMethod === method.id ? '#333366' : 'none',
                  borderRadius: '0',
                  textTransform: 'none',
                  transition: 'background 0.2s, color 0.2s',
                  position: 'relative',
                  fontFamily: "'Space Grotesk', sans-serif",
                  boxShadow: 'none',
                  cursor: 'pointer',
                  borderBottom: selectedMethod === method.id ? '2px solid #00ff88' : '2px solid transparent',
                  zIndex: selectedMethod === method.id ? 2 : 1,
                }}
                onClick={() => setSelectedMethod(method.id)}
                onMouseEnter={(e) => {
                  if (selectedMethod !== method.id) {
                    e.currentTarget.style.background = '#23243a';
                    e.currentTarget.style.color = '#fff';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedMethod !== method.id) {
                    e.currentTarget.style.background = 'none';
                    e.currentTarget.style.color = '#e2e8f0';
                  }
                }}
              >
                <span>{method.name}</span>
              </button>
            ))}
          </div>

          {/* タブコンテンツ */}
          <div style={{
            background: '#1a1a2e',
            border: '1px solid #333366',
            borderRadius: '8px',
            padding: '20px',
            marginTop: '0',
            minHeight: '200px',
          }}>
            {/* 分析手法の詳細情報 */}
            <div style={styles.methodHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={styles.methodTitle}>{analysismethods.find(m => m.id === selectedMethod)?.name}</div>
                <span style={{
                  ...styles.methodStatus,
                  ...(analysismethods.find(m => m.id === selectedMethod)?.isAvailable ? styles.statusAvailable : styles.statusComingSoon)
                }}>
                  {analysismethods.find(m => m.id === selectedMethod)?.isAvailable ? '利用可能' : 'Coming Soon'}
                </span>
              </div>
            </div>
            
            <div style={styles.methodDescription}>
              {analysismethods.find(m => m.id === selectedMethod)?.description}
            </div>
            
            {!analysismethods.find(m => m.id === selectedMethod)?.isAvailable && (
              <div style={styles.comingSoonNote}>
                🚧 この分析手法は現在開発中です。近日公開予定です。
              </div>
            )}

            {/* Grounded Theory Approachの場合のみ詳細分析を表示 */}
            {selectedMethod === 'grounded-theory' && (
              <div style={{ marginTop: '20px' }}>
                <div style={{
                  ...styles.sectionTitle,
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: '16px',
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ marginRight: '8px' }}>
                    <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                  Grounded Theory Approach 詳細分析
                </div>
                
                {/* 縦並びナビゲーションとコンテンツのレイアウト */}
                <div style={{
                  display: 'flex',
                  gap: '20px',
                  marginTop: '20px',
                }}>
                  {/* 左側: 縦並びナビゲーション */}
                  <div style={{
                    width: '200px',
                    flexShrink: 0,
                  }}>
                    <div style={{
                      background: '#1a1a2e',
                      border: '1px solid #333366',
                      borderRadius: '8px',
                      overflow: 'hidden',
                    }}>
                      {[
                        { key: 'theoretical-sampling', label: '理論的サンプリング', icon: '🔬', description: '理論的飽和の判定とサンプリング戦略' },
                        { key: 'constant-comparison', label: '定数比較法', icon: '🔄', description: '概念比較とカテゴリ統合' },
                        { key: 'narrative-construction', label: 'ナラティブ構築', icon: '📖', description: '理論的ストーリーライン構築' }
                      ].map((item) => (
                        <button
                          key={item.key}
                          style={{
                            width: '100%',
                            padding: '16px',
                            background: activeGTAApproachTab === item.key ? '#333366' : 'transparent',
                            border: 'none',
                            borderBottom: '1px solid #333366',
                            color: activeGTAApproachTab === item.key ? '#00ff88' : '#e2e8f0',
                            textAlign: 'left',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'flex-start',
                            gap: '8px',
                          }}
                          onClick={() => setActiveGTAApproachTab(item.key as 'theoretical-sampling' | 'constant-comparison' | 'narrative-construction')}
                          onMouseEnter={(e) => {
                            if (activeGTAApproachTab !== item.key) {
                              e.currentTarget.style.background = '#23243a';
                              e.currentTarget.style.color = '#ffffff';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (activeGTAApproachTab !== item.key) {
                              e.currentTarget.style.background = activeGTAApproachTab === item.key ? '#333366' : 'transparent';
                              e.currentTarget.style.color = activeGTAApproachTab === item.key ? '#00ff88' : '#e2e8f0';
                            }
                          }}
                        >
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '14px',
                            fontWeight: '600',
                          }}>
                            <span>{item.icon}</span>
                            <span>{item.label}</span>
                          </div>
                          <div style={{
                            fontSize: '11px',
                            color: activeGTAApproachTab === item.key ? '#a6adc8' : '#8b8b8b',
                            lineHeight: '1.3',
                            marginLeft: '24px',
                          }}>
                            {item.description}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 右側: コンテンツエリア */}
                  <div style={{
                    flex: 1,
                    background: '#1a1a2e',
                    border: '1px solid #333366',
                    borderRadius: '8px',
                    padding: '20px',
                    minHeight: '400px',
                  }}>
                    {activeGTAApproachTab === 'theoretical-sampling' && (
                      <div>
                        <h4 style={{
                          margin: '0 0 16px 0',
                          fontSize: '16px',
                          fontWeight: '600',
                          color: '#ffffff',
                        }}>
                          🔬 理論的サンプリング分析
                        </h4>
                        <div style={{
                          fontSize: '13px',
                          color: '#a6adc8',
                          lineHeight: '1.5',
                          marginBottom: '16px',
                        }}>
                          理論的飽和の判定とサンプリング戦略の決定を行います。
                        </div>
                        
                        {/* 飽和基準設定 */}
                        <div style={{
                          padding: '16px',
                          background: '#2a2a3e',
                          borderRadius: '6px',
                          border: '1px solid #333366',
                          marginBottom: '16px',
                        }}>
                          <h5 style={{
                            margin: '0 0 12px 0',
                            fontSize: '14px',
                            fontWeight: '600',
                            color: '#ffffff',
                          }}>
                            飽和基準設定
                          </h5>
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                            gap: '12px',
                            marginBottom: '16px',
                          }}>
                            <div>
                              <label style={{
                                fontSize: '11px',
                                color: '#a6adc8',
                                marginBottom: '4px',
                                display: 'block',
                              }}>
                                新概念出現率閾値
                              </label>
                              <input
                                type="range"
                                min="0.05"
                                max="0.3"
                                step="0.05"
                                value={theoreticalSamplingCriteria.newConceptThreshold}
                                onChange={(e) => setTheoreticalSamplingCriteria(prev => ({
                                  ...prev,
                                  newConceptThreshold: parseFloat(e.target.value)
                                }))}
                                style={{
                                  width: '100%',
                                  height: '6px',
                                  background: '#1a1a2e',
                                  borderRadius: '3px',
                                  outline: 'none',
                                }}
                              />
                              <div style={{
                                fontSize: '10px',
                                color: '#a6adc8',
                                textAlign: 'center',
                                marginTop: '4px',
                              }}>
                                {(theoreticalSamplingCriteria.newConceptThreshold * 100).toFixed(0)}%
                              </div>
                            </div>
                            
                            <div>
                              <label style={{
                                fontSize: '11px',
                                color: '#a6adc8',
                                marginBottom: '4px',
                                display: 'block',
                              }}>
                                関係性安定性閾値
                              </label>
                              <input
                                type="range"
                                min="0.6"
                                max="0.95"
                                step="0.05"
                                value={theoreticalSamplingCriteria.relationshipStability}
                                onChange={(e) => setTheoreticalSamplingCriteria(prev => ({
                                  ...prev,
                                  relationshipStability: parseFloat(e.target.value)
                                }))}
                                style={{
                                  width: '100%',
                                  height: '6px',
                                  background: '#1a1a2e',
                                  borderRadius: '3px',
                                  outline: 'none',
                                }}
                              />
                              <div style={{
                                fontSize: '10px',
                                color: '#a6adc8',
                                textAlign: 'center',
                                marginTop: '4px',
                              }}>
                                {(theoreticalSamplingCriteria.relationshipStability * 100).toFixed(0)}%
                              </div>
                            </div>
                            
                            <div>
                              <label style={{
                                fontSize: '11px',
                                color: '#a6adc8',
                                marginBottom: '4px',
                                display: 'block',
                              }}>
                                カテゴリ完全性閾値
                              </label>
                              <input
                                type="range"
                                min="0.7"
                                max="0.98"
                                step="0.02"
                                value={theoreticalSamplingCriteria.categoryCompleteness}
                                onChange={(e) => setTheoreticalSamplingCriteria(prev => ({
                                  ...prev,
                                  categoryCompleteness: parseFloat(e.target.value)
                                }))}
                                style={{
                                  width: '100%',
                                  height: '6px',
                                  background: '#1a1a2e',
                                  borderRadius: '3px',
                                  outline: 'none',
                                }}
                              />
                              <div style={{
                                fontSize: '10px',
                                color: '#a6adc8',
                                textAlign: 'center',
                                marginTop: '4px',
                              }}>
                                {(theoreticalSamplingCriteria.categoryCompleteness * 100).toFixed(0)}%
                              </div>
                            </div>
                          </div>
                          
                          <button
                            onClick={handleTheoreticalSamplingAnalysis}
                            disabled={!currentClusters.length || isTheoreticalSamplingRunning}
                            style={{
                              padding: '8px 16px',
                              background: currentClusters.length ? '#00ff88' : '#333366',
                              color: currentClusters.length ? '#0f0f23' : '#a6adc8',
                              border: 'none',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: '600',
                              cursor: currentClusters.length ? 'pointer' : 'not-allowed',
                              transition: 'all 0.2s ease',
                            }}
                          >
                            {isTheoreticalSamplingRunning ? '🔬 分析中...' : '🔬 理論的飽和分析実行'}
                          </button>
                        </div>
                        
                        {/* 分析結果表示 */}
                        {theoreticalSamplingResult && (
                          <div style={{
                            padding: '16px',
                            background: '#2a2a3e',
                            borderRadius: '6px',
                            border: '1px solid #333366',
                          }}>
                            <h5 style={{
                              margin: '0 0 12px 0',
                              fontSize: '14px',
                              fontWeight: '600',
                              color: '#ffffff',
                            }}>
                              分析結果
                            </h5>
                            
                            <div style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                              gap: '12px',
                              marginBottom: '16px',
                            }}>
                              <div style={{
                                padding: '12px',
                                background: '#1a1a2e',
                                borderRadius: '4px',
                                textAlign: 'center',
                              }}>
                                <div style={{
                                  fontSize: '20px',
                                  fontWeight: '700',
                                  color: theoreticalSamplingResult.saturationAnalysis.isSaturated ? '#00ff88' : '#f59e0b',
                                  marginBottom: '4px',
                                }}>
                                  {(theoreticalSamplingResult.saturationAnalysis.saturationScore * 100).toFixed(1)}%
                                </div>
                                <div style={{
                                  fontSize: '10px',
                                  color: '#a6adc8',
                                }}>
                                  飽和スコア
                                </div>
                              </div>
                              
                              <div style={{
                                padding: '12px',
                                background: '#1a1a2e',
                                borderRadius: '4px',
                                textAlign: 'center',
                              }}>
                                <div style={{
                                  fontSize: '20px',
                                  fontWeight: '700',
                                  color: '#3b82f6',
                                  marginBottom: '4px',
                                }}>
                                  {theoreticalSamplingResult.samplingProgress.currentRound}
                                </div>
                                <div style={{
                                  fontSize: '10px',
                                  color: '#a6adc8',
                                }}>
                                  現在ラウンド
                                </div>
                              </div>
                              
                              <div style={{
                                padding: '12px',
                                background: '#1a1a2e',
                                borderRadius: '4px',
                                textAlign: 'center',
                              }}>
                                <div style={{
                                  fontSize: '20px',
                                  fontWeight: '700',
                                  color: '#8b5cf6',
                                  marginBottom: '4px',
                                }}>
                                  {theoreticalSamplingResult.samplingProgress.conceptsDiscovered}
                                </div>
                                <div style={{
                                  fontSize: '10px',
                                  color: '#a6adc8',
                                }}>
                                  発見概念数
                                </div>
                              </div>
                            </div>
                            
                            <div style={{
                              padding: '12px',
                              background: theoreticalSamplingResult.saturationAnalysis.isSaturated ? 'rgba(0, 255, 136, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                              border: `1px solid ${theoreticalSamplingResult.saturationAnalysis.isSaturated ? '#00ff88' : '#f59e0b'}`,
                              borderRadius: '4px',
                              marginBottom: '12px',
                            }}>
                              <div style={{
                                fontSize: '12px',
                                fontWeight: '600',
                                color: theoreticalSamplingResult.saturationAnalysis.isSaturated ? '#00ff88' : '#f59e0b',
                                marginBottom: '8px',
                              }}>
                                {theoreticalSamplingResult.saturationAnalysis.isSaturated ? '✅ 理論的飽和達成' : '🔄 理論的飽和未達成'}
                              </div>
                              <div style={{
                                fontSize: '11px',
                                color: '#a6adc8',
                                lineHeight: '1.4',
                              }}>
                                {theoreticalSamplingResult.saturationAnalysis.isSaturated 
                                  ? 'データ収集は理論的飽和に達しています。追加のサンプリングは必要ありません。'
                                  : 'データ収集を継続する必要があります。次のサンプリングターゲットを確認してください。'
                                }
                              </div>
                            </div>
                            
                            {!theoreticalSamplingResult.saturationAnalysis.isSaturated && (
                              <div>
                                <h6 style={{
                                  margin: '0 0 8px 0',
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  color: '#ffffff',
                                }}>
                                  次のサンプリングターゲット
                                </h6>
                                <div style={{
                                  display: 'flex',
                                  flexWrap: 'wrap',
                                  gap: '6px',
                                }}>
                                  {theoreticalSamplingResult.saturationAnalysis.nextSamplingTargets.slice(0, 5).map((target: string, index: number) => (
                                    <span
                                      key={index}
                                      style={{
                                        padding: '4px 8px',
                                        background: '#1a1a2e',
                                        border: '1px solid #333366',
                                        borderRadius: '12px',
                                        fontSize: '10px',
                                        color: '#a6adc8',
                                      }}
                                    >
                                      {target}
                                    </span>
                                  ))}
                                  {theoreticalSamplingResult.saturationAnalysis.nextSamplingTargets.length > 5 && (
                                    <span style={{
                                      padding: '4px 8px',
                                      background: '#1a1a2e',
                                      border: '1px solid #333366',
                                      borderRadius: '12px',
                                      fontSize: '10px',
                                      color: '#a6adc8',
                                    }}>
                                      +{theoreticalSamplingResult.saturationAnalysis.nextSamplingTargets.length - 5}件
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {activeGTAApproachTab === 'constant-comparison' && (
                      <div>
                        <h4 style={{
                          margin: '0 0 16px 0',
                          fontSize: '16px',
                          fontWeight: '600',
                          color: '#ffffff',
                        }}>
                          🔄 定数比較法分析
                        </h4>
                        <div style={{
                          fontSize: '13px',
                          color: '#a6adc8',
                          lineHeight: '1.5',
                          marginBottom: '16px',
                        }}>
                          概念の比較とカテゴリの統合を通じて理論的枠組みを構築します。
                        </div>
                        
                        {/* 比較基準設定 */}
                        <div style={{
                          padding: '16px',
                          background: '#2a2a3e',
                          borderRadius: '6px',
                          border: '1px solid #333366',
                          marginBottom: '16px',
                        }}>
                          <h5 style={{
                            margin: '0 0 12px 0',
                            fontSize: '14px',
                            fontWeight: '600',
                            color: '#ffffff',
                          }}>
                            比較基準設定
                          </h5>
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                            gap: '12px',
                            marginBottom: '16px',
                          }}>
                            <div>
                              <label style={{
                                fontSize: '11px',
                                color: '#a6adc8',
                                marginBottom: '4px',
                                display: 'block',
                              }}>
                                概念類似性閾値
                              </label>
                              <input
                                type="range"
                                min="0.5"
                                max="0.9"
                                step="0.05"
                                value={constantComparisonCriteria.conceptSimilarity}
                                onChange={(e) => setConstantComparisonCriteria(prev => ({
                                  ...prev,
                                  conceptSimilarity: parseFloat(e.target.value)
                                }))}
                                style={{
                                  width: '100%',
                                  height: '6px',
                                  background: '#1a1a2e',
                                  borderRadius: '3px',
                                  outline: 'none',
                                }}
                              />
                              <div style={{
                                fontSize: '10px',
                                color: '#a6adc8',
                                textAlign: 'center',
                                marginTop: '4px',
                              }}>
                                {(constantComparisonCriteria.conceptSimilarity * 100).toFixed(0)}%
                              </div>
                            </div>
                            
                            <div>
                              <label style={{
                                fontSize: '11px',
                                color: '#a6adc8',
                                marginBottom: '4px',
                                display: 'block',
                              }}>
                                関係性強度閾値
                              </label>
                              <input
                                type="range"
                                min="0.4"
                                max="0.8"
                                step="0.05"
                                value={constantComparisonCriteria.relationshipStrength}
                                onChange={(e) => setConstantComparisonCriteria(prev => ({
                                  ...prev,
                                  relationshipStrength: parseFloat(e.target.value)
                                }))}
                                style={{
                                  width: '100%',
                                  height: '6px',
                                  background: '#1a1a2e',
                                  borderRadius: '3px',
                                  outline: 'none',
                                }}
                              />
                              <div style={{
                                fontSize: '10px',
                                color: '#a6adc8',
                                textAlign: 'center',
                                marginTop: '4px',
                              }}>
                                {(constantComparisonCriteria.relationshipStrength * 100).toFixed(0)}%
                              </div>
                            </div>
                            
                            <div>
                              <label style={{
                                fontSize: '11px',
                                color: '#a6adc8',
                                marginBottom: '4px',
                                display: 'block',
                              }}>
                                カテゴリ一貫性閾値
                              </label>
                              <input
                                type="range"
                                min="0.6"
                                max="0.95"
                                step="0.05"
                                value={constantComparisonCriteria.categoryCoherence}
                                onChange={(e) => setConstantComparisonCriteria(prev => ({
                                  ...prev,
                                  categoryCoherence: parseFloat(e.target.value)
                                }))}
                                style={{
                                  width: '100%',
                                  height: '6px',
                                  background: '#1a1a2e',
                                  borderRadius: '3px',
                                  outline: 'none',
                                }}
                              />
                              <div style={{
                                fontSize: '10px',
                                color: '#a6adc8',
                                textAlign: 'center',
                                marginTop: '4px',
                              }}>
                                {(constantComparisonCriteria.categoryCoherence * 100).toFixed(0)}%
                              </div>
                            </div>
                          </div>
                          
                          <button
                            onClick={handleConstantComparisonAnalysis}
                            disabled={!currentClusters.length || isConstantComparisonRunning}
                            style={{
                              padding: '8px 16px',
                              background: currentClusters.length ? '#3b82f6' : '#333366',
                              color: currentClusters.length ? '#ffffff' : '#a6adc8',
                              border: 'none',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: '600',
                              cursor: currentClusters.length ? 'pointer' : 'not-allowed',
                              transition: 'all 0.2s ease',
                            }}
                          >
                            {isConstantComparisonRunning ? '🔄 分析中...' : '🔄 定数比較分析実行'}
                          </button>
                        </div>
                        
                        {/* 分析結果表示 */}
                        {constantComparisonResult && (
                          <div style={{
                            padding: '16px',
                            background: '#2a2a3e',
                            borderRadius: '6px',
                            border: '1px solid #333366',
                          }}>
                            <h5 style={{
                              margin: '0 0 12px 0',
                              fontSize: '14px',
                              fontWeight: '600',
                              color: '#ffffff',
                            }}>
                              比較分析結果
                            </h5>
                            
                            <div style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                              gap: '12px',
                              marginBottom: '16px',
                            }}>
                              <div style={{
                                padding: '12px',
                                background: '#1a1a2e',
                                borderRadius: '4px',
                                textAlign: 'center',
                              }}>
                                <div style={{
                                  fontSize: '20px',
                                  fontWeight: '700',
                                  color: '#3b82f6',
                                  marginBottom: '4px',
                                }}>
                                  {constantComparisonResult.comparisonProgress.conceptsCompared}
                                </div>
                                <div style={{
                                  fontSize: '10px',
                                  color: '#a6adc8',
                                }}>
                                  比較済み概念
                                </div>
                              </div>
                              
                              <div style={{
                                padding: '12px',
                                background: '#1a1a2e',
                                borderRadius: '4px',
                                textAlign: 'center',
                              }}>
                                <div style={{
                                  fontSize: '20px',
                                  fontWeight: '700',
                                  color: '#8b5cf6',
                                  marginBottom: '4px',
                                }}>
                                  {constantComparisonResult.comparisonProgress.relationshipsIdentified}
                                </div>
                                <div style={{
                                  fontSize: '10px',
                                  color: '#a6adc8',
                                }}>
                                  特定関係性
                                </div>
                              </div>
                              
                              <div style={{
                                padding: '12px',
                                background: '#1a1a2e',
                                borderRadius: '4px',
                                textAlign: 'center',
                              }}>
                                <div style={{
                                  fontSize: '20px',
                                  fontWeight: '700',
                                  color: '#00ff88',
                                  marginBottom: '4px',
                                }}>
                                  {constantComparisonResult.comparisonProgress.categoriesFormed}
                                </div>
                                <div style={{
                                  fontSize: '10px',
                                  color: '#a6adc8',
                                }}>
                                  形成カテゴリ
                                </div>
                              </div>
                            </div>
                            
                            {/* 理論的統合レベル */}
                            <div style={{
                              padding: '12px',
                              background: 'rgba(139, 92, 246, 0.1)',
                              border: '1px solid #8b5cf6',
                              borderRadius: '4px',
                              marginBottom: '16px',
                            }}>
                              <div style={{
                                fontSize: '12px',
                                fontWeight: '600',
                                color: '#8b5cf6',
                                marginBottom: '8px',
                              }}>
                                理論的統合レベル
                              </div>
                              <div style={{
                                width: '100%',
                                height: '8px',
                                background: '#1a1a2e',
                                borderRadius: '4px',
                                overflow: 'hidden',
                              }}>
                                <div style={{
                                  width: `${(constantComparisonResult.comparisonProgress.theoreticalIntegration * 100).toFixed(1)}%`,
                                  height: '100%',
                                  background: '#8b5cf6',
                                  borderRadius: '4px',
                                  transition: 'width 0.3s ease',
                                }} />
                              </div>
                              <div style={{
                                fontSize: '11px',
                                color: '#a6adc8',
                                textAlign: 'center',
                                marginTop: '4px',
                              }}>
                                {(constantComparisonResult.comparisonProgress.theoreticalIntegration * 100).toFixed(1)}%
                              </div>
                            </div>
                            
                            {/* 概念クラスター */}
                            {constantComparisonResult.comparisonResults.conceptClusters.length > 0 && (
                              <div>
                                <h6 style={{
                                  margin: '0 0 8px 0',
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  color: '#ffffff',
                                }}>
                                  概念クラスター
                                </h6>
                                <div style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '8px',
                                }}>
                                  {constantComparisonResult.comparisonResults.conceptClusters.slice(0, 3).map((cluster: any, index: number) => (
                                    <div
                                      key={index}
                                      style={{
                                        padding: '8px 12px',
                                        background: '#1a1a2e',
                                        border: '1px solid #333366',
                                        borderRadius: '4px',
                                      }}
                                    >
                                      <div style={{
                                        fontSize: '11px',
                                        fontWeight: '600',
                                        color: '#ffffff',
                                        marginBottom: '4px',
                                      }}>
                                        {cluster.name} (一貫性: {(cluster.coherence * 100).toFixed(0)}%)
                                      </div>
                                      <div style={{
                                        fontSize: '10px',
                                        color: '#a6adc8',
                                      }}>
                                        概念: {cluster.concepts.slice(0, 3).join(', ')}
                                        {cluster.concepts.length > 3 && '...'}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {activeGTAApproachTab === 'narrative-construction' && (
                      <div>
                        <h4 style={{
                          margin: '0 0 16px 0',
                          fontSize: '16px',
                          fontWeight: '600',
                          color: '#ffffff',
                        }}>
                          📖 ナラティブ構築
                        </h4>
                        <div style={{
                          fontSize: '13px',
                          color: '#a6adc8',
                          lineHeight: '1.5',
                          marginBottom: '16px',
                        }}>
                          発見された概念と関係性から理論的ストーリーラインを構築します。
                        </div>
                        
                        {/* ナラティブ構築設定 */}
                        <div style={{
                          padding: '16px',
                          background: '#2a2a3e',
                          borderRadius: '6px',
                          border: '1px solid #333366',
                          marginBottom: '16px',
                        }}>
                          <h5 style={{
                            margin: '0 0 12px 0',
                            fontSize: '14px',
                            fontWeight: '600',
                            color: '#ffffff',
                          }}>
                            ストーリーライン構築設定
                          </h5>
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                            gap: '12px',
                            marginBottom: '16px',
                          }}>
                            <div>
                              <label style={{
                                fontSize: '11px',
                                color: '#a6adc8',
                                marginBottom: '4px',
                                display: 'block',
                              }}>
                                ストーリー構造
                              </label>
                              <select
                                value={narrativeConstructionConfig.storyStructure}
                                onChange={(e) => setNarrativeConstructionConfig(prev => ({
                                  ...prev,
                                  storyStructure: e.target.value as 'linear' | 'circular' | 'network'
                                }))}
                                style={{
                                  width: '100%',
                                  padding: '6px 8px',
                                  background: '#1a1a2e',
                                  border: '1px solid #333366',
                                  borderRadius: '4px',
                                  color: '#ffffff',
                                  fontSize: '11px',
                                }}
                              >
                                <option value="linear">線形構造</option>
                                <option value="circular">循環構造</option>
                                <option value="network">ネットワーク構造</option>
                              </select>
                            </div>
                            
                            <div>
                              <label style={{
                                fontSize: '11px',
                                color: '#a6adc8',
                                marginBottom: '4px',
                                display: 'block',
                              }}>
                                焦点領域
                              </label>
                              <select
                                value={narrativeConstructionConfig.focusArea}
                                onChange={(e) => setNarrativeConstructionConfig(prev => ({
                                  ...prev,
                                  focusArea: e.target.value as 'concept_development' | 'relationship_evolution' | 'theory_formation'
                                }))}
                                style={{
                                  width: '100%',
                                  background: '#1a1a2e',
                                  border: '1px solid #333366',
                                  borderRadius: '4px',
                                  color: '#ffffff',
                                  fontSize: '11px',
                                }}
                              >
                                <option value="concept_development">概念発展</option>
                                <option value="relationship_evolution">関係性進化</option>
                                <option value="theory_formation">理論形成</option>
                              </select>
                            </div>
                            
                            <div>
                              <label style={{
                                fontSize: '11px',
                                color: '#a6adc8',
                                marginBottom: '4px',
                                display: 'block',
                              }}>
                                詳細レベル
                              </label>
                              <select
                                value={narrativeConstructionConfig.detailLevel}
                                onChange={(e) => setNarrativeConstructionConfig(prev => ({
                                  ...prev,
                                  detailLevel: e.target.value as 'high' | 'medium' | 'low'
                                }))}
                                style={{
                                  width: '100%',
                                  padding: '6px 8px',
                                  background: '#1a1a2e',
                                  border: '1px solid #333366',
                                  borderRadius: '4px',
                                  color: '#ffffff',
                                  fontSize: '11px',
                                }}
                              >
                                <option value="high">高詳細</option>
                                <option value="medium">中詳細</option>
                                <option value="low">低詳細</option>
                              </select>
                            </div>
                          </div>
                          
                          <button
                            onClick={handleNarrativeConstruction}
                            disabled={!currentClusters.length || isNarrativeConstructionRunning}
                            style={{
                              padding: '8px 16px',
                              background: currentClusters.length ? '#8b5cf6' : '#333366',
                              color: currentClusters.length ? '#ffffff' : '#a6adc8',
                              border: 'none',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: '600',
                              cursor: currentClusters.length ? 'pointer' : 'not-allowed',
                              transition: 'all 0.2s ease',
                            }}
                          >
                            {isNarrativeConstructionRunning ? '📖 構築中...' : '📖 ナラティブ構築実行'}
                          </button>
                        </div>
                        
                        {/* 構築結果表示 */}
                        {narrativeConstructionResult && (
                          <div style={{
                            padding: '16px',
                            background: '#2a2a3e',
                            borderRadius: '6px',
                            border: '1px solid #333366',
                          }}>
                            <h5 style={{
                              margin: '0 0 12px 0',
                              fontSize: '14px',
                              fontWeight: '600',
                              color: '#ffffff',
                            }}>
                              ナラティブ構築結果
                            </h5>
                            
                            {/* ストーリーライン概要 */}
                            <div style={{
                              padding: '12px',
                              background: '#1a1a2e',
                              borderRadius: '4px',
                              marginBottom: '16px',
                            }}>
                              <h6 style={{
                                margin: '0 0 8px 0',
                                fontSize: '12px',
                                fontWeight: '600',
                                color: '#8b5cf6',
                              }}>
                                ストーリーライン概要
                              </h6>
                              <div style={{
                                fontSize: '11px',
                                color: '#a6adc8',
                                lineHeight: '1.5',
                              }}>
                                {narrativeConstructionResult.storyline}
                              </div>
                            </div>
                            
                            {/* 主要概念の流れ */}
                            {narrativeConstructionResult.conceptFlow && (
                              <div style={{
                                padding: '12px',
                                background: '#1a1a2e',
                                borderRadius: '4px',
                                marginBottom: '16px',
                              }}>
                                <h6 style={{
                                  margin: '0 0 8px 0',
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  color: '#00ff88',
                                }}>
                                  主要概念の流れ
                                </h6>
                                <div style={{
                                  display: 'flex',
                                  flexWrap: 'wrap',
                                  gap: '8px',
                                }}>
                                  {narrativeConstructionResult.conceptFlow.map((concept: string, index: number) => (
                                    <div
                                      key={index}
                                      style={{
                                        padding: '6px 10px',
                                        background: '#2a2a2e',
                                        border: '1px solid #333366',
                                        borderRadius: '12px',
                                        fontSize: '10px',
                                        color: '#ffffff',
                                        position: 'relative',
                                      }}
                                    >
                                      {concept}
                                      {index < narrativeConstructionResult.conceptFlow.length - 1 && (
                                        <span style={{
                                          position: 'absolute',
                                          right: '-12px',
                                          top: '50%',
                                          transform: 'translateY(-50%)',
                                          color: '#8b5cf6',
                                          fontSize: '12px',
                                        }}>
                                          →
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {/* 理論的洞察 */}
                            {narrativeConstructionResult.theoreticalInsights && (
                              <div style={{
                                padding: '12px',
                                background: '#1a1a2e',
                                borderRadius: '4px',
                                marginBottom: '16px',
                              }}>
                                <h6 style={{
                                  margin: '0 0 8px 0',
                                  fontSize: '12px',
                                  fontWeight: '600',
                                  color: '#f59e0b',
                                }}>
                                  理論的洞察
                                </h6>
                                <div style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '6px',
                                }}>
                                  {narrativeConstructionResult.theoreticalInsights.map((insight: string, index: number) => (
                                    <div
                                      key={index}
                                      style={{
                                        padding: '6px 10px',
                                        background: 'rgba(245, 158, 11, 0.1)',
                                        border: '1px solid rgba(245, 158, 11, 0.3)',
                                        borderRadius: '4px',
                                        fontSize: '10px',
                                      }}
                                    >
                                      💡 {insight}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {/* 構築品質指標 */}
                            <div style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                              gap: '8px',
                            }}>
                              <div style={{
                                padding: '8px',
                                background: '#1a1a2e',
                                borderRadius: '4px',
                                textAlign: 'center',
                              }}>
                                <div style={{
                                  fontSize: '16px',
                                  fontWeight: '700',
                                  color: '#00ff88',
                                  marginBottom: '2px',
                                }}>
                                  {(narrativeConstructionResult.qualityMetrics.coherence * 100).toFixed(0)}%
                                </div>
                                <div style={{
                                  fontSize: '9px',
                                  color: '#a6adc8',
                                }}>
                                  一貫性
                                </div>
                              </div>
                              
                              <div style={{
                                padding: '8px',
                                background: '#1a1a2e',
                                borderRadius: '4px',
                                textAlign: 'center',
                              }}>
                                <div style={{
                                  fontSize: '16px',
                                  fontWeight: '700',
                                  color: '#3b82f6',
                                  marginBottom: '2px',
                                }}>
                                  {(narrativeConstructionResult.qualityMetrics.completeness * 100).toFixed(0)}%
                                </div>
                                <div style={{
                                  fontSize: '9px',
                                  color: '#a6adc8',
                                }}>
                                  完全性
                                </div>
                              </div>
                              
                              <div style={{
                                padding: '8px',
                                background: '#1a1a2e',
                                borderRadius: '4px',
                                textAlign: 'center',
                              }}>
                                <div style={{
                                  fontSize: '16px',
                                  fontWeight: '700',
                                  color: '#8b5cf6',
                                  marginBottom: '2px',
                                }}>
                                  {(narrativeConstructionResult.qualityMetrics.originality * 100).toFixed(0)}%
                                </div>
                                <div style={{
                                  fontSize: '9px',
                                  color: '#a6adc8',
                                }}>
                                  独創性
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Grounded Theory Approach以外のタブの場合、「準備中」表示 */}
            {selectedMethod !== 'grounded-theory' && (
              <div style={{
                marginTop: '20px',
                padding: '40px 20px',
                textAlign: 'center',
                color: '#a6adc8',
              }}>
                <div style={{
                  fontSize: '48px',
                  marginBottom: '16px',
                }}>
                  🚧
                </div>
                <div style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  color: '#ffffff',
                  marginBottom: '8px',
                }}>
                  準備中
                </div>
                <div style={{
                  fontSize: '14px',
                  lineHeight: '1.5',
                }}>
                  この分析手法の詳細機能は現在開発中です。<br/>
                  近日公開予定です。
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* クラスター詳細モーダル - スクリーンショットのデザインを完全再現 */}
      {showClusterDetails && selectedCluster && (
        <ClusterDetailModal
          isVisible={showClusterDetails}
          onClose={handleCloseClusterDetails}
          cluster={selectedCluster}
          boardCards={boardState.cards}
          onUpdateClusterLabel={handleUpdateClusterLabel}
          onAISuggestion={handleAILabelGeneration}
          onNodeSelect={handleNodeSelect}
        />
      )}

      {/* AI提案モーダル */}
      <AILabelSuggestionModal
        isVisible={showAILabelModal}
        onClose={handleAILabelModalClose}
        onSelectLabel={handleAILabelSelect}
        cards={aiLabelTargetCluster?.cards || []}
        clusterId={aiLabelTargetCluster?.id || ''}
        currentLabel={aiLabelTargetCluster?.currentLabel || ''}
        userId={authUser?.id}
      />
    </div>
  );
};

export default TheoryBuildingSpace;
