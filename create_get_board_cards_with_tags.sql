CREATE OR REPLACE FUNCTION public.get_board_cards_with_tags(board_id uuid)
RETURNS TABLE (
  id uuid,
  board_id uuid,
  title text,
  content text,
  column_type text,
  order_index int4,
  is_archived bool,
  created_by uuid,
  created_at timestamp,
  updated_at timestamp,
  updated_by uuid,
  source_message_id uuid,
  metadata jsonb,
  tags text[],
  sources jsonb[]
) AS $$
  SELECT
    c.id, c.board_id, c.title, c.content, c.column_type, c.order_index, c.is_archived, c.created_by, c.created_at, c.updated_at, c.updated_by, c.source_message_id, c.metadata,
    ARRAY_REMOVE(ARRAY_AGG(t.tag), NULL) AS tags,
    ARRAY_REMOVE(ARRAY_AGG(
      CASE WHEN s.id IS NOT NULL THEN jsonb_build_object(
        'id', s.id,
        'type', s.type,
        'url', s.url,
        'label', s.label,
        'meta', s.meta
      ) ELSE NULL END
    ), NULL) AS sources
  FROM board_cards c
  LEFT JOIN board_card_tags t ON c.id = t.card_id
  LEFT JOIN board_card_sources bcs ON c.id = bcs.card_id
  LEFT JOIN sources s ON bcs.source_id = s.id
  WHERE c.board_id = board_id
  GROUP BY c.id
$$ LANGUAGE sql STABLE; 