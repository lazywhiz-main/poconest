import { supabase } from './supabase/client';
import type { CardRelationship } from '../types/analysis';
import { AnalysisService } from './AnalysisService';

// 重複削除戦略設定
export interface RelationsDeduplicationStrategy {
  priority: RelationType[]; // 優先順位 ['ai', 'unified', 'derived', 'tag_similarity', 'manual']
  qualityThreshold: number; // 品質閾値 (0-1)
  strengthDifferenceThreshold: number; // 強度差閾値 (0-1)
  keepHighestQuality: boolean; // 最高品質を保持するか
  preserveManual: boolean; // 手動作成を優先保護するか
}

// 重複削除結果
export interface DeduplicationResult {
  success: boolean;
  totalRelationsAnalyzed: number;
  duplicateGroupsFound: number;
  relationsDeleted: number;
  relationsKept: number;
  processingTime: number;
  qualityImprovement: {
    beforeAverageStrength: number;
    afterAverageStrength: number;
    improvementPercentage: number;
  };
  deletedRelations: Array<{
    id: string;
    type: RelationType;
    strength: number;
    reason: string;
  }>;
}

// 一括削除結果
export interface BulkDeleteResult {
  success: boolean;
  deletedCount: number;
  failedCount: number;
  errors: string[];
}

// 関係性タイプ
type RelationType = 'manual' | 'ai' | 'derived' | 'tag_similarity' | 'semantic' | 'unified';

/**
 * Relations重複削除・統合サービス
 * 
 * 同一カードペアに複数のRelationsがある場合、
 * 優先順位・品質基準に基づいて最適なもの1つを残す
 */
export class RelationsDeduplicationService {
  
  /**
   * デフォルト重複削除戦略
   */
  private static readonly DEFAULT_STRATEGY: RelationsDeduplicationStrategy = {
    priority: ['manual', 'unified', 'ai', 'derived', 'tag_similarity', 'semantic'], // manual最優先
    qualityThreshold: 0.5,        // 品質50%以上
    strengthDifferenceThreshold: 0.15, // 強度差15%以上で差別化
    keepHighestQuality: true,     // 品質重視
    preserveManual: true          // 手動作成Relations保護
  };

  /**
   * Relations重複削除メイン処理
   */
  static async deduplicateRelations(
    boardId: string,
    strategy: Partial<RelationsDeduplicationStrategy> = {}
  ): Promise<DeduplicationResult> {
    const startTime = Date.now();
    const finalStrategy = { ...this.DEFAULT_STRATEGY, ...strategy };
    
    console.log(`🧹 [RelationsDeduplicationService] ===== 重複削除開始 =====`);
    console.log(`📊 [RelationsDeduplicationService] Board ID: ${boardId}`);
    console.log(`⚙️ [RelationsDeduplicationService] 戦略:`, finalStrategy);

    try {
      // 1. 全Relations取得
      console.log(`📋 [RelationsDeduplicationService] Relations取得中...`);
      const allRelations = await this.getAllRelations(boardId);
      console.log(`📊 [RelationsDeduplicationService] 総Relations数: ${allRelations.length}件`);

      if (allRelations.length === 0) {
        return this.createEmptyResult(startTime);
      }

      // 2. 重複グループ検出
      console.log(`🔍 [RelationsDeduplicationService] 重複グループ検出中...`);
      const duplicateGroups = this.findDuplicateGroups(allRelations);
      console.log(`📈 [RelationsDeduplicationService] 重複グループ数: ${duplicateGroups.length}グループ`);

      if (duplicateGroups.length === 0) {
        console.log(`✨ [RelationsDeduplicationService] 重複Relations無し - 処理完了`);
        return this.createEmptyResult(startTime);
      }

      // 3. 品質分析（削除前）
      const beforeQuality = this.calculateQualityMetrics(allRelations);
      
      // 4. 最適Relations選択・削除対象特定
      console.log(`⚖️ [RelationsDeduplicationService] 最適Relations選択中...`);
      const deletionPlan = this.createDeletionPlan(duplicateGroups, finalStrategy);
      console.log(`🗑️ [RelationsDeduplicationService] 削除対象: ${deletionPlan.toDelete.length}件`);
      console.log(`💎 [RelationsDeduplicationService] 保持対象: ${deletionPlan.toKeep.length}件`);

      // 5. 一括削除実行
      console.log(`🚀 [RelationsDeduplicationService] 一括削除実行中...`);
      const deleteResult = await this.bulkDeleteRedundantRelations(
        boardId,
        deletionPlan.toDelete.map(r => r.id)
      );

      // 6. 品質分析（削除後）
      const remainingRelations = allRelations.filter(r => 
        !deletionPlan.toDelete.some(d => d.id === r.id)
      );
      const afterQuality = this.calculateQualityMetrics(remainingRelations);

      const processingTime = Date.now() - startTime;

      // 7. 結果作成
      const result: DeduplicationResult = {
        success: deleteResult.success,
        totalRelationsAnalyzed: allRelations.length,
        duplicateGroupsFound: duplicateGroups.length,
        relationsDeleted: deleteResult.deletedCount,
        relationsKept: remainingRelations.length,
        processingTime,
        qualityImprovement: {
          beforeAverageStrength: beforeQuality.averageStrength,
          afterAverageStrength: afterQuality.averageStrength,
          improvementPercentage: ((afterQuality.averageStrength - beforeQuality.averageStrength) / beforeQuality.averageStrength) * 100
        },
        deletedRelations: deletionPlan.toDelete.map(r => ({
          id: r.id,
          type: r.relationship_type as RelationType,
          strength: r.strength || 0,
          reason: this.getDeletionReason(r, finalStrategy)
        }))
      };

      console.log(`🎉 [RelationsDeduplicationService] ===== 重複削除完了 =====`);
      console.log(`📊 [RelationsDeduplicationService] 削除数: ${result.relationsDeleted}件`);
      console.log(`📈 [RelationsDeduplicationService] 品質向上: ${result.qualityImprovement.improvementPercentage.toFixed(1)}%`);

      return result;

    } catch (error) {
      console.error(`❌ [RelationsDeduplicationService] 重複削除エラー:`, error);
      throw new Error(`Relations重複削除に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 特定Relations群から最良のものを選択
   */
  static async selectBestRelation(
    conflictingRelations: CardRelationship[],
    strategy: RelationsDeduplicationStrategy = this.DEFAULT_STRATEGY
  ): Promise<CardRelationship> {
    
    if (conflictingRelations.length === 0) {
      throw new Error('空のRelations群が指定されました');
    }
    
    if (conflictingRelations.length === 1) {
      return conflictingRelations[0];
    }

    console.log(`⚖️ [RelationsDeduplicationService] 最良Relations選択: ${conflictingRelations.length}件から選択`);

    // 1. 手動作成Relations優先保護
    if (strategy.preserveManual) {
      const manualRelations = conflictingRelations.filter(r => r.relationship_type === 'manual');
      if (manualRelations.length > 0) {
        console.log(`🔒 [RelationsDeduplicationService] 手動Relations保護適用`);
        return this.selectByQuality(manualRelations, strategy);
      }
    }

    // 2. 優先順位フィルタリング
    for (const priorityType of strategy.priority) {
      const typeRelations = conflictingRelations.filter(r => r.relationship_type === priorityType);
      if (typeRelations.length > 0) {
        console.log(`🎯 [RelationsDeduplicationService] 優先タイプ選択: ${priorityType}`);
        return this.selectByQuality(typeRelations, strategy);
      }
    }

    // 3. フォールバック: 品質最優先
    console.log(`💎 [RelationsDeduplicationService] 品質基準フォールバック選択`);
    return this.selectByQuality(conflictingRelations, strategy);
  }

  /**
   * 重複Relations一括削除
   */
  static async bulkDeleteRedundantRelations(
    boardId: string,
    relationsToDelete: string[]
  ): Promise<BulkDeleteResult> {
    
    if (relationsToDelete.length === 0) {
      return {
        success: true,
        deletedCount: 0,
        failedCount: 0,
        errors: []
      };
    }

    console.log(`🚀 [RelationsDeduplicationService] 一括削除実行: ${relationsToDelete.length}件`);

    try {
      const { data, error } = await supabase
        .from('board_card_relations')
        .delete()
        .in('id', relationsToDelete);

      if (error) {
        console.error(`❌ [RelationsDeduplicationService] 一括削除エラー:`, error);
        return {
          success: false,
          deletedCount: 0,
          failedCount: relationsToDelete.length,
          errors: [error.message]
        };
      }

      console.log(`✅ [RelationsDeduplicationService] 一括削除成功: ${relationsToDelete.length}件`);
      
      return {
        success: true,
        deletedCount: relationsToDelete.length,
        failedCount: 0,
        errors: []
      };

    } catch (error) {
      console.error(`❌ [RelationsDeduplicationService] 一括削除例外:`, error);
      return {
        success: false,
        deletedCount: 0,
        failedCount: relationsToDelete.length,
        errors: [error instanceof Error ? error.message : String(error)]
      };
    }
  }

  // ===== Private Helper Methods =====

  /**
   * 全Relations取得
   */
  private static async getAllRelations(boardId: string): Promise<CardRelationship[]> {
    // まずboard_cardsからIDを取得
    const { data: cardIds, error: cardError } = await supabase
      .from('board_cards')
      .select('id')
      .eq('board_id', boardId);
    
    if (cardError || !cardIds) {
      throw new Error(`カードID取得失敗: ${cardError?.message || 'Unknown error'}`);
    }
    
    const cardIdArray = cardIds.map(card => card.id);
    
    const { data, error } = await supabase
      .from('board_card_relations')
      .select(`
        id,
        card_id,
        related_card_id,
        relationship_type,
        strength,
        confidence,
        metadata,
        created_at,
        updated_at
      `)
      .in('card_id', cardIdArray);

    if (error) {
      throw new Error(`Relations取得失敗: ${error.message}`);
    }

    return data || [];
  }

  /**
   * 重複グループ検出
   */
  private static findDuplicateGroups(relations: CardRelationship[]): CardRelationship[][] {
    const groupMap = new Map<string, CardRelationship[]>();

    for (const relation of relations) {
      // カードペアの正規化キー作成（順序無関係）
      const key = this.createNormalizedPairKey(relation.card_id, relation.related_card_id);
      
      if (!groupMap.has(key)) {
        groupMap.set(key, []);
      }
      
      groupMap.get(key)!.push(relation);
    }

    // 2つ以上のRelationsがあるグループのみ返す
    return Array.from(groupMap.values()).filter(group => group.length > 1);
  }

  /**
   * 正規化ペアキー作成
   */
  private static createNormalizedPairKey(cardId1: string, cardId2: string): string {
    return cardId1 < cardId2 ? `${cardId1}-${cardId2}` : `${cardId2}-${cardId1}`;
  }

  /**
   * 削除計画作成
   */
  private static createDeletionPlan(
    duplicateGroups: CardRelationship[][],
    strategy: RelationsDeduplicationStrategy
  ): { toKeep: CardRelationship[]; toDelete: CardRelationship[] } {
    
    const toKeep: CardRelationship[] = [];
    const toDelete: CardRelationship[] = [];

    for (const group of duplicateGroups) {
      const bestRelation = this.selectBestRelationSync(group, strategy);
      toKeep.push(bestRelation);
      
      const othersToDelete = group.filter(r => r.id !== bestRelation.id);
      toDelete.push(...othersToDelete);
    }

    return { toKeep, toDelete };
  }

  /**
   * 品質基準での選択（同期版）
   */
  private static selectBestRelationSync(
    relations: CardRelationship[],
    strategy: RelationsDeduplicationStrategy
  ): CardRelationship {
    
    // 1. 手動作成優先
    if (strategy.preserveManual) {
      const manual = relations.find(r => r.relationship_type === 'manual');
      if (manual) return manual;
    }

    // 2. 優先順位適用
    for (const priorityType of strategy.priority) {
      const typeRelations = relations.filter(r => r.relationship_type === priorityType);
      if (typeRelations.length > 0) {
        return this.selectByQualitySync(typeRelations, strategy);
      }
    }

    // 3. フォールバック
    return this.selectByQualitySync(relations, strategy);
  }

  /**
   * 品質基準での選択（同期版）
   */
  private static selectByQualitySync(
    relations: CardRelationship[],
    strategy: RelationsDeduplicationStrategy
  ): CardRelationship {
    
    // 品質スコア計算・ソート
    const scored = relations.map(r => ({
      relation: r,
      score: this.calculateQualityScore(r, strategy)
    })).sort((a, b) => b.score - a.score);

    return scored[0].relation;
  }

  /**
   * 品質基準での選択（非同期版）
   */
  private static async selectByQuality(
    relations: CardRelationship[],
    strategy: RelationsDeduplicationStrategy
  ): Promise<CardRelationship> {
    return this.selectByQualitySync(relations, strategy);
  }

  /**
   * Relations品質スコア計算
   */
  private static calculateQualityScore(
    relation: CardRelationship,
    strategy: RelationsDeduplicationStrategy
  ): number {
    
    const strength = relation.strength || 0;
    const confidence = relation.confidence || 0;
    
    // 基本品質スコア
    let score = (strength * 0.6) + (confidence * 0.4);
    
    // タイプ別ボーナス
    const typeIndex = strategy.priority.indexOf(relation.relationship_type as RelationType);
    if (typeIndex !== -1) {
      const typeBonus = (strategy.priority.length - typeIndex) / strategy.priority.length * 0.2;
      score += typeBonus;
    }
    
    // 閾値フィルタ
    if (strength < strategy.qualityThreshold) {
      score *= 0.5; // 閾値未満はペナルティ
    }
    
    return Math.max(0, Math.min(1, score));
  }

  /**
   * 品質メトリクス計算
   */
  private static calculateQualityMetrics(relations: CardRelationship[]): { averageStrength: number } {
    if (relations.length === 0) {
      return { averageStrength: 0 };
    }
    
    const totalStrength = relations.reduce((sum, r) => sum + (r.strength || 0), 0);
    return {
      averageStrength: totalStrength / relations.length
    };
  }

  /**
   * 削除理由生成
   */
  private static getDeletionReason(relation: CardRelationship, strategy: RelationsDeduplicationStrategy): string {
    const type = relation.relationship_type as RelationType;
    const strength = relation.strength || 0;
    
    if (strength < strategy.qualityThreshold) {
      return `品質不足 (強度: ${strength.toFixed(2)} < 閾値: ${strategy.qualityThreshold})`;
    }
    
    const priorityIndex = strategy.priority.indexOf(type);
    if (priorityIndex === -1) {
      return `未サポートタイプ: ${type}`;
    }
    
    return `優先順位による選択除外 (${type} - 順位: ${priorityIndex + 1})`;
  }

  /**
   * 空結果作成
   */
  private static createEmptyResult(startTime: number): DeduplicationResult {
    return {
      success: true,
      totalRelationsAnalyzed: 0,
      duplicateGroupsFound: 0,
      relationsDeleted: 0,
      relationsKept: 0,
      processingTime: Date.now() - startTime,
      qualityImprovement: {
        beforeAverageStrength: 0,
        afterAverageStrength: 0,
        improvementPercentage: 0
      },
      deletedRelations: []
    };
  }
}
