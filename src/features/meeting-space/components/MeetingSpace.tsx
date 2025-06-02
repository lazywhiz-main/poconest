import React, { useRef } from 'react';
import { useMeeting } from '../contexts/MeetingContext';
import { Meeting } from '../types/meeting';
import { supabase } from '../../../lib/supabase';

interface MeetingSpaceProps {
  nestId: string;
}

const MeetingSpace: React.FC<MeetingSpaceProps> = ({ nestId }) => {
  const { meetings, selectedMeeting, selectMeeting, loadMeetings, uploadFile }: {
    meetings: Meeting[];
    selectedMeeting: Meeting | null;
    selectMeeting: (meeting: Meeting) => void;
    loadMeetings: () => Promise<void>;
    uploadFile: (file: File, meetingId: string) => Promise<void>;
  } = useMeeting();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'text/plain') {
      alert('txtファイルのみ対応しています');
      return;
    }

    try {
      // 新しいミーティングを作成
      const { data: meetingData, error: insertError } = await supabase.from('meetings').insert([
        {
          title: file.name.replace(/\.txt$/, ''),
          description: '',
          start_time: new Date().toISOString(),
          end_time: new Date().toISOString(),
          participants: [],
          uploaded_files: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]).select().single();

      if (insertError) throw insertError;
      if (!meetingData) throw new Error('ミーティングの作成に失敗しました');

      // ファイルをアップロード
      await uploadFile(file, meetingData.id);
      await loadMeetings();
      alert('アップロード成功');
    } catch (err) {
      console.error('アップロードエラー:', err);
      alert('アップロードに失敗しました: ' + (err instanceof Error ? err.message : '不明なエラー'));
    }
  };

  const handleUploadButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="meeting-space-root" style={{ display: 'flex', height: '100%', width: '100%' }}>
      {/* 左カラム: ミーティング一覧 */}
      <div className="meeting-list-col" style={{ width: 320, borderRight: '1px solid #222', padding: 0, background: '#18181c', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid #222', fontWeight: 600, fontSize: 18 }}>ミーティング</div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          {meetings.length === 0 ? (
            <div style={{ padding: 24, color: '#888' }}>ミーティングがありません</div>
          ) : (
            <div>
              {meetings.map(mtg => (
                <div
                  key={mtg.id}
                  className="event-item"
                  style={{
                    background: '#0f0f23',
                    border: selectedMeeting?.id === mtg.id ? '2px solid #00ff88' : '1px solid #333366',
                    borderRadius: 4,
                    padding: '12px 16px',
                    marginBottom: 16,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: selectedMeeting?.id === mtg.id ? '0 0 0 2px #00ff8855' : undefined,
                  }}
                  onClick={() => selectMeeting(mtg)}
                >
                  <div className="event-time" style={{ color: '#64b5f6', fontSize: 11, fontFamily: 'JetBrains Mono, monospace', marginBottom: 4 }}>
                    {mtg.startTime ? new Date(mtg.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                  </div>
                  <div className="event-title" style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 500, marginBottom: 2 }}>
                    {mtg.title || '無題ミーティング'}
                  </div>
                  <div className="event-type" style={{ color: '#6c7086', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {'会議'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ padding: 16, borderTop: '1px solid #222' }}>
          <input
            type="file"
            accept=".txt"
            style={{ display: 'none' }}
            ref={fileInputRef}
            onChange={handleFileUpload}
          />
          <button
            type="button"
            style={{ width: '100%', padding: '8px 0', background: '#2d8cff', color: '#fff', border: 'none', borderRadius: 4, fontWeight: 600 }}
            onClick={handleUploadButtonClick}
          >
            メモをアップロード
          </button>
        </div>
      </div>
      {/* 右カラム: 詳細 or アップロード */}
      <div className="meeting-detail-col" style={{ flex: 1, minWidth: 0, background: '#18181c', display: 'flex', flexDirection: 'column' }}>
        {selectedMeeting ? (
          <div style={{ padding: 32 }}>
            <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>{selectedMeeting.title || '無題ミーティング'}</div>
            <div style={{ fontSize: 14, color: '#aaa', marginBottom: 16 }}>{selectedMeeting.startTime ? new Date(selectedMeeting.startTime).toLocaleString() : ''}</div>
            <div style={{ marginBottom: 16 }}>（ここにミーティング詳細情報・要約・ファイル情報などを配置予定）</div>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', fontSize: 18 }}>
            ミーティングを選択するか、メモをアップロードしてください
          </div>
        )}
      </div>
    </div>
  );
};

export default MeetingSpace; 