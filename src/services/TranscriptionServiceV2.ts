import { supabase } from './supabase/client';
import { GCSUploadService, UploadResult } from './GCSUploadService';

export interface TranscriptionJob {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  gcsFileName?: string;
  transcript?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export class TranscriptionServiceV2 {
  /**
   * 新しいアーキテクチャでの音声文字起こし
   */
  static async transcribeAudio(
    file: File,
    meetingId: string,
    nestId?: string
  ): Promise<{ success: boolean; jobId?: string; error?: string }> {
    try {
      console.log('🔧 [TranscriptionServiceV2] 文字起こし開始:', {
        fileName: file.name,
        fileSize: file.size,
        meetingId
      });

      // 1. GCSに直接アップロード
      const uploadResult = await GCSUploadService.uploadToGCS(file, meetingId);
      
      if (!uploadResult.success) {
        throw new Error(uploadResult.error || 'ファイルアップロードに失敗しました');
      }

      console.log('🔧 [TranscriptionServiceV2] アップロード完了:', {
        gcsFileName: uploadResult.gcsFileName
      });

      // 2. 文字起こしジョブ開始
      const jobResult = await this.startTranscriptionJob(
        uploadResult.gcsFileName!,
        meetingId,
        nestId
      );

      if (!jobResult.success) {
        throw new Error(jobResult.error || '文字起こしジョブの開始に失敗しました');
      }

      console.log('🔧 [TranscriptionServiceV2] 文字起こしジョブ開始:', {
        jobId: jobResult.jobId
      });

      return {
        success: true,
        jobId: jobResult.jobId
      };

    } catch (error) {
      console.error('🔧 [TranscriptionServiceV2] 文字起こしエラー:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '文字起こしに失敗しました'
      };
    }
  }

  /**
   * 文字起こしジョブを開始
   */
  private static async startTranscriptionJob(
    gcsFileName: string,
    meetingId: string,
    nestId?: string
  ): Promise<{ success: boolean; jobId?: string; error?: string }> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('認証セッションが見つかりません');
      }

      // Cloud Runの新しいbatchRecognizeエンドポイントを呼び出し
      const cloudRunBaseUrl = import.meta.env.VITE_CLOUD_RUN_URL;
      const apiKey = import.meta.env.VITE_CLOUD_RUN_API_KEY;

      if (!cloudRunBaseUrl || !apiKey) {
        throw new Error('Cloud Run環境変数が設定されていません');
      }

      const cloudRunUrl = `${cloudRunBaseUrl}/batch-transcribe`;

      console.log('🔧 [TranscriptionServiceV2] Cloud Run呼び出し:', {
        url: cloudRunUrl,
        hasApiKey: !!apiKey,
        apiKeyLength: apiKey.length
      });

      const response = await fetch(cloudRunUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          gcsFileName,
          meetingId,
          nestId,
          callbackUrl: `https://ecqkfcgtmabtfozfcvfr.supabase.co/functions/v1/transcription-complete`
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Cloud Run エラー: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || '文字起こしジョブの開始に失敗しました');
      }

      // ジョブ情報をデータベースに保存
      await this.saveJobInfo(result.jobId, meetingId, gcsFileName);

      return {
        success: true,
        jobId: result.jobId
      };

    } catch (error) {
      console.error('🔧 [TranscriptionServiceV2] ジョブ開始エラー:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'ジョブ開始に失敗しました'
      };
    }
  }

  /**
   * ジョブ情報をデータベースに保存
   */
  private static async saveJobInfo(jobId: string, meetingId: string, gcsFileName: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('transcription_jobs')
        .insert({
          job_id: jobId,
          meeting_id: meetingId,
          gcs_file_name: gcsFileName,
          status: 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.warn('🔧 [TranscriptionServiceV2] ジョブ情報保存エラー:', error);
      }
    } catch (error) {
      console.warn('🔧 [TranscriptionServiceV2] ジョブ情報保存エラー:', error);
    }
  }

  /**
   * ジョブの状態を確認
   */
  static async checkJobStatus(jobId: string): Promise<TranscriptionJob | null> {
    try {
      const { data, error } = await supabase
        .from('transcription_jobs')
        .select('*')
        .eq('job_id', jobId)
        .single();

      if (error) {
        console.error('🔧 [TranscriptionServiceV2] ジョブ状態確認エラー:', error);
        return null;
      }

      return data as TranscriptionJob;

    } catch (error) {
      console.error('🔧 [TranscriptionServiceV2] ジョブ状態確認エラー:', error);
      return null;
    }
  }

  /**
   * ミーティングの文字起こしジョブ一覧を取得
   */
  static async getMeetingJobs(meetingId: string): Promise<TranscriptionJob[]> {
    try {
      const { data, error } = await supabase
        .from('transcription_jobs')
        .select('*')
        .eq('meeting_id', meetingId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('🔧 [TranscriptionServiceV2] ジョブ一覧取得エラー:', error);
        return [];
      }

      return data as TranscriptionJob[];

    } catch (error) {
      console.error('🔧 [TranscriptionServiceV2] ジョブ一覧取得エラー:', error);
      return [];
    }
  }

  /**
   * 進捗付きアップロードと文字起こし
   */
  static async transcribeWithProgress(
    file: File,
    meetingId: string,
    nestId?: string,
    onUploadProgress?: (progress: number) => void
  ): Promise<{ success: boolean; jobId?: string; error?: string }> {
    try {
      console.log('🔧 [TranscriptionServiceV2] 進捗付き文字起こし開始');

      // 1. 進捗付きGCSアップロード
      const uploadResult = await GCSUploadService.uploadWithProgress(
        file,
        meetingId,
        onUploadProgress
      );
      
      if (!uploadResult.success) {
        throw new Error(uploadResult.error || 'ファイルアップロードに失敗しました');
      }

      // 2. 文字起こしジョブ開始
      const jobResult = await this.startTranscriptionJob(
        uploadResult.gcsFileName!,
        meetingId,
        nestId
      );

      return jobResult;

    } catch (error) {
      console.error('🔧 [TranscriptionServiceV2] 進捗付き文字起こしエラー:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '文字起こしに失敗しました'
      };
    }
  }
}
