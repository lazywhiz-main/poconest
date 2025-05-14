import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Insight, InsightInput, InsightQuery, InsightGenerationSettings } from '../types/insight';
import { InsightService } from '../services/insightService';

interface InsightContextType {
  insights: Insight[];
  loading: boolean;
  error: string | null;
  searchInsights: (query: InsightQuery) => Promise<Insight[]>;
  createInsight: (input: InsightInput) => Promise<Insight>;
  saveInsights: (insights: Insight[], collectionName: string) => Promise<boolean>;
  markAsReviewed: (insightId: string) => Promise<void>;
  monitorConversation: (messages: any[]) => void;
  updateSettings: (settings: Partial<InsightGenerationSettings>) => void;
  getInsightsByChatId: (chatId: string) => Promise<Insight[]>;
  generateInsightsFromChat: (chatId: string) => Promise<Insight[]>;
  saveInsightToBoard: (insight: Insight) => Promise<void>;
  insightService: InsightService;
}

const InsightContext = createContext<InsightContextType | null>(null);

export const useInsight = () => {
  const context = useContext(InsightContext);
  if (!context) {
    throw new Error('useInsight must be used within an InsightProvider');
  }
  return context;
};

export const InsightProvider: React.FC<{
  children: React.ReactNode;
  insightService: InsightService;
}> = ({ children, insightService }) => {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 初期データの読み込み
    loadInitialInsights();
  }, []);

  const loadInitialInsights = async () => {
    try {
      setLoading(true);
      const query: InsightQuery = {
        limit: 50,
        sortBy: 'createdAt',
        sortDirection: 'desc'
      };
      const loadedInsights = await searchInsights(query);
      setInsights(loadedInsights);
    } catch (err) {
      setError('Failed to load initial insights');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const searchInsights = async (query: InsightQuery): Promise<Insight[]> => {
    try {
      setLoading(true);
      const results = await insightService.searchInsights(query);
      return results;
    } catch (err) {
      setError('Failed to search insights');
      console.error(err);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const createInsight = async (input: InsightInput): Promise<Insight> => {
    try {
      setLoading(true);
      const newInsight = await insightService.createInsight(input);
      setInsights(prev => [newInsight, ...prev]);
      return newInsight;
    } catch (err) {
      setError('Failed to create insight');
      console.error(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const saveInsights = async (insightsToSave: Insight[], collectionName: string): Promise<boolean> => {
    try {
      setLoading(true);
      // ここでインサイトをコレクションに保存する処理を実装
      // 現在はモック実装
      console.log('Saving insights to collection:', collectionName, insightsToSave);
      return true;
    } catch (err) {
      setError('Failed to save insights');
      console.error(err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const markAsReviewed = async (insightId: string): Promise<void> => {
    try {
      setLoading(true);
      await insightService.markAsReviewed(insightId);
      setInsights(prev =>
        prev.map(insight =>
          insight.id === insightId
            ? { ...insight, isReviewed: true }
            : insight
        )
      );
    } catch (err) {
      setError('Failed to mark insight as reviewed');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const monitorConversation = (messages: any[]) => {
    insightService.monitorConversation(messages);
  };

  const updateSettings = (settings: Partial<InsightGenerationSettings>) => {
    insightService.updateSettings(settings);
  };

  const getInsightsByChatId = async (chatId: string): Promise<Insight[]> => {
    try {
      setLoading(true);
      const query: InsightQuery = {
        chatIds: [chatId],
        sortBy: 'createdAt',
        sortDirection: 'desc'
      };
      return await searchInsights(query);
    } catch (err) {
      setError('Failed to get insights by chat ID');
      console.error(err);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const generateInsightsFromChat = async (chatId: string): Promise<Insight[]> => {
    try {
      setLoading(true);
      // TODO: Implement chat analysis and insight generation
      const generatedInsights = await insightService.generateInsightsFromChat(chatId);
      setInsights(prev => [...generatedInsights, ...prev]);
      return generatedInsights;
    } catch (err) {
      setError('Failed to generate insights from chat');
      console.error(err);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const saveInsightToBoard = async (insight: Insight): Promise<void> => {
    try {
      setLoading(true);
      await insightService.saveInsightToBoard(insight);
      setInsights(prev =>
        prev.map(i =>
          i.id === insight.id
            ? { ...i, isSaved: true }
            : i
        )
      );
    } catch (err) {
      setError('Failed to save insight to board');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <InsightContext.Provider
      value={{
        insights,
        loading,
        error,
        searchInsights,
        createInsight,
        saveInsights,
        markAsReviewed,
        monitorConversation,
        updateSettings,
        getInsightsByChatId,
        generateInsightsFromChat,
        saveInsightToBoard,
        insightService,
      }}
    >
      {children}
    </InsightContext.Provider>
  );
}; 