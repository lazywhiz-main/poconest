-- AI関係性タイプをサポートするためのテーブル更新

-- 既存のrelationship_type制約があれば削除
ALTER TABLE board_card_relations DROP CONSTRAINT IF EXISTS board_card_relations_relationship_type_check;

-- 新しい制約を追加（aiタイプを含む）
ALTER TABLE board_card_relations 
ADD CONSTRAINT board_card_relations_relationship_type_check 
CHECK (relationship_type IN ('manual', 'semantic', 'derived', 'tag_similarity', 'ai'));

-- 既存のマニュアル関係性のmetadataにsource情報を追加（参考用）
UPDATE board_card_relations 
SET metadata = COALESCE(metadata, '{}'::jsonb) || '{"source": "manual"}'::jsonb 
WHERE relationship_type = 'manual' 
AND (metadata IS NULL OR NOT metadata ? 'source');

-- インデックスがない場合は作成
CREATE INDEX IF NOT EXISTS idx_board_card_relations_type ON board_card_relations(relationship_type);

-- AI関係性の統計用ビュー（オプション）
CREATE OR REPLACE VIEW ai_relationship_stats AS
SELECT 
  relationship_type,
  COUNT(*) as count,
  AVG(strength) as avg_strength,
  AVG(confidence) as avg_confidence
FROM board_card_relations 
GROUP BY relationship_type
ORDER BY count DESC; 