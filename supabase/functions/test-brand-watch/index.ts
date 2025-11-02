import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// Serper.dev APIを使ってブランドを検索する関数
async function searchBrandWithSerper(
  brandName: string,
  keywords: string[],
  serperApiKey: string
): Promise<any[]> {
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
    console.log(`[test-brand-watch] Searching with Serper: "${searchQuery}"`);

    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': serperApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: searchQuery,
        num: 10, // 最大10件の結果を取得
      }),
    });

    if (!response.ok) {
      console.error(`[test-brand-watch] Serper API error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    const results = data.organic || [];

    console.log(`[test-brand-watch] Found ${results.length} results from Serper`);

    // 結果を整形
    return results.map((item: any) => ({
      title: item.title,
      link: item.link,
      snippet: item.snippet,
      source: new URL(item.link).hostname,
      date: item.date || new Date().toISOString(),
    }));
  } catch (error) {
    console.error('[test-brand-watch] Error searching with Serper:', error);
    return [];
  }
}

// 公式サイトからRSSフィードを検出する関数
async function detectRSSFeed(officialUrl: string): Promise<string | null> {
  try {
    console.log(`[test-brand-watch] Detecting RSS feed from: ${officialUrl}`);
    
    const response = await fetch(officialUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TrendInsights/1.0)',
      },
    });
    
    if (!response.ok) {
      console.warn(`[test-brand-watch] Failed to fetch official site: ${response.status}`);
      return null;
    }
    
    const html = await response.text();
    
    // <link rel="alternate" type="application/rss+xml" href="...">
    const rssLinkMatch = html.match(/<link[^>]*rel=["']alternate["'][^>]*type=["']application\/rss\+xml["'][^>]*href=["']([^"']+)["']/i);
    if (rssLinkMatch && rssLinkMatch[1]) {
      const rssUrl = rssLinkMatch[1].startsWith('http') 
        ? rssLinkMatch[1] 
        : new URL(rssLinkMatch[1], officialUrl).href;
      console.log(`[test-brand-watch] Found RSS feed: ${rssUrl}`);
      return rssUrl;
    }
    
    // 一般的なRSSパスを試す
    const baseUrl = new URL(officialUrl).origin;
    const commonPaths = ['/feed', '/rss', '/feed.xml', '/rss.xml', '/blog/feed', '/news/feed'];
    
    for (const path of commonPaths) {
      const testUrl = `${baseUrl}${path}`;
      try {
        const testResponse = await fetch(testUrl, {
          method: 'HEAD',
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; TrendInsights/1.0)',
          },
        });
        
        if (testResponse.ok) {
          const contentType = testResponse.headers.get('content-type') || '';
          if (contentType.includes('xml') || contentType.includes('rss')) {
            console.log(`[test-brand-watch] Found RSS feed via common path: ${testUrl}`);
            return testUrl;
          }
        }
      } catch (e) {
        // Ignore errors for individual path tests
      }
    }
    
    return null;
  } catch (error) {
    console.error('[test-brand-watch] Error detecting RSS feed:', error);
    return null;
  }
}

serve(async (req) => {
  // CORSヘッダー
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    const { brand_name, official_url, keywords } = await req.json();

    if (!brand_name) {
      return new Response(
        JSON.stringify({ success: false, error: 'Brand name is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[test-brand-watch] Testing brand watch: ${brand_name}`);

    const serperApiKey = Deno.env.get('SERPER_API_KEY');
    if (!serperApiKey) {
      console.warn('[test-brand-watch] SERPER_API_KEY not set, skipping search preview');
    }

    let official_rss = null;

    // 公式サイトURLが提供されている場合、RSSを検出
    if (official_url) {
      official_rss = await detectRSSFeed(official_url);
    }

    // Serper.devで検索プレビューを取得
    let preview_items = [];
    if (serperApiKey) {
      const keywordList = keywords ? keywords.split(',').map((k: string) => k.trim()) : [];
      preview_items = await searchBrandWithSerper(brand_name, keywordList, serperApiKey);
    } else {
      // APIキーがない場合はダミーデータ
      preview_items = [
        {
          title: `${brand_name} announces new product line`,
          source: 'Design Media',
          date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          snippet: 'Preview data (Serper API key not configured)',
        },
      ];
    }

    console.log(`[test-brand-watch] Test completed for: ${brand_name}, found ${preview_items.length} items`);

    return new Response(
      JSON.stringify({
        success: true,
        official_rss,
        preview_items: preview_items.slice(0, 5), // 最初の5件のみ返す
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.error('[test-brand-watch] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});

