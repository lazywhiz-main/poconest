/**
 * テーマ分析関連の型定義
 */

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
