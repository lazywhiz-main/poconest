import { supabase } from '../../../services/supabase/client';

export interface RSSFeed {
  id: string;
  url: string;
  name: string;
  enabled: boolean;
  language: 'en' | 'ja' | 'auto';
  category: string;
  last_collected: string | null;
  products_count: number;
}

export interface BrandWatch {
  id: string;
  name: string;
  keywords: string[];
  official_url: string | null;
  official_rss: string | null;
  category: 'ブランド' | 'デザイナー' | '企業';
  enabled: boolean;
  search_methods: ('rss' | 'google')[];
  frequency: 'weekly' | 'monthly' | 'manual';
  last_checked: string | null;
  products_count: number;
}

export interface DuplicateDetectionSettings {
  enabled: boolean;
  url_check: boolean;
  title_similarity_threshold: number;
}

export interface CollectionSettings {
  id: string;
  nest_id: string;
  rss_feeds: RSSFeed[];
  brand_watches: BrandWatch[];
  duplicate_detection: DuplicateDetectionSettings;
  min_score_threshold: number;
  created_at: string;
  updated_at: string;
}

export const TrendCollectionSettingsService = {
  /**
   * 収集設定を取得（なければデフォルト設定を作成）
   */
  async getSettings(nestId: string): Promise<CollectionSettings | null> {
    try {
      const { data, error } = await supabase
        .from('trend_collection_settings')
        .select('*')
        .eq('nest_id', nestId)
        .single();

      if (error) {
        // データが存在しない場合は作成
        if (error.code === 'PGRST116') {
          console.log('[TrendCollectionSettingsService] Creating default settings for nest:', nestId);
          
          const defaultSettings = {
            nest_id: nestId,
            rss_feeds: [
              {
                id: crypto.randomUUID(),
                url: 'https://www.dezeen.com/feed/',
                name: 'Dezeen',
                enabled: true,
                language: 'en' as const,
                category: 'デザインメディア',
                last_collected: null,
                products_count: 0,
              },
            ],
            brand_watches: [],
            duplicate_detection: {
              enabled: true,
              url_check: true,
              title_similarity_threshold: 0.85,
            },
            min_score_threshold: 20,
          };

          const { data: newData, error: insertError } = await supabase
            .from('trend_collection_settings')
            .insert(defaultSettings)
            .select()
            .single();

          if (insertError) {
            console.error('Error creating default settings:', insertError);
            return null;
          }

          return newData as CollectionSettings;
        }
        
        console.error('Error fetching collection settings:', error);
        return null;
      }

      return data as CollectionSettings;
    } catch (error) {
      console.error('Exception fetching collection settings:', error);
      return null;
    }
  },

  /**
   * 収集設定を更新
   */
  async updateSettings(
    nestId: string,
    settings: Partial<Omit<CollectionSettings, 'id' | 'nest_id' | 'created_at' | 'updated_at'>>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('trend_collection_settings')
        .update({
          ...settings,
          updated_at: new Date().toISOString(),
        })
        .eq('nest_id', nestId);

      if (error) {
        console.error('Error updating collection settings:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Exception updating collection settings:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  /**
   * RSSフィードを追加
   */
  async addRSSFeed(
    nestId: string,
    feed: Omit<RSSFeed, 'id' | 'last_collected' | 'products_count'>
  ): Promise<{ success: boolean; feed?: RSSFeed; error?: string }> {
    try {
      const settings = await this.getSettings(nestId);
      if (!settings) {
        return { success: false, error: 'Settings not found' };
      }

      const newFeed: RSSFeed = {
        ...feed,
        id: crypto.randomUUID(),
        last_collected: null,
        products_count: 0,
      };

      const updatedFeeds = [...settings.rss_feeds, newFeed];

      const result = await this.updateSettings(nestId, {
        rss_feeds: updatedFeeds,
      });

      if (!result.success) {
        return { success: false, error: result.error };
      }

      return { success: true, feed: newFeed };
    } catch (error) {
      console.error('Exception adding RSS feed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  /**
   * RSSフィードを更新
   */
  async updateRSSFeed(
    nestId: string,
    feedId: string,
    updates: Partial<RSSFeed>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const settings = await this.getSettings(nestId);
      if (!settings) {
        return { success: false, error: 'Settings not found' };
      }

      const updatedFeeds = settings.rss_feeds.map((feed) =>
        feed.id === feedId ? { ...feed, ...updates } : feed
      );

      return await this.updateSettings(nestId, {
        rss_feeds: updatedFeeds,
      });
    } catch (error) {
      console.error('Exception updating RSS feed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  /**
   * RSSフィードを削除
   */
  async deleteRSSFeed(
    nestId: string,
    feedId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const settings = await this.getSettings(nestId);
      if (!settings) {
        return { success: false, error: 'Settings not found' };
      }

      const updatedFeeds = settings.rss_feeds.filter((feed) => feed.id !== feedId);

      return await this.updateSettings(nestId, {
        rss_feeds: updatedFeeds,
      });
    } catch (error) {
      console.error('Exception deleting RSS feed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  /**
   * ブランドウォッチを追加
   */
  async addBrandWatch(
    nestId: string,
    brand: Omit<BrandWatch, 'id' | 'last_checked' | 'products_count'>
  ): Promise<{ success: boolean; brand?: BrandWatch; error?: string }> {
    try {
      const settings = await this.getSettings(nestId);
      if (!settings) {
        return { success: false, error: 'Settings not found' };
      }

      const newBrand: BrandWatch = {
        ...brand,
        id: crypto.randomUUID(),
        last_checked: null,
        products_count: 0,
      };

      const updatedBrands = [...settings.brand_watches, newBrand];

      const result = await this.updateSettings(nestId, {
        brand_watches: updatedBrands,
      });

      if (!result.success) {
        return { success: false, error: result.error };
      }

      return { success: true, brand: newBrand };
    } catch (error) {
      console.error('Exception adding brand watch:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  /**
   * ブランドウォッチを更新
   */
  async updateBrandWatch(
    nestId: string,
    brandId: string,
    updates: Partial<BrandWatch>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const settings = await this.getSettings(nestId);
      if (!settings) {
        return { success: false, error: 'Settings not found' };
      }

      const updatedBrands = settings.brand_watches.map((brand) =>
        brand.id === brandId ? { ...brand, ...updates } : brand
      );

      return await this.updateSettings(nestId, {
        brand_watches: updatedBrands,
      });
    } catch (error) {
      console.error('Exception updating brand watch:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  /**
   * ブランドウォッチを削除
   */
  async deleteBrandWatch(
    nestId: string,
    brandId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const settings = await this.getSettings(nestId);
      if (!settings) {
        return { success: false, error: 'Settings not found' };
      }

      const updatedBrands = settings.brand_watches.filter((brand) => brand.id !== brandId);

      return await this.updateSettings(nestId, {
        brand_watches: updatedBrands,
      });
    } catch (error) {
      console.error('Exception deleting brand watch:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  /**
   * RSSフィードをテスト（フィード内容を取得）
   */
  async testRSSFeed(
    url: string
  ): Promise<{ success: boolean; items?: any[]; error?: string }> {
    try {
      // Edge Functionを呼び出してRSSをパース
      const { data, error } = await supabase.functions.invoke('test-rss-feed', {
        body: { url },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, items: data.items || [] };
    } catch (error) {
      console.error('Exception testing RSS feed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  /**
   * ブランドをテスト（公式RSSを検出 + 検索プレビュー）
   */
  async testBrandWatch(
    brandName: string,
    officialUrl?: string
  ): Promise<{
    success: boolean;
    official_rss?: string;
    preview_items?: any[];
    error?: string;
  }> {
    try {
      // Edge Functionを呼び出してブランド検索をテスト
      const { data, error } = await supabase.functions.invoke('test-brand-watch', {
        body: { brand_name: brandName, official_url: officialUrl },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return {
        success: true,
        official_rss: data.official_rss,
        preview_items: data.preview_items || [],
      };
    } catch (error) {
      console.error('Exception testing brand watch:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
};

