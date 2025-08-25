/**
 * 理論的サンプリング分析サービス
 * 実際のクラスターデータに基づく理論的飽和判定とサンプリング戦略決定
 */

import type { ClusterLabel } from '../AnalysisService';
import type { ClusteringResult } from '../SmartClusteringService';

// 理論的サンプリング分析結果の型定義
export interface TheoreticalSamplingAnalysis {
  saturationAnalysis: {
    isSaturated: boolean;
    saturationScore: number;
    remainingGaps: string[];
    nextSamplingTargets: string[];
  };
  samplingProgress: {
    currentRound: number;
    totalRounds: number;
    conceptsDiscovered: number;
    newConceptsThisRound: number;
    relationshipsStabilized: number;
    categoriesCompleted: number;
  };
  qualityMetrics: {
    conceptDiversity: number;        // 概念の多様性 (0-1)
    clusterCoherence: number;        // クラスターの一貫性 (0-1)
    relationshipDensity: number;     // 関係性の密度 (0-1)
    theoreticalDepth: number;        // 理論的深度 (0-1)
  };
}

export interface SamplingCriteria {
  newConceptThreshold: number;      // 新概念出現率閾値
  relationshipStability: number;    // 関係性安定性閾値
  categoryCompleteness: number;     // カテゴリ完全性閾値
}

export interface SamplingStrategy {
  purpose: 'concept_development' | 'relationship_exploration' | 'theory_validation';
  focus: 'negative_cases' | 'extreme_cases' | 'theoretical_variation';
  dataSource: 'existing_clusters' | 'new_data_collection' | 'external_sources';
}

export class TheoreticalSamplingService {
  
  /**
   * 実際のクラスターデータに基づく理論的飽和分析
   */
  static analyzeTheoreticalSaturation(
    clusters: ClusterLabel[],
    clusteringResult: ClusteringResult | null,
    criteria: SamplingCriteria,
    previousAnalysis?: TheoreticalSamplingAnalysis
  ): TheoreticalSamplingAnalysis {
    console.log('🔬 [TheoreticalSampling] 理論的飽和分析開始');
    console.log(`📊 対象クラスター数: ${clusters.length}`);
    
    // 1. 概念の多様性分析
    const conceptDiversity = this.calculateConceptDiversity(clusters);
    
    // 2. クラスターの一貫性分析
    const clusterCoherence = this.calculateClusterCoherence(clusters);
    
    // 3. 関係性密度分析
    const relationshipDensity = this.calculateRelationshipDensity(clusters, clusteringResult);
    
    // 4. 理論的深度分析
    const theoreticalDepth = this.calculateTheoreticalDepth(clusters);
    
    // 5. 新概念出現率の計算
    const newConceptRate = this.calculateNewConceptRate(clusters, previousAnalysis);
    
    // 6. 関係性安定性の計算
    const relationshipStabilityScore = this.calculateRelationshipStability(clusters, clusteringResult);
    
    // 7. カテゴリ完全性の計算
    const categoryCompleteness = this.calculateCategoryCompleteness(clusters);
    
    // 8. 総合飽和スコアの計算
    const saturationScore = this.calculateSaturationScore({
      newConceptRate,
      relationshipStabilityScore,
      categoryCompleteness,
      criteria
    });
    
    // 9. 残存ギャップの特定
    const remainingGaps = this.identifyRemainingGaps({
      newConceptRate,
      relationshipStabilityScore,
      categoryCompleteness,
      criteria
    });
    
    // 10. 次のサンプリングターゲットの決定
    const nextSamplingTargets = this.determineNextSamplingTargets(remainingGaps, clusters);
    
    const isSaturated = saturationScore >= 0.8;
    
    const result: TheoreticalSamplingAnalysis = {
      saturationAnalysis: {
        isSaturated,
        saturationScore,
        remainingGaps,
        nextSamplingTargets
      },
      samplingProgress: {
        currentRound: (previousAnalysis?.samplingProgress.currentRound || 0) + 1,
        totalRounds: 5, // 最大5ラウンド
        conceptsDiscovered: this.countTotalConcepts(clusters),
        newConceptsThisRound: this.calculateNewConceptsThisRound(clusters, previousAnalysis),
        relationshipsStabilized: Math.round(relationshipStabilityScore * this.countTotalConcepts(clusters)),
        categoriesCompleted: this.countCompletedCategories(clusters)
      },
      qualityMetrics: {
        conceptDiversity,
        clusterCoherence,
        relationshipDensity,
        theoreticalDepth
      }
    };
    
    console.log('✅ [TheoreticalSampling] 理論的飽和分析完了');
    console.log(`📊 飽和スコア: ${(saturationScore * 100).toFixed(1)}%`);
    console.log(`🎯 飽和状態: ${isSaturated ? '達成' : '未達成'}`);
    
    return result;
  }
  
  /**
   * 概念の多様性を計算
   */
  private static calculateConceptDiversity(clusters: ClusterLabel[]): number {
    if (clusters.length === 0) return 0;
    
    // タグの多様性とクラスター間の意味的距離を考慮
    const allTags = clusters.flatMap(c => c.metadata?.dominantTags || []);
    const uniqueTags = new Set(allTags);
    const tagDiversity = uniqueTags.size / Math.max(allTags.length, 1);
    
    // クラスターテーマの多様性
    const themes = clusters.map(c => c.theme).filter(Boolean);
    const uniqueThemes = new Set(themes);
    const themeDiversity = uniqueThemes.size / Math.max(themes.length, 1);
    
    return (tagDiversity + themeDiversity) / 2;
  }
  
  /**
   * クラスターの一貫性を計算
   */
  private static calculateClusterCoherence(clusters: ClusterLabel[]): number {
    if (clusters.length === 0) return 0;
    
    // 信頼度の平均値をベースに一貫性を評価
    const averageConfidence = clusters.reduce((sum, c) => sum + c.confidence, 0) / clusters.length;
    
    // カード数のバランスも考慮
    const cardCounts = clusters.map(c => c.cardIds.length);
    const avgCardCount = cardCounts.reduce((sum, count) => sum + count, 0) / cardCounts.length;
    const cardCountVariance = cardCounts.reduce((sum, count) => sum + Math.pow(count - avgCardCount, 2), 0) / cardCounts.length;
    const cardCountBalance = 1 / (1 + cardCountVariance / avgCardCount);
    
    return (averageConfidence + cardCountBalance) / 2;
  }
  
  /**
   * 関係性密度を計算
   */
  private static calculateRelationshipDensity(clusters: ClusterLabel[], clusteringResult: ClusteringResult | null): number {
    if (!clusteringResult || clusters.length === 0) return 0;
    
    // クラスター間の接続性を評価
    const maxPossibleConnections = clusters.length * (clusters.length - 1) / 2;
    
    // 実際の接続数（共通のタグやテーマを持つクラスター）
    let actualConnections = 0;
    for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        const cluster1 = clusters[i];
        const cluster2 = clusters[j];
        
        // タグの共通性をチェック
        const tags1 = new Set(cluster1.metadata?.dominantTags || []);
        const tags2 = new Set(cluster2.metadata?.dominantTags || []);
        const commonTags = [...tags1].filter(tag => tags2.has(tag));
        
        if (commonTags.length > 0) {
          actualConnections++;
        }
      }
    }
    
    return maxPossibleConnections > 0 ? actualConnections / maxPossibleConnections : 0;
  }
  
  /**
   * 理論的深度を計算
   */
  private static calculateTheoreticalDepth(clusters: ClusterLabel[]): number {
    if (clusters.length === 0) return 0;
    
    // クラスターの意味的複雑さを評価
    const averageCardCount = clusters.reduce((sum, c) => sum + c.cardIds.length, 0) / clusters.length;
    const averageTagCount = clusters.reduce((sum, c) => sum + (c.metadata?.dominantTags?.length || 0), 0) / clusters.length;
    
    // 正規化
    const cardComplexity = Math.min(averageCardCount / 10, 1); // 10カード以上で最大
    const tagComplexity = Math.min(averageTagCount / 5, 1);    // 5タグ以上で最大
    
    return (cardComplexity + tagComplexity) / 2;
  }
  
  /**
   * 新概念出現率を計算
   */
  private static calculateNewConceptRate(clusters: ClusterLabel[], previousAnalysis?: TheoreticalSamplingAnalysis): number {
    const currentConceptCount = this.countTotalConcepts(clusters);
    
    if (!previousAnalysis) {
      return 1.0; // 初回は100%が新概念
    }
    
    const previousConceptCount = previousAnalysis.samplingProgress.conceptsDiscovered;
    const newConcepts = Math.max(0, currentConceptCount - previousConceptCount);
    
    return currentConceptCount > 0 ? newConcepts / currentConceptCount : 0;
  }
  
  /**
   * 関係性安定性を計算
   */
  private static calculateRelationshipStability(clusters: ClusterLabel[], clusteringResult: ClusteringResult | null): number {
    if (clusters.length === 0) return 0;
    
    // クラスター内の信頼度の安定性
    const confidenceValues = clusters.map(c => c.confidence);
    const avgConfidence = confidenceValues.reduce((sum, c) => sum + c, 0) / confidenceValues.length;
    const confidenceVariance = confidenceValues.reduce((sum, c) => sum + Math.pow(c - avgConfidence, 2), 0) / confidenceValues.length;
    
    // 分散が小さいほど安定
    const stability = 1 / (1 + confidenceVariance);
    
    return Math.min(stability, 1);
  }
  
  /**
   * カテゴリ完全性を計算
   */
  private static calculateCategoryCompleteness(clusters: ClusterLabel[]): number {
    if (clusters.length === 0) return 0;
    
    // 想定される理論的カテゴリ数（GTAの一般的な範囲：4-8カテゴリ）
    const expectedCategories = 6;
    const actualCategories = clusters.length;
    
    // カテゴリ数が期待値に近いほど完全性が高い
    const categoryRatio = Math.min(actualCategories / expectedCategories, 1);
    
    // 各カテゴリの充実度も考慮
    const avgCardsPerCluster = clusters.reduce((sum, c) => sum + c.cardIds.length, 0) / clusters.length;
    const categoryRichness = Math.min(avgCardsPerCluster / 5, 1); // 5カード以上で十分
    
    return (categoryRatio + categoryRichness) / 2;
  }
  
  /**
   * 総合飽和スコアを計算
   */
  private static calculateSaturationScore({
    newConceptRate,
    relationshipStabilityScore,
    categoryCompleteness,
    criteria
  }: {
    newConceptRate: number;
    relationshipStabilityScore: number;
    categoryCompleteness: number;
    criteria: SamplingCriteria;
  }): number {
    const newConceptSaturation = newConceptRate <= criteria.newConceptThreshold ? 1 : 0;
    const relationshipSaturation = relationshipStabilityScore >= criteria.relationshipStability ? 1 : 0;
    const categorySaturation = categoryCompleteness >= criteria.categoryCompleteness ? 1 : 0;
    
    // 重み付き平均
    return (
      newConceptSaturation * 0.4 +
      relationshipSaturation * 0.3 +
      categorySaturation * 0.3
    );
  }
  
  /**
   * 残存ギャップを特定
   */
  private static identifyRemainingGaps({
    newConceptRate,
    relationshipStabilityScore,
    categoryCompleteness,
    criteria
  }: {
    newConceptRate: number;
    relationshipStabilityScore: number;
    categoryCompleteness: number;
    criteria: SamplingCriteria;
  }): string[] {
    const gaps: string[] = [];
    
    if (newConceptRate > criteria.newConceptThreshold) {
      gaps.push(`新概念出現率が高い（${(newConceptRate * 100).toFixed(1)}% > ${(criteria.newConceptThreshold * 100).toFixed(0)}%）`);
    }
    
    if (relationshipStabilityScore < criteria.relationshipStability) {
      gaps.push(`関係性の安定性が不足（${(relationshipStabilityScore * 100).toFixed(1)}% < ${(criteria.relationshipStability * 100).toFixed(0)}%）`);
    }
    
    if (categoryCompleteness < criteria.categoryCompleteness) {
      gaps.push(`カテゴリの完全性が不足（${(categoryCompleteness * 100).toFixed(1)}% < ${(criteria.categoryCompleteness * 100).toFixed(0)}%）`);
    }
    
    return gaps;
  }
  
  /**
   * 次のサンプリングターゲットを決定
   */
  private static determineNextSamplingTargets(remainingGaps: string[], clusters: ClusterLabel[]): string[] {
    const targets: string[] = [];
    
    // ギャップに基づいてターゲットを決定
    remainingGaps.forEach(gap => {
      if (gap.includes('新概念出現率')) {
        targets.push('概念の精緻化と統合');
        targets.push('重複概念の整理');
      }
      if (gap.includes('関係性の安定性')) {
        targets.push('クラスター間関係の強化');
        targets.push('概念間の因果関係の明確化');
      }
      if (gap.includes('カテゴリの完全性')) {
        targets.push('不足カテゴリの探索');
        targets.push('カテゴリ境界の明確化');
      }
    });
    
    // 特定の改善提案も追加
    if (clusters.length < 4) {
      targets.push('新しい理論的カテゴリの発見');
    }
    
    if (clusters.some(c => c.cardIds.length < 3)) {
      targets.push('小規模クラスターの強化');
    }
    
    return [...new Set(targets)]; // 重複除去
  }
  
  /**
   * 総概念数をカウント
   */
  private static countTotalConcepts(clusters: ClusterLabel[]): number {
    return clusters.reduce((sum, cluster) => sum + cluster.cardIds.length, 0);
  }
  
  /**
   * 今回新しく発見された概念数を計算
   */
  private static calculateNewConceptsThisRound(clusters: ClusterLabel[], previousAnalysis?: TheoreticalSamplingAnalysis): number {
    const currentConceptCount = this.countTotalConcepts(clusters);
    
    if (!previousAnalysis) {
      return currentConceptCount;
    }
    
    return Math.max(0, currentConceptCount - previousAnalysis.samplingProgress.conceptsDiscovered);
  }
  
  /**
   * 完成したカテゴリ数をカウント
   */
  private static countCompletedCategories(clusters: ClusterLabel[]): number {
    // 十分なカードを持つクラスターを完成したカテゴリとみなす
    return clusters.filter(cluster => cluster.cardIds.length >= 3 && cluster.confidence >= 0.7).length;
  }
  
  /**
   * サンプリング戦略を推奨
   */
  static recommendSamplingStrategy(
    analysis: TheoreticalSamplingAnalysis,
    clusters: ClusterLabel[]
  ): SamplingStrategy {
    const { saturationAnalysis, qualityMetrics } = analysis;
    
    // 飽和状態に基づく戦略決定
    if (saturationAnalysis.isSaturated) {
      return {
        purpose: 'theory_validation',
        focus: 'negative_cases',
        dataSource: 'external_sources'
      };
    }
    
    // 品質メトリクスに基づく戦略決定
    if (qualityMetrics.conceptDiversity < 0.5) {
      return {
        purpose: 'concept_development',
        focus: 'theoretical_variation',
        dataSource: 'new_data_collection'
      };
    }
    
    if (qualityMetrics.relationshipDensity < 0.5) {
      return {
        purpose: 'relationship_exploration',
        focus: 'extreme_cases',
        dataSource: 'existing_clusters'
      };
    }
    
    // デフォルト戦略
    return {
      purpose: 'concept_development',
      focus: 'theoretical_variation',
      dataSource: 'existing_clusters'
    };
  }
}
