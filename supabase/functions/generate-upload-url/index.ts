import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🔧 [Generate Upload URL] リクエスト受信:', req.method)
    
    const { fileName, fileType, meetingId } = await req.json()
    
    if (!fileName || !fileType || !meetingId) {
      return new Response(
        JSON.stringify({ error: 'MISSING_PARAMETERS', message: '必要なパラメータが不足しています' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    console.log('🔧 [Generate Upload URL] パラメータ確認:', { fileName, fileType, meetingId })

    // 認証チェック（適切な権限設定）
    const authHeader = req.headers.get('authorization')
    const apiKey = req.headers.get('apikey')
    
    console.log('🔧 [Generate Upload URL] 認証ヘッダー確認:', {
      hasAuth: !!authHeader,
      hasApiKey: !!apiKey
    })
    
    // Supabaseクライアントを作成
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: authHeader ? {
            Authorization: authHeader
          } : {}
        }
      }
    )
    
    // 認証されたユーザーかチェック
    if (authHeader) {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !user) {
        console.log('🔧 [Generate Upload URL] 認証エラー:', authError?.message || 'ユーザーが見つかりません')
        return new Response(
          JSON.stringify({ error: 'UNAUTHORIZED', message: '認証が必要です' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
        )
      }
      
      console.log('🔧 [Generate Upload URL] 認証成功:', user.id)
    } else if (apiKey) {
      // APIキーベース認証（フロントエンドから）
      if (apiKey !== Deno.env.get('SUPABASE_ANON_KEY')) {
        console.log('🔧 [Generate Upload URL] APIキー認証エラー')
        return new Response(
          JSON.stringify({ error: 'UNAUTHORIZED', message: 'APIキーが無効です' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
        )
      }
      console.log('🔧 [Generate Upload URL] APIキー認証成功')
    } else {
      console.log('🔧 [Generate Upload URL] 認証情報なし')
      return new Response(
        JSON.stringify({ error: 'UNAUTHORIZED', message: '認証が必要です' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    // ファイル名の生成（一意性を保証）
    const timestamp = Date.now()
    const sanitizedFileName = fileName
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/_{2,}/g, '_')
      .toLowerCase()
    
    const gcsFileName = `${meetingId}/${timestamp}_${sanitizedFileName}`
    const bucketName = 'poconest-audio-files'

    // GCS署名付きURL生成
    console.log('🔧 [Generate Upload URL] GCS署名付きURL生成開始')
    
    // 簡易的な署名付きURL生成（Cloud Run経由）
    const cloudRunUrl = Deno.env.get('CLOUD_RUN_TRANSCRIPTION_URL') || 'https://transcription-service-753651631159.asia-northeast1.run.app';
    const cloudRunApiKey = Deno.env.get('CLOUD_RUN_API_KEY') || '';
    
    console.log('🔧 [Generate Upload URL] Cloud Run経由で署名付きURL生成開始');
    
    const response = await fetch(`${cloudRunUrl}/generate-upload-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': cloudRunApiKey,
        'Authorization': `Bearer ${cloudRunApiKey}`
      },
      body: JSON.stringify({
        fileName: fileName,
        fileType,
        meetingId,
        gcsFileName: gcsFileName
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('🔧 [Generate Upload URL] Cloud Run エラー:', errorText);
      throw new Error(`Cloud Run エラー: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const result = await response.json();
    const signedUrl = result.signedUrl;
    
    console.log('🔧 [Generate Upload URL] GCS署名付きURL生成完了:', { gcsFileName })
    
    return new Response(
      JSON.stringify({
        success: true,
        signedUrl,
        gcsFileName,
        bucketName,
        message: '署名付きURLを生成しました'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('🔧 [Generate Upload URL] エラー:', error)
    return new Response(
      JSON.stringify({
        error: 'PROCESSING_ERROR',
        message: `処理中にエラーが発生しました: ${error.message}`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})


