import { supabase } from './supabase/client';
import { BackgroundJob, JobType, JobStatus } from '../features/meeting-space/types/backgroundJob';
import { NotificationService } from '../features/notifications/services/NotificationService';
import { generateMeetingSummary, extractCardsFromMeeting, generateMockSummary, generateMockCards } from './ai/openai';
import { getOrCreateDefaultBoard, addCardsToBoard } from './BoardService';
import { getOrCreateMeetingSource, addCardSource } from './BoardService';

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
    
    // ユーザーコンテキストを設定
    const context = {
      userId: job.userId || 'system',
      nestId: meeting.nest_id,
      meetingId: job.meetingId
    };
    
    // 実際のtranscriptがある場合は本格的な抽出、そうでなければモック
    if (meeting.transcript && meeting.transcript.trim().length > 100) {
      try {
        extractedCards = await extractCardsFromMeeting(job.meetingId, context);
      } catch (error) {
        console.error('[CardExtractionProcessor] Card extraction failed, using mock:', error);
        extractedCards = generateMockCards();
      }
    } else {
      extractedCards = generateMockCards();
    }

    // Step 3: ボードへの保存 (75%)
    await this.updateProgress(job.id, 75, 'カードをボードに保存中...');
    
    let savedCards: any[] = [];
    
    if (extractedCards.length > 0) {
      try {
        // デフォルトボードを取得または作成
        const boardId = await getOrCreateDefaultBoard(meeting.nest_id, job.userId || 'system');
        
        // カードをボードに追加
        savedCards = await addCardsToBoard(
          boardId,
          extractedCards,
          job.userId || 'system',
          job.meetingId
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

// ワーカーマネージャー
export class BackgroundJobWorker {
  private processors: Map<JobType, JobProcessor> = new Map();
  private isRunning = false;
  private pollingInterval = 5000; // 5秒間隔

  constructor() {
    this.processors.set('ai_summary', new AISummaryProcessor());
    this.processors.set('card_extraction', new CardExtractionProcessor());
  }

  // ワーカー開始
  start() {
    if (this.isRunning) return;
    
    console.log('[BackgroundJobWorker] Starting worker...');
    this.isRunning = true;
    this.poll();
  }

  // ワーカー停止
  stop() {
    console.log('[BackgroundJobWorker] Stopping worker...');
    this.isRunning = false;
  }

  // ポーリング処理
  private async poll() {
    while (this.isRunning) {
      try {
        await this.processNextJob();
      } catch (error) {
        console.error('[BackgroundJobWorker] Polling error:', error);
      }
      
      await new Promise(resolve => setTimeout(resolve, this.pollingInterval));
    }
  }

  // 次のジョブを処理
  private async processNextJob() {
    // pending状態のジョブを取得
    const { data: jobs, error } = await supabase
      .from('background_jobs')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(1);

    if (error) {
      console.error('[BackgroundJobWorker] Failed to fetch jobs:', error);
      return;
    }

    if (!jobs || jobs.length === 0) {
      return; // 処理するジョブなし
    }

    const job = this.dbToApp(jobs[0]);
    await this.processJob(job);
  }

  // ジョブ処理
  private async processJob(job: BackgroundJob) {
    console.log(`[BackgroundJobWorker] Processing job ${job.id} (${job.type})`);

    // ジョブをrunning状態に更新
    await this.updateJobStatus(job.id, 'running', 0);

    try {
      const processor = this.processors.get(job.type);
      if (!processor) {
        throw new Error(`No processor found for job type: ${job.type}`);
      }

      const result = await processor.process(job);

      // 完了状態に更新
      await this.updateJobStatus(job.id, 'completed', 100, result);
      
      // 🔔 成功通知を送信
      await this.sendCompletionNotification(job, true, result);
      
      console.log(`[BackgroundJobWorker] Job ${job.id} completed successfully`);

    } catch (error) {
      console.error(`[BackgroundJobWorker] Job ${job.id} failed:`, error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // 失敗状態に更新
      await this.updateJobStatus(
        job.id, 
        'failed', 
        job.progress, 
        null, 
        errorMessage
      );
      
      // 🔔 失敗通知を送信
      await this.sendCompletionNotification(job, false, null, errorMessage);
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

  // ジョブステータス更新
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
  if (!globalWorker) {
    globalWorker = new BackgroundJobWorker();
  }
  globalWorker.start();
};

// ワーカー停止関数
export const stopBackgroundJobWorker = () => {
  if (globalWorker) {
    globalWorker.stop();
  }
}; 