import React, { useState } from 'react';
import { useBackgroundJobs } from '../hooks/useBackgroundJobs';
import BackgroundJobProgress from './BackgroundJobProgress';
import { JobType } from '../types/backgroundJob';

interface MeetingSpaceWithJobsProps {
  meetingId: string;
  meetingTitle?: string;
  hasTranscript?: boolean;
  children?: React.ReactNode;
}

const MeetingSpaceWithJobs: React.FC<MeetingSpaceWithJobsProps> = ({
  meetingId,
  meetingTitle = 'ミーティング',
  hasTranscript = false,
  children
}) => {
  const { createJob, activeJobs, error } = useBackgroundJobs();
  const [isCreatingJob, setIsCreatingJob] = useState<JobType | null>(null);

  const handleStartJob = async (jobType: JobType) => {
    setIsCreatingJob(jobType);
    try {
      const job = await createJob(jobType, meetingId, {
        meetingTitle,
        hasTranscript
      });
      
      if (job) {
        console.log(`[MeetingSpace] Job ${jobType} created:`, job.id);
      }
    } catch (err) {
      console.error(`[MeetingSpace] Failed to create ${jobType} job:`, err);
    } finally {
      setIsCreatingJob(null);
    }
  };

  const canStartSummary = hasTranscript && !activeJobs.some(job => 
    job.meetingId === meetingId && job.type === 'ai_summary'
  );

  const canStartCardExtraction = hasTranscript && !activeJobs.some(job => 
    job.meetingId === meetingId && job.type === 'card_extraction'
  );

  return (
    <div className="space-y-6">
      {/* バックグラウンドジョブ進捗表示 */}
      <BackgroundJobProgress 
        meetingId={meetingId} 
        className="mb-4"
      />

      {/* エラー表示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          エラー: {error}
        </div>
      )}

      {/* ミーティングアクション */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4">AI機能</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* AI要約 */}
          <div className="space-y-2">
            <h4 className="font-medium">AI要約生成</h4>
            <p className="text-sm text-gray-600">
              ミーティング内容をAIが自動要約します
            </p>
            <button
              onClick={() => handleStartJob('ai_summary')}
              disabled={!canStartSummary || isCreatingJob === 'ai_summary'}
              className={`w-full px-4 py-2 rounded-lg font-medium transition-colors ${
                canStartSummary && isCreatingJob !== 'ai_summary'
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isCreatingJob === 'ai_summary' ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  <span>開始中...</span>
                </div>
              ) : (
                'AI要約を開始'
              )}
            </button>
            {!hasTranscript && (
              <p className="text-xs text-amber-600">
                ※ 文字起こしが必要です
              </p>
            )}
          </div>

          {/* カード抽出 */}
          <div className="space-y-2">
            <h4 className="font-medium">アクションアイテム抽出</h4>
            <p className="text-sm text-gray-600">
              タスクや決定事項をカードとして抽出します
            </p>
            <button
              onClick={() => handleStartJob('card_extraction')}
              disabled={!canStartCardExtraction || isCreatingJob === 'card_extraction'}
              className={`w-full px-4 py-2 rounded-lg font-medium transition-colors ${
                canStartCardExtraction && isCreatingJob !== 'card_extraction'
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isCreatingJob === 'card_extraction' ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  <span>開始中...</span>
                </div>
              ) : (
                'カード抽出を開始'
              )}
            </button>
            {!hasTranscript && (
              <p className="text-xs text-amber-600">
                ※ 文字起こしが必要です
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 子コンポーネント */}
      {children}
    </div>
  );
};

export default MeetingSpaceWithJobs; 