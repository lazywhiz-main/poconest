-- 既存のaiタイプ関係性を適切なタイプに変換するマイグレーション

-- Step 1: 現在のaiタイプ関係性の統計を確認
DO $$
BEGIN
    RAISE NOTICE 'Current AI relationship count: %', (
        SELECT COUNT(*) FROM board_card_relations WHERE relationship_type = 'ai'
    );
END $$;

-- Step 2: メタデータのoriginalAiTypeに基づいて変換
-- topical -> tag_similarity
UPDATE board_card_relations 
SET 
    relationship_type = 'tag_similarity',
    metadata = metadata || jsonb_build_object(
        'migratedFrom', 'ai',
        'migratedAt', NOW()::text,
        'migrationReason', 'Original AI type: topical'
    ),
    updated_at = NOW()
WHERE relationship_type = 'ai' 
  AND metadata->>'originalAiType' = 'topical';

-- conceptual -> semantic  
UPDATE board_card_relations 
SET 
    relationship_type = 'semantic',
    metadata = metadata || jsonb_build_object(
        'migratedFrom', 'ai',
        'migratedAt', NOW()::text,
        'migrationReason', 'Original AI type: conceptual'
    ),
    updated_at = NOW()
WHERE relationship_type = 'ai' 
  AND metadata->>'originalAiType' = 'conceptual';

-- semantic -> semantic
UPDATE board_card_relations 
SET 
    relationship_type = 'semantic',
    metadata = metadata || jsonb_build_object(
        'migratedFrom', 'ai',
        'migratedAt', NOW()::text,
        'migrationReason', 'Original AI type: semantic'
    ),
    updated_at = NOW()
WHERE relationship_type = 'ai' 
  AND metadata->>'originalAiType' = 'semantic';

-- Step 3: originalAiTypeがないものを推論で変換
-- 同じカラムタイプ同士は derived に変換
UPDATE board_card_relations 
SET 
    relationship_type = 'derived',
    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
        'migratedFrom', 'ai',
        'migratedAt', NOW()::text,
        'migrationReason', 'Inferred: same column type'
    ),
    updated_at = NOW()
WHERE relationship_type = 'ai' 
  AND metadata->>'originalAiType' IS NULL
  AND EXISTS (
    SELECT 1 FROM board_cards bc1, board_cards bc2 
    WHERE bc1.id = card_id 
      AND bc2.id = related_card_id 
      AND bc1.column_type = bc2.column_type
  );

-- Step 4: 残りのaiタイプを semantic に変換（デフォルト）
UPDATE board_card_relations 
SET 
    relationship_type = 'semantic',
    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
        'migratedFrom', 'ai',
        'migratedAt', NOW()::text,
        'migrationReason', 'Default conversion to semantic'
    ),
    updated_at = NOW()
WHERE relationship_type = 'ai';

-- Step 5: 変換結果の統計を表示
DO $$
DECLARE
    semantic_count INTEGER;
    tag_similarity_count INTEGER;
    derived_count INTEGER;
    remaining_ai_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO semantic_count 
    FROM board_card_relations 
    WHERE relationship_type = 'semantic' 
      AND metadata->>'migratedFrom' = 'ai';
    
    SELECT COUNT(*) INTO tag_similarity_count 
    FROM board_card_relations 
    WHERE relationship_type = 'tag_similarity' 
      AND metadata->>'migratedFrom' = 'ai';
    
    SELECT COUNT(*) INTO derived_count 
    FROM board_card_relations 
    WHERE relationship_type = 'derived' 
      AND metadata->>'migratedFrom' = 'ai';
      
    SELECT COUNT(*) INTO remaining_ai_count 
    FROM board_card_relations 
    WHERE relationship_type = 'ai';

    RAISE NOTICE 'Migration completed:';
    RAISE NOTICE '  -> semantic: % relationships', semantic_count;
    RAISE NOTICE '  -> tag_similarity: % relationships', tag_similarity_count;
    RAISE NOTICE '  -> derived: % relationships', derived_count;
    RAISE NOTICE '  -> remaining ai: % relationships', remaining_ai_count;
END $$;

-- Step 6: 統計ビューを更新
DROP VIEW IF EXISTS ai_relationship_stats;
CREATE OR REPLACE VIEW relationship_stats AS
SELECT 
    relationship_type,
    COUNT(*) as count,
    ROUND(AVG(strength)::numeric, 3) as avg_strength,
    ROUND(AVG(confidence)::numeric, 3) as avg_confidence,
    COUNT(*) FILTER (WHERE metadata->>'migratedFrom' = 'ai') as migrated_from_ai_count
FROM board_card_relations 
GROUP BY relationship_type
ORDER BY count DESC;

-- 変換後の統計を表示
SELECT * FROM relationship_stats; 