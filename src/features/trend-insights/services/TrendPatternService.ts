import { supabase } from '../../../services/supabase/client';

export interface BrandAnalysis {
  nest_id: string;
  brand_designer: string;
  product_count: number;
  avg_score: number;
  max_score: number;
  min_score: number;
  avg_concept_shift: number;
  avg_category_disruption: number;
  avg_philosophical_pricing: number;
  avg_experience_change: number;
  first_discovered: string;
  last_discovered: string;
  high_score_count: number;
}

export interface CategoryAnalysis {
  nest_id: string;
  category: string;
  product_count: number;
  avg_score: number;
  max_score: number;
  avg_concept_shift: number;
  avg_category_disruption: number;
  avg_philosophical_pricing: number;
  avg_experience_change: number;
  first_discovered: string;
  last_discovered: string;
  high_score_count: number;
  weekly_count: number;
  monthly_count: number;
}

export interface WeeklyStats {
  nest_id: string;
  week_start: string;
  product_count: number;
  avg_score: number;
  high_score_count: number;
  unique_categories: number;
  unique_brands: number;
  avg_concept_shift: number;
  avg_category_disruption: number;
  avg_philosophical_pricing: number;
  avg_experience_change: number;
}

export interface MonthlyStats {
  nest_id: string;
  month_start: string;
  product_count: number;
  avg_score: number;
  max_score: number;
  high_score_count: number;
  unique_categories: number;
  unique_brands: number;
  avg_concept_shift: number;
  avg_category_disruption: number;
  avg_philosophical_pricing: number;
  avg_experience_change: number;
  top_category: string;
  top_brand: string;
}

export interface TrendPattern {
  type: 'brand' | 'category' | 'score_trend' | 'emerging';
  title: string;
  description: string;
  confidence: number; // 0-1
  data: any;
}

export interface AnalysisCache {
  id: string;
  nest_id: string;
  analyzed_at: string;
  patterns: TrendPattern[];
  brand_analysis: BrandAnalysis[];
  category_analysis: CategoryAnalysis[];
  weekly_stats: WeeklyStats[];
  created_at: string;
  updated_at: string;
}

export const TrendPatternService = {
  /**
   * キャッシュされた分析結果を取得
   */
  async getCachedAnalysis(nestId: string): Promise<AnalysisCache | null> {
    const { data, error } = await supabase
      .from('trend_analysis_cache')
      .select('*')
      .eq('nest_id', nestId)
      .single();

    if (error) {
      console.error('Error fetching cached analysis:', error);
      return null;
    }

    return data;
  },

  /**
   * 分析結果をキャッシュに保存
   */
  async saveAnalysisCache(
    nestId: string,
    patterns: TrendPattern[],
    brandAnalysis: BrandAnalysis[],
    categoryAnalysis: CategoryAnalysis[],
    weeklyStats: WeeklyStats[]
  ): Promise<void> {
    const { error } = await supabase
      .from('trend_analysis_cache')
      .upsert({
        nest_id: nestId,
        analyzed_at: new Date().toISOString(),
        patterns: patterns as any,
        brand_analysis: brandAnalysis as any,
        category_analysis: categoryAnalysis as any,
        weekly_stats: weeklyStats as any,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'nest_id',
      });

    if (error) {
      console.error('Error saving analysis cache:', error);
      throw error;
    }
  },
  /**
   * ブランド/デザイナー分析を取得
   */
  async getBrandAnalysis(nestId: string, limit: number = 20): Promise<BrandAnalysis[]> {
    const { data, error } = await supabase
      .from('trend_brand_analysis')
      .select('*')
      .eq('nest_id', nestId)
      .limit(limit);

    if (error) {
      console.error('Error fetching brand analysis:', error);
      return [];
    }

    return data || [];
  },

  /**
   * カテゴリー傾向分析を取得
   */
  async getCategoryAnalysis(nestId: string, limit: number = 20): Promise<CategoryAnalysis[]> {
    const { data, error } = await supabase
      .from('trend_category_analysis')
      .select('*')
      .eq('nest_id', nestId)
      .limit(limit);

    if (error) {
      console.error('Error fetching category analysis:', error);
      return [];
    }

    return data || [];
  },

  /**
   * 週次統計を取得
   */
  async getWeeklyStats(nestId: string, weeks: number = 12): Promise<WeeklyStats[]> {
    const { data, error } = await supabase
      .from('trend_weekly_stats')
      .select('*')
      .eq('nest_id', nestId)
      .limit(weeks);

    if (error) {
      console.error('Error fetching weekly stats:', error);
      return [];
    }

    return data || [];
  },

  /**
   * 月次統計を取得
   */
  async getMonthlyStats(nestId: string, months: number = 6): Promise<MonthlyStats[]> {
    const { data, error } = await supabase
      .from('trend_monthly_stats')
      .select('*')
      .eq('nest_id', nestId)
      .limit(months);

    if (error) {
      console.error('Error fetching monthly stats:', error);
      return [];
    }

    return data || [];
  },

  /**
   * パターン検出（複合分析）
   */
  async detectPatterns(nestId: string): Promise<TrendPattern[]> {
    const patterns: TrendPattern[] = [];

    // ブランド分析
    const brandAnalysis = await this.getBrandAnalysis(nestId, 10);
    
    // 注目ブランド検出（製品数3以上、平均スコア25以上）
    const notableBrands = brandAnalysis.filter(
      (b) => b.product_count >= 3 && b.avg_score >= 25
    );
    
    if (notableBrands.length > 0) {
      notableBrands.forEach((brand) => {
        patterns.push({
          type: 'brand',
          title: `注目ブランド: ${brand.brand_designer}`,
          description: `${brand.product_count}製品を発表、平均スコア${brand.avg_score.toFixed(1)}点の高評価を獲得`,
          confidence: Math.min(brand.product_count / 10, 1) * (brand.avg_score / 40),
          data: brand,
        });
      });
    }

    // カテゴリー分析
    const categoryAnalysis = await this.getCategoryAnalysis(nestId, 10);
    
    // 急成長カテゴリー検出（週次増加率が高い）
    const emergingCategories = categoryAnalysis.filter(
      (c) => c.weekly_count >= 3 && c.avg_score >= 20
    );
    
    if (emergingCategories.length > 0) {
      emergingCategories.forEach((cat) => {
        patterns.push({
          type: 'category',
          title: `注目カテゴリー: ${cat.category}`,
          description: `今週${cat.weekly_count}製品が登場、平均スコア${cat.avg_score.toFixed(1)}点`,
          confidence: (cat.weekly_count / cat.monthly_count) * 0.8,
          data: cat,
        });
      });
    }

    // スコアトレンド分析
    const weeklyStats = await this.getWeeklyStats(nestId, 8);
    
    if (weeklyStats.length >= 4) {
      // 最近4週間と前4週間を比較
      const recent4Weeks = weeklyStats.slice(0, 4);
      const previous4Weeks = weeklyStats.slice(4, 8);
      
      const recentAvg = recent4Weeks.reduce((sum, w) => sum + w.avg_score, 0) / recent4Weeks.length;
      const previousAvg = previous4Weeks.reduce((sum, w) => sum + w.avg_score, 0) / previous4Weeks.length;
      
      const scoreDiff = recentAvg - previousAvg;
      
      if (Math.abs(scoreDiff) > 2) {
        patterns.push({
          type: 'score_trend',
          title: scoreDiff > 0 ? '📈 スコア上昇トレンド' : '📉 スコア下降トレンド',
          description: `平均スコアが${Math.abs(scoreDiff).toFixed(1)}点${scoreDiff > 0 ? '上昇' : '下降'}`,
          confidence: Math.min(Math.abs(scoreDiff) / 10, 0.9),
          data: { recentAvg, previousAvg, diff: scoreDiff },
        });
      }
    }

    // 信頼度でソート
    patterns.sort((a, b) => b.confidence - a.confidence);

    return patterns;
  },
};

