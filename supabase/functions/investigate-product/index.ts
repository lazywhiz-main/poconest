import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface InvestigationRequest {
  product_id: string;
  level: 1 | 2 | 3;
  product_data: {
    title: string;
    url: string;
    summary: string;
    category: string;
    brand_designer: string;
    scores: {
      concept_shift: number;
      category_disruption: number;
      philosophical_pricing: number;
      experience_change: number;
    };
  };
}

// Level 1: 基本情報調査
function getLevel1Prompt(productData: any): string {
  return `あなたはデザイン製品のトレンド分析の専門家です。以下の製品について、Level 1（基本情報）の調査を実施してください。

製品情報:
- タイトル: ${productData.title}
- カテゴリー: ${productData.category}
- ブランド/デザイナー: ${productData.brand_designer}
- 要約: ${productData.summary}

以下の項目について、簡潔に（各項目200文字程度）調査・分析してください：

## Level 1 調査項目

### 1. 製品の基本コンセプト
- この製品の核となるアイデアは何か
- どのような問題を解決しようとしているか

### 2. ターゲットユーザー
- 誰のための製品か
- どのような生活シーンで使われるか

### 3. 類似製品との差異
- 既存の類似製品と比べて何が違うか
- 新しい提案は何か

### 4. 注目ポイント
- デザイン的に特筆すべき点
- 機能面で革新的な点

マークダウン形式で出力してください。`;
}

// Level 2: 文脈と背景調査
function getLevel2Prompt(productData: any, level1Result: string): string {
  return `あなたはデザイン製品のトレンド分析の専門家です。以下の製品について、Level 2（文脈と背景）の深掘り調査を実施してください。

製品情報:
- タイトル: ${productData.title}
- カテゴリー: ${productData.category}
- ブランド/デザイナー: ${productData.brand_designer}

Level 1 調査結果:
${level1Result}

以下の項目について、詳細に（各項目300文字程度）調査・分析してください：

## Level 2 調査項目

### 1. 市場文脈
- この製品が登場した背景（社会的・文化的文脈）
- 現在のトレンドとの関係性
- なぜ今この製品が注目されるのか

### 2. デザイン哲学
- デザイナー/ブランドの思想や価値観
- 過去の作品との連続性
- デザイン手法の特徴

### 3. 技術・素材
- 使用されている技術や素材の革新性
- 製造プロセスの特徴
- サステナビリティへの配慮

### 4. ビジネスモデル
- 価格設定の戦略
- 販売・流通の方法
- 収益化のアプローチ

マークダウン形式で出力してください。`;
}

// Level 3: 深層分析
function getLevel3Prompt(productData: any, level1Result: string, level2Result: string): string {
  return `あなたはデザイン製品のトレンド分析の専門家です。以下の製品について、Level 3（深層分析）の包括的な調査を実施してください。

製品情報:
- タイトル: ${productData.title}
- カテゴリー: ${productData.category}
- ブランド/デザイナー: ${productData.brand_designer}
- スコア: コンセプトシフト ${productData.scores.concept_shift}/10, カテゴリー破壊 ${productData.scores.category_disruption}/10

これまでの調査結果:

<Level 1>
${level1Result}
</Level 1>

<Level 2>
${level2Result}
</Level 2>

以下の項目について、深く掘り下げて分析してください（各項目400文字程度）：

## Level 3 深層分析

### 1. パラダイムシフトの可能性
- この製品がもたらす可能性のある認識の変化
- 長期的な影響（5-10年後の視点）
- 業界や社会への波及効果

### 2. 文化的意義
- デザイン史における位置づけ
- 価値観の転換を示唆する要素
- 他の領域（アート、建築、テクノロジー）との関連性

### 3. 実用性と象徴性のバランス
- 実用品としての完成度
- 象徴的・概念的な意味合い
- 両者の調和または意図的な偏り

### 4. 今後の展開予測
- この製品が生み出す新しいカテゴリー
- フォロワー製品の可能性
- 市場への影響と普及シナリオ

### 5. トレンドインサイトへの示唆
- このプロジェクトにとっての学び
- 応用可能なデザインアプローチ
- 注目すべき類似の動き

マークダウン形式で、詳細かつ洞察に富んだ分析を出力してください。`;
}

async function callOpenAI(prompt: string, apiKey: string): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'あなたはデザイン製品のトレンド分析の専門家です。詳細かつ洞察に富んだ分析を提供してください。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error('[investigate-product] OpenAI API Error:', errorData);
    throw new Error(`OpenAI API Error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('[investigate-product] Starting investigation');

    const { product_id, level, product_data }: InvestigationRequest = await req.json();
    
    if (!product_id || !level || !product_data) {
      throw new Error('product_id, level, and product_data are required');
    }

    if (![1, 2, 3].includes(level)) {
      throw new Error('level must be 1, 2, or 3');
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase environment variables are not set');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const startTime = Date.now();

    // 既存の調査結果を取得（Level 2, 3の場合）
    let level1Result = '';
    let level2Result = '';

    if (level >= 2) {
      const { data: level1Data } = await supabase
        .from('trend_investigations')
        .select('result_text')
        .eq('product_id', product_id)
        .eq('level', 1)
        .single();
      
      level1Result = level1Data?.result_text || '';
    }

    if (level === 3) {
      const { data: level2Data } = await supabase
        .from('trend_investigations')
        .select('result_text')
        .eq('product_id', product_id)
        .eq('level', 2)
        .single();
      
      level2Result = level2Data?.result_text || '';
    }

    // プロンプト生成
    let prompt = '';
    switch (level) {
      case 1:
        prompt = getLevel1Prompt(product_data);
        break;
      case 2:
        prompt = getLevel2Prompt(product_data, level1Result);
        break;
      case 3:
        prompt = getLevel3Prompt(product_data, level1Result, level2Result);
        break;
    }

    console.log(`[investigate-product] Executing Level ${level} investigation for product: ${product_data.title}`);

    // AI調査実行
    const result = await callOpenAI(prompt, openaiApiKey);
    const duration = Math.floor((Date.now() - startTime) / 1000);

    // 調査結果を保存
    const { error: insertError } = await supabase
      .from('trend_investigations')
      .upsert({
        product_id: product_id,
        level: level,
        result_text: result,
        duration_seconds: duration,
      }, {
        onConflict: 'product_id,level'
      });

    if (insertError) {
      console.error(`[investigate-product] Error saving investigation:`, insertError);
      throw insertError;
    }

    // 製品のステータスを更新
    const newStatus = `調査中(L${level})`;
    const { error: updateError } = await supabase
      .from('trend_products')
      .update({ status: newStatus })
      .eq('id', product_id);

    if (updateError) {
      console.error(`[investigate-product] Error updating product status:`, updateError);
    }

    console.log(`[investigate-product] Investigation Level ${level} complete in ${duration}s`);

    return new Response(
      JSON.stringify({
        success: true,
        level: level,
        result: result,
        duration_seconds: duration,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[investigate-product] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

