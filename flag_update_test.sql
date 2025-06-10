-- フラグ更新SQL確認用の例文

-- 1. テーブル構造確認
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'board_cards' 
AND column_name IN ('is_relationship_analyzed', 'last_relationship_analysis_at')
ORDER BY ordinal_position;

-- 2. 修正された更新トリガー関数
CREATE OR REPLACE FUNCTION reset_analysis_flag() 
RETURNS TRIGGER AS $$
BEGIN
  IF (OLD.title != NEW.title OR 
      OLD.content != NEW.content OR 
      OLD.column_type != NEW.column_type) THEN
    NEW.is_relationship_analyzed = FALSE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. トリガーの作成（存在しない場合）
DROP TRIGGER IF EXISTS reset_analysis_flag_trigger ON board_cards;
CREATE TRIGGER reset_analysis_flag_trigger
  BEFORE UPDATE ON board_cards
  FOR EACH ROW EXECUTE FUNCTION reset_analysis_flag();

-- 4. トリガー確認
SELECT trigger_name, event_manipulation, action_statement 
FROM information_schema.triggers 
WHERE event_object_table = 'board_cards';

-- 5. 実際のフラグ更新テスト（1件のみ）
UPDATE board_cards 
SET is_relationship_analyzed = true, 
    last_relationship_analysis_at = NOW() 
WHERE id = (SELECT id FROM board_cards LIMIT 1)
RETURNING id, is_relationship_analyzed, last_relationship_analysis_at;

-- 6. 現在のフラグ状態確認
SELECT id, title, is_relationship_analyzed, last_relationship_analysis_at 
FROM board_cards 
ORDER BY created_at DESC 
LIMIT 5;

-- 7. リレーション確認
SELECT COUNT(*) as total_relations FROM board_card_relations;

-- 8. 最新のリレーション詳細確認
SELECT bcr.*, 
       bc1.title as source_title, 
       bc2.title as target_title
FROM board_card_relations bcr
LEFT JOIN board_cards bc1 ON bcr.card_id = bc1.id
LEFT JOIN board_cards bc2 ON bcr.related_card_id = bc2.id
ORDER BY bcr.created_at DESC 
LIMIT 10; 