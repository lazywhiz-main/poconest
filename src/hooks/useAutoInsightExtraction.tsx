import { useState, useEffect, useCallback } from 'react';
import { Message } from '../types/chat';
import { supabase } from '../services/supabase/client';

interface AIInsight {
  id: string;
  title: string;
  content: string;
  tags: string[];
  column_type: string;
  metadata?: Record<string, any>;
  related_card_ids?: string[];
}

interface AnalysisError {
  type: 'API_ERROR' | 'PARSE_ERROR' | 'VALIDATION_ERROR' | 'NETWORK_ERROR';
  message: string;
  details?: any;
}

interface UseAutoInsightExtractionProps {
  channelId?: string;
  messages?: Message[];
  enabled?: boolean;
  analysisThreshold?: number;
  onNewInsightsGenerated?: (insights: AIInsight[]) => void;
  onError?: (error: AnalysisError) => void;
}

// Markdown→Insight配列パース関数
function parseInsightsFromMarkdown(markdown: string): AIInsight[] {
  if (!markdown) return [];
  // --- 区切りで分割
  const blocks = markdown.split(/^---$/m).map(b => b.trim()).filter(Boolean);
  return blocks.map((block, i) => {
    // タイトル抽出
    const titleMatch = block.match(/^## (.+)/m);
    const title = titleMatch ? titleMatch[1].trim() : `Insight ${i+1}`;
    // タグ抽出
    const tagsMatch = block.match(/### タグ\n([\s\S]+?)(?=\n|$)/);
    const tags = tagsMatch ? tagsMatch[1].split(',').map(t => t.trim()).filter(Boolean) : [];
    // コンテキスト抽出
    const contentMatch = block.match(/### コンテキスト\n([\s\S]+?)(?=### タグ|$)/);
    let content = contentMatch ? contentMatch[1].trim() : '';
    // 見出しレベル調整
    content = content.replace(/^#### /gm, '### ');
    return {
      id: `insight-${Date.now()}-${i}`,
      title,
      content,
      tags,
      column_type: 'inbox',
    };
  });
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
  onError,
}: UseAutoInsightExtractionProps) => {
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastAnalyzedMessageCount, setLastAnalyzedMessageCount] = useState(0);
  const [analysisStats, setAnalysisStats] = useState({
    totalAnalyses: 0,
    totalInsightsGenerated: 0,
    averageProcessingTime: 0,
    lastError: null as AnalysisError | null,
  });

  // 分析を実行するか判断する
  const shouldAnalyze = useCallback(() => {
    if (!enabled || !channelId || messages.length === 0) return false;
    
    // 新しいメッセージが閾値以上あるかチェック
    const newMessageCount = messages.length - lastAnalyzedMessageCount;
    return newMessageCount >= analysisThreshold;
  }, [enabled, channelId, messages, lastAnalyzedMessageCount, analysisThreshold]);

  // 洞察抽出の実行
  const runAnalysis = useCallback(async (force = false) => {
    console.log('[useAutoInsightExtraction] runAnalysis called', { force, isAnalyzing, shouldAnalyze: shouldAnalyze() });
    if (isAnalyzing) return;
    if (!force && !shouldAnalyze()) return;
    setIsAnalyzing(true);
    
    const startTime = Date.now();
    const messagesToAnalyze = messages.slice(-30);
    console.log('[useAutoInsightExtraction] messagesToAnalyze:', messagesToAnalyze);
    console.log('[useAutoInsightExtraction] mapped for API:', messagesToAnalyze.map(m => ({
      text: m.text,
      userName: m.userName || 'User',
      timestamp: m.timestamp || ''
    })));
    
    try {
      // Edge Function呼び出し
      const { data, error } = await supabase.functions.invoke('analyze-chat', {
        body: {
          messages: messagesToAnalyze.map(m => ({
            text: m.text,
            userName: m.userName || 'User',
            timestamp: m.timestamp || ''
          })),
          board_id: channelId,
          created_by: 'ai',
        },
      });

      if (error) {
        throw {
          type: 'API_ERROR',
          message: 'AI分析APIでエラーが発生しました',
          details: error
        };
      }

      if (!data || !data.markdown) {
        throw {
          type: 'VALIDATION_ERROR',
          message: 'AI分析の結果が不正な形式です',
          details: data
        };
      }

      console.log('[useAutoInsightExtraction] API data:', data);
      console.log('[useAutoInsightExtraction] API markdown:', data.markdown);

      const newInsights = parseInsightsFromMarkdown(data.markdown);
      console.log('[useAutoInsightExtraction] parsed newInsights:', newInsights);

      if (newInsights.length === 0) {
        throw {
          type: 'PARSE_ERROR',
          message: '分析結果から洞察を抽出できませんでした',
          details: { markdown: data.markdown }
        };
      }

      if (newInsights.length > 0) {
        setInsights(prevInsights => {
          const existingIds = new Set(prevInsights.map(i => i.id));
          const filtered = newInsights.filter(i => !existingIds.has(i.id));
          if (filtered.length > 0 && onNewInsightsGenerated) {
            onNewInsightsGenerated(filtered);
          }
          return [...prevInsights, ...filtered];
        });

        const processingTime = Date.now() - startTime;
        setAnalysisStats(prev => ({
          ...prev,
          totalAnalyses: prev.totalAnalyses + 1,
          totalInsightsGenerated: prev.totalInsightsGenerated + newInsights.length,
          averageProcessingTime: (prev.averageProcessingTime * prev.totalAnalyses + processingTime) / (prev.totalAnalyses + 1),
          lastError: null
        }));
      }
      setLastAnalyzedMessageCount(messages.length);
    } catch (e) {
      const error = e as AnalysisError;
      console.error('AI抽出エラー:', error);
      setAnalysisStats(prev => ({
        ...prev,
        lastError: error
      }));
      if (onError) {
        onError(error);
      }
    } finally {
      setIsAnalyzing(false);
    }
  }, [
    isAnalyzing, 
    shouldAnalyze, 
    messages, 
    channelId, 
    onNewInsightsGenerated,
    onError,
    analysisStats.totalInsightsGenerated
  ]);

  // メッセージの変更を監視して自動分析を実行
  // useEffect(() => {
  //   if (shouldAnalyze()) {
  //     runAnalysis();
  //   }
  // }, [messages, shouldAnalyze, runAnalysis]);

  // 分析を手動でトリガーする関数
  const triggerAnalysis = useCallback(async () => {
    console.log('[useAutoInsightExtraction] triggerAnalysis called', { isAnalyzing, channelId, messagesLength: messages.length, analysisThreshold });
    if (isAnalyzing) return '分析中です';
    if (!channelId) return 'チャネルが未選択です';
    if (messages.length === 0) return 'メッセージがありません';
    if (messages.length < analysisThreshold) return `メッセージが${analysisThreshold}件未満のため分析できません`;
    await runAnalysis(true);
    return null;
  }, [isAnalyzing, channelId, messages, analysisThreshold, runAnalysis]);

  // 特定の洞察の詳細を取得
  const getInsightById = useCallback((insightId: string) => {
    return insights.find(insight => insight.id === insightId) || null;
  }, [insights]);

  // 特定のチャネルに関連する洞察をフィルタリング
  const getInsightsByChannelId = useCallback((targetChannelId: string) => {
    return insights.filter(insight => 
      insight.column_type === 'inbox' && targetChannelId === channelId
    );
  }, [insights, channelId]);

  return {
    insights,
    isAnalyzing,
    analysisStats,
    triggerAnalysis,
    getInsightById,
    getInsightsByChannelId,
    lastError: analysisStats.lastError,
  };
}; 