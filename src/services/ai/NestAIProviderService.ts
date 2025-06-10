import { supabase } from '../supabase/client';

export interface NestAIProviderSettings {
  primaryProvider: 'openai' | 'gemini';
  enableFallback: boolean;
  fallbackProviders: string[];
  providerConfigs: {
    openai: {
      model: string;
      embeddingModel: string;
    };
    gemini: {
      model: string;
      embeddingModel: string;
    };
  };
}

export class NestAIProviderService {
  /**
   * 指定されたNestのAIプロバイダー設定を取得
   */
  async getNestAIProviderSettings(nestId: string): Promise<NestAIProviderSettings> {
    try {
      const { data, error } = await supabase
        .rpc('get_nest_ai_provider', { nest_id_param: nestId });

      if (error) {
        console.error('Failed to get nest AI provider settings:', error);
        return this.getDefaultSettings();
      }

      if (!data || data.length === 0) {
        return this.getDefaultSettings();
      }

      const { primary_provider, ai_settings } = data[0];

      return {
        primaryProvider: primary_provider as 'openai' | 'gemini',
        enableFallback: ai_settings.enableFallback ?? true,
        fallbackProviders: ai_settings.fallbackProviders ?? ['gemini'],
        providerConfigs: ai_settings.providerConfigs ?? this.getDefaultSettings().providerConfigs
      };
    } catch (error) {
      console.error('Error getting nest AI provider settings:', error);
      return this.getDefaultSettings();
    }
  }

  /**
   * 指定されたNestのAIプロバイダー設定を更新
   */
  async updateNestAIProviderSettings(
    nestId: string, 
    settings: Partial<NestAIProviderSettings>
  ): Promise<void> {
    try {
      // 現在の設定を取得
      const currentSettings = await this.getNestAIProviderSettings(nestId);
      
      // 更新する設定をマージ
      const updatedSettings = {
        ...currentSettings,
        ...settings
      };

      const aiProviderSettings = {
        enableFallback: updatedSettings.enableFallback,
        fallbackProviders: updatedSettings.fallbackProviders,
        providerConfigs: updatedSettings.providerConfigs
      };

      // nest_settingsテーブルを更新 (nest_idを基準にupsert)
      const { error } = await supabase
        .from('nest_settings')
        .upsert({
          nest_id: nestId,
          primary_ai_provider: updatedSettings.primaryProvider,
          ai_provider_settings: aiProviderSettings
        }, {
          onConflict: 'nest_id'
        });

      if (error) {
        throw error;
      }

      console.log('✅ Updated nest AI provider settings:', updatedSettings);
    } catch (error) {
      console.error('❌ Failed to update nest AI provider settings:', error);
      throw error;
    }
  }

  /**
   * デフォルトのAIプロバイダー設定を取得
   */
  private getDefaultSettings(): NestAIProviderSettings {
    return {
      primaryProvider: 'openai',
      enableFallback: true,
      fallbackProviders: ['gemini'],
      providerConfigs: {
        openai: {
          model: 'gpt-4o',
          embeddingModel: 'text-embedding-3-small'
        },
        gemini: {
          model: 'gemini-2.0-flash',
          embeddingModel: 'gemini-embedding-exp-03-07'
        }
      }
    };
  }

  /**
   * Edge Functionsで使用するプロバイダーを決定
   * フォールバック機能を考慮してプロバイダーを選択
   */
  async resolveProviderForNest(nestId: string): Promise<'openai' | 'gemini'> {
    try {
      const settings = await this.getNestAIProviderSettings(nestId);
      
      // プライマリプロバイダーの可用性を確認
      const primaryAvailable = await this.checkProviderAvailability(settings.primaryProvider);
      
      if (primaryAvailable) {
        console.log(`[NestAIProviderService] Using primary provider: ${settings.primaryProvider}`);
        return settings.primaryProvider;
      }

      // フォールバックが有効で、プライマリが利用できない場合
      if (settings.enableFallback && settings.fallbackProviders.length > 0) {
        for (const fallbackProvider of settings.fallbackProviders) {
          if (fallbackProvider === 'openai' || fallbackProvider === 'gemini') {
            const available = await this.checkProviderAvailability(fallbackProvider as 'openai' | 'gemini');
            if (available) {
              console.log(`[NestAIProviderService] Using fallback provider: ${fallbackProvider}`);
              return fallbackProvider as 'openai' | 'gemini';
            }
          }
        }
      }

      // どのプロバイダーも利用できない場合はプライマリを返す（エラーは呼び出し側で処理）
      console.warn(`[NestAIProviderService] No available providers found, defaulting to: ${settings.primaryProvider}`);
      return settings.primaryProvider;
    } catch (error) {
      console.error('Error resolving provider for nest:', error);
      return 'openai'; // デフォルトにフォールバック
    }
  }

  /**
   * プロバイダーの可用性をチェック
   */
  async checkProviderAvailability(provider: 'openai' | 'gemini'): Promise<boolean> {
    try {
      const { data, error } = await supabase.functions.invoke('ai-health-check', {
        body: { provider }
      });

      if (error) {
        console.warn(`[NestAIProviderService] Health check failed for ${provider}:`, error);
        return false;
      }

      return data?.available === true;
    } catch (error) {
      console.warn(`[NestAIProviderService] Error checking ${provider} availability:`, error);
      return false;
    }
  }
}

// シングルトンインスタンス
export const nestAIProviderService = new NestAIProviderService(); 