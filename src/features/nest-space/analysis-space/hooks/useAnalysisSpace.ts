import { useState, useEffect, useCallback, useMemo } from 'react';
import { useBoardSpace } from '../../board-space';
import { useChatSpace } from '../../chat-space/hooks/useChatSpace';
import { useNestSpace } from '../../contexts/_NestSpaceContext.tsx';
import { SpaceType } from '../../types/nestSpace.types';

// Types for analysis data
export interface AIInsight {
  id: string;
  title: string;
  description: string;
  type: 'communication' | 'trend' | 'topic' | 'activity' | 'relationship';
  confidence: number; // 0-1
  timestamp: string;
  keywords: string[];
  relatedItemIds: {
    cardIds?: string[];
    messageIds?: string[];
    chatRoomIds?: string[];
  };
  visualType?: 'chart' | 'graph' | 'timeline' | 'heatmap';
  visualData?: any;
  isStarred?: boolean;
  isArchived?: boolean;
}

export interface ActivityEvent {
  id: string;
  type: 'message' | 'card_created' | 'card_moved' | 'insight_generated' | 'meeting';
  timestamp: string;
  description: string;
  userId: string;
  userName: string;
  sourceId?: string;
  sourceType?: 'chat' | 'board' | 'analysis';
  importance: number; // 0-1
  relatedItemIds?: string[];
}

export interface TrendData {
  id: string;
  title: string;
  description: string;
  timeRange: {
    start: string;
    end: string;
  };
  dataPoints: {
    timestamp: string;
    value: number;
    label?: string;
  }[];
  metric: 'message_count' | 'card_count' | 'keyword_frequency' | 'sentiment';
  trend: 'increasing' | 'decreasing' | 'stable' | 'fluctuating';
  significance: number; // 0-1
  relatedKeywords: string[];
}

export interface KeywordNode {
  id: string;
  label: string;
  count: number;
  importance: number; // 0-1
  category?: string;
}

export interface KeywordLink {
  source: string; // node id
  target: string; // node id
  strength: number; // 0-1
  count: number;
}

export interface KeywordNetwork {
  nodes: KeywordNode[];
  links: KeywordLink[];
  timeRange: {
    start: string;
    end: string;
  };
}

export interface AnalysisSpaceState {
  insights: AIInsight[];
  activities: ActivityEvent[];
  trends: TrendData[];
  keywordNetwork: KeywordNetwork;
  filters: {
    timeRange: {
      start: Date | null;
      end: Date | null;
    };
    types: string[];
    keywords: string[];
    confidence: number; // minimum confidence threshold
    searchQuery: string;
  };
  selectedInsightId: string | null;
  isLoading: boolean;
  viewMode: 'list' | 'grid' | 'dashboard';
  sortBy: 'date' | 'confidence' | 'relevance';
  sortDirection: 'asc' | 'desc';
}

export const useAnalysisSpace = () => {
  const { boardSpaceState, allCards } = useBoardSpace();
  const { chatSpaceState, chatRooms, messages } = useChatSpace();
  const { isSpaceActive, navigateToSpace } = useNestSpace();
  
  // Analysis space state
  const [analysisState, setAnalysisState] = useState<AnalysisSpaceState>({
    insights: [],
    activities: [],
    trends: [],
    keywordNetwork: {
      nodes: [],
      links: [],
      timeRange: {
        start: '',
        end: ''
      }
    },
    filters: {
      timeRange: {
        start: null,
        end: null
      },
      types: [],
      keywords: [],
      confidence: 0.5,
      searchQuery: ''
    },
    selectedInsightId: null,
    isLoading: false,
    viewMode: 'dashboard',
    sortBy: 'date',
    sortDirection: 'desc'
  });
  
  // Ensure analysis space is properly activated
  useEffect(() => {
    if (!isSpaceActive(SpaceType.ANALYSIS)) {
      navigateToSpace(SpaceType.ANALYSIS);
    }
  }, [isSpaceActive, navigateToSpace]);
  
  // Load analysis data when component mounts
  useEffect(() => {
    generateAnalysisData();
  }, []);
  
  // Generate mock analysis data based on cards and messages
  const generateAnalysisData = useCallback(async () => {
    setAnalysisState(prev => ({ ...prev, isLoading: true }));
    
    try {
      // In a real implementation, this would call an AI service
      // For now, we'll generate mock data
      
      // Generate insights
      const mockInsights = generateMockInsights(allCards, messages, chatRooms);
      
      // Generate activity timeline
      const mockActivities = generateMockActivities(allCards, messages, chatRooms);
      
      // Generate trends
      const mockTrends = generateMockTrends(allCards, messages);
      
      // Generate keyword network
      const mockKeywordNetwork = generateMockKeywordNetwork(allCards, messages);
      
      setAnalysisState(prev => ({
        ...prev,
        insights: mockInsights,
        activities: mockActivities,
        trends: mockTrends,
        keywordNetwork: mockKeywordNetwork,
        isLoading: false
      }));
      
    } catch (error) {
      console.error('Error generating analysis data:', error);
      setAnalysisState(prev => ({ ...prev, isLoading: false }));
    }
  }, [allCards, messages, chatRooms]);
  
  // Generate mock insights based on current data
  const generateMockInsights = (cards: any[], messagesByRoom: any, rooms: any) => {
    const insights: AIInsight[] = [
      {
        id: '1',
        title: 'コミュニケーションパターンの変化',
        description: 'ここ2週間で、チームのコミュニケーションパターンが変化しています。特にプロジェクト計画に関する議論が増加しています。',
        type: 'communication',
        confidence: 0.85,
        timestamp: new Date(Date.now() - 86400000).toISOString(),
        keywords: ['プロジェクト計画', 'タイムライン', 'ミーティング'],
        relatedItemIds: {
          cardIds: cards.slice(0, 3).map((c: any) => c?.id).filter(Boolean),
          chatRoomIds: Object.keys(messagesByRoom).slice(0, 1)
        },
        visualType: 'chart',
        visualData: {
          type: 'bar',
          data: {
            labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
            datasets: [{
              label: 'メッセージ数',
              data: [12, 19, 25, 31]
            }]
          }
        }
      },
      {
        id: '2',
        title: '重要トピックの発見',
        description: 'デザインレビューに関する議論が複数のチャネルで行われています。重要な決定事項が含まれている可能性があります。',
        type: 'topic',
        confidence: 0.92,
        timestamp: new Date(Date.now() - 172800000).toISOString(),
        keywords: ['デザインレビュー', 'UI', 'フィードバック'],
        relatedItemIds: {
          cardIds: cards.slice(2, 5).map((c: any) => c?.id).filter(Boolean),
          chatRoomIds: Object.keys(messagesByRoom).slice(0, 2)
        },
        visualType: 'graph',
        visualData: {
          type: 'network',
          data: {
            nodes: [
              { id: 'デザイン', value: 20 },
              { id: 'レビュー', value: 15 },
              { id: 'UI', value: 10 },
              { id: 'フィードバック', value: 8 }
            ],
            links: [
              { source: 'デザイン', target: 'レビュー', value: 5 },
              { source: 'デザイン', target: 'UI', value: 3 },
              { source: 'レビュー', target: 'フィードバック', value: 4 }
            ]
          }
        }
      },
      {
        id: '3',
        title: '未解決の質問が多いトピック',
        description: '実装スケジュールに関する議論に複数の未解決の質問があります。優先的に対応が必要かもしれません。',
        type: 'activity',
        confidence: 0.78,
        timestamp: new Date(Date.now() - 259200000).toISOString(),
        keywords: ['実装', 'スケジュール', '期限', '質問'],
        relatedItemIds: {
          messageIds: [
            messagesByRoom[Object.keys(messagesByRoom)[0]]?.[0]?.id,
            messagesByRoom[Object.keys(messagesByRoom)[0]]?.[1]?.id
          ].filter(Boolean)
        }
      },
      {
        id: '4',
        title: '協業パターンの分析',
        description: 'チームメンバー間の協業パターンを分析しました。特定のトピックについては、より広範な協力が必要かもしれません。',
        type: 'relationship',
        confidence: 0.75,
        timestamp: new Date(Date.now() - 345600000).toISOString(),
        keywords: ['協業', 'チームワーク', 'コラボレーション'],
        relatedItemIds: {
          cardIds: cards.slice(0, 2).map((c: any) => c?.id).filter(Boolean)
        },
        visualType: 'heatmap',
        visualData: {
          type: 'heatmap',
          data: {
            x: ['メンバーA', 'メンバーB', 'メンバーC'],
            y: ['メンバーA', 'メンバーB', 'メンバーC'],
            values: [
              [0, 5, 3],
              [5, 0, 2],
              [3, 2, 0]
            ]
          }
        }
      },
      {
        id: '5',
        title: 'リソース計画の必要性',
        description: '議論の中で、リソース計画に関する言及が増えています。チームがこの領域でより詳細な計画を必要としている可能性があります。',
        type: 'trend',
        confidence: 0.88,
        timestamp: new Date(Date.now() - 432000000).toISOString(),
        keywords: ['リソース', '計画', '人員配置'],
        relatedItemIds: {
          cardIds: cards.slice(1, 4).map((c: any) => c?.id).filter(Boolean),
          chatRoomIds: Object.keys(messagesByRoom).slice(1, 2)
        },
        visualType: 'timeline',
        visualData: {
          type: 'line',
          data: {
            labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
            datasets: [{
              label: 'リソース言及回数',
              data: [2, 5, 8, 12]
            }]
          }
        }
      }
    ];
    
    return insights;
  };
  
  // Generate mock activity timeline
  const generateMockActivities = (cards: any[], messagesByRoom: any, rooms: any) => {
    const activities: ActivityEvent[] = [
      {
        id: '1',
        type: 'message',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        description: '重要なプロジェクトの締め切りについて議論されました',
        userId: 'user1',
        userName: 'ユーザー1',
        sourceId: Object.keys(messagesByRoom)[0],
        sourceType: 'chat',
        importance: 0.9,
        relatedItemIds: cards.slice(0, 1).map((c: any) => c?.id).filter(Boolean)
      },
      {
        id: '2',
        type: 'card_created',
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        description: '新しいアイデアがボードに追加されました',
        userId: 'user2',
        userName: 'ユーザー2',
        sourceId: cards[0]?.id,
        sourceType: 'board',
        importance: 0.7,
        relatedItemIds: []
      },
      {
        id: '3',
        type: 'insight_generated',
        timestamp: new Date(Date.now() - 86400000).toISOString(),
        description: 'AIが新しい洞察を生成しました: コミュニケーションパターンの変化',
        userId: 'system',
        userName: 'システム',
        sourceId: '1',
        sourceType: 'analysis',
        importance: 0.85,
        relatedItemIds: cards.slice(0, 3).map((c: any) => c?.id).filter(Boolean)
      },
      {
        id: '4',
        type: 'card_moved',
        timestamp: new Date(Date.now() - 172800000).toISOString(),
        description: 'カードがINBOXからINSIGHTSに移動されました',
        userId: 'user1',
        userName: 'ユーザー1',
        sourceId: cards[1]?.id,
        sourceType: 'board',
        importance: 0.6,
        relatedItemIds: [cards[1]?.id].filter(Boolean)
      },
      {
        id: '5',
        type: 'meeting',
        timestamp: new Date(Date.now() - 259200000).toISOString(),
        description: 'プロジェクトレビューミーティングが行われました',
        userId: 'user2',
        userName: 'ユーザー2',
        sourceType: 'chat',
        importance: 0.8,
        relatedItemIds: cards.slice(2, 4).map((c: any) => c?.id).filter(Boolean)
      }
    ];
    
    return activities;
  };
  
  // Generate mock trend data
  const generateMockTrends = (cards: any[], messagesByRoom: any) => {
    const now = Date.now();
    const day = 86400000;
    
    const trends: TrendData[] = [
      {
        id: '1',
        title: 'メッセージ頻度の増加',
        description: '過去2週間でメッセージ頻度が25%増加しています',
        timeRange: {
          start: new Date(now - 14 * day).toISOString(),
          end: new Date(now).toISOString()
        },
        dataPoints: Array(14).fill(0).map((_, i) => ({
          timestamp: new Date(now - (13 - i) * day).toISOString(),
          value: 10 + Math.floor(i * 1.5) + Math.floor(Math.random() * 5)
        })),
        metric: 'message_count',
        trend: 'increasing',
        significance: 0.85,
        relatedKeywords: ['プロジェクト', 'スケジュール', 'デザイン']
      },
      {
        id: '2',
        title: 'ボードのアクティビティパターン',
        description: '週の前半にボードアクティビティが集中する傾向があります',
        timeRange: {
          start: new Date(now - 14 * day).toISOString(),
          end: new Date(now).toISOString()
        },
        dataPoints: Array(14).fill(0).map((_, i) => ({
          timestamp: new Date(now - (13 - i) * day).toISOString(),
          value: 5 + Math.sin(i * 0.9) * 4 + Math.floor(Math.random() * 3),
          label: ['月', '火', '水', '木', '金', '土', '日'][new Date(now - (13 - i) * day).getDay()]
        })),
        metric: 'card_count',
        trend: 'fluctuating',
        significance: 0.7,
        relatedKeywords: ['タスク', 'アイデア', 'フィードバック']
      },
      {
        id: '3',
        title: 'キーワード「デザイン」の出現頻度',
        description: '「デザイン」というキーワードの使用頻度が増加しています',
        timeRange: {
          start: new Date(now - 14 * day).toISOString(),
          end: new Date(now).toISOString()
        },
        dataPoints: Array(14).fill(0).map((_, i) => ({
          timestamp: new Date(now - (13 - i) * day).toISOString(),
          value: 2 + Math.floor(i * 0.7) + Math.floor(Math.random() * 2)
        })),
        metric: 'keyword_frequency',
        trend: 'increasing',
        significance: 0.75,
        relatedKeywords: ['UI', 'レビュー', '改善']
      }
    ];
    
    return trends;
  };
  
  // Generate mock keyword network
  const generateMockKeywordNetwork = (cards: any[], messagesByRoom: any) => {
    const keywordNetwork: KeywordNetwork = {
      nodes: [
        { id: 'デザイン', label: 'デザイン', count: 24, importance: 0.9, category: 'UI/UX' },
        { id: 'プロジェクト', label: 'プロジェクト', count: 32, importance: 0.85, category: '管理' },
        { id: 'スケジュール', label: 'スケジュール', count: 18, importance: 0.8, category: '管理' },
        { id: 'フィードバック', label: 'フィードバック', count: 15, importance: 0.75, category: 'コミュニケーション' },
        { id: 'UI', label: 'UI', count: 12, importance: 0.7, category: 'UI/UX' },
        { id: 'アイデア', label: 'アイデア', count: 20, importance: 0.65, category: '創造性' },
        { id: '実装', label: '実装', count: 10, importance: 0.6, category: '開発' },
        { id: 'バグ', label: 'バグ', count: 8, importance: 0.55, category: '開発' },
        { id: 'ミーティング', label: 'ミーティング', count: 14, importance: 0.5, category: 'コミュニケーション' },
        { id: 'リソース', label: 'リソース', count: 6, importance: 0.45, category: '管理' }
      ],
      links: [
        { source: 'デザイン', target: 'UI', strength: 0.9, count: 10 },
        { source: 'デザイン', target: 'フィードバック', strength: 0.7, count: 8 },
        { source: 'プロジェクト', target: 'スケジュール', strength: 0.85, count: 15 },
        { source: 'プロジェクト', target: 'リソース', strength: 0.6, count: 5 },
        { source: 'スケジュール', target: 'ミーティング', strength: 0.65, count: 7 },
        { source: 'UI', target: 'アイデア', strength: 0.55, count: 6 },
        { source: 'アイデア', target: '実装', strength: 0.5, count: 5 },
        { source: '実装', target: 'バグ', strength: 0.8, count: 8 },
        { source: 'フィードバック', target: 'ミーティング', strength: 0.7, count: 9 },
        { source: 'バグ', target: 'フィードバック', strength: 0.65, count: 7 },
        { source: 'プロジェクト', target: 'ミーティング', strength: 0.75, count: 12 },
        { source: 'デザイン', target: 'アイデア', strength: 0.6, count: 8 }
      ],
      timeRange: {
        start: new Date(Date.now() - 14 * 86400000).toISOString(),
        end: new Date().toISOString()
      }
    };
    
    return keywordNetwork;
  };
  
  // Filter insights based on current filters
  const filteredInsights = useMemo(() => {
    const { filters } = analysisState;
    
    return analysisState.insights.filter(insight => {
      // Filter by time range
      if (filters.timeRange.start && new Date(insight.timestamp) < filters.timeRange.start) {
        return false;
      }
      
      if (filters.timeRange.end && new Date(insight.timestamp) > filters.timeRange.end) {
        return false;
      }
      
      // Filter by type
      if (filters.types.length > 0 && !filters.types.includes(insight.type)) {
        return false;
      }
      
      // Filter by confidence
      if (insight.confidence < filters.confidence) {
        return false;
      }
      
      // Filter by keywords
      if (filters.keywords.length > 0 && !insight.keywords.some(k => filters.keywords.includes(k))) {
        return false;
      }
      
      // Filter by search query
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        return (
          insight.title.toLowerCase().includes(query) ||
          insight.description.toLowerCase().includes(query) ||
          insight.keywords.some(k => k.toLowerCase().includes(query))
        );
      }
      
      return true;
    });
  }, [analysisState.insights, analysisState.filters]);
  
  // Sort insights based on current sort settings
  const sortedInsights = useMemo(() => {
    const { sortBy, sortDirection } = analysisState;
    
    return [...filteredInsights].sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
          break;
        case 'confidence':
          comparison = a.confidence - b.confidence;
          break;
        case 'relevance':
          // For relevance, we'll use a combination of confidence and date
          const dateA = new Date(a.timestamp).getTime();
          const dateB = new Date(b.timestamp).getTime();
          const recencyWeight = 0.3;
          const confidenceWeight = 0.7;
          
          const normalizedDateA = (Date.now() - dateA) / (30 * 86400000); // Normalize to 0-1 over 30 days
          const normalizedDateB = (Date.now() - dateB) / (30 * 86400000);
          
          const scoreA = (a.confidence * confidenceWeight) + ((1 - normalizedDateA) * recencyWeight);
          const scoreB = (b.confidence * confidenceWeight) + ((1 - normalizedDateB) * recencyWeight);
          
          comparison = scoreA - scoreB;
          break;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredInsights, analysisState.sortBy, analysisState.sortDirection]);
  
  // Update filters
  const updateFilters = useCallback((newFilters: Partial<AnalysisSpaceState['filters']>) => {
    setAnalysisState(prev => ({
      ...prev,
      filters: {
        ...prev.filters,
        ...newFilters
      }
    }));
  }, []);
  
  // Reset filters
  const resetFilters = useCallback(() => {
    setAnalysisState(prev => ({
      ...prev,
      filters: {
        timeRange: {
          start: null,
          end: null
        },
        types: [],
        keywords: [],
        confidence: 0.5,
        searchQuery: ''
      }
    }));
  }, []);
  
  // Set view mode
  const setViewMode = useCallback((mode: AnalysisSpaceState['viewMode']) => {
    setAnalysisState(prev => ({
      ...prev,
      viewMode: mode
    }));
  }, []);
  
  // Set sort settings
  const setSorting = useCallback((sortBy: AnalysisSpaceState['sortBy'], sortDirection: AnalysisSpaceState['sortDirection']) => {
    setAnalysisState(prev => ({
      ...prev,
      sortBy,
      sortDirection
    }));
  }, []);
  
  // Select an insight
  const selectInsight = useCallback((insightId: string | null) => {
    setAnalysisState(prev => ({
      ...prev,
      selectedInsightId: insightId
    }));
  }, []);
  
  // Star/unstar an insight
  const toggleInsightStar = useCallback((insightId: string) => {
    setAnalysisState(prev => ({
      ...prev,
      insights: prev.insights.map(insight => 
        insight.id === insightId
          ? { ...insight, isStarred: !insight.isStarred }
          : insight
      )
    }));
  }, []);
  
  // Archive/unarchive an insight
  const toggleInsightArchive = useCallback((insightId: string) => {
    setAnalysisState(prev => ({
      ...prev,
      insights: prev.insights.map(insight => 
        insight.id === insightId
          ? { ...insight, isArchived: !insight.isArchived }
          : insight
      )
    }));
  }, []);
  
  // Navigate to related content in other spaces
  const navigateToRelatedContent = useCallback((sourceId: string, sourceType: string) => {
    if (sourceType === 'chat') {
      navigateToSpace(SpaceType.CHAT);
    } else if (sourceType === 'board') {
      navigateToSpace(SpaceType.BOARD);
    }
  }, [navigateToSpace]);
  
  // Extract all available keywords from insights
  const availableKeywords = useMemo(() => {
    const keywordSet = new Set<string>();
    analysisState.insights.forEach(insight => {
      insight.keywords.forEach(keyword => keywordSet.add(keyword));
    });
    return Array.from(keywordSet).sort();
  }, [analysisState.insights]);
  
  // Extract available insight types
  const availableTypes = useMemo(() => {
    const typeSet = new Set<string>();
    analysisState.insights.forEach(insight => {
      typeSet.add(insight.type);
    });
    return Array.from(typeSet).sort();
  }, [analysisState.insights]);
  
  // Get the currently selected insight
  const selectedInsight = useMemo(() => {
    if (!analysisState.selectedInsightId) return null;
    return analysisState.insights.find(insight => insight.id === analysisState.selectedInsightId) || null;
  }, [analysisState.selectedInsightId, analysisState.insights]);
  
  return {
    // State
    analysisState,
    filteredInsights: sortedInsights,
    selectedInsight,
    availableKeywords,
    availableTypes,
    
    // Actions
    generateAnalysisData,
    updateFilters,
    resetFilters,
    setViewMode,
    setSorting,
    selectInsight,
    toggleInsightStar,
    toggleInsightArchive,
    navigateToRelatedContent
  };
}; 