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
  userId?: string;
  featureType?: 'embedding' | 'relationship_analysis';
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
    const primaryProvider = settings.primary_provider || 'openai';
    
    // Set intelligent fallback: if primary is Gemini, fallback to OpenAI and vice versa
    let fallbackProviders = aiSettings.fallbackProviders;
    if (!fallbackProviders || fallbackProviders.length === 0) {
      fallbackProviders = primaryProvider === 'gemini' ? ['openai'] : ['gemini'];
    }

    return {
      primaryProvider,
      enableFallback: aiSettings.enableFallback !== false,
      fallbackProviders,
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

// Retry utility function for handling rate limits
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error = new Error('Unknown error');
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Check if it's a rate limit error (429)
      if (error.message.includes('429') || error.message.includes('Resource has been exhausted')) {
        const delay = baseDelay * Math.pow(2, attempt); // Exponential backoff
        console.log(`[ai-embeddings] Rate limit hit, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
        
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }
      
      // For non-rate-limit errors, fail immediately
      throw error;
    }
  }
  
  throw lastError;
}

async function generateOpenAIEmbeddings(texts: string[], apiKey: string, model: string = 'text-embedding-3-small') {
  return await retryWithBackoff(async () => {
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
  });
}

async function generateGeminiEmbeddings(texts: string[], apiKey: string, model: string = 'gemini-embedding-exp-03-07') {
  return await retryWithBackoff(async () => {
    const embeddings = []
    
    // Gemini API requires individual requests for each text
    for (const text of texts) {
      // Add small delay between requests to avoid hitting rate limits too quickly
      if (embeddings.length > 0) {
        await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay between requests
      }
      
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
  });
}

// AI呼び出しとフォールバック処理
async function generateEmbeddingsWithFallback(texts: string[], settings: NestAISettings): Promise<{ embeddings: number[][], provider: string }> {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  const geminiApiKey = Deno.env.get('GEMINI_API_KEY');

  console.log(`[ai-embeddings] Current AI settings:`, {
    primaryProvider: settings.primaryProvider,
    enableFallback: settings.enableFallback,
    fallbackProviders: settings.fallbackProviders,
    openaiKeyAvailable: !!openaiApiKey,
    geminiKeyAvailable: !!geminiApiKey
  });

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
      console.log(`[ai-embeddings] Fallback enabled, trying providers:`, settings.fallbackProviders);
      
      for (const fallbackProvider of settings.fallbackProviders) {
        try {
          console.log(`[ai-embeddings] Trying fallback provider: ${fallbackProvider}`);
          
          if (fallbackProvider === 'openai' && openaiApiKey) {
            console.log(`[ai-embeddings] Using OpenAI as fallback`);
            const embeddings = await generateOpenAIEmbeddings(texts, openaiApiKey, settings.providerConfigs.openai.embeddingModel);
            return { embeddings, provider: 'openai (fallback)' };
          } else if (fallbackProvider === 'gemini' && geminiApiKey) {
            console.log(`[ai-embeddings] Using Gemini as fallback`);
            const embeddings = await generateGeminiEmbeddings(texts, geminiApiKey, settings.providerConfigs.gemini.embeddingModel);
            return { embeddings, provider: 'gemini (fallback)' };
          } else {
            console.log(`[ai-embeddings] Skipping fallback provider ${fallbackProvider}: API key not available`);
          }
        } catch (fallbackError) {
          console.error(`[ai-embeddings] Fallback provider (${fallbackProvider}) failed:`, fallbackError);
          continue;
        }
      }
    } else {
      console.log(`[ai-embeddings] Fallback disabled or no fallback providers configured`);
    }
    
    // すべて失敗した場合
    throw new Error(`All AI providers failed. Primary: ${primaryError.message}`);
  }
}

// AI使用ログを記録するヘルパー関数
async function logAIUsage(
  supabase: any,
  featureType: string,
  provider: string,
  model: string,
  userId: string | null,
  nestId: string | null,
  inputData: any,
  outputData: any,
  usageData: any = {}
): Promise<void> {
  if (!userId) return; // ユーザーIDがない場合はログしない

  try {
    const logData = {
      feature_type: featureType,
      provider,
      model,
      user_id: userId,
      nest_id: nestId,
      input_tokens: usageData.input_tokens || 0,
      output_tokens: usageData.output_tokens || 0,
      total_tokens: usageData.total_tokens || 0,
      estimated_cost_usd: usageData.estimated_cost_usd || 0,
      request_metadata: inputData ? JSON.stringify(inputData) : null,
      response_metadata: outputData ? JSON.stringify(outputData) : null,
      created_at: new Date().toISOString()
    };

    console.log('[ai-embeddings] Recording AI usage log:', {
      feature_type: logData.feature_type,
      provider: logData.provider,
      model: logData.model,
      userId: logData.user_id,
      nestId: logData.nest_id
    });

    const { error } = await supabase
      .from('ai_usage_logs')
      .insert(logData);

    if (error) {
      console.error('[ai-embeddings] Failed to log AI usage:', error);
    } else {
      console.log('[ai-embeddings] AI usage logged successfully');
    }
  } catch (error) {
    console.error('[ai-embeddings] Error logging AI usage:', error);
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Parse request body
    const { text, texts, provider, nestId, userId, featureType }: EmbeddingRequest = await req.json()
    
    // Support both single text and batch texts
    const inputTexts = texts || (text ? [text] : [])
    if (!inputTexts || inputTexts.length === 0 || inputTexts.some(t => !t)) {
      throw new Error('No text provided for embedding generation')
    }

    console.log(`[ai-embeddings] Processing ${inputTexts.length} texts with nestId: ${nestId}, provider: ${provider}, featureType: ${featureType}`)

    // 🚀 新しいロジック: embedding処理は強制的にOpenAIを使用
    const forceOpenAI = featureType === 'embedding' || featureType === 'relationship_analysis';
    
    if (forceOpenAI) {
      console.log(`[ai-embeddings] Forcing OpenAI for embedding/relationship_analysis tasks to avoid rate limits`);
      
      const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
      if (!openaiApiKey) {
        throw new Error('OpenAI API key not configured')
      }
      
      const embeddings = await generateOpenAIEmbeddings(inputTexts, openaiApiKey, 'text-embedding-3-small')
      const usedProvider = 'openai (forced)';
      
      console.log(`[ai-embeddings] Generated ${embeddings.length} embeddings using ${usedProvider}`)

      // AI使用ログを記録
      if (userId && embeddings.length > 0) {
        try {
          const supabaseUrl = Deno.env.get('SUPABASE_URL')
          const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
          
          if (supabaseUrl && supabaseKey) {
            const supabase = createClient(supabaseUrl, supabaseKey)
            
            const inputData = {
              texts_count: inputTexts.length,
              total_characters: inputTexts.reduce((sum, text) => sum + text.length, 0),
              forced_provider: 'openai',
              feature_type: featureType || 'embedding'
            };
            
            const outputData = {
              embeddings_count: embeddings.length,
              dimensions: embeddings[0]?.length || 0,
              provider_used: usedProvider,
              batch_processing: inputTexts.length > 1
            };
            
            const usageData = {
              estimated_cost_usd: inputTexts.length * 0.0001, // 概算コスト
              input_tokens: Math.ceil(inputData.total_characters / 4), // 概算：1トークン≈4文字
              output_tokens: 0, // Embeddingは出力トークンなし
              total_tokens: Math.ceil(inputData.total_characters / 4)
            };
            
            await logAIUsage(
              supabase,
              featureType || 'embedding',
              'openai', // Clean provider name
              'text-embedding-3-small',
              userId,
              nestId || null,
              inputData,
              outputData,
              usageData
            );
          }
        } catch (logError) {
          console.error('[ai-embeddings] Failed to log AI usage:', logError);
        }
      }

      // Return embeddings
      return new Response(
        JSON.stringify({
          success: true,
          embeddings: texts ? embeddings : embeddings[0], // Return array if batch, single if not
          count: embeddings.length,
          provider: usedProvider,
          dimensions: embeddings[0]?.length || 0,
          nestId: nestId,
          usingNestSettings: false, // We're forcing OpenAI
          forcedProvider: true
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    // 既存のロジック（embedding以外の処理）
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

    // AI使用ログを記録
    if (userId && embeddings.length > 0) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
        
        if (supabaseUrl && supabaseKey) {
          const supabase = createClient(supabaseUrl, supabaseKey)
          
          // モデル名を決定
          let modelName = 'unknown';
          if (usedProvider.includes('openai')) {
            modelName = aiSettings?.providerConfigs?.openai?.embeddingModel || 'text-embedding-3-small';
          } else if (usedProvider.includes('gemini')) {
            modelName = aiSettings?.providerConfigs?.gemini?.embeddingModel || 'gemini-embedding-exp-03-07';
          }
          
          const inputData = {
            texts_count: inputTexts.length,
            total_characters: inputTexts.reduce((sum, text) => sum + text.length, 0),
            using_nest_settings: !!nestId,
            feature_type: featureType || 'embedding'
          };
          
          const outputData = {
            embeddings_count: embeddings.length,
            dimensions: embeddings[0]?.length || 0,
            provider_used: usedProvider,
            batch_processing: inputTexts.length > 1
          };
          
          const usageData = {
            estimated_cost_usd: inputTexts.length * 0.0001, // 概算コスト
            // Embedding APIはトークン数を返さないので概算値を設定
            input_tokens: Math.ceil(inputData.total_characters / 4), // 概算：1トークン≈4文字
            output_tokens: 0, // Embeddingは出力トークンなし
            total_tokens: Math.ceil(inputData.total_characters / 4)
          };
          
          await logAIUsage(
            supabase,
            featureType || 'embedding',
            usedProvider.replace(' (fallback)', ''), // Remove fallback suffix for clean provider name
            modelName,
            userId,
            nestId || null,
            inputData,
            outputData,
            usageData
          );
        }
      } catch (logError) {
        console.error('[ai-embeddings] Failed to log AI usage:', logError);
      }
    }

    // Return embeddings
    return new Response(
      JSON.stringify({
        success: true,
        embeddings: texts ? embeddings : embeddings[0], // Return array if batch, single if not
        count: embeddings.length,
        provider: usedProvider,
        dimensions: embeddings[0]?.length || 0,
        nestId: nestId,
        usingNestSettings: !!nestId,
        forcedProvider: false
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