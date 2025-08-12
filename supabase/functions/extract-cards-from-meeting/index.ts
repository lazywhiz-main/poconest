import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// 🔧 JSON文字列修復関数
function repairJsonString(jsonText: string): string {
  let repaired = jsonText.trim();
  
  console.log(`[extract-cards] Original JSON length: ${repaired.length}`);
  console.log(`[extract-cards] JSON starts with: ${repaired.substring(0, 100)}`);
  console.log(`[extract-cards] JSON ends with: ${repaired.substring(Math.max(0, repaired.length - 100))}`);
  
  try {
    // ステップ1: 明らかに無効な制御文字を除去
    repaired = repaired.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    
    // ステップ2: 文字列内でエスケープされていない改行・タブ・バックスラッシュを修正
    // より安全なアプローチ: 文字列を一つずつ処理
    let result = '';
    let inString = false;
    let escapeNext = false;
    
    for (let i = 0; i < repaired.length; i++) {
      const char = repaired[i];
      const prevChar = i > 0 ? repaired[i - 1] : '';
      
      if (escapeNext) {
        result += char;
        escapeNext = false;
        continue;
      }
      
      if (char === '\\' && inString) {
        result += char;
        escapeNext = true;
        continue;
      }
      
      if (char === '"' && prevChar !== '\\') {
        inString = !inString;
        result += char;
        continue;
      }
      
      if (inString) {
        // 文字列内での特殊文字をエスケープ
        if (char === '\n') {
          result += '\\n';
        } else if (char === '\r') {
          result += '\\r';
        } else if (char === '\t') {
          result += '\\t';
        } else {
          result += char;
        }
      } else {
        result += char;
      }
    }
    
    repaired = result;
    
    // ステップ3: 途切れた文字列を検出して修復
    // パターン1: 文字列が終わりなく途切れている場合
    const quotes = [];
    let position = 0;
    while ((position = repaired.indexOf('"', position)) !== -1) {
      if (position === 0 || repaired[position - 1] !== '\\') {
        quotes.push(position);
      }
      position++;
    }
    
    // 奇数個の引用符があるということは、最後の文字列が閉じられていない
    if (quotes.length % 2 === 1) {
      const lastQuotePos = quotes[quotes.length - 1];
      const afterLastQuote = repaired.substring(lastQuotePos + 1);
      
      // 最後の引用符以降にまともなJSONが続いていない場合、切り詰める
      if (!/[,}\]]/.test(afterLastQuote)) {
        const beforeLastQuote = repaired.substring(0, lastQuotePos);
        const lastCommaPos = beforeLastQuote.lastIndexOf(',');
        const lastOpenBrace = beforeLastQuote.lastIndexOf('{');
        const lastOpenBracket = beforeLastQuote.lastIndexOf('[');
        
        if (lastCommaPos > Math.max(lastOpenBrace, lastOpenBracket)) {
          // 最後のカンマ以降を削除
          repaired = beforeLastQuote.substring(0, lastCommaPos);
        } else {
          // カンマが見つからない場合、最後のオブジェクト・配列を削除
          repaired = beforeLastQuote.substring(0, Math.max(lastOpenBrace, lastOpenBracket));
        }
      }
    }
    
    // ステップ4: 括弧とブレースのバランスを修正
    const openBraces = (repaired.match(/\{/g) || []).length;
    const closeBraces = (repaired.match(/\}/g) || []).length;
    const openBrackets = (repaired.match(/\[/g) || []).length;
    const closeBrackets = (repaired.match(/\]/g) || []).length;
    
    // 不足している閉じ括弧を追加
    if (openBraces > closeBraces) {
      repaired += '}'.repeat(openBraces - closeBraces);
    }
    if (openBrackets > closeBrackets) {
      repaired += ']'.repeat(openBrackets - closeBrackets);
    }
    
    // ステップ5: 基本的な構文エラーを修正
    repaired = repaired
      .replace(/,\s*([}\]])/g, '$1')  // 末尾カンマ除去
      .replace(/}\s*{/g, '},{')       // オブジェクト間のカンマ不足
      .replace(/]\s*\[/g, '],[');     // 配列間のカンマ不足
    
    console.log(`[extract-cards] Repaired JSON length: ${repaired.length}`);
    console.log(`[extract-cards] Repaired JSON ends with: ${repaired.substring(Math.max(0, repaired.length - 100))}`);
    
    return repaired;
    
  } catch (error) {
    console.error('[extract-cards] Error during JSON repair:', error);
    return jsonText; // 修復に失敗した場合は元のテキストを返す
  }
}

interface RequestBody {
  meeting_id: string;
  extraction_settings?: CardExtractionSettings;
  extractionSettings?: CardExtractionSettings; // フロントエンドからの新しいフィールド
  job_id?: string; // ジョブIDを追加
  nestId?: string; // Nest IDを追加
}

interface CardExtractionSettings {
  // 抽出の粒度設定
  extractionGranularity: 'coarse' | 'medium' | 'fine';
  
  // 粒度別の詳細設定（新規追加）
  granularitySettings: {
    groupingStrategy: string;        // グループ化の戦略
    contextDepth: string;            // 文脈の深さ
    detailLevel: string;             // 詳細レベル
    maxUtterancePerCard: number;     // 1カードあたりの最大発言数
    minContextUtterances: number;    // 文脈保持のための最小発言数
  };
  
  // 各カラムタイプごとの最大カード数
  maxCardsPerColumn: {
    INBOX: number;
    QUESTIONS: number;
    INSIGHTS: number;
    THEMES: number;
    ACTIONS: number;
  };
  
  // 全体の最大カード数
  maxTotalCards: number;
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

function getDefaultCardExtractionSettings(): CardExtractionSettings {
  return {
    extractionGranularity: 'medium',
    granularitySettings: {
      groupingStrategy: '適度な話題でまとめる',
      contextDepth: 'バランスの取れた文脈を保持する',
      detailLevel: '適度な詳細レベル',
      maxUtterancePerCard: 4,
      minContextUtterances: 2
    },
    maxCardsPerColumn: {
      INBOX: 6,
      QUESTIONS: 6,
      INSIGHTS: 6,
      THEMES: 6,
      ACTIONS: 6
    },
    maxTotalCards: 30
  };
}

// 粒度別の特別指示を生成する関数
function generateGranularityInstructions(settings: CardExtractionSettings): string {
  const { granularitySettings } = settings;
  
  return `
【粒度別の特別指示】
- グループ化戦略: ${granularitySettings.groupingStrategy}
- 文脈の深さ: ${granularitySettings.contextDepth}
- 詳細レベル: ${granularitySettings.detailLevel}
- 1つのカードには最大${granularitySettings.maxUtterancePerCard}発言まで含める
- 文脈保持のため最低${granularitySettings.minContextUtterances}発言は含める
`;
}

function getCardExtractionSettingsByGranularity(granularity: 'coarse' | 'medium' | 'fine'): CardExtractionSettings {
  switch (granularity) {
    case 'coarse':
      return {
        extractionGranularity: 'coarse',
        granularitySettings: {
          groupingStrategy: '大きな話題の塊でまとめる',
          contextDepth: '広い文脈を保持する',
          detailLevel: '全体像を把握できるレベル',
          maxUtterancePerCard: 6,
          minContextUtterances: 3
        },
        maxCardsPerColumn: {
          INBOX: 3,
          QUESTIONS: 3,
          INSIGHTS: 3,
          THEMES: 3,
          ACTIONS: 3
        },
        maxTotalCards: 15
      };
    case 'medium':
      return getDefaultCardExtractionSettings();
    case 'fine':
      return {
        extractionGranularity: 'fine',
        granularitySettings: {
          groupingStrategy: '各トピックを独立したカードにする',
          contextDepth: '最小限の文脈で具体的に記述する',
          detailLevel: '具体的で詳細なレベル',
          maxUtterancePerCard: 2,
          minContextUtterances: 1
        },
        maxCardsPerColumn: {
          INBOX: 10,
          QUESTIONS: 10,
          INSIGHTS: 10,
          THEMES: 10,
          ACTIONS: 10
        },
        maxTotalCards: 50
      };
    default:
      return getDefaultCardExtractionSettings();
  }
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

// テスト用：粒度設定の動作確認
function testGranularitySettings() {
  console.log('=== 粒度設定のテスト ===');
  
  const coarse = getCardExtractionSettingsByGranularity('coarse');
  console.log('Coarse:', {
    granularity: coarse.extractionGranularity,
    groupingStrategy: coarse.granularitySettings.groupingStrategy,
    maxUtterancePerCard: coarse.granularitySettings.maxUtterancePerCard,
    maxTotalCards: coarse.maxTotalCards
  });
  
  const medium = getCardExtractionSettingsByGranularity('medium');
  console.log('Medium:', {
    granularity: medium.extractionGranularity,
    groupingStrategy: medium.granularitySettings.groupingStrategy,
    maxUtterancePerCard: medium.granularitySettings.maxUtterancePerCard,
    maxTotalCards: medium.maxTotalCards
  });
  
  const fine = getCardExtractionSettingsByGranularity('fine');
  console.log('Fine:', {
    granularity: fine.extractionGranularity,
    groupingStrategy: fine.granularitySettings.groupingStrategy,
    maxUtterancePerCard: fine.granularitySettings.maxUtterancePerCard,
    maxTotalCards: fine.maxTotalCards
  });
  
  console.log('=== 粒度別指示のテスト ===');
  console.log('Coarse Instructions:', generateGranularityInstructions(coarse));
  console.log('Medium Instructions:', generateGranularityInstructions(medium));
  console.log('Fine Instructions:', generateGranularityInstructions(fine));
}

// 重複防止はjob_idベースで管理（グローバル変数不要）

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  let job_id: string | null = null;

  try {
    console.log(`🚀 [extract-cards-from-meeting] Edge Function実行開始`);

    const requestBody = await req.json()
    const { meeting_id, extraction_settings, extractionSettings, job_id: requestJobId, nestId }: RequestBody = requestBody
    
    // 粒度設定を統一（新しいフィールドを優先）
    const finalExtractionSettings = extractionSettings || extraction_settings;
    job_id = requestJobId || null;
    
    console.log(`📝 [extract-cards-from-meeting] リクエスト詳細:`, {
      meeting_id,
      job_id,
      nestId,
      hasExtractionSettings: !!finalExtractionSettings,
      extractionGranularity: finalExtractionSettings?.extractionGranularity
    });
    

    
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

    // ミーティングデータを取得
    console.log('📋 [extract-cards-from-meeting] ミーティングデータ取得開始:', meeting_id);
    
    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .select('*')
      .eq('id', meeting_id)
      .single();

    if (meetingError) {
      console.error('❌ [extract-cards-from-meeting] ミーティング取得エラー:', meetingError);
      throw new Error(`Failed to fetch meeting: ${meetingError.message}`);
    }

    if (!meeting) {
      console.error('❌ [extract-cards-from-meeting] ミーティングが見つかりません:', meeting_id);
      throw new Error('Meeting not found');
    }

    if (!meeting.transcript || meeting.transcript.trim().length === 0) {
      console.error('❌ [extract-cards-from-meeting] 文字起こしが見つかりません');
      throw new Error('Meeting transcript not found or empty');
    }

    console.log('✅ [extract-cards-from-meeting] ミーティングデータ取得成功:', {
      id: meeting.id,
      title: meeting.title,
      transcriptLength: meeting.transcript.length
    });
    
    // ジョブステータスをrunningに更新（job_idがある場合のみ）
    if (job_id) {
      console.log('🔄 [extract-cards-from-meeting] ジョブステータス更新: running');
      const { error: statusError } = await supabase
        .from('background_jobs')
        .update({ 
          status: 'running',
          updated_at: new Date().toISOString()
        })
        .eq('id', job_id);
        
      if (statusError) {
        console.warn('⚠️ [extract-cards-from-meeting] ステータス更新警告:', statusError);
      }
    }

    // カード抽出設定の取得 - 粒度設定に基づいて決定
    console.log(`🔍 [extract-cards] Debug - finalExtractionSettings:`, finalExtractionSettings);
    console.log(`🔍 [extract-cards] Debug - extractionGranularity exists:`, !!finalExtractionSettings?.extractionGranularity);
    console.log(`🔍 [extract-cards] Debug - extractionGranularity value:`, finalExtractionSettings?.extractionGranularity);
    
    let cardExtractionSettings: CardExtractionSettings;
    if (finalExtractionSettings?.extractionGranularity) {
      // フロントエンドから粒度設定が渡された場合は、その粒度に基づいて設定を生成
      cardExtractionSettings = getCardExtractionSettingsByGranularity(finalExtractionSettings.extractionGranularity);
      console.log(`[extract-cards] Using granularity-based settings: ${finalExtractionSettings.extractionGranularity}`, cardExtractionSettings);
    } else {
      // 設定が渡されなかった場合はデフォルト設定を使用
      cardExtractionSettings = finalExtractionSettings || getDefaultCardExtractionSettings();
      console.log(`[extract-cards] Using default/provided settings:`, cardExtractionSettings);
    }

    // ミーティング内容とnest_idは既に取得済みなので、meetingオブジェクトを使用
    console.log(`🔍 [extract-cards] 取得済みミーティングデータを使用: meeting_id=${meeting_id}`);
    
    if (!meeting) {
      console.error(`🔍 [extract-cards] ミーティングデータがありません`);
      throw new Error('Meeting data not available')
    }
    
    console.log(`🔍 [extract-cards] ミーティングデータ取得成功:`, {
      meeting_id: meeting.id,
      title: meeting.title,
      transcript_length: meeting.transcript?.length || 0,
      transcript_preview: meeting.transcript?.substring(0, 100) + '...',
      nest_id: meeting.nest_id
    });
    
    const meetingText = meeting.transcript || ''
    if (!meetingText) {
      console.error(`🔍 [extract-cards] transcriptが空: meeting_id=${meeting_id}`);
      throw new Error('No meeting content found')
    }

    // 短すぎるトランスクリプトの判定（50文字未満）
    const MIN_TRANSCRIPT_LENGTH = 50;
    if (meetingText.length < MIN_TRANSCRIPT_LENGTH) {
      throw new Error(`Transcript too short (${meetingText.length} chars). Minimum required: ${MIN_TRANSCRIPT_LENGTH} chars.`);
    }

    // nest_idの取得 - リクエストから取得するか、ミーティングデータから取得
    const finalNestId = nestId || meeting.nest_id;
    if (!finalNestId) {
      throw new Error('Could not determine nest_id for this meeting')
    }

    console.log(`[extract-cards] Found nest_id: ${finalNestId}`);

    // Nest AI設定を取得
    const aiSettings = await getNestAISettings(supabase, finalNestId);
    console.log(`[extract-cards] AI Settings:`, {
      primaryProvider: aiSettings.primaryProvider,
      enableFallback: aiSettings.enableFallback,
      fallbackProviders: aiSettings.fallbackProviders
    });

    // システムプロンプト
    const systemPrompt = `あなたは哲学・人文社会学・経営・ブランディングに長けた専門家です。
以下の文字起こしから、発言の意味的まとまりごとに、構造的かつ解釈豊かなカードを抽出してください。
意味のまとまりは、前後の文脈を踏まえ、発言の流れを理解して、それぞれの発言をどのカードに分類するかを判断してください。

⚠️ **重要**: 提供された文字起こしの内容のみからカードを抽出してください。文字起こしが空、短すぎる、または意味のある内容を含まない場合は、空の配列 [] を返してください。デモ用のサンプルカードやモックデータは絶対に生成しないでください。

---

【目的】
このプロンプトは、会話ログ全体を**もれなく読み取り**、以下のタイプ別に意味ある単位でカード化し、知識資産として再利用可能な構造に整理することを目的とします。

---

【抽出設定】
- 抽出粒度: ${cardExtractionSettings.extractionGranularity === 'coarse' ? 'ざっくり（大きなテーマ中心）' : cardExtractionSettings.extractionGranularity === 'fine' ? '細かめ（詳細な発言も抽出）' : '標準（バランス重視）'}
- 最大カード数: 全体で${cardExtractionSettings.maxTotalCards}枚まで
- 各カラムの最大カード数: INBOX(${cardExtractionSettings.maxCardsPerColumn.INBOX})、QUESTIONS(${cardExtractionSettings.maxCardsPerColumn.QUESTIONS})、INSIGHTS(${cardExtractionSettings.maxCardsPerColumn.INSIGHTS})、THEMES(${cardExtractionSettings.maxCardsPerColumn.THEMES})、ACTIONS(${cardExtractionSettings.maxCardsPerColumn.ACTIONS})

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
- 関連する${cardExtractionSettings.granularitySettings.maxUtterancePerCard}発言までの流れを含めてください（ただし簡潔に）
- 発言者名（実名または発言者A/B等）を明記してください  
- 前後の文脈が分かるよう、十分なボリュームで引用してください
- 会話の流れや論理的展開が理解できるよう、時系列順で引用してください
- 発言の要点と文脈を適切に含め、理解しやすい長さで引用してください
- 文脈保持のため最低${cardExtractionSettings.granularitySettings.minContextUtterances}発言は含めてください

${generateGranularityInstructions(cardExtractionSettings)}

以上のルールに従い、与えられた文字起こし全文をもとに、**構造的で網羅的なカードを生成してください。**
タイトル・内容・分類すべてにおいて、曖昧さを避け、再利用可能な形式に落とし込むことを目指してください。

会議の文字起こし:
${meetingText}`;

    // AI呼び出しとフォールバック処理
    console.log(`🔍 [extract-cards] AI呼び出し開始:`, {
      meeting_id,
      transcript_length: meetingText.length,
      prompt_length: systemPrompt.length,
      provider: aiSettings.primaryProvider,
      enableFallback: aiSettings.enableFallback
    });
    
    const { result, provider } = await callAIWithFallback(systemPrompt, aiSettings);
    
    console.log(`🔍 [extract-cards] AI呼び出し完了:`, {
      provider,
      result_length: result?.length || 0,
      result_preview: result?.substring(0, 200) + '...'
    });

    // JSONパース（簡略化版）
    let cards: any[] = []
    try {
      let jsonText = result.trim();
      
      console.log(`[extract-cards] Raw AI result length: ${jsonText.length}`);
      console.log(`[extract-cards] Used provider: ${provider}`);
      
      // 基本的なJSON抽出（```json ... ``` や ``` ... ``` から抽出）
      const codeBlockMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
      if (codeBlockMatch) {
        jsonText = codeBlockMatch[1];
        console.log(`[extract-cards] Extracted from code block`);
      }
      
      // 最初の[から最後の]までを抽出
      const startIndex = jsonText.indexOf('[');
      const lastIndex = jsonText.lastIndexOf(']');
      if (startIndex !== -1 && lastIndex !== -1 && lastIndex > startIndex) {
        jsonText = jsonText.substring(startIndex, lastIndex + 1);
        console.log(`[extract-cards] Extracted JSON array`);
      }
      
      // 基本的なJSON修復
      jsonText = jsonText
        .replace(/,\s*}/g, '}')           // 末尾のカンマを削除
        .replace(/,\s*]/g, ']')           // 配列末尾のカンマを削除
        .trim();
      
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
      console.error('[extract-cards] Raw result sample:', result.substring(0, 500) + '...')
      
      // 高度なJSON修復を試行
      try {
        console.log('[extract-cards] Attempting advanced repair...')
        let repairText = result;
        
        // JSONの境界を特定
        const firstBracket = repairText.indexOf('[');
        const lastBracket = repairText.lastIndexOf(']');
        
        if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
          repairText = repairText.substring(firstBracket, lastBracket + 1);
          
          // 基本的な構文修復
          repairText = repairText
            .replace(/,\s*}/g, '}')           // 末尾カンマ除去
            .replace(/,\s*]/g, ']')           // 配列末尾カンマ除去
            .trim();
          
          // 🔧 途切れた文字列を修復
          repairText = repairJsonString(repairText);
          
          console.log(`[extract-cards] Repaired JSON length: ${repairText.length}`);
          console.log(`[extract-cards] Repaired JSON sample: ${repairText.substring(repairText.length - 200)}`);
          
          const repairedCards = JSON.parse(repairText);
          cards = repairedCards;
          console.log('[extract-cards] Advanced repair succeeded');
        } else {
          throw new Error('No valid JSON array found');
        }
      } catch (repairError) {
        console.error('[extract-cards] Repair failed:', repairError);
        cards = []; // 修復に失敗した場合は空配列
      }
              
    }

    // 🔍 包括的レスポンス検証システム
    console.log('🔍 [extract-cards] 包括的レスポンス検証システム開始:', {
      timestamp: new Date().toISOString(),
      cardsCount: cards.length,
      cardsType: typeof cards,
      isArray: Array.isArray(cards),
      provider,
      meetingId: meeting_id,
      jobId: job_id
    });

    // ❌ 基本的なデータ型検証
    if (!Array.isArray(cards)) {
      const errorMessage = 'AIが配列以外のデータを返しました';
      console.error('🚨🚨🚨 [extract-cards] 致命的エラー: AIレスポンスが配列ではない 🚨🚨🚨', {
        cardsType: typeof cards,
        cardsValue: cards,
        provider,
        timestamp: new Date().toISOString()
      });
      throw new Error(errorMessage);
    }

    // ⚠️ 空の結果の検証
    if (cards.length === 0) {
      console.warn('⚠️⚠️⚠️ [extract-cards] AIが0枚のカードを返しました ⚠️⚠️⚠️', {
        provider,
        transcriptLength: meetingText.length,
        transcriptPreview: meetingText.substring(0, 200) + '...',
        meetingId: meeting_id,
        jobId: job_id,
        timestamp: new Date().toISOString(),
        extractionSettings: cardExtractionSettings
      });
      
      // 0枚は成功だが警告として扱う
      const warningResult = {
        success: true,
        warning: true,
        warningMessage: 'カード抽出は成功したが、0枚のカードが返された',
        cards: [],
        provider,
        cardCount: 0,
        completedAt: new Date().toISOString(),
        metadata: {
          transcriptLength: meetingText.length,
          extractionSettings: cardExtractionSettings
        }
      };
      
      // ジョブステータスを警告付きで完了に更新
      if (job_id) {
        await supabase
          .from('background_jobs')
          .update({
            status: 'completed',
            result: warningResult,
            progress: 100,
            updated_at: new Date().toISOString(),
          })
          .eq('id', job_id);
      }
      
      return new Response(
        JSON.stringify(warningResult),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 🔍 カードデータの品質検証
    const validCards = cards.filter(card => {
      const isValid = (
        card && 
        typeof card === 'object' && 
        typeof card.title === 'string' && 
        typeof card.content === 'string' &&
        card.title.trim().length > 0 &&
        card.content.trim().length > 0 &&
        ['INBOX', 'QUESTIONS', 'INSIGHTS', 'THEMES', 'ACTIONS'].includes(card.column_type)
      );
      
      if (!isValid) {
        console.warn('⚠️ [extract-cards] 不正なカードデータを検出:', {
          card,
          title: card?.title,
          titleType: typeof card?.title,
          content: card?.content,
          contentType: typeof card?.content,
          columnType: card?.column_type,
          timestamp: new Date().toISOString()
        });
      }
      
      return isValid;
    });

    const invalidCardsCount = cards.length - validCards.length;
    
    if (invalidCardsCount > 0) {
      console.warn('⚠️⚠️⚠️ [extract-cards] 品質問題のあるカードデータを検出 ⚠️⚠️⚠️', {
        totalCards: cards.length,
        validCards: validCards.length,
        invalidCards: invalidCardsCount,
        invalidCardsRatio: (invalidCardsCount / cards.length * 100).toFixed(1) + '%',
        provider,
        meetingId: meeting_id,
        jobId: job_id,
        timestamp: new Date().toISOString(),
        invalidCardSamples: cards.filter(card => !validCards.includes(card)).slice(0, 3)
      });

      // 50%以上が不正な場合はエラーとして扱う
      if (invalidCardsCount / cards.length > 0.5) {
        const errorMessage = `カードデータの品質が低すぎます (有効: ${validCards.length}/${cards.length})`;
        console.error('🚨🚨🚨 [extract-cards] 致命的エラー: カード品質不良 🚨🚨🚨', {
          errorMessage,
          totalCards: cards.length,
          validCards: validCards.length,
          invalidCards: invalidCardsCount,
          provider,
          timestamp: new Date().toISOString()
        });
        throw new Error(errorMessage);
      }
    }

    // 🔍 期待される範囲のカード数チェック
    const expectedMinCards = Math.max(1, Math.floor(meetingText.length / 1000)); // 1000文字に1枚程度
    const expectedMaxCards = cardExtractionSettings.maxTotalCards;
    
    if (validCards.length > expectedMaxCards) {
      console.warn('⚠️⚠️⚠️ [extract-cards] カード数が上限を超過 ⚠️⚠️⚠️', {
        validCardsCount: validCards.length,
        maxAllowed: expectedMaxCards,
        overage: validCards.length - expectedMaxCards,
        provider,
        meetingId: meeting_id,
        jobId: job_id,
        timestamp: new Date().toISOString()
      });
      
      // 上限を超えた場合は先頭部分のみ使用
      cards = validCards.slice(0, expectedMaxCards);
      console.log(`🔧 [extract-cards] カード数を上限に調整: ${validCards.length} -> ${cards.length}`);
    } else {
      cards = validCards;
    }



    // 🔍 モックデータパターンの検出（より厳密な条件に変更）
    const mockPatterns = [
      /sample.*data|example.*card|demo.*content|test.*case|サンプルデータ|例示カード|テストケース|デモコンテンツ/i,
      /lorem ipsum/i,
      /placeholder.*text|dummy.*data|mock.*card|仮のデータ|一時的なサンプル/i,
      /^(サンプル|例|テスト|デモ)$/i  // タイトルが単純な「例」「サンプル」等のみの場合
    ];
    
    const suspiciousMockCards = cards.filter(card => 
      mockPatterns.some(pattern => 
        pattern.test(card.title) || pattern.test(card.content)
      )
    );
    
    if (suspiciousMockCards.length > 0) {
      console.warn('⚠️⚠️⚠️ [extract-cards] モックデータの可能性があるカードを検出 ⚠️⚠️⚠️', {
        suspiciousCardsCount: suspiciousMockCards.length,
        totalCards: cards.length,
        suspiciousRatio: (suspiciousMockCards.length / cards.length * 100).toFixed(1) + '%',
        provider,
        meetingId: meeting_id,
        jobId: job_id,
        timestamp: new Date().toISOString(),
        suspiciousCardSamples: suspiciousMockCards.slice(0, 3).map(card => ({
          title: card.title,
          contentPreview: card.content.substring(0, 100) + '...'
        }))
      });

      // モックデータが大半を占める場合はエラー
      if (suspiciousMockCards.length / cards.length > 0.7) {
        const errorMessage = 'AIがモックデータやサンプルデータを返した可能性があります';
        console.error('🚨🚨🚨 [extract-cards] 致命的エラー: モックデータ検出 🚨🚨🚨', {
          errorMessage,
          suspiciousCardsCount: suspiciousMockCards.length,
          totalCards: cards.length,
          provider,
          timestamp: new Date().toISOString()
        });
        throw new Error(errorMessage);
      }
    }

    // ✅ 検証完了ログ
    console.log('✅✅✅ [extract-cards] 包括的レスポンス検証完了 - 品質良好 ✅✅✅', {
      finalCardsCount: cards.length,
      validCardsRatio: '100%',
      provider,
      meetingId: meeting_id,
      jobId: job_id,
      timestamp: new Date().toISOString(),
      qualityMetrics: {
        totalProcessed: cards.length,
        allFieldsValid: true,
        noMockDataDetected: suspiciousMockCards.length === 0,
        withinExpectedRange: cards.length <= expectedMaxCards
      }
    });

    // 💾 カードをデータベースに保存
    console.log('💾 [extract-cards] カードをboard_cardsテーブルに保存開始');
    
    // 1. nest_idからboard_idを取得
        const { data: board, error: boardError } = await supabase
      .from('boards')
      .select('id')
      .eq('nest_id', finalNestId)
      .single();

    if (boardError || !board) {
      console.error('❌ [extract-cards] ボード取得エラー:', boardError);
      throw new Error(`Failed to find board for nest_id: ${finalNestId}`);
    }
    
    const boardId = board.id;
    console.log(`📋 [extract-cards] 取得したboard_id: ${boardId}`);
    
    // 2. ミーティングソースを作成または取得
    const { data: existingSource, error: sourceError } = await supabase
      .from('sources')
      .select('id')
      .eq('type', 'meeting')
      .eq('ref_id', meeting_id)
      .single();
    
    let sourceId = null;
    if (sourceError && sourceError.code === 'PGRST116') {
      // ソースが存在しない場合は作成
      const { data: newSource, error: createSourceError } = await supabase
        .from('sources')
        .insert({
          type: 'meeting',
          ref_id: meeting_id,
          label: meeting.title || '会議',
          url: null
        })
        .select('id')
        .single();
      
      if (createSourceError) {
        console.warn('⚠️ [extract-cards] ソース作成エラー:', createSourceError);
      } else {
        sourceId = newSource.id;
        console.log(`📝 [extract-cards] 新しいソース作成: ${sourceId}`);
      }
    } else if (!sourceError) {
      sourceId = existingSource.id;
      console.log(`📝 [extract-cards] 既存ソース使用: ${sourceId}`);
    }
    
    // 3. 各カードを保存
    const savedCards = [];
    const cardSaveErrors = [];
    
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      console.log(`💾 [extract-cards] カード保存中 ${i + 1}/${cards.length}: ${card.title}`);
      
      try {
        const { data: savedCard, error: cardError } = await supabase.rpc('create_card_with_relations', {
          p_board_id: boardId,
          p_title: card.title,
          p_content: card.content,
          p_column_type: card.column_type,
          p_created_by: meeting.created_by || null, // ミーティング作成者を使用
          p_created_at: new Date().toISOString(),
          p_updated_at: new Date().toISOString(),
          p_order_index: i,
          p_is_archived: false,
          p_metadata: {
            ai: {
              generated_by: provider,
              generated_at: new Date().toISOString(),
              meeting_id: meeting_id,
              job_id: job_id
            }
          },
          p_tags: card.tags || [],
          p_source_id: sourceId
        });
        
        if (cardError) {
          console.error(`❌ [extract-cards] カード保存エラー ${i + 1}: ${cardError.message}`);
          cardSaveErrors.push({ cardIndex: i, title: card.title, error: cardError.message });
        } else {
          console.log(`✅ [extract-cards] カード保存成功 ${i + 1}: ${card.title}`);
          savedCards.push(savedCard);
        }
      } catch (cardSaveError) {
        console.error(`❌ [extract-cards] カード保存例外 ${i + 1}:`, cardSaveError);
        cardSaveErrors.push({ cardIndex: i, title: card.title, error: cardSaveError.message });
      }
    }
    
    console.log(`💾 [extract-cards] カード保存完了:`, {
      totalCards: cards.length,
      savedCards: savedCards.length,
      errors: cardSaveErrors.length,
      savedCardsIds: savedCards.map(c => c.card?.id).filter(Boolean),
      errors: cardSaveErrors
    });

    // 🔧 ジョブステータスをcompletedに更新し、結果を保存
    if (job_id) {
      console.log(`🔧 [extract-cards] ジョブ完了 - ステータスをcompletedに更新: ${job_id}`);
      console.log(`🔧 [extract-cards] resultカラムに書き込むデータ:`, {
        job_id,
        timestamp: new Date().toISOString(),
        cardsCount: cards.length,
        provider: provider,
        cardsPreview: cards.slice(0, 3).map(card => ({
          title: card.title,
          content: card.content?.substring(0, 50) + '...',
          column_type: card.column_type
        })),
        fullCardsData: cards,
        resultContent: {
          cards: cards,
          provider: provider,
          cardCount: cards.length,
          completedAt: new Date().toISOString()
        }
      });
      
      const { error: updateError } = await supabase
        .from('background_jobs')
        .update({
          status: 'completed',
          result: {
            cards: cards,
            provider: provider,
            cardCount: cards.length,
            completedAt: new Date().toISOString()
          },
          progress: 100,
          updated_at: new Date().toISOString(),
        })
        .eq('id', job_id);

      if (updateError) {
        console.warn(`🔧 [extract-cards] ジョブ完了時ステータス更新エラー:`, updateError);
      } else {
        console.log(`🔧 [extract-cards] ジョブ完了時ステータス更新完了: ${job_id} -> completed`);
        console.log(`🔧 [extract-cards] resultカラム書き込み完了:`, {
          job_id,
          timestamp: new Date().toISOString(),
          status: 'completed',
          resultData: {
            cards: cards,
            provider: provider,
            cardCount: cards.length,
            completedAt: new Date().toISOString()
          },
          fullResultContent: {
            cards: cards,
            provider: provider,
            cardCount: cards.length,
            completedAt: new Date().toISOString()
          }
        });
        
        // 🔓 処理ロック機能は削除済み - ログのみ出力
        console.log(`✅ [extract-cards] ジョブ完了 - ロック機能なし: ${job_id}`);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        cards,
        provider: provider,
        nestId: finalNestId,
        aiSettings: {
          primaryProvider: aiSettings.primaryProvider,
          enableFallback: aiSettings.enableFallback
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('[extract-cards] Error:', error)
    
    // 🔧 エラー時もジョブステータスをfailedに更新
    if (job_id) {
      console.log(`🔧 [extract-cards] エラー発生 - ジョブステータスをfailedに更新: ${job_id}`);
      
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
        if (supabaseUrl && supabaseKey) {
          const supabase = createClient(supabaseUrl, supabaseKey)
          const { error: updateError } = await supabase
            .from('background_jobs')
            .update({
              status: 'failed',
              error_message: error.message,
              updated_at: new Date().toISOString(),
            })
            .eq('id', job_id);

          if (updateError) {
            console.warn(`🔧 [extract-cards] エラー時ジョブステータス更新エラー:`, updateError);
          } else {
            console.log(`🔧 [extract-cards] エラー時ジョブステータス更新完了: ${job_id} -> failed`);
            
            // 🔓 エラー時はロック解放をスキップ（自動期限切れに任せる）
            console.log(`🔓 [extract-cards] エラー時のためロック解放をスキップ（自動期限切れで解放）`);
          }
        }
      } catch (updateErr) {
        console.error(`🔧 [extract-cards] エラー時ジョブステータス更新で例外発生:`, updateErr);
      }
    }
    
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } finally {
    // 🧹 クリーンアップ処理（簡略化版）
    const currentCallCount = (globalThis as any).__edge_call_count || 1;
    
    console.log(`🚨🚨🚨 [extract-cards-from-meeting] Edge Function実行終了 #${currentCallCount} 🚨🚨🚨`, {
      timestamp: new Date().toISOString(),
      totalExecutions: currentCallCount,
      job_id: job_id
    });
  }
}) 