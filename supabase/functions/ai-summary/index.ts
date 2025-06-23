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
  nestId?: string;
  provider?: 'openai' | 'gemini';
}

interface NestAISettings {
  primaryProvider: 'openai' | 'gemini';
  enableFallback: boolean;
  fallbackProviders: string[];
  providerConfigs: {
    openai: {
      model: string;
      embeddingModel: string;
    };
    gemini: {
      model: string;
      embeddingModel: string;
    };
  };
}

// Nest AI設定を取得する関数
async function getNestAISettings(supabase: any, nestId: string): Promise<NestAISettings> {
  try {
    const { data, error } = await supabase
      .rpc('get_nest_ai_provider', { nest_id_param: nestId });

    if (error) {
      console.error('[ai-summary] Error fetching nest AI settings:', error);
      return getDefaultAISettings();
    }

    if (!data || data.length === 0) {
      console.log('[ai-summary] No AI settings found for nest, using defaults');
      return getDefaultAISettings();
    }

    const settings = data[0];
    const aiSettings = settings.ai_settings || {};

    return {
      primaryProvider: settings.primary_provider || 'openai',
      enableFallback: aiSettings.enableFallback !== false,
      fallbackProviders: aiSettings.fallbackProviders || ['gemini'],
      providerConfigs: aiSettings.providerConfigs || getDefaultProviderConfigs()
    };
  } catch (error) {
    console.error('[ai-summary] Error in getNestAISettings:', error);
    return getDefaultAISettings();
  }
}

function getDefaultAISettings(): NestAISettings {
  return {
    primaryProvider: 'openai',
    enableFallback: true,
    fallbackProviders: ['gemini'],
    providerConfigs: getDefaultProviderConfigs()
  };
}

function getDefaultProviderConfigs() {
  return {
    openai: {
      model: 'gpt-4o',
      embeddingModel: 'text-embedding-3-small'
    },
    gemini: {
      model: 'gemini-2.0-flash',
      embeddingModel: 'gemini-embedding-exp-03-07'
    }
  };
}

async function callOpenAI(prompt: string, action: string, apiKey: string, model: string = 'gpt-4o') {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: model,
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
    console.error('[ai-summary] OpenAI API Error:', errorData)
    throw new Error(`OpenAI API Error: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()
  return data.choices[0].message.content
}

async function callGemini(prompt: string, action: string, apiKey: string, model: string = 'gemini-2.0-flash') {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: prompt
            }
          ]
        }
      ],
      generationConfig: {
        maxOutputTokens: action === 'summary' ? 1500 : 2000,
        temperature: 0.7,
      }
    }),
  })

  if (!response.ok) {
    const errorData = await response.text()
    console.error('[ai-summary] Gemini API Error:', errorData)
    throw new Error(`Gemini API Error: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()
  return data.candidates[0].content.parts[0].text
}

// AI呼び出しとフォールバック処理
async function callAIWithFallback(prompt: string, action: string, settings: NestAISettings): Promise<{ result: string, provider: string }> {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  const geminiApiKey = Deno.env.get('GEMINI_API_KEY');

  // デバッグ用ログ追加
  console.log(`[ai-summary] DEBUG: API Keys availability:`, {
    openai: openaiApiKey ? `Set (length: ${openaiApiKey.length})` : 'NOT SET',
    gemini: geminiApiKey ? `Set (length: ${geminiApiKey.length})` : 'NOT SET',
    primaryProvider: settings.primaryProvider
  });

  // プライマリプロバイダーで試行
  try {
    console.log(`[ai-summary] Trying primary provider: ${settings.primaryProvider}`);
    
    if (settings.primaryProvider === 'openai') {
      if (!openaiApiKey) {
        throw new Error('OpenAI API key not available');
      }
      const result = await callOpenAI(prompt, action, openaiApiKey, settings.providerConfigs.openai.model);
      return { result, provider: 'openai' };
    } else {
      if (!geminiApiKey) {
        throw new Error('Gemini API key not available');
      }
      const result = await callGemini(prompt, action, geminiApiKey, settings.providerConfigs.gemini.model);
      return { result, provider: 'gemini' };
    }
  } catch (primaryError) {
    console.error(`[ai-summary] Primary provider (${settings.primaryProvider}) failed:`, primaryError);
    
    // フォールバックが有効な場合
    if (settings.enableFallback && settings.fallbackProviders.length > 0) {
      for (const fallbackProvider of settings.fallbackProviders) {
        try {
          console.log(`[ai-summary] Trying fallback provider: ${fallbackProvider}`);
          
          if (fallbackProvider === 'openai' && openaiApiKey) {
            const result = await callOpenAI(prompt, action, openaiApiKey, settings.providerConfigs.openai.model);
            return { result, provider: 'openai (fallback)' };
          } else if (fallbackProvider === 'gemini' && geminiApiKey) {
            const result = await callGemini(prompt, action, geminiApiKey, settings.providerConfigs.gemini.model);
            return { result, provider: 'gemini (fallback)' };
          }
        } catch (fallbackError) {
          console.error(`[ai-summary] Fallback provider (${fallbackProvider}) failed:`, fallbackError);
          continue;
        }
      }
    }
    
    // すべて失敗した場合
    throw new Error(`All AI providers failed. Primary: ${primaryError.message}`);
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { action, content, meetingId, nestId, provider }: RequestBody = await req.json()
    
    console.log(`[ai-summary] Processing ${action} request with nestId: ${nestId}, provider: ${provider}`)

    // Supabaseクライアント初期化（nest設定取得用）
    let aiSettings: NestAISettings;
    let finalProvider = provider || 'openai';
    let usedProvider: string;

    if (nestId) {
      // nest_idが指定された場合は、nest設定を取得してプロバイダーを決定
      const supabaseUrl = Deno.env.get('SUPABASE_URL')
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
      
      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey)
        aiSettings = await getNestAISettings(supabase, nestId);
        console.log(`[ai-summary] Using nest AI settings:`, {
          primaryProvider: aiSettings.primaryProvider,
          enableFallback: aiSettings.enableFallback
        });
      } else {
        console.warn('[ai-summary] Supabase env vars not set, falling back to default settings');
        aiSettings = getDefaultAISettings();
      }
    } else {
      // 従来の方式（providerパラメータを使用）
      aiSettings = getDefaultAISettings();
      aiSettings.primaryProvider = finalProvider as 'openai' | 'gemini';
      aiSettings.enableFallback = false; // 従来の動作を維持
      console.log(`[ai-summary] Using legacy provider parameter: ${finalProvider}`);
    }

    // Generate prompt based on action
    let prompt = '';
    if (action === 'summary') {
      prompt = `あなたは、自由な意見が飛び交う発散的な会議の文字起こしを、内容の豊かさを保ちながら体系的に整理するAIアシスタントです。

以下の要件に従い、会議ログを読み取り、内容を「テーマ単位」で構造化しつつ、「会議全体の概要」も明確に記述してください。

# 🗂 会議サマリー

- **会議の目的・背景（任意）**  
  会議の主旨、雰囲気、誰が主導したかなど、会話から読み取れるもの。

- **参加者（分かる範囲で）**  
  - 例：Aさん（主導）／Bさん（実務）／Cさん（マーケティング）

- **扱われた主なテーマ一覧（仮タイトルでOK）**  
  - テーマ1：●●●（例：プロダクト名の方向性）
  - テーマ2：●●●（例：対象ユーザー像）
  - テーマ3：●●●（例：初期プロモーション案）
  ・・・（テーマの数だけ行を増やす）
  - テーマN：●●●（例：・・・・）

- **全体を通じた気づき／未整理の論点（自由記述）**  
  - 発散は多かったが、「○○」という価値観が共通していた など

# 🧭 テーマ別構造化メモ

## 🔸テーマ1：{仮タイトルをつけてください}

- **テーマの背景／きっかけ**  
  どういう流れでこの話題が出たか

- **発言・視点（参加者別）**  
  - Aさん（提案）：「◯◯って名前、どうかな？今っぽさを出したい」
  - Bさん（反応）：それだと△△みたいに聞こえるかも
  - Cさん（補足）：顧客からも××という声がある

- **出てきたアイデア・仮説**
  - ・サービス名案：「○○」「△△」
  - ・考慮すべき観点：「親しみやすさ」「覚えやすさ」

- **合意点／未解決の論点**
  - ✅ 方向性は「ポップ寄り」で進めることで合意
  - ❓ 名前候補は決まらず。次回までに持ち寄ることに

## 🔸テーマ2：{仮タイトル}

（以下、同形式）

---

【補足ルール】

- 会議の内容は、**要約しすぎず、発言のニュアンスを尊重**してください。
- 一人の発言が複数のテーマに関連する場合は、適切に重複掲載してかまいません。
- 話題が入り乱れていて明確な「テーマ」になっていない場合は、「テーマ未分類」としてまとめてもかまいません。
- 会議の前提条件や前提知識（参加者が共有している前提など）も、わかる範囲で補足してください。
- テーマの数は3つに限定せず、会議内容に応じて必要なだけテーマを増やして出力してください。

---

会議ログ:
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

    // AI呼び出し（nest設定対応 または 従来方式）
    let result: string;

    if (nestId) {
      // nest設定ベースの呼び出し（フォールバック対応）
      const aiResult = await callAIWithFallback(prompt, action, aiSettings);
      result = aiResult.result;
      usedProvider = aiResult.provider;
    } else {
      // 従来の方式（後方互換性）
      if (finalProvider === 'gemini') {
        const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
        if (!geminiApiKey) {
          throw new Error('GEMINI_API_KEY environment variable is not set')
        }
        result = await callGemini(prompt, action, geminiApiKey)
        usedProvider = 'gemini'
      } else {
        const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
        if (!openaiApiKey) {
          throw new Error('OPENAI_API_KEY environment variable is not set')
        }
        result = await callOpenAI(prompt, action, openaiApiKey)
        usedProvider = 'openai'
      }
    }

    // カード抽出の場合はJSONパースを試行
    if (action === 'extract_cards') {
      try {
        const cards = JSON.parse(result)
        return new Response(
          JSON.stringify({
            success: true,
            cards,
            provider: usedProvider,
            nestId: nestId,
            usingNestSettings: !!nestId
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } catch (parseError) {
        console.error('[ai-summary] Failed to parse cards JSON:', parseError)
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Failed to parse extracted cards as JSON',
            rawResult: result,
            provider: usedProvider
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        result,
        provider: usedProvider,
        nestId: nestId,
        usingNestSettings: !!nestId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('[ai-summary] Error:', error)
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