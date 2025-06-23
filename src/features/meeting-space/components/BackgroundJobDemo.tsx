import React, { useState, useEffect } from 'react';
import MeetingSpaceWithJobs from './MeetingSpaceWithJobs';
import { supabase } from '../../../services/supabase/client';

// UUID v4 生成関数
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

interface DemoMeeting {
  id: string;
  displayId: string;
  title: string;
  hasTranscript: boolean;
}

const BackgroundJobDemo: React.FC = () => {
  const [selectedMeeting, setSelectedMeeting] = useState<string>('');
  const [demoMeetings, setDemoMeetings] = useState<DemoMeeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 実際のミーティングを取得または作成
  useEffect(() => {
    const setupDemoMeetings = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // 認証状態確認
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          throw new Error('認証が必要です');
        }

        console.log('[BackgroundJobDemo] Current user:', user.id);

        // 既存のミーティングを取得
        const { data: existingMeetings, error: fetchError } = await supabase
          .from('meetings')
          .select('id, title, transcript')
          .limit(10);

        if (fetchError) {
          console.error('[BackgroundJobDemo] Fetch error:', fetchError);
          throw fetchError;
        }

        console.log('[BackgroundJobDemo] Existing meetings:', existingMeetings);

        let meetings: DemoMeeting[] = [];

        if (existingMeetings && existingMeetings.length > 0) {
          // 既存のミーティングを使用
          meetings = existingMeetings.slice(0, 3).map((meeting, index) => ({
            id: meeting.id,
            displayId: `existing-meeting-${index + 1}`,
            title: meeting.title || `既存ミーティング ${index + 1}`,
            hasTranscript: !!meeting.transcript
          }));
        } else {
          // テスト用ミーティングを作成
          console.log('[BackgroundJobDemo] Creating demo meetings...');
          
          const demoMeetingsData = [
            {
              title: 'プロダクト戦略会議',
              description: 'Q1の戦略について話し合い',
              transcript: 'こんにちは、本日のミーティングを始めさせていただきます。今日はプロダクトの次四半期戦略について話し合いたいと思います。まず、現在の状況から確認していきましょう...',
              hasTranscript: true
            },
            {
              title: 'スプリント振り返り',
              description: '前回スプリントの振り返りと改善点の検討',
              transcript: '前回のスプリントの振り返りを行います。目標達成度は80%でした。良かった点として、チーム間のコミュニケーションが改善されたことが挙げられます...',
              hasTranscript: true
            },
            {
              title: '音声のみミーティング',
              description: '録音はあるが文字起こしがまだ',
              transcript: null,
              hasTranscript: false
            }
          ];

          const currentTime = new Date();
          const insertPromises = demoMeetingsData.map(async (meetingData, index) => {
            const meetingTime = new Date(currentTime);
            meetingTime.setHours(currentTime.getHours() - index - 1);

            const { data, error } = await supabase
              .from('meetings')
              .insert([{
                title: meetingData.title,
                description: meetingData.description,
                start_time: meetingTime.toISOString(),
                end_time: new Date(meetingTime.getTime() + 60 * 60 * 1000).toISOString(), // 1時間後
                participants: [],
                uploaded_files: [],
                transcript: meetingData.transcript,
                status: 'completed',
                tags: [],
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }])
              .select()
              .single();

            if (error) {
              console.error(`[BackgroundJobDemo] Insert error for meeting ${index}:`, error);
              throw error;
            }

            return {
              id: data.id,
              displayId: `demo-meeting-${index + 1}`,
              title: meetingData.title,
              hasTranscript: meetingData.hasTranscript
            };
          });

          meetings = await Promise.all(insertPromises);
          console.log('[BackgroundJobDemo] Created demo meetings:', meetings);
        }

        setDemoMeetings(meetings);
        if (meetings.length > 0) {
          setSelectedMeeting(meetings[0].displayId);
        }

      } catch (err) {
        console.error('[BackgroundJobDemo] Setup error:', err);
        setError(err instanceof Error ? err.message : 'セットアップに失敗しました');
      } finally {
        setIsLoading(false);
      }
    };

    setupDemoMeetings();
  }, []);

  const currentMeeting = demoMeetings.find(m => m.displayId === selectedMeeting);

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>デモ環境を準備中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="font-medium text-red-900 mb-2">エラーが発生しました</h3>
          <p className="text-sm text-red-800">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            再読み込み
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-4">バックグラウンドジョブ システム デモ</h1>
        
        {/* ミーティング選択 */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">
            ミーティングを選択:
          </label>
          <select
            value={selectedMeeting}
            onChange={(e) => setSelectedMeeting(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2"
          >
            {demoMeetings.map((meeting) => (
              <option key={meeting.displayId} value={meeting.displayId}>
                {meeting.title} {!meeting.hasTranscript && '(文字起こしなし)'}
              </option>
            ))}
          </select>
        </div>

        {/* 説明 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-medium text-blue-900 mb-2">機能説明</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• AI要約またはカード抽出ボタンをクリックしてジョブを開始</li>
            <li>• 進捗がリアルタイムで表示されます</li>
            <li>• 複数のジョブを同時実行可能</li>
            <li>• ジョブのキャンセルや再試行も可能</li>
            <li>• ページを離れても処理は継続されます</li>
          </ul>
        </div>

        {/* デバッグ情報 */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
          <h3 className="font-medium text-gray-900 mb-2">デバッグ情報</h3>
          <p className="text-sm text-gray-700">
            利用可能ミーティング数: {demoMeetings.length}
          </p>
          <p className="text-sm text-gray-700">
            選択されたミーティング: {currentMeeting?.displayId || 'なし'}
          </p>
          <p className="text-sm text-gray-700">
            実際のUUID: {currentMeeting?.id || 'なし'}
          </p>
        </div>
      </div>

      {/* メインコンテンツ */}
      {currentMeeting && (
        <MeetingSpaceWithJobs
          meetingId={currentMeeting.id}
          meetingTitle={currentMeeting.title}
          hasTranscript={currentMeeting.hasTranscript}
        >
          {/* ミーティング詳細表示エリア */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">
              {currentMeeting.title}
            </h3>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">ミーティング情報</h4>
                <p className="text-sm text-gray-600">
                  Display ID: {currentMeeting.displayId}
                </p>
                <p className="text-sm text-gray-600">
                  Real UUID: {currentMeeting.id}
                </p>
                <p className="text-sm text-gray-600">
                  文字起こし: {currentMeeting.hasTranscript ? '✓ あり' : '✗ なし'}
                </p>
              </div>
              
              {currentMeeting.hasTranscript && (
                <div>
                  <h4 className="font-medium mb-2">文字起こし (サンプル)</h4>
                  <div className="bg-white border rounded p-3 text-sm">
                    こんにちは、本日のミーティングを始めさせていただきます。
                    今日はプロダクトの次四半期戦略について話し合いたいと思います。
                    まず、現在の状況から確認していきましょう...
                  </div>
                </div>
              )}
            </div>
          </div>
        </MeetingSpaceWithJobs>
      )}
    </div>
  );
};

export default BackgroundJobDemo; 