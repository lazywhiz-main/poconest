import { supabase } from './supabase/client';
import type { BoardItem } from '../features/board-space/contexts/BoardContext';

export type RelationType = 'ai' | 'derived' | 'tag_similarity' | 'manual' | 'semantic' | 'unified';

export interface CardRelationship {
  id: string;
  card_id: string;
  related_card_id: string;
  relationship_type: RelationType;
  strength: number;
  confidence: number;
  metadata: any;
  created_at: string;
  updated_at: string;
}

export interface ConflictingRelation {
  cardPair: string;
  cardA: string;
  cardB: string;
  conflictingRelations: Array<{
    id: string;
    type: RelationType;
    strength: number;
    confidence: number;
    created_at: string;
  }>;
  strengthDifference: number;
  recommendedAction: 'keep_highest_quality' | 'merge_strengths' | 'manual_review';
}

export interface RelationsDuplicationReport {
  totalRelations: number;
  uniquePairs: number;
  duplicatePairs: number;
  duplicationRate: number;
  typeDistribution: Record<RelationType, number>;
  
  // 計算重複の詳細分析
  computationalDuplication: {
    semanticOverlap: number; // AI, semantic, tag_similarity間の重複ペア数
    typeConflicts: number;   // 同じペアに複数タイプが存在する数
    redundantCalculations: number; // 冗長な計算の推定数
    efficiencyLoss: number; // 0-1, 効率低下の程度
    problematicTypes: RelationType[]; // 最も重複を引き起こしているタイプ
  };
  
  qualityMetrics: {
    averageStrength: Record<RelationType, number>;
    averageConfidence: Record<RelationType, number>;
    strengthDistribution: {
      low: number;    // 0.0-0.4
      medium: number; // 0.4-0.7
      high: number;   // 0.7-1.0
    };
    confidenceDistribution: {
      low: number;    // 0.0-0.6
      medium: number; // 0.6-0.8
      high: number;   // 0.8-1.0
    };
  };
  conflictingRelations: ConflictingRelation[];
  recommendations: string[];
}

export interface RelationsQualityReport {
  boardId: string;
  totalCards: number;
  connectedCards: number;
  connectionRatio: number;
  averageConnectionsPerCard: number;
  relationsDensity: number;
  strongRelationsCount: number; // strength > 0.7
  weakRelationsCount: number;   // strength < 0.4
  
  qualityScore: number; // 0-100
  qualityGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  
  qualityBreakdown: {
    connectionScore: number;
    connectionWeight: number;
    connectionContribution: number;
    densityScore: number;
    densityWeight: number;
    densityContribution: number;
    strongRelationsScore: number;
    strongRelationsWeight: number;
    strongRelationsContribution: number;
    averageStrengthScore: number;
    averageStrengthWeight: number;
    averageStrengthContribution: number;
    details: {
      connectionRatio: number;
      relationsDensity: number;
      strongRelationsRatio: number;
      averageStrength: number;
    };
  };
  
  issues: Array<{
    type: 'high_duplication' | 'low_coverage' | 'weak_relations' | 'inconsistent_types';
    severity: 'low' | 'medium' | 'high';
    description: string;
    affectedCount: number;
    recommendation: string;
  }>;
  
  improvements: Array<{
    action: string;
    expectedImpact: string;
    estimatedEffort: 'low' | 'medium' | 'high';
  }>;
}

/**
 * 🔍 Relations重複分析・品質評価サービス
 */
export class RelationsAnalysisService {
  
  /**
   * 指定ボードのRelations重複状況を分析
   */
  static async analyzeDuplication(boardId: string, nestId?: string): Promise<RelationsDuplicationReport> {
    console.log(`🔍 [RelationsAnalysisService] 重複分析開始: boardId=${boardId}${nestId ? ` (nestId指定あり、ただしDBスキーマ未対応のため無視)` : ''}`);
    
    try {
      // 1. 指定ボードのカードIDを取得（アーカイブ除外）
      // 注意: nest_idカラムが存在しないため、board_idのみでフィルタリング
      const { data: boardCards, error: cardError } = await supabase
        .from('board_cards')
        .select('id')
        .eq('board_id', boardId)
        .eq('is_archived', false);
      
      if (cardError) throw cardError;
      
      const cardIds = boardCards?.map(card => card.id) || [];
      console.log(`🔍 [RelationsAnalysisService] フィルタ後カード数: ${cardIds.length}件`);
      
      if (cardIds.length === 0) {
        return this.createEmptyReport();
      }
      
      // 2. そのカードIDに関連するRelationsを取得（双方向）
      console.log(`🔍 [RelationsAnalysisService] クエリ対象カードID例: ${cardIds.slice(0, 3).join(', ')}...`);
      
      const { data: relations, error } = await supabase
        .from('board_card_relations')
        .select('*')
        .or(`card_id.in.(${cardIds.join(',')}),related_card_id.in.(${cardIds.join(',')})`);
      
      if (error) throw error;
      
      console.log(`🔍 [RelationsAnalysisService] 生SQLクエリ結果: ${relations?.length || 0}件`);
      if (!relations || relations.length === 0) {
        return this.createEmptyReport();
      }
      
      // 🔧 重複除去：同じRelationIDが複数回取得されている場合の重複除去
      const uniqueRelations = relations.filter((relation, index, array) => 
        array.findIndex(r => r.id === relation.id) === index
      );
      
      // 🔍 重複詳細分析
      const relationIds = relations.map(r => r.id);
      const uniqueIds = [...new Set(relationIds)];
      const duplicateCount = relationIds.length - uniqueIds.length;
      
      console.log(`📊 [RelationsAnalysisService] 取得Relations: ${relations.length}件 → 重複除去後: ${uniqueRelations.length}件`);
      console.log(`🔍 [RelationsAnalysisService] ID重複数: ${duplicateCount}件 (ユニークID: ${uniqueIds.length}件)`);
      
      // サンプルでRelation内容を確認
      if (relations.length > 0) {
        const sample = relations.slice(0, 3);
        console.log(`🔍 [RelationsAnalysisService] Relations例:`, sample.map(r => ({
          id: r.id,
          type: r.relationship_type,
          card_id: r.card_id,
          related_card_id: r.related_card_id
        })));
      }
      
      // 2. ペアごとにグループ化
      const pairGroups = this.groupRelationsByPair(uniqueRelations);
      console.log(`🔗 [RelationsAnalysisService] ユニークペア: ${pairGroups.size}個`);
      
      // 3. 重複ペア特定
      const duplicatePairs = Array.from(pairGroups.entries())
        .filter(([_, relationsInPair]) => relationsInPair.length > 1);
      
      console.log(`⚠️ [RelationsAnalysisService] 重複ペア: ${duplicatePairs.length}個`);
      
      // 4. 各種統計計算
      const typeDistribution = this.calculateTypeDistribution(uniqueRelations);
      const qualityMetrics = this.calculateQualityMetrics(uniqueRelations);
      const conflictingRelations = this.identifyConflictingRelations(duplicatePairs);
      
      // 5. 推奨事項生成
      const recommendations = this.generateRecommendations(
        uniqueRelations.length,
        duplicatePairs.length,
        qualityMetrics,
        conflictingRelations
      );
      
      const report: RelationsDuplicationReport = {
        totalRelations: uniqueRelations.length,
        uniquePairs: pairGroups.size,
        duplicatePairs: duplicatePairs.length,
        duplicationRate: duplicatePairs.length / pairGroups.size,
        typeDistribution,
        qualityMetrics,
        conflictingRelations,
        recommendations
      };
      
      console.log(`✅ [RelationsAnalysisService] 重複分析完了:`, {
        totalRelations: report.totalRelations,
        duplicationRate: `${(report.duplicationRate * 100).toFixed(1)}%`,
        conflictingRelations: report.conflictingRelations.length
      });
      
      return report;
      
    } catch (error) {
      console.error('❌ [RelationsAnalysisService] 重複分析エラー:', error);
      throw error;
    }
  }
  
  /**
   * 重複Relations特定
   */
  static async findConflictingRelations(boardId: string): Promise<ConflictingRelation[]> {
    const report = await this.analyzeDuplication(boardId);
    return report.conflictingRelations;
  }
  
  /**
   * Relations品質レポート生成
   */
  static async generateQualityReport(boardId: string, nestId?: string): Promise<RelationsQualityReport> {
    console.log(`📊 [RelationsAnalysisService] 品質レポート生成開始: boardId=${boardId}${nestId ? ` (nestId指定あり、ただしDBスキーマ未対応のため無視)` : ''}`);
    
    try {
      // 1. 指定ボードのカードIDを取得（アーカイブ除外）
      // 注意: nest_idカラムが存在しないため、board_idのみでフィルタリング
      const { data: boardCards, error: cardError } = await supabase
        .from('board_cards')
        .select('id')
        .eq('board_id', boardId)
        .eq('is_archived', false);
      
      if (cardError) throw cardError;
      
      const cardIds = boardCards?.map(card => card.id) || [];
      console.log(`🔍 [RelationsAnalysisService] フィルタ後カード数: ${cardIds.length}件`);
      
      if (cardIds.length === 0) {
        throw new Error('指定されたボード/ネストにカードが存在しません');
      }
      
      // 2. そのカードIDに関連するRelationsを取得（双方向）
      const { data: relations, error: relError } = await supabase
        .from('board_card_relations')
        .select('*')
        .or(`card_id.in.(${cardIds.join(',')}),related_card_id.in.(${cardIds.join(',')})`);
      
      if (relError) throw relError;
      
      // 🔧 重複除去：同じRelationIDが複数回取得されている場合の重複除去
      const uniqueRelations = relations ? relations.filter((relation, index, array) => 
        array.findIndex(r => r.id === relation.id) === index
      ) : [];
      
      const totalCards = cardIds.length;
      const totalRelations = uniqueRelations.length;
      
      if (totalCards === 0) {
        throw new Error('カードが見つかりません');
      }
      
      // 3. 接続状況分析
      const connectedCards = this.calculateConnectedCards(relations || []);
      const connectionRatio = connectedCards / totalCards;
      const averageConnectionsPerCard = (totalRelations * 2) / totalCards; // 双方向カウント
      const maxPossibleRelations = (totalCards * (totalCards - 1)) / 2;
      const relationsDensity = totalRelations / maxPossibleRelations;
      
      // 4. Relations強度分析
      const strongRelationsCount = uniqueRelations.filter(r => r.strength > 0.7).length;
      const weakRelationsCount = uniqueRelations.filter(r => r.strength < 0.4).length;
      
      // 5. 品質メトリクス詳細計算
      const averageStrength = uniqueRelations.reduce((sum, r) => sum + r.strength, 0) / totalRelations;
      const qualityMetrics = {
        connectionRatio,
        relationsDensity,
        strongRelationsRatio: strongRelationsCount / totalRelations,
        averageStrength
      };
      
      // 6. 品質スコア計算
      const qualityScore = this.calculateQualityScore(qualityMetrics);
      const qualityGrade = this.assignQualityGrade(qualityScore);
      
      // 7. 詳細ブレークダウン計算
      const qualityBreakdown = this.calculateQualityBreakdown(qualityMetrics);
      
      // 6. 問題特定
      const issues = this.identifyQualityIssues({
        connectionRatio,
        relationsDensity,
        strongRelationsCount,
        weakRelationsCount,
        totalRelations,
        totalCards
      });
      
      // 7. 改善提案
      const improvements = this.generateImprovements(issues);
      
      const report: RelationsQualityReport = {
        boardId,
        totalCards,
        connectedCards,
        connectionRatio,
        averageConnectionsPerCard,
        relationsDensity,
        strongRelationsCount,
        weakRelationsCount,
        qualityScore,
        qualityGrade,
        qualityBreakdown,
        issues,
        improvements
      };
      
      console.log(`✅ [RelationsAnalysisService] 品質レポート完了:`, {
        qualityScore: report.qualityScore,
        qualityGrade: report.qualityGrade,
        connectionRatio: `${(report.connectionRatio * 100).toFixed(1)}%`,
        issuesCount: report.issues.length
      });
      
      return report;
      
    } catch (error) {
      console.error('❌ [RelationsAnalysisService] 品質レポート生成エラー:', error);
      throw error;
    }
  }
  
  // ===========================================
  // Private Helper Methods
  // ===========================================
  
  /**
   * Relationsをペアごとにグループ化
   */
  private static groupRelationsByPair(relations: CardRelationship[]): Map<string, CardRelationship[]> {
    const pairGroups = new Map<string, CardRelationship[]>();
    
    for (const relation of relations) {
      const pairKey = this.createPairKey(relation.card_id, relation.related_card_id);
      
      if (!pairGroups.has(pairKey)) {
        pairGroups.set(pairKey, []);
      }
      pairGroups.get(pairKey)!.push(relation);
    }
    
    return pairGroups;
  }
  
  /**
   * ペアキー生成（順序無依存）
   */
  private static createPairKey(cardA: string, cardB: string): string {
    return [cardA, cardB].sort().join('-');
  }
  
  /**
   * Relations タイプ分布計算
   */
  private static calculateTypeDistribution(relations: CardRelationship[]): Record<RelationType, number> {
    const distribution: Record<RelationType, number> = {
      ai: 0,
      derived: 0,
      tag_similarity: 0,
      manual: 0,
      semantic: 0,
      unified: 0
    };
    
    for (const relation of relations) {
      if (distribution.hasOwnProperty(relation.relationship_type)) {
        distribution[relation.relationship_type]++;
      }
    }
    
    return distribution;
  }
  
  /**
   * 品質指標計算
   */
  private static calculateQualityMetrics(relations: CardRelationship[]) {
    const byType: Record<RelationType, CardRelationship[]> = {
      ai: [],
      derived: [],
      tag_similarity: [],
      manual: [],
      semantic: [],
      unified: []
    };
    
    // タイプ別分類
    for (const relation of relations) {
      if (byType.hasOwnProperty(relation.relationship_type)) {
        byType[relation.relationship_type].push(relation);
      }
    }
    
    // 平均値計算
    const averageStrength: Record<RelationType, number> = {} as any;
    const averageConfidence: Record<RelationType, number> = {} as any;
    
    for (const [type, rels] of Object.entries(byType) as [RelationType, CardRelationship[]][]) {
      if (rels.length > 0) {
        averageStrength[type] = rels.reduce((sum, r) => sum + r.strength, 0) / rels.length;
        averageConfidence[type] = rels.reduce((sum, r) => sum + r.confidence, 0) / rels.length;
      } else {
        averageStrength[type] = 0;
        averageConfidence[type] = 0;
      }
    }
    
    // 分布計算
    const strengthDistribution = {
      low: relations.filter(r => r.strength < 0.4).length,
      medium: relations.filter(r => r.strength >= 0.4 && r.strength < 0.7).length,
      high: relations.filter(r => r.strength >= 0.7).length
    };
    
    const confidenceDistribution = {
      low: relations.filter(r => r.confidence < 0.6).length,
      medium: relations.filter(r => r.confidence >= 0.6 && r.confidence < 0.8).length,
      high: relations.filter(r => r.confidence >= 0.8).length
    };
    
    return {
      averageStrength,
      averageConfidence,
      strengthDistribution,
      confidenceDistribution
    };
  }
  
  /**
   * 重複Relations特定・分析
   */
  private static identifyConflictingRelations(duplicatePairs: [string, CardRelationship[]][]): ConflictingRelation[] {
    const conflicts: ConflictingRelation[] = [];
    
    for (const [pairKey, relationsInPair] of duplicatePairs) {
      const [cardA, cardB] = pairKey.split('-');
      
      const conflictingRelations = relationsInPair.map(r => ({
        id: r.id,
        type: r.relationship_type,
        strength: r.strength,
        confidence: r.confidence,
        created_at: r.created_at
      }));
      
      // 強度差計算
      const strengths = conflictingRelations.map(r => r.strength);
      const strengthDifference = Math.max(...strengths) - Math.min(...strengths);
      
      // 推奨アクション決定
      let recommendedAction: ConflictingRelation['recommendedAction'];
      if (strengthDifference > 0.3) {
        recommendedAction = 'keep_highest_quality';
      } else if (strengthDifference < 0.1) {
        recommendedAction = 'merge_strengths';
      } else {
        recommendedAction = 'manual_review';
      }
      
      conflicts.push({
        cardPair: pairKey,
        cardA,
        cardB,
        conflictingRelations,
        strengthDifference,
        recommendedAction
      });
    }
    
    return conflicts;
  }
  
  /**
   * 推奨事項生成
   */
  private static generateRecommendations(
    totalRelations: number,
    duplicatePairsCount: number,
    qualityMetrics: any,
    conflictingRelations: ConflictingRelation[]
  ): string[] {
    const recommendations: string[] = [];
    
    const duplicationRate = duplicatePairsCount / (totalRelations - duplicatePairsCount + duplicatePairsCount);
    
    if (duplicationRate > 0.1) {
      recommendations.push(`重複率が${(duplicationRate * 100).toFixed(1)}%と高いため、Relations統合を実行してください`);
    }
    
    if (qualityMetrics.strengthDistribution.low > totalRelations * 0.3) {
      recommendations.push('低強度Relations（<0.4）が多いため、品質フィルタリングを検討してください');
    }
    
    if (conflictingRelations.length > 0) {
      const highConflictCount = conflictingRelations.filter(c => c.strengthDifference > 0.3).length;
      if (highConflictCount > 0) {
        recommendations.push(`${highConflictCount}件の高強度差Relations重複があります。品質チェックが必要です`);
      }
    }
    
    const aiRelationsCount = qualityMetrics.averageStrength.ai || 0;
    const derivedRelationsCount = qualityMetrics.averageStrength.derived || 0;
    
    if (aiRelationsCount > 0 && derivedRelationsCount > 0) {
      recommendations.push('AI RelationsとDerived Relationsの重複を確認し、優先順位を設定してください');
    }
    
    return recommendations;
  }
  
  /**
   * 接続されたカード数計算
   */
  private static calculateConnectedCards(relations: CardRelationship[]): number {
    const connectedCardIds = new Set<string>();
    
    for (const relation of relations) {
      connectedCardIds.add(relation.card_id);
      connectedCardIds.add(relation.related_card_id);
    }
    
    return connectedCardIds.size;
  }
  
  /**
   * 品質スコア計算（0-100）
   */
  private static calculateQualityScore(metrics: {
    connectionRatio: number;
    relationsDensity: number;
    strongRelationsRatio: number;
    averageStrength: number;
  }): number {
    const weights = {
      connectionRatio: 0.3,    // カバー率30%
      relationsDensity: 0.2,   // 密度20%
      strongRelationsRatio: 0.3, // 強Relations率30%
      averageStrength: 0.2     // 平均強度20%
    };
    
    const score = 
      weights.connectionRatio * Math.min(metrics.connectionRatio, 1.0) * 100 +
      weights.relationsDensity * Math.min(metrics.relationsDensity * 10, 1.0) * 100 + // 密度は低めが正常
      weights.strongRelationsRatio * metrics.strongRelationsRatio * 100 +
      weights.averageStrength * metrics.averageStrength * 100;
    
    return Math.round(Math.max(0, Math.min(100, score)));
  }

  /**
   * 品質ブレークダウン計算
   */
  private static calculateQualityBreakdown(metrics: {
    connectionRatio: number;
    relationsDensity: number;
    strongRelationsRatio: number;
    averageStrength: number;
  }) {
    const weights = {
      connectionRatio: 0.3,
      relationsDensity: 0.2,
      strongRelationsRatio: 0.3,
      averageStrength: 0.2
    };

    return {
      connectionScore: Math.round(Math.min(metrics.connectionRatio, 1.0) * 100),
      connectionWeight: weights.connectionRatio,
      connectionContribution: Math.round(weights.connectionRatio * Math.min(metrics.connectionRatio, 1.0) * 100),

      densityScore: Math.round(Math.min(metrics.relationsDensity * 10, 1.0) * 100),
      densityWeight: weights.relationsDensity,
      densityContribution: Math.round(weights.relationsDensity * Math.min(metrics.relationsDensity * 10, 1.0) * 100),

      strongRelationsScore: Math.round(metrics.strongRelationsRatio * 100),
      strongRelationsWeight: weights.strongRelationsRatio,
      strongRelationsContribution: Math.round(weights.strongRelationsRatio * metrics.strongRelationsRatio * 100),

      averageStrengthScore: Math.round(metrics.averageStrength * 100),
      averageStrengthWeight: weights.averageStrength,
      averageStrengthContribution: Math.round(weights.averageStrength * metrics.averageStrength * 100),

      // 各指標の詳細
      details: {
        connectionRatio: metrics.connectionRatio,
        relationsDensity: metrics.relationsDensity,
        strongRelationsRatio: metrics.strongRelationsRatio,
        averageStrength: metrics.averageStrength
      }
    };
  }
  
  /**
   * 品質グレード割り当て
   */
  private static assignQualityGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }
  
  /**
   * 品質問題特定
   */
  private static identifyQualityIssues(params: {
    connectionRatio: number;
    relationsDensity: number;
    strongRelationsCount: number;
    weakRelationsCount: number;
    totalRelations: number;
    totalCards: number;
  }) {
    const issues: RelationsQualityReport['issues'] = [];
    
    // カバー率チェック
    if (params.connectionRatio < 0.5) {
      issues.push({
        type: 'low_coverage',
        severity: params.connectionRatio < 0.3 ? 'high' : 'medium',
        description: `接続されていないカードが${((1 - params.connectionRatio) * 100).toFixed(1)}%存在`,
        affectedCount: Math.round(params.totalCards * (1 - params.connectionRatio)),
        recommendation: 'AI Relations生成またはDerived Relations生成を実行'
      });
    }
    
    // 弱Relations率チェック
    const weakRatio = params.weakRelationsCount / params.totalRelations;
    if (weakRatio > 0.4) {
      issues.push({
        type: 'weak_relations',
        severity: weakRatio > 0.6 ? 'high' : 'medium',
        description: `低強度Relations（<0.4）が${(weakRatio * 100).toFixed(1)}%存在`,
        affectedCount: params.weakRelationsCount,
        recommendation: '品質フィルタリングまたは閾値調整を検討'
      });
    }
    
    // 密度チェック（高すぎる場合）
    if (params.relationsDensity > 0.3) {
      issues.push({
        type: 'high_duplication',
        severity: 'medium',
        description: `Relations密度が${(params.relationsDensity * 100).toFixed(1)}%と高く、重複の可能性`,
        affectedCount: Math.round(params.totalRelations * 0.1), // 推定
        recommendation: 'Relations重複チェック・統合を実行'
      });
    }
    
    return issues;
  }
  
  /**
   * 改善提案生成
   */
  private static generateImprovements(issues: RelationsQualityReport['issues']) {
    const improvements: RelationsQualityReport['improvements'] = [];
    
    for (const issue of issues) {
      switch (issue.type) {
        case 'low_coverage':
          improvements.push({
            action: 'AI Relations生成を実行してカード間の意味的関係性を発見',
            expectedImpact: `接続率を${(Math.min(1.0, 0.3 + 0.4) * 100).toFixed(0)}%まで向上`,
            estimatedEffort: 'low'
          });
          break;
        case 'weak_relations':
          improvements.push({
            action: 'Relations品質フィルタリングで低強度Relationsを整理',
            expectedImpact: '平均Relations強度を0.1-0.2向上',
            estimatedEffort: 'medium'
          });
          break;
        case 'high_duplication':
          improvements.push({
            action: 'Relations重複削除・統合を実行',
            expectedImpact: 'Relations数を10-20%削減、品質向上',
            estimatedEffort: 'high'
          });
          break;
      }
    }
    
    return improvements;
  }
  
  /**
   * 空のレポート作成
   */
  private static createEmptyReport(): RelationsDuplicationReport {
    return {
      totalRelations: 0,
      uniquePairs: 0,
      duplicatePairs: 0,
      duplicationRate: 0,
      typeDistribution: {
        ai: 0,
        derived: 0,
        tag_similarity: 0,
        manual: 0,
        semantic: 0
      },
      qualityMetrics: {
        averageStrength: {
          ai: 0,
          derived: 0,
          tag_similarity: 0,
          manual: 0,
          semantic: 0
        },
        averageConfidence: {
          ai: 0,
          derived: 0,
          tag_similarity: 0,
          manual: 0,
          semantic: 0
        },
        strengthDistribution: { low: 0, medium: 0, high: 0 },
        confidenceDistribution: { low: 0, medium: 0, high: 0 }
      },
      conflictingRelations: [],
      recommendations: ['Relationsが存在しません。AI Relationsまたは手動でRelationsを作成してください。']
    };
  }
}
