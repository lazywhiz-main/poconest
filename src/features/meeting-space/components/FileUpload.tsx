import React, { useCallback } from 'react';
import { useMeeting } from '../contexts/MeetingContext';

type FileUploadProps = {
  meetingId: string;
};

export const FileUpload: React.FC<FileUploadProps> = ({ meetingId }) => {
  const { uploadFile, isLoading } = useMeeting();

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      // ファイルタイプの検証
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      if (fileExt !== 'txt') {
        alert('現在はtxtファイルのみアップロード可能です');
        return;
      }

      try {
        await uploadFile(file, meetingId);
      } catch (error) {
        console.error('Failed to upload file:', error);
        alert('ファイルのアップロードに失敗しました');
      }
    },
    [meetingId, uploadFile]
  );

  return (
    <div className="mt-4">
      <label className="block">
        <span className="text-gray-700">ファイルをアップロード</span>
        <input
          type="file"
          accept=".txt"
          onChange={handleFileChange}
          disabled={isLoading}
          className="mt-1 block w-full"
        />
      </label>
      {isLoading && <p className="text-sm text-gray-500 mt-2">アップロード中...</p>}
    </div>
  );
}; 