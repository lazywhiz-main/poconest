-- クラスタービュー管理テーブルの作成
-- 分析スペースでのクラスタリング結果の保存・管理機能

CREATE TABLE cluster_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL,
  nest_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  
  -- クラスター表示データ（既存形式をJSONBで保存）
  cluster_labels JSONB NOT NULL,           -- ClusterLabel[] 配列
  smart_clustering_result JSONB NOT NULL,  -- ClusteringResult オブジェクト
  filtered_clusters JSONB NOT NULL,        -- string[][] 配列
  
  -- 描画・ビジュアル状態
  node_positions JSONB NOT NULL,           -- { [nodeId: string]: { x: number, y: number } }
  show_filtered_clusters BOOLEAN NOT NULL DEFAULT true,
  show_labels BOOLEAN NOT NULL DEFAULT true,
  
  -- メタデータ
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID NOT NULL,
  
  -- 制約
  CONSTRAINT cluster_views_name_not_empty CHECK (length(trim(name)) > 0),
  CONSTRAINT cluster_views_cluster_labels_valid CHECK (jsonb_typeof(cluster_labels) = 'array'),
  CONSTRAINT cluster_views_smart_clustering_result_valid CHECK (jsonb_typeof(smart_clustering_result) = 'object'),
  CONSTRAINT cluster_views_filtered_clusters_valid CHECK (jsonb_typeof(filtered_clusters) = 'array'),
  CONSTRAINT cluster_views_node_positions_valid CHECK (jsonb_typeof(node_positions) = 'object'),
  
  -- 外部キー制約
  CONSTRAINT fk_cluster_views_board FOREIGN KEY (board_id) REFERENCES public.boards(id) ON DELETE CASCADE,
  CONSTRAINT fk_cluster_views_nest FOREIGN KEY (nest_id) REFERENCES public.nests(id) ON DELETE CASCADE,
  CONSTRAINT fk_cluster_views_created_by FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- インデックス
CREATE INDEX idx_cluster_views_board_id ON cluster_views(board_id);
CREATE INDEX idx_cluster_views_nest_id ON cluster_views(nest_id);
CREATE INDEX idx_cluster_views_created_at ON cluster_views(created_at DESC);
CREATE INDEX idx_cluster_views_created_by ON cluster_views(created_by);

-- updated_at の自動更新トリガー
CREATE OR REPLACE FUNCTION update_cluster_views_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_cluster_views_updated_at
  BEFORE UPDATE ON cluster_views
  FOR EACH ROW
  EXECUTE FUNCTION update_cluster_views_updated_at();

-- RLS (Row Level Security) の設定
ALTER TABLE cluster_views ENABLE ROW LEVEL SECURITY;

-- ポリシー: ユーザーは自分が作成したビューのみアクセス可能
CREATE POLICY "Users can view own cluster views" ON cluster_views
  FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Users can insert own cluster views" ON cluster_views
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own cluster views" ON cluster_views
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete own cluster views" ON cluster_views
  FOR DELETE USING (auth.uid() = created_by);

-- コメント
COMMENT ON TABLE cluster_views IS 'クラスタリング結果の保存・管理テーブル';
COMMENT ON COLUMN cluster_views.cluster_labels IS 'ClusterLabel[] - 左下フィルター領域表示用データ';
COMMENT ON COLUMN cluster_views.smart_clustering_result IS 'ClusteringResult - SmartClusteringServiceの完全な結果';
COMMENT ON COLUMN cluster_views.filtered_clusters IS 'string[][] - フィルタリングされたクラスター配列';
COMMENT ON COLUMN cluster_views.node_positions IS 'ノード位置情報 { [nodeId: string]: { x: number, y: number } }';
COMMENT ON COLUMN cluster_views.show_filtered_clusters IS 'フィルタ済みクラスター表示状態';
COMMENT ON COLUMN cluster_views.show_labels IS 'ラベル表示状態';
