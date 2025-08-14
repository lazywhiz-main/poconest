-- Unified関係性タイプを追加

-- 既存のrelationship_type制約を削除
ALTER TABLE board_card_relations DROP CONSTRAINT IF EXISTS board_card_relations_relationship_type_check;

-- 新しい制約を追加（unifiedタイプを含む）
ALTER TABLE board_card_relations 
ADD CONSTRAINT board_card_relations_relationship_type_check 
CHECK (relationship_type IN ('manual', 'semantic', 'derived', 'tag_similarity', 'ai', 'unified'));

-- Unified関係性の統計用ビューを更新
CREATE OR REPLACE VIEW ai_relationship_stats AS
SELECT 
  relationship_type,
  COUNT(*) as count,
  AVG(strength) as avg_strength,
  AVG(confidence) as avg_confidence
FROM board_card_relations 
GROUP BY relationship_type
ORDER BY count DESC;
