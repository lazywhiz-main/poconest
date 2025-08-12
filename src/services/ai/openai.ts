import { supabase } from '../supabase/client';
import { AIUsageLogger } from './AIUsageLogger';
import { OpenAI } from 'openai';

// Edge FunctionのベースURLを環境変数から取得
//const SUPABASE_FUNCTIONS_URL = process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL || 'https://<your-project-id>.supabase.co/functions/v1';

// AIリクエストのコンテキスト情報
export interface AIRequestContext {
  userId: string;
  nestId?: string;
  chatRoomId?: string;
  meetingId?: string;
  boardId?: string;
}

// OpenAI API経由でミーティング要約を生成
export async function generateMeetingSummary(content: string, context?: AIRequestContext, jobId?: string): Promise<string> {
  const callId = Math.random().toString(36).substr(2, 9); // 呼び出しIDを生成
  console.log(`🔍 [generateMeetingSummary] 関数呼び出し開始 #${callId}`, {
    timestamp: new Date().toISOString(),
    meetingId: context?.meetingId,
    jobId,
    nestId: context?.nestId,
    userId: context?.userId,
    stackTrace: new Error().stack
  });

  console.log('🔍 [openai.ts] ai-summary Edge Function呼び出し開始:', {
    functionName: 'ai-summary',
    timestamp: new Date().toISOString(),
    meetingId: context?.meetingId,
    jobId,
    callId,
    stackTrace: new Error().stack
  });
  
  const startTime = Date.now();
  
  try {
    console.log('📡 Calling Edge Function ai-summary...');
    
    // Supabase Edge Functionを呼び出し
    const { data, error } = await supabase.functions.invoke('ai-summary', {
      body: {
        action: 'summary',
        content: content,
        job_id: jobId, // 🔧 ジョブIDを渡してステータス更新を可能にする
        nestId: context?.nestId // Nest設定を取得するためにnestIdを渡す
      }
    });

    console.log('📥 Edge Function response:', { data, error });

    if (error) {
      console.error('❌ Edge Function Error:', error);
      throw error;
    }

    console.log('📊 Edge Function data:', data);

    if (!data.success) {
      console.error('❌ Edge Function returned failure:', data.error);
      throw new Error(data.error || 'AI要約の生成に失敗しました');
    }

    console.log('✅ AI Summary successful, result length:', data.result?.length);
    console.log('🤖 Used provider:', data.provider);

    // AI使用量をログ（Edge Functionから返された実際のプロバイダー情報を使用）
    if (context) {
      const actualProvider = data.provider || 'unknown';
      const actualModel = getModelFromProvider(actualProvider);
      const inputTokens = data.usage?.prompt_tokens || Math.ceil(content.length / 4);
      const outputTokens = data.usage?.completion_tokens || Math.ceil(data.result.length / 4);
      const cost = AIUsageLogger.calculateCost(
        actualProvider.includes('openai') ? 'openai' : 'gemini', 
        actualModel, 
        inputTokens, 
        outputTokens
      );
      
      await AIUsageLogger.logUsage({
        userId: context.userId,
        nestId: context.nestId,
        featureType: 'meeting_summary',
        provider: actualProvider.includes('openai') ? 'openai' : 'gemini',
        model: actualModel,
        inputTokens,
        outputTokens,
        estimatedCostUsd: cost,
        requestMetadata: { contentLength: content.length },
        responseMetadata: { 
          success: true, 
          resultLength: data.result.length,
          processingTime: Date.now() - startTime,
          usage: data.usage,
          actualProvider: data.provider
        },
        meetingId: context.meetingId
      });
    }

    return data.result;
  } catch (error) {
    console.error('💥 要約生成エラー:', error);
    
    // エラーでもログを記録
    if (context) {
      await AIUsageLogger.logUsage({
        userId: context.userId,
        nestId: context.nestId,
        featureType: 'meeting_summary',
        provider: 'openai', // エラー時のデフォルト
        model: 'gpt-4o',   // エラー時のデフォルト
        inputTokens: 0,
        outputTokens: 0,
        estimatedCostUsd: 0,
        requestMetadata: { contentLength: content.length },
        responseMetadata: { 
          success: false, 
          error: error instanceof Error ? error.message : String(error),
          processingTime: Date.now() - startTime 
        },
        meetingId: context.meetingId
      });
    }
    
    console.log('🔄 AI summary generation failed, throwing error');
    // モックデータは返さず、エラーを投げる
    throw new Error('AI summary generation failed. Please check your API configuration and try again.');
  }
}

// グローバル重複防止フラグ
const inProgressMap = new Map<string, boolean>();

// OpenAI API経由でミーティングからカードを抽出
export async function extractCardsFromMeeting(meetingId: string, context?: AIRequestContext, jobId?: string): Promise<{ cards: any[], provider: string }> {
  const callId = Math.random().toString(36).substr(2, 9); // 呼び出しIDを生成
  
  // 🔧 重複防止チェック
  const duplicateKey = `${meetingId}_${context?.nestId}`;
  if (inProgressMap.get(duplicateKey)) {
    console.log(`🔧 [extractCardsFromMeeting] #${callId}: 重複呼び出しを防止`, {
      timestamp: new Date().toISOString(),
      meetingId,
      duplicateKey,
      inProgress: true
    });
    throw new Error('カード抽出は既に処理中です');
  }
  
  // 🔧 処理開始フラグを設定
  inProgressMap.set(duplicateKey, true);
  
  console.log(`🚨🚨🚨 [extractCardsFromMeeting] 関数呼び出し開始 #${callId} 🚨🚨🚨`, {
    timestamp: new Date().toISOString(),
    meetingId,
    jobId,
    nestId: context?.nestId,
    userId: context?.userId,
    duplicateKey,
    stackTrace: new Error().stack
  });

  try {
    // 🔒 job_idが無い場合はEdge Functionを呼び出さない
    if (!jobId) {
      console.log(`🚫 [extractCardsFromMeeting] #${callId}: job_idが無いためEdge Function呼び出しをスキップ`);
      throw new Error('job_idが必須です。Edge Functionを呼び出すことができません。');
    }

    console.log(`🔍 [extractCardsFromMeeting] #${callId}: Edge Function呼び出し開始`);
    
    // 🚨 一時的にEdge Function呼び出しを無効化してデバッグ
    console.log(`🚨🚨🚨 [extractCardsFromMeeting] #${callId}: Edge Function呼び出しを一時的に無効化 🚨🚨🚨`);
    throw new Error('Edge Function呼び出しが一時的に無効化されています');
    
    // const { data, error } = await supabase.functions.invoke('extract-cards-from-meeting', {
    //   body: { 
    //     meeting_id: meetingId,
    //     job_id: jobId, // 🔧 ジョブIDを渡してステータス更新を可能にする
    //     nestId: context?.nestId // Nest設定を取得するためにnestIdを渡す
    //   }
    // });
    
    console.log(`🔍 [extractCardsFromMeeting] #${callId}: Edge Function呼び出し完了`);
      
    if (error) throw error;
    if (!data.success) throw new Error(data.error || '抽出に失敗しました');

    console.log(`🔍 [extractCardsFromMeeting] #${callId}: 処理完了`, {
      provider: data.provider,
      cardsCount: data.cards?.length || 0
    });

    // AI使用量をログ（Edge Functionから返された実際のプロバイダー情報を使用）
    if (context) {
      const actualProvider = data.provider || 'unknown';
      const actualModel = getModelFromProvider(actualProvider);
      const inputTokens = data.usage?.prompt_tokens || 1000; // 概算
      const outputTokens = data.usage?.completion_tokens || Math.ceil(JSON.stringify(data.cards).length / 4);
      const cost = AIUsageLogger.calculateCost(
        actualProvider.includes('openai') ? 'openai' : 'gemini',
        actualModel,
        inputTokens, 
        outputTokens
      );
      
      await AIUsageLogger.logUsage({
        userId: context.userId,
        nestId: context.nestId,
        featureType: 'card_extraction',
        provider: actualProvider.includes('openai') ? 'openai' : 'gemini',
        model: actualModel,
        inputTokens,
        outputTokens,
        estimatedCostUsd: cost,
        requestMetadata: { meetingId },
        responseMetadata: { 
          success: true, 
          cardsCount: data.cards.length,
          processingTime: Date.now() - Date.now(),
          usage: data.usage,
          actualProvider: data.provider
        },
        meetingId: context.meetingId
      });
    }

    return {
      cards: data.cards,
      provider: data.provider
    };
  } catch (error) {
    // エラーでもログを記録
    if (context) {
      await AIUsageLogger.logUsage({
        userId: context.userId,
        nestId: context.nestId,
        featureType: 'card_extraction',
        provider: 'openai', // エラー時のデフォルト
        model: 'gpt-4o',   // エラー時のデフォルト
        inputTokens: 0,
        outputTokens: 0,
        estimatedCostUsd: 0,
        requestMetadata: { meetingId },
        responseMetadata: { 
          success: false, 
          error: error instanceof Error ? error.message : String(error),
          processingTime: Date.now() - Date.now()
        },
        meetingId
      });
    }
    
    throw error;
  } finally {
    // 🔧 処理完了後にフラグをリセット
    inProgressMap.delete(duplicateKey);
    console.log(`🔧 [extractCardsFromMeeting] #${callId}: 重複防止フラグをリセット`, {
      timestamp: new Date().toISOString(),
      duplicateKey
    });
  }
}

// プロバイダーからモデル名を推定するヘルパー関数
function getModelFromProvider(provider: string): string {
  if (provider.includes('openai')) {
    return 'gpt-4o';
  } else if (provider.includes('gemini')) {
    return 'gemini-2.0-flash';
  } else {
    return 'unknown';
  }
}



 