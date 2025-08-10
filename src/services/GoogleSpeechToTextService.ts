import { supabase } from './supabase/client';

export interface SpeakerDiarizationResult {
  transcript: string;
  speakers: Speaker[];
  words: Word[];
  confidence: number;
  languageCode: string;
}

export interface Speaker {
  speakerTag: number;
  name?: string;
  totalTime: number; // seconds
  wordCount: number;
}

export interface Word {
  word: string;
  startTime: number; // seconds
  endTime: number; // seconds
  speakerTag: number;
  confidence: number;
}

export class GoogleSpeechToTextService {
  private static readonly API_ENDPOINT = 'https://speech.googleapis.com/v1/speech:longrunningrecognize';
  private static readonly GCS_BUCKET = 'poconest-audio-files'; // Google Cloud Storage bucket

  /**
   * 話者分割付き文字起こしを実行
   */
  static async transcribeWithSpeakerDiarization(
    fileBuffer: ArrayBuffer,
    fileName: string,
    fileType: string,
    meetingId: string,
    nestId?: string
  ): Promise<SpeakerDiarizationResult> {
    try {
      console.log('🔧 [GoogleSpeechToText] 話者分割付き文字起こし開始:', fileName);
      
      // 1. ファイルをGoogle Cloud Storageにアップロード
      const gcsUri = await this.uploadToGCS(fileBuffer, fileName);
      console.log('🔧 [GoogleSpeechToText] GCSアップロード完了:', gcsUri);
      
      // 2. Speech-to-Text API呼び出し
      const operationName = await this.startTranscription(gcsUri, fileType);
      console.log('🔧 [GoogleSpeechToText] 文字起こし開始:', operationName);
      
      // 3. 処理完了を待機
      const result = await this.waitForCompletion(operationName);
      console.log('🔧 [GoogleSpeechToText] 文字起こし完了');
      
      // 4. 結果を整形
      const formattedResult = this.formatDiarizationResult(result);
      
      // 5. データベースに保存
      await this.saveToDatabase(formattedResult, meetingId, nestId);
      
      return formattedResult;
      
    } catch (error) {
      console.error('🔧 [GoogleSpeechToText] エラー:', error);
      throw error;
    }
  }

  /**
   * ファイルをGoogle Cloud Storageにアップロード
   */
  private static async uploadToGCS(fileBuffer: ArrayBuffer, fileName: string): Promise<string> {
    const apiKey = import.meta.env.VITE_GOOGLE_CLOUD_API_KEY;
    if (!apiKey) {
      throw new Error('Google Cloud API Keyが設定されていません');
    }

    // ファイル名をサニタイズ
    const sanitizedFileName = fileName
      .replace(/[^a-zA-Z0-9.-]/g, '_')
      .replace(/_{2,}/g, '_')
      .toLowerCase();

    const gcsFileName = `meetings/${Date.now()}_${sanitizedFileName}`;
    
    // Google Cloud Storage APIを使用してアップロード
    const response = await fetch(
      `https://storage.googleapis.com/upload/storage/v1/b/${this.GCS_BUCKET}/o?uploadType=media&name=${encodeURIComponent(gcsFileName)}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': this.getContentType(fileName),
        },
        body: fileBuffer,
      }
    );

    if (!response.ok) {
      throw new Error(`GCSアップロードエラー: ${response.statusText}`);
    }

    return `gs://${this.GCS_BUCKET}/${gcsFileName}`;
  }

  /**
   * Speech-to-Text API呼び出し開始
   */
  private static async startTranscription(gcsUri: string, fileType: string): Promise<string> {
    const apiKey = import.meta.env.VITE_GOOGLE_CLOUD_API_KEY;
    
    const requestBody = {
      config: {
        encoding: this.getEncoding(fileType),
        sampleRateHertz: 16000,
        languageCode: 'ja-JP',
        enableSpeakerDiarization: true,
        diarizationSpeakerCount: 0, // 自動検出
        enableAutomaticPunctuation: true,
        enableWordTimeOffsets: true,
        model: 'latest_long',
        useEnhanced: true,
      },
      audio: {
        uri: gcsUri,
      },
    };

    const response = await fetch(`${this.API_ENDPOINT}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Speech-to-Text API エラー: ${errorData.error?.message || response.statusText}`);
    }

    const result = await response.json();
    return result.name; // operation name
  }

  /**
   * 処理完了を待機
   */
  private static async waitForCompletion(operationName: string): Promise<any> {
    const apiKey = import.meta.env.VITE_GOOGLE_CLOUD_API_KEY;
    const maxWaitTime = 300000; // 5分
    const pollInterval = 5000; // 5秒
    let elapsedTime = 0;

    while (elapsedTime < maxWaitTime) {
      const response = await fetch(
        `https://speech.googleapis.com/v1/operations/${operationName}?key=${apiKey}`
      );

      if (!response.ok) {
        throw new Error(`Operation status check failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.done) {
        if (result.error) {
          throw new Error(`Transcription failed: ${result.error.message}`);
        }
        return result.response;
      }

      await new Promise(resolve => setTimeout(resolve, pollInterval));
      elapsedTime += pollInterval;
      
      console.log('🔧 [GoogleSpeechToText] 処理中...', elapsedTime / 1000, '秒経過');
    }

    throw new Error('Transcription timeout');
  }

  /**
   * 結果を整形
   */
  private static formatDiarizationResult(apiResult: any): SpeakerDiarizationResult {
    const speakers = new Map<number, Speaker>();
    const words: Word[] = [];
    let fullTranscript = '';

    // 結果を解析
    for (const result of apiResult.results) {
      fullTranscript += result.alternatives[0].transcript + ' ';

      // 話者情報を抽出
      if (result.alternatives[0].words) {
        for (const word of result.alternatives[0].words) {
          const speakerTag = word.speakerTag || 1;
          
          words.push({
            word: word.word,
            startTime: parseFloat(word.startTime.replace('s', '')),
            endTime: parseFloat(word.endTime.replace('s', '')),
            speakerTag,
            confidence: word.confidence || 0,
          });

          // 話者統計を更新
          if (!speakers.has(speakerTag)) {
            speakers.set(speakerTag, {
              speakerTag,
              name: `話者${speakerTag}`,
              totalTime: 0,
              wordCount: 0,
            });
          }

          const speaker = speakers.get(speakerTag)!;
          speaker.totalTime += parseFloat(word.endTime.replace('s', '')) - parseFloat(word.startTime.replace('s', ''));
          speaker.wordCount++;
        }
      }
    }

    return {
      transcript: fullTranscript.trim(),
      speakers: Array.from(speakers.values()),
      words,
      confidence: apiResult.results[0]?.alternatives[0]?.confidence || 0,
      languageCode: 'ja-JP',
    };
  }

  /**
   * データベースに保存
   */
  private static async saveToDatabase(
    result: SpeakerDiarizationResult,
    meetingId: string,
    nestId?: string
  ): Promise<void> {
    // ミーティングの文字起こしを更新
    const { error: meetingError } = await supabase
      .from('meetings')
      .update({
        transcript: result.transcript,
        updated_at: new Date().toISOString(),
      })
      .eq('id', meetingId);

    if (meetingError) {
      throw new Error(`ミーティング更新エラー: ${meetingError.message}`);
    }

    // 話者情報を保存
    for (const speaker of result.speakers) {
      const { error: speakerError } = await supabase
        .from('meeting_speakers')
        .upsert({
          meeting_id: meetingId,
          speaker_tag: speaker.speakerTag,
          name: speaker.name,
          total_time: `${Math.floor(speaker.totalTime / 60)}:${Math.floor(speaker.totalTime % 60).toString().padStart(2, '0')}`,
        });

      if (speakerError) {
        console.warn('話者情報保存エラー:', speakerError);
      }
    }

    // 発言詳細を保存
    for (const word of result.words) {
      const { error: wordError } = await supabase
        .from('meeting_utterances')
        .insert({
          meeting_id: meetingId,
          speaker_tag: word.speakerTag,
          word: word.word,
          start_time: word.startTime,
          end_time: word.endTime,
          confidence: word.confidence,
        });

      if (wordError) {
        console.warn('発言詳細保存エラー:', wordError);
      }
    }

    // NESTのupdated_atを更新
    if (nestId) {
      await supabase
        .from('nests')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', nestId);
    }
  }

  /**
   * ファイル形式からエンコーディングを取得
   */
  private static getEncoding(fileType: string): string {
    const encodingMap: Record<string, string> = {
      'audio/wav': 'LINEAR16',
      'audio/mp3': 'MP3',
      'audio/m4a': 'MP3', // m4aは事前に変換が必要
      'audio/flac': 'FLAC',
      'audio/webm': 'WEBM_OPUS',
    };
    
    return encodingMap[fileType] || 'MP3';
  }

  /**
   * ファイル形式からContent-Typeを取得
   */
  private static getContentType(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase();
    const contentTypeMap: Record<string, string> = {
      'wav': 'audio/wav',
      'mp3': 'audio/mp3',
      'm4a': 'audio/m4a',
      'flac': 'audio/flac',
      'webm': 'audio/webm',
    };
    
    return contentTypeMap[extension || ''] || 'audio/mp3';
  }
} 