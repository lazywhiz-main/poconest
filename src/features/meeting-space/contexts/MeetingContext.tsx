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

      // 1. Upload file to storage
      const fileExt = file.name.split('.').pop();
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
    } catch (err) {
      console.error('File upload error:', err);
      setError(err instanceof Error ? err.message : 'ファイルのアップロード中にエラーが発生しました');
      throw err; // エラーを上位に伝播させる
    } finally {
      setIsLoading(false);
    }
  }, [selectedMeeting, loadMeetings]);

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