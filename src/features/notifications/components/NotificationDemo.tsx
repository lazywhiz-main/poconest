import React, { useState } from 'react';
import { supabase } from '../../../services/supabase/client';
import { useNotifications } from '../hooks/useNotifications';
import { NotificationService } from '../services/NotificationService';
import type { NotificationType, NotificationPriority } from '../types/notification';

const NotificationDemo: React.FC = () => {
  const {
    notifications,
    unreadCount,
    stats,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refresh,
    requestPermission,
    hasPermission
  } = useNotifications({
    limit: 20,
    autoRefresh: true
  });

  const [selectedType, setSelectedType] = useState<NotificationType>('ai_insight');
  const [selectedPriority, setSelectedPriority] = useState<NotificationPriority>('normal');
  const [testTitle, setTestTitle] = useState('テスト通知');
  const [testContent, setTestContent] = useState('これはテスト用の通知です。');

  const notificationTypes: NotificationType[] = [
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
  ];

  const priorities: NotificationPriority[] = ['low', 'normal', 'high', 'urgent'];

  const handleCreateTestNotification = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert('ログインが必要です');
      return;
    }

    const success = await NotificationService.createNotification({
      userId: user.id,
      type: selectedType,
      title: testTitle,
      content: testContent,
      priority: selectedPriority,
      data: {
        metadata: {
          testData: true,
          createdAt: new Date().toISOString()
        }
      }
    });

    if (success) {
      alert('テスト通知が作成されました！');
    } else {
      alert('通知の作成に失敗しました');
    }
  };

  const handleCreateJobNotification = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert('ログインが必要です');
      return;
    }

    const success = await NotificationService.createJobCompletionNotification(
      user.id,
      'ai_summary',
      'test-job-' + Date.now(),
      'test-meeting-' + Date.now(),
      true,
      {
        summary: 'これはテスト用のAI要約です。実際のミーティングでは詳細な内容が生成されます。',
        wordCount: 150,
        timestamp: new Date().toISOString()
      }
    );

    if (success) {
      alert('ジョブ完了通知が作成されました！');
    } else {
      alert('通知の作成に失敗しました');
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'たった今';
    if (minutes < 60) return `${minutes}分前`;
    if (hours < 24) return `${hours}時間前`;
    return `${days}日前`;
  };

  const getPriorityColor = (priority: NotificationPriority) => {
    switch (priority) {
      case 'urgent': return 'text-red-500';
      case 'high': return 'text-orange-500';
      case 'normal': return 'text-blue-500';
      case 'low': return 'text-gray-500';
      default: return 'text-gray-500';
    }
  };

  const getTypeIcon = (type: NotificationType) => {
    switch (type) {
      case 'ai_insight': return '🤖';
      case 'ai_summary': return '📝';
      case 'card_extraction': return '📇';
      case 'transcription': return '🎙️';
      case 'mention': return '@';
      case 'meeting_update': return '📅';
      case 'nest_invite': return '📨';
      case 'member_join': return '👋';
      case 'system': return '⚙️';
      case 'urgent': return '🚨';
      case 'knowledge_graph': return '🕸️';
      default: return '📢';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            🔔 通知システム デモ
          </h1>
          
          {/* 統計情報 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-blue-600">総通知数</h3>
              <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
            </div>
            <div className="bg-red-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-red-600">未読通知</h3>
              <p className="text-2xl font-bold text-red-900">{unreadCount}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-green-600">24時間以内</h3>
              <p className="text-2xl font-bold text-green-900">{stats.recent}</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-purple-600">通知許可</h3>
              <p className="text-2xl font-bold text-purple-900">
                {hasPermission ? '✅' : '❌'}
              </p>
            </div>
          </div>

          {/* ブラウザ通知許可 */}
          {!hasPermission && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-yellow-800">
                    ブラウザ通知を有効にしてください
                  </h4>
                  <p className="text-sm text-yellow-600">
                    重要な通知をリアルタイムで受け取るために必要です
                  </p>
                </div>
                <button
                  onClick={requestPermission}
                  className="bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600 transition-colors"
                >
                  許可する
                </button>
              </div>
            </div>
          )}

          {/* テスト通知作成 */}
          <div className="border border-gray-200 rounded-lg p-4 mb-6">
            <h2 className="text-lg font-semibold mb-4">テスト通知の作成</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  通知タイプ
                </label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value as NotificationType)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  {notificationTypes.map(type => (
                    <option key={type} value={type}>
                      {getTypeIcon(type)} {type}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  優先度
                </label>
                <select
                  value={selectedPriority}
                  onChange={(e) => setSelectedPriority(e.target.value as NotificationPriority)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  {priorities.map(priority => (
                    <option key={priority} value={priority}>
                      {priority}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <input
                type="text"
                value={testTitle}
                onChange={(e) => setTestTitle(e.target.value)}
                placeholder="通知タイトル"
                className="border border-gray-300 rounded-lg px-3 py-2"
              />
              <input
                type="text"
                value={testContent}
                onChange={(e) => setTestContent(e.target.value)}
                placeholder="通知内容"
                className="border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleCreateTestNotification}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
              >
                テスト通知を作成
              </button>
              <button
                onClick={handleCreateJobNotification}
                className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
              >
                ジョブ完了通知を作成
              </button>
            </div>
          </div>

          {/* 操作ボタン */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={refresh}
              disabled={isLoading}
              className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 disabled:opacity-50 transition-colors"
            >
              {isLoading ? '読み込み中...' : '更新'}
            </button>
            <button
              onClick={markAllAsRead}
              disabled={unreadCount === 0}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
            >
              全て既読にする
            </button>
          </div>

          {/* エラー表示 */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800">{error}</p>
            </div>
          )}
        </div>

        {/* 通知一覧 */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">通知一覧</h2>
          
          {notifications.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p className="text-lg">通知がありません</p>
              <p className="text-sm">上のボタンでテスト通知を作成してみてください</p>
            </div>
          ) : (
            <div className="space-y-4">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`border rounded-lg p-4 transition-all ${
                    notification.status === 'unread' 
                      ? 'border-blue-200 bg-blue-50' 
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">
                          {getTypeIcon(notification.type)}
                        </span>
                        <h3 className="font-medium text-gray-900">
                          {notification.title}
                        </h3>
                        <span className={`text-xs px-2 py-1 rounded-full bg-gray-100 ${getPriorityColor(notification.priority)}`}>
                          {notification.priority}
                        </span>
                        {notification.status === 'unread' && (
                          <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                        )}
                      </div>
                      <p className="text-gray-600 text-sm mb-2">
                        {notification.content}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>{formatTime(notification.createdAt)}</span>
                        <span>{notification.type}</span>
                        {notification.data.jobId && (
                          <span>Job: {notification.data.jobId.substring(0, 8)}...</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      {notification.status === 'unread' && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="text-blue-500 hover:text-blue-700 text-sm"
                        >
                          既読
                        </button>
                      )}
                      <button
                        onClick={() => deleteNotification(notification.id)}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        削除
                      </button>
                    </div>
                  </div>
                  
                  {/* アクション表示 */}
                  {notification.data.actions && notification.data.actions.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="flex gap-2">
                        {notification.data.actions.map((action: any) => (
                          <button
                            key={action.id}
                            className={`px-3 py-1 rounded text-sm transition-colors ${
                              action.type === 'primary'
                                ? 'bg-blue-500 text-white hover:bg-blue-600'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                          >
                            {action.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationDemo; 