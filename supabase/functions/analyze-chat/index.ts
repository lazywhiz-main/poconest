import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { messages, board_id, created_by } = await req.json();

    // チャットログをMarkdown形式で連結
    const chatLogMarkdown = messages.map((m: any) => `- ${m.userName || m.sender || 'User'}: ${m.text}`).join('\n');

    // OpenAI API呼び出し
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `以下のチャットログ（Markdown形式）:\n\n${chatLogMarkdown}` }
        ],
        max_tokens: 2048
      })
    });

    const data = await res.json();
    // 返答はMarkdown形式のまま返す（後続でパース・保存処理を拡張）
    return new Response(JSON.stringify({ success: true, markdown: data.choices[0].message.content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error && (error.stack || error.message || JSON.stringify(error) || String(error)) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
}); 