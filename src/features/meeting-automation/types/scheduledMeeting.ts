// ミーティング自動化システム - 型定義
// 実行日: 2025-01-09

export type PlatformType = 'zoom' | 'googlemeet' | 'teams';
export type ScheduledMeetingStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
export type AutomationLogAction = 'auto_join' | 'auto_transcribe' | 'auto_summarize' | 'auto_extract_cards';
export type AutomationLogStatus = 'started' | 'completed' | 'failed';

// メイン型定義
export interface ScheduledMeeting {
  id: string;
  title: string;
  description?: string;
  platformType: PlatformType;
  meetingUrl?: string;
  startTime: Date;
  duration: number; // minutes
  
  // 自動化設定
  autoJoin: boolean;
  autoTranscribe: boolean;
  autoSummarize: boolean;
  autoExtractCards: boolean;
  
  // 参加者とメタデータ
  participants: string[]; // email addresses
  metadata: Record<string, any>;
  
  // 関連データ
  nestId: string;
  createdMeetingId?: string; // 作成された実際のミーティングID
  
  // ステータス管理
  status: ScheduledMeetingStatus;
  
  // 監査ログ
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// データベース形式 (snake_case)
export interface DbScheduledMeeting {
  id: string;
  title: string;
  description?: string;
  platform_type: PlatformType;
  meeting_url?: string;
  start_time: string;
  duration: number;
  
  // 自動化設定
  auto_join: boolean;
  auto_transcribe: boolean;
  auto_summarize: boolean;
  auto_extract_cards: boolean;
  
  // 参加者とメタデータ
  participants: string[];
  metadata: Record<string, any>;
  
  // 関連データ
  nest_id: string;
  created_meeting_id?: string;
  
  // ステータス管理
  status: ScheduledMeetingStatus;
  
  // 監査ログ
  created_by: string;
  created_at: string;
  updated_at: string;
}

// ミーティング作成用のリクエスト型
export interface CreateScheduledMeetingRequest {
  title: string;
  description?: string;
  platformType: PlatformType;
  meetingUrl?: string;
  startTime: Date;
  duration: number;
  
  // 自動化設定
  autoJoin?: boolean;
  autoTranscribe?: boolean;
  autoSummarize?: boolean;
  autoExtractCards?: boolean;
  
  // 参加者
  participants?: string[];
  metadata?: Record<string, any>;
  
  // 関連データ
  nestId: string;
}

// ミーティング更新用のリクエスト型
export interface UpdateScheduledMeetingRequest {
  title?: string;
  description?: string;
  platformType?: PlatformType;
  meetingUrl?: string;
  startTime?: Date;
  duration?: number;
  
  // 自動化設定
  autoJoin?: boolean;
  autoTranscribe?: boolean;
  autoSummarize?: boolean;
  autoExtractCards?: boolean;
  
  // 参加者とメタデータ
  participants?: string[];
  metadata?: Record<string, any>;
  
  // ステータス管理
  status?: ScheduledMeetingStatus;
}

// 自動化ログ
export interface ScheduledMeetingLog {
  id: string;
  scheduledMeetingId: string;
  action: AutomationLogAction;
  status: AutomationLogStatus;
  message?: string;
  metadata: Record<string, any>;
  createdAt: Date;
}

// データベース形式のログ
export interface DbScheduledMeetingLog {
  id: string;
  scheduled_meeting_id: string;
  action: AutomationLogAction;
  status: AutomationLogStatus;
  message?: string;
  metadata: Record<string, any>;
  created_at: string;
}

// 自動化設定のヘルパー型
export interface AutomationSettings {
  autoJoin: boolean;
  autoTranscribe: boolean;
  autoSummarize: boolean;
  autoExtractCards: boolean;
}

// プラットフォーム設定
export interface PlatformConfig {
  type: PlatformType;
  name: string;
  icon: string;
  color: string;
  supportsAutoJoin: boolean;
  supportsAutoTranscribe: boolean;
  urlPattern?: RegExp;
}

// プラットフォーム設定定数
export const PlatformConfigs: Record<PlatformType, PlatformConfig> = {
  zoom: {
    type: 'zoom',
    name: 'Zoom',
    icon: '📹',
    color: '#2D8CFF',
    supportsAutoJoin: true,
    supportsAutoTranscribe: true,
    urlPattern: /^https:\/\/.*\.zoom\.us\/j\/.*$/
  },
  googlemeet: {
    type: 'googlemeet',
    name: 'Google Meet',
    icon: '📞',
    color: '#34A853',
    supportsAutoJoin: false, // 実装予定
    supportsAutoTranscribe: false,
    urlPattern: /^https:\/\/meet\.google\.com\/.*$/
  },
  teams: {
    type: 'teams',
    name: 'Microsoft Teams',
    icon: '💼',
    color: '#6264A7',
    supportsAutoJoin: false, // 実装予定
    supportsAutoTranscribe: false,
    urlPattern: /^https:\/\/teams\.microsoft\.com\/.*$/
  }
};

// バリデーション用のヘルパー関数
export const validateMeetingUrl = (url: string, platformType: PlatformType): boolean => {
  const config = PlatformConfigs[platformType];
  if (!config.urlPattern) return true; // パターンが未定義の場合はバリデーションスキップ
  return config.urlPattern.test(url);
};

export const validateMeetingTime = (startTime: Date, duration: number): boolean => {
  const now = new Date();
  const endTime = new Date(startTime.getTime() + duration * 60 * 1000);
  
  // 開始時間が現在時刻より後である
  if (startTime <= now) return false;
  
  // 期間が有効範囲内である (5分〜8時間)
  if (duration < 5 || duration > 480) return false;
  
  return true;
};

// データベース ↔ アプリケーション間の変換ヘルパー
export const dbToScheduledMeeting = (dbMeeting: DbScheduledMeeting): ScheduledMeeting => ({
  id: dbMeeting.id,
  title: dbMeeting.title,
  description: dbMeeting.description,
  platformType: dbMeeting.platform_type,
  meetingUrl: dbMeeting.meeting_url,
  startTime: new Date(dbMeeting.start_time),
  duration: dbMeeting.duration,
  
  autoJoin: dbMeeting.auto_join,
  autoTranscribe: dbMeeting.auto_transcribe,
  autoSummarize: dbMeeting.auto_summarize,
  autoExtractCards: dbMeeting.auto_extract_cards,
  
  participants: dbMeeting.participants,
  metadata: dbMeeting.metadata,
  
  nestId: dbMeeting.nest_id,
  createdMeetingId: dbMeeting.created_meeting_id,
  
  status: dbMeeting.status,
  
  createdBy: dbMeeting.created_by,
  createdAt: new Date(dbMeeting.created_at),
  updatedAt: new Date(dbMeeting.updated_at)
});

export const scheduledMeetingToDb = (meeting: Partial<ScheduledMeeting>): Partial<DbScheduledMeeting> => {
  const dbMeeting: Partial<DbScheduledMeeting> = {};
  
  if (meeting.id) dbMeeting.id = meeting.id;
  if (meeting.title) dbMeeting.title = meeting.title;
  if (meeting.description !== undefined) dbMeeting.description = meeting.description;
  if (meeting.platformType) dbMeeting.platform_type = meeting.platformType;
  if (meeting.meetingUrl !== undefined) dbMeeting.meeting_url = meeting.meetingUrl;
  if (meeting.startTime) dbMeeting.start_time = meeting.startTime.toISOString();
  if (meeting.duration) dbMeeting.duration = meeting.duration;
  
  if (meeting.autoJoin !== undefined) dbMeeting.auto_join = meeting.autoJoin;
  if (meeting.autoTranscribe !== undefined) dbMeeting.auto_transcribe = meeting.autoTranscribe;
  if (meeting.autoSummarize !== undefined) dbMeeting.auto_summarize = meeting.autoSummarize;
  if (meeting.autoExtractCards !== undefined) dbMeeting.auto_extract_cards = meeting.autoExtractCards;
  
  if (meeting.participants) dbMeeting.participants = meeting.participants;
  if (meeting.metadata) dbMeeting.metadata = meeting.metadata;
  
  if (meeting.nestId) dbMeeting.nest_id = meeting.nestId;
  if (meeting.createdMeetingId !== undefined) dbMeeting.created_meeting_id = meeting.createdMeetingId;
  
  if (meeting.status) dbMeeting.status = meeting.status;
  
  if (meeting.createdBy) dbMeeting.created_by = meeting.createdBy;
  if (meeting.createdAt) dbMeeting.created_at = meeting.createdAt.toISOString();
  if (meeting.updatedAt) dbMeeting.updated_at = meeting.updatedAt.toISOString();
  
  return dbMeeting;
};

export const dbToScheduledMeetingLog = (dbLog: DbScheduledMeetingLog): ScheduledMeetingLog => ({
  id: dbLog.id,
  scheduledMeetingId: dbLog.scheduled_meeting_id,
  action: dbLog.action,
  status: dbLog.status,
  message: dbLog.message,
  metadata: dbLog.metadata,
  createdAt: new Date(dbLog.created_at)
}); 