import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../services/supabase/client';
import { BackgroundJob, JobType, JobStatus } from '../types/backgroundJob';

// UUID形式チェック
const isValidUUID = (uuid: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

// データベースの snake_case 形式
interface DbBackgroundJob {
  id: string;
  type: JobType;
  status: JobStatus;
  meeting_id: string;
  user_id: string;
  progress: number;
  result?: any;
  error_message?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
  estimated_completion?: string;
}

// データベース形式からアプリ形式に変換
const dbToApp = (dbJob: DbBackgroundJob): BackgroundJob => ({
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
});

interface UseBackgroundJobsResult {
  jobs: BackgroundJob[];
  activeJobs: BackgroundJob[];
  isLoading: boolean;
  error: string | null;
  createJob: (type: JobType, meetingId: string, metadata?: Record<string, any>) => Promise<BackgroundJob | null>;
  getJobsByMeeting: (meetingId: string) => BackgroundJob[];
  cancelJob: (jobId: string) => Promise<boolean>;
  retryJob: (jobId: string) => Promise<boolean>;
}

export const useBackgroundJobs = (): UseBackgroundJobsResult => {
  const [jobs, setJobs] = useState<BackgroundJob[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 初期ジョブ読み込み
  const loadJobs = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('[useBackgroundJobs] Loading jobs...');

      const { data, error: fetchError } = await supabase
        .from('background_jobs')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) {
        console.error('[useBackgroundJobs] Fetch error:', fetchError);
        throw fetchError;
      }

      console.log('[useBackgroundJobs] Loaded jobs:', data);
      const convertedJobs = (data || []).map((dbJob: DbBackgroundJob) => dbToApp(dbJob));
      setJobs(convertedJobs);
    } catch (err) {
      console.error('[useBackgroundJobs] Load error:', err);
      setError(err instanceof Error ? err.message : 'ジョブの読み込みに失敗しました');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // リアルタイム更新設定
  useEffect(() => {
    loadJobs();

    // Supabase Realtimeで変更を監視
    const subscription = supabase
      .channel('background_jobs_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'background_jobs' },
        (payload) => {
          console.log('[useBackgroundJobs] Real-time update:', payload);
          
          if (payload.eventType === 'INSERT') {
            const newJob = dbToApp(payload.new as DbBackgroundJob);
            // 🔧 重複チェック - 既に存在する場合は追加しない
            setJobs(prev => {
              const existingJob = prev.find(job => job.id === newJob.id);
              if (existingJob) {
                console.log('[useBackgroundJobs] Job already exists, skipping INSERT:', newJob.id);
                return prev; // 既存のジョブがあるので追加しない
              }
              return [newJob, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedJob = dbToApp(payload.new as DbBackgroundJob);
            setJobs(prev => prev.map(job => 
              job.id === updatedJob.id ? updatedJob : job
            ));
          } else if (payload.eventType === 'DELETE') {
            setJobs(prev => prev.filter(job => job.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [loadJobs]);

  // ジョブ作成
  const createJob = useCallback(async (
    type: JobType, 
    meetingId: string, 
    metadata?: Record<string, any>
  ): Promise<BackgroundJob | null> => {
    try {
      console.log('🔧 [useBackgroundJobs] createJob開始:', { type, meetingId, metadata });
      setError(null);

      // 認証確認
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      console.log('🔧 [useBackgroundJobs] 認証確認結果:', {
        user: user?.id,
        userEmail: user?.email,
        authError: authError?.message 
      });
      
      if (authError) {
        console.error('[useBackgroundJobs] Auth error:', authError);
        throw new Error(`認証エラー: ${authError.message}`);
      }
      
      if (!user) {
        console.error('[useBackgroundJobs] No user found');
        throw new Error('認証が必要です');
      }

      // userIdのバリデーション
      if (!isValidUUID(user.id)) {
        throw new Error(`Invalid user ID format: ${user.id}. Expected UUID format.`);
      }

      // meetingIdのバリデーション
      if (!meetingId) {
        throw new Error('Meeting ID is required');
      }
      
      if (!isValidUUID(meetingId)) {
        throw new Error(`Invalid meeting ID format: ${meetingId}. Expected UUID format.`);
      }

      const jobData = {
        type,
        meeting_id: meetingId,
        user_id: user.id,
        metadata: metadata || {},
        status: 'pending' as JobStatus,
        progress: 0,
        result: null,
        error_message: null
      };

      console.log('[useBackgroundJobs] Job data to insert:', jobData);

      const { data, error: insertError } = await supabase
        .from('background_jobs')
        .insert([jobData])
        .select()
        .single();

      if (insertError) {
        console.error('[useBackgroundJobs] Insert error details:', {
          message: insertError.message,
          code: insertError.code,
          details: insertError.details,
          hint: insertError.hint
        });
        throw insertError;
      }

      console.log('[useBackgroundJobs] Job created successfully:', data);
      const newJob = dbToApp(data as DbBackgroundJob);
      
      // 🔧 即座にローカル状態を更新（UIに即反映させる）
      setJobs(prev => [newJob, ...prev]);
      
      return newJob;
    } catch (err) {
      console.error('[useBackgroundJobs] Create job error:', err);
      const errorMessage = err instanceof Error ? err.message : 'ジョブの作成に失敗しました';
      setError(errorMessage);
      return null;
    }
  }, []);

  // ミーティング別ジョブ取得
  const getJobsByMeeting = useCallback((meetingId: string): BackgroundJob[] => {
    return jobs.filter(job => job.meetingId === meetingId);
  }, [jobs]);

  // ジョブキャンセル
  const cancelJob = useCallback(async (jobId: string): Promise<boolean> => {
    try {
      setError(null);

      const { error: updateError } = await supabase
        .from('background_jobs')
        .update({ 
          status: 'cancelled' as JobStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId);

      if (updateError) throw updateError;

      // 🔧 即座にローカル状態を更新
      setJobs(prev => prev.map(job => 
        job.id === jobId 
          ? { ...job, status: 'cancelled' as JobStatus, updatedAt: new Date() }
          : job
      ));

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ジョブのキャンセルに失敗しました');
      return false;
    }
  }, []);

  // ジョブ再試行
  const retryJob = useCallback(async (jobId: string): Promise<boolean> => {
    try {
      setError(null);

      const { error: updateError } = await supabase
        .from('background_jobs')
        .update({ 
          status: 'pending' as JobStatus,
          progress: 0,
          error_message: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId);

      if (updateError) throw updateError;

      // 🔧 即座にローカル状態を更新
      setJobs(prev => prev.map(job => 
        job.id === jobId 
          ? { 
              ...job, 
              status: 'pending' as JobStatus, 
              progress: 0, 
              errorMessage: undefined,
              updatedAt: new Date() 
            }
          : job
      ));

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ジョブの再試行に失敗しました');
      return false;
    }
  }, []);

  // アクティブなジョブのみ取得
  const activeJobs = jobs.filter(job => 
    job.status === 'pending' || job.status === 'running'
  );

  return {
    jobs,
    activeJobs,
    isLoading,
    error,
    createJob,
    getJobsByMeeting,
    cancelJob,
    retryJob
  };
}; 