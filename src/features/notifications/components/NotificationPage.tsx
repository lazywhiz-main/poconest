import React, { useState } from 'react';
import { useNotifications } from '../hooks/useNotifications';
import { NotificationService } from '../services/NotificationService';
import { ServiceHeader } from '../../../components/ServiceHeader';
import Icon, { IconName } from '../../../components/ui/Icon';
import type { NotificationType, NotificationPriority, NotificationFilter } from '../types/notification';
import '../styles/notification-page.css';

const NotificationPage: React.FC = () => {
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
    hasPermission,
    setFilter,
    clearFilter
  } = useNotifications({
    limit: 50,
    autoRefresh: true
  });

  const [selectedType, setSelectedType] = useState<NotificationType | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'unread' | 'read'>('all');
  const [selectedNotification, setSelectedNotification] = useState<string | null>(null);

  const notificationTypes: { value: NotificationType | 'all'; label: string; icon: IconName }[] = [
    { value: 'all', label: 'すべて', icon: 'bell' },
    { value: 'ai_insight', label: 'AI洞察', icon: 'ai-summary' },
    { value: 'ai_summary', label: 'AI要約', icon: 'ai-summary' },
    { value: 'card_extraction', label: 'カード抽出', icon: 'card-extract' },
    { value: 'transcription', label: '転写', icon: 'meeting' },
    { value: 'mention', label: 'メンション', icon: 'chat' },
    { value: 'meeting_update', label: 'ミーティング', icon: 'meeting' },
    { value: 'system', label: 'システム', icon: 'settings' },
    { value: 'urgent', label: '緊急', icon: 'bell' }
  ];

  const statusFilters = [
    { value: 'all' as const, label: 'すべて' },
    { value: 'unread' as const, label: '未読' },
    { value: 'read' as const, label: '既読' }
  ];

  // フィルタリング処理
  const handleFilterChange = () => {
    const filter: NotificationFilter = {};
    
    if (selectedType !== 'all') {
      filter.types = [selectedType];
    }
    
    if (selectedStatus !== 'all') {
      filter.status = [selectedStatus];
    }

    if (selectedType === 'all' && selectedStatus === 'all') {
      clearFilter();
    } else {
      setFilter(filter);
    }
  };

  React.useEffect(() => {
    handleFilterChange();
  }, [selectedType, selectedStatus]);

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
      case 'urgent': return '#ff6b6b';
      case 'high': return '#ffa726';
      case 'normal': return '#42a5f5';
      case 'low': return '#66bb6a';
      default: return '#9e9e9e';
    }
  };

  const getTypeIcon = (type: NotificationType): IconName => {
    switch (type) {
      case 'ai_insight': return 'ai-summary';
      case 'ai_summary': return 'ai-summary';
      case 'card_extraction': return 'card-extract';
      case 'transcription': return 'meeting';
      case 'mention': return 'chat';
      case 'meeting_update': return 'meeting';
      case 'nest_invite': return 'share';
      case 'member_join': return 'profile';
      case 'system': return 'settings';
      case 'urgent': return 'bell';
      case 'knowledge_graph': return 'analysis';
      default: return 'bell';
    }
  };

  const selectedNotificationData = notifications.find(n => n.id === selectedNotification);

  return (
    <div className="notification-page">
      <ServiceHeader />
      
      <div className="notification-container">
        {/* ヘッダー */}
        <div className="notification-header">
          <div className="notification-title-section">
            <h1 className="notification-title">
              <Icon name="bell" size={24} />
              通知
            </h1>
            <div className="notification-stats">
              <span className="stat-item">
                総数: <strong>{stats.total}</strong>
              </span>
              <span className="stat-item">
                未読: <strong className="unread-count">{unreadCount}</strong>
              </span>
              <span className="stat-item">
                24時間以内: <strong>{stats.recent}</strong>
              </span>
            </div>
          </div>

          <div className="notification-actions">
            {!hasPermission && (
              <button
                onClick={requestPermission}
                className="action-btn permission-btn"
                title="ブラウザ通知を有効にする"
              >
                <Icon name="bell" size={16} />
                通知許可
              </button>
            )}
            
            <button
              onClick={() => window.location.href = '/notification-settings'}
              className="action-btn settings-btn"
              title="通知設定"
            >
              <Icon name="settings" size={16} />
              設定
            </button>
            
            <button
              onClick={refresh}
              disabled={isLoading}
              className="action-btn refresh-btn"
              title="更新"
            >
              <Icon name="search" size={16} />
              更新
            </button>
            
            <button
              onClick={markAllAsRead}
              disabled={unreadCount === 0}
              className="action-btn mark-all-btn"
              title="すべて既読にする"
            >
              <Icon name="settings" size={16} />
              すべて既読
            </button>
          </div>
        </div>

        {/* フィルター */}
        <div className="notification-filters">
          <div className="filter-group">
            <label className="filter-label">タイプ:</label>
            <div className="filter-buttons">
              {notificationTypes.map(type => (
                <button
                  key={type.value}
                  onClick={() => setSelectedType(type.value)}
                  className={`filter-btn ${selectedType === type.value ? 'active' : ''}`}
                >
                  <Icon name={type.icon} size={14} />
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <label className="filter-label">ステータス:</label>
            <div className="filter-buttons">
              {statusFilters.map(status => (
                <button
                  key={status.value}
                  onClick={() => setSelectedStatus(status.value)}
                  className={`filter-btn ${selectedStatus === status.value ? 'active' : ''}`}
                >
                  {status.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* エラー表示 */}
        {error && (
          <div className="error-message">
            <Icon name="bell" size={16} />
            {error}
          </div>
        )}

        {/* メインコンテンツ */}
        <div className="notification-content">
          {/* 通知リスト */}
          <div className="notification-list">
            {isLoading && notifications.length === 0 ? (
              <div className="loading-state">
                <Icon name="search" size={24} />
                読み込み中...
              </div>
            ) : notifications.length === 0 ? (
              <div className="empty-state">
                <Icon name="bell" size={48} />
                <h3>通知がありません</h3>
                <p>新しい通知が届くとここに表示されます</p>
              </div>
            ) : (
              <div className="notification-items">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => setSelectedNotification(notification.id)}
                    className={`notification-item ${
                      notification.status === 'unread' ? 'unread' : ''
                    } ${selectedNotification === notification.id ? 'selected' : ''}`}
                  >
                    <div className="notification-item-header">
                      <div className="notification-item-icon">
                        <Icon name={getTypeIcon(notification.type)} size={16} />
                      </div>
                      <div className="notification-item-content">
                        <h4 className="notification-item-title">{notification.title}</h4>
                        <p className="notification-item-description">{notification.content}</p>
                      </div>
                      <div className="notification-item-meta">
                        <span 
                          className="priority-indicator"
                          style={{ backgroundColor: getPriorityColor(notification.priority) }}
                        />
                        <span className="notification-time">{formatTime(notification.createdAt)}</span>
                      </div>
                    </div>

                    {notification.status === 'unread' && (
                      <div className="unread-indicator" />
                    )}

                    <div className="notification-item-actions">
                      {notification.status === 'unread' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(notification.id);
                          }}
                          className="item-action-btn read-btn"
                          title="既読にする"
                        >
                          <Icon name="settings" size={14} />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notification.id);
                        }}
                        className="item-action-btn delete-btn"
                        title="削除"
                      >
                        <Icon name="delete" size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 詳細パネル */}
          {selectedNotificationData && (
            <div className="notification-detail">
              <div className="detail-header">
                <div className="detail-header-left">
                  <Icon name={getTypeIcon(selectedNotificationData.type)} size={20} />
                  <h3>{selectedNotificationData.title}</h3>
                </div>
                <button
                  onClick={() => setSelectedNotification(null)}
                  className="detail-close-btn"
                >
                  <Icon name="close" size={16} />
                </button>
              </div>

              <div className="detail-content">
                <div className="detail-meta">
                  <span className="detail-time">
                    {formatTime(selectedNotificationData.createdAt)}
                  </span>
                  <span 
                    className="detail-priority"
                    style={{ color: getPriorityColor(selectedNotificationData.priority) }}
                  >
                    {selectedNotificationData.priority}
                  </span>
                  <span className="detail-type">{selectedNotificationData.type}</span>
                </div>

                <div className="detail-body">
                  <p>{selectedNotificationData.content}</p>
                </div>

                {/* アクションボタン */}
                {selectedNotificationData.data.actions && selectedNotificationData.data.actions.length > 0 && (
                  <div className="detail-actions">
                    <h4>アクション</h4>
                    <div className="action-buttons">
                      {selectedNotificationData.data.actions.map((action: any) => (
                        <button
                          key={action.id}
                          className={`action-button ${action.type}`}
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationPage; 