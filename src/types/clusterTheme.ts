/**
 * クラスターテーマ分析関連の型定義
 */

import type { ContentTheme } from '../services/ClusterThemeAnalysisService';

/**
 * クラスターのテーマ情報（拡張版）
 */
export interface ClusterThemeInfo extends ContentTheme {
  clusterId: string;
  analysisTimestamp: Date;
  lastUpdated: Date;
}

/**
 * テーマ別クラスターグループ
 */
export interface ThemeClusterGroup {
  theme: string;
  primaryDomain: string;
  clusters: string[]; // クラスターIDの配列
  totalCards: number;
  dominantConcepts: string[];
  gtaAnalysisFocus: string[];
}

/**
 * テーマ分析の設定
 */
export interface ThemeAnalysisConfig {
  enableAI: boolean;
  confidenceThreshold: number;
  maxConceptsPerTheme: number;
  analysisDepth: 'basic' | 'standard' | 'advanced';
}

/**
 * テーマ分析の結果サマリー
 */
export interface ThemeAnalysisSummary {
  totalClusters: number;
  analyzedClusters: number;
  themeDistribution: { [theme: string]: number };
  averageConfidence: number;
  dominantDomains: string[];
  analysisQuality: 'low' | 'medium' | 'high';
  recommendations: string[];
}

/**
 * GTA分析でのテーマ活用情報
 */
export interface GTAThemeUtilization {
  clusterId: string;
  theme: ContentTheme;
  openCodingFocus: string[];
  axialCodingPatterns: string[];
  selectiveCodingCore: string;
  theoreticalFramework: string;
  researchQuestions: string[];
}
