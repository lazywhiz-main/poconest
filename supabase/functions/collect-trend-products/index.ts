import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RSSSource {
  name: string;
  url: string;
  category: string;
}

// デザインメディアのRSSソース
const RSS_SOURCES: RSSSource[] = [
  {
    name: 'Dezeen',
    url: 'https://www.dezeen.com/design/feed/',
    category: 'design'
  },
  {
    name: 'Yanko Design',
    url: 'https://www.yankodesign.com/feed/',
    category: 'product-design'
  }
];

interface RSSItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
  category?: string;
  creator?: string;
}

// RSSフィードをパースする関数（正規表現ベース）
async function parseRSSFeed(url: string): Promise<RSSItem[]> {
  try {
    console.log(`[collect-trend-products] Fetching RSS from: ${url}`);
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TrendInsights/1.0)',
      },
    });
    
    if (!response.ok) {
      console.error(`[collect-trend-products] HTTP error: ${response.status} ${response.statusText}`);
      return [];
    }
    
    const xmlText = await response.text();
    console.log(`[collect-trend-products] Received ${xmlText.length} bytes of XML`);
    
    // 正規表現で<item>要素を抽出
    const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
    const items = [...xmlText.matchAll(itemRegex)];
    console.log(`[collect-trend-products] Found ${items.length} items in XML`);
    
    const parsedItems: RSSItem[] = [];

    for (const itemMatch of items) {
      try {
        const itemContent = itemMatch[1];
        
        // 各フィールドを抽出
        const title = extractTag(itemContent, 'title');
        const link = extractTag(itemContent, 'link');
        const description = extractTag(itemContent, 'description');
        const pubDate = extractTag(itemContent, 'pubDate');
        const category = extractTag(itemContent, 'category');
        const creator = extractTag(itemContent, 'dc:creator') || extractTag(itemContent, 'creator');

        if (title && link) {
          parsedItems.push({
            title: stripHTML(title),
            link: link.trim(),
            description: stripHTML(description),
            pubDate: pubDate.trim(),
            category: stripHTML(category),
            creator: stripHTML(creator),
          });
        }
      } catch (itemError) {
        console.error('[collect-trend-products] Error parsing item:', itemError);
        continue;
      }
    }

    console.log(`[collect-trend-products] Successfully parsed ${parsedItems.length} items from ${url}`);
    return parsedItems;
  } catch (error) {
    console.error(`[collect-trend-products] Error parsing RSS feed ${url}:`, error);
    return [];
  }
}

// XMLタグから内容を抽出する関数
function extractTag(xml: string, tagName: string): string {
  const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i');
  const match = xml.match(regex);
  return match ? match[1] : '';
}

// HTMLタグとCDATAを除去する関数
function stripHTML(html: string): string {
  if (!html) return '';
  
  // CDATA除去
  let text = html.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
  
  // HTMLタグ除去
  text = text.replace(/<[^>]*>/g, '');
  
  // HTMLエンティティのデコード
  text = text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#8217;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&#8211;/g, '–')
    .replace(/&#8212;/g, '—');
  
  return text.trim();
}

// Open Graph画像を取得する関数
async function getOGImage(url: string): Promise<string | null> {
  try {
    console.log(`[collect-trend-products] Fetching OG image from: ${url}`);
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TrendInsights/1.0)',
      },
    });
    
    if (!response.ok) {
      console.warn(`[collect-trend-products] Failed to fetch page for OG image: ${response.status}`);
      return null;
    }
    
    const html = await response.text();
    
    // og:imageを抽出
    const ogImageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
    if (ogImageMatch && ogImageMatch[1]) {
      console.log(`[collect-trend-products] Found OG image: ${ogImageMatch[1]}`);
      return ogImageMatch[1];
    }
    
    // twitter:imageも試す
    const twitterImageMatch = html.match(/<meta\s+name=["']twitter:image["']\s+content=["']([^"']+)["']/i);
    if (twitterImageMatch && twitterImageMatch[1]) {
      console.log(`[collect-trend-products] Found Twitter image: ${twitterImageMatch[1]}`);
      return twitterImageMatch[1];
    }
    
    console.log(`[collect-trend-products] No OG image found for ${url}`);
    return null;
  } catch (error) {
    console.error(`[collect-trend-products] Error fetching OG image:`, error);
    return null;
  }
}

// カテゴリー別プレースホルダー画像を取得
function getCategoryPlaceholder(category: string | null): string {
  const categoryLower = (category || '').toLowerCase();
  
  // カテゴリーに応じたプレースホルダーを返す
  // 今回はシンプルなカラーパターンで実装（後で実画像に置き換え可能）
  const placeholders: Record<string, string> = {
    'furniture': 'https://via.placeholder.com/400x300/333366/00ff88?text=Furniture',
    '家具': 'https://via.placeholder.com/400x300/333366/00ff88?text=Furniture',
    'lighting': 'https://via.placeholder.com/400x300/45475a/ffd93d?text=Lighting',
    '照明': 'https://via.placeholder.com/400x300/45475a/ffd93d?text=Lighting',
    'fashion': 'https://via.placeholder.com/400x300/9c27b0/ffffff?text=Fashion',
    'ファッション': 'https://via.placeholder.com/400x300/9c27b0/ffffff?text=Fashion',
    'electronics': 'https://via.placeholder.com/400x300/64b5f6/0f0f23?text=Electronics',
    '電子機器': 'https://via.placeholder.com/400x300/64b5f6/0f0f23?text=Electronics',
    'architecture': 'https://via.placeholder.com/400x300/ffa500/0f0f23?text=Architecture',
    '建築': 'https://via.placeholder.com/400x300/ffa500/0f0f23?text=Architecture',
  };
  
  // カテゴリーに一致するプレースホルダーを探す
  for (const [key, value] of Object.entries(placeholders)) {
    if (categoryLower.includes(key)) {
      return value;
    }
  }
  
  // デフォルトプレースホルダー
  return 'https://via.placeholder.com/400x300/1a1a2e/a6adc8?text=Design+Product';
}

// AIでスコアリングとメタデータ抽出
async function scoreProduct(item: RSSItem, openaiApiKey: string): Promise<any> {
  const prompt = `あなたはデザイン製品のトレンド分析の専門家です。以下の製品情報を分析し、JSON形式で評価してください。

製品情報:
タイトル: ${item.title}
説明: ${item.description}
カテゴリー: ${item.category}
デザイナー/ブランド: ${item.creator}

以下の4つの観点で0-10点満点で評価し、該当理由も簡潔に説明してください：

1. **コンセプトシフト** (score_concept_shift): 既存の製品概念をどれだけ変革しているか
2. **カテゴリー破壊** (score_category_disruption): 既存のカテゴリーをどれだけ超えているか
3. **哲学的価格設定** (score_philosophical_pricing): 価格設定に新しい価値観が反映されているか
4. **体験変化** (score_experience_change): ユーザー体験をどれだけ変えるか

出力形式（必ずこのJSON形式で返してください）:
{
  "score_concept_shift": 0-10の数値,
  "score_category_disruption": 0-10の数値,
  "score_philosophical_pricing": 0-10の数値,
  "score_experience_change": 0-10の数値,
  "reason_text": "評価の理由を100文字程度で簡潔に",
  "summary_ja": "製品の要約を150文字程度で",
  "category": "製品のカテゴリー（例: 家具, 電子機器, ファッション）",
  "brand_designer": "ブランド名またはデザイナー名"
}`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'あなたはデザイン製品のトレンド分析の専門家です。JSON形式で正確に返答してください。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('[collect-trend-products] OpenAI API Error:', errorData);
      return null;
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    const parsed = JSON.parse(content);
    
    console.log(`[collect-trend-products] Scored: ${item.title} - Total: ${
      parsed.score_concept_shift + 
      parsed.score_category_disruption + 
      parsed.score_philosophical_pricing + 
      parsed.score_experience_change
    }`);
    
    return parsed;
  } catch (error) {
    console.error('[collect-trend-products] Error scoring product:', error);
    return null;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('[collect-trend-products] Starting RSS collection');

    const { nest_id, source_names } = await req.json();
    
    if (!nest_id) {
      throw new Error('nest_id is required');
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

    // フィルター対象のRSSソースを決定
    const targetSources = source_names && source_names.length > 0
      ? RSS_SOURCES.filter(s => source_names.includes(s.name))
      : RSS_SOURCES;

    console.log(`[collect-trend-products] Processing ${targetSources.length} RSS sources`);

    let totalProcessed = 0;
    let totalInserted = 0;
    let totalSkipped = 0;

    // 各RSSソースから製品を収集
    for (const source of targetSources) {
      console.log(`[collect-trend-products] Processing source: ${source.name}`);
      
      const items = await parseRSSFeed(source.url);
      
      for (const item of items) {
        totalProcessed++;
        
        console.log(`[collect-trend-products] Processing item ${totalProcessed}: ${item.title.substring(0, 50)}...`);

        // 既に存在する製品かチェック
        const { data: existing, error: checkError } = await supabase
          .from('trend_products')
          .select('id')
          .eq('nest_id', nest_id)
          .eq('url', item.link)
          .maybeSingle();

        if (checkError) {
          console.error(`[collect-trend-products] Error checking existing product:`, checkError);
        }

        if (existing) {
          console.log(`[collect-trend-products] Skipping existing product: ${item.title}`);
          totalSkipped++;
          continue;
        }

        console.log(`[collect-trend-products] New product found, scoring with AI...`);

        // AIでスコアリング
        const scores = await scoreProduct(item, openaiApiKey);
        
        if (!scores) {
          console.warn(`[collect-trend-products] Failed to score product: ${item.title}`);
          totalSkipped++;
          continue;
        }

        console.log(`[collect-trend-products] Scored product: ${item.title} - Total: ${scores.score_concept_shift + scores.score_category_disruption + scores.score_philosophical_pricing + scores.score_experience_change}`);

        // データベースに保存
        const { error: insertError } = await supabase
          .from('trend_products')
          .insert({
            nest_id: nest_id,
            title_original: item.title,
            title_ja: item.title, // TODO: 翻訳APIを使う場合はここで実装
            url: item.link,
            summary_ja: scores.summary_ja,
            score_concept_shift: scores.score_concept_shift,
            score_category_disruption: scores.score_category_disruption,
            score_philosophical_pricing: scores.score_philosophical_pricing,
            score_experience_change: scores.score_experience_change,
            category: scores.category,
            brand_designer: scores.brand_designer,
            status: 'New',
            reason_text: scores.reason_text,
            discovered_at: new Date(item.pubDate || Date.now()).toISOString(),
            // thumbnail_url: thumbnailUrl, // 後で追加
          });

        if (insertError) {
          console.error(`[collect-trend-products] Error inserting product:`, insertError);
          totalSkipped++;
        } else {
          console.log(`[collect-trend-products] ✅ Successfully inserted product: ${item.title}`);
          totalInserted++;
        }

        // API レート制限を考慮して少し待機
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`[collect-trend-products] Collection complete - Processed: ${totalProcessed}, Inserted: ${totalInserted}, Skipped: ${totalSkipped}`);

    return new Response(
      JSON.stringify({
        success: true,
        stats: {
          processed: totalProcessed,
          inserted: totalInserted,
          skipped: totalSkipped,
          sources: targetSources.map(s => s.name)
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[collect-trend-products] Error:', error);
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

