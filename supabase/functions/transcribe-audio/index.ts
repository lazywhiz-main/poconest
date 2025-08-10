import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { fileUrl, meetingId, nestId, useGoogleCloud = true } = await req.json()
    
    if (!fileUrl || !meetingId || !nestId) {
      return new Response(
        JSON.stringify({ error: 'MISSING_PARAMETERS', message: '必要なパラメータが不足しています' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    console.log('🔧 [Edge Function] Google Cloud Run への処理委譲を開始します')
    
    // Google Cloud Run サービスに処理を委譲
    const cloudRunBaseUrl = Deno.env.get('CLOUD_RUN_TRANSCRIPTION_URL') || 
                           'https://transcription-service-xxx.run.app'
    const cloudRunUrl = `${cloudRunBaseUrl}/transcribe`
    
    const apiKey = Deno.env.get('CLOUD_RUN_API_KEY') || ''
    
    // デバッグ情報を追加
    console.log('🔧 [Edge Function] デバッグ情報:', {
      cloudRunUrl,
      apiKeyLength: apiKey.length,
      apiKeyPrefix: apiKey.substring(0, 10) + '...',
      hasApiKey: !!apiKey
    })
    
    const response = await fetch(cloudRunUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
        'Authorization': `Bearer ${apiKey}`  // 追加の認証ヘッダー
      },
      body: JSON.stringify({
        fileUrl,
        meetingId,
        nestId,
        useGoogleCloud,
        callbackUrl: `${Deno.env.get('SUPABASE_URL')}/functions/v1/transcription-complete`
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('🔧 [Edge Function] Cloud Run エラーレスポンス:', {
        status: response.status,
        statusText: response.statusText,
        errorText
      })
      throw new Error(`Cloud Run エラー: ${response.status} ${response.statusText} - ${errorText}`)
    }

    const result = await response.json()
    
    console.log('🔧 [Edge Function] Cloud Run 処理開始成功:', result.jobId)
    
    return new Response(
      JSON.stringify({
        success: true,
        jobId: result.jobId,
        message: '音声文字起こし処理を開始しました。完了までしばらくお待ちください。'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('🔧 [Edge Function] エラー:', error)
    return new Response(
      JSON.stringify({
        error: 'PROCESSING_ERROR',
        message: `処理中にエラーが発生しました: ${error.message}`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
}) 