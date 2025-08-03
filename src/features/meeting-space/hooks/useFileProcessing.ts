import { useState, useCallback, useRef } from 'react';
import { useToast } from '../../../components/ui/Toast';
import { 
  FileProcessingSession, 
  FileProcessingStepId,
  createProcessingSession,
  updateProcessingStep,
  FILE_PROCESSING_STEPS 
} from '../types/fileProcessing';

export interface UseFileProcessingReturn {
  // 現在のセッション
  currentSession: FileProcessingSession | null;
  
  // セッション管理
  startProcessing: (meetingId: string, file: File) => string; // sessionId
  updateStep: (stepId: FileProcessingStepId, update: Partial<FileProcessingSession['steps'][0]>) => void;
  completeSession: (success: boolean, result?: any, error?: string) => void;
  clearSession: () => void;
  
  // 状態取得
  isProcessing: boolean;
  currentStepIndex: number;
  overallProgress: number;
  
  // UI支援
  getStepStatus: (stepId: FileProcessingStepId) => 'pending' | 'running' | 'completed' | 'failed';
  getStepMessage: (stepId: FileProcessingStepId) => string;
  getStepProgress: (stepId: FileProcessingStepId) => number;
}

export const useFileProcessing = (): UseFileProcessingReturn => {
  const [currentSession, setCurrentSession] = useState<FileProcessingSession | null>(null);
  const { showToast } = useToast();
  const sessionRef = useRef<FileProcessingSession | null>(null);

  // セッション開始
  const startProcessing = useCallback((meetingId: string, file: File): string => {
    const session = createProcessingSession(
      meetingId,
      file.name,
      file.size,
      file.type
    );
    
    setCurrentSession(session);
    sessionRef.current = session;
    
    // 開始通知
    showToast({
      title: '📁 ファイル処理開始',
      message: `${file.name} の処理を開始しました`,
      type: 'info'
    });
    
    console.log('🔄 ファイル処理セッション開始:', session);
    return session.sessionId;
  }, [showToast]);

  // ステップ更新
  const updateStep = useCallback((
    stepId: FileProcessingStepId, 
    update: Partial<FileProcessingSession['steps'][0]>
  ) => {
    if (!sessionRef.current) return;
    
    const updatedSession = updateProcessingStep(sessionRef.current, stepId, {
      ...update,
      startTime: update.status === 'running' ? new Date() : update.startTime,
      endTime: (update.status === 'completed' || update.status === 'failed') ? new Date() : update.endTime,
    });
    
    setCurrentSession(updatedSession);
    sessionRef.current = updatedSession;
    
    // ステップ別の通知
    if (update.status === 'completed') {
      const stepName = FILE_PROCESSING_STEPS[stepId].name;
      
      if (stepId === 'UPLOAD') {
        showToast({
          title: '✅ アップロード完了',
          message: '文字起こし処理を開始します',
          type: 'success'
        });
      } else if (stepId === 'TRANSCRIPTION_SAVE') {
        showToast({
          title: '🎉 文字起こし完了',
          message: 'テキストが正常に保存されました',
          type: 'success'
        });
      }
    } else if (update.status === 'failed') {
      const stepName = FILE_PROCESSING_STEPS[stepId].name;
      showToast({
        title: '❌ 処理エラー',
        message: `${stepName}に失敗しました: ${update.error || 'Unknown error'}`,
        type: 'error'
      });
    }
    
    console.log(`🔄 ステップ更新: ${stepId}`, update);
  }, [showToast]);

  // セッション完了
  const completeSession = useCallback((success: boolean, result?: any, error?: string) => {
    if (!sessionRef.current) return;
    
    const completedSession: FileProcessingSession = {
      ...sessionRef.current,
      endTime: new Date(),
      success,
      finalResult: result,
      finalError: error,
    };
    
    setCurrentSession(completedSession);
    sessionRef.current = completedSession;
    
    // 最終通知
    if (success) {
      showToast({
        title: '🎉 処理完了',
        message: `${completedSession.fileName} の処理が正常に完了しました`,
        type: 'success'
      });
    } else {
      showToast({
        title: '❌ 処理失敗',
        message: `${completedSession.fileName} の処理に失敗しました`,
        type: 'error'
      });
    }
    
    console.log('🏁 ファイル処理セッション完了:', completedSession);
  }, [showToast]);

  // セッションクリア
  const clearSession = useCallback(() => {
    setCurrentSession(null);
    sessionRef.current = null;
    console.log('🧹 ファイル処理セッション クリア');
  }, []);

  // 状態取得
  const isProcessing = currentSession ? !currentSession.endTime : false;
  const currentStepIndex = currentSession?.currentStep || 0;
  
  // 全体進捗計算
  const overallProgress = currentSession ? 
    Math.round((currentStepIndex / Math.max(currentSession.steps.length - 1, 1)) * 100) : 0;

  // ステップ状態取得
  const getStepStatus = useCallback((stepId: FileProcessingStepId) => {
    if (!currentSession) return 'pending';
    const step = currentSession.steps.find(s => s.id === stepId);
    return step?.status || 'pending';
  }, [currentSession]);

  const getStepMessage = useCallback((stepId: FileProcessingStepId) => {
    if (!currentSession) return '待機中...';
    const step = currentSession.steps.find(s => s.id === stepId);
    return step?.message || '待機中...';
  }, [currentSession]);

  const getStepProgress = useCallback((stepId: FileProcessingStepId) => {
    if (!currentSession) return 0;
    const step = currentSession.steps.find(s => s.id === stepId);
    return step?.progress || 0;
  }, [currentSession]);

  return {
    currentSession,
    startProcessing,
    updateStep,
    completeSession,
    clearSession,
    isProcessing,
    currentStepIndex,
    overallProgress,
    getStepStatus,
    getStepMessage,
    getStepProgress,
  };
}; 