export type UploadedFile = {
  id: string;
  type: 'txt' | 'video' | 'audio';
  url: string;
  summary?: string;
  created_at: string;
  updated_at: string;
};

export type Meeting = {
  id: string;
  nest_id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  participants: { id: string; name: string; email?: string; role?: string }[];
  uploaded_files: UploadedFile[];
  recording_url?: string;
  transcript?: string;
  ai_summary?: string;
  status: 'scheduled' | 'completed' | 'extracted' | 'cancelled';
  tags: string[];
  created_at: string;
  updated_at: string;
  created_by?: string;
  deleted_at?: string | null;
};

// UI層で使う場合のキャメルケース型（必要に応じて変換関数を用意）
export type MeetingUI = {
  id: string;
  nestId: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  participants: { id: string; name: string; email?: string; role?: string }[];
  uploadedFiles: UploadedFile[];
  recordingUrl?: string;
  transcript?: string;
  aiSummary?: string;
  status: 'scheduled' | 'completed' | 'extracted' | 'cancelled';
  tags: string[];
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  deletedAt?: string | null;
};

export type ActionItem = {
  id: string;
  content: string;
  assignee: string;
  deadline?: string;
  status: 'pending' | 'done';
  createdAt: string;
  updatedAt: string;
};

export type KeyPoint = {
  id: string;
  content: string;
  timestamp: number;
  importance: number;
};

export type MeetingTopic = {
  id: string;
  title: string;
  startTime: number;
  endTime: number;
  keyPoints: KeyPoint[];
  sentiment: string;
};

// カード抽出設定
export type CardExtractionSettings = {
  // 抽出の粒度設定
  extractionGranularity: 'coarse' | 'medium' | 'fine';
  
  // 各カラムタイプごとの最大カード数
  maxCardsPerColumn: {
    INBOX: number;
    QUESTIONS: number;
    INSIGHTS: number;
    THEMES: number;
    ACTIONS: number;
  };
  
  // 全体の最大カード数
  maxTotalCards: number;
};

// カード抽出設定のプリセット
export const CARD_EXTRACTION_PRESETS = {
  coarse: {
    extractionGranularity: 'coarse' as const,
    maxCardsPerColumn: {
      INBOX: 3,
      QUESTIONS: 3,
      INSIGHTS: 3,
      THEMES: 3,
      ACTIONS: 3
    },
    maxTotalCards: 15
  },
  medium: {
    extractionGranularity: 'medium' as const,
    maxCardsPerColumn: {
      INBOX: 6,
      QUESTIONS: 6,
      INSIGHTS: 6,
      THEMES: 6,
      ACTIONS: 6
    },
    maxTotalCards: 30
  },
  fine: {
    extractionGranularity: 'fine' as const,
    maxCardsPerColumn: {
      INBOX: 10,
      QUESTIONS: 10,
      INSIGHTS: 10,
      THEMES: 10,
      ACTIONS: 10
    },
    maxTotalCards: 50
  }
} as const;

// DB型→UI型への変換
export function toMeetingUI(meeting: Meeting): MeetingUI {
  return {
    id: meeting.id,
    nestId: meeting.nest_id,
    title: meeting.title,
    description: meeting.description,
    startTime: meeting.start_time,
    endTime: meeting.end_time,
    participants: meeting.participants,
    uploadedFiles: meeting.uploaded_files,
    recordingUrl: meeting.recording_url,
    transcript: meeting.transcript,
    aiSummary: meeting.ai_summary,
    status: meeting.status,
    tags: meeting.tags,
    createdAt: meeting.created_at,
    updatedAt: meeting.updated_at,
    createdBy: meeting.created_by,
    deletedAt: meeting.deleted_at,
  };
}

// UI型→DB型への変換
export function toMeetingDB(meeting: MeetingUI): Meeting {
  return {
    id: meeting.id,
    nest_id: meeting.nestId,
    title: meeting.title,
    description: meeting.description,
    start_time: meeting.startTime,
    end_time: meeting.endTime,
    participants: meeting.participants,
    uploaded_files: meeting.uploadedFiles,
    recording_url: meeting.recordingUrl,
    transcript: meeting.transcript,
    ai_summary: meeting.aiSummary,
    status: meeting.status,
    tags: meeting.tags,
    created_at: meeting.createdAt,
    updated_at: meeting.updatedAt,
    created_by: meeting.createdBy,
    deleted_at: meeting.deletedAt,
  };
} 