import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestBody {
  meeting_id: string;
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

    // Supabaseクライアント初期化
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase env vars not set')
    }
    const supabase = createClient(supabaseUrl, supabaseKey)

    // ミーティング内容を取得
    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .select('id, title, transcript')
      .eq('id', meeting_id)
      .single()
    if (meetingError || !meeting) {
      throw new Error('Meeting not found')
    }
    const meetingText = meeting.transcript || ''
    if (!meetingText) {
      throw new Error('No meeting content found')
    }

    // OpenAI APIキー
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set')
    }

    // システムプロンプト
    const systemPrompt = `あなたは哲学・人文社会学・経営・ブランディングに長けた専門家です。
以下の文字起こしから、発言の意味的まとまりごとに、構造的かつ解釈豊かなカードを抽出してください。

---

【目的】
このプロンプトは、会話ログ全体をもれなく読み取り、以下のタイプ別に意味ある単位でカード化し、知識資産として再利用可能な構造に整理することを目的とします。

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

以上のルールに従い、与えられた文字起こし全文をもとに、**構造的で網羅的なカードを生成してください。**
タイトル・内容・分類すべてにおいて、曖昧さを避け、再利用可能な形式に落とし込むことを目指してください。`;

    // OpenAI API呼び出し
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: meetingText }
        ],
        max_tokens: 4000,
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

    console.log('OpenAI raw result:', result)

    // JSONパース
    let cards = []
    try {
      let jsonText = result;
      // ```json ... ``` や ``` ... ``` で囲まれている場合は中身だけ抽出
      const codeBlockMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
      if (codeBlockMatch) {
        jsonText = codeBlockMatch[1];
      }
      // 前後の空白・改行を除去
      jsonText = jsonText.trim();
      // 最初の[から最後の]までを抽出
      const arrayMatch = jsonText.match(/\[([\s\S]*)\]/);
      if (arrayMatch) {
        jsonText = '[' + arrayMatch[1] + ']';
      }
      jsonText = jsonText.trim();
      cards = JSON.parse(jsonText);
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
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to parse extracted cards as JSON', rawResult: result }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, cards }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}) 