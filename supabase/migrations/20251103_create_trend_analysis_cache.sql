-- 分析結果キャッシュテーブル
CREATE TABLE IF NOT EXISTS trend_analysis_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nest_id UUID NOT NULL,
  analyzed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  patterns JSONB NOT NULL DEFAULT '[]'::jsonb,
  brand_analysis JSONB NOT NULL DEFAULT '[]'::jsonb,
  category_analysis JSONB NOT NULL DEFAULT '[]'::jsonb,
  weekly_stats JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (nest_id) REFERENCES nests(id) ON DELETE CASCADE
);

-- nest_idごとに最新1件のみ保持（UNIQUE制約）
CREATE UNIQUE INDEX IF NOT EXISTS idx_trend_analysis_cache_nest_id ON trend_analysis_cache (nest_id);

-- RLS有効化
ALTER TABLE trend_analysis_cache ENABLE ROW LEVEL SECURITY;

-- RLSポリシー: 自分のnestのみアクセス可能
CREATE POLICY "Users can read their own nest analysis cache"
  ON trend_analysis_cache
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM nest_members
      WHERE nest_members.nest_id = trend_analysis_cache.nest_id
        AND nest_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own nest analysis cache"
  ON trend_analysis_cache
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM nest_members
      WHERE nest_members.nest_id = trend_analysis_cache.nest_id
        AND nest_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own nest analysis cache"
  ON trend_analysis_cache
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM nest_members
      WHERE nest_members.nest_id = trend_analysis_cache.nest_id
        AND nest_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own nest analysis cache"
  ON trend_analysis_cache
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM nest_members
      WHERE nest_members.nest_id = trend_analysis_cache.nest_id
        AND nest_members.user_id = auth.uid()
    )
  );

