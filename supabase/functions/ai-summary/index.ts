import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestBody {
  action: 'summary' | 'extract_cards';
  content: string;
  meetingId?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { action, content, meetingId }: RequestBody = await req.json()
    
    // OpenAI APIキーを環境変数から取得
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set')
    }

    // OpenAI API呼び出し
    let prompt = '';
    if (action === 'summary') {
      prompt = `以下のミーティング内容を日本語で構造化された要約にしてください。マークダウン形式で出力してください。

## 会議概要
- 日時: [会議の日時]
- 参加者: [参加者リスト]
- 目的: [会議の目的]

## 主要な議題と決定事項
[重要な議題と決定されたことを箇条書きで]

## アクションアイテム
[具体的なタスクと担当者、期限]

## 次回までの課題
[継続検討事項や次回会議での議題]

ミーティング内容:
${content}`;
    } else if (action === 'extract_cards') {
      prompt = `以下のミーティング内容から、かんばんボード用のカードを抽出してください。各カードは以下のJSON形式で出力してください：

[
  {
    "title": "カードのタイトル（30文字以内）",
    "content": "カードの詳細説明",
    "type": "task|idea|issue|decision|note",
    "priority": "high|medium|low",
    "tags": ["タグ1", "タグ2"],
    "assignee": "担当者名（もしあれば）",
    "deadline": "期限（YYYY-MM-DD形式、もしあれば）"
  }
]

カードの種別の判断基準：
- task: 具体的なアクションが必要なもの
- idea: 新しいアイデアや提案
- issue: 課題や問題点
- decision: 決定事項
- note: その他のメモや情報

ミーティング内容:
${content}`;
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: action === 'summary' ? 1500 : 2000,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error('OpenAI API Error:', errorData)
      throw new Error(`OpenAI API Error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    const result = data.choices[0].message.content

    // カード抽出の場合はJSONパースを試行
    if (action === 'extract_cards') {
      try {
        const cards = JSON.parse(result)
        return new Response(
          JSON.stringify({ 
            success: true, 
            action,
            result: cards 
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      } catch (parseError) {
        console.error('JSON Parse Error:', parseError)
        // JSONパースに失敗した場合はテキストとして返す
        return new Response(
          JSON.stringify({ 
            success: false, 
            action,
            error: 'Failed to parse extracted cards as JSON',
            rawResult: result 
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        action,
        result 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
}) 