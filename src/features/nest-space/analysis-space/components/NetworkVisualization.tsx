import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { NetworkNode, NetworkEdge, NetworkGraphData, NetworkVisualizationConfig } from '../../../../types/analysis';
import type { BoardItem } from '../../../board-space/contexts/BoardContext';
import { useBoardContext } from '../../../board-space/contexts/BoardContext';
import { CardModal } from '../../../board-space/components/BoardSpace';
import { AIAnalysisService, type SuggestedRelationship } from '../../../../services/AIAnalysisService';
import { AnalysisService, AnalysisResult, ClusterLabel } from '../../../../services/AnalysisService';
import type { BoardColumnType } from '../../../../types/board';
import AnalysisResultModal from './AnalysisResultModal';
import { supabase } from '../../../../services/supabase/client';
import { useAuth } from '../../../../contexts/AuthContext';
import { useNest } from '../../../../features/nest/contexts/NestContext'; // Use the full context with Nest type

// 統合分析結果のインターフェース
interface UnifiedRelationshipSuggestion extends SuggestedRelationship {
  analysisMethod: 'ai' | 'tag_similarity' | 'derived';
  methodLabel: string;
  methodIcon: string;
  confidence: number;
  isAlreadyCreated?: boolean; // 既にDBに作成済みかどうか
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

// サンプルデザインに基づくカラー定義
const THEME_COLORS = {
  // Background
  bgPrimary: '#0f0f23',
  bgSecondary: '#1a1a2e',
  bgTertiary: '#333366',
  bgQuaternary: '#45475a',
  
  // Primary colors
  primaryGreen: '#00ff88',
  primaryGreenDark: '#00cc6a',
  primaryBlue: '#64b5f6',
  primaryOrange: '#ffa500',
  primaryRed: '#ff6b6b',
  primaryPurple: '#9c27b0',
  primaryCyan: '#26c6da',
  primaryYellow: '#ffd93d',
  
  // Text
  textPrimary: '#e2e8f0',
  textSecondary: '#a6adc8',
  textMuted: '#6c7086',
  textInverse: '#0f0f23',
  
  // Border
  borderPrimary: '#333366',
  borderSecondary: '#45475a',
  
  // Border Radius（統一感のための角の丸さ）
  borderRadius: {
    small: '2px',      // 小さなボタン、バッジ
    medium: '4px',    // 通常のボタン、小さなパネル
    large: '6px',     // パネル、カード
    xlarge: '8px',    // 大きなパネル、ダイアログ
    xxlarge: '12px',   // モーダル、メインダイアログ
    round: '50%',      // 円形（アバター、ノードなど）
  },
};

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
  const sizes = { small: 28, medium: 38, large: 48, xlarge: 58 }; // 全体的にサイズを少し縮小
  return sizes[size] || 38;
};

const NetworkVisualization: React.FC<NetworkVisualizationProps> = ({
  cards,
  relationships,
  config,
  onNodeSelect,
  onNodeDoubleClick,
}) => {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [highlightedNodes, setHighlightedNodes] = useState<Set<string>>(new Set());
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showClusters, setShowClusters] = useState(false);
  const [showDensity, setShowDensity] = useState(false);
  const [activeFilters, setActiveFilters] = useState<{ tags: string[], types: string[] }>({ tags: [], types: [] });
  const [detectedClusters, setDetectedClusters] = useState<string[][]>([]);
  
  // 動的な描画領域サイズ
  const [containerDimensions, setContainerDimensions] = useState({ width: 1200, height: 900 });
  
  // ノード位置を独立して管理
  const [nodePositions, setNodePositions] = useState<{ [key: string]: { x: number, y: number } }>({});
  
  // 初期レイアウト適用フラグ
  const [hasAppliedInitialLayout, setHasAppliedInitialLayout] = useState(false);
  
  // Reset View実行フラグ（Auto Layout再適用を完全に防ぐため）
  const [isManualReset, setIsManualReset] = useState(false);
  
  // AI関係性提案の状態
  const [aiSuggestions, setAiSuggestions] = useState<UnifiedRelationshipSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showSuggestionsPanel, setShowSuggestionsPanel] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState('');
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
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

  // Analysis result modal state
  const [analysisModalVisible, setAnalysisModalVisible] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [analysisType, setAnalysisType] = useState<'tag_similarity' | 'derived' | null>(null);

  // Auto Labels機能の状態
  const [clusterLabels, setClusterLabels] = useState<ClusterLabel[]>([]);
  const [showLabels, setShowLabels] = useState(false);
  const [isGeneratingLabels, setIsGeneratingLabels] = useState(false);

  // クラスタリング制御の状態
  const [strengthThreshold, setStrengthThreshold] = useState(0.3);
  const [useWeightFiltering, setUseWeightFiltering] = useState(true);
  const [showClusteringControls, setShowClusteringControls] = useState(false);
  const [showFilteredClusters, setShowFilteredClusters] = useState(false);
  const [filteredClusters, setFilteredClusters] = useState<string[][]>([]);

  // 統合分析フィルターの状態
  const [methodFilters, setMethodFilters] = useState({
    ai: true,
    tag_similarity: true,
    derived: true
  });

  // フィルター済み提案リスト（統合分析用）
  const unifiedSuggestions = useMemo(() => {
    // aiSuggestionsがUnifiedRelationshipSuggestion[]に変換されているかチェック
    const unified = aiSuggestions as UnifiedRelationshipSuggestion[];
    return unified.filter((suggestion) => 
      suggestion.analysisMethod && methodFilters[suggestion.analysisMethod as keyof typeof methodFilters]
    );
  }, [aiSuggestions, methodFilters]);

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

  const hideCustomDialog = () => {
    setShowConfirmDialog(false);
    setConfirmDialog(null);
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
        const minDistance = currentNodeSize * 1.5; // ノードサイズの1.5倍の距離
        
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
          const jitterAmount = 40 + (placementAttempt * 20); // 試行を重ねるほど大きく散らす
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
            const offsetDistance = minDistance + Math.random() * 30;
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
        (config.edgeFilter.types ? config.edgeFilter.types.includes(rel.relationship_type) : true)
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

  // クラスター検出（重み閾値フィルタリング対応）
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

  // 関係性を考慮したクラスター型レイアウトアルゴリズム
  const applyForceLayout = useCallback(() => {
    // 動的なコンテナサイズを使用
    const containerWidth = containerDimensions.width;
    const containerHeight = containerDimensions.height;
    const centerX = containerWidth / 2;
    const centerY = containerHeight / 2;

    // まずクラスターを検出（重み閾値フィルタリング適用）
    const clusters = detectClusters(strengthThreshold, useWeightFiltering);
    const newPositions: { [key: string]: { x: number, y: number } } = {};
    
    if (clusters.length === 0) {
      // クラスターがない場合は重要度ベースの配置
      const sortedNodes = [...networkData.nodes].sort((a, b) => {
        const aScore = (a.connectionCount * 2) + (a.metadata?.importanceScore || 0);
        const bScore = (b.connectionCount * 2) + (b.metadata?.importanceScore || 0);
        return bScore - aScore;
      });

      if (sortedNodes.length <= 6) {
        // 少数ノード: 美しい円形配置（半径をさらに拡大）
        sortedNodes.forEach((node, index) => {
          const angle = (index / sortedNodes.length) * 2 * Math.PI;
          const radius = Math.min(containerWidth, containerHeight) * 0.25; // 0.35→0.25（コンテナが大きくなったので係数は下げるが実際の距離は増加）
          newPositions[node.id] = {
            x: centerX + radius * Math.cos(angle),
            y: centerY + radius * Math.sin(angle)
          };
        });
      } else {
        // 多数ノード: 階層的円形配置（各半径をさらに拡大）
        const centerNode = sortedNodes[0];
        newPositions[centerNode.id] = { x: centerX, y: centerY };

        const innerNodes = sortedNodes.slice(1, Math.min(7, sortedNodes.length));
        const innerRadius = 200; // 160→200に拡大
        innerNodes.forEach((node, index) => {
          const angle = (index / innerNodes.length) * 2 * Math.PI;
          newPositions[node.id] = {
            x: centerX + innerRadius * Math.cos(angle),
            y: centerY + innerRadius * Math.sin(angle)
          };
        });

        const outerNodes = sortedNodes.slice(7);
        if (outerNodes.length > 0) {
          const outerRadius = 350; // 280→350に拡大
          outerNodes.forEach((node, index) => {
            const angle = (index / outerNodes.length) * 2 * Math.PI;
            newPositions[node.id] = {
              x: centerX + outerRadius * Math.cos(angle),
              y: centerY + outerRadius * Math.sin(angle)
            };
          });
        }
      }
    } else {
      // クラスターがある場合：クラスター型配置
      const margin = 120; // 80→120に拡大
      const clusterRadius = 180; // 140→180に拡大
      
      // 孤立ノード（クラスターに属さない）
      const clusteredNodeIds = new Set(clusters.flat());
      const isolatedNodes = networkData.nodes.filter(node => !clusteredNodeIds.has(node.id));
      
      // クラスターの配置位置を決定
      const totalGroups = clusters.length + (isolatedNodes.length > 0 ? 1 : 0);
      
      clusters.forEach((cluster, clusterIndex) => {
        // クラスターの中心位置を決定（距離をさらに拡大）
        const clusterAngle = (clusterIndex / totalGroups) * 2 * Math.PI;
        const clusterDistance = Math.min(containerWidth, containerHeight) * 0.35; // 0.4→0.35（コンテナが大きくなったので係数は下げるが実際の距離は増加）
        const clusterCenterX = centerX + clusterDistance * Math.cos(clusterAngle);
        const clusterCenterY = centerY + clusterDistance * Math.sin(clusterAngle);
        
        // クラスター内のノードを重要度順にソート
        const clusterNodes = cluster.map(id => networkData.nodes.find(n => n.id === id)).filter(Boolean);
        clusterNodes.sort((a, b) => {
          const aScore = (a!.connectionCount * 2) + (a!.metadata?.importanceScore || 0);
          const bScore = (b!.connectionCount * 2) + (b!.metadata?.importanceScore || 0);
          return bScore - aScore;
        });
        
        if (clusterNodes.length === 1) {
          // 単一ノード
          newPositions[clusterNodes[0]!.id] = {
            x: clusterCenterX,
            y: clusterCenterY
          };
        } else if (clusterNodes.length === 2) {
          // 2ノード：一直線（距離をさらに拡大）
          const distance = 140; // 100→140に拡大
          newPositions[clusterNodes[0]!.id] = {
            x: clusterCenterX - distance / 2,
            y: clusterCenterY
          };
          newPositions[clusterNodes[1]!.id] = {
            x: clusterCenterX + distance / 2,
            y: clusterCenterY
          };
        } else {
          // 3ノード以上：中心に最重要、周りに円形配置
          const mainNode = clusterNodes[0]!;
          newPositions[mainNode.id] = {
            x: clusterCenterX,
            y: clusterCenterY
          };
          
          const surroundingNodes = clusterNodes.slice(1);
          surroundingNodes.forEach((node, index) => {
            const angle = (index / surroundingNodes.length) * 2 * Math.PI;
            const radius = clusterRadius * Math.min(1.3, surroundingNodes.length / 4); // 半径をさらに大きく調整
            newPositions[node!.id] = {
              x: clusterCenterX + radius * Math.cos(angle),
              y: clusterCenterY + radius * Math.sin(angle)
            };
          });
        }
      });
      
      // 孤立ノードの配置（クラスターの外側に配置）
      if (isolatedNodes.length > 0) {
        const isolatedAngle = clusters.length > 0 
          ? (clusters.length / totalGroups) * 2 * Math.PI 
          : 0;
        const isolatedDistance = Math.min(containerWidth, containerHeight) * 0.4; // 0.45→0.4（コンテナが大きくなったので係数は下げるが実際の距離は増加）
        const isolatedCenterX = centerX + isolatedDistance * Math.cos(isolatedAngle);
        const isolatedCenterY = centerY + isolatedDistance * Math.sin(isolatedAngle);
        
        if (isolatedNodes.length === 1) {
          newPositions[isolatedNodes[0].id] = {
            x: isolatedCenterX,
            y: isolatedCenterY
          };
        } else {
          // 孤立ノードを小さな円形に配置（半径をさらに拡大）
          isolatedNodes.forEach((node, index) => {
            const angle = (index / isolatedNodes.length) * 2 * Math.PI;
            const radius = 160; // 120→160に拡大
            newPositions[node.id] = {
              x: isolatedCenterX + radius * Math.cos(angle),
              y: isolatedCenterY + radius * Math.sin(angle)
            };
          });
        }
      }
    }

    // 境界チェックと重複回避（強化版）
    const performCollisionAvoidance = (positions: { [key: string]: { x: number, y: number } }) => {
      const positionArray = Object.entries(positions).map(([id, pos]) => ({
        id,
        x: pos.x,
        y: pos.y,
        size: getNodeSize(networkData.nodes.find(n => n.id === id)?.size || 'medium')
      }));
      
      // 最大調整回数
      const maxIterations = 20;
      let iteration = 0;
      let hasCollisions = true;
      
      while (hasCollisions && iteration < maxIterations) {
        hasCollisions = false;
        
        for (let i = 0; i < positionArray.length; i++) {
          for (let j = i + 1; j < positionArray.length; j++) {
            const nodeA = positionArray[i];
            const nodeB = positionArray[j];
            
            const distance = Math.sqrt(
              Math.pow(nodeA.x - nodeB.x, 2) + Math.pow(nodeA.y - nodeB.y, 2)
            );
            
            const minDistance = (nodeA.size + nodeB.size) / 2 + 25; // 最小距離
            
            if (distance < minDistance) {
              hasCollisions = true;
              
              // 衝突回避：ノードを離す
              const angle = Math.atan2(nodeB.y - nodeA.y, nodeB.x - nodeA.x);
              const moveDistance = (minDistance - distance) / 2 + 5;
              
              // 両方のノードを反対方向に移動
              nodeA.x -= Math.cos(angle) * moveDistance;
              nodeA.y -= Math.sin(angle) * moveDistance;
              nodeB.x += Math.cos(angle) * moveDistance;
              nodeB.y += Math.sin(angle) * moveDistance;
              
              // 境界チェック
              const marginA = nodeA.size / 2 + 40;
              const marginB = nodeB.size / 2 + 40;
              
              nodeA.x = Math.max(marginA, Math.min(containerWidth - marginA, nodeA.x));
              nodeA.y = Math.max(marginA, Math.min(containerHeight - marginA, nodeA.y));
              nodeB.x = Math.max(marginB, Math.min(containerWidth - marginB, nodeB.x));
              nodeB.y = Math.max(marginB, Math.min(containerHeight - marginB, nodeB.y));
            }
          }
        }
        
        iteration++;
      }
      
      // 結果を元の形式に戻す
      const adjustedPositions: { [key: string]: { x: number, y: number } } = {};
      positionArray.forEach(node => {
        adjustedPositions[node.id] = { x: node.x, y: node.y };
      });
      
      return adjustedPositions;
    };

    // 重複回避処理を適用
    const adjustedPositions = performCollisionAvoidance(newPositions);

    setNodePositions(adjustedPositions);
    console.log('Cluster-based layout applied with collision avoidance:', adjustedPositions);
  }, [networkData, getNodeSize, detectClusters, containerDimensions]);

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

  // 有機的なランダム配置を生成する関数
  const generateOrganicLayout = useCallback(() => {
    const containerWidth = containerDimensions.width;
    const containerHeight = containerDimensions.height;
    const centerX = containerWidth / 2;
    const centerY = containerHeight / 2;
    
    const newPositions: { [key: string]: { x: number, y: number } } = {};
    const processedPositions: Array<{ x: number, y: number, size: number }> = [];
    
    networkData.nodes.forEach((node, index) => {
      const currentNodeSize = getNodeSize(node.size);
      const minDistance = currentNodeSize * 1.5;
      
      let attempts = 0;
      const maxAttempts = 50;
      let validPosition = false;
      let finalX = centerX;
      let finalY = centerY;
      
      while (!validPosition && attempts < maxAttempts) {
        // 配置エリアを段階的に拡張
        const placementAttempt = Math.floor(attempts / 10);
        const areaMultiplier = 1 + (placementAttempt * 0.3);
        
        // 中心からの距離をランダムに設定
        const maxDistance = Math.min(containerWidth, containerHeight) * 0.4 * areaMultiplier;
        const minDistanceFromCenter = 30;
        
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
        const importanceScore = node.metadata?.importanceScore || 0;
        if (importanceScore > 5) {
          const pullToCenter = 0.3;
          finalX = finalX * (1 - pullToCenter) + centerX * pullToCenter;
          finalY = finalY * (1 - pullToCenter) + centerY * pullToCenter;
        }
        
        // 境界チェック
        const margin = currentNodeSize / 2 + 20;
        finalX = Math.max(margin, Math.min(containerWidth - margin, finalX));
        finalY = Math.max(margin, Math.min(containerHeight - margin, finalY));
        
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
      
      // フォールバック位置
      if (!validPosition) {
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
      
      newPositions[node.id] = { x: finalX, y: finalY };
      processedPositions.push({ x: finalX, y: finalY, size: currentNodeSize });
    });
    
    return newPositions;
  }, [networkData.nodes, containerDimensions]);

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
    setTransform({ x: 0, y: 0, scale: 1 });
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
      console.log('⚡ [DEBUG] 3つの分析を並行実行開始');
      const [aiResult, tagResult, derivedResult] = await Promise.allSettled([
        // AI分析は増分分析可能
        AIAnalysisService.suggestRelationships(
          analysisType === 'incremental' ? targetCards : cards, 
          0.5, // 閾値は0.5のまま維持
          50,  // ✅ 修正: 20 → 50 にさらに増やす
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
      setShowSuggestionsPanel(true);
      
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
      
      // AI関係性提案を取得
      const suggestions = await AIAnalysisService.suggestRelationships(
        cards, 
        0.6, 
        15,
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
      setShowSuggestionsPanel(true);
      
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
          setShowSuggestionsPanel(false);
          
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
      .filter(s => s.analysisMethod === method && methodFilters[method]);
    
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
  }, [aiSuggestions, methodFilters, boardState.boardId, boardState.currentNestId, loadNestData, showCustomDialog, hideCustomDialog]);

  // 手法別一括拒否
  const rejectMethodSuggestions = useCallback((method: 'ai' | 'tag_similarity' | 'derived') => {
    const methodSuggestions = (aiSuggestions as UnifiedRelationshipSuggestion[])
      .filter(s => s.analysisMethod === method && methodFilters[method]);
    
    if (methodSuggestions.length === 0) return;
    
    // 該当する手法の提案を除外
    const remainingSuggestions = aiSuggestions.filter(suggestion => {
      const unified = suggestion as UnifiedRelationshipSuggestion;
      return !(unified.analysisMethod === method && methodFilters[method]);
    });
    
    setAiSuggestions(remainingSuggestions);
    
    const methodName = method === 'ai' ? 'AI分析' : method === 'tag_similarity' ? 'タグ類似性' : '推論分析';
    showCustomDialog(
      '拒否完了',
      `${methodSuggestions.length}個の${methodName}提案を拒否しました。`,
      () => hideCustomDialog()
    );
  }, [aiSuggestions, methodFilters, showCustomDialog, hideCustomDialog]);

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
      zIndex: 1,
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
            
            // より詳細なデバッグ情報
            if (process.env.NODE_ENV === 'development' && Math.random() < 0.05) { // 5%の確率でログ
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

          {/* Cluster Labels */}
          {showLabels && clusterLabels.map((label) => {
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
              <g key={label.id}>
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
                />
                <text
                  x={label.position.x}
                  y={label.position.y + 4}
                  textAnchor="middle"
                  fill={THEME_COLORS.textInverse}
                  fontSize="11"
                  fontWeight="600"
                  fontFamily="JetBrains Mono, monospace"
                >
                  {displayText}
                </text>
                {/* 省略された場合のツールチップ用のtitle要素 */}
                {label.text.length > maxLength && (
                  <title>{label.text}</title>
                )}
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
                  const label = e.currentTarget.querySelector('.node-label') as HTMLElement;
                  if (label) label.style.opacity = '1';
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    const label = e.currentTarget.querySelector('.node-label') as HTMLElement;
                    if (label) label.style.opacity = '0';
                  }
                }}
              >
                <div style={{
                  ...styles.nodeIcon,
                  fontSize: size <= 50 ? '14px' : size >= 80 ? '24px' : '18px',
                  color: THEME_COLORS.textPrimary,
                }}>
                  {node.icon || '●'}
                </div>
                <div 
                  className="node-label"
                  style={{
                    ...styles.nodeLabel,
                    opacity: isSelected ? 1 : 0,
                    color: isSelected ? THEME_COLORS.primaryGreen : THEME_COLORS.textSecondary,
                    borderColor: isSelected ? THEME_COLORS.primaryGreen : THEME_COLORS.borderPrimary,
                  }}
                >
                  {node.title}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Controls */}
      <div style={styles.controls}>
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
          {isAnalyzing ? '関係性分析中...' : `🧠 関係性を一括分析 (${cards.length}枚)`}
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
          🔄 完全再分析
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
          Reset View
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
          Auto Layout
        </button>

        <button style={styles.controlBtn}>Analyze Density</button>
        <button style={styles.controlBtn}>Export</button>
        
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
          Clustering Controls
        </button>
      </div>
      
      {/* クラスタリング制御パネル */}
      {showClusteringControls && (
        <div style={styles.clusteringControlsPanel}>
          <div style={styles.panelHeader}>
            <h4 style={styles.panelTitle}>クラスタリング設定</h4>
            <button
              style={styles.closeButton}
              onClick={() => setShowClusteringControls(false)}
            >
              ✕
            </button>
          </div>
          
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
              onClick={() => {
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
                }
                
                console.log('🚀 Applied new clustering settings:', {
                  useWeightFiltering,
                  strengthThreshold,
                  newClusters: newClusters.length,
                  showVisualization: newClusters.length > 0,
                  labelsCleared: showLabels
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

      {/* Metrics Panel */}
      <div style={{
        ...styles.panel,
        top: '20px',
        left: '180px',
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
          ネットワーク統計
        </div>
        <div style={{
          color: THEME_COLORS.textSecondary,
          fontSize: '10px',
          marginBottom: '2px',
        }}>
          ノード: {networkData.metrics?.totalNodes || 0}
        </div>
        <div style={{
          color: THEME_COLORS.textSecondary,
          fontSize: '10px',
          marginBottom: '2px',
        }}>
          関係: {networkData.metrics?.totalEdges || 0}
        </div>
        <div style={{
          color: THEME_COLORS.textSecondary,
          fontSize: '10px',
          marginBottom: '2px',
        }}>
          密度: {networkData.metrics ? (networkData.metrics.networkDensity * 100).toFixed(1) : 0}%
        </div>
      </div>

      {/* Filter Panel */}
      <div style={{
        ...styles.panel,
        bottom: '20px',
        left: '20px',
        minWidth: '220px',
      }}>
        <div style={{
          color: THEME_COLORS.textPrimary,
          fontSize: '14px',
          fontWeight: '600',
          marginBottom: '16px',
          fontFamily: 'JetBrains Mono, monospace',
        }}>
          Filters
        </div>
        
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

      {/* AI関係性提案パネル */}
      {showSuggestionsPanel && (
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
              統合関係性提案 ({unifiedSuggestions.length})
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
              onClick={() => setShowSuggestionsPanel(false)}
            >
              ×
            </button>
          </div>

          {unifiedSuggestions.length === 0 ? (
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
                  gridTemplateColumns: '1fr 1fr 1fr',
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
                    { key: 'derived', label: '推論分析', icon: '🔗', color: THEME_COLORS.primaryBlue }
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
                        checked={methodFilters[method.key as keyof typeof methodFilters]}
                        onChange={(e) => setMethodFilters(prev => ({
                          ...prev,
                          [method.key]: e.target.checked
                        }))}
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
                    const filteredMethodSuggestions = methodSuggestions.filter(s => 
                      methodFilters[method as keyof typeof methodFilters]
                    );
                    
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
                  表示中全て承認 ({unifiedSuggestions.length})
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
                    setShowSuggestionsPanel(false);
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
                    unifiedSuggestions: unifiedSuggestions.length,
                    methodFilters: methodFilters,
                    aiSuggestionsDetail: aiSuggestions.map(s => ({
                      source: cards.find(c => c.id === s.sourceCardId)?.title,
                      target: cards.find(c => c.id === s.targetCardId)?.title,
                      method: (s as UnifiedRelationshipSuggestion).analysisMethod
                    }))
                  });
                  return unifiedSuggestions;
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
            top: '20px',
            right: '20px',
            maxWidth: '380px',
            cursor: 'pointer',
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
              fontSize: '12px',
              fontWeight: '600',
              color: THEME_COLORS.textPrimary,
              marginBottom: '12px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              fontFamily: 'JetBrains Mono, monospace',
            }}>
              Connections ({networkData.nodes.find(n => n.id === selectedNode)?.connectionCount || 0})
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
              
              return relatedConnections.map((connection, index) => {
                const otherNodeId = connection.source === selectedNode ? connection.target : connection.source;
                const otherNode = networkData.nodes.find(n => n.id === otherNodeId);
                const direction = connection.source === selectedNode ? '→' : '←';
                const strengthBadge = connection.strength > 0.7 ? 'Strong' : connection.strength > 0.5 ? 'Medium' : 'Weak';
                
                // 関係性タイプに応じた色を取得
                const connectionTypeColor = EDGE_COLORS[connection.type as keyof typeof EDGE_COLORS] || THEME_COLORS.primaryGreen;
                
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
                    }}
                    onClick={(e) => e.stopPropagation()} // Prevent triggering card edit when clicking on connections
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

      {/* Zoom Controls */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        right: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        zIndex: 10,
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
    </div>
  );
};

export default NetworkVisualization;