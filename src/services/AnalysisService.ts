import { supabase } from './supabase/client';
import type { BoardItem } from '../features/board-space/contexts/BoardContext';
import type { CardRelationship, NetworkVisualizationConfig } from '../types/analysis';

export interface CardRelationshipDB {
  id: string;
  card_id: string;
  related_card_id: string;
  relationship_type: 'semantic' | 'manual' | 'derived' | 'tag_similarity' | 'ai';
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
    relationshipType: 'semantic' | 'manual' | 'derived' | 'tag_similarity' | 'ai',
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
      const meaningfulPairs = [
        ['INSIGHTS', 'THEMES'],
        ['INSIGHTS', 'ACTIONS'], 
        ['QUESTIONS', 'INSIGHTS'],
        ['INBOX', 'INSIGHTS'],
        ['THEMES', 'ACTIONS'],
        ['QUESTIONS', 'THEMES'],
        ['INBOX', 'ACTIONS'],
        // 同じタイプ内でも意味があるペア
        ['INSIGHTS', 'INSIGHTS'],
        ['THEMES', 'THEMES']
      ];

      // カードタイプペアの相性スコア
      const typeCompatibility: Record<string, number> = {
        'INSIGHTS-THEMES': 0.9,
        'INSIGHTS-ACTIONS': 0.8,
        'QUESTIONS-INSIGHTS': 0.8,
        'INBOX-INSIGHTS': 0.7,
        'THEMES-ACTIONS': 0.8,
        'QUESTIONS-THEMES': 0.6,
        'INBOX-ACTIONS': 0.5,
        'INSIGHTS-INSIGHTS': 0.6,
        'THEMES-THEMES': 0.6
      };

      const getTypeCompatibility = (typeA: string, typeB: string): number => {
        const key1 = `${typeA}-${typeB}`;
        const key2 = `${typeB}-${typeA}`;
        return typeCompatibility[key1] || typeCompatibility[key2] || 0.3;
      };

      const isValidPair = (cardA: any, cardB: any): boolean => {
        return meaningfulPairs.some(([typeA, typeB]) => 
          (cardA.column_type === typeA && cardB.column_type === typeB) ||
          (cardA.column_type === typeB && cardB.column_type === typeA)
        );
      };

      // 候補関係性を収集
      const candidateRelationships = [];
      const tagGroupStats: { [key: string]: number } = {};

      // カードタイプ別統計
      const cardTypeStats: { [type: string]: number } = {};
      cards.forEach(card => {
        cardTypeStats[card.column_type] = (cardTypeStats[card.column_type] || 0) + 1;
      });
      result.details.cardTypes = cardTypeStats;

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

          // 基本フィルタリング
          if (!cardA.tags?.length || !cardB.tags?.length) continue;
          if (!isValidPair(cardA, cardB)) continue;

          const tagsA = new Set(cardA.tags);
          const tagsB = new Set(cardB.tags);
          const commonTags = [...tagsA].filter(tag => tagsB.has(tag));
          
          // Phase1: より厳しい最小共通タグ数フィルタ
          // 共通タグが2個以上、または共通タグ1個で両カードが非常に小さいタグセットの場合のみ
          const minCommonTags = commonTags.length >= 2 ? 2 : 
                               (commonTags.length === 1 && tagsA.size <= 2 && tagsB.size <= 2) ? 1 : 0;
          
          if (commonTags.length < minCommonTags) continue;

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

          // Phase1: より厳しい類似度閾値フィルタ（0.4 → 0.6）
          if (similarity < 0.6) continue;

          // 既存関係性チェック
          const pairKey = `${cardA.id}-${cardB.id}`;
          const reversePairKey = `${cardB.id}-${cardA.id}`;
          if (existingTagRelationships.has(pairKey) || existingTagRelationships.has(reversePairKey)) continue;

          // Phase2: 品質スコア計算
          const typeBonus = getTypeCompatibility(cardA.column_type, cardB.column_type);
          
          // 時間的近さ（同じ時期に作成されたカードは関連性が高い）
          const timeA = cardTimes.find(c => c.id === cardA.id)?.time || 0;
          const timeB = cardTimes.find(c => c.id === cardB.id)?.time || 0;
          const timeDiff = Math.abs(timeA - timeB);
          const temporalBonus = maxTimeDiff > 0 ? Math.max(0, 1 - (timeDiff / maxTimeDiff)) * 0.2 : 0.1;

          // タグ品質ボーナス（より具体的で意味のあるタグの組み合わせ）
          const tagQuality = commonTags.length > 1 ? 
            Math.min(0.2, commonTags.length * 0.1) : 0.05;

          // 総合品質スコア
          const qualityScore = (
            similarity * 0.5 +           // 基本類似度（50%）
            typeBonus * 0.25 +           // カードタイプ相性（25%）
            temporalBonus * 0.15 +       // 時間的近さ（15%）
            tagQuality * 0.1             // タグ品質（10%）
          );

          // 強度計算（品質スコアベース）
          const strength = Math.min(0.9, qualityScore);
          const confidence = Math.min(0.95, similarity + typeBonus * 0.3);

          candidateRelationships.push({
            cardA,
            cardB,
            commonTags,
            similarity,
            qualityScore,
            strength,
            confidence,
            typeBonus,
            temporalBonus,
            tagQuality,
            explanation: `共通タグ「${commonTags.join(', ')}」(${commonTags.length}個, 品質: ${Math.round(qualityScore * 100)}%)`
          });

          // タググループ統計
          const tagKey = commonTags.sort().join(',');
          tagGroupStats[tagKey] = (tagGroupStats[tagKey] || 0) + 1;
        }
      }

      console.log(`Found ${candidateRelationships.length} candidate relationships`);

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
          typeCompatibility: rel.typeBonus,
          temporalBonus: rel.temporalBonus,
          tagQuality: rel.tagQuality,
          autoGenerated: true,
          generatedAt: new Date().toISOString(),
          algorithmVersion: '2.0-improved'
        }
      }));

      // 提案レベルで返す（DB作成はしない）
      // 結果データを構築
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
        .slice(0, 10); // 上位10グループ

      result.success = true;
      result.relationshipsCreated = 0; // 提案レベルなので0
      result.proposedRelationships = selectedRelationships; // 提案データを追加
      result.processingTime = Date.now() - startTime;

      console.log(`✅ Generated ${selectedRelationships.length} high-quality tag similarity relationship proposals`);
      console.log(`📊 Algorithm stats:`, {
        candidatesEvaluated: candidateRelationships.length,
        targetConnections,
        selectionRate: `${Math.round((selectedRelationships.length / candidateRelationships.length) * 100)}%`,
        avgQualityScore: Math.round(selectedRelationships.reduce((sum, rel) => sum + rel.qualityScore, 0) / selectedRelationships.length * 100) / 100
      });

      return result;
    } catch (error) {
      console.error('Failed to generate tag similarity relationships:', error);
      result.details.errors!.push(`処理エラー: ${error instanceof Error ? error.message : '不明なエラー'}`);
      result.processingTime = Date.now() - startTime;
      return result;
    }
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
      console.log('[AnalysisService] Generating derived relationships...');
      
      const cards = await this.getBoardCards(boardId);
      
      if (cards.length < 2) {
        result.details.errors!.push('分析には2枚以上のカードが必要です');
        result.processingTime = Date.now() - startTime;
        return result;
      }

      // 既存の derived 関係性を取得
      const existingRelationships = await this.getCardRelationships(boardId);
      const existingDerivedRelationships = new Set(
        existingRelationships
          .filter(rel => rel.relationship_type === 'derived')
          .map(rel => `${rel.card_id}-${rel.related_card_id}`)
      );

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
              const pairKey = `${theme.id}-${insight.id}`;
              const reversePairKey = `${insight.id}-${theme.id}`;
              
              if (!existingDerivedRelationships.has(pairKey) && !existingDerivedRelationships.has(reversePairKey)) {
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
              const pairKey = `${question.id}-${insight.id}`;
              const reversePairKey = `${insight.id}-${question.id}`;
              
              if (!existingDerivedRelationships.has(pairKey) && !existingDerivedRelationships.has(reversePairKey)) {
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

      // ルール3: INSIGHTSとACTIONSの関係（ワークフロー的関係）
      if (cardsByType.INSIGHTS && cardsByType.ACTIONS) {
        for (const insight of cardsByType.INSIGHTS) {
          for (const action of cardsByType.ACTIONS) {
            // インサイトとアクションが同じタグを持つ場合
            const insightTags = new Set(insight.tags || []);
            const actionTags = new Set(action.tags || []);
            const commonTags = [...insightTags].filter(tag => actionTags.has(tag));
            
            if (commonTags.length > 0) {
              const pairKey = `${insight.id}-${action.id}`;
              const reversePairKey = `${action.id}-${insight.id}`;
              
              if (!existingDerivedRelationships.has(pairKey) && !existingDerivedRelationships.has(reversePairKey)) {
                const strength = Math.min(0.8, 0.5 + (commonTags.length * 0.1));
                
                const relationshipData = {
                  card_id: insight.id,
                  related_card_id: action.id,
                  relationship_type: 'derived' as const,
                  strength,
                  confidence: 0.8,
                  metadata: {
                    derivationRule: 'insight_action_workflow',
                    explanation: `共通タグ「${commonTags.join(', ')}」による洞察→行動の関係`,
                    commonTags,
                    autoGenerated: true,
                    generatedAt: new Date().toISOString(),
                  }
                };

                newRelationships.push(relationshipData);
                ruleStats['インサイト→アクション(ワークフロー)'] = (ruleStats['インサイト→アクション(ワークフロー)'] || 0) + 1;

                result.relationships.push({
                  cardA: { id: insight.id, title: insight.title, type: insight.column_type },
                  cardB: { id: action.id, title: action.title, type: action.column_type },
                  strength,
                  explanation: `共通タグ「${commonTags.join(', ')}」`
                });
              }
            }
          }
        }
      }

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

      console.log(`Generated ${newRelationships.length} derived relationship proposals`);
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
   * クラスターのラベルを生成（セマンティック改善版）
   */
  private static generateClusterLabel(clusterCards: BoardItem[], clusterIndex: number): string {
    // タグ頻度分析
    const tagFreq: { [tag: string]: number } = {};
    const typeFreq: { [type: string]: number } = {};
    const keywordFreq: { [keyword: string]: number } = {};

    // 全カードの文書コーパスを作成（TF-IDF計算用）
    const documents = clusterCards.map(card => 
      this.prepareDocumentText(card.title, card.content, card.tags)
    );

    clusterCards.forEach(card => {
      // タグをカウント
      card.tags?.forEach(tag => {
        tagFreq[tag] = (tagFreq[tag] || 0) + 1;
      });
      
      // タイプをカウント
      typeFreq[card.column_type] = (typeFreq[card.column_type] || 0) + 1;
      
      // タイトルとコンテンツからキーワード抽出
      const keywords = this.extractKeywords(card.title + ' ' + (card.content || ''));
      keywords.forEach(keyword => {
        keywordFreq[keyword] = (keywordFreq[keyword] || 0) + 1;
      });
    });

    // TF-IDF分析で重要キーワードを特定
    const importantKeywords = this.calculateTFIDF(documents, clusterCards);
    
    // 共起関係分析
    const cooccurrenceTerms = this.analyzeCooccurrence(clusterCards);
    
    // セマンティック分析結果をログ出力
    console.log(`🔍 Cluster ${clusterIndex + 1} Semantic Analysis:`, {
      importantKeywords: importantKeywords.slice(0, 5),
      cooccurrenceTerms: cooccurrenceTerms.slice(0, 3),
      dominantTag: Object.keys(tagFreq).length > 0 ? Object.keys(tagFreq).reduce((a, b) => tagFreq[a] > tagFreq[b] ? a : b) : 'none',
      dominantType: Object.keys(typeFreq).reduce((a, b) => typeFreq[a] > typeFreq[b] ? a : b)
    });

    // 最も一般的な要素を特定
    const topTag = Object.keys(tagFreq).length > 0 
      ? Object.keys(tagFreq).reduce((a, b) => tagFreq[a] > tagFreq[b] ? a : b) 
      : '';
    const topType = Object.keys(typeFreq).reduce((a, b) => typeFreq[a] > typeFreq[b] ? a : b);
    const topKeyword = Object.keys(keywordFreq).length > 0
      ? Object.keys(keywordFreq).reduce((a, b) => keywordFreq[a] > keywordFreq[b] ? a : b)
      : '';

    // ラベル生成戦略（セマンティック分析結果を活用）
    const labelStrategies = [
      // セマンティック分析ベースラベル（新機能）
      () => {
        if (importantKeywords.length > 0 && cooccurrenceTerms.length > 0) {
          const topKeyword = importantKeywords[0].word;
          const topCooccurrence = cooccurrenceTerms[0].term;
          
          // 重要キーワードと共起語の組み合わせ
          if (topKeyword !== topCooccurrence && topKeyword.length > 2 && topCooccurrence.length > 2) {
            return `${topKeyword} × ${topCooccurrence}`;
          }
          
          // 単独で十分に重要なキーワード
          if (importantKeywords[0].score > 0.01) {
            return this.beautifyLabel(topKeyword);
          }
        }
        return null;
      },
      
      // タグベースラベル
      () => {
        const tagLabels: { [key: string]: string } = {
          'ux': 'UX Research',
          'psychology': 'Psychology',
          'design': 'Design',
          'research': 'Research',
          'behavior': 'Behavior',
          'user': 'User Experience',
          'interface': 'Interface Design',
          'usability': 'Usability',
          'accessibility': 'Accessibility'
        };
        return tagLabels[topTag] || (topTag ? topTag.toUpperCase() : null);
      },
      
      // タイプベースラベル
      () => {
        const typeLabels: { [key: string]: string } = {
          'INSIGHTS': 'Insights',
          'THEMES': 'Themes',
          'QUESTIONS': 'Questions',
          'ACTIONS': 'Actions',
          'INBOX': 'Ideas'
        };
        return typeLabels[topType] || topType;
      },
      
      // キーワードベースラベル
      () => topKeyword && topKeyword.length > 2 ? topKeyword : null,
      
      // 組み合わせラベル
      () => {
        if (topTag && topType && topTag !== '') {
          const tagLabel = topTag.toUpperCase();
          const typeLabel = topType.toLowerCase();
          return `${tagLabel} ${typeLabel}`;
        }
        return null;
      },
      
      // ワークフロー型ラベル
      () => {
        const types = Object.keys(typeFreq);
        if (types.includes('QUESTIONS') && types.includes('INSIGHTS')) {
          return 'Q&A Process';
        }
        if (types.includes('INSIGHTS') && types.includes('ACTIONS')) {
          return 'Implementation';
        }
        if (types.includes('THEMES') && types.includes('INSIGHTS')) {
          return 'Theme Analysis';
        }
        return null;
      },
      
      // フォールバック
      () => `Cluster ${clusterIndex + 1}`
    ];

    // 戦略を順次試行
    for (const strategy of labelStrategies) {
      const label = strategy();
      if (label && label.length > 0) {
        return label;
      }
    }

    return `Group ${clusterIndex + 1}`;
  }

  /**
   * キーワード抽出（改良版・日本語対応強化）
   */
  private static extractKeywords(text: string): string[] {
    const stopWords = [
      // 日本語ストップワード
      'の', 'を', 'に', 'は', 'が', 'と', 'で', 'から', 'まで', 'について', 'による', 
      'する', 'した', 'して', 'です', 'である', 'こと', 'もの', 'これ', 'それ', 'あれ',
      'その', 'この', 'あの', 'どの', 'など', 'また', 'さらに', 'しかし', 'でも', 'けれども',
      // 英語ストップワード
      'the', 'is', 'at', 'which', 'on', 'and', 'or', 'but', 'in', 'with', 'to', 'for',
      'of', 'as', 'by', 'that', 'this', 'it', 'from', 'be', 'are', 'was', 'were',
    ];

    const words = text.toLowerCase()
      .replace(/[^\w\s\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g, ' ') // 日本語文字を保持
      .split(/\s+/)
      .filter(word => {
        if (word.length < 2) return false;
        
        // ストップワードチェック
        return !stopWords.includes(word);
      });
    
    return words;
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


} 