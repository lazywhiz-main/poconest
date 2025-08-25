/**
 * 定数比較法分析サービス
 * 概念の比較とカテゴリ統合の機能を実装します
 */

import type { ClusterLabel } from '../AnalysisService';

// 定数比較法の基準
export interface ConstantComparisonCriteria {
  conceptSimilarity: number;        // 概念の類似性閾値
  relationshipStrength: number;     // 関係性の強度閾値
  categoryCoherence: number;        // カテゴリの一貫性閾値
}

// 定数比較法の進捗
export interface ConstantComparisonProgress {
  currentRound: number;
  totalComparisons: number;
  conceptsCompared: number;
  relationshipsIdentified: number;
  categoriesFormed: number;
  theoreticalIntegration: number;
}

// 概念クラスター
export interface ConceptCluster {
  id: string;
  name: string;
  concepts: string[];
  coherence: number;
  relationships: string[];
}

// 関係性パターン
export interface RelationshipPattern {
  id: string;
  type: string;
  strength: number;
  concepts: string[];
  evidence: string[];
}

// 理論的枠組み
export interface TheoreticalFramework {
  coreCategory: string;
  supportingCategories: string[];
  integrationLevel: number;
  gaps: string[];
}

// 定数比較法の結果
export interface ConstantComparisonResult {
  comparisonProgress: ConstantComparisonProgress;
  comparisonResults: {
    conceptClusters: ConceptCluster[];
    relationshipPatterns: RelationshipPattern[];
    theoreticalFramework: TheoreticalFramework;
  };
}

export class ConstantComparisonService {
  
  /**
   * 定数比較法分析を実行
   */
  static analyzeConstantComparison(
    clusters: ClusterLabel[],
    criteria: ConstantComparisonCriteria
  ): ConstantComparisonResult {
    console.log('🔄 [ConstantComparison] 定数比較法分析開始');
    console.log(`📊 対象クラスター数: ${clusters.length}`);
    
    // 1. 概念の類似性分析
    const conceptSimilarities = this.analyzeConceptSimilarities(clusters, criteria.conceptSimilarity);
    
    // 2. 関係性の強度分析
    const relationshipStrengths = this.analyzeRelationshipStrengths(clusters, criteria.relationshipStrength);
    
    // 3. カテゴリの一貫性分析
    const categoryCoherences = this.analyzeCategoryCoherences(clusters, criteria.categoryCoherence);
    
    // 4. 概念クラスターの形成
    const conceptClusters = this.formConceptClusters(clusters, conceptSimilarities);
    
    // 5. 関係性パターンの特定
    const relationshipPatterns = this.identifyRelationshipPatterns(clusters, relationshipStrengths);
    
    // 6. 理論的枠組みの構築
    const theoreticalFramework = this.buildTheoreticalFramework(conceptClusters, relationshipPatterns);
    
    // 7. 進捗の計算
    const progress = this.calculateProgress(clusters, conceptClusters, relationshipPatterns);
    
    const result: ConstantComparisonResult = {
      comparisonProgress: progress,
      comparisonResults: {
        conceptClusters,
        relationshipPatterns,
        theoreticalFramework
      }
    };
    
    console.log('✅ [ConstantComparison] 定数比較法分析完了');
    console.log(`📊 形成カテゴリ数: ${conceptClusters.length}`);
    console.log(`🔄 特定関係性数: ${relationshipPatterns.length}`);
    
    return result;
  }
  
  /**
   * 概念の類似性を分析
   */
  private static analyzeConceptSimilarities(
    clusters: ClusterLabel[],
    threshold: number
  ): Array<{ cluster1: string; cluster2: string; similarity: number }> {
    const similarities: Array<{ cluster1: string; cluster2: string; similarity: number }> = [];
    
    for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        const similarity = this.calculateConceptSimilarity(clusters[i], clusters[j]);
        if (similarity >= threshold) {
          similarities.push({
            cluster1: clusters[i].id,
            cluster2: clusters[j].id,
            similarity
          });
        }
      }
    }
    
    return similarities.sort((a, b) => b.similarity - a.similarity);
  }
  
  /**
   * 2つのクラスター間の概念類似性を計算
   */
  private static calculateConceptSimilarity(cluster1: ClusterLabel, cluster2: ClusterLabel): number {
    // テーマの類似性
    const themeSimilarity = cluster1.theme && cluster2.theme && cluster1.theme === cluster2.theme ? 1.0 : 0.0;
    
    // タグの類似性
    const tags1 = cluster1.metadata?.dominantTags || [];
    const tags2 = cluster2.metadata?.dominantTags || [];
    const commonTags = tags1.filter(tag => tags2.includes(tag));
    const tagSimilarity = tags1.length > 0 && tags2.length > 0 
      ? commonTags.length / Math.max(tags1.length, tags2.length)
      : 0.0;
    
    // カード数の類似性
    const cardCount1 = cluster1.cardIds?.length || 0;
    const cardCount2 = cluster2.cardIds?.length || 0;
    const cardCountSimilarity = Math.max(cardCount1, cardCount2) > 0
      ? Math.min(cardCount1, cardCount2) / Math.max(cardCount1, cardCount2)
      : 0.0;
    
    // 重み付き平均
    return (themeSimilarity * 0.4 + tagSimilarity * 0.4 + cardCountSimilarity * 0.2);
  }
  
  /**
   * 関係性の強度を分析
   */
  private static analyzeRelationshipStrengths(
    clusters: ClusterLabel[],
    threshold: number
  ): Array<{ cluster1: string; cluster2: string; strength: number; type: string }> {
    const relationships: Array<{ cluster1: string; cluster2: string; strength: number; type: string }> = [];
    
    for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        const strength = this.calculateRelationshipStrength(clusters[i], clusters[j]);
        if (strength >= threshold) {
          const type = this.determineRelationshipType(clusters[i], clusters[j]);
          relationships.push({
            cluster1: clusters[i].id,
            cluster2: clusters[j].id,
            strength,
            type
          });
        }
      }
    }
    
    return relationships.sort((a, b) => b.strength - a.strength);
  }
  
  /**
   * 関係性の強度を計算
   */
  private static calculateRelationshipStrength(cluster1: ClusterLabel, cluster2: ClusterLabel): number {
    // 概念類似性を基に関係性強度を計算
    const conceptSimilarity = this.calculateConceptSimilarity(cluster1, cluster2);
    
    // クラスターの重要度（カード数と信頼度）
    const importance1 = (cluster1.cardIds?.length || 0) * (cluster1.confidence || 0.5);
    const importance2 = (cluster2.cardIds?.length || 0) * (cluster2.confidence || 0.5);
    const importanceFactor = Math.min(importance1, importance2) / Math.max(importance1, importance2);
    
    return conceptSimilarity * 0.7 + importanceFactor * 0.3;
  }
  
  /**
   * 関係性のタイプを決定
   */
  private static determineRelationshipType(cluster1: ClusterLabel, cluster2: ClusterLabel): string {
    const similarity = this.calculateConceptSimilarity(cluster1, cluster2);
    
    if (similarity >= 0.8) return '強く関連';
    if (similarity >= 0.6) return '中程度に関連';
    if (similarity >= 0.4) return '弱く関連';
    return '関連性低';
  }
  
  /**
   * カテゴリの一貫性を分析
   */
  private static analyzeCategoryCoherences(
    clusters: ClusterLabel[],
    threshold: number
  ): Array<{ clusterId: string; coherence: number }> {
    return clusters.map(cluster => ({
      clusterId: cluster.id,
      coherence: this.calculateCategoryCoherence(cluster)
    })).filter(item => item.coherence >= threshold);
  }
  
  /**
   * カテゴリの一貫性を計算
   */
  private static calculateCategoryCoherence(cluster: ClusterLabel): number {
    // テーマの明確性
    const themeClarity = cluster.theme ? 1.0 : 0.0;
    
    // タグの一貫性
    const tags = cluster.metadata?.dominantTags || [];
    const tagConsistency = tags.length > 0 ? Math.min(tags.length / 5, 1.0) : 0.0;
    
    // 信頼度
    const confidence = cluster.confidence || 0.5;
    
    // カード数の適切性
    const cardCount = cluster.cardIds?.length || 0;
    const cardCountAppropriateness = cardCount >= 3 && cardCount <= 20 ? 1.0 : 
                                   cardCount > 0 ? 0.5 : 0.0;
    
    return (themeClarity * 0.3 + tagConsistency * 0.2 + confidence * 0.3 + cardCountAppropriateness * 0.2);
  }
  
  /**
   * 概念クラスターを形成
   */
  private static formConceptClusters(
    clusters: ClusterLabel[],
    similarities: Array<{ cluster1: string; cluster2: string; similarity: number }>
  ): ConceptCluster[] {
    const conceptClusters: ConceptCluster[] = [];
    const processedClusters = new Set<string>();
    
    for (const cluster of clusters) {
      if (processedClusters.has(cluster.id)) continue;
      
      const relatedClusters = similarities
        .filter(s => s.cluster1 === cluster.id || s.cluster2 === cluster.id)
        .map(s => s.cluster1 === cluster.id ? s.cluster2 : s.cluster1);
      
      const clusterGroup = [cluster.id, ...relatedClusters];
      clusterGroup.forEach(id => processedClusters.add(id));
      
      const clusterObjects = clusterGroup.map(id => clusters.find(c => c.id === id)!);
      const concepts = clusterObjects.flatMap(c => c.metadata?.dominantTags || []);
      const uniqueConcepts = [...new Set(concepts)];
      
      const coherence = this.calculateGroupCoherence(clusterObjects);
      
      conceptClusters.push({
        id: `cluster_${cluster.id}`,
        name: cluster.theme || `クラスター ${cluster.id}`,
        concepts: uniqueConcepts,
        coherence,
        relationships: relatedClusters
      });
    }
    
    return conceptClusters;
  }
  
  /**
   * グループの一貫性を計算
   */
  private static calculateGroupCoherence(clusters: ClusterLabel[]): number {
    if (clusters.length === 0) return 0;
    
    const coherences = clusters.map(cluster => this.calculateCategoryCoherence(cluster));
    return coherences.reduce((sum, coh) => sum + coh, 0) / coherences.length;
  }
  
  /**
   * 関係性パターンを特定
   */
  private static identifyRelationshipPatterns(
    clusters: ClusterLabel[],
    relationships: Array<{ cluster1: string; cluster2: string; strength: number; type: string }>
  ): RelationshipPattern[] {
    return relationships.map((rel, index) => ({
      id: `pattern_${index}`,
      type: rel.type,
      strength: rel.strength,
      concepts: [rel.cluster1, rel.cluster2],
      evidence: [`クラスター ${rel.cluster1} と ${rel.cluster2} の関係性強度: ${(rel.strength * 100).toFixed(1)}%`]
    }));
  }
  
  /**
   * 理論的枠組みを構築
   */
  private static buildTheoreticalFramework(
    conceptClusters: ConceptCluster[],
    relationshipPatterns: RelationshipPattern[]
  ): TheoreticalFramework {
    // 最も一貫性の高いクラスターをコアカテゴリとして選択
    const coreCluster = conceptClusters.reduce((best, current) => 
      current.coherence > best.coherence ? current : best
    );
    
    // サポートカテゴリを選択（コアカテゴリと関連性の高いもの）
    const supportingCategories = conceptClusters
      .filter(cluster => cluster.id !== coreCluster.id)
      .slice(0, 3)
      .map(cluster => cluster.name);
    
    // 統合レベルを計算
    const integrationLevel = Math.min(
      (conceptClusters.length / 5) * 0.4 +
      (relationshipPatterns.length / 10) * 0.3 +
      (coreCluster.coherence) * 0.3,
      1.0
    );
    
    // ギャップを特定
    const gaps = this.identifyGaps(conceptClusters, relationshipPatterns);
    
    return {
      coreCategory: coreCluster.name,
      supportingCategories,
      integrationLevel,
      gaps
    };
  }
  
  /**
   * ギャップを特定
   */
  private static identifyGaps(
    conceptClusters: ConceptCluster[],
    relationshipPatterns: RelationshipPattern[]
  ): string[] {
    const gaps: string[] = [];
    
    if (conceptClusters.length < 3) {
      gaps.push('概念クラスターが少なく、理論的枠組みが不十分');
    }
    
    if (relationshipPatterns.length < 2) {
      gaps.push('関係性パターンが少なく、概念間の関連性が不明確');
    }
    
    const lowCoherenceClusters = conceptClusters.filter(cluster => cluster.coherence < 0.6);
    if (lowCoherenceClusters.length > 0) {
      gaps.push(`${lowCoherenceClusters.length}個のクラスターで一貫性が低い`);
    }
    
    return gaps;
  }
  
  /**
   * 進捗を計算
   */
  private static calculateProgress(
    clusters: ClusterLabel[],
    conceptClusters: ConceptCluster[],
    relationshipPatterns: RelationshipPattern[]
  ): ConstantComparisonProgress {
    const totalComparisons = (clusters.length * (clusters.length - 1)) / 2;
    const conceptsCompared = Math.min(clusters.length, totalComparisons);
    const relationshipsIdentified = relationshipPatterns.length;
    const categoriesFormed = conceptClusters.length;
    
    const theoreticalIntegration = Math.min(
      (conceptsCompared / Math.max(totalComparisons, 1)) * 0.3 +
      (relationshipsIdentified / Math.max(clusters.length, 1)) * 0.3 +
      (categoriesFormed / Math.max(clusters.length, 1)) * 0.4,
      1.0
    );
    
    return {
      currentRound: 1,
      totalComparisons: Math.ceil(totalComparisons / 10),
      conceptsCompared,
      relationshipsIdentified,
      categoriesFormed,
      theoreticalIntegration
    };
  }
}
