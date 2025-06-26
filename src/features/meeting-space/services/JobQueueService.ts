import { supabase } from '../../../services/supabase/client';
import type { 
  BackgroundJob, 
  CreateJobRequest, 
  UpdateJobRequest, 
  JobType, 
  JobStatus
} from '../types/backgroundJob';
import { EstimatedDuration, RetryConfiguration } from '../types/backgroundJob';

export class JobQueueService {
  // 🔧 動的な推定完了時間を計算
  private static async calculateEstimatedCompletion(jobType: JobType): Promise<Date> {
    const baseDuration = EstimatedDuration[jobType];
    
    // 同じタイプの最近のジョブの平均処理時間を取得
    const { data: recentJobs } = await supabase
      .from('background_jobs')
      .select('created_at, updated_at')
      .eq('type', jobType)
      .eq('status', 'completed')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // 過去7日
      .order('updated_at', { ascending: false })
      .limit(10);

    if (recentJobs && recentJobs.length > 0) {
      // 平均処理時間を計算
      const totalDuration = recentJobs.reduce((sum, job) => {
        const start = new Date(job.created_at);
        const end = new Date(job.updated_at);
        return sum + (end.getTime() - start.getTime());
      }, 0);
      
      const avgDurationMs = totalDuration / recentJobs.length;
      const avgDurationMinutes = Math.ceil(avgDurationMs / (1000 * 60));
      
      // ベース時間と実績平均の間で調整（重み付き平均）
      const adjustedDuration = Math.ceil((baseDuration + avgDurationMinutes) / 2);
      
      console.log(`[JobQueueService] Estimated duration for ${jobType}: ${adjustedDuration}min (base: ${baseDuration}min, avg: ${avgDurationMinutes}min)`);
      
      return new Date(Date.now() + adjustedDuration * 60 * 1000);
    }
    
    // データ不足の場合はベース時間を使用
    return new Date(Date.now() + baseDuration * 60 * 1000);
  }

  /**
   * 🔧 強化されたジョブキューへの追加（リトライ設定付き）
   */
  static async enqueueJob(request: CreateJobRequest): Promise<string> {
    try {
      const estimatedCompletion = await this.calculateEstimatedCompletion(request.type);
      const retryConfig = RetryConfiguration[request.type];

      const { data, error } = await supabase
        .from('background_jobs')
        .insert({
          type: request.type,
          meeting_id: request.meetingId,
          user_id: request.userId,
          metadata: request.metadata || {},
          estimated_completion: estimatedCompletion.toISOString(),
          status: 'pending',
          progress: 0,
          // 🔧 リトライ設定を追加
          retry_count: 0,
          max_retries: retryConfig.maxRetries,
          timeout_at: new Date(Date.now() + retryConfig.timeoutMinutes * 60 * 1000).toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to enqueue job:', error);
        throw error;
      }

      console.log(`Job enqueued: ${data.id} (${request.type})`);
      return data.id;
    } catch (error) {
      console.error('Error in enqueueJob:', error);
      throw new Error('ジョブの作成に失敗しました');
    }
  }

  /**
   * ジョブステータスを取得
   */
  static async getJobStatus(jobId: string): Promise<BackgroundJob | null> {
    try {
      const { data, error } = await supabase
        .from('background_jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Job not found
        }
        console.error('Failed to get job status:', error);
        throw error;
      }

      return this.mapDatabaseToJob(data);
    } catch (error) {
      console.error('Error in getJobStatus:', error);
      return null;
    }
  }

  /**
   * ユーザーのジョブ一覧を取得
   */
  static async getUserJobs(userId: string, limit: number = 20): Promise<BackgroundJob[]> {
    try {
      const { data, error } = await supabase
        .from('background_jobs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Failed to get user jobs:', error);
        throw error;
      }

      return data.map(this.mapDatabaseToJob);
    } catch (error) {
      console.error('Error in getUserJobs:', error);
      return [];
    }
  }

  /**
   * 実行中のジョブを取得
   */
  static async getActiveJobs(userId: string): Promise<BackgroundJob[]> {
    try {
      const { data, error } = await supabase
        .from('background_jobs')
        .select('*')
        .eq('user_id', userId)
        .in('status', ['pending', 'running'])
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to get active jobs:', error);
        throw error;
      }

      return data.map(this.mapDatabaseToJob);
    } catch (error) {
      console.error('Error in getActiveJobs:', error);
      return [];
    }
  }

  /**
   * ミーティングに関連するジョブを取得
   */
  static async getMeetingJobs(meetingId: string): Promise<BackgroundJob[]> {
    try {
      const { data, error } = await supabase
        .from('background_jobs')
        .select('*')
        .eq('meeting_id', meetingId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Failed to get meeting jobs:', error);
        throw error;
      }

      return data.map(this.mapDatabaseToJob);
    } catch (error) {
      console.error('Error in getMeetingJobs:', error);
      return [];
    }
  }

  /**
   * ジョブを更新
   */
  static async updateJob(jobId: string, updates: UpdateJobRequest): Promise<boolean> {
    try {
      const updateData: any = {};
      
      if (updates.progress !== undefined) updateData.progress = updates.progress;
      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.result !== undefined) updateData.result = updates.result;
      if (updates.errorMessage !== undefined) updateData.error_message = updates.errorMessage;
      if (updates.metadata !== undefined) updateData.metadata = updates.metadata;
      if (updates.estimatedCompletion !== undefined) {
        updateData.estimated_completion = updates.estimatedCompletion.toISOString();
      }

      const { error } = await supabase
        .from('background_jobs')
        .update(updateData)
        .eq('id', jobId);

      if (error) {
        console.error('Failed to update job:', error);
        throw error;
      }

      console.log(`Job updated: ${jobId}`, updates);
      return true;
    } catch (error) {
      console.error('Error in updateJob:', error);
      return false;
    }
  }

  /**
   * ジョブをキャンセル
   */
  static async cancelJob(jobId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('background_jobs')
        .update({ status: 'cancelled' })
        .eq('id', jobId)
        .in('status', ['pending', 'running']);

      if (error) {
        console.error('Failed to cancel job:', error);
        throw error;
      }

      console.log(`Job cancelled: ${jobId}`);
      return true;
    } catch (error) {
      console.error('Error in cancelJob:', error);
      return false;
    }
  }

  /**
   * ジョブ進捗を更新
   */
  static async updateProgress(
    jobId: string, 
    progress: number, 
    message?: string
  ): Promise<boolean> {
    try {
      const updates: UpdateJobRequest = { 
        progress,
        status: progress === 100 ? 'completed' : 'running'
      };

      const success = await this.updateJob(jobId, updates);

      // ログエントリを追加
      if (success && message) {
        await this.addJobLog(jobId, progress, message);
      }

      return success;
    } catch (error) {
      console.error('Error in updateProgress:', error);
      return false;
    }
  }

  /**
   * ジョブ完了処理
   */
  static async completeJob(
    jobId: string, 
    result: any, 
    success: boolean = true
  ): Promise<boolean> {
    try {
      const updates: UpdateJobRequest = {
        status: success ? 'completed' : 'failed',
        progress: 100,
        result: success ? result : undefined,
        errorMessage: success ? undefined : result?.message || '処理に失敗しました'
      };

      const updateSuccess = await this.updateJob(jobId, updates);

      if (updateSuccess) {
        await this.addJobLog(
          jobId, 
          100, 
          success ? '処理が完了しました' : '処理に失敗しました'
        );
      }

      return updateSuccess;
    } catch (error) {
      console.error('Error in completeJob:', error);
      return false;
    }
  }

  /**
   * ジョブログを追加
   */
  private static async addJobLog(
    jobId: string, 
    progress: number, 
    message: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('background_job_logs')
        .insert({
          job_id: jobId,
          status: progress === 100 ? 'completed' : 'running',
          progress,
          message,
          metadata: metadata || {}
        });

      if (error) {
        console.error('Failed to add job log:', error);
      }
    } catch (error) {
      console.error('Error in addJobLog:', error);
    }
  }

  /**
   * データベースレコードをジョブオブジェクトにマップ
   */
  private static mapDatabaseToJob(data: any): BackgroundJob {
    return {
      id: data.id,
      type: data.type as JobType,
      status: data.status as JobStatus,
      meetingId: data.meeting_id,
      userId: data.user_id,
      progress: data.progress || 0,
      result: data.result,
      errorMessage: data.error_message,
      metadata: data.metadata || {},
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      estimatedCompletion: data.estimated_completion 
        ? new Date(data.estimated_completion) 
        : undefined
    };
  }

  /**
   * ジョブタイプに基づく推定完了時間を計算
   */
} 