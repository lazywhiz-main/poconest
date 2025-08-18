import { supabase } from './supabase/client';
import type { BoardItem } from './SmartClusteringService';
import type { CardRelationship } from '../types/analysis';
import { AnalysisService } from './AnalysisService';
import { RelationsParameterManager } from './RelationsParameterManager';

// 統合類似度計算結果
export interface ComprehensiveSimilarity {
  cardA: BoardItem;
  cardB: BoardItem;
  overallScore: number; // 0-1, 総合類似度
  components: {
    semantic: number;    // AI埋め込み類似度
    structural: number;  // タグ・タイプ類似度  
    contextual: number;  // 時系列・作成者類似度
    content: number;     // テキスト内容類似度
  };
  weights: {
    semantic: number;
    structural: number;
    contextual: number;
    content: number;
  };
  confidence: number;   // 計算信頼度
  explanation: string;  // 関係性の説明
}

// 統合分析結果
export interface UnifiedAnalysisResult {
  success: boolean;
  boardId: string;
  generatedRelations: number;
  processingTime: number;
  qualityMetrics: {
    averageScore: number;
    averageConfidence: number;
    highQualityRatio: number; // score > 0.7の割合
  };
  relationships: Array<{
    similarity: ComprehensiveSimilarity;
    strength: number;
    confidence: number;
    relationshipId?: string;
  }>;
  summary: {
    totalPairs: number;
    evaluatedPairs: number;
    filteredPairs: number;
    savedRelations: number;
  };
}

// 品質フィルタリング設定
export interface QualityConfig {
  minOverallScore: number;     // 最小総合スコア (default: 0.6)
  minConfidence: number;       // 最小信頼度 (default: 0.7)
  minSemanticScore: number;    // 最小セマンティックスコア (default: 0.4)
  maxRelationsPerBoard: number; // ボード当たり最大Relations数 (default: 200)
  preventDuplication: boolean; // 重複防止 (default: true)
  preserveManualRelations: boolean; // 手動Relations保護 (default: true)
}

/**
 * 統合Relations生成サービス
 * 
 * 既存の3つの分散サービス (AI, Tag, Derived) を統合し、
 * 計算重複を排除して高品質なRelationsを生成します。
 */
export class UnifiedRelationsService {

  /**
   * メインエントリーポイント: 統合Relations生成
   */
  static async generateUnifiedRelations(
    boardId: string, 
    config: Partial<QualityConfig> = {}
  ): Promise<UnifiedAnalysisResult> {
    console.log(`🧠 [UnifiedRelationsService] ===== 統合Relations分析開始 =====`);
    console.log(`📋 [UnifiedRelationsService] ボードID: ${boardId}`);
    
    const startTime = Date.now();
    const qualityConfig = this.mergeDefaultConfig(config);
    
    try {
      // 1. カードデータ取得
      console.log(`📊 [UnifiedRelationsService] カードデータ取得中...`);
      const cards = await AnalysisService.getBoardCards(boardId);
      
      if (cards.length < 2) {
        console.warn(`⚠️ [UnifiedRelationsService] カード数不足: ${cards.length}枚`);
        return this.createEmptyResult(boardId, Date.now() - startTime);
      }

      console.log(`✅ [UnifiedRelationsService] カード取得完了: ${cards.length}枚`);

      // 2. 既存Relations取得（重複防止用）
      let existingRelations: CardRelationship[] = [];
      if (qualityConfig.preventDuplication) {
        console.log(`🔍 [UnifiedRelationsService] 既存Relations取得中...`);
        const networkData = await AnalysisService.getNetworkAnalysisData(boardId);
        existingRelations = networkData.relationships;
        console.log(`📋 [UnifiedRelationsService] 既存Relations: ${existingRelations.length}件`);
      }

      // 3. AIAnalysisServiceを統合分析設定で実行（パラメータマネージャー使用）
      console.log(`🧮 [UnifiedRelationsService] AI統合分析開始...`);
      const { AIAnalysisService } = await import('./AIAnalysisService');
      const aiParams = RelationsParameterManager.getAIParameters();
      console.log(`🎛️ [UnifiedRelationsService] AI parameters:`, aiParams);
      
      const aiResults = await AIAnalysisService.suggestRelationships(
        cards,
        aiParams.minSimilarity,   // パラメータマネージャーから取得
        aiParams.maxSuggestions,  // パラメータマネージャーから取得
        undefined, // userId
        undefined  // nestId
      );
      console.log(`📊 [UnifiedRelationsService] AI統合分析完了: ${aiResults.length}候補`);

      // 4. AI結果を統合フォーマットに変換
      console.log(`🔧 [UnifiedRelationsService] 結果変換開始...`);
      const convertedResults = this.convertAIResultsToUnifiedFormat(aiResults, cards);
      console.log(`✨ [UnifiedRelationsService] 変換完了: ${convertedResults.length}ペア`);

      // 5. 重複チェック・除外
      let deduplicatedSimilarities = qualityConfig.preventDuplication 
        ? this.removeDuplicates(convertedResults, existingRelations)
        : convertedResults;
      
      console.log(`🚫 [UnifiedRelationsService] 重複除外完了: ${deduplicatedSimilarities.length}ペア`);

      // 5.5. 数制限の適用（品質順で上位を選択）
      if (deduplicatedSimilarities.length > qualityConfig.maxRelationsPerBoard) {
        console.log(`📏 [UnifiedRelationsService] 数制限適用: ${deduplicatedSimilarities.length} → ${qualityConfig.maxRelationsPerBoard}ペア`);
        
        // OverallScoreの降順でソートして上位を選択
        deduplicatedSimilarities = deduplicatedSimilarities
          .sort((a, b) => b.overallScore - a.overallScore)
          .slice(0, qualityConfig.maxRelationsPerBoard);
        
        console.log(`✂️ [UnifiedRelationsService] 上位${qualityConfig.maxRelationsPerBoard}件選択完了`);
      }

      // 6. データベース保存はスキップ（提案段階のため、ユーザー承認後に従来通り保存）
      console.log(`⏸️ [UnifiedRelationsService] Relations保存スキップ（提案段階）`);
      const saveResults: any[] = []; // 保存は実行しない

      const processingTime = Date.now() - startTime;
      
      // 7. 結果統計作成
      const result = this.createAnalysisResult(
        boardId,
        convertedResults,
        convertedResults,
        deduplicatedSimilarities,
        saveResults,
        processingTime
      );

      console.log(`🎉 [UnifiedRelationsService] ===== 統合分析完了 =====`);
      console.log(`📈 [UnifiedRelationsService] 処理時間: ${processingTime}ms`);
      console.log(`📊 [UnifiedRelationsService] 生成Relations: ${result.generatedRelations}件`);
      console.log(`⭐ [UnifiedRelationsService] 平均品質: ${(result.qualityMetrics.averageScore * 100).toFixed(1)}%`);

      return result;

    } catch (error) {
      console.error(`❌ [UnifiedRelationsService] 統合分析エラー:`, error);
      throw error;
    }
  }

  /**
   * デフォルト設定とマージ（RelationsParameterManagerベース）
   */
  private static mergeDefaultConfig(config: Partial<QualityConfig>): QualityConfig {
    const unifiedParams = RelationsParameterManager.getUnifiedParameters();
    console.log(`🎛️ [UnifiedRelationsService] Default config from parameter manager:`, unifiedParams);
    
    return {
      minOverallScore: unifiedParams.minOverallScore,
      minConfidence: unifiedParams.minConfidence,
      minSemanticScore: unifiedParams.minSemanticScore,
      maxRelationsPerBoard: unifiedParams.maxRelationsPerBoard,
      preventDuplication: true,
      preserveManualRelations: true,
      ...config
    };
  }

  /**
   * 空の結果オブジェクト作成
   */
  private static createEmptyResult(boardId: string, processingTime: number): UnifiedAnalysisResult {
    return {
      success: true,
      boardId,
      generatedRelations: 0,
      processingTime,
      qualityMetrics: {
        averageScore: 0,
        averageConfidence: 0,
        highQualityRatio: 0
      },
      relationships: [],
      summary: {
        totalPairs: 0,
        evaluatedPairs: 0,
        filteredPairs: 0,
        savedRelations: 0
      }
    };
  }

  /**
   * 統合類似度計算（核心ロジック）
   * 
   * 既存3サービスの計算を統合し、計算重複を排除
   */
  private static async calculateComprehensiveSimilarities(
    cards: BoardItem[], 
    config: QualityConfig
  ): Promise<ComprehensiveSimilarity[]> {
    const similarities: ComprehensiveSimilarity[] = [];
    const totalPairs = (cards.length * (cards.length - 1)) / 2;
    
    console.log(`🧮 [UnifiedRelationsService] 計算対象: ${totalPairs}ペア`);

    // 全カードペアを評価
    for (let i = 0; i < cards.length; i++) {
      for (let j = i + 1; j < cards.length; j++) {
        const cardA = cards[i];
        const cardB = cards[j];
        
        // 統合類似度計算
        const similarity = await this.calculatePairSimilarity(cardA, cardB);
        similarities.push(similarity);
      }
    }

    return similarities;
  }

  /**
   * AI結果を統合フォーマットに変換
   */
  private static convertAIResultsToUnifiedFormat(
    aiResults: any[], 
    cards: BoardItem[]
  ): ComprehensiveSimilarity[] {
    return aiResults.map(suggestion => {
      const cardA = cards.find(c => c.id === suggestion.sourceCardId);
      const cardB = cards.find(c => c.id === suggestion.targetCardId);
      
      if (!cardA || !cardB) {
        console.warn(`⚠️ [UnifiedRelationsService] カード不明: ${suggestion.sourceCardId} -> ${suggestion.targetCardId}`);
        return null;
      }
      
      // AI結果を統合形式に変換
      return {
        cardA,
        cardB, 
        overallScore: suggestion.similarity || 0.5,
        components: {
          semantic: suggestion.similarity || 0.5,   // AIの主要スコア
          structural: 0.2,  // 補助スコア
          contextual: 0.1,  // 補助スコア
          content: 0.3      // 補助スコア
        },
        weights: {
          semantic: 0.7,    // AI重視
          structural: 0.1,
          contextual: 0.1,
          content: 0.1
        },
        confidence: suggestion.confidence || 0.8,
        explanation: suggestion.explanation || 'AI統合分析による関係性'
      };
    }).filter(Boolean) as ComprehensiveSimilarity[];
  }

  /**
   * カードペア間の統合類似度計算
   */
  private static async calculatePairSimilarity(
    cardA: BoardItem, 
    cardB: BoardItem
  ): Promise<ComprehensiveSimilarity> {
    
    // 1. セマンティック類似度 (AIベース)
    const semanticScore = await this.calculateSemanticSimilarity(cardA, cardB);
    
    // 2. 構造的類似度 (タグ・タイプベース)
    const structuralScore = await this.calculateStructuralSimilarity(cardA, cardB);
    
    // 3. コンテキスト類似度 (時系列・作成者ベース)
    const contextualScore = await this.calculateContextualSimilarity(cardA, cardB);
    
    // 4. コンテンツ類似度 (テキストベース)
    const contentScore = await this.calculateContentSimilarity(cardA, cardB);

    // 5. 動的重み付け（カードの特性に応じて調整）
    const weights = this.calculateDynamicWeights(cardA, cardB);
    
    // 6. 総合スコア計算
    const overallScore = 
      weights.semantic * semanticScore +
      weights.structural * structuralScore +
      weights.contextual * contextualScore +
      weights.content * contentScore;

    // 7. 信頼度計算
    const confidence = this.calculateConfidence(
      { semantic: semanticScore, structural: structuralScore, contextual: contextualScore, content: contentScore },
      weights
    );

    // 8. 説明文生成
    const explanation = this.generateExplanation(cardA, cardB, {
      semantic: semanticScore,
      structural: structuralScore, 
      contextual: contextualScore,
      content: contentScore
    });

    // デバッグ：最初の数ペアの詳細をログ出力
    const debugIndex = Math.random();
    if (debugIndex < 0.001) { // 0.1%の確率でデバッグログ
      console.log(`🔍 [UnifiedRelationsService] ペア詳細デバッグ:`, {
        cardA: { id: cardA.id, title: cardA.title?.substring(0, 30) },
        cardB: { id: cardB.id, title: cardB.title?.substring(0, 30) },
        scores: { semantic: semanticScore, structural: structuralScore, contextual: contextualScore, content: contentScore },
        weights,
        overallScore,
        confidence,
        explanation
      });
    }

    return {
      cardA,
      cardB,
      overallScore,
      components: {
        semantic: semanticScore,
        structural: structuralScore,
        contextual: contextualScore,
        content: contentScore
      },
      weights,
      confidence,
      explanation
    };
  }

  /**
   * セマンティック類似度計算（AIベース）
   * 
   * TODO: 実際のAI埋め込み計算を実装
   * 現在はモック実装
   */
  private static async calculateSemanticSimilarity(cardA: BoardItem, cardB: BoardItem): Promise<number> {
    // モック実装：実際にはAI埋め込みベクトルのコサイン類似度
    const textA = `${cardA.title} ${cardA.content}`.toLowerCase();
    const textB = `${cardB.title} ${cardB.content}`.toLowerCase();
    
    // 簡易的な単語重複ベース類似度
    const wordsA = new Set(textA.split(/\s+/));
    const wordsB = new Set(textB.split(/\s+/));
    const intersection = new Set([...wordsA].filter(word => wordsB.has(word)));
    const union = new Set([...wordsA, ...wordsB]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  /**
   * 構造的類似度計算（タグ・タイプベース）
   */
  private static calculateStructuralSimilarity(cardA: BoardItem, cardB: BoardItem): Promise<number> {
    const tagsA = new Set(cardA.tags || []);
    const tagsB = new Set(cardB.tags || []);
    
    // タグJaccard係数
    const tagIntersection = new Set([...tagsA].filter(tag => tagsB.has(tag)));
    const tagUnion = new Set([...tagsA, ...tagsB]);
    const tagSimilarity = tagUnion.size > 0 ? tagIntersection.size / tagUnion.size : 0;
    
    // カラムタイプ類似度
    const typeSimilarity = cardA.column_type === cardB.column_type ? 1.0 : 0.0;
    
    // 重み付き平均
    return Promise.resolve(0.7 * tagSimilarity + 0.3 * typeSimilarity);
  }

  /**
   * コンテキスト類似度計算（時系列・作成者ベース）
   */
  private static calculateContextualSimilarity(cardA: BoardItem, cardB: BoardItem): Promise<number> {
    let contextualScore = 0;
    
    // 作成者類似度
    if (cardA.created_by === cardB.created_by) {
      contextualScore += 0.3;
    }
    
    // 時間的近接性（1時間以内で作成）
    const timeA = new Date(cardA.created_at).getTime();
    const timeB = new Date(cardB.created_at).getTime();
    const timeDiff = Math.abs(timeA - timeB);
    const oneHour = 60 * 60 * 1000;
    
    if (timeDiff < oneHour) {
      contextualScore += 0.4;
    } else if (timeDiff < oneHour * 24) { // 24時間以内
      contextualScore += 0.2;
    }
    
    return Promise.resolve(Math.min(contextualScore, 1.0));
  }

  /**
   * コンテンツ類似度計算（テキストベース）
   */
  private static calculateContentSimilarity(cardA: BoardItem, cardB: BoardItem): Promise<number> {
    // タイトル類似度
    const titleA = (cardA.title || '').toLowerCase();
    const titleB = (cardB.title || '').toLowerCase();
    const titleSimilarity = this.calculateTextSimilarity(titleA, titleB);
    
    // コンテンツ類似度
    const contentA = (cardA.content || '').toLowerCase();
    const contentB = (cardB.content || '').toLowerCase();
    const contentSimilarity = this.calculateTextSimilarity(contentA, contentB);
    
    // 重み付き平均（タイトルを重視）
    return Promise.resolve(0.6 * titleSimilarity + 0.4 * contentSimilarity);
  }

  /**
   * テキスト類似度計算ヘルパー
   */
  private static calculateTextSimilarity(textA: string, textB: string): number {
    if (!textA || !textB) return 0;
    
    const wordsA = new Set(textA.split(/\s+/).filter(word => word.length > 2));
    const wordsB = new Set(textB.split(/\s+/).filter(word => word.length > 2));
    
    const intersection = new Set([...wordsA].filter(word => wordsB.has(word)));
    const union = new Set([...wordsA, ...wordsB]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  /**
   * 動的重み付け計算
   */
  private static calculateDynamicWeights(cardA: BoardItem, cardB: BoardItem): ComprehensiveSimilarity['weights'] {
    // カードの特性に応じた重み調整
    // TODO: より洗練されたロジックに改善
    
    return {
      semantic: 0.4,    // AIベースを重視
      structural: 0.3,  // タグ・タイプも重要
      contextual: 0.1,  // コンテキストは補助的
      content: 0.2      // テキスト内容も考慮
    };
  }

  /**
   * 信頼度計算
   */
  private static calculateConfidence(
    components: ComprehensiveSimilarity['components'], 
    weights: ComprehensiveSimilarity['weights']
  ): number {
    // 複数指標の一致度に基づく信頼度計算
    const scores = Object.values(components);
    const variance = this.calculateVariance(scores);
    
    // 分散が小さい（指標が一致している）ほど高信頼度
    const consistencyScore = Math.max(0, 1 - variance * 2);
    
    // 最高スコアが高いほど高信頼度
    const maxScore = Math.max(...scores);
    
    return (consistencyScore + maxScore) / 2;
  }

  /**
   * 分散計算ヘルパー
   */
  private static calculateVariance(values: number[]): number {
    if (values.length === 0) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length;
  }

  /**
   * 説明文生成
   */
  private static generateExplanation(
    cardA: BoardItem, 
    cardB: BoardItem, 
    components: ComprehensiveSimilarity['components']
  ): string {
    const explanations: string[] = [];
    
    if (components.semantic > 0.6) {
      explanations.push('意味的に関連している');
    }
    
    if (components.structural > 0.5) {
      explanations.push('同じタグまたはタイプ');
    }
    
    if (components.contextual > 0.3) {
      explanations.push('時間的・作成者的に近い');
    }
    
    if (components.content > 0.5) {
      explanations.push('テキスト内容が類似');
    }
    
    return explanations.length > 0 ? explanations.join('、') : '低い関連性';
  }

  /**
   * 品質フィルタリング
   */
  private static applyQualityFilters(
    similarities: ComprehensiveSimilarity[], 
    config: QualityConfig
  ): ComprehensiveSimilarity[] {
    console.log(`🔧 [UnifiedRelationsService] フィルター条件:`, {
      minOverallScore: config.minOverallScore,
      minConfidence: config.minConfidence,
      minSemanticScore: config.minSemanticScore
    });

    // デバッグ：フィルター前の統計
    if (similarities.length > 0) {
      const overallScores = similarities.map(s => s.overallScore);
      const confidences = similarities.map(s => s.confidence);
      const semanticScores = similarities.map(s => s.components.semantic);
      
      const overallStats = {
        min: Math.min(...overallScores).toFixed(3),
        max: Math.max(...overallScores).toFixed(3),
        avg: (overallScores.reduce((a, b) => a + b, 0) / overallScores.length).toFixed(3)
      };
      const confidenceStats = {
        min: Math.min(...confidences).toFixed(3),
        max: Math.max(...confidences).toFixed(3),
        avg: (confidences.reduce((a, b) => a + b, 0) / confidences.length).toFixed(3)
      };
      const semanticStats = {
        min: Math.min(...semanticScores).toFixed(3),
        max: Math.max(...semanticScores).toFixed(3),
        avg: (semanticScores.reduce((a, b) => a + b, 0) / semanticScores.length).toFixed(3)
      };

      console.log(`📊 [UnifiedRelationsService] フィルター前統計:`);
      console.log(`   総ペア数: ${similarities.length}`);
      console.log(`   OverallScore - Min:${overallStats.min}, Max:${overallStats.max}, Avg:${overallStats.avg}`);
      console.log(`   Confidence - Min:${confidenceStats.min}, Max:${confidenceStats.max}, Avg:${confidenceStats.avg}`);
      console.log(`   Semantic - Min:${semanticStats.min}, Max:${semanticStats.max}, Avg:${semanticStats.avg}`);
    }

    const filtered = similarities.filter(sim => {
      // 🎯 基本フィルター
      const passesBasicFilters = sim.overallScore >= config.minOverallScore &&
                                sim.confidence >= config.minConfidence &&
                                sim.components.semantic >= config.minSemanticScore;
      
      if (!passesBasicFilters) return false;
      
      // 🎯 追加品質チェック：複数要素で強い関連があるもののみ
      const strongComponents = [
        sim.components.semantic >= 0.2,   // セマンティックで一定以上
        sim.components.structural >= 0.3, // 構造的で強い関連
        sim.components.content >= 0.2,    // コンテンツで一定以上
        sim.components.contextual >= 0.1  // コンテキストで最低限
      ].filter(Boolean).length;
      
      // 🎯 2つ以上の要素で強い関連がある場合のみ通す
      return strongComponents >= 2;
    });

    console.log(`✨ [UnifiedRelationsService] フィルター結果: ${filtered.length}/${similarities.length}ペア通過`);
    
    return filtered;
  }

  /**
   * 重複Relations除外
   */
  private static removeDuplicates(
    similarities: ComprehensiveSimilarity[], 
    existingRelations: CardRelationship[]
  ): ComprehensiveSimilarity[] {
    const existingPairs = new Set(
      existingRelations.map(rel => 
        `${rel.card_id}-${rel.related_card_id}`
      )
    );
    
    return similarities.filter(sim => {
      const pairKey1 = `${sim.cardA.id}-${sim.cardB.id}`;
      const pairKey2 = `${sim.cardB.id}-${sim.cardA.id}`;
      return !existingPairs.has(pairKey1) && !existingPairs.has(pairKey2);
    });
  }

  /**
   * UnifiedRelations保存
   */
  private static async saveUnifiedRelations(
    boardId: string, 
    similarities: ComprehensiveSimilarity[]
  ): Promise<string[]> {
    const savedIds: string[] = [];
    
    for (const similarity of similarities) {
      try {
        const relationshipData = await AnalysisService.createRelationship(
          boardId,
          similarity.cardA.id,
          similarity.cardB.id,
          'unified', // 新しいタイプ
          similarity.overallScore,
          similarity.confidence,
          {
            unifiedAnalysis: true,
            components: similarity.components,
            weights: similarity.weights,
            explanation: similarity.explanation,
            generatedAt: new Date().toISOString()
          }
        );
        
        if (relationshipData) {
          savedIds.push(relationshipData.id);
        }
      } catch (error) {
        console.error(`❌ [UnifiedRelationsService] 保存エラー:`, error);
      }
    }
    
    return savedIds;
  }

  /**
   * 分析結果作成
   */
  private static createAnalysisResult(
    boardId: string,
    allSimilarities: ComprehensiveSimilarity[],
    filteredSimilarities: ComprehensiveSimilarity[],
    finalSimilarities: ComprehensiveSimilarity[],
    savedIds: string[],
    processingTime: number
  ): UnifiedAnalysisResult {
    
    const averageScore = finalSimilarities.length > 0 
      ? finalSimilarities.reduce((sum, sim) => sum + sim.overallScore, 0) / finalSimilarities.length 
      : 0;
      
    const averageConfidence = finalSimilarities.length > 0
      ? finalSimilarities.reduce((sum, sim) => sum + sim.confidence, 0) / finalSimilarities.length
      : 0;
      
    const highQualityCount = finalSimilarities.filter(sim => sim.overallScore > 0.7).length;
    const highQualityRatio = finalSimilarities.length > 0 ? highQualityCount / finalSimilarities.length : 0;

    return {
      success: true,
      boardId,
      generatedRelations: finalSimilarities.length, // 実際の候補数を使用
      processingTime,
      qualityMetrics: {
        averageScore,
        averageConfidence,
        highQualityRatio
      },
      relationships: finalSimilarities.map((sim, index) => ({
        similarity: sim,
        strength: sim.overallScore,
        confidence: sim.confidence,
        relationshipId: savedIds[index] || undefined
      })),
      summary: {
        totalPairs: allSimilarities.length,
        evaluatedPairs: allSimilarities.length,
        filteredPairs: filteredSimilarities.length,
        savedRelations: savedIds.length
      }
    };
  }
}
