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

interface SearchResult {
  title: string;
  link: string;
  snippet: string;
  source: string;
  date: string;
}

// Serper.dev APIを使ってブランドを検索する関数
async function searchBrandWithSerper(
  brandName: string,
  keywords: string[],
  serperApiKey: string
): Promise<SearchResult[]> {
  try {
    // 具体的な製品発表を示すキーワードを追加
    const concreteKeywords = [
      'launch', 'release', 'unveil', 'debut',
      'prototype', 'concept', 'new product',
      'exhibition', 'showcase', 'collection'
    ];
    
    // 抽象的な記事を除外するキーワード
    const excludeKeywords = [
      '-opinion', '-interview', '-philosophy',
      '-strategy', '-trend', '-analysis'
    ];
    
    const searchQuery = `${brandName} ${keywords.join(' ')} (${concreteKeywords.join(' OR ')}) design product ${excludeKeywords.join(' ')}`;
    console.log(`[collect-trend-products] Searching with Serper: "${searchQuery}"`);

    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': serperApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: searchQuery,
        num: 20, // 最大20件の結果を取得
      }),
    });

    if (!response.ok) {
      console.error(`[collect-trend-products] Serper API error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    const results = data.organic || [];

    console.log(`[collect-trend-products] Found ${results.length} results from Serper for ${brandName}`);

    return results.map((item: any) => ({
      title: item.title,
      link: item.link,
      snippet: item.snippet || '',
      source: new URL(item.link).hostname,
      date: item.date || new Date().toISOString(),
    }));
  } catch (error) {
    console.error('[collect-trend-products] Error searching with Serper:', error);
    return [];
  }
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

// カテゴリー別のプレースホルダー画像URL
function getCategoryPlaceholder(category: string): string {
  const placeholders: Record<string, string> = {
    '家具': 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&h=300&fit=crop',
    '電子機器': 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400&h=300&fit=crop',
    'ファッション': 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=400&h=300&fit=crop',
    '照明': 'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?w=400&h=300&fit=crop',
    'インテリア': 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=400&h=300&fit=crop',
    'キッチン': 'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=400&h=300&fit=crop',
    'デフォルト': 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=400&h=300&fit=crop',
  };
  
  return placeholders[category] || placeholders['デフォルト'];
}

// AIで製品の具体性をチェックする関数
async function checkProductConcreteness(
  title: string,
  description: string,
  openaiApiKey: string
): Promise<{ is_concrete: boolean; reason: string }> {
  // Step 1: タイトルベースの除外パターン（まとめ記事、リスト記事を除外）
  const excludePatterns = [
    /top\s+\d+/i,                    // "Top 5", "Top 10"
    /best\s+\d+/i,                   // "Best 5", "Best 10"
    /\d+\s+(products|designs|items|things|ways)/i, // "5 products", "3 designs"
    /(roundup|round-up|collection|list|compilation)/i, // "roundup", "collection"
    /this\s+week/i,                  // "This week's..."
    /\d+\s+(new|latest|recent)/i,    // "5 new products"
    /(picks|highlights|favorites|favourites)/i, // "Our picks", "Highlights"
    /emerging\s+trends/i,            // "Emerging trends"
    /guide\s+to/i,                   // "Guide to..."
    /how\s+to/i,                     // "How to..."
    /\d+\s+unexpected/i,             // "Five unexpected themes"
    /\d+\s+designers?\s+(using|at|in)/i, // "Eleven designers using..."
  ];
  
  for (const pattern of excludePatterns) {
    if (pattern.test(title)) {
      return {
        is_concrete: false,
        reason: `まとめ記事またはリスト記事のため除外: "${title.match(pattern)?.[0]}"`
      };
    }
  }
  
  const prompt = `以下の記事タイトルと説明を読んで、「単一の具体的な製品・デザイン作品」について書かれているかを厳格に判定してください。

タイトル: ${title}
説明: ${description}

判定基準:
✅ 単一の具体的な製品の発表、展示、販売（例: "Nendo unveils minimalist chair"）
✅ 単一のプロトタイプやコンセプトの公開
✅ 単一のデザイン作品の完成・展示
✅ 特定の建築物やインスタレーションの完成

❌ 複数製品のまとめ記事（例: "Top 5 chairs", "3 new releases"）
❌ リスト形式の記事（例: "Five designers using...", "Ten projects at..."）
❌ 哲学的な議論、インタビュー記事のみ
❌ 企業の戦略や意見記事
❌ 抽象的なトレンド分析
❌ 人物紹介やキャリア記事
❌ イベントレポートで複数作品を紹介するもの
❌ 週次・月次のまとめ記事

**重要**: 複数の製品やデザイナーが言及されている場合は、必ず false を返してください。

JSON形式で返答してください:
{
  "is_concrete": true/false,
  "reason": "判定理由を一言で（日本語）"
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
            content: 'あなたはデザイン製品の具体性を判定する専門家です。JSON形式で正確に返答してください。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      console.error('[collect-trend-products] OpenAI API Error (concreteness check):', await response.text());
      return { is_concrete: true, reason: 'API error, defaulting to true' }; // エラー時はスルー
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    const parsed = JSON.parse(content);
    
    console.log(`[collect-trend-products] Concreteness check: ${parsed.is_concrete ? '✅' : '❌'} - ${parsed.reason}`);
    
    return {
      is_concrete: parsed.is_concrete,
      reason: parsed.reason
    };
  } catch (error) {
    console.error('[collect-trend-products] Error checking concreteness:', error);
    return { is_concrete: true, reason: 'Error, defaulting to true' }; // エラー時はスルー
  }
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
  "title_ja": "タイトルを自然な日本語に翻訳（製品名や固有名詞は適切に残す）",
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

    const { nest_id } = await req.json();
    
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

    // nest_idの収集設定を取得
    console.log(`[collect-trend-products] Fetching settings for nest_id: ${nest_id}`);
    const { data: settings, error: settingsError } = await supabase
      .from('trend_collection_settings')
      .select('*')
      .eq('nest_id', nest_id)
      .single();

    if (settingsError) {
      console.error('[collect-trend-products] Error fetching settings:', settingsError);
      console.warn('[collect-trend-products] Using default RSS_SOURCES');
    } else if (!settings) {
      console.warn('[collect-trend-products] No settings found, using default Dezeen feed');
    } else {
      console.log(`[collect-trend-products] Settings found:`, JSON.stringify(settings, null, 2));
    }

    // 有効なRSSフィードを取得
    const rssFeeds = settings?.rss_feeds || [];
    console.log(`[collect-trend-products] RSS feeds from settings: ${rssFeeds.length} total`);
    
    const enabledFeeds = rssFeeds.filter((feed: any) => feed.enabled);
    console.log(`[collect-trend-products] Enabled feeds: ${enabledFeeds.length}`);
    if (enabledFeeds.length > 0) {
      console.log(`[collect-trend-products] Enabled feed names:`, enabledFeeds.map((f: any) => f.name).join(', '));
    }

    // 有効なフィードがない場合はRSS収集をスキップ
    const targetSources = enabledFeeds.length > 0
      ? enabledFeeds.map((feed: any) => ({
          name: feed.name,
          url: feed.url,
          category: feed.category || 'design',
        }))
      : [];

    if (targetSources.length === 0) {
      console.log(`[collect-trend-products] No enabled RSS feeds found. Skipping RSS collection.`);
    } else {
      console.log(`[collect-trend-products] Processing ${targetSources.length} RSS sources:`, targetSources.map(s => s.name).join(', '));
    }

    // 重複検出設定
    const duplicateDetection = settings?.duplicate_detection || {
      enabled: true,
      url_check: true,
      title_similarity_threshold: 0.85,
    };

    // 最小スコア閾値
    const minScoreThreshold = settings?.min_score_threshold || 20;

    let totalProcessed = 0;
    let totalInserted = 0;
    let totalSkipped = 0;
    const MAX_ITEMS_PER_SOURCE = 10; // 1ソースあたり最大10件まで処理

    // 各RSSソースから製品を収集
    for (const source of targetSources) {
      console.log(`[collect-trend-products] Processing source: ${source.name}`);
      
      const items = await parseRSSFeed(source.url);
      console.log(`[collect-trend-products] Found ${items.length} items from ${source.name}, processing first ${MAX_ITEMS_PER_SOURCE}`);
      
      // 最初のN件のみ処理してタイムアウトを防ぐ
      const itemsToProcess = items.slice(0, MAX_ITEMS_PER_SOURCE);
      
      for (const item of itemsToProcess) {
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

        console.log(`[collect-trend-products] New product found, checking concreteness...`);

        // Step 1: AIで製品の具体性をチェック
        const concreteCheck = await checkProductConcreteness(item.title, item.description, openaiApiKey);
        
        if (!concreteCheck.is_concrete) {
          console.log(`[collect-trend-products] ❌ Skipping non-concrete item: ${item.title} (${concreteCheck.reason})`);
          totalSkipped++;
          continue;
        }

        console.log(`[collect-trend-products] ✅ Concrete product confirmed, scoring with AI...`);

        // Step 2: AIでスコアリング
        const scores = await scoreProduct(item, openaiApiKey);
        
        if (!scores) {
          console.warn(`[collect-trend-products] Failed to score product: ${item.title}`);
          totalSkipped++;
          continue;
        }

        console.log(`[collect-trend-products] Scored product: ${item.title} - Total: ${scores.score_concept_shift + scores.score_category_disruption + scores.score_philosophical_pricing + scores.score_experience_change}`);

        // 総合スコアを計算
        const totalScore = scores.score_concept_shift + scores.score_category_disruption + scores.score_philosophical_pricing + scores.score_experience_change;

        // 最小スコア閾値チェック
        if (totalScore < minScoreThreshold) {
          console.log(`[collect-trend-products] Skipping low score product (${totalScore} < ${minScoreThreshold}): ${item.title}`);
          totalSkipped++;
          continue;
        }

        // サムネイル画像を取得
        console.log(`[collect-trend-products] Fetching thumbnail for: ${item.title}`);
        let thumbnailUrl = await getOGImage(item.link);
        
        if (!thumbnailUrl) {
          // OG画像が取得できない場合、カテゴリー別プレースホルダーを使用
          thumbnailUrl = getCategoryPlaceholder(scores.category || 'デフォルト');
          console.log(`[collect-trend-products] Using placeholder image for category: ${scores.category}`);
        }

        // データベースに保存
        const { error: insertError } = await supabase
          .from('trend_products')
          .insert({
            nest_id: nest_id,
            title_original: item.title,
            title_ja: scores.title_ja || item.title,
            url: item.link,
            summary_ja: scores.summary_ja,
            score_concept_shift: scores.score_concept_shift,
            score_category_disruption: scores.score_category_disruption,
            score_philosophical_pricing: scores.score_philosophical_pricing,
            score_experience_change: scores.score_experience_change,
            category: scores.category,
            brand_designer: scores.brand_designer,
            status: '新着',
            reason_text: scores.reason_text,
            discovered_at: item.pubDate && !isNaN(new Date(item.pubDate).getTime()) 
              ? new Date(item.pubDate).toISOString() 
              : new Date().toISOString(),
            thumbnail_url: thumbnailUrl,
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

    console.log(`[collect-trend-products] RSS collection completed. Starting brand watch processing...`);
    
    // ブランドウォッチの処理
    const brandWatches = settings?.brand_watches || [];
    console.log(`[collect-trend-products] Total brand watches in settings: ${brandWatches.length}`);
    console.log(`[collect-trend-products] Brand watches data:`, JSON.stringify(brandWatches, null, 2));
    
    const enabledBrands = brandWatches.filter((brand: any) => brand.enabled);
    console.log(`[collect-trend-products] Enabled brand watches: ${enabledBrands.length}`);
    
    console.log(`[collect-trend-products] Processing ${enabledBrands.length} brand watches`);

    const serperApiKey = Deno.env.get('SERPER_API_KEY');
    
    const MAX_BRAND_RESULTS = 5; // 1ブランドあたり最大5件まで処理
    
    if (enabledBrands.length > 0 && serperApiKey) {
      for (const brand of enabledBrands) {
        console.log(`[collect-trend-products] Searching for brand: ${brand.name}`);
        
        const searchResults = await searchBrandWithSerper(
          brand.name,
          brand.keywords || [],
          serperApiKey
        );
        
        console.log(`[collect-trend-products] Found ${searchResults.length} results for ${brand.name}, processing first ${MAX_BRAND_RESULTS}`);
        const resultsToProcess = searchResults.slice(0, MAX_BRAND_RESULTS);

        for (const result of resultsToProcess) {
          totalProcessed++;
          
          console.log(`[collect-trend-products] Processing brand search result ${totalProcessed}: ${result.title.substring(0, 50)}...`);

          // 既に存在する製品かチェック
          const { data: existing } = await supabase
            .from('trend_products')
            .select('id')
            .eq('nest_id', nest_id)
            .eq('url', result.link)
            .maybeSingle();

          if (existing) {
            console.log(`[collect-trend-products] Skipping existing product from brand search: ${result.title}`);
            totalSkipped++;
            continue;
          }

          // Step 1: AIで製品の具体性をチェック
          const concreteCheck = await checkProductConcreteness(result.title, result.snippet, openaiApiKey);
          
          if (!concreteCheck.is_concrete) {
            console.log(`[collect-trend-products] ❌ Skipping non-concrete brand result: ${result.title} (${concreteCheck.reason})`);
            totalSkipped++;
            continue;
          }

          console.log(`[collect-trend-products] ✅ Concrete brand product confirmed, scoring...`);

          // 検索結果をRSSItem形式に変換してスコアリング
          const searchItem = {
            title: result.title,
            link: result.link,
            description: result.snippet,
            pubDate: result.date,
            category: brand.category,
            creator: brand.name,
          };

          // Step 2: AIでスコアリング
          const scores = await scoreProduct(searchItem, openaiApiKey);
          
          if (!scores) {
            console.warn(`[collect-trend-products] Failed to score brand search result: ${result.title}`);
            totalSkipped++;
            continue;
          }

          const totalScore = scores.score_concept_shift + scores.score_category_disruption + scores.score_philosophical_pricing + scores.score_experience_change;

          if (totalScore < minScoreThreshold) {
            console.log(`[collect-trend-products] Skipping low score brand result (${totalScore} < ${minScoreThreshold}): ${result.title}`);
            totalSkipped++;
            continue;
          }

          // サムネイル画像を取得
          let thumbnailUrl = await getOGImage(result.link);
          if (!thumbnailUrl) {
            thumbnailUrl = getCategoryPlaceholder(scores.category || 'デフォルト');
          }

          // データベースに保存
          const { error: insertError } = await supabase
            .from('trend_products')
            .insert({
              nest_id: nest_id,
              title_original: result.title,
              title_ja: scores.title_ja || result.title,
              url: result.link,
              summary_ja: scores.summary_ja,
              score_concept_shift: scores.score_concept_shift,
              score_category_disruption: scores.score_category_disruption,
              score_philosophical_pricing: scores.score_philosophical_pricing,
              score_experience_change: scores.score_experience_change,
              category: scores.category,
              brand_designer: brand.name,
              status: '新着',
              reason_text: scores.reason_text,
              discovered_at: result.date && !isNaN(new Date(result.date).getTime()) 
                ? new Date(result.date).toISOString() 
                : new Date().toISOString(),
              thumbnail_url: thumbnailUrl,
            });

          if (insertError) {
            console.error(`[collect-trend-products] Error inserting brand product:`, insertError);
            totalSkipped++;
          } else {
            console.log(`[collect-trend-products] ✅ Successfully inserted brand product: ${result.title}`);
            totalInserted++;
          }

          // API レート制限を考慮して待機
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
      }
    } else if (enabledBrands.length > 0 && !serperApiKey) {
      console.warn('[collect-trend-products] Brand watches configured but SERPER_API_KEY not set');
    }

    console.log(`[collect-trend-products] Collection complete - Processed: ${totalProcessed}, Inserted: ${totalInserted}, Skipped: ${totalSkipped}`);

    return new Response(
      JSON.stringify({
        success: true,
        stats: {
          processed: totalProcessed,
          inserted: totalInserted,
          skipped: totalSkipped,
          sources: targetSources.map(s => s.name),
          brands: enabledBrands.map((b: any) => b.name)
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

