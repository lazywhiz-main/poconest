import { useEffect, useCallback } from 'react';
import { useAutoInsightExtraction } from './useAutoInsightExtraction';
import { useBoardContext } from '../features/board-space/contexts/BoardContext';
import { Message } from '../types/chat';

interface UseChatToBoardProps {
  channelId: string;
  messages: Message[];
  enabled?: boolean;
}

/**
 * チャットとボードを連携するカスタムフック
 * 
 * チャットから抽出された洞察をボード空間に自動的に追加する
 */
export const useChatToBoard = ({
  channelId,
  messages,
  enabled = true
}: UseChatToBoardProps) => {
  // ボードコンテキストの取得
  const { addInsights } = useBoardContext();
  
  // チャットからの洞察抽出
  const { insights, triggerAnalysis, isAnalyzing } = useAutoInsightExtraction({
    channelId,
    messages,
    enabled,
    onNewInsightsGenerated: (newInsights) => {
      // 新しい洞察が生成されたら自動的にボードに追加
      addInsights(newInsights);
    }
  });
  
  // チャット→ボード連携のステータス
  const status = {
    isEnabled: enabled,
    isAnalyzing,
    insightCount: insights.length
  };
  
  // 手動で分析をトリガー
  const startAnalysis = useCallback(() => {
    triggerAnalysis();
  }, [triggerAnalysis]);
  
  return {
    status,
    startAnalysis,
    insights
  };
}; 