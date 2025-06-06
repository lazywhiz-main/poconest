import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // OpenAI API key from environment
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured')
    }

    // Parse request body
    const { text, texts } = await req.json()
    
    // Support both single text and batch texts
    const inputTexts = texts || [text]
    if (!inputTexts || inputTexts.length === 0) {
      throw new Error('No text provided for embedding generation')
    }

    console.log(`[ai-embeddings] Processing ${inputTexts.length} texts`)

    // Call OpenAI Embeddings API
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: inputTexts,
        encoding_format: 'float',
      }),
    })

    if (!response.ok) {
      const errorData = await response.text()
      console.error('[ai-embeddings] OpenAI API error:', response.status, errorData)
      throw new Error(`OpenAI API error: ${response.status}`)
    }

    const data = await response.json()
    console.log(`[ai-embeddings] Generated ${data.data.length} embeddings`)

    // Return embeddings
    const embeddings = data.data.map((item: any) => item.embedding)
    
    return new Response(
      JSON.stringify({
        success: true,
        embeddings: texts ? embeddings : embeddings[0], // Return array if batch, single if not
        count: embeddings.length,
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