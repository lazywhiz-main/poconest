/**
 * 概念分析サービス
 * クラスターの詳細内容、概念間関係性、ナラティブ仮説生成
 */

import type { ClusterLabel } from '../AnalysisService';
import type { ClusteringResult } from '../SmartClusteringService';

// 概念の詳細分析結果
export interface ConceptAnalysis {
  conceptDetails: ConceptDetail[];
  conceptRelationships: ConceptRelationship[];
  theoreticalStructure: TheoreticalStructure;
  narrativeHypothesis: NarrativeHypothesis;
}

// 個別概念の詳細
export interface ConceptDetail {
  id: string;
  name: string;
  description: string;
  keywords: string[];
  cardCount: number;
  confidence: number;
  dominantThemes: string[];
  semanticCore: string;
  variationFactors: string[];
}

// 概念間の関係性
export interface ConceptRelationship {
  sourceConcept: string;
  targetConcept: string;
  relationshipType: 'causal' | 'hierarchical' | 'temporal' | 'semantic' | 'contrastive';
  strength: number; // 0-1
  evidence: string[];
  direction: 'bidirectional' | 'unidirectional';
}

// 理論的構造
export interface TheoreticalStructure {
  coreConcepts: string[];
  supportingConcepts: string[];
  peripheralConcepts: string[];
  conceptHierarchy: ConceptHierarchyNode[];
  theoreticalGaps: string[];
  integrationPoints: string[];
}

// 概念階層ノード
export interface ConceptHierarchyNode {
  concept: string;
  level: number;
  children: string[];
  parent?: string;
  theoreticalRole: 'foundational' | 'bridging' | 'emergent' | 'validating';
}

// ナラティブ仮説
export interface NarrativeHypothesis {
  mainStoryline: string;
  keyPlotPoints: PlotPoint[];
  characterRoles: CharacterRole[];
  conflictResolution: string;
  theoreticalImplications: string[];
  supportingEvidence: EvidenceItem[];
  alternativeScenarios: string[];
}

// ストーリープロットポイント
export interface PlotPoint {
  sequence: number;
  description: string;
  involvedConcepts: string[];
  causalFactors: string[];
  theoreticalSignificance: string;
}

// ストーリー内のキャラクター役割
export interface CharacterRole {
  concept: string;
  role: 'protagonist' | 'antagonist' | 'supporting' | 'catalyst' | 'resolution';
  motivation: string;
  development: string;
  relationships: string[];
}

// 証拠アイテム
export interface EvidenceItem {
  type: 'concept_cluster' | 'relationship_pattern' | 'temporal_sequence' | 'semantic_coherence';
  description: string;
  strength: number;
  source: string;
  reliability: number;
}

export class ConceptAnalysisService {
  
  /**
   * 概念の詳細分析を実行
   */
  static analyzeConcepts(
    clusters: ClusterLabel[],
    clusteringResult: ClusteringResult | null
  ): ConceptAnalysis {
    console.log('🔍 [ConceptAnalysis] 概念詳細分析開始');
    
    // 1. 概念詳細の分析
    const conceptDetails = this.analyzeConceptDetails(clusters);
    
    // 2. 概念間関係性の分析
    const conceptRelationships = this.analyzeConceptRelationships(clusters, clusteringResult);
    
    // 3. 理論的構造の分析
    const theoreticalStructure = this.analyzeTheoreticalStructure(conceptDetails, conceptRelationships);
    
    // 4. ナラティブ仮説の生成
    const narrativeHypothesis = this.generateNarrativeHypothesis(conceptDetails, conceptRelationships, theoreticalStructure);
    
    const result: ConceptAnalysis = {
      conceptDetails,
      conceptRelationships,
      theoreticalStructure,
      narrativeHypothesis
    };
    
    console.log('✅ [ConceptAnalysis] 概念詳細分析完了');
    return result;
  }
  
  /**
   * 個別概念の詳細分析
   */
  private static analyzeConceptDetails(clusters: ClusterLabel[]): ConceptDetail[] {
    return clusters.map(cluster => {
      // 主要テーマの抽出
      const dominantThemes = this.extractDominantThemes(cluster);
      
      // 意味的核心の特定
      const semanticCore = this.identifySemanticCore(cluster);
      
      // 変動要因の特定
      const variationFactors = this.identifyVariationFactors(cluster);
      
      return {
        id: cluster.id,
        name: cluster.text,
        description: cluster.theme || 'テーマ未設定',
        keywords: cluster.metadata?.dominantTags || [],
        cardCount: cluster.cardIds.length,
        confidence: cluster.confidence,
        dominantThemes,
        semanticCore,
        variationFactors
      };
    });
  }
  
  /**
   * 主要テーマの抽出
   */
  private static extractDominantThemes(cluster: ClusterLabel): string[] {
    const themes: string[] = [];
    
    // テーマから主要概念を抽出
    if (cluster.theme) {
      const themeWords = cluster.theme.split(/[、,]/).map(w => w.trim());
      themes.push(...themeWords.filter(w => w.length > 1));
    }
    
    // タグからテーマを抽出
    if (cluster.metadata?.dominantTags) {
      const tagThemes = cluster.metadata.dominantTags
        .filter(tag => tag.length > 2) // 短すぎるタグは除外
        .slice(0, 5); // 上位5つまで
      themes.push(...tagThemes);
    }
    
    return [...new Set(themes)]; // 重複除去
  }
  
  /**
   * 意味的核心の特定
   */
  private static identifySemanticCore(cluster: ClusterLabel): string {
    if (cluster.theme) {
      return cluster.theme;
    }
    
    if (cluster.metadata?.dominantTags && cluster.metadata.dominantTags.length > 0) {
      return cluster.metadata.dominantTags[0];
    }
    
    return '概念の核心が特定できません';
  }
  
  /**
   * 変動要因の特定
   */
  private static identifyVariationFactors(cluster: ClusterLabel): string[] {
    const factors: string[] = [];
    
    // カード数の変動
    if (cluster.cardIds.length < 3) {
      factors.push('概念の安定性が低い');
    } else if (cluster.cardIds.length > 10) {
      factors.push('概念が過度に拡散している');
    }
    
    // 信頼度の変動
    if (cluster.confidence < 0.6) {
      factors.push('信頼度が低い');
    }
    
    // テーマの曖昧性
    if (!cluster.theme || cluster.theme.length < 3) {
      factors.push('テーマが曖昧');
    }
    
    return factors;
  }
  
  /**
   * 概念間関係性の分析
   */
  private static analyzeConceptRelationships(
    clusters: ClusterLabel[],
    clusteringResult: ClusteringResult | null
  ): ConceptRelationship[] {
    const relationships: ConceptRelationship[] = [];
    
    for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        const cluster1 = clusters[i];
        const cluster2 = clusters[j];
        
        const relationship = this.analyzeConceptPair(cluster1, cluster2);
        if (relationship) {
          relationships.push(relationship);
        }
      }
    }
    
    return relationships;
  }
  
  /**
   * 概念ペアの関係性分析
   */
  private static analyzeConceptPair(cluster1: ClusterLabel, cluster2: ClusterLabel): ConceptRelationship | null {
    // 共通タグの分析
    const commonTags = this.findCommonTags(cluster1, cluster2);
    if (commonTags.length === 0) {
      return null; // 関係性なし
    }
    
    // 関係性タイプの判定
    const relationshipType = this.determineRelationshipType(cluster1, cluster2, commonTags);
    
    // 関係性の強度計算
    const strength = this.calculateRelationshipStrength(cluster1, cluster2, commonTags);
    
    // 証拠の特定
    const evidence = this.identifyRelationshipEvidence(cluster1, cluster2, commonTags);
    
    return {
      sourceConcept: cluster1.text,
      targetConcept: cluster2.text,
      relationshipType,
      strength,
      evidence,
      direction: 'bidirectional' // 基本的に双方向
    };
  }
  
  /**
   * 共通タグの検索
   */
  private static findCommonTags(cluster1: ClusterLabel, cluster2: ClusterLabel): string[] {
    const tags1 = new Set(cluster1.metadata?.dominantTags || []);
    const tags2 = new Set(cluster2.metadata?.dominantTags || []);
    
    return [...tags1].filter(tag => tags2.has(tag));
  }
  
  /**
   * 関係性タイプの判定
   */
  private static determineRelationshipType(
    cluster1: ClusterLabel, 
    cluster2: ClusterLabel, 
    commonTags: string[]
  ): 'causal' | 'hierarchical' | 'temporal' | 'semantic' | 'contrastive' {
    // 因果関係の判定
    if (this.hasCausalRelationship(cluster1, cluster2)) {
      return 'causal';
    }
    
    // 階層関係の判定
    if (this.hasHierarchicalRelationship(cluster1, cluster2)) {
      return 'hierarchical';
    }
    
    // 時間的関係の判定
    if (this.hasTemporalRelationship(cluster1, cluster2)) {
      return 'temporal';
    }
    
    // 対比関係の判定
    if (this.hasContrastiveRelationship(cluster1, cluster2)) {
      return 'contrastive';
    }
    
    // デフォルトは意味的関係
    return 'semantic';
  }
  
  /**
   * 因果関係の判定
   */
  private static hasCausalRelationship(cluster1: ClusterLabel, cluster2: ClusterLabel): boolean {
    const causalKeywords = ['原因', '結果', '影響', '引き起こす', '生じる', '導く'];
    const text1 = cluster1.text + (cluster1.theme || '');
    const text2 = cluster2.text + (cluster2.theme || '');
    
    return causalKeywords.some(keyword => 
      text1.includes(keyword) || text2.includes(keyword)
    );
  }
  
  /**
   * 階層関係の判定
   */
  private static hasHierarchicalRelationship(cluster1: ClusterLabel, cluster2: ClusterLabel): boolean {
    const hierarchicalKeywords = ['上位', '下位', '包含', '部分', '全体', '分類'];
    const text1 = cluster1.text + (cluster1.theme || '');
    const text2 = cluster2.text + (cluster2.theme || '');
    
    return hierarchicalKeywords.some(keyword => 
      text1.includes(keyword) || text2.includes(keyword)
    );
  }
  
  /**
   * 時間的関係の判定
   */
  private static hasTemporalRelationship(cluster1: ClusterLabel, cluster2: ClusterLabel): boolean {
    const temporalKeywords = ['前', '後', '初期', '後期', '段階', '過程', '発展'];
    const text1 = cluster1.text + (cluster1.theme || '');
    const text2 = cluster2.text + (cluster2.theme || '');
    
    return temporalKeywords.some(keyword => 
      text1.includes(keyword) || text2.includes(keyword)
    );
  }
  
  /**
   * 対比関係の判定
   */
  private static hasContrastiveRelationship(cluster1: ClusterLabel, cluster2: ClusterLabel): boolean {
    const contrastiveKeywords = ['対立', '相反', '違い', '比較', '対比', '反対'];
    const text1 = cluster1.text + (cluster1.theme || '');
    const text2 = cluster2.text + (cluster2.theme || '');
    
    return contrastiveKeywords.some(keyword => 
      text1.includes(keyword) || text2.includes(keyword)
    );
  }
  
  /**
   * 関係性の強度計算
   */
  private static calculateRelationshipStrength(
    cluster1: ClusterLabel, 
    cluster2: ClusterLabel, 
    commonTags: string[]
  ): number {
    const totalTags1 = (cluster1.metadata?.dominantTags || []).length;
    const totalTags2 = (cluster2.metadata?.dominantTags || []).length;
    
    if (totalTags1 === 0 || totalTags2 === 0) {
      return 0;
    }
    
    // 共通タグの割合
    const tagOverlap = commonTags.length / Math.min(totalTags1, totalTags2);
    
    // 信頼度の平均
    const avgConfidence = (cluster1.confidence + cluster2.confidence) / 2;
    
    // カード数のバランス
    const cardBalance = 1 - Math.abs(cluster1.cardIds.length - cluster2.cardIds.length) / 
      Math.max(cluster1.cardIds.length, cluster2.cardIds.length);
    
    return (tagOverlap * 0.5 + avgConfidence * 0.3 + cardBalance * 0.2);
  }
  
  /**
   * 関係性の証拠特定
   */
  private static identifyRelationshipEvidence(
    cluster1: ClusterLabel, 
    cluster2: ClusterLabel, 
    commonTags: string[]
  ): string[] {
    const evidence: string[] = [];
    
    // 共通タグの証拠
    if (commonTags.length > 0) {
      evidence.push(`共通タグ: ${commonTags.join(', ')}`);
    }
    
    // テーマの類似性
    if (cluster1.theme && cluster2.theme) {
      evidence.push(`テーマ類似性: ${cluster1.theme} ↔ ${cluster2.theme}`);
    }
    
    // カード数の類似性
    if (Math.abs(cluster1.cardIds.length - cluster2.cardIds.length) <= 2) {
      evidence.push('カード数の類似性');
    }
    
    // 信頼度の類似性
    if (Math.abs(cluster1.confidence - cluster2.confidence) <= 0.2) {
      evidence.push('信頼度の類似性');
    }
    
    return evidence;
  }
  
  /**
   * 理論的構造の分析
   */
  private static analyzeTheoreticalStructure(
    conceptDetails: ConceptDetail[],
    conceptRelationships: ConceptRelationship[]
  ): TheoreticalStructure {
    // コア概念の特定（信頼度とカード数が高い）
    const coreConcepts = conceptDetails
      .filter(c => c.confidence >= 0.8 && c.cardCount >= 5)
      .map(c => c.name);
    
    // サポート概念（中程度の信頼度）
    const supportingConcepts = conceptDetails
      .filter(c => c.confidence >= 0.6 && c.cardCount >= 3 && !coreConcepts.includes(c.name))
      .map(c => c.name);
    
    // 周辺概念（低い信頼度または少ないカード数）
    const peripheralConcepts = conceptDetails
      .filter(c => !coreConcepts.includes(c.name) && !supportingConcepts.includes(c.name))
      .map(c => c.name);
    
    // 概念階層の構築
    const conceptHierarchy = this.buildConceptHierarchy(conceptDetails, conceptRelationships);
    
    // 理論的ギャップの特定
    const theoreticalGaps = this.identifyTheoreticalGaps(conceptDetails, conceptRelationships);
    
    // 統合ポイントの特定
    const integrationPoints = this.identifyIntegrationPoints(conceptDetails, conceptRelationships);
    
    return {
      coreConcepts,
      supportingConcepts,
      peripheralConcepts,
      conceptHierarchy,
      theoreticalGaps,
      integrationPoints
    };
  }
  
  /**
   * 概念階層の構築
   */
  private static buildConceptHierarchy(
    conceptDetails: ConceptDetail[],
    conceptRelationships: ConceptRelationship[]
  ): ConceptHierarchyNode[] {
    const hierarchy: ConceptHierarchyNode[] = [];
    
    // 階層関係を持つ概念ペアを特定
    const hierarchicalRelations = conceptRelationships.filter(r => r.relationshipType === 'hierarchical');
    
    // 各概念の階層レベルを決定
    conceptDetails.forEach(concept => {
      const level = this.determineConceptLevel(concept, hierarchicalRelations);
      const children = this.findChildConcepts(concept.name, hierarchicalRelations);
      const parent = this.findParentConcept(concept.name, hierarchicalRelations);
      const theoreticalRole = this.determineTheoreticalRole(concept, level);
      
      hierarchy.push({
        concept: concept.name,
        level,
        children,
        parent,
        theoreticalRole
      });
    });
    
    return hierarchy;
  }
  
  /**
   * 概念の階層レベル決定
   */
  private static determineConceptLevel(
    concept: ConceptDetail,
    hierarchicalRelations: ConceptRelationship[]
  ): number {
    // 親概念を持つ場合は親のレベル+1
    const parentRelation = hierarchicalRelations.find(r => 
      r.targetConcept === concept.name && r.relationshipType === 'hierarchical'
    );
    
    if (parentRelation) {
      return 1; // 親のレベル+1（簡略化）
    }
    
    // 子概念を持つ場合はレベル0（ルート）
    const hasChildren = hierarchicalRelations.some(r => 
      r.sourceConcept === concept.name && r.relationshipType === 'hierarchical'
    );
    
    return hasChildren ? 0 : 1;
  }
  
  /**
   * 子概念の検索
   */
  private static findChildConcepts(
    conceptName: string,
    hierarchicalRelations: ConceptRelationship[]
  ): string[] {
    return hierarchicalRelations
      .filter(r => r.sourceConcept === conceptName && r.relationshipType === 'hierarchical')
      .map(r => r.targetConcept);
  }
  
  /**
   * 親概念の検索
   */
  private static findParentConcept(
    conceptName: string,
    hierarchicalRelations: ConceptRelationship[]
  ): string | undefined {
    const parentRelation = hierarchicalRelations.find(r => 
      r.targetConcept === conceptName && r.relationshipType === 'hierarchical'
    );
    
    return parentRelation?.sourceConcept;
  }
  
  /**
   * 理論的役割の決定
   */
  private static determineTheoreticalRole(
    concept: ConceptDetail,
    level: number
  ): 'foundational' | 'bridging' | 'emergent' | 'validating' {
    if (level === 0) return 'foundational';
    if (concept.confidence >= 0.8) return 'validating';
    if (concept.cardCount >= 5) return 'bridging';
    return 'emergent';
  }
  
  /**
   * 理論的ギャップの特定
   */
  private static identifyTheoreticalGaps(
    conceptDetails: ConceptDetail[],
    conceptRelationships: ConceptRelationship[]
  ): string[] {
    const gaps: string[] = [];
    
    // 孤立した概念の特定
    const isolatedConcepts = conceptDetails.filter(concept => {
      const hasRelations = conceptRelationships.some(r => 
        r.sourceConcept === concept.name || r.targetConcept === concept.name
      );
      return !hasRelations;
    });
    
    if (isolatedConcepts.length > 0) {
      gaps.push(`孤立した概念: ${isolatedConcepts.map(c => c.name).join(', ')}`);
    }
    
    // 弱い関係性の特定
    const weakRelations = conceptRelationships.filter(r => r.strength < 0.3);
    if (weakRelations.length > 0) {
      gaps.push(`弱い関係性: ${weakRelations.length}個の関係性が弱い`);
    }
    
    // 低信頼度概念の特定
    const lowConfidenceConcepts = conceptDetails.filter(c => c.confidence < 0.5);
    if (lowConfidenceConcepts.length > 0) {
      gaps.push(`低信頼度概念: ${lowConfidenceConcepts.map(c => c.name).join(', ')}`);
    }
    
    return gaps;
  }
  
  /**
   * 統合ポイントの特定
   */
  private static identifyIntegrationPoints(
    conceptDetails: ConceptDetail[],
    conceptRelationships: ConceptRelationship[]
  ): string[] {
    const integrationPoints: string[] = [];
    
    // 多くの概念と関係を持つハブ概念
    const hubConcepts = conceptDetails.filter(concept => {
      const relationCount = conceptRelationships.filter(r => 
        r.sourceConcept === concept.name || r.targetConcept === concept.name
      ).length;
      return relationCount >= 3;
    });
    
    if (hubConcepts.length > 0) {
      integrationPoints.push(`ハブ概念: ${hubConcepts.map(c => c.name).join(', ')}`);
    }
    
    // 強い関係性を持つ概念ペア
    const strongRelations = conceptRelationships.filter(r => r.strength >= 0.7);
    if (strongRelations.length > 0) {
      integrationPoints.push(`強い関係性: ${strongRelations.length}個の強い関係性`);
    }
    
    return integrationPoints;
  }
  
  /**
   * ナラティブ仮説の生成
   */
  private static generateNarrativeHypothesis(
    conceptDetails: ConceptDetail[],
    conceptRelationships: ConceptRelationship[],
    theoreticalStructure: TheoreticalStructure
  ): NarrativeHypothesis {
    // メインストーリーラインの生成
    const mainStoryline = this.generateMainStoryline(conceptDetails, theoreticalStructure);
    
    // キープロットポイントの生成
    const keyPlotPoints = this.generateKeyPlotPoints(conceptDetails, conceptRelationships);
    
    // キャラクター役割の生成
    const characterRoles = this.generateCharacterRoles(conceptDetails, theoreticalStructure);
    
    // 葛藤解決の生成
    const conflictResolution = this.generateConflictResolution(conceptDetails, conceptRelationships);
    
    // 理論的含意の生成
    const theoreticalImplications = this.generateTheoreticalImplications(theoreticalStructure);
    
    // 支持証拠の生成
    const supportingEvidence = this.generateSupportingEvidence(conceptDetails, conceptRelationships);
    
    // 代替シナリオの生成
    const alternativeScenarios = this.generateAlternativeScenarios(conceptDetails, conceptRelationships);
    
    return {
      mainStoryline,
      keyPlotPoints,
      characterRoles,
      conflictResolution,
      theoreticalImplications,
      supportingEvidence,
      alternativeScenarios
    };
  }
  
  /**
   * メインストーリーラインの生成
   */
  private static generateMainStoryline(
    conceptDetails: ConceptDetail[],
    theoreticalStructure: TheoreticalStructure
  ): string {
    const coreConcepts = theoreticalStructure.coreConcepts;
    const supportingConcepts = theoreticalStructure.supportingConcepts;
    
    if (coreConcepts.length === 0) {
      return 'コア概念が特定できないため、ストーリーラインを生成できません';
    }
    
    // コア概念を中心としたストーリーライン
    const mainConcept = coreConcepts[0];
    const supportingConcept = supportingConcepts.length > 0 ? supportingConcepts[0] : '';
    
    return `${mainConcept}を中心として、${supportingConcept ? supportingConcept + 'が' : ''}理論的発展を遂げる過程で、概念間の関係性が深化し、最終的に統合された理論的枠組みが構築される。`;
  }
  
  /**
   * キープロットポイントの生成
   */
  private static generateKeyPlotPoints(
    conceptDetails: ConceptDetail[],
    conceptRelationships: ConceptRelationship[]
  ): PlotPoint[] {
    const plotPoints: PlotPoint[] = [];
    
    // 因果関係を持つ概念ペアからプロットポイントを生成
    const causalRelations = conceptRelationships.filter(r => r.relationshipType === 'causal');
    
    causalRelations.slice(0, 3).forEach((relation, index) => {
      plotPoints.push({
        sequence: index + 1,
        description: `${relation.sourceConcept}が${relation.targetConcept}を引き起こす`,
        involvedConcepts: [relation.sourceConcept, relation.targetConcept],
        causalFactors: relation.evidence,
        theoreticalSignificance: '因果関係の明確化'
      });
    });
    
    // プロットポイントが不足している場合は補完
    while (plotPoints.length < 3) {
      const remainingConcepts = conceptDetails
        .filter(c => !plotPoints.flatMap(p => p.involvedConcepts).includes(c.name))
        .slice(0, 2);
      
      if (remainingConcepts.length >= 2) {
        plotPoints.push({
          sequence: plotPoints.length + 1,
          description: `${remainingConcepts[0].name}と${remainingConcepts[1].name}の関係性が発展`,
          involvedConcepts: [remainingConcepts[0].name, remainingConcepts[1].name],
          causalFactors: ['概念間の相互作用'],
          theoreticalSignificance: '関係性の発展'
        });
      } else {
        break;
      }
    }
    
    return plotPoints;
  }
  
  /**
   * キャラクター役割の生成
   */
  private static generateCharacterRoles(
    conceptDetails: ConceptDetail[],
    theoreticalStructure: TheoreticalStructure
  ): CharacterRole[] {
    const characterRoles: CharacterRole[] = [];
    
    // コア概念を主人公として設定
    if (theoreticalStructure.coreConcepts.length > 0) {
      const protagonist = theoreticalStructure.coreConcepts[0];
      characterRoles.push({
        concept: protagonist,
        role: 'protagonist',
        motivation: '理論的発展の中心として機能する',
        development: '概念の深化と統合を通じて成長',
        relationships: theoreticalStructure.coreConcepts.slice(1)
      });
    }
    
    // サポート概念をサポート役として設定
    theoreticalStructure.supportingConcepts.slice(0, 2).forEach(concept => {
      characterRoles.push({
        concept,
        role: 'supporting',
        motivation: 'コア概念を支える',
        development: 'コア概念との関係性を強化',
        relationships: theoreticalStructure.coreConcepts
      });
    });
    
    // 周辺概念を触媒役として設定
    if (theoreticalStructure.peripheralConcepts.length > 0) {
      const catalyst = theoreticalStructure.peripheralConcepts[0];
      characterRoles.push({
        concept: catalyst,
        role: 'catalyst',
        motivation: '理論的変化を促進する',
        development: '新しい視点を提供',
        relationships: theoreticalStructure.coreConcepts
      });
    }
    
    return characterRoles;
  }
  
  /**
   * 葛藤解決の生成
   */
  private static generateConflictResolution(
    conceptDetails: ConceptDetail[],
    conceptRelationships: ConceptRelationship[]
  ): string {
    // 対立関係を持つ概念ペアを特定
    const contrastiveRelations = conceptRelationships.filter(r => r.relationshipType === 'contrastive');
    
    if (contrastiveRelations.length === 0) {
      return '明確な対立関係は見つかりませんでした。概念間の統合を通じて理論的発展が進みます。';
    }
    
    const conflict = contrastiveRelations[0];
    return `${conflict.sourceConcept}と${conflict.targetConcept}の対立は、より高次の統合概念を通じて解決され、理論的枠組みの深化につながる。`;
  }
  
  /**
   * 理論的含意の生成
   */
  private static generateTheoreticalImplications(theoreticalStructure: TheoreticalStructure): string[] {
    const implications: string[] = [];
    
    // コア概念の含意
    if (theoreticalStructure.coreConcepts.length > 0) {
      implications.push(`${theoreticalStructure.coreConcepts[0]}の理論的重要性が確認され、今後の研究の基盤となる。`);
    }
    
    // 統合ポイントの含意
    if (theoreticalStructure.integrationPoints.length > 0) {
      implications.push('概念間の統合ポイントが特定され、理論的枠組みの構築が可能である。');
    }
    
    // ギャップの含意
    if (theoreticalStructure.theoreticalGaps.length > 0) {
      implications.push('理論的ギャップが明確化され、今後の研究方向性が示される。');
    }
    
    return implications;
  }
  
  /**
   * 支持証拠の生成
   */
  private static generateSupportingEvidence(
    conceptDetails: ConceptDetail[],
    conceptRelationships: ConceptRelationship[]
  ): EvidenceItem[] {
    const evidence: EvidenceItem[] = [];
    
    // 高信頼度概念の証拠
    const highConfidenceConcepts = conceptDetails.filter(c => c.confidence >= 0.8);
    if (highConfidenceConcepts.length > 0) {
      evidence.push({
        type: 'concept_cluster',
        description: `${highConfidenceConcepts.length}個の高信頼度概念が確認された`,
        strength: 0.9,
        source: 'クラスター分析',
        reliability: 0.8
      });
    }
    
    // 強い関係性の証拠
    const strongRelations = conceptRelationships.filter(r => r.strength >= 0.7);
    if (strongRelations.length > 0) {
      evidence.push({
        type: 'relationship_pattern',
        description: `${strongRelations.length}個の強い関係性パターンが確認された`,
        strength: 0.8,
        source: '関係性分析',
        reliability: 0.7
      });
    }
    
    return evidence;
  }
  
  /**
   * 代替シナリオの生成
   */
  private static generateAlternativeScenarios(
    conceptDetails: ConceptDetail[],
    conceptRelationships: ConceptRelationship[]
  ): string[] {
    const scenarios: string[] = [];
    
    // 異なる関係性パターンに基づくシナリオ
    const differentRelationTypes = [...new Set(conceptRelationships.map(r => r.relationshipType))];
    
    differentRelationTypes.forEach(type => {
      scenarios.push(`${type}関係性を重視した理論構築シナリオ`);
    });
    
    // 異なる概念グループに基づくシナリオ
    if (conceptDetails.length >= 3) {
      scenarios.push('サブグループ別の理論構築シナリオ');
    }
    
    return scenarios;
  }
}
