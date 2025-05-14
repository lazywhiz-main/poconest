import React, { createContext, useContext, useReducer, useCallback, useState, useEffect } from 'react';
import { AIInsight } from '../../../services/AIAnalysisService';

// ボード空間の状態定義
interface BoardState {
  insights: AIInsight[];
  selectedGroupId: string | null;
  selectedInsightId: string | null;
  searchQuery: string;
  isEditing: boolean;
  viewMode: 'grid' | 'list' | 'kanban';
  filter: {
    sources: ('chat' | 'meeting' | 'ai')[];
    minConfidence: number;
    tags: string[];
    dateRange: {
      start: Date | null;
      end: Date | null;
    };
  };
}

// アクション定義
type BoardAction = 
  | { type: 'ADD_INSIGHTS'; payload: AIInsight[] }
  | { type: 'SELECT_GROUP'; payload: string }
  | { type: 'SELECT_INSIGHT'; payload: string | null }
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'TOGGLE_EDIT_MODE' }
  | { type: 'SET_VIEW_MODE'; payload: BoardState['viewMode'] }
  | { type: 'UPDATE_FILTER'; payload: Partial<BoardState['filter']> }
  | { type: 'STAR_INSIGHT'; payload: string }
  | { type: 'DELETE_INSIGHT'; payload: string }
  | { type: 'UPDATE_INSIGHT'; payload: Partial<AIInsight> & { id: string } };

// ボードコンテキスト型定義
interface BoardContextType {
  state: BoardState;
  dispatch: React.Dispatch<BoardAction>;
  addInsights: (insights: AIInsight[]) => void;
  selectInsight: (id: string | null) => void;
  selectGroup: (id: string) => void;
  searchInsights: (query: string) => void;
  toggleEditMode: () => void;
  setViewMode: (mode: BoardState['viewMode']) => void;
  updateFilter: (filter: Partial<BoardState['filter']>) => void;
  starInsight: (id: string) => void;
  deleteInsight: (id: string) => void;
  updateInsight: (insight: Partial<AIInsight> & { id: string }) => void;
  getInsightById: (id: string) => AIInsight | undefined;
  getInsightsByTags: (tags: string[]) => AIInsight[];
  getInsightsBySource: (source: 'chat' | 'meeting' | 'ai') => AIInsight[];
}

// 初期状態
const initialState: BoardState = {
  insights: [],
  selectedGroupId: null,
  selectedInsightId: null,
  searchQuery: '',
  isEditing: false,
  viewMode: 'grid',
  filter: {
    sources: ['chat', 'meeting', 'ai'],
    minConfidence: 0,
    tags: [],
    dateRange: {
      start: null,
      end: null
    }
  }
};

// リデューサー
const boardReducer = (state: BoardState, action: BoardAction): BoardState => {
  switch (action.type) {
    case 'ADD_INSIGHTS':
      // 重複を避けて洞察を追加
      const existingIds = new Set(state.insights.map(i => i.id));
      const newInsights = action.payload.filter(i => !existingIds.has(i.id));
      
      return {
        ...state,
        insights: [...state.insights, ...newInsights]
      };
      
    case 'SELECT_GROUP':
      return {
        ...state,
        selectedGroupId: action.payload,
        selectedInsightId: null
      };
      
    case 'SELECT_INSIGHT':
      return {
        ...state,
        selectedInsightId: action.payload
      };
      
    case 'SET_SEARCH_QUERY':
      return {
        ...state,
        searchQuery: action.payload
      };
      
    case 'TOGGLE_EDIT_MODE':
      return {
        ...state,
        isEditing: !state.isEditing
      };
      
    case 'SET_VIEW_MODE':
      return {
        ...state,
        viewMode: action.payload
      };
      
    case 'UPDATE_FILTER':
      return {
        ...state,
        filter: {
          ...state.filter,
          ...action.payload
        }
      };
      
    case 'STAR_INSIGHT':
      return {
        ...state,
        insights: state.insights.map(insight => 
          insight.id === action.payload
            ? { ...insight, isStarred: !insight.isStarred }
            : insight
        )
      };
      
    case 'DELETE_INSIGHT':
      return {
        ...state,
        insights: state.insights.filter(insight => insight.id !== action.payload),
        selectedInsightId: state.selectedInsightId === action.payload ? null : state.selectedInsightId
      };
      
    case 'UPDATE_INSIGHT':
      return {
        ...state,
        insights: state.insights.map(insight => 
          insight.id === action.payload.id
            ? { ...insight, ...action.payload }
            : insight
        )
      };
      
    default:
      return state;
  }
};

// コンテキスト作成
const BoardContext = createContext<BoardContextType | undefined>(undefined);

// プロバイダーコンポーネント
export const BoardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(boardReducer, initialState);
  
  // アクションをラップしたヘルパー関数
  const addInsights = useCallback((insights: AIInsight[]) => {
    dispatch({ type: 'ADD_INSIGHTS', payload: insights });
  }, []);
  
  const selectInsight = useCallback((id: string | null) => {
    dispatch({ type: 'SELECT_INSIGHT', payload: id });
  }, []);
  
  const selectGroup = useCallback((id: string) => {
    dispatch({ type: 'SELECT_GROUP', payload: id });
  }, []);
  
  const searchInsights = useCallback((query: string) => {
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
  
  const starInsight = useCallback((id: string) => {
    dispatch({ type: 'STAR_INSIGHT', payload: id });
  }, []);
  
  const deleteInsight = useCallback((id: string) => {
    dispatch({ type: 'DELETE_INSIGHT', payload: id });
  }, []);
  
  const updateInsight = useCallback((insight: Partial<AIInsight> & { id: string }) => {
    dispatch({ type: 'UPDATE_INSIGHT', payload: insight });
  }, []);
  
  // 洞察を取得するユーティリティ関数
  const getInsightById = useCallback((id: string) => {
    return state.insights.find(insight => insight.id === id);
  }, [state.insights]);
  
  const getInsightsByTags = useCallback((tags: string[]) => {
    if (tags.length === 0) return state.insights;
    
    return state.insights.filter(insight => 
      tags.some(tag => insight.tags.includes(tag))
    );
  }, [state.insights]);
  
  const getInsightsBySource = useCallback((source: 'chat' | 'meeting' | 'ai') => {
    return state.insights.filter(insight => insight.source === source);
  }, [state.insights]);
  
  // コンテキスト値
  const contextValue: BoardContextType = {
    state,
    dispatch,
    addInsights,
    selectInsight,
    selectGroup,
    searchInsights,
    toggleEditMode,
    setViewMode,
    updateFilter,
    starInsight,
    deleteInsight,
    updateInsight,
    getInsightById,
    getInsightsByTags,
    getInsightsBySource
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