import React from 'react';
import { BackgroundJob, JobMessages, ProcessingSteps } from '../types/backgroundJob';
import { useBackgroundJobs } from '../hooks/useBackgroundJobs';

interface BackgroundJobProgressProps {
  meetingId: string;
  className?: string;
  showDebugInfo?: boolean;
}

const BackgroundJobProgress: React.FC<BackgroundJobProgressProps> = ({ 
  meetingId, 
  className = '',
  showDebugInfo = false
}) => {
  const { getJobsByMeeting, cancelJob, retryJob } = useBackgroundJobs();
  const jobs = getJobsByMeeting(meetingId);

  const activeJobs = jobs.filter(job => 
    job.status === 'pending' || job.status === 'running'
  );

  // 完了したジョブも最近のものは表示
  const recentCompletedJobs = jobs.filter(job => 
    (job.status === 'completed' || job.status === 'failed') &&
    Date.now() - job.updatedAt.getTime() < 30000 // 30秒以内
  );

  const displayJobs = [...activeJobs, ...recentCompletedJobs];

  if (displayJobs.length === 0) {
    return null;
  }

  const getProgressMessage = (job: BackgroundJob): string => {
    // メタデータのcurrent_stepを優先
    if (job.metadata?.current_step) {
      return job.metadata.current_step;
    }

    const messages = JobMessages[job.type];
    const steps = ProcessingSteps[job.type];
    
    if (job.status === 'pending') {
      return messages.pending;
    }
    
    if (job.status === 'running' && steps) {
      const currentStep = Math.floor((job.progress / 100) * steps.length);
      const step = steps[Math.min(currentStep, steps.length - 1)];
      return `${step.label} - ${step.description}`;
    }
    
    return messages[job.status] || messages.running;
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'pending': return 'text-yellow-600';
      case 'running': return 'text-blue-600';
      case 'completed': return 'text-green-600';
      case 'failed': return 'text-red-600';
      case 'cancelled': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  const getProgressBarColor = (status: string): string => {
    switch (status) {
      case 'pending': return 'bg-yellow-500';
      case 'running': return 'bg-blue-500';
      case 'completed': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      case 'cancelled': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getJobTypeLabel = (type: string): string => {
    switch (type) {
      case 'ai_summary': return 'AI要約生成';
      case 'card_extraction': return 'カード抽出';
      case 'transcription': return '文字起こし';
      default: return type;
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="text-sm font-medium text-gray-700 mb-2">
        バックグラウンド処理
      </div>
      
      {displayJobs.map((job) => (
        <div 
          key={job.id} 
          className={`rounded-lg border p-4 shadow-sm ${
            job.status === 'completed' ? 'bg-green-50 border-green-200' :
            job.status === 'failed' ? 'bg-red-50 border-red-200' :
            'bg-white border-gray-200'
          }`}
        >
          {/* ヘッダー */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1">
                {job.status === 'running' && (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
                )}
                {job.status === 'completed' && (
                  <div className="text-green-500">✓</div>
                )}
                {job.status === 'failed' && (
                  <div className="text-red-500">✗</div>
                )}
                <span className={`text-sm font-medium ${getStatusColor(job.status)}`}>
                  {getJobTypeLabel(job.type)}
                </span>
              </div>
            </div>
            
            {/* アクション */}
            <div className="flex space-x-2">
              {(job.status === 'pending' || job.status === 'running') && (
                <button
                  onClick={() => cancelJob(job.id)}
                  className="text-xs text-gray-500 hover:text-red-600 transition-colors"
                >
                  キャンセル
                </button>
              )}
              {job.status === 'failed' && (
                <button
                  onClick={() => retryJob(job.id)}
                  className="text-xs text-gray-500 hover:text-blue-600 transition-colors"
                >
                  再試行
                </button>
              )}
            </div>
          </div>

          {/* 進捗メッセージ */}
          <p className="text-sm text-gray-600 mb-3">
            {getProgressMessage(job)}
          </p>

          {/* 進捗バー */}
          {(job.status === 'pending' || job.status === 'running') && (
            <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${getProgressBarColor(job.status)}`}
                style={{ width: `${job.progress}%` }}
              />
            </div>
          )}

          {/* 進捗パーセンテージと時間情報 */}
          <div className="flex justify-between items-center text-xs text-gray-500">
            <span>
              {job.status === 'completed' ? '100% 完了' : 
               job.status === 'failed' ? 'エラーが発生しました' :
               `${job.progress}% 完了`}
            </span>
            <span>
              {job.status === 'completed' && 
                `完了: ${job.updatedAt.toLocaleTimeString()}`
              }
              {job.status === 'failed' && 
                `失敗: ${job.updatedAt.toLocaleTimeString()}`
              }
              {(job.status === 'pending' || job.status === 'running') && job.estimatedCompletion &&
                `予想完了: ${new Date(job.estimatedCompletion).toLocaleTimeString()}`
              }
            </span>
          </div>

          {/* 結果プレビュー */}
          {job.status === 'completed' && job.result && (
            <div className="mt-3 p-2 bg-gray-50 border border-gray-200 rounded text-sm">
              <div className="font-medium text-gray-700 mb-1">処理結果:</div>
              {job.type === 'ai_summary' && job.result.summary && (
                <div className="text-gray-600 max-h-20 overflow-y-auto">
                  {job.result.summary.split('\n').slice(0, 3).join('\n')}
                  {job.result.summary.split('\n').length > 3 && '...'}
                </div>
              )}
              {job.type === 'card_extraction' && job.result.cards && (
                <div className="text-gray-600">
                  {job.result.count}枚のカードを抽出しました
                </div>
              )}
            </div>
          )}

          {/* エラーメッセージ */}
          {job.status === 'failed' && job.errorMessage && (
            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
              エラー: {job.errorMessage}
            </div>
          )}

          {/* デバッグ情報 - プロダクション環境では非表示 */}
          {showDebugInfo && (
            <details className="mt-2">
              <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">
                デバッグ情報
              </summary>
              <div className="mt-1 p-2 bg-gray-100 rounded text-xs text-gray-600 font-mono">
                <div>ジョブID: {job.id}</div>
                <div>ステータス: {job.status}</div>
                <div>作成: {job.createdAt.toLocaleString()}</div>
                <div>更新: {job.updatedAt.toLocaleString()}</div>
                {job.metadata && Object.keys(job.metadata).length > 0 && (
                  <div>メタデータ: {JSON.stringify(job.metadata, null, 2)}</div>
                )}
              </div>
            </details>
          )}
        </div>
      ))}
    </div>
  );
};

export default BackgroundJobProgress; 