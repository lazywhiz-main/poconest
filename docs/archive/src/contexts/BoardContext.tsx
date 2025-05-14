import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Card, BoardColumnType, BoardViewSettings } from '../types/board';
import { Insight } from '../types/insight';
import { ChatMessage } from '../types/chat';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';
import { InsightType, InsightPriority } from '../types/insight';
import { AIService } from '../services/AIService';
import { OPENAI_API_KEY } from '@env';

// モックデータインポート
import { mockCards as initialMockCards } from '../mock/boardData';

// uuid関数の代わりにシンプルなID生成関数を使用
const generateId = () => {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
};

// ボードコラムの説明
export const COLUMN_DESCRIPTIONS = {
  [BoardColumnType.INBOX]: {
    title: 'Inbox（苗床）',
    description: '整理されていない生の思考の一時置き場。即時性、未整理、可能性を特徴とします。',
    icon: 'file-tray-outline'
  },
  [BoardColumnType.INSIGHTS]: {
    title: 'Insights（発芽）',
    description: 'AIによって抽出された重要な洞察。AI判断、自動生成、文脈理解を特徴とします。',
    icon: 'bulb-outline'
  },
  [BoardColumnType.THEMES]: {
    title: 'Themes（成長）',
    description: '関連する洞察をまとめたより大きなアイデア群。構造化、パターン化、知識の体系化を特徴とします。',
    icon: 'library-outline'
  },
  [BoardColumnType.ZOOM]: {
    title: 'Zoom（養分）',
    description: 'ビデオ会議からの重要な情報。リッチコンテンツ、文脈保持、音声由来を特徴とします。',
    icon: 'videocam-outline'
  }
};

// ボードコンテキストの型
interface BoardContextType {
  cards: Card[];
  loading: boolean;
  error: string | null;
  activeColumn: BoardColumnType;
  viewSettings: BoardViewSettings;
  setActiveColumn: (column: BoardColumnType) => void;
  addCard: (card: Omit<Card, 'id' | 'created_at' | 'updated_at'>) => Promise<Card>;
  updateCard: (id: string, updates: Partial<Card>) => Promise<Card | null>;
  deleteCard: (id: string) => Promise<boolean>;
  moveCard: (id: string, targetColumn: BoardColumnType) => Promise<Card | null>;
  getCardsByColumn: (column: BoardColumnType) => Card[];
  saveInsightToBoard: (insight: Insight) => Promise<Card>;
  saveMessageToInbox: (message: ChatMessage) => Promise<Card | null>;
  setViewSettings: (settings: Partial<BoardViewSettings>) => void;
  promoteCardToInsight: (id: string) => Promise<Card | null>;
  promoteInsightToTheme: (insightIds: string[]) => Promise<Card | null>;
  getColumnInfo: (column: BoardColumnType) => typeof COLUMN_DESCRIPTIONS[BoardColumnType];
  findRelatedCards: (cardId: string) => Card[];
  updateCardOrder: (column: BoardColumnType, cardIds: string[]) => Promise<void>;
}

// デフォルトのビュー設定
const defaultViewSettings: BoardViewSettings = {
  sortBy: 'updatedAt',
  sortDirection: 'desc',
  filter: {},
};

const BoardContext = createContext<BoardContextType | undefined>(undefined);

export const BoardProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [cards, setCards] = useState<Card[]>(initialMockCards);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeColumn, setActiveColumn] = useState<BoardColumnType>(BoardColumnType.INBOX);
  const [viewSettings, setViewSettings] = useState<BoardViewSettings>(defaultViewSettings);

  // AI Service インスタンスを作成
  const [aiService] = useState(() => {
    // OpenAI API キーを環境変数から取得
    const apiKey = OPENAI_API_KEY || '';
    console.log('API Key found:', apiKey ? 'Yes (length: ' + apiKey.length + ')' : 'No');
    return new AIService(apiKey);
  });

  // カラムが変更されたときにカードを再フェッチ
  useEffect(() => {
    // 初期ロード時のみ全カードを設定
    setCards(initialMockCards);
  }, []); // 空の依存配列で初期ロード時のみ実行

  // カードを追加
  const addCard = async (cardData: Omit<Card, 'id' | 'created_at' | 'updated_at'>): Promise<Card> => {
    try {
      const now = new Date().toISOString();
      
      const newCard: Card = {
        id: generateId(),
        ...cardData,
        created_at: now,
        updated_at: now,
      };
      
      setCards(prev => [...prev, newCard]);
      return newCard;
    } catch (err) {
      setError('カードの追加中にエラーが発生しました');
      console.error(err);
      throw err;
    }
  };

  // カードを更新
  const updateCard = async (id: string, updates: Partial<Card>): Promise<Card | null> => {
    try {
      const cardIndex = cards.findIndex(card => card.id === id);
      if (cardIndex === -1) return null;
      
      const updatedCard = {
        ...cards[cardIndex],
        ...updates,
        updated_at: new Date().toISOString(),  // 修正: updatedAt → updated_at
      };
      
      const updatedCards = [...cards];
      updatedCards[cardIndex] = updatedCard;
      
      setCards(updatedCards);
      return updatedCard;
    } catch (err) {
      setError('カードの更新中にエラーが発生しました');
      console.error(err);
      throw err;
    }
  };

  // カードを削除
  const deleteCard = async (id: string): Promise<boolean> => {
    try {
      const initialLength = cards.length;
      setCards(prev => prev.filter(card => card.id !== id));
      return cards.length < initialLength;
    } catch (err) {
      setError('カードの削除中にエラーが発生しました');
      console.error(err);
      throw err;
    }
  };

  // カードを別のカラムに移動
  const moveCard = async (id: string, targetColumn: BoardColumnType): Promise<Card | null> => {
    try {
      const cardIndex = cards.findIndex(card => card.id === id);
      if (cardIndex === -1) return null;
      
      const updatedCard = {
        ...cards[cardIndex],
        column: targetColumn,
        updated_at: new Date().toISOString(),  // 修正: updatedAt → updated_at
      };
      
      const updatedCards = [...cards];
      updatedCards[cardIndex] = updatedCard;
      
      setCards(updatedCards);
      return updatedCard;
    } catch (err) {
      setError('カードの移動中にエラーが発生しました');
      console.error(err);
      throw err;
    }
  };

  // 特定のカラムのカードを取得
  const getCardsByColumn = (column: BoardColumnType): Card[] => {
    return cards.filter(card => card.column === column);
  };

  // インサイトをボードに保存
  const saveInsightToBoard = async (insight: Insight): Promise<Card> => {
    try {
      // インサイトからカードを作成
      const cardData: Omit<Card, 'id' | 'created_at' | 'updated_at'> = {
        title: insight.content.length > 50 
          ? `${insight.content.substring(0, 47)}...` 
          : insight.content,
        description: insight.content,
        column: BoardColumnType.INSIGHTS,
        user_id: user?.id || '1',
        order: 0,  // 新規カードは一番上に配置
        tags: insight.category ? [insight.category] : [],
        sourceType: 'chat',
        sourceId: insight.sourceChatId,
        metadata: {
          insightId: insight.id,
          insightType: insight.type,
          insightPriority: insight.priority,
          ...insight.metadata
        }
      };
      
      // カードを追加
      const newCard = await addCard(cardData);
      return newCard;
    } catch (err) {
      setError('インサイトの保存中にエラーが発生しました');
      console.error(err);
      throw err;
    }
  };

  // Inboxカードを洞察（Insights）に昇格させる
  const promoteCardToInsight = async (id: string): Promise<Card | null> => {
    try {
      const card = cards.find(c => c.id === id);
      if (!card || card.column !== BoardColumnType.INBOX) return null;

      // AI処理を模したタイトル・タグの拡充（実際はAI APIを呼び出す）
      const enhancedTitle = card.title.length > 30 
        ? card.title 
        : `${card.title} - 重要ポイント`;
      
      const suggestedTags = [...(card.tags || [])];
      if (suggestedTags.length === 0) {
        suggestedTags.push('自動タグ');
      }
      
      // 洞察に昇格
      const updatedCard = await updateCard(id, {
        title: enhancedTitle,
        column: BoardColumnType.INSIGHTS,
        tags: suggestedTags,
        metadata: {
          ...card.metadata,
          enhancedByAI: true,
          promotedAt: new Date().toISOString(),
        }
      });
      
      return updatedCard;
    } catch (err) {
      setError('カードの昇格中にエラーが発生しました');
      console.error(err);
      throw err;
    }
  };

  // 複数の洞察（Insights）をテーマ（Themes）に統合する
  const promoteInsightToTheme = async (insightIds: string[]): Promise<Card | null> => {
    try {
      console.log('promoteInsightToTheme called with ids:', insightIds);
      if (insightIds.length === 0) return null;
      
      // 選択されたインサイトを取得
      const selectedInsights = cards.filter(
        card => insightIds.includes(card.id) && card.column === BoardColumnType.INSIGHTS
      );
      
      console.log('Selected insights:', selectedInsights.length);
      
      if (selectedInsights.length === 0) return null;

      // 選択されたカードからInsight型のオブジェクトを作成
      const insightsData = selectedInsights.map(card => ({
        id: card.id,
        type: (card.metadata?.insightType as InsightType) || InsightType.KEY_POINT,
        content: card.description,
        sourceChatId: card.sourceId || '',
        sourceMessageIds: [],
        createdAt: card.created_at,
        updatedAt: card.updated_at,
        priority: (card.metadata?.insightPriority as InsightPriority) || InsightPriority.MEDIUM,
        isReviewed: true,
        isSaved: true
      }));
      
      // AIを使用してテーマを生成
      let themeData;
      try {
        console.log('Calling AI service with insights:', insightsData.length);
        themeData = await aiService.generateThemeFromInsights(insightsData);
        console.log('AI service returned theme data:', themeData);
      } catch (error) {
        console.error('AIテーマ生成エラー:', error);
        // AIでのテーマ生成に失敗した場合、基本的な方法でテーマを作成
        themeData = {
          title: selectedInsights.length === 1 
            ? `テーマ: ${selectedInsights[0].title}`
            : `${selectedInsights[0].title.split(' ')[0]}に関するテーマ（${selectedInsights.length}件）`,
          content: selectedInsights
            .map(insight => `- ${insight.title}: ${insight.description.substring(0, 100)}${insight.description.length > 100 ? '...' : ''}`)
            .join('\n\n'),
          tags: Array.from(
            new Set(selectedInsights.flatMap(insight => insight.tags || []))
          )
        };
      }
      
      // テーマカードを作成
      const themeCard = await addCard({
        title: themeData.title,
        description: themeData.content,  // contentをdescriptionとして使用
        column: BoardColumnType.THEMES,
        user_id: user?.id || '1',
        order: 0,  // 新規カードは一番上に配置
        tags: themeData.tags,
        sourceType: 'manual',
        metadata: {
          relatedInsightIds: selectedInsights.map(insight => insight.id),
          createdFromInsights: true,
          insightCount: selectedInsights.length,
          aiGenerated: true,
          generatedAt: new Date().toISOString()
        }
      });
      
      console.log('Created theme card:', themeCard);
      return themeCard;
    } catch (err) {
      console.error('テーマの作成中にエラー詳細:', err);
      setError('テーマの作成中にエラーが発生しました');
      throw err;
    }
  };

  // カラム情報を取得
  const getColumnInfo = (column: BoardColumnType) => {
    return COLUMN_DESCRIPTIONS[column];
  };

  // カード間の関連性を検出
  const findRelatedCards = (cardId: string): Card[] => {
    try {
      const card = cards.find(c => c.id === cardId);
      if (!card) return [];
      
      const relatedCards: Card[] = [];
      
      // 1. タグが一致するカードを関連ありとみなす
      if (card.tags && card.tags.length > 0) {
        const similarByTags = cards.filter(c => 
          c.id !== cardId && 
          c.tags && 
          c.tags.some(tag => card.tags?.includes(tag))
        );
        relatedCards.push(...similarByTags);
      }
      
      // 2. タイトルに同じキーワードを含むカードを関連ありとみなす
      const titleWords = card.title
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 3); // 4文字以上の単語のみを考慮
      
      if (titleWords.length > 0) {
        const similarByTitle = cards.filter(c => 
          c.id !== cardId && 
          !relatedCards.some(rc => rc.id === c.id) && // すでに追加されていないか確認
          titleWords.some(word => 
            c.title.toLowerCase().includes(word)
          )
        );
        relatedCards.push(...similarByTitle);
      }
      
      // 3. メタデータに関連カードIDsが含まれる場合
      if (card.metadata?.relatedCardIds) {
        const explicitlyRelated = cards.filter(c => 
          c.id !== cardId && 
          !relatedCards.some(rc => rc.id === c.id) && // すでに追加されていないか確認
          card.metadata?.relatedCardIds?.includes(c.id)
        );
        relatedCards.push(...explicitlyRelated);
      }
      
      // 4. 同じソースから作成されたカード
      if (card.sourceId) {
        const sameSource = cards.filter(c => 
          c.id !== cardId && 
          !relatedCards.some(rc => rc.id === c.id) && // すでに追加されていないか確認
          c.sourceId === card.sourceId
        );
        relatedCards.push(...sameSource);
      }
      
      return relatedCards;
    } catch (error) {
      console.error('関連カード検出エラー:', error);
      return [];
    }
  };

  // チャットメッセージをInboxに保存
  const saveMessageToInbox = async (message: ChatMessage): Promise<Card | null> => {
    try {
      // メッセージからカードを作成
      const cardData: Omit<Card, 'id' | 'created_at' | 'updated_at'> = {
        title: message.content.length > 50 
          ? `${message.content.substring(0, 47)}...` 
          : message.content,
        description: message.content,
        column: BoardColumnType.INBOX,
        user_id: user?.id || '1',
        order: 0,  // 新規カードは一番上に配置
        tags: [],
        sourceType: 'chat',
        sourceId: message.chatId,
        metadata: {
          messageId: message.id,
          senderName: message.sender.name,
          isFromChat: true
        }
      };
      
      // カードを追加
      const newCard = await addCard(cardData);
      return newCard;
    } catch (err) {
      setError('メッセージの保存中にエラーが発生しました');
      console.error(err);
      return null;
    }
  };

  // ビュー設定を更新
  const handleSetViewSettings = (settings: Partial<BoardViewSettings>) => {
    setViewSettings(prev => ({
      ...prev,
      ...settings,
    }));
  };

  // カードの順序を更新
  const updateCardOrder = async (column: BoardColumnType, cardIds: string[]) => {
    try {
      // 一括更新のためのPromiseを作成
      const updatePromises = cardIds.map((cardId, index) => 
        supabase
          .from('cards')
          .update({ order: index })
          .eq('id', cardId)
          .eq('column', column)
          .eq('user_id', user?.id)
      );

      // すべての更新を並行して実行
      await Promise.all(updatePromises);
      
      // フロントエンドの状態を更新
      setCards(prevCards => {
        const updatedCards = [...prevCards];
        cardIds.forEach((cardId, index) => {
          const cardIndex = updatedCards.findIndex(card => card.id === cardId);
          if (cardIndex !== -1) {
            updatedCards[cardIndex] = {
              ...updatedCards[cardIndex],
              order: index,
            };
          }
        });
        return updatedCards;
      });
    } catch (error) {
      console.error('Error updating card order:', error);
      throw error;
    }
  };

  return (
    <BoardContext.Provider
      value={{
        cards,
        loading,
        error,
        activeColumn,
        viewSettings,
        setActiveColumn,
        addCard,
        updateCard,
        deleteCard,
        moveCard,
        getCardsByColumn,
        saveInsightToBoard,
        saveMessageToInbox,
        setViewSettings: handleSetViewSettings,
        promoteCardToInsight,
        promoteInsightToTheme,
        getColumnInfo,
        findRelatedCards,
        updateCardOrder,
      }}
    >
      {children}
    </BoardContext.Provider>
  );
};

export const useBoard = () => {
  const context = useContext(BoardContext);
  if (context === undefined) {
    throw new Error('useBoard must be used within a BoardProvider');
  }
  return context;
}; 