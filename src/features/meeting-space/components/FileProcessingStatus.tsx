import React from 'react';
import { FileProcessingSession, FILE_PROCESSING_STEPS } from '../types/fileProcessing';

interface FileProcessingStatusProps {
  session: FileProcessingSession | null;
  compact?: boolean;
}

const FileProcessingStatus: React.FC<FileProcessingStatusProps> = ({ session, compact = false }) => {
  if (!session) return null;

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (startTime: Date, endTime?: Date): string => {
    const end = endTime || new Date();
    const duration = Math.round((end.getTime() - startTime.getTime()) / 1000);
    return `${duration}秒`;
  };

  const getStepIcon = (status: string): string => {
    switch (status) {
      case 'pending': return '⏳';
      case 'running': return '🔄';
      case 'completed': return '✅';
      case 'failed': return '❌';
      default: return '⏳';
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'pending': return '#6c7086';
      case 'running': return '#00ff88';
      case 'completed': return '#00ff88';
      case 'failed': return '#ff6b6b';
      default: return '#6c7086';
    }
  };

  const getProgressColor = (status: string): string => {
    switch (status) {
      case 'running': return '#00ff88';
      case 'completed': return '#00ff88';
      case 'failed': return '#ff6b6b';
      default: return '#333366';
    }
  };

  if (compact) {
    const currentStep = session.steps[session.currentStep];
    const overallProgress = Math.round((session.currentStep / Math.max(session.steps.length - 1, 1)) * 100);
    
    return (
      <div style={{
        padding: '8px 12px',
        backgroundColor: '#181825',
        borderRadius: '6px',
        border: '1px solid #333366',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '12px',
      }}>
        <div style={{ 
          color: getStatusColor(currentStep?.status || 'pending'),
          fontSize: '14px'
        }}>
          {getStepIcon(currentStep?.status || 'pending')}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ color: '#e2e8f0', fontWeight: 500, marginBottom: '2px' }}>
            {session.fileName}
          </div>
          <div style={{ color: '#a6adc8' }}>
            {currentStep?.name || '待機中'} ({overallProgress}%)
          </div>
        </div>
        <div style={{
          width: '40px',
          height: '4px',
          backgroundColor: '#333366',
          borderRadius: '2px',
          overflow: 'hidden',
        }}>
          <div style={{
            width: `${overallProgress}%`,
            height: '100%',
            backgroundColor: getProgressColor(currentStep?.status || 'pending'),
            transition: 'width 0.3s ease',
          }} />
        </div>
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: '#181825',
      borderRadius: '8px',
      border: '1px solid #333366',
      padding: '16px',
      margin: '8px 0',
    }}>
      {/* ヘッダー */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '16px',
      }}>
        <div>
          <h4 style={{ 
            color: '#e2e8f0', 
            margin: 0, 
            marginBottom: '4px',
            fontSize: '14px',
            fontWeight: 600,
          }}>
            📁 {session.fileName}
          </h4>
          <div style={{ 
            color: '#6c7086', 
            fontSize: '12px',
            display: 'flex',
            gap: '12px',
          }}>
            <span>{formatFileSize(session.fileSize)}</span>
            <span>•</span>
            <span>{session.fileType}</span>
            {session.endTime && (
              <>
                <span>•</span>
                <span>{formatDuration(session.startTime, session.endTime)}</span>
              </>
            )}
          </div>
        </div>
        
        {session.success ? (
          <div style={{ 
            color: '#00ff88', 
            fontSize: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}>
            ✅ 完了
          </div>
        ) : session.endTime ? (
          <div style={{ 
            color: '#ff6b6b', 
            fontSize: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}>
            ❌ 失敗
          </div>
        ) : (
          <div style={{ 
            color: '#00ff88', 
            fontSize: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}>
            🔄 処理中
          </div>
        )}
      </div>

      {/* ステップリスト */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {session.steps.map((step, index) => (
          <div 
            key={step.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '8px',
              backgroundColor: index === session.currentStep ? '#232345' : 'transparent',
              borderRadius: '6px',
              transition: 'background-color 0.2s ease',
            }}
          >
            {/* ステップアイコン */}
            <div style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              backgroundColor: getStatusColor(step.status),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              color: step.status === 'pending' ? '#e2e8f0' : '#000',
              fontWeight: 600,
            }}>
              {step.status === 'running' ? (
                <div style={{
                  width: '12px',
                  height: '12px',
                  border: '2px solid #000',
                  borderTop: '2px solid transparent',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                }} />
              ) : (
                getStepIcon(step.status)
              )}
            </div>

            {/* ステップ情報 */}
            <div style={{ flex: 1 }}>
              <div style={{
                color: '#e2e8f0',
                fontSize: '13px',
                fontWeight: 500,
                marginBottom: '2px',
              }}>
                {step.name}
              </div>
              <div style={{
                color: '#a6adc8',
                fontSize: '11px',
              }}>
                {step.message}
              </div>
            </div>

            {/* 進捗バー */}
            {step.status === 'running' && (
              <div style={{
                width: '60px',
                height: '4px',
                backgroundColor: '#333366',
                borderRadius: '2px',
                overflow: 'hidden',
              }}>
                <div style={{
                  width: `${step.progress}%`,
                  height: '100%',
                  backgroundColor: '#00ff88',
                  transition: 'width 0.3s ease',
                }} />
              </div>
            )}

            {/* 時間表示 */}
            {step.endTime && (
              <div style={{
                color: '#6c7086',
                fontSize: '11px',
                minWidth: '40px',
                textAlign: 'right',
              }}>
                {step.startTime && formatDuration(step.startTime, step.endTime)}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* エラー表示 */}
      {session.finalError && (
        <div style={{
          marginTop: '12px',
          padding: '8px 12px',
          backgroundColor: '#ff6b6b20',
          border: '1px solid #ff6b6b40',
          borderRadius: '6px',
          color: '#ff6b6b',
          fontSize: '12px',
        }}>
          ❌ {session.finalError}
        </div>
      )}

      {/* スピンアニメーション */}
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

export default FileProcessingStatus; 