import OpenAI from 'openai';
import { ChatMessage } from '../types/chat';
import {
  generateBasicResponse,
  generatePromptMessage,
  summarizeConversation,
  isConversationStalled,
  extractKeywords
} from '../utils/conversationHelper';
import { Insight, InsightType, InsightPriority } from '../types/insight';

/**
 * Pocoアシスタントのサービスクラス
 * 基本的なルールベースの応答と、後でAI機能を統合できる設計
 */
export class PocoAssistantService {
  private userId: string;
  private useAI: boolean = false;
  private openai: OpenAI | null = null;

  constructor(userId: string) {
    this.userId = userId;
  }

  /**
   * APIキーを設定してAI機能を有効化
   */
  public enableAI(apiKey: string): void {
    this.openai = new OpenAI({
      apiKey: apiKey,
      dangerouslyAllowBrowser: true
    });
    this.useAI = true;
  }

  /**
   * AI機能を無効化
   */
  public disableAI(): void {
    this.openai = null;
    this.useAI = false;
  }

  /**
   * ユーザーメッセージに対する応答を生成
   */
  public async generateResponse(messages: ChatMessage[]): Promise<string> {
    // AI機能が有効でAPIキーがある場合は、OpenAIを使用
    if (this.useAI && this.openai) {
      return this.generateAIResponse(messages);
    }
    
    // 基本的なルールベースの応答
    return generateBasicResponse(messages, this.userId);
  }

  /**
   * 会話が停滞したときの介入メッセージを生成
   */
  public async generatePrompt(messages: ChatMessage[]): Promise<string> {
    // AI機能が有効でAPIキーがある場合は、OpenAIを使用
    if (this.useAI && this.openai) {
      return this.generateAIPrompt(messages);
    }
    
    // 基本的なルールベースの介入
    return generatePromptMessage(messages);
  }

  /**
   * 会話の要約を生成
   */
  public async generateSummary(messages: ChatMessage[]): Promise<string> {
    // AI機能が有効でAPIキーがある場合は、OpenAIを使用
    if (this.useAI && this.openai) {
      return this.generateAISummary(messages);
    }
    
    // 基本的な要約
    return summarizeConversation(messages);
  }

  /**
   * 会話の要約を生成 (会話サマリー用)
   */
  public async generateConversationSummary(messages: ChatMessage[]): Promise<string> {
    // 既存のgenerateSummaryメソッドを利用
    return this.generateSummary(messages);
  }

  /**
   * 会話からキーワードを抽出
   */
  public extractKeywordsFromConversation(messages: ChatMessage[]): string[] {
    // 最新の5つのメッセージを対象にする
    const recentMessages = messages.slice(-5);
    const allContent = recentMessages.map(msg => msg.content).join(' ');
    
    return extractKeywords(allContent);
  }

  /**
   * 会話が停滞しているかチェック
   */
  public isConversationStalled(messages: ChatMessage[]): boolean {
    return isConversationStalled(messages);
  }

  /**
   * 会話から洞察（Insights）を自動抽出
   * @param chatId チャットID
   * @param messages メッセージ配列
   * @returns 洞察の配列
   */
  public async extractInsights(chatId: string, messages: ChatMessage[]): Promise<Insight[]> {
    if (this.useAI && this.openai) {
      return this.extractAIInsights(chatId, messages);
    }
    
    // AI機能が無効の場合はシンプルな洞察抽出
    const insights: Insight[] = [];
    const recentMessages = messages.slice(-10); // 最新10件のメッセージを対象
    
    // メッセージごとに50単語以上のものを重要と判断
    for (const message of recentMessages) {
      const wordCount = message.content.split(/\s+/).length;
      if (wordCount >= 50 && !message.sender.isBot) {
        insights.push({
          id: `insight-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: InsightType.KEY_POINT,
          content: message.content,
          sourceChatId: chatId,
          sourceMessageIds: [message.id],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          priority: InsightPriority.MEDIUM,
          isReviewed: false,
          isSaved: false
        });
      }
    }
    
    return insights;
  }

  /**
   * AIを使った応答生成
   */
  private async generateAIResponse(messages: ChatMessage[]): Promise<string> {
    if (!this.openai) return 'AI機能が無効です';

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          {
            role: "system",
            content: "あなたは親しみやすく、知的で、ユーザーの目標達成を支援するアシスタント「ポコ」です。"
          } as const,
          ...messages.map(msg => ({
            role: msg.sender.isBot ? "assistant" : "user",
            content: msg.content
          } as const))
        ],
        temperature: 0.7,
        max_tokens: 500,
      });

      return response.choices[0].message?.content || '申し訳ありません。応答を生成できませんでした。';
    } catch (error) {
      console.error('Error generating AI response:', error);
      return '申し訳ありません。エラーが発生しました。';
    }
  }

  /**
   * AIを使った介入メッセージ生成
   */
  private async generateAIPrompt(messages: ChatMessage[]): Promise<string> {
    if (!this.openai) return '会話を続けますか？';

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          {
            role: "system",
            content: "会話が停滞しているときに、適切な介入メッセージを生成してください。"
          } as const,
          ...messages.map(msg => ({
            role: msg.sender.isBot ? "assistant" : "user",
            content: msg.content
          } as const))
        ],
        temperature: 0.7,
        max_tokens: 200,
      });

      return response.choices[0].message?.content || '会話を続けますか？';
    } catch (error) {
      console.error('Error generating AI prompt:', error);
      return '会話を続けますか？他に気になることはありますか？';
    }
  }

  /**
   * AIを使った要約生成
   */
  private async generateAISummary(messages: ChatMessage[]): Promise<string> {
    if (!this.openai) return '要約機能は現在利用できません';

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          {
            role: "system",
            content: "以下の会話を簡潔に要約してください。"
          } as const,
          {
            role: "user",
            content: messages.map(msg => `${msg.sender.name}: ${msg.content}`).join('\n')
          } as const
        ],
        temperature: 0.3,
        max_tokens: 300,
      });

      return response.choices[0].message?.content || '要約を生成できませんでした。';
    } catch (error) {
      console.error('Error generating AI summary:', error);
      return '要約機能は現在利用できません。';
    }
  }

  /**
   * AIを使った洞察の抽出
   */
  private async extractAIInsights(chatId: string, messages: ChatMessage[]): Promise<Insight[]> {
    if (!this.openai) return [];

    try {
      // 会話全体を入力として洞察を抽出するプロンプト
      const response = await this.openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          {
            role: "system",
            content: `
            あなたは会話から重要な洞察（Insights）を抽出するアシスタントです。
            会話を分析し、以下のような重要な情報を見つけてください：
            1. 重要な決定事項やアクションアイテム
            2. 新しいアイデアや概念
            3. 課題や解決すべき問題
            4. 繰り返し言及されるテーマや関心事
            
            各洞察には以下の情報を含めてください：
            - 内容（content）: 洞察の具体的な内容
            - タイプ（type）: "ACTION_ITEM", "DECISION", "KEY_POINT", "QUESTION", "SUMMARY" のいずれか
            - 優先度（priority）: "LOW", "MEDIUM", "HIGH" のいずれか
            
            回答は以下のJSON形式で返してください：
            {
              "insights": [
                {
                  "content": "洞察の内容",
                  "type": "タイプ",
                  "priority": "優先度",
                  "sourceMessageIds": ["関連するメッセージID"]
                }
              ]
            }
            
            最大5つの洞察を抽出してください。関連性の低いものは含めないでください。
            `
          } as const,
          {
            role: "user",
            content: messages.map(msg => 
              `${msg.sender.name} [ID: ${msg.id}]: ${msg.content}`
            ).join('\n\n')
          } as const
        ],
        temperature: 0.2,
        max_tokens: 1000,
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(response.choices[0].message?.content || '{"insights": []}');
      
      // 抽出された洞察をInsight型に変換
      return result.insights.map((insight: any) => ({
        id: `insight-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: this.mapInsightType(insight.type),
        content: insight.content,
        sourceChatId: chatId,
        sourceMessageIds: insight.sourceMessageIds || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        priority: this.mapInsightPriority(insight.priority),
        isReviewed: false,
        isSaved: false
      }));
    } catch (error) {
      console.error('Error extracting AI insights:', error);
      return [];
    }
  }

  /**
   * 文字列のInsightTypeをenumに変換
   */
  private mapInsightType(typeStr: string): InsightType {
    switch (typeStr.toUpperCase()) {
      case 'ACTION_ITEM': return InsightType.ACTION_ITEM;
      case 'DECISION': return InsightType.DECISION;
      case 'QUESTION': return InsightType.QUESTION;
      case 'SUMMARY': return InsightType.SUMMARY;
      case 'KEYWORD': return InsightType.KEYWORD;
      default: return InsightType.KEY_POINT;
    }
  }

  /**
   * 文字列のInsightPriorityをenumに変換
   */
  private mapInsightPriority(priorityStr: string): InsightPriority {
    switch (priorityStr.toUpperCase()) {
      case 'HIGH': return InsightPriority.HIGH;
      case 'LOW': return InsightPriority.LOW;
      default: return InsightPriority.MEDIUM;
    }
  }
} 