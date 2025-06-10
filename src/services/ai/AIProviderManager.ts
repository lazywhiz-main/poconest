import { AIProvider, AIProviderType, AIProviderConfig } from './providers/AIProvider';
import { OpenAIProvider } from './providers/OpenAIProvider';
import { GeminiProvider } from './providers/GeminiProvider';

// AI Provider の設定管理
interface AIProviderSettings {
  primary: AIProviderType;
  fallback: AIProviderType[];
  enableFallback: boolean;
  configs: Record<AIProviderType, AIProviderConfig>;
}

// デフォルト設定
const DEFAULT_SETTINGS: AIProviderSettings = {
  primary: AIProviderType.OPENAI,
  fallback: [AIProviderType.GEMINI],
  enableFallback: true,
  configs: {
    [AIProviderType.OPENAI]: {
      name: 'OpenAI',
      model: 'gpt-4o',
      embeddingModel: 'text-embedding-3-small',
      maxTokens: 2048,
      temperature: 0.7
    },
    [AIProviderType.GEMINI]: {
      name: 'Gemini',
      model: 'gemini-1.5-pro-latest',
      embeddingModel: 'text-embedding-004',
      maxTokens: 8192,
      temperature: 0.7
    },
    [AIProviderType.MOCK]: {
      name: 'Mock',
      model: 'mock-model',
      embeddingModel: 'mock-embedding',
      maxTokens: 1000,
      temperature: 0.5
    }
  }
};

export class AIProviderManager {
  private static instance: AIProviderManager;
  private settings: AIProviderSettings;
  private providers: Map<AIProviderType, AIProvider> = new Map();
  private availabilityCache: Map<AIProviderType, { available: boolean; lastCheck: number }> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5分

  private constructor() {
    this.settings = this.loadSettings();
    this.initializeProviders();
  }

  static getInstance(): AIProviderManager {
    if (!AIProviderManager.instance) {
      AIProviderManager.instance = new AIProviderManager();
    }
    return AIProviderManager.instance;
  }

  private loadSettings(): AIProviderSettings {
    try {
      const saved = localStorage.getItem('ai-provider-settings');
      if (saved) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      }
    } catch (error) {
      console.warn('[AIProviderManager] Failed to load settings:', error);
    }
    return DEFAULT_SETTINGS;
  }

  private saveSettings(): void {
    try {
      localStorage.setItem('ai-provider-settings', JSON.stringify(this.settings));
    } catch (error) {
      console.warn('[AIProviderManager] Failed to save settings:', error);
    }
  }

  private initializeProviders(): void {
    // OpenAI Provider
    this.providers.set(
      AIProviderType.OPENAI,
      new OpenAIProvider(this.settings.configs[AIProviderType.OPENAI])
    );

    // Gemini Provider
    this.providers.set(
      AIProviderType.GEMINI,
      new GeminiProvider(this.settings.configs[AIProviderType.GEMINI])
    );

    console.log('[AIProviderManager] Initialized providers:', Array.from(this.providers.keys()));
  }

  // 設定の更新
  updateSettings(newSettings: Partial<AIProviderSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    this.saveSettings();
    this.initializeProviders(); // プロバイダーを再初期化
    this.availabilityCache.clear(); // キャッシュをクリア
    console.log('[AIProviderManager] Settings updated:', this.settings);
  }

  // 現在の設定を取得
  getSettings(): AIProviderSettings {
    return { ...this.settings };
  }

  // プロバイダーの可用性をチェック
  private async checkAvailability(providerType: AIProviderType): Promise<boolean> {
    const now = Date.now();
    const cached = this.availabilityCache.get(providerType);
    
    // キャッシュが有効な場合は使用
    if (cached && (now - cached.lastCheck) < this.CACHE_DURATION) {
      return cached.available;
    }

    const provider = this.providers.get(providerType);
    if (!provider) {
      return false;
    }

    try {
      const available = await provider.isAvailable();
      this.availabilityCache.set(providerType, { available, lastCheck: now });
      return available;
    } catch (error) {
      console.warn(`[AIProviderManager] ${providerType} availability check failed:`, error);
      this.availabilityCache.set(providerType, { available: false, lastCheck: now });
      return false;
    }
  }

  // 利用可能なプロバイダーを取得（フォールバック機能付き）
  async getAvailableProvider(): Promise<AIProvider | null> {
    // プライマリプロバイダーを試す
    const primaryAvailable = await this.checkAvailability(this.settings.primary);
    if (primaryAvailable) {
      const provider = this.providers.get(this.settings.primary);
      if (provider) {
        console.log(`[AIProviderManager] Using primary provider: ${this.settings.primary}`);
        return provider;
      }
    }

    // フォールバックが有効な場合、フォールバックプロバイダーを試す
    if (this.settings.enableFallback) {
      for (const fallbackType of this.settings.fallback) {
        const available = await this.checkAvailability(fallbackType);
        if (available) {
          const provider = this.providers.get(fallbackType);
          if (provider) {
            console.log(`[AIProviderManager] Using fallback provider: ${fallbackType}`);
            return provider;
          }
        }
      }
    }

    console.error('[AIProviderManager] No available AI providers found');
    return null;
  }

  // 特定のプロバイダーを取得
  getProvider(providerType: AIProviderType): AIProvider | null {
    return this.providers.get(providerType) || null;
  }

  // 利用可能なプロバイダーのリストを取得
  async getAvailableProviders(): Promise<{ type: AIProviderType; provider: AIProvider }[]> {
    const available = [];
    
    for (const [type, provider] of this.providers.entries()) {
      if (await this.checkAvailability(type)) {
        available.push({ type, provider });
      }
    }
    
    return available;
  }

  // プロバイダーの状態を取得
  async getProviderStatus(): Promise<Record<AIProviderType, boolean>> {
    const status: Record<AIProviderType, boolean> = {} as any;
    
    for (const type of Object.values(AIProviderType)) {
      status[type] = await this.checkAvailability(type);
    }
    
    return status;
  }

  // 公開メソッド: プロバイダーの可用性をチェック
  async checkProviderAvailability(providerType: AIProviderType): Promise<boolean> {
    return await this.checkAvailability(providerType);
  }
} 