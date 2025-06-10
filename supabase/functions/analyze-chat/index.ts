import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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
async function getNestAISettings(nestId: string): Promise<NestAISettings> {
  try {
    const { data, error } = await supabase
      .rpc('get_nest_ai_provider', { nest_id_param: nestId });

    if (error) {
      console.error('[analyze-chat] Error fetching nest AI settings:', error);
      return getDefaultAISettings();
    }

    if (!data || data.length === 0) {
      console.log('[analyze-chat] No AI settings found for nest, using defaults');
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
    console.error('[analyze-chat] Error in getNestAISettings:', error);
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

const SYSTEM_PROMPT = `
あなたは「思想とビジネスを架橋する評論家」。
	•	視座：人文学・哲学の洞察と、経営・ブランディングの実務感覚を兼ね備えたプロフェッショナル。
	•	目的：与えられたチャット全文から"長く価値を持つインサイト"だけを抽出し、再利用できる形で残すこと。
	•	仮定：チャットは議事録ではなく"思考の流れ"であるため、断片的情報の背後に潜む意味や暗黙の前提を補完・統合して洞察化する。

以下のチャットログ（Markdown形式）を分析し、最大7件のインサイトを抽出してください。
抽出方針は次の通り。
	1.	洞察の要件
	•	深層要因：人間の価値観・感情・文化的文脈・存在論的問いを示唆するもの
	•	戦略的含意：経営判断・ブランド構築・価値提供に影響する示唆
	•	パラドックス/矛盾：参加者の言説に潜む葛藤や未整理の前提
	•	シフトの兆し：事業環境やユーザー心理の"変化の種"となり得る微細な動き
	2.	評価レンズ（4つを併用）

レンズ	着眼点
哲学的	真理探究・倫理・存在意義・時間軸
文化・人文	物語性・象徴・慣習・歴史的連関
経営	市場構造・組織行動・KPI・事業機会
ブランディング	ブランドパーソナリティ・語り口・体験設計

	3.	アウトプット形式（Markdown）
	- 必ず下記テンプレート通りに、全項目を埋めて出力してください（空欄不可）。
	- 各インサイトは独立したセクションとして出力してください。

---

【出力テンプレート】

## タイトル（15字以内で要旨）

### コンテキスト
- **核心**: ひと言で核心を表現
- **根拠**: "原文抜粋 …"（行番号 or 時刻）

#### 解釈
- 哲学的視点: …
- 文化・人文視点: …
- 経営視点: …
- ブランディング視点: …

#### アクションアイデア
- アイデア1
- アイデア2
- アイデア3

### タグ
タグ1, タグ2, タグ3

---

【トーン】
- 簡潔だが含蓄ある語り口。
- 批判ではなく"問いを開く"姿勢。

【除外ルール】
- 事実の単純要約やタスクメモはインサイトとみなさない。
- 個人情報・守秘情報は抽象化し、特定できないよう伏せる。
`;

async function callOpenAI(systemPrompt: string, userPrompt: string, model: string = 'gpt-4o') {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      max_tokens: 2048
    })
  });

  if (!res.ok) {
    const errorData = await res.text()
    console.error('[analyze-chat] OpenAI API Error:', errorData)
    throw new Error(`OpenAI API Error: ${res.status} ${res.statusText}`)
  }

  const data = await res.json();
  return data.choices[0].message.content;
}

async function callGemini(systemPrompt: string, userPrompt: string, model: string = 'gemini-2.0-flash') {
  const combinedPrompt = `${systemPrompt}\n\n${userPrompt}`;
  
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: combinedPrompt
            }
          ]
        }
      ],
      generationConfig: {
        maxOutputTokens: 2048,
        temperature: 0.7,
      }
    })
  });

  if (!res.ok) {
    const errorData = await res.text()
    console.error('[analyze-chat] Gemini API Error:', errorData)
    throw new Error(`Gemini API Error: ${res.status} ${res.statusText}`)
  }

  const data = await res.json();
  return data.candidates[0].content.parts[0].text;
}

// AI呼び出しとフォールバック処理
async function callAIWithFallback(systemPrompt: string, userPrompt: string, settings: NestAISettings): Promise<{ result: string, provider: string }> {
  // プライマリプロバイダーで試行
  try {
    console.log(`[analyze-chat] Trying primary provider: ${settings.primaryProvider}`);
    
    if (settings.primaryProvider === 'openai') {
      if (!OPENAI_API_KEY) {
        throw new Error('OpenAI API key not available');
      }
      const result = await callOpenAI(systemPrompt, userPrompt, settings.providerConfigs.openai.model);
      return { result, provider: 'openai' };
    } else {
      if (!GEMINI_API_KEY) {
        throw new Error('Gemini API key not available');
      }
      const result = await callGemini(systemPrompt, userPrompt, settings.providerConfigs.gemini.model);
      return { result, provider: 'gemini' };
    }
  } catch (primaryError) {
    console.error(`[analyze-chat] Primary provider (${settings.primaryProvider}) failed:`, primaryError);
    
    // フォールバックが有効な場合
    if (settings.enableFallback && settings.fallbackProviders.length > 0) {
      for (const fallbackProvider of settings.fallbackProviders) {
        try {
          console.log(`[analyze-chat] Trying fallback provider: ${fallbackProvider}`);
          
          if (fallbackProvider === 'openai' && OPENAI_API_KEY) {
            const result = await callOpenAI(systemPrompt, userPrompt, settings.providerConfigs.openai.model);
            return { result, provider: 'openai (fallback)' };
          } else if (fallbackProvider === 'gemini' && GEMINI_API_KEY) {
            const result = await callGemini(systemPrompt, userPrompt, settings.providerConfigs.gemini.model);
            return { result, provider: 'gemini (fallback)' };
          }
        } catch (fallbackError) {
          console.error(`[analyze-chat] Fallback provider (${fallbackProvider}) failed:`, fallbackError);
          continue;
        }
      }
    }
    
    // すべて失敗した場合
    throw new Error(`All AI providers failed. Primary: ${primaryError.message}`);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { messages, board_id, created_by, nestId, provider } = await req.json();

    console.log(`[analyze-chat] Processing chat analysis with nestId: ${nestId}, provider: ${provider}`);

    // nest設定またはレガシーパラメータを使用
    let aiSettings: NestAISettings;
    let finalProvider = provider || 'openai';
    let usedProvider: string;

    if (nestId) {
      // nest_idが指定された場合は、nest設定を取得してプロバイダーを決定
      aiSettings = await getNestAISettings(nestId);
      console.log(`[analyze-chat] Using nest AI settings:`, {
        primaryProvider: aiSettings.primaryProvider,
        enableFallback: aiSettings.enableFallback
      });
    } else {
      // 従来の方式（providerパラメータを使用）
      aiSettings = getDefaultAISettings();
      aiSettings.primaryProvider = finalProvider as 'openai' | 'gemini';
      aiSettings.enableFallback = false; // 従来の動作を維持
      console.log(`[analyze-chat] Using legacy provider parameter: ${finalProvider}`);
    }

    // チャットログをMarkdown形式で連結
    const chatLogMarkdown = messages.map((m: any) => `- ${m.userName || m.sender || 'User'}: ${m.text}`).join('\n');
    const userPrompt = `以下のチャットログ（Markdown形式）:\n\n${chatLogMarkdown}`;

    let result: string;

    if (nestId) {
      // nest設定ベースの呼び出し（フォールバック対応）
      const aiResult = await callAIWithFallback(SYSTEM_PROMPT, userPrompt, aiSettings);
      result = aiResult.result;
      usedProvider = aiResult.provider;
    } else {
      // 従来の方式（後方互換性）
      if (finalProvider === 'gemini') {
        if (!GEMINI_API_KEY) {
          throw new Error('GEMINI_API_KEY environment variable is not set');
        }
        result = await callGemini(SYSTEM_PROMPT, userPrompt);
        usedProvider = 'gemini';
      } else {
        if (!OPENAI_API_KEY) {
          throw new Error('OPENAI_API_KEY environment variable is not set');
        }
        result = await callOpenAI(SYSTEM_PROMPT, userPrompt);
        usedProvider = 'openai';
      }
    }

    // 返答はMarkdown形式のまま返す（後続でパース・保存処理を拡張）
    return new Response(JSON.stringify({ 
      success: true, 
      markdown: result,
      provider: usedProvider,
      nestId: nestId,
      usingNestSettings: !!nestId
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error('[analyze-chat] Error:', error);
    return new Response(
      JSON.stringify({ error: error && (error.stack || error.message || JSON.stringify(error) || String(error)) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}); 