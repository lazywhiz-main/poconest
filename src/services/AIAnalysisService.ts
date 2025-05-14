import { Message } from '../types/chat';

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

/**
 * AIAnalysisService - チャットメッセージからの自動洞察抽出
 * 
 * チャット会話を分析し、重要な洞察や知見を自動的に抽出する
 */
class AIAnalysisService {
  private isProcessing: boolean = false;
  private analysisQueue: Array<{
    messages: Message[];
    channelId: string;
    callback: (result: AIAnalysisResult) => void;
  }> = [];

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
}

// シングルトンインスタンスをエクスポート
export const aiAnalysisService = new AIAnalysisService(); 