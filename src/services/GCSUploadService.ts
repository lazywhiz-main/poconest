import { supabase } from './supabase/client';

export interface UploadResult {
  success: boolean;
  gcsFileName?: string;
  bucketName?: string;
  error?: string;
}

export class GCSUploadService {
  /**
   * GCSに直接ファイルをアップロード
   */
  static async uploadToGCS(
    file: File,
    meetingId: string
  ): Promise<UploadResult> {
    try {
      console.log('🔧 [GCSUploadService] アップロード開始:', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        meetingId
      });

      // 1. 署名付きURL取得
      const signedUrlResult = await this.getSignedUrl(file.name, file.type, meetingId);
      
      if (!signedUrlResult.success) {
        throw new Error(signedUrlResult.error || '署名付きURLの取得に失敗しました');
      }

      const { signedUrl, gcsFileName, bucketName } = signedUrlResult;

      if (!signedUrl) {
        throw new Error('署名付きURLが取得できませんでした');
      }

      console.log('🔧 [GCSUploadService] 署名付きURL取得完了:', { gcsFileName });

      // 2. GCSに直接アップロード
      const uploadResult = await this.uploadToSignedUrl(file, signedUrl);

      if (!uploadResult.success) {
        throw new Error(uploadResult.error || 'GCSアップロードに失敗しました');
      }

      console.log('🔧 [GCSUploadService] GCSアップロード完了:', { gcsFileName });

      return {
        success: true,
        gcsFileName,
        bucketName
      };

    } catch (error) {
      console.error('🔧 [GCSUploadService] アップロードエラー:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'アップロードに失敗しました'
      };
    }
  }

  /**
   * 署名付きURLを取得
   */
  private static async getSignedUrl(
    fileName: string,
    fileType: string,
    meetingId: string
  ): Promise<{ success: boolean; signedUrl?: string; gcsFileName?: string; bucketName?: string; error?: string }> {
    try {
      console.log('🔧 [GCSUploadService] セッション取得開始');
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('🔧 [GCSUploadService] セッション取得エラー:', sessionError);
        throw new Error(`セッション取得エラー: ${sessionError.message}`);
      }
      
      if (!session) {
        console.error('🔧 [GCSUploadService] セッションが見つかりません');
        throw new Error('認証セッションが見つかりません');
      }
      
      console.log('🔧 [GCSUploadService] セッション取得成功:', {
        userId: session.user.id,
        hasAccessToken: !!session.access_token,
        accessTokenLength: session.access_token?.length
      });

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ecqkfcgtmabtfozfcvfr.supabase.co';
      const edgeFunctionUrl = `${supabaseUrl}/functions/v1/generate-upload-url`;

      console.log('🔧 [GCSUploadService] Edge Function呼び出し開始:', edgeFunctionUrl);
      
      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || ''
        },
        body: JSON.stringify({
          fileName,
          fileType,
          meetingId
        })
      });

      console.log('🔧 [GCSUploadService] Edge Functionレスポンス:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('🔧 [GCSUploadService] Edge Functionエラーレスポンス:', errorText);
        throw new Error(`Edge Function エラー: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || '署名付きURLの生成に失敗しました');
      }

      return {
        success: true,
        signedUrl: result.signedUrl,
        gcsFileName: result.gcsFileName,
        bucketName: result.bucketName
      };

    } catch (error) {
      console.error('🔧 [GCSUploadService] 署名付きURL取得エラー:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '署名付きURLの取得に失敗しました'
      };
    }
  }

  /**
   * 署名付きURLにファイルをアップロード
   */
  private static async uploadToSignedUrl(
    file: File,
    signedUrl: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🔧 [GCSUploadService] GCSアップロード開始:', {
        signedUrl: signedUrl.split('?')[0], // URLの最初の部分のみログ
        fileSize: file.size,
        fileType: file.type
      });

      const response = await fetch(signedUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type
        },
        body: file
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`GCS アップロードエラー: ${response.status} ${response.statusText} - ${errorText}`);
      }

      return { success: true };

    } catch (error) {
      console.error('🔧 [GCSUploadService] GCSアップロードエラー:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'GCSアップロードに失敗しました'
      };
    }
  }

  /**
   * アップロード進捗を監視（オプション）
   */
  static async uploadWithProgress(
    file: File,
    meetingId: string,
    onProgress?: (progress: number) => void
  ): Promise<UploadResult> {
    try {
      // 署名付きURL取得
      const signedUrlResult = await this.getSignedUrl(file.name, file.type, meetingId);
      
      if (!signedUrlResult.success) {
        throw new Error(signedUrlResult.error || '署名付きURLの取得に失敗しました');
      }

      const { signedUrl, gcsFileName, bucketName } = signedUrlResult;

      if (!signedUrl) {
        throw new Error('署名付きURLが取得できませんでした');
      }

      // 進捗付きアップロード
      const uploadResult = await this.uploadToSignedUrlWithProgress(file, signedUrl, onProgress);

      if (!uploadResult.success) {
        throw new Error(uploadResult.error || 'GCSアップロードに失敗しました');
      }

      return {
        success: true,
        gcsFileName,
        bucketName
      };

    } catch (error) {
      console.error('🔧 [GCSUploadService] 進捗付きアップロードエラー:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'アップロードに失敗しました'
      };
    }
  }

  /**
   * 進捗付きGCSアップロード
   */
  private static async uploadToSignedUrlWithProgress(
    file: File,
    signedUrl: string,
    onProgress?: (progress: number) => void
  ): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          const progress = (event.loaded / event.total) * 100;
          onProgress(progress);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve({ success: true });
        } else {
          resolve({
            success: false,
            error: `GCS アップロードエラー: ${xhr.status} ${xhr.statusText}`
          });
        }
      });

      xhr.addEventListener('error', () => {
        resolve({
          success: false,
          error: 'GCSアップロード中にエラーが発生しました'
        });
      });

      xhr.open('PUT', signedUrl);
      xhr.setRequestHeader('Content-Type', file.type);
      xhr.send(file);
    });
  }
}
