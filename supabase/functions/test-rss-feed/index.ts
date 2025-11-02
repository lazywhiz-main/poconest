import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

interface RSSItem {
  title: string;
  link: string;
  description: string;
  pubDate: string;
}

// RSSフィードをパースする関数（正規表現ベース）
function parseRSSFeed(xmlText: string): RSSItem[] {
  const items: RSSItem[] = [];
  
  // <item>...</item> を抽出
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  const itemMatches = xmlText.matchAll(itemRegex);
  
  for (const itemMatch of itemMatches) {
    const itemContent = itemMatch[1];
    
    const title = extractTag(itemContent, 'title');
    const link = extractTag(itemContent, 'link');
    const description = extractTag(itemContent, 'description');
    const pubDate = extractTag(itemContent, 'pubDate');
    
    if (title && link) {
      items.push({
        title: stripHTML(title),
        link: stripHTML(link),
        description: stripHTML(description),
        pubDate: pubDate || new Date().toISOString(),
      });
    }
  }
  
  return items;
}

// XMLタグから内容を抽出
function extractTag(xml: string, tagName: string): string {
  const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\/${tagName}>`, 'i');
  const match = xml.match(regex);
  return match ? match[1].trim() : '';
}

// HTMLタグとCDATAを除去
function stripHTML(text: string): string {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .trim();
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
    const { url } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[test-rss-feed] Testing RSS feed: ${url}`);

    // RSSフィードを取得
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TrendInsights/1.0)',
      },
    });

    if (!response.ok) {
      console.error(`[test-rss-feed] Failed to fetch RSS feed: ${response.status}`);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Failed to fetch RSS feed: ${response.status} ${response.statusText}`,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const xmlText = await response.text();
    const items = parseRSSFeed(xmlText);

    console.log(`[test-rss-feed] Successfully parsed ${items.length} items`);

    return new Response(
      JSON.stringify({
        success: true,
        items: items.slice(0, 10), // 最初の10件のみ返す
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
    console.error('[test-rss-feed] Error:', error);
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

