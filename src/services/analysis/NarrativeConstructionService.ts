/**
 * ナラティブ構築分析サービス
 * 発見された概念と関係性から理論的ストーリーラインを構築
 */

import type { ClusterLabel } from '../AnalysisService';
import type { ClusteringResult } from '../SmartClusteringService';

// ナラティブ構築の設定
export interface NarrativeConstructionConfig {
  storyStructure: 'linear' | 'circular' | 'network';
  focusArea: 'concept_development' | 'relationship_evolution' | 'theory_formation';
  detailLevel: 'high' | 'medium' | 'low';
}

// ナラティブ構築の結果
export interface NarrativeConstructionResult {
  storyline: string;
  conceptFlow?: string[];
  theoreticalInsights?: string[];
  qualityMetrics: {
    coherence: number;      // 一貫性 (0-1)
    completeness: number;   // 完全性 (0-1)
    originality: number;    // 独創性 (0-1)
  };
}

export class NarrativeConstructionService {
  
  /**
   * ナラティブストーリーラインを構築
   */
  static constructNarrativeStoryline(
    clusters: ClusterLabel[],
    clusteringResult: ClusteringResult | null,
    config: NarrativeConstructionConfig
  ): NarrativeConstructionResult {
    console.log('📖 [NarrativeConstruction] ナラティブ構築開始');
    console.log(`📊 対象クラスター数: ${clusters.length}`);
    
    // 1. 概念の時系列分析
    const conceptTimeline = this.analyzeConceptTimeline(clusters);
    
    // 2. 関係性の進化パターン分析
    const relationshipEvolution = this.analyzeRelationshipEvolution(clusters, clusteringResult);
    
    // 3. ストーリーラインの構築
    const storyline = this.buildStoryline(clusters, conceptTimeline, relationshipEvolution, config);
    
    // 4. 概念の流れを抽出
    const conceptFlow = this.extractConceptFlow(clusters, conceptTimeline, config);
    
    // 5. 理論的洞察を生成
    const theoreticalInsights = this.generateTheoreticalInsights(clusters, clusteringResult, config);
    
    // 6. 品質指標を計算
    const qualityMetrics = this.calculateQualityMetrics(storyline, conceptFlow, theoreticalInsights);
    
    const result: NarrativeConstructionResult = {
      storyline,
      conceptFlow,
      theoreticalInsights,
      qualityMetrics
    };
    
    console.log('✅ [NarrativeConstruction] ナラティブ構築完了');
    console.log(`📖 ストーリーライン長: ${storyline.length}文字`);
    console.log(`🔄 概念フロー数: ${conceptFlow?.length || 0}`);
    
    return result;
  }
  
  /**
   * 概念の時系列分析
   */
  private static analyzeConceptTimeline(clusters: ClusterLabel[]): Array<{ concept: string; order: number; strength: number }> {
    const timeline: Array<{ concept: string; order: number; strength: number }> = [];
    
    // クラスターの信頼度とカード数を基に順序を決定
    clusters.forEach((cluster, index) => {
      const strength = (cluster.confidence || 0.5) * Math.min((cluster.cardIds?.length || 0) / 10, 1.0);
      const order = index; // 簡易的な順序付け
      
      if (cluster.theme) {
        timeline.push({
          concept: cluster.theme,
          order,
          strength
        });
      }
      
      // 主要なタグも概念として追加
      const dominantTags = cluster.metadata?.dominantTags || [];
      dominantTags.slice(0, 2).forEach((tag, tagIndex) => {
        timeline.push({
          concept: tag,
          order: order + tagIndex * 0.1,
          strength: strength * 0.7
        });
      });
    });
    
    // 強度でソート
    return timeline.sort((a, b) => b.strength - a.strength);
  }
  
  /**
   * 関係性の進化パターン分析
   */
  private static analyzeRelationshipEvolution(
    clusters: ClusterLabel[],
    clusteringResult: ClusteringResult | null
  ): Array<{ type: string; strength: number; evolution: string }> {
    const evolution: Array<{ type: string; strength: number; evolution: string }> = [];
    
    if (!clusteringResult) {
      // クラスター間の関係性を推定
      for (let i = 0; i < clusters.length; i++) {
        for (let j = i + 1; j < clusters.length; j++) {
          const similarity = this.calculateClusterSimilarity(clusters[i], clusters[j]);
          if (similarity > 0.5) {
            evolution.push({
              type: '概念統合',
              strength: similarity,
              evolution: `${clusters[i].theme || 'クラスター' + i} と ${clusters[j].theme || 'クラスター' + j} が統合される可能性`
            });
          }
        }
      }
    } else {
      // クラスタリング結果から関係性を抽出
      evolution.push({
        type: 'クラスタリング結果',
        strength: 0.8,
        evolution: `${clusters.length}個のクラスターが形成され、理論的枠組みの基盤が構築された`
      });
    }
    
    return evolution;
  }
  
  /**
   * 2つのクラスター間の類似性を計算
   */
  private static calculateClusterSimilarity(cluster1: ClusterLabel, cluster2: ClusterLabel): number {
    // テーマの類似性
    const themeSimilarity = cluster1.theme && cluster2.theme && cluster1.theme === cluster2.theme ? 1.0 : 0.0;
    
    // タグの類似性
    const tags1 = cluster1.metadata?.dominantTags || [];
    const tags2 = cluster2.metadata?.dominantTags || [];
    const commonTags = tags1.filter(tag => tags2.includes(tag));
    const tagSimilarity = tags1.length > 0 && tags2.length > 0 
      ? commonTags.length / Math.max(tags1.length, tags2.length)
      : 0.0;
    
    return (themeSimilarity * 0.6 + tagSimilarity * 0.4);
  }
  
  /**
   * ストーリーラインを構築
   */
  private static buildStoryline(
    clusters: ClusterLabel[],
    conceptTimeline: Array<{ concept: string; order: number; strength: number }>,
    relationshipEvolution: Array<{ type: string; strength: number; evolution: string }>,
    config: NarrativeConstructionConfig
  ): string {
    let storyline = '';
    
    // 焦点領域に基づいてストーリーラインを構築
    switch (config.focusArea) {
      case 'concept_development':
        storyline = this.buildConceptDevelopmentStoryline(clusters, conceptTimeline, config);
        break;
      case 'relationship_evolution':
        storyline = this.buildRelationshipEvolutionStoryline(clusters, relationshipEvolution, config);
        break;
      case 'theory_formation':
        storyline = this.buildTheoryFormationStoryline(clusters, conceptTimeline, relationshipEvolution, config);
        break;
      default:
        storyline = this.buildDefaultStoryline(clusters, conceptTimeline, relationshipEvolution, config);
    }
    
    return storyline;
  }
  
  /**
   * 概念発展に焦点を当てたストーリーライン
   */
  private static buildConceptDevelopmentStoryline(
    clusters: ClusterLabel[],
    conceptTimeline: Array<{ concept: string; order: number; strength: number }>,
    config: NarrativeConstructionConfig
  ): string {
    const topConcepts = conceptTimeline.slice(0, Math.min(5, conceptTimeline.length));
    
    let storyline = 'データ分析を通じて、以下の主要概念の発展が観察されました。';
    
    topConcepts.forEach((concept, index) => {
      storyline += ` まず、${concept.concept}の概念が明確化され、`;
      if (index < topConcepts.length - 1) {
        storyline += `次に${topConcepts[index + 1].concept}との関連性が発見されました。`;
      } else {
        storyline += `最終的に理論的枠組みの核心部分が形成されました。`;
      }
    });
    
    storyline += ' この概念発展の過程は、理論構築における重要な洞察を提供しています。';
    
    return storyline;
  }
  
  /**
   * 関係性進化に焦点を当てたストーリーライン
   */
  private static buildRelationshipEvolutionStoryline(
    clusters: ClusterLabel[],
    relationshipEvolution: Array<{ type: string; strength: number; evolution: string }>,
    config: NarrativeConstructionConfig
  ): string {
    let storyline = 'クラスター間の関係性の進化を通じて、理論的枠組みの構造が明らかになりました。';
    
    if (relationshipEvolution.length > 0) {
      storyline += ' 特に、';
      relationshipEvolution.slice(0, 3).forEach((evolution, index) => {
        storyline += evolution.evolution;
        if (index < relationshipEvolution.length - 1) {
          storyline += '。また、';
        } else {
          storyline += '。';
        }
      });
    }
    
    storyline += ' これらの関係性の進化は、理論の成熟度を示す重要な指標となっています。';
    
    return storyline;
  }
  
  /**
   * 理論形成に焦点を当てたストーリーライン
   */
  private static buildTheoryFormationStoryline(
    clusters: ClusterLabel[],
    conceptTimeline: Array<{ concept: string; order: number; strength: number }>,
    relationshipEvolution: Array<{ type: string; strength: number; evolution: string }>,
    config: NarrativeConstructionConfig
  ): string {
    let storyline = '概念の発展と関係性の進化を通じて、包括的な理論的枠組みが構築されました。';
    
    storyline += ` ${clusters.length}個のクラスターから抽出された概念は、`;
    storyline += '相互に関連し合い、理論の基盤を形成しています。';
    
    if (conceptTimeline.length > 0) {
      const coreConcept = conceptTimeline[0];
      storyline += ` 特に、${coreConcept.concept}は理論の中心概念として機能し、`;
      storyline += '他の概念との関係性を通じて理論の一貫性を保っています。';
    }
    
    storyline += ' この理論的枠組みは、データから導出された実証的な基盤を持ち、';
    storyline += '今後の研究における仮説形成と検証の指針となります。';
    
    return storyline;
  }
  
  /**
   * デフォルトのストーリーライン
   */
  private static buildDefaultStoryline(
    clusters: ClusterLabel[],
    conceptTimeline: Array<{ concept: string; order: number; strength: number }>,
    relationshipEvolution: Array<{ type: string; strength: number; evolution: string }>,
    config: NarrativeConstructionConfig
  ): string {
    return this.buildTheoryFormationStoryline(clusters, conceptTimeline, relationshipEvolution, config);
  }
  
  /**
   * 概念の流れを抽出
   */
  private static extractConceptFlow(
    clusters: ClusterLabel[],
    conceptTimeline: Array<{ concept: string; order: number; strength: number }>,
    config: NarrativeConstructionConfig
  ): string[] {
    const flow: string[] = [];
    
    // 詳細レベルに基づいて概念数を調整
    const maxConcepts = config.detailLevel === 'high' ? 8 : config.detailLevel === 'medium' ? 5 : 3;
    
    conceptTimeline.slice(0, maxConcepts).forEach(concept => {
      flow.push(concept.concept);
    });
    
    return flow;
  }
  
  /**
   * 理論的洞察を生成
   */
  private static generateTheoreticalInsights(
    clusters: ClusterLabel[],
    clusteringResult: ClusteringResult | null,
    config: NarrativeConstructionConfig
  ): string[] {
    const insights: string[] = [];
    
    // クラスター数に基づく洞察
    if (clusters.length >= 5) {
      insights.push('複数のクラスターが形成され、理論の多様性が確保されている');
    } else if (clusters.length >= 3) {
      insights.push('適切な数のクラスターが形成され、理論の構造化が進んでいる');
    } else {
      insights.push('クラスター数が少なく、さらなるデータ収集が必要');
    }
    
    // 信頼度に基づく洞察
    const highConfidenceClusters = clusters.filter(c => (c.confidence || 0) > 0.7);
    if (highConfidenceClusters.length > 0) {
      insights.push(`${highConfidenceClusters.length}個の高信頼度クラスターが理論の信頼性を支えている`);
    }
    
    // テーマの多様性に基づく洞察
    const themes = clusters.map(c => c.theme).filter(Boolean);
    const uniqueThemes = new Set(themes);
    if (uniqueThemes.size > 1) {
      insights.push('複数のテーマが発見され、理論の包括性が向上している');
    }
    
    // カード数の分布に基づく洞察
    const cardCounts = clusters.map(c => c.cardIds?.length || 0);
    const avgCardCount = cardCounts.reduce((sum, count) => sum + count, 0) / cardCounts.length;
    if (avgCardCount >= 5) {
      insights.push('各クラスターに十分なカードが含まれており、概念の安定性が高い');
    }
    
    return insights;
  }
  
  /**
   * 品質指標を計算
   */
  private static calculateQualityMetrics(
    storyline: string,
    conceptFlow?: string[],
    theoreticalInsights?: string[]
  ): { coherence: number; completeness: number; originality: number } {
    // 一貫性: ストーリーラインの論理的整合性
    const coherence = Math.min(storyline.length / 200, 1.0); // 200文字以上で1.0
    
    // 完全性: 概念フローと洞察の充実度
    const conceptCompleteness = conceptFlow ? Math.min(conceptFlow.length / 5, 1.0) : 0;
    const insightCompleteness = theoreticalInsights ? Math.min(theoreticalInsights.length / 3, 1.0) : 0;
    const completeness = (conceptCompleteness + insightCompleteness) / 2;
    
    // 独創性: ユニークな要素の割合
    const uniqueWords = new Set(storyline.split(' '));
    const originality = Math.min(uniqueWords.size / 100, 1.0); // 100語以上で1.0
    
    return {
      coherence: Math.round(coherence * 100) / 100,
      completeness: Math.round(completeness * 100) / 100,
      originality: Math.round(originality * 100) / 100
    };
  }
}
