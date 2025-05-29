import React, { createContext, useContext, useReducer, useCallback, useState, useEffect } from 'react';
import { supabase } from '../../../services/supabase/client';
import { getBoardCardsWithTags } from '../../../services/BoardService';

// ボード空間の状態定義
interface BoardState {
  cards: BoardItem[];
  selectedCardId: string | null;
  searchQuery: string;
  isEditing: boolean;
  viewMode: 'grid' | 'list' | 'kanban';
  filter: {
    columns: BoardColumnType[];
    tags: string[];
    dateRange: {
      start: Date | null;
      end: Date | null;
    };
  };
  currentNestId: string | null; // 現在のNEST ID
  boardId: string | null; // 現在のボードID
}

// アクション定義
type BoardAction =
  | { type: 'SET_CARDS'; payload: BoardItem[] }
  | { type: 'ADD_CARDS'; payload: BoardItem[] }
  | { type: 'SELECT_CARD'; payload: string | null }
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'TOGGLE_EDIT_MODE' }
  | { type: 'SET_VIEW_MODE'; payload: BoardState['viewMode'] }
  | { type: 'UPDATE_FILTER'; payload: Partial<BoardState['filter']> }
  | { type: 'DELETE_CARD'; payload: string }
  | { type: 'UPDATE_CARD'; payload: Partial<BoardItem> & { id: string } }
  | { type: 'SET_BOARD_ID'; payload: string | null };

// ボードコンテキスト型定義
interface BoardContextType {
  state: BoardState;
  dispatch: React.Dispatch<BoardAction>;
  addCards: (cards: BoardItem[]) => void;
  selectCard: (id: string | null) => void;
  searchCards: (query: string) => void;
  toggleEditMode: () => void;
  setViewMode: (mode: BoardState['viewMode']) => void;
  updateFilter: (filter: Partial<BoardState['filter']>) => void;
  deleteCard: (id: string) => void;
  updateCard: (card: Partial<BoardItem> & { id: string }) => void;
  getCardById: (id: string) => BoardItem | undefined;
  getCardsByColumn: (column: BoardColumnType) => BoardItem[];
  loadNestData: (nestId: string) => Promise<void>;
  isLoading: boolean;
  boardNotFound: boolean;
  isCreatingBoard: boolean;
}

// 初期状態
const initialState: BoardState = {
  cards: [],
  selectedCardId: null,
  searchQuery: '',
  isEditing: false,
  viewMode: 'grid',
  filter: {
    columns: [],
    tags: [],
    dateRange: {
      start: null,
      end: null
    }
  },
  currentNestId: null,
  boardId: null,
};

// リデューサー
const boardReducer = (state: BoardState, action: BoardAction): BoardState => {
  switch (action.type) {
    case 'SET_CARDS': {
      return {
        ...state,
        cards: action.payload,
      };
    }
    case 'ADD_CARDS': {
      const existingIds = new Set(state.cards.map(i => i.id));
      const newCards = action.payload.filter(i => !existingIds.has(i.id));
      console.log('[BoardContext] ADD_CARDS payload:', action.payload);
      console.log('[BoardContext] ADD_CARDS newCards:', newCards);
      const updatedCards = [...state.cards, ...newCards];
      console.log('[BoardContext] ADD_CARDS updatedCards:', updatedCards);
      return {
        ...state,
        cards: updatedCards,
      };
    }
    case 'SELECT_CARD':
      return {
        ...state,
        selectedCardId: action.payload,
      };
    case 'SET_SEARCH_QUERY':
      return {
        ...state,
        searchQuery: action.payload,
      };
    case 'TOGGLE_EDIT_MODE':
      return {
        ...state,
        isEditing: !state.isEditing,
      };
    case 'SET_VIEW_MODE':
      return {
        ...state,
        viewMode: action.payload,
      };
    case 'UPDATE_FILTER':
      return {
        ...state,
        filter: {
          ...state.filter,
          ...action.payload,
        },
      };
    case 'DELETE_CARD':
      return {
        ...state,
        cards: state.cards.filter(card => card.id !== action.payload),
        selectedCardId: state.selectedCardId === action.payload ? null : state.selectedCardId,
      };
    case 'UPDATE_CARD':
      return {
        ...state,
        cards: state.cards.map(card =>
          card.id === action.payload.id ? { ...card, ...action.payload } : card
        ),
      };
    case 'SET_BOARD_ID':
      return {
        ...state,
        boardId: action.payload,
      };
    default:
      return state;
  }
};

// コンテキスト作成
const BoardContext = createContext<BoardContextType | undefined>(undefined);

interface BoardProviderProps {
  children: React.ReactNode;
  currentNestId: string | null;
}

// プロバイダーコンポーネント
export const BoardProvider: React.FC<BoardProviderProps> = ({ children, currentNestId }) => {
  const [state, dispatch] = useReducer(boardReducer, initialState);
  const [isLoading, setIsLoading] = useState(false);
  const [boardNotFound, setBoardNotFound] = useState(false);
  const [isCreatingBoard, setIsCreatingBoard] = useState(false);

  // アクションをラップしたヘルパー関数
  const addCards = useCallback((cards: BoardItem[]) => {
    dispatch({ type: 'ADD_CARDS', payload: cards });
  }, []);
  
  const selectCard = useCallback((id: string | null) => {
    dispatch({ type: 'SELECT_CARD', payload: id });
  }, []);
  
  const searchCards = useCallback((query: string) => {
    dispatch({ type: 'SET_SEARCH_QUERY', payload: query });
  }, []);
  
  const toggleEditMode = useCallback(() => {
    dispatch({ type: 'TOGGLE_EDIT_MODE' });
  }, []);
  
  const setViewMode = useCallback((mode: BoardState['viewMode']) => {
    dispatch({ type: 'SET_VIEW_MODE', payload: mode });
  }, []);
  
  const updateFilter = useCallback((filter: Partial<BoardState['filter']>) => {
    dispatch({ type: 'UPDATE_FILTER', payload: filter });
  }, []);

  const updateCard = useCallback((card: Partial<BoardItem> & { id: string }) => {
    dispatch({ type: 'UPDATE_CARD', payload: card });
  }, []);

  const deleteCard = useCallback((id: string) => {
    dispatch({ type: 'DELETE_CARD', payload: id });
  }, []);

  const ensureBoardExists = useCallback(async (nestId: string) => {
    setIsCreatingBoard(true);
    try {
      // 1. まず再度select
      const { data: boards } = await supabase
        .from('boards')
        .select('id')
        .eq('nest_id', nestId);
      if (boards && boards.length > 0) {
        return boards[0];
      }
      // 2. なければinsert
      const { data: newBoard, error: insertError } = await supabase
        .from('boards')
        .insert({ nest_id: nestId, name: '新しいボード' })
        .select()
        .single();
      if (insertError) throw insertError;
      return newBoard;
    } finally {
      setIsCreatingBoard(false);
    }
  }, []);

  // NESTのデータを読み込む → ボードIDでカードを取得
  const loadNestData = useCallback(async (nestId: string) => {
    setIsLoading(true);
    setBoardNotFound(false);
    dispatch({ type: 'SET_CARDS', payload: [] });
    dispatch({ type: 'SET_BOARD_ID', payload: null });
    try {
      // 1. まずnest_idに紐づくボードを取得
      let { data: boardData, error: boardError } = await supabase
        .from('boards')
        .select('id')
        .eq('nest_id', nestId)
        .single();
      if (boardError && boardError.code === 'PGRST116') { // Not found
        // ボードがなければensureBoardExistsで作成
        boardData = await ensureBoardExists(nestId);
      } else if (boardError) throw boardError;
      if (!boardData) {
        setBoardNotFound(true);
        setIsLoading(false);
        return;
      }
      dispatch({ type: 'SET_BOARD_ID', payload: boardData.id });
      console.log('[loadNestData] 取得したboard_id:', boardData.id);
      // 2. 取得したboard_idを使ってカードを取得（tags含む）
      const { data: cardData, error: cardError } = await getBoardCardsWithTags(boardData.id);
      if (cardError) throw cardError;
      console.log('[loadNestData] 取得したカード一覧:', cardData);
      // 追加: relationsを一括取得
      const { data: relationsData } = await supabase
        .from('board_card_relations')
        .select('card_id, related_card_id')
        .in('card_id', (cardData || []).map((item: any) => item.id));
      // 追加: 関連カードを一括取得
      const relatedIds = relationsData ? Array.from(new Set(relationsData.map(r => r.related_card_id))) : [];
      let relatedCards: any[] = [];
      if (relatedIds.length > 0) {
        const { data: relatedCardsData } = await supabase
          .from('board_cards')
          .select('id, title, column_type')
          .in('id', relatedIds);
        relatedCards = relatedCardsData || [];
      }
      // id→カード情報のMap
      const relatedCardMap = Object.fromEntries(relatedCards.map(c => [c.id, c]));
      // 逆参照（被参照）情報を一括取得
      const { data: reverseRelations } = await supabase
        .from('board_card_relations')
        .select('card_id, related_card_id')
        .in('related_card_id', (cardData || []).map((item: any) => item.id));
      // 逆参照元カードを一括取得
      const reverseCardIds = reverseRelations ? Array.from(new Set(reverseRelations.map(r => r.card_id))) : [];
      let reverseCards: any[] = [];
      if (reverseCardIds.length > 0) {
        const { data: reverseCardsData } = await supabase
          .from('board_cards')
          .select('id, title, column_type')
          .in('id', reverseCardIds);
        reverseCards = reverseCardsData || [];
      }
      // id→カード情報のMap
      const reverseCardMap = Object.fromEntries(reverseCards.map(c => [c.id, c]));
      const convertedCards = (cardData || []).map((item: { 
        id: string; 
        board_id: string; 
        title: string; 
        content: string; 
        column_type: BoardColumnType; 
        created_by: string; 
        created_by_display_name: string;
        created_at: string; 
        updated_at: string; 
        order_index: number; 
        is_archived: boolean; 
        tags?: string[];
        insights?: { id: string; title: string }[];
        themes?: { id: string; title: string }[];
        sources?: any[];
      }) => {
        // relationsからこのカードの関連カードIDを抽出
        const rels = (relationsData || []).filter(r => r.card_id === item.id);
        const related = rels.map(r => relatedCardMap[r.related_card_id]).filter(Boolean);
        // 逆参照（referencedBy）
        const referencedByRels = (reverseRelations || []).filter(r => r.related_card_id === item.id);
        const referencedBy = referencedByRels.map(r => reverseCardMap[r.card_id]).filter(Boolean).map((c: any) => ({ id: c.id, title: c.title, column_type: c.column_type }));
        return {
          id: item.id,
          board_id: item.board_id,
          nest_id: nestId,
          title: item.title,
          content: item.content,
          column_type: item.column_type,
          created_by: item.created_by,
          created_by_display_name: item.created_by_display_name,
          created_at: item.created_at,
          updated_at: item.updated_at,
          order_index: item.order_index,
          is_archived: item.is_archived,
          tags: item.tags || [],
          insights: related.filter((c: any) => c.column_type === 'insights').map((c: any) => ({ id: c.id, title: c.title })),
          themes: related.filter((c: any) => c.column_type === 'themes').map((c: any) => ({ id: c.id, title: c.title })),
          referencedBy,
          sources: item.sources || [],
        };
      });
      dispatch({ type: 'SET_CARDS', payload: convertedCards });
      setBoardNotFound(false);
    } catch (e) {
      console.error('[loadNestData] エラー:', e);
      setBoardNotFound(true);
      setIsLoading(false);
    }
    setIsLoading(false);
  }, [ensureBoardExists]);

  // NEST切り替え時に自動でデータロード
  useEffect(() => {
    if (currentNestId) {
      loadNestData(currentNestId);
    } else {
      dispatch({ type: 'SET_CARDS', payload: [] });
      setBoardNotFound(false);
    }
  }, [currentNestId, loadNestData]);

  // カードの保存
  const saveCard = useCallback(async (card: Partial<BoardItem> & { id: string }) => {
    try {
      // TODO: Supabaseにデータを保存
      // const { error } = await supabase
      //   .from('board_items')
      //   .upsert({
      //     ...card,
      //     updated_at: new Date().toISOString(),
      //   });

      // if (error) throw error;
      
      updateCard(card);
    } catch (error) {
      console.error('Failed to save card:', error);
    }
  }, [updateCard]);

  // カードの削除
  const removeCard = useCallback(async (cardId: string) => {
    try {
      // 先に関連テーブルから削除
      await supabase.from('board_card_tags').delete().eq('card_id', cardId);
      await supabase.from('board_card_relations').delete().eq('card_id', cardId);
      await supabase.from('board_card_relations').delete().eq('related_card_id', cardId);
      await supabase.from('board_card_sources').delete().eq('card_id', cardId);
      // 本体を削除
      const { error } = await supabase
        .from('board_cards')
        .delete()
        .eq('id', cardId);
      if (error) throw error;
      deleteCard(cardId);
    } catch (error) {
      console.error('Failed to delete card:', error);
    }
  }, [deleteCard]);

  // カードを取得するユーティリティ関数
  const getCardById = useCallback((id: string) => {
    return state.cards.find(card => card.id === id);
  }, [state.cards]);
  
  const getCardsByColumn = useCallback((column: BoardColumnType) => {
    return state.cards.filter(card => card.column_type === column);
  }, [state.cards]);

  // コンテキスト値
  const contextValue: BoardContextType = {
    state,
    dispatch,
    addCards,
    selectCard,
    searchCards,
    toggleEditMode,
    setViewMode,
    updateFilter,
    deleteCard: removeCard,
    updateCard: saveCard,
    getCardById,
    getCardsByColumn,
    loadNestData,
    isLoading,
    boardNotFound,
    isCreatingBoard,
  };

  return (
    <BoardContext.Provider value={contextValue}>
      {children}
    </BoardContext.Provider>
  );
};

// カスタムフック
export const useBoardContext = (): BoardContextType => {
  const context = useContext(BoardContext);
  
  if (context === undefined) {
    throw new Error('useBoardContext must be used within a BoardProvider');
  }
  
  return context;
};

// カラム種別
export enum BoardColumnType {
  INBOX = 'inbox',
  INSIGHTS = 'insights',
  THEMES = 'themes',
  ZOOM = 'zoom',
}

// カード型
export interface BoardItem {
  id: string;
  nest_id: string;
  title: string;
  content: string;
  column_type: BoardColumnType;
  created_by: string;
  created_by_display_name: string;
  created_at: string;
  updated_at: string;
  updated_by?: string;
  source_message_id?: string;
  order_index: number;
  tags?: string[];
  is_archived: boolean;
  metadata?: Record<string, any>;
  source?: string;
  insights?: { id: string; title: string }[];
  themes?: { id: string; title: string }[];
  referencedBy?: { id: string; title: string; column_type: BoardColumnType }[];
  sources?: any[];
} 