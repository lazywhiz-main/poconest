import { useEffect, useCallback, useState } from 'react';
import { useAutoInsightExtraction } from './useAutoInsightExtraction';
import { useBoardContext } from '../features/board-space/contexts/BoardContext';
import { BoardColumnType } from 'src/types/board';
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
  console.log('🚨🚨🚨 [useChatToBoard] useAutoInsightExtraction フック呼び出し開始 🚨🚨🚨', {
    timestamp: new Date().toISOString(),
    channelId,
    messagesCount: messages.length,
    enabled,
    stackTrace: new Error().stack
  });
  
  const { insights, triggerAnalysis, isAnalyzing, lastError: extractionError } = useAutoInsightExtraction({
    channelId,
    messages,
    enabled,
    onError: (error) => {
      setLastError(error);
      if (onError) onError(error);
    },
    async onNewInsightsGenerated(newInsights) {
      try {
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

        // 2. トランザクションでカードと関連データを作成
        const nowStr = now.toISOString();
        const createdCards = [];

        for (const insight of newInsights) {
          const { data: cardData, error: cardError } = await supabase.rpc('create_card_with_relations', {
            p_board_id: boardId,
            p_title: insight.title,
            p_content: insight.content,
            p_column_type: 'INBOX',
            p_created_by: user?.id || 'ai',
            p_created_at: nowStr,
            p_updated_at: nowStr,
            p_order_index: 0,
            p_is_archived: false,
            p_metadata: insight.metadata ?? {},
            p_tags: insight.tags || [],
            p_source_id: source?.id
          });

          if (cardError) {
            throw {
              type: 'DB_ERROR',
              message: 'カードの作成に失敗しました',
              details: {
                error: cardError,
                insight: insight
              }
            };
          }

          if (cardData && cardData.success) {
            createdCards.push(cardData.card);
          }
        }

        // 3. 作成したカードをコンテキストに追加
        if (createdCards.length > 0) {
          addCards(createdCards);
          setLastError(null);
          if (onNewInsightsGenerated) onNewInsightsGenerated(createdCards);
        }
      } catch (e) {
        const error = e as { type: string; message: string; details?: any };
        console.error('カード作成エラー:', error);
        setLastError(error);
        if (onError) onError(error);
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