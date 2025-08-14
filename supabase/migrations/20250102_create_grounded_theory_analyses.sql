-- グラウンデッド・セオリー分析結果管理テーブル作成
-- 実行日: 2025-01-02
-- 理論構築分析の結果保存・管理・呼び出し機能

-- 1. grounded_theory_analyses テーブル作成
CREATE TABLE grounded_theory_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL,
  nest_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  
  -- 分析結果（GroundedTheoryResultData をJSONBで保存）
  analysis_result JSONB NOT NULL,
  
  -- 入力データ（トレーサビリティとパフォーマンス向上のため）
  source_clusters JSONB NOT NULL,              -- 分析時のClusterLabel[]
  source_clustering_result JSONB,              -- 分析時のClusteringResult（オプション）
  
  -- 分析メタデータ
  analysis_parameters JSONB DEFAULT '{}',      -- 分析パラメータ
  quality_metrics JSONB DEFAULT '{}',          -- 品質指標
  
  -- 統計情報（検索・ソート用）
  hypothesis_count INTEGER NOT NULL DEFAULT 0,
  confidence_average DECIMAL(3,2) DEFAULT 0.0,
  concept_count INTEGER DEFAULT 0,
  
  -- メタデータ
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID NOT NULL,
  
  -- 外部キー制約
  CONSTRAINT fk_grounded_theory_analyses_board FOREIGN KEY (board_id) REFERENCES public.boards(id) ON DELETE CASCADE,
  CONSTRAINT fk_grounded_theory_analyses_nest FOREIGN KEY (nest_id) REFERENCES public.nests(id) ON DELETE CASCADE,
  CONSTRAINT fk_grounded_theory_analyses_created_by FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 2. インデックス作成
CREATE INDEX idx_grounded_theory_analyses_board_id ON grounded_theory_analyses(board_id);
CREATE INDEX idx_grounded_theory_analyses_nest_id ON grounded_theory_analyses(nest_id);
CREATE INDEX idx_grounded_theory_analyses_created_at ON grounded_theory_analyses(created_at DESC);
CREATE INDEX idx_grounded_theory_analyses_created_by ON grounded_theory_analyses(created_by);
CREATE INDEX idx_grounded_theory_analyses_confidence ON grounded_theory_analyses(confidence_average DESC);
CREATE INDEX idx_grounded_theory_analyses_hypothesis_count ON grounded_theory_analyses(hypothesis_count DESC);

-- 3. 自動更新トリガー関数
CREATE OR REPLACE FUNCTION update_grounded_theory_analyses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 4. 統計情報自動更新トリガー関数
CREATE OR REPLACE FUNCTION update_grounded_theory_analyses_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- 仮説数を計算
    NEW.hypothesis_count = COALESCE(
        (SELECT jsonb_array_length(NEW.analysis_result->'hypotheses')), 
        0
    );
    
    -- 平均信頼度を計算
    NEW.confidence_average = COALESCE(
        (SELECT ROUND(AVG((hypothesis->>'confidence')::decimal), 2)
         FROM jsonb_array_elements(NEW.analysis_result->'hypotheses') AS hypothesis),
        0.0
    );
    
    -- 概念数を計算
    NEW.concept_count = COALESCE(
        (NEW.analysis_result->'openCoding'->>'conceptCount')::integer,
        0
    );
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 5. トリガー作成
DROP TRIGGER IF EXISTS update_grounded_theory_analyses_updated_at_trigger ON grounded_theory_analyses;
CREATE TRIGGER update_grounded_theory_analyses_updated_at_trigger
    BEFORE UPDATE ON grounded_theory_analyses
    FOR EACH ROW EXECUTE FUNCTION update_grounded_theory_analyses_updated_at();

DROP TRIGGER IF EXISTS update_grounded_theory_analyses_stats_trigger ON grounded_theory_analyses;
CREATE TRIGGER update_grounded_theory_analyses_stats_trigger
    BEFORE INSERT OR UPDATE ON grounded_theory_analyses
    FOR EACH ROW EXECUTE FUNCTION update_grounded_theory_analyses_stats();

-- 6. Row Level Security (RLS) 設定
ALTER TABLE grounded_theory_analyses ENABLE ROW LEVEL SECURITY;

-- 7. RLS ポリシー作成
-- 読み取り権限: Nestメンバーのみ
CREATE POLICY "Enable read access for nest members" ON grounded_theory_analyses
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.nest_members 
    WHERE nest_id = grounded_theory_analyses.nest_id 
    AND user_id = auth.uid()
  ));

-- 作成権限: Nestメンバーのみ
CREATE POLICY "Enable insert for nest members" ON grounded_theory_analyses
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.nest_members 
    WHERE nest_id = grounded_theory_analyses.nest_id 
    AND user_id = auth.uid()
  ));

-- 更新権限: Nestメンバーのみ
CREATE POLICY "Enable update for nest members" ON grounded_theory_analyses
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM public.nest_members 
    WHERE nest_id = grounded_theory_analyses.nest_id 
    AND user_id = auth.uid()
  ));

-- 削除権限: Nestメンバーのみ
CREATE POLICY "Enable delete for nest members" ON grounded_theory_analyses
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM public.nest_members 
    WHERE nest_id = grounded_theory_analyses.nest_id 
    AND user_id = auth.uid()
  ));

-- 8. コメント追加
COMMENT ON TABLE grounded_theory_analyses IS 'グラウンデッド・セオリー分析結果の保存・管理テーブル';
COMMENT ON COLUMN grounded_theory_analyses.analysis_result IS 'GroundedTheoryResultData をJSONBで保存';
COMMENT ON COLUMN grounded_theory_analyses.source_clusters IS '分析時のクラスター情報（ClusterLabel[]）';
COMMENT ON COLUMN grounded_theory_analyses.source_clustering_result IS '分析時のクラスタリング結果（ClusteringResult）';
COMMENT ON COLUMN grounded_theory_analyses.hypothesis_count IS '仮説数（自動計算）';
COMMENT ON COLUMN grounded_theory_analyses.confidence_average IS '平均信頼度（自動計算）';
COMMENT ON COLUMN grounded_theory_analyses.concept_count IS '概念数（自動計算）';
