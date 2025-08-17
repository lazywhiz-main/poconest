/**
 * グラウンデッド・セオリー分析（GTA）関連の型定義
 */

/**
 * GTA分析の設定
 */
export interface GTAAnalysisConfig {
  maxHypotheses: number;
  maxIterations: number;
  enableThemeAnalysis?: boolean;
  confidenceThreshold?: number;
}

/**
 * GTA分析の焦点設定
 */
export interface GTAAnalysisFocus {
  openCoding: {
    primaryFocus: string[];
    secondaryFocus: string[];
    approach: 'standard' | 'theme_guided' | 'custom';
  };
  axialCoding: {
    relationshipPatterns: string[];
    categoryFocus: string[];
    theoreticalFramework: 'standard' | 'theme_based' | 'custom';
  };
  selectiveCoding: {
    coreCategoryFocus: string[];
    hypothesisGeneration: 'standard' | 'theme_informed' | 'custom';
    storylineApproach: 'narrative' | 'thematic_integration' | 'custom';
  };
}

/**
 * テーマ分析付きGTA分析結果
 */
export interface GTAWithThemeResult {
  // 既存のGTA分析結果
  openCoding: any;
  axialCoding: any;
  selectiveCoding: any;
  hypotheses: any[];
  storyline: string;
  
  // 新規追加: テーマ分析結果
  themeAnalysis: {
    results: any[];
    summary: any;
    utilization: GTAThemeUtilization[];
  };
}

/**
 * GTA分析でのテーマ活用情報
 */
export interface GTAThemeUtilization {
  clusterId: string;
  theme: any;
  openCodingFocus: string[];
  axialCodingPatterns: string[];
  selectiveCodingCore: string;
  theoreticalFramework: string;
  researchQuestions: string[];
}
