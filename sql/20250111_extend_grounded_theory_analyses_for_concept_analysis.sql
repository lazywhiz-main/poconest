-- grounded_theory_analyses テーブル拡張
-- 概念分析と理論的サンプリング分析結果の保存に対応
-- 実行日: 2025-01-11

-- 1. 既存テーブルに新しいカラムを追加
ALTER TABLE grounded_theory_analyses 
ADD COLUMN IF NOT EXISTS concept_analysis_result JSONB,
ADD COLUMN IF NOT EXISTS theoretical_sampling_analysis JSONB,
ADD COLUMN IF NOT EXISTS sampling_criteria JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS analysis_type VARCHAR(50) DEFAULT 'basic_gta' CHECK (analysis_type IN ('basic_gta', 'enhanced_gta', 'concept_analysis', 'theoretical_sampling'));

-- 2. 新しいカラム用のインデックス追加
CREATE INDEX IF NOT EXISTS idx_grounded_theory_analyses_concept_analysis_gin 
ON grounded_theory_analyses USING GIN (concept_analysis_result);

CREATE INDEX IF NOT EXISTS idx_grounded_theory_analyses_sampling_analysis_gin 
ON grounded_theory_analyses USING GIN (theoretical_sampling_analysis);

CREATE INDEX IF NOT EXISTS idx_grounded_theory_analyses_analysis_type 
ON grounded_theory_analyses(analysis_type);

-- 3. 統計情報更新関数を拡張
CREATE OR REPLACE FUNCTION update_grounded_theory_analyses_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- hypothesis_count の更新（基本GTA分析）
  IF NEW.analysis_result IS NOT NULL THEN
    NEW.hypothesis_count = COALESCE(
      jsonb_array_length(NEW.analysis_result->'hypotheses'), 
      0
    );
    
    -- confidence_average の計算
    NEW.confidence_average = COALESCE(
      (
        SELECT AVG((elem->>'confidence')::DECIMAL)
        FROM jsonb_array_elements(NEW.analysis_result->'hypotheses') AS elem
        WHERE elem->>'confidence' IS NOT NULL
      )::DECIMAL(3,2),
      0.0
    );
    
    -- concept_count の更新
    NEW.concept_count = COALESCE(
      (NEW.analysis_result->'openCoding'->>'conceptCount')::integer,
      0
    );
  END IF;
  
  -- 概念分析の場合の統計情報更新
  IF NEW.concept_analysis_result IS NOT NULL THEN
    -- 概念詳細から概念数を取得
    NEW.concept_count = COALESCE(
      jsonb_array_length(NEW.concept_analysis_result->'conceptDetails'),
      NEW.concept_count  -- 既存値を保持
    );
    
    -- 概念の平均信頼度を計算
    NEW.confidence_average = COALESCE(
      (
        SELECT AVG((concept->>'confidence')::DECIMAL)
        FROM jsonb_array_elements(NEW.concept_analysis_result->'conceptDetails') AS concept
        WHERE concept->>'confidence' IS NOT NULL
      )::DECIMAL(3,2),
      NEW.confidence_average  -- 既存値を保持
    );
  END IF;
  
  -- 理論的サンプリング分析の場合の統計情報更新
  IF NEW.theoretical_sampling_analysis IS NOT NULL THEN
    -- サンプリングラウンド数やその他の統計を更新可能
    -- 必要に応じて後で拡張
  END IF;
  
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. コメント追加
COMMENT ON COLUMN grounded_theory_analyses.concept_analysis_result IS '概念分析結果（ConceptAnalysis をJSONBで保存）';
COMMENT ON COLUMN grounded_theory_analyses.theoretical_sampling_analysis IS '理論的サンプリング分析結果（TheoreticalSamplingAnalysis をJSONBで保存）';
COMMENT ON COLUMN grounded_theory_analyses.sampling_criteria IS '理論的サンプリングの判定基準（SamplingCriteria をJSONBで保存）';
COMMENT ON COLUMN grounded_theory_analyses.analysis_type IS '分析タイプ（basic_gta, enhanced_gta, concept_analysis, theoretical_sampling）';
