import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestBody {
  meeting_id: string;
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
      console.error('Error fetching nest AI settings:', error);
      // デフォルト設定を返す
      return getDefaultAISettings();
    }

    if (!data || data.length === 0) {
      console.log('No AI settings found for nest, using defaults');
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
    console.error('Error in getNestAISettings:', error);
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

// OpenAI API呼び出し
async function callOpenAI(prompt: string, model: string, apiKey: string) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: 'system', content: prompt.split('\n\n')[0] },
        { role: 'user', content: prompt.split('\n\n').slice(1).join('\n\n') }
      ],
      max_tokens: 12000,  // さらに増量：詳細引用対応
      temperature: 0.5,  // バランス型：創造性と一貫性のバランス
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error('[extract-cards] OpenAI API Error:', errorData);
    throw new Error(`OpenAI API Error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// Gemini API呼び出し（JSON出力強化版）
async function callGemini(prompt: string, model: string, apiKey: string) {
  // カードのJSONスキーマを定義
  const cardSchema = {
    type: "object",
    properties: {
      title: {
        type: "string",
        description: "カードのタイトル"
      },
      content: {
        type: "string", 
        description: "カードの詳細内容"
      },
      column_type: {
        type: "string",
        enum: ["INBOX", "QUESTIONS", "INSIGHTS", "THEMES", "ACTIONS"],
        description: "カードの分類"
      },
      tags: {
        type: "array",
        items: {
          type: "string"
        },
        description: "関連するタグの配列"
      }
    },
    required: ["title", "content", "column_type", "tags"]
  };

  const responseSchema = {
    type: "array",
    items: cardSchema,
    description: "抽出されたカードの配列"
  };

  // Gemini用に構造化出力対応のプロンプトを調整（詳細さは保持）
  const geminiPrompt = `あなたは哲学・人文社会学・経営・ブランディングに長けた専門家です。
以下の文字起こしから、発言の意味的まとまりごとに、構造的かつ解釈豊かなカードを抽出してください。
意味のまとまりは、前後の文脈を踏まえ、発言の流れを理解して、それぞれの発言をどのカードに分類するかを判断してください。

【目的】
このプロンプトは、会話ログ全体をもれなく読み取り、以下のタイプ別に意味ある単位でカード化し、知識資産として再利用可能な構造に整理することを目的とします。

【出力ルール】
出力は構造化されたJSONとして自動生成されます。各カードには以下を含めてください：

- title: 30文字以内で内容の要点を表すタイトル
- content: マークダウン形式で構造化された本文（見出しと箇条書き・段落を使用）
- column_type: "INBOX", "QUESTIONS", "INSIGHTS", "THEMES", "ACTIONS"のいずれか
- tags: 内容を表す自由なタグ配列

【タイプ別ガイドライン】

### INBOX（未分類・初期アイデア）
- titleの特徴：思いつき・違和感・例えなどの素材感
- content構成：
  ### 関連する発言の流れ
  > 発言者A: 前後の文脈を含む発言内容...
  > 発言者B: それに対する反応や関連発言...
  > 発言者C: 重要な核となる発言内容...

  ### 直感的な引っかかり
  ...
  
  ### 未整理の可能性
  ...
  
  ### なぜ気になったのか
  ...
  
  ### 今後の展開予想（任意）
  ...

### QUESTIONS（疑問・確認）
- titleの特徴：疑問文または確認要求を含む
- content構成：
  ### 関連する発言の流れ
  > 発言者A: 問いに至る前後の文脈...
  > 発言者B: 核となる疑問や確認の発言...
  > 発言者C: それに対する反応があれば...
  
  ### 問いの構造と前提
  ...
  
  ### なぜ今この問いが重要か
  ...
  
  ### 対応する必要のある観点
  ...
  
  ### この問いに答えるには何が必要か
  ...

### INSIGHTS（気づき・発見）
- titleの特徴：仮説・視点・ズレの発見など
- content構成：
  ### 関連する発言の流れ
  > 発言者A: 気づきに至る前後の文脈...
  > 発言者B: 核となる気づきや発見の発言...
  > 発言者C: それを受けた展開があれば...
  
  ### この発言が示す新しい視点
  ...
  
  ### 背景にある構造や認知
  ...
  
  ### 意味づけ・仮説
  ...
  
  ### 他とどう繋がるか
  ...

### THEMES（まとめ・論点整理）
- titleの特徴：テーマ名や論点の見出し
- content構成：
  ### 代表的な発言の流れ
  > 発言者A: テーマに関する重要な発言...
  > 発言者B: それに対する意見や展開...
  > 発言者C: 論点を深める発言...
  
  ### 議論の流れ
  ...
  
  ### 発言の共通構造
  ...
  
  ### 検討すべき視点
  ...
  
  ### 次に扱うべき問い
  ...

### ACTIONS（実行・TODO）
- titleの特徴：動詞で始まる、具体的な実行指示やTODO
- content構成：
  ### 関連する発言の流れ
  > 発言者A: アクションに至る文脈...
  > 発言者B: 具体的な実行提案の発言...
  > 発言者C: 合意や詳細化の発言があれば...
  
  ### 実行すべきこと
  ...
  
  ### 背景と目的
  ...
  
  ### 具体的な担当／期日（任意）
  ...
  
  ### 成功条件・完了条件
  ...

【重要】引用文について：
- 単一の発言ではなく、関連する2-3の発言の流れを含めてください
- 発言者名（実名または発言者A/B等）を明記してください
- 前後の文脈が分かるよう、十分なボリューム（各発言30-50文字程度）で引用してください
- 会話の流れや論理的展開が理解できるよう、時系列順で引用してください

【注記】構造化出力を使用するため、JSON形式の指示は不要です。内容の品質と詳細さに集中してください。
contentフィールド内では、上記のマークダウン見出し構造を正確に使用してください。
上記のルールに従い、与えられた文字起こし全文をもとに、構造的で網羅的なカードを生成してください。
タイトル・内容・分類すべてにおいて、曖昧さを避け、再利用可能な形式に落とし込むことを目指してください。

会議の文字起こし:
${prompt.split('会議の文字起こし:')[1] || prompt}`;

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
              text: geminiPrompt
            }
          ]
        }
      ],
      generationConfig: {
        maxOutputTokens: 12000,  // さらに増量：詳細引用対応
        temperature: 0.5,  // バランス型：創造性と一貫性のバランス
        topP: 0.8,
        topK: 40,
        // 構造化出力を指定
        response_mime_type: "application/json",
        response_json_schema: responseSchema
      }
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error('[extract-cards] Gemini API Error:', errorData);
    throw new Error(`Gemini API Error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}

// AI呼び出しとフォールバック処理
async function callAIWithFallback(prompt: string, settings: NestAISettings): Promise<{ result: string, provider: string }> {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  const geminiApiKey = Deno.env.get('GEMINI_API_KEY');

  // プライマリプロバイダーで試行
  try {
    console.log(`[extract-cards] Trying primary provider: ${settings.primaryProvider}`);
    
    if (settings.primaryProvider === 'openai') {
      if (!openaiApiKey) {
        throw new Error('OpenAI API key not available');
      }
      const result = await callOpenAI(prompt, settings.providerConfigs.openai.model, openaiApiKey);
      return { result, provider: 'openai' };
    } else {
      if (!geminiApiKey) {
        throw new Error('Gemini API key not available');
      }
      const result = await callGemini(prompt, settings.providerConfigs.gemini.model, geminiApiKey);
      return { result, provider: 'gemini' };
    }
  } catch (primaryError) {
    console.error(`[extract-cards] Primary provider (${settings.primaryProvider}) failed:`, primaryError);
    
    // フォールバックが有効な場合
    if (settings.enableFallback && settings.fallbackProviders.length > 0) {
      for (const fallbackProvider of settings.fallbackProviders) {
        try {
          console.log(`[extract-cards] Trying fallback provider: ${fallbackProvider}`);
          
          if (fallbackProvider === 'openai' && openaiApiKey) {
            const result = await callOpenAI(prompt, settings.providerConfigs.openai.model, openaiApiKey);
            return { result, provider: 'openai (fallback)' };
          } else if (fallbackProvider === 'gemini' && geminiApiKey) {
            const result = await callGemini(prompt, settings.providerConfigs.gemini.model, geminiApiKey);
            return { result, provider: 'gemini (fallback)' };
          }
        } catch (fallbackError) {
          console.error(`[extract-cards] Fallback provider (${fallbackProvider}) failed:`, fallbackError);
          continue;
        }
      }
    }
    
    // すべて失敗した場合
    throw new Error(`All AI providers failed. Primary: ${primaryError.message}`);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { meeting_id }: RequestBody = await req.json()
    if (!meeting_id) {
      throw new Error('meeting_id is required')
    }

    console.log(`[extract-cards] Processing meeting: ${meeting_id}`);

    // Supabaseクライアント初期化
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase env vars not set')
    }
    const supabase = createClient(supabaseUrl, supabaseKey)

    // ミーティング内容とnest_idを取得
    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .select('id, title, transcript, nest_id')
      .eq('id', meeting_id)
      .single()
    
    if (meetingError || !meeting) {
      throw new Error('Meeting not found')
    }
    
    const meetingText = meeting.transcript || ''
    if (!meetingText) {
      throw new Error('No meeting content found')
    }

    const nestId = meeting.nest_id;
    if (!nestId) {
      throw new Error('Could not determine nest_id for this meeting')
    }

    console.log(`[extract-cards] Found nest_id: ${nestId}`);

    // Nest AI設定を取得
    const aiSettings = await getNestAISettings(supabase, nestId);
    console.log(`[extract-cards] AI Settings:`, {
      primaryProvider: aiSettings.primaryProvider,
      enableFallback: aiSettings.enableFallback,
      fallbackProviders: aiSettings.fallbackProviders
    });

    // システムプロンプト
    const systemPrompt = `あなたは哲学・人文社会学・経営・ブランディングに長けた専門家です。
以下の文字起こしから、発言の意味的まとまりごとに、構造的かつ解釈豊かなカードを抽出してください。
意味のまとまりは、前後の文脈を踏まえ、発言の流れを理解して、それぞれの発言をどのカードに分類するかを判断してください。

---

【目的】
このプロンプトは、会話ログ全体を**もれなく読み取り**、以下のタイプ別に意味ある単位でカード化し、知識資産として再利用可能な構造に整理することを目的とします。

---

【共通出力ルール】

出力は必ず **次のJSON配列のみ** としてください。

各オブジェクトには以下を含めてください：

- "title": 30文字以内で内容の要点を表すタイトル
- "content": マークダウン形式で構造化された本文
- "column_type": 下記のいずれか（大文字）  
  "INBOX", "QUESTIONS", "INSIGHTS", "THEMES", "ACTIONS"
- "tags": 内容を表す自由なタグ（例："UX", "認知のズレ", "仮説", "実行"）

---

【タイプ別フォーマットと例】

### 🔹 INBOX（未分類・初期アイデア）

- **titleの特徴**：思いつき・違和感・例えなどの素材感
- **contentの構成**：
\`\`\`markdown
> 発言引用

### 直感的な引っかかり
...

### 未整理の可能性
...

### なぜ気になったのか
...

### 今後の展開予想（任意）
...
\`\`\`

- **例**：
\`\`\`json
{
  "title": "この例え使えるかも",
  "content": "> Cさん：それって定食とアラカルトの違いに近い気がする\n\n### 直感的な引っかかり\n構成の違いを説明するために定食／アラカルトという例えが出た。\n\n### 未整理の可能性\nこの比喩は、UX設計に応用できる認知モデルの違いを示唆している可能性がある。\n\n### なぜ気になったのか\n瞬時に共有されるイメージを通じて抽象的議論が具象化された。\n\n### 今後の展開予想（任意）\n「セット vs カスタマイズ」の議論に接続可能。",
  "column_type": "INBOX",
  "tags": ["例え", "認知モデル", "UX"]
}
\`\`\`

---

### 🔹 QUESTIONS（疑問・確認）

- **titleの特徴**：疑問文または確認要求を含む
- **contentの構成**：
\`\`\`markdown
> 発言引用

### 問いの構造と前提
...

### なぜ今この問いが重要か
...

### 対応する必要のある観点
...

### この問いに答えるには何が必要か
...
\`\`\`

- **例**：
\`\`\`json
{
  "title": "優先順位って誰が決めた？",
  "content": "> Aさん：この機能の優先順位って誰がどう決めてるの？\n\n### 問いの構造と前提\n現在進めている仕様策定の裏に、明示された優先基準が存在しない可能性が示唆された。\n\n### なぜ今この問いが重要か\n方向性やリソース配分の議論に関わる基礎的前提であり、放置すると意思決定の根拠が曖昧になる。\n\n### 対応する必要のある観点\n- 決定プロセスの見える化\n- 利害関係者の認識の一致\n\n### この問いに答えるには何が必要か\n優先度設定に使用した資料・仮説・ステークホルダーの合意状況の再確認。",
  "column_type": "QUESTIONS",
  "tags": ["意思決定", "優先順位", "進行基準"]
}
\`\`\`

---

### 🔹 INSIGHTS（気づき・発見）

- **titleの特徴**：仮説・視点・ズレの発見など
- **contentの構成**：
\`\`\`markdown
> 発言引用

### この発言が示す新しい視点
...

### 背景にある構造や認知
...

### 意味づけ・仮説
...

### 他とどう繋がるか
...
\`\`\`

- **例**：
\`\`\`json
{
  "title": "顧客理解は共通言語ではない",
  "content": "> Bさん：顧客って、みんな同じイメージ持ってるわけじゃないんですよね\n\n### この発言が示す新しい視点\nチーム内で使われている「顧客」という言葉に、複数のイメージが共存している可能性がある。\n\n### 背景にある構造や認知\n職種・立場によって接している顧客の像が異なっており、それが意思決定のズレを生む温床になっている。\n\n### 意味づけ・仮説\n共通の言葉を使っていても、実は認知が一致していない「見えないズレ」がある。\n\n### 他とどう繋がるか\nユーザーインタビュー結果の解釈のズレや、ペルソナ作成の難航との因果関係が疑われる。",
  "column_type": "INSIGHTS",
  "tags": ["顧客理解", "認知のズレ", "共通言語"]
}
\`\`\`

---

### 🔹 THEMES（まとめ・論点整理）

- **titleの特徴**：テーマ名や論点の見出し
- **contentの構成**：
\`\`\`markdown
> 代表的な発言引用

### 議論の流れ
...

### 発言の共通構造
...

### 検討すべき視点
...

### 次に扱うべき問い
...
\`\`\`

- **例**：
\`\`\`json
{
  "title": "価値検証の枠組み",
  "content": "> Dさん：価値検証って、どの仮説レベルでやるのがいいんだっけ？\n\n### 議論の流れ\n価値検証の具体的な手法に関する議論の中で、仮説の粒度と検証方法の対応関係について論点が浮上した。\n\n### 発言の共通構造\n- 仮説のレイヤーが曖昧\n- 検証設計が手段先行になりがち\n\n### 検討すべき視点\n- 仮説マッピングの明確化\n- 優先順位づけの基準設計\n\n### 次に扱うべき問い\n「どのレイヤーの仮説を今、なぜ検証するのか？」という検証戦略の明示。",
  "column_type": "THEMES",
  "tags": ["仮説検証", "価値設計", "戦略"]
}
\`\`\`

---

### 🔹 ACTIONS（実行・TODO）

- **titleの特徴**：動詞で始まる、具体的な実行指示やTODO
- **contentの構成**：
\`\`\`markdown
> 発言引用

### 実行すべきこと
...

### 背景と目的
...

### 具体的な担当／期日（任意）
...

### 成功条件・完了条件
...
\`\`\`

- **例**：
\`\`\`json
{
  "title": "仮説Aの検証計画を立てる",
  "content": "> Eさん：じゃあ仮説Aは次回までに軽く検証してみましょうか\n\n### 実行すべきこと\n仮説A（ユーザーは通知よりバッジを好む）の簡易検証を設計し、次回までに結果を持ち寄る。\n\n### 背景と目的\n意思決定を進めるために、根拠を持った判断材料を揃える必要がある。\n\n### 具体的な担当／期日（任意）\nPMチームが検証設計案を作成、エンジニアとユーザーテスト調整（次週火曜まで）\n\n### 成功条件・完了条件\nユーザー5名程度にヒアリングし、反応傾向が得られていること。",
  "column_type": "ACTIONS",
  "tags": ["仮説検証", "短期タスク", "意思決定"]
}
\`\`\`

---

【重要】引用文について：
- 関連する2-3の発言の流れを含めてください（ただし簡潔に）
- 発言者名（実名または発言者A/B等）を明記してください  
- 前後の文脈が分かるよう、十分なボリューム（各発言30-50文字程度）で引用してください
- 会話の流れや論理的展開が理解できるよう、時系列順で引用してください
- 長すぎる引用は避け、要点を簡潔に表現してください

以上のルールに従い、与えられた文字起こし全文をもとに、**構造的で網羅的なカードを生成してください。**
タイトル・内容・分類すべてにおいて、曖昧さを避け、再利用可能な形式に落とし込むことを目指してください。

会議の文字起こし:
${meetingText}`;

    // AI呼び出しとフォールバック処理
    const { result, provider } = await callAIWithFallback(systemPrompt, aiSettings);
    
    console.log(`[extract-cards] AI processing completed with ${provider}`);

    // JSONパース（Gemini対応強化版）
    let cards: any[] = []
    try {
      let jsonText = result;
      
      console.log(`[extract-cards] Raw AI result length: ${jsonText.length}`);
      console.log(`[extract-cards] Used provider: ${provider}`);
      
      // Gemini構造化出力使用時の簡素化処理
      if (provider.includes('gemini')) {
        console.log(`[extract-cards] Processing Gemini structured output...`);
        
        // 構造化出力でも念のため余分なテキストを除去
        jsonText = jsonText
          .replace(/^Here's\s+the\s+.*?:\s*/i, '')          // "Here's the result:" 等
          .replace(/^Based\s+on\s+.*?:\s*/i, '')            // "Based on the meeting:" 等
          .replace(/```json\s*/gi, '')                      // markdown code blocks
          .replace(/```\s*/g, '')
          .trim();
      }
      
      // ```json ... ``` や ``` ... ``` で囲まれている場合は中身だけ抽出
      const codeBlockMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
      if (codeBlockMatch) {
        jsonText = codeBlockMatch[1];
        console.log(`[extract-cards] Extracted from code block`);
      }
      
      // 前後の空白・改行を除去
      jsonText = jsonText.trim();
      
      // 最初の[から最後の]までを抽出（より強力に）
      const startIndex = jsonText.indexOf('[');
      const lastIndex = jsonText.lastIndexOf(']');
      if (startIndex !== -1 && lastIndex !== -1 && lastIndex > startIndex) {
        jsonText = jsonText.substring(startIndex, lastIndex + 1);
        console.log(`[extract-cards] Extracted JSON array from positions ${startIndex} to ${lastIndex}`);
      }
      
            // 構造化出力対応の軽量修復
      if (provider.includes('gemini')) {
        console.log(`[extract-cards] Applying light JSON repair for structured output...`);
        
        // 構造化出力では基本的な修復のみ
        jsonText = jsonText
          .replace(/,\s*}/g, '}')           // 末尾のカンマを削除
          .replace(/,\s*]/g, ']')           // 配列末尾のカンマを削除
          .replace(/}\s*{/g, '},{')         // オブジェクト間のカンマ補完
          .trim();
          
        console.log(`[extract-cards] Applied light repair for structured output`);
      } else {
        // OpenAI用の標準修復
        jsonText = jsonText
          .replace(/,\s*}/g, '}')           // 末尾のカンマを削除
          .replace(/,\s*]/g, ']')           // 配列末尾のカンマを削除
          .replace(/}\s*{/g, '},{')         // オブジェクト間のカンマ補完
          .replace(/"\s*\n\s*"/g, '",\n"')  // 改行でつながった文字列の修復
          .trim();
      }
      
      console.log(`[extract-cards] Final JSON length: ${jsonText.length}`);
      console.log(`[extract-cards] JSON sample (first 200 chars): ${jsonText.substring(0, 200)}...`);
      
      // JSONパースを実行
      cards = JSON.parse(jsonText);
      
      console.log(`[extract-cards] Successfully parsed ${cards.length} cards`);
      
      // column_typeを正規化＋型バリデーション強化＋type→column_type変換
      const validTypes = ['INBOX', 'QUESTIONS', 'INSIGHTS', 'THEMES', 'ACTIONS'];
      const typeMap: Record<string, string> = {
        'task': 'ACTIONS',
        'todo': 'ACTIONS',
        'idea': 'INBOX',
        'issue': 'QUESTIONS',
        'question': 'QUESTIONS',
        'insight': 'INSIGHTS',
        'theme': 'THEMES',
        'action': 'ACTIONS',
      };
      cards = Array.isArray(cards)
        ? cards
            .filter((c: any) =>
              typeof c === 'object' &&
              typeof c.title === 'string' &&
              typeof c.content === 'string'
            )
            .map((c: any) => {
              let columnType = c.column_type || c.type || '';
              columnType = typeMap[columnType.toLowerCase()] || columnType;
              return {
                ...c,
                column_type: validTypes.includes((columnType || '').toUpperCase())
                  ? columnType.toUpperCase()
                  : 'INBOX',
              };
            })
        : [];
        
      console.log(`[extract-cards] Final processed cards count: ${cards.length}`);
    } catch (parseError) {
      console.error('[extract-cards] JSON Parse Error:', parseError)
      console.error('[extract-cards] Raw result sample:', result.substring(0, 1000) + '...')
      
      // Geminiの場合は、より詳細なエラー情報とともに推奨事項を提供
      if (provider.includes('gemini')) {
        console.log('[extract-cards] Gemini JSON parse failed, providing detailed error info...')
        
        // 構造化出力の簡単な修復を試行
        try {
          console.log('[extract-cards] Attempting enhanced repair for structured output...')
          let repairText = result;
          
          // より堅牢な修復処理
          
          // 1. 最初の[から最後の]を探す
          const firstBracket = repairText.indexOf('[');
          const lastBracket = repairText.lastIndexOf(']');
          
          if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
            repairText = repairText.substring(firstBracket, lastBracket + 1);
            console.log('[extract-cards] Extracted JSON array boundaries');
          }
          
          // 2. 基本的な構文修復
          repairText = repairText
            // コメントや不正な文字列を除去
            .replace(/\/\*[\s\S]*?\*\//g, '')          // ブロックコメント
            .replace(/\/\/.*$/gm, '')                   // 行コメント
            .replace(/,\s*}/g, '}')                     // 末尾カンマ除去 
            .replace(/,\s*]/g, ']')                     // 配列末尾カンマ除去
            .replace(/}\s*{/g, '},{')                   // オブジェクト区切り
            .replace(/]\s*\[/g, '],[')                  // 配列区切り
            .trim();
          
          // 3. 不正な文字列エスケープを修復
          repairText = repairText
            .replace(/\\n/g, '\\n')                     // 改行エスケープ正規化
            .replace(/\\"/g, '\\"')                     // クォートエスケープ正規化
            .replace(/\\'/g, "'")                       // シングルクォート正規化
            .replace(/[\x00-\x1F\x7F]/g, '')            // 制御文字除去
            .replace(/\\\//g, '/')                      // 不要なスラッシュエスケープ除去
            .trim();
          
          // 4. 不完全なオブジェクトや配列を修復
          repairText = repairText
            .replace(/,\s*$/, '')                       // 最後の不要なカンマ
            .replace(/{\s*,/g, '{')                     // オブジェクト開始後の無効カンマ
            .replace(/\[\s*,/g, '[')                    // 配列開始後の無効カンマ
            .trim();
            
          // 5. JSON終端の確認と修復
          if (!repairText.endsWith(']') && !repairText.endsWith('}')) {
            if (repairText.includes('[') && !repairText.endsWith(']')) {
              repairText += ']';
              console.log('[extract-cards] Added missing closing bracket');
            }
          }
          
          // 6. 段階的パース試行
          let repairedCards = null;
          
          // まず元のテキストでパース試行
          try {
            repairedCards = JSON.parse(repairText);
            console.log('[extract-cards] Enhanced repair succeeded on first attempt');
          } catch (firstError) {
            console.log('[extract-cards] First parse attempt failed, trying more aggressive repair...');
            
            // より積極的な修復
            let aggressiveRepair = repairText; // aggressiveRepairを上位スコープで定義
            
            try {
              // 7. JSONオブジェクトの不完全性を修復
              
              // 不完全なオブジェクトを特定し、最低限の構造を復元
              const objectPattern = /{[^{}]*$/;
              if (objectPattern.test(aggressiveRepair)) {
                aggressiveRepair = aggressiveRepair.replace(objectPattern, '');
                console.log('[extract-cards] Removed incomplete object at end');
              }
              
              // 再度終端確認
              if (!aggressiveRepair.endsWith(']')) {
                aggressiveRepair += ']';
              }
              
              repairedCards = JSON.parse(aggressiveRepair);
              console.log('[extract-cards] Aggressive repair succeeded');
              
            } catch (secondError) {
              console.log('[extract-cards] Second parse attempt failed, trying substring approach...');
              
              // 8. 最後の手段：有効なJSONの範囲を特定
              try {
                // 最後の完全なオブジェクトまでを抽出
                let braceCount = 0;
                let inString = false;
                let escapeNext = false;
                let lastValidEnd = -1;
                
                for (let i = 1; i < aggressiveRepair.length - 1; i++) {
                  const char = aggressiveRepair[i];
                  
                  if (escapeNext) {
                    escapeNext = false;
                    continue;
                  }
                  
                  if (char === '\\') {
                    escapeNext = true;
                    continue;
                  }
                  
                  if (char === '"' && !escapeNext) {
                    inString = !inString;
                    continue;
                  }
                  
                  if (!inString) {
                    if (char === '{') {
                      braceCount++;
                    } else if (char === '}') {
                      braceCount--;
                      if (braceCount === 0) {
                        lastValidEnd = i;
                      }
                    }
                  }
                }
                
                if (lastValidEnd > 0) {
                  const validSubstring = aggressiveRepair.substring(0, lastValidEnd + 1) + ']';
                  repairedCards = JSON.parse(validSubstring);
                  console.log('[extract-cards] Substring repair succeeded');
                } else {
                  throw new Error('No valid JSON structure found');
                }
                
              } catch (thirdError) {
                console.error('[extract-cards] All repair attempts failed:', thirdError);
                throw new Error(`Enhanced repair failed: ${thirdError.message}`);
              }
            }
          }
          
          if (repairedCards && Array.isArray(repairedCards)) {
            console.log(`[extract-cards] Enhanced repair succeeded! Recovered ${repairedCards.length} cards`);
            cards = repairedCards;
          } else {
            throw new Error('Repaired result is not a valid array');
          }
          
        } catch (repairError) {
          console.error('[extract-cards] Enhanced repair also failed:', repairError);
          
          // 最終的なフォールバック：空配列を返す（サービス継続）
          console.log('[extract-cards] Falling back to empty result to maintain service');
          const emptyCards: any[] = []; // 型を明示的に指定
          cards = emptyCards;
          
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'Gemini JSON parsing failed after all repair attempts. Service degraded to prevent total failure.', 
              errorDetails: {
                originalError: parseError.message,
                repairError: repairError.message,
                provider: provider,
                cardCount: 0
              },
              rawResultSample: result.substring(0, 1000),
              fallbackApplied: true,
              recommendation: 'Try switching to OpenAI provider for more reliable results, or retry the operation.'
            }),
            { 
              status: 206, // Partial Content - デグレードしたが完全失敗ではない
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }
      } else {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Failed to parse extracted cards as JSON', 
            errorDetails: parseError.message,
            rawResultSample: result.substring(0, 500),
            provider: provider
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        cards,
        provider: provider,
        nestId: nestId,
        aiSettings: {
          primaryProvider: aiSettings.primaryProvider,
          enableFallback: aiSettings.enableFallback
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('[extract-cards] Error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}) 