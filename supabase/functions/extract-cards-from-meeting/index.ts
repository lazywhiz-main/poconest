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
会話内容を深く分析し、洞察・背景・意図・関係性も含めてカード化してください。

以下の会話内容から、かんばんボードに登録するカードを抽出してください。

出力は **必ず次の JSON 配列のみ**とし、以下の構造を厳密に守ってください。

[
  {
    "title": "30文字以内のタイトル",
    "content": "マークダウン形式で詳細説明を記述。必ず文脈引用（>）を含め、前後の意図・背景も含めて説明する。発言の裏にある意図やニュアンスも加えて解釈する。",
    "column_type": "INBOX",
    "tags": ["自由なタグ1", "自由なタグ2"]
  },
  {
    "title": "質問例タイトル",
    "content": "> ここに質問発言の引用\n\nこの発言は、...（分析文）",
    "column_type": "QUESTIONS",
    "tags": ["質問", "確認"]
  },
  {
    "title": "洞察例タイトル",
    "content": "> ここに洞察発言の引用\n\nこの発言は、...（分析文）",
    "column_type": "INSIGHTS",
    "tags": ["洞察", "気づき"]
  },
  {
    "title": "テーマ例タイトル",
    "content": "> ここにテーマ発言の引用\n\nこの発言は、...（分析文）",
    "column_type": "THEMES",
    "tags": ["テーマ", "まとめ"]
  },
  {
    "title": "アクション例タイトル",
    "content": "> ここにアクション発言の引用\n\nこの発言は、...（分析文）",
    "column_type": "ACTIONS",
    "tags": ["アクション", "TODO"]
  }
]

制約事項：
- JSON以外の出力は禁止です（説明・補足・改行前コメント等含め一切禁止）。
- 指定以外のフィールド（type, priority, id, deadlineなど）は出力しないでください。
- contentは単なる引用ではなく、会話の文脈や背景、洞察、関係性、暗黙的な意図などを含んだ2〜5行程度の分析的文章にしてください。
- column_typeはINBOX（未分類・初期アイデア・分類できないもの）、QUESTIONS（質問・疑問点・確認したいこと）、INSIGHTS（気づき・洞察・新たな発見）、THEMES（議論のテーマ・まとめ・全体像）、ACTIONS（アクション・TODO・今後やるべきこと）のいずれかにしてください。

引用についてのルール：
contentには、原文の一部を > で引用し、その後に解釈や分析文を加えてください。発言の背景や含意を踏まえ、なぜこの発言が重要かを説明してください。
`;

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
        max_tokens: 2000,
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