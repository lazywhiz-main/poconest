-- AI使用量ログテーブル
CREATE TABLE ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nest_id UUID REFERENCES nests(id) ON DELETE CASCADE,
  
  -- AI機能識別
  feature_type VARCHAR(50) NOT NULL CHECK (feature_type IN ('chat_analysis', 'meeting_summary', 'card_extraction', 'embedding', 'relationship_analysis')),
  provider VARCHAR(20) NOT NULL CHECK (provider IN ('openai', 'gemini')),
  model VARCHAR(50) NOT NULL,
  
  -- トークン使用量
  input_tokens INTEGER NOT NULL DEFAULT 0 CHECK (input_tokens >= 0),
  output_tokens INTEGER NOT NULL DEFAULT 0 CHECK (output_tokens >= 0),
  total_tokens INTEGER NOT NULL DEFAULT 0 CHECK (total_tokens >= 0),
  
  -- コスト計算
  estimated_cost_usd DECIMAL(10, 6) NOT NULL DEFAULT 0.0 CHECK (estimated_cost_usd >= 0),
  
  -- メタデータ
  request_metadata JSONB,
  response_metadata JSONB,
  
  -- 関連エンティティ
  chat_room_id UUID,
  meeting_id UUID,
  board_id UUID,
  
  -- タイムスタンプ
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- インデックス用
  date_key DATE NOT NULL DEFAULT CURRENT_DATE
);

-- AI使用量集計テーブル (将来の最適化用)
CREATE TABLE ai_usage_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nest_id UUID REFERENCES nests(id) ON DELETE CASCADE,
  
  -- 集計期間
  period_type VARCHAR(10) NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly')),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- 集計データ
  total_tokens INTEGER NOT NULL DEFAULT 0 CHECK (total_tokens >= 0),
  total_cost_usd DECIMAL(10, 4) NOT NULL DEFAULT 0.0 CHECK (total_cost_usd >= 0),
  feature_breakdown JSONB NOT NULL DEFAULT '{}',
  provider_breakdown JSONB NOT NULL DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, nest_id, period_type, period_start)
);

-- total_tokensとdate_keyを自動計算するトリガー関数
CREATE OR REPLACE FUNCTION calculate_ai_usage_fields()
RETURNS TRIGGER AS $$
BEGIN
    -- total_tokensを計算
    NEW.total_tokens = NEW.input_tokens + NEW.output_tokens;
    
    -- date_keyを設定（created_atから日付部分を抽出）
    NEW.date_key = DATE(NEW.created_at);
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- トリガーを作成
CREATE TRIGGER calculate_ai_usage_fields_trigger
BEFORE INSERT OR UPDATE ON ai_usage_logs
FOR EACH ROW EXECUTE FUNCTION calculate_ai_usage_fields();

-- インデックス作成
CREATE INDEX idx_ai_usage_logs_user_date ON ai_usage_logs(user_id, date_key);
CREATE INDEX idx_ai_usage_logs_nest_date ON ai_usage_logs(nest_id, date_key) WHERE nest_id IS NOT NULL;
CREATE INDEX idx_ai_usage_logs_feature ON ai_usage_logs(feature_type, created_at);
CREATE INDEX idx_ai_usage_logs_provider ON ai_usage_logs(provider, created_at);
CREATE INDEX idx_ai_usage_logs_created_at ON ai_usage_logs(created_at);

-- 集計テーブル用インデックス
CREATE INDEX idx_ai_usage_summaries_user_period ON ai_usage_summaries(user_id, period_type, period_start);
CREATE INDEX idx_ai_usage_summaries_nest_period ON ai_usage_summaries(nest_id, period_type, period_start) WHERE nest_id IS NOT NULL;

-- RLS (Row Level Security) ポリシー設定
ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_summaries ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のログのみ閲覧可能
CREATE POLICY "Users can view own AI usage logs" ON ai_usage_logs
FOR SELECT USING (auth.uid() = user_id);

-- ユーザーは自分のサマリーのみ閲覧可能  
CREATE POLICY "Users can view own AI usage summaries" ON ai_usage_summaries
FOR SELECT USING (auth.uid() = user_id);

-- システムがログを挿入可能（サービスロール）
CREATE POLICY "Service can insert AI usage logs" ON ai_usage_logs
FOR INSERT WITH CHECK (true);

-- システムがサマリーを更新可能（サービスロール）
CREATE POLICY "Service can manage AI usage summaries" ON ai_usage_summaries
FOR ALL WITH CHECK (true);

-- 更新日時を自動更新するトリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_ai_usage_summaries_updated_at 
BEFORE UPDATE ON ai_usage_summaries 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- コメント追加
COMMENT ON TABLE ai_usage_logs IS 'AI機能の使用量ログを記録するテーブル';
COMMENT ON TABLE ai_usage_summaries IS 'AI使用量の集計データを格納するテーブル（パフォーマンス最適化用）';

COMMENT ON COLUMN ai_usage_logs.feature_type IS 'AI機能の種類 (chat_analysis, meeting_summary, card_extraction, embedding, relationship_analysis)';
COMMENT ON COLUMN ai_usage_logs.provider IS 'AIプロバイダー (openai, gemini)';
COMMENT ON COLUMN ai_usage_logs.model IS '使用されたAIモデル名';
COMMENT ON COLUMN ai_usage_logs.input_tokens IS '入力トークン数';
COMMENT ON COLUMN ai_usage_logs.output_tokens IS '出力トークン数';
COMMENT ON COLUMN ai_usage_logs.total_tokens IS '合計トークン数（トリガーで自動計算）';
COMMENT ON COLUMN ai_usage_logs.estimated_cost_usd IS '推定コスト（USD）';
COMMENT ON COLUMN ai_usage_logs.request_metadata IS 'リクエストのメタデータ（JSON形式）';
COMMENT ON COLUMN ai_usage_logs.response_metadata IS 'レスポンスのメタデータ（JSON形式）';
COMMENT ON COLUMN ai_usage_logs.date_key IS 'パーティショニング・インデックス用の日付キー（トリガーで自動計算）'; 