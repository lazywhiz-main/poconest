import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmbeddingRequest {
  text?: string;
  texts?: string[];
  provider?: 'openai' | 'gemini';
  nestId?: string;
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
      console.error('[ai-embeddings] Error fetching nest AI settings:', error);
      return getDefaultAISettings();
    }

    if (!data || data.length === 0) {
      console.log('[ai-embeddings] No AI settings found for nest, using defaults');
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
    console.error('[ai-embeddings] Error in getNestAISettings:', error);
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

async function generateOpenAIEmbeddings(texts: string[], apiKey: string, model: string = 'text-embedding-3-small') {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: model,
      input: texts,
      encoding_format: 'float',
    }),
  })

  if (!response.ok) {
    const errorData = await response.text()
    console.error('[ai-embeddings] OpenAI API error:', response.status, errorData)
    throw new Error(`OpenAI API error: ${response.status}`)
  }

  const data = await response.json()
  return data.data.map((item: any) => item.embedding)
}

async function generateGeminiEmbeddings(texts: string[], apiKey: string, model: string = 'gemini-embedding-exp-03-07') {
  const embeddings = []
  
  // Gemini API requires individual requests for each text
  for (const text of texts) {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: `models/${model}`,
        content: {
          parts: [{
            text: text
          }]
        },
        taskType: 'SEMANTIC_SIMILARITY'
      }),
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error('[ai-embeddings] Gemini API error:', response.status, errorData)
      throw new Error(`Gemini API error: ${response.status}`)
    }

    const data = await response.json()
    if (data.embedding && data.embedding.values) {
      embeddings.push(data.embedding.values)
    } else {
      throw new Error('Invalid Gemini API response format')
    }
  }
  
  return embeddings
}

// AI呼び出しとフォールバック処理
async function generateEmbeddingsWithFallback(texts: string[], settings: NestAISettings): Promise<{ embeddings: number[][], provider: string }> {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  const geminiApiKey = Deno.env.get('GEMINI_API_KEY');

  // プライマリプロバイダーで試行
  try {
    console.log(`[ai-embeddings] Trying primary provider: ${settings.primaryProvider}`);
    
    if (settings.primaryProvider === 'openai') {
      if (!openaiApiKey) {
        throw new Error('OpenAI API key not available');
      }
      const embeddings = await generateOpenAIEmbeddings(texts, openaiApiKey, settings.providerConfigs.openai.embeddingModel);
      return { embeddings, provider: 'openai' };
    } else {
      if (!geminiApiKey) {
        throw new Error('Gemini API key not available');
      }
      const embeddings = await generateGeminiEmbeddings(texts, geminiApiKey, settings.providerConfigs.gemini.embeddingModel);
      return { embeddings, provider: 'gemini' };
    }
  } catch (primaryError) {
    console.error(`[ai-embeddings] Primary provider (${settings.primaryProvider}) failed:`, primaryError);
    
    // フォールバックが有効な場合
    if (settings.enableFallback && settings.fallbackProviders.length > 0) {
      for (const fallbackProvider of settings.fallbackProviders) {
        try {
          console.log(`[ai-embeddings] Trying fallback provider: ${fallbackProvider}`);
          
          if (fallbackProvider === 'openai' && openaiApiKey) {
            const embeddings = await generateOpenAIEmbeddings(texts, openaiApiKey, settings.providerConfigs.openai.embeddingModel);
            return { embeddings, provider: 'openai (fallback)' };
          } else if (fallbackProvider === 'gemini' && geminiApiKey) {
            const embeddings = await generateGeminiEmbeddings(texts, geminiApiKey, settings.providerConfigs.gemini.embeddingModel);
            return { embeddings, provider: 'gemini (fallback)' };
          }
        } catch (fallbackError) {
          console.error(`[ai-embeddings] Fallback provider (${fallbackProvider}) failed:`, fallbackError);
          continue;
        }
      }
    }
    
    // すべて失敗した場合
    throw new Error(`All AI providers failed. Primary: ${primaryError.message}`);
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Parse request body
    const { text, texts, provider, nestId }: EmbeddingRequest = await req.json()
    
    // Support both single text and batch texts
    const inputTexts = texts || (text ? [text] : [])
    if (!inputTexts || inputTexts.length === 0 || inputTexts.some(t => !t)) {
      throw new Error('No text provided for embedding generation')
    }

    console.log(`[ai-embeddings] Processing ${inputTexts.length} texts with nestId: ${nestId}, provider: ${provider}`)

    // nest設定またはレガシーパラメータを使用
    let aiSettings: NestAISettings;
    let finalProvider = provider || 'openai';
    let usedProvider: string;
    let embeddings: number[][];

    if (nestId) {
      // nest_idが指定された場合は、nest設定を取得してプロバイダーを決定
      const supabaseUrl = Deno.env.get('SUPABASE_URL')
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
      
      if (supabaseUrl && supabaseKey) {
        const supabase = createClient(supabaseUrl, supabaseKey)
        aiSettings = await getNestAISettings(supabase, nestId);
        console.log(`[ai-embeddings] Using nest AI settings:`, {
          primaryProvider: aiSettings.primaryProvider,
          enableFallback: aiSettings.enableFallback
        });
        
        // nest設定ベースの呼び出し（フォールバック対応）
        const result = await generateEmbeddingsWithFallback(inputTexts, aiSettings);
        embeddings = result.embeddings;
        usedProvider = result.provider;
      } else {
        console.warn('[ai-embeddings] Supabase env vars not set, falling back to default settings');
        aiSettings = getDefaultAISettings();
        const result = await generateEmbeddingsWithFallback(inputTexts, aiSettings);
        embeddings = result.embeddings;
        usedProvider = result.provider;
      }
    } else {
      // 従来の方式（providerパラメータを使用）
      console.log(`[ai-embeddings] Using legacy provider parameter: ${finalProvider}`);
      
      if (finalProvider === 'gemini') {
        const geminiApiKey = Deno.env.get('GEMINI_API_KEY')
        if (!geminiApiKey) {
          throw new Error('Gemini API key not configured')
        }
        embeddings = await generateGeminiEmbeddings(inputTexts, geminiApiKey)
        usedProvider = 'gemini'
      } else {
        const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
        if (!openaiApiKey) {
          throw new Error('OpenAI API key not configured')
        }
        embeddings = await generateOpenAIEmbeddings(inputTexts, openaiApiKey)
        usedProvider = 'openai'
      }
    }

    console.log(`[ai-embeddings] Generated ${embeddings.length} embeddings using ${usedProvider}`)

    // Return embeddings
    return new Response(
      JSON.stringify({
        success: true,
        embeddings: texts ? embeddings : embeddings[0], // Return array if batch, single if not
        count: embeddings.length,
        provider: usedProvider,
        dimensions: embeddings[0]?.length || 0,
        nestId: nestId,
        usingNestSettings: !!nestId
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('[ai-embeddings] Error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
}) 