import { useState, useEffect, useCallback } from 'react';
import { Message } from '../types/chat';
import { aiAnalysisService, AIInsight } from '../services/AIAnalysisService';

interface UseAutoInsightExtractionProps {
  channelId?: string;
  messages?: Message[];
  enabled?: boolean;
  analysisThreshold?: number;
  onNewInsightsGenerated?: (insights: AIInsight[]) => void;
}

/**
 * チャットメッセージからの自動洞察抽出フック
 * 
 * チャット会話を監視し、AIによる洞察抽出を定期的に実行する
 */
export const useAutoInsightExtraction = ({
  channelId = '',
  messages = [],
  enabled = true,
  analysisThreshold = 5, // 分析を開始するためのメッセージ数の閾値
  onNewInsightsGenerated,
}: UseAutoInsightExtractionProps) => {
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastAnalyzedMessageCount, setLastAnalyzedMessageCount] = useState(0);
  const [analysisStats, setAnalysisStats] = useState({
    totalAnalyses: 0,
    totalInsightsGenerated: 0,
    averageProcessingTime: 0,
  });

  // 分析を実行するか判断する
  const shouldAnalyze = useCallback(() => {
    if (!enabled || !channelId || messages.length === 0) return false;
    
    // 新しいメッセージが閾値以上あるかチェック
    const newMessageCount = messages.length - lastAnalyzedMessageCount;
    return newMessageCount >= analysisThreshold;
  }, [enabled, channelId, messages, lastAnalyzedMessageCount, analysisThreshold]);

  // 洞察抽出の実行
  const runAnalysis = useCallback(() => {
    if (isAnalyzing || !shouldAnalyze()) return;
    
    setIsAnalyzing(true);
    
    // 分析対象のメッセージを取得（すべてのメッセージまたは最新の一部）
    const messagesToAnalyze = messages.slice(-30); // 最新30メッセージのみ分析
    
    // AIサービスを呼び出して分析
    aiAnalysisService.requestAnalysis(
      messagesToAnalyze,
      channelId,
      (result) => {
        if (result.insights.length > 0) {
          // 新しい洞察を追加
          setInsights(prevInsights => {
            // 重複を避けるために既存のIDを取得
            const existingIds = new Set(prevInsights.map(i => i.id));
            
            // 重複しない新しい洞察のみをフィルター
            const newInsights = result.insights.filter(i => !existingIds.has(i.id));
            
            // コールバックがあれば呼び出す
            if (newInsights.length > 0 && onNewInsightsGenerated) {
              onNewInsightsGenerated(newInsights);
            }
            
            // 洞察を統合して返す
            return [...prevInsights, ...newInsights];
          });
          
          // 統計情報の更新
          setAnalysisStats(prev => {
            const newTotalAnalyses = prev.totalAnalyses + 1;
            const newTotalInsights = prev.totalInsightsGenerated + result.insights.length;
            
            // 加重平均で処理時間を計算
            const newAvgTime = 
              (prev.averageProcessingTime * prev.totalAnalyses + result.processingTime) / 
              newTotalAnalyses;
            
            return {
              totalAnalyses: newTotalAnalyses,
              totalInsightsGenerated: newTotalInsights,
              averageProcessingTime: newAvgTime,
            };
          });
        }
        
        // 分析完了
        setLastAnalyzedMessageCount(messages.length);
        setIsAnalyzing(false);
      }
    );
  }, [
    isAnalyzing, 
    shouldAnalyze, 
    messages, 
    channelId, 
    onNewInsightsGenerated
  ]);

  // メッセージの変更を監視して自動分析を実行
  useEffect(() => {
    if (shouldAnalyze()) {
      runAnalysis();
    }
  }, [messages, shouldAnalyze, runAnalysis]);

  // 分析を手動でトリガーする関数
  const triggerAnalysis = useCallback(() => {
    runAnalysis();
  }, [runAnalysis]);

  // 特定の洞察の詳細を取得
  const getInsightById = useCallback((insightId: string) => {
    return insights.find(insight => insight.id === insightId) || null;
  }, [insights]);

  // 特定のチャネルに関連する洞察をフィルタリング
  const getInsightsByChannelId = useCallback((targetChannelId: string) => {
    return insights.filter(insight => 
      insight.relatedItems?.channelId === targetChannelId
    );
  }, [insights]);

  return {
    insights,
    isAnalyzing,
    analysisStats,
    triggerAnalysis,
    getInsightById,
    getInsightsByChannelId,
  };
}; 