import { supabase } from '../supabase/client';
import { AIUsageLogger } from './AIUsageLogger';

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
export async function generateMeetingSummary(content: string, context?: AIRequestContext): Promise<string> {
  console.log('🚀 generateMeetingSummary called with content length:', content?.length);
  
  const startTime = Date.now();
  
  try {
    console.log('📡 Calling Edge Function ai-summary...');
    
    // Supabase Edge Functionを呼び出し
    const { data, error } = await supabase.functions.invoke('ai-summary', {
      body: {
        action: 'summary',
        content: content,
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
    
    console.log('🔄 Falling back to mock summary');
    // フォールバックとしてモック関数を使用
    return generateMockSummary();
  }
}

// OpenAI API経由でミーティングからカードを抽出
export async function extractCardsFromMeeting(meetingId: string, context?: AIRequestContext): Promise<any[]> {
  console.log('extractCardsFromMeetingに渡すmeetingId:', meetingId);
  
  const startTime = Date.now();
  
  try {
    const { data, error } = await supabase.functions.invoke('extract-cards-from-meeting', {
      body: { 
        meeting_id: meetingId,
        nestId: context?.nestId // Nest設定を取得するためにnestIdを渡す
      }
    });
    
    if (error) throw error;
    if (!data.success) throw new Error(data.error || '抽出に失敗しました');

    console.log('🤖 Used provider for card extraction:', data.provider);

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
          processingTime: Date.now() - startTime,
          usage: data.usage,
          actualProvider: data.provider
        },
        meetingId: context.meetingId
      });
    }

    return data.cards;
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
          processingTime: Date.now() - startTime 
        },
        meetingId: context.meetingId
      });
    }
    
    throw error;
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

// モック関数: 要約生成
export function generateMockSummary(): string {
  return `# ミーティング要約

## 会議概要
- 日時: ${new Date().toLocaleDateString('ja-JP')}
- 参加者: [APIキー未設定のため自動抽出不可]
- 目的: [APIキー未設定のため自動抽出不可]

## 主要な議題と決定事項
- **注意**: OpenAI APIが利用できないため、モック要約を表示しています
- 実際のAI要約を利用するには、SupabaseのEdge FunctionでOPENAI_API_KEYを設定してください

## アクションアイテム
- OpenAI APIキーの設定確認
- AI機能のテスト実行

## 次回までの課題
- AI機能の本格運用開始

> このはモック要約です。実際のミーティング内容を解析するには、OpenAI APIキーの設定が必要です。`;
}

// モック関数: カード抽出
export function generateMockCards(): any[] {
  return [
    {
      title: "OpenAI API設定確認",
      content: "Supabase Edge FunctionでOPENAI_API_KEYが正しく設定されているか確認する",
      type: "task",
      priority: "high",
      tags: ["設定", "API"],
      assignee: null,
      deadline: null
    },
    {
      title: "AI機能テスト",
      content: "ミーティング要約とカード抽出機能の動作確認を行う",
      type: "task", 
      priority: "medium",
      tags: ["テスト", "AI"],
      assignee: null,
      deadline: null
    },
    {
      title: "本格運用開始",
      content: "AI機能が正常に動作することを確認後、チーム全体で利用開始",
      type: "idea",
      priority: "low", 
      tags: ["運用", "チーム"],
      assignee: null,
      deadline: null
    }
  ];
} 