export type JobType = 'ai_summary' | 'card_extraction' | 'transcription';

export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface BackgroundJob {
  id: string;
  type: JobType;
  status: JobStatus;
  meetingId: string;
  userId: string;
  progress: number; // 0-100
  result?: any;
  errorMessage?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  estimatedCompletion?: Date;
}

export interface BackgroundJobLog {
  id: string;
  jobId: string;
  status: JobStatus;
  progress: number;
  message?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface CreateJobRequest {
  type: JobType;
  meetingId: string;
  userId: string;
  metadata?: Record<string, any>;
}

export interface UpdateJobRequest {
  progress?: number;
  status?: JobStatus;
  result?: any;
  errorMessage?: string;
  metadata?: Record<string, any>;
  estimatedCompletion?: Date;
}

export interface JobProgressUpdate {
  jobId: string;
  progress: number;
  message?: string;
  estimatedCompletion?: Date;
}

export interface JobCompletionResult {
  jobId: string;
  success: boolean;
  result?: any;
  errorMessage?: string;
}

// ジョブタイプ別の処理ステップ定義
export const ProcessingSteps = {
  ai_summary: [
    { step: 0, label: '音声データ解析中', description: '文字起こしデータを読み込んでいます' },
    { step: 33, label: 'キーポイント抽出中', description: '重要な話題を特定しています' },
    { step: 66, label: '要約生成中', description: 'AI要約を作成しています' },
    { step: 100, label: '完了', description: 'AI要約が完成しました' }
  ],
  card_extraction: [
    { step: 0, label: '発言内容分析中', description: 'ミーティング内容を解析しています' },
    { step: 33, label: 'タスク候補抽出中', description: 'アクションアイテムを特定しています' },
    { step: 66, label: 'カード生成中', description: 'カードを作成しています' },
    { step: 100, label: '完了', description: 'カード抽出が完成しました' }
  ],
  transcription: [
    { step: 0, label: '音声解析中', description: '音声ファイルを処理しています' },
    { step: 33, label: '文字変換中', description: '音声を文字に変換しています' },
    { step: 66, label: '精度向上処理中', description: '変換精度を向上させています' },
    { step: 100, label: '完了', description: '文字起こしが完成しました' }
  ]
} as const;

// ジョブタイプごとの推定時間（分）
export const EstimatedDuration = {
  ai_summary: 3,
  card_extraction: 2,
  transcription: 5
} as const;

// UI表示用のメッセージ
export const JobMessages = {
  ai_summary: {
    skeleton: 'AIが会議内容を分析中...',
    pending: 'AI要約処理を開始します',
    running: 'AI要約を生成中です',
    completed: 'AI要約が完成しました',
    failed: 'AI要約の生成に失敗しました',
    cancelled: 'AI要約処理がキャンセルされました'
  },
  card_extraction: {
    skeleton: 'アクションアイテムを抽出中...',
    pending: 'カード抽出処理を開始します',
    running: 'カードを抽出中です',
    completed: 'カード抽出が完成しました',
    failed: 'カード抽出に失敗しました',
    cancelled: 'カード抽出処理がキャンセルされました'
  },
  transcription: {
    skeleton: '音声を文字起こし中...',
    pending: '文字起こし処理を開始します',
    running: '音声を文字起こし中です',
    completed: '文字起こしが完成しました',
    failed: '文字起こしに失敗しました',
    cancelled: '文字起こし処理がキャンセルされました'
  }
} as const; 