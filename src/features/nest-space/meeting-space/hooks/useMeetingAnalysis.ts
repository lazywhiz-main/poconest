import { useState, useCallback, useEffect } from 'react';
import { ZoomMeeting, ZoomAnalysis } from './useZoomSpace';

// アクションアイテムの型定義
export interface ActionItem {
  id: string;
  content: string;
  assignee: string;
  deadline?: string;
  status: 'pending' | 'in_progress' | 'completed';
  createdAt: string;
  updatedAt: string;
}

// キーポイントの型定義
export interface KeyPoint {
  id: string;
  content: string;
  topicId?: string;
  timestamp: number;
  importance: number; // 0-1
}

// ミーティングのトピックの型定義
export interface MeetingTopic {
  id: string;
  title: string;
  startTime: number;
  endTime: number;
  keyPoints: KeyPoint[];
  sentiment: 'positive' | 'neutral' | 'negative';
}

// 単語頻度データの型定義
export interface WordFrequencyData {
  word: string;
  count: number;
  importance: number; // 0-1
}

// 分析フィルターの型定義
interface AnalysisFilter {
  topicId?: string;
  speakerId?: string;
  sentimentType?: 'positive' | 'neutral' | 'negative';
  timeRange?: {
    start: number;
    end: number;
  };
  searchQuery?: string;
}

// ミーティング分析フック
export const useMeetingAnalysis = (selectedMeeting?: ZoomMeeting | null) => {
  // 分析データステート
  const [analysis, setAnalysis] = useState<ZoomAnalysis | null>(null);
  
  // アクションアイテムリスト
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  
  // キーポイントリスト
  const [keyPoints, setKeyPoints] = useState<KeyPoint[]>([]);
  
  // トピックリスト
  const [topics, setTopics] = useState<MeetingTopic[]>([]);
  
  // 単語頻度データ
  const [wordFrequencyData, setWordFrequencyData] = useState<WordFrequencyData[]>([]);
  
  // フィルター状態
  const [filter, setFilter] = useState<AnalysisFilter>({});
  
  // 分析処理状態
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 選択されたミーティングが変更されたら、データをリセット
  useEffect(() => {
    if (selectedMeeting) {
      setAnalysis(selectedMeeting.analysis || null);
      
      if (selectedMeeting.analysis) {
        // 分析データからアクションアイテムを抽出
        const extractedActionItems: ActionItem[] = selectedMeeting.analysis.actionItems.map(item => {
          // "担当者: タスク内容 (期限: 日付)" の形式からデータを抽出
          const assigneeMatch = item.match(/^(.+?):/);
          const deadlineMatch = item.match(/\(期限: (.+?)\)/);
          const content = item
            .replace(/^(.+?):/, '')
            .replace(/\(期限: (.+?)\)/, '')
            .trim();
          
          return {
            id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            content,
            assignee: assigneeMatch ? assigneeMatch[1].trim() : '',
            deadline: deadlineMatch ? deadlineMatch[1].trim() : undefined,
            status: 'pending',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
        });
        
        setActionItems(extractedActionItems);
        
        // トピックとキーポイントを設定
        const extractedTopics: MeetingTopic[] = selectedMeeting.analysis.topicSegments.map(segment => {
          // 各トピックのキーポイントを生成
          const topicKeyPoints: KeyPoint[] = segment.keyPoints.map((point, index) => ({
            id: `keypoint_${Date.now()}_${index}`,
            content: point,
            timestamp: segment.startTime + Math.floor((segment.endTime - segment.startTime) * (index / (segment.keyPoints.length || 1))),
            importance: 0.7 + (Math.random() * 0.3), // 重要度をランダムに設定（0.7〜1.0）
          }));
          
          return {
            id: `topic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            title: segment.title,
            startTime: segment.startTime,
            endTime: segment.endTime,
            keyPoints: topicKeyPoints,
            sentiment: 'neutral', // センチメントはデフォルトで中立
          };
        });
        
        setTopics(extractedTopics);
        
        // 全キーポイントをフラットに保持
        const allKeyPoints = extractedTopics.flatMap(topic => 
          topic.keyPoints.map(point => ({
            ...point,
            topicId: topic.id
          }))
        );
        setKeyPoints(allKeyPoints);
        
        // 単語頻度データを設定
        const words = Object.entries(selectedMeeting.analysis.wordFrequency).map(([word, count]) => ({
          word,
          count,
          importance: count / Math.max(...Object.values(selectedMeeting.analysis.wordFrequency))
        }));
        setWordFrequencyData(words);
      } else {
        // 分析がまだない場合は空にリセット
        setActionItems([]);
        setKeyPoints([]);
        setTopics([]);
        setWordFrequencyData([]);
      }
    }
  }, [selectedMeeting]);
  
  // ミーティングの分析を開始
  const startAnalysis = useCallback(async () => {
    if (!selectedMeeting) return;
    
    setIsAnalyzing(true);
    setError(null);
    
    try {
      // 実際の実装では、APIを呼び出して分析処理を開始
      // ここではモック実装
      
      // 分析処理の遅延をシミュレート
      setTimeout(() => {
        // AIによる分析結果を生成（ここではランダムなものを使用）
        const now = new Date();
        
        const mockAnalysis: ZoomAnalysis = {
          id: `analysis_${Date.now()}`,
          meetingId: selectedMeeting.id,
          keyPoints: [
            '製品リリース日程を2週間延期することを決定',
            'マーケティングキャンペーンの予算を追加で確保',
            'デザインチームとエンジニアリングチームの協業プロセスを見直し'
          ],
          actionItems: [
            '田中: リリース計画の修正 (期限: 6/15)',
            '鈴木: 追加予算の申請書類作成 (期限: 6/10)',
            '伊藤: 新協業プロセスの提案書作成 (期限: 6/20)'
          ],
          sentiment: 'positive',
          speakingTimePercentage: {
            [selectedMeeting.host]: 55,
            [selectedMeeting.participants[0]?.name || '参加者1']: 45
          },
          topicSegments: [
            {
              title: '前回の振り返り',
              startTime: 0,
              endTime: 600,
              keyPoints: ['前回の決定事項の確認', '未解決の課題の確認']
            },
            {
              title: 'リリース計画の見直し',
              startTime: 600,
              endTime: 1800,
              keyPoints: ['現在の進捗状況', 'リスク要因の特定', '日程変更の決定']
            },
            {
              title: 'マーケティング戦略',
              startTime: 1800,
              endTime: 2700,
              keyPoints: ['ターゲット層の再検討', '予算配分の議論']
            },
            {
              title: '今後のアクション',
              startTime: 2700,
              endTime: 3600,
              keyPoints: ['各担当の次回までのタスク確認', '次回会議日程の決定']
            }
          ],
          wordFrequency: {
            'リリース': 24,
            '予算': 18,
            '計画': 15,
            'マーケティング': 12,
            'スケジュール': 10,
            '延期': 8,
            'デザイン': 7,
            '協業': 6,
            '改善': 5
          },
          aiSummary: 'この会議では製品リリーススケジュールの見直しが主な議題となり、現状の課題を踏まえて2週間の延期が決定されました。また、マーケティング予算の追加確保とチーム間の協業プロセス改善についても合意に至りました。',
          generatedAt: now.toISOString()
        };
        
        setAnalysis(mockAnalysis);
        
        // 分析結果をもとにアクションアイテム、トピック、キーポイントを設定
        const extractedActionItems: ActionItem[] = mockAnalysis.actionItems.map(item => {
          const assigneeMatch = item.match(/^(.+?):/);
          const deadlineMatch = item.match(/\(期限: (.+?)\)/);
          const content = item
            .replace(/^(.+?):/, '')
            .replace(/\(期限: (.+?)\)/, '')
            .trim();
          
          return {
            id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            content,
            assignee: assigneeMatch ? assigneeMatch[1].trim() : '',
            deadline: deadlineMatch ? deadlineMatch[1].trim() : undefined,
            status: 'pending',
            createdAt: now.toISOString(),
            updatedAt: now.toISOString()
          };
        });
        
        setActionItems(extractedActionItems);
        
        // トピックとキーポイントを設定
        const extractedTopics: MeetingTopic[] = mockAnalysis.topicSegments.map(segment => {
          const topicKeyPoints: KeyPoint[] = segment.keyPoints.map((point, index) => ({
            id: `keypoint_${Date.now()}_${index}`,
            content: point,
            timestamp: segment.startTime + Math.floor((segment.endTime - segment.startTime) * (index / (segment.keyPoints.length || 1))),
            importance: 0.7 + (Math.random() * 0.3),
          }));
          
          return {
            id: `topic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            title: segment.title,
            startTime: segment.startTime,
            endTime: segment.endTime,
            keyPoints: topicKeyPoints,
            sentiment: 'neutral',
          };
        });
        
        setTopics(extractedTopics);
        
        // 全キーポイントをフラットに保持
        const allKeyPoints = extractedTopics.flatMap(topic => 
          topic.keyPoints.map(point => ({
            ...point,
            topicId: topic.id
          }))
        );
        setKeyPoints(allKeyPoints);
        
        // 単語頻度データを設定
        const words = Object.entries(mockAnalysis.wordFrequency).map(([word, count]) => ({
          word,
          count,
          importance: count / Math.max(...Object.values(mockAnalysis.wordFrequency))
        }));
        setWordFrequencyData(words);
        
        setIsAnalyzing(false);
      }, 3000);
      
    } catch (error) {
      setError(error instanceof Error ? error.message : '分析処理中にエラーが発生しました');
      setIsAnalyzing(false);
    }
  }, [selectedMeeting]);
  
  // アクションアイテムの追加
  const addActionItem = useCallback((actionItem: Omit<ActionItem, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const newActionItem: ActionItem = {
      ...actionItem,
      id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: now,
      updatedAt: now
    };
    
    setActionItems(prev => [...prev, newActionItem]);
    return newActionItem;
  }, []);
  
  // アクションアイテムの更新
  const updateActionItem = useCallback((actionItemId: string, updates: Partial<ActionItem>) => {
    setActionItems(prev => 
      prev.map(item => 
        item.id === actionItemId
          ? { ...item, ...updates, updatedAt: new Date().toISOString() }
          : item
      )
    );
  }, []);
  
  // アクションアイテムの削除
  const deleteActionItem = useCallback((actionItemId: string) => {
    setActionItems(prev => prev.filter(item => item.id !== actionItemId));
  }, []);
  
  // キーポイントの追加
  const addKeyPoint = useCallback((keyPoint: Omit<KeyPoint, 'id'>) => {
    const newKeyPoint: KeyPoint = {
      ...keyPoint,
      id: `keypoint_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    
    setKeyPoints(prev => [...prev, newKeyPoint]);
    
    // トピックに紐づいている場合は、トピックのキーポイントも更新
    if (keyPoint.topicId) {
      setTopics(prev => 
        prev.map(topic => 
          topic.id === keyPoint.topicId
            ? { ...topic, keyPoints: [...topic.keyPoints, newKeyPoint] }
            : topic
        )
      );
    }
    
    return newKeyPoint;
  }, []);
  
  // トピックの追加
  const addTopic = useCallback((topic: Omit<MeetingTopic, 'id' | 'keyPoints'>) => {
    const newTopic: MeetingTopic = {
      ...topic,
      id: `topic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      keyPoints: []
    };
    
    setTopics(prev => [...prev, newTopic]);
    return newTopic;
  }, []);
  
  // トピックの更新
  const updateTopic = useCallback((topicId: string, updates: Partial<Omit<MeetingTopic, 'keyPoints'>>) => {
    setTopics(prev => 
      prev.map(topic => 
        topic.id === topicId
          ? { ...topic, ...updates }
          : topic
      )
    );
  }, []);
  
  // フィルターの適用
  const applyFilter = useCallback((newFilter: AnalysisFilter) => {
    setFilter(prev => ({ ...prev, ...newFilter }));
  }, []);
  
  // フィルターのリセット
  const resetFilter = useCallback(() => {
    setFilter({});
  }, []);
  
  // フィルタリングされたキーポイント取得
  const filteredKeyPoints = keyPoints.filter(keyPoint => {
    // トピックIDでフィルタリング
    if (filter.topicId && keyPoint.topicId !== filter.topicId) {
      return false;
    }
    
    // 時間範囲でフィルタリング
    if (filter.timeRange) {
      if (keyPoint.timestamp < filter.timeRange.start || keyPoint.timestamp > filter.timeRange.end) {
        return false;
      }
    }
    
    // 検索クエリでフィルタリング
    if (filter.searchQuery) {
      const query = filter.searchQuery.toLowerCase();
      if (!keyPoint.content.toLowerCase().includes(query)) {
        return false;
      }
    }
    
    return true;
  });
  
  // フィルタリングされたトピック取得
  const filteredTopics = topics.filter(topic => {
    // センチメントでフィルタリング
    if (filter.sentimentType && topic.sentiment !== filter.sentimentType) {
      return false;
    }
    
    // 時間範囲でフィルタリング
    if (filter.timeRange) {
      // トピックの時間範囲と指定された時間範囲に重なりがあるかチェック
      if (topic.endTime < filter.timeRange.start || topic.startTime > filter.timeRange.end) {
        return false;
      }
    }
    
    // 検索クエリでフィルタリング
    if (filter.searchQuery) {
      const query = filter.searchQuery.toLowerCase();
      if (!topic.title.toLowerCase().includes(query) && 
          !topic.keyPoints.some(kp => kp.content.toLowerCase().includes(query))) {
        return false;
      }
    }
    
    return true;
  });
  
  // ミーティングサマリーの生成
  const generateSummary = useCallback(() => {
    if (!analysis) return null;
    
    return {
      title: selectedMeeting?.title || 'ミーティング',
      date: selectedMeeting?.date || new Date().toISOString(),
      duration: selectedMeeting?.duration || 0,
      participants: selectedMeeting?.participants.map(p => p.name) || [],
      summary: analysis.aiSummary,
      keyPoints: analysis.keyPoints,
      actionItems: actionItems.map(item => `${item.assignee}: ${item.content}${item.deadline ? ` (期限: ${item.deadline})` : ''}`),
      topics: topics.map(topic => ({
        title: topic.title,
        keyPoints: topic.keyPoints.map(kp => kp.content)
      }))
    };
  }, [analysis, selectedMeeting, actionItems, topics]);
  
  // アクションアイテムをボードカードとして生成
  const generateBoardCards = useCallback(() => {
    return actionItems.map(item => ({
      title: `[アクション] ${item.content}`,
      description: `担当: ${item.assignee}\n${item.deadline ? `期限: ${item.deadline}\n` : ''}ミーティング: ${selectedMeeting?.title || ''}`,
      tags: ['アクションアイテム', `担当:${item.assignee}`, selectedMeeting?.title || ''],
      status: 'todo'
    }));
  }, [actionItems, selectedMeeting]);
  
  // ミーティング要約をカードとして生成
  const generateSummaryCard = useCallback(() => {
    if (!analysis) return null;
    
    return {
      title: `[要約] ${selectedMeeting?.title || 'ミーティング'}`,
      description: analysis.aiSummary,
      tags: ['ミーティング要約', ...analysis.keyPoints.map(kp => kp.slice(0, 20))],
      status: 'info'
    };
  }, [analysis, selectedMeeting]);
  
  return {
    // 状態
    analysis,
    actionItems,
    keyPoints,
    topics,
    wordFrequencyData,
    filteredKeyPoints,
    filteredTopics,
    filter,
    isAnalyzing,
    error,
    
    // 分析操作
    startAnalysis,
    applyFilter,
    resetFilter,
    
    // アクションアイテム操作
    addActionItem,
    updateActionItem,
    deleteActionItem,
    
    // トピック・キーポイント操作
    addKeyPoint,
    addTopic,
    updateTopic,
    
    // 統合機能
    generateSummary,
    generateBoardCards,
    generateSummaryCard
  };
}; 