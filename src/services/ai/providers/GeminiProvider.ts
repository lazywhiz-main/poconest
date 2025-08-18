import { AIProvider, AIProviderConfig, AIAnalysisResponse, EmbeddingResponse } from './AIProvider';
import { AIRequestContext } from '../openai';
import { supabase } from '../../supabase/client';
import { AIUsageLogger } from '../AIUsageLogger';

export class GeminiProvider implements AIProvider {
  name = 'Gemini';
  private config: AIProviderConfig;

  constructor(config: AIProviderConfig) {
    this.config = {
      model: 'gemini-1.5-pro-latest',
      embeddingModel: 'text-embedding-004', // Geminiの埋め込みモデル
      maxTokens: 8192,
      temperature: 0.7,
      ...config,
      name: 'Gemini'
    };
  }

  async isAvailable(): Promise<boolean> {
    try {
      console.log('🔍 [GeminiProvider] ai-health-check Edge Function呼び出し開始:', {
        functionName: 'ai-health-check',
        timestamp: new Date().toISOString(),
        stackTrace: new Error().stack
      });
      
      const response = await supabase.functions.invoke('ai-health-check', {
        body: { provider: 'gemini' }
      });
      return response.data?.available === true;
    } catch (error) {
      console.warn('[GeminiProvider] Availability check failed:', error);
      return false;
    }
  }

  async generateEmbedding(text: string): Promise<number[] | null> {
    try {
      console.log('🔍 [GeminiProvider] ai-embeddings Edge Function呼び出し開始:', {
        functionName: 'ai-embeddings',
        timestamp: new Date().toISOString(),
        textLength: text.length,
        stackTrace: new Error().stack
      });
      
      const response = await supabase.functions.invoke('ai-embeddings', {
        body: { 
          text,
          provider: 'gemini',
          model: this.config.embeddingModel
        }
      });

      if (!response.data?.success) {
        throw new Error(response.data?.error || 'Gemini embedding generation failed');
      }

      return response.data.embeddings;
    } catch (error) {
      console.error('[GeminiProvider] Failed to generate embedding:', error);
      return null;
    }
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      console.log('🔍 [GeminiProvider] ai-embeddings Edge Function呼び出し開始:', {
        functionName: 'ai-embeddings',
        timestamp: new Date().toISOString(),
        textsCount: texts.length,
        stackTrace: new Error().stack
      });
      
      const response = await supabase.functions.invoke('ai-embeddings', {
        body: { 
          texts,
          provider: 'gemini',
          model: this.config.embeddingModel
        }
      });

      if (!response.data?.success) {
        throw new Error(response.data?.error || 'Gemini batch embedding generation failed');
      }

      return response.data.embeddings;
    } catch (error) {
      console.error('[GeminiProvider] Failed to generate embeddings:', error);
      return []; // 空配列を返す
    }
  }

  async generateSummary(content: string, context?: AIRequestContext): Promise<string> {
    const startTime = Date.now();
    try {
      console.log('🔍 [GeminiProvider] generateSummary呼び出し開始', {
        timestamp: new Date().toISOString(),
        contentLength: content.length,
        stackTrace: new Error().stack
      });
      
      console.log('🔍 [GeminiProvider] ai-summary Edge Function呼び出し開始:', {
        functionName: 'ai-summary',
        timestamp: new Date().toISOString(),
        contentLength: content.length,
        stackTrace: new Error().stack
      });
      
      const response = await supabase.functions.invoke('ai-summary', {
        body: {
          action: 'summary',
          content,
          provider: 'gemini',
          model: this.config.model,
          maxTokens: this.config.maxTokens
        }
      });

      console.log('🔍 [GeminiProvider] generateSummary Edge Function呼び出し完了');

      if (!response.data?.success) {
        throw new Error(response.data?.error || 'Summary generation failed');
      }

      // AI使用量をログ
      if (context) {
        const inputTokens = response.data.usage?.prompt_tokens || Math.ceil(content.length / 4);
        const outputTokens = response.data.usage?.completion_tokens || Math.ceil(response.data.result.length / 4);
        const cost = AIUsageLogger.calculateCost('gemini', this.config.model || 'gemini-1.5-flash', inputTokens, outputTokens);
        
        await AIUsageLogger.logUsage({
          userId: context.userId,
          nestId: context.nestId,
          featureType: 'meeting_summary',
          provider: 'gemini',
          model: this.config.model || 'gemini-1.5-flash',
          inputTokens,
          outputTokens,
          estimatedCostUsd: cost,
          requestMetadata: { contentLength: content.length },
          responseMetadata: { 
            success: true, 
            resultLength: response.data.result.length,
            processingTime: Date.now() - startTime,
            usage: response.data.usage
          },
          meetingId: context.meetingId
        });
      }

      return response.data.result;
    } catch (error) {
      console.error('[GeminiProvider] Failed to generate summary:', error);
      throw error;
    }
  }

  async analyzeChat(messages: any[], systemPrompt: string): Promise<string> {
    try {
      console.log('🔍 [GeminiProvider] analyze-chat Edge Function呼び出し開始:', {
        functionName: 'analyze-chat',
        timestamp: new Date().toISOString(),
        messagesCount: messages.length,
        stackTrace: new Error().stack
      });
      
      const response = await supabase.functions.invoke('analyze-chat', {
        body: {
          messages,
          systemPrompt,
          provider: 'gemini',
          model: this.config.model,
          maxTokens: this.config.maxTokens,
          temperature: this.config.temperature
        }
      });

      if (!response.data?.success) {
        throw new Error(response.data?.error || 'Gemini chat analysis failed');
      }

      return response.data.markdown || response.data.result;
    } catch (error) {
      console.error('[GeminiProvider] Failed to analyze chat:', error);
      throw error;
    }
  }

  async extractCards(meetingContent: string, meetingId?: string, jobId?: string): Promise<any[]> {
    try {
      // 🔒 job_idが無い場合はEdge Functionを呼び出さない
      if (!jobId) {
        console.log('🚫 [GeminiProvider] job_idが無いためEdge Function呼び出しをスキップ');
        throw new Error('job_idが必須です。Edge Functionを呼び出すことができません。');
      }

      console.log('🚨🚨🚨 [GeminiProvider] extractCards呼び出し開始 - job_id付きEdge Function呼び出し 🚨🚨🚨', {
        timestamp: new Date().toISOString(),
        contentLength: meetingContent.length,
        meetingId: meetingId,
        jobId: jobId,
        directCall: jobId ? false : true,
        stackTrace: new Error().stack
      });
      
      // 🚨 一時的にEdge Function呼び出しを無効化してデバッグ
      console.log('🚨🚨🚨 [GeminiProvider] Edge Function呼び出しを一時的に無効化 🚨🚨🚨');
      throw new Error('GeminiProvider Edge Function呼び出しが一時的に無効化されています');
    } catch (error) {
      console.error('[GeminiProvider] Failed to extract cards:', error);
      return [];
    }
  }
} 