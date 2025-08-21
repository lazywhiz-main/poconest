// ネットワーク可視化の基本型
export interface NetworkNode {
  id: string;
  x: number;
  y: number;
  size: number;
  type: 'INBOX' | 'QUESTIONS' | 'INSIGHTS' | 'THEMES' | 'ACTIONS';
  title: string;
  tags: string[];
  metadata?: Record<string, any>;
}

export interface NetworkEdge {
  id: string;
  source: string;
  target: string;
  strength: number;
  type: 'semantic' | 'manual' | 'derived';
  metadata?: Record<string, any>;
}

export interface NetworkData {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
}

// ビューポートとトランスフォーム
export interface Viewport {
  x: number;
  y: number;
  scale: number;
}

export interface ContainerDimensions {
  width: number;
  height: number;
}

// フィルター設定
export interface FilterConfig {
  tags: string[];
  types: string[];
  relationships: string[];
  strengthThreshold: number;
}

// クラスタリング設定
export interface ClusteringConfig {
  algorithm: 'hdbscan' | 'kmeans' | 'spectral';
  strengthThreshold: number;
  useWeightFiltering: boolean;
  showFilteredClusters: boolean;
}

// 分析結果
export interface AnalysisResult {
  id: string;
  type: 'tag_similarity' | 'derived' | 'ai';
  confidence: number;
  data: any;
  createdAt: Date;
}

// サイドパネルの状態
export type SidePanelType = 'relations' | 'clustering' | 'theory' | 'view' | 'search' | null;

// ネットワークの状態
export interface NetworkState {
  selectedNode: NetworkNode | null;
  highlightedNodes: Set<string>;
  transform: Viewport;
  isDragging: boolean;
  dragStart: { x: number; y: number };
  showClusters: boolean;
  showDensity: boolean;
  activeFilters: FilterConfig;
  detectedClusters: string[][];
  containerDimensions: ContainerDimensions;
  nodePositions: Record<string, { x: number; y: number }>;
}

// 分析スペース全体の状態
export interface AnalysisSpaceState {
  network: NetworkState;
  networkData: NetworkData | null;
  activeSidePanel: SidePanelType;
  clusteringConfig: ClusteringConfig;
  analysisResults: AnalysisResult[];
  savedViews: SavedView[];
  searchQuery: string;
  isLoading: boolean;
  error: string | null;
}

// 保存されたビュー
export interface SavedView {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  nestId: string;
  clusteringConfig: ClusteringConfig;
  customLabels: Record<string, string>;
  nodePositions: Record<string, { x: number; y: number }>;
  filterState: FilterConfig;
  transform: Viewport;
  activeFilterTab: 'nodes' | 'relationships' | 'clusters';
}
