import { supabase } from './supabase/client';

export interface TranscriptionResult {
  transcript: string;
  language?: string;
  duration?: number;
  wordCount: number;
  confidence?: number;
}

export class TranscriptionService {
  private static readonly MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB (クライアント側と統一)

  /**
   * Edge Functionを使用して音声ファイルを文字起こしする
   */
  static async transcribeAudio(
    fileBuffer: ArrayBuffer,
    fileName: string,
    fileType: string,
    meetingId: string,
    nestId?: string
  ): Promise<TranscriptionResult> {
    try {
      console.log('🔧 [TranscriptionService] Edge Function経由で文字起こし開始:', fileName);
      console.log('🔧 [TranscriptionService] ファイル情報:', {
        fileName,
        fileType,
        fileSize: fileBuffer.byteLength,
        fileSizeMB: (fileBuffer.byteLength / 1024 / 1024).toFixed(2),
        meetingId,
        nestId
      });

      // ファイル品質チェック（警告のみ、エラーにはしない）
      console.log('🔧 [TranscriptionService] ファイル品質チェック開始');
      const qualityCheck = await this.checkAudioQuality(fileBuffer, fileType);
      console.log('🔧 [TranscriptionService] ファイル品質チェック結果:', qualityCheck);
      
      if (!qualityCheck.isValid) {
        console.warn('🔧 [TranscriptionService] ファイル品質警告:', qualityCheck.issues);
        console.log('🔧 [TranscriptionService] 大きなファイルのため、Edge Functionで分割処理を実行します');
        // 警告があっても処理を続行（エラーにはしない）
      }

      // ファイルをSupabase Storageにアップロード
      const storagePath = await this.uploadFileToStorage(fileBuffer, fileName, fileType);
      const fileUrl = await this.getFileUrl(storagePath);

      // Edge Functionを呼び出し
      const result = await this.callTranscriptionEdgeFunction(
        fileUrl,
        fileName,
        fileType,
        meetingId,
        nestId
      );

      return {
        transcript: result.transcript,
        language: 'ja',
        duration: 0, // Edge Functionから取得する場合は更新
        wordCount: result.wordCount,
        confidence: 0,
      };

    } catch (error) {
      console.error('🔧 [TranscriptionService] 文字起こしエラー:', error);
      console.error('🔧 [TranscriptionService] エラー詳細:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        fileName,
        fileType,
        fileSize: fileBuffer.byteLength,
        meetingId
      });
      throw error;
    }
  }

  /**
   * ファイルをSupabase Storageにアップロード
   */
  private static async uploadFileToStorage(
    fileBuffer: ArrayBuffer,
    fileName: string,
    fileType: string
  ): Promise<string> {
    const sanitizedFileName = fileName
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/_{2,}/g, '_')
      .toLowerCase();

    const storageFileName = `${Date.now()}_${sanitizedFileName}`;
    const blob = new Blob([fileBuffer], { type: fileType });

    const { data, error } = await supabase.storage
      .from('meeting-files')
      .upload(storageFileName, blob, {
        contentType: fileType,
        upsert: false
      });

    if (error) {
      throw new Error(`Storageアップロードエラー: ${error.message}`);
    }

    return data.path;
  }

  /**
   * StorageファイルのURLを取得
   */
  private static async getFileUrl(storagePath: string): Promise<string> {
    const { data } = supabase.storage
      .from('meeting-files')
      .getPublicUrl(storagePath);

    return data.publicUrl;
  }

  /**
   * 文字起こしEdge Functionを呼び出し
   */
  private static async callTranscriptionEdgeFunction(
    fileUrl: string,
    fileName: string,
    fileType: string,
    meetingId: string,
    nestId?: string
  ): Promise<{ transcript: string; wordCount: number }> {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('認証セッションが見つかりません');
    }

    // クライアントサイド環境変数（VITE_プレフィックス）を使用
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ecqkfcgtmabtfozfcvfr.supabase.co';
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
    
    // 環境変数が正しく設定されていない場合の警告
    if (!import.meta.env.VITE_SUPABASE_URL) {
      console.warn('🔧 [TranscriptionService] VITE_SUPABASE_URLが設定されていません。フォールバックURLを使用します。');
    }
    if (!import.meta.env.VITE_SUPABASE_ANON_KEY) {
      console.warn('🔧 [TranscriptionService] VITE_SUPABASE_ANON_KEYが設定されていません。');
    }
    
    console.log('🔧 [TranscriptionService] 環境変数確認:', {
      supabaseUrl: supabaseUrl,
      hasSession: !!session,
      sessionToken: session?.access_token ? 'present' : 'missing',
      envVars: {
        VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
        VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY ? 'present' : 'missing'
      }
    });
    
    console.log('🔧 [TranscriptionService] Edge Function呼び出し:', {
      url: `${supabaseUrl}/functions/v1/transcribe-audio`,
      fileName,
      fileType,
      meetingId
    });
    
    const requestBody = {
      fileUrl,
      fileName,
      fileType,
      meetingId,
      nestId
    };
    
    console.log('🔧 [TranscriptionService] リクエスト詳細:', {
      url: `${supabaseUrl}/functions/v1/transcribe-audio`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token ? 'present' : 'missing'}`,
      },
      body: requestBody
    });
    
    let response: Response;
    try {
      response = await fetch(
        `${supabaseUrl}/functions/v1/transcribe-audio`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(requestBody),
        }
      );
    } catch (fetchError) {
      console.error('🔧 [TranscriptionService] フェッチエラー:', fetchError);
      throw new Error(`ネットワークエラー: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`);
    }

    console.log('🔧 [TranscriptionService] Edge Functionレスポンス:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries())
    });
    
    if (!response.ok) {
      let errorData = {};
      try {
        errorData = await response.json();
      } catch (e) {
        console.error('🔧 [TranscriptionService] レスポンスのJSON解析に失敗:', e);
      }
      console.error('🔧 [TranscriptionService] Edge Function エラーレスポンス:', {
        status: response.status,
        statusText: response.statusText,
        errorData,
        url: response.url
      });
      throw new Error(`Edge Function エラー: ${response.status} - ${(errorData as any).error || response.statusText}`);
    }

    const result = await response.json();
    console.log('🔧 [TranscriptionService] Edge Function結果:', {
      success: result.success,
      hasTranscript: !!result.transcript,
      wordCount: result.wordCount,
      error: result.error
    });
    
    if (!result.success) {
      throw new Error(`文字起こしエラー: ${result.error}`);
    }

    // 完全な文字起こし結果を取得（データベースから）
    const { data: meeting, error } = await supabase
      .from('meetings')
      .select('transcript')
      .eq('id', meetingId)
      .single();

    if (error || !meeting?.transcript) {
      throw new Error('文字起こし結果の取得に失敗しました');
    }

    return {
      transcript: meeting.transcript,
      wordCount: meeting.transcript.length
    };
  }

  /**
   * ファイルの音声品質をチェック
   */
  static async checkAudioQuality(fileBuffer: ArrayBuffer, fileType: string): Promise<{
    isValid: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // ファイルサイズチェック（警告のみ、エラーにはしない）
    if (fileBuffer.byteLength > this.MAX_FILE_SIZE) {
      const sizeMB = (fileBuffer.byteLength / 1024 / 1024).toFixed(2);
      const estimatedDuration = Math.round((fileBuffer.byteLength / (1024 * 1024)) * 60);
      
      issues.push(`ファイルサイズが大きすぎます (${sizeMB}MB)`);
      issues.push(`推定時間: 約${estimatedDuration}分`);
      recommendations.push('ファイルは自動的に分割して処理されます');
      recommendations.push('処理時間が長くなる場合があります');
    }

    // ファイル形式チェック
    const supportedFormats = ['audio/mp3', 'audio/wav', 'audio/m4a', 'audio/mp4', 'audio/webm', 'audio/x-m4a'];
    if (!supportedFormats.includes(fileType)) {
      issues.push(`サポートされていないファイル形式: ${fileType}`);
      recommendations.push('MP3, WAV, M4A, MP4, WebM形式を使用してください');
    }

    // 最小サイズチェック（空ファイルや小さすぎるファイル）
    if (fileBuffer.byteLength < 1024) { // 1KB未満
      issues.push('ファイルサイズが小さすぎます');
      recommendations.push('有効な音声ファイルをアップロードしてください');
    }

    return {
      isValid: issues.length === 0,
      issues,
      recommendations,
    };
  }

  /**
   * 文字起こし結果をフォーマット
   */
  static formatTranscript(transcript: string, fileName: string): string {
    const timestamp = new Date().toLocaleString('ja-JP');
    
    return `【文字起こし結果】
ファイル名: ${fileName}
処理時刻: ${timestamp}

${transcript}

---
この文字起こしはOpenAI Whisper APIを使用して自動生成されました。
音声の品質や環境音により、精度が変動する場合があります。
大きなファイルの場合は分割処理が実行されています。`;
  }

  /**
   * 文字起こしの進捗をシミュレート（実際のAPI呼び出し中に使用）
   */
  static getTranscriptionProgress(fileSize: number): number[] {
    // ファイルサイズに基づいて進捗ステップを生成
    const baseSteps = [10, 25, 40, 60, 80, 95];
    const sizeFactor = Math.min(fileSize / (5 * 1024 * 1024), 2); // 5MBを基準に調整
    
    return baseSteps.map(step => Math.min(step * sizeFactor, 95));
  }
} 