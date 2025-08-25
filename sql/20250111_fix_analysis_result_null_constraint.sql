-- analysis_result カラムのNOT NULL制約を解除
-- 理論的サンプリング分析では analysis_result が NULL の場合があるため
-- 実行日: 2025-01-11

-- 1. analysis_result カラムをNULL許可に変更
ALTER TABLE grounded_theory_analyses 
ALTER COLUMN analysis_result DROP NOT NULL;

-- 2. 統計情報更新関数を修正（エラー回避）
CREATE OR REPLACE FUNCTION update_grounded_theory_analyses_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- デフォルト値を初期化
  NEW.hypothesis_count = COALESCE(NEW.hypothesis_count, 0);
  NEW.confidence_average = COALESCE(NEW.confidence_average, 0.0);
  NEW.concept_count = COALESCE(NEW.concept_count, 0);

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
      NEW.concept_count
    );
  END IF;
  
  -- 概念分析の場合の統計情報更新
  IF NEW.concept_analysis_result IS NOT NULL THEN
    -- 概念詳細から概念数を取得
    NEW.concept_count = COALESCE(
      jsonb_array_length(NEW.concept_analysis_result->'conceptDetails'),
      NEW.concept_count
    );
    
    -- 概念の平均信頼度を計算
    NEW.confidence_average = COALESCE(
      (
        SELECT AVG((concept->>'confidence')::DECIMAL)
        FROM jsonb_array_elements(NEW.concept_analysis_result->'conceptDetails') AS concept
        WHERE concept->>'confidence' IS NOT NULL
      )::DECIMAL(3,2),
      NEW.confidence_average
    );
  END IF;
  
  -- 理論的サンプリング分析の場合の統計情報更新
  IF NEW.theoretical_sampling_analysis IS NOT NULL THEN
    -- 理論的サンプリング分析固有の統計を設定
    NEW.concept_count = COALESCE(
      (NEW.theoretical_sampling_analysis->'samplingProgress'->>'conceptsDiscovered')::integer,
      NEW.concept_count
    );
    
    -- 飽和スコアを信頼度として使用
    NEW.confidence_average = COALESCE(
      (NEW.theoretical_sampling_analysis->'saturationAnalysis'->>'saturationScore')::DECIMAL(3,2),
      NEW.confidence_average
    );
  END IF;
  
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. コメント追加
COMMENT ON COLUMN grounded_theory_analyses.analysis_result IS '基本GTA分析結果（GroundedTheoryResultData をJSONBで保存、理論的サンプリング分析等ではNULL可）';
