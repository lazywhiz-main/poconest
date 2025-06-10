import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

interface HealthCheckRequest {
  provider: 'openai' | 'gemini';
}

/**
 * OpenAIの簡単なヘルスチェック
 */
async function checkOpenAIHealth(): Promise<boolean> {
  if (!OPENAI_API_KEY) {
    console.log('[ai-health-check] OpenAI API key not configured');
    return false;
  }

  try {
    // OpenAI APIに軽量なリクエストを送信
    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    return response.ok;
  } catch (error) {
    console.error('[ai-health-check] OpenAI health check failed:', error);
    return false;
  }
}

/**
 * Geminiの簡単なヘルスチェック
 */
async function checkGeminiHealth(): Promise<boolean> {
  if (!GEMINI_API_KEY) {
    console.log('[ai-health-check] Gemini API key not configured');
    return false;
  }

  try {
    // Gemini APIに軽量なリクエストを送信（モデル一覧の取得）
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return response.ok;
  } catch (error) {
    console.error('[ai-health-check] Gemini health check failed:', error);
    return false;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { provider }: HealthCheckRequest = await req.json()
    
    console.log(`[ai-health-check] Checking health for provider: ${provider}`)

    let available = false;

    if (provider === 'openai') {
      available = await checkOpenAIHealth();
    } else if (provider === 'gemini') {
      available = await checkGeminiHealth();
    } else {
      throw new Error(`Unknown provider: ${provider}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        provider,
        available,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    console.error('[ai-health-check] Error:', error)
    return new Response(
      JSON.stringify({ 
        error: error && (error.stack || error.message || JSON.stringify(error) || String(error)),
        success: false,
        available: false
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
}) 