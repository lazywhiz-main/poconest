import { supabase } from '../../../services/supabase/client';

export interface InvestigationLevel {
  level: 1 | 2 | 3;
  result_text: string;
  executed_at: string;
  duration_seconds: number;
}

export interface InvestigationResult {
  success: boolean;
  level?: number;
  result?: string;
  duration_seconds?: number;
  error?: string;
}

export const TrendInvestigationService = {
  /**
   * 製品の段階的調査を実行
   */
  async investigateProduct(
    productId: string,
    level: 1 | 2 | 3,
    productData: {
      title: string;
      url: string;
      summary: string;
      category: string;
      brand_designer: string;
      scores: {
        concept_shift: number;
        category_disruption: number;
        philosophical_pricing: number;
        experience_change: number;
      };
    }
  ): Promise<InvestigationResult> {
    try {
      const { data, error } = await supabase.functions.invoke('investigate-product', {
        body: {
          product_id: productId,
          level: level,
          product_data: productData,
        },
      });

      if (error) {
        console.error('Error investigating product:', error);
        return {
          success: false,
          error: error.message,
        };
      }

      return data as InvestigationResult;
    } catch (error) {
      console.error('Exception investigating product:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  /**
   * 製品の調査履歴を取得
   */
  async getInvestigations(productId: string): Promise<InvestigationLevel[]> {
    try {
      const { data, error } = await supabase
        .from('trend_investigations')
        .select('*')
        .eq('product_id', productId)
        .order('level', { ascending: true });

      if (error) {
        console.error('Error fetching investigations:', error);
        return [];
      }

      return (data || []).map((inv) => ({
        level: inv.level as 1 | 2 | 3,
        result_text: inv.result_text,
        executed_at: inv.executed_at,
        duration_seconds: inv.duration_seconds || 0,
      }));
    } catch (error) {
      console.error('Exception fetching investigations:', error);
      return [];
    }
  },

  /**
   * 次の調査レベルを取得
   */
  getNextLevel(investigations: InvestigationLevel[]): 1 | 2 | 3 | null {
    const completedLevels = investigations.map((inv) => inv.level);
    
    if (!completedLevels.includes(1)) return 1;
    if (!completedLevels.includes(2)) return 2;
    if (!completedLevels.includes(3)) return 3;
    
    return null; // すべて完了
  },

  /**
   * 調査結果を更新
   */
  async updateInvestigation(
    productId: string,
    level: 1 | 2 | 3,
    resultText: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('trend_investigations')
        .update({
          result_text: resultText,
          updated_at: new Date().toISOString(),
        })
        .eq('product_id', productId)
        .eq('level', level);

      if (error) {
        console.error('Error updating investigation:', error);
        return {
          success: false,
          error: error.message,
        };
      }

      return { success: true };
    } catch (error) {
      console.error('Exception updating investigation:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
};

