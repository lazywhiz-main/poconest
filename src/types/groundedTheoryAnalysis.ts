/**
 * グラウンデッド・セオリー分析結果の型定義
 * 分析結果の保存・管理・復元機能で使用
 */

import type { ClusterLabel } from '../services/AnalysisService';
import type { ClusteringResult } from '../services/SmartClusteringService';

// 既存のGroundedTheoryResultDataをインポート（GroundedTheoryResultPanel.tsxから）
export interface GroundedTheoryResultData {
  openCoding: {
    clusterCount: number;
    conceptCount: number;
  };
  axialCoding: {
    categoryCount: number;
    relationCount: number;
    causalChainCount: number;
  };
  selectiveCoding: {
    coreCategory: string;
    hypothesisCount: number;
    integrationQuality: number;
  };
  storyline: string;
  hypotheses: Array<{
    id: string;
    statement: string;
    type: 'descriptive' | 'explanatory' | 'predictive';
    confidence: number;
    supportingEvidence: string[];
    limitations: string[];
    testable: boolean;
    relatedConcepts?: string[];
    implications?: string[];
    researchQuestions?: string[];
    formationPath?: any; // HypothesisFormationPath
  }>;
}

// 保存用の分析データ構造
export interface SavedGroundedTheoryAnalysis {
  id: string;
  name: string;
  description?: string;
  boardId: string;
  nestId: string;
  
  // 分析結果（メインコンテンツ）
  analysisResult: GroundedTheoryResultData;
  
  // 入力データ（トレーサビリティ・再現性のため）
  sourceClusters: ClusterLabel[];         // 分析時のクラスター情報
  sourceClusteringResult?: ClusteringResult;  // 分析時のクラスタリング結果
  
  // 分析メタデータ
  analysisParameters?: {
    algorithm?: string;
    confidenceThreshold?: number;
    maxHypotheses?: number;
    codingDepth?: number;
    analysisMode?: 'standard' | 'detailed' | 'exploratory';
  };
  
  // 品質指標
  qualityMetrics?: {
    overallQuality: number;          // 総合品質スコア (0-1)
    coherenceScore: number;          // 一貫性スコア (0-1)
    evidenceStrength: number;        // 根拠強度 (0-1)
    conceptDiversity: number;        // 概念多様性 (0-1)
    logicalConsistency: number;      // 論理的一貫性 (0-1)
  };
  
  // 統計情報（検索・ソート用）
  hypothesisCount: number;           // 仮説数
  confidenceAverage: number;         // 平均信頼度
  conceptCount: number;              // 概念数
  
  // メタデータ
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

// 分析作成時の入力データ
export interface CreateGroundedTheoryAnalysisInput {
  name: string;
  description?: string;
  boardId: string;
  nestId: string;
  analysisResult: GroundedTheoryResultData;
  sourceClusters: ClusterLabel[];
  sourceClusteringResult?: ClusteringResult;
  analysisParameters?: SavedGroundedTheoryAnalysis['analysisParameters'];
  qualityMetrics?: SavedGroundedTheoryAnalysis['qualityMetrics'];
}

// 分析更新時の入力データ
export interface UpdateGroundedTheoryAnalysisInput {
  name?: string;
  description?: string;
  analysisResult?: GroundedTheoryResultData;
  analysisParameters?: SavedGroundedTheoryAnalysis['analysisParameters'];
  qualityMetrics?: SavedGroundedTheoryAnalysis['qualityMetrics'];
}

// データベースレコード型（Supabase用）
export interface GroundedTheoryAnalysisRecord {
  id: string;
  board_id: string;
  nest_id: string;
  name: string;
  description: string | null;
  
  // JSON列
  analysis_result: any;              // GroundedTheoryResultData
  source_clusters: any;              // ClusterLabel[]
  source_clustering_result: any;     // ClusteringResult | null
  analysis_parameters: any;          // 分析パラメータ
  quality_metrics: any;              // 品質指標
  
  // 統計情報（自動計算）
  hypothesis_count: number;
  confidence_average: number;
  concept_count: number;
  
  // メタデータ
  created_at: string;
  updated_at: string;
  created_by: string;
}

// API レスポンス型
export interface GroundedTheoryAnalysisResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface GroundedTheoryAnalysisListResponse extends GroundedTheoryAnalysisResponse<SavedGroundedTheoryAnalysis[]> {}

// 分析サマリー情報（一覧表示用）
export interface GroundedTheoryAnalysisSummary {
  id: string;
  name: string;
  description?: string;
  hypothesisCount: number;
  confidenceAverage: number;
  conceptCount: number;
  coreCategory: string;              // 中核概念
  createdAt: Date;
  createdBy: string;
}

// 分析実行パラメータ
export interface AnalysisExecutionParams {
  clusters: ClusterLabel[];
  clusteringResult?: ClusteringResult;
  parameters?: {
    mode?: 'standard' | 'detailed' | 'exploratory';
    confidenceThreshold?: number;
    maxHypotheses?: number;
    codingDepth?: number;
    enableFormationPaths?: boolean;
  };
}

// 分析実行結果（実行直後）
export interface AnalysisExecutionResult {
  result: GroundedTheoryResultData;
  executionTime: number;             // 実行時間（ミリ秒）
  qualityMetrics: SavedGroundedTheoryAnalysis['qualityMetrics'];
  warnings?: string[];              // 警告メッセージ
}
