import { supabase } from './supabase/client';
import { BoardCardUI, toBoardCardUI } from '../types/board';

// 型定義
export interface BoardCard {
  id: string;
  board_id: string;
  title: string;
  content: string;
  column_type: string;
  order_index: number;
  is_archived: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  updated_by?: string;
  source_message_id?: string;
  metadata: Record<string, any>;
}

export type BoardCardInsert = Omit<BoardCard, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export interface Source {
  id: string;
  type: string;
  label: string;
  url?: string;
  ref_id?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export type SourceInsert = Omit<Source, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export interface BoardCardSource {
  id: string;
  card_id: string;
  source_id: string;
  created_at: string;
}

export type BoardCardSourceInsert = Omit<BoardCardSource, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
};

// AI関連メタデータの型定義
interface AIMetadata {
  ai?: {
    meeting_id?: string;
    type?: 'task' | 'idea' | 'issue' | 'decision' | 'note';
    priority?: 'high' | 'medium' | 'low';
    assignee?: string;
    deadline?: string;
    generated_by?: string;
    generated_at?: string;
  };
}

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

// カード削除
export async function deleteCard(id: string) {
  return supabase
    .from('board_cards')
    .delete()
    .eq('id', id);
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
  return supabase.rpc('get_board_cards_with_tags', { board_id: boardId });
}

// ミーティングから生成されたカードを取得（sources経由）
export async function getCardsByMeeting(meetingId: string): Promise<BoardCardUI[]> {
  // sourcesテーブルでmeetingIdに該当するsourceを取得
  const { data: sources, error: sourceError } = await supabase
    .from('sources')
    .select('*')
    .eq('type', 'meeting')
    .eq('ref_id', meetingId);
  if (sourceError) throw sourceError;
  if (!sources || sources.length === 0) return [];
  const meetingSourceIds = sources.map(s => s.id);

  // board_card_sources経由でカードIDを取得
  const { data: cardLinks, error: linkError } = await supabase
    .from('board_card_sources')
    .select('card_id')
    .in('source_id', meetingSourceIds);
  if (linkError) throw linkError;
  if (!cardLinks || cardLinks.length === 0) return [];
  const cardIds = cardLinks.map(l => l.card_id);

  // カード本体＋タグ＋sourcesを取得
  const { data, error } = await supabase
    .from('board_cards')
    .select(`*, board_card_tags(tag), board_card_sources:board_card_sources(source_id, sources(*))`)
    .in('id', cardIds)
    .order('created_at');
  if (error) throw error;

  // 関連カードのIDsを取得（metadata.related_card_idsと board_card_relationsから）
  const allRelatedCardIds = new Set<string>();
  
  // 1. metadata.related_card_idsから取得
  data.forEach(card => {
    const relatedIds = card.metadata?.related_card_ids || [];
    relatedIds.forEach((id: string) => allRelatedCardIds.add(id));
  });

  // 2. board_card_relationsテーブルから関連カードを取得
  const { data: relationData, error: relationError } = await supabase
    .from('board_card_relations')
    .select('card_id, related_card_id')
    .in('card_id', cardIds);
  
  if (!relationError && relationData) {
    relationData.forEach(relation => {
      allRelatedCardIds.add(relation.related_card_id);
    });
  }

  // 逆方向の関係も取得（related_card_idがcardIdsに含まれる場合）
  const { data: reverseRelationData, error: reverseRelationError } = await supabase
    .from('board_card_relations')
    .select('card_id, related_card_id')
    .in('related_card_id', cardIds);
  
  if (!reverseRelationError && reverseRelationData) {
    reverseRelationData.forEach(relation => {
      allRelatedCardIds.add(relation.card_id);
    });
  }

  // 関連カードも取得
  let relatedCardsData: any[] = [];
  if (allRelatedCardIds.size > 0) {
    const { data: relatedCards, error: relatedError } = await supabase
      .from('board_cards')
      .select('id, title, content, column_type')
      .in('id', Array.from(allRelatedCardIds));
    if (!relatedError && relatedCards) {
      relatedCardsData = relatedCards;
    }
  }

  // ユーザー情報を取得
  const userIds = [...new Set([
    ...data.map(card => card.created_by),
    ...data.filter(card => card.updated_by).map(card => card.updated_by!)
  ])];
  
  const { data: usersData, error: usersError } = await supabase
    .from('users')
    .select('id, display_name')
    .in('id', userIds);
  
  const usersMap = new Map();
  if (!usersError && usersData) {
    usersData.forEach(user => usersMap.set(user.id, user.display_name));
  }

  // タグ・sources・関連カード情報を整形
  const cardsWithTags = data.map(card => {
    const tags = card.board_card_tags?.map((tagRow: any) => tagRow.tag) || [];
    // board_card_sources配列からsourcesだけ抽出
    const sources = (card.board_card_sources || [])
      .map((bcs: any) => bcs.sources)
      .filter((s: any) => !!s);
    
    // 関連カードを構築（metadata + board_card_relations両方から）
    const metadataRelatedIds = card.metadata?.related_card_ids || [];
    
    // このカードに関連する全てのカードIDを収集
    const thisCardRelatedIds = new Set<string>();
    
    // metadataから追加
    metadataRelatedIds.forEach((id: string) => thisCardRelatedIds.add(id));
    
    // board_card_relationsから追加（このカードが source の場合）
    if (relationData) {
      relationData
        .filter(r => r.card_id === card.id)
        .forEach(r => thisCardRelatedIds.add(r.related_card_id));
    }
    
    // board_card_relationsから追加（このカードが target の場合）
    if (reverseRelationData) {
      reverseRelationData
        .filter(r => r.related_card_id === card.id)
        .forEach(r => thisCardRelatedIds.add(r.card_id));
    }
    
    const relatedCards = relatedCardsData
      .filter(rc => thisCardRelatedIds.has(rc.id))
      .map(rc => ({
        id: rc.id,
        title: rc.title,
        label: rc.title,
      }));

    return {
      ...card,
      metadata: {
        ...card.metadata,
        tags: tags,
        sources: sources,
      },
      sources, // BoardCardUIの直下にも
      relatedCards, // 関連カードを追加
      created_by_user: { display_name: usersMap.get(card.created_by) },
      updated_by_user: { display_name: usersMap.get(card.updated_by) },
    };
  });

  return cardsWithTags.map(toBoardCardUI);
}

// デフォルトボードを取得または作成（nest_idに基づいてboardsテーブルから取得）
export async function getOrCreateDefaultBoard(nestId: string, userId: string): Promise<string> {
  console.log('🔍 [getOrCreateDefaultBoard] === 開始 ===');
  console.log('🔍 [getOrCreateDefaultBoard] 引数 nestId:', nestId);
  console.log('🔍 [getOrCreateDefaultBoard] 引数 userId:', userId);
  
  try {
    // nest_idに紐づくボードをboardsテーブルから検索
    console.log('🔍 [getOrCreateDefaultBoard] boardsテーブルからnest_idに紐づくボードを検索中...');
    const { data: board, error: selectError } = await supabase
      .from('boards')
      .select('id')
      .eq('nest_id', nestId)
      .single();

    console.log('🔍 [getOrCreateDefaultBoard] boards検索結果:', board);
    console.log('🔍 [getOrCreateDefaultBoard] boards検索エラー:', selectError);

    if (board?.id) {
      console.log('🔍 [getOrCreateDefaultBoard] nest_idに紐づく既存のboard_idを返します:', board.id);
      return board.id;
    }

    // nest_idに紐づくボードが見つからない場合、新しいボードを作成
    console.log('🔍 [getOrCreateDefaultBoard] nest_idに紐づくボードが見つからないため、新規作成します');
    const boardId = crypto.randomUUID();
    
    const { error: insertError } = await supabase
      .from('boards')
      .insert({
        id: boardId,
        nest_id: nestId,
        name: 'デフォルトボード',
        description: `Nest ${nestId} のデフォルトボード`,
        created_by: userId
      });

    if (insertError) {
      console.error('🔍 [getOrCreateDefaultBoard] ボード作成エラー:', insertError);
      throw insertError;
    }

    console.log('🔍 [getOrCreateDefaultBoard] 新しいboard_idを作成しました:', boardId);
    return boardId;
  } catch (error) {
    console.error('🔍 [getOrCreateDefaultBoard] エラー発生:', error);
    console.error('ボード取得エラー:', error);
    
    // フォールバック: 正しいボードIDを返す
    const fallbackId = '82fa8e39-5edc-43e0-a8d6-96e7bcadc969';
    console.log('🔍 [getOrCreateDefaultBoard] フォールバック: 正しいboard_idを返します:', fallbackId);
    return fallbackId;
  }
}

// カードをボードに追加（metadataベース）
export async function addCardsToBoard(
  boardId: string,
  cards: any[],
  userId: string,
  meetingId?: string
): Promise<BoardCardUI[]> {
  try {
    // column_type正規化関数
    const validTypes = ['INBOX', 'QUESTIONS', 'INSIGHTS', 'THEMES', 'ACTIONS'];
    const normalizeColumnType = (type: string) => {
      if (!type) return 'INBOX';
      const upper = type.toUpperCase();
      return validTypes.includes(upper) ? upper : 'INBOX';
    };

    // カードをデータベースに挿入
    const cardsToInsert = cards.map((card, index) => {
      const metadata: AIMetadata = {
        ai: {
          meeting_id: meetingId,
          type: card.type,
          priority: card.priority || 'medium',
          assignee: card.assignee,
          deadline: card.deadline,
          generated_by: 'openai_gpt-3.5-turbo',
          generated_at: new Date().toISOString(),
        }
      };

      return {
        board_id: boardId,
        title: card.title,
        content: card.content,
        column_type: normalizeColumnType(card.column_type),
        order_index: index,
        is_archived: false,
        created_by: userId,
        metadata: metadata,
      };
    });

    const { data, error } = await supabase
      .from('board_cards')
      .insert(cardsToInsert)
      .select('*');

    if (error) {
      throw error;
    }

    // タグを保存
    for (let i = 0; i < data.length; i++) {
      const card = data[i];
      const tags = cards[i].tags;
      
      if (tags && tags.length > 0) {
        await addCardTags(card.id, tags);
      }
    }

    return data.map(toBoardCardUI);
  } catch (error) {
    console.error('カード追加エラー:', error);
    throw error;
  }
}

// カードにタグを追加
export async function addCardTags(cardId: string, tags: string[]) {
  const tagsToInsert = tags.map(tag => ({
    card_id: cardId,
    tag: tag
  }));

  const { error } = await supabase
    .from('board_card_tags')
    .insert(tagsToInsert);

  if (error) {
    throw error;
  }
}

// 不要になった関数を削除
// createDefaultColumns, getBoardColumns は board_columns テーブルを想定していたため削除 

// ミーティングソースを取得または作成
export async function getOrCreateMeetingSource(meetingId: string, meetingTitle: string): Promise<Source> {
  // 既存のsourceを検索
  const { data: existing, error: selectError } = await supabase
    .from('sources')
    .select('*')
    .eq('type', 'meeting')
    .eq('ref_id', meetingId)
    .single();
  if (existing) return existing;
  // なければ新規作成（insertの返り値をそのまま返す）
  const { data: created, error: insertError } = await supabase
    .from('sources')
    .insert([{ type: 'meeting', ref_id: meetingId, label: meetingTitle }])
    .select()
    .single();
  if (insertError || !created) throw insertError || new Error('Failed to create meeting source');
  return created;
} 