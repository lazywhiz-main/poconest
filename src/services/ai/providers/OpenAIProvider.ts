import { AIProvider, AIProviderConfig, AIAnalysisResponse, EmbeddingResponse } from './AIProvider';
import { supabase } from '../../supabase/client';

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
      // OpenAI APIキーの存在確認（実際のAPI呼び出しではなく設定確認）
      const response = await supabase.functions.invoke('ai-health-check', {
        body: { provider: 'openai' }
      });
      return response.data?.available === true;
    } catch (error) {
      console.warn('[OpenAIProvider] Availability check failed:', error);
      return false;
    }
  }

  async generateEmbedding(text: string): Promise<number[] | null> {
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

      return response.data.embeddings;
    } catch (error) {
      console.error('[OpenAIProvider] Failed to generate embedding:', error);
      return null;
    }
  }

  async generateEmbeddings(texts: string[]): Promise<number[][] | null> {
    try {
      console.log('[OpenAIProvider] Generating embeddings for', texts.length, 'texts');
      
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

  async generateSummary(content: string): Promise<string> {
    try {
      console.log('[OpenAIProvider] Generating summary for content length:', content.length);
      
      const response = await supabase.functions.invoke('ai-summary', {
        body: {
          action: 'summary',
          content,
          provider: 'openai',
          model: this.config.model,
          maxTokens: this.config.maxTokens
        }
      });

      if (!response.data?.success) {
        throw new Error(response.data?.error || 'Summary generation failed');
      }

      return response.data.result;
    } catch (error) {
      console.error('[OpenAIProvider] Failed to generate summary:', error);
      throw error;
    }
  }

  async analyzeChat(messages: any[], systemPrompt: string): Promise<string> {
    try {
      console.log('[OpenAIProvider] Analyzing chat with', messages.length, 'messages');
      
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

      return response.data.markdown || response.data.result;
    } catch (error) {
      console.error('[OpenAIProvider] Failed to analyze chat:', error);
      throw error;
    }
  }

  async extractCards(meetingContent: string): Promise<any[]> {
    try {
      console.log('[OpenAIProvider] Extracting cards from meeting content');
      
      const response = await supabase.functions.invoke('extract-cards-from-meeting', {
        body: {
          content: meetingContent,
          provider: 'openai',
          model: this.config.model
        }
      });

      if (!response.data?.success) {
        throw new Error(response.data?.error || 'Card extraction failed');
      }

      return response.data.cards || [];
    } catch (error) {
      console.error('[OpenAIProvider] Failed to extract cards:', error);
      throw error;
    }
  }
} 