import { supabase } from './supabase/client';
import { BackgroundJob, JobType, JobStatus, RetryConfiguration } from '../features/meeting-space/types/backgroundJob';
import { NotificationService } from '../features/notifications/services/NotificationService';
import { generateMeetingSummary, extractCardsFromMeeting, generateMockSummary, generateMockCards } from './ai/openai';
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
    
    // 実際のtranscriptがある場合は本格的な要約、そうでなければモック
    if (meeting.transcript && meeting.transcript.trim().length > 100) {
      try {
        summary = await generateMeetingSummary(meeting.transcript, context);
      } catch (error) {
        console.error('[AISummaryProcessor] AI summary failed, using mock:', error);
        summary = generateMockSummary();
      }
    } else {
      summary = generateMockSummary();
    }

    // Step 3: データベース保存 (100%)
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
    console.log(`[CardExtractionProcessor] Processing job ${job.id}`);

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

    // Step 2: カード抽出処理 (50%)
    await this.updateProgress(job.id, 50, 'カードを抽出中...');
    
    let extractedCards: any[];
    let provider: string | undefined;
    
    // ユーザーコンテキストを設定
    const context = {
      userId: job.userId || 'system',
      nestId: meeting.nest_id,
      meetingId: job.meetingId
    };
    
    // 実際のtranscriptがある場合は本格的な抽出、そうでなければモック
    if (meeting.transcript && meeting.transcript.trim().length > 100) {
      try {
        const result = await extractCardsFromMeeting(job.meetingId, context);
        // 戻り値の型を確認して適切に処理
        if (Array.isArray(result)) {
          extractedCards = result;
          provider = 'openai'; // 配列の場合はデフォルト
        } else if (result && typeof result === 'object' && 'cards' in result) {
          extractedCards = result.cards;
          provider = result.provider;
        } else {
          extractedCards = [];
          provider = 'openai';
        }
      } catch (error) {
        console.error('[CardExtractionProcessor] Card extraction failed, using mock:', error);
        extractedCards = generateMockCards();
        provider = 'openai'; // モックの場合はデフォルト
      }
    } else {
      extractedCards = generateMockCards();
      provider = 'openai'; // モックの場合はデフォルト
    }

    // Step 3: ボードへの保存 (75%)
    await this.updateProgress(job.id, 75, 'カードをボードに保存中...');
    
    let savedCards: any[] = [];
    
    if (extractedCards.length > 0) {
      try {
        // デフォルトボードを取得または作成
        const boardId = await getOrCreateDefaultBoard(meeting.nest_id, job.userId || 'system');
        
        // カードをボードに追加（プロバイダー情報を渡す）
        savedCards = await addCardsToBoard(
          boardId,
          extractedCards,
          job.userId || 'system',
          job.meetingId,
          provider
        );
        
        // 出典紐付け
        const meetingSource = await getOrCreateMeetingSource(job.meetingId, meeting.title);
        await Promise.all(savedCards.map(card => addCardSource({ card_id: card.id, source_id: meetingSource.id })));
        
      } catch (error) {
        console.error('[CardExtractionProcessor] Failed to save cards to board:', error);
        // ボード保存に失敗してもジョブは成功とする
      }
    }

    // Step 4: 完了 (100%)
    await this.updateProgress(job.id, 100, 'カード抽出完了');

    const result = {
      cards: savedCards,
      cardCount: savedCards.length,
      extractedCount: extractedCards.length,
      meetingId: job.meetingId,
      timestamp: new Date().toISOString()
    };

    console.log(`[CardExtractionProcessor] Job ${job.id} completed with ${savedCards.length} saved cards`);
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



// ワーカーマネージャー
export class BackgroundJobWorker {
  private processors: Map<JobType, JobProcessor> = new Map();
  private isRunning = false;
  private pollingInterval = 5000; // 5秒間隔（通常運用）

  constructor() {
    console.log('🔧 [BackgroundJobWorker] コンストラクタ開始');
    
    this.processors.set('ai_summary', new AISummaryProcessor());
    this.processors.set('card_extraction', new CardExtractionProcessor());
    this.processors.set('transcription', new TranscriptionProcessor());
    
    console.log('🔧 [BackgroundJobWorker] プロセッサー登録完了:', Array.from(this.processors.keys()));
  }

  // ワーカー開始
  async start() {
    console.log('🔧 [BackgroundJobWorker] start() メソッド呼び出し');
    
    if (this.isRunning) {
      console.log('🔧 [BackgroundJobWorker] 既に実行中です');
      return;
    }

    this.isRunning = true;
    console.log('🔧 [BackgroundJobWorker] ワーカー開始');
    
    this.poll();
    console.log('🔧 [BackgroundJobWorker] poll() メソッド呼び出し完了');
  }

  // ワーカー停止
  stop() {
    console.log('[BackgroundJobWorker] Stopping worker...');
    this.isRunning = false;
  }

  // ポーリング処理
  private async poll() {
    console.log('🔧 [BackgroundJobWorker] ポーリング開始');
    while (this.isRunning) {
      try {
        console.log('🔧 [BackgroundJobWorker] 次のジョブを探しています...');
        await this.processNextJob();
      } catch (error) {
        console.error('[BackgroundJobWorker] Polling error:', error);
      }
      
      await new Promise(resolve => setTimeout(resolve, this.pollingInterval));
    }
    console.log('🔧 [BackgroundJobWorker] ポーリング終了');
  }

  // 次のジョブを処理
  private async processNextJob() {
    // 🔧 デバッグ: 全ジョブを確認
    console.log('🔧 [BackgroundJobWorker] 全ジョブを確認中...');
    const { data: allJobs, error: allError } = await supabase
      .from('background_jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
      
    if (allError) {
      console.error('🔧 [BackgroundJobWorker] 全ジョブ取得エラー:', allError);
    } else {
      console.log('🔧 [BackgroundJobWorker] 最近のジョブ一覧:', allJobs);
      // 🔧 各ジョブのステータスを詳細表示
      allJobs?.forEach((job, index) => {
        console.log(`🔧 [BackgroundJobWorker] ジョブ${index}: `, {
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
      console.error('🔧 [BackgroundJobWorker] running状態ジョブ取得エラー:', runningError);
    } else if (runningJobs && runningJobs.length > 0) {
      console.log('🔧 [BackgroundJobWorker] 既にrunning状態のジョブがあります:', runningJobs.length, '件');
      console.log('🔧 [BackgroundJobWorker] 重複実行を防ぐため処理をスキップします');
      
      // 🔧 重複実行の詳細ログ
      runningJobs.forEach((runningJob, index) => {
        console.log(`🔧 [BackgroundJobWorker] 重複実行防止 - ジョブ${index}:`, {
          id: runningJob.id,
          type: runningJob.type || runningJob.job_type,
          meeting_id: runningJob.meeting_id,
          updated_at: runningJob.updated_at,
          progress: runningJob.progress
        });
      });
      
      return; // 既に処理中のジョブがある場合はスキップ
    }
    
    // pending状態のジョブを取得
    console.log('🔧 [BackgroundJobWorker] pending状態のジョブを検索中...');
    const { data: jobs, error } = await supabase
      .from('background_jobs')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(1);

    if (error) {
      console.error('🔧 [BackgroundJobWorker] Failed to fetch jobs:', error);
      return;
    }

    console.log('🔧 [BackgroundJobWorker] 取得したジョブ数:', jobs?.length || 0);
    
    // 🔧 デバッグ: pending状態のジョブの詳細を表示
    if (jobs && jobs.length > 0) {
      console.log('🔧 [BackgroundJobWorker] pending状態のジョブ詳細:', jobs[0]);
    } else {
      console.log('🔧 [BackgroundJobWorker] pending状態のジョブが見つかりません');
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
        console.log('🔧 [BackgroundJobWorker] ステータス別ジョブ数:', counts);
      }
    }
    
    if (!jobs || jobs.length === 0) {
      console.log('🔧 [BackgroundJobWorker] 処理するジョブがありません');
      return; // 処理するジョブなし
    }

    // 🔧 重複実行防止: ジョブをロックしてから処理開始
    const jobToProcess = jobs[0];
    console.log('🔧 [BackgroundJobWorker] ジョブロック試行:', jobToProcess.id);
    
    // ジョブをpendingからrunningに更新（ロック）
    const { error: lockError } = await supabase
      .from('background_jobs')
      .update({ 
        status: 'running',
        updated_at: new Date().toISOString()
      })
      .eq('id', jobToProcess.id)
      .eq('status', 'pending'); // まだpending状態の場合のみ更新
    
    if (lockError) {
      console.error('🔧 [BackgroundJobWorker] ジョブロック失敗:', lockError);
      return;
    }
    
    // ロックが成功したか確認
    const { data: lockedJob, error: checkError } = await supabase
      .from('background_jobs')
      .select('*')
      .eq('id', jobToProcess.id)
      .single();
      
    if (checkError || !lockedJob || lockedJob.status !== 'running') {
      console.log('🔧 [BackgroundJobWorker] ジョブロック失敗 - 他のワーカーが処理中:', jobToProcess.id);
      return; // ロックに失敗した場合（他のワーカーが既に処理中）
    }
    
    console.log('🔧 [BackgroundJobWorker] ジョブロック成功:', jobToProcess.id);
    console.log('🔧 [BackgroundJobWorker] ジョブ処理開始:', jobToProcess);
    const job = this.dbToApp(jobToProcess);
    await this.processJob(job);
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
        console.error('🔧 [BackgroundJobWorker] 古いジョブ取得エラー:', error);
        return;
      }
      
      if (staleJobs && staleJobs.length > 0) {
        console.log('🔧 [BackgroundJobWorker] 古いrunning状態ジョブをリセット:', staleJobs.length, '件');
        
        for (const staleJob of staleJobs) {
          console.log('🔧 [BackgroundJobWorker] 古いジョブをリセット:', staleJob.id);
          
          const { error: resetError } = await supabase
            .from('background_jobs')
            .update({ 
              status: 'failed',
              error_message: '長時間running状態のため自動リセット',
              updated_at: new Date().toISOString()
            })
            .eq('id', staleJob.id);
            
          if (resetError) {
            console.error('🔧 [BackgroundJobWorker] ジョブリセットエラー:', resetError);
          }
        }
      }
    } catch (error) {
      console.error('🔧 [BackgroundJobWorker] クリーンアップ処理エラー:', error);
    }
  }

  // シンプルなジョブ処理
  private async processJob(job: BackgroundJob) {
    console.log(`🔧 [BackgroundJobWorker] ジョブ処理開始: ${job.id} (${job.type})`);
    console.log(`🔧 [BackgroundJobWorker] ジョブ詳細:`, {
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
    console.log('🔧 [BackgroundJobWorker] 登録済みプロセッサー:', Array.from(this.processors.keys()));
    console.log('🔧 [BackgroundJobWorker] 要求されたジョブタイプ:', job.type);

    // 🔧 ジョブは既にロック時にrunning状態に更新済み
    console.log('🔧 [BackgroundJobWorker] ジョブは既にrunning状態です:', job.id);

    try {
      console.log('🔧 [BackgroundJobWorker] プロセッサー取得開始...');
      const processor = this.processors.get(job.type);
      
      if (!processor) {
        console.error('🔧 [BackgroundJobWorker] プロセッサーが見つかりません:', job.type);
        throw new Error(`Unknown job type: ${job.type}`);
      }
      
      console.log('🔧 [BackgroundJobWorker] プロセッサー取得成功:', job.type);
      console.log('🔧 [BackgroundJobWorker] プロセッサー呼び出し開始:', job.type);
      console.log('🔧 [BackgroundJobWorker] ジョブ詳細:', {
        id: job.id,
        type: job.type,
        meetingId: job.meetingId,
        userId: job.userId,
        metadata: job.metadata
      });
      
      const result = await processor.process(job);
      
      console.log('🔧 [BackgroundJobWorker] プロセッサー処理完了:', job.type);
      
      await this.updateJobStatus(job.id, 'completed', 100, result);
      await this.sendCompletionNotification(job, true, result);
      
    } catch (error) {
      console.error('🔧 [BackgroundJobWorker] ジョブ処理エラー:', error);
      console.error('🔧 [BackgroundJobWorker] エラー詳細:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        jobId: job.id,
        jobType: job.type,
        meetingId: job.meetingId
      });
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.updateJobStatus(job.id, 'failed', 0, undefined, errorMessage);
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
      
      console.log(`[BackgroundJobWorker] Notification sent for job ${job.id}`);
    } catch (error) {
      console.error(`[BackgroundJobWorker] Failed to send notification for job ${job.id}:`, error);
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
      console.error('[BackgroundJobWorker] Failed to update job status:', error);
    }
  }



  // データベース形式からアプリ形式に変換
  private dbToApp(dbJob: any): BackgroundJob {
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

// ワーカー開始関数
export const startBackgroundJobWorker = () => {
  console.log('🔧 [BackgroundJobWorker] startBackgroundJobWorker 呼び出し');
  
  // 🔧 強制的に既存ワーカーを停止して新しいインスタンスを作成
  if (globalWorker) {
    console.log('🔧 [BackgroundJobWorker] 既存ワーカーを停止します');
    globalWorker.stop();
    globalWorker = null;
  }
  
  console.log('🔧 [BackgroundJobWorker] 新しいワーカーインスタンス作成');
  globalWorker = new BackgroundJobWorker();
  globalWorker.start();
};

// ワーカー停止関数
export const stopBackgroundJobWorker = () => {
  if (globalWorker) {
    globalWorker.stop();
  }
}; 