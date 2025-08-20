import React, { createContext, useContext, useState, useCallback } from 'react';
import { Meeting, UploadedFile } from '../types/meeting';
import { supabase } from '../../../services/supabase/client';

type MeetingContextType = {
  meetings: Meeting[];
  selectedMeeting: Meeting | null;
  isLoading: boolean;
  error: string | null;
  loadMeetings: () => Promise<void>;
  selectMeeting: (meeting: Meeting) => void;
  uploadFile: (file: File, meetingId: string) => Promise<void>;
};

const MeetingContext = createContext<MeetingContextType | undefined>(undefined);

export const MeetingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMeetings = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('meetings')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setMeetings(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load meetings');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const selectMeeting = useCallback((meeting: Meeting) => {
    setSelectedMeeting(meeting);
  }, []);

  const uploadFile = useCallback(async (file: File, meetingId: string) => {
    try {
      setIsLoading(true);
      setError(null);

      // 音声・動画ファイルの場合は新しいアーキテクチャで文字起こし処理
      if (file.type.startsWith('audio/') || file.type.startsWith('video/')) {
        console.log('🔧 [MeetingContext] 音声・動画ファイルのため、TranscriptionServiceV2を使用します');
        
        const { TranscriptionServiceV2 } = await import('../../../services/TranscriptionServiceV2');
        
        const result = await TranscriptionServiceV2.transcribeAudio(
          file,
          meetingId,
          undefined // nestIdは後で設定
        );
        
        if (result.success) {
          console.log('🔧 [MeetingContext] 文字起こし開始:', result.jobId);
          await loadMeetings();
        } else {
          console.error('🔧 [MeetingContext] 文字起こしエラー:', result.error);
          throw new Error(result.error);
        }
        
        return;
      }

      // テキストファイルの場合のみ従来の処理（Supabase Storage使用）
      const fileExt = file.name.split('.').pop();
      const isTextFile = file.type === 'text/plain' || file.name.toLowerCase().endsWith('.txt') || file.name.toLowerCase().endsWith('.vtt');
      
      if (!isTextFile) {
        throw new Error('サポートされていないファイル形式です。テキストファイル（.txt, .vtt）のみ対応しています。');
      }
      const fileName = `${meetingId}/${Date.now()}.${fileExt}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('meeting-files')
        .upload(fileName, file);

      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        throw new Error(`ファイルのアップロードに失敗しました: ${uploadError.message}`);
      }

      if (!uploadData) {
        throw new Error('アップロードデータが取得できませんでした');
      }

      // 2. Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('meeting-files')
        .getPublicUrl(fileName);

      if (!publicUrl) {
        throw new Error('公開URLの取得に失敗しました');
      }

      // 3. Create uploaded file record
      const uploadedFile: UploadedFile = {
        id: uploadData.path,
        type: fileExt === 'txt' ? 'txt' : fileExt === 'mp4' ? 'video' : 'audio',
        url: publicUrl,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // 4. Update meeting record
      const { error: updateError } = await supabase
        .from('meetings')
        .update({
          uploaded_files: [...(selectedMeeting?.uploaded_files || []), uploadedFile],
        })
        .eq('id', meetingId);

      if (updateError) {
        console.error('Database update error:', updateError);
        throw new Error(`ミーティング情報の更新に失敗しました: ${updateError.message}`);
      }

      // 5. Refresh meetings
      await loadMeetings();
    } catch (error) {
      console.error('Upload file error:', error);
      setError(error instanceof Error ? error.message : 'アップロードに失敗しました');
    } finally {
      setIsLoading(false);
    }
  }, [selectedMeeting?.uploaded_files, loadMeetings]);

  return (
    <MeetingContext.Provider
      value={{
        meetings,
        selectedMeeting,
        isLoading,
        error,
        loadMeetings,
        selectMeeting,
        uploadFile,
      }}
    >
      {children}
    </MeetingContext.Provider>
  );
};

export const useMeeting = () => {
  const context = useContext(MeetingContext);
  if (context === undefined) {
    throw new Error('useMeeting must be used within a MeetingProvider');
  }
  return context;
}; 