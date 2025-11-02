import { supabase } from '../../../services/supabase/client';

export interface CollectionStats {
  processed: number;
  inserted: number;
  skipped: number;
  sources: string[];
}

export interface CollectionResult {
  success: boolean;
  stats?: CollectionStats;
  error?: string;
}

export const TrendCollectionService = {
  /**
   * RSS収集を実行する
   */
  async collectProducts(nestId: string, sourceNames?: string[]): Promise<CollectionResult> {
    try {
      const { data, error } = await supabase.functions.invoke('collect-trend-products', {
        body: {
          nest_id: nestId,
          source_names: sourceNames,
        },
      });

      if (error) {
        console.error('Error collecting trend products:', error);
        return {
          success: false,
          error: error.message,
        };
      }

      return data as CollectionResult;
    } catch (error) {
      console.error('Exception collecting trend products:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  /**
   * 収集可能なRSSソース一覧を取得
   */
  getAvailableSources(): { name: string; category: string }[] {
    return [
      { name: 'Dezeen', category: 'design' },
      { name: 'Yanko Design', category: 'product-design' },
    ];
  },
};

