import { supabase } from './supabase/client';
import { BackgroundJob, JobType, JobStatus, RetryConfiguration } from '../features/meeting-space/types/backgroundJob';
import { NotificationService } from '../features/notifications/services/NotificationService';
import { generateMeetingSummary, extractCardsFromMeeting } from './ai/openai';
import { getOrCreateDefaultBoard, addCardsToBoard } from './BoardService';
import { getOrCreateMeetingSource, addCardSource } from './BoardService';
import { TranscriptionService } from './TranscriptionService';
import { NestUpdateService } from './NestUpdateService';

// OpenAI APIキーの確認は不要（Edge Function経由で処理）

interface JobProcessor {
  process(job: BackgroundJob): Promise<any>;
}

// AI要約処理
class AISummaryProcessor implements JobProcessor {
  async process(job: BackgroundJob): Promise<any> {
    console.log(`[AISummaryProcessor] Processing job ${job.id}`);
    
    // Step 1: ミーティングデータ取得 (25%)
    await this.updateProgress(job.id, 25, 'ミーティングデータを取得中...');
    
    const { data: meeting, error } = await supabase
      .from('meetings')
      .select('*')
      .eq('id', job.meetingId)
      .single();

    if (error) {
      throw new Error(`Failed to fetch meeting: ${error.message}`);
    }

    if (!meeting) {
      throw new Error('Meeting not found');
    }

    // Step 2: AI要約生成 (75%)
    await this.updateProgress(job.id, 75, 'AI要約を生成中...');
    
    let summary: string;
    
    // ユーザーコンテキストを設定
    const context = {
      userId: job.userId || 'system',
      nestId: meeting.nest_id,
      meetingId: job.meetingId
    };
    
    // 実際のtranscriptがある場合のみ本格的な要約を実行
    if (meeting.transcript && meeting.transcript.trim().length > 100) {
      try {
        summary = await generateMeetingSummary(meeting.transcript, context, job.id);
      } catch (error) {
        console.error('[AISummaryProcessor] AI summary failed:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`AI summary generation failed: ${errorMessage}`);
      }
    } else {
      throw new Error('Transcript too short for meaningful summary generation. Minimum required: 100 characters.');
    }

    // Step 3: データベース保存 (100%)
    // 🔧 Edge Function側でステータス更新を行うため、ここでは進捗のみ更新
    await this.updateProgress(job.id, 100, '要約をデータベースに保存中...');
    
    const { error: updateError } = await supabase
      .from('meetings')
      .update({ ai_summary: summary })
      .eq('id', job.meetingId);

    if (updateError) {
      throw new Error(`Failed to save summary: ${updateError.message}`);
    }

    const result = { 
      summary,
      wordCount: summary.length,
      meetingId: job.meetingId,
      timestamp: new Date().toISOString()
    };

    console.log(`[AISummaryProcessor] Job ${job.id} completed with result:`, result);
    
    // 🔧 Edge Function側でステータス更新済みかチェック
    const { data: currentJob, error: jobCheckError } = await supabase
      .from('background_jobs')
      .select('status')
      .eq('id', job.id)
      .single();
    
    if (jobCheckError) {
      console.warn(`🔧 [AISummaryProcessor] ジョブ状態確認エラー:`, jobCheckError);
    } else if (currentJob?.status === 'completed') {
      console.log(`🔧 [AISummaryProcessor] Edge Function側で既にステータス更新済み - BackgroundJobWorker側での更新をスキップ: ${job.id}`);
      return result;
    } else {
      console.log(`🔧 [AISummaryProcessor] Edge Function側でステータス更新されていない（現在: ${currentJob?.status}） - 通常通り処理完了`);
    }
    
    return result;
  }

  private async updateProgress(jobId: string | null, progress: number, message: string) {
    if (!jobId) return;
    
    await supabase
      .from('background_jobs')
      .update({ 
        progress,
        metadata: { current_step: message },
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);
  }
}

// カード抽出処理
class CardExtractionProcessor implements JobProcessor {
  async process(job: BackgroundJob): Promise<any> {
    console.log(`🚀 [CardExtractionProcessor] ジョブ処理開始: ${job.id}`);
    
    // Step 1: ミーティングデータ取得 (25%)
    await this.updateProgress(job.id, 25, 'ミーティングデータを取得中...');
    
    const { data: meeting, error } = await supabase
      .from('meetings')
      .select('*')
      .eq('id', job.meetingId)
      .single();

    if (error) {
      throw new Error(`Failed to fetch meeting: ${error.message}`);
    }

    if (!meeting) {
      throw new Error('Meeting not found');
    }

    if (!meeting.transcript || meeting.transcript.trim().length === 0) {
      throw new Error('Meeting transcript not found or empty');
    }

    // Step 2: EdgeFunction呼び出し (75%)
    await this.updateProgress(job.id, 75, 'AIカード抽出を実行中...');
    
    console.log(`🔍 [CardExtractionProcessor] EdgeFunction呼び出し開始: extract-cards-from-meeting`);
    
    const { data, error: functionError } = await supabase.functions.invoke('extract-cards-from-meeting', {
      body: {
        meeting_id: job.meetingId,
        job_id: job.id,
        nestId: job.metadata?.nestId,
        extractionSettings: job.metadata?.extractionSettings
      }
    });

    if (functionError) {
      console.error('[CardExtractionProcessor] EdgeFunction error:', functionError);
      throw new Error(`EdgeFunction error: ${functionError.message}`);
    }

    console.log(`✅ [CardExtractionProcessor] EdgeFunction実行完了:`, data);

    // Step 3: 結果の検証 (100%)
    await this.updateProgress(job.id, 100, 'カード抽出完了');
    
    const result = { 
      success: data?.success || false,
      cardsCount: data?.cards?.length || 0,
      meetingId: job.meetingId,
      timestamp: new Date().toISOString()
    };

    console.log(`✅ [CardExtractionProcessor] ジョブ完了:`, result);
    return result;
  }

  private async updateProgress(jobId: string | null, progress: number, message: string) {
    if (!jobId) return;
    
    await supabase.from('background_jobs').update({
      progress,
      updated_at: new Date().toISOString()
    }).eq('id', jobId);
  }
}

// 文字起こし処理
class TranscriptionProcessor implements JobProcessor {
  async process(job: BackgroundJob): Promise<any> {
    console.log(`🔧 [TranscriptionProcessor] ジョブ処理開始: ${job.id}`);
    
    // Step 1: ミーティングデータ取得 (25%)
    console.log('🔧 [TranscriptionProcessor] Step 1: ミーティングデータ取得開始');
    await this.updateProgress(job.id, 25, 'ミーティングデータを取得中...');
    
    const { data: meeting, error } = await supabase
      .from('meetings')
      .select('*')
      .eq('id', job.meetingId)
      .single();

    if (error) {
      console.error('🔧 [TranscriptionProcessor] ミーティング取得エラー:', error);
      throw new Error(`Failed to fetch meeting: ${error.message}`);
    }

    if (!meeting) {
      console.error('🔧 [TranscriptionProcessor] ミーティングが見つかりません');
      throw new Error('Meeting not found');
    }

    console.log('🔧 [TranscriptionProcessor] ミーティングデータ取得成功:', meeting.id);

    // Step 2: 音声ファイル取得・文字起こし処理 (75%)
    console.log('🔧 [TranscriptionProcessor] Step 2: 音声ファイル処理開始');
    await this.updateProgress(job.id, 75, '音声を文字起こし中...');
    
    let transcript: string;
    
    // ユーザーコンテキストを設定
    const context = {
      userId: job.userId || 'system',
      nestId: meeting.nest_id,
      meetingId: job.meetingId
    };
    
    console.log('🔧 [TranscriptionProcessor] コンテキスト設定完了:', context);
    
    // ファイル情報を取得
    const fileName = job.metadata?.fileName;
    const fileType = job.metadata?.fileType;
    const storagePath = job.metadata?.storagePath;
    
    console.log('🔧 [TranscriptionProcessor] ファイル情報:', {
      fileName,
      fileType,
      storagePath,
      metadata: job.metadata
    });
    
    if (!fileName || !fileType || !storagePath) {
      console.error('🔧 [TranscriptionProcessor] ファイル情報が不完全です');
      throw new Error('ファイル情報が不完全です。ファイルアップロードが完了していない可能性があります。');
    }
    
    try {
      // Step 2a: ストレージ内ファイル確認
      console.log('🔧 [TranscriptionProcessor] Step 2a: Storage内ファイル確認開始');
      await this.updateProgress(job.id, 40, 'アップロード済みファイルを確認中...');
      console.log('🔧 [TranscriptionProcessor] Storage内ファイル確認開始:', storagePath);
      
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('meeting-files')
        .download(storagePath);
      
      if (downloadError) {
        console.error('🔧 [TranscriptionProcessor] ファイルダウンロード失敗:', downloadError);
        throw new Error(`ファイルアクセスエラー: ${downloadError.message}`);
      }
      
      console.log('🔧 [TranscriptionProcessor] ファイル確認成功:', {
        size: fileData.size,
        type: fileData.type
      });
      
      // Step 2b: 文字起こし処理
      console.log('🔧 [TranscriptionProcessor] Step 2b: 文字起こし処理開始');
      await this.updateProgress(job.id, 80, '音声を文字起こし中...');
      
      // BlobをArrayBufferに変換
      console.log('🔧 [TranscriptionProcessor] BlobをArrayBufferに変換中...');
      const arrayBuffer = await fileData.arrayBuffer();
      console.log('🔧 [TranscriptionProcessor] ArrayBuffer変換完了:', {
        byteLength: arrayBuffer.byteLength,
        sizeMB: (arrayBuffer.byteLength / 1024 / 1024).toFixed(2)
      });
      
      // Edge Functionを使用した文字起こし
      console.log('🔧 [TranscriptionProcessor] TranscriptionService呼び出し開始:', {
        fileName,
        fileType,
        fileSize: arrayBuffer.byteLength,
        meetingId: job.meetingId,
        nestId: meeting.nest_id
      });
      
      const transcriptionResult = await TranscriptionService.transcribeAudio(
        arrayBuffer,
        fileName,
        fileType,
        job.meetingId,
        meeting.nest_id,
        true // useGoogleCloud = true (Google Cloud Speech-to-Text使用、話者分割対応)
      );
      
      console.log('🔧 [TranscriptionProcessor] TranscriptionService呼び出し完了:', {
        transcriptLength: transcriptionResult.transcript?.length || 0,
        wordCount: transcriptionResult.wordCount
      });
      
      transcript = transcriptionResult.transcript;
      
    } catch (error) {
      console.error('🔧 [TranscriptionProcessor] Transcription failed:', error);
      console.error('🔧 [TranscriptionProcessor] Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        jobId: job.id,
        meetingId: job.meetingId,
        fileName,
        fileType
      });
      throw new Error(`文字起こしに失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Step 3: データベース保存 (100%)
    await this.updateProgress(job.id, 100, '文字起こしをデータベースに保存中...');
    
    const { error: updateError } = await supabase
      .from('meetings')
      .update({ 
        transcript: transcript,
        updated_at: new Date().toISOString()
      })
      .eq('id', job.meetingId);

    if (updateError) {
      throw new Error(`Failed to save transcript: ${updateError.message}`);
    }

    // NESTのupdated_atを更新
    if (meeting.nest_id) {
      try {
        await NestUpdateService.updateNestActivity(meeting.nest_id);
      } catch (error) {
        console.warn('Failed to update nest activity:', error);
      }
    }

    const result = { 
      transcript,
      wordCount: transcript.length,
      meetingId: job.meetingId,
      fileName: job.metadata?.fileName,
      fileType: job.metadata?.fileType,
      storagePath: `meetings/${job.meetingId}/${job.metadata?.fileName}`,
      timestamp: new Date().toISOString()
    };

    console.log(`[TranscriptionProcessor] Job ${job.id} completed with result:`, result);
    return result;
  }



  private async updateProgress(jobId: string | null, progress: number, message: string) {
    if (!jobId) return;
    
    await supabase
      .from('background_jobs')
      .update({ 
        progress,
        metadata: { current_step: message },
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);
  }
}

// 話者分離処理
class SpeakerDiarizationProcessor implements JobProcessor {
  async process(job: BackgroundJob): Promise<any> {
    console.log(`[SpeakerDiarizationProcessor] Processing job ${job.id}`);
    console.log(`[SpeakerDiarizationProcessor] Job data:`, {
      id: job.id,
      meetingId: job.meetingId,
      userId: job.userId,
      type: job.type,
      status: job.status,
      metadata: job.metadata
    });
    
    // meetingIdの妥当性チェック
    if (!job.meetingId || job.meetingId === 'undefined' || typeof job.meetingId !== 'string') {
      throw new Error(`Invalid meetingId: ${job.meetingId} (type: ${typeof job.meetingId})`);
    }
    
    // Step 1: ミーティングデータ取得 (25%)
    await this.updateProgress(job.id, 25, 'ミーティングデータを取得中...');
    
    console.log(`[SpeakerDiarizationProcessor] Fetching meeting with ID: ${job.meetingId}`);
    
    const { data: meeting, error } = await supabase
      .from('meetings')
      .select('*')
      .eq('id', job.meetingId)
      .single();

    if (error) {
      throw new Error(`Failed to fetch meeting: ${error.message}`);
    }

    if (!meeting) {
      throw new Error('Meeting not found');
    }

    if (!meeting.transcript) {
      throw new Error('Meeting transcript not found');
    }

    // Step 2: 認証トークン取得 (30%)
    await this.updateProgress(job.id, 30, '認証情報を準備中...');
    
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      throw new Error('認証セッションの取得に失敗しました');
    }

    // Step 3: Edge Function呼び出し (50-90%)
    await this.updateProgress(job.id, 50, 'AI話者分離を実行中...');
    
    // AI設定の取得
    const primaryProvider = job.metadata?.primaryProvider || 'gemini';
    const modelConfig = job.metadata?.modelConfig || {};
    const maxTokens = modelConfig?.maxTokens || job.metadata?.maxTokens || (primaryProvider === 'gemini' ? 200000 : 16384);

    console.log('[SpeakerDiarizationProcessor] Edge Function呼び出し開始:', {
      meetingId: job.meetingId,
      provider: primaryProvider,
      maxTokens,
      transcriptLength: meeting.transcript.length
    });

    const { data, error: edgeFunctionError } = await supabase.functions.invoke('speaker-diarization', {
      body: {
        meetingId: job.meetingId,
        provider: primaryProvider,
        model: modelConfig?.model || (primaryProvider === 'gemini' ? 'gemini-2.0-flash' : 'gpt-4o'),
        maxTokens
      },
      headers: {
        'Authorization': `Bearer ${session.access_token}`
      }
    });

    await this.updateProgress(job.id, 90, '話者分離結果を保存中...');

    if (edgeFunctionError) {
      console.error('[SpeakerDiarizationProcessor] Edge Function error:', edgeFunctionError);
      throw new Error(`Edge Function error: ${edgeFunctionError.message}`);
    }

    // Step 4: 結果の検証と保存 (100%)
    await this.updateProgress(job.id, 100, '話者分離完了');

    console.log('[SpeakerDiarizationProcessor] Edge Function response:', data);

    // NESTのupdated_atを更新
    if (meeting.nest_id) {
      try {
        await NestUpdateService.updateNestActivity(meeting.nest_id);
      } catch (error) {
        console.warn('Failed to update nest activity:', error);
      }
    }

    const result = {
      meetingId: job.meetingId,
      speakersCount: data?.speakersCount || 0,
      utterancesCount: data?.utterancesCount || 0,
      analysisMethod: data?.analysisMethod || 'llm',
      processingTimeMs: data?.processingTimeMs || 0,
      timestamp: new Date().toISOString()
    };

    console.log(`[SpeakerDiarizationProcessor] Job ${job.id} completed with result:`, result);
    return result;
  }

  private async updateProgress(jobId: string | null, progress: number, message: string) {
    if (!jobId) return;
    
    await supabase
      .from('background_jobs')
      .update({ 
        progress,
        metadata: { current_step: message },
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);
  }
}



// ワーカーマネージャー
export class BackgroundJobWorker {
  private processors: Map<JobType, JobProcessor> = new Map();
  private isRunning = false;
  private pollingInterval = 2000; // 2秒間隔（より迅速な処理のため）
  private instanceId: number; // インスタンス識別用

  constructor(instanceId: number) {
    this.instanceId = instanceId;
    console.log(`🔧 [BackgroundJobWorker] コンストラクタ開始 #${this.instanceId}`);
    
    this.processors.set('ai_summary', new AISummaryProcessor());
    this.processors.set('card_extraction', new CardExtractionProcessor());
    this.processors.set('transcription', new TranscriptionProcessor());
    this.processors.set('speaker_diarization', new SpeakerDiarizationProcessor());
    
    console.log('🔧 [BackgroundJobWorker] プロセッサー登録完了:', Array.from(this.processors.keys()));
  }

  // ワーカー開始
  async start() {
    console.log(`🚨🚨🚨 [BackgroundJobWorker] #${this.instanceId} start() メソッド呼び出し 🚨🚨🚨`);
    
    if (this.isRunning) {
      console.log(`🚨 [BackgroundJobWorker] #${this.instanceId} 既に実行中です - isRunning: ${this.isRunning}`);
      return;
    }

    this.isRunning = true;
    console.log(`🚨🚨🚨 [BackgroundJobWorker] #${this.instanceId} ワーカー開始、poll()呼び出し 🚨🚨🚨`);
    
    // 🔧 poll()は非同期なので、awaitなしで実行（バックグラウンドで継続実行させる）
    this.poll().catch(error => {
      console.error(`🚨🚨🚨 [BackgroundJobWorker] #${this.instanceId} poll()でエラー:`, error);
    });
    console.log(`🚨 [BackgroundJobWorker] #${this.instanceId} poll() メソッド呼び出し完了`);
  }

  // ワーカー停止
  stop() {
    console.log(`🔧 [BackgroundJobWorker] #${this.instanceId} Stopping worker...`);
    this.isRunning = false;
  }

  // ポーリング処理
  private async poll() {
    console.log(`🚨🚨🚨 [BackgroundJobWorker] #${this.instanceId} ポーリング開始 🚨🚨🚨`);
    console.log(`🚨 [BackgroundJobWorker] #${this.instanceId} while文チェック - isRunning: ${this.isRunning}`);
    
    while (this.isRunning) {
      const pollStartTime = Date.now();
      console.log(`🚨🚨🚨 [BackgroundJobWorker] #${this.instanceId} while文に入りました！ 🚨🚨🚨`);
      try {
        console.log(`🚨 [BackgroundJobWorker] #${this.instanceId} 次のジョブを探しています...`);
        await this.processNextJob();
      } catch (error) {
        console.error(`🔧 [BackgroundJobWorker] #${this.instanceId} Polling error:`, error);
      }
      
      // 🔧 実行時間に関係なく、一定間隔でポーリングする
      const pollDuration = Date.now() - pollStartTime;
      const remainingTime = Math.max(0, this.pollingInterval - pollDuration);
      
      console.log(`🔧 [BackgroundJobWorker] #${this.instanceId} ポーリング待機:`, {
        pollDuration,
        remainingTime,
        nextPollIn: remainingTime
      });
      
      await new Promise(resolve => setTimeout(resolve, remainingTime));
    }
    console.log(`🔧 [BackgroundJobWorker] #${this.instanceId} ポーリング終了`);
  }

  // 次のジョブを処理
  private async processNextJob() {
    const pollStartTime = Date.now();
    console.log(`🚨🚨🚨 [BackgroundJobWorker] #${this.instanceId} processNextJob 開始 🚨🚨🚨`, {
      timestamp: new Date().toISOString(),
      pollStartTime
    });
    // 🔧 デバッグ: 全ジョブを確認
    console.log(`🔧 [BackgroundJobWorker] #${this.instanceId} 全ジョブを確認中...`);
    const { data: allJobs, error: allError } = await supabase
      .from('background_jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
      
    if (allError) {
      console.error(`🔧 [BackgroundJobWorker] #${this.instanceId} 全ジョブ取得エラー:`, allError);
    } else {
      console.log(`🔧 [BackgroundJobWorker] #${this.instanceId} 最近のジョブ一覧:`, allJobs);
      // 🔧 各ジョブのステータスを詳細表示
      allJobs?.forEach((job, index) => {
        console.log(`🔧 [BackgroundJobWorker] #${this.instanceId} ジョブ${index}: `, {
          id: job.id,
          type: job.type || job.job_type,
          status: job.status,
          meeting_id: job.meeting_id,
          created_at: job.created_at,
          error_message: job.error_message,
          progress: job.progress
        });
      });
    }
    
    // 🔧 古いrunning状態ジョブのクリーンアップ（30分以上running状態のジョブをリセット）
    await this.cleanupStaleRunningJobs();
    
    // 🔧 重複実行防止: 既にrunning状態のジョブがあるかチェック
    const { data: runningJobs, error: runningError } = await supabase
      .from('background_jobs')
      .select('*')
      .eq('status', 'running');
      
    if (runningError) {
      console.error(`🔧 [BackgroundJobWorker] #${this.instanceId} running状態ジョブ取得エラー:`, runningError);
    } else if (runningJobs && runningJobs.length >= 3) {
      console.log(`🔧 [BackgroundJobWorker] #${this.instanceId} running状態ジョブが処理上限に達しています:`, runningJobs.length, '件 - ポーリングをスキップ');
      
      // 🔧 実行中ジョブの詳細ログ
      runningJobs.forEach((runningJob, index) => {
        console.log(`🔧 [BackgroundJobWorker] #${this.instanceId} 実行中ジョブ${index + 1}:`, {
          id: runningJob.id,
          type: runningJob.type || runningJob.job_type,
          meeting_id: runningJob.meeting_id,
          updated_at: runningJob.updated_at,
          progress: runningJob.progress
        });
      });
      
      return; // 処理上限に達している場合のみスキップ
    } else if (runningJobs && runningJobs.length > 0) {
      console.log(`🚨🚨🚨 [BackgroundJobWorker] #${this.instanceId} 現在実行中のジョブ数: ${runningJobs.length}/3 - 処理続行 🚨🚨🚨`);
    }
    
    // pending状態のジョブを取得
    console.log(`🚨🚨🚨 [BackgroundJobWorker] #${this.instanceId} pending状態のジョブを検索中... 🚨🚨🚨`);
    const { data: jobs, error } = await supabase
      .from('background_jobs')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(1);

    if (error) {
      console.error(`🚨🚨🚨 [BackgroundJobWorker] #${this.instanceId} Failed to fetch jobs:`, error);
      return;
    }

    console.log(`🚨🚨🚨 [BackgroundJobWorker] #${this.instanceId} 取得したジョブ数: ${jobs?.length || 0} 🚨🚨🚨`);
    
    if (jobs && jobs.length > 0) {
      const pendingJob = jobs[0];
      console.log(`🚨 [BackgroundJobWorker] #${this.instanceId} 発見したpendingジョブ:`, {
        id: pendingJob.id,
        type: pendingJob.type,
        status: pendingJob.status,
        meeting_id: pendingJob.meeting_id,
        created_at: pendingJob.created_at
      });
      

      
      // ジョブ処理を開始
      await this.processJob(pendingJob);
    } else {
      console.log(`🚨🚨🚨 [BackgroundJobWorker] #${this.instanceId} pendingジョブが見つかりませんでした - 詳細調査開始 🚨🚨🚨`);
      
      // 🔧 全ジョブの状態を確認（statusに関係なく）
      try {
        const { data: allRecentJobs, error: allJobsError } = await supabase
          .from('background_jobs')
          .select('id, type, status, created_at, meeting_id')
          .order('created_at', { ascending: false })
          .limit(5);
          
        if (allJobsError) {
          console.error(`🚨 [BackgroundJobWorker] #${this.instanceId} 全ジョブ取得エラー:`, allJobsError);
        } else {
          console.log(`🚨🚨🚨 [BackgroundJobWorker] #${this.instanceId} 最新5件のジョブ（全status）: 🚨🚨🚨`, allRecentJobs);
          
          // 🔧 各ジョブの詳細を個別に表示
          allRecentJobs?.forEach((job, index) => {
            console.log(`🚨 [BackgroundJobWorker] #${this.instanceId} ジョブ${index + 1}:`, {
              id: job.id,
              type: job.type,
              status: job.status,
              created_at: job.created_at,
              meeting_id: job.meeting_id
            });
          });
        }
      } catch (detailError) {
        console.error(`🚨 [BackgroundJobWorker] #${this.instanceId} ジョブ詳細確認エラー:`, detailError);
      }
    }
    
    // 🔧 デバッグ: pending状態のジョブの詳細を表示
    if (jobs && jobs.length > 0) {
      console.log(`🔧 [BackgroundJobWorker] #${this.instanceId} pending状態のジョブ詳細:`, jobs[0]);
    } else {
      console.log(`🔧 [BackgroundJobWorker] #${this.instanceId} pending状態のジョブが見つかりません`);
      // 🔧 全ステータスのジョブ数を確認
      const { data: statusCounts, error: countError } = await supabase
        .from('background_jobs')
        .select('status')
        .order('created_at', { ascending: false });
      
      if (!countError && statusCounts) {
        const counts = statusCounts.reduce((acc, job) => {
          acc[job.status] = (acc[job.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        console.log(`🔧 [BackgroundJobWorker] #${this.instanceId} ステータス別ジョブ数:`, counts);
      }
    }
    
    if (!jobs || jobs.length === 0) {
      console.log(`🔧 [BackgroundJobWorker] #${this.instanceId} 処理するジョブがありません`);
      return; // 処理するジョブなし
    }

    // 🔧 新しい専用処理ロック機構でジョブを獲得
    const jobToProcess = jobs[0];
    

    console.log(`🔧 [BackgroundJobWorker] #${this.instanceId} 処理ロック獲得試行:`, jobToProcess.id);
    
    // 🔐 安全な処理ロック獲得（30分間有効）
    const { data: lockResult, error: lockError } = await supabase.rpc('acquire_processing_lock', {
      p_job_id: jobToProcess.id,
      p_lock_owner: 'background_worker',
      p_lock_duration_minutes: 30
    });
    
    if (lockError) {
      console.error(`❌ [BackgroundJobWorker] #${this.instanceId} ロック獲得エラー:`, lockError);
      return;
    }
    
    const lockInfo = lockResult[0];
    
    if (!lockInfo.success) {
      console.log(`🚫 [BackgroundJobWorker] #${this.instanceId} ロック獲得失敗: ${lockInfo.message}`);
      return; // ロック失敗時は何もせずに次のポーリングサイクルへ
    }
    
    // ✅ ロック獲得成功
    const lockId = lockInfo.lock_id;
    console.log(`✅ [BackgroundJobWorker] #${this.instanceId} 処理ロック獲得成功: ${lockId} for job ${jobToProcess.id}`);
    
    // ジョブステータスをrunningに更新
    const { error: statusError } = await supabase
      .from('background_jobs')
      .update({ 
        status: 'running',
        updated_at: new Date().toISOString()
      })
      .eq('id', jobToProcess.id);
      
    if (statusError) {
      console.warn(`⚠️ [BackgroundJobWorker] #${this.instanceId} ステータス更新警告:`, statusError);
      // ステータス更新に失敗してもロック解放は不要（別の場所で処理される）
    }
    
    console.log(`🔍 [BackgroundJobWorker] #${this.instanceId} ジョブ処理開始:`, {
      jobId: jobToProcess.id,
      jobType: jobToProcess.type || jobToProcess.job_type,
      meetingId: jobToProcess.meeting_id,
      lockId: lockId,
      timestamp: new Date().toISOString()
    });
    
    // 📦 ジョブ処理を実行（ロック獲得済み）
    try {
      console.log(`🔧 [BackgroundJobWorker] #${this.instanceId} ジョブ処理開始:`, jobToProcess.id);
      const job = this.dbToApp(jobToProcess);
      await this.processJob(job);
      
      // 🔓 処理完了後にロック解放（Edge Functionで完了していない場合のフェイルセーフ）
      try {
        const { data: releaseResult, error: releaseError } = await supabase.rpc('release_processing_lock', {
          p_job_id: jobToProcess.id,
          p_lock_id: lockId
        });
        
        if (releaseError) {
          console.warn(`🔓 [BackgroundJobWorker] #${this.instanceId} ロック解放エラー（無視して継続）:`, releaseError);
        } else {
          const releaseInfo = releaseResult[0];
          if (releaseInfo.success) {
            console.log(`✅ [BackgroundJobWorker] #${this.instanceId} ロック解放成功: ${lockId}`);
          } else {
            console.log(`🔓 [BackgroundJobWorker] #${this.instanceId} ロック解放スキップ: ${releaseInfo.message}`);
          }
        }
      } catch (releaseError) {
        console.warn(`🧹 [BackgroundJobWorker] #${this.instanceId} ロック解放で例外（無視して継続）:`, releaseError);
      }
      
    } catch (processError) {
      console.error(`❌ [BackgroundJobWorker] #${this.instanceId} ジョブ処理エラー:`, processError);
      
      // 🔓 エラー時もロック解放
      try {
        const { data: releaseResult, error: releaseError } = await supabase.rpc('release_processing_lock', {
          p_job_id: jobToProcess.id,
          p_lock_id: lockId
        });
        
        if (releaseError) {
          console.warn(`🔓 [BackgroundJobWorker] #${this.instanceId} エラー時ロック解放エラー:`, releaseError);
        } else {
          const releaseInfo = releaseResult[0];
          if (releaseInfo.success) {
            console.log(`✅ [BackgroundJobWorker] #${this.instanceId} エラー時ロック解放成功: ${lockId}`);
          }
        }
      } catch (releaseError) {
        console.warn(`🧹 [BackgroundJobWorker] #${this.instanceId} エラー時ロック解放で例外:`, releaseError);
      }
      
      // エラーを再投げはしない（ポーリングを継続）
    }
  }

  // 🔧 古いrunning状態ジョブのクリーンアップ
  private async cleanupStaleRunningJobs() {
    try {
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      
      const { data: staleJobs, error } = await supabase
        .from('background_jobs')
        .select('*')
        .eq('status', 'running')
        .lt('updated_at', thirtyMinutesAgo);
        
      if (error) {
        console.error(`🔧 [BackgroundJobWorker] #${this.instanceId} 古いジョブ取得エラー:`, error);
        return;
      }
      
      if (staleJobs && staleJobs.length > 0) {
        console.log(`🔧 [BackgroundJobWorker] #${this.instanceId} 古いrunning状態ジョブをリセット:`, staleJobs.length, '件');
        
        for (const staleJob of staleJobs) {
          console.log(`🔧 [BackgroundJobWorker] #${this.instanceId} 古いジョブをリセット:`, staleJob.id);
          
          const { error: resetError } = await supabase
            .from('background_jobs')
            .update({ 
              status: 'failed',
              error_message: '長時間running状態のため自動リセット',
              updated_at: new Date().toISOString()
            })
            .eq('id', staleJob.id);
            
          if (resetError) {
            console.error(`🔧 [BackgroundJobWorker] #${this.instanceId} ジョブリセットエラー:`, resetError);
          }
        }
      }
    } catch (error) {
      console.error(`🔧 [BackgroundJobWorker] #${this.instanceId} クリーンアップ処理エラー:`, error);
    }
  }

  // シンプルなジョブ処理
  private async processJob(job: BackgroundJob) {
    console.log(`🔧 [BackgroundJobWorker] #${this.instanceId} ジョブ処理開始: ${job.id} (${job.type})`);
    console.log(`🔧 [BackgroundJobWorker] #${this.instanceId} ジョブ詳細:`, {
      id: job.id,
      type: job.type,
      status: job.status,
      meetingId: job.meetingId,
      userId: job.userId,
      metadata: job.metadata,
      progress: job.progress,
      errorMessage: job.errorMessage
    });
    
    // 🔧 デバッグ: 登録されているプロセッサーを確認
    console.log(`🔧 [BackgroundJobWorker] #${this.instanceId} 登録済みプロセッサー:`, Array.from(this.processors.keys()));
    console.log(`🔧 [BackgroundJobWorker] #${this.instanceId} 要求されたジョブタイプ:`, job.type);

    // 🔧 ジョブは既にロック時にrunning状態に更新済み
    console.log(`🔧 [BackgroundJobWorker] #${this.instanceId} ジョブは既にrunning状態です:`, job.id);

    try {
      console.log(`🔧 [BackgroundJobWorker] #${this.instanceId} プロセッサー取得開始...`);
      


      
      const processor = this.processors.get(job.type);
      
      if (!processor) {
        console.error(`🔧 [BackgroundJobWorker] #${this.instanceId} プロセッサーが見つかりません:`, job.type);
        throw new Error(`Unknown job type: ${job.type}`);
      }
      
      console.log(`🔧 [BackgroundJobWorker] #${this.instanceId} プロセッサー取得成功:`, job.type);
      console.log(`🔧 [BackgroundJobWorker] #${this.instanceId} プロセッサー呼び出し開始:`, job.type);
      console.log(`🔧 [BackgroundJobWorker] #${this.instanceId} ジョブ詳細:`, {
        id: job.id,
        type: job.type,
        meetingId: job.meetingId,
        userId: job.userId,
        metadata: job.metadata
      });
      
      const result = await processor.process(job);
      
      console.log(`🔧 [BackgroundJobWorker] #${this.instanceId} プロセッサー処理完了:`, job.type);
      
      // 🔧 Edge Function側でステータス更新を行うため、BackgroundJobWorker側でのステータス更新は省略
      console.log(`🔧 [BackgroundJobWorker] #${this.instanceId} Edge Function側でステータス更新が行われるため、ステータス更新をスキップ:`, job.id);
      
      // 通知は送信（ユーザー体験のため）
      await this.sendCompletionNotification(job, true, result);
      
    } catch (error) {
      console.error(`🔧 [BackgroundJobWorker] #${this.instanceId} ジョブ処理エラー:`, error);
      console.error(`🔧 [BackgroundJobWorker] #${this.instanceId} エラー詳細:`, {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        jobId: job.id,
        jobType: job.type,
        meetingId: job.meetingId
      });
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // 🔧 Edge Function側でステータス更新を行うため、BackgroundJobWorker側でのステータス更新は省略
      console.log(`🔧 [BackgroundJobWorker] #${this.instanceId} Edge Function側でステータス更新が行われるため、エラー時ステータス更新をスキップ:`, job.id);
      
      // 通知は送信（ユーザー体験のため）
      await this.sendCompletionNotification(job, false, undefined, errorMessage);
    }
  }

  // ジョブ完了通知送信
  private async sendCompletionNotification(
    job: BackgroundJob, 
    success: boolean, 
    result?: any, 
    errorMessage?: string
  ) {
    try {
      await NotificationService.createJobCompletionNotification(
        job.userId,
        job.type,
        job.id,
        job.meetingId,
        success,
        result,
        errorMessage
      );
      
      console.log(`🔧 [BackgroundJobWorker] #${this.instanceId} Notification sent for job ${job.id}`);
    } catch (error) {
      console.error(`🔧 [BackgroundJobWorker] #${this.instanceId} Failed to send notification for job ${job.id}:`, error);
    }
  }

  // シンプルなジョブステータス更新
  private async updateJobStatus(
    jobId: string, 
    status: JobStatus, 
    progress: number, 
    result?: any, 
    errorMessage?: string
  ) {
    const updateData: any = {
      status,
      progress,
      updated_at: new Date().toISOString()
    };

    if (result !== undefined) {
      updateData.result = result;
    }

    if (errorMessage) {
      updateData.error_message = errorMessage;
    }

    const { error } = await supabase
      .from('background_jobs')
      .update(updateData)
      .eq('id', jobId);

    if (error) {
      console.error(`🔧 [BackgroundJobWorker] #${this.instanceId} Failed to update job status:`, error);
    }
  }



  // データベース形式からアプリ形式に変換
  private dbToApp(dbJob: any): BackgroundJob {
    console.log(`🔧 [BackgroundJobWorker] #${this.instanceId} dbToApp変換:`, {
      id: dbJob.id,
      type: dbJob.type,
      meeting_id: dbJob.meeting_id,
      user_id: dbJob.user_id,
      allFields: Object.keys(dbJob)
    });

    return {
      id: dbJob.id,
      type: dbJob.type,
      status: dbJob.status,
      meetingId: dbJob.meeting_id,
      userId: dbJob.user_id,
      progress: dbJob.progress,
      result: dbJob.result,
      errorMessage: dbJob.error_message,
      metadata: dbJob.metadata,
      createdAt: new Date(dbJob.created_at),
      updatedAt: new Date(dbJob.updated_at),
      estimatedCompletion: dbJob.estimated_completion ? new Date(dbJob.estimated_completion) : undefined
    };
  }
}

// グローバルワーカーインスタンス
let globalWorker: BackgroundJobWorker | null = null;
let instanceCounter = 0; // インスタンス識別用カウンター

// ワーカー開始関数
export const startBackgroundJobWorker = () => {
  console.log(`🚨🚨🚨 [BackgroundJobWorker] startBackgroundJobWorker 呼び出し 🚨🚨🚨`);
  
  // 🔧 既にワーカーが起動中の場合は何もしない
  if (globalWorker) {
    console.log(`🚨 [BackgroundJobWorker] 既にワーカーが起動中のため、重複起動をスキップ - globalWorker exists:`, !!globalWorker);
    console.log(`🚨 [BackgroundJobWorker] 既存ワーカー状態:`, {
      isRunning: 'private',
      instanceId: 'private'
    });
    return;
  }
  
  const instanceId = ++instanceCounter;
  console.log(`🚨🚨🚨 [BackgroundJobWorker] #${instanceId}: 新しいワーカーインスタンス作成開始 🚨🚨🚨`);
  
  try {
    globalWorker = new BackgroundJobWorker(instanceId);
    console.log(`🚨 [BackgroundJobWorker] #${instanceId}: インスタンス作成成功、start()呼び出し開始`);
    globalWorker.start();
    console.log(`🚨🚨🚨 [BackgroundJobWorker] #${instanceId}: start()呼び出し完了 🚨🚨🚨`);
  } catch (error) {
    console.error(`🚨🚨🚨 [BackgroundJobWorker] #${instanceId}: ワーカー起動エラー:`, error);
  }
};

// ワーカー停止関数
export const stopBackgroundJobWorker = () => {
  if (globalWorker) {
    console.log(`🔧 [BackgroundJobWorker] グローバルワーカー停止`);
    globalWorker.stop();
    globalWorker = null;
  }
}; 