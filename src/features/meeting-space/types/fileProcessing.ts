// ファイル処理の詳細な状態管理
// Created: 2024-12-26

export type FileUploadStatus = 'none' | 'uploading' | 'completed' | 'failed';
export type TranscriptionStatus = 'none' | 'pending' | 'processing' | 'completed' | 'failed';

export interface FileProcessingState {
  // ファイルアップロード状態
  uploadStatus: FileUploadStatus;
  uploadProgress: number; // 0-100
  uploadError?: string;
  
  // 文字起こし状態
  transcriptionStatus: TranscriptionStatus;
  transcriptionProgress: number; // 0-100
  transcriptionError?: string;
  transcriptionJobId?: string;
  
  // ファイル情報
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  storagePath?: string;
}

export interface FileProcessingStep {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  message: string;
  error?: string;
  startTime?: Date;
  endTime?: Date;
}

export interface FileProcessingSession {
  sessionId: string;
  meetingId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  startTime: Date;
  endTime?: Date;
  
  steps: FileProcessingStep[];
  currentStep: number;
  
  // 最終結果
  success: boolean;
  finalResult?: {
    storagePath: string;
    transcriptText?: string;
    processingTime: number;
  };
  finalError?: string;
}

// ステップ定義
export const FILE_PROCESSING_STEPS = {
  VALIDATION: {
    id: 'validation',
    name: 'ファイル検証',
    expectedDuration: 1000, // ms
  },
  UPLOAD: {
    id: 'upload',
    name: 'ファイルアップロード',
    expectedDuration: 5000,
  },
  TRANSCRIPTION_START: {
    id: 'transcription_start',
    name: '文字起こし開始',
    expectedDuration: 2000,
  },
  TRANSCRIPTION_PROCESS: {
    id: 'transcription_process', 
    name: '音声解析中',
    expectedDuration: 30000,
  },
  TRANSCRIPTION_SAVE: {
    id: 'transcription_save',
    name: '結果保存',
    expectedDuration: 3000,
  }
} as const;

export type FileProcessingStepId = keyof typeof FILE_PROCESSING_STEPS;

// ヘルパー関数
export const createInitialProcessingState = (): FileProcessingState => ({
  uploadStatus: 'none',
  uploadProgress: 0,
  transcriptionStatus: 'none', 
  transcriptionProgress: 0,
});

export const createProcessingSession = (
  meetingId: string,
  fileName: string,
  fileSize: number,
  fileType: string
): FileProcessingSession => ({
  sessionId: crypto.randomUUID(),
  meetingId,
  fileName,
  fileSize,
  fileType,
  startTime: new Date(),
  steps: Object.values(FILE_PROCESSING_STEPS).map(step => ({
    id: step.id,
    name: step.name,
    status: 'pending' as const,
    progress: 0,
    message: '待機中...',
  })),
  currentStep: 0,
  success: false,
});

export const updateProcessingStep = (
  session: FileProcessingSession,
  stepId: FileProcessingStepId,
  update: Partial<FileProcessingStep>
): FileProcessingSession => {
  const stepIndex = session.steps.findIndex(step => step.id === stepId);
  if (stepIndex === -1) return session;
  
  const updatedSteps = [...session.steps];
  updatedSteps[stepIndex] = { ...updatedSteps[stepIndex], ...update };
  
  return {
    ...session,
    steps: updatedSteps,
    currentStep: Math.max(session.currentStep, stepIndex),
  };
}; 