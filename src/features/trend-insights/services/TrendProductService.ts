import { supabase } from '../../../services/supabase/client';

export interface TrendProduct {
  id: string;
  nest_id: string;
  title_original: string;
  title_ja: string;
  url: string;
  summary_ja: string | null;
  score_concept_shift: number;
  score_category_disruption: number;
  score_philosophical_pricing: number;
  score_experience_change: number;
  score_total: number;
  category: string | null;
  brand_designer: string | null;
  price_value: string | null;
  release_date: string | null;
  status: string;
  reason_text: string | null;
  discovered_at: string;
  // thumbnail_url: string | null; // 後で追加
  updated_at: string;
  created_by: string | null;
}

export interface TrendInvestigation {
  id: string;
  product_id: string;
  level: number;
  result_text: string;
  executed_at: string;
  duration_seconds: number | null;
}

export interface TrendInsight {
  id: string;
  nest_id: string;
  period_type: string;
  period_start: string;
  period_end: string;
  report_content: string;
  generated_at: string;
  generated_by: string;
}

export interface TrendUserNote {
  id: string;
  product_id: string;
  user_id: string;
  note_content: string;
  created_at: string;
  updated_at: string;
}

export type SortField = 'score_total' | 'discovered_at' | 'status';
export type SortOrder = 'asc' | 'desc';

export class TrendProductService {
  /**
   * ネストIDで製品一覧を取得
   */
  static async getProductsByNestId(
    nestId: string,
    options?: {
      sortField?: SortField;
      sortOrder?: SortOrder;
      statusFilter?: string;
      minScore?: number;
    }
  ): Promise<{ data: TrendProduct[] | null; error: any }> {
    try {
      let query = supabase
        .from('trend_products')
        .select('*')
        .eq('nest_id', nestId);

      // フィルター適用
      if (options?.statusFilter) {
        query = query.eq('status', options.statusFilter);
      }

      if (options?.minScore !== undefined) {
        query = query.gte('score_total', options.minScore);
      }

      // ソート適用
      const sortField = options?.sortField || 'discovered_at';
      const sortOrder = options?.sortOrder || 'desc';
      query = query.order(sortField, { ascending: sortOrder === 'asc' });

      const { data, error } = await query;

      return { data, error };
    } catch (error) {
      console.error('[TrendProductService] getProductsByNestId error:', error);
      return { data: null, error };
    }
  }

  /**
   * 製品IDで詳細を取得
   */
  static async getProductById(
    productId: string
  ): Promise<{ data: TrendProduct | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('trend_products')
        .select('*')
        .eq('id', productId)
        .single();

      return { data, error };
    } catch (error) {
      console.error('[TrendProductService] getProductById error:', error);
      return { data: null, error };
    }
  }

  /**
   * 新しい製品を作成
   */
  static async createProduct(
    product: Omit<TrendProduct, 'id' | 'score_total' | 'discovered_at' | 'updated_at'>
  ): Promise<{ data: TrendProduct | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('trend_products')
        .insert([product])
        .select()
        .single();

      return { data, error };
    } catch (error) {
      console.error('[TrendProductService] createProduct error:', error);
      return { data: null, error };
    }
  }

  /**
   * 製品を更新
   */
  static async updateProduct(
    productId: string,
    updates: Partial<TrendProduct>
  ): Promise<{ data: TrendProduct | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('trend_products')
        .update(updates)
        .eq('id', productId)
        .select()
        .single();

      return { data, error };
    } catch (error) {
      console.error('[TrendProductService] updateProduct error:', error);
      return { data: null, error };
    }
  }

  /**
   * 製品を削除
   */
  static async deleteProduct(productId: string): Promise<{ error: any }> {
    try {
      const { error } = await supabase
        .from('trend_products')
        .delete()
        .eq('id', productId);

      return { error };
    } catch (error) {
      console.error('[TrendProductService] deleteProduct error:', error);
      return { error };
    }
  }

  /**
   * 製品の統計情報を取得
   */
  static async getProductStats(
    nestId: string
  ): Promise<{
    total: number;
    highScore: number;
    investigating: number;
    completed: number;
  }> {
    try {
      const { data, error } = await supabase
        .from('trend_products')
        .select('status, score_total')
        .eq('nest_id', nestId);

      if (error || !data) {
        return { total: 0, highScore: 0, investigating: 0, completed: 0 };
      }

      const stats = {
        total: data.length,
        highScore: data.filter((p) => p.score_total >= 28).length,
        investigating: data.filter((p) => p.status.includes('調査中')).length,
        completed: data.filter((p) => p.status === '完了').length,
      };

      return stats;
    } catch (error) {
      console.error('[TrendProductService] getProductStats error:', error);
      return { total: 0, highScore: 0, investigating: 0, completed: 0 };
    }
  }

  /**
   * 関連製品を取得（同じカテゴリーまたはブランド）
   */
  static async getRelatedProducts(
    productId: string,
    nestId: string,
    category: string | null,
    brandDesigner: string | null,
    limit: number = 5
  ): Promise<{ data: TrendProduct[] | null; error: any }> {
    try {
      // 現在の製品を除外し、カテゴリーまたはブランドが一致する製品を取得
      let query = supabase
        .from('trend_products')
        .select('*')
        .eq('nest_id', nestId)
        .neq('id', productId)
        .order('score_total', { ascending: false })
        .limit(limit);

      // カテゴリーとブランドの両方がある場合は優先的にマッチ
      if (category && brandDesigner) {
        const { data, error } = await query.or(`category.eq.${category},brand_designer.eq.${brandDesigner}`);
        return { data, error };
      } else if (category) {
        return await query.eq('category', category);
      } else if (brandDesigner) {
        return await query.eq('brand_designer', brandDesigner);
      }

      // カテゴリーもブランドもない場合は高スコア順に取得
      return await query;
    } catch (error) {
      console.error('[TrendProductService] getRelatedProducts error:', error);
      return { data: null, error };
    }
  }
}

export class TrendInvestigationService {
  /**
   * 製品の調査履歴を取得
   */
  static async getInvestigationsByProductId(
    productId: string
  ): Promise<{ data: TrendInvestigation[] | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('trend_investigations')
        .select('*')
        .eq('product_id', productId)
        .order('level', { ascending: true });

      return { data, error };
    } catch (error) {
      console.error('[TrendInvestigationService] getInvestigationsByProductId error:', error);
      return { data: null, error };
    }
  }

  /**
   * 調査結果を作成
   */
  static async createInvestigation(
    investigation: Omit<TrendInvestigation, 'id' | 'executed_at'>
  ): Promise<{ data: TrendInvestigation | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('trend_investigations')
        .insert([investigation])
        .select()
        .single();

      return { data, error };
    } catch (error) {
      console.error('[TrendInvestigationService] createInvestigation error:', error);
      return { data: null, error };
    }
  }
}

export class TrendInsightService {
  /**
   * ネストのインサイト一覧を取得
   */
  static async getInsightsByNestId(
    nestId: string
  ): Promise<{ data: TrendInsight[] | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('trend_insights')
        .select('*')
        .eq('nest_id', nestId)
        .order('period_start', { ascending: false });

      return { data, error };
    } catch (error) {
      console.error('[TrendInsightService] getInsightsByNestId error:', error);
      return { data: null, error };
    }
  }

  /**
   * インサイトを作成
   */
  static async createInsight(
    insight: Omit<TrendInsight, 'id' | 'generated_at'>
  ): Promise<{ data: TrendInsight | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('trend_insights')
        .insert([insight])
        .select()
        .single();

      return { data, error };
    } catch (error) {
      console.error('[TrendInsightService] createInsight error:', error);
      return { data: null, error };
    }
  }
}

export class TrendUserNoteService {
  /**
   * 製品のメモ一覧を取得
   */
  static async getNotesByProductId(
    productId: string
  ): Promise<{ data: TrendUserNote[] | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('trend_user_notes')
        .select('*')
        .eq('product_id', productId)
        .order('created_at', { ascending: false });

      return { data, error };
    } catch (error) {
      console.error('[TrendUserNoteService] getNotesByProductId error:', error);
      return { data: null, error };
    }
  }

  /**
   * メモを作成
   */
  static async createNote(
    note: Omit<TrendUserNote, 'id' | 'created_at' | 'updated_at'>
  ): Promise<{ data: TrendUserNote | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('trend_user_notes')
        .insert([note])
        .select()
        .single();

      return { data, error };
    } catch (error) {
      console.error('[TrendUserNoteService] createNote error:', error);
      return { data: null, error };
    }
  }

  /**
   * メモを更新
   */
  static async updateNote(
    noteId: string,
    noteContent: string
  ): Promise<{ data: TrendUserNote | null; error: any }> {
    try {
      const { data, error } = await supabase
        .from('trend_user_notes')
        .update({ note_content: noteContent })
        .eq('id', noteId)
        .select()
        .single();

      return { data, error };
    } catch (error) {
      console.error('[TrendUserNoteService] updateNote error:', error);
      return { data: null, error };
    }
  }

  /**
   * メモを削除
   */
  static async deleteNote(noteId: string): Promise<{ error: any }> {
    try {
      const { error } = await supabase
        .from('trend_user_notes')
        .delete()
        .eq('id', noteId);

      return { error };
    } catch (error) {
      console.error('[TrendUserNoteService] deleteNote error:', error);
      return { error };
    }
  }
}

