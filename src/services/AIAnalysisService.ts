import { Message } from '../types/chat';
import { supabase } from './supabase/client';
import type { BoardItem } from '../features/board-space/contexts/BoardContext';

export interface AIInsight {
  id: string;
  title: string;
  description: string;
  source: 'chat' | 'meeting' | 'ai';
  confidence: number; // 0-1
  timestamp: string;
  tags: string[];
  isStarred?: boolean;
  relatedItems?: {
    messageIds?: string[];
    channelId?: string;
    meetingId?: string;
  };
}

export interface AIAnalysisResult {
  insights: AIInsight[];
  processingTime: number;
  messageCount: number;
}

export interface SuggestedRelationship {
  sourceCardId: string;
  targetCardId: string;
  relationshipType: 'semantic' | 'topical' | 'conceptual';
  similarity: number;
  confidence: number;
  explanation: string;
  suggestedStrength: number;
}

export interface CardEmbedding {
  cardId: string;
  embedding: number[];
  textContent: string;
  lastUpdated: string;
}

/**
 * AIAnalysisService - チャットメッセージからの自動洞察抽出
 * 
 * チャット会話を分析し、重要な洞察や知見を自動的に抽出する
 */
export class AIAnalysisService {
  private isProcessing: boolean = false;
  private analysisQueue: Array<{
    messages: Message[];
    channelId: string;
    callback: (result: AIAnalysisResult) => void;
  }> = [];

  // OpenAI API設定
  private static readonly OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
  private static readonly OPENAI_API_URL = 'https://api.openai.com/v1/embeddings';

  /**
   * 会話からの洞察抽出をリクエスト
   */
  public requestAnalysis(
    messages: Message[], 
    channelId: string, 
    callback: (result: AIAnalysisResult) => void
  ): void {
    // キューに追加
    this.analysisQueue.push({
      messages,
      channelId,
      callback,
    });

    // 処理中でなければ処理を開始
    if (!this.isProcessing) {
      this.processNextInQueue();
    }
  }

  /**
   * キューの次の分析タスクを処理
   */
  private processNextInQueue(): void {
    if (this.analysisQueue.length === 0) {
      this.isProcessing = false;
      return;
    }

    this.isProcessing = true;
    const task = this.analysisQueue.shift();
    
    if (task) {
      this.analyzeMessages(task.messages, task.channelId)
        .then(result => {
          task.callback(result);
          // 次のタスクを処理
          this.processNextInQueue();
        })
        .catch(error => {
          console.error('Message analysis failed:', error);
          task.callback({
            insights: [],
            processingTime: 0,
            messageCount: task.messages.length,
          });
          this.processNextInQueue();
        });
    }
  }

  /**
   * チャットメッセージの分析
   * 実際の実装では外部AI APIを呼び出す
   */
  private async analyzeMessages(
    messages: Message[], 
    channelId: string
  ): Promise<AIAnalysisResult> {
    // 開始時間を記録
    const startTime = Date.now();

    try {
      // 実際の実装では、OpenAI APIなど外部サービスを呼び出す
      // const result = await this.callExternalAIAPI(messages);
      
      // デモ用にモック実装
      const insights = this.generateMockInsights(messages, channelId);
      
      // 処理時間を計算
      const processingTime = Date.now() - startTime;
      
      return {
        insights,
        processingTime,
        messageCount: messages.length,
      };
    } catch (error) {
      console.error('Error analyzing messages:', error);
      throw error;
    }
  }

  /**
   * モック洞察生成 (デモ用)
   */
  private generateMockInsights(messages: Message[], channelId: string): AIInsight[] {
    // メッセージが少なすぎる場合は洞察を生成しない
    if (messages.length < 3) {
      return [];
    }

    const insights: AIInsight[] = [];
    const now = new Date();
    
    // 会話の参加者を抽出
    const participants = Array.from(
      new Set(messages.map(m => m.userName))
    );
    
    // すべてのメッセージテキストを結合
    const allText = messages.map(m => m.text).join(' ');
    
    // キーワード検出（簡易的な実装）
    const potentialKeywords = [
      'プロジェクト', '締め切り', 'ミーティング', '問題', '課題',
      'UI', 'UX', 'デザイン', '開発', 'バグ', 'テスト', 'リリース',
      'クライアント', '予算', 'スケジュール', 'レビュー'
    ];
    
    const detectedKeywords = potentialKeywords.filter(
      keyword => allText.includes(keyword)
    );
    
    // 洞察1: 締め切りに関する洞察
    if (allText.includes('締め切り') || allText.includes('デッドライン')) {
      insights.push({
        id: `insight-${Date.now()}-1`,
        title: 'プロジェクトの締め切りに関する議論',
        description: `${participants.join('と')}の会話で締め切りについて言及がありました。締め切りが近づいているかチーム内で共有する必要があるかもしれません。`,
        source: 'ai',
        confidence: 0.85,
        timestamp: now.toISOString(),
        tags: ['締め切り', 'スケジュール', 'プロジェクト管理'],
        relatedItems: {
          messageIds: messages.filter(m => 
            m.text.includes('締め切り') || m.text.includes('デッドライン')
          ).map(m => m.id),
          channelId
        }
      });
    }
    
    // 洞察2: 問題や課題に関する洞察
    if (allText.includes('問題') || allText.includes('課題') || allText.includes('バグ')) {
      insights.push({
        id: `insight-${Date.now()}-2`,
        title: '技術的な問題が議論されています',
        description: `会話の中で技術的な問題や課題について議論されています。これを追跡してプロジェクトのリスクとして記録する必要があるかもしれません。`,
        source: 'ai',
        confidence: 0.78,
        timestamp: now.toISOString(),
        tags: ['問題', '技術', 'リスク管理'],
        relatedItems: {
          messageIds: messages.filter(m => 
            m.text.includes('問題') || m.text.includes('課題') || m.text.includes('バグ')
          ).map(m => m.id),
          channelId
        }
      });
    }
    
    // 洞察3: チーム間の協力に関する洞察
    if (participants.length > 2 && (allText.includes('協力') || allText.includes('連携'))) {
      insights.push({
        id: `insight-${Date.now()}-3`,
        title: 'チーム間のコラボレーションの機会',
        description: `複数のチームメンバー間で協力や連携に関する議論が行われています。これはチーム連携の好機かもしれません。`,
        source: 'ai',
        confidence: 0.72,
        timestamp: now.toISOString(),
        tags: ['チーム連携', 'コラボレーション'],
        relatedItems: {
          messageIds: messages.slice(-5).map(m => m.id),
          channelId
        }
      });
    }
    
    // 洞察4: キーワードベースの一般的な洞察
    if (detectedKeywords.length >= 3) {
      insights.push({
        id: `insight-${Date.now()}-4`,
        title: `${detectedKeywords.slice(0, 3).join('、')}に関する重要な議論`,
        description: `会話の分析から、${detectedKeywords.join('、')}などの重要なトピックが検出されました。これらはプロジェクトの重要なポイントを示している可能性があります。`,
        source: 'ai',
        confidence: 0.65,
        timestamp: now.toISOString(),
        tags: detectedKeywords.slice(0, 5),
        relatedItems: {
          messageIds: messages.slice(-8).map(m => m.id),
          channelId
        }
      });
    }
    
    return insights;
  }

  /**
   * 洞察のキーワードを抽出するヘルパーメソッド
   */
  private extractKeywords(text: string): string[] {
    // 実際の実装では、より高度なキーワード抽出アルゴリズムを使用する
    const commonWords = [
      'the', 'a', 'an', 'and', 'or', 'but', 'of', 'for', 'in', 'on', 'at',
      'to', 'with', 'by', 'about', 'like', 'through', 'over', 'before', 'after',
      'は', 'が', 'の', 'に', 'を', 'で', 'へ', 'と', 'から', 'より', 'など',
      'これ', 'それ', 'あれ', 'この', 'その', 'あの', 'ここ', 'そこ', 'あそこ'
    ];
    
    return text
      .split(/\s+|[,.;:!?]/)
      .filter(word => 
        word.length > 1 && 
        !commonWords.includes(word.toLowerCase())
      )
      .slice(0, 10); // 最大10個のキーワードを返す
  }

  /**
   * カードのテキストコンテンツから埋め込みベクターを生成
   */
  static async generateEmbedding(text: string): Promise<number[] | null> {
    try {
      console.log('[AIAnalysisService] Generating embedding for text length:', text.length);
      
      // AIProviderManagerを使用してプロバイダーを取得
      const { AIProviderManager } = await import('./ai/AIProviderManager');
      const manager = AIProviderManager.getInstance();
      const provider = await manager.getAvailableProvider();
      
      if (!provider) {
        console.error('[AIAnalysisService] No AI provider available for embedding generation');
        return null;
      }
      
      console.log('[AIAnalysisService] Using provider:', provider.name);
      return await provider.generateEmbedding(text);
    } catch (error) {
      console.error('[AIAnalysisService] Failed to generate embedding:', error);
      return null;
    }
  }

  /**
   * カードの統合テキストを生成（タイトル + コンテンツ + タグ）
   */
  static generateCardText(card: BoardItem): string {
    const title = card.title || '';
    const content = card.content || '';
    const tags = card.tags ? card.tags.join(' ') : '';
    const type = card.column_type || '';
    
    return `${title} ${content} ${tags} ${type}`.trim();
  }

  /**
   * カードの埋め込みベクターを生成・保存
   */
  static async generateCardEmbedding(card: BoardItem): Promise<CardEmbedding | null> {
    const textContent = this.generateCardText(card);
    
    // 既存の埋め込みをチェック（更新時刻ベース）
    try {
      const { data: existingEmbedding } = await supabase
        .from('card_embeddings')
        .select('*')
        .eq('card_id', card.id)
        .single();
      
      if (existingEmbedding) {
        const cardUpdatedAt = new Date(card.updated_at || card.created_at);
        const embeddingUpdatedAt = new Date(existingEmbedding.last_updated);
        
        // カードの更新時刻が埋め込みの更新時刻より新しい場合のみ再生成
        if (cardUpdatedAt <= embeddingUpdatedAt && existingEmbedding.text_content === textContent) {
          console.log(`[AIAnalysisService] Using cached embedding for card ${card.id}`);
          return {
            cardId: card.id,
            embedding: JSON.parse(existingEmbedding.embedding),
            textContent: existingEmbedding.text_content,
            lastUpdated: existingEmbedding.last_updated,
          };
        } else {
          console.log(`[AIAnalysisService] Card ${card.id} content changed, regenerating embedding`);
          console.log(`  Card updated: ${cardUpdatedAt.toISOString()}`);
          console.log(`  Embedding updated: ${embeddingUpdatedAt.toISOString()}`);
          console.log(`  Text content changed: ${existingEmbedding.text_content !== textContent}`);
        }
      }
    } catch (error) {
      console.log(`[AIAnalysisService] No cached embedding found for card ${card.id}, generating new one`);
    }

    const embedding = await this.generateEmbedding(textContent);
    
    if (!embedding) {
      return null;
    }

    const cardEmbedding: CardEmbedding = {
      cardId: card.id,
      embedding,
      textContent,
      lastUpdated: new Date().toISOString(),
    };

    // Supabaseに埋め込みベクターを保存
    try {
      await supabase
        .from('card_embeddings')
        .upsert({
          card_id: card.id,
          embedding: JSON.stringify(embedding),
          text_content: textContent,
          last_updated: cardEmbedding.lastUpdated,
        });
      console.log(`[AIAnalysisService] Saved new embedding for card ${card.id}`);
    } catch (error) {
      console.warn('Failed to save embedding to database:', error);
    }

    return cardEmbedding;
  }

  /**
   * 2つのベクター間のコサイン類似度を計算
   */
  static calculateCosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      throw new Error('Vector dimensions must match');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }

  /**
   * カード間の関係性を自動提案
   */
  static async suggestRelationships(
    cards: BoardItem[],
    minSimilarity: number = 0.7,
    maxSuggestions: number = 10
  ): Promise<SuggestedRelationship[]> {
    console.log(`[AIAnalysisService] Analyzing ${cards.length} cards for relationships...`);
    console.log(`[AIAnalysisService] Cards:`, cards.map(c => ({ id: c.id, title: c.title, updated_at: c.updated_at })));
    
    // 1. 全カードの埋め込みベクターを生成
    const embeddings: CardEmbedding[] = [];
    for (const card of cards) {
      const embedding = await this.generateCardEmbedding(card);
      if (embedding) {
        embeddings.push(embedding);
      }
    }

    console.log(`[AIAnalysisService] Generated embeddings for ${embeddings.length} cards`);

    // 2. カード間の類似性を計算
    const suggestions: SuggestedRelationship[] = [];
    const similarityMatrix: Array<{ cardA: string, cardB: string, similarity: number }> = [];
    
    for (let i = 0; i < embeddings.length; i++) {
      for (let j = i + 1; j < embeddings.length; j++) {
        const embeddingA = embeddings[i];
        const embeddingB = embeddings[j];
        
        const similarity = this.calculateCosineSimilarity(
          embeddingA.embedding,
          embeddingB.embedding
        );

        // デバッグ用に類似度マトリックスを保存
        similarityMatrix.push({
          cardA: embeddingA.cardId,
          cardB: embeddingB.cardId,
          similarity
        });

        if (similarity >= minSimilarity) {
          const cardA = cards.find(c => c.id === embeddingA.cardId);
          const cardB = cards.find(c => c.id === embeddingB.cardId);
          
          if (cardA && cardB) {
            const suggestion: SuggestedRelationship = {
              sourceCardId: embeddingA.cardId,
              targetCardId: embeddingB.cardId,
              relationshipType: this.determineRelationshipType(cardA, cardB, similarity),
              similarity,
              confidence: this.calculateConfidence(similarity, cardA, cardB),
              explanation: this.generateExplanation(cardA, cardB, similarity),
              suggestedStrength: Math.min(0.9, similarity * 1.2), // 類似度を強度に変換
            };
            
            suggestions.push(suggestion);
          }
        }
      }
    }

    // デバッグ情報を詳細出力
    console.log(`[AIAnalysisService] Similarity matrix (top 10):`, 
      similarityMatrix
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 10)
        .map(item => ({
          ...item,
          cardATitle: cards.find(c => c.id === item.cardA)?.title,
          cardBTitle: cards.find(c => c.id === item.cardB)?.title
        }))
    );

    console.log(`[AIAnalysisService] Found ${suggestions.length} potential relationships above threshold ${minSimilarity}`);

    // 3. 信頼度でソート & 上位のみ返す
    const sortedSuggestions = suggestions
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, maxSuggestions);

    console.log(`[AIAnalysisService] Returning top ${sortedSuggestions.length} suggestions:`, 
      sortedSuggestions.map(s => ({
        source: cards.find(c => c.id === s.sourceCardId)?.title,
        target: cards.find(c => c.id === s.targetCardId)?.title,
        type: s.relationshipType,
        similarity: s.similarity.toFixed(3),
        confidence: s.confidence.toFixed(3)
      }))
    );

    return sortedSuggestions;
  }

  /**
   * 関係性タイプを推定
   */
  private static determineRelationshipType(
    cardA: BoardItem,
    cardB: BoardItem,
    similarity: number
  ): 'semantic' | 'topical' | 'conceptual' {
    // タグの重複があれば topical
    const tagsA = new Set(cardA.tags || []);
    const tagsB = new Set(cardB.tags || []);
    const tagOverlap = [...tagsA].filter(tag => tagsB.has(tag)).length;
    
    if (tagOverlap > 0) {
      return 'topical';
    }
    
    // 同じカラムタイプで高類似度なら conceptual
    if (cardA.column_type === cardB.column_type && similarity > 0.8) {
      return 'conceptual';
    }
    
    // デフォルトは semantic
    return 'semantic';
  }

  /**
   * 信頼度を計算
   */
  private static calculateConfidence(
    similarity: number,
    cardA: BoardItem,
    cardB: BoardItem
  ): number {
    let confidence = similarity;
    
    // コンテンツ長による調整（長いコンテンツほど信頼性が高い）
    const avgContentLength = ((cardA.content?.length || 0) + (cardB.content?.length || 0)) / 2;
    const lengthBonus = Math.min(0.1, avgContentLength / 1000);
    confidence += lengthBonus;
    
    // タグ重複による調整
    const tagsA = new Set(cardA.tags || []);
    const tagsB = new Set(cardB.tags || []);
    const tagOverlap = [...tagsA].filter(tag => tagsB.has(tag)).length;
    if (tagOverlap > 0) {
      confidence += 0.1 * tagOverlap;
    }
    
    return Math.min(1.0, confidence);
  }

  /**
   * 関係性の説明を生成
   */
  private static generateExplanation(
    cardA: BoardItem,
    cardB: BoardItem,
    similarity: number
  ): string {
    const similarityPercent = Math.round(similarity * 100);
    
    // タグ重複チェック
    const tagsA = new Set(cardA.tags || []);
    const tagsB = new Set(cardB.tags || []);
    const commonTags = [...tagsA].filter(tag => tagsB.has(tag));
    
    if (commonTags.length > 0) {
      return `共通タグ「${commonTags.join(', ')}」により関連性が検出されました（類似度: ${similarityPercent}%）`;
    }
    
    if (cardA.column_type === cardB.column_type) {
      return `同じカテゴリ「${cardA.column_type}」で高い意味的類似性があります（類似度: ${similarityPercent}%）`;
    }
    
    return `テキスト内容に高い意味的類似性が検出されました（類似度: ${similarityPercent}%）`;
  }

  /**
   * 既存の関係性データと重複チェック
   */
  static async filterExistingRelationships(
    suggestions: SuggestedRelationship[],
    boardId: string
  ): Promise<SuggestedRelationship[]> {
    try {
      console.log(`[AIAnalysisService] Filtering ${suggestions.length} suggestions against existing relationships for board ${boardId}`);
      
      // より包括的な既存関係性取得：boardIdに基づいてカードを特定してから関係性を取得
      const { data: boardCards } = await supabase
        .from('board_cards')
        .select('id')
        .eq('board_id', boardId)
        .eq('is_archived', false);

      if (!boardCards || boardCards.length === 0) {
        console.log(`[AIAnalysisService] No cards found for board ${boardId}`);
        return suggestions;
      }

      const cardIds = boardCards.map(card => card.id);
      console.log(`[AIAnalysisService] Found ${cardIds.length} cards in board ${boardId}`);

      // そのボードのカード間の既存関係性を全て取得
      const { data: existingRels } = await supabase
        .from('board_card_relations')
        .select('card_id, related_card_id, relationship_type')
        .in('card_id', cardIds);

      console.log(`[AIAnalysisService] Found ${existingRels?.length || 0} existing relationships`);

      const existingPairs = new Set(
        (existingRels || []).flatMap(rel => [
          `${rel.card_id}-${rel.related_card_id}`,
          `${rel.related_card_id}-${rel.card_id}` // 双方向チェック
        ])
      );

      console.log(`[AIAnalysisService] Existing relationship pairs:`, Array.from(existingPairs));

      // 既存でない提案のみを返す
      const filteredSuggestions = suggestions.filter(suggestion => {
        const pairKey = `${suggestion.sourceCardId}-${suggestion.targetCardId}`;
        const reversePairKey = `${suggestion.targetCardId}-${suggestion.sourceCardId}`;
        const exists = existingPairs.has(pairKey) || existingPairs.has(reversePairKey);
        
        if (exists) {
          console.log(`[AIAnalysisService] Filtering out existing relationship: ${pairKey}`);
        }
        
        return !exists;
      });

      console.log(`[AIAnalysisService] Filtered to ${filteredSuggestions.length} new relationship suggestions`);
      
      return filteredSuggestions;
    } catch (error) {
      console.error('Error filtering existing relationships:', error);
      return suggestions; // エラー時は全て返す
    }
  }
}

// シングルトンインスタンスをエクスポート
export const aiAnalysisService = new AIAnalysisService(); 