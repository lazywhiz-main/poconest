import { AIProvider, AIProviderConfig, AIAnalysisResponse, EmbeddingResponse } from './AIProvider';
import { supabase } from '../../supabase/client';
import { AIUsageLogger, AIFeatureType } from '../AIUsageLogger';

export interface AIRequestContext {
  userId: string;
  nestId?: string;
  chatRoomId?: string;
  meetingId?: string;
  boardId?: string;
}

export class OpenAIProvider implements AIProvider {
  name = 'OpenAI';
  private config: AIProviderConfig;

  constructor(config: AIProviderConfig) {
    this.config = {
      model: 'gpt-4o',
      embeddingModel: 'text-embedding-3-small',
      maxTokens: 2048,
      temperature: 0.7,
      ...config,
      name: 'OpenAI' // configの後に設定して上書きを防ぐ
    };
  }

  async isAvailable(): Promise<boolean> {
    try {
      console.log('🔍 [OpenAIProvider] ai-health-check Edge Function呼び出し開始:', {
        functionName: 'ai-health-check',
        timestamp: new Date().toISOString(),
        stackTrace: new Error().stack
      });
      
      const response = await supabase.functions.invoke('ai-health-check', {
        body: { provider: 'openai' }
      });
      return response.data?.available === true;
    } catch (error) {
      console.warn('[OpenAIProvider] Availability check failed:', error);
      return false;
    }
  }

  async generateEmbedding(text: string, context?: AIRequestContext): Promise<number[] | null> {
    const startTime = Date.now();
    try {
      console.log('[OpenAIProvider] Generating embedding for text length:', text.length);
      
      const response = await supabase.functions.invoke('ai-embeddings', {
        body: { 
          text,
          provider: 'openai',
          model: this.config.embeddingModel
        }
      });

      if (!response.data?.success) {
        throw new Error(response.data?.error || 'Embedding generation failed');
      }

      // AI使用量をログ
      if (context) {
        const inputTokens = Math.ceil(text.length / 4); // 概算: 4文字 ≈ 1トークン
        const cost = AIUsageLogger.calculateCost('openai', this.config.embeddingModel || 'text-embedding-3-small', inputTokens, 0);
        
        await AIUsageLogger.logUsage({
          userId: context.userId,
          nestId: context.nestId,
          featureType: 'embedding',
          provider: 'openai',
          model: this.config.embeddingModel || 'text-embedding-3-small',
          inputTokens,
          outputTokens: 0,
          estimatedCostUsd: cost,
          requestMetadata: { textLength: text.length },
          responseMetadata: { 
            success: true, 
            processingTime: Date.now() - startTime 
          },
          boardId: context.boardId
        });
      }

      return response.data.embeddings;
    } catch (error) {
      console.error('[OpenAIProvider] Failed to generate embedding:', error);
      
      // エラーでもログを記録
      if (context) {
        await AIUsageLogger.logUsage({
          userId: context.userId,
          nestId: context.nestId,
          featureType: 'embedding',
          provider: 'openai',
          model: this.config.embeddingModel || 'text-embedding-3-small',
          inputTokens: 0,
          outputTokens: 0,
          estimatedCostUsd: 0,
          requestMetadata: { textLength: text.length },
          responseMetadata: { 
            success: false, 
            error: error instanceof Error ? error.message : String(error),
            processingTime: Date.now() - startTime 
          },
          boardId: context.boardId
        });
      }
      
      return null;
    }
  }

  async generateEmbeddings(texts: string[]): Promise<number[][] | null> {
    try {
      console.log('[OpenAIProvider] Generating embeddings for', texts.length, 'texts');
      
      console.log('🔍 [OpenAIProvider] ai-embeddings Edge Function呼び出し開始:', {
        functionName: 'ai-embeddings',
        timestamp: new Date().toISOString(),
        textsCount: texts.length,
        stackTrace: new Error().stack
      });
      
      const response = await supabase.functions.invoke('ai-embeddings', {
        body: { 
          texts,
          provider: 'openai',
          model: this.config.embeddingModel
        }
      });

      if (!response.data?.success) {
        throw new Error(response.data?.error || 'Batch embedding generation failed');
      }

      return response.data.embeddings;
    } catch (error) {
      console.error('[OpenAIProvider] Failed to generate embeddings:', error);
      return null;
    }
  }

  async generateSummary(content: string, context?: AIRequestContext): Promise<string> {
    const startTime = Date.now();
    try {
      console.log('🔍 [OpenAIProvider] generateSummary呼び出し開始', {
        timestamp: new Date().toISOString(),
        contentLength: content.length,
        stackTrace: new Error().stack
      });
      
      console.log('🔍 [OpenAIProvider] ai-summary Edge Function呼び出し開始:', {
        functionName: 'ai-summary',
        timestamp: new Date().toISOString(),
        contentLength: content.length,
        stackTrace: new Error().stack
      });
      
      const response = await supabase.functions.invoke('ai-summary', {
        body: {
          action: 'summary',
          content,
          provider: 'openai',
          model: this.config.model,
          maxTokens: this.config.maxTokens
        }
      });

      console.log('🔍 [OpenAIProvider] generateSummary Edge Function呼び出し完了');

      if (!response.data?.success) {
        throw new Error(response.data?.error || 'Summary generation failed');
      }

      // AI使用量をログ
      if (context) {
        const inputTokens = response.data.usage?.prompt_tokens || Math.ceil(content.length / 4);
        const outputTokens = response.data.usage?.completion_tokens || Math.ceil(response.data.result.length / 4);
        const cost = AIUsageLogger.calculateCost('openai', this.config.model || 'gpt-4o', inputTokens, outputTokens);
        
        await AIUsageLogger.logUsage({
          userId: context.userId,
          nestId: context.nestId,
          featureType: 'meeting_summary',
          provider: 'openai',
          model: this.config.model || 'gpt-4o',
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
      console.error('[OpenAIProvider] Failed to generate summary:', error);
      throw error;
    }
  }

  async analyzeChat(messages: any[], systemPrompt: string, context?: AIRequestContext): Promise<string> {
    const startTime = Date.now();
    try {
      console.log('🔍 [OpenAIProvider] analyze-chat Edge Function呼び出し開始:', {
        functionName: 'analyze-chat',
        timestamp: new Date().toISOString(),
        messagesCount: messages.length,
        stackTrace: new Error().stack
      });
      
      const response = await supabase.functions.invoke('analyze-chat', {
        body: {
          messages,
          systemPrompt,
          provider: 'openai',
          model: this.config.model,
          maxTokens: this.config.maxTokens,
          temperature: this.config.temperature
        }
      });

      if (!response.data?.success) {
        throw new Error(response.data?.error || 'Chat analysis failed');
      }

      // AI使用量をログ
      if (context) {
        const inputTokens = response.data.usage?.prompt_tokens || Math.ceil((JSON.stringify(messages) + systemPrompt).length / 4);
        const outputTokens = response.data.usage?.completion_tokens || Math.ceil((response.data.markdown || response.data.result).length / 4);
        const cost = AIUsageLogger.calculateCost('openai', this.config.model || 'gpt-4o', inputTokens, outputTokens);
        
        await AIUsageLogger.logUsage({
          userId: context.userId,
          nestId: context.nestId,
          featureType: 'chat_analysis',
          provider: 'openai',
          model: this.config.model || 'gpt-4o',
          inputTokens,
          outputTokens,
          estimatedCostUsd: cost,
          requestMetadata: { 
            messageCount: messages.length,
            systemPromptLength: systemPrompt.length 
          },
          responseMetadata: { 
            success: true, 
            processingTime: Date.now() - startTime,
            usage: response.data.usage
          },
          chatRoomId: context.chatRoomId
        });
      }

      return response.data.markdown || response.data.result;
    } catch (error) {
      console.error('[OpenAIProvider] Failed to analyze chat:', error);
      
      // エラーでもログを記録
      if (context) {
        await AIUsageLogger.logUsage({
          userId: context.userId,
          nestId: context.nestId,
          featureType: 'chat_analysis',
          provider: 'openai',
          model: this.config.model || 'gpt-4o',
          inputTokens: 0,
          outputTokens: 0,
          estimatedCostUsd: 0,
          requestMetadata: { 
            messageCount: messages.length,
            systemPromptLength: systemPrompt.length 
          },
          responseMetadata: { 
            success: false, 
            error: error instanceof Error ? error.message : String(error),
            processingTime: Date.now() - startTime 
          },
          chatRoomId: context.chatRoomId
        });
      }
      
      throw error;
    }
  }

  async extractCards(meetingContent: string, meetingId?: string, jobId?: string): Promise<any[]> {
    try {
      // 🔒 job_idが無い場合はEdge Functionを呼び出さない
      if (!jobId) {
        console.log('🚫 [OpenAIProvider] job_idが無いためEdge Function呼び出しをスキップ');
        throw new Error('job_idが必須です。Edge Functionを呼び出すことができません。');
      }

      console.log('🚨🚨🚨 [OpenAIProvider] extractCards呼び出し開始 - job_id付きEdge Function呼び出し 🚨🚨🚨', {
        timestamp: new Date().toISOString(),
        contentLength: meetingContent.length,
        meetingId: meetingId,
        jobId: jobId,
        directCall: jobId ? false : true,
        stackTrace: new Error().stack
      });
      
      // 🚨 一時的にEdge Function呼び出しを無効化してデバッグ
      console.log('🚨🚨🚨 [OpenAIProvider] Edge Function呼び出しを一時的に無効化 🚨🚨🚨');
      throw new Error('OpenAIProvider Edge Function呼び出しが一時的に無効化されています');
      
      // const response = await supabase.functions.invoke('extract-cards-from-meeting', {
      //   body: {
      //     meeting_id: meetingId, // meeting_idを明示的に追加
      //     job_id: jobId, // job_idを追加
      //     action: 'extract_cards',
      //     content: meetingContent,
      //     provider: 'openai',
      //     model: this.config.model,
      //     maxTokens: this.config.maxTokens
      //   }
      // });

      if (!response.data?.success) {
        throw new Error(response.data?.error || 'Card extraction failed');
      }

      return response.data.cards || [];
    } catch (error) {
      console.error('[OpenAIProvider] Failed to extract cards:', error);
      return [];
    }
  }
} 