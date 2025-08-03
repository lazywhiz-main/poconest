import { supabase } from './supabase/client';

export class StorageService {
  /**
   * ミーティングに関連するオーディオファイルを削除
   */
  static async deleteMeetingAudioFiles(meetingId: string): Promise<void> {
    try {
      console.log(`🔧 [StorageService] ミーティング ${meetingId} のオーディオファイル削除開始`);

      // ミーティング情報を取得してアップロードされたファイルの情報を確認
      const { data: meeting, error: meetingError } = await supabase
        .from('meetings')
        .select('uploaded_files, recording_url')
        .eq('id', meetingId)
        .single();

      if (meetingError) {
        console.error('🔧 [StorageService] ミーティング情報取得エラー:', meetingError);
        return;
      }

      const filesToDelete: string[] = [];

      // uploaded_filesからファイルパスを抽出
      if (meeting.uploaded_files && Array.isArray(meeting.uploaded_files)) {
        meeting.uploaded_files.forEach((file: any) => {
          if (file.path && file.path.startsWith('meeting-files/')) {
            filesToDelete.push(file.path);
          }
        });
      }

      // recording_urlからファイルパスを抽出
      if (meeting.recording_url) {
        const url = new URL(meeting.recording_url);
        const pathMatch = url.pathname.match(/\/storage\/v1\/object\/public\/meeting-files\/(.+)/);
        if (pathMatch) {
          filesToDelete.push(`meeting-files/${pathMatch[1]}`);
        }
      }

      console.log(`🔧 [StorageService] 削除対象ファイル:`, filesToDelete);

      // 各ファイルを削除
      for (const filePath of filesToDelete) {
        try {
          const { error: deleteError } = await supabase.storage
            .from('meeting-files')
            .remove([filePath]);

          if (deleteError) {
            console.error(`🔧 [StorageService] ファイル削除エラー (${filePath}):`, deleteError);
          } else {
            console.log(`🔧 [StorageService] ファイル削除成功: ${filePath}`);
          }
        } catch (error) {
          console.error(`🔧 [StorageService] ファイル削除中にエラー (${filePath}):`, error);
        }
      }

      console.log(`🔧 [StorageService] ミーティング ${meetingId} のオーディオファイル削除完了`);

    } catch (error) {
      console.error(`🔧 [StorageService] オーディオファイル削除エラー:`, error);
      throw error;
    }
  }

  /**
   * 特定のファイルパスを削除
   */
  static async deleteFile(filePath: string): Promise<boolean> {
    try {
      console.log(`🔧 [StorageService] ファイル削除: ${filePath}`);

      const { error } = await supabase.storage
        .from('meeting-files')
        .remove([filePath]);

      if (error) {
        console.error(`🔧 [StorageService] ファイル削除エラー:`, error);
        return false;
      }

      console.log(`🔧 [StorageService] ファイル削除成功: ${filePath}`);
      return true;

    } catch (error) {
      console.error(`🔧 [StorageService] ファイル削除中にエラー:`, error);
      return false;
    }
  }

  /**
   * 複数のファイルを一括削除
   */
  static async deleteFiles(filePaths: string[]): Promise<{ success: string[], failed: string[] }> {
    const success: string[] = [];
    const failed: string[] = [];

    for (const filePath of filePaths) {
      const isSuccess = await this.deleteFile(filePath);
      if (isSuccess) {
        success.push(filePath);
      } else {
        failed.push(filePath);
      }
    }

    return { success, failed };
  }
} 