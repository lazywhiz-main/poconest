import { supabase } from '../supabase/client';

export type AIFeatureType = 
  | 'chat_analysis'
  | 'meeting_summary' 
  | 'card_extraction'
  | 'embedding'
  | 'relationship_analysis';

export type AIProvider = 'openai' | 'gemini';

export interface AIUsageLogEntry {
  userId: string;
  nestId?: string;
  featureType: AIFeatureType;
  provider: AIProvider;
  model: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
  requestMetadata?: any;
  responseMetadata?: any;
  chatRoomId?: string;
  meetingId?: string;
  boardId?: string;
}

export interface AIUsageSummary {
  totalTokens: number;
  totalCostUsd: number;
  featureBreakdown: Partial<Record<AIFeatureType, { tokens: number; cost: number }>>;
  providerBreakdown: Partial<Record<AIProvider, { tokens: number; cost: number }>>;
}

// AI料金表 (2024年3月時点)
const AI_PRICING = {
  openai: {
    'gpt-4o': {
      inputCostPer1K: 0.005,   // $0.005 per 1K input tokens
      outputCostPer1K: 0.015,  // $0.015 per 1K output tokens
    },
    'gpt-4o-mini': {
      inputCostPer1K: 0.00015, // $0.00015 per 1K input tokens
      outputCostPer1K: 0.0006, // $0.0006 per 1K output tokens
    },
    'gpt-3.5-turbo': {
      inputCostPer1K: 0.0005,  // $0.0005 per 1K input tokens
      outputCostPer1K: 0.0015, // $0.0015 per 1K output tokens
    },
    'text-embedding-3-small': {
      inputCostPer1K: 0.00002, // $0.00002 per 1K tokens
      outputCostPer1K: 0,
    },
    'text-embedding-3-large': {
      inputCostPer1K: 0.00013, // $0.00013 per 1K tokens
      outputCostPer1K: 0,
    },
    'whisper-1': {
      costPerMinute: 0.006,    // $0.006 per minute
    }
  },
  gemini: {
    'gemini-1.5-pro-latest': {
      inputCostPer1K: 0.0035,  // $0.0035 per 1K input tokens
      outputCostPer1K: 0.0105, // $0.0105 per 1K output tokens
    },
    'gemini-1.5-flash': {
      inputCostPer1K: 0.000075, // $0.000075 per 1K input tokens
      outputCostPer1K: 0.0003,  // $0.0003 per 1K output tokens
    },
    'text-embedding-004': {
      inputCostPer1K: 0.0001,  // $0.0001 per 1K tokens
      outputCostPer1K: 0,
    }
  }
} as const;

export class AIUsageLogger {
  
  /**
   * コストを計算する
   */
  static calculateCost(
    provider: AIProvider,
    model: string,
    inputTokens: number,
    outputTokens: number
  ): number {
    const providerPricing = AI_PRICING[provider];
    if (!providerPricing) {
      console.warn(`[AIUsageLogger] Unknown provider: ${provider}`);
      return 0;
    }

    const modelPricing = (providerPricing as any)[model];
    if (!modelPricing) {
      console.warn(`[AIUsageLogger] Unknown model for ${provider}: ${model}`);
      return 0;
    }

    const inputCost = (inputTokens / 1000) * modelPricing.inputCostPer1K;
    const outputCost = (outputTokens / 1000) * (modelPricing.outputCostPer1K || 0);
    
    return inputCost + outputCost;
  }

  /**
   * AI使用量をログに記録する
   */
  static async logUsage(entry: AIUsageLogEntry): Promise<void> {
    try {
      console.log('[AIUsageLogger] Logging AI usage:', {
        feature: entry.featureType,
        provider: entry.provider,
        model: entry.model,
        tokens: entry.inputTokens + entry.outputTokens,
        cost: entry.estimatedCostUsd
      });

      const { error } = await supabase
        .from('ai_usage_logs')
        .insert({
          user_id: entry.userId,
          nest_id: entry.nestId,
          feature_type: entry.featureType,
          provider: entry.provider,
          model: entry.model,
          input_tokens: entry.inputTokens,
          output_tokens: entry.outputTokens,
          estimated_cost_usd: entry.estimatedCostUsd,
          request_metadata: entry.requestMetadata,
          response_metadata: entry.responseMetadata,
          chat_room_id: entry.chatRoomId,
          meeting_id: entry.meetingId,
          board_id: entry.boardId
        });

      if (error) {
        console.error('[AIUsageLogger] Failed to log usage:', error);
        throw error;
      }

      console.log('[AIUsageLogger] Successfully logged AI usage');
    } catch (error) {
      console.error('[AIUsageLogger] Error logging AI usage:', error);
      // ログ記録の失敗はアプリケーション全体の動作を止めないように
      // エラーをスローせずにログ出力のみ行う
    }
  }

  /**
   * 使用量サマリーを取得する
   */
  static async getUsageSummary(
    userId: string,
    nestId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<AIUsageSummary> {
    try {
      let query = supabase
        .from('ai_usage_logs')
        .select('*')
        .eq('user_id', userId);

      if (nestId) {
        query = query.eq('nest_id', nestId);
      }

      if (startDate) {
        query = query.gte('created_at', startDate.toISOString());
      }

      if (endDate) {
        query = query.lte('created_at', endDate.toISOString());
      }

      const { data: logs, error } = await query;

      if (error) {
        console.error('[AIUsageLogger] Failed to fetch usage summary:', error);
        throw error;
      }

      // サマリーを計算
      const summary: AIUsageSummary = {
        totalTokens: 0,
        totalCostUsd: 0,
        featureBreakdown: {},
        providerBreakdown: {}
      };

      for (const log of logs || []) {
        const tokens = log.input_tokens + log.output_tokens;
        const cost = log.estimated_cost_usd;

        // 合計
        summary.totalTokens += tokens;
        summary.totalCostUsd += cost;

        // 機能別
        const featureType = log.feature_type as AIFeatureType;
        if (!summary.featureBreakdown[featureType]) {
          summary.featureBreakdown[featureType] = { tokens: 0, cost: 0 };
        }
        summary.featureBreakdown[featureType].tokens += tokens;
        summary.featureBreakdown[featureType].cost += cost;

        // プロバイダー別
        const provider = log.provider as AIProvider;
        if (!summary.providerBreakdown[provider]) {
          summary.providerBreakdown[provider] = { tokens: 0, cost: 0 };
        }
        summary.providerBreakdown[provider].tokens += tokens;
        summary.providerBreakdown[provider].cost += cost;
      }

      return summary;
    } catch (error) {
      console.error('[AIUsageLogger] Error getting usage summary:', error);
      // エラー時はデフォルト値を返す
      return {
        totalTokens: 0,
        totalCostUsd: 0,
        featureBreakdown: {},
        providerBreakdown: {}
      };
    }
  }

  /**
   * 使用量履歴を取得する
   */
  static async getUsageHistory(
    userId: string,
    nestId?: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<any[]> {
    try {
      let query = supabase
        .from('ai_usage_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (nestId) {
        query = query.eq('nest_id', nestId);
      }

      const { data: logs, error } = await query;

      if (error) {
        console.error('[AIUsageLogger] Failed to fetch usage history:', error);
        throw error;
      }

      return logs || [];
    } catch (error) {
      console.error('[AIUsageLogger] Error getting usage history:', error);
      return [];
    }
  }

  /**
   * 今日の使用量を取得する
   */
  static async getTodayUsage(userId: string, nestId?: string): Promise<AIUsageSummary> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.getUsageSummary(userId, nestId, today, tomorrow);
  }

  /**
   * 今月の使用量を取得する
   */
  static async getMonthlyUsage(userId: string, nestId?: string): Promise<AIUsageSummary> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    return this.getUsageSummary(userId, nestId, startOfMonth, endOfMonth);
  }
} 