import React, { useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { NotificationService } from '../services/NotificationService';
import type { NotificationType, NotificationPriority } from '../types/notification';

const NotificationTester: React.FC = () => {
  const { user } = useAuth();
  const [isCreating, setIsCreating] = useState(false);
  const [lastResult, setLastResult] = useState<string>('');

  const createTestNotification = async (type: NotificationType, priority: NotificationPriority = 'normal') => {
    if (!user?.id) {
      setLastResult('❌ ユーザーが認証されていません');
      return;
    }

    setIsCreating(true);
    setLastResult('⏳ 通知を作成中...');

    try {
      const testData = getTestNotificationData(type);
      
      const notification = await NotificationService.createNotification({
        userId: user.id,
        type: type,
        title: testData.title,
        content: testData.content,
        priority: priority,
        data: testData.data
      });

      if (notification) {
        setLastResult(`✅ 通知が作成されました: ${notification.id}`);
        console.log('Created notification:', notification);
      } else {
        setLastResult('❌ 通知の作成に失敗しました');
      }
    } catch (error) {
      console.error('Notification creation error:', error);
      setLastResult(`❌ エラー: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsCreating(false);
    }
  };

  const createJobCompletionNotification = async () => {
    if (!user?.id) {
      setLastResult('❌ ユーザーが認証されていません');
      return;
    }

    setIsCreating(true);
    setLastResult('⏳ ジョブ完了通知を作成中...');

    try {
      const mockJobId = `test-job-${Date.now()}`;
      const mockMeetingId = 'test-meeting-123';
      
      const notification = await NotificationService.createJobCompletionNotification(
        user.id,
        'ai_summary',
        mockJobId,
        mockMeetingId,
        true, // success
        {
          summary: 'テスト用のAI要約結果です。重要なポイントが3つありました。',
          keyPoints: ['ポイント1', 'ポイント2', 'ポイント3'],
          actionItems: ['アクション1', 'アクション2']
        }
      );

      if (notification) {
        setLastResult(`✅ ジョブ完了通知が作成されました: ${notification.id}`);
        console.log('Created job completion notification:', notification);
      } else {
        setLastResult('❌ ジョブ完了通知の作成に失敗しました');
      }
    } catch (error) {
      console.error('Job completion notification error:', error);
      setLastResult(`❌ エラー: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsCreating(false);
    }
  };

  const testDatabaseConnection = async () => {
    setIsCreating(true);
    setLastResult('⏳ データベース接続をテスト中...');

    try {
      // 簡単な通知取得テスト
      const notifications = await NotificationService.getNotifications(user?.id || '', undefined, 1);
      setLastResult(`✅ データベース接続OK - 通知数: ${notifications.length}`);
    } catch (error) {
      console.error('Database test error:', error);
      setLastResult(`❌ データベースエラー: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsCreating(false);
    }
  };

  const getTestNotificationData = (type: NotificationType) => {
    const testData: Record<NotificationType, { title: string; content: string; data: any }> = {
      ai_insight: {
        title: 'AI洞察が生成されました',
        content: 'ミーティングから新しい洞察が発見されました。重要度: 高',
        data: { insightId: 'test-insight-123', confidence: 0.95 }
      },
      ai_summary: {
        title: 'AI要約が完了しました',
        content: 'ミーティングの要約が生成されました。5つの重要なポイントが抽出されています。',
        data: { summaryId: 'test-summary-123', pointCount: 5 }
      },
      card_extraction: {
        title: 'カード抽出が完了しました',
        content: '12枚の新しいカードが抽出されました。',
        data: { cardCount: 12, extractionId: 'test-extraction-123' }
      },
      transcription: {
        title: '転写が完了しました',
        content: 'ミーティングの転写が完了しました。約45分の音声が処理されました。',
        data: { transcriptionId: 'test-transcription-123', duration: 45 }
      },
      mention: {
        title: 'メンションされました',
        content: 'ミーティングであなたがメンションされました。',
        data: { mentionBy: { userId: 'test-user', userName: 'テストユーザー' } }
      },
      meeting_update: {
        title: 'ミーティングが更新されました',
        content: 'ミーティングの情報が更新されました。',
        data: { meetingId: 'test-meeting-123', updateType: 'title' }
      },
      nest_invite: {
        title: 'NESTに招待されました',
        content: '新しいNESTに招待されました。',
        data: { nestId: 'test-nest-123', invitedBy: 'テストユーザー' }
      },
      member_join: {
        title: '新しいメンバーが参加しました',
        content: 'NESTに新しいメンバーが参加しました。',
        data: { nestId: 'test-nest-123', newMember: 'テストユーザー' }
      },
      system: {
        title: 'システム通知テスト',
        content: 'これはシステム通知のテストです。',
        data: { source: 'notification-tester' }
      },
      urgent: {
        title: '緊急通知テスト',
        content: 'これは緊急通知のテストです。',
        data: { level: 'urgent', source: 'notification-tester' }
      },
      knowledge_graph: {
        title: '知識グラフが更新されました',
        content: '新しい知識ノードが追加されました。',
        data: { nodeCount: 5, graphId: 'test-graph-123' }
      }
    };

    return testData[type] || testData.system;
  };

  if (!user) {
    return (
      <div style={{ padding: '20px', fontFamily: 'monospace' }}>
        <h2>🔒 通知テスター</h2>
        <p>ログインが必要です</p>
      </div>
    );
  }

  return (
    <div style={{ 
      padding: '20px', 
      fontFamily: 'monospace', 
      backgroundColor: '#0f0f23', 
      color: '#e2e8f0',
      minHeight: '100vh'
    }}>
      <h1>🧪 通知システムテスター</h1>
      
      <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#1a1a2e', borderRadius: '4px' }}>
        <p><strong>ユーザー:</strong> {user.email}</p>
        <p><strong>ユーザーID:</strong> {user.id}</p>
      </div>

      <div style={{ marginBottom: '30px' }}>
        <h3>📊 システムテスト</h3>
        <button
          onClick={testDatabaseConnection}
          disabled={isCreating}
          style={{
            padding: '10px 16px',
            marginRight: '10px',
            backgroundColor: '#333366',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isCreating ? 'not-allowed' : 'pointer'
          }}
        >
          データベース接続テスト
        </button>
      </div>

      <div style={{ marginBottom: '30px' }}>
        <h3>🔔 基本通知テスト</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px' }}>
          {([
            'ai_insight', 
            'ai_summary', 
            'card_extraction', 
            'transcription',
            'mention',
            'meeting_update',
            'nest_invite',
            'member_join',
            'system', 
            'urgent',
            'knowledge_graph'
          ] as NotificationType[]).map(type => (
            <button
              key={type}
              onClick={() => createTestNotification(type)}
              disabled={isCreating}
              style={{
                padding: '10px 16px',
                backgroundColor: '#00ff88',
                color: '#0f0f23',
                border: 'none',
                borderRadius: '4px',
                cursor: isCreating ? 'not-allowed' : 'pointer',
                textTransform: 'uppercase',
                fontSize: '12px',
                fontWeight: 'bold'
              }}
            >
              {type.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: '30px' }}>
        <h3>⚙️ 高度なテスト</h3>
        <button
          onClick={createJobCompletionNotification}
          disabled={isCreating}
          style={{
            padding: '10px 16px',
            backgroundColor: '#42a5f5',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isCreating ? 'not-allowed' : 'pointer'
          }}
        >
          ジョブ完了通知テスト
        </button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>📋 結果</h3>
        <div style={{
          padding: '15px',
          backgroundColor: '#1a1a2e',
          border: '1px solid #333366',
          borderRadius: '4px',
          minHeight: '50px',
          whiteSpace: 'pre-wrap'
        }}>
          {lastResult || '結果がここに表示されます...'}
        </div>
      </div>

      <div style={{ 
        padding: '15px', 
        backgroundColor: '#333366', 
        borderRadius: '4px',
        fontSize: '12px'
      }}>
        <h4>💡 使用方法</h4>
        <ol>
          <li>まず「データベース接続テスト」でシステムが正常かを確認</li>
          <li>基本通知テストで各タイプの通知を作成</li>
          <li>/notifications ページで作成された通知を確認</li>
          <li>ブラウザの開発者ツールでコンソールログも確認</li>
        </ol>
      </div>
    </div>
  );
};

export default NotificationTester; 