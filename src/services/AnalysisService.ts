import { supabase } from './supabase/client';
import type { BoardItem } from './SmartClusteringService';
import type { CardRelationship, NetworkVisualizationConfig } from '../types/analysis';

export interface CardRelationshipDB {
  id: string;
  card_id: string;
  related_card_id: string;
  relationship_type: 'semantic' | 'manual' | 'derived' | 'tag_similarity' | 'ai' | 'unified';
  strength: number;
  confidence: number;
  metadata: any;
  created_at: string;
  updated_at: string;
}

export interface NetworkAnalysisData {
  cards: BoardItem[];
  relationships: CardRelationshipDB[];
  config: NetworkVisualizationConfig;
}

export interface AnalysisResult {
  success: boolean;
  relationshipsCreated: number;
  processingTime: number;
  details: {
    ruleBreakdown?: { [rule: string]: number };
    tagGroups?: { tags: string[], count: number }[];
    cardTypes?: { [type: string]: number };
    errors?: string[];
  };
  relationships: Array<{
    cardA: { id: string, title: string, type: string };
    cardB: { id: string, title: string, type: string };
    strength: number;
    explanation: string;
  }>;
  proposedRelationships?: any[]; // 提案データ（DB未作成）
}

export interface ClusterLabel {
  id: string;
  text: string;
  position: { x: number; y: number };
  theme: string;
  confidence: number;
  cardIds: string[];
  metadata: {
    dominantTags: string[];
    dominantTypes: string[];
    cardCount: number;
  };
}

export class AnalysisService {
  /**
   * 指定されたボードのカードデータを取得（sources と related_cards を含む）
   */
  static async getBoardCards(boardId: string): Promise<BoardItem[]> {
    try {
      // BoardContext.loadNestData と同じ方法を使用
      const { getBoardCardsWithTags } = await import('./BoardService');
      
      // 1. getBoardCardsWithTags でカードデータ（sources含む）を取得
      const { data: cardData, error: cardError } = await getBoardCardsWithTags(boardId);
      if (cardError) {
        console.error('Error fetching board cards:', cardError);
        throw cardError;
      }

      if (!cardData || cardData.length === 0) {
        console.log(`No cards found for board ${boardId}`);
        return [];
      }

      // 2. 関連カード情報を一括取得
      const { data: relationsData } = await supabase
        .from('board_card_relations')
        .select('card_id, related_card_id')
        .in('card_id', cardData.map((item: any) => item.id));

      console.log('[AnalysisService] Relations data:', relationsData);

      // 3. 関連カードの詳細を一括取得
      const relatedIds = relationsData ? Array.from(new Set(relationsData.map(r => r.related_card_id))) : [];
      let relatedCards: any[] = [];
      if (relatedIds.length > 0) {
        const { data: relatedCardsData } = await supabase
          .from('board_cards')
          .select('id, title, column_type, content, created_at, updated_at')
          .in('id', relatedIds);
        relatedCards = relatedCardsData || [];
      }

      console.log('[AnalysisService] Related cards data:', relatedCards);

      // id→カード情報のMap
      const relatedCardMap = Object.fromEntries(relatedCards.map(c => [c.id, c]));

      // 4. カードデータを BoardItem 形式に変換
      const cards: BoardItem[] = cardData.map((item: any) => {
        // このカードの関連カードIDを抽出
        const rels = (relationsData || []).filter(r => r.card_id === item.id);
        const related = rels.map(r => relatedCardMap[r.related_card_id]).filter(Boolean);
        const relatedCardIds = rels.map(r => r.related_card_id);

        console.log(`[AnalysisService] Card ${item.title}: relatedCardIds=${relatedCardIds.length}, related=${related.length}`);

        return {
          id: item.id,
          board_id: item.board_id,
          title: item.title,
          description: item.description || item.content || '',
          content: item.content || '',
          column_type: item.column_type,
          created_by: item.created_by,
          created_at: item.created_at,
          updated_at: item.updated_at,
          order_index: item.order_index || 0,
          is_archived: item.is_archived || false,
          metadata: item.metadata || {},
          tags: item.tags || [],
          sources: item.sources || [],
          related_card_ids: relatedCardIds,
          related_cards: related.map((c: any) => ({
            id: c.id,
            board_id: item.board_id,
            title: c.title,
            description: c.content || '',
            content: c.content || '',
            column_type: c.column_type,
            created_by: item.created_by,
            created_at: c.created_at,
            updated_at: c.updated_at,
            order_index: 0,
            is_archived: false,
            metadata: {},
            tags: [],
            sources: [],
            related_card_ids: [],
            related_cards: [],
          })),
          created_by_display_name: item.created_by_display_name,
        };
      });

      console.log(`Fetched ${cards.length} cards with sources and related cards for board ${boardId}`);
      return cards;
    } catch (error) {
      console.error('Failed to fetch board cards:', error);
      return [];
    }
  }

  /**
   * カード関係性データを取得
   */
  static async getCardRelationships(boardId: string): Promise<CardRelationshipDB[]> {
    try {
      // board_card_relationsテーブルにはboard_idがないので、
      // まずboardIdに属するカードIDを取得し、それを使ってrelationshipsを取得する
      const { data: boardCards, error: cardsError } = await supabase
        .from('board_cards')
        .select('id')
        .eq('board_id', boardId)
        .eq('is_archived', false);

      if (cardsError) {
        console.error('Error fetching board cards for relationships:', cardsError);
        throw cardsError;
      }

      const cardIds = boardCards?.map(card => card.id) || [];
      
      if (cardIds.length === 0) {
        console.log('No cards found for board, returning empty relationships');
        return [];
      }

      // カードIDを使って関係性を取得
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
        .in('card_id', cardIds)
        .order('strength', { ascending: false });

      if (error) {
        console.error('Error fetching card relationships:', error);
        throw error;
      }

      console.log(`Fetched ${data?.length || 0} relationships for board ${boardId}`);
      return data || [];
    } catch (error) {
      console.error('Failed to fetch card relationships:', error);
      return [];
    }
  }

  /**
   * ボードのネットワーク分析データを一括取得
   */
  static async getNetworkAnalysisData(boardId: string): Promise<NetworkAnalysisData> {
    try {
      const [cards, relationships] = await Promise.all([
        this.getBoardCards(boardId),
        this.getCardRelationships(boardId)
      ]);

      // デフォルト設定
      const config: NetworkVisualizationConfig = {
        viewMode: 'circular',
        layoutType: 'circular',
        edgeFilter: {
          minStrength: 0.1,
          types: ['semantic', 'manual', 'tag_similarity', 'derived', 'ai'],
        },
        nodeFilter: {
          types: ['QUESTIONS', 'INSIGHTS', 'ACTIONS', 'THEMES', 'INBOX'],
        },
        showNodeLabels: true,
        showEdgeLabels: false,
        nodeSize: 'connection_based',
      };

      return {
        cards,
        relationships,
        config
      };
    } catch (error) {
      console.error('Failed to get network analysis data:', error);
      throw error;
    }
  }

  /**
   * 新しい関係性を作成
   */
  static async createRelationship(
    boardId: string,
    cardId: string,
    relatedCardId: string,
    relationshipType: 'semantic' | 'manual' | 'derived' | 'tag_similarity' | 'ai' | 'unified',
    strength: number,
    confidence: number = 1.0,
    metadata: any = {}
  ): Promise<CardRelationshipDB | null> {
    try {
      // board_idは不要、card_idのみで関係性を作成
      const { data, error } = await supabase
        .from('board_card_relations')
        .insert({
          card_id: cardId,
          related_card_id: relatedCardId,
          relationship_type: relationshipType,
          strength,
          confidence,
          metadata,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating relationship:', error);
        throw error;
      }

      console.log('Created new relationship:', data);
      return data;
    } catch (error) {
      console.error('Failed to create relationship:', error);
      return null;
    }
  }

  /**
   * 関係性を更新
   */
  static async updateRelationship(
    relationshipId: string,
    updates: Partial<{
      strength: number;
      confidence: number;
      metadata: any;
    }>
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('board_card_relations')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', relationshipId);

      if (error) {
        console.error('Error updating relationship:', error);
        throw error;
      }

      console.log('Updated relationship:', relationshipId);
      return true;
    } catch (error) {
      console.error('Failed to update relationship:', error);
      return false;
    }
  }

  /**
   * 関係性を削除
   */
  static async deleteRelationship(relationshipId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('board_card_relations')
        .delete()
        .eq('id', relationshipId);

      if (error) {
        console.error('Error deleting relationship:', error);
        throw error;
      }

      console.log('Deleted relationship:', relationshipId);
      return true;
    } catch (error) {
      console.error('Failed to delete relationship:', error);
      return false;
    }
  }

  /**
   * 🗑️ Relations一括削除機能
   */
  static async bulkDeleteRelationships(options: {
    boardId?: string;           // 特定ボードのRelations削除
    relationshipType?: 'ai' | 'semantic' | 'tag_similarity' | 'derived' | 'manual' | 'unified'; // 特定タイプのみ削除
    strengthRange?: { min?: number; max?: number }; // 強度範囲で削除
    olderThan?: string;         // 指定日時より古いもの削除
    all?: boolean;              // 全削除（危険操作）
  }): Promise<{
    success: boolean;
    deletedCount: number;
    details: string;
    error?: string;
  }> {
    try {
      console.log('🗑️ [AnalysisService] Relations一括削除開始:', options);
      
      // クエリ構築
      let query = supabase.from('board_card_relations').delete();
      
      // ボード指定削除
      if (options.boardId) {
        // board_card_relationsから直接ボードIDで絞り込むため、
        // カード経由でフィルタリング
        const { data: boardCards } = await supabase
          .from('board_cards')
          .select('id')
          .eq('board_id', options.boardId);
        
        if (!boardCards || boardCards.length === 0) {
          return {
            success: false,
            deletedCount: 0,
            details: '指定されたボードにカードが見つかりません',
            error: 'No cards found in board'
          };
        }
        
        const cardIds = boardCards.map(c => c.id);
        query = query.in('card_id', cardIds);
      }
      
      // タイプ指定削除
      if (options.relationshipType) {
        query = query.eq('relationship_type', options.relationshipType);
      }
      
      // 強度範囲削除
      if (options.strengthRange) {
        if (options.strengthRange.min !== undefined) {
          query = query.gte('strength', options.strengthRange.min);
        }
        if (options.strengthRange.max !== undefined) {
          query = query.lte('strength', options.strengthRange.max);
        }
      }
      
      // 日時範囲削除
      if (options.olderThan) {
        query = query.lt('created_at', options.olderThan);
      }
      
      // 全削除の安全チェック
      if (options.all && !options.boardId && !options.relationshipType && !options.strengthRange && !options.olderThan) {
        console.warn('⚠️ [AnalysisService] 全Relations削除が要求されました');
        // 全削除の場合は特別な確認なしで実行（管理用）
      }
      
      // 削除前カウント取得
      const countQuery = supabase.from('board_card_relations').select('id', { count: 'exact', head: true });
      
      // 同じ条件でカウント
      if (options.boardId) {
        const { data: boardCards } = await supabase
          .from('board_cards')
          .select('id')
          .eq('board_id', options.boardId);
        
        if (boardCards) {
          const cardIds = boardCards.map(c => c.id);
          countQuery.in('card_id', cardIds);
        }
      }
      
      if (options.relationshipType) {
        countQuery.eq('relationship_type', options.relationshipType);
      }
      
      if (options.strengthRange) {
        if (options.strengthRange.min !== undefined) {
          countQuery.gte('strength', options.strengthRange.min);
        }
        if (options.strengthRange.max !== undefined) {
          countQuery.lte('strength', options.strengthRange.max);
        }
      }
      
      if (options.olderThan) {
        countQuery.lt('created_at', options.olderThan);
      }
      
      const { count: beforeCount } = await countQuery;
      
      // 実際の削除実行
      const { error, count: deletedCount } = await query;
      
      if (error) {
        console.error('❌ [AnalysisService] 一括削除エラー:', error);
        return {
          success: false,
          deletedCount: 0,
          details: `削除エラー: ${error.message}`,
          error: error.message
        };
      }
      
      const finalDeletedCount = deletedCount || 0;
      
      // 詳細メッセージ作成
      const details = [
        options.boardId ? `ボード: ${options.boardId}` : null,
        options.relationshipType ? `タイプ: ${options.relationshipType}` : null,
        options.strengthRange ? `強度: ${options.strengthRange.min || 0}-${options.strengthRange.max || 1}` : null,
        options.olderThan ? `日時: ${options.olderThan}より古い` : null,
        options.all ? '全Relations' : null
      ].filter(Boolean).join(', ');
      
      console.log(`✅ [AnalysisService] 一括削除完了: ${finalDeletedCount}件削除 (${details})`);
      
      return {
        success: true,
        deletedCount: finalDeletedCount,
        details: `${finalDeletedCount}件のRelationsを削除しました (${details})`
      };
      
    } catch (error) {
      console.error('❌ [AnalysisService] 一括削除で予期しないエラー:', error);
      return {
        success: false,
        deletedCount: 0,
        details: '一括削除中に予期しないエラーが発生しました',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * サンプル関係性データを作成（テスト用）
   */
  static async createSampleRelationships(boardId: string): Promise<void> {
    try {
      // ボードのカードを取得
      const cards = await this.getBoardCards(boardId);
      
      if (cards.length < 2) {
        console.log('Not enough cards to create sample relationships');
        return;
      }

      // サンプル関係性を生成
      const sampleRelationships = [];
      
      // カード間にランダムな関係性を作成
      for (let i = 0; i < Math.min(cards.length, 5); i++) {
        for (let j = i + 1; j < Math.min(cards.length, 5); j++) {
          if (Math.random() > 0.5) { // 50%の確率で関係性を作成
            const relationshipTypes = ['semantic', 'manual', 'tag_similarity'] as const;
            const randomType = relationshipTypes[Math.floor(Math.random() * relationshipTypes.length)];
            
            sampleRelationships.push({
              card_id: cards[i].id,
              related_card_id: cards[j].id,
              relationship_type: randomType,
              strength: Math.random() * 0.8 + 0.2, // 0.2-1.0
              confidence: Math.random() * 0.5 + 0.5, // 0.5-1.0
              metadata: {
                sample: true,
                created_by: 'system',
              },
            });
          }
        }
      }

      if (sampleRelationships.length === 0) {
        console.log('No sample relationships to create');
        return;
      }

      const { data, error } = await supabase
        .from('board_card_relations')
        .insert(sampleRelationships)
        .select();

      if (error) {
        console.error('Error creating sample relationships:', error);
        throw error;
      }

      console.log(`Created ${data?.length || 0} sample relationships`);
    } catch (error) {
      console.error('Failed to create sample relationships:', error);
    }
  }

  /**
   * タグの類似性に基づいて関係性を自動生成（改良版）
   */
  static async generateTagSimilarityRelationships(boardId: string): Promise<AnalysisResult> {
    const startTime = Date.now();
    const result: AnalysisResult = {
      success: false,
      relationshipsCreated: 0,
      processingTime: 0,
      details: { tagGroups: [], cardTypes: {}, errors: [] },
      relationships: []
    };

    try {
      console.log('[AnalysisService] Generating tag similarity relationships (improved)...');
      
      const cards = await this.getBoardCards(boardId);
      
      if (cards.length < 2) {
        result.details.errors!.push('分析には2枚以上のカードが必要です');
        result.processingTime = Date.now() - startTime;
        return result;
      }

      console.log(`Analyzing ${cards.length} cards for tag similarities...`);

      // 既存のタグ類似性関係性を取得
      const existingRelationships = await this.getCardRelationships(boardId);
      const existingTagRelationships = new Set(
        existingRelationships
          .filter(rel => rel.relationship_type === 'tag_similarity')
          .map(rel => `${rel.card_id}-${rel.related_card_id}`)
      );

      console.log(`Found ${existingTagRelationships.size} existing tag similarity relationships`);

      // 意味のあるカードタイプペアを定義
      // ❌ meaningfulPairs削除 - カードタイプ制限を撤廃
      // ❌ typeCompatibility削除 - 構造メタデータ使用を停止

      // 候補関係性を収集（純粋なセマンティック分析）
      const candidateRelationships = [];
      const tagGroupStats: { [key: string]: number } = {};

      // ❌ カードタイプ統計削除 - 構造メタデータ分析を除外
      // result.details.cardTypes = cardTypeStats;

      // 時間情報の取得（時間的近さのスコアリング用）
      const cardTimes = cards.map(card => ({
        id: card.id,
        time: new Date(card.created_at).getTime()
      }));
      const maxTimeDiff = Math.max(...cardTimes.map(c => c.time)) - Math.min(...cardTimes.map(c => c.time));

      for (let i = 0; i < cards.length; i++) {
        for (let j = i + 1; j < cards.length; j++) {
          const cardA = cards[i];
          const cardB = cards[j];

          // セマンティックコンテンツのみでフィルタリング
          if (!cardA.tags?.length || !cardB.tags?.length) continue;
          // ❌ isValidPair削除 - カードタイプ制限を撤廃

          const tagsA = new Set(cardA.tags);
          const tagsB = new Set(cardB.tags);
          const commonTags = [...tagsA].filter(tag => tagsB.has(tag));
          
          // 🔧 Relations量増加: 最小共通タグ数を緩和
          // 最低1個の共通タグがあれば関係性候補とする
          if (commonTags.length < 1) continue;

          // Phase2: 改良された類似度計算（ジャカード類似度）
          const intersection = commonTags.length;
          const union = new Set([...tagsA, ...tagsB]).size;
          const jaccard = intersection / union;
          
          // カバレッジ（各カードのタグのうち共通タグの割合）
          const coverageA = intersection / tagsA.size;
          const coverageB = intersection / tagsB.size;
          const avgCoverage = (coverageA + coverageB) / 2;
          
          // 基本類似度（ジャカード + カバレッジのバランス）
          const similarity = (jaccard * 0.6) + (avgCoverage * 0.4);

          // 🔧 Relations量増加: 類似度閾値を緩和（0.6 → 0.4）
          if (similarity < 0.4) continue;

          // 既存関係性チェック
          const pairKey = `${cardA.id}-${cardB.id}`;
          const reversePairKey = `${cardB.id}-${cardA.id}`;
          if (existingTagRelationships.has(pairKey) || existingTagRelationships.has(reversePairKey)) continue;

          // Phase2: セマンティック品質スコア計算（タイプ相性除外）
          // ❌ typeBonus削除 - 構造メタデータボーナスを除外
          
          // 時間的近さ（同じ時期に作成されたカードは関連性が高い）
          const timeA = cardTimes.find(c => c.id === cardA.id)?.time || 0;
          const timeB = cardTimes.find(c => c.id === cardB.id)?.time || 0;
          const timeDiff = Math.abs(timeA - timeB);
          const temporalBonus = maxTimeDiff > 0 ? Math.max(0, 1 - (timeDiff / maxTimeDiff)) * 0.2 : 0.1;

          // タグ品質ボーナス（より具体的で意味のあるタグの組み合わせ）
          const tagQuality = commonTags.length > 1 ? 
            Math.min(0.3, commonTags.length * 0.15) : 0.1; // ウェイト増加

          // コンテンツ類似性ボーナス（新規追加）
          const contentSimilarity = this.calculateContentSimilarity(cardA, cardB);

          // 純粋なセマンティック品質スコア（タイプ相性除外）
          const qualityScore = (
            similarity * 0.5 +           // 基本類似度（50%）
            contentSimilarity * 0.2 +    // コンテンツ類似度（20%）
            temporalBonus * 0.15 +       // 時間的近さ（15%）
            tagQuality * 0.15            // タグ品質（15%）
          );

          // 強度計算（品質スコアベース）
          const strength = Math.min(0.9, qualityScore);
          const confidence = Math.min(0.95, similarity + contentSimilarity * 0.3);

          candidateRelationships.push({
            cardA,
            cardB,
            commonTags,
            similarity,
            qualityScore,
            strength,
            confidence,
            // ❌ typeBonus削除
            temporalBonus,
            tagQuality,
            contentSimilarity,
            explanation: `共通タグ「${commonTags.join(', ')}」(${commonTags.length}個, セマンティック品質: ${Math.round(qualityScore * 100)}%)`
          });

          // タググループ統計
          const tagKey = commonTags.sort().join(',');
          tagGroupStats[tagKey] = (tagGroupStats[tagKey] || 0) + 1;
        }
      }

      console.log(`Found ${candidateRelationships.length} candidate semantic relationships`);

      // Phase2: 動的閾値調整 + 品質ベース選別（より厳しい制限）
      const totalPairs = cards.length * (cards.length - 1) / 2;
      const targetConnections = Math.min(
        Math.floor(totalPairs * 0.08), // 最大8%のペア（15% → 8%）
        20,                            // 絶対最大20個（50個 → 20個）
        Math.max(3, Math.floor(cards.length * 0.4)) // カード数に応じた最小保証も削減
      );

      // 品質スコアでソートして上位を選択
      const selectedRelationships = candidateRelationships
        .sort((a, b) => b.qualityScore - a.qualityScore)
        .slice(0, targetConnections);

      console.log(`Selected top ${selectedRelationships.length} relationships (target: ${targetConnections})`);

      if (selectedRelationships.length === 0) {
        result.details.errors!.push('品質基準を満たすタグ類似性関係性が見つかりませんでした');
        result.processingTime = Date.now() - startTime;
        return result;
      }

      // データベース挿入用の関係性データを準備
      const newRelationships = selectedRelationships.map(rel => ({
        card_id: rel.cardA.id,
        related_card_id: rel.cardB.id,
        relationship_type: 'tag_similarity' as const,
        strength: rel.strength,
        confidence: rel.confidence,
        metadata: {
          commonTags: rel.commonTags,
          totalCommonTags: rel.commonTags.length,
          cardATags: rel.cardA.tags,
          cardBTags: rel.cardB.tags,
          similarity: rel.similarity,
          qualityScore: rel.qualityScore,
          // ❌ typeCompatibility削除
          temporalBonus: rel.temporalBonus,
          tagQuality: rel.tagQuality,
          autoGenerated: true,
          generatedAt: new Date().toISOString(),
          algorithmVersion: '2.0-improved'
        }
      }));

      // 提案レベルで返す（DB作成はしない）
      // 結果データを構築（タイプ情報を表示用にのみ使用）
      result.relationships = selectedRelationships.map(rel => ({
        cardA: { id: rel.cardA.id, title: rel.cardA.title, type: rel.cardA.column_type },
        cardB: { id: rel.cardB.id, title: rel.cardB.title, type: rel.cardB.column_type },
        strength: rel.strength,
        explanation: rel.explanation
      }));

      // タググループ統計を整理
      result.details.tagGroups = Object.entries(tagGroupStats)
        .map(([tags, count]) => ({ tags: tags.split(','), count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      result.success = true;
      result.relationshipsCreated = selectedRelationships.length;
      result.processingTime = Date.now() - startTime;
      
      console.log(`✅ Pure semantic tag similarity analysis completed: ${selectedRelationships.length} relationships`);
      return result;

    } catch (error) {
      console.error('タグ類似性分析エラー:', error);
      result.details.errors!.push(`分析中にエラーが発生しました: ${error}`);
      result.processingTime = Date.now() - startTime;
      return result;
    }
  }

  /**
   * コンテンツ類似性を計算
   */
  private static calculateContentSimilarity(cardA: BoardItem, cardB: BoardItem): number {
    const textA = `${cardA.title || ''} ${cardA.content || ''}`.toLowerCase().trim();
    const textB = `${cardB.title || ''} ${cardB.content || ''}`.toLowerCase().trim();
    
    if (!textA || !textB) return 0;
    
    // 単語レベルでの類似度計算
    const wordsA = textA.split(/\s+/).filter(w => w.length > 2);
    const wordsB = textB.split(/\s+/).filter(w => w.length > 2);
    
    if (wordsA.length === 0 || wordsB.length === 0) return 0;
    
    const setA = new Set(wordsA);
    const setB = new Set(wordsB);
    
    const intersection = [...setA].filter(word => setB.has(word)).length;
    const union = new Set([...setA, ...setB]).size;
    
    return union > 0 ? intersection / union : 0;
  }

  /**
   * テキスト類似度計算ヘルパー（推論分析用）
   */
  private static calculateTextSimilarityHelper(textA: string, textB: string): number {
    if (!textA || !textB) return 0;
    
    // 日本語対応の単語分割
    const cleanTextA = textA.replace(/[^\w\s\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g, ' ').toLowerCase();
    const cleanTextB = textB.replace(/[^\w\s\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g, ' ').toLowerCase();
    
    const wordsA = cleanTextA.split(/\s+/).filter(w => w.length > 1);
    const wordsB = cleanTextB.split(/\s+/).filter(w => w.length > 1);
    
    if (wordsA.length === 0 || wordsB.length === 0) return 0;
    
    const setA = new Set(wordsA);
    const setB = new Set(wordsB);
    
    const intersection = [...setA].filter(word => setB.has(word)).length;
    const union = new Set([...setA, ...setB]).size;
    
    return union > 0 ? intersection / union : 0;
  }

  /**
   * 既存Relations全タイプを取得（重複防止用）
   */
  private static async getExistingAllTypeRelations(boardId: string): Promise<Array<{card_id: string, related_card_id: string}>> {
    try {
      // まずboard_cardsからIDを取得
      const { data: cardIds, error: cardError } = await supabase
        .from('board_cards')
        .select('id')
        .eq('board_id', boardId);
      
      if (cardError || !cardIds) {
        console.error(`❌ [AnalysisService] カードID取得エラー:`, cardError);
        return [];
      }
      
      const cardIdArray = cardIds.map(card => card.id);
      
      const { data, error } = await supabase
        .from('board_card_relations')
        .select('card_id, related_card_id, relationship_type')
        .in('card_id', cardIdArray)
        .in('relationship_type', ['ai', 'derived', 'tag_similarity', 'manual', 'semantic', 'unified']);
      
      if (error) {
        console.error(`❌ [AnalysisService] 既存Relations取得エラー:`, error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error(`❌ [AnalysisService] 既存Relations取得例外:`, error);
      return [];
    }
  }

  /**
   * カードペアの正規化キー作成（順序無関係）
   */
  private static createPairKey(cardId1: string, cardId2: string): string {
    return cardId1 < cardId2 ? `${cardId1}-${cardId2}` : `${cardId2}-${cardId1}`;
  }

  /**
   * 推論関係性を自動生成（ルールベース）
   */
  static async generateDerivedRelationships(boardId: string): Promise<AnalysisResult> {
    const startTime = Date.now();
    const result: AnalysisResult = {
      success: false,
      relationshipsCreated: 0,
      processingTime: 0,
      details: { ruleBreakdown: {}, cardTypes: {}, errors: [] },
      relationships: []
    };

    try {
      // 1. 既存Relations全タイプをチェック（重複防止）
      const existingRelations = await this.getExistingAllTypeRelations(boardId);
      const existingPairs = new Set(existingRelations.map(r => this.createPairKey(r.card_id, r.related_card_id)));
      
      console.log(`🔍 [AnalysisService] 既存Relations: ${existingRelations.length}件`);
      console.log(`📝 [AnalysisService] 既存ペア: ${existingPairs.size}ペア (重複防止対象)`);
      
      // 2. カード取得開始
      console.log('🔗 [AnalysisService] 推論関係性分析開始...');
      
      const cards = await this.getBoardCards(boardId);
      console.log(`📊 [AnalysisService] 対象カード数: ${cards.length}枚`);
      
      if (cards.length < 2) {
        result.details.errors!.push('分析には2枚以上のカードが必要です');
        result.processingTime = Date.now() - startTime;
        return result;
      }

      // 既存の derived 関係性を取得
      // 既存の推論専用チェックは削除（全タイプチェックに統一）

      const newRelationships = [];
      const ruleStats: { [rule: string]: number } = {};

      // カラムタイプごとにグループ化
      const cardsByType = cards.reduce((acc, card) => {
        if (!acc[card.column_type]) acc[card.column_type] = [];
        acc[card.column_type].push(card);
        return acc;
      }, {} as Record<string, typeof cards>);

      // カラムタイプ統計
      result.details.cardTypes = Object.fromEntries(
        Object.entries(cardsByType).map(([type, cards]) => [type, cards.length])
      );

      // ルール1: THEMESとINSIGHTSの関係
      if (cardsByType.THEMES && cardsByType.INSIGHTS) {
        for (const theme of cardsByType.THEMES) {
          for (const insight of cardsByType.INSIGHTS) {
            // テーマのメタデータに関連するインサイトIDがある場合
            if (theme.metadata?.relatedInsightIds?.includes(insight.id)) {
              // 重複チェック（全タイプ対応）
              const normalizedPairKey = this.createPairKey(theme.id, insight.id);
              if (!existingPairs.has(normalizedPairKey)) {
                const relationshipData = {
                  card_id: theme.id,
                  related_card_id: insight.id,
                  relationship_type: 'derived' as const,
                  strength: 0.8,
                  confidence: 0.9,
                  metadata: {
                    derivationRule: 'theme_insight_metadata',
                    explanation: 'テーマのメタデータに関連インサイトとして記録されています',
                    autoGenerated: true,
                    generatedAt: new Date().toISOString(),
                  }
                };

                newRelationships.push(relationshipData);
                ruleStats['テーマ→インサイト(メタデータ)'] = (ruleStats['テーマ→インサイト(メタデータ)'] || 0) + 1;

                result.relationships.push({
                  cardA: { id: theme.id, title: theme.title, type: theme.column_type },
                  cardB: { id: insight.id, title: insight.title, type: insight.column_type },
                  strength: 0.8,
                  explanation: 'メタデータによる関連付け'
                });
              }
            }
          }
        }
      }

      // ルール2: QUESTIONSとINSIGHTSの関係（作成時間ベース）
      if (cardsByType.QUESTIONS && cardsByType.INSIGHTS) {
        for (const question of cardsByType.QUESTIONS) {
          for (const insight of cardsByType.INSIGHTS) {
            const questionTime = new Date(question.created_at).getTime();
            const insightTime = new Date(insight.created_at).getTime();
            
            // 質問の後1時間以内に作成されたインサイト
            if (insightTime > questionTime && insightTime - questionTime < 3600000) {
              // 重複チェック（全タイプ対応）
              const normalizedPairKey = this.createPairKey(question.id, insight.id);
              if (!existingPairs.has(normalizedPairKey)) {
                const timeDiff = insightTime - questionTime;
                const strength = Math.max(0.4, 0.8 - (timeDiff / 3600000) * 0.4); // 時間が近いほど強い関係
                
                const relationshipData = {
                  card_id: question.id,
                  related_card_id: insight.id,
                  relationship_type: 'derived' as const,
                  strength,
                  confidence: 0.7,
                  metadata: {
                    derivationRule: 'question_insight_temporal',
                    explanation: `質問後 ${Math.round(timeDiff / 60000)} 分以内に作成されたインサイト`,
                    timeDifferenceMinutes: Math.round(timeDiff / 60000),
                    autoGenerated: true,
                    generatedAt: new Date().toISOString(),
                  }
                };

                newRelationships.push(relationshipData);
                ruleStats['質問→インサイト(時間)'] = (ruleStats['質問→インサイト(時間)'] || 0) + 1;

                result.relationships.push({
                  cardA: { id: question.id, title: question.title, type: question.column_type },
                  cardB: { id: insight.id, title: insight.title, type: insight.column_type },
                  strength,
                  explanation: `時間差 ${Math.round(timeDiff / 60000)} 分`
                });
              }
            }
          }
        }
      }

      // 🔧 新ルール3: 内容類似性推論（セマンティック分析）
      const maxContentSimilarityPairs = 60; // 最大60ペアまで
      let contentSimilarityCount = 0;
      
      for (let i = 0; i < cards.length && contentSimilarityCount < maxContentSimilarityPairs; i++) {
        for (let j = i + 1; j < cards.length && contentSimilarityCount < maxContentSimilarityPairs; j++) {
          const cardA = cards[i];
          const cardB = cards[j];
          
          // 重複チェック（全タイプ対応）
          const normalizedPairKey = this.createPairKey(cardA.id, cardB.id);
          if (!existingPairs.has(normalizedPairKey)) {
            // タイトル類似性計算
            const titleSimilarity = this.calculateTextSimilarityHelper(cardA.title || '', cardB.title || '');
            
            // 本文類似性計算  
            const contentSimilarity = this.calculateTextSimilarityHelper(cardA.content || '', cardB.content || '');
            
            // タグ類似性計算
            const tagsA = new Set(cardA.tags || []);
            const tagsB = new Set(cardB.tags || []);
            const commonTags = [...tagsA].filter(tag => tagsB.has(tag));
            const tagSimilarity = commonTags.length > 0 ? commonTags.length / Math.max(tagsA.size, tagsB.size) : 0;
            
            // 統合類似度（重み付き平均）
            const overallSimilarity = (titleSimilarity * 0.3) + (contentSimilarity * 0.6) + (tagSimilarity * 0.1);
            
            // 閾値チェック（0.3以上で関係性あり）
            if (overallSimilarity >= 0.3) {
              const strength = Math.min(0.8, overallSimilarity + 0.1); // 類似度に基づく強度
              
              const relationshipData = {
                card_id: cardA.id,
                related_card_id: cardB.id,
                relationship_type: 'derived' as const,
                strength,
                confidence: 0.8,
                metadata: {
                  derivationRule: 'content_similarity',
                  explanation: `内容類似性: ${(overallSimilarity * 100).toFixed(1)}%`,
                  titleSimilarity: titleSimilarity.toFixed(3),
                  contentSimilarity: contentSimilarity.toFixed(3),
                  tagSimilarity: tagSimilarity.toFixed(3),
                  overallSimilarity: overallSimilarity.toFixed(3),
                  commonTags,
                  autoGenerated: true,
                  generatedAt: new Date().toISOString(),
                }
              };

              newRelationships.push(relationshipData);
              ruleStats['内容類似性'] = (ruleStats['内容類似性'] || 0) + 1;
              contentSimilarityCount++;

              result.relationships.push({
                cardA: { id: cardA.id, title: cardA.title, type: cardA.column_type },
                cardB: { id: cardB.id, title: cardB.title, type: cardB.column_type },
                strength,
                explanation: `内容類似性${(overallSimilarity * 100).toFixed(1)}%`
              });
            }
          }
        }
      }

      // 🔧 改良ルール4: ワークフロー関係（内容ベース）
      const workflowPairs = [
        { sourceType: 'QUESTIONS', targetType: 'INSIGHTS', label: '質問→洞察' },
        { sourceType: 'INSIGHTS', targetType: 'ACTIONS', label: '洞察→行動' },
        { sourceType: 'INSIGHTS', targetType: 'THEMES', label: '洞察→テーマ' },
        { sourceType: 'QUESTIONS', targetType: 'ACTIONS', label: '質問→行動' }
      ];

      workflowPairs.forEach(({ sourceType, targetType, label }) => {
        const sourceCards = cardsByType[sourceType] || [];
        const targetCards = cardsByType[targetType] || [];
        
        for (const sourceCard of sourceCards) {
          for (const targetCard of targetCards) {
            // 重複チェック（全タイプ対応）
            const normalizedPairKey = this.createPairKey(sourceCard.id, targetCard.id);
            if (!existingPairs.has(normalizedPairKey)) {
              // 内容類似性計算
              const titleSimilarity = this.calculateTextSimilarityHelper(sourceCard.title || '', targetCard.title || '');
              const contentSimilarity = this.calculateTextSimilarityHelper(sourceCard.content || '', targetCard.content || '');
              
              // タグ類似性
              const sourceTags = new Set(sourceCard.tags || []);
              const targetTags = new Set(targetCard.tags || []);
              const commonTags = [...sourceTags].filter(tag => targetTags.has(tag));
              const tagSimilarity = commonTags.length > 0 ? commonTags.length / Math.max(sourceTags.size, targetTags.size) : 0;
              
              // ワークフロー類似度（内容重視）
              const workflowSimilarity = (titleSimilarity * 0.2) + (contentSimilarity * 0.7) + (tagSimilarity * 0.1);
              
              // ワークフローボーナス（タイプ間の論理的関係）
              const workflowBonus = 0.1;
              const finalSimilarity = workflowSimilarity + workflowBonus;
              
              // 閾値チェック（0.25以上）
              if (finalSimilarity >= 0.25) {
                const strength = Math.min(0.8, finalSimilarity + 0.1);
                
                const relationshipData = {
                  card_id: sourceCard.id,
                  related_card_id: targetCard.id,
                  relationship_type: 'derived' as const,
                  strength,
                  confidence: 0.8,
                  metadata: {
                    derivationRule: 'workflow_content_similarity',
                    explanation: `${label}: 内容類似性${(workflowSimilarity * 100).toFixed(1)}%`,
                    workflowType: label,
                    titleSimilarity: titleSimilarity.toFixed(3),
                    contentSimilarity: contentSimilarity.toFixed(3),
                    tagSimilarity: tagSimilarity.toFixed(3),
                    workflowSimilarity: workflowSimilarity.toFixed(3),
                    finalSimilarity: finalSimilarity.toFixed(3),
                    commonTags,
                    autoGenerated: true,
                    generatedAt: new Date().toISOString(),
                  }
                };

                newRelationships.push(relationshipData);
                ruleStats[label] = (ruleStats[label] || 0) + 1;

                result.relationships.push({
                  cardA: { id: sourceCard.id, title: sourceCard.title, type: sourceCard.column_type },
                  cardB: { id: targetCard.id, title: targetCard.title, type: targetCard.column_type },
                  strength,
                  explanation: `${label}: ${(workflowSimilarity * 100).toFixed(1)}%`
                });
              }
            }
          }
        }
      });

      if (newRelationships.length === 0) {
        result.details.errors!.push('新しい推論関係性は見つかりませんでした');
        result.processingTime = Date.now() - startTime;
        return result;
      }

      // 提案レベルで返す（DB作成はしない）
      result.details.ruleBreakdown = ruleStats;
      result.success = true;
      result.relationshipsCreated = 0; // 提案レベルなので0
      result.proposedRelationships = newRelationships; // 提案データを追加
      result.processingTime = Date.now() - startTime;

      console.log(`✅ [推論分析] 生成完了: ${newRelationships.length}件の推論Relations提案`);
      console.log('📈 [推論分析] ルール別内訳:', JSON.stringify(ruleStats, null, 2));
      console.log(`⏱️ [推論分析] 処理時間: ${Date.now() - startTime}ms`);
      return result;
    } catch (error) {
      console.error('Failed to generate derived relationships:', error);
      result.details.errors!.push(`処理エラー: ${error instanceof Error ? error.message : '不明なエラー'}`);
      result.processingTime = Date.now() - startTime;
      return result;
    }
  }

  /**
   * 既存のaiタイプ関係性を適切なタイプに変換（マイグレーション）
   */
  static async migrateAiRelationshipsToProperTypes(boardId: string): Promise<void> {
    try {
      console.log('[AnalysisService] Migrating AI relationships to proper types...');
      
      // aiタイプの関係性を取得
      const existingRelationships = await this.getCardRelationships(boardId);
      const aiRelationships = existingRelationships.filter(rel => rel.relationship_type === 'ai');
      
      if (aiRelationships.length === 0) {
        console.log('No AI relationships to migrate');
        return;
      }

      console.log(`Found ${aiRelationships.length} AI relationships to migrate`);
      
      // ボードのカードを取得（タグ情報が必要）
      const cards = await this.getBoardCards(boardId);
      const cardMap = new Map(cards.map(card => [card.id, card]));

      const updates = [];

      for (const relationship of aiRelationships) {
        const sourceCard = cardMap.get(relationship.card_id);
        const targetCard = cardMap.get(relationship.related_card_id);
        
        if (!sourceCard || !targetCard) {
          console.warn(`Cards not found for relationship ${relationship.id}`);
          continue;
        }

        // メタデータから元のAI分類を確認
        const originalAiType = relationship.metadata?.originalAiType;
        let newRelationshipType: 'semantic' | 'tag_similarity' | 'derived' = 'semantic';

        if (originalAiType) {
          // メタデータに元のAI分類がある場合、それを使用
          switch (originalAiType) {
            case 'topical':
              newRelationshipType = 'tag_similarity';
              break;
            case 'conceptual':
            case 'semantic':
            default:
              newRelationshipType = 'semantic';
              break;
          }
        } else {
          // メタデータがない場合、カード情報から推測
          const sourceTags = new Set(sourceCard.tags || []);
          const targetTags = new Set(targetCard.tags || []);
          const commonTags = [...sourceTags].filter(tag => targetTags.has(tag));
          
          if (commonTags.length > 0) {
            // 共通タグがある場合はタグ類似性
            newRelationshipType = 'tag_similarity';
          } else if (sourceCard.column_type === targetCard.column_type) {
            // 同じカテゴリの場合は推論関係性
            newRelationshipType = 'derived';
          } else {
            // その他は意味的関係性
            newRelationshipType = 'semantic';
          }
        }

        // メタデータを更新（マイグレーション情報を追加）
        const updatedMetadata = {
          ...relationship.metadata,
          migratedFrom: 'ai',
          migratedAt: new Date().toISOString(),
          migrationReason: originalAiType 
            ? `Original AI type: ${originalAiType}` 
            : 'Inferred from card properties',
        };

        updates.push({
          id: relationship.id,
          newType: newRelationshipType,
          metadata: updatedMetadata,
        });
      }

      if (updates.length === 0) {
        console.log('No relationships to update');
        return;
      }

      // バッチ更新を実行
      console.log(`Updating ${updates.length} relationships...`);
      
      for (const update of updates) {
        const { error } = await supabase
          .from('board_card_relations')
          .update({
            relationship_type: update.newType,
            metadata: update.metadata,
            updated_at: new Date().toISOString(),
          })
          .eq('id', update.id);

        if (error) {
          console.error(`Failed to update relationship ${update.id}:`, error);
        }
      }

      console.log(`Successfully migrated ${updates.length} AI relationships to proper types`);
      
      // 統計を表示
      const typeCount = updates.reduce((acc, update) => {
        acc[update.newType] = (acc[update.newType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      console.log('Migration summary:', typeCount);
      
    } catch (error) {
      console.error('Failed to migrate AI relationships:', error);
      throw error;
    }
  }

  /**
   * クラスターに自動ラベルを生成
   */
  static async generateClusterLabels(boardId: string, clusters: string[][]): Promise<ClusterLabel[]> {
    const startTime = Date.now();
    
    try {
      console.log('[AnalysisService] Generating cluster labels...');
      
      const cards = await this.getBoardCards(boardId);
      const cardMap = new Map(cards.map(card => [card.id, card]));
      
      const clusterLabels: ClusterLabel[] = [];
      
      clusters.forEach((cluster, index) => {
        const clusterCards = cluster.map(id => cardMap.get(id)).filter(Boolean) as BoardItem[];
        
        if (clusterCards.length < 2) return;
        
        const label = this.generateClusterLabel(clusterCards, index);
        const position = this.calculateLabelPosition(clusterCards);
        const theme = this.detectClusterTheme(clusterCards);
        const confidence = this.calculateLabelConfidence(clusterCards);
        
        clusterLabels.push({
          id: `cluster-${index}`,
          text: label,
          position,
          theme,
          confidence,
          cardIds: cluster,
          metadata: {
            dominantTags: this.getDominantTags(clusterCards),
            dominantTypes: this.getDominantTypes(clusterCards),
            cardCount: clusterCards.length
          }
        });
      });
      
      console.log(`Generated ${clusterLabels.length} cluster labels in ${Date.now() - startTime}ms`);
      return clusterLabels;
    } catch (error) {
      console.error('Failed to generate cluster labels:', error);
      return [];
    }
  }



  /**
   * コンテンツベースの安全なラベル生成（タイプ情報除外版）
   */
  private static generateSafeLabelsFromContent(topTag: string, cardCount: number): string[] {
    const labels: string[] = [];
    
    // タグベースの安全なラベル
    if (topTag && this.isValidSemanticLabel(topTag)) {
      const tagMapping: { [key: string]: string[] } = {
        'design': ['Design Concepts', 'Design Ideas'],
        'research': ['Research Findings', 'Research Notes'],
        'ux': ['UX Research', 'User Experience'],
        'ui': ['UI Design', 'Interface Design'],
        'accessibility': ['Accessibility Guidelines', 'A11y Standards'],
        'usability': ['Usability Studies', 'User Testing'],
        'prototype': ['Prototype Development', 'Prototyping'],
        'testing': ['Testing Methods', 'Quality Assurance'],
        'feedback': ['User Feedback', 'Review Comments'],
        'analysis': ['Data Analysis', 'Research Analysis']
      };
      
      const mappedLabels = tagMapping[topTag.toLowerCase()];
      if (mappedLabels) {
        labels.push(...mappedLabels);
      }
    }
    
    // カード数ベースの一般的ラベル
    if (cardCount >= 5) {
      labels.push('Major Topic', 'Key Theme');
    } else if (cardCount >= 3) {
      labels.push('Sub Topic', 'Related Items');
    } else {
      labels.push('Discussion Point', 'Related Notes');
    }
    
    return labels;
  }

  /**
   * ラベルがセマンティックに有効かチェック（固有名詞排除）
   */
  private static isValidSemanticLabel(label: string): boolean {
    if (!label || label.length === 0) return false;
    
    // 固有名詞パターンの完全チェック
    const properNounPatterns = [
      /^[A-Z][a-z]+$/,  // 単純な固有名詞
      /^[A-Z][a-z]+[A-Z][a-z]+/,  // CamelCase
      /mina|john|jane|alex|mike|sarah|david|tom|lisa|anna|ken|yuki|taro|hanako/i,
      /speaker|user|admin|moderator|participant|member/i,
      /notebook|llm|gpt|claude|openai|anthropic/i,
      /twitter|facebook|instagram|youtube|slack|zoom/i,
      /react|vue|angular|python|java|javascript/i,
      /^\d+$/, // 数字のみ
      /^[a-zA-Z]$/ // 単一文字
    ];
    
    // 固有名詞パターンに一致する場合は無効
    if (properNounPatterns.some(pattern => pattern.test(label))) {
      return false;
    }
    
    // セマンティックに意味のある語かチェック
    const meaningfulPatterns = [
      // 日本語の意味のある概念語
      /^(分析|設計|開発|改善|検証|評価|調査|研究|実装|運用|管理|企画|計画|戦略|手法|方法|技術|機能|システム|プロセス|ワークフロー|インターフェース|ユーザビリティ|アクセシビリティ|セキュリティ|パフォーマンス|品質|効率|生産性|創造性|革新|変更|更新|最適化|自動化|可視化|標準化)/,
      // 英語の意味のある概念語
      /^(analysis|design|development|improvement|verification|evaluation|research|implementation|operation|management|planning|strategy|method|technology|function|system|process|workflow|interface|usability|accessibility|security|performance|quality|efficiency|productivity|creativity|innovation|change|update|optimization|automation|visualization|standardization)/i,
      // カテゴリ系の語
      /^(insights?|themes?|questions?|actions?|ideas?|concepts?|problems?|solutions?|observations?|hypotheses?)$/i,
      // 一般的な形容詞・名詞（日本語）
      /^(重要|主要|基本|基礎|応用|実践|実用|実際|現実|理想|具体|抽象|全体|部分|個別|共通|特定|一般|特別|普通|通常|異常|正常|標準|独自|固有|共有|公開|非公開|内部|外部|前面|背面|上位|下位|同等|類似|相違|対照|対応|関連|無関係).*$/,
      // 一般的な形容詞・名詞（英語）
      /^(important|main|basic|fundamental|applied|practical|actual|real|ideal|concrete|abstract|whole|part|individual|common|specific|general|special|normal|usual|standard|unique|shared|public|private|internal|external|upper|lower|similar|different|related|relevant).*$/i
    ];
    
    return meaningfulPatterns.some(pattern => pattern.test(label)) || label.length >= 4;
  }

  /**
   * 安全なラベルリストを生成（ホワイトリスト方式）
   */
  private static generateSafeLabels(topTag: string, topType: string, cardCount: number): string[] {
    const safeLabels: string[] = [];
    
    // タグベースの安全なラベル
    const safeTagLabels: { [key: string]: string } = {
      'ux': 'UX',
      'ui': 'UI', 
      'design': 'デザイン',
      'research': 'リサーチ',
      'usability': 'ユーザビリティ',
      'accessibility': 'アクセシビリティ',
      'testing': 'テスト',
      'analysis': '分析',
      'strategy': '戦略',
      'planning': '企画',
      'implementation': '実装',
      'evaluation': '評価'
    };
    
    if (topTag && safeTagLabels[topTag.toLowerCase()]) {
      safeLabels.push(safeTagLabels[topTag.toLowerCase()]);
    }
    
    // タイプベースの安全なラベル
    const safeTypeLabels: { [key: string]: string } = {
      'INSIGHTS': 'インサイト',
      'THEMES': 'テーマ',
      'QUESTIONS': '質問',
      'ACTIONS': 'アクション',
      'INBOX': 'アイデア',
      'IDEAS': 'アイデア',
      'PROBLEMS': '課題',
      'SOLUTIONS': '解決策'
    };
    
    if (safeTypeLabels[topType]) {
      safeLabels.push(safeTypeLabels[topType]);
    }
    
    // サイズベースの安全なラベル
    if (cardCount >= 5) {
      safeLabels.push('主要グループ');
    } else if (cardCount >= 3) {
      safeLabels.push('関連グループ');
    } else {
      safeLabels.push('小グループ');
    }
    
    return safeLabels;
  }

  /**
   * テキストからキーワードを抽出（TF-IDFベース改善版）
   */
  private static extractKeywords(text: string): string[] {
    // 1. 基本的な前処理
    const stopWords = new Set([
      'の', 'を', 'に', 'は', 'が', 'と', 'で', 'から', 'まで', 'について', 'による',
      'する', 'した', 'して', 'される', 'できる', 'ある', 'いる', 'なる', 'もの',
      'こと', 'これ', 'それ', 'あれ', 'この', 'その', 'あの', 'ここ', 'そこ', 'あそこ',
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'とか', 'なんか', 'でも', 'だから', 'そう', 'はい', 'いえ', 'まあ', 'ちょっと', 'えーと'
    ]);

    // 2. 固有名詞・サービス名パターン（簡潔版）
    const properNounPatterns = [
      /^[A-Z][a-z]+[A-Z][a-z]+/, // CamelCase
      /^[A-Z][a-z]{2,8}$/, // 一般的な固有名詞
      /mina|john|jane|alex|mike|sarah|speaker|user|admin/i,
      /notebook|llm|gpt|claude|openai|slack|zoom/i,
      /^\d+$/, /^[a-zA-Z]$/ // 数字・単一文字
    ];

    // 3. 初期単語抽出
    const allWords = text
      .toLowerCase()
      .replace(/[^\w\s\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g, ' ')
      .split(/\s+/)
      .filter(word => {
        if (word.length < 2) return false;
        if (stopWords.has(word)) return false;
        if (properNounPatterns.some(pattern => pattern.test(word))) return false;
        return true;
      });

    // 4. 頻度分析
    const wordFreq: { [word: string]: number } = {};
    allWords.forEach(word => {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    });

    const frequencies = Object.values(wordFreq);
    if (frequencies.length === 0) return [];

    // 5. 統計学的外れ値検出（Z-score + IQR併用）
    const mean = frequencies.reduce((a, b) => a + b, 0) / frequencies.length;
    const variance = frequencies.reduce((acc, freq) => acc + Math.pow(freq - mean, 2), 0) / frequencies.length;
    const stdDev = Math.sqrt(variance);

    // IQR計算
    const sortedFreqs = [...frequencies].sort((a, b) => a - b);
    const q1 = sortedFreqs[Math.floor(sortedFreqs.length * 0.25)];
    const q3 = sortedFreqs[Math.floor(sortedFreqs.length * 0.75)];
    const iqr = q3 - q1;

    console.log('📊 Statistical Analysis:', {
      totalWords: allWords.length,
      uniqueWords: Object.keys(wordFreq).length,
      mean: Math.round(mean * 100) / 100,
      stdDev: Math.round(stdDev * 100) / 100,
      q1, q3, iqr
    });

    // 6. 合理的フィルタリング（統計的外れ値除去）
    const validKeywords = Object.entries(wordFreq)
      .filter(([word, freq]) => {
        // Z-scoreチェック（異常に高い頻度を除外）
        const zScore = stdDev > 0 ? (freq - mean) / stdDev : 0;
        if (zScore > 2.0) { // 2σ以上は固定見出し・定型文の可能性
          console.log(`❌ Statistical outlier excluded: "${word}" (freq: ${freq}, z-score: ${Math.round(zScore * 100) / 100})`);
          return false;
        }

        // IQR外れ値チェック（補助的）
        const iqrThreshold = q3 + (1.5 * iqr);
        if (freq > iqrThreshold && freq > 3) { // 頻度3以上かつIQR外れ値
          console.log(`❌ IQR outlier excluded: "${word}" (freq: ${freq}, threshold: ${Math.round(iqrThreshold)})`);
          return false;
        }

        // 意味的価値チェック（簡潔版）
        if (word.length < 3 && !/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(word)) {
          return false; // 短い英単語を除外（日本語は2文字以上OK）
        }

        return true;
      })
      .sort(([, a], [, b]) => b - a) // 頻度順
      .slice(0, 20) // 上位20個まで
      .map(([word]) => word);

    console.log('✅ Valid keywords after statistical filtering:', validKeywords.slice(0, 10));
    return validKeywords;
  }

  /**
   * 統計的共起分析（改良版）
   */
  private static analyzeStatisticalCooccurrence(clusterCards: BoardItem[]): Array<{term: string, frequency: number}> {
    const termPairs = new Map<string, number>();
    
    // 各カードのキーワードセットを取得
    const cardKeywords = clusterCards.map(card => 
      new Set(this.extractKeywords(card.title + ' ' + (card.content || '')))
    );

    // ペアワイズ共起分析
    for (let i = 0; i < cardKeywords.length; i++) {
      for (let j = i + 1; j < cardKeywords.length; j++) {
        const intersection = new Set([...cardKeywords[i]].filter(x => cardKeywords[j].has(x)));
        
        intersection.forEach(term => {
          if (term.length >= 3) { // 3文字以上のみ
            termPairs.set(term, (termPairs.get(term) || 0) + 1);
          }
        });
      }
    }

    return Array.from(termPairs.entries())
      .map(([term, frequency]) => ({ term, frequency }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 5);
  }

  /**
   * タグラベルの美化
   */
  private static beautifyTagLabel(tag: string): string | null {
    const tagMapping: { [key: string]: string } = {
      'ux': 'UXリサーチ',
      'ui': 'UI設計',
      'design': 'デザイン',
      'research': 'リサーチ',
      'test': 'テスト分析',
      'accessibility': 'アクセシビリティ',
      'usability': 'ユーザビリティ',
      'prototype': 'プロトタイプ',
      'feedback': 'フィードバック',
      'analysis': '分析結果'
    };

    return tagMapping[tag.toLowerCase()] || (tag.length >= 3 ? tag.toUpperCase() : null);
  }

  /**
   * 意味的な組み合わせラベル作成
   */
  private static createMeaningfulCombination(word1: string, word2: string): string {
    // 自然な日本語組み合わせパターン
    const combinations: { [key: string]: (w1: string, w2: string) => string } = {
      'design,analysis': () => 'デザイン分析',
      'user,research': () => 'ユーザーリサーチ',
      'test,result': () => 'テスト結果',
      'feedback,analysis': () => 'フィードバック分析'
    };

    const key1 = `${word1},${word2}`;
    const key2 = `${word2},${word1}`;
    
    if (combinations[key1]) return combinations[key1](word1, word2);
    if (combinations[key2]) return combinations[key2](word2, word1);
    
    // デフォルトの組み合わせ（15文字以内）
    const combined = `${word1}・${word2}`;
    return combined.length <= 15 ? combined : word1;
  }

  /**
   * 統計学的に合理的なクラスターラベル生成
   */
  private static generateClusterLabel(clusterCards: BoardItem[], clusterIndex: number): string {
    // 1. タグ頻度分析（最も信頼性が高い）
    const tagFreq: { [tag: string]: number } = {};
    clusterCards.forEach(card => {
      card.tags?.forEach(tag => {
        tagFreq[tag] = (tagFreq[tag] || 0) + 1;
      });
    });

    // 2. キーワード抽出（統計的フィルタリング済み）
    const allText = clusterCards
      .map(card => `${card.title} ${card.content || ''}`)
      .join(' ');
    const keywords = this.extractKeywords(allText);

    // 3. 意味的コンテンツの共起分析
    const cooccurrenceTerms = this.analyzeStatisticalCooccurrence(clusterCards);

    console.log(`🎯 Cluster ${clusterIndex + 1} Rational Analysis:`, {
      cardCount: clusterCards.length,
      dominantTags: Object.entries(tagFreq).sort(([,a], [,b]) => b - a).slice(0, 3),
      topKeywords: keywords.slice(0, 5),
      cooccurrenceTerms: cooccurrenceTerms.slice(0, 3)
    });

    // 4. 合理的ラベル生成戦略（シンプル→複雑）
    const strategies = [
      // 戦略1: 高頻度タグ（最も信頼性が高い）
      () => {
        if (Object.keys(tagFreq).length > 0) {
          const topTag = Object.keys(tagFreq).reduce((a, b) => tagFreq[a] > tagFreq[b] ? a : b);
          const coverage = tagFreq[topTag] / clusterCards.length;
          
          if (coverage >= 0.6) { // 60%以上のカードが共有
            const beautified = this.beautifyTagLabel(topTag);
            if (beautified) return beautified;
          }
        }
        return null;
      },

      // 戦略2: 意味的キーワード組み合わせ
      () => {
        if (keywords.length >= 2) {
          const keyword1 = keywords[0];
          const keyword2 = keywords[1];
          
          if (keyword1.length >= 3 && keyword2.length >= 3) {
            return this.createMeaningfulCombination(keyword1, keyword2);
          }
        }
        return null;
      },

      // 戦略3: 統計的共起語
      () => {
        if (cooccurrenceTerms.length > 0) {
          const topCooccurrence = cooccurrenceTerms[0];
          if (topCooccurrence.frequency >= 2) { // 2回以上共起
            return this.beautifyLabel(topCooccurrence.term);
          }
        }
        return null;
      },

      // 戦略4: 単一キーワード
      () => {
        if (keywords.length > 0) {
          return this.beautifyLabel(keywords[0]);
        }
        return null;
      },

      // 戦略5: カード数ベースのフォールバック
      () => {
        if (clusterCards.length >= 5) return `主要テーマ ${clusterIndex + 1}`;
        if (clusterCards.length >= 3) return `関連項目 ${clusterIndex + 1}`;
        return `グループ ${clusterIndex + 1}`;
      }
    ];

    // 戦略を順次実行
    for (const strategy of strategies) {
      const label = strategy();
      if (label && label.length > 0 && label.length <= 25) {
        console.log(`✅ Selected strategy label: "${label}"`);
        return label;
      }
    }

    return `グループ ${clusterIndex + 1}`;
  }

  /**
   * クラスターのテーマを検出
   */
  private static detectClusterTheme(clusterCards: BoardItem[]): string {
    const tagCounts: { [tag: string]: number } = {};
    clusterCards.forEach(card => {
      card.tags?.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });

    const dominantTag = Object.keys(tagCounts).length > 0
      ? Object.keys(tagCounts).reduce((a, b) => tagCounts[a] > tagCounts[b] ? a : b)
      : '';

    const themeMapping: { [key: string]: string } = {
      'ux': 'ux',
      'psychology': 'psychology',
      'design': 'design',
      'research': 'research',
      'behavior': 'psychology',
      'user': 'ux',
      'interface': 'design',
      'usability': 'ux',
      'accessibility': 'ux'
    };

    return themeMapping[dominantTag] || 'default';
  }

  /**
   * ラベル配置位置を計算
   */
  private static calculateLabelPosition(clusterCards: BoardItem[]): { x: number; y: number } {
    // カードの位置が設定されていない場合はデフォルト位置
    const cardsWithPosition = clusterCards.filter(card => 
      card.metadata?.position?.x !== undefined && card.metadata?.position?.y !== undefined
    );
    
    if (cardsWithPosition.length === 0) {
      return { x: 400, y: 200 }; // デフォルト位置
    }
    
    const centerX = cardsWithPosition.reduce((sum, card) => sum + (card.metadata?.position?.x || 0), 0) / cardsWithPosition.length;
    const centerY = cardsWithPosition.reduce((sum, card) => sum + (card.metadata?.position?.y || 0), 0) / cardsWithPosition.length;
    
    // ラベルをクラスターの上部に配置
    const minY = Math.min(...cardsWithPosition.map(card => card.metadata?.position?.y || 0));
    
    return {
      x: centerX,
      y: minY - 40 // クラスターの上40px
    };
  }

  /**
   * ラベルの信頼度を計算
   */
  private static calculateLabelConfidence(clusterCards: BoardItem[]): number {
    // 要素の一貫性に基づいて信頼度を計算
    const tagFreq: { [tag: string]: number } = {};
    const typeFreq: { [type: string]: number } = {};
    
    clusterCards.forEach(card => {
      card.tags?.forEach(tag => {
        tagFreq[tag] = (tagFreq[tag] || 0) + 1;
      });
      typeFreq[card.column_type] = (typeFreq[card.column_type] || 0) + 1;
    });
    
    const totalCards = clusterCards.length;
    const maxTagFreq = Math.max(...Object.values(tagFreq), 0);
    const maxTypeFreq = Math.max(...Object.values(typeFreq));
    
    // タグの一貫性とタイプの一貫性を組み合わせて信頼度を計算
    const tagConsistency = maxTagFreq / totalCards;
    const typeConsistency = maxTypeFreq / totalCards;
    
    return Math.min(0.95, (tagConsistency * 0.6 + typeConsistency * 0.4));
  }

  /**
   * 主要タグを取得
   */
  private static getDominantTags(clusterCards: BoardItem[]): string[] {
    const tagFreq: { [tag: string]: number } = {};
    clusterCards.forEach(card => {
      card.tags?.forEach(tag => {
        tagFreq[tag] = (tagFreq[tag] || 0) + 1;
      });
    });
    
    return Object.entries(tagFreq)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([tag]) => tag);
  }

  /**
   * 主要タイプを取得
   */
  private static getDominantTypes(clusterCards: BoardItem[]): string[] {
    const typeFreq: { [type: string]: number } = {};
    clusterCards.forEach(card => {
      typeFreq[card.column_type] = (typeFreq[card.column_type] || 0) + 1;
    });
    
    return Object.entries(typeFreq)
      .sort(([, a], [, b]) => b - a)
      .map(([type]) => type);
  }

  // === セマンティック解析メソッド ===

  /**
   * 文書テキストを準備（TF-IDF計算用）
   */
  private static prepareDocumentText(title: string, content?: string, tags?: string[]): string {
    const titleText = title || '';
    const contentText = content || '';
    const tagText = tags ? tags.join(' ') : '';
    
    return `${titleText} ${contentText} ${tagText}`.toLowerCase()
      .replace(/[^\w\s\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g, ' ') // 日本語文字を保持
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * TF-IDF分析で重要キーワードを特定
   */
  private static calculateTFIDF(documents: string[], clusterCards: BoardItem[]): Array<{word: string, score: number}> {
    const allWords = new Set<string>();
    const wordCounts: { [word: string]: number } = {};
    const documentWordCounts: Array<{ [word: string]: number }> = [];

    // 各文書の単語カウント
    documents.forEach(doc => {
      const words = this.extractKeywords(doc);
      const docWordCount: { [word: string]: number } = {};
      
      words.forEach(word => {
        if (word.length > 1) { // 1文字の単語は除外
          allWords.add(word);
          wordCounts[word] = (wordCounts[word] || 0) + 1;
          docWordCount[word] = (docWordCount[word] || 0) + 1;
        }
      });
      
      documentWordCounts.push(docWordCount);
    });

    const totalDocuments = documents.length;
    const tfidfScores: Array<{word: string, score: number}> = [];

    // 各単語のTF-IDF計算
    Array.from(allWords).forEach(word => {
      const tf = documentWordCounts.reduce((sum, doc) => sum + (doc[word] || 0), 0) / 
                 documentWordCounts.reduce((sum, doc) => sum + Object.values(doc).reduce((a, b) => a + b, 0), 0);
      
      const documentsWithWord = documentWordCounts.filter(doc => doc[word] > 0).length;
      const idf = Math.log(totalDocuments / (documentsWithWord + 1));
      
      const tfidf = tf * idf;
      
      if (tfidf > 0.001) { // 閾値以上のスコアのみ
        tfidfScores.push({ word, score: tfidf });
      }
    });

    return tfidfScores
      .sort((a, b) => b.score - a.score)
      .slice(0, 10); // 上位10個
  }

  /**
   * 共起関係分析
   */
  private static analyzeCooccurrence(clusterCards: BoardItem[]): Array<{term: string, frequency: number}> {
    const cooccurrenceMap = new Map<string, number>();
    
    // カード間での単語の共起を分析
    for (let i = 0; i < clusterCards.length; i++) {
      for (let j = i + 1; j < clusterCards.length; j++) {
        const wordsA = new Set(this.extractKeywords(clusterCards[i].title + ' ' + (clusterCards[i].content || '')));
        const wordsB = new Set(this.extractKeywords(clusterCards[j].title + ' ' + (clusterCards[j].content || '')));
        
        // 共通単語を見つける
        const commonWords = Array.from(wordsA).filter(word => wordsB.has(word));
        
        commonWords.forEach(word => {
          if (word.length > 2) { // 3文字以上の単語のみ
            cooccurrenceMap.set(word, (cooccurrenceMap.get(word) || 0) + 1);
          }
        });
      }
    }

    return Array.from(cooccurrenceMap.entries())
      .map(([term, frequency]) => ({ term, frequency }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 5); // 上位5個
  }

  /**
   * ラベルを美しく整形
   */
  private static beautifyLabel(keyword: string): string {
    // 日本語キーワードの美化
    const beautifyMap: { [key: string]: string } = {
      'ユーザー': 'ユーザー体験',
      'インターフェース': 'UI設計',
      'デザイン': 'デザイン',
      'リサーチ': 'リサーチ',
      'テスト': 'テスト&検証',
      'アクセシビリティ': 'アクセシビリティ',
      'ユーザビリティ': 'ユーザビリティ',
      'プロトタイプ': 'プロトタイピング',
      'ワイヤーフレーム': 'ワイヤーフレーム',
      'フィードバック': 'フィードバック',
      // 英語キーワードの美化
      'user': 'User Experience',
      'interface': 'Interface Design',
      'design': 'Design',
      'research': 'Research',
      'test': 'Testing',
      'accessibility': 'Accessibility',
      'usability': 'Usability',
      'prototype': 'Prototyping',
      'wireframe': 'Wireframing',
      'feedback': 'Feedback'
    };

    const lowercaseKeyword = keyword.toLowerCase();
    return beautifyMap[lowercaseKeyword] || 
           (keyword.length > 0 ? keyword.charAt(0).toUpperCase() + keyword.slice(1) : keyword);
  }

  /**
   * 自然な組み合わせラベルを生成
   */
  private static createNaturalCombination(keyword1: string, keyword2: string): string {
    const beautified1 = this.beautifyLabel(keyword1);
    const beautified2 = this.beautifyLabel(keyword2);
    
    // 日本語の自然なパターンで組み合わせ
    const patterns = [
      // 動作系キーワードの組み合わせ
      () => {
        if (keyword1.match(/(改善|向上|分析|検証|設計|開発)/) || keyword2.match(/(改善|向上|分析|検証|設計|開発)/)) {
          const actionWord = keyword1.match(/(改善|向上|分析|検証|設計|開発)/) ? beautified1 : beautified2;
          const targetWord = keyword1.match(/(改善|向上|分析|検証|設計|開発)/) ? beautified2 : beautified1;
          return `${targetWord}${actionWord}`;
        }
        return null;
      },
      
      // 手法・プロセス系の組み合わせ
      () => {
        if (keyword1.match(/(手法|方法|プロセス|アプローチ)/) || keyword2.match(/(手法|方法|プロセス|アプローチ)/)) {
          const methodWord = keyword1.match(/(手法|方法|プロセス|アプローチ)/) ? beautified1 : beautified2;
          const domainWord = keyword1.match(/(手法|方法|プロセス|アプローチ)/) ? beautified2 : beautified1;
          return `${domainWord}${methodWord}`;
        }
        return null;
      },
      
      // ドメイン特化組み合わせ
      () => {
        if (keyword1.match(/(ユーザー|デザイン|インターフェース)/) || keyword2.match(/(ユーザー|デザイン|インターフェース)/)) {
          const domainWord = keyword1.match(/(ユーザー|デザイン|インターフェース)/) ? beautified1 : beautified2;
          const specWord = keyword1.match(/(ユーザー|デザイン|インターフェース)/) ? beautified2 : beautified1;
          return `${domainWord}${specWord}`;
        }
        return null;
      },
      
      // デフォルト組み合わせ
      () => `${beautified1}${beautified2}`
    ];
    
    for (const pattern of patterns) {
      const result = pattern();
      if (result) return result;
    }
    
    return `${beautified1}${beautified2}`;
  }
  
  /**
   * セマンティック組み合わせラベルを生成
   */
  private static createSemanticCombination(keyword: string, tag: string): string {
    const beautifiedKeyword = this.beautifyLabel(keyword);
    const beautifiedTag = this.beautifyLabel(tag);
    
    // 組み合わせパターン
    const combinationPatterns = [
      // タグが手法系の場合
      () => {
        if (['research', 'analysis', 'testing', 'evaluation', 'design', 'ux'].includes(tag.toLowerCase())) {
          return `${beautifiedTag}${beautifiedKeyword}`;
        }
        return null;
      },
      
      // キーワードが動作系の場合
      () => {
        if (keyword.match(/(改善|向上|分析|検証|設計|開発)/)) {
          return `${beautifiedTag}の${beautifiedKeyword}`;
        }
        return null;
      },
      
      // デフォルト組み合わせ
      () => {
        if (beautifiedKeyword.length + beautifiedTag.length <= 20) {
          return `${beautifiedTag}${beautifiedKeyword}`;
        }
        return null;
      }
    ];
    
    for (const pattern of combinationPatterns) {
      const result = pattern();
      if (result) return result;
    }
    
    return beautifiedKeyword; // フォールバック
  }

  private static generateLabelReasoning(
    cards: BoardItem[],
    keywords: string[],
    dominantTags: string[],
    _unusedType: string
  ): string {
    const reasons: string[] = [];
    
    if (keywords.length > 0) {
      reasons.push(`キーワード「${keywords[0]}」が頻出`);
    }
    
    if (dominantTags.length > 0) {
      reasons.push(`タグ「${dominantTags[0]}」が共通`);
    }
    
    // ❌ タイプ情報削除 - 構造メタデータ使用を停止
    // if (dominantType) {
    //   reasons.push(`タイプ「${this.getTypeLabel(dominantType)}」が主要`);
    // }
    
    reasons.push(`${cards.length}個のカードで構成`);
    
    return reasons.join('、');
  }
} 