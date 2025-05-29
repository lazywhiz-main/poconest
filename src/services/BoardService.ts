import { supabase } from './supabase/client';
import type { Database } from '@/types/supabase';

// 型定義
export type BoardCard = Database['public']['Tables']['board_cards']['Row'];
export type BoardCardInsert = Database['public']['Tables']['board_cards']['Insert'];
export type Source = Database['public']['Tables']['sources']['Row'];
export type SourceInsert = Database['public']['Tables']['sources']['Insert'];
export type BoardCardSource = Database['public']['Tables']['board_card_sources']['Row'];
export type BoardCardSourceInsert = Database['public']['Tables']['board_card_sources']['Insert'];

// ボード内のカード一覧取得
export async function getBoardCards(boardId: string) {
  return supabase
    .from('board_cards')
    .select('*')
    .eq('board_id', boardId)
    .order('order_index', { ascending: true });
}

// カード作成
export async function addBoardCard(card: BoardCardInsert) {
  return supabase
    .from('board_cards')
    .insert([card])
    .select()
    .single();
}

// 複数カード作成
export async function addBoardCards(cards: BoardCardInsert[]) {
  return supabase
    .from('board_cards')
    .insert(cards)
    .select();
}

// カード更新
export async function updateBoardCard(id: string, update: Partial<BoardCardInsert>) {
  return supabase
    .from('board_cards')
    .update(update)
    .eq('id', id)
    .select()
    .single();
}

// 元ソースサジェスト
export async function suggestSources(query: string) {
  return supabase
    .from('sources')
    .select('*')
    .ilike('label', `%${query}%`)
    .limit(10);
}

// 元ソース作成
export async function addSource(source: SourceInsert) {
  return supabase
    .from('sources')
    .insert([source])
    .select()
    .single();
}

// カードと元ソースの紐付け取得
export async function getCardSources(cardId: string) {
  return supabase
    .from('board_card_sources')
    .select('*, sources(*)')
    .eq('card_id', cardId);
}

// カードと元ソースの紐付け作成
export async function addCardSource(link: BoardCardSourceInsert) {
  return supabase
    .from('board_card_sources')
    .insert([link])
    .select()
    .single();
}

// カード＋タグ一覧取得
export async function getBoardCardsWithTags(boardId: string) {
  // Supabaseのrpc（カスタム関数）を呼び出す想定
  // 事前にSQLで以下のような関数を作成しておく:
  // CREATE OR REPLACE FUNCTION public.get_board_cards_with_tags(board_id uuid)
  // RETURNS TABLE (
  //   id uuid,
  //   board_id uuid,
  //   title text,
  //   content text,
  //   column_type text,
  //   order_index int4,
  //   is_archived bool,
  //   created_by uuid,
  //   created_at timestamp,
  //   updated_at timestamp,
  //   updated_by uuid,
  //   source_message_id uuid,
  //   metadata jsonb,
  //   tags text[],
  //   insights jsonb[],
  //   themes jsonb[]
  // ) AS $$
  //   WITH card_tags AS (
  //     SELECT card_id, ARRAY_AGG(tag) as tags
  //     FROM board_card_tags
  //     GROUP BY card_id
  //   ),
  //   card_insights AS (
  //     SELECT card_id, ARRAY_AGG(jsonb_build_object('id', i.id, 'title', i.title)) as insights
  //     FROM board_card_insights ci
  //     JOIN insights i ON ci.insight_id = i.id
  //     GROUP BY card_id
  //   ),
  //   card_themes AS (
  //     SELECT card_id, ARRAY_AGG(jsonb_build_object('id', t.id, 'title', t.title)) as themes
  //     FROM board_card_themes ct
  //     JOIN themes t ON ct.theme_id = t.id
  //     GROUP BY card_id
  //   )
  //   SELECT 
  //     c.*,
  //     COALESCE(ct.tags, ARRAY[]::text[]) as tags,
  //     COALESCE(ci.insights, ARRAY[]::jsonb[]) as insights,
  //     COALESCE(ct2.themes, ARRAY[]::jsonb[]) as themes
  //   FROM board_cards c
  //   LEFT JOIN card_tags ct ON c.id = ct.card_id
  //   LEFT JOIN card_insights ci ON c.id = ci.card_id
  //   LEFT JOIN card_themes ct2 ON c.id = ct2.card_id
  //   WHERE c.board_id = board_id
  // $$ LANGUAGE sql STABLE;
  return supabase.rpc('get_board_cards_with_tags', { board_id: boardId });
} 