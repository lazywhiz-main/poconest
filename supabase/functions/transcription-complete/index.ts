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

  // 認証チェックを無効化（コールバック用）
  console.log('🔧 [Transcription Complete] リクエスト受信:', {
    method: req.method,
    url: req.url,
    headers: Object.fromEntries(req.headers.entries())
  })

  try {
    const { 
      jobId, 
      meetingId, 
      nestId, 
      transcript, 
      speakers, 
      utterances, 
      status, 
      error 
    } = await req.json()
    
    console.log('🔧 [Transcription Complete] コールバック受信:', { jobId, meetingId, status })
    
    // Supabaseクライアントを先に初期化
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    if (status === 'error') {
      console.error('🔧 [Transcription Complete] 処理エラー:', error)
      
      // エラー時もジョブステータスを更新
      const { error: jobError } = await supabase
        .from('transcription_jobs')
        .update({
          status: 'failed',
          error_message: error,
          updated_at: new Date().toISOString(),
        })
        .eq('job_id', jobId)

      if (jobError) {
        console.warn('🔧 [Transcription Complete] エラー時ジョブ更新エラー:', jobError)
      }
      
      return new Response(
        JSON.stringify({ error: 'TRANSCRIPTION_FAILED', message: error }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    if (status === 'processing') {
      console.log('🔧 [Transcription Complete] 処理開始通知 - ジョブステータスをprocessingに更新')
      
      // processing時はジョブステータスをprocessingに更新
      const { error: jobError } = await supabase
        .from('transcription_jobs')
        .update({
          status: 'processing',
          updated_at: new Date().toISOString(),
        })
        .eq('job_id', jobId)

      if (jobError) {
        console.warn('🔧 [Transcription Complete] 処理開始時ジョブ更新エラー:', jobError)
      }
      
      return new Response(
        JSON.stringify({ success: true, message: '処理開始通知を受信しました' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (status === 'completed') {
      console.log('🔧 [Transcription Complete] 処理完了通知 - 結果を保存')
      
      // 完了時のみtranscription_jobsテーブルを更新
      const { error: jobError } = await supabase
        .from('transcription_jobs')
        .update({
          status: 'completed',
          transcript: transcript,
          updated_at: new Date().toISOString(),
        })
        .eq('job_id', jobId)

      if (jobError) {
        console.warn('🔧 [Transcription Complete] ジョブ更新エラー:', jobError)
      }

      // ミーティングの文字起こしも更新（後方互換性）
      const { error: meetingError } = await supabase
        .from('meetings')
        .update({
          transcript: transcript,
          updated_at: new Date().toISOString(),
        })
        .eq('id', meetingId)

      if (meetingError) {
        console.warn('🔧 [Transcription Complete] ミーティング更新エラー:', meetingError)
      }

      // 話者情報を保存
      if (speakers && speakers.length > 0) {
        for (const speaker of speakers) {
          const { error: speakerError } = await supabase
            .from('meeting_speakers')
            .upsert({
              meeting_id: meetingId,
              speaker_tag: speaker.speakerTag,
              name: speaker.name,
              total_time: speaker.totalTime,
              word_count: speaker.wordCount,
            })

          if (speakerError) {
            console.warn('話者情報保存エラー:', speakerError)
          }
        }
      }

      // 発言詳細を保存
      if (utterances && utterances.length > 0) {
        for (const utterance of utterances) {
          const { error: utteranceError } = await supabase
            .from('meeting_utterances')
            .insert({
              meeting_id: meetingId,
              speaker_tag: utterance.speakerTag,
              word: utterance.word,
              start_time: utterance.startTime,
              end_time: utterance.endTime,
              confidence: utterance.confidence,
            })

          if (utteranceError) {
            console.warn('発言詳細保存エラー:', utteranceError)
          }
        }
      }

      // NESTのupdated_atを更新
      if (nestId) {
        await supabase
          .from('nests')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', nestId)
      }

      console.log('🔧 [Transcription Complete] 処理完了')
      
      return new Response(
        JSON.stringify({
          success: true,
          message: '文字起こし処理が完了しました'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 未知のステータス
    console.warn('🔧 [Transcription Complete] 未知のステータス:', status)
    return new Response(
      JSON.stringify({
        error: 'UNKNOWN_STATUS',
        message: `未知のステータス: ${status}`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )

  } catch (error) {
    console.error('🔧 [Transcription Complete] エラー:', error)
    return new Response(
      JSON.stringify({
        error: 'CALLBACK_ERROR',
        message: `コールバック処理中にエラーが発生しました: ${error.message}`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
