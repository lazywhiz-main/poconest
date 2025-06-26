import { Meeting } from './meeting';
import { ScheduledMeeting } from '../../meeting-automation/types/scheduledMeeting';

// 統合表示用のミーティング型
export interface UnifiedMeeting {
  id: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime?: Date;
  duration?: number; // minutes
  participants: { id: string; name: string; email?: string; role?: string }[];
  tags: string[];
  
  // 種別とステータス
  type: 'scheduled' | 'actual';
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'extracted';
  
  // 関連ID
  scheduledMeetingId?: string; // scheduled_meetings.id
  actualMeetingId?: string;    // meetings.id
  nestId: string;
  
  // 自動化設定（予約ミーティングの場合のみ）
  automation?: {
    autoJoin: boolean;
    autoTranscribe: boolean;
    autoSummarize: boolean;
    autoExtractCards: boolean;
    platformType?: 'zoom' | 'googlemeet' | 'teams';
    meetingUrl?: string;
  };
  
  // 実際のミーティングデータ（actual の場合のみ）
  actualData?: {
    uploadedFiles: any[];
    recordingUrl?: string;
    transcript?: string;
    aiSummary?: string;
  };
  
  // メタデータ
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

// 変換ヘルパー関数
export const scheduledMeetingToUnified = (scheduled: ScheduledMeeting): UnifiedMeeting => ({
  id: `scheduled_${scheduled.id}`,
  title: scheduled.title,
  description: scheduled.description,
  startTime: scheduled.startTime,
  endTime: new Date(scheduled.startTime.getTime() + scheduled.duration * 60000),
  duration: scheduled.duration,
  participants: scheduled.participants.map((email: string) => ({ id: email, name: email, email })),
  tags: [], // 予約ミーティングにはタグなし
  
  type: 'scheduled',
  status: scheduled.status,
  scheduledMeetingId: scheduled.id,
  actualMeetingId: scheduled.createdMeetingId,
  nestId: scheduled.nestId,
  
  automation: {
    autoJoin: scheduled.autoJoin,
    autoTranscribe: scheduled.autoTranscribe,
    autoSummarize: scheduled.autoSummarize,
    autoExtractCards: scheduled.autoExtractCards,
    platformType: scheduled.platformType,
    meetingUrl: scheduled.meetingUrl,
  },
  
  createdBy: scheduled.createdBy,
  createdAt: scheduled.createdAt,
  updatedAt: scheduled.updatedAt,
});

export const actualMeetingToUnified = (meeting: Meeting): UnifiedMeeting => ({
  id: `actual_${meeting.id}`,
  title: meeting.title,
  description: meeting.description,
  startTime: new Date(meeting.start_time),
  endTime: new Date(meeting.end_time),
  participants: meeting.participants,
  tags: meeting.tags,
  
  type: 'actual',
  status: meeting.status,
  actualMeetingId: meeting.id,
  nestId: meeting.nest_id,
  
  actualData: {
    uploadedFiles: meeting.uploaded_files,
    recordingUrl: meeting.recording_url,
    transcript: meeting.transcript,
    aiSummary: meeting.ai_summary,
  },
  
  createdBy: meeting.created_by,
  createdAt: new Date(meeting.created_at),
  updatedAt: new Date(meeting.updated_at),
});

// ソート・フィルター用のヘルパー
export const sortUnifiedMeetings = (meetings: UnifiedMeeting[], sortBy: 'date' | 'title' = 'date'): UnifiedMeeting[] => {
  return [...meetings].sort((a, b) => {
    if (sortBy === 'date') {
      return b.startTime.getTime() - a.startTime.getTime();
    } else {
      return a.title.localeCompare(b.title);
    }
  });
};

export const filterUnifiedMeetings = (
  meetings: UnifiedMeeting[], 
  filters: {
    query?: string;
    status?: string[];
    type?: ('scheduled' | 'actual')[];
  }
): UnifiedMeeting[] => {
  return meetings.filter(meeting => {
    // 検索クエリフィルター
    if (filters.query?.trim()) {
      const query = filters.query.toLowerCase();
      const titleMatch = meeting.title.toLowerCase().includes(query);
      const descMatch = meeting.description?.toLowerCase().includes(query) || false;
      if (!(titleMatch || descMatch)) {
        return false;
      }
    }
    
    // ステータスフィルター
    if (filters.status?.length && !filters.status.includes(meeting.status)) {
      return false;
    }
    
    // タイプフィルター
    if (filters.type?.length && !filters.type.includes(meeting.type)) {
      return false;
    }
    
    return true;
  });
}; 