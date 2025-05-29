import { useEffect, useCallback, useState } from 'react';
import { useAutoInsightExtraction } from './useAutoInsightExtraction';
import { useBoardContext, BoardColumnType } from '../features/board-space/contexts/BoardContext';
import { Message } from '../types/chat';
import { v4 as uuidv4 } from 'uuid';
import { addBoardCards, addSource, addCardSource, Source } from '../services/BoardService';
import { supabase } from '../services/supabase/client';
import { useAuth } from '../contexts/AuthContext';

interface UseChatToBoardProps {
  channelId: string;
  messages: Message[];
  enabled?: boolean;
  onError?: (error: { type: string; message: string; details?: any }) => void;
  onNewInsightsGenerated?: (insights: any[]) => void;
}

/**
 * チャットとボードを連携するカスタムフック
 * 
 * チャットから抽出された洞察をボード空間に自動的に追加する
 */
export const useChatToBoard = ({
  channelId,
  messages,
  enabled = true,
  onError,
  onNewInsightsGenerated
}: UseChatToBoardProps) => {
  // ボードコンテキストの取得
  const { addCards, state } = useBoardContext();
  const boardId = state.boardId;
  const { user } = useAuth();
  const [lastError, setLastError] = useState<{ type: string; message: string; details?: any } | null>(null);
  
  // チャットからの洞察抽出
  const { insights, triggerAnalysis, isAnalyzing, lastError: extractionError } = useAutoInsightExtraction({
    channelId,
    messages,
    enabled,
    onError: (error) => {
      setLastError(error);
      if (onError) onError(error);
    },
    async onNewInsightsGenerated(newInsights) {
      // 1. チャット内容をsourceとして登録
      const now = new Date();
      const label = `チャットログ（${now.toLocaleString()}）`;
      const sourceInsert = {
        type: 'chat',
        label,
        meta: { messages: JSON.stringify(messages), channelId },
      };
      let source: Source | null = null;
      try {
        const res = await addSource(sourceInsert);
        if (res.data) source = res.data;
      } catch (e) {
        console.error('source登録失敗', e);
      }
      // 2. カードをDBにinsert
      const nowStr = now.toISOString();
      const cardsToInsert = newInsights.map(insight => ({
        board_id: boardId,
        title: insight.title,
        content: insight.content,
        column_type: BoardColumnType.INBOX,
        created_by: user?.id || 'ai',
        created_at: nowStr,
        updated_at: nowStr,
        order_index: 0,
        is_archived: false,
        metadata: insight.metadata ?? {},
      }));
      const { data, error } = await addBoardCards(cardsToInsert);
      if (!error && data) {
        // 3. タグ・リレーションも追加
        for (let i = 0; i < data.length; i++) {
          const cardId = data[i].id;
          const insight = newInsights[i];
          // tags
          if (insight.tags && insight.tags.length > 0) {
            await supabase.from('board_card_tags').insert(insight.tags.map(tag => ({ card_id: cardId, tag })));
          }
          // sources
          if (source) {
            await addCardSource({ card_id: cardId, source_id: source.id });
          }
        }
        addCards(data);
        setLastError(null);
        if (onNewInsightsGenerated) onNewInsightsGenerated(data);
      } else {
        const err = { type: 'DB_ERROR', message: 'カードの保存に失敗', details: error };
        setLastError(err);
        if (onError) onError(err);
      }
    }
  });
  
  // チャット→ボード連携のステータス
  const status = {
    isEnabled: enabled,
    isAnalyzing,
    insightCount: insights.length,
    lastError: lastError || extractionError
  };
  
  // 手動で分析をトリガー
  const startAnalysis = useCallback(async () => {
    console.log('[useChatToBoard] startAnalysis called');
    const result = await triggerAnalysis();
    console.log('[useChatToBoard] triggerAnalysis result:', result);
    return result;
  }, [triggerAnalysis]);
  
  return {
    status,
    startAnalysis,
    insights,
    lastError: status.lastError
  };
}; 