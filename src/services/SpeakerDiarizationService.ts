import { supabase } from './supabase/client';
import { BackgroundJob } from '../features/meeting-space/types/backgroundJob';

export class SpeakerDiarizationService {
  /**
   * 話者分離ジョブを開始
   */
  static async startSpeakerDiarizationJob(
    meetingId: string,
    primaryProvider: string = 'gemini',
    modelConfig: any = {}
  ): Promise<string> {
    // meetingIdの妥当性チェック
    if (!meetingId || meetingId === 'undefined' || typeof meetingId !== 'string') {
      throw new Error(`Invalid meetingId provided: ${meetingId} (type: ${typeof meetingId})`);
    }

    console.log('[SpeakerDiarizationService] 話者分離ジョブ開始:', {
      meetingId,
      primaryProvider,
      modelConfig
    });

    // ユーザー情報取得
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('ユーザー認証が必要です');
    }

    // 既存の実行中ジョブをチェック
    const { data: existingJobs, error: checkError } = await supabase
      .from('background_jobs')
      .select('*')
      .eq('meeting_id', meetingId)
      .eq('type', 'speaker_diarization')
      .in('status', ['pending', 'running']);

    if (checkError) {
      console.error('[SpeakerDiarizationService] 既存ジョブチェックエラー:', checkError);
      throw new Error('既存ジョブの確認に失敗しました');
    }

    if (existingJobs && existingJobs.length > 0) {
      console.log('[SpeakerDiarizationService] 既存ジョブが存在:', existingJobs[0].id);
      return existingJobs[0].id;
    }

    // 新しいジョブを作成
    const jobData = {
      type: 'speaker_diarization',
      status: 'pending',
      meeting_id: meetingId,
      user_id: user.id,
      progress: 0,
      metadata: {
        primaryProvider,
        modelConfig,
        maxTokens: modelConfig?.maxTokens || (primaryProvider === 'gemini' ? 200000 : 8192),
        startedAt: new Date().toISOString()
      }
    };

    const { data: newJob, error: createError } = await supabase
      .from('background_jobs')
      .insert(jobData)
      .select()
      .single();

    if (createError || !newJob) {
      console.error('[SpeakerDiarizationService] ジョブ作成エラー:', createError);
      throw new Error('話者分離ジョブの作成に失敗しました');
    }

    console.log('[SpeakerDiarizationService] ジョブ作成完了:', newJob.id);
    return newJob.id;
  }

  /**
   * 話者分離ジョブの状態を取得
   */
  static async getSpeakerDiarizationJobStatus(jobId: string): Promise<BackgroundJob> {
    const { data: job, error } = await supabase
      .from('background_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error || !job) {
      throw new Error('ジョブが見つかりません');
    }

    return {
      id: job.id,
      type: job.type,
      status: job.status,
      meetingId: job.meeting_id,
      userId: job.user_id,
      progress: job.progress || 0,
      result: job.result,
      errorMessage: job.error_message,
      metadata: job.metadata || {},
      createdAt: job.created_at,
      updatedAt: job.updated_at,
      estimatedCompletion: job.estimated_completion
    };
  }

  /**
   * ミーティングの話者データを取得
   */
  static async getSpeakerData(meetingId: string) {
    console.log('[SpeakerDiarizationService] 話者データ取得:', meetingId);

    // 話者データを取得
    const { data: speakers, error: speakersError } = await supabase
      .from('meeting_speakers')
      .select('*')
      .eq('meeting_id', meetingId)
      .order('speaker_tag', { ascending: true });

    if (speakersError) {
      console.error('[SpeakerDiarizationService] 話者データ取得エラー:', speakersError);
      throw new Error('話者データの取得に失敗しました');
    }

    // 発話データを取得
    const { data: utterances, error: utterancesError } = await supabase
      .from('meeting_utterances')
      .select('*')
      .eq('meeting_id', meetingId)
      .order('start_time', { ascending: true });

    if (utterancesError) {
      console.error('[SpeakerDiarizationService] 発話データ取得エラー:', utterancesError);
      throw new Error('発話データの取得に失敗しました');
    }

    return {
      speakers: speakers || [],
      utterances: utterances || []
    };
  }

  /**
   * ミーティングに話者分離データが存在するかチェック
   */
  static async hasSpeakerData(meetingId: string): Promise<boolean> {
    const { data: speakers, error } = await supabase
      .from('meeting_speakers')
      .select('id')
      .eq('meeting_id', meetingId)
      .limit(1);

    if (error) {
      console.error('[SpeakerDiarizationService] 話者データ存在チェックエラー:', error);
      return false;
    }

    return speakers && speakers.length > 0;
  }

  /**
   * 直接呼び出し版: Edge Functionを直接呼び出して話者分離を実行
   */
  static async executeSpeakerDiarizationDirect(
    meetingId: string,
    provider: string = 'gemini',
    model: string = 'gemini-1.5-flash'
  ): Promise<any> {
    try {
      console.log('[SpeakerDiarizationService] 🚀 直接呼び出し版開始:', { meetingId, provider, model });

      // 既存のsupabaseクライアントを使用

      // 現在のユーザーを取得
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('ユーザー認証エラー: ' + (userError?.message || 'ユーザーが見つかりません'));
      }

      // セッションからアクセストークンを取得
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) {
        throw new Error('セッショントークンエラー: ' + (sessionError?.message || 'アクセストークンが見つかりません'));
      }

      // Edge Functionを直接呼び出し
      const { data, error } = await supabase.functions.invoke('speaker-diarization', {
        body: {
          meetingId,
          provider,
          model
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) {
        throw new Error(`Edge Function呼び出しエラー: ${error.message}`);
      }

      console.log('[SpeakerDiarizationService] ✅ 直接呼び出し版完了:', data);
      return data;

    } catch (error) {
      console.error('[SpeakerDiarizationService] ❌ 直接呼び出し版エラー:', error);
      throw error;
    }
  }

  /**
   * 設定フラグ: どちらの実装を使用するか
   * true: 直接呼び出し版, false: BackgroundWorker版
   */
  static readonly USE_DIRECT_CALL = true;

  /**
   * 統合インターフェース: 設定に応じて適切な実装を選択
   */
  static async executeSpeakerDiarization(
    meetingId: string,
    provider: string = 'gemini',
    model: string = 'gemini-1.5-flash'
  ): Promise<any> {
    if (this.USE_DIRECT_CALL) {
      console.log('[SpeakerDiarizationService] 🔄 直接呼び出し版を使用');
      return this.executeSpeakerDiarizationDirect(meetingId, provider, model);
    } else {
      console.log('[SpeakerDiarizationService] 🔄 BackgroundWorker版を使用');
      return this.startSpeakerDiarizationJob(meetingId, provider, model);
    }
  }
}
