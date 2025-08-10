import { supabase } from './supabase/client';

export interface TranscriptionResult {
  transcript: string;
  language?: string;
  duration?: number;
  wordCount: number;
  confidence?: number;
  jobId?: string;
}

export class TranscriptionService {
  private static readonly MAX_FILE_SIZE = 200 * 1024 * 1024; // 200MB (クライアント側と統一)

  /**
   * Edge Functionを使用して音声ファイルを文字起こしする
   */
  static async transcribeAudio(
    fileBuffer: ArrayBuffer,
    fileName: string,
    fileType: string,
    meetingId: string,
    nestId?: string,
    useGoogleCloud: boolean = false
  ): Promise<TranscriptionResult> {
    try {
      console.log('🔧 [TranscriptionService] 文字起こし開始:', fileName);
      console.log('🔧 [TranscriptionService] パラメータ確認:', {
        fileName,
        fileType,
        fileSize: fileBuffer.byteLength,
        fileSizeMB: (fileBuffer.byteLength / 1024 / 1024).toFixed(2),
        meetingId,
        nestId,
        useGoogleCloud
      });
      
      console.log('🔧 [TranscriptionService] 非同期処理を開始します');
      console.log('🔧 [TranscriptionService] Storageアップロード開始');
      // ファイルをSupabase Storageにアップロード
      const storagePath = await this.uploadFileToStorage(fileBuffer, fileName, fileType);
      console.log('🔧 [TranscriptionService] Storageアップロード完了:', storagePath);
      
      const fileUrl = await this.getFileUrl(storagePath);
      console.log('🔧 [TranscriptionService] ファイルURL取得完了:', fileUrl);

      console.log('🔧 [TranscriptionService] Edge Function呼び出し開始');
      // Edge Functionを呼び出し
      try {
        const result = await this.callTranscriptionEdgeFunction(
          fileUrl,
          fileName,
          fileType,
          meetingId,
          nestId,
          useGoogleCloud
        );
        console.log('🔧 [TranscriptionService] Edge Function呼び出し完了:', {
          transcriptLength: result.transcript?.length || 0,
          wordCount: result.wordCount
        });

        return {
          transcript: result.transcript,
          language: 'ja',
          duration: 0, // Edge Functionから取得する場合は更新
          wordCount: result.wordCount,
          confidence: 0,
          jobId: result.jobId,
        };
      } catch (error) {
        // FILE_TOO_LARGEエラーの場合は分割処理を開始
        if (error instanceof Error && error.message === 'FILE_TOO_LARGE') {
          console.log('🔧 [TranscriptionService] 大きなファイルが検出されました。クライアントサイド分割処理を開始します。');
          return await this.transcribeLargeFileWithClientSideSplitting(
            fileBuffer,
            fileName,
            fileType,
            meetingId,
            nestId,
            useGoogleCloud
          );
        }
        throw error;
      }

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
   * クライアントサイド分割処理
   */
  private static async transcribeLargeFileWithClientSideSplitting(
    fileBuffer: ArrayBuffer,
    fileName: string,
    fileType: string,
    meetingId: string,
    nestId?: string,
    useGoogleCloud: boolean = false
  ): Promise<TranscriptionResult> {
    console.log('🔧 [TranscriptionService] クライアントサイド分割処理開始');
    
    const chunkSize = 20 * 1024 * 1024; // 20MBチャンク
    const chunks: ArrayBuffer[] = [];
    
    // ファイルをチャンクに分割
    for (let i = 0; i < fileBuffer.byteLength; i += chunkSize) {
      const chunk = fileBuffer.slice(i, Math.min(i + chunkSize, fileBuffer.byteLength));
      chunks.push(chunk);
    }
    
    console.log(`🔧 [TranscriptionService] ファイルを${chunks.length}個のチャンクに分割しました`);
    
    const allTranscripts: string[] = [];
    const allSpeakers: any[] = [];
    const allUtterances: any[] = [];
    let timeOffset = 0;
    
    // 各チャンクを順次処理
    for (let i = 0; i < chunks.length; i++) {
      console.log(`🔧 [TranscriptionService] チャンク ${i + 1}/${chunks.length} を処理中...`);
      
      try {
        const chunkFileName = `${fileName}_chunk_${i + 1}`;
        
        // チャンクをStorageにアップロード
        const storagePath = await this.uploadFileToStorage(chunks[i], chunkFileName, fileType);
        const fileUrl = await this.getFileUrl(storagePath);
        
        // Edge Functionでチャンクを処理
        const result = await this.callTranscriptionEdgeFunction(
          fileUrl,
          chunkFileName,
          fileType,
          meetingId,
          nestId,
          useGoogleCloud
        );
        
        allTranscripts.push(result.transcript);
        
        // 話者情報と発言詳細があれば蓄積（時間オフセットを適用）
        if (result.speakers) {
          const adjustedSpeakers = result.speakers.map((speaker: any) => ({
            ...speaker,
            startTime: speaker.startTime + timeOffset,
            endTime: speaker.endTime + timeOffset
          }));
          allSpeakers.push(...adjustedSpeakers);
        }
        
        if (result.utterances) {
          const adjustedUtterances = result.utterances.map((utterance: any) => ({
            ...utterance,
            startTime: utterance.startTime + timeOffset,
            endTime: utterance.endTime + timeOffset
          }));
          allUtterances.push(...adjustedUtterances);
        }
        
        // 次のチャンクの時間オフセットを計算（概算）
        const chunkDuration = this.estimateChunkDuration(chunks[i], fileType);
        timeOffset += chunkDuration;
        
        console.log(`🔧 [TranscriptionService] チャンク ${i + 1} の処理完了`);
        
      } catch (error) {
        console.error(`🔧 [TranscriptionService] チャンク ${i + 1} の処理でエラー:`, error);
        throw error;
      }
    }
    
    // すべてのチャンクの結果を結合
    const combinedTranscript = allTranscripts.join('\n\n');
    
    console.log('🔧 [TranscriptionService] クライアントサイド分割処理完了');
    
    return {
      transcript: combinedTranscript,
      language: 'ja',
      duration: 0,
      wordCount: combinedTranscript.length,
      confidence: 0,
    };
  }

  /**
   * チャンクの時間を概算
   */
  private static estimateChunkDuration(chunkBuffer: ArrayBuffer, fileType: string): number {
    // FLACの場合、概算で計算（実際の音声長は正確ではないが、オフセット計算用）
    const bytesPerSecond = 16000 * 2; // 16kHz, 16bit
    return chunkBuffer.byteLength / bytesPerSecond;
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

    // ファイルのハッシュを計算して一意性を保証
    const fileHash = await this.calculateFileHash(fileBuffer);
    const storageFileName = `${fileHash}_${sanitizedFileName}`;
    const blob = new Blob([fileBuffer], { type: fileType });

    // 既存ファイルの確認
    const { data: existingFiles } = await supabase.storage
      .from('meeting-files')
      .list('', {
        search: fileHash
      });

    // 同じハッシュのファイルが既に存在する場合は既存のパスを返す
    if (existingFiles && existingFiles.length > 0) {
      console.log('🔧 [TranscriptionService] 同じファイルが既に存在します:', existingFiles[0].name);
      return existingFiles[0].name;
    }

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
   * ファイルのハッシュを計算
   */
  private static async calculateFileHash(buffer: ArrayBuffer): Promise<string> {
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
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
    nestId?: string,
    useGoogleCloud: boolean = false
  ): Promise<{ transcript: string; wordCount: number; speakers?: any[]; utterances?: any[]; jobId?: string }> {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error('認証セッションが見つかりません');
    }

    // 本番環境を強制使用（ローカル環境の複雑さを避けるため）
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ecqkfcgtmabtfozfcvfr.supabase.co';
    
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
    
    console.log('🔧 [TranscriptionService] 環境設定:', {
      hostname: window.location.hostname,
      supabaseUrl
    });
    
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
    
    // 本番環境のEdge Functionを使用
    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/transcribe-audio`;
    
    console.log('🔧 [TranscriptionService] Edge Function呼び出し準備:', {
      url: edgeFunctionUrl,
      fileName,
      fileType,
      meetingId,
      useGoogleCloud
    });
    
    const requestBody = {
      fileUrl,
      meetingId,
      nestId,
      useGoogleCloud
    };
    
    console.log('🔧 [TranscriptionService] リクエスト詳細:', {
      url: edgeFunctionUrl,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token ? 'present' : 'missing'}`,
      },
      body: requestBody
    });
    
    console.log('🔧 [TranscriptionService] fetch呼び出し開始');
    
    let response: Response;
    try {
      response = await fetch(
        edgeFunctionUrl,
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
      console.error('🔧 [TranscriptionService] フェッチエラー詳細:', {
        name: fetchError instanceof Error ? fetchError.name : 'Unknown',
        message: fetchError instanceof Error ? fetchError.message : 'Unknown error',
        stack: fetchError instanceof Error ? fetchError.stack : undefined
      });
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
      
      // FILE_TOO_LARGEエラーの場合は特別に処理
      if ((errorData as any).error === 'FILE_TOO_LARGE') {
        console.log('🔧 [TranscriptionService] 大きなファイルが検出されました。クライアントサイド分割処理を開始します。');
        throw new Error('FILE_TOO_LARGE');
      }
      
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

    // 非同期処理の場合は、ジョブIDを返す
    if (result.jobId) {
      return {
        transcript: '処理中です。完了までしばらくお待ちください。',
        wordCount: 0,
        jobId: result.jobId
      };
    }

    // 同期処理の場合は、完全な文字起こし結果を取得（データベースから）
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
   * 非同期処理の状態を確認
   */
  static async checkTranscriptionStatus(meetingId: string): Promise<{
    isComplete: boolean;
    transcript?: string;
    jobId?: string;
    error?: string;
  }> {
    try {
      const { data: meeting, error } = await supabase
        .from('meetings')
        .select('transcript, updated_at')
        .eq('id', meetingId)
        .single();

      if (error) {
        throw new Error(`ミーティング取得エラー: ${error.message}`);
      }

      // 文字起こしが完了している場合
      if (meeting?.transcript && meeting.transcript !== '処理中です。完了までしばらくお待ちください。') {
        return {
          isComplete: true,
          transcript: meeting.transcript,
        };
      }

      // まだ処理中の場合
      return {
        isComplete: false,
        transcript: meeting?.transcript || '処理中...',
      };

    } catch (error) {
      console.error('🔧 [TranscriptionService] 状態確認エラー:', error);
      return {
        isComplete: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 定期的に処理状態を確認
   */
  static async waitForTranscriptionCompletion(
    meetingId: string,
    maxWaitTime: number = 300000, // 5分
    pollInterval: number = 5000 // 5秒
  ): Promise<TranscriptionResult> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      const status = await this.checkTranscriptionStatus(meetingId);
      
      if (status.isComplete && status.transcript) {
        return {
          transcript: status.transcript,
          language: 'ja',
          duration: 0,
          wordCount: status.transcript.length,
          confidence: 0,
        };
      }
      
      if (status.error) {
        throw new Error(`文字起こしエラー: ${status.error}`);
      }
      
      // 次の確認まで待機
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }
    
    throw new Error('文字起こし処理がタイムアウトしました');
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
      const estimatedDuration = Math.round((fileBuffer.byteLength / (1024 * 1024)) * 0.5); // 1MBあたり0.5分（より現実的）
      
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