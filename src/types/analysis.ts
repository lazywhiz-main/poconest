import { BoardColumnType } from './board';
import type { BoardItem } from '../services/SmartClusteringService';

// ネットワーク関係性
export interface CardRelationship {
  id: string;
  card_id: string;
  related_card_id: string;
  relationship_type: 'semantic' | 'manual' | 'derived' | 'tag_similarity' | 'ai' | 'unified';
  strength: number; // 0.0-1.0
  confidence: number; // AI分析の確信度 0.0-1.0
  metadata: {
    analysis_method?: 'nlp' | 'embedding' | 'tag_match';
    analyzed_at?: string;
    key_phrases?: string[];
    similarity_score?: number;
  };
  created_at: string;
  updated_at: string;
}

// ネットワークノード（可視化用）
export interface NetworkNode {
  id: string;
  title: string;
  content: string;
  type: BoardColumnType;
  x: number;
  y: number;
  size: 'small' | 'medium' | 'large' | 'xlarge'; // ノードサイズ（文字列指定）
  color: string; // タイプに基づく色
  icon?: string; // ノードアイコン（絵文字など）
  tags: string[];
  metadata: any;
  connectionCount: number;
  createdAt: string;
  updatedAt: string;
}

// ネットワークエッジ（関係性の可視化用）
export interface NetworkEdge {
  id: string;
  source: string;
  target: string;
  strength: number;
  type: string;
  color: string;
  width: number; // 強度に基づく線の太さ
  metadata: any;
}

// ネットワークグラフデータ
export interface NetworkGraphData {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  clusters?: NodeCluster[];
  metrics?: NetworkMetrics;
}

// ノードクラスター
export interface NodeCluster {
  id: string;
  nodes: string[]; // ノードIDの配列
  centerNode?: string;
  color: string;
  label: string;
  strength: number; // クラスターの結束度
}

// ネットワーク分析メトリクス
export interface NetworkMetrics {
  totalNodes: number;
  totalEdges: number;
  averageConnections: number;
  densestCluster?: string;
  mostConnectedNode?: string;
  networkDensity: number;
}

// カード分析結果キャッシュ
export interface CardAnalysisCache {
  id: string;
  card_id: string;
  content_hash: string;
  keywords: string[];
  topics: string[];
  summary?: string;
  analyzed_at: string;
}

// ネットワーク位置情報
export interface CardNetworkPosition {
  id: string;
  board_id: string;
  card_id: string;
  x: number;
  y: number;
  layout_type: 'force_directed' | 'circular' | 'manual';
  created_at: string;
  updated_at: string;
}

// 可視化設定
export interface NetworkVisualizationConfig {
  viewMode: 'circular' | 'card' | 'hybrid';
  layoutType: 'force_directed' | 'circular' | 'manual';
  showEdgeLabels: boolean;
  showNodeLabels: boolean;
  nodeSize: 'uniform' | 'connection_based' | 'content_length';
  edgeFilter: {
    minStrength?: number;
    types?: string[];
  };
  nodeFilter: {
    types?: BoardColumnType[];
    tags?: string[];
    dateRange?: {
      start: string;
      end: string;
    };
  };
}

// 分析処理の状態
export interface AnalysisState {
  isLoading: boolean;
  isAnalyzing: boolean;
  error?: string;
  lastAnalyzedAt?: string;
  progress?: {
    current: number;
    total: number;
    phase: string;
  };
}

// 分析リクエスト
export interface AnalysisRequest {
  boardId: string;
  analyzeRelationships: boolean;
  generateKeywords: boolean;
  extractTopics: boolean;
  forceReanalysis?: boolean;
} 