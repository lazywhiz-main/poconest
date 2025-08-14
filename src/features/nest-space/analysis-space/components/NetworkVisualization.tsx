import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { NetworkNode, NetworkEdge, NetworkGraphData, NetworkVisualizationConfig } from '../../../../types/analysis';
import type { BoardItem } from '../../../board-space/contexts/BoardContext';
import { GroundedTheoryResultPanel } from '../../../../components/ui/GroundedTheoryResultPanel';
import { useBoardContext } from '../../../board-space/contexts/BoardContext';
import { CardModal } from '../../../board-space/components/BoardSpace';
import { AIAnalysisService, type SuggestedRelationship } from '../../../../services/AIAnalysisService';
import { AnalysisService, AnalysisResult, ClusterLabel } from '../../../../services/AnalysisService';
import { SmartClusteringService, ClusteringConfig, ClusteringResult } from '../../../../services/SmartClusteringService';
import { ClusterViewService } from '../../../../services/ClusterViewService';
import type { SavedClusterView } from '../../../../types/clusterView';
import type { BoardColumnType } from '../../../../types/board';
import AnalysisResultModal from './AnalysisResultModal';
import { supabase } from '../../../../services/supabase/client';
import { useAuth } from '../../../../contexts/AuthContext';
import { useNest } from '../../../../features/nest/contexts/NestContext'; // Use the full context with Nest type
import { SaveClusterDialog } from './SaveClusterDialog';
import { ClusterViewManager } from './ClusterViewManager';
import { GroundedTheoryManager } from './GroundedTheoryManager';
import { SidePeakPanel } from './SidePeakPanel';
import { RelationsSidePeak } from './RelationsSidePeak';
import { ClusteringSidePeak } from './ClusteringSidePeak';
import { TheoryBuildingSidePeak } from './TheoryBuildingSidePeak';
import { ViewNavigationSidePeak } from './ViewNavigationSidePeak';
import AILabelSuggestionModal from '../../../../components/ui/AILabelSuggestionModal';
import { THEME_COLORS } from '../../../../constants/theme';
import { RelationsAnalysisService, type RelationsDuplicationReport, type RelationsQualityReport } from '../../../../services/RelationsAnalysisService';
import RelationsQualityModal from '../../../../components/ui/RelationsQualityModal';
// import { RelationsDeduplicationModal } from '../../../../components/ui/RelationsDeduplicationModal'; // ファイルが削除されたためコメントアウト
import { UnifiedRelationsService, type UnifiedAnalysisResult } from '../../../../services/UnifiedRelationsService';
import { RelationsParameterManager } from '../../../../services/RelationsParameterManager';
import RelationsParameterSettingsModal from '../../../../components/ui/RelationsParameterSettingsModal';

// 統合分析結果のインターフェース
interface UnifiedRelationshipSuggestion extends SuggestedRelationship {
  analysisMethod: 'ai' | 'tag_similarity' | 'derived';
  methodLabel: string;
  methodIcon: string;
  confidence: number;
  isAlreadyCreated?: boolean; // 既にDBに作成済みかどうか
}

// ビュー保存・管理のインターフェース
interface SavedView {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  nestId: string;
  // 分析状態
  clusteringConfig: {
    algorithm: string;
    strengthThreshold: number;
    useWeightFiltering: boolean;
    showFilteredClusters: boolean;
  };
  customLabels: Record<string, string>; // label.id -> label.text
  nodePositions: Record<string, {x: number, y: number}>;
  filterState: {
    tags: string[];
    types: string[];
    relationships: string[];
  };
  // UI状態
  transform: { x: number, y: number, scale: number };
  activeFilterTab: 'nodes' | 'relationships' | 'clusters';
}

interface NetworkVisualizationProps {
  cards: BoardItem[];
  relationships: Array<{
    card_id: string;
    related_card_id: string;
    strength: number;
    relationship_type: string;
  }>;
  config: NetworkVisualizationConfig;
  onNodeSelect?: (nodeId: string) => void;
  onNodeDoubleClick?: (nodeId: string) => void;
}



// ノードタイプ別の色とアイコン
const NODE_CONFIG = {
  INBOX: { color: THEME_COLORS.textMuted, icon: '📥' },
  QUESTIONS: { color: THEME_COLORS.primaryYellow, icon: '❓' },
  INSIGHTS: { color: THEME_COLORS.primaryPurple, icon: '💡' },
  THEMES: { color: THEME_COLORS.primaryBlue, icon: '🎯' },
  ACTIONS: { color: THEME_COLORS.primaryOrange, icon: '⚡' },
} as const;

// エッジタイプ別の色
const EDGE_COLORS = {
  // 基本的な関係性タイプ
  manual: THEME_COLORS.primaryGreen,      // 手動で設定された関係性
  semantic: THEME_COLORS.primaryOrange,   // 意味的な関係性
  derived: THEME_COLORS.primaryBlue,      // 推論された関係性
  tag_similarity: THEME_COLORS.primaryCyan, // タグの類似性
  ai: THEME_COLORS.primaryYellow,         // AI提案された関係性
  
  // 従来の関係性タイプ（後方互換性）
  relates_to: THEME_COLORS.primaryGreen,
  supports: THEME_COLORS.primaryBlue,
  leads_to: THEME_COLORS.primaryOrange,
  enables: THEME_COLORS.primaryCyan,
  questions: THEME_COLORS.primaryYellow,
  implements: THEME_COLORS.primaryPurple,
  validates: THEME_COLORS.primaryGreen,
  includes: THEME_COLORS.primaryBlue,
} as const;

// ノードサイズの取得（重複回避のためさらに調整）
const getNodeSize = (size: 'small' | 'medium' | 'large' | 'xlarge') => {
  const sizes = { small: 20, medium: 26, large: 32, xlarge: 38 }; // さらに小さく、よりコンパクトに
  return sizes[size] || 26;
};

const NetworkVisualization: React.FC<NetworkVisualizationProps> = ({
  cards,
  relationships,
  config,
  onNodeSelect,
  onNodeDoubleClick,
}) => {
  const authUser = useAuth();
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [highlightedNodes, setHighlightedNodes] = useState<Set<string>>(new Set());
  // 初期ビューポートを画面中央に設定（ノードが見えるように）
  const [transform, setTransform] = useState({ x: 400, y: 300, scale: 0.5 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showClusters, setShowClusters] = useState(false);
  const [showDensity, setShowDensity] = useState(false);
  const [activeFilters, setActiveFilters] = useState<{ tags: string[], types: string[], relationships: string[] }>({ tags: [], types: [], relationships: [] });
  const [detectedClusters, setDetectedClusters] = useState<string[][]>([]);
  
  // 動的な描画領域サイズ（ノード数に応じて調整）
  const [containerDimensions, setContainerDimensions] = useState({ width: 4800, height: 3600 });
  
  // 密度管理: 最適な描画領域サイズを計算
  const calculateOptimalArea = useCallback((nodeCount: number): { width: number, height: number } => {
    const baseArea = 1200 * 900;  // 基準面積
    const optimalDensity = 0.0001; // ノード数/px² の最適値
    const requiredArea = Math.max(baseArea, nodeCount / optimalDensity);
    const aspectRatio = 4/3; // 16:12の比率を維持
    
    return {
      width: Math.sqrt(requiredArea * aspectRatio),
      height: Math.sqrt(requiredArea / aspectRatio)
    };
  }, []);
  
  // 最適なズームレベルを計算
  const calculateOptimalZoom = useCallback((nodeCount: number): number => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const currentArea = containerDimensions.width * containerDimensions.height;
    const viewportArea = viewportWidth * viewportHeight;
    
    // 基本的なスケール計算（全体が見える程度）
    const baseScale = Math.min(
      viewportWidth / containerDimensions.width,
      viewportHeight / containerDimensions.height
    ) * 0.8; // 80%程度のマージンを確保
    
    // ノード数に応じた調整
    if (nodeCount < 10) {
      return Math.max(baseScale, 0.5); // 最小0.5倍
    } else if (nodeCount < 50) {
      return Math.max(baseScale, 0.3); // 最小0.3倍
    } else {
      return Math.max(baseScale, 0.2); // 最小0.2倍
    }
  }, [containerDimensions]);
  
  // ノード位置を独立して管理
  const [nodePositions, setNodePositions] = useState<{ [key: string]: { x: number, y: number } }>({});
  
  // 実際の密度を計算してフィードバック
  const calculateActualDensity = useCallback((): number => {
    if (Object.keys(nodePositions).length < 2) return 0;
    
    const positions = Object.values(nodePositions);
    let totalDistance = 0;
    let pairCount = 0;
    
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const distance = Math.sqrt(
          Math.pow(positions[i].x - positions[j].x, 2) + 
          Math.pow(positions[i].y - positions[j].y, 2)
        );
        totalDistance += distance;
        pairCount++;
      }
    }
    
    const averageDistance = totalDistance / pairCount;
    const area = containerDimensions.width * containerDimensions.height;
    const nodeCount = positions.length;
    
    // 密度指標: ノード数 / (平均距離^2 * 面積正規化)
    return nodeCount / (Math.pow(averageDistance, 2) / area * 1000000);
  }, [nodePositions, containerDimensions]);
  
  // 画面サイズの状態管理
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 800
  });
  
  // レスポンシブパネル幅を計算
  const getResponsivePanelWidth = useCallback((): string => {
    const width = windowSize.width;
    if (width >= 1200) {
      return '400px';  // Large screens
    } else if (width >= 768) {
      return '350px';  // Medium screens
    } else {
      return 'calc(100vw - 40px)';  // Small screens - full width with margin
    }
  }, [windowSize.width]);
  
  // 初期レイアウト適用フラグ
  const [hasAppliedInitialLayout, setHasAppliedInitialLayout] = useState(false);
  
  // Reset View実行フラグ（Auto Layout再適用を完全に防ぐため）
  const [isManualReset, setIsManualReset] = useState(false);
  
  // AI関係性提案の状態
  const [aiSuggestions, setAiSuggestions] = useState<UnifiedRelationshipSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  // const [showSuggestionsPanel, setShowSuggestionsPanel] = useState(false); // サイドピークに統合により不要
  const [analysisProgress, setAnalysisProgress] = useState('');
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  
  // 右クリックメニューの状態管理
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    relationshipId: string;
    targetNodeId: string;
  } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel?: () => void;
    confirmText?: string;
    cancelText?: string;
  } | null>(null);
  
  // Card editing modal state
  const [isCardModalVisible, setIsCardModalVisible] = useState(false);
  const [selectedCard, setSelectedCard] = useState<BoardItem | null>(null);
  const [selectedColumn, setSelectedColumn] = useState<BoardColumnType>('INBOX');
  
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  
  // Board context for card editing
  const { state: boardState, updateCard, loadNestData } = useBoardContext();
  
  // Auth and nest context for AI usage logging
  const { user } = useAuth();
  const { currentNest } = useNest();
  
  // RelationsParameterManager初期化
  useEffect(() => {
    RelationsParameterManager.loadFromLocalStorage();
    console.log(`🎛️ [NetworkVisualization] パラメータマネージャー初期化完了:`, RelationsParameterManager.getCurrentMode());
  }, []);

  // 初期表示時にビューポートを適切に設定
  useEffect(() => {
    if (cards.length > 0 && Object.keys(nodePositions).length === 0) {
      console.log('🎯 [NetworkVisualization] 初回データ読み込み - ビューポートを中央に設定');
      // 動的にビューポートサイズに応じて中央位置を計算
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const centerX = Math.max(300, viewportWidth * 0.3);
      const centerY = Math.max(200, viewportHeight * 0.3);
      setTransform({ x: centerX, y: centerY, scale: 0.6 });
    }
  }, [cards.length, nodePositions]);

  // Analysis result modal state
  const [analysisModalVisible, setAnalysisModalVisible] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [analysisType, setAnalysisType] = useState<'tag_similarity' | 'derived' | null>(null);

  // Auto Labels機能の状態
  const [clusterLabels, setClusterLabels] = useState<ClusterLabel[]>([]);
  const [showLabels, setShowLabels] = useState(false);
  const [isGeneratingLabels, setIsGeneratingLabels] = useState(false);
  
  // ラベルインライン編集の状態管理
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>('');
  
  // 関連性追加UIの状態管理
  const [showAddRelationModal, setShowAddRelationModal] = useState(false);
  const [newRelationTarget, setNewRelationTarget] = useState<string>('');
  const [newRelationType, setNewRelationType] = useState<'semantic' | 'manual' | 'derived'>('manual');
  const [newRelationStrength, setNewRelationStrength] = useState<number>(0.7);
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // 関連性ソートの状態管理
  const [relationsSortBy, setRelationsSortBy] = useState<'strength' | 'type' | 'target_title' | 'default'>('default');
  const [relationsSortOrder, setRelationsSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showSortOptions, setShowSortOptions] = useState(false);

  // クラスター詳細ビューの状態管理
  const [selectedCluster, setSelectedCluster] = useState<string | null>(null);
  const [showClusterDetailPanel, setShowClusterDetailPanel] = useState(false);
  
  // クラスターラベル編集の状態管理（詳細パネル内）
  const [isEditingClusterLabel, setIsEditingClusterLabel] = useState(false);
  const [editingClusterText, setEditingClusterText] = useState<string>('');

  // クラスタリング制御の状態
  const [strengthThreshold, setStrengthThreshold] = useState(0.3);
  const [useWeightFiltering, setUseWeightFiltering] = useState(true);
  const [showClusteringControls, setShowClusteringControls] = useState(false);
  const [showFilteredClusters, setShowFilteredClusters] = useState(false);
  const [filteredClusters, setFilteredClusters] = useState<string[][]>([]);
  const [isFilterPanelCollapsed, setIsFilterPanelCollapsed] = useState(false);
  const [showMinimap, setShowMinimap] = useState(true);
  
  // フィルターパネルのタブ管理
  const [activeFilterTab, setActiveFilterTab] = useState<'nodes' | 'relationships' | 'clusters'>('nodes');
  
  // ビュー保存・管理の状態
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [currentViewName, setCurrentViewName] = useState<string>('');
  const [showViewManager, setShowViewManager] = useState(false);
  const [isCreatingView, setIsCreatingView] = useState(false);
  const [newViewName, setNewViewName] = useState('');

  // AI支援ラベル生成の状態
  const [showAILabelModal, setShowAILabelModal] = useState(false);
  const [aiLabelTargetCluster, setAILabelTargetCluster] = useState<{
    id: string;
    cards: BoardItem[];
    currentLabel: string;
  } | null>(null);

  // グラウンデッド・セオリー分析結果の状態
  const [groundedTheoryResult, setGroundedTheoryResult] = useState<any>(null);
  
  // Relations分析関連のstate
  const [relationsReport, setRelationsReport] = useState<RelationsDuplicationReport | null>(null);
  const [qualityReport, setQualityReport] = useState<RelationsQualityReport | null>(null);
  const [showRelationsAnalysis, setShowRelationsAnalysis] = useState(false);
  const [isAnalyzingRelations, setIsAnalyzingRelations] = useState(false);

  // 統合分析関連のstate
  const [isUnifiedAnalyzing, setIsUnifiedAnalyzing] = useState(false);

  // クラスタービュー管理関連のstate
  const [showSaveClusterDialog, setShowSaveClusterDialog] = useState(false);
  const [isSavingCluster, setIsSavingCluster] = useState(false);

  // グラウンデッド・セオリー管理関連のstate
  const [showGroundedTheoryManager, setShowGroundedTheoryManager] = useState(false);

  // 新しいメインメニューカテゴリーのstate
  const [showRelationsPanel, setShowRelationsPanel] = useState(false);
  const [showViewNavigationPanel, setShowViewNavigationPanel] = useState(false);
  const [showSearchFilterPanel, setShowSearchFilterPanel] = useState(false);

  // Relations重複削除関連のstate (一時的にコメントアウト)
  // const [isDeduplicating, setIsDeduplicating] = useState(false);
  // const [deduplicationResult, setDeduplicationResult] = useState<any>(null);
  // const [showDeduplicationModal, setShowDeduplicationModal] = useState(false);
  
  // パラメータ設定モーダルの状態
  const [showParameterSettings, setShowParameterSettings] = useState(false);

  // 統合分析フィルターの状態（サイドピーク内で管理するため削除予定）
  // const [methodFilters, setMethodFilters] = useState({
  //   ai: true,
  //   tag_similarity: true,
  //   derived: true,
  //   unified: true
  // });

  // 保存されたビューをロード
  useEffect(() => {
    const nestId = boardState.currentNestId;
    if (!nestId) return;

    try {
      const existingSavedViews = JSON.parse(localStorage.getItem(`savedViews_${nestId}`) || '[]');
      setSavedViews(existingSavedViews);
    } catch (error) {
      console.error('[NetworkVisualization] ビューロードエラー:', error);
    }
  }, [boardState.currentNestId]);

  // 解析モード切り替えの状態
  const [analysisMode, setAnalysisMode] = useState<'simple' | 'advanced' | 'saved-views'>('simple');

  // 高度解析モード用の状態
  const [advancedConfig, setAdvancedConfig] = useState({
    // アルゴリズム設定
    algorithm: 'hdbscan' as 'hdbscan' | 'dbscan' | 'kmeans' | 'hierarchical',
    
    // 類似性重み設定
    weights: {
      edgeStrength: 0.4,      // エッジ強度
      tagSimilarity: 0.3,     // タグ類似性
      semanticSimilarity: 0.3  // 意味的類似性
    },
    
    // クラスタリングパラメータ
    clustering: {
      minClusterSize: 2,
      maxClusterSize: 8,
      similarityThreshold: 0.5
    },
    
    // ラベリング設定
    labeling: {
      useSemanticLabeling: true,
      maxLabelsPerCluster: 3,
      confidenceThreshold: 0.6
    }
  });

  // 高度解析の実行状態
  const [isAdvancedAnalyzing, setIsAdvancedAnalyzing] = useState(false);
  const [smartClusteringResult, setSmartClusteringResult] = useState<ClusteringResult | null>(null);



  // フィルター済み提案リスト（サイドピーク内で管理するため削除予定）
  // const unifiedSuggestions = useMemo(() => {
  //   // aiSuggestionsがUnifiedRelationshipSuggestion[]に変換されているかチェック
  //   const unified = aiSuggestions as UnifiedRelationshipSuggestion[];
  //   return unified.filter((suggestion) => 
  //     suggestion.analysisMethod && methodFilters[suggestion.analysisMethod as keyof typeof methodFilters]
  //   );
  // }, [aiSuggestions, methodFilters]);

  // ページ遷移防止（分析中）
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isAnalyzing) {
        e.preventDefault();
        e.returnValue = 'AI分析が実行中です。ページを離れますか？';
        return 'AI分析が実行中です。ページを離れますか？';
      }
    };

    const handlePopState = (e: PopStateEvent) => {
      if (isAnalyzing) {
        e.preventDefault();
        showCustomDialog(
          '分析実行中',
          'AI分析が実行中です。中断してページを離れますか？',
          () => {
            setIsAnalyzing(false);
            setShowAnalysisModal(false);
            window.history.back();
          },
          () => {
            window.history.pushState(null, '', window.location.href);
          }
        );
        window.history.pushState(null, '', window.location.href);
      }
    };

    if (isAnalyzing) {
      window.addEventListener('beforeunload', handleBeforeUnload);
      window.addEventListener('popstate', handlePopState);
      // 履歴に現在の状態をプッシュ（戻るボタン対策）
      window.history.pushState(null, '', window.location.href);
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isAnalyzing]);

  // カスタムダイアログ表示
  const showCustomDialog = (
    title: string,
    message: string,
    onConfirm: () => void,
    onCancel?: () => void,
    confirmText: string = '確認',
    cancelText: string = 'キャンセル'
  ) => {
    setConfirmDialog({
      title,
      message,
      onConfirm,
      onCancel,
      confirmText,
      cancelText,
    });
    setShowConfirmDialog(true);
  };

  // Relations重複削除実行
  const handleRelationsDeduplication = async () => {
    const boardId = cards.length > 0 ? cards[0].board_id : null;
    if (!boardId || isDeduplicating) return;
    
    try {
      setIsDeduplicating(true);
      console.log('🧹 [NetworkVisualization] Relations重複削除開始');
      
      // RelationsDeduplicationServiceをインポート
      const { RelationsDeduplicationService } = await import('../../../../services/RelationsDeduplicationService');
      
      // 重複削除実行（デフォルト戦略）
      const result = await RelationsDeduplicationService.deduplicateRelations(boardId, {
        priority: ['manual', 'unified', 'ai', 'derived', 'tag_similarity', 'semantic'],
        qualityThreshold: 0.4,
        strengthDifferenceThreshold: 0.15,
        keepHighestQuality: true,
        preserveManual: true
      });
      
      console.log('✅ [NetworkVisualization] Relations重複削除完了:', result);
      
      // 結果を保存してモーダル表示
      setDeduplicationResult(result);
      setShowDeduplicationModal(true);
      
      // データリフレッシュ
      if (boardState.currentNestId) {
        await loadNestData(boardState.currentNestId);
      }
      
      // 成功メッセージ
      showCustomDialog(
        '重複削除完了',
        `Relations重複削除完了: ${result.relationsDeleted}件削除、${result.relationsKept}件保持\n品質向上: ${result.qualityImprovement.improvementPercentage.toFixed(1)}%`,
        () => hideCustomDialog(),
        undefined,
        'OK'
      );
      
    } catch (error) {
      console.error('❌ [NetworkVisualization] Relations重複削除エラー:', error);
      showCustomDialog(
        'エラー',
        `Relations重複削除中にエラーが発生しました: ${error instanceof Error ? error.message : String(error)}`,
        () => hideCustomDialog()
      );
    } finally {
      setIsDeduplicating(false);
    }
  };

  // Relations分析実行
  const handleRelationsAnalysis = async () => {
    if (!cards.length || isAnalyzingRelations) return;
    
    try {
      setIsAnalyzingRelations(true);
      console.log('🔍 [NetworkVisualization] Relations分析開始 (メモリ内データ使用)');
      
      // NetworkVisualization で既に利用可能な relationships データを直接使用
      // これは BoardContext.loadNestData で取得済みの正確なデータ
      const currentRelations = relationships.map(rel => ({
        id: `${rel.card_id}-${rel.related_card_id}`,
        card_id: rel.card_id,
        related_card_id: rel.related_card_id,
        relationship_type: rel.relationship_type,
        strength: rel.strength,
        confidence: 1.0,
        metadata: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));
      
      console.log('🔍 [NetworkVisualization] メモリ内Relations数:', currentRelations.length);
      
      // メモリ内データを使用してダミー分析結果を生成
      const duplicationReport = {
        boardId: cards[0]?.board_id || '',
        totalRelations: currentRelations.length,
        uniquePairs: currentRelations.length, // 簡略化
        duplicateRelations: [],
        duplicationRate: 0.0,
        typeDistribution: {
          manual: currentRelations.filter(r => r.relationship_type === 'manual').length,
          ai: currentRelations.filter(r => r.relationship_type === 'ai').length,
          derived: currentRelations.filter(r => r.relationship_type === 'derived').length,
          tag_similarity: currentRelations.filter(r => r.relationship_type === 'tag_similarity').length,
          semantic: currentRelations.filter(r => r.relationship_type === 'semantic').length,
          unified: currentRelations.filter(r => r.relationship_type === 'unified').length,
        },
        qualityDistribution: { high: 0, medium: currentRelations.length, low: 0 },
        conflictingRelations: [],
        recommendations: ['メモリ内データを使用して分析しました']
      };
      
      const qualityAnalysis = {
        boardId: cards[0]?.board_id || '',
        totalCards: cards.length,
        connectedCards: cards.filter(card => 
          currentRelations.some(rel => rel.card_id === card.id || rel.related_card_id === card.id)
        ).length,
        connectionRatio: 0.8, // 簡略化
        averageConnectionsPerCard: currentRelations.length / cards.length,
        relationsDensity: currentRelations.length / (cards.length * (cards.length - 1) / 2),
        strongRelationsCount: currentRelations.filter(r => r.strength > 0.7).length,
        weakRelationsCount: currentRelations.filter(r => r.strength < 0.4).length,
        qualityScore: 85,
        qualityGrade: 'B' as const,
        qualityBreakdown: {
          connectionScore: 85,
          connectionWeight: 0.3,
          connectionContribution: 25.5,
          densityScore: 70,
          densityWeight: 0.2,
          densityContribution: 14.0,
          strongRelationsScore: 90,
          strongRelationsWeight: 0.3,
          strongRelationsContribution: 27.0,
          averageStrengthScore: 80,
          averageStrengthWeight: 0.2,
          averageStrengthContribution: 16.0,
          details: {
            connectionRatio: 0.8,
            relationsDensity: currentRelations.length / (cards.length * (cards.length - 1) / 2),
            strongRelationsRatio: currentRelations.filter(r => r.strength > 0.7).length / currentRelations.length,
            averageStrength: currentRelations.reduce((sum, rel) => sum + rel.strength, 0) / currentRelations.length
          }
        }
      };
      
      setRelationsReport(duplicationReport);
      setQualityReport(qualityAnalysis);
      
      // 分析モーダル表示
      setShowRelationsAnalysis(true);
      
      console.log('✅ [NetworkVisualization] Relations分析完了:', {
        totalRelations: duplicationReport.totalRelations,
        duplicationRate: `${(duplicationReport.duplicationRate * 100).toFixed(1)}%`,
        qualityGrade: qualityAnalysis.qualityGrade
      });
      
    } catch (error) {
      console.error('❌ [NetworkVisualization] Relations分析エラー:', error);
      alert('Relations分析エラーが発生しました');
    } finally {
      setIsAnalyzingRelations(false);
    }
  };

  // Relations一括削除
  const handleBulkDeleteRelations = async () => {
    // 削除オプション選択
    const deleteType = window.prompt(
      `Relations削除オプションを選択してください:\n\n` +
      `1: 全Relations削除\n` +
      `2: AI分析Relations削除\n` +
      `3: タグ類似性Relations削除\n` +
      `4: 推論Relations削除\n` +
      `5: 低強度Relations削除 (0.0-0.4)\n` +
      `6: 中強度Relations削除 (0.4-0.7)\n` +
      `7: 高強度Relations削除 (0.7-1.0)\n\n` +
      `番号を入力してください (1-7):`,
      '1'
    );
    
    if (!deleteType || !['1', '2', '3', '4', '5', '6', '7'].includes(deleteType)) {
      return; // キャンセルまたは無効な入力
    }
    
    // 削除設定を構築
    let deleteOptions: any = { boardId: boardState.boardId || undefined };
    let confirmMessage = '';
    
    switch (deleteType) {
      case '1':
        confirmMessage = `現在のボードの全てのRelationsを削除しますか？`;
        break;
      case '2':
        deleteOptions.relationshipType = 'ai';
        confirmMessage = `AI分析で生成されたRelationsを削除しますか？`;
        break;
      case '3':
        deleteOptions.relationshipType = 'tag_similarity';
        confirmMessage = `タグ類似性で生成されたRelationsを削除しますか？`;
        break;
      case '4':
        deleteOptions.relationshipType = 'derived';
        confirmMessage = `推論で生成されたRelationsを削除しますか？`;
        break;
      case '5':
        deleteOptions.strengthRange = { min: 0.0, max: 0.4 };
        confirmMessage = `低強度Relations (0.0-0.4) を削除しますか？`;
        break;
      case '6':
        deleteOptions.strengthRange = { min: 0.4, max: 0.7 };
        confirmMessage = `中強度Relations (0.4-0.7) を削除しますか？`;
        break;
      case '7':
        deleteOptions.strengthRange = { min: 0.7, max: 1.0 };
        confirmMessage = `高強度Relations (0.7-1.0) を削除しますか？`;
        break;
    }
    
    confirmMessage += `\n\nこの操作は元に戻せません。`;
    
    if (window.confirm(confirmMessage)) {
      try {
        console.log('🗑️ [NetworkVisualization] Relations一括削除開始:', deleteOptions);
        
        const result = await AnalysisService.bulkDeleteRelationships(deleteOptions);
        
        if (result.success) {
          showCustomDialog(
            '削除完了',
            result.details,
            () => {
              hideCustomDialog();
              // ネットワークデータを再読み込み
              window.location.reload();
            }
          );
        } else {
          showCustomDialog(
            '削除エラー',
            result.details || '削除に失敗しました',
            () => hideCustomDialog()
          );
        }
      } catch (error) {
        console.error('❌ [NetworkVisualization] 一括削除エラー:', error);
        showCustomDialog(
          'エラー',
          '一括削除中にエラーが発生しました',
          () => hideCustomDialog()
        );
      }
    }
  };

  // 統合分析実行
  const handleUnifiedAnalysis = async () => {
    const boardId = cards.length > 0 ? cards[0].board_id : null;
    if (!boardId || isUnifiedAnalyzing) return;
    
    try {
      setIsUnifiedAnalyzing(true);
      console.log('🧠 [NetworkVisualization] 統合分析開始');
      
      // 統合Relations生成実行（ハイブリッドアプローチ：品質基準 + 適度な制限）
              const unifiedAnalysisResult = await UnifiedRelationsService.generateUnifiedRelations(boardId, {
          minOverallScore: 0.25, // 🎯 品質ライン向上: 0.20 → 0.25 (自然に数を抑制)
          minConfidence: 0.75,   // 🎯 信頼度強化: 0.70 → 0.75 (より確実な候補のみ)
          minSemanticScore: 0.18, // 🎯 セマンティック強化: 0.12 → 0.18 (意味的関連を重視)
          maxRelationsPerBoard: 1000, // 🚫 数制限を事実上無効化 (品質で自然制御)
          preventDuplication: true
        });
      
      console.log('✅ [NetworkVisualization] 統合分析完了:', {
        generatedRelations: unifiedAnalysisResult.generatedRelations,
        averageScore: `${(unifiedAnalysisResult.qualityMetrics.averageScore * 100).toFixed(1)}%`,
        processingTime: `${unifiedAnalysisResult.processingTime}ms`
      });

      // 従来のRelations作成体験に合わせて、提案として表示（DB保存はユーザー承認後）
      if (unifiedAnalysisResult.generatedRelations > 0) {
        // UnifiedAnalysisResultをSuggestedRelationshipに変換（提案レベル）
        console.log('🔍 [DEBUG] unifiedAnalysisResult.relationships:', unifiedAnalysisResult.relationships.length, unifiedAnalysisResult.relationships.slice(0, 2));
        
        const suggestions: UnifiedRelationshipSuggestion[] = unifiedAnalysisResult.relationships.map(rel => ({
          sourceCardId: rel.similarity.cardA.id,
          targetCardId: rel.similarity.cardB.id,
          relationshipType: 'conceptual' as const,
          suggestedStrength: rel.relationship.strength,
          confidence: rel.similarity.confidence,
          similarity: rel.similarity.overallScore,
          explanation: rel.similarity.explanation,
          analysisMethod: 'ai' as const, // 'unified' から 'ai' に変更
          methodLabel: '統合分析',
          methodIcon: '🧠'
        }));
        
        console.log('🔍 [DEBUG] 変換後のsuggestions:', suggestions.length, suggestions.slice(0, 2));
        
        // 既存のAI提案に統合分析を追加（上書きしない）
        const existingSuggestions = aiSuggestions as UnifiedRelationshipSuggestion[];
        const combinedSuggestions = [...existingSuggestions, ...suggestions];
        
        console.log('🔍 [DEBUG] 既存suggestions:', existingSuggestions.length);
        console.log('🔍 [DEBUG] 統合suggestions:', suggestions.length);
        console.log('🔍 [DEBUG] 結合後suggestions:', combinedSuggestions.length);
        
        setAiSuggestions(combinedSuggestions);
        // 結果をサイドピークに表示するため、Relations パネルを開く
        setShowRelationsPanel(true);
        
        console.log('🔍 [DEBUG] setAiSuggestions完了, suggestions数:', suggestions.length);
        
        // 完了メッセージ（従来と同じスタイル）
        showCustomDialog(
          '分析完了',
          `統合分析完了: ${unifiedAnalysisResult.generatedRelations}個のRelations候補が見つかりました！\n平均品質: ${(unifiedAnalysisResult.qualityMetrics.averageScore * 100).toFixed(0)}%\n\n候補を確認して承認してください。`,
          () => hideCustomDialog(),
          undefined,
          'OK'
        );
      } else {
        // 結果が0件の場合
        showCustomDialog(
          '分析完了',
          '統合分析では新しい関係性の候補が見つかりませんでした。フィルター条件を緩めるか、カード内容を確認してください。',
          () => hideCustomDialog()
        );
      }
      
    } catch (error) {
      console.error('❌ [NetworkVisualization] 統合分析エラー:', error);
      showCustomDialog(
        'エラー',
        `統合分析中にエラーが発生しました: ${error instanceof Error ? error.message : String(error)}`,
        () => hideCustomDialog()
      );
    } finally {
      setIsUnifiedAnalyzing(false);
    }
  };

  const hideCustomDialog = () => {
    setShowConfirmDialog(false);
    setConfirmDialog(null);
  };

  // 🔧 クラスタービュー管理機能
  
  // 現在のクラスターを保存
  const handleSaveCurrentCluster = async (name: string, description?: string) => {
    try {
      setIsSavingCluster(true);
      console.log('💾 [NetworkVisualization] クラスタービュー保存開始:', name);

      // 現在の状態をチェック
      if (!smartClusteringResult || clusterLabels.length === 0) {
        showCustomDialog(
          'エラー',
          '保存可能なクラスターデータがありません。\n先にクラスタリングを実行してください。',
          () => hideCustomDialog()
        );
        return;
      }

      // 保存用データの準備
      const saveInput = {
        name,
        description,
        boardId: boardState.boardId || '',
        nestId: boardState.currentNestId || '',
        clusterLabels,
        smartClusteringResult,
        filteredClusters,
        nodePositions,
        showFilteredClusters,
        showLabels
      };

      // 保存実行
      const response = await ClusterViewService.saveClusterView(saveInput);
      
      if (response.success) {
        setShowSaveClusterDialog(false);
        showCustomDialog(
          '保存完了',
          `クラスタービュー「${name}」を保存しました。\n「保存済みビュー」タブから呼び出せます。`,
          () => hideCustomDialog()
        );
        console.log('✅ [NetworkVisualization] クラスタービュー保存完了:', response.data);
      } else {
        showCustomDialog(
          'エラー',
          `保存に失敗しました: ${response.error}`,
          () => hideCustomDialog()
        );
      }
    } catch (error) {
      console.error('❌ [NetworkVisualization] 保存エラー:', error);
      showCustomDialog(
        'エラー',
        `予期しないエラーが発生しました: ${error instanceof Error ? error.message : 'Unknown error'}`,
        () => hideCustomDialog()
      );
    } finally {
      setIsSavingCluster(false);
    }
  };

  // クラスタービューを読み込み
  const handleLoadClusterView = async (view: SavedClusterView) => {
    try {
      console.log('📂 [NetworkVisualization] クラスタービュー読み込み開始:', view.name);

      // 既存状態を完全復元
      setClusterLabels(view.clusterLabels);
      setSmartClusteringResult(view.smartClusteringResult);
      setFilteredClusters(view.filteredClusters);
      setNodePositions(view.nodePositions);
      setShowFilteredClusters(view.showFilteredClusters);
      setShowLabels(view.showLabels);

      // 自動的にクラスタータブに切り替え
      setActiveFilterTab('clusters');

      showCustomDialog(
        '読み込み完了',
        `クラスタービュー「${view.name}」を読み込みました。\n左下のクラスタータブで詳細を確認できます。`,
        () => hideCustomDialog()
      );

      console.log('✅ [NetworkVisualization] クラスタービュー読み込み完了:', {
        clusterCount: view.clusterLabels.length,
        cardCount: view.clusterLabels.reduce((sum, cluster) => sum + cluster.cardIds.length, 0)
      });
    } catch (error) {
      console.error('❌ [NetworkVisualization] 読み込みエラー:', error);
      showCustomDialog(
        'エラー',
        `読み込みに失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`,
        () => hideCustomDialog()
      );
    }
  };

  // 保存可能かどうかのチェック
  const canSaveCluster = () => {
    return smartClusteringResult && clusterLabels.length > 0;
  };

  // ネットワークデータの計算
  const networkData = useMemo((): NetworkGraphData => {
    // 動的な描画領域を使用
    const containerWidth = containerDimensions.width;
    const containerHeight = containerDimensions.height;
    const center = { x: containerWidth / 2, y: containerHeight / 2 };

    // フィルター適用
    const filteredCards = cards.filter(card => {
      const tagMatch = activeFilters.tags.length === 0 || 
                     activeFilters.tags.some(tag => card.tags?.includes(tag));
      const typeMatch = activeFilters.types.length === 0 || 
                       activeFilters.types.includes(card.column_type);
      return tagMatch && typeMatch;
    });

    // ノードの生成 - 改良された配置アルゴリズム
    const nodes: NetworkNode[] = [];
    const processedPositions: Array<{ x: number, y: number, size: number }> = []; // 処理済みノードの位置を追跡
    
    filteredCards.forEach((card, index) => {
      // 基本的な接続数計算
      const directConnections = relationships.filter(
        rel => (rel.card_id === card.id || rel.related_card_id === card.id) &&
               filteredCards.some(c => c.id === rel.card_id || c.id === rel.related_card_id)
      ).length;
      
      // ネットワーク中心性の計算（影響力指標）
      const calculateCentrality = (nodeId: string) => {
        const connectedNodes = new Set<string>();
        const secondDegreeNodes = new Set<string>();
        
        relationships.forEach(rel => {
          if (rel.card_id === nodeId) {
            connectedNodes.add(rel.related_card_id);
            // 2次接続も計算
            relationships.forEach(rel2 => {
              if (rel2.card_id === rel.related_card_id) {
                secondDegreeNodes.add(rel2.related_card_id);
              }
            });
          } else if (rel.related_card_id === nodeId) {
            connectedNodes.add(rel.card_id);
            relationships.forEach(rel2 => {
              if (rel2.card_id === rel.card_id) {
                secondDegreeNodes.add(rel2.related_card_id);
              }
            });
          }
        });
        
        return connectedNodes.size + (secondDegreeNodes.size * 0.3); // 2次接続は30%の重み
      };
      
      const centrality = calculateCentrality(card.id);
      
      // コンテンツ密度の計算
      const contentDensity = (card.content?.length || 0) + 
                           (card.title?.length || 0) * 2 + 
                           (card.tags?.length || 0) * 10;
      
      // タイプ重要度の定義
      const typeWeight = {
        'THEMES': 5,     // 最重要：全体を貫くテーマ
        'INSIGHTS': 4,   // 重要：発見や洞察
        'ACTIONS': 3,    // 中程度：実行項目
        'QUESTIONS': 2,  // 中程度：疑問や課題
        'INBOX': 1       // 低：未分類
      }[card.column_type] || 1;
      
      // 時間的新しさ（最近更新されたものを重視）
      const now = new Date();
      const updatedAt = new Date(card.updated_at || card.created_at);
      const daysSinceUpdate = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24);
      const recencyWeight = Math.max(0.2, 1 - (daysSinceUpdate / 30)); // 30日で重みが最小に
      
      // 統合的な重要度スコア
      const importanceScore = (centrality * 0.4) + 
                             (contentDensity * 0.01) + 
                             (typeWeight * 0.3) + 
                             (recencyWeight * 0.3);
      
      // 改良されたサイズ決定
      let size: 'small' | 'medium' | 'large' | 'xlarge';
      if (importanceScore >= 8) size = 'xlarge';
      else if (importanceScore >= 5) size = 'large';
      else if (importanceScore >= 3) size = 'medium';
      else size = 'small';

      // カスタム位置があればそれを使用、なければ重複回避配置
      let finalX: number, finalY: number;
      if (nodePositions[card.id]) {
        // nodePositionsに既に値がある場合はそれを使用（最優先）
        finalX = nodePositions[card.id].x;
        finalY = nodePositions[card.id].y;
      } else {
        // 重複回避機能付きの配置アルゴリズム
        const centerX = containerWidth / 2;
        const centerY = containerHeight / 2;
        const nodeCount = filteredCards.length;
        const currentNodeSize = getNodeSize(size);
        
        // ノード間の最小距離を設定（重複回避のため）
        const minDistance = currentNodeSize * 7.5; // Auto Layout全体と統一
        
        // 配置試行回数
        let attempts = 0;
        const maxAttempts = 50;
        let validPosition = false;
        
        // デフォルト位置を設定
        finalX = centerX;
        finalY = centerY;
        
        while (!validPosition && attempts < maxAttempts) {
          // 完全にランダムで有機的な配置（グリッドを排除）
          
          // 配置エリアを段階的に拡張するアプローチ
          const placementAttempt = Math.floor(attempts / 10); // 10試行ごとに配置エリアを拡大
          const areaMultiplier = 1 + (placementAttempt * 0.3); // 配置エリアを段階的に拡大
          
          // 中心からの距離をランダムに設定（密度の偏りを作る）
          const maxDistance = Math.min(containerWidth, containerHeight) * 0.4 * areaMultiplier;
          const minDistanceFromCenter = 30; // 中心に近すぎることを防ぐ
          
          // 距離の分布を調整（中心よりやや離れた位置を好む）
          const distanceRandom = Math.random();
          const adjustedDistance = Math.pow(distanceRandom, 0.7); // 0.7乗で分布を調整
          const distance = minDistanceFromCenter + adjustedDistance * (maxDistance - minDistanceFromCenter);
          
          // 角度は完全にランダム
          const angle = Math.random() * 2 * Math.PI;
          
          // 基本位置を計算
          finalX = centerX + distance * Math.cos(angle);
          finalY = centerY + distance * Math.sin(angle);
          
          // 追加のランダムな変動（自然感を増す）
          const jitterAmount = 60 + (placementAttempt * 30); // ボード拡張に合わせてジッター量拡大
          finalX += (Math.random() - 0.5) * jitterAmount;
          finalY += (Math.random() - 0.5) * jitterAmount;
          
          // 配置密度に基づく微調整（重要度の高いノードは中心寄りに）
          if (importanceScore > 5) {
            const pullToCenter = 0.3; // 中心への引力
            finalX = finalX * (1 - pullToCenter) + centerX * pullToCenter;
            finalY = finalY * (1 - pullToCenter) + centerY * pullToCenter;
          }
          
          // 境界チェック
          const margin = currentNodeSize / 2 + 20;
          finalX = Math.max(margin, Math.min(containerWidth - margin, finalX));
          finalY = Math.max(margin, Math.min(containerHeight - margin, finalY));
          
          // 衝突検出（processedPositionsを使用）
          validPosition = processedPositions.every(existing => {
            const distance = Math.sqrt(
              Math.pow(finalX - existing.x, 2) + Math.pow(finalY - existing.y, 2)
            );
            const requiredDistance = Math.max(
              (currentNodeSize + existing.size) / 2 + 15, // ノードサイズに基づく最小距離
              minDistance
            );
            return distance >= requiredDistance;
          });
          
          attempts++;
          
          // 衝突が検出された場合、位置を少しずらして再試行
          if (!validPosition && attempts < maxAttempts) {
            const offsetAngle = Math.random() * 2 * Math.PI;
            const offsetDistance = minDistance + Math.random() * 90; // ボード拡張に合わせてオフセット距離拡大
            finalX += Math.cos(offsetAngle) * offsetDistance;
            finalY += Math.sin(offsetAngle) * offsetDistance;
          }
        }
        
        // 最大試行回数に達した場合でも境界内に配置
        if (!validPosition) {
          console.warn(`Node placement collision for ${card.id}, using fallback position`);
          // フォールバック: 画面端近くに配置
          const edgeMargin = currentNodeSize + 30;
          const side = Math.floor(Math.random() * 4);
          switch (side) {
            case 0: // 上
              finalX = edgeMargin + Math.random() * (containerWidth - 2 * edgeMargin);
              finalY = edgeMargin;
              break;
            case 1: // 右
              finalX = containerWidth - edgeMargin;
              finalY = edgeMargin + Math.random() * (containerHeight - 2 * edgeMargin);
              break;
            case 2: // 下
              finalX = edgeMargin + Math.random() * (containerWidth - 2 * edgeMargin);
              finalY = containerHeight - edgeMargin;
              break;
            case 3: // 左
              finalX = edgeMargin;
              finalY = edgeMargin + Math.random() * (containerHeight - 2 * edgeMargin);
              break;
          }
        }
      }
      
      const nodeConfig = NODE_CONFIG[card.column_type] || NODE_CONFIG.INBOX;
      
      const newNode: NetworkNode = {
        id: card.id,
        title: card.title,
        content: card.content,
        type: card.column_type,
        x: finalX,
        y: finalY,
        size: size,
        color: nodeConfig.color,
        icon: nodeConfig.icon,
        tags: card.tags || [],
        metadata: {
          ...card.metadata,
          importanceScore,
          centrality,
          contentDensity,
          typeWeight,
          recencyWeight
        },
        connectionCount: directConnections,
        createdAt: card.created_at,
        updatedAt: card.updated_at,
      };
      
      // ノードを配列に追加
      nodes.push(newNode);
      // 処理済み位置を追跡配列に追加
      processedPositions.push({ x: finalX, y: finalY, size: getNodeSize(size) });
    });

    // エッジの生成
    const filteredNodeIds = new Set(filteredCards.map(c => c.id));
    const edges: NetworkEdge[] = relationships
      .filter(rel => 
        filteredNodeIds.has(rel.card_id) && 
        filteredNodeIds.has(rel.related_card_id) &&
        (config.edgeFilter.minStrength ? rel.strength >= config.edgeFilter.minStrength : true) &&
        (config.edgeFilter.types ? config.edgeFilter.types.includes(rel.relationship_type) : true) &&
        (activeFilters.relationships.length === 0 || 
         activeFilters.relationships.includes(rel.relationship_type))
      )
      .map(rel => ({
        id: `${rel.card_id}-${rel.related_card_id}`,
        source: rel.card_id,
        target: rel.related_card_id,
        strength: rel.strength,
        type: rel.relationship_type,
        color: EDGE_COLORS[rel.relationship_type as keyof typeof EDGE_COLORS] || THEME_COLORS.textMuted,
        width: Math.max(2, rel.strength * 4), // エッジ幅を少し太く（1.5→2, 3→4）
        metadata: {},
      }));

    return {
      nodes,
      edges,
      metrics: {
        totalNodes: nodes.length,
        totalEdges: edges.length,
        averageConnections: nodes.reduce((sum, n) => sum + n.connectionCount, 0) / nodes.length,
        networkDensity: edges.length / ((nodes.length * (nodes.length - 1)) / 2),
      },
    };
  }, [cards, relationships, config.edgeFilter, activeFilters, nodePositions, containerDimensions]);

  // UIの設定をSmartClusteringServiceの形式に変換
  const convertToClusteringConfig = useCallback((uiConfig: typeof advancedConfig): ClusteringConfig => {
    // アルゴリズムマッピング
    let algorithm: ClusteringConfig['algorithm'];
    if (uiConfig.algorithm === 'kmeans') {
      algorithm = 'community'; // k-meansをcommunityにマップ
    } else {
      algorithm = uiConfig.algorithm as ClusteringConfig['algorithm'];
    }

    return {
      algorithm,
      minClusterSize: uiConfig.clustering.minClusterSize,
      maxClusterSize: uiConfig.clustering.maxClusterSize,
      similarityThreshold: uiConfig.clustering.similarityThreshold,
      useSemanticAnalysis: uiConfig.labeling.useSemanticLabeling,
      useTagSimilarity: uiConfig.weights.tagSimilarity > 0,
      useContentSimilarity: true,
      weightStrength: uiConfig.weights.edgeStrength,
      weightSemantic: uiConfig.weights.semanticSimilarity,
      weightTag: uiConfig.weights.tagSimilarity,
      
      // HDBSCAN固有設定
      debug: true // 詳細ログ有効
    };
  }, []);

  // 高度解析の実行
  const performAdvancedClustering = useCallback(async () => {
    if (isAdvancedAnalyzing) return;
    
    setIsAdvancedAnalyzing(true);
    try {
      console.log('🔬 Starting Advanced Clustering Analysis...');
      
      // UIの設定をSmartClusteringServiceの形式に変換
      const clusteringConfig = convertToClusteringConfig(advancedConfig);
      
      // SmartClusteringServiceを実行
      const result = await SmartClusteringService.performSmartClustering(
        networkData.nodes,
        networkData.edges,
        cards,
        clusteringConfig
      );
      
      setSmartClusteringResult(result);
      
      // 結果をネットワーク表示に反映
      const clusterNodeIds = result.clusters.map(cluster => cluster.nodes);
      console.log(`🎯 [NetworkVisualization] クラスター表示設定:`, {
        clustersFromResult: result.clusters.length,
        clusterNodeIds: clusterNodeIds.length,
        clusterSizes: clusterNodeIds.map(c => c.length),
        firstCluster: clusterNodeIds[0]?.slice(0, 3) // 最初の3ノードIDを表示
      });
      setFilteredClusters(clusterNodeIds);
      setShowFilteredClusters(true);
      
      // ラベルを設定
      const smartLabels: ClusterLabel[] = result.clusters.map((cluster, index) => ({
        id: `smart-cluster-${index}`,
        text: cluster.suggestedLabel,
        cardIds: cluster.nodes,
        position: {
          x: cluster.centroid.x,
          y: cluster.centroid.y - 40
        },
        theme: cluster.semanticTheme || 'default',
        confidence: cluster.confidence,
        metadata: {
          dominantTags: cluster.dominantTags,
          dominantTypes: cluster.dominantTypes,
          cardCount: cluster.nodes.length
        }
      }));
      
      setClusterLabels(smartLabels);
      setShowLabels(true);
      
      // 品質スコアの安全な取得
      const qualityScore = result.quality?.silhouetteScore ?? 
                          (result.quality as any)?.stabilityScore ?? 
                          (result.quality as any)?.overallScore ?? 
                          0;
      const algorithmName = result.algorithm.toUpperCase();
      
      console.log(`✅ Advanced Clustering Complete: ${result.clusters.length} clusters, quality score: ${qualityScore.toFixed(2)}`);
      
      // アルゴリズム別のメッセージ
      const qualityLabel = result.algorithm === 'hdbscan' ? '安定性スコア' : '品質スコア';
      
      showCustomDialog(
        '🔬 高度解析完了',
        `${result.clusters.length}個のクラスターを検出しました。\n${qualityLabel}: ${qualityScore.toFixed(2)}\nアルゴリズム: ${algorithmName}${result.algorithm === 'hdbscan' ? ' 🚀' : ''}`,
        () => hideCustomDialog()
      );
      
    } catch (error) {
      console.error('Advanced clustering failed:', error);
      
      // エラーメッセージの詳細化
      let errorMessage = 'Unknown error';
      if (error instanceof Error) {
        errorMessage = error.message;
        if (errorMessage.includes('silhouetteScore')) {
          errorMessage = 'クラスター品質評価でエラーが発生しました。データ量やパラメータを調整してください。';
        } else if (errorMessage.includes('Cannot read properties of undefined')) {
          errorMessage = 'データの形式に問題があります。ページを再読み込みして再試行してください。';
        }
      }
      
      showCustomDialog(
        'エラー',
        `高度解析に失敗しました: ${errorMessage}`,
        () => hideCustomDialog()
      );
    } finally {
      setIsAdvancedAnalyzing(false);
    }
  }, [advancedConfig, convertToClusteringConfig, networkData, cards, showCustomDialog, hideCustomDialog, isAdvancedAnalyzing]);

  // ノード選択ハンドラー
  const handleNodeClick = useCallback((nodeId: string) => {
    setSelectedNode(nodeId);
    onNodeSelect?.(nodeId);
    
    // 関連ノードをハイライト
    const relatedNodeIds = new Set<string>();
    networkData.edges.forEach(edge => {
      if (edge.source === nodeId) relatedNodeIds.add(edge.target);
      if (edge.target === nodeId) relatedNodeIds.add(edge.source);
    });
    setHighlightedNodes(relatedNodeIds);
  }, [networkData.edges, onNodeSelect]);

  // 関連カードクリック時のノード移動ハンドラー
  const handleConnectionClick = useCallback((targetNodeId: string) => {
    // 選択ノードを更新
    setSelectedNode(targetNodeId);
    onNodeSelect?.(targetNodeId);
    
    // ターゲットノードの位置を取得
    const targetNode = networkData.nodes.find(n => n.id === targetNodeId);
    if (targetNode && nodePositions[targetNodeId]) {
      const nodePos = nodePositions[targetNodeId];
      
      // ノードが画面中央に来るようにパン調整
      const centerX = (window.innerWidth / 2) - (nodePos.x * transform.scale);
      const centerY = (window.innerHeight / 2) - (nodePos.y * transform.scale);
      
      setTransform(prev => ({
        ...prev,
        x: centerX,
        y: centerY
      }));
    }
    
    // 新しいノードの関連ノードをハイライト
    const relatedNodeIds = new Set<string>();
    networkData.edges.forEach(edge => {
      if (edge.source === targetNodeId) relatedNodeIds.add(edge.target);
      if (edge.target === targetNodeId) relatedNodeIds.add(edge.source);
    });
    setHighlightedNodes(relatedNodeIds);
  }, [networkData.nodes, networkData.edges, nodePositions, transform.scale, onNodeSelect]);

  // 関連性削除ハンドラー
  const handleDeleteRelationship = useCallback(async (relationshipId: string) => {
    try {
      console.log('[NetworkVisualization] 関連性削除開始:', relationshipId);
      
      // supabaseから関連性を削除
      const { error } = await supabase
        .from('board_card_relations')
        .delete()
        .eq('id', relationshipId);
      
      if (error) {
        console.error('[NetworkVisualization] 関連性削除エラー:', error);
        alert('関連性の削除に失敗しました: ' + error.message);
        return;
      }
      
      console.log('[NetworkVisualization] 関連性削除成功:', relationshipId);
      
      // ローカル状態を更新（リアルタイム更新を待たずに即座に反映）
      // この後、Supabase Realtimeによって自動的に最新データが反映される
      
    } catch (err) {
      console.error('[NetworkVisualization] 関連性削除例外:', err);
      alert('関連性の削除中に予期しないエラーが発生しました');
    }
  }, []);

  // 右クリックハンドラー
  const handleConnectionRightClick = useCallback((e: React.MouseEvent, relationshipId: string, targetNodeId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      relationshipId,
      targetNodeId
    });
  }, []);

  // コンテキストメニューのクリックアウト処理
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      setContextMenu(null);
    };
    
    if (contextMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [contextMenu]);

  // ノード数に応じた動的領域サイズ調整
  useEffect(() => {
    const nodeCount = cards.length;
    if (nodeCount > 0) {
      const optimalSize = calculateOptimalArea(nodeCount);
      
      // 現在のサイズと大幅に異なる場合のみ更新（頻繁な再描画を防ぐ）
      const currentArea = containerDimensions.width * containerDimensions.height;
      const newArea = optimalSize.width * optimalSize.height;
      const changeRatio = Math.abs(newArea - currentArea) / currentArea;
      
      if (changeRatio > 0.2) { // 20%以上の変化があった場合のみ更新
        console.log('[NetworkVisualization] 描画領域を動的調整:', {
          nodeCount,
          from: containerDimensions,
          to: optimalSize,
          changeRatio: (changeRatio * 100).toFixed(1) + '%'
        });
        
        setContainerDimensions(optimalSize);
        
        // 領域変更時は配置も再計算
        if (nodeCount > 1) {
          const newOrganicPositions = generateOrganicLayout();
          setNodePositions(newOrganicPositions);
        }
        
        // 最適なズームレベルに自動調整
        const optimalZoom = calculateOptimalZoom(nodeCount);
        setTransform(prev => ({
          x: 0, // 中央に配置
          y: 0,
          scale: optimalZoom
        }));
      }
    }
  }, [cards.length, calculateOptimalArea, containerDimensions, calculateOptimalZoom]);

  // 画面サイズ変更の監視
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // パン機能
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === containerRef.current || e.target === svgRef.current) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setTransform(prev => ({
        ...prev,
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      }));
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // ズーム機能
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setTransform(prev => ({
      ...prev,
      scale: Math.max(0.2, Math.min(3, prev.scale * delta)),
    }));
  };



  // 従来のクラスター検出（重み閾値フィルタリング対応）
  const detectClusters = useCallback((strengthThreshold: number = 0.3, useWeightFiltering: boolean = true) => {
    const adjacencyList: { [key: string]: string[] } = {};
    networkData.nodes.forEach(node => {
      adjacencyList[node.id] = [];
    });

    // 重み閾値フィルタリング機能
    const filteredEdges = useWeightFiltering 
      ? networkData.edges.filter(edge => edge.strength >= strengthThreshold)
      : networkData.edges;

    // デバッグ情報をコンソールに出力
    if (useWeightFiltering) {
      console.log(`🔍 Clustering Debug:`, {
        totalEdges: networkData.edges.length,
        filteredEdges: filteredEdges.length,
        strengthThreshold,
        removedEdges: networkData.edges.length - filteredEdges.length
      });
    }

    // フィルタリング後のエッジで隣接リストを構築
    filteredEdges.forEach(edge => {
      adjacencyList[edge.source].push(edge.target);
      adjacencyList[edge.target].push(edge.source);
    });

    const visited = new Set<string>();
    const clusters: string[][] = [];

    const dfs = (nodeId: string, cluster: string[]) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);
      cluster.push(nodeId);

      adjacencyList[nodeId].forEach(neighborId => {
        if (!visited.has(neighborId)) {
          dfs(neighborId, cluster);
        }
      });
    };

    networkData.nodes.forEach(node => {
      if (!visited.has(node.id)) {
        const cluster: string[] = [];
        dfs(node.id, cluster);
        if (cluster.length > 1) {
          clusters.push(cluster);
        }
      }
    });

    // クラスター結果をログ出力
    console.log(`🎯 Detected Clusters:`, {
      totalClusters: clusters.length,
      clusterSizes: clusters.map(c => c.length),
      largestCluster: Math.max(...clusters.map(c => c.length), 0),
      totalClustered: clusters.reduce((sum, c) => sum + c.length, 0),
      isolatedNodes: networkData.nodes.length - clusters.reduce((sum, c) => sum + c.length, 0)
    });

    return clusters;
  }, [networkData]);

  // クラスターラベル位置を更新する関数
  const updateClusterLabelPositions = useCallback((newNodePositions: { [key: string]: { x: number, y: number } }) => {
    const updatedLabels = clusterLabels.map(label => {
      // ラベルに関連するノード（カード）を取得
      const clusterCards = label.cardIds.map(id => networkData.nodes.find(n => n.id === id)).filter(Boolean);
      if (clusterCards.length === 0) return label;

      // 新しいノード位置を使用してラベル位置を再計算
      const centerX = clusterCards.reduce((sum, node) => {
        const pos = newNodePositions[node!.id] || { x: node!.x, y: node!.y };
        return sum + pos.x;
      }, 0) / clusterCards.length;
      
      const centerY = clusterCards.reduce((sum, node) => {
        const pos = newNodePositions[node!.id] || { x: node!.x, y: node!.y };
        return sum + pos.y;
      }, 0) / clusterCards.length;
      
      // クラスター内のノードの最上部にラベルを配置
      const minY = Math.min(...clusterCards.map(node => {
        const pos = newNodePositions[node!.id] || { x: node!.x, y: node!.y };
        return pos.y;
      }));

      return {
        ...label,
        position: {
          x: centerX,
          y: minY - 40 // ノードの上部に少し余裕を持って配置
        }
      };
    });

    setClusterLabels(updatedLabels);
    // console.log('🏷️ Cluster label positions updated after layout change');
  }, [clusterLabels, networkData.nodes]);

  // nodePositionsが変更された際にラベル位置を自動更新
  useEffect(() => {
    if (showLabels && clusterLabels.length > 0 && Object.keys(nodePositions).length > 0) {
      updateClusterLabelPositions(nodePositions);
    }
  }, [nodePositions, showLabels, clusterLabels, updateClusterLabelPositions]);

  // 🌊 改良された有機的配置（クラスターがない場合のフォールバック）
  const generateImprovedOrganicLayout = useCallback((containerWidth: number, containerHeight: number) => {
    console.log('🌊 [Layout] 改良された有機的配置実行');
    
    const newPositions: { [key: string]: { x: number, y: number } } = {};
    const processedPositions: Array<{ x: number, y: number, size: number }> = [];
    const centerX = containerWidth / 2;
    const centerY = containerHeight / 2;
    
    // ノードを重要度順にソート
    const sortedNodes = [...networkData.nodes].sort((a, b) => {
      const aScore = (a.connectionCount * 2) + (a.metadata?.importanceScore || 0);
      const bScore = (b.connectionCount * 2) + (b.metadata?.importanceScore || 0);
      return bScore - aScore;
    });
    
    // 各ノードを配置
    sortedNodes.forEach((node, index) => {
      const currentNodeSize = getNodeSize(node.size);
      const minDistance = currentNodeSize * 4.0; // 自然な間隔
      
      let attempts = 0;
      const maxAttempts = 50; // 十分な試行回数
      let validPosition = false;
      let finalX = centerX;
      let finalY = centerY;
      
      if (index === 0) {
        // 最も重要なノード: 中心付近（完全中心は避ける）
        const offset = 50 + Math.random() * 50;
        const angle = Math.random() * 2 * Math.PI;
        finalX = centerX + offset * Math.cos(angle);
        finalY = centerY + offset * Math.sin(angle);
        validPosition = true;
      } else {
        while (!validPosition && attempts < maxAttempts) {
          // 配置エリアを段階的に拡張
          const placementAttempt = Math.floor(attempts / 10);
          const areaMultiplier = 1 + (placementAttempt * 0.3);
          
          // 中心からの距離をランダムに設定
          const maxDistance = Math.min(containerWidth, containerHeight) * 0.35 * areaMultiplier;
          const minDistanceFromCenter = 60;
          
          // 距離の分布を調整
          const distanceRandom = Math.random();
          const adjustedDistance = Math.pow(distanceRandom, 0.7);
          const distance = minDistanceFromCenter + adjustedDistance * (maxDistance - minDistanceFromCenter);
          
          // 角度は完全にランダム
          const angle = Math.random() * 2 * Math.PI;
          
          // 基本位置を計算
          finalX = centerX + distance * Math.cos(angle);
          finalY = centerY + distance * Math.sin(angle);
          
          // 追加のランダムな変動
          const jitterAmount = 40 + (placementAttempt * 20);
          finalX += (Math.random() - 0.5) * jitterAmount;
          finalY += (Math.random() - 0.5) * jitterAmount;
          
          // 重要度の高いノードは中心寄りに
          const importanceScore = (node.connectionCount * 2) + (node.metadata?.importanceScore || 0);
          if (importanceScore > 5) {
            const pullToCenter = 0.2;
            finalX = finalX * (1 - pullToCenter) + centerX * pullToCenter;
            finalY = finalY * (1 - pullToCenter) + centerY * pullToCenter;
          }
          
          // 境界チェック
          const margin = currentNodeSize / 2 + 20;
          if (finalX < margin || finalX > containerWidth - margin ||
              finalY < margin || finalY > containerHeight - margin) {
            attempts++;
            continue;
          }
          
          // 衝突検出
          validPosition = processedPositions.every(existing => {
            const distance = Math.sqrt(
              Math.pow(finalX - existing.x, 2) + Math.pow(finalY - existing.y, 2)
            );
            const requiredDistance = Math.max(
              (currentNodeSize + existing.size) / 2 + 15,
              minDistance
            );
            return distance >= requiredDistance;
          });
          
          attempts++;
          
          if (!validPosition && attempts < maxAttempts) {
            const offsetAngle = Math.random() * 2 * Math.PI;
            const offsetDistance = minDistance + Math.random() * 30;
            finalX += Math.cos(offsetAngle) * offsetDistance;
            finalY += Math.sin(offsetAngle) * offsetDistance;
          }
        }
      }
      
      newPositions[node.id] = { x: finalX, y: finalY };
      processedPositions.push({ x: finalX, y: finalY, size: currentNodeSize });
    });
    
    return newPositions;
  }, [networkData.nodes]);

  // 🌟 強化されたAuto Layoutアルゴリズム（前宣言）
  const applyForceLayout = useCallback(() => {
    console.log('📐 [Enhanced Auto Layout] 開始');
    
    // クラスター分析
    const clusters = detectClusters(strengthThreshold, useWeightFiltering);
    console.log(`🔍 [Enhanced Auto Layout] 検出されたクラスター数: ${clusters.length}`);
    
    // 分岐ロジック: クラスター状況に応じたアルゴリズム選択
    if (clusters.length <= 1) {
      // パターンA: 初期表示と同じ「いい感じ」のアルゴリズム
      console.log('🌊 [Enhanced Auto Layout] 単一/無クラスター → 初期表示アルゴリズム適用');
      // 固定領域サイズを使用して初期表示と同じ広がりを確保
      const positions = generateImprovedOrganicLayout(
        RelationsParameterManager.LAYOUT_AREA.width, 
        RelationsParameterManager.LAYOUT_AREA.height
      );
      setNodePositions(positions);
      console.log(`✅ [Enhanced Auto Layout] 完了: ${Object.keys(positions).length}ノード (固定領域: ${RelationsParameterManager.LAYOUT_AREA.width}x${RelationsParameterManager.LAYOUT_AREA.height})`);
      return;
    } else {
      // パターンB: 強化されたクラスターベースレイアウト
      console.log('🎯 [Enhanced Auto Layout] 複数クラスター → 強化クラスターレイアウト適用');
      
      // generateEnhancedClusterLayout をインライン実装
      console.log('🎯 [Enhanced Cluster Layout] 開始');
      
      // 1. 各クラスターの領域サイズを動的計算
      const clusterAreas = clusters.map(cluster => {
        const clusterNodes = cluster.map(id => networkData.nodes.find(n => n.id === id)).filter(Boolean);
        // calculateClusterArea をインライン実装
        const totalNodeArea = clusterNodes.reduce((sum, node) => {
          const nodeSize = getNodeSize(node!.size);
          return sum + Math.PI * Math.pow(nodeSize / 2, 2);
        }, 0);
        const minDistance = 26 * 4.0;
        const spacingArea = clusterNodes.length * Math.PI * Math.pow(minDistance / 2, 2);
        const comfortableFactor = 1.5;
        const requiredArea = (totalNodeArea + spacingArea) * comfortableFactor;
        const radius = Math.sqrt(requiredArea / Math.PI);
        console.log(`📊 [Cluster Area] ノード${clusterNodes.length}個 → 半径${radius.toFixed(1)}px`);
        return radius;
      });
      
      // 2. クラスター中心の最適配置（optimizeClusterPositions をインライン実装）
      const containerWidth = containerDimensions.width;
      const containerHeight = containerDimensions.height;
      const centerX = containerWidth / 2;
      const centerY = containerHeight / 2;
      
      const positions = clusters.map((cluster, index) => {
        const angle = (index / clusters.length) * 2 * Math.PI;
        const baseDistance = Math.max(...clusterAreas) * 2.5;
        return {
          x: centerX + baseDistance * Math.cos(angle),
          y: centerY + baseDistance * Math.sin(angle),
          radius: clusterAreas[index]
        };
      });
      
      // 反発力シミュレーション
      const iterations = 20;
      for (let iter = 0; iter < iterations; iter++) {
        const forces = positions.map(() => ({ x: 0, y: 0 }));
        
        for (let i = 0; i < positions.length; i++) {
          for (let j = i + 1; j < positions.length; j++) {
            const pos1 = positions[i];
            const pos2 = positions[j];
            
            const dx = pos1.x - pos2.x;
            const dy = pos2.y - pos2.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const minDistance = (pos1.radius + pos2.radius) * 1.3;
            
            if (distance < minDistance && distance > 0) {
              const force = (minDistance - distance) / minDistance;
              const forceX = (dx / distance) * force * 20;
              const forceY = (dy / distance) * force * 20;
              
              forces[i].x += forceX;
              forces[i].y += forceY;
              forces[j].x -= forceX;
              forces[j].y -= forceY;
            }
          }
        }
        
        positions.forEach((pos, index) => {
          pos.x += forces[index].x * 0.1;
          pos.y += forces[index].y * 0.1;
          
          const margin = pos.radius + 50;
          pos.x = Math.max(margin, Math.min(containerWidth - margin, pos.x));
          pos.y = Math.max(margin, Math.min(containerHeight - margin, pos.y));
        });
      }
      
      // 3. 各クラスター内で「いい感じ」のアルゴリズムを適用
      const allPositions: { [key: string]: { x: number, y: number } } = {};
      
      clusters.forEach((cluster, index) => {
        const clusterNodes = cluster.map(id => networkData.nodes.find(n => n.id === id)).filter(Boolean);
        const center = positions[index];
        
        console.log(`🌊 [Enhanced Cluster Layout] クラスター${index + 1}: ${clusterNodes.length}ノード`);
        
        // generateImprovedOrganicLayoutScaled をインライン実装
        const newPositions: { [key: string]: { x: number, y: number } } = {};
        const processedPositions: Array<{ x: number, y: number, size: number }> = [];
        
        clusterNodes.forEach((node, nodeIndex) => {
          const currentNodeSize = getNodeSize(node!.size);
          const minDistance = currentNodeSize * 4.0;
          
          let attempts = 0;
          const maxAttempts = 50;
          let validPosition = false;
          let finalX = center.x;
          let finalY = center.y;
          
          while (!validPosition && attempts < maxAttempts) {
            const placementAttempt = Math.floor(attempts / 10);
            const areaMultiplier = 1 + (placementAttempt * 0.3);
            
            const maxDistance = center.radius * 0.9 * areaMultiplier;
            const minDistanceFromCenter = 15;
            
            const distanceRandom = Math.random();
            const adjustedDistance = Math.pow(distanceRandom, 0.7);
            const distance = minDistanceFromCenter + adjustedDistance * (maxDistance - minDistanceFromCenter);
            
            const angle = Math.random() * 2 * Math.PI;
            
            finalX = center.x + distance * Math.cos(angle);
            finalY = center.y + distance * Math.sin(angle);
            
            const jitterAmount = 30 + (placementAttempt * 15);
            finalX += (Math.random() - 0.5) * jitterAmount;
            finalY += (Math.random() - 0.5) * jitterAmount;
            
            const importanceScore = node!.metadata?.importanceScore || 0;
            if (importanceScore > 5) {
              const pullToCenter = 0.3;
              finalX = finalX * (1 - pullToCenter) + center.x * pullToCenter;
              finalY = finalY * (1 - pullToCenter) + center.y * pullToCenter;
            }
            
            const distanceFromCenter = Math.sqrt((finalX - center.x) ** 2 + (finalY - center.y) ** 2);
            if (distanceFromCenter > center.radius - currentNodeSize / 2 - 10) {
              attempts++;
              continue;
            }
            
            validPosition = processedPositions.every(existing => {
              const distance = Math.sqrt(
                Math.pow(finalX - existing.x, 2) + Math.pow(finalY - existing.y, 2)
              );
              const requiredDistance = Math.max(
                (currentNodeSize + existing.size) / 2 + 15,
                minDistance
              );
              return distance >= requiredDistance;
            });
            
            attempts++;
            
            if (!validPosition && attempts < maxAttempts) {
              const offsetAngle = Math.random() * 2 * Math.PI;
              const offsetDistance = minDistance + Math.random() * 30;
              finalX += Math.cos(offsetAngle) * offsetDistance;
              finalY += Math.sin(offsetAngle) * offsetDistance;
            }
          }
          
          if (!validPosition) {
            const fallbackAngle = Math.random() * 2 * Math.PI;
            const fallbackDistance = center.radius * 0.7;
            finalX = center.x + fallbackDistance * Math.cos(fallbackAngle);
            finalY = center.y + fallbackDistance * Math.sin(fallbackAngle);
          }
          
          newPositions[node!.id] = { x: finalX, y: finalY };
          processedPositions.push({ x: finalX, y: finalY, size: currentNodeSize });
        });
        
        Object.assign(allPositions, newPositions);
      });
      
      setNodePositions(allPositions);
      console.log(`✅ [Enhanced Auto Layout] 完了: ${Object.keys(allPositions).length}ノード`);
      return;
    }
  }, [networkData.nodes, detectClusters, strengthThreshold, useWeightFiltering, generateImprovedOrganicLayout]);

  // 🎉 強化されたAuto Layout実装完了（インライン統合）

  // フィルタ機能
  const toggleTagFilter = (tag: string) => {
    setActiveFilters(prev => ({
      ...prev,
      tags: prev.tags.includes(tag) 
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }));
  };

  const toggleTypeFilter = (type: string) => {
    setActiveFilters(prev => ({
      ...prev,
      types: prev.types.includes(type) 
        ? prev.types.filter(t => t !== type)
        : [...prev.types, type]
    }));
  };

  const toggleRelationshipFilter = (relationshipType: string) => {
    setActiveFilters(prev => ({
      ...prev,
      relationships: prev.relationships.includes(relationshipType) 
        ? prev.relationships.filter(t => t !== relationshipType)
        : [...prev.relationships, relationshipType]
    }));
  };

  // クラスター操作ハンドラー
  const handleClusterZoom = useCallback((clusterId: string) => {
    const clusterLabel = clusterLabels.find(label => label.id === clusterId);
    if (!clusterLabel) return;

    // クラスター内のカードを取得
    const clusterCards = clusterLabel.cardIds.map(id => 
      networkData.nodes.find(n => n.id === id)
    ).filter(Boolean);

    if (clusterCards.length === 0) return;

    // クラスターの中心座標を計算
    const centerX = clusterCards.reduce((sum, card) => 
      sum + (nodePositions[card!.id]?.x || card!.x), 0) / clusterCards.length;
    const centerY = clusterCards.reduce((sum, card) => 
      sum + (nodePositions[card!.id]?.y || card!.y), 0) / clusterCards.length;

    // ズーム&パン
    const newScale = Math.min(1.0, transform.scale * 2); // 現在の2倍、最大1.0倍
    const viewportCenterX = window.innerWidth / 2;
    const viewportCenterY = window.innerHeight / 2;
    
    setTransform({
      x: viewportCenterX - centerX * newScale,
      y: viewportCenterY - centerY * newScale,
      scale: newScale,
    });

    console.log('[NetworkVisualization] クラスターにズーム:', { 
      clusterId, 
      centerX, 
      centerY, 
      scale: newScale 
    });
  }, [clusterLabels, networkData.nodes, nodePositions, transform.scale]);

  const handleClusterDelete = useCallback((clusterId: string) => {
    // クラスターラベルを削除
    setClusterLabels(prev => prev.filter(label => label.id !== clusterId));
    
    console.log('[NetworkVisualization] クラスター削除:', clusterId);
  }, []);

  // ビュー保存・管理の関数
  const getCurrentViewState = useCallback((): Omit<SavedView, 'id' | 'name' | 'description' | 'createdAt' | 'nestId'> => {
    return {
      clusteringConfig: {
        algorithm: advancedConfig.algorithm,
        strengthThreshold,
        useWeightFiltering,
        showFilteredClusters,
      },
      customLabels: clusterLabels.reduce((acc, label) => {
        acc[label.id] = label.text;
        return acc;
      }, {} as Record<string, string>),
      nodePositions,
      filterState: activeFilters,
      transform,
      activeFilterTab,
    };
  }, [advancedConfig.algorithm, strengthThreshold, useWeightFiltering, showFilteredClusters, clusterLabels, nodePositions, activeFilters, transform, activeFilterTab]);

  const saveCurrentView = useCallback(async (viewName: string, description?: string) => {
    const nestId = boardState.currentNestId;
    if (!nestId) {
      console.error('[NetworkVisualization] No nest ID available for saving view');
      return;
    }

    const newView: SavedView = {
      id: `view_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: viewName,
      description,
      createdAt: new Date(),
      nestId,
      ...getCurrentViewState(),
    };

    try {
      // ローカルストレージに保存（将来的にはSupabaseに移行）
      const existingSavedViews = JSON.parse(localStorage.getItem(`savedViews_${nestId}`) || '[]');
      const updatedViews = [...existingSavedViews, newView];
      localStorage.setItem(`savedViews_${nestId}`, JSON.stringify(updatedViews));
      
      setSavedViews(updatedViews);
      setCurrentViewName(viewName);
      setIsCreatingView(false);
      setNewViewName('');
      
      console.log('[NetworkVisualization] ビュー保存完了:', viewName);
      
      // 成功メッセージ（今後、showCustomDialogに置き換え可能）
      alert(`ビュー「${viewName}」を保存しました`);
    } catch (error) {
      console.error('[NetworkVisualization] ビュー保存エラー:', error);
      alert('ビューの保存に失敗しました');
    }
  }, [boardState.currentNestId, getCurrentViewState]);

  const loadView = useCallback((view: SavedView) => {
    try {
      // UI状態の復元
      setTransform(view.transform);
      setActiveFilters(view.filterState);
      setActiveFilterTab(view.activeFilterTab);
      
      // クラスタリング設定の復元
      setStrengthThreshold(view.clusteringConfig.strengthThreshold);
      setUseWeightFiltering(view.clusteringConfig.useWeightFiltering);
      setShowFilteredClusters(view.clusteringConfig.showFilteredClusters);
      
      // ノード位置の復元
      setNodePositions(view.nodePositions);
      
      // カスタムラベルの復元
      setClusterLabels(prev => prev.map(label => ({
        ...label,
        text: view.customLabels[label.id] || label.text
      })));
      
      setCurrentViewName(view.name);
      setShowViewManager(false);
      
      console.log('[NetworkVisualization] ビュー復元完了:', view.name);
      
      // 成功メッセージ
      alert(`ビュー「${view.name}」を復元しました`);
    } catch (error) {
      console.error('[NetworkVisualization] ビュー復元エラー:', error);
      alert('ビューの復元に失敗しました');
    }
  }, []);

  const deleteView = useCallback(async (viewId: string) => {
    const nestId = boardState.currentNestId;
    if (!nestId) return;

    try {
      const existingSavedViews = JSON.parse(localStorage.getItem(`savedViews_${nestId}`) || '[]');
      const updatedViews = existingSavedViews.filter((view: SavedView) => view.id !== viewId);
      localStorage.setItem(`savedViews_${nestId}`, JSON.stringify(updatedViews));
      
      setSavedViews(updatedViews);
      
      console.log('[NetworkVisualization] ビュー削除完了:', viewId);
      alert('ビューを削除しました');
    } catch (error) {
      console.error('[NetworkVisualization] ビュー削除エラー:', error);
      alert('ビューの削除に失敗しました');
    }
  }, [boardState.currentNestId]);

  // AI支援ラベル生成の関数
  const handleAILabelGeneration = useCallback((clusterId: string) => {
    console.log('🤖 [DEBUG] AI提案ボタンがクリックされました:', clusterId);
    
    // クラスターに含まれるカードを取得
    const cluster = clusterLabels.find(label => label.id === clusterId);
    console.log('🤖 [DEBUG] 見つかったクラスター:', cluster);
    
    if (!cluster) {
      console.error('🤖 [DEBUG] クラスターが見つかりません:', clusterId);
      return;
    }

    const clusterCards = cluster.cardIds
      .map(cardId => cards.find(card => card.id === cardId))
      .filter(Boolean) as BoardItem[];

    console.log('🤖 [DEBUG] クラスターのカード:', clusterCards.length, clusterCards);

    if (clusterCards.length === 0) {
      console.error('🤖 [DEBUG] クラスターにカードがありません');
      return;
    }

    console.log('🤖 [DEBUG] AIラベルモーダルを表示します');
    
    const targetCluster = {
      id: clusterId,
      cards: clusterCards,
      currentLabel: cluster.text
    };
    
    console.log('🤖 [DEBUG] setAILabelTargetCluster:', targetCluster);
    setAILabelTargetCluster(targetCluster);
    
    console.log('🤖 [DEBUG] setShowAILabelModal(true)');
    setShowAILabelModal(true);
  }, [clusterLabels, cards]);

  const handleAILabelSelect = useCallback((newLabel: string) => {
    if (!aiLabelTargetCluster) return;

    // クラスターラベルを更新
    setClusterLabels(prev => prev.map(label => 
      label.id === aiLabelTargetCluster.id 
        ? { ...label, text: newLabel }
        : label
    ));

    console.log('[NetworkVisualization] AIラベル適用:', {
      clusterId: aiLabelTargetCluster.id,
      oldLabel: aiLabelTargetCluster.currentLabel,
      newLabel
    });

    // モーダルを閉じる
    setShowAILabelModal(false);
    setAILabelTargetCluster(null);
  }, [aiLabelTargetCluster]);

  const handleAILabelModalClose = useCallback(() => {
    setShowAILabelModal(false);
    setAILabelTargetCluster(null);
  }, []);

  // Card editing handlers
  const handleEditCard = useCallback((cardId: string) => {
    const card = cards.find(c => c.id === cardId);
    if (card) {
      console.log('[NetworkVisualization] handleEditCard - Original card:', card);
      console.log('[NetworkVisualization] related_cards:', card.related_cards);
      console.log('[NetworkVisualization] related_card_ids:', card.related_card_ids);
      
      // related_card_idsがなければrelated_cardsから補完
      let cardForEdit = card;
      if ((!card.related_card_ids || card.related_card_ids.length === 0) && card.related_cards && card.related_cards.length > 0) {
        cardForEdit = {
          ...card,
          related_card_ids: card.related_cards.map(c => c.id),
        };
        console.log('[NetworkVisualization] Complemented related_card_ids:', cardForEdit.related_card_ids);
      }
      
      console.log('[NetworkVisualization] Final cardForEdit:', cardForEdit);
      setSelectedCard(cardForEdit);
      setSelectedColumn(card.column_type);
      setIsCardModalVisible(true);
    }
  }, [cards]);

  const handleSaveCard = useCallback(async (cardData: Partial<BoardItem> & { sources?: any[]; related_card_ids?: string[] }) => {
    if (selectedCard) {
      // Update existing card
      let related_cards: BoardItem[] = [];
      if (cardData.related_card_ids && cardData.related_card_ids.length > 0) {
        related_cards = cards.filter(c => cardData.related_card_ids?.includes(c.id));
      }
      updateCard({
        ...selectedCard,
        ...cardData,
        related_cards,
      });
      
      // Refresh the data
      if (boardState.currentNestId) {
        await loadNestData(boardState.currentNestId);
      }
    }
    setIsCardModalVisible(false);
    setSelectedCard(null);
  }, [selectedCard, cards, updateCard, loadNestData, boardState.currentNestId]);

  // Info Panel外クリックで閉じる機能
  const handleContainerClick = useCallback((e: React.MouseEvent) => {
    // ドラッグ中または右クリックの場合は何もしない
    if (isDragging || e.button !== 0) {
      return;
    }
    
    // Info Panelが表示されている場合のみ
    if (selectedNode) {
      // クリックされた要素がInfo Panel内でなければパネルを閉じる
      const target = e.target as HTMLElement;
      const isInfoPanel = target.closest('[data-info-panel="true"]');
      
      if (!isInfoPanel) {
        setSelectedNode(null);
        setHighlightedNodes(new Set());
      }
    }
  }, [selectedNode, isDragging]);

  const handleInfoPanelClick = useCallback((e: React.MouseEvent) => {
    // Info Panel内のクリックでは伝播を停止（パネルが閉じないように）
    e.stopPropagation();
    
    // Only open card edit if clicking on the panel content, not on connection items
    if (selectedNode && !e.defaultPrevented) {
      handleEditCard(selectedNode);
    }
  }, [selectedNode, handleEditCard]);

  // キーボードショートカット
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch(e.key.toLowerCase()) {
        case 'r':
          resetView();
          break;
        case 'c':
          // Clustering Controlsパネルを切り替え
          setShowClusteringControls(!showClusteringControls);
          break;
        case 'l':
          if (showLabels) {
            clearLabels();
          } else {
            generateLabels();
          }
          break;
        case 'a':
          if (!e.ctrlKey && !e.metaKey) {
            applyForceLayout();
          }
          break;
        case '=':
        case '+':
          zoomIn();
          break;
        case '-':
          zoomOut();
          break;
        case 'escape':
          setSelectedNode(null);
          setHighlightedNodes(new Set());
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [applyForceLayout]);

  // 🌟 改良されたクラスター重心ベースレイアウト生成関数
  const generateOrganicLayout = useCallback(() => {
    // 固定領域サイズを使用して初期表示と同じ広がりを確保
    const containerWidth = RelationsParameterManager.LAYOUT_AREA.width;
    const containerHeight = RelationsParameterManager.LAYOUT_AREA.height;
    const centerX = containerWidth / 2;
    const centerY = containerHeight / 2;
    
    console.log('🎨 [Layout] クラスター重心ベースレイアウト開始');
    console.log(`📐 [Layout] コンテナサイズ: ${containerWidth}x${containerHeight}`);
    
    const newPositions: { [key: string]: { x: number, y: number } } = {};
    
    // Step 1: クラスター情報を取得・分析
    const clusterAnalysis = analyzeClusterStructure();
    console.log('🔍 [Layout] クラスター分析結果:', clusterAnalysis);
    
    // Step 2: クラスターが存在する場合はクラスター重心ベース、そうでなければ改良された有機的配置
    if (clusterAnalysis.clusters.length > 1) {
      return generateClusterBasedLayout(clusterAnalysis, containerWidth, containerHeight);
    } else {
      return generateImprovedOrganicLayout(containerWidth, containerHeight);
    }
  }, [networkData.nodes]);

  // 🔍 クラスター構造分析関数
  const analyzeClusterStructure = useCallback(() => {
    const clusters = smartClusteringResult?.clusters || [];
    const nodeClusterMap = new Map<string, number>();
    
    // ノードをクラスターに割り当て
    clusters.forEach((cluster, clusterIndex) => {
      cluster.nodes.forEach(nodeId => {
        nodeClusterMap.set(nodeId, clusterIndex);
      });
    });
    
    // 未分類ノードを特別クラスターとして扱う
    const unclassifiedNodes = networkData.nodes
      .filter(node => !nodeClusterMap.has(node.id))
      .map(node => node.id);
    
    return {
      clusters: clusters.map((cluster, index) => ({
        id: index,
        nodes: cluster.nodes,
        size: cluster.nodes.length,
        label: cluster.suggestedLabel || `クラスター${index + 1}`
      })),
      unclassifiedNodes,
      totalNodes: networkData.nodes.length,
      clusterCount: clusters.length,
      nodeClusterMap
    };
  }, [smartClusteringResult, networkData.nodes]);

  // 🌟 クラスター重心ベースレイアウト生成
  const generateClusterBasedLayout = useCallback((clusterAnalysis: any, containerWidth: number, containerHeight: number) => {
    console.log('🎯 [Layout] クラスター重心ベースレイアウト実行');
    
    const newPositions: { [key: string]: { x: number, y: number } } = {};
    const centerX = containerWidth / 2;
    const centerY = containerHeight / 2;
    
    // Step 1: クラスター重心位置を決定（円形配置）
    const clusterCenters = calculateClusterCenters(clusterAnalysis, containerWidth, containerHeight);
    
    // Step 2: 各クラスター内でノードを配置
    clusterAnalysis.clusters.forEach((cluster: any, clusterIndex: number) => {
      const center = clusterCenters[clusterIndex];
      const clusterRadius = calculateClusterRadius(cluster.size);
      
      // クラスター内ノードを円形に配置
      cluster.nodes.forEach((nodeId: string, nodeIndex: number) => {
        const position = calculateNodePositionInCluster(nodeIndex, cluster.nodes.length, center, clusterRadius);
        newPositions[nodeId] = position;
      });
    });
    
    // Step 3: 未分類ノードを周辺に配置
    clusterAnalysis.unclassifiedNodes.forEach((nodeId: string, index: number) => {
      const position = calculateUnclassifiedNodePosition(index, clusterAnalysis.unclassifiedNodes.length, containerWidth, containerHeight);
      newPositions[nodeId] = position;
    });
    
    console.log(`✅ [Layout] クラスターベース配置完了: ${Object.keys(newPositions).length}ノード`);
    return newPositions;
  }, []);

  // 🎯 クラスター重心位置計算
  const calculateClusterCenters = useCallback((clusterAnalysis: any, containerWidth: number, containerHeight: number) => {
    const centers = [];
    const centerX = containerWidth / 2;
    const centerY = containerHeight / 2;
    const clusterCount = clusterAnalysis.clusters.length;
    
    // 有効な配置領域（境界から20%の余白）
    const margin = 0.2;
    const effectiveWidth = containerWidth * (1 - 2 * margin);
    const effectiveHeight = containerHeight * (1 - 2 * margin);
    const maxRadius = Math.min(effectiveWidth, effectiveHeight) / 2;
    
    for (let i = 0; i < clusterCount; i++) {
      if (clusterCount === 1) {
        // 1つのクラスターの場合は中心に配置
        centers.push({ x: centerX, y: centerY });
      } else if (clusterCount === 2) {
        // 2つのクラスターの場合は左右に配置
        const x = centerX + (i === 0 ? -maxRadius * 0.6 : maxRadius * 0.6);
        centers.push({ x, y: centerY });
      } else {
        // 3つ以上の場合は円形配置
        const angle = (2 * Math.PI * i) / clusterCount - Math.PI / 2; // 上から開始
        const radius = maxRadius * 0.7; // 余裕を持たせる
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);
        centers.push({ x, y });
      }
    }
    
    console.log('📍 [Layout] クラスター重心位置:', centers);
    return centers;
  }, []);

  // 📏 クラスター半径計算
  const calculateClusterRadius = useCallback((nodeCount: number) => {
    // ノード数に応じた適切な半径を計算
    const baseRadius = 60;
    const scaleFactor = Math.sqrt(nodeCount) * 0.8;
    return Math.max(baseRadius, baseRadius * scaleFactor);
  }, []);

  // 🎯 クラスター内ノード位置計算
  const calculateNodePositionInCluster = useCallback((
    nodeIndex: number, 
    totalNodes: number, 
    center: { x: number, y: number }, 
    clusterRadius: number
  ) => {
    if (totalNodes === 1) {
      return center;
    }
    
    // 円形配置 + 若干のランダム性
    const angle = (2 * Math.PI * nodeIndex) / totalNodes;
    const radiusVariation = 0.3 + Math.random() * 0.7; // 0.3-1.0の範囲
    const actualRadius = clusterRadius * radiusVariation;
    
    const x = center.x + actualRadius * Math.cos(angle);
    const y = center.y + actualRadius * Math.sin(angle);
    
    return { x, y };
  }, []);

  // 🎭 未分類ノード位置計算
  const calculateUnclassifiedNodePosition = useCallback((
    index: number, 
    totalUnclassified: number, 
    containerWidth: number, 
    containerHeight: number
  ) => {
    // 画面の四隅や端に配置
    const margin = 100;
    const side = index % 4;
    
    switch (side) {
      case 0: // 上端
        return {
          x: margin + (index / 4) * (containerWidth - 2 * margin) / Math.max(1, Math.ceil(totalUnclassified / 4)),
          y: margin
        };
      case 1: // 右端
        return {
          x: containerWidth - margin,
          y: margin + (index / 4) * (containerHeight - 2 * margin) / Math.max(1, Math.ceil(totalUnclassified / 4))
        };
      case 2: // 下端
        return {
          x: containerWidth - margin - (index / 4) * (containerWidth - 2 * margin) / Math.max(1, Math.ceil(totalUnclassified / 4)),
          y: containerHeight - margin
        };
      case 3: // 左端
        return {
          x: margin,
          y: containerHeight - margin - (index / 4) * (containerHeight - 2 * margin) / Math.max(1, Math.ceil(totalUnclassified / 4))
        };
      default:
        return { x: containerWidth / 2, y: containerHeight / 2 };
    }
  }, []);

  // ⭕ 円形レイアウト生成関数
  const generateCircularLayout = useCallback(() => {
    console.log('⭕ [Layout] 円形レイアウト開始');
    
    const containerWidth = containerDimensions.width;
    const containerHeight = containerDimensions.height;
    const centerX = containerWidth / 2;
    const centerY = containerHeight / 2;
    const newPositions: { [key: string]: { x: number, y: number } } = {};
    
    const nodeCount = networkData.nodes.length;
    if (nodeCount === 0) return newPositions;
    
    // クラスター情報を活用
    const clusterAnalysis = analyzeClusterStructure();
    
    if (clusterAnalysis.clusters.length > 1) {
      // 🌟 クラスター別同心円レイアウト
      console.log('🎯 [Layout] クラスター別同心円配置');
      
      const baseRadius = Math.min(containerWidth, containerHeight) * 0.15;
      
      clusterAnalysis.clusters.forEach((cluster: any, clusterIndex: number) => {
        const radius = baseRadius + (clusterIndex * baseRadius * 0.8);
        const angleStep = (2 * Math.PI) / cluster.nodes.length;
        
        cluster.nodes.forEach((nodeId: string, nodeIndex: number) => {
          const angle = angleStep * nodeIndex;
          const x = centerX + radius * Math.cos(angle);
          const y = centerY + radius * Math.sin(angle);
          
          newPositions[nodeId] = { x, y };
        });
      });
      
      // 未分類ノードは最外円に配置
      if (clusterAnalysis.unclassifiedNodes.length > 0) {
        const outerRadius = baseRadius + (clusterAnalysis.clusters.length * baseRadius * 0.8);
        const angleStep = (2 * Math.PI) / clusterAnalysis.unclassifiedNodes.length;
        
        clusterAnalysis.unclassifiedNodes.forEach((nodeId: string, index: number) => {
          const angle = angleStep * index;
          const x = centerX + outerRadius * Math.cos(angle);
          const y = centerY + outerRadius * Math.sin(angle);
          
          newPositions[nodeId] = { x, y };
        });
      }
    } else {
      // 🔄 シンプル円形配置
      console.log('🔄 [Layout] シンプル円形配置');
      
      const radius = Math.min(containerWidth, containerHeight) * 0.35;
      const angleStep = (2 * Math.PI) / nodeCount;
      
      networkData.nodes.forEach((node, index) => {
        const angle = angleStep * index - Math.PI / 2; // 上から開始
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);
        
        newPositions[node.id] = { x, y };
      });
    }
    
    console.log(`✅ [Layout] 円形レイアウト完了: ${Object.keys(newPositions).length}ノード`);
    return newPositions;
  }, [containerDimensions, networkData.nodes, analyzeClusterStructure]);

  // ⬜ グリッドレイアウト生成関数
  const generateGridLayout = useCallback(() => {
    console.log('⬜ [Layout] グリッドレイアウト開始');
    
    const containerWidth = containerDimensions.width;
    const containerHeight = containerDimensions.height;
    const newPositions: { [key: string]: { x: number, y: number } } = {};
    
    const nodeCount = networkData.nodes.length;
    if (nodeCount === 0) return newPositions;
    
    // クラスター情報を活用
    const clusterAnalysis = analyzeClusterStructure();
    
    if (clusterAnalysis.clusters.length > 1) {
      // 🎯 クラスター別グリッド配置
      console.log('🎯 [Layout] クラスター別グリッド配置');
      
      const clusterCount = clusterAnalysis.clusters.length;
      const gridCols = Math.ceil(Math.sqrt(clusterCount));
      const gridRows = Math.ceil(clusterCount / gridCols);
      
      const sectionWidth = containerWidth / gridCols;
      const sectionHeight = containerHeight / gridRows;
      
      clusterAnalysis.clusters.forEach((cluster: any, clusterIndex: number) => {
        const gridRow = Math.floor(clusterIndex / gridCols);
        const gridCol = clusterIndex % gridCols;
        
        const sectionCenterX = (gridCol + 0.5) * sectionWidth;
        const sectionCenterY = (gridRow + 0.5) * sectionHeight;
        
        // クラスター内でミニグリッド配置
        const clusterNodeCount = cluster.nodes.length;
        const clusterCols = Math.ceil(Math.sqrt(clusterNodeCount));
        const clusterRows = Math.ceil(clusterNodeCount / clusterCols);
        
        const nodeSpacing = Math.min(sectionWidth, sectionHeight) * 0.15;
        const gridStartX = sectionCenterX - ((clusterCols - 1) * nodeSpacing) / 2;
        const gridStartY = sectionCenterY - ((clusterRows - 1) * nodeSpacing) / 2;
        
        cluster.nodes.forEach((nodeId: string, nodeIndex: number) => {
          const nodeRow = Math.floor(nodeIndex / clusterCols);
          const nodeCol = nodeIndex % clusterCols;
          
          const x = gridStartX + nodeCol * nodeSpacing;
          const y = gridStartY + nodeRow * nodeSpacing;
          
          newPositions[nodeId] = { x, y };
        });
      });
      
      // 未分類ノードは下部に配置
      if (clusterAnalysis.unclassifiedNodes.length > 0) {
        const unclassifiedCols = Math.ceil(Math.sqrt(clusterAnalysis.unclassifiedNodes.length));
        const nodeSpacing = containerWidth / (unclassifiedCols + 1);
        const startY = containerHeight * 0.9;
        
        clusterAnalysis.unclassifiedNodes.forEach((nodeId: string, index: number) => {
          const col = index % unclassifiedCols;
          const row = Math.floor(index / unclassifiedCols);
          
          const x = (col + 1) * nodeSpacing;
          const y = startY + row * 60;
          
          newPositions[nodeId] = { x, y };
        });
      }
    } else {
      // 🔲 シンプルグリッド配置
      console.log('🔲 [Layout] シンプルグリッド配置');
      
      const cols = Math.ceil(Math.sqrt(nodeCount));
      const rows = Math.ceil(nodeCount / cols);
      
      const margin = 100;
      const availableWidth = containerWidth - 2 * margin;
      const availableHeight = containerHeight - 2 * margin;
      
      const cellWidth = availableWidth / cols;
      const cellHeight = availableHeight / rows;
      
      networkData.nodes.forEach((node, index) => {
        const row = Math.floor(index / cols);
        const col = index % cols;
        
        const x = margin + (col + 0.5) * cellWidth;
        const y = margin + (row + 0.5) * cellHeight;
        
        newPositions[node.id] = { x, y };
      });
    }
    
    console.log(`✅ [Layout] グリッドレイアウト完了: ${Object.keys(newPositions).length}ノード`);
    return newPositions;
  }, [containerDimensions, networkData.nodes, analyzeClusterStructure]);

  // 初期レイアウト適用（即座に重複回避配置を適用）
  useEffect(() => {
    // 手動でReset Viewが実行された場合は、絶対に自動レイアウトを適用しない
    if (isManualReset) {
      return;
    }
    
    // 初回表示時のみ自動でレイアウトを適用（有機的なランダム配置を使用）
    if (networkData.nodes.length > 0 && !hasAppliedInitialLayout && Object.keys(nodePositions).length === 0) {
      // より早いタイミングで実行して、初期ビューから重複のない配置を提供
      const timer = setTimeout(() => {
        const organicPositions = generateOrganicLayout();
        setNodePositions(organicPositions);
        setHasAppliedInitialLayout(true);
        console.log('Applied initial organic layout:', organicPositions);
      }, 100); // 1000ms → 100ms に短縮
      
      return () => clearTimeout(timer);
    }
  }, [networkData.nodes.length, hasAppliedInitialLayout, nodePositions, isManualReset, generateOrganicLayout]);

  // コントロール関数
  const resetView = () => {
    // 動的にビューポートの中央位置を計算
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const centerX = Math.max(300, viewportWidth * 0.3);
    const centerY = Math.max(200, viewportHeight * 0.3);
    setTransform({ x: centerX, y: centerY, scale: 0.6 });
    setSelectedNode(null);
    setHighlightedNodes(new Set());
    setShowDensity(false);
    
    // 新しい有機的なランダム配置を生成
    const newOrganicPositions = generateOrganicLayout();
    setNodePositions(newOrganicPositions);
    
    // 手動リセットフラグをセット
    setIsManualReset(true);
    setHasAppliedInitialLayout(true); // 初期レイアウトは適用済みとする
    
    // ラベル関連もクリア
    setClusterLabels([]);
    setShowLabels(false);
    
    console.log('Reset View with new organic layout:', newOrganicPositions);
  };

  // 初期クラスタリング実行（デフォルト設定）
  const initializeClusters = () => {
    const clusters = detectClusters(0.3, true); // デフォルトでフィルタリング有効
    setFilteredClusters(clusters);
    setShowFilteredClusters(true);
  };

  const zoomIn = () => {
    setTransform(prev => ({ ...prev, scale: Math.min(3, prev.scale * 1.2) }));
  };

  const zoomOut = () => {
    setTransform(prev => ({ ...prev, scale: Math.max(0.2, prev.scale / 1.2) }));
  };

  // カード分析状態の管理
  const [lastAnalysisState, setLastAnalysisState] = useState<{
    cardStates: Map<string, { lastAnalyzed: string; contentHash: string }>;
    lastFullAnalysis: string;
  }>({
    cardStates: new Map(),
    lastFullAnalysis: ''
  });

  // カードのコンテンツハッシュを生成（日本語対応）
  const generateContentHash = useCallback((card: any) => {
    const content = `${card.title}|${card.content}|${card.tags?.join(',')}|${card.column_type}`;
    
    // 日本語を含む文字列でも安全なハッシュ生成
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 32bit整数に変換
    }
    
    // 正の数にして16進文字列に変換
    return Math.abs(hash).toString(16).slice(0, 16);
  }, []);



  // カードのDBフラグ状態を取得
  const fetchCardAnalysisFlags = useCallback(async () => {
    if (!boardState.boardId) return new Map();
    
    try {
      const { data, error } = await supabase
        .from('board_cards')
        .select('id, is_relationship_analyzed, last_relationship_analysis_at')
        .eq('board_id', boardState.boardId)
        .eq('is_archived', false);
      
      if (error) {
        console.warn('フラグ取得エラー:', error);
        return new Map();
      }
      
      const flagMap = new Map();
      (data || []).forEach(card => {
        flagMap.set(card.id, {
          isAnalyzed: card.is_relationship_analyzed || false,
          lastAnalyzed: card.last_relationship_analysis_at
        });
      });
      
      return flagMap;
    } catch (err) {
      console.warn('フラグ取得でエラー:', err);
      return new Map();
    }
  }, [boardState.boardId]);

  // 統合関係性分析（AI + タグ類似性 + 推論）- 増分分析対応
  const runUnifiedRelationshipAnalysis = useCallback(async (type: 'full' | 'incremental' = 'incremental') => {
    if (cards.length < 2) {
      showCustomDialog(
        '分析不可',
        '関係性分析には最低2つのカードが必要です。',
        () => hideCustomDialog()
      );
      return;
    }

    console.log('🚀 [DEBUG] 分析開始');
    setIsAnalyzing(true);
    setShowAnalysisModal(true);
    
    // DBからフラグ状態を取得
    setAnalysisProgress('分析対象カードを判定中...');
    console.log('🔍 [DEBUG] カードフラグ取得開始');
    const cardFlags = await fetchCardAnalysisFlags();
    console.log('📊 [DEBUG] カードフラグ取得完了:', cardFlags.size, 'カード');
    
    // DBフラグに基づいてカードを分類
    const newCards: BoardItem[] = [];
    const updatedCards: BoardItem[] = [];
    const unchangedCards: BoardItem[] = [];
    
    cards.forEach(card => {
      const flag = cardFlags.get(card.id);
      if (!flag || !flag.isAnalyzed) {
        // 未分析カード
        newCards.push(card);
      } else {
        // すでに分析済みのカード
        const lastAnalyzed = flag.lastAnalyzed ? new Date(flag.lastAnalyzed).getTime() : 0;
        const cardUpdated = new Date(card.updated_at).getTime();
        
        if (cardUpdated > lastAnalyzed) {
          // 最後の分析後に更新されたカード
          updatedCards.push(card);
        } else {
          // 変更なしのカード
          unchangedCards.push(card);
        }
      }
    });
    
    const isIncrementalPossible = type === 'incremental' && 
      (newCards.length + updatedCards.length) < cards.length * 0.3 && // 30%未満
      unchangedCards.length > 0; // 分析済みカードが存在する場合のみ増分分析
    
    console.log('⚖️ [DEBUG] 分析タイプ判定:', {
      newCards: newCards.length,
      updatedCards: updatedCards.length,
      unchangedCards: unchangedCards.length,
      totalCards: cards.length,
      isIncrementalPossible,
      type
    });
    
    if (isIncrementalPossible) {
      setAnalysisProgress(`増分分析を実行中... (新規:${newCards.length}件, 更新:${updatedCards.length}件)`);
      console.log('📈 [DEBUG] 増分分析開始:', {
        new: newCards.length,
        updated: updatedCards.length,
        unchanged: unchangedCards.length
      });
    } else {
      setAnalysisProgress('完全分析を実行中...');
      console.log('🔄 [DEBUG] 完全分析開始:', cards.length, 'cards');
    }
    
    try {
      console.log('🧠 [DEBUG] 統合分析開始');
      console.log('🏠 [DEBUG] Board ID:', boardState.boardId);
      
      let targetCards = cards;
      let analysisType = 'full';
      
      if (isIncrementalPossible) {
        // 増分分析：新規・更新されたカードのみをAI分析の対象にする
        targetCards = [...newCards, ...updatedCards];
        analysisType = 'incremental';
        setAnalysisProgress(`増分分析: ${targetCards.length}枚のカードを分析中...`);
      } else {
        setAnalysisProgress(`完全分析: ${cards.length}枚のカードを分析中...`);
      }
      
      // Promise.allSettled で3つの分析を並行実行
      const aiTargetCards = analysisType === 'incremental' ? (targetCards.length > 0 ? targetCards : cards) : cards;
      console.log('⚡ [DEBUG] 3つの分析を並行実行開始');
      console.log(`📊 [DEBUG] AI分析対象: ${aiTargetCards.length}枚 (${analysisType === 'incremental' ? (targetCards.length > 0 ? '増分' : 'フォールバック全体') : '完全'})`);
      console.log(`📊 [DEBUG] タグ・推論分析対象: ${cards.length}枚のカード`);
      console.log(`🔄 [DEBUG] 分析タイプ: ${analysisType}`);
      
      // パラメータマネージャーからAI分析設定を取得
      const aiParams = RelationsParameterManager.getAIParameters();
      console.log(`🎛️ [NetworkVisualization] AI分析パラメータ:`, aiParams);
      
      const [aiResult, tagResult, derivedResult] = await Promise.allSettled([
        // AI分析は増分分析対応（パラメータマネージャー使用）
        AIAnalysisService.suggestRelationships(
          aiTargetCards,
          aiParams.minSimilarity, // パラメータマネージャーから取得
          aiParams.maxSuggestions, // パラメータマネージャーから取得
          user?.id, // ユーザーID追加
          currentNest?.id || boardState.currentNestId || undefined // ネストID追加
        ),
        // タグ類似性とDerived分析は常に全体（効率化の余地あり）
        AnalysisService.generateTagSimilarityRelationships(boardState.boardId || ''),
        AnalysisService.generateDerivedRelationships(boardState.boardId || '')
      ]);
      console.log('✅ [DEBUG] 3つの分析完了');
      
      setAnalysisProgress('分析結果を統合中...');
      
      // 結果を統合してタイプマーキング
      const { suggestions: unifiedSuggestions, createdCounts } = combineAnalysisResults(aiResult, tagResult, derivedResult);
      
      console.log('[NetworkVisualization] Unified suggestions generated:', unifiedSuggestions.length);
      console.log('[NetworkVisualization] Created relationships counts:', createdCounts);
      console.log('[NetworkVisualization] Analysis type:', analysisType);
      
      setAnalysisProgress('既存の関係性と照合中...');
      
      console.log('🔍 統合分析 - フィルタリング前:', unifiedSuggestions.length, 'suggestions');
      
      // 全ての提案をフィルタリング（統合設計では全て提案レベル）
      const filteredSuggestions = await AIAnalysisService.filterExistingRelationships(
        unifiedSuggestions, 
        boardState.boardId || ''
      );
      
      console.log('🔍 統合分析 - フィルタリング後:', filteredSuggestions.length, 'suggestions');
      
      setAnalysisProgress('結果を準備中...');
      
      // 分析状態を更新
      const newCardStates = new Map(lastAnalysisState.cardStates);
      cards.forEach(card => {
        newCardStates.set(card.id, {
          lastAnalyzed: new Date().toISOString(),
          contentHash: generateContentHash(card)
        });
      });
      
      setLastAnalysisState({
        cardStates: newCardStates,
        lastFullAnalysis: analysisType === 'full' ? new Date().toISOString() : (lastAnalysisState.lastFullAnalysis || new Date().toISOString())
      });
      
      console.log('🎯 分析完了、フラグ更新を開始します');
      
      // データベース内のカードフラグを更新
      setAnalysisProgress('分析フラグを更新中...');
      const analysisTimestamp = new Date().toISOString();
      const cardsToUpdate = analysisType === 'incremental' ? [...newCards, ...updatedCards] : cards;
      
      console.log('[NetworkVisualization] フラグ更新開始:', {
        analysisType,
        cardsToUpdateCount: cardsToUpdate.length,
        cardIds: cardsToUpdate.map(card => card.id),
        timestamp: analysisTimestamp
      });
      
      // シンプルに更新処理を実行（テーブル構造確認をスキップ）
      console.log('📝 フラグ更新処理を実行中...');
      
              // 分析済みフラグの更新（提案生成レベルでの更新）
        try {
          console.log('🔄 分析済みフラグ更新を開始...');
          
          // 段階的なフラグ更新アプローチ
          if (cardsToUpdate.length > 0) {
            // テスト用の1枚目でカラム存在確認
            const testCard = cardsToUpdate[0];
            console.log('🧪 テスト更新:', testCard.id);
            
            console.log('🧪 テスト更新対象カード:', {
              id: testCard.id,
              title: testCard.title,
              currentMetadata: testCard.metadata
            });
            
            const { data: testResult, error: testError } = await supabase
              .from('board_cards')
              .update({ 
                is_relationship_analyzed: true,
                last_relationship_analysis_at: analysisTimestamp
              })
              .eq('id', testCard.id)
              .select('id, is_relationship_analyzed, last_relationship_analysis_at');
              
            console.log('🧪 テスト更新結果:', { testResult, testError });
            
            if (testError) {
              console.error('❌ フラグカラムが存在しない:', testError.code, testError.message);
              console.log('⚠️ スキーマにフラグカラムを追加してください:');
              console.log('ALTER TABLE board_cards ADD COLUMN is_relationship_analyzed BOOLEAN DEFAULT FALSE;');
              console.log('ALTER TABLE board_cards ADD COLUMN last_relationship_analysis_at TIMESTAMPTZ;');
              
              // 暫定的にmetadataに保存
              const { data: fallbackResult, error: fallbackError } = await supabase
                .from('board_cards')
                .update({ 
                  metadata: { 
                    ...cardsToUpdate[0].metadata, 
                    lastAnalysisAt: analysisTimestamp, 
                    isAnalyzed: true 
                  }
                })
                .in('id', cardsToUpdate.map(card => card.id))
                .select('id');
              
              if (fallbackError) {
                console.error('❌ Fallback更新失敗:', fallbackError);
              } else {
                console.log('✅ Metadata fallback成功:', fallbackResult?.length, 'cards');
              }
            } else {
              console.log('✅ フラグカラム更新成功! 残り', cardsToUpdate.length - 1, 'cards');
              
              // 残りのカードを一括更新
              if (cardsToUpdate.length > 1) {
                const remainingCards = cardsToUpdate.slice(1);
                const { data: batchResult, error: batchError } = await supabase
                  .from('board_cards')
                  .update({ 
                    is_relationship_analyzed: true,
                    last_relationship_analysis_at: analysisTimestamp
                  })
                  .in('id', remainingCards.map(card => card.id))
                  .select('id');
                
                if (batchError) {
                  console.error('❌ 一括更新失敗:', batchError);
                } else {
                  console.log('✅ 全フラグ更新完了:', 1 + (batchResult?.length || 0), 'cards');
                }
              } else {
                console.log('✅ 全フラグ更新完了: 1 card');
              }
            }
          }
        } catch (flagError) {
          console.error('❌ フラグ更新エラー:', flagError);
        }
      
      // 少し遅延させて自然な感じに
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 統合分析の結果をaiSuggestionsに保存（UnifiedRelationshipSuggestion型を維持）
      console.log('🔍 [DEBUG] フィルター後の統合結果:', filteredSuggestions.length, 'suggestions');
      console.log('🔍 [DEBUG] フィルター後の統合結果詳細:', filteredSuggestions.map(s => ({
        sourceCardId: s.sourceCardId,
        targetCardId: s.targetCardId,
        source: cards.find(c => c.id === s.sourceCardId)?.title,
        target: cards.find(c => c.id === s.targetCardId)?.title,
        method: (s as UnifiedRelationshipSuggestion).analysisMethod,
        confidence: s.confidence
      })));
      
      // カードIDと実際のカードが一致しているかチェック
      console.log('🔍 [DEBUG] Available card IDs:', cards.map(c => ({ id: c.id, title: c.title })));
      
      // undefinedになっている提案をピックアップ
      const undefinedSuggestions = filteredSuggestions.filter(s => {
        const source = cards.find(c => c.id === s.sourceCardId);
        const target = cards.find(c => c.id === s.targetCardId);
        return !source || !target;
      });
      
      if (undefinedSuggestions.length > 0) {
        console.warn('⚠️ [DEBUG] Undefined card references found:', undefinedSuggestions.map(s => ({
          sourceCardId: s.sourceCardId,
          targetCardId: s.targetCardId,
          method: (s as UnifiedRelationshipSuggestion).analysisMethod
        })));
      }
      
      setAiSuggestions(filteredSuggestions as UnifiedRelationshipSuggestion[]);
      setShowAnalysisModal(false);
      // 結果をサイドピークに表示するため、Relations パネルを開く
      setShowRelationsPanel(true);
      
      const analysisTypeLabel = analysisType === 'incremental' ? '増分' : '完全';
      
      // 全ての提案数をカウント
      const totalProposalCount = filteredSuggestions.length;
      
      if (totalProposalCount === 0) {
        showCustomDialog(
          '分析完了',
          `${analysisTypeLabel}分析が完了しました。新しい関係性の提案はありませんでした。`,
          () => hideCustomDialog()
        );
      } else {
        console.log('[NetworkVisualization] Showing unified suggestions panel with', filteredSuggestions.length, 'suggestions');
        
        // 手法別カウント
        const aiCount = filteredSuggestions.filter(s => (s as UnifiedRelationshipSuggestion).analysisMethod === 'ai').length;
        const tagCount = filteredSuggestions.filter(s => (s as UnifiedRelationshipSuggestion).analysisMethod === 'tag_similarity').length;
        const derivedCount = filteredSuggestions.filter(s => (s as UnifiedRelationshipSuggestion).analysisMethod === 'derived').length;
        
        const methodDetails = [
          aiCount > 0 ? `🤖AI: ${aiCount}個` : null,
          tagCount > 0 ? `🏷️タグ: ${tagCount}個` : null,
          derivedCount > 0 ? `🔗推論: ${derivedCount}個` : null
        ].filter(Boolean).join(', ');
        
        showCustomDialog(
          '分析完了',
          `${analysisTypeLabel}分析完了: ${totalProposalCount}個の関係性候補が見つかりました！\n(${methodDetails})`,
          () => hideCustomDialog(),
          undefined,
          'OK'
        );
      }
          } catch (error) {
        console.error('❌ [DEBUG] 統合分析でエラー:', error);
        setShowAnalysisModal(false);
        showCustomDialog(
          'エラー',
          `統合分析中にエラーが発生しました: ${error instanceof Error ? error.message : String(error)}`,
          () => hideCustomDialog()
        );
      } finally {
        console.log('🏁 [DEBUG] 分析処理終了');
        setIsAnalyzing(false);
      }
  }, [cards, boardState.boardId, showCustomDialog, hideCustomDialog, lastAnalysisState, generateContentHash, fetchCardAnalysisFlags, boardState.currentNestId]);

  // 分析結果統合ヘルパー関数（既に作成された関係性を考慮）
  const combineAnalysisResults = useCallback((aiResult: any, tagResult: any, derivedResult: any): { 
    suggestions: UnifiedRelationshipSuggestion[], 
    createdCounts: { ai: number, tag_similarity: number, derived: number, total: number }
  } => {
    const unified: UnifiedRelationshipSuggestion[] = [];
    const createdCounts = { ai: 0, tag_similarity: 0, derived: 0, total: 0 };
    
    // AI分析結果（提案レベル - まだDB未作成）
    if (aiResult.status === 'fulfilled' && aiResult.value) {
      console.log('🤖 [DEBUG] AI result array:', aiResult.value);
      unified.push(...aiResult.value.map((item: SuggestedRelationship) => ({
        ...item,
        analysisMethod: 'ai' as const,
        methodLabel: 'AI分析',
        methodIcon: '🤖',
        confidence: item.confidence || 0.7  // ✅ 修正: 0.8 → 0.7 に緩める
      })));
    } else {
      console.log('🤖 [DEBUG] AI result failed or empty:', aiResult);
    }
    
    // タグ類似性結果（提案レベル）
    if (tagResult.status === 'fulfilled' && tagResult.value?.relationships) {
      console.log('🏷️ [DEBUG] Tag result structure:', tagResult.value);
      console.log('🏷️ [DEBUG] Tag relationships array:', tagResult.value.relationships);
      
      const tagSuggestions = convertTagResultsToSuggestions(tagResult.value.relationships);
      console.log('🏷️ [DEBUG] Converted tag suggestions:', tagSuggestions);
      
      unified.push(...tagSuggestions.map((item: SuggestedRelationship) => ({
        ...item,
        analysisMethod: 'tag_similarity' as const,
        methodLabel: 'タグ類似性',
        methodIcon: '🏷️',
        confidence: item.confidence || 0.6  // ✅ 修正: 0.7 → 0.6 に緩める
      })));
    } else {
      console.log('🏷️ [DEBUG] Tag result failed or empty:', tagResult);
    }
    
    // 推論関係性結果（提案レベル）
    if (derivedResult.status === 'fulfilled' && derivedResult.value?.relationships) {
      const derivedSuggestions = convertDerivedResultsToSuggestions(derivedResult.value.relationships);
      unified.push(...derivedSuggestions.map((item: SuggestedRelationship) => ({
        ...item,
        analysisMethod: 'derived' as const,
        methodLabel: '推論分析',
        methodIcon: '🔗',
        confidence: item.confidence || 0.6  // ✅ 修正: 0.5 → 0.6 に戻す
      })));
    }
    
    // 重複除去 & 信頼度順ソート
    return { 
      suggestions: deduplicateAndSort(unified), 
      createdCounts 
    };
  }, []);

  // 結果変換ヘルパー関数
  const convertTagResultsToSuggestions = useCallback((relationships: any[]): SuggestedRelationship[] => {
    console.log('🏷️ [DEBUG] Tag similarity raw results:', relationships);
    
    return relationships.map(rel => {
      console.log('🏷️ [DEBUG] Converting tag relation:', rel);
      
      const suggestion = {
        sourceCardId: rel.cardA?.id,  // ✅ 修正: cardA.id を使用
        targetCardId: rel.cardB?.id,  // ✅ 修正: cardB.id を使用
        relationshipType: 'conceptual' as const,
        suggestedStrength: rel.strength || 0.6,  // ✅ 修正: 0.7 → 0.6 に緩める
        confidence: rel.strength || 0.6,         // ✅ 修正: 0.7 → 0.6 に緩める
        similarity: rel.strength || 0.6,         // ✅ 修正: 0.7 → 0.6 に緩める
        explanation: rel.explanation || `タグ類似性による関係性 (強度: ${rel.strength?.toFixed(2) || 'N/A'})`
      };
      
      console.log('🏷️ [DEBUG] Created suggestion:', suggestion);
      console.log('🏷️ [DEBUG] Source card lookup:', cards.find(c => c.id === suggestion.sourceCardId)?.title);
      console.log('🏷️ [DEBUG] Target card lookup:', cards.find(c => c.id === suggestion.targetCardId)?.title);
      
      return suggestion;
    });
  }, [cards]);

  const convertDerivedResultsToSuggestions = useCallback((relationships: any[]): SuggestedRelationship[] => {
    console.log('🔗 [DEBUG] Derived similarity raw results:', relationships);
    
    return relationships.map(rel => {
      console.log('🔗 [DEBUG] Converting derived relation:', rel);
      
      const suggestion = {
        sourceCardId: rel.cardA?.id || rel.card_id,  // ✅ 修正: cardA.id を優先、fallbackでcard_id
        targetCardId: rel.cardB?.id || rel.related_card_id,  // ✅ 修正: cardB.id を優先、fallbackでrelated_card_id
        relationshipType: 'semantic' as const,
        suggestedStrength: rel.strength || 0.6,  // ✅ 修正: 0.5 → 0.6 に戻す
        confidence: rel.strength || 0.6,         // ✅ 修正: 0.5 → 0.6 に戻す
        similarity: rel.strength || 0.6,         // ✅ 修正: 0.5 → 0.6 に戻す
        explanation: rel.explanation || `推論分析による関係性 (強度: ${rel.strength?.toFixed(2) || 'N/A'})`
      };
      
      console.log('🔗 [DEBUG] Created derived suggestion:', suggestion);
      console.log('🔗 [DEBUG] Source card lookup:', cards.find(c => c.id === suggestion.sourceCardId)?.title);
      console.log('🔗 [DEBUG] Target card lookup:', cards.find(c => c.id === suggestion.targetCardId)?.title);
      
      return suggestion;
    });
  }, [cards]);

  const deduplicateAndSort = useCallback((suggestions: UnifiedRelationshipSuggestion[]): UnifiedRelationshipSuggestion[] => {
    // 重複除去（sourceCardId + targetCardId のペアで判定）
    const seen = new Set<string>();
    const deduplicated = suggestions.filter(suggestion => {
      const key = `${suggestion.sourceCardId}-${suggestion.targetCardId}`;
      const reverseKey = `${suggestion.targetCardId}-${suggestion.sourceCardId}`;
      
      if (seen.has(key) || seen.has(reverseKey)) {
        return false;
      }
      
      seen.add(key);
      return true;
    });
    
    // 信頼度順にソート
    return deduplicated.sort((a, b) => b.confidence - a.confidence);
  }, []);

  // 元のAI関係性分析（後方互換性のため残す）
  const analyzeRelationships = useCallback(async () => {
    if (cards.length < 2) {
      showCustomDialog(
        '分析不可',
        '関係性分析には最低2つのカードが必要です。',
        () => hideCustomDialog()
      );
      return;
    }

    setIsAnalyzing(true);
    setShowAnalysisModal(true);
    setAnalysisProgress('分析を開始しています...');
    
    try {
      console.log('[NetworkVisualization] Starting AI relationship analysis...');
      console.log('[NetworkVisualization] Board ID:', boardState.boardId);
      console.log('[NetworkVisualization] Cards to analyze:', cards.length);
      console.log('[NetworkVisualization] Card details:', cards.map(c => ({
        id: c.id,
        title: c.title,
        content: c.content?.substring(0, 100) + '...',
        tags: c.tags,
        type: c.column_type,
        updated_at: c.updated_at,
        created_at: c.created_at
      })));
      
      // 既存の関係性も確認
      console.log('[NetworkVisualization] Current relationships:', relationships.map(r => ({
        card_id: r.card_id,
        related_card_id: r.related_card_id,
        type: r.relationship_type,
        strength: r.strength
      })));
      
      setAnalysisProgress(`${cards.length}枚のカードを分析中...`);
      
      // AI関係性提案を取得（パラメータマネージャー使用）
      const aiParams = RelationsParameterManager.getAIParameters();
      console.log(`🎛️ [NetworkVisualization] 従来AI分析パラメータ:`, aiParams);
      
      const suggestions = await AIAnalysisService.suggestRelationships(
        cards, 
        aiParams.minSimilarity, // パラメータマネージャーから取得
        Math.min(aiParams.maxSuggestions, 20), // 従来分析は上限20に制限
        user?.id, // ユーザーID追加
        currentNest?.id || boardState.currentNestId || undefined // ネストID追加
      );
      console.log('[NetworkVisualization] AI suggestions received:', suggestions.length, suggestions);
      
      setAnalysisProgress('関係性候補を検証中...');
      
      if (suggestions.length === 0) {
        console.log('[NetworkVisualization] No suggestions generated by AI');
        setShowAnalysisModal(false);
        showCustomDialog(
          '分析完了',
          'AI分析では関係性の提案が生成されませんでした。類似度閾値を下げるか、カード内容を確認してください。',
          () => hideCustomDialog()
        );
        return;
      }
      
      // 既存の関係性と重複しないものをフィルタ
      console.log('[NetworkVisualization] Filtering existing relationships...');
      console.log('[NetworkVisualization] Board ID for filtering:', boardState.boardId);
      setAnalysisProgress('既存の関係性と照合中...');
      
      const filteredSuggestions = await AIAnalysisService.filterExistingRelationships(
        suggestions, 
        boardState.boardId || ''
      );
      
      console.log('[NetworkVisualization] Filtered suggestions:', filteredSuggestions.length, filteredSuggestions);
      
      setAnalysisProgress('結果を準備中...');
      
      // 少し遅延させて自然な感じに
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // AI単体分析結果をUnifiedRelationshipSuggestion形式に変換
      const unifiedAiSuggestions: UnifiedRelationshipSuggestion[] = filteredSuggestions.map(suggestion => ({
        ...suggestion,
        analysisMethod: 'ai' as const,
        methodLabel: 'AI分析',
        methodIcon: '🤖',
        confidence: suggestion.confidence || 0.8
      }));
      
      setAiSuggestions(unifiedAiSuggestions);
      setShowAnalysisModal(false);
      // 結果をサイドピークに表示するため、Relations パネルを開く
      setShowRelationsPanel(true);
      
      if (filteredSuggestions.length === 0) {
        showCustomDialog(
          '分析完了',
          '新しい関係性の提案はありませんでした。既存の関係性で十分に接続されているか、カード内容の類似度が低い可能性があります。',
          () => hideCustomDialog()
        );
      } else {
        console.log('[NetworkVisualization] Showing suggestions panel with', filteredSuggestions.length, 'suggestions');
        showCustomDialog(
          '分析完了',
          `${filteredSuggestions.length}個の新しい関係性候補が見つかりました！右側のパネルで確認してください。`,
          () => hideCustomDialog(),
          undefined,
          'OK'
        );
      }
    } catch (error) {
      console.error('[NetworkVisualization] AI analysis failed:', error);
      setShowAnalysisModal(false);
      showCustomDialog(
        'エラー',
        `AI分析中にエラーが発生しました: ${error instanceof Error ? error.message : String(error)}`,
        () => hideCustomDialog()
      );
    } finally {
      setIsAnalyzing(false);
    }
  }, [cards, boardState.boardId, relationships, boardState.currentNestId]);

  // 提案の承認
  const approveSuggestion = useCallback(async (suggestion: UnifiedRelationshipSuggestion) => {
    try {
      console.log('🔍 [承認処理] 開始:', {
        suggestion: suggestion,
        sourceCard: cards.find(c => c.id === suggestion.sourceCardId)?.title,
        targetCard: cards.find(c => c.id === suggestion.targetCardId)?.title,
        analysisMethod: suggestion.analysisMethod,
        relationshipType: suggestion.relationshipType
      });
      
      // AI提案の関係性タイプをDBの関係性タイプにマッピング
      const mapRelationshipType = (aiType: 'semantic' | 'topical' | 'conceptual'): 'semantic' | 'tag_similarity' | 'ai' => {
        switch (aiType) {
          case 'topical':
            return 'tag_similarity'; // タグの重複による関係性
          case 'conceptual':
            return 'semantic'; // 同じカテゴリでの意味的関係性
          case 'semantic':
          default:
            return 'semantic'; // 純粋な意味的類似性
        }
      };
      
      const dbRelationshipType = mapRelationshipType(suggestion.relationshipType);
      console.log('🔍 [承認処理] マッピング結果:', {
        originalType: suggestion.relationshipType,
        dbType: dbRelationshipType
      });
      
      // AnalysisServiceを使って関係性を作成
      const createResult = await AnalysisService.createRelationship(
        boardState.boardId || '',
        suggestion.sourceCardId,
        suggestion.targetCardId,
        dbRelationshipType,
        suggestion.suggestedStrength,
        suggestion.confidence,
        {
          aiSuggested: true,
          similarity: suggestion.similarity,
          explanation: suggestion.explanation,
          originalAiType: suggestion.relationshipType, // 元のAI分類を保持
          aiModel: 'text-embedding-3-small',
          approvedAt: new Date().toISOString(),
          analysisMethod: suggestion.analysisMethod, // 分析手法も保存
        }
      );
      
      console.log('🔍 [承認処理] createRelationship結果:', createResult);
      
      // 提案リストから削除
      setAiSuggestions(prev => prev.filter(s => 
        !(s.sourceCardId === suggestion.sourceCardId && 
          s.targetCardId === suggestion.targetCardId)
      ));
      
      // データをリフレッシュ
      if (boardState.currentNestId) {
        await loadNestData(boardState.currentNestId);
      }
      
      console.log('[NetworkVisualization] Approved suggestion:', suggestion, 'as type:', dbRelationshipType);
    } catch (error) {
      console.error('Failed to approve suggestion:', error);
      alert('関係性の作成に失敗しました');
    }
  }, [boardState.boardId, boardState.currentNestId, loadNestData]);

  // 提案の拒否
  const rejectSuggestion = useCallback((suggestion: UnifiedRelationshipSuggestion) => {
    setAiSuggestions(prev => prev.filter(s => 
      !(s.sourceCardId === suggestion.sourceCardId && 
        s.targetCardId === suggestion.targetCardId)
    ));
    console.log('[NetworkVisualization] Rejected suggestion:', suggestion);
  }, []);

  // 全提案の一括承認
  const approveAllSuggestions = useCallback(async () => {
    if (aiSuggestions.length === 0) return;
    
    showCustomDialog(
      '一括承認の確認',
      `${aiSuggestions.length}個の関係性提案を一括承認しますか？`,
      async () => {
        hideCustomDialog();
        
        try {
          // AI提案の関係性タイプをDBの関係性タイプにマッピング
          const mapRelationshipType = (aiType: 'semantic' | 'topical' | 'conceptual'): 'semantic' | 'tag_similarity' | 'ai' => {
            switch (aiType) {
              case 'topical':
                return 'tag_similarity'; // タグの重複による関係性
              case 'conceptual':
                return 'semantic'; // 同じカテゴリでの意味的関係性
              case 'semantic':
              default:
                return 'semantic'; // 純粋な意味的類似性
            }
          };
          
          // 並列で関係性を作成
          await Promise.all(aiSuggestions.map(suggestion => {
            const dbRelationshipType = mapRelationshipType(suggestion.relationshipType);
            return AnalysisService.createRelationship(
              boardState.boardId || '',
              suggestion.sourceCardId,
              suggestion.targetCardId,
              dbRelationshipType,
              suggestion.suggestedStrength,
              suggestion.confidence,
              {
                aiSuggested: true,
                similarity: suggestion.similarity,
                explanation: suggestion.explanation,
                originalAiType: suggestion.relationshipType, // 元のAI分類を保持
                aiModel: 'text-embedding-3-small',
                batchApproved: true,
                approvedAt: new Date().toISOString(),
              }
            );
          }));
          
          setAiSuggestions([]);
          // setShowSuggestionsPanel(false); // サイドピークに統合済み
          
          // データをリフレッシュ
          if (boardState.currentNestId) {
            await loadNestData(boardState.currentNestId);
          }
          
          showCustomDialog(
            '承認完了',
            '全ての関係性提案が承認されました！',
            () => hideCustomDialog(),
            undefined,
            'OK'
          );
        } catch (error) {
          console.error('Failed to approve all suggestions:', error);
          showCustomDialog(
            'エラー',
            '一括承認中にエラーが発生しました',
            () => hideCustomDialog()
          );
        }
      },
      () => hideCustomDialog(),
      '承認',
      'キャンセル'
    );
  }, [aiSuggestions, boardState.boardId, boardState.currentNestId, loadNestData]);

  // 手法別一括承認
  const approveMethodSuggestions = useCallback(async (method: 'ai' | 'tag_similarity' | 'derived') => {
    const methodSuggestions = (aiSuggestions as UnifiedRelationshipSuggestion[])
      .filter(s => s.analysisMethod === method);
    
    if (methodSuggestions.length === 0) return;
    
    try {
      // AI提案の関係性タイプをDBの関係性タイプにマッピング
      const mapRelationshipType = (aiType: 'semantic' | 'topical' | 'conceptual'): 'semantic' | 'tag_similarity' | 'ai' => {
        switch (aiType) {
          case 'topical':
            return 'tag_similarity';
          case 'conceptual':
            return 'semantic';
          case 'semantic':
          default:
            return 'semantic';
        }
      };
      
      // 並列で関係性を作成
      await Promise.all(methodSuggestions.map(suggestion => {
        const dbRelationshipType = mapRelationshipType(suggestion.relationshipType);
        return AnalysisService.createRelationship(
          boardState.boardId || '',
          suggestion.sourceCardId,
          suggestion.targetCardId,
          dbRelationshipType,
          suggestion.suggestedStrength,
          suggestion.confidence,
          {
            aiSuggested: true,
            similarity: suggestion.similarity,
            explanation: suggestion.explanation,
            originalAiType: suggestion.relationshipType,
            aiModel: 'unified-analysis',
            methodApproved: true,
            analysisMethod: (suggestion as UnifiedRelationshipSuggestion).analysisMethod,
            approvedAt: new Date().toISOString(),
          }
        );
      }));
      
      // データをリフレッシュ
      if (boardState.currentNestId) {
        await loadNestData(boardState.currentNestId);
      }
      
      // 承認された提案を除外
      const remainingSuggestions = aiSuggestions.filter(suggestion => 
        !methodSuggestions.some(ms => 
          ms.sourceCardId === suggestion.sourceCardId && 
          ms.targetCardId === suggestion.targetCardId
        )
      );
      setAiSuggestions(remainingSuggestions);
      
      const methodName = method === 'ai' ? 'AI分析' : method === 'tag_similarity' ? 'タグ類似性' : '推論分析';
      showCustomDialog(
        '承認完了',
        `${methodSuggestions.length}個の${methodName}提案を承認し、関係性を追加しました。`,
        () => hideCustomDialog()
      );
    } catch (error) {
      console.error('Method suggestions approval failed:', error);
      showCustomDialog(
        'エラー',
        '手法別承認処理中にエラーが発生しました。',
        () => hideCustomDialog()
      );
    }
  }, [aiSuggestions, boardState.boardId, boardState.currentNestId, loadNestData, showCustomDialog, hideCustomDialog]);

  // 手法別一括拒否
  const rejectMethodSuggestions = useCallback((method: 'ai' | 'tag_similarity' | 'derived') => {
    const methodSuggestions = (aiSuggestions as UnifiedRelationshipSuggestion[])
      .filter(s => s.analysisMethod === method);
    
    if (methodSuggestions.length === 0) return;
    
    // 該当する手法の提案を除外
    const remainingSuggestions = aiSuggestions.filter(suggestion => {
      const unified = suggestion as UnifiedRelationshipSuggestion;
      return !(unified.analysisMethod === method);
    });
    
    setAiSuggestions(remainingSuggestions);
    
    const methodName = method === 'ai' ? 'AI分析' : method === 'tag_similarity' ? 'タグ類似性' : '推論分析';
    showCustomDialog(
      '拒否完了',
      `${methodSuggestions.length}個の${methodName}提案を拒否しました。`,
      () => hideCustomDialog()
    );
  }, [aiSuggestions, showCustomDialog, hideCustomDialog]);

  // CSS styles
  const styles = {
    container: {
      width: '100%',
      height: '100%',
      position: 'relative' as const,
      backgroundColor: THEME_COLORS.bgPrimary,
      cursor: isDragging ? 'grabbing' : 'grab',
      overflow: 'visible', // hiddenからvisibleに変更
      fontFamily: 'Space Grotesk, system-ui, sans-serif',
    },
    networkCanvas: {
      width: '100%',
      height: '100%',
      position: 'absolute' as const,
      top: 0,
      left: 0,
      transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
      transformOrigin: 'center',
      transition: isDragging ? 'none' : 'transform 0.2s ease',
      overflow: 'visible',
    },
    svg: {
      width: '100%',
      height: '100%',
      position: 'absolute' as const,
      top: 0,
      left: 0,
      zIndex: 3,  // ノード（zIndex: 2）より上に配置
      pointerEvents: 'none' as const,
      overflow: 'visible',
    },
    nodesContainer: {
      position: 'absolute' as const,
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      zIndex: 2,
    },
    node: {
      position: 'absolute' as const,
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
      backdropFilter: 'blur(8px)',
      border: '2px solid',
    },
    nodeIcon: {
      fontSize: '18px',
      fontWeight: '600',
    },
    nodeLabel: {
      position: 'absolute' as const,
      top: '100%',
      left: '50%',
      transform: 'translateX(-50%)',
      marginTop: '8px',
      fontSize: '11px',
      color: THEME_COLORS.textSecondary,
      textAlign: 'center' as const,
      background: 'rgba(15, 15, 35, 0.8)',
      padding: '4px 8px',
      borderRadius: THEME_COLORS.borderRadius.medium,
      backdropFilter: 'blur(4px)',
      border: `1px solid ${THEME_COLORS.borderPrimary}`,
      maxWidth: '120px',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap' as const,
      opacity: 0,
      transition: 'all 0.2s ease',
      pointerEvents: 'none' as const,
      fontFamily: 'JetBrains Mono, monospace',
    },
    // パネルスタイル
    panel: {
      position: 'absolute' as const,
      background: 'rgba(26, 26, 46, 0.9)',
      border: `1px solid ${THEME_COLORS.borderPrimary}`,
      borderRadius: THEME_COLORS.borderRadius.large,
      padding: '20px',
      backdropFilter: 'blur(12px)',
      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
      zIndex: 10,
    },
    // 新しいメインメニューコンテナ
    mainMenuContainer: {
      position: 'absolute' as const,
      top: '20px',
      left: '20px',
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '10px',
      zIndex: 10,
    },
    // カテゴリーボタンスタイル
    categoryBtn: {
      background: THEME_COLORS.bgSecondary,
      border: `1px solid ${THEME_COLORS.borderPrimary}`,
      borderRadius: THEME_COLORS.borderRadius.medium,
      color: THEME_COLORS.textSecondary,
      padding: '14px 18px',
      fontSize: '13px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      fontFamily: 'JetBrains Mono, monospace',
      minWidth: '160px',
      textAlign: 'center' as const,
      backdropFilter: 'blur(8px)',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    },
    controls: {
      position: 'absolute' as const,
      top: '20px',
      left: '20px',
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '12px',
      zIndex: 10,
    },
    controlBtn: {
      background: THEME_COLORS.bgSecondary,
      border: `1px solid ${THEME_COLORS.borderPrimary}`,
      borderRadius: THEME_COLORS.borderRadius.medium,
      color: THEME_COLORS.textSecondary,
      padding: '12px 16px',
      fontSize: '12px',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      fontFamily: 'JetBrains Mono, monospace',
      minWidth: '140px',
      textAlign: 'center' as const,
      backdropFilter: 'blur(8px)',
    },
    // クラスタリング制御パネルのスタイル
    clusteringControlsPanel: {
      position: 'absolute' as const,
      top: '60px',
      left: '180px',
      width: '320px',
      background: 'rgba(26, 26, 46, 0.95)',
      border: `1px solid ${THEME_COLORS.borderPrimary}`,
      borderRadius: THEME_COLORS.borderRadius.large,
      padding: '20px',
      backdropFilter: 'blur(12px)',
      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
      zIndex: 15,
      fontFamily: 'JetBrains Mono, monospace',
    },
    panelHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '16px',
      borderBottom: `1px solid ${THEME_COLORS.borderPrimary}`,
      paddingBottom: '12px',
    },
    panelTitle: {
      color: THEME_COLORS.textPrimary,
      fontSize: '14px',
      fontWeight: '600',
      margin: '0',
    },
    closeButton: {
      background: 'transparent',
      border: 'none',
      color: THEME_COLORS.textMuted,
      fontSize: '16px',
      cursor: 'pointer',
      padding: '4px',
      borderRadius: '4px',
      transition: 'all 0.2s ease',
    },
    controlGroup: {
      marginBottom: '16px',
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '8px',
    },
    controlLabel: {
      color: THEME_COLORS.textSecondary,
      fontSize: '12px',
      fontWeight: '500',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    checkbox: {
      width: '16px',
      height: '16px',
      accentColor: THEME_COLORS.primaryGreen,
    },
    slider: {
      width: '100%',
      height: '6px',
      borderRadius: '3px',
      background: THEME_COLORS.bgTertiary,
      outline: 'none',
      cursor: 'pointer',
      accentColor: THEME_COLORS.primaryGreen,
    },
    sliderLabels: {
      display: 'flex',
      justifyContent: 'space-between',
      marginTop: '4px',
    },
    sliderLabel: {
      color: THEME_COLORS.textMuted,
      fontSize: '10px',
    },
    applyButton: {
      background: THEME_COLORS.primaryGreen,
      border: 'none',
      borderRadius: THEME_COLORS.borderRadius.medium,
      color: THEME_COLORS.textInverse,
      padding: '12px 16px',
      fontSize: '12px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      width: '100%',
    },
    debugInfo: {
      marginTop: '12px',
      padding: '8px',
      background: 'rgba(0, 0, 0, 0.2)',
      borderRadius: THEME_COLORS.borderRadius.small,
      border: `1px solid ${THEME_COLORS.borderSecondary}`,
    },
    debugText: {
      color: THEME_COLORS.textMuted,
      fontSize: '10px',
      lineHeight: '1.4',
    },
    // タブ用のスタイル
    tabContainer: {
      display: 'flex',
      gap: '4px',
    },
    tabButton: {
      background: THEME_COLORS.bgTertiary,
      border: `1px solid ${THEME_COLORS.borderSecondary}`,
      borderRadius: THEME_COLORS.borderRadius.small,
      color: THEME_COLORS.textSecondary,
      padding: '8px 16px',
      fontSize: '12px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      fontFamily: 'JetBrains Mono, monospace',
      minWidth: '80px',
      textAlign: 'center' as const,
    },
    // 高度解析モード用のスタイル
    select: {
      background: THEME_COLORS.bgSecondary,
      border: `1px solid ${THEME_COLORS.borderSecondary}`,
      borderRadius: THEME_COLORS.borderRadius.small,
      color: THEME_COLORS.textPrimary,
      padding: '8px 12px',
      fontSize: '12px',
      fontFamily: 'JetBrains Mono, monospace',
      cursor: 'pointer',
    },
    sliderGroup: {
      marginBottom: '12px',
    },
  };

  // Auto Labels機能 - Clustering Controlsのフィルタリングされたクラスターに対応
  const generateLabels = useCallback(async () => {
    // フィルタリングされたクラスターのみを使用
    if (filteredClusters.length === 0) {
      showCustomDialog(
        'クラスター表示が必要',
        'ラベル生成にはClustering Controlsでクラスターを生成・表示してください。',
        () => hideCustomDialog()
      );
      return;
    }

    setIsGeneratingLabels(true);
    try {
      console.log('[NetworkVisualization] Generating cluster labels for filtered clusters');
      const labels = await AnalysisService.generateClusterLabels(
        boardState.boardId || '',
        filteredClusters
      );
      
      // ノード位置を反映してラベル位置を更新
      const updatedLabels = labels.map(label => {
        const clusterCards = label.cardIds.map(id => networkData.nodes.find(n => n.id === id)).filter(Boolean);
        if (clusterCards.length === 0) return label;

        // 実際のノード位置を使用して位置を再計算
        const centerX = clusterCards.reduce((sum, node) => sum + (nodePositions[node!.id]?.x || node!.x), 0) / clusterCards.length;
        const centerY = clusterCards.reduce((sum, node) => sum + (nodePositions[node!.id]?.y || node!.y), 0) / clusterCards.length;
        const minY = Math.min(...clusterCards.map(node => (nodePositions[node!.id]?.y || node!.y)));

        return {
          ...label,
          position: {
            x: centerX,
            y: minY - 40
          }
        };
      });
      
      setClusterLabels(updatedLabels);
      setShowLabels(true);
      
      // 完了モーダルを削除
      console.log('[NetworkVisualization] Auto Labels generated successfully:', updatedLabels.length);
    } catch (error) {
      console.error('Failed to generate labels:', error);
      showCustomDialog(
        'エラー',
        `ラベル生成に失敗しました: ${error instanceof Error ? error.message : String(error)}`,
        () => hideCustomDialog()
      );
    } finally {
      setIsGeneratingLabels(false);
    }
  }, [filteredClusters, boardState.boardId, networkData.nodes, nodePositions, showCustomDialog, hideCustomDialog]);

  // ラベルのクリア
  const clearLabels = useCallback(() => {
    setClusterLabels([]);
    setShowLabels(false);
  }, []);

  // ラベルインライン編集のハンドラー
  const handleLabelDoubleClick = useCallback((labelId: string, currentText: string) => {
    setEditingLabelId(labelId);
    setEditingText(currentText);
  }, []);

  const handleLabelSave = useCallback(() => {
    if (!editingLabelId || !editingText.trim()) return;
    
    setClusterLabels(prev => prev.map(label => 
      label.id === editingLabelId 
        ? { ...label, text: editingText.trim() }
        : label
    ));
    
    setEditingLabelId(null);
    setEditingText('');
    
    console.log('[NetworkVisualization] ラベル編集完了:', { labelId: editingLabelId, newText: editingText.trim() });
  }, [editingLabelId, editingText]);

  const handleLabelCancel = useCallback(() => {
    setEditingLabelId(null);
    setEditingText('');
  }, []);

  const handleLabelKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleLabelSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleLabelCancel();
    }
  }, [handleLabelSave, handleLabelCancel]);

  // 関連性追加のハンドラー
  const handleAddRelationClick = useCallback(() => {
    setShowAddRelationModal(true);
    setSearchQuery('');
    setNewRelationTarget('');
  }, []);

  const handleAddRelationCancel = useCallback(() => {
    setShowAddRelationModal(false);
    setNewRelationTarget('');
    setSearchQuery('');
  }, []);

  const handleAddRelationSave = useCallback(async () => {
    if (!selectedNode || !newRelationTarget || selectedNode === newRelationTarget) {
      return;
    }

    try {
      console.log('[NetworkVisualization] 関連性追加開始:', {
        source: selectedNode,
        target: newRelationTarget,
        type: newRelationType,
        strength: newRelationStrength
      });

      // Supabaseに新しい関連性を追加
      const { error } = await supabase
        .from('board_card_relations')
        .insert({
          card_id: selectedNode,
          related_card_id: newRelationTarget,
          relationship_type: newRelationType,
          strength: newRelationStrength,
          is_mutual: true
        });

      if (error) {
        console.error('[NetworkVisualization] 関連性追加エラー:', error);
        alert('関連性の追加に失敗しました: ' + error.message);
        return;
      }

      console.log('[NetworkVisualization] 関連性追加成功');
      
      // UI状態をリセット
      setShowAddRelationModal(false);
      setNewRelationTarget('');
      setSearchQuery('');
      
      // 成功フィードバック
      // リアルタイム更新により自動的に関連性が反映される

    } catch (err) {
      console.error('[NetworkVisualization] 関連性追加例外:', err);
      alert('関連性の追加中に予期しないエラーが発生しました');
    }
  }, [selectedNode, newRelationTarget, newRelationType, newRelationStrength]);

  // 関連性リストのソート関数
  const getSortedAndFilteredConnections = useCallback((connections: any[]) => {
    // ソート（フィルタリングは左下のFilters領域で行う）
    let sortedConnections = [...connections];
    switch (relationsSortBy) {
      case 'strength':
        sortedConnections.sort((a, b) => {
          const comparison = b.strength - a.strength;
          return relationsSortOrder === 'asc' ? -comparison : comparison;
        });
        break;
      
      case 'type':
        sortedConnections.sort((a, b) => {
          const comparison = a.type.localeCompare(b.type);
          return relationsSortOrder === 'asc' ? comparison : -comparison;
        });
        break;
      
      case 'target_title':
        sortedConnections.sort((a, b) => {
          const otherNodeA = networkData.nodes.find(n => 
            n.id === (a.source === selectedNode ? a.target : a.source)
          );
          const otherNodeB = networkData.nodes.find(n => 
            n.id === (b.source === selectedNode ? b.target : b.source)
          );
          const titleA = otherNodeA?.title || '';
          const titleB = otherNodeB?.title || '';
          const comparison = titleA.localeCompare(titleB);
          return relationsSortOrder === 'asc' ? comparison : -comparison;
        });
        break;
      
      default: // 'default'
        // デフォルト順序を維持
        break;
    }

    return sortedConnections;
  }, [relationsSortBy, relationsSortOrder, networkData.nodes, selectedNode]);

  // クラスタークリック処理
  const handleClusterClick = useCallback((clusterId: string) => {
    setSelectedCluster(clusterId);
    setShowClusterDetailPanel(true);
    console.log('[NetworkVisualization] クラスター詳細表示:', clusterId);
  }, []);

  // クラスター詳細パネルを閉じる
  const handleCloseClusterDetail = useCallback(() => {
    setSelectedCluster(null);
    setShowClusterDetailPanel(false);
    // 編集状態もリセット
    setIsEditingClusterLabel(false);
    setEditingClusterText('');
  }, []);

  // クラスターラベル編集開始（詳細パネル内）
  const handleStartEditClusterLabel = useCallback((currentText: string) => {
    setIsEditingClusterLabel(true);
    setEditingClusterText(currentText);
  }, []);

  // クラスターラベル編集保存
  const handleSaveClusterLabel = useCallback(() => {
    if (!selectedCluster || !editingClusterText.trim()) return;
    
    // clusterLabelsを更新
    setClusterLabels(prev => prev.map(label => 
      label.id === selectedCluster 
        ? { ...label, text: editingClusterText.trim() }
        : label
    ));
    
    // 編集状態を終了
    setIsEditingClusterLabel(false);
    setEditingClusterText('');
    
    console.log('[NetworkVisualization] クラスターラベル編集完了:', { 
      clusterId: selectedCluster, 
      newText: editingClusterText.trim() 
    });
  }, [selectedCluster, editingClusterText]);

  // クラスターラベル編集キャンセル
  const handleCancelEditClusterLabel = useCallback(() => {
    setIsEditingClusterLabel(false);
    setEditingClusterText('');
  }, []);

  // ソートオプションの外部クリック検知
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showSortOptions) {
        // クリック対象がソートオプション内でない場合、閉じる
        const target = event.target as Element;
        const sortContainer = target.closest('[data-sort-container="true"]');
        if (!sortContainer) {
          setShowSortOptions(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSortOptions]);

  // ラベルテーマ色の定義
  const getLabelThemeColor = (theme: string) => {
    const themeColors = {
      ux: THEME_COLORS.primaryBlue,
      psychology: THEME_COLORS.primaryPurple,
      design: THEME_COLORS.primaryOrange,
      research: THEME_COLORS.primaryCyan,
      default: THEME_COLORS.primaryGreen
    };
    return themeColors[theme as keyof typeof themeColors] || themeColors.default;
  };

  // 描画領域サイズの動的調整
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        // 利用可能なスペースを最大限活用（パネル分を考慮）
        const width = Math.max(1200, rect.width - 100); // 最小1200px、サイドパネル分を差し引く
        const height = Math.max(900, rect.height - 100); // 最小900px、上下パネル分を差し引く
        setContainerDimensions({ width, height });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  return (
    <div 
      ref={containerRef}
      style={styles.container}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      onClick={handleContainerClick}
    >
      <div style={styles.networkCanvas}>
        {/* SVG for edges */}
        <svg 
          ref={svgRef} 
          style={styles.svg}
        >
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon 
                points="0 0, 10 3.5, 0 7" 
                fill={THEME_COLORS.textMuted}
                opacity="0.5"
              />
            </marker>
            <marker
              id="arrowhead-highlight"
              markerWidth="8"
              markerHeight="5"
              refX="7"
              refY="2.5"
              orient="auto"
            >
              <polygon 
                points="0 0, 8 2.5, 0 5" 
                fill={THEME_COLORS.primaryGreen}
                opacity="0.7"
              />
            </marker>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
              <feColorMatrix type="matrix" values="0 1 0.5 0 0  0 1 0.5 0 0  0 1 0.5 0 0  0 0 0 1 0" result="greenGlow"/>
              <feMerge>
                <feMergeNode in="greenGlow"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
            <filter id="strongGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="6" result="blur"/>
              <feColorMatrix type="matrix" values="0 2 1 0 0  0 2 1 0 0  0 2 1 0 0  0 0 0 1 0" result="brightGlow"/>
              <feMerge>
                <feMergeNode in="brightGlow"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          
          {/* Render edges */}
          {networkData.edges.map(edge => {
            const sourceNode = networkData.nodes.find(n => n.id === edge.source);
            const targetNode = networkData.nodes.find(n => n.id === edge.target);
            
            if (!sourceNode || !targetNode) return null;
            
            // 実際のノード位置を取得（nodePositionsがあればそれを使用、なければデフォルト位置）
            const sourcePos = nodePositions[sourceNode.id] || { x: sourceNode.x, y: sourceNode.y };
            const targetPos = nodePositions[targetNode.id] || { x: targetNode.x, y: targetNode.y };
            
            // 座標の精度を確保（ノードと同じ丸め処理を適用）
            const roundedSourcePos = {
              x: Math.round(sourcePos.x),
              y: Math.round(sourcePos.y)
            };
            const roundedTargetPos = {
              x: Math.round(targetPos.x),
              y: Math.round(targetPos.y)
            };
            
            // DOM要素の実際の中心位置を計算（DOMノードは left: x - size/2, top: y - size/2 で配置されている）
            // SVGの座標系をDOM要素の座標系に合わせる
            const sourceSize = getNodeSize(sourceNode.size);
            const targetSize = getNodeSize(targetNode.size);
            
            // Transform適用前の座標
            const baseSourcePos = {
              x: roundedSourcePos.x,
              y: roundedSourcePos.y
            };
            const baseTargetPos = {
              x: roundedTargetPos.x,
              y: roundedTargetPos.y
            };
            
            // SVGとDOMは同じnetworkCanvas内にあり、同じtransformが適用されているため、
            // 座標系は一致している（transformは両方に適用される）
            const domAwareSourcePos = baseSourcePos;
            const domAwareTargetPos = baseTargetPos;
            
            // より詳細なデバッグ情報（無効化）
            if (false && process.env.NODE_ENV === 'development' && Math.random() < 0.05) { // デバッグログ無効化
              console.log('[NetworkVisualization] DOM-aware coordinate debug:', {
                edgeId: edge.id,
                containerDimensions,
                svgViewBox: `0 0 ${containerDimensions.width} ${containerDimensions.height}`,
                transform: transform,
                sourceNode: {
                  id: sourceNode.id,
                  originalPos: { x: sourceNode.x, y: sourceNode.y },
                  nodePositions: nodePositions[sourceNode.id],
                  finalPos: sourcePos,
                  roundedPos: roundedSourcePos,
                  basePos: baseSourcePos,
                  domAwarePos: domAwareSourcePos,
                  size: sourceNode.size,
                  actualSize: sourceSize,
                  domLeft: domAwareSourcePos.x - sourceSize / 2,
                  domTop: domAwareSourcePos.y - sourceSize / 2
                },
                targetNode: {
                  id: targetNode.id,
                  originalPos: { x: targetNode.x, y: targetNode.y },
                  nodePositions: nodePositions[targetNode.id],
                  finalPos: targetPos,
                  roundedPos: roundedTargetPos,
                  basePos: baseTargetPos,
                  domAwarePos: domAwareTargetPos,
                  size: targetNode.size,
                  actualSize: targetSize,
                  domLeft: domAwareTargetPos.x - targetSize / 2,
                  domTop: domAwareTargetPos.y - targetSize / 2
                }
              });
            }
            
            const angle = Math.atan2(domAwareTargetPos.y - domAwareSourcePos.y, domAwareTargetPos.x - domAwareSourcePos.x);
            const sourceRadius = sourceSize / 2;
            const targetRadius = targetSize / 2;
            
            // 座標の精度を確保するための補正
            const x1 = Math.round(domAwareSourcePos.x + Math.cos(angle) * sourceRadius);
            const y1 = Math.round(domAwareSourcePos.y + Math.sin(angle) * sourceRadius);
            const x2 = Math.round(domAwareTargetPos.x - Math.cos(angle) * targetRadius);
            const y2 = Math.round(domAwareTargetPos.y - Math.sin(angle) * targetRadius);
            
            // 座標の妥当性チェック
            if (isNaN(x1) || isNaN(y1) || isNaN(x2) || isNaN(y2)) {
              console.warn('[NetworkVisualization] Invalid edge coordinates:', {
                edge: edge.id,
                sourcePos,
                targetPos,
                coordinates: { x1, y1, x2, y2 }
              });
              return null;
            }
            
            const isActive = selectedNode && (edge.source === selectedNode || edge.target === selectedNode);
            const isRelated = highlightedNodes.has(edge.source) || highlightedNodes.has(edge.target);
            
            // ハイライト時のアクセント色
            const highlightColor = THEME_COLORS.primaryGreen;
            const edgeColor = isActive ? highlightColor : edge.color;
            const edgeWidth = isActive ? Math.max(3, edge.width * 2.5) : edge.width;
            const edgeOpacity = isActive ? 1.0 : isRelated ? 0.7 : 0.4;
            
            return (
              <g key={edge.id}>
                {/* デバッグ用: ノード中心点を可視化（開発環境のみ） */}
                {process.env.NODE_ENV === 'development' && isActive && (
                  <>
                    <circle
                      cx={domAwareSourcePos.x}
                      cy={domAwareSourcePos.y}
                      r="5"
                      fill="red"
                      opacity="0.9"
                    />
                    <circle
                      cx={domAwareTargetPos.x}
                      cy={domAwareTargetPos.y}
                      r="5"
                      fill="blue"
                      opacity="0.9"
                    />
                    {/* ノード境界の可視化 */}
                    <circle
                      cx={domAwareSourcePos.x}
                      cy={domAwareSourcePos.y}
                      r={sourceSize / 2}
                      fill="none"
                      stroke="red"
                      strokeWidth="1"
                      opacity="0.5"
                      strokeDasharray="2,2"
                    />
                    <circle
                      cx={domAwareTargetPos.x}
                      cy={domAwareTargetPos.y}
                      r={targetSize / 2}
                      fill="none"
                      stroke="blue"
                      strokeWidth="1"
                      opacity="0.5"
                      strokeDasharray="2,2"
                    />
                  </>
                )}
                
                {/* 背景グロー効果（選択時のみ） */}
                {isActive && (
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={highlightColor}
                    strokeWidth={edgeWidth + 6}
                    opacity={0.3}
                    strokeLinecap="round"
                    filter="url(#strongGlow)"
                  />
                )}
                
                {/* メインエッジ */}
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={edgeColor}
                  strokeWidth={edgeWidth}
                  opacity={edgeOpacity}
                  strokeLinecap="round"
                  markerEnd={isActive ? "url(#arrowhead-highlight)" : "url(#arrowhead)"}
                  filter={isActive ? "url(#glow)" : undefined}
                  style={{
                    transition: 'all 0.3s ease',
                  }}
                />
                
                {/* 追加のアクセント効果（選択時のみ） */}
                {isActive && (
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="#ffffff"
                    strokeWidth={1}
                    opacity={0.8}
                    strokeLinecap="round"
                    style={{
                      filter: 'drop-shadow(0 0 4px rgba(0,255,136,0.6))',
                    }}
                  />
                )}
              </g>
            );
          })}
          


          {/* Cluster highlights (重み閾値フィルタリング適用) */}
          {showFilteredClusters && filteredClusters.map((cluster, index) => {
            const clusterNodes = cluster.map(id => networkData.nodes.find(n => n.id === id)).filter(Boolean);
            console.log(`🎨 [NetworkVisualization] クラスター${index}表示処理:`, {
              clusterSize: cluster.length,
              foundNodes: clusterNodes.length,
              nodeIds: cluster.slice(0, 3), // 最初の3ノードID
              willRender: clusterNodes.length >= 2
            });
            if (clusterNodes.length < 2) return null;
            
            const padding = 45; // 標準より少し小さく
            // 実際のノード位置を使用してクラスター境界を計算
            const nodePositionsInCluster = clusterNodes.map(n => {
              const pos = nodePositions[n!.id] || { x: n!.x, y: n!.y };
              const roundedPos = {
                x: Math.round(pos.x),
                y: Math.round(pos.y)
              };
              return { ...roundedPos, size: getNodeSize(n!.size) };
            });
            
            const minX = Math.min(...nodePositionsInCluster.map(n => n.x - n.size/2)) - padding;
            const maxX = Math.max(...nodePositionsInCluster.map(n => n.x + n.size/2)) + padding;
            const minY = Math.min(...nodePositionsInCluster.map(n => n.y - n.size/2)) - padding;
            const maxY = Math.max(...nodePositionsInCluster.map(n => n.y + n.size/2)) + padding;
            
            const centerX = (minX + maxX) / 2;
            const centerY = (minY + maxY) / 2;
            const radiusX = (maxX - minX) / 2;
            const radiusY = (maxY - minY) / 2;
            
            return (
              <ellipse
                key={`filtered-cluster-${index}`}
                cx={centerX}
                cy={centerY}
                rx={radiusX}
                ry={radiusY}
                fill="none"
                stroke={THEME_COLORS.primaryGreen}  // アクセント色で差別化
                strokeWidth="3"                      // 少し太く
                strokeDasharray="10,5"               // 短いダッシュ
                opacity="0.7"                        // 少し濃く
                filter="url(#strongGlow)"            // 強いグロー
              />
            );
          })}

          {/* Cluster Labels - SVG版（編集中以外） */}
          {showLabels && clusterLabels.filter(label => editingLabelId !== label.id).map((label) => {
            // テキストの長さに応じて矩形の幅を計算
            const maxLength = 16; // 最大表示文字数
            const displayText = label.text.length > maxLength 
              ? `${label.text.substring(0, maxLength - 2)}...` 
              : label.text;
            
            // 文字数に基づいて幅を動的に計算（1文字あたり約7px + パディング）
            const textWidth = displayText.length * 7;
            const rectWidth = Math.max(60, Math.min(textWidth + 20, 140)); // 最小60px、最大140px
            const rectHeight = 24;
            
            return (
              <g key={label.id} style={{ pointerEvents: 'auto' }}>
                <rect
                  x={label.position.x - rectWidth / 2}
                  y={label.position.y - rectHeight / 2}
                  width={rectWidth}
                  height={rectHeight}
                  fill={getLabelThemeColor(label.theme)}
                  fillOpacity="0.9"
                  stroke={getLabelThemeColor(label.theme)}
                  strokeWidth="1"
                  rx="12"
                  ry="12"
                  style={{ cursor: 'pointer', pointerEvents: 'auto' }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleClusterClick(label.id);
                  }}
                />
                <text
                  x={label.position.x}
                  y={label.position.y + 4}
                  textAnchor="middle"
                  fill={THEME_COLORS.textInverse}
                  fontSize="11"
                  fontWeight="600"
                  fontFamily="JetBrains Mono, monospace"
                  style={{ cursor: 'pointer', pointerEvents: 'auto' }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleClusterClick(label.id);
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation(); // クラスター詳細表示を防ぐ
                    // 新方式：クラスター詳細パネル内での編集を推奨
                    console.log('💡 ヒント: クラスターラベルをクリックして詳細パネルで編集してください');
                  }}
                >
                  {displayText}
                </text>
                {/* ツールチップ - 省略時の全文表示 + 操作案内 */}
                <title>
                  {label.text.length > maxLength ? label.text : label.text}
                  {'\n'}クリック: 詳細表示・編集
                </title>
              </g>
            );
          })}
        </svg>

        {/* Nodes */}
        <div style={styles.nodesContainer}>
          {networkData.nodes.map(node => {
            const size = getNodeSize(node.size);
            const isSelected = selectedNode === node.id;
            const isHighlighted = highlightedNodes.has(node.id);
            
            // 実際のノード位置を取得（nodePositionsがあればそれを使用、なければデフォルト位置）
            const actualPos = nodePositions[node.id] || { x: node.x, y: node.y };
            
            // 座標の精度を確保（エッジとの整合性のため）
            const roundedPos = {
              x: Math.round(actualPos.x),
              y: Math.round(actualPos.y)
            };
            
            // デバッグ用のログ（選択されたノードのみ）
            if (process.env.NODE_ENV === 'development' && isSelected) {
              console.log('[NetworkVisualization] Selected node DOM positioning debug:', {
                nodeId: node.id,
                originalNodePos: { x: node.x, y: node.y },
                nodePositionsValue: nodePositions[node.id],
                actualPos: actualPos,
                roundedPos: roundedPos,
                size: size,
                domStyle: {
                  left: roundedPos.x - size / 2,
                  top: roundedPos.y - size / 2,
                  width: size,
                  height: size
                },
                centerShouldBe: roundedPos,
                containerDimensions,
                transform
              });
            }
            
            return (
              <div
                key={node.id}
                style={{
                  ...styles.node,
                  left: roundedPos.x - size / 2,
                  top: roundedPos.y - size / 2,
                  width: size,
                  height: size,
                  background: `radial-gradient(circle, ${node.color}20 0%, ${THEME_COLORS.bgSecondary} 70%)`,
                  borderColor: isSelected ? THEME_COLORS.primaryGreen : isHighlighted ? THEME_COLORS.primaryYellow : node.color,
                  transform: isSelected ? 'scale(1.2)' : isHighlighted ? 'scale(1.1)' : 'scale(1)',
                  boxShadow: isSelected 
                    ? `0 0 20px ${THEME_COLORS.primaryGreen}60` 
                    : isHighlighted 
                    ? `0 0 15px ${THEME_COLORS.primaryYellow}50`
                    : '0 4px 12px rgba(0, 0, 0, 0.3)',
                  zIndex: isSelected ? 15 : isHighlighted ? 10 : 5,
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleNodeClick(node.id);
                }}
                onMouseEnter={(e) => {
                  // ホバー時にツールチップ表示
                  const tooltip = document.createElement('div');
                  tooltip.id = `tooltip-${node.id}`;
                  tooltip.style.cssText = `
                    position: fixed;
                    background: ${THEME_COLORS.bgSecondary};
                    border: 1px solid ${THEME_COLORS.borderPrimary};
                    border-radius: 8px;
                    padding: 12px;
                    color: ${THEME_COLORS.textPrimary};
                    font-size: 12px;
                    font-family: 'JetBrains Mono, monospace';
                    z-index: 1000;
                    max-width: 250px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                    pointer-events: none;
                  `;
                  tooltip.innerHTML = `
                    <div style="font-weight: 600; margin-bottom: 4px; color: ${THEME_COLORS.primaryGreen};">${node.title}</div>
                    <div style="font-size: 10px; color: ${THEME_COLORS.textMuted}; margin-bottom: 6px;">${node.type}</div>
                    <div style="font-size: 11px; line-height: 1.3;">${node.content.substring(0, 100)}${node.content.length > 100 ? '...' : ''}</div>
                    ${node.tags.length > 0 ? `<div style="margin-top: 6px; font-size: 10px; color: ${THEME_COLORS.primaryCyan};">#${node.tags.join(' #')}</div>` : ''}
                  `;
                  
                  const rect = e.currentTarget.getBoundingClientRect();
                  tooltip.style.left = `${rect.right + 10}px`;
                  tooltip.style.top = `${rect.top}px`;
                  
                  document.body.appendChild(tooltip);
                }}
                onMouseLeave={(e) => {
                  // ツールチップ削除
                  const tooltip = document.getElementById(`tooltip-${node.id}`);
                  if (tooltip) {
                    tooltip.remove();
                  }
                }}
              >
                {/* コンパクトなテキストラベル（常時表示） */}
                <div 
                  className="node-label"
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    fontSize: size <= 26 ? '8px' : '9px',
                    fontWeight: '600',
                    color: isSelected ? THEME_COLORS.primaryGreen : THEME_COLORS.textPrimary,
                    textAlign: 'center',
                    lineHeight: '1.1',
                    maxWidth: `${size - 4}px`,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    fontFamily: 'JetBrains Mono, monospace',
                    letterSpacing: '-0.5px',
                    textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                  }}
                >
                  {node.title.length > 8 ? node.title.substring(0, 8) + '...' : node.title}
                </div>
              </div>
            );
          })}
        </div>

        {/* Editable Cluster Labels - HTML版（編集中のみ） */}
        {showLabels && editingLabelId && clusterLabels
          .filter(label => label.id === editingLabelId)
          .map((label) => {
            // 編集中ラベルのスタイル計算
            const textWidth = Math.max(editingText.length * 8, 100); // 最小100px
            const rectWidth = Math.min(textWidth + 40, 300); // 最大300px
            const rectHeight = 28;
            
            return (
              <div
                key={`edit-${label.id}`}
                style={{
                  position: 'absolute',
                  left: label.position.x - rectWidth / 2,
                  top: label.position.y - rectHeight / 2,
                  width: rectWidth,
                  height: rectHeight,
                  background: getLabelThemeColor(label.theme),
                  borderRadius: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 100,
                  border: `2px solid ${THEME_COLORS.primaryGreen}`,
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                }}
              >
                <input
                  type="text"
                  value={editingText}
                  onChange={(e) => setEditingText(e.target.value)}
                  onKeyDown={handleLabelKeyDown}
                  onBlur={handleLabelSave}
                  autoFocus
                  style={{
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: THEME_COLORS.textInverse,
                    fontSize: '11px',
                    fontWeight: '600',
                    fontFamily: 'JetBrains Mono, monospace',
                    textAlign: 'center',
                    width: '90%',
                  }}
                  placeholder="ラベルを入力..."
                />
              </div>
            );
          })}
      </div>

      {/* New Main Menu Categories */}
      <div style={styles.mainMenuContainer}>
        {/* Relations Category */}
        <button
          style={{
            ...styles.categoryBtn,
            background: showRelationsPanel ? THEME_COLORS.primaryOrange : THEME_COLORS.bgSecondary,
            color: showRelationsPanel ? THEME_COLORS.textInverse : THEME_COLORS.textSecondary,
            borderColor: showRelationsPanel ? THEME_COLORS.primaryOrange : THEME_COLORS.borderPrimary,
          }}
          onClick={() => setShowRelationsPanel(!showRelationsPanel)}
          title="関係性の生成・管理・分析"
        >
          🔗 Relations
        </button>

        {/* Clustering Category */}
        <button
          style={{
            ...styles.categoryBtn,
            background: showClusteringControls ? THEME_COLORS.primaryGreen : THEME_COLORS.bgSecondary,
            color: showClusteringControls ? THEME_COLORS.textInverse : THEME_COLORS.textSecondary,
            borderColor: showClusteringControls ? THEME_COLORS.primaryGreen : THEME_COLORS.borderPrimary,
          }}
          onClick={() => setShowClusteringControls(!showClusteringControls)}
          title="ノードのグループ化と可視化"
        >
          🎛️ Clustering
        </button>

        {/* Theory Building Category */}
        <button
          style={{
            ...styles.categoryBtn,
            background: showGroundedTheoryManager ? THEME_COLORS.primaryPurple : THEME_COLORS.bgSecondary,
            color: showGroundedTheoryManager ? THEME_COLORS.textInverse : THEME_COLORS.textSecondary,
            borderColor: showGroundedTheoryManager ? THEME_COLORS.primaryPurple : THEME_COLORS.borderPrimary,
          }}
          onClick={() => setShowGroundedTheoryManager(!showGroundedTheoryManager)}
          title="仮説抽出と理論構築"
        >
          🧠 Theory Building
        </button>

        {/* View & Navigation Category */}
        <button
          style={{
            ...styles.categoryBtn,
            background: showViewNavigationPanel ? THEME_COLORS.primaryBlue : THEME_COLORS.bgSecondary,
            color: showViewNavigationPanel ? THEME_COLORS.textInverse : THEME_COLORS.textSecondary,
            borderColor: showViewNavigationPanel ? THEME_COLORS.primaryBlue : THEME_COLORS.borderPrimary,
          }}
          onClick={() => setShowViewNavigationPanel(!showViewNavigationPanel)}
          title="ビューポート操作・レイアウト制御"
        >
          🗺️ View & Navigation
        </button>

        {/* Search & Filter Category */}
        <button
          style={{
            ...styles.categoryBtn,
            background: showSearchFilterPanel ? THEME_COLORS.primaryCyan : THEME_COLORS.bgSecondary,
            color: showSearchFilterPanel ? THEME_COLORS.textInverse : THEME_COLORS.textSecondary,
            borderColor: showSearchFilterPanel ? THEME_COLORS.primaryCyan : THEME_COLORS.borderPrimary,
          }}
          onClick={() => setShowSearchFilterPanel(!showSearchFilterPanel)}
          title="ノード検索・フィルタリング"
        >
          🔍 Search & Filter
        </button>
      </div>

      {/* Legacy Controls (temporarily hidden) */}
      <div style={{...styles.controls, display: 'none'}}>
        {/* 統合関係性分析ボタン */}
        <button
          style={{
            ...styles.controlBtn,
            background: isAnalyzing ? THEME_COLORS.primaryOrange : THEME_COLORS.bgSecondary,
            color: isAnalyzing ? THEME_COLORS.textInverse : THEME_COLORS.textSecondary,
            borderColor: isAnalyzing ? THEME_COLORS.primaryOrange : THEME_COLORS.borderPrimary,
            cursor: isAnalyzing ? 'not-allowed' : 'pointer',
            minWidth: '180px', // 他のボタンより少し大きく
            fontWeight: '600',
          }}
          onClick={() => runUnifiedRelationshipAnalysis('incremental')}
          disabled={isAnalyzing}
          onMouseEnter={(e) => {
            if (!isAnalyzing) {
              e.currentTarget.style.background = THEME_COLORS.primaryOrange;
              e.currentTarget.style.color = THEME_COLORS.textInverse;
              e.currentTarget.style.borderColor = THEME_COLORS.primaryOrange;
              e.currentTarget.style.transform = 'translateY(-2px)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isAnalyzing) {
              e.currentTarget.style.background = THEME_COLORS.bgSecondary;
              e.currentTarget.style.color = THEME_COLORS.textSecondary;
              e.currentTarget.style.borderColor = THEME_COLORS.borderPrimary;
              e.currentTarget.style.transform = 'translateY(0)';
            }
          }}
        >
          {isAnalyzing ? 'Analyzing...' : '🔗 Relationships'}
        </button>
        
        {/* 🗑️ Relations一括削除ボタン */}
        <button
          style={{
            ...styles.controlBtn,
            background: THEME_COLORS.bgSecondary,
            color: THEME_COLORS.primaryRed,
            borderColor: THEME_COLORS.primaryRed,
            cursor: 'pointer',
            minWidth: '140px',
          }}
          onClick={async () => {
            // 削除オプション選択
            const deleteType = window.prompt(
              `Relations削除オプションを選択してください:\n\n` +
              `1: 全Relations削除\n` +
              `2: AI分析Relations削除\n` +
              `3: タグ類似性Relations削除\n` +
              `4: 推論Relations削除\n` +
              `5: 低強度Relations削除 (0.0-0.4)\n` +
              `6: 中強度Relations削除 (0.4-0.7)\n` +
              `7: 高強度Relations削除 (0.7-1.0)\n\n` +
              `番号を入力してください (1-7):`,
              '1'
            );
            
            if (!deleteType || !['1', '2', '3', '4', '5', '6', '7'].includes(deleteType)) {
              return; // キャンセルまたは無効な入力
            }
            
            // 削除設定を構築
            let deleteOptions: any = { boardId: boardState.boardId || undefined };
            let confirmMessage = '';
            
            switch (deleteType) {
              case '1':
                confirmMessage = `現在のボードの全てのRelationsを削除しますか？`;
                break;
              case '2':
                deleteOptions.relationshipType = 'ai';
                confirmMessage = `AI分析で生成されたRelationsを削除しますか？`;
                break;
              case '3':
                deleteOptions.relationshipType = 'tag_similarity';
                confirmMessage = `タグ類似性で生成されたRelationsを削除しますか？`;
                break;
              case '4':
                deleteOptions.relationshipType = 'derived';
                confirmMessage = `推論で生成されたRelationsを削除しますか？`;
                break;
              case '5':
                deleteOptions.strengthRange = { min: 0.0, max: 0.4 };
                confirmMessage = `低強度Relations (0.0-0.4) を削除しますか？`;
                break;
              case '6':
                deleteOptions.strengthRange = { min: 0.4, max: 0.7 };
                confirmMessage = `中強度Relations (0.4-0.7) を削除しますか？`;
                break;
              case '7':
                deleteOptions.strengthRange = { min: 0.7, max: 1.0 };
                confirmMessage = `高強度Relations (0.7-1.0) を削除しますか？`;
                break;
            }
            
            confirmMessage += `\n\nこの操作は元に戻せません。`;
            
            if (window.confirm(confirmMessage)) {
              try {
                console.log('🗑️ [NetworkVisualization] Relations一括削除開始:', deleteOptions);
                
                const result = await AnalysisService.bulkDeleteRelationships(deleteOptions);
                
                if (result.success) {
                  showCustomDialog(
                    '削除完了',
                    result.details,
                    () => {
                      hideCustomDialog();
                      // ネットワークデータを再読み込み
                      window.location.reload();
                    }
                  );
                } else {
                  showCustomDialog(
                    '削除エラー',
                    result.details || '削除に失敗しました',
                    () => hideCustomDialog()
                  );
                }
              } catch (error) {
                console.error('❌ [NetworkVisualization] 一括削除エラー:', error);
                showCustomDialog(
                  'エラー',
                  '一括削除中にエラーが発生しました',
                  () => hideCustomDialog()
                );
              }
            }
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = THEME_COLORS.primaryRed;
            e.currentTarget.style.color = THEME_COLORS.textInverse;
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = THEME_COLORS.bgSecondary;
            e.currentTarget.style.color = THEME_COLORS.primaryRed;
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          🗑️ Relations削除
        </button>

        {/* 🧹 Relations重複削除ボタン (一時的にコメントアウト) */}
        {/*
        <button
          style={{
            background: THEME_COLORS.bgSecondary,
            border: `1px solid ${THEME_COLORS.primaryYellow}`,
            borderRadius: '6px',
            color: THEME_COLORS.primaryYellow,
            padding: '8px 12px',
            cursor: isDeduplicating ? 'not-allowed' : 'pointer',
            minWidth: '140px',
            fontSize: '11px',
            opacity: isDeduplicating ? 0.5 : 1,
          }}
          onClick={handleRelationsDeduplication}
          disabled={isDeduplicating}
          onMouseEnter={(e) => {
            if (!isDeduplicating) {
              e.currentTarget.style.background = THEME_COLORS.primaryYellow;
              e.currentTarget.style.color = THEME_COLORS.textInverse;
              e.currentTarget.style.borderColor = THEME_COLORS.primaryYellow;
              e.currentTarget.style.transform = 'translateY(-2px)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = THEME_COLORS.bgSecondary;
            e.currentTarget.style.color = THEME_COLORS.primaryYellow;
            e.currentTarget.style.borderColor = THEME_COLORS.primaryYellow;
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          🧹 Relations重複削除
        </button>
        */}

        {/* 🎛️ パラメータ設定ボタン */}
        <button
          style={{
            background: THEME_COLORS.bgSecondary,
            border: `1px solid ${THEME_COLORS.primaryPurple}`,
            borderRadius: '6px',
            color: THEME_COLORS.primaryPurple,
            padding: '8px 12px',
            cursor: 'pointer',
            minWidth: '140px',
            fontSize: '11px',
            transition: 'all 0.2s',
          }}
          onClick={() => setShowParameterSettings(true)}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = THEME_COLORS.primaryPurple;
            e.currentTarget.style.color = '#ffffff';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = THEME_COLORS.bgSecondary;
            e.currentTarget.style.color = THEME_COLORS.primaryPurple;
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          🎛️ パラメータ設定
        </button>

        {/* 🔍 Relations品質分析ボタン */}
        <button
          style={{
            ...styles.controlBtn,
            background: THEME_COLORS.bgSecondary,
            color: THEME_COLORS.primaryCyan,
            borderColor: THEME_COLORS.primaryCyan,
            cursor: isAnalyzingRelations ? 'not-allowed' : 'pointer',
            minWidth: '140px',
            fontSize: '11px',
            opacity: isAnalyzingRelations ? 0.5 : 1,
          }}
          onClick={handleRelationsAnalysis}
          disabled={isAnalyzingRelations}
          onMouseEnter={(e) => {
            if (!isAnalyzingRelations) {
              e.currentTarget.style.background = THEME_COLORS.primaryCyan;
              e.currentTarget.style.color = THEME_COLORS.textInverse;
              e.currentTarget.style.borderColor = THEME_COLORS.primaryCyan;
              e.currentTarget.style.transform = 'translateY(-2px)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isAnalyzingRelations) {
              e.currentTarget.style.background = THEME_COLORS.bgSecondary;
              e.currentTarget.style.color = THEME_COLORS.primaryCyan;
              e.currentTarget.style.borderColor = THEME_COLORS.primaryCyan;
              e.currentTarget.style.transform = 'translateY(0)';
            }
          }}
        >
          {isAnalyzingRelations ? '🔍 分析中...' : '🔍 Relations分析'}
        </button>

        {/* 🧠 統合分析ボタン（実験版） */}
        <button
          style={{
            ...styles.controlBtn,
            background: THEME_COLORS.bgSecondary,
            color: THEME_COLORS.primaryBlue,
            borderColor: THEME_COLORS.primaryBlue,
            cursor: isUnifiedAnalyzing ? 'not-allowed' : 'pointer',
            minWidth: '160px',
            fontSize: '11px',
            opacity: isUnifiedAnalyzing ? 0.5 : 1,
            position: 'relative',
          }}
          onClick={handleUnifiedAnalysis}
          disabled={isUnifiedAnalyzing}
          onMouseEnter={(e) => {
            if (!isUnifiedAnalyzing) {
              e.currentTarget.style.background = THEME_COLORS.primaryBlue;
              e.currentTarget.style.color = THEME_COLORS.textInverse;
              e.currentTarget.style.borderColor = THEME_COLORS.primaryBlue;
              e.currentTarget.style.transform = 'translateY(-2px)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isUnifiedAnalyzing) {
              e.currentTarget.style.background = THEME_COLORS.bgSecondary;
              e.currentTarget.style.color = THEME_COLORS.primaryBlue;
              e.currentTarget.style.borderColor = THEME_COLORS.primaryBlue;
              e.currentTarget.style.transform = 'translateY(0)';
            }
          }}
        >
          {isUnifiedAnalyzing ? '🧠 統合分析中...' : '🧠 統合分析（実験版）'}
          {/* 実験版ラベル */}
          <span style={{
            position: 'absolute',
            top: '-6px',
            right: '-6px',
            background: THEME_COLORS.primaryOrange,
            color: THEME_COLORS.textInverse,
            fontSize: '8px',
            padding: '1px 4px',
            borderRadius: '6px',
            fontWeight: '600',
            lineHeight: '1'
          }}>
            β
          </span>
        </button>

        {/* 🧠 グラウンデッド・セオリー分析ボタン */}
        <button
          style={{
            ...styles.controlBtn,
            background: THEME_COLORS.bgSecondary,
            color: THEME_COLORS.primaryPurple || '#9333ea',
            borderColor: THEME_COLORS.primaryPurple || '#9333ea',
            cursor: 'pointer',
            minWidth: '160px',
            fontSize: '11px',
            opacity: 1,
          }}
          onClick={() => {
            // 新しい動作: グラウンデッド・セオリー分析管理画面を表示
            setShowGroundedTheoryManager(true);
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = THEME_COLORS.primaryPurple || '#9333ea';
            e.currentTarget.style.color = THEME_COLORS.textInverse;
            e.currentTarget.style.borderColor = THEME_COLORS.primaryPurple || '#9333ea';
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = THEME_COLORS.bgSecondary;
            e.currentTarget.style.color = THEME_COLORS.primaryPurple || '#9333ea';
            e.currentTarget.style.borderColor = THEME_COLORS.primaryPurple || '#9333ea';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          🧠 理論構築
        </button>
        
        {/* 完全分析強制実行ボタン */}
        <button
          style={{
            ...styles.controlBtn,
            background: THEME_COLORS.bgSecondary,
            color: THEME_COLORS.textSecondary,
            borderColor: THEME_COLORS.borderPrimary,
            cursor: isAnalyzing ? 'not-allowed' : 'pointer',
            minWidth: '140px',
            fontSize: '11px',
            opacity: isAnalyzing ? 0.5 : 1,
          }}
                     onClick={() => runUnifiedRelationshipAnalysis('full')}
          disabled={isAnalyzing}
          onMouseEnter={(e) => {
            if (!isAnalyzing) {
              e.currentTarget.style.background = THEME_COLORS.primaryBlue;
              e.currentTarget.style.color = THEME_COLORS.textInverse;
              e.currentTarget.style.borderColor = THEME_COLORS.primaryBlue;
              e.currentTarget.style.transform = 'translateY(-2px)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isAnalyzing) {
              e.currentTarget.style.background = THEME_COLORS.bgSecondary;
              e.currentTarget.style.color = THEME_COLORS.textSecondary;
              e.currentTarget.style.borderColor = THEME_COLORS.borderPrimary;
              e.currentTarget.style.transform = 'translateY(0)';
            }
          }}
        >
          🔄 Re-analysis
        </button>
        
        <button
          style={styles.controlBtn}
          onClick={resetView}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = THEME_COLORS.primaryGreen;
            e.currentTarget.style.color = THEME_COLORS.textInverse;
            e.currentTarget.style.borderColor = THEME_COLORS.primaryGreen;
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = THEME_COLORS.bgSecondary;
            e.currentTarget.style.color = THEME_COLORS.textSecondary;
            e.currentTarget.style.borderColor = THEME_COLORS.borderPrimary;
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          🎯 Reset View
        </button>
        
        <button
          style={styles.controlBtn}
          onClick={() => setShowMinimap(!showMinimap)}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = THEME_COLORS.primaryCyan;
            e.currentTarget.style.color = THEME_COLORS.textInverse;
            e.currentTarget.style.borderColor = THEME_COLORS.primaryCyan;
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = THEME_COLORS.bgSecondary;
            e.currentTarget.style.color = THEME_COLORS.textSecondary;
            e.currentTarget.style.borderColor = THEME_COLORS.borderPrimary;
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          {showMinimap ? '🗺️ Mini Map' : '🗺️ Mini Map'}
        </button>
        <button
          style={styles.controlBtn}
          onClick={applyForceLayout}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = THEME_COLORS.primaryGreen;
            e.currentTarget.style.color = THEME_COLORS.textInverse;
            e.currentTarget.style.borderColor = THEME_COLORS.primaryGreen;
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = THEME_COLORS.bgSecondary;
            e.currentTarget.style.color = THEME_COLORS.textSecondary;
            e.currentTarget.style.borderColor = THEME_COLORS.borderPrimary;
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          📐 Auto Layout
        </button>

        <button 
          style={{
            ...styles.controlBtn,
            opacity: 0.6,
            cursor: 'not-allowed',
            background: THEME_COLORS.bgTertiary,
            borderColor: THEME_COLORS.borderSecondary,
            color: THEME_COLORS.textMuted,
          }}
          disabled
        >
          📊 Density (TBD)
        </button>
        <button 
          style={{
            ...styles.controlBtn,
            opacity: 0.6,
            cursor: 'not-allowed',
            background: THEME_COLORS.bgTertiary,
            borderColor: THEME_COLORS.borderSecondary,
            color: THEME_COLORS.textMuted,
          }}
          disabled
        >
          💾 Export (TBD)
        </button>
        

        
        {/* クラスタリング制御ボタン */}
        <button
          style={{
            ...styles.controlBtn,
            background: showClusteringControls ? THEME_COLORS.primaryGreen : THEME_COLORS.bgSecondary,
            color: showClusteringControls ? THEME_COLORS.textInverse : THEME_COLORS.textSecondary,
            borderColor: showClusteringControls ? THEME_COLORS.primaryGreen : THEME_COLORS.borderPrimary,
          }}
          onClick={() => setShowClusteringControls(!showClusteringControls)}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = THEME_COLORS.primaryGreen;
            e.currentTarget.style.color = THEME_COLORS.textInverse;
            e.currentTarget.style.borderColor = THEME_COLORS.primaryGreen;
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            const isActive = showClusteringControls;
            e.currentTarget.style.background = isActive ? THEME_COLORS.primaryGreen : THEME_COLORS.bgSecondary;
            e.currentTarget.style.color = isActive ? THEME_COLORS.textInverse : THEME_COLORS.textSecondary;
            e.currentTarget.style.borderColor = isActive ? THEME_COLORS.primaryGreen : THEME_COLORS.borderPrimary;
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          🎛️ Clustering
        </button>
        
        {/* ビュー管理ボタン */}
        <button
          style={{
            ...styles.controlBtn,
            background: showViewManager ? THEME_COLORS.primaryBlue : THEME_COLORS.bgSecondary,
            color: showViewManager ? THEME_COLORS.textInverse : THEME_COLORS.textSecondary,
            borderColor: showViewManager ? THEME_COLORS.primaryBlue : THEME_COLORS.borderPrimary,
          }}
          onClick={() => setShowViewManager(!showViewManager)}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = THEME_COLORS.primaryBlue;
            e.currentTarget.style.color = THEME_COLORS.textInverse;
            e.currentTarget.style.borderColor = THEME_COLORS.primaryBlue;
          }}
          onMouseLeave={(e) => {
            if (!showViewManager) {
              e.currentTarget.style.background = THEME_COLORS.bgSecondary;
              e.currentTarget.style.color = THEME_COLORS.textSecondary;
              e.currentTarget.style.borderColor = THEME_COLORS.borderPrimary;
            }
          }}
        >
          💾 Views
          {currentViewName && (
            <div style={{
              fontSize: '9px',
              color: THEME_COLORS.textMuted,
              marginTop: '2px',
              textOverflow: 'ellipsis',
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              maxWidth: '100px',
            }}>
              {currentViewName}
            </div>
          )}
        </button>
      </div>
      
      {/* 旧クラスタリング制御パネル削除 - サイドピークに統合済み */}
      {false && showClusteringControls && (
        <div style={styles.clusteringControlsPanel}>
          <div style={styles.panelHeader}>
            <div style={styles.tabContainer}>
              <button
                style={{
                  ...styles.tabButton,
                  background: analysisMode === 'simple' ? THEME_COLORS.primaryGreen : THEME_COLORS.bgTertiary,
                  color: analysisMode === 'simple' ? THEME_COLORS.textInverse : THEME_COLORS.textSecondary,
                  borderColor: analysisMode === 'simple' ? THEME_COLORS.primaryGreen : THEME_COLORS.borderSecondary,
                }}
                onClick={() => setAnalysisMode('simple')}
                onMouseEnter={(e) => {
                  if (analysisMode !== 'simple') {
                    e.currentTarget.style.background = THEME_COLORS.primaryGreen;
                    e.currentTarget.style.color = THEME_COLORS.textInverse;
                    e.currentTarget.style.borderColor = THEME_COLORS.primaryGreen;
                  }
                }}
                onMouseLeave={(e) => {
                  if (analysisMode !== 'simple') {
                    e.currentTarget.style.background = THEME_COLORS.bgTertiary;
                    e.currentTarget.style.color = THEME_COLORS.textSecondary;
                    e.currentTarget.style.borderColor = THEME_COLORS.borderSecondary;
                  }
                }}
              >
                シンプル
              </button>
              <button
                style={{
                  ...styles.tabButton,
                  background: analysisMode === 'advanced' ? THEME_COLORS.primaryGreen : THEME_COLORS.bgTertiary,
                  color: analysisMode === 'advanced' ? THEME_COLORS.textInverse : THEME_COLORS.textSecondary,
                  borderColor: analysisMode === 'advanced' ? THEME_COLORS.primaryGreen : THEME_COLORS.borderSecondary,
                }}
                onClick={() => setAnalysisMode('advanced')}
                onMouseEnter={(e) => {
                  if (analysisMode !== 'advanced') {
                    e.currentTarget.style.background = THEME_COLORS.primaryGreen;
                    e.currentTarget.style.color = THEME_COLORS.textInverse;
                    e.currentTarget.style.borderColor = THEME_COLORS.primaryGreen;
                  }
                }}
                onMouseLeave={(e) => {
                  if (analysisMode !== 'advanced') {
                    e.currentTarget.style.background = THEME_COLORS.bgTertiary;
                    e.currentTarget.style.color = THEME_COLORS.textSecondary;
                    e.currentTarget.style.borderColor = THEME_COLORS.borderSecondary;
                  }
                }}
              >
                高度解析 🔬
              </button>
              <button
                style={{
                  ...styles.tabButton,
                  background: analysisMode === 'saved-views' ? THEME_COLORS.primaryGreen : THEME_COLORS.bgTertiary,
                  color: analysisMode === 'saved-views' ? THEME_COLORS.textInverse : THEME_COLORS.textSecondary,
                  borderColor: analysisMode === 'saved-views' ? THEME_COLORS.primaryGreen : THEME_COLORS.borderSecondary,
                }}
                onClick={() => setAnalysisMode('saved-views')}
                onMouseEnter={(e) => {
                  if (analysisMode !== 'saved-views') {
                    e.currentTarget.style.background = THEME_COLORS.primaryGreen;
                    e.currentTarget.style.color = THEME_COLORS.textInverse;
                    e.currentTarget.style.borderColor = THEME_COLORS.primaryGreen;
                  }
                }}
                onMouseLeave={(e) => {
                  if (analysisMode !== 'saved-views') {
                    e.currentTarget.style.background = THEME_COLORS.bgTertiary;
                    e.currentTarget.style.color = THEME_COLORS.textSecondary;
                    e.currentTarget.style.borderColor = THEME_COLORS.borderSecondary;
                  }
                }}
              >
                保存済みビュー 📚
              </button>
            </div>
            <button
              style={styles.closeButton}
              onClick={() => setShowClusteringControls(false)}
            >
              ✕
            </button>
          </div>
          
          {/* モード別コンテンツ */}
          {analysisMode === 'simple' && (
            <div>
              <div style={styles.controlGroup}>
                <label style={styles.controlLabel}>
                  <input
                    type="checkbox"
                    checked={useWeightFiltering}
                    onChange={(e) => setUseWeightFiltering(e.target.checked)}
                    style={styles.checkbox}
                  />
                  重み閾値フィルタリングを使用
                </label>
              </div>
          
          {useWeightFiltering && (
            <div style={styles.controlGroup}>
              <label style={styles.controlLabel}>
                強度閾値: {strengthThreshold.toFixed(2)}
              </label>
              <input
                type="range"
                min="0.1"
                max="0.9"
                step="0.05"
                value={strengthThreshold}
                onChange={(e) => setStrengthThreshold(parseFloat(e.target.value))}
                style={styles.slider}
              />
              <div style={styles.sliderLabels}>
                <span style={styles.sliderLabel}>0.1 (緩い)</span>
                <span style={styles.sliderLabel}>0.9 (厳格)</span>
              </div>
            </div>
          )}
          
          <div style={styles.controlGroup}>
            <label style={styles.controlLabel}>
              <input
                type="checkbox"
                checked={showFilteredClusters}
                onChange={(e) => setShowFilteredClusters(e.target.checked)}
                style={styles.checkbox}
              />
              フィルタリング結果をクラスタ表示
            </label>
          </div>
          
          <div style={styles.controlGroup}>
            <button
              style={styles.applyButton}
              onClick={async () => {
                // 既存のラベルをクリア（新しいクラスターに対応するため）
                if (showLabels) {
                  clearLabels();
                }
                
                // フィルタリングクラスターを実行
                const newClusters = detectClusters(strengthThreshold, useWeightFiltering);
                setFilteredClusters(newClusters);
                
                // レイアウトを再適用
                applyForceLayout();
                
                // フィルタリング結果を自動的に表示
                if (newClusters.length > 0) {
                  setShowFilteredClusters(true);
                  
                  // 自動ラベル生成・表示（高度解析と同じ仕様）
                  try {
                    console.log('🏷️ Auto-generating labels for simple mode clusters...');
                    const labels = await AnalysisService.generateClusterLabels(
                      boardState.boardId || '',
                      newClusters
                    );
                    
                    // ノード位置を反映してラベル位置を更新
                    const updatedLabels = labels.map(label => {
                      const clusterCards = label.cardIds.map(id => networkData.nodes.find(n => n.id === id)).filter(Boolean);
                      if (clusterCards.length === 0) return label;

                      // 実際のノード位置を使用して位置を再計算
                      const centerX = clusterCards.reduce((sum, node) => sum + (nodePositions[node!.id]?.x || node!.x), 0) / clusterCards.length;
                      const centerY = clusterCards.reduce((sum, node) => sum + (nodePositions[node!.id]?.y || node!.y), 0) / clusterCards.length;
                      const minY = Math.min(...clusterCards.map(node => (nodePositions[node!.id]?.y || node!.y)));

                      return {
                        ...label,
                        position: {
                          x: centerX,
                          y: minY - 40
                        }
                      };
                    });
                    
                    setClusterLabels(updatedLabels);
                    setShowLabels(true);
                    console.log('🏷️ Simple mode labels auto-generated successfully:', updatedLabels.length);
                  } catch (error) {
                    console.error('Failed to auto-generate simple mode labels:', error);
                    // エラーが発生してもクラスタリング自体は成功しているので、ユーザーに警告は出さない
                  }
                }
                
                console.log('🚀 Applied new clustering settings:', {
                  useWeightFiltering,
                  strengthThreshold,
                  newClusters: newClusters.length,
                  showVisualization: newClusters.length > 0,
                  labelsAutoGenerated: newClusters.length > 0
                });
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = THEME_COLORS.primaryOrange;
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = THEME_COLORS.primaryGreen;
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              適用してレイアウト更新
            </button>
          </div>
          
          {/* Auto Labels統合ボタン */}
          <div style={styles.controlGroup}>
            <button
              style={{
                ...styles.applyButton,
                background: isGeneratingLabels ? THEME_COLORS.primaryGreen : showLabels ? THEME_COLORS.primaryGreen : THEME_COLORS.bgTertiary,
                color: isGeneratingLabels || showLabels ? THEME_COLORS.textInverse : THEME_COLORS.textSecondary,
                cursor: isGeneratingLabels ? 'not-allowed' : 'pointer',
                border: `1px solid ${isGeneratingLabels ? THEME_COLORS.primaryGreen : showLabels ? THEME_COLORS.primaryGreen : THEME_COLORS.borderSecondary}`,
              }}
              onClick={showLabels ? clearLabels : generateLabels}
              disabled={isGeneratingLabels}
              onMouseEnter={(e) => {
                if (!isGeneratingLabels) {
                  e.currentTarget.style.background = THEME_COLORS.primaryGreen;
                  e.currentTarget.style.color = THEME_COLORS.textInverse;
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isGeneratingLabels) {
                  const isActive = showLabels;
                  e.currentTarget.style.background = isActive ? THEME_COLORS.primaryGreen : THEME_COLORS.bgTertiary;
                  e.currentTarget.style.color = isActive ? THEME_COLORS.textInverse : THEME_COLORS.textSecondary;
                  e.currentTarget.style.transform = 'translateY(0)';
                }
              }}
            >
              {isGeneratingLabels ? 'ラベル生成中...' : showLabels ? 'ラベルクリア' : 'Auto Labels'}
            </button>
          </div>
          
          <div style={styles.debugInfo}>
            <small style={styles.debugText}>
              総エッジ数: {networkData.edges.length} | 
              フィルタ後: {useWeightFiltering ? networkData.edges.filter(e => e.strength >= strengthThreshold).length : networkData.edges.length}<br/>
              クラスタ数: {filteredClusters.length} | 
              表示中: {showFilteredClusters ? '🟢表示' : '❌非表示'}<br/>
              ラベル: {showLabels ? `🏷️ ${clusterLabels.length}個表示中` : '❌非表示'}
            </small>
          </div>
            </div>
          )}
          
          {/* 高度解析モード */}
          {analysisMode === 'advanced' && (
            <div>
              {/* アルゴリズム選択 */}
              <div style={styles.controlGroup}>
                <label style={styles.controlLabel}>
                  🧮 クラスタリングアルゴリズム
                </label>
                <select
                  value={advancedConfig.algorithm}
                  onChange={(e) => setAdvancedConfig(prev => ({
                    ...prev,
                    algorithm: e.target.value as 'hdbscan' | 'dbscan' | 'kmeans' | 'hierarchical'
                  }))}
                  style={{
                    ...styles.select,
                    width: '100%',
                    marginTop: '4px'
                  }}
                >
                  <option value="hdbscan">HDBSCAN (階層密度ベース) 🚀</option>
                  <option value="dbscan">DBSCAN (密度ベース)</option>
                  <option value="kmeans">K-means (重心ベース)</option>
                  <option value="hierarchical">階層クラスタリング</option>
                </select>
                
                {/* アルゴリズム説明と最適化ボタン */}
                <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#f8f9fa', borderRadius: '4px', fontSize: '12px' }}>
                  {advancedConfig.algorithm === 'hdbscan' && (
                    <div>
                      <span style={{ color: '#28a745' }}>
                        🚀 <strong>HDBSCAN推奨:</strong> 変動密度対応、外れ値検出、パラメータ調整不要
                      </span>
                      <div style={{ marginTop: '8px' }}>
                        <button
                          onClick={() => {
                            const nodeCount = networkData.nodes.length;
                            const optimalMinSize = Math.max(2, Math.min(4, Math.floor(nodeCount / 20)));
                            const optimalMaxSize = Math.max(6, Math.min(12, Math.floor(nodeCount / 8)));
                            const optimalThreshold = nodeCount > 100 ? 0.3 : 0.4;
                            
                            setAdvancedConfig(prev => ({
                              ...prev,
                              clustering: {
                                ...prev.clustering,
                                minClusterSize: optimalMinSize,
                                maxClusterSize: optimalMaxSize,
                                similarityThreshold: optimalThreshold
                              }
                            }));
                            
                            console.log(`🎯 HDBSCAN最適化: ${nodeCount}ノード用設定 (min:${optimalMinSize}, max:${optimalMaxSize}, threshold:${optimalThreshold})`);
                          }}
                          style={{
                            backgroundColor: '#28a745',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '4px 8px',
                            fontSize: '11px',
                            cursor: 'pointer'
                          }}
                        >
                          🎯 自動最適化 ({networkData.nodes.length}ノード用)
                        </button>
                        <button
                          onClick={() => {
                            // 一時的に直接console.logを使用（インポートエラー回避）
                            console.clear();
                            console.log('🔍 [HDBSCAN] === デバッグセッション開始 ===');
                            console.log(`🔍 [HDBSCAN] データセット: ${networkData.nodes.length}ノード, ${networkData.edges.length}エッジ`);
                            console.log(`🔍 [HDBSCAN] カード数: ${cards.length}`);
                            
                            // ノードの分布チェック
                            const nodeTypes = cards.reduce((acc, card) => {
                              acc[card.column_type] = (acc[card.column_type] || 0) + 1;
                              return acc;
                            }, {} as Record<string, number>);
                            console.log('📊 [HDBSCAN] ノードタイプ分布:', nodeTypes);
                            
                            // エッジ重み分布
                            const edgeWeights = networkData.edges.map(e => e.weight || 0);
                            const avgWeight = edgeWeights.reduce((sum, w) => sum + w, 0) / edgeWeights.length;
                            console.log(`📏 [HDBSCAN] エッジ重み: avg=${avgWeight.toFixed(3)}, min=${Math.min(...edgeWeights).toFixed(3)}, max=${Math.max(...edgeWeights).toFixed(3)}`);
                            
                            // 現在の設定表示
                            console.log('⚙️ [HDBSCAN] 現在設定:', advancedConfig);
                            
                            console.log('💡 [HDBSCAN] 次に「高度解析実行」をクリックしてデバッグログを確認してください');
                          }}
                          style={{
                            backgroundColor: '#17a2b8',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '4px 8px',
                            fontSize: '11px',
                            cursor: 'pointer',
                            marginLeft: '4px'
                          }}
                        >
                          🔍 詳細診断
                        </button>
                      </div>
                    </div>
                  )}
                  {advancedConfig.algorithm === 'dbscan' && (
                    <span style={{ color: '#6c757d' }}>
                      📊 <strong>DBSCAN:</strong> 従来の密度ベース、固定密度、パラメータ調整必要
                    </span>
                  )}
                  {advancedConfig.algorithm === 'kmeans' && (
                    <span style={{ color: '#ffc107' }}>
                      ⭕ <strong>K-means:</strong> 重心ベース、球形クラスター、クラスター数指定必要
                    </span>
                  )}
                  {advancedConfig.algorithm === 'hierarchical' && (
                    <span style={{ color: '#17a2b8' }}>
                      🌳 <strong>階層:</strong> デンドログラム構築、全距離計算、計算コスト高
                    </span>
                  )}
                </div>
              </div>

              {/* 類似性重み設定 */}
              <div style={styles.controlGroup}>
                <label style={styles.controlLabel}>
                  ⚖️ 類似性重み設定
                </label>
                
                <div style={{ marginTop: '8px' }}>
                  <div style={styles.sliderGroup}>
                    <label style={styles.sliderLabel}>
                      エッジ強度: {advancedConfig.weights.edgeStrength.toFixed(1)}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={advancedConfig.weights.edgeStrength}
                      onChange={(e) => setAdvancedConfig(prev => ({
                        ...prev,
                        weights: {
                          ...prev.weights,
                          edgeStrength: parseFloat(e.target.value)
                        }
                      }))}
                      style={styles.slider}
                    />
                  </div>
                  
                  <div style={styles.sliderGroup}>
                    <label style={styles.sliderLabel}>
                      タグ類似性: {advancedConfig.weights.tagSimilarity.toFixed(1)}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={advancedConfig.weights.tagSimilarity}
                      onChange={(e) => setAdvancedConfig(prev => ({
                        ...prev,
                        weights: {
                          ...prev.weights,
                          tagSimilarity: parseFloat(e.target.value)
                        }
                      }))}
                      style={styles.slider}
                    />
                  </div>
                  
                  <div style={styles.sliderGroup}>
                    <label style={styles.sliderLabel}>
                      意味的類似性: {advancedConfig.weights.semanticSimilarity.toFixed(1)}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={advancedConfig.weights.semanticSimilarity}
                      onChange={(e) => setAdvancedConfig(prev => ({
                        ...prev,
                        weights: {
                          ...prev.weights,
                          semanticSimilarity: parseFloat(e.target.value)
                        }
                      }))}
                      style={styles.slider}
                    />
                  </div>
                </div>
              </div>

              {/* クラスタリングパラメータ */}
              <div style={styles.controlGroup}>
                <label style={styles.controlLabel}>
                  🎯 クラスタリングパラメータ
                </label>
                
                <div style={{ marginTop: '8px' }}>
                  <div style={styles.sliderGroup}>
                    <label style={styles.sliderLabel}>
                      最小クラスタサイズ: {advancedConfig.clustering.minClusterSize}
                    </label>
                    <input
                      type="range"
                      min="2"
                      max="6"
                      step="1"
                      value={advancedConfig.clustering.minClusterSize}
                      onChange={(e) => setAdvancedConfig(prev => ({
                        ...prev,
                        clustering: {
                          ...prev.clustering,
                          minClusterSize: parseInt(e.target.value)
                        }
                      }))}
                      style={styles.slider}
                    />
                  </div>
                  
                  <div style={styles.sliderGroup}>
                    <label style={styles.sliderLabel}>
                      最大クラスタサイズ: {advancedConfig.clustering.maxClusterSize}
                    </label>
                    <input
                      type="range"
                      min="4"
                      max="15"
                      step="1"
                      value={advancedConfig.clustering.maxClusterSize}
                      onChange={(e) => setAdvancedConfig(prev => ({
                        ...prev,
                        clustering: {
                          ...prev.clustering,
                          maxClusterSize: parseInt(e.target.value)
                        }
                      }))}
                      style={styles.slider}
                    />
                  </div>
                  
                  <div style={styles.sliderGroup}>
                    <label style={styles.sliderLabel}>
                      類似性閾値: {advancedConfig.clustering.similarityThreshold.toFixed(1)}
                    </label>
                    <input
                      type="range"
                      min="0.1"
                      max="0.9"
                      step="0.1"
                      value={advancedConfig.clustering.similarityThreshold}
                      onChange={(e) => setAdvancedConfig(prev => ({
                        ...prev,
                        clustering: {
                          ...prev.clustering,
                          similarityThreshold: parseFloat(e.target.value)
                        }
                      }))}
                      style={styles.slider}
                    />
                  </div>
                </div>
              </div>

              {/* ラベリング設定 */}
              <div style={styles.controlGroup}>
                <label style={styles.controlLabel}>
                  <input
                    type="checkbox"
                    checked={advancedConfig.labeling.useSemanticLabeling}
                    onChange={(e) => setAdvancedConfig(prev => ({
                      ...prev,
                      labeling: {
                        ...prev.labeling,
                        useSemanticLabeling: e.target.checked
                      }
                    }))}
                    style={styles.checkbox}
                  />
                  🏷️ 高度なセマンティックラベリングを使用
                </label>
              </div>

              {/* 実行ボタン */}
              <div style={styles.controlGroup}>
                <button
                  style={{
                    ...styles.applyButton,
                    background: THEME_COLORS.primaryBlue,
                    borderColor: THEME_COLORS.primaryBlue,
                  }}
                  onClick={performAdvancedClustering}
                  disabled={isAdvancedAnalyzing}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = THEME_COLORS.primaryCyan;
                    e.currentTarget.style.borderColor = THEME_COLORS.primaryCyan;
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = THEME_COLORS.primaryBlue;
                    e.currentTarget.style.borderColor = THEME_COLORS.primaryBlue;
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  {isAdvancedAnalyzing ? '🔬 解析中...' : '🚀 高度解析実行'}
                </button>
              </div>

              {/* Auto Labels (高度解析版) */}
              <div style={styles.controlGroup}>
                <button
                  style={{
                    ...styles.applyButton,
                    background: showLabels ? THEME_COLORS.primaryRed : THEME_COLORS.primaryPurple,
                    borderColor: showLabels ? THEME_COLORS.primaryRed : THEME_COLORS.primaryPurple,
                    opacity: isGeneratingLabels ? 0.7 : 1,
                    cursor: isGeneratingLabels ? 'not-allowed' : 'pointer',
                  }}
                  onClick={async () => {
                    if (isGeneratingLabels) return;
                    
                    if (showLabels) {
                      // ラベルクリア
                      setShowLabels(false);
                      setClusterLabels([]);
                      console.log('🏷️ Advanced labels cleared');
                                          } else {
                        // 高度解析のラベル再生成
                        if (smartClusteringResult && smartClusteringResult.clusters.length > 0) {
                          setIsGeneratingLabels(true);
                          try {
                            console.log('🏷️ Regenerating advanced semantic labels with current node positions...');
                            
                            // SmartClusteringResultから既存のラベルを再表示（現在のノード位置で更新）
                            const smartLabels: ClusterLabel[] = smartClusteringResult.clusters.map((cluster, index) => {
                              // クラスター内のカードを取得
                              const clusterCards = cluster.nodes.map(id => networkData.nodes.find(n => n.id === id)).filter(Boolean);
                              
                              // 現在のノード位置を使用してラベル位置を再計算
                              let centerX, centerY, minY;
                              
                              if (clusterCards.length > 0) {
                                // 実際のノード位置を使用して位置を再計算
                                centerX = clusterCards.reduce((sum, node) => sum + (nodePositions[node!.id]?.x || node!.x), 0) / clusterCards.length;
                                centerY = clusterCards.reduce((sum, node) => sum + (nodePositions[node!.id]?.y || node!.y), 0) / clusterCards.length;
                                minY = Math.min(...clusterCards.map(node => (nodePositions[node!.id]?.y || node!.y)));
                              } else {
                                // フォールバック: 元のcentroid位置を使用
                                centerX = cluster.centroid.x;
                                centerY = cluster.centroid.y;
                                minY = cluster.centroid.y;
                              }
                              
                              return {
                                id: `smart-cluster-${index}`,
                                text: cluster.suggestedLabel,
                                cardIds: cluster.nodes,
                                position: {
                                  x: centerX,
                                  y: minY - 40 // ラベルをクラスターの上40px
                                },
                                theme: cluster.semanticTheme || 'default',
                                confidence: cluster.confidence,
                                metadata: {
                                  dominantTags: cluster.dominantTags,
                                  dominantTypes: cluster.dominantTypes,
                                  cardCount: cluster.nodes.length
                                }
                              };
                            });
                            
                            setClusterLabels(smartLabels);
                            setShowLabels(true);
                            console.log('🏷️ Advanced labels regenerated with updated positions successfully');
                          } catch (error) {
                            console.error('Failed to regenerate advanced labels:', error);
                          } finally {
                            setIsGeneratingLabels(false);
                          }
                        } else {
                        showCustomDialog(
                          '高度解析が必要',
                          'ラベル表示には先に「🚀 高度解析実行」を行ってください。',
                          () => hideCustomDialog()
                        );
                      }
                    }
                  }}
                  onMouseEnter={(e) => {
                    if (!isGeneratingLabels) {
                      const hoverColor = showLabels ? THEME_COLORS.primaryRed : THEME_COLORS.primaryCyan;
                      e.currentTarget.style.background = hoverColor;
                      e.currentTarget.style.borderColor = hoverColor;
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isGeneratingLabels) {
                      const originalColor = showLabels ? THEME_COLORS.primaryRed : THEME_COLORS.primaryPurple;
                      e.currentTarget.style.background = originalColor;
                      e.currentTarget.style.borderColor = originalColor;
                      e.currentTarget.style.transform = 'translateY(0)';
                    }
                  }}
                >
                  {isGeneratingLabels ? '🔬 高度ラベル生成中...' : showLabels ? '🏷️ ラベルクリア' : '🔬 高度Auto Labels'}
                </button>
              </div>
              
              {/* 高度解析統計情報 */}
              <div style={styles.debugInfo}>
                <small style={styles.debugText}>
                  アルゴリズム: {advancedConfig.algorithm.toUpperCase()}{advancedConfig.algorithm === 'hdbscan' ? ' 🚀' : ''}<br/>
                  重み配分: E{advancedConfig.weights.edgeStrength.toFixed(1)} | T{advancedConfig.weights.tagSimilarity.toFixed(1)} | S{advancedConfig.weights.semanticSimilarity.toFixed(1)}<br/>
                  クラスタサイズ: {advancedConfig.clustering.minClusterSize}-{advancedConfig.clustering.maxClusterSize} | 閾値: {advancedConfig.clustering.similarityThreshold.toFixed(1)}<br/>
                  セマンティック: {advancedConfig.labeling.useSemanticLabeling ? '🟢有効' : '❌無効'}
                </small>
              </div>
            </div>
          )}
          
          {/* 保存済みビューモード */}
          {analysisMode === 'saved-views' && (
            <div style={{ padding: '16px 0' }}>
              <ClusterViewManager
                boardId={boardState.boardId || ''}
                onLoadView={handleLoadClusterView}
                onClose={() => setShowClusteringControls(false)}
              />
              
              {/* 現在のクラスターを保存ボタン */}
              {canSaveCluster() && (
                <div style={{
                  marginTop: '16px',
                  paddingTop: '16px',
                  borderTop: `1px solid ${THEME_COLORS.borderSecondary}`
                }}>
                  <button
                    style={{
                      ...styles.applyButton,
                      background: THEME_COLORS.primaryGreen,
                      borderColor: THEME_COLORS.primaryGreen,
                      width: '100%'
                    }}
                    onClick={() => setShowSaveClusterDialog(true)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = THEME_COLORS.primaryGreenDark;
                      e.currentTarget.style.borderColor = THEME_COLORS.primaryGreenDark;
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = THEME_COLORS.primaryGreen;
                      e.currentTarget.style.borderColor = THEME_COLORS.primaryGreen;
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    💾 現在のクラスターを保存
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ビュー管理パネル */}
      {showViewManager && (
        <div style={{
          ...styles.clusteringControlsPanel,
          top: '60px',
          left: '520px', // Clusteringパネルの右側に配置
          width: '300px',
        }}>
          <div style={styles.panelHeader}>
            <div style={styles.panelTitle}>
              💾 ビュー管理
            </div>
            <button
              style={{
                background: 'transparent',
                border: 'none',
                color: THEME_COLORS.textMuted,
                fontSize: '16px',
                cursor: 'pointer',
                padding: '0',
              }}
              onClick={() => setShowViewManager(false)}
            >
              ×
            </button>
          </div>

          {/* 現在のビュー保存 */}
          <div style={styles.controlGroup}>
            <button
              style={{
                ...styles.applyButton,
                background: THEME_COLORS.primaryGreen,
                borderColor: THEME_COLORS.primaryGreen,
              }}
              onClick={() => setIsCreatingView(true)}
            >
              💾 現在の状態を保存
            </button>
          </div>

          {/* ビュー作成モーダル */}
          {isCreatingView && (
            <div style={{
              background: THEME_COLORS.bgTertiary,
              border: `1px solid ${THEME_COLORS.borderSecondary}`,
              borderRadius: '6px',
              padding: '12px',
              marginBottom: '12px',
            }}>
              <div style={{
                color: THEME_COLORS.textPrimary,
                fontSize: '12px',
                fontWeight: '600',
                marginBottom: '8px',
              }}>
                ビュー名を入力
              </div>
              <input
                type="text"
                value={newViewName}
                onChange={(e) => setNewViewName(e.target.value)}
                placeholder="例: クラスター分析 v1"
                style={{
                  width: '100%',
                  background: THEME_COLORS.bgPrimary,
                  border: `1px solid ${THEME_COLORS.borderPrimary}`,
                  borderRadius: '4px',
                  color: THEME_COLORS.textPrimary,
                  padding: '6px',
                  fontSize: '11px',
                  marginBottom: '8px',
                  outline: 'none',
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newViewName.trim()) {
                    saveCurrentView(newViewName.trim());
                  } else if (e.key === 'Escape') {
                    setIsCreatingView(false);
                    setNewViewName('');
                  }
                }}
                autoFocus
              />
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  style={{
                    background: THEME_COLORS.primaryGreen,
                    border: 'none',
                    borderRadius: '4px',
                    color: THEME_COLORS.textInverse,
                    padding: '4px 8px',
                    fontSize: '10px',
                    cursor: 'pointer',
                    flex: 1,
                  }}
                  onClick={() => {
                    if (newViewName.trim()) {
                      saveCurrentView(newViewName.trim());
                    }
                  }}
                  disabled={!newViewName.trim()}
                >
                  保存
                </button>
                <button
                  style={{
                    background: THEME_COLORS.textMuted,
                    border: 'none',
                    borderRadius: '4px',
                    color: THEME_COLORS.textInverse,
                    padding: '4px 8px',
                    fontSize: '10px',
                    cursor: 'pointer',
                    flex: 1,
                  }}
                  onClick={() => {
                    setIsCreatingView(false);
                    setNewViewName('');
                  }}
                >
                  キャンセル
                </button>
              </div>
            </div>
          )}

          {/* 保存されたビュー一覧 */}
          <div style={{
            color: THEME_COLORS.textMuted,
            fontSize: '11px',
            marginBottom: '8px',
            fontFamily: 'JetBrains Mono, monospace',
          }}>
            保存済みビュー ({savedViews.length})
          </div>

          {savedViews.length === 0 ? (
            <div style={{
              color: THEME_COLORS.textMuted,
              fontSize: '10px',
              textAlign: 'center',
              padding: '16px',
              fontStyle: 'italic',
            }}>
              保存されたビューがありません
            </div>
          ) : (
            <div style={{
              maxHeight: '200px',
              overflowY: 'auto',
            }}>
              {savedViews.map((view) => (
                <div
                  key={view.id}
                  style={{
                    background: currentViewName === view.name ? THEME_COLORS.bgQuaternary : THEME_COLORS.bgTertiary,
                    border: `1px solid ${currentViewName === view.name ? THEME_COLORS.primaryBlue : THEME_COLORS.borderSecondary}`,
                    borderRadius: '4px',
                    padding: '8px',
                    marginBottom: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = THEME_COLORS.primaryBlue;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = currentViewName === view.name ? THEME_COLORS.primaryBlue : THEME_COLORS.borderSecondary;
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '4px',
                  }}>
                    <div
                      style={{
                        color: THEME_COLORS.textPrimary,
                        fontSize: '11px',
                        fontWeight: '600',
                        flex: 1,
                        marginRight: '8px',
                        lineHeight: '1.3',
                      }}
                      onClick={() => loadView(view)}
                    >
                      {view.name}
                    </div>
                    <button
                      style={{
                        background: THEME_COLORS.primaryRed,
                        border: 'none',
                        borderRadius: '2px',
                        color: THEME_COLORS.textInverse,
                        padding: '2px 4px',
                        fontSize: '8px',
                        cursor: 'pointer',
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`ビュー「${view.name}」を削除しますか？`)) {
                          deleteView(view.id);
                        }
                      }}
                      title="削除"
                    >
                      🗑️
                    </button>
                  </div>
                  <div style={{
                    color: THEME_COLORS.textMuted,
                    fontSize: '9px',
                  }}>
                    {new Date(view.createdAt).toLocaleDateString('ja-JP')}
                  </div>
                  {view.description && (
                    <div style={{
                      color: THEME_COLORS.textSecondary,
                      fontSize: '9px',
                      marginTop: '2px',
                    }}>
                      {view.description}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Metrics Panel */}
      <div style={{
        ...styles.panel,
        top: '20px',
        right: '20px',
        padding: '12px',
        minWidth: '180px',
      }}>
        <div style={{
          color: THEME_COLORS.primaryGreen,
          fontSize: '12px',
          fontWeight: '600',
          marginBottom: '8px',
          fontFamily: 'JetBrains Mono, monospace',
        }}>
          📊 Network Stats
        </div>
        <div style={{
          color: THEME_COLORS.textSecondary,
          fontSize: '10px',
          marginBottom: '2px',
        }}>
          Nodes: {networkData.metrics?.totalNodes || 0}
        </div>
        <div style={{
          color: THEME_COLORS.textSecondary,
          fontSize: '10px',
          marginBottom: '2px',
        }}>
          Edges: {networkData.metrics?.totalEdges || 0}
        </div>
        <div style={{
          color: THEME_COLORS.textSecondary,
          fontSize: '10px',
          marginBottom: '2px',
        }}>
          Density: {networkData.metrics ? (networkData.metrics.networkDensity * 100).toFixed(1) : 0}%
        </div>
        {/* 動的密度管理情報 */}
        <div style={{
          color: THEME_COLORS.primaryGreen,
          fontSize: '9px',
          marginBottom: '2px',
          borderTop: `1px solid ${THEME_COLORS.borderSecondary}`,
          paddingTop: '4px',
        }}>
          Area: {Math.round(containerDimensions.width)}×{Math.round(containerDimensions.height)}
        </div>
        <div style={{
          color: THEME_COLORS.primaryGreen,
          fontSize: '9px',
        }}>
          Layout Density: {calculateActualDensity() > 0 ? calculateActualDensity().toFixed(3) : 'Calculating...'}
        </div>
      </div>

      {/* Collapsible Filter Panel */}
      <div style={{
        ...styles.panel,
        bottom: '20px',
        left: '20px',
        minWidth: isFilterPanelCollapsed ? '120px' : '220px',
        maxHeight: isFilterPanelCollapsed ? '50px' : '400px',
        overflow: 'hidden',
        transition: 'all 0.3s ease',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: isFilterPanelCollapsed ? '0' : '12px',
        }}>
          <div style={{
            display: 'flex',
            gap: '4px',
            flex: 1,
          }}>
            {(['nodes', 'relationships', 'clusters'] as const).map(tab => (
              <button
                key={tab}
                style={{
                  background: activeFilterTab === tab ? THEME_COLORS.primaryBlue : 'transparent',
                  border: `1px solid ${activeFilterTab === tab ? THEME_COLORS.primaryBlue : THEME_COLORS.borderSecondary}`,
                  borderRadius: '4px',
                  color: activeFilterTab === tab ? THEME_COLORS.textInverse : THEME_COLORS.textSecondary,
                  padding: '4px 8px',
                  fontSize: '10px',
                  fontWeight: '500',
                  fontFamily: 'JetBrains Mono, monospace',
          cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveFilterTab(tab);
                }}
                onMouseEnter={(e) => {
                  if (activeFilterTab !== tab) {
                    e.currentTarget.style.borderColor = THEME_COLORS.primaryBlue;
                    e.currentTarget.style.color = THEME_COLORS.primaryBlue;
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeFilterTab !== tab) {
                    e.currentTarget.style.borderColor = THEME_COLORS.borderSecondary;
                    e.currentTarget.style.color = THEME_COLORS.textSecondary;
                  }
                }}
              >
                {tab === 'nodes' ? '🎯 Nodes' : 
                 tab === 'relationships' ? '🔗 Relations' : 
                 '🌐 Clusters'}
              </button>
            ))}
          </div>
          <button
            style={{
              background: 'transparent',
              border: 'none',
            color: THEME_COLORS.textMuted,
            fontSize: '12px',
              cursor: 'pointer',
            transform: isFilterPanelCollapsed ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.3s ease',
              padding: '4px',
            }}
            onClick={() => setIsFilterPanelCollapsed(!isFilterPanelCollapsed)}
          >
            ▼
          </button>
        </div>
        
        {!isFilterPanelCollapsed && (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            <style>
              {`
                @keyframes fadeIn {
                  from { opacity: 0; transform: translateY(-10px); }
                  to { opacity: 1; transform: translateY(0); }
                }
              `}
            </style>
        
            {/* Nodes Tab */}
            {activeFilterTab === 'nodes' && (
              <div>
        <div style={{ marginBottom: '16px' }}>
          <div style={{
            color: THEME_COLORS.textMuted,
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginBottom: '8px',
            fontFamily: 'JetBrains Mono, monospace',
          }}>
            Tags
          </div>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '6px',
          }}>
            {['ux', 'psychology', 'design', 'research', 'behavior'].map(tag => {
              const isSelected = activeFilters.tags.includes(tag);
              
              return (
                <button
                  key={tag}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: isSelected ? THEME_COLORS.primaryGreen : '#333366',
                    padding: '2px 6px',
                    borderRadius: THEME_COLORS.borderRadius.small,
                    fontSize: '10px',
                    fontWeight: '500',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    fontFamily: 'JetBrains Mono, monospace',
                    border: `1px solid ${isSelected ? THEME_COLORS.primaryGreen : '#45475a'}`,
                    color: isSelected ? '#fff' : '#a6adc8',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    transform: isSelected ? 'translateY(-1px)' : 'translateY(0)',
                    boxShadow: isSelected ? '0 4px 12px rgba(0,255,136,0.3)' : 'none',
                  }}
                  onClick={() => toggleTagFilter(tag)}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = THEME_COLORS.primaryGreen;
                      e.currentTarget.style.color = '#fff';
                      e.currentTarget.style.borderColor = THEME_COLORS.primaryGreen;
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,255,136,0.3)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = '#333366';
                      e.currentTarget.style.color = '#a6adc8';
                      e.currentTarget.style.borderColor = '#45475a';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }
                  }}
                >
                  {tag.toUpperCase()}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div style={{
            color: THEME_COLORS.textMuted,
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginBottom: '8px',
            fontFamily: 'JetBrains Mono, monospace',
          }}>
            Type
          </div>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '6px',
          }}>
            {['QUESTIONS', 'INSIGHTS', 'ACTIONS', 'THEMES', 'INBOX'].map(type => {
              const isSelected = activeFilters.types.includes(type);
              
              // ボードのバッジと同じタイプ別アイコンと色分け
              const getTypeConfig = (type: string) => {
                switch(type) {
                  case 'INSIGHTS':
                    return {
                      icon: '💡',
                      background: isSelected ? 'rgba(156,39,176,0.2)' : THEME_COLORS.bgTertiary,
                      color: isSelected ? '#9c27b0' : THEME_COLORS.textSecondary,
                      borderColor: isSelected ? '#9c27b0' : THEME_COLORS.borderSecondary,
                      hoverBg: 'rgba(156,39,176,0.2)',
                      hoverColor: '#9c27b0',
                      hoverBorder: '#9c27b0',
                    };
                  case 'THEMES':
                    return {
                      icon: '🎯',
                      background: isSelected ? 'rgba(100,181,246,0.2)' : THEME_COLORS.bgTertiary,
                      color: isSelected ? '#64b5f6' : THEME_COLORS.textSecondary,
                      borderColor: isSelected ? '#64b5f6' : THEME_COLORS.borderSecondary,
                      hoverBg: 'rgba(100,181,246,0.2)',
                      hoverColor: '#64b5f6',
                      hoverBorder: '#64b5f6',
                    };
                  case 'QUESTIONS':
                    return {
                      icon: '❓',
                      background: isSelected ? 'rgba(255,211,61,0.2)' : THEME_COLORS.bgTertiary,
                      color: isSelected ? '#ffd93d' : THEME_COLORS.textSecondary,
                      borderColor: isSelected ? '#ffd93d' : THEME_COLORS.borderSecondary,
                      hoverBg: 'rgba(255,211,61,0.2)',
                      hoverColor: '#ffd93d',
                      hoverBorder: '#ffd93d',
                    };
                  case 'ACTIONS':
                    return {
                      icon: '⚡',
                      background: isSelected ? 'rgba(255,165,0,0.2)' : THEME_COLORS.bgTertiary,
                      color: isSelected ? '#ffa500' : THEME_COLORS.textSecondary,
                      borderColor: isSelected ? '#ffa500' : THEME_COLORS.borderSecondary,
                      hoverBg: 'rgba(255,165,0,0.2)',
                      hoverColor: '#ffa500',
                      hoverBorder: '#ffa500',
                    };
                  case 'INBOX':
                    return {
                      icon: '📥',
                      background: isSelected ? 'rgba(117,117,117,0.2)' : THEME_COLORS.bgTertiary,
                      color: isSelected ? '#6c7086' : THEME_COLORS.textSecondary,
                      borderColor: isSelected ? '#6c7086' : THEME_COLORS.borderSecondary,
                      hoverBg: 'rgba(117,117,117,0.2)',
                      hoverColor: '#6c7086',
                      hoverBorder: '#6c7086',
                    };
                  default:
                    return {
                      icon: '●',
                      background: isSelected ? THEME_COLORS.primaryGreen : THEME_COLORS.bgTertiary,
                      color: isSelected ? THEME_COLORS.textInverse : THEME_COLORS.textSecondary,
                      borderColor: isSelected ? THEME_COLORS.primaryGreen : THEME_COLORS.borderSecondary,
                      hoverBg: THEME_COLORS.primaryGreen,
                      hoverColor: THEME_COLORS.textInverse,
                      hoverBorder: THEME_COLORS.primaryGreen,
                    };
                }
              };
              
              const typeConfig = getTypeConfig(type);
              
              return (
                <button
                  key={type}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: typeConfig.background,
                    padding: '2px 6px',
                    borderRadius: THEME_COLORS.borderRadius.small,
                    fontSize: '10px',
                    fontWeight: '500',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    fontFamily: 'JetBrains Mono, monospace',
                    border: `1px solid ${typeConfig.borderColor}`,
                    color: typeConfig.color,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    transform: isSelected ? 'translateY(-1px)' : 'translateY(0)',
                    boxShadow: isSelected ? '0 4px 12px rgba(0,255,136,0.2)' : 'none',
                  }}
                  onClick={() => toggleTypeFilter(type)}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = typeConfig.hoverBg;
                      e.currentTarget.style.color = typeConfig.hoverColor;
                      e.currentTarget.style.borderColor = typeConfig.hoverBorder;
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,255,136,0.2)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = THEME_COLORS.bgTertiary;
                      e.currentTarget.style.color = THEME_COLORS.textSecondary;
                      e.currentTarget.style.borderColor = THEME_COLORS.borderSecondary;
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }
                  }}
                >
                  <span style={{ fontSize: '10px' }}>{typeConfig.icon}</span>
                  {type}
                </button>
              );
            })}
          </div>
        </div>
          </div>
        )}
            
            {/* Relationships Tab */}
            {activeFilterTab === 'relationships' && (
              <div>
                <div style={{ marginBottom: '16px' }}>
                  <div style={{
                    color: THEME_COLORS.textMuted,
                    fontSize: '11px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    marginBottom: '8px',
                    fontFamily: 'JetBrains Mono, monospace',
                  }}>
                    Relationships
      </div>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '6px',
          }}>
            {['manual', 'semantic', 'derived', 'tag_similarity', 'ai'].map(relationshipType => {
              const isSelected = activeFilters.relationships.includes(relationshipType);
              
              // 関連性タイプ別の設定
              const getRelationshipConfig = (type: string) => {
                switch(type) {
                  case 'manual':
                    return {
                      icon: '👥',
                      label: 'Manual',
                      background: isSelected ? 'rgba(0,255,136,0.2)' : THEME_COLORS.bgTertiary,
                      color: isSelected ? THEME_COLORS.primaryGreen : THEME_COLORS.textSecondary,
                      borderColor: isSelected ? THEME_COLORS.primaryGreen : THEME_COLORS.borderSecondary,
                      hoverBg: 'rgba(0,255,136,0.2)',
                      hoverColor: THEME_COLORS.primaryGreen,
                      hoverBorder: THEME_COLORS.primaryGreen,
                    };
                  case 'semantic':
                    return {
                      icon: '🧠',
                      label: 'Semantic',
                      background: isSelected ? 'rgba(255,165,0,0.2)' : THEME_COLORS.bgTertiary,
                      color: isSelected ? THEME_COLORS.primaryOrange : THEME_COLORS.textSecondary,
                      borderColor: isSelected ? THEME_COLORS.primaryOrange : THEME_COLORS.borderSecondary,
                      hoverBg: 'rgba(255,165,0,0.2)',
                      hoverColor: THEME_COLORS.primaryOrange,
                      hoverBorder: THEME_COLORS.primaryOrange,
                    };
                  case 'derived':
                    return {
                      icon: '🔗',
                      label: 'Derived',
                      background: isSelected ? 'rgba(100,181,246,0.2)' : THEME_COLORS.bgTertiary,
                      color: isSelected ? THEME_COLORS.primaryBlue : THEME_COLORS.textSecondary,
                      borderColor: isSelected ? THEME_COLORS.primaryBlue : THEME_COLORS.borderSecondary,
                      hoverBg: 'rgba(100,181,246,0.2)',
                      hoverColor: THEME_COLORS.primaryBlue,
                      hoverBorder: THEME_COLORS.primaryBlue,
                    };
                  case 'tag_similarity':
                    return {
                      icon: '🏷️',
                      label: 'Tags',
                      background: isSelected ? 'rgba(139,195,74,0.2)' : THEME_COLORS.bgTertiary,
                      color: isSelected ? THEME_COLORS.primaryCyan : THEME_COLORS.textSecondary,
                      borderColor: isSelected ? THEME_COLORS.primaryCyan : THEME_COLORS.borderSecondary,
                      hoverBg: 'rgba(139,195,74,0.2)',
                      hoverColor: THEME_COLORS.primaryCyan,
                      hoverBorder: THEME_COLORS.primaryCyan,
                    };
                  case 'ai':
                    return {
                      icon: '🤖',
                      label: 'AI',
                      background: isSelected ? 'rgba(255,235,59,0.2)' : THEME_COLORS.bgTertiary,
                      color: isSelected ? THEME_COLORS.primaryYellow : THEME_COLORS.textSecondary,
                      borderColor: isSelected ? THEME_COLORS.primaryYellow : THEME_COLORS.borderSecondary,
                      hoverBg: 'rgba(255,235,59,0.2)',
                      hoverColor: THEME_COLORS.primaryYellow,
                      hoverBorder: THEME_COLORS.primaryYellow,
                    };
                  default:
                    return {
                      icon: '🔄',
                      label: type,
                      background: isSelected ? THEME_COLORS.primaryGreen : THEME_COLORS.bgTertiary,
                      color: isSelected ? THEME_COLORS.textInverse : THEME_COLORS.textSecondary,
                      borderColor: isSelected ? THEME_COLORS.primaryGreen : THEME_COLORS.borderSecondary,
                      hoverBg: THEME_COLORS.primaryGreen,
                      hoverColor: THEME_COLORS.textInverse,
                      hoverBorder: THEME_COLORS.primaryGreen,
                    };
                }
              };

              const config = getRelationshipConfig(relationshipType);
              
              return (
                <button
                  key={relationshipType}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: config.background,
                    padding: '3px 8px',
                    borderRadius: THEME_COLORS.borderRadius.small,
                    fontSize: '10px',
                    fontWeight: '500',
                    fontFamily: 'JetBrains Mono, monospace',
                    border: `1px solid ${config.borderColor}`,
                    color: config.color,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    transform: isSelected ? 'translateY(-1px)' : 'translateY(0)',
                    boxShadow: isSelected ? `0 2px 8px ${config.borderColor}40` : 'none',
                  }}
                  onClick={() => toggleRelationshipFilter(relationshipType)}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = config.hoverBg;
                      e.currentTarget.style.color = config.hoverColor;
                      e.currentTarget.style.borderColor = config.hoverBorder;
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = `0 2px 8px ${config.hoverBorder}40`;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = THEME_COLORS.bgTertiary;
                      e.currentTarget.style.color = THEME_COLORS.textSecondary;
                      e.currentTarget.style.borderColor = THEME_COLORS.borderSecondary;
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }
                  }}
                >
                  <span>{config.icon}</span>
                  {config.label}
                </button>
              );
            })}
                  </div>
                </div>
              </div>
            )}
            
            {/* Clusters Tab */}
            {activeFilterTab === 'clusters' && (
              <div>
                {clusterLabels.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    color: THEME_COLORS.textMuted,
                    fontSize: '12px',
                    padding: '20px',
                  }}>
                    クラスターを生成してください
                    <br />
                    <span style={{ fontSize: '10px' }}>
                      「Auto Labels」ボタンを押すか<br />
                      「🚀 高度解析実行」を実行
                    </span>
                  </div>
                ) : (
                  <div style={{
                    maxHeight: '300px',
                    overflowY: 'auto',
                  }}>
                    {clusterLabels.map((cluster, index) => (
                      <div
                        key={cluster.id}
                        style={{
                          background: THEME_COLORS.bgTertiary,
                          border: `1px solid ${THEME_COLORS.borderSecondary}`,
                          borderRadius: '6px',
                          padding: '12px',
                          marginBottom: '8px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                        }}
                        onClick={() => {
                          // クラスターカードクリックで詳細パネル表示
                          handleClusterClick(cluster.id);
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = THEME_COLORS.primaryBlue;
                          e.currentTarget.style.transform = 'translateY(-1px)';
                          e.currentTarget.style.boxShadow = `0 4px 12px ${THEME_COLORS.primaryBlue}20`;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = THEME_COLORS.borderSecondary;
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        {/* クラスター基本情報 */}
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          marginBottom: '8px',
                        }}>
                          <div style={{
                            flex: 1,
                            marginRight: '8px',
                          }}>
                            <div style={{
                              color: THEME_COLORS.textPrimary,
                              fontSize: '12px',
                              fontWeight: '600',
                              marginBottom: '4px',
                              lineHeight: '1.3',
                            }}>
                              {cluster.text}
                            </div>
                            <div style={{
                              color: THEME_COLORS.textMuted,
                              fontSize: '10px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                            }}>
                              <span>📊 {cluster.cardIds.length} カード</span>
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
                                background: THEME_COLORS.primaryBlue,
                                border: 'none',
                                borderRadius: '3px',
                                color: THEME_COLORS.textInverse,
                                padding: '3px 6px',
                                fontSize: '9px',
                                cursor: 'pointer',
                                fontWeight: '500',
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleClusterClick(cluster.id);
                              }}
                              title="詳細表示"
                            >
                              👁️
                            </button>
                            <button
                              style={{
                                background: THEME_COLORS.primaryCyan,
                                border: 'none',
                                borderRadius: '3px',
                                color: THEME_COLORS.textInverse,
                                padding: '3px 6px',
                                fontSize: '9px',
                                cursor: 'pointer',
                                fontWeight: '500',
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleClusterZoom(cluster.id);
                              }}
                              title="ズーム"
                            >
                              🔍
                            </button>
                            <button
                              style={{
                                background: THEME_COLORS.primaryRed,
                                border: 'none',
                                borderRadius: '3px',
                                color: THEME_COLORS.textInverse,
                                padding: '3px 6px',
                                fontSize: '9px',
                                cursor: 'pointer',
                                fontWeight: '500',
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleClusterDelete(cluster.id);
                              }}
                              title="削除"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                        
                        {/* テーマとタグ */}
                        {(cluster.theme || cluster.metadata?.dominantTags) && (
                          <div style={{
                            fontSize: '9px',
                            color: THEME_COLORS.textMuted,
                          }}>
                            {cluster.theme && (
                              <div style={{ marginBottom: '2px' }}>
                                🏷️ {cluster.theme}
                              </div>
                            )}
                            {cluster.metadata?.dominantTags && cluster.metadata.dominantTags.length > 0 && (
                              <div>
                                🏷️ {cluster.metadata.dominantTags.slice(0, 3).join(', ')}
                                {cluster.metadata.dominantTags.length > 3 && '...'}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>



      {/* 旧AI関係性提案パネル削除 - サイドピークに統合済み */}
      {false && (
        <div style={{
          ...styles.panel,
          top: '20px',
          right: selectedNode ? '420px' : '20px', // Info Panelと重ならないように調整
          width: '400px',
          maxHeight: '600px',
          overflow: 'auto',
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
          }}>
            <div style={{
              color: THEME_COLORS.primaryOrange,
              fontSize: '16px',
              fontWeight: '600',
              fontFamily: 'Space Grotesk, system-ui, sans-serif',
            }}>
              統合関係性提案 ({aiSuggestions.length})
            </div>
            <button
              style={{
                background: 'transparent',
                border: 'none',
                color: THEME_COLORS.textMuted,
                fontSize: '18px',
                cursor: 'pointer',
                padding: '4px',
              }}
              onClick={() => {}} // setShowSuggestionsPanel(false) - サイドピークに統合済み
            >
              ×
            </button>
          </div>

          {aiSuggestions.length === 0 ? (
            <div style={{
              textAlign: 'center',
              color: THEME_COLORS.textMuted,
              fontSize: '14px',
              padding: '20px',
            }}>
              新しい関係性の提案はありません
            </div>
          ) : (
            <>
              {/* 分析結果統計 */}
              <div style={{
                marginBottom: '16px',
                padding: '12px',
                background: THEME_COLORS.bgSecondary,
                borderRadius: '8px',
                border: `1px solid ${THEME_COLORS.borderPrimary}`,
              }}>
                <div style={{
                  fontSize: '12px',
                  color: THEME_COLORS.textSecondary,
                  marginBottom: '8px',
                  fontWeight: '600',
                }}>
                  分析結果統計
                </div>
                <div style={{
                  display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '8px',
                  fontSize: '10px',
                }}>
                  <div style={{
                    textAlign: 'center',
                    padding: '8px',
                    background: THEME_COLORS.bgTertiary,
                    borderRadius: '6px',
                    border: `1px solid ${THEME_COLORS.primaryOrange}40`,
                  }}>
                    <div style={{ color: THEME_COLORS.primaryOrange, fontWeight: '600' }}>
                      {(aiSuggestions as UnifiedRelationshipSuggestion[]).filter(s => s.analysisMethod === 'ai').length}
                    </div>
                    <div style={{ color: THEME_COLORS.textMuted }}>🤖 AI分析</div>
                  </div>
                  <div style={{
                    textAlign: 'center',
                    padding: '8px',
                    background: THEME_COLORS.bgTertiary,
                    borderRadius: '6px',
                    border: `1px solid ${THEME_COLORS.primaryCyan}40`,
                  }}>
                    <div style={{ color: THEME_COLORS.primaryCyan, fontWeight: '600' }}>
                      {(aiSuggestions as UnifiedRelationshipSuggestion[]).filter(s => s.analysisMethod === 'tag_similarity').length}
                    </div>
                    <div style={{ color: THEME_COLORS.textMuted }}>🏷️ タグ類似</div>
                  </div>
                  <div style={{
                    textAlign: 'center',
                    padding: '8px',
                    background: THEME_COLORS.bgTertiary,
                    borderRadius: '6px',
                    border: `1px solid ${THEME_COLORS.primaryBlue}40`,
                  }}>
                    <div style={{ color: THEME_COLORS.primaryBlue, fontWeight: '600' }}>
                      {(aiSuggestions as UnifiedRelationshipSuggestion[]).filter(s => s.analysisMethod === 'derived').length}
                    </div>
                    <div style={{ color: THEME_COLORS.textMuted }}>🔗 推論分析</div>
                  </div>
              <div style={{
                textAlign: 'center',
                padding: '8px',
                background: THEME_COLORS.bgTertiary,
                borderRadius: '6px',
                border: `1px solid ${THEME_COLORS.primaryPurple}40`,
              }}>
                <div style={{ color: THEME_COLORS.primaryPurple, fontWeight: '600' }}>
                  {(aiSuggestions as UnifiedRelationshipSuggestion[]).filter(s => s.analysisMethod === 'unified').length}
                </div>
                <div style={{ color: THEME_COLORS.textMuted }}>🧠 統合分析</div>
              </div>
                </div>
              </div>

              {/* 分析手法フィルター */}
              <div style={{
                marginBottom: '16px',
                padding: '12px',
                background: THEME_COLORS.bgSecondary,
                borderRadius: '8px',
                border: `1px solid ${THEME_COLORS.borderPrimary}`,
              }}>
                <div style={{
                  fontSize: '12px',
                  color: THEME_COLORS.textSecondary,
                  marginBottom: '8px',
                  fontWeight: '600',
                }}>
                  分析手法フィルター
                </div>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}>
                  {[
                    { key: 'ai', label: 'AI分析', icon: '🤖', color: THEME_COLORS.primaryOrange },
                    { key: 'tag_similarity', label: 'タグ類似性', icon: '🏷️', color: THEME_COLORS.primaryCyan },
                    { key: 'derived', label: '推論分析', icon: '🔗', color: THEME_COLORS.primaryBlue },
                    { key: 'unified', label: '統合分析', icon: '🧠', color: THEME_COLORS.primaryPurple }
                  ].map(method => (
                    <label key={method.key} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      fontSize: '11px',
                      color: THEME_COLORS.textSecondary,
                    }}>
                      <input
                        type="checkbox"
                        checked={true} // methodFilters[method.key as keyof typeof methodFilters]
                        onChange={(e) => {}} // setMethodFilters - サイドピークに統合済み
                        style={{
                          accentColor: method.color,
                          width: '12px',
                          height: '12px',
                        }}
                      />
                      <span style={{ fontSize: '12px' }}>{method.icon}</span>
                      <span>{method.label}</span>
                      <span style={{
                        background: method.color,
                        color: THEME_COLORS.textInverse,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: '600',
                      }}>
                        {(aiSuggestions as UnifiedRelationshipSuggestion[])
                          .filter(s => s.analysisMethod === method.key).length}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* 手法別一括操作ボタン */}
              <div style={{
                marginBottom: '16px',
                padding: '12px',
                background: THEME_COLORS.bgSecondary,
                borderRadius: '8px',
                border: `1px solid ${THEME_COLORS.borderPrimary}`,
              }}>
                <div style={{
                  fontSize: '12px',
                  color: THEME_COLORS.textSecondary,
                  marginBottom: '8px',
                  fontWeight: '600',
                }}>
                  手法別一括操作
                </div>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}>
                  {[
                    { method: 'ai', label: 'AI分析', icon: '🤖', color: THEME_COLORS.primaryOrange },
                    { method: 'tag_similarity', label: 'タグ類似性', icon: '🏷️', color: THEME_COLORS.primaryCyan },
                    { method: 'derived', label: '推論分析', icon: '🔗', color: THEME_COLORS.primaryBlue }
                  ].map(({ method, label, icon, color }) => {
                    const methodSuggestions = (aiSuggestions as UnifiedRelationshipSuggestion[])
                      .filter(s => s.analysisMethod === method);
                    const filteredMethodSuggestions = methodSuggestions; // methodFilters適用済み扱い
                    
                    if (methodSuggestions.length === 0) return null;
                    
                    return (
                      <div key={method} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '6px',
                        background: THEME_COLORS.bgTertiary,
                        borderRadius: '6px',
                        border: `1px solid ${color}40`,
                      }}>
                        <span style={{ fontSize: '12px' }}>{icon}</span>
                        <span style={{
                          fontSize: '11px',
                          color: THEME_COLORS.textSecondary,
                          flex: 1,
                        }}>
                          {label} ({filteredMethodSuggestions.length}件)
                        </span>
                        <button
                          style={{
                            background: THEME_COLORS.primaryGreen,
                            color: THEME_COLORS.textInverse,
                            border: 'none',
                            borderRadius: '4px',
                            padding: '4px 8px',
                            fontSize: '9px',
                            fontWeight: '600',
                            cursor: filteredMethodSuggestions.length > 0 ? 'pointer' : 'not-allowed',
                            opacity: filteredMethodSuggestions.length > 0 ? 1 : 0.5,
                            transition: 'all 0.2s ease',
                          }}
                          disabled={filteredMethodSuggestions.length === 0}
                          onClick={() => approveMethodSuggestions(method as 'ai' | 'tag_similarity' | 'derived')}
                        >
                          承認
                        </button>
                        <button
                          style={{
                            background: THEME_COLORS.primaryRed,
                            color: THEME_COLORS.textInverse,
                            border: 'none',
                            borderRadius: '4px',
                            padding: '4px 8px',
                            fontSize: '9px',
                            fontWeight: '600',
                            cursor: filteredMethodSuggestions.length > 0 ? 'pointer' : 'not-allowed',
                            opacity: filteredMethodSuggestions.length > 0 ? 1 : 0.5,
                            transition: 'all 0.2s ease',
                          }}
                          disabled={filteredMethodSuggestions.length === 0}
                          onClick={() => rejectMethodSuggestions(method as 'ai' | 'tag_similarity' | 'derived')}
                        >
                          拒否
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 全体一括操作ボタン */}
              <div style={{
                display: 'flex',
                gap: '8px',
                marginBottom: '16px',
              }}>
                <button
                  style={{
                    flex: 1,
                    background: THEME_COLORS.primaryGreen,
                    color: THEME_COLORS.textInverse,
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    fontFamily: 'JetBrains Mono, monospace',
                  }}
                  onClick={approveAllSuggestions}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = THEME_COLORS.primaryGreenDark;
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = THEME_COLORS.primaryGreen;
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  表示中全て承認 ({aiSuggestions.length})
                </button>
                <button
                  style={{
                    flex: 1,
                    background: THEME_COLORS.bgTertiary,
                    color: THEME_COLORS.textSecondary,
                    border: `1px solid ${THEME_COLORS.borderSecondary}`,
                    borderRadius: '8px',
                    padding: '8px 12px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    fontFamily: 'JetBrains Mono, monospace',
                  }}
                  onClick={() => {
                    setAiSuggestions([]);
                    // setShowSuggestionsPanel(false); // サイドピークに統合済み
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = THEME_COLORS.primaryRed;
                    e.currentTarget.style.color = THEME_COLORS.textInverse;
                    e.currentTarget.style.borderColor = THEME_COLORS.primaryRed;
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = THEME_COLORS.textMuted;
                    e.currentTarget.style.borderColor = THEME_COLORS.borderSecondary;
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  全て拒否
                </button>
              </div>

              {/* 提案リスト */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {(() => {
                  console.log('🔍 提案表示デバッグ:', {
                    totalAiSuggestions: aiSuggestions.length,
                    // unifiedSuggestions: unifiedSuggestions.length,
                    // methodFilters: methodFilters,
                    aiSuggestionsDetail: aiSuggestions.map(s => ({
                      source: cards.find(c => c.id === s.sourceCardId)?.title,
                      target: cards.find(c => c.id === s.targetCardId)?.title,
                      method: (s as UnifiedRelationshipSuggestion).analysisMethod
                    }))
                  });
                  return aiSuggestions;
                })().map((suggestion, index) => {
                  const sourceCard = cards.find(c => c.id === suggestion.sourceCardId);
                  const targetCard = cards.find(c => c.id === suggestion.targetCardId);
                  
                  if (!sourceCard || !targetCard) return null;
                  
                  return (
                    <div
                      key={`${suggestion.sourceCardId}-${suggestion.targetCardId}`}
                      style={{
                        background: THEME_COLORS.bgTertiary,
                        border: `1px solid ${THEME_COLORS.borderSecondary}`,
                        borderRadius: '12px',
                        padding: '16px',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {/* カード間の関係 */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '12px',
                      }}>
                        <div style={{
                          fontSize: '12px',
                          color: THEME_COLORS.textSecondary,
                          background: THEME_COLORS.bgSecondary,
                          padding: '4px 8px',
                          borderRadius: '6px',
                          maxWidth: '120px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                          {sourceCard.title}
                        </div>
                        <div style={{
                          fontSize: '14px',
                          color: THEME_COLORS.primaryOrange,
                        }}>
                          →
                        </div>
                        <div style={{
                          fontSize: '12px',
                          color: THEME_COLORS.textSecondary,
                          background: THEME_COLORS.bgSecondary,
                          padding: '4px 8px',
                          borderRadius: '6px',
                          maxWidth: '120px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                          {targetCard.title}
                        </div>
                      </div>

                      {/* 関係性の詳細 */}
                      <div style={{
                        fontSize: '11px',
                        color: THEME_COLORS.textMuted,
                        marginBottom: '12px',
                        lineHeight: '1.4',
                        background: THEME_COLORS.bgSecondary,
                        padding: '8px',
                        borderRadius: '6px',
                        border: `1px solid ${THEME_COLORS.borderPrimary}`,
                      }}>
                        <div style={{
                          fontSize: '10px',
                          color: THEME_COLORS.textSecondary,
                          marginBottom: '4px',
                          fontWeight: '600',
                          textTransform: 'uppercase',
                        }}>
                          分析詳細
                        </div>
                        {suggestion.explanation}
                        
                        {/* 推奨強度情報 */}
                        {suggestion.suggestedStrength && (
                          <div style={{
                            marginTop: '6px',
                            fontSize: '10px',
                            color: THEME_COLORS.textMuted,
                          }}>
                            推奨強度: {(suggestion.suggestedStrength * 100).toFixed(1)}%
                          </div>
                        )}
                        
                        {/* 類似度情報 */}
                        {suggestion.similarity && suggestion.similarity !== suggestion.confidence && (
                          <div style={{
                            fontSize: '10px',
                            color: THEME_COLORS.textMuted,
                          }}>
                            類似度: {(suggestion.similarity * 100).toFixed(1)}%
                          </div>
                        )}
                      </div>

                      {/* 信頼度とタイプ */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '12px',
                      }}>
                        <div style={{
                          display: 'flex',
                          gap: '8px',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                        }}>
                          {/* 分析手法バッジ */}
                          {(suggestion as UnifiedRelationshipSuggestion).analysisMethod && (
                            <span style={{
                              fontSize: '9px',
                              background: (suggestion as UnifiedRelationshipSuggestion).analysisMethod === 'ai' 
                                ? THEME_COLORS.primaryOrange
                                : (suggestion as UnifiedRelationshipSuggestion).analysisMethod === 'tag_similarity'
                                ? THEME_COLORS.primaryCyan
                                : THEME_COLORS.primaryBlue,
                              color: THEME_COLORS.textInverse,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontWeight: '600',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '3px',
                            }}>
                              {(suggestion as UnifiedRelationshipSuggestion).methodIcon}
                              {(suggestion as UnifiedRelationshipSuggestion).methodLabel}
                            </span>
                          )}
                          <span style={{
                            fontSize: '9px',
                            background: THEME_COLORS.bgQuaternary,
                            color: THEME_COLORS.textSecondary,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            textTransform: 'uppercase',
                            fontWeight: '600',
                          }}>
                            {suggestion.relationshipType}
                          </span>
                          <span style={{
                            fontSize: '10px',
                            color: THEME_COLORS.textMuted,
                          }}>
                            信頼度: {Math.round(suggestion.confidence * 100)}%
                          </span>
                        </div>
                      </div>

                      {/* アクションボタン */}
                      <div style={{
                        display: 'flex',
                        gap: '8px',
                      }}>
                        <button
                          style={{
                            flex: 1,
                            background: THEME_COLORS.primaryGreen,
                            color: THEME_COLORS.textInverse,
                            border: 'none',
                            borderRadius: '6px',
                            padding: '6px 12px',
                            fontSize: '11px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                          }}
                          onClick={() => approveSuggestion(suggestion)}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = THEME_COLORS.primaryGreenDark;
                            e.currentTarget.style.transform = 'translateY(-1px)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = THEME_COLORS.primaryGreen;
                            e.currentTarget.style.transform = 'translateY(0)';
                          }}
                        >
                          承認
                        </button>
                        <button
                          style={{
                            flex: 1,
                            background: 'transparent',
                            color: THEME_COLORS.textMuted,
                            border: `1px solid ${THEME_COLORS.borderSecondary}`,
                            borderRadius: '6px',
                            padding: '6px 12px',
                            fontSize: '11px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                          }}
                          onClick={() => rejectSuggestion(suggestion)}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = THEME_COLORS.primaryRed;
                            e.currentTarget.style.color = THEME_COLORS.textInverse;
                            e.currentTarget.style.borderColor = THEME_COLORS.primaryRed;
                            e.currentTarget.style.transform = 'translateY(-1px)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = THEME_COLORS.textMuted;
                            e.currentTarget.style.borderColor = THEME_COLORS.borderSecondary;
                            e.currentTarget.style.transform = 'translateY(0)';
                          }}
                        >
                          拒否
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* Info Panel */}
      {selectedNode && (
        <div 
          data-info-panel="true"
          style={{
            ...styles.panel,
            top: windowSize.width < 768 ? '10px' : '20px',  // 小画面では上余白も小さく
            right: windowSize.width < 768 ? '10px' : '20px', // 小画面では右余白を小さく
            width: getResponsivePanelWidth(),               // レスポンシブ幅
            maxWidth: 'none',                               // maxWidthの制限を削除
            maxHeight: windowSize.width < 768 ?             // 小画面ではより高さを制限
              'calc(100vh - 60px)' :
              'calc(100vh - 100px)',
            overflowY: 'auto' as const,                     // 縦スクロール有効
            cursor: 'pointer',
            // 小画面用の追加スタイル
            ...(windowSize.width < 768 && {
              zIndex: 1001,                                 // より高いz-index
              boxShadow: '0 12px 32px rgba(0, 0, 0, 0.4)', // より強い影
            }),
          }}
          onClick={handleInfoPanelClick}
          title="クリックしてカードを編集"
        >
          <div style={{
            color: THEME_COLORS.primaryGreen,
            fontSize: '14px',
            fontWeight: '600',
            marginBottom: '14px',
          }}>
            {networkData.nodes.find(n => n.id === selectedNode)?.title}
          </div>
          <div style={{
            color: THEME_COLORS.textSecondary,
            fontSize: '11px',
            lineHeight: '1.6',
            marginBottom: '14px',
          }}>
            {networkData.nodes.find(n => n.id === selectedNode)?.content}
          </div>
          <div style={{
            fontSize: '12px',
            color: THEME_COLORS.textMuted,
            fontFamily: 'JetBrains Mono, monospace',
            background: THEME_COLORS.bgTertiary,
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '20px',
          }}>
            <strong>Type:</strong> {networkData.nodes.find(n => n.id === selectedNode)?.type}<br/>
            <strong>Size:</strong> {networkData.nodes.find(n => n.id === selectedNode)?.size}<br/>
            <strong>Importance:</strong> {(networkData.nodes.find(n => n.id === selectedNode)?.metadata?.importanceScore || 0).toFixed(1)}<br/>
            <strong>Centrality:</strong> {(networkData.nodes.find(n => n.id === selectedNode)?.metadata?.centrality || 0).toFixed(1)}<br/>
            <strong>Content Density:</strong> {networkData.nodes.find(n => n.id === selectedNode)?.metadata?.contentDensity || 0}<br/>
            <strong>Tags:</strong> {networkData.nodes.find(n => n.id === selectedNode)?.tags.join(', ')}
          </div>
          
          {/* Connections Section - Bottom */}
          <div style={{
            marginTop: '20px',
            paddingTop: '20px',
            borderTop: `1px solid ${THEME_COLORS.borderPrimary}`,
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px',
          }}>
            <div style={{
              fontSize: '12px',
              fontWeight: '600',
              color: THEME_COLORS.textPrimary,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              fontFamily: 'JetBrains Mono, monospace',
            }}>
                Connections ({(() => {
                  const selectedNodeObj = networkData.nodes.find(n => n.id === selectedNode);
                  const relatedConnections = networkData.edges.filter(edge => 
                    edge.source === selectedNode || edge.target === selectedNode
                  );
                  const sortedAndFilteredConnections = getSortedAndFilteredConnections(relatedConnections);
                  const totalConnections = selectedNodeObj?.connectionCount || 0;
                  const filteredCount = sortedAndFilteredConnections.length;
                  
                  // ソートが適用されている場合は件数を強調表示
                  if (relationsSortBy !== 'default') {
                    return `${filteredCount}/${totalConnections}`;
                  }
                  return totalConnections;
                })()})
              </div>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                {/* ソート・フィルター ドロップダウン */}
                <div style={{ position: 'relative' }} data-sort-container="true">
                  <button
                    style={{
                      background: (relationsSortBy !== 'default') 
                        ? THEME_COLORS.primaryBlue 
                        : THEME_COLORS.bgQuaternary,
                      color: (relationsSortBy !== 'default') 
                        ? THEME_COLORS.textInverse 
                        : THEME_COLORS.textSecondary,
                      border: `1px solid ${THEME_COLORS.borderSecondary}`,
                      borderRadius: '4px',
                      padding: '3px 6px',
                      fontSize: '9px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '2px',
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowSortOptions(!showSortOptions);
                    }}
                    onMouseEnter={(e) => {
                      const target = e.currentTarget as HTMLElement;
                      const isActive = relationsSortBy !== 'default';
                      target.style.background = isActive ? '#4A90E2' : THEME_COLORS.bgTertiary;
                    }}
                    onMouseLeave={(e) => {
                      const target = e.currentTarget as HTMLElement;
                      const isActive = relationsSortBy !== 'default';
                      target.style.background = isActive ? THEME_COLORS.primaryBlue : THEME_COLORS.bgQuaternary;
                    }}
                    title="ソート・フィルター"
                  >
                    ⚙️
                  </button>
                  
                  {/* ソートオプション ドロップダウン */}
                  {showSortOptions && (
                    <div 
                      style={{
                        position: 'absolute',
                        top: '100%',
                        right: 0,
                        marginTop: '4px',
                        background: THEME_COLORS.bgSecondary,
                        border: `1px solid ${THEME_COLORS.borderPrimary}`,
                        borderRadius: '6px',
                        padding: '8px',
                        minWidth: '180px',
                        zIndex: 100,
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* ソート方法選択 */}
                      <div style={{ marginBottom: '8px' }}>
                        <label style={{
                          color: THEME_COLORS.textPrimary,
                          fontSize: '10px',
                          fontWeight: '600',
                          display: 'block',
                          marginBottom: '4px',
                        }}>
                          ソート
                        </label>
                        <select
                          value={relationsSortBy}
                          onChange={(e) => setRelationsSortBy(e.target.value as any)}
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            width: '100%',
                            padding: '4px 6px',
                            background: THEME_COLORS.bgTertiary,
                            border: `1px solid ${THEME_COLORS.borderSecondary}`,
                            borderRadius: '4px',
                            color: THEME_COLORS.textPrimary,
                            fontSize: '10px',
                            outline: 'none',
                          }}
                        >
                          <option value="default">デフォルト</option>
                          <option value="strength">強度</option>
                          <option value="type">タイプ</option>
                          <option value="target_title">カード名</option>
                        </select>
                      </div>
                      
                      {/* ソート順序選択 */}
                      <div style={{ marginBottom: '8px' }}>
                        <label style={{
                          color: THEME_COLORS.textPrimary,
                          fontSize: '10px',
                          fontWeight: '600',
                          display: 'block',
                          marginBottom: '4px',
                        }}>
                          順序
                        </label>
                        <select
                          value={relationsSortOrder}
                          onChange={(e) => setRelationsSortOrder(e.target.value as 'asc' | 'desc')}
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            width: '100%',
                            padding: '4px 6px',
                            background: THEME_COLORS.bgTertiary,
                            border: `1px solid ${THEME_COLORS.borderSecondary}`,
                            borderRadius: '4px',
                            color: THEME_COLORS.textPrimary,
                            fontSize: '10px',
                            outline: 'none',
                          }}
                        >
                          <option value="desc">降順</option>
                          <option value="asc">昇順</option>
                        </select>
                      </div>
                      

                      
                      {/* リセットボタン */}
                      <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: `1px solid ${THEME_COLORS.borderSecondary}` }}>
                        <button
                          style={{
                            width: '100%',
                            background: THEME_COLORS.bgTertiary,
                            color: THEME_COLORS.textSecondary,
                            border: `1px solid ${THEME_COLORS.borderSecondary}`,
                            borderRadius: '4px',
                            padding: '4px 8px',
                            fontSize: '9px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setRelationsSortBy('default');
                            setRelationsSortOrder('desc');
                            setShowSortOptions(false);
                          }}
                          onMouseEnter={(e) => {
                            const target = e.currentTarget as HTMLElement;
                            target.style.background = THEME_COLORS.bgQuaternary;
                          }}
                          onMouseLeave={(e) => {
                            const target = e.currentTarget as HTMLElement;
                            target.style.background = THEME_COLORS.bgTertiary;
                          }}
                        >
                          リセット
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* 追加ボタン */}
                <button
                  style={{
                    background: THEME_COLORS.primaryGreen,
                    color: THEME_COLORS.textInverse,
                    border: 'none',
                    borderRadius: '4px',
                    padding: '4px 8px',
                    fontSize: '10px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px',
                  }}
                  onClick={(e) => {
                    e.stopPropagation(); // パネルクリックイベントを防ぐ
                    handleAddRelationClick();
                  }}
                  onMouseEnter={(e) => {
                    const target = e.currentTarget as HTMLElement;
                    target.style.background = THEME_COLORS.primaryGreenDark;
                    target.style.transform = 'scale(1.05)';
                  }}
                  onMouseLeave={(e) => {
                    const target = e.currentTarget as HTMLElement;
                    target.style.background = THEME_COLORS.primaryGreen;
                    target.style.transform = 'scale(1)';
                  }}
                  title="新しい関連性を追加"
                >
                  + 追加
                </button>
              </div>
            </div>
            {(() => {
              const selectedNodeObj = networkData.nodes.find(n => n.id === selectedNode);
              const relatedConnections = networkData.edges.filter(edge => 
                edge.source === selectedNode || edge.target === selectedNode
              );
              
              // デバッグログ: AI関係性の表示状況を確認
              console.log('[NetworkVisualization] Connection details for node:', selectedNode);
              console.log('[NetworkVisualization] Total relationships for this node:', relationships.filter(rel => 
                rel.card_id === selectedNode || rel.related_card_id === selectedNode
              ));
              console.log('[NetworkVisualization] Filtered edges for display:', relatedConnections);
              console.log('[NetworkVisualization] Node connection count:', selectedNodeObj?.connectionCount);
              console.log('[NetworkVisualization] Edge filter config:', config.edgeFilter);
              
              if (relatedConnections.length === 0) {
                return (
                  <div style={{
                    fontSize: '11px',
                    color: THEME_COLORS.textMuted,
                    fontStyle: 'italic',
                  }}>
                    No connections found
                  </div>
                );
              }
              
              const sortedAndFilteredConnections = getSortedAndFilteredConnections(relatedConnections);
              
              return sortedAndFilteredConnections.map((connection, index) => {
                const otherNodeId = connection.source === selectedNode ? connection.target : connection.source;
                const otherNode = networkData.nodes.find(n => n.id === otherNodeId);
                const direction = connection.source === selectedNode ? '→' : '←';
                const strengthBadge = connection.strength > 0.7 ? 'Strong' : connection.strength > 0.5 ? 'Medium' : 'Weak';
                
                // 関係性タイプに応じた色を取得
                const connectionTypeColor = EDGE_COLORS[connection.type as keyof typeof EDGE_COLORS] || THEME_COLORS.primaryGreen;
                
                // 関連性IDの生成（DBから取得できる場合はそれを使用、なければエッジIDを使用）
                const relationshipId = connection.id;
                
                return (
                  <div 
                    key={index} 
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      marginBottom: '8px',
                      fontSize: '11px',
                      color: THEME_COLORS.textSecondary,
                      padding: '6px',
                      background: THEME_COLORS.bgTertiary,
                      borderRadius: '6px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      border: '1px solid transparent',
                    }}
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent triggering card edit when clicking on connections
                      handleConnectionClick(otherNodeId); // ノード移動機能
                    }}
                    onContextMenu={(e) => {
                      handleConnectionRightClick(e, relationshipId, otherNodeId);
                    }}
                    onMouseEnter={(e) => {
                      // ホバー時のスタイル変更
                      const target = e.currentTarget as HTMLElement;
                      target.style.background = THEME_COLORS.bgQuaternary;
                      target.style.borderColor = THEME_COLORS.primaryGreen;
                    }}
                    onMouseLeave={(e) => {
                      // ホバー終了時のスタイルリセット
                      const target = e.currentTarget as HTMLElement;
                      target.style.background = THEME_COLORS.bgTertiary;
                      target.style.borderColor = 'transparent';
                    }}
                    title={`クリックして「${otherNode?.title || 'Unknown'}」に移動`}
                  >
                    <span style={{
                      background: connectionTypeColor,
                      color: THEME_COLORS.textInverse,
                      padding: '3px 8px',
                      borderRadius: '8px',
                      fontSize: '9px',
                      fontWeight: '600',
                    }}>
                      {connection.type}
                    </span>
                    <span>
                      {direction} {otherNode?.title || 'Unknown'}
                    </span>
                    <small style={{ marginLeft: 'auto' }}>
                      ({strengthBadge})
                    </small>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}

      {/* Bottom Controls Container: Minimap + Zoom Controls */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        right: '20px',
        display: 'flex',
        alignItems: 'flex-end',
        gap: '20px',
        zIndex: 10,
      }}>
        {/* Minimap (moved here from separate block) */}
        {showMinimap && (
          <div style={{
            width: '200px',
            height: '150px',
            background: THEME_COLORS.bgSecondary,
            border: `1px solid ${THEME_COLORS.borderPrimary}`,
            borderRadius: '8px',
            overflow: 'hidden',
          }}>
            <div style={{
              padding: '8px',
              fontSize: '10px',
              fontWeight: '600',
              color: THEME_COLORS.textSecondary,
              borderBottom: `1px solid ${THEME_COLORS.borderPrimary}`,
              fontFamily: 'JetBrains Mono, monospace',
            }}>
              MINIMAP
            </div>
            <div 
              style={{
              position: 'relative',
              width: '100%',
              height: 'calc(100% - 30px)',
              background: THEME_COLORS.bgTertiary,
                cursor: 'pointer',
              }}
              onClick={(e) => {
                // ミニマップクリックでビューを移動
                const rect = e.currentTarget.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const clickY = e.clientY - rect.top;
                
                // ミニマップ座標を実際の座標に変換
                const targetX = (clickX / 200) * containerDimensions.width;
                const targetY = (clickY / 120) * containerDimensions.height;
                
                // ビューポートの中央にクリック位置が来るようにパン調整
                const centerX = (window.innerWidth / 2) - (targetX * transform.scale);
                const centerY = (window.innerHeight / 2) - (targetY * transform.scale);
                
                setTransform(prev => ({
                  ...prev,
                  x: centerX,
                  y: centerY
                }));
              }}
              title="クリックしてビューを移動"
            >
              {/* ミニマップのノード表示 */}
              {networkData.nodes.map(node => {
                // nodePositionsから実際の座標を取得
                const nodePos = nodePositions[node.id];
                if (!nodePos) return null; // 座標が設定されていない場合はスキップ
                
                const miniX = (nodePos.x / containerDimensions.width) * 200;
                const miniY = (nodePos.y / containerDimensions.height) * 120;
                
                return (
                  <div
                    key={`mini-${node.id}`}
                    style={{
                      position: 'absolute',
                      left: miniX - 2,
                      top: miniY - 2,
                      width: 4,
                      height: 4,
                      background: node.color,
                      borderRadius: '50%',
                      opacity: selectedNode === node.id ? 1 : 0.7,
                      transform: selectedNode === node.id ? 'scale(1.5)' : 'scale(1)',
                    }}
                  />
                );
              })}
              
              {/* 現在のビューポート表示 */}
              <div style={{
                position: 'absolute',
                left: Math.max(0, (-transform.x / containerDimensions.width) * 200),
                top: Math.max(0, (-transform.y / containerDimensions.height) * 120),
                width: Math.min(200, (window.innerWidth / containerDimensions.width / transform.scale) * 200),
                height: Math.min(120, (window.innerHeight / containerDimensions.height / transform.scale) * 120),
                border: `2px solid ${THEME_COLORS.primaryGreen}`,
                borderRadius: '2px',
                pointerEvents: 'none',
              }} />
            </div>
          </div>
        )}

        {/* Zoom Controls */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}>
        <button
          style={{
            background: THEME_COLORS.bgSecondary,
            border: `1px solid ${THEME_COLORS.borderPrimary}`,
            borderRadius: THEME_COLORS.borderRadius.medium,
            color: THEME_COLORS.textSecondary,
            padding: '12px',
            fontSize: '18px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            width: '48px',
            height: '48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(8px)',
          }}
          onClick={zoomIn}
        >
          +
        </button>
        <button
          style={{
            background: THEME_COLORS.bgSecondary,
            border: `1px solid ${THEME_COLORS.borderPrimary}`,
            borderRadius: THEME_COLORS.borderRadius.medium,
            color: THEME_COLORS.textSecondary,
            padding: '12px',
            fontSize: '18px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            width: '48px',
            height: '48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(8px)',
          }}
          onClick={zoomOut}
        >
          −
        </button>
        </div>
      </div>

      {/* Card Editing Modal */}
      {isCardModalVisible && selectedCard && (
        <CardModal
          open={isCardModalVisible}
          onClose={() => {
            setIsCardModalVisible(false);
            setSelectedCard(null);
          }}
          onSave={handleSaveCard}
          initialData={selectedCard}
          columnType={selectedColumn}
          setColumnType={setSelectedColumn}
          boardId={boardState.boardId ?? ''}
        />
      )}

      {/* AI分析中モーダル */}
      {showAnalysisModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(8px)',
        }}>
          <div style={{
            background: THEME_COLORS.bgSecondary,
            border: `1px solid ${THEME_COLORS.borderPrimary}`,
            borderRadius: THEME_COLORS.borderRadius.xxlarge,
            padding: '40px',
            textAlign: 'center',
            maxWidth: '400px',
            boxShadow: '0 16px 40px rgba(0, 0, 0, 0.4)',
          }}>
            {/* スピナー */}
            <div style={{
              width: '60px',
              height: '60px',
              border: `3px solid ${THEME_COLORS.bgTertiary}`,
              borderTop: `3px solid ${THEME_COLORS.primaryOrange}`,
              borderRadius: THEME_COLORS.borderRadius.round,
              animation: 'spin 1s linear infinite',
              margin: '0 auto 24px',
            }} />
            
            <div style={{
              color: THEME_COLORS.primaryOrange,
              fontSize: '20px',
              fontWeight: '600',
              marginBottom: '16px',
              fontFamily: 'Space Grotesk, system-ui, sans-serif',
            }}>
              AI関係性分析中
            </div>
            
            <div style={{
              color: THEME_COLORS.textSecondary,
              fontSize: '14px',
              lineHeight: '1.5',
              marginBottom: '24px',
            }}>
              {analysisProgress}
            </div>
            
            <div style={{
              color: THEME_COLORS.textMuted,
              fontSize: '12px',
              fontStyle: 'italic',
            }}>
              分析を中断しないでください...
            </div>
          </div>
        </div>
      )}

      {/* カスタム確認ダイアログ */}
      {showConfirmDialog && confirmDialog && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1001,
          backdropFilter: 'blur(4px)',
        }}>
          <div style={{
            background: THEME_COLORS.bgSecondary,
            border: `1px solid ${THEME_COLORS.borderPrimary}`,
            borderRadius: THEME_COLORS.borderRadius.xlarge,
            padding: '32px',
            maxWidth: '480px',
            maxHeight: '80vh',
            overflow: 'auto',
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.3)',
          }}>
            <div style={{
              color: THEME_COLORS.primaryGreen,
              fontSize: '18px',
              fontWeight: '600',
              marginBottom: '16px',
              fontFamily: 'Space Grotesk, system-ui, sans-serif',
            }}>
              {confirmDialog.title}
            </div>
            
            <div style={{
              color: THEME_COLORS.textSecondary,
              fontSize: '14px',
              lineHeight: '1.6',
              marginBottom: '24px',
            }}>
              {confirmDialog.message}
            </div>
            
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end',
            }}>
              {confirmDialog.onCancel && (
                <button
                  style={{
                    background: THEME_COLORS.bgTertiary,
                    border: `1px solid ${THEME_COLORS.borderSecondary}`,
                    borderRadius: THEME_COLORS.borderRadius.medium,
                    color: THEME_COLORS.textSecondary,
                    padding: '12px 24px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    fontFamily: 'JetBrains Mono, monospace',
                  }}
                  onClick={() => {
                    confirmDialog.onCancel?.();
                    hideCustomDialog();
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = THEME_COLORS.primaryRed;
                    e.currentTarget.style.color = THEME_COLORS.textInverse;
                    e.currentTarget.style.borderColor = THEME_COLORS.primaryRed;
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = THEME_COLORS.bgTertiary;
                    e.currentTarget.style.color = THEME_COLORS.textSecondary;
                    e.currentTarget.style.borderColor = THEME_COLORS.borderSecondary;
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  {confirmDialog.cancelText || 'キャンセル'}
                </button>
              )}
              
              <button
                style={{
                  background: THEME_COLORS.primaryGreen,
                  border: `1px solid ${THEME_COLORS.primaryGreen}`,
                  borderRadius: THEME_COLORS.borderRadius.medium,
                  color: THEME_COLORS.textInverse,
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  fontFamily: 'JetBrains Mono, monospace',
                }}
                onClick={() => {
                  confirmDialog.onConfirm();
                  if (confirmDialog.onCancel) {
                    hideCustomDialog();
                  }
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = THEME_COLORS.primaryGreenDark;
                  e.currentTarget.style.borderColor = THEME_COLORS.primaryGreenDark;
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = THEME_COLORS.primaryGreen;
                  e.currentTarget.style.borderColor = THEME_COLORS.primaryGreen;
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {confirmDialog.confirmText || '確認'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Right-click Context Menu */}
      {contextMenu && (
        <div
          style={{
            position: 'fixed',
            top: contextMenu.y,
            left: contextMenu.x,
            background: THEME_COLORS.bgSecondary,
            border: `1px solid ${THEME_COLORS.borderPrimary}`,
            borderRadius: THEME_COLORS.borderRadius.medium,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            zIndex: 1000,
            minWidth: '160px',
          }}
        >
          <div
            style={{
              padding: '8px 12px',
              color: THEME_COLORS.primaryRed,
              fontSize: '12px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'background 0.2s ease',
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.background = THEME_COLORS.bgTertiary;
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.background = 'transparent';
            }}
            onClick={() => {
              const targetNodeTitle = networkData.nodes.find(n => n.id === contextMenu.targetNodeId)?.title || '不明';
              const confirmMessage = `「${targetNodeTitle}」との関連性を削除しますか？\n\nこの操作は元に戻せません。`;
              
              if (window.confirm(confirmMessage)) {
                handleDeleteRelationship(contextMenu.relationshipId);
              }
              setContextMenu(null);
            }}
          >
            🗑️ 関連性を削除
          </div>
        </div>
      )}

      {/* 関連性追加モーダル */}
      {showAddRelationModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1002,
          backdropFilter: 'blur(4px)',
        }}>
          <div style={{
            background: THEME_COLORS.bgSecondary,
            border: `1px solid ${THEME_COLORS.borderPrimary}`,
            borderRadius: THEME_COLORS.borderRadius.xlarge,
            padding: '24px',
            width: '90%',
            maxWidth: '500px',
            maxHeight: '80vh',
            overflow: 'auto',
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.3)',
          }}>
            <div style={{
              color: THEME_COLORS.primaryGreen,
              fontSize: '16px',
              fontWeight: '600',
              marginBottom: '16px',
              fontFamily: 'Space Grotesk, system-ui, sans-serif',
            }}>
              新しい関連性を追加
            </div>
            
            <div style={{
              color: THEME_COLORS.textSecondary,
              fontSize: '12px',
              marginBottom: '20px',
            }}>
              現在のカード: {networkData.nodes.find(n => n.id === selectedNode)?.title}
            </div>

            {/* カード検索・選択 */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                color: THEME_COLORS.textPrimary,
                fontSize: '12px',
                fontWeight: '600',
                display: 'block',
                marginBottom: '8px',
              }}>
                関連付けるカードを選択
              </label>
              <input
                type="text"
                placeholder="カードタイトルで検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: THEME_COLORS.bgTertiary,
                  border: `1px solid ${THEME_COLORS.borderSecondary}`,
                  borderRadius: '6px',
                  color: THEME_COLORS.textPrimary,
                  fontSize: '12px',
                  outline: 'none',
                }}
              />
              
              {/* カード一覧 */}
              <div style={{
                marginTop: '8px',
                maxHeight: '200px',
                overflowY: 'auto',
                border: `1px solid ${THEME_COLORS.borderSecondary}`,
                borderRadius: '6px',
                background: THEME_COLORS.bgTertiary,
              }}>
                {networkData.nodes
                  .filter(node => 
                    node.id !== selectedNode && // 自分自身は除外
                    (!searchQuery || node.title.toLowerCase().includes(searchQuery.toLowerCase()))
                  )
                  .slice(0, 10) // 最大10件表示
                  .map(node => (
                    <div
                      key={node.id}
                      style={{
                        padding: '8px 12px',
                        cursor: 'pointer',
                        borderBottom: `1px solid ${THEME_COLORS.borderSecondary}`,
                        background: newRelationTarget === node.id ? THEME_COLORS.primaryGreen : 'transparent',
                        color: newRelationTarget === node.id ? THEME_COLORS.textInverse : THEME_COLORS.textPrimary,
                        transition: 'all 0.2s ease',
                      }}
                      onClick={() => setNewRelationTarget(node.id)}
                      onMouseEnter={(e) => {
                        if (newRelationTarget !== node.id) {
                          (e.currentTarget as HTMLElement).style.background = THEME_COLORS.bgQuaternary;
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (newRelationTarget !== node.id) {
                          (e.currentTarget as HTMLElement).style.background = 'transparent';
                        }
                      }}
                    >
                      <div style={{ fontSize: '12px', fontWeight: '600' }}>
                        {node.title}
                      </div>
                      <div style={{ 
                        fontSize: '10px', 
                        opacity: 0.7,
                        color: newRelationTarget === node.id ? THEME_COLORS.textInverse : THEME_COLORS.textSecondary,
                      }}>
                        {node.type} • {node.content.substring(0, 50)}...
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* 関係性タイプ */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{
                color: THEME_COLORS.textPrimary,
                fontSize: '12px',
                fontWeight: '600',
                display: 'block',
                marginBottom: '8px',
              }}>
                関係性のタイプ
              </label>
              <select
                value={newRelationType}
                onChange={(e) => setNewRelationType(e.target.value as 'semantic' | 'manual' | 'derived')}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  background: THEME_COLORS.bgTertiary,
                  border: `1px solid ${THEME_COLORS.borderSecondary}`,
                  borderRadius: '6px',
                  color: THEME_COLORS.textPrimary,
                  fontSize: '12px',
                  outline: 'none',
                }}
              >
                <option value="manual">Manual (手動)</option>
                <option value="semantic">Semantic (意味的)</option>
                <option value="derived">Derived (推論)</option>
              </select>
            </div>

            {/* 関係性の強度 */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                color: THEME_COLORS.textPrimary,
                fontSize: '12px',
                fontWeight: '600',
                display: 'block',
                marginBottom: '8px',
              }}>
                関係性の強度: {newRelationStrength.toFixed(1)}
              </label>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.1"
                value={newRelationStrength}
                onChange={(e) => setNewRelationStrength(parseFloat(e.target.value))}
                style={{
                  width: '100%',
                  accentColor: THEME_COLORS.primaryGreen,
                }}
              />
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '10px',
                color: THEME_COLORS.textMuted,
                marginTop: '4px',
              }}>
                <span>弱い (0.1)</span>
                <span>強い (1.0)</span>
              </div>
            </div>

            {/* アクションボタン */}
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end',
            }}>
              <button
                style={{
                  background: THEME_COLORS.bgQuaternary,
                  color: THEME_COLORS.textSecondary,
                  border: `1px solid ${THEME_COLORS.borderSecondary}`,
                  borderRadius: '6px',
                  padding: '8px 16px',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onClick={handleAddRelationCancel}
              >
                キャンセル
              </button>
              <button
                style={{
                  background: newRelationTarget ? THEME_COLORS.primaryGreen : THEME_COLORS.bgQuaternary,
                  color: newRelationTarget ? THEME_COLORS.textInverse : THEME_COLORS.textMuted,
                  border: `1px solid ${newRelationTarget ? THEME_COLORS.primaryGreen : THEME_COLORS.borderSecondary}`,
                  borderRadius: '6px',
                  padding: '8px 16px',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: newRelationTarget ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s ease',
                }}
                onClick={handleAddRelationSave}
                disabled={!newRelationTarget}
              >
                関連性を追加
              </button>
            </div>
          </div>
        </div>
      )}

      {/* クラスター詳細パネル */}
      {showClusterDetailPanel && selectedCluster && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(4px)',
        }}>
          <div style={{
            background: THEME_COLORS.bgSecondary,
            border: `1px solid ${THEME_COLORS.borderPrimary}`,
            borderRadius: THEME_COLORS.borderRadius.xlarge,
            padding: '24px',
            width: '90%',
            maxWidth: '600px',
            maxHeight: '80vh',
            overflow: 'auto',
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.3)',
          }}>
            {/* ヘッダー */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
            }}>
              <div style={{
                color: THEME_COLORS.primaryBlue,
                fontSize: '18px',
                fontWeight: '600',
                fontFamily: 'Space Grotesk, system-ui, sans-serif',
              }}>
                🎯 クラスター詳細
              </div>
              <button
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: THEME_COLORS.textMuted,
                  fontSize: '20px',
                  cursor: 'pointer',
                  padding: '4px',
                }}
                onClick={handleCloseClusterDetail}
              >
                ×
              </button>
            </div>

            {(() => {
              // 選択されたクラスターの詳細情報を取得
              const clusterLabel = clusterLabels.find(label => label.id === selectedCluster);
              const clusterCards = clusterLabel ? 
                clusterLabel.cardIds.map(id => networkData.nodes.find(n => n.id === id)).filter(Boolean) : 
                [];

              if (!clusterLabel) {
                return (
                  <div style={{
                    color: THEME_COLORS.textMuted,
                    textAlign: 'center',
                    padding: '40px',
                  }}>
                    クラスター情報が見つかりません
                  </div>
                );
              }

              return (
                <>
                  {/* クラスター基本情報 */}
                  <div style={{
                    background: THEME_COLORS.bgTertiary,
                    borderRadius: '8px',
                    padding: '16px',
                    marginBottom: '20px',
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '8px',
                    }}>
                      {isEditingClusterLabel ? (
                        // 編集モード
                        <>
                          <input
                            type="text"
                            value={editingClusterText}
                            onChange={(e) => setEditingClusterText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleSaveClusterLabel();
                              } else if (e.key === 'Escape') {
                                handleCancelEditClusterLabel();
                              }
                            }}
                            style={{
                              background: THEME_COLORS.bgPrimary,
                              border: `2px solid ${THEME_COLORS.primaryBlue}`,
                              borderRadius: '4px',
                              color: THEME_COLORS.textPrimary,
                              fontSize: '16px',
                              fontWeight: '600',
                              padding: '4px 8px',
                              outline: 'none',
                              flex: 1,
                              minWidth: '200px',
                            }}
                            autoFocus
                          />
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button
                              onClick={handleSaveClusterLabel}
                              style={{
                                background: THEME_COLORS.primaryGreen,
                                border: 'none',
                                borderRadius: '4px',
                                color: THEME_COLORS.textInverse,
                                padding: '4px 8px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: '500',
                              }}
                            >
                              ✓ 保存
                            </button>
                            <button
                              onClick={handleCancelEditClusterLabel}
                              style={{
                                background: THEME_COLORS.textMuted,
                                border: 'none',
                                borderRadius: '4px',
                                color: THEME_COLORS.textInverse,
                                padding: '4px 8px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: '500',
                              }}
                            >
                              ✕ キャンセル
                            </button>
                          </div>
                        </>
                      ) : (
                        // 表示モード
                        <>
                          <div style={{
                            color: THEME_COLORS.textPrimary,
                            fontSize: '16px',
                            fontWeight: '600',
                            flex: 1,
                          }}>
                            {clusterLabel.text}
                          </div>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAILabelGeneration(clusterLabel.id);
                              }}
                              style={{
                                background: THEME_COLORS.primaryGreen,
                                border: 'none',
                                borderRadius: '4px',
                                color: THEME_COLORS.textInverse,
                                padding: '4px 8px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: '500',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                transition: 'all 0.2s ease',
                              }}
                              title="AI支援ラベル提案"
                            >
                              🤖 AI提案
                            </button>
                            <button
                              onClick={() => handleStartEditClusterLabel(clusterLabel.text)}
                              style={{
                                background: 'transparent',
                                border: `1px solid ${THEME_COLORS.borderSecondary}`,
                                borderRadius: '4px',
                                color: THEME_COLORS.textSecondary,
                                padding: '4px 8px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                fontWeight: '500',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                transition: 'all 0.2s ease',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = THEME_COLORS.primaryBlue;
                                e.currentTarget.style.color = THEME_COLORS.primaryBlue;
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = THEME_COLORS.borderSecondary;
                                e.currentTarget.style.color = THEME_COLORS.textSecondary;
                              }}
                            >
                              ✏️ 編集
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                    
                    <div style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '12px',
                      fontSize: '12px',
                      color: THEME_COLORS.textSecondary,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>📊</span>
                        <span>{clusterCards.length} カード</span>
                      </div>
                      {clusterLabel.confidence && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span>🎯</span>
                          <span>信頼度: {Math.round(clusterLabel.confidence * 100)}%</span>
                        </div>
                      )}
                      {clusterLabel.theme && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span>🏷️</span>
                          <span>テーマ: {clusterLabel.theme}</span>
                        </div>
                      )}
                    </div>

                    {/* 統計情報 */}
                    {clusterLabel.metadata && (
                      <div style={{
                        marginTop: '12px',
                        padding: '12px',
                        background: THEME_COLORS.bgQuaternary,
                        borderRadius: '6px',
                        fontSize: '11px',
                      }}>
                        {clusterLabel.metadata.dominantTags && (
                          <div style={{ marginBottom: '6px' }}>
                            <span style={{ color: THEME_COLORS.textMuted }}>主要タグ: </span>
                            <span style={{ color: THEME_COLORS.primaryCyan }}>
                              {clusterLabel.metadata.dominantTags.join(', ')}
                            </span>
                          </div>
                        )}
                        {clusterLabel.metadata.dominantTypes && (
                          <div>
                            <span style={{ color: THEME_COLORS.textMuted }}>主要タイプ: </span>
                            <span style={{ color: THEME_COLORS.primaryOrange }}>
                              {clusterLabel.metadata.dominantTypes.join(', ')}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* カード一覧 */}
                  <div style={{
                    color: THEME_COLORS.textPrimary,
                    fontSize: '14px',
                    fontWeight: '600',
                    marginBottom: '12px',
                  }}>
                    含まれるカード
                  </div>

                  <div style={{
                    maxHeight: '400px',
                    overflowY: 'auto',
                    border: `1px solid ${THEME_COLORS.borderSecondary}`,
                    borderRadius: '8px',
                    background: THEME_COLORS.bgTertiary,
                  }}>
                    {clusterCards.map((card, index) => (
                      <div
                        key={card!.id}
                        style={{
                          padding: '12px 16px',
                          borderBottom: index < clusterCards.length - 1 ? `1px solid ${THEME_COLORS.borderSecondary}` : 'none',
                          cursor: 'pointer',
                          transition: 'background 0.2s ease',
                        }}
                        onClick={() => {
                          // カードクリック時はノード詳細表示に切り替え
                          setSelectedNode(card!.id);
                          handleCloseClusterDetail();
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.background = THEME_COLORS.bgQuaternary;
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.background = 'transparent';
                        }}
                      >
                        <div style={{
                          color: THEME_COLORS.textPrimary,
                          fontSize: '13px',
                          fontWeight: '600',
                          marginBottom: '4px',
                        }}>
                          {card!.title}
                        </div>
                        
                        <div style={{
                          color: THEME_COLORS.textSecondary,
                          fontSize: '11px',
                          lineHeight: '1.4',
                          marginBottom: '6px',
                        }}>
                          {card!.content.length > 100 ? 
                            `${card!.content.substring(0, 100)}...` : 
                            card!.content
                          }
                        </div>

                        <div style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '6px',
                          alignItems: 'center',
                        }}>
                          {/* カードタイプ */}
                          <span style={{
                            background: NODE_CONFIG[card!.type as keyof typeof NODE_CONFIG]?.color || THEME_COLORS.textMuted,
                            color: THEME_COLORS.textInverse,
                            padding: '2px 6px',
                            borderRadius: '3px',
                            fontSize: '9px',
                            fontWeight: '600',
                          }}>
                            {card!.type}
                          </span>

                          {/* 接続数 */}
                          <span style={{
                            color: THEME_COLORS.textMuted,
                            fontSize: '9px',
                          }}>
                            {card!.connectionCount} connections
                          </span>

                          {/* タグ */}
                          {card!.tags && card!.tags.length > 0 && (
                            <div style={{
                              display: 'flex',
                              gap: '3px',
                              flexWrap: 'wrap',
                            }}>
                              {card!.tags.slice(0, 3).map(tag => (
                                <span
                                  key={tag}
                                  style={{
                                    background: THEME_COLORS.primaryCyan,
                                    color: THEME_COLORS.textInverse,
                                    padding: '1px 4px',
                                    borderRadius: '2px',
                                    fontSize: '8px',
                                    fontWeight: '500',
                                  }}
                                >
                                  #{tag}
                                </span>
                              ))}
                              {card!.tags.length > 3 && (
                                <span style={{
                                  color: THEME_COLORS.textMuted,
                                  fontSize: '8px',
                                }}>
                                  +{card!.tags.length - 3}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* アクションボタン */}
                  <div style={{
                    display: 'flex',
                    gap: '12px',
                    marginTop: '20px',
                    justifyContent: 'flex-end',
                  }}>
                    <button
                      style={{
                        background: THEME_COLORS.bgQuaternary,
                        color: THEME_COLORS.textSecondary,
                        border: `1px solid ${THEME_COLORS.borderSecondary}`,
                        borderRadius: '6px',
                        padding: '8px 16px',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                      onClick={handleCloseClusterDetail}
                      onMouseEnter={(e) => {
                        const target = e.currentTarget as HTMLElement;
                        target.style.background = THEME_COLORS.bgTertiary;
                      }}
                      onMouseLeave={(e) => {
                        const target = e.currentTarget as HTMLElement;
                        target.style.background = THEME_COLORS.bgQuaternary;
                      }}
                    >
                      閉じる
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* スピナーアニメーション用のスタイル */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

      {/* Analysis Result Modal */}
      <AnalysisResultModal
        isVisible={analysisModalVisible}
        onClose={() => {
          setAnalysisModalVisible(false);
          setAnalysisResult(null);
          setAnalysisType(null);
        }}
        result={analysisResult}
        analysisType={analysisType}
      />

      {/* AI Label Suggestion Modal */}
      <AILabelSuggestionModal
        isVisible={showAILabelModal}
        onClose={handleAILabelModalClose}
        onSelectLabel={handleAILabelSelect}
        cards={aiLabelTargetCluster?.cards || []}
        clusterId={aiLabelTargetCluster?.id || ''}
        currentLabel={aiLabelTargetCluster?.currentLabel || ''}
        userId={authUser?.user?.id}
      />

      {/* グラウンデッド・セオリー分析結果パネル */}
      {groundedTheoryResult && (
        <GroundedTheoryResultPanel
          result={groundedTheoryResult}
          onClose={() => setGroundedTheoryResult(null)}
        />
      )}

      {/* Relations品質分析モーダル */}
      <RelationsQualityModal
        isVisible={showRelationsAnalysis}
        onClose={() => setShowRelationsAnalysis(false)}
        duplicationReport={relationsReport}
        qualityReport={qualityReport}
        onDeduplicationRequest={() => {
          setShowRelationsAnalysis(false);
          // handleRelationsDeduplication(); // 一時的にコメントアウト
        }}
      />

      {/* Relations重複削除結果モーダル (一時的にコメントアウト) */}
      {/*
      <RelationsDeduplicationModal
        isVisible={showDeduplicationModal}
        result={deduplicationResult}
        onClose={() => setShowDeduplicationModal(false)}
      />
      */}

      {/* パラメータ設定モーダル */}
      <RelationsParameterSettingsModal
        isVisible={showParameterSettings}
        onClose={() => setShowParameterSettings(false)}
        onParametersChanged={() => {
          console.log('🎛️ [NetworkVisualization] パラメータが変更されました');
          // パラメータ変更時の処理があれば追加
        }}
      />

      {/* 統合分析結果は既存のAnalysisResultModalで表示 */}

      {/* クラスタービュー保存ダイアログ */}
      <SaveClusterDialog
        isOpen={showSaveClusterDialog}
        onClose={() => setShowSaveClusterDialog(false)}
        onSave={handleSaveCurrentCluster}
        isLoading={isSavingCluster}
      />

      {/* Relations サイドピークパネル */}
      <SidePeakPanel
        isOpen={showRelationsPanel}
        onClose={() => setShowRelationsPanel(false)}
        title="Relations"
        icon="🔗"
        width={600}
      >
        <RelationsSidePeak
          isAnalyzing={isAnalyzing}
          isAnalyzingRelations={isAnalyzingRelations}
          onRunUnifiedAnalysis={runUnifiedRelationshipAnalysis}
          onBulkDeleteRelations={handleBulkDeleteRelations}
          onOpenParameterSettings={() => setShowParameterSettings(true)}
          onRunRelationsAnalysis={handleRelationsAnalysis}
          relationsCount={relationships.length}
          analysisSuggestions={aiSuggestions as any[]}
          cards={cards}
          onApproveSuggestion={approveSuggestion}
          onRejectSuggestion={rejectSuggestion}
          onApproveMethodSuggestions={approveMethodSuggestions}
          onRejectMethodSuggestions={rejectMethodSuggestions}
          onApproveAllSuggestions={approveAllSuggestions}
          onRejectAllSuggestions={() => {
            setAiSuggestions([]);
            // サイドピーク内の結果は自動的に消える
          }}
        />
      </SidePeakPanel>

      {/* Clustering サイドピークパネル */}
      <SidePeakPanel
        isOpen={showClusteringControls}
        onClose={() => setShowClusteringControls(false)}
        title="Clustering"
        icon="🎛️"
        width={500}
      >
        <ClusteringSidePeak
          analysisMode={analysisMode}
          onAnalysisModeChange={setAnalysisMode}
          useWeightFiltering={useWeightFiltering}
          onUseWeightFilteringChange={setUseWeightFiltering}
          strengthThreshold={strengthThreshold}
          onStrengthThresholdChange={setStrengthThreshold}
          showFilteredClusters={showFilteredClusters}
          onShowFilteredClustersChange={setShowFilteredClusters}
          advancedConfig={advancedConfig}
          onAdvancedConfigChange={setAdvancedConfig}
          onExecuteSimpleClustering={async () => {
            // 既存のラベルをクリア（新しいクラスターに対応するため）
            if (showLabels) {
              clearLabels();
            }
            
            // フィルタリングクラスターを実行
            const newClusters = detectClusters(strengthThreshold, useWeightFiltering);
            setFilteredClusters(newClusters);
            
            // レイアウトを再適用
            applyForceLayout();
            
            // フィルタリング結果を自動的に表示
            if (newClusters.length > 0) {
              setShowFilteredClusters(true);
              
              // 自動ラベル生成・表示（高度解析と同じ仕様）
              try {
                console.log('🏷️ Auto-generating labels for simple mode clusters...');
                const labels = await AnalysisService.generateClusterLabels(
                  boardState.boardId || '',
                  newClusters
                );
                
                // ノード位置を反映してラベル位置を更新
                const updatedLabels = labels.map(label => {
                  const clusterCards = label.cardIds.map(id => networkData.nodes.find(n => n.id === id)).filter(Boolean);
                  if (clusterCards.length === 0) return label;

                  // 実際のノード位置を使用して位置を再計算
                  const centerX = clusterCards.reduce((sum, node) => sum + (nodePositions[node!.id]?.x || node!.x), 0) / clusterCards.length;
                  const centerY = clusterCards.reduce((sum, node) => sum + (nodePositions[node!.id]?.y || node!.y), 0) / clusterCards.length;
                  const minY = Math.min(...clusterCards.map(node => (nodePositions[node!.id]?.y || node!.y)));

                  return {
                    ...label,
                    position: {
                      x: centerX,
                      y: minY - 40
                    }
                  };
                });
                
                setClusterLabels(updatedLabels);
                setShowLabels(true);
                console.log('🏷️ Simple mode labels auto-generated successfully:', updatedLabels.length);
              } catch (error) {
                console.error('Failed to auto-generate simple mode labels:', error);
                // エラーが発生してもクラスタリング自体は成功しているので、ユーザーに警告は出さない
              }
            }
            
            console.log('🚀 Applied new clustering settings:', {
              useWeightFiltering,
              strengthThreshold,
              newClusters: newClusters.length,
              showVisualization: newClusters.length > 0,
            });
          }}
          onExecuteAdvancedClustering={async () => {
            // 高度解析実行（既存の実装を呼び出し）
            try {
              setIsAdvancedAnalyzing(true);
              
              console.log('🔬 Starting advanced clustering analysis with config:', advancedConfig);
              
              const result = await SmartClusteringService.analyzeClusters(
                boardState.boardId || '',
                cards,
                relationships,
                advancedConfig.weights,
                advancedConfig.clustering
              );
              
              console.log('✅ Advanced clustering analysis completed:', result);
              setSmartClusteringResult(result);
              
              // 詳細なクラスター情報を表示
              if (result.clusters && result.clusters.length > 0) {
                // Smart clustering 結果からラベルを生成
                try {
                  const clusterData = result.clusters.map((cluster, index) => 
                    cluster.nodes.map(nodeId => nodeId).filter(Boolean)
                  );
                  
                  console.log('🏷️ Generating labels for smart clustering result...');
                  const labels = await AnalysisService.generateClusterLabels(
                    boardState.boardId || '',
                    clusterData
                  );
                  
                  // ノード位置を反映してラベル位置を更新
                  const updatedLabels = labels.map(label => {
                    const clusterCards = label.cardIds.map(id => networkData.nodes.find(n => n.id === id)).filter(Boolean);
                    if (clusterCards.length === 0) return label;

                    // 実際のノード位置を使用して位置を再計算
                    const centerX = clusterCards.reduce((sum, node) => sum + (nodePositions[node!.id]?.x || node!.x), 0) / clusterCards.length;
                    const centerY = clusterCards.reduce((sum, node) => sum + (nodePositions[node!.id]?.y || node!.y), 0) / clusterCards.length;
                    const minY = Math.min(...clusterCards.map(node => (nodePositions[node!.id]?.y || node!.y)));

                    return {
                      ...label,
                      position: {
                        x: centerX,
                        y: minY - 40
                      }
                    };
                  });
                  
                  setClusterLabels(updatedLabels);
                  setShowLabels(true);
                  console.log('🏷️ Smart clustering labels generated successfully:', updatedLabels.length);
                } catch (labelError) {
                  console.error('Failed to generate smart clustering labels:', labelError);
                  // ラベル生成に失敗してもクラスタリング自体は成功
                }
              }
            } catch (error) {
              console.error('❌ Advanced clustering analysis failed:', error);
              showCustomDialog(
                'エラー',
                '高度解析中にエラーが発生しました。設定を確認して再試行してください。',
                () => hideCustomDialog()
              );
            } finally {
              setIsAdvancedAnalyzing(false);
            }
          }}
          onLoadClusterView={handleLoadClusterView}
          canSaveCluster={canSaveCluster}
          onSaveCurrentCluster={() => setShowSaveClusterDialog(true)}
          boardId={boardState.boardId || ''}
          cards={cards}
          clusterLabels={clusterLabels}
          showLabels={showLabels}
          onShowLabelsChange={setShowLabels}
          onClusterClick={handleClusterClick}
          onClusterZoom={handleClusterZoom}
          onClusterDelete={handleClusterDelete}
        />
      </SidePeakPanel>

      {/* View & Navigation サイドピークパネル */}
      <SidePeakPanel
        isOpen={showViewNavigationPanel}
        onClose={() => setShowViewNavigationPanel(false)}
        title="View & Navigation"
        icon="🗺️"
        width={400}
      >
        <div style={{ padding: '20px' }}>
          <h4 style={{ color: THEME_COLORS.textPrimary, marginBottom: '16px' }}>
            ビューポート操作・レイアウト制御
          </h4>
          
          {/* 直接実行ボタン */}
          <div style={{ marginBottom: '24px' }}>
            <h5 style={{ color: THEME_COLORS.textSecondary, marginBottom: '12px', fontSize: '13px' }}>
              🎮 ビューポート操作
            </h5>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                style={{
                  ...styles.controlBtn,
                  width: '100%',
                }}
                onClick={resetView}
              >
                🔄 Reset View
              </button>
              <button
                style={{
                  ...styles.controlBtn,
                  width: '100%',
                }}
                onClick={applyForceLayout}
              >
                🎯 Auto Layout
              </button>
              <button
                style={{
                  ...styles.controlBtn,
                  width: '100%',
                  background: showMinimap ? THEME_COLORS.primaryCyan : THEME_COLORS.bgSecondary,
                  color: showMinimap ? THEME_COLORS.textInverse : THEME_COLORS.textSecondary,
                }}
                onClick={() => setShowMinimap(!showMinimap)}
              >
                🗺️ Minimap {showMinimap ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>

          {/* ビュー保存・管理 */}
          <div>
            <h5 style={{ color: THEME_COLORS.textSecondary, marginBottom: '12px', fontSize: '13px' }}>
              💾 ビュー保存・管理
            </h5>
            <div style={{ 
              background: THEME_COLORS.bgTertiary, 
              padding: '12px',
              borderRadius: THEME_COLORS.borderRadius.medium,
              color: THEME_COLORS.textSecondary,
              fontSize: '12px'
            }}>
              📋 実装予定: 既存Views機能の統合
            </div>
          </div>
        </div>
      </SidePeakPanel>

      {/* Search & Filter サイドピークパネル */}
      <SidePeakPanel
        isOpen={showSearchFilterPanel}
        onClose={() => setShowSearchFilterPanel(false)}
        title="Search & Filter"
        icon="🔍"
        width={450}
      >
        <div style={{ padding: '20px' }}>
          <h4 style={{ color: THEME_COLORS.textPrimary, marginBottom: '16px' }}>
            ノード検索・フィルタリング
          </h4>
          <p style={{ color: THEME_COLORS.textSecondary, marginBottom: '16px' }}>
            カード内容、タイトル、関係性による検索・フィルタリング機能。
          </p>
          <div style={{ 
            background: THEME_COLORS.bgTertiary, 
            padding: '12px',
            borderRadius: THEME_COLORS.borderRadius.medium,
            color: THEME_COLORS.textSecondary,
            fontSize: '12px'
          }}>
            📋 実装予定: 左下フィルター領域からの機能移行
          </div>
        </div>
      </SidePeakPanel>

      {/* Theory Building サイドピークパネル */}
      <SidePeakPanel
        isOpen={showGroundedTheoryManager}
        onClose={() => setShowGroundedTheoryManager(false)}
        title="Theory Building"
        icon="🧠"
        width={600}
      >
        <TheoryBuildingSidePeak
          currentClusters={clusterLabels}
          currentClusteringResult={smartClusteringResult}
          boardId={boardState.boardId || ''}
          nestId={boardState.currentNestId || ''}
        />
      </SidePeakPanel>

      {/* View & Navigation サイドピークパネル */}
      <SidePeakPanel
        isOpen={showViewNavigationPanel}
        onClose={() => setShowViewNavigationPanel(false)}
        title="View & Navigation"
        icon="🎯"
        width={500}
      >
        <ViewNavigationSidePeak
          onResetView={resetView}
          onAutoLayout={applyForceLayout}
          showMinimap={showMinimap}
          onToggleMinimap={setShowMinimap}
        />
      </SidePeakPanel>
    </div>
  );
};

export default NetworkVisualization;