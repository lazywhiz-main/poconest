import { MeetingUI } from '../types/meeting';
import { BackgroundJob } from '../types/backgroundJob';

export type ProcessingStatus = 'completed' | 'processing' | 'pending';

export interface ProcessingState {
  transcription: ProcessingStatus;
  aiSummary: ProcessingStatus;
  cardExtraction: ProcessingStatus;
}

/**
 * ミーティングの処理状態を統一的に判定
 */
export function getProcessingState(
  meeting: MeetingUI, 
  backgroundJobs: BackgroundJob[] = []
): ProcessingState {
  // 該当ミーティングのアクティブなジョブを取得
  const meetingJobs = backgroundJobs.filter(job => job.meetingId === meeting.id);
  
  const getJobStatus = (jobType: 'ai_summary' | 'card_extraction' | 'transcription'): ProcessingStatus => {
    const job = meetingJobs.find(j => j.type === jobType);
    if (job) {
      if (job.status === 'completed') return 'completed';
      if (job.status === 'running' || job.status === 'pending') return 'processing';
    }
    return 'pending';
  };

  return {
    // 文字起こし: transcriptフィールド + バックグラウンドジョブ状態
    transcription: meeting.transcript && meeting.transcript.trim() 
      ? 'completed' 
      : getJobStatus('transcription'),
    
    // AI要約: aiSummaryフィールド + バックグラウンドジョブ状態
    aiSummary: meeting.aiSummary && meeting.aiSummary.trim() 
      ? 'completed' 
      : getJobStatus('ai_summary'),
    
    // カード抽出: バックグラウンドジョブ状態のみで判定
    cardExtraction: getJobStatus('card_extraction'),
  };
}

/**
 * ドット表示用のアイコンと色を取得
 */
export function getStatusDisplay(status: ProcessingStatus) {
  switch (status) {
    case 'completed':
      return { icon: '●', color: '#4caf50' }; // 緑
    case 'processing':
      return { icon: '●', color: '#ff9800' }; // オレンジ
    case 'pending':
      return { icon: '○', color: '#6c7086' }; // グレー
    default:
      return { icon: '○', color: '#6c7086' };
  }
}

/**
 * ステータスラベルを取得
 */
export function getStatusLabel(status: ProcessingStatus): string {
  switch (status) {
    case 'completed': return '完了';
    case 'processing': return '処理中';
    case 'pending': return '未実施';
    default: return '未実施';
  }
} 