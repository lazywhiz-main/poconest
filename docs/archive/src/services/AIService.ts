import OpenAI from 'openai';
import { Insight, InsightType, InsightPriority } from '../types/insight';

interface MessageAnalysisResult {
  insights: {
    type: InsightType;
    content: string;
    priority: InsightPriority;
  }[];
  context: string;
}

interface UserInterest {
  topics: string[];
  keywords: string[];
  priority: InsightPriority;
}

export class AIService {
  private openai: OpenAI | null;
  private useMock: boolean = false;
  private userInterests: UserInterest[] = [];
  
  constructor(apiKey: string) {
    if (!apiKey) {
      console.warn('OpenAI APIキーが指定されていません。モックモードで動作します。');
      this.openai = null;
      this.useMock = true;
    } else {
      this.openai = new OpenAI({
        apiKey: apiKey,
        dangerouslyAllowBrowser: true
      });
      this.useMock = false;
    }
  }

  /**
   * ユーザーの関心領域を更新
   */
  public async updateUserInterests(interests: UserInterest[]): Promise<void> {
    this.userInterests = interests;
  }

  /**
   * 会話メッセージを分析してインサイトを生成
   */
  public async analyzeMessages(messages: any[]): Promise<MessageAnalysisResult> {
    try {
      if (this.useMock) {
        return this.mockAnalyzeMessages(messages);
      }
      
      // 会話の文脈を分析
      const context = await this.analyzeConversationContext(messages);
      
      const prompt = this.createAnalysisPrompt(messages, context);
      
      const response = await this.openai!.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          {
            role: "system",
            content: `あなたは会話からインサイトを抽出する専門家です。
            以下の形式でJSONレスポンスを生成してください：

            {
              "insights": [
                {
                  "type": "summary" | "key_point" | "action_item" | "question",
                  "content": "インサイトの内容",
                  "priority": "high" | "medium" | "low"
                }
              ],
              "context": "会話の文脈の説明"
            }

            インサイトの種類の基準：
            - summary: 会話全体の要約（最大1つ）
            - key_point: 重要な決定事項や合意事項
            - action_item: 具体的なタスクや期限のある項目
            - question: 未解決の質問や検討が必要な事項

            優先度の基準：
            - high: 即座な対応が必要、または重要な決定事項
            - medium: 通常の優先度の項目
            - low: 参考情報や長期的な検討事項

            注意点：
            1. インサイトは簡潔に、1文で表現すること
            2. 優先度は文脈に応じて適切に判断すること
            3. 重要でないやり取りからは無理にインサイトを抽出しないこと
            4. 日本語で応答すること
            5. 会話の文脈を考慮して、より適切なインサイトを抽出すること
            6. 会話の流れや意図を深く理解し、表面的なキーワードマッチングではなく、意味的な関連性を考慮すること`
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      });

      return this.parseAnalysisResponse(response.choices[0].message?.content || "");
    } catch (error) {
      console.error('Error analyzing messages:', error);
      return this.mockAnalyzeMessages(messages);
    }
  }

  /**
   * 会話の文脈を分析
   */
  private async analyzeConversationContext(messages: any[]): Promise<string> {
    try {
      const response = await this.openai!.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          {
            role: "system",
            content: `会話の文脈を分析し、以下の点に注目してください：
            1. 会話の主要なトピックとその背景
            2. 参加者の役割や関係性
            3. 会話の目的や目標
            4. 重要な決定事項や合意事項
            5. 未解決の課題や質問
            6. 会話の感情的な側面
            7. 暗黙的な意図や期待
            
            簡潔に要約してください。`
          },
          {
            role: "user",
            content: this.createAnalysisPrompt(messages)
          }
        ],
        temperature: 0.5,
        max_tokens: 500,
      });

      return response.choices[0].message?.content || "";
    } catch (error) {
      console.error('Error analyzing conversation context:', error);
      return "";
    }
  }

  // モック分析結果を返す
  private mockAnalyzeMessages(messages: any[]): MessageAnalysisResult {
    console.log('モック分析を使用します');
    
    // メッセージの内容に基づいて簡易的なインサイトを生成
    const latestMessage = messages[messages.length - 1]?.content || '';
    const messageLength = latestMessage.length;
    
    return {
      insights: [
        {
          type: InsightType.SUMMARY,
          content: `メッセージから抽出した要約（モック）: ${latestMessage.substring(0, 20)}...`,
          priority: InsightPriority.MEDIUM
        },
        {
          type: InsightType.KEY_POINT,
          content: `重要なポイント（モック）: ${messageLength > 10 ? latestMessage.substring(messageLength / 2, messageLength / 2 + 20) : 'サンプルポイント'}`,
          priority: InsightPriority.HIGH
        },
        {
          type: InsightType.ACTION_ITEM,
          content: '次回のミーティングまでに報告書を準備する（モック）',
          priority: InsightPriority.LOW
        }
      ],
      context: 'これはモックデータによる分析です。APIキーを設定することで実際のAI分析が行われます。'
    };
  }

  /**
   * 分析用のプロンプトを生成
   */
  private createAnalysisPrompt(messages: any[], context?: string): string {
    const formattedMessages = messages
      .map(msg => ({
        timestamp: new Date(msg.timestamp).toLocaleString(),
        sender: msg.sender,
        content: msg.content
      }))
      .map(msg => `[${msg.timestamp}] ${msg.sender}: ${msg.content}`)
      .join('\n');

    let prompt = `以下の会話を分析してください：\n\n${formattedMessages}`;
    
    if (context) {
      prompt += `\n\n会話の文脈：\n${context}`;
    }

    return prompt;
  }

  /**
   * APIレスポンスをパース
   */
  private parseAnalysisResponse(response: string): MessageAnalysisResult {
    try {
      // レスポンスから JSON 部分を抽出
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      // バリデーション
      if (!Array.isArray(parsed.insights)) {
        throw new Error('Invalid insights format');
      }

      return {
        insights: parsed.insights
          .filter((insight: { type: string; content: string; priority: string }) => 
            insight.type && 
            insight.content && 
            insight.priority &&
            ['summary', 'key_point', 'action_item', 'question'].includes(insight.type) &&
            ['high', 'medium', 'low'].includes(insight.priority)
          )
          .map((insight: { type: string; content: string; priority: string }) => ({
            type: insight.type as InsightType,
            content: insight.content,
            priority: insight.priority as InsightPriority,
          })),
        context: typeof parsed.context === 'string' ? parsed.context : '',
      };
    } catch (error) {
      console.error('Error parsing AI response:', error);
      return {
        insights: [],
        context: '',
      };
    }
  }

  /**
   * インサイトの優先度を評価
   */
  public async evaluateInsightPriority(content: string, context: string): Promise<InsightPriority> {
    try {
      if (this.useMock) {
        return InsightPriority.MEDIUM;
      }

      const response = await this.openai!.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          {
            role: "system",
            content: `以下の基準に基づいて、インサイトの優先度を判断してください：

            high:
            - 即座な対応が必要な項目
            - 重要な決定事項
            - プロジェクトの進行に大きく影響する項目
            - 関係者間の合意が必要な項目
            - 期限が迫っている項目

            medium:
            - 通常の優先度の項目
            - フォローアップが必要な項目
            - 一般的な情報共有
            - 中期的な検討事項

            low:
            - 参考情報
            - 長期的な検討事項
            - 補足的な情報
            - 既に解決済みの項目

            文脈を考慮して、"high"、"medium"、"low" のいずれかを返してください。`
          },
          {
            role: "user",
            content: `インサイト：${content}\n\n文脈：${context}`
          }
        ],
        temperature: 0.3,
        max_tokens: 10,
      });

      const priority = response.choices[0].message?.content?.toLowerCase().trim();
      if (priority === 'high' || priority === 'medium' || priority === 'low') {
        return priority as InsightPriority;
      }
      return InsightPriority.MEDIUM;
    } catch (error) {
      console.error('Error evaluating priority:', error);
      return InsightPriority.MEDIUM;
    }
  }

  private determineInsightType(content: string): InsightType {
    // TODO: AIを使用してインサイトの種類を判定
    // 現在はモック実装
    if (content.includes('?')) {
      return InsightType.QUESTION;
    } else if (content.includes('する必要がある') || content.includes('すべき')) {
      return InsightType.ACTION_ITEM;
    } else if (content.length > 100) {
      return InsightType.SUMMARY;
    } else {
      return InsightType.KEY_POINT;
    }
  }

  private determineInsightPriority(content: string): InsightPriority {
    // TODO: AIを使用して優先度を判定
    // 現在はモック実装
    if (content.includes('緊急') || content.includes('重要')) {
      return InsightPriority.HIGH;
    } else if (content.includes('あとで') || content.includes('参考')) {
      return InsightPriority.LOW;
    } else {
      return InsightPriority.MEDIUM;
    }
  }

  /**
   * 複数の洞察からテーマを生成
   */
  public async generateThemeFromInsights(insights: Insight[]): Promise<{
    title: string;
    content: string;
    tags: string[];
    recommendedRelatedCards?: string[];
  }> {
    try {
      if (this.useMock) {
        return this.mockGenerateTheme(insights);
      }
      
      if (insights.length === 0) {
        throw new Error('洞察が指定されていません');
      }

      // 洞察の内容を整形
      const insightsContent = insights.map((insight, index) => 
        `洞察 ${index + 1}: ${insight.content} (タイプ: ${insight.type}, 優先度: ${insight.priority})`
      ).join('\n\n');

      const response = await this.openai!.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          {
            role: "system",
            content: `あなたは複数の関連する洞察（Insights）を分析し、より大きな「テーマ」としてまとめる専門家です。
            以下の洞察群から、共通点や関連性を見出し、包括的なテーマを生成してください。

            以下の形式でJSONレスポンスを生成してください：

            {
              "title": "テーマの簡潔なタイトル（30文字以内）",
              "content": "テーマの詳細な説明（複数の洞察がどのように関連しているかを明確に）",
              "tags": ["関連キーワード1", "関連キーワード2", "関連キーワード3"],
              "keyInsights": ["最も重要な洞察1", "最も重要な洞察2"]
            }

            ポイント：
            1. テーマは単なる洞察の集まりではなく、それらの「共通の目的や意味」を見出すものです
            2. 洞察間の関連性やパターンを強調してください
            3. 各洞察の優先度や種類を考慮して重要度を判断してください
            4. レスポンスは日本語で返してください`
          },
          {
            role: "user",
            content: `以下の洞察からテーマを生成してください：\n\n${insightsContent}`
          }
        ],
        temperature: 0.7,
        max_tokens: 1000,
        response_format: { type: "json_object" }
      });

      // JSONレスポンスを解析
      const result = JSON.parse(response.choices[0].message?.content || '{}');
      
      return {
        title: result.title || `関連洞察のテーマ (${insights.length}件)`,
        content: result.content || insights.map(i => `- ${i.content}`).join('\n\n'),
        tags: result.tags || [],
        recommendedRelatedCards: result.keyInsights || []
      };
    } catch (error) {
      console.error('Error generating theme:', error);
      return this.mockGenerateTheme(insights);
    }
  }
  
  // モックテーマを生成
  private mockGenerateTheme(insights: Insight[]): {
    title: string;
    content: string;
    tags: string[];
    recommendedRelatedCards?: string[];
  } {
    console.log('モックテーマ生成を使用します');
    
    if (insights.length === 0) {
      return {
        title: 'サンプルテーマ',
        content: 'これはモックデータによるサンプルテーマです。',
        tags: ['サンプル', 'モック'],
      };
    }
    
    // 洞察のコンテンツを結合して簡易的なテーマを作成
    const combinedContent = insights.map(i => i.content).join(' ');
    const shortContent = combinedContent.substring(0, 30);
    
    return {
      title: `テーマ: ${shortContent}...`,
      content: insights.map(i => `- ${i.content}`).join('\n\n'),
      tags: ['自動生成', 'モック', `${insights.length}件の洞察`],
      recommendedRelatedCards: insights.slice(0, 2).map(i => i.content.substring(0, 20))
    };
  }
} 