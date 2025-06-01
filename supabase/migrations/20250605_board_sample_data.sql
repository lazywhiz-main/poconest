-- NESTサンプル
INSERT INTO public.nests (id, name, owner_id, created_at) VALUES ('00000000-0000-0000-0000-000000000001', 'サンプルNEST', '00000000-0000-0000-0000-000000000100', NOW()) ON CONFLICT DO NOTHING;

-- BOARDサンプル
INSERT INTO public.boards (id, name, nest_id, created_at, updated_at) VALUES ('00000000-0000-0000-0000-000000000010', 'サンプルBOARD', '00000000-0000-0000-0000-000000000001', NOW(), NOW()) ON CONFLICT DO NOTHING;

-- BOARD_CARDサンプル
INSERT INTO public.board_cards (id, board_id, title, content, column_type, order_index, created_by, created_at, updated_at) VALUES ('00000000-0000-0000-0000-000000000100', '00000000-0000-0000-0000-000000000010', 'サンプルカード', 'これはサンプルカードです', 'todo', 1, '00000000-0000-0000-0000-000000000100', NOW(), NOW()) ON CONFLICT DO NOTHING;

-- BOARD_ITEMサンプル
INSERT INTO public.board_items (id, space_id, user_id, type, title, content, position, created_at, updated_at) VALUES ('00000000-0000-0000-0000-000000001000', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000100', 'card', 'サンプルアイテム', 'サンプルアイテムの内容', 0, NOW(), NOW()) ON CONFLICT DO NOTHING; 