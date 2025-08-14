/**
 * クラスタービュー管理機能の型定義
 */

import { ClusterLabel } from '../services/AnalysisService';
import { ClusteringResult } from '../services/SmartClusteringService';

/**
 * 保存されたクラスタービュー
 * 既存のクラスター表示データを完全に保存・復元するための型
 */
export interface SavedClusterView {
  id: string;
  name: string;
  description?: string;
  boardId: string;
  nestId: string;
  
  // 🔑 既存のクラスター表示データをそのまま保存
  clusterLabels: ClusterLabel[];              // 左下フィルター領域表示用データ
  smartClusteringResult: ClusteringResult;    // SmartClusteringServiceの完全な結果
  filteredClusters: string[][];               // フィルタリングされたクラスター配列
  
  // 描画・ビジュアル状態
  nodePositions: { [nodeId: string]: { x: number, y: number } };
  showFilteredClusters: boolean;              // フィルタ済みクラスター表示状態
  showLabels: boolean;                        // ラベル表示状態
  
  // メタデータ
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

/**
 * クラスタービュー作成用の入力データ
 */
export interface CreateClusterViewInput {
  name: string;
  description?: string;
  boardId: string;
  nestId: string;
  clusterLabels: ClusterLabel[];
  smartClusteringResult: ClusteringResult;
  filteredClusters: string[][];
  nodePositions: { [nodeId: string]: { x: number, y: number } };
  showFilteredClusters: boolean;
  showLabels: boolean;
}

/**
 * クラスタービュー更新用の入力データ
 */
export interface UpdateClusterViewInput {
  name?: string;
  description?: string;
}

/**
 * クラスタービューのサマリー情報（一覧表示用）
 */
export interface ClusterViewSummary {
  id: string;
  name: string;
  description?: string;
  clusterCount: number;                       // クラスター数
  cardCount: number;                          // 総カード数
  averageConfidence: number;                  // 平均信頼度
  createdAt: Date;
  createdBy: string;
}

/**
 * データベースから取得される生データの型
 */
export interface ClusterViewRecord {
  id: string;
  board_id: string;
  nest_id: string;
  name: string;
  description?: string;
  cluster_labels: any;                        // JSONB
  smart_clustering_result: any;              // JSONB
  filtered_clusters: any;                    // JSONB
  node_positions: any;                       // JSONB
  show_filtered_clusters: boolean;
  show_labels: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
}

/**
 * クラスタービュー操作のレスポンス型
 */
export interface ClusterViewResponse<T = SavedClusterView> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * 複数ビュー取得のレスポンス型
 */
export interface ClusterViewListResponse {
  success: boolean;
  data?: SavedClusterView[];
  error?: string;
}
