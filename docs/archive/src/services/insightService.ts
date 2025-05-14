import { Insight, InsightInput, InsightQuery, InsightType, InsightPriority, InsightGenerationSettings } from '../types/insight';
import { AIService } from './AIService';
import { generateId } from '../utils/idGenerator';

/**
 * インサイト管理サービス
 * 
 * インサイトの保存、取得、検索などの機能を提供
 */
export class InsightService {
  private insights: Insight[] = [];
  private settings: InsightGenerationSettings;
  private analysisTimeout: NodeJS.Timeout | null = null;
  private aiService: AIService;
  
  constructor(apiKey: string) {
    this.insights = [];
    this.settings = {
      autoGenerate: false,
      minMessageCount: 5,
      contextWindowSize: 10,
      notificationPreference: 'silent',
      priorityThreshold: InsightPriority.MEDIUM
    };
    this.aiService = new AIService(apiKey);
  }
  
  /**
   * 全てのインサイトを取得
   */
  public async getAllInsights(): Promise<Insight[]> {
    // 将来的にはAPIから取得
    return this.insights;
  }
  
  /**
   * チャットに関連するインサイトを取得
   */
  public async getInsightsByChatId(chatId: string): Promise<Insight[]> {
    return this.insights.filter(insight => insight.sourceChatId === chatId);
  }
  
  /**
   * 条件に一致するインサイトを検索
   */
  public async searchInsights(query: InsightQuery): Promise<Insight[]> {
    let results = this.insights;
    
    // チャットIDでフィルタリング
    if (query.chatIds && query.chatIds.length > 0) {
      results = results.filter(insight => query.chatIds!.includes(insight.sourceChatId));
    }
    
    // タイプでフィルタリング
    if (query.types && query.types.length > 0) {
      results = results.filter(insight => query.types!.includes(insight.type));
    }
    
    // レビュー状態でフィルタリング
    if (query.isReviewed !== undefined) {
      results = results.filter(insight => insight.isReviewed === query.isReviewed);
    }
    
    // 保存状態でフィルタリング
    if (query.isSaved !== undefined) {
      results = results.filter(insight => insight.isSaved === query.isSaved);
    }
    
    // 優先度でフィルタリング
    if (query.priority && query.priority.length > 0) {
      results = results.filter(insight => query.priority!.includes(insight.priority));
    }
    
    // カテゴリでフィルタリング
    if (query.category) {
      results = results.filter(insight => insight.category === query.category);
    }
    
    // テキスト検索
    if (query.searchText) {
      const searchLower = query.searchText.toLowerCase();
      results = results.filter(insight => 
        insight.content.toLowerCase().includes(searchLower)
      );
    }
    
    // 日付範囲でフィルタリング
    if (query.startDate) {
      const startDate = new Date(query.startDate).getTime();
      results = results.filter(insight => new Date(insight.createdAt).getTime() >= startDate);
    }
    
    if (query.endDate) {
      const endDate = new Date(query.endDate).getTime();
      results = results.filter(insight => new Date(insight.createdAt).getTime() <= endDate);
    }
    
    // ソート（デフォルトは新しい順）
    results = results.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    // ページネーション
    if (query.offset !== undefined && query.limit !== undefined) {
      results = results.slice(query.offset, query.offset + query.limit);
    } else if (query.limit !== undefined) {
      results = results.slice(0, query.limit);
    }
    
    return results;
  }
  
  /**
   * 新しいインサイトを作成
   */
  public async createInsight(input: InsightInput): Promise<Insight> {
    const now = new Date().toISOString();
    
    const newInsight: Insight = {
      id: generateId(),
      type: input.type,
      content: input.content,
      sourceChatId: input.sourceChatId,
      sourceMessageIds: input.sourceMessageIds,
      priority: input.priority || InsightPriority.MEDIUM,
      createdAt: now,
      updatedAt: now,
      isReviewed: false,
      isSaved: false,
      category: input.category,
      metadata: input.metadata,
    };
    
    // 実際のアプリではデータベースに保存
    this.insights.push(newInsight);
    
    return newInsight;
  }
  
  /**
   * インサイトを更新
   */
  public async updateInsight(id: string, updates: Partial<Insight>): Promise<Insight | null> {
    const index = this.insights.findIndex(insight => insight.id === id);
    if (index === -1) return null;
    
    // 更新不可のフィールドを削除
    delete updates.id;
    delete updates.createdAt;
    
    const updatedInsight = {
      ...this.insights[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    
    this.insights[index] = updatedInsight;
    
    return updatedInsight;
  }
  
  /**
   * インサイトを削除
   */
  public async deleteInsight(id: string): Promise<boolean> {
    const initialLength = this.insights.length;
    this.insights = this.insights.filter(insight => insight.id !== id);
    
    return this.insights.length < initialLength;
  }
  
  /**
   * インサイトをボードに保存
   */
  public async saveInsightToBoard(insight: Insight): Promise<void> {
    await this.updateInsight(insight.id, { isSaved: true });
  }
  
  /**
   * インサイトをレビュー済みにマーク
   */
  public async markAsReviewed(id: string): Promise<Insight | null> {
    return this.updateInsight(id, { isReviewed: true });
  }

  /**
   * チャット全体からインサイトを生成
   * @param chatId チャットID
   * @param messages チャットのメッセージ配列
   */
  public async generateInsightsFromChat(chatId: string, messages: any[]): Promise<Insight[]> {
    try {
      console.log('チャット全体の分析を開始します...');
      console.log(`チャットID: ${chatId}`);
      console.log(`メッセージ数: ${messages.length}`);

      // メッセージが少なすぎる場合はエラー
      if (messages.length < this.settings.minMessageCount) {
        throw new Error(`メッセージ数が不足しています（最小${this.settings.minMessageCount}件必要）`);
      }

      // AIによる分析を実行
      const analysis = await this.aiService.analyzeMessages(messages);
      console.log('分析結果:', JSON.stringify(analysis, null, 2));

      // インサイトを生成
      const newInsights = analysis.insights.map(insight => ({
        type: insight.type as InsightType,
        content: insight.content,
        sourceChatId: chatId,
        sourceMessageIds: messages.map(msg => msg.id),
        priority: insight.priority as InsightPriority,
        context: analysis.context
      }));

      // 生成されたインサイトを保存
      const createdInsights = await Promise.all(
        newInsights.map(input => this.createInsight(input))
      );

      console.log(`${createdInsights.length}件のインサイトを生成しました`);
      return createdInsights;
    } catch (error) {
      console.error('Error generating insights from chat:', error);
      throw error;
    }
  }

  // 会話の文脈を監視し、インサイト生成のタイミングを判断
  public monitorConversation(messages: any[]) {
    if (!this.settings.autoGenerate) return;
    
    // 既存のタイムアウトをクリア
    if (this.analysisTimeout) {
      clearTimeout(this.analysisTimeout);
    }

    // 会話の状態を分析
    const conversationState = this.analyzeConversationState(messages);
    
    // 分析のタイミングを決定
    const analysisDelay = this.determineAnalysisDelay(conversationState);

    console.log('会話状態:', conversationState);
    console.log('分析遅延:', analysisDelay);

    // 新しい分析をスケジュール
    this.analysisTimeout = setTimeout(async () => {
      console.log('インサイト生成を開始します...');
      console.log('メッセージ数:', messages.length);
      console.log('最小メッセージ数:', this.settings.minMessageCount);
      
      if (messages.length >= this.settings.minMessageCount) {
        const newInsights = await this.generateInsights(messages);
        console.log('生成されたインサイト数:', newInsights.length);
        
        // 生成されたインサイトを保存
        for (const insight of newInsights) {
          await this.createInsight(insight);
        }
      } else {
        console.log('メッセージ数が不足しているため、インサイトを生成しません');
      }
    }, analysisDelay);
  }

  // 会話の状態を分析
  private analyzeConversationState(messages: any[]): {
    isActive: boolean;
    messageFrequency: number;
    lastMessageTime: number;
    topicChange: boolean;
  } {
    const now = Date.now();
    const lastMessage = messages[messages.length - 1];
    const lastMessageTime = new Date(lastMessage?.timestamp).getTime();
    const timeSinceLastMessage = now - lastMessageTime;

    // 直近のメッセージ頻度を計算（1分あたり）
    const recentMessages = messages.slice(-10);
    const messageFrequency = recentMessages.length / (timeSinceLastMessage / 60000);

    // トピックの変化を検出
    const topicChange = this.detectTopicChange(recentMessages);

    return {
      isActive: timeSinceLastMessage < 60000, // 1分以内にメッセージがあればアクティブ
      messageFrequency,
      lastMessageTime,
      topicChange
    };
  }

  // 分析の遅延時間を決定
  private determineAnalysisDelay(state: {
    isActive: boolean;
    messageFrequency: number;
    lastMessageTime: number;
    topicChange: boolean;
  }): number {
    if (state.isActive) {
      // 会話が活発な場合
      if (state.messageFrequency > 2) { // 1分に2メッセージ以上
        return 5000; // 5秒待機
      }
      return 3000; // 3秒待機
    } else {
      // 会話が落ち着いている場合
      if (state.topicChange) {
        return 2000; // トピックが変わった直後は2秒待機
      }
      return 10000; // それ以外は10秒待機
    }
  }

  // トピックの変化を検出
  private detectTopicChange(messages: any[]): boolean {
    if (messages.length < 2) return false;

    // 最後の2メッセージの内容を比較
    const lastMessage = messages[messages.length - 1].content;
    const previousMessage = messages[messages.length - 2].content;

    // 単語の重複率を計算
    const lastWords = new Set(lastMessage.split(/\s+/));
    const previousWords = new Set(previousMessage.split(/\s+/));
    
    const intersection = new Set([...lastWords].filter(x => previousWords.has(x)));
    const union = new Set([...lastWords, ...previousWords]);
    
    const similarity = intersection.size / union.size;
    
    // 類似度が0.3未満の場合、トピックが変わったと判断
    return similarity < 0.3;
  }

  // インサイトの生成
  private async generateInsights(messages: any[]): Promise<InsightInput[]> {
    try {
      // 最新のメッセージから文脈サイズ分を取得
      const contextMessages = messages.slice(-this.settings.contextWindowSize);
      
      console.log('AIによる会話分析を開始します...');
      
      // AIによる分析を実行
      const analysis = await this.aiService.analyzeMessages(contextMessages);
      
      console.log('分析結果:', JSON.stringify(analysis, null, 2));
      
      return analysis.insights.map(insight => ({
        type: insight.type as InsightType,
        content: insight.content,
        sourceChatId: messages[0].chatId,
        sourceMessageIds: contextMessages.map(msg => msg.id),
        priority: insight.priority as InsightPriority,
        context: analysis.context
      }));
    } catch (error) {
      console.error('Error generating insights:', error);
      return [];
    }
  }

  // 設定の更新
  public updateSettings(newSettings: Partial<InsightGenerationSettings>) {
    this.settings = { ...this.settings, ...newSettings };
  }

  // インサイトの優先度を評価
  private async evaluatePriority(content: string): Promise<InsightPriority> {
    // 文脈情報を生成
    const context = `このインサイトは以下の文脈で生成されました：
    - チャットID: ${this.insights[0]?.sourceChatId || 'unknown'}
    - 生成時刻: ${new Date().toLocaleString()}
    - 関連するインサイト数: ${this.insights.length}件`;

    return await this.aiService.evaluateInsightPriority(content, context);
  }

  /**
   * 全てのインサイトをクリア
   */
  public async clearAllInsights(): Promise<void> {
    this.insights = [];
  }
}

// モックデータ
const mockInsights: Insight[] = [
  {
    id: '1',
    type: InsightType.SUMMARY,
    content: 'プロジェクトの概要についての議論',
    sourceChatId: 'chat1',
    sourceMessageIds: ['msg1', 'msg2'],
    priority: InsightPriority.HIGH,
    createdAt: new Date().toISOString(),
    isReviewed: false,
    isSaved: false
  },
  {
    id: '2',
    type: InsightType.ACTION_ITEM,
    content: 'デザインレビューのスケジュール調整',
    sourceChatId: 'chat1',
    sourceMessageIds: ['msg3'],
    priority: InsightPriority.MEDIUM,
    createdAt: new Date().toISOString(),
    isReviewed: true,
    isSaved: false
  },
  {
    id: '3',
    type: InsightType.QUESTION,
    content: '技術的な課題に関する質問',
    sourceChatId: 'chat2',
    sourceMessageIds: ['msg4', 'msg5'],
    priority: InsightPriority.LOW,
    createdAt: new Date().toISOString(),
    isReviewed: false,
    isSaved: true
  }
]; 