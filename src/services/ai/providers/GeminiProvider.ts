import { AIProvider, AIProviderConfig, AIAnalysisResponse, EmbeddingResponse } from './AIProvider';
import { supabase } from '../../supabase/client';

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
      // Gemini APIキーの存在確認
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
      console.log('[GeminiProvider] Generating embedding for text length:', text.length);
      
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

  async generateEmbeddings(texts: string[]): Promise<number[][] | null> {
    try {
      console.log('[GeminiProvider] Generating embeddings for', texts.length, 'texts');
      
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
      return null;
    }
  }

  async generateSummary(content: string): Promise<string> {
    try {
      console.log('[GeminiProvider] Generating summary for content length:', content.length);
      
      const response = await supabase.functions.invoke('ai-summary', {
        body: {
          action: 'summary',
          content,
          provider: 'gemini',
          model: this.config.model,
          maxTokens: this.config.maxTokens
        }
      });

      if (!response.data?.success) {
        throw new Error(response.data?.error || 'Gemini summary generation failed');
      }

      return response.data.result;
    } catch (error) {
      console.error('[GeminiProvider] Failed to generate summary:', error);
      throw error;
    }
  }

  async analyzeChat(messages: any[], systemPrompt: string): Promise<string> {
    try {
      console.log('[GeminiProvider] Analyzing chat with', messages.length, 'messages');
      
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

  async extractCards(meetingContent: string): Promise<any[]> {
    try {
      console.log('[GeminiProvider] Extracting cards from meeting content');
      
      const response = await supabase.functions.invoke('extract-cards-from-meeting', {
        body: {
          content: meetingContent,
          provider: 'gemini',
          model: this.config.model
        }
      });

      if (!response.data?.success) {
        throw new Error(response.data?.error || 'Gemini card extraction failed');
      }

      return response.data.cards || [];
    } catch (error) {
      console.error('[GeminiProvider] Failed to extract cards:', error);
      throw error;
    }
  }
} 