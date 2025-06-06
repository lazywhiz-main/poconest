import { supabase } from '../supabase/client';

// Edge FunctionのベースURLを環境変数から取得
//const SUPABASE_FUNCTIONS_URL = process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL || 'https://<your-project-id>.supabase.co/functions/v1';

// OpenAI API経由でミーティング要約を生成
export async function generateMeetingSummary(content: string): Promise<string> {
  console.log('🚀 generateMeetingSummary called with content length:', content?.length);
  
  try {
    console.log('📡 Calling Edge Function ai-summary...');
    
    // Supabase Edge Functionを呼び出し
    const { data, error } = await supabase.functions.invoke('ai-summary', {
      body: {
        action: 'summary',
        content: content
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
    return data.result;
  } catch (error) {
    console.error('💥 要約生成エラー:', error);
    console.log('🔄 Falling back to mock summary');
    // フォールバックとしてモック関数を使用
    return generateMockSummary();
  }
}

// OpenAI API経由でミーティングからカードを抽出
export async function extractCardsFromMeeting(meetingId: string): Promise<any[]> {
  console.log('extractCardsFromMeetingに渡すmeetingId:', meetingId);
  const { data, error } = await supabase.functions.invoke('extract-cards-from-meeting', {
    body: { meeting_id: meetingId }
  });
  if (error) throw error;
  if (!data.success) throw new Error(data.error || '抽出に失敗しました');
  return data.cards;
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