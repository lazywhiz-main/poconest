import React, { useState, useEffect } from 'react';
import { supabase } from '../../../services/supabase/client';
import { ServiceHeader } from '../../../components/ServiceHeader';
import Icon, { IconName } from '../../../components/ui/Icon';
import type { 
  NotificationSettings, 
  NotificationType, 
  NotificationPriority 
} from '../types/notification';
import '../styles/notification-settings.css';

const NotificationSettings: React.FC = () => {
  const [settings, setSettings] = useState<NotificationSettings>({
    enabled: true,
    browserNotifications: true,
    emailNotifications: false,
    pushNotifications: false,
    typeSettings: {} as any,
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '08:00'
    },
    digestSettings: {
      enabled: false,
      frequency: 'daily',
      maxItems: 10
    }
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);

  const notificationTypes: {
    type: NotificationType;
    label: string;
    description: string;
    icon: IconName;
  }[] = [
    { 
      type: 'ai_insight', 
      label: 'AI洞察', 
      description: 'AIが生成した重要な洞察や分析結果',
      icon: 'ai-summary'
    },
    { 
      type: 'ai_summary', 
      label: 'AI要約', 
      description: 'ミーティングやドキュメントのAI要約',
      icon: 'ai-summary'
    },
    { 
      type: 'card_extraction', 
      label: 'カード抽出', 
      description: '重要な情報カードの自動抽出',
      icon: 'card-extract'
    },
    { 
      type: 'transcription', 
      label: '音声転写', 
      description: '音声の自動転写完了通知',
      icon: 'meeting'
    },
    { 
      type: 'mention', 
      label: 'メンション', 
      description: 'あなたがメンションされた通知',
      icon: 'chat'
    },
    { 
      type: 'meeting_update', 
      label: 'ミーティング更新', 
      description: 'ミーティングの開始・終了・変更通知',
      icon: 'meeting'
    },
    { 
      type: 'nest_invite', 
      label: 'Nest招待', 
      description: '新しいNestへの招待',
      icon: 'plus'
    },
    { 
      type: 'member_join', 
      label: 'メンバー参加', 
      description: '新しいメンバーの参加通知',
      icon: 'profile'
    },
    { 
      type: 'system', 
      label: 'システム', 
      description: 'システム関連の重要な通知',
      icon: 'settings'
    },
    { 
      type: 'urgent', 
      label: '緊急', 
      description: '緊急性の高い通知',
      icon: 'bell'
    },
    { 
      type: 'knowledge_graph', 
      label: 'ナレッジグラフ', 
      description: 'ナレッジグラフの更新通知',
      icon: 'analysis'
    }
  ];

  const priorities: NotificationPriority[] = ['low', 'normal', 'high', 'urgent'];

  const priorityLabels: Record<NotificationPriority, string> = {
    low: '低',
    normal: '通常',
    high: '高',
    urgent: '緊急'
  };

  // 初期化
  useEffect(() => {
    initializeSettings();
    checkNotificationPermission();
  }, []);

  const initializeSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // ユーザーの設定を取得（実際のテーブルがない場合はデフォルト値を使用）
      const defaultTypeSettings: Record<NotificationType, any> = {};
      notificationTypes.forEach(({ type }) => {
        defaultTypeSettings[type] = {
          enabled: true,
          priority: 'normal' as NotificationPriority,
          showBrowser: true,
          showEmail: false
        };
      });

      setSettings(prev => ({
        ...prev,
        typeSettings: defaultTypeSettings
      }));
    } catch (error) {
      console.error('設定の初期化に失敗しました:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkNotificationPermission = () => {
    setHasPermission(Notification.permission === 'granted');
  };

  const requestNotificationPermission = async () => {
    try {
      const permission = await Notification.requestPermission();
      setHasPermission(permission === 'granted');
      
      if (permission === 'granted') {
        setSettings(prev => ({
          ...prev,
          browserNotifications: true
        }));
      }
    } catch (error) {
      console.error('通知許可の取得に失敗しました:', error);
    }
  };

  const saveSettings = async () => {
    try {
      setIsSaving(true);
      
      // ここで実際のAPI呼び出しを行う
      // await NotificationService.saveSettings(settings);
      
      // 一時的にローカルストレージに保存
      localStorage.setItem('notificationSettings', JSON.stringify(settings));
      
      // 成功メッセージを表示
      const successNotification = new Notification('設定が保存されました', {
        body: '通知設定が正常に更新されました',
        icon: '/favicon.ico'
      });
      
      setTimeout(() => successNotification.close(), 3000);
      
    } catch (error) {
      console.error('設定の保存に失敗しました:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const updateTypeSettings = (
    type: NotificationType, 
    field: keyof typeof settings.typeSettings[NotificationType], 
    value: any
  ) => {
    setSettings(prev => ({
      ...prev,
      typeSettings: {
        ...prev.typeSettings,
        [type]: {
          ...prev.typeSettings[type],
          [field]: value
        }
      }
    }));
  };

  const testNotification = async (type: NotificationType) => {
    if (!hasPermission) {
      await requestNotificationPermission();
      return;
    }

    const testNotification = new Notification(`${notificationTypes.find(t => t.type === type)?.label}のテスト`, {
      body: 'これはテスト通知です。正常に動作しています。',
      icon: '/favicon.ico',
      tag: `test-${type}`
    });

    setTimeout(() => testNotification.close(), 5000);
  };

  if (isLoading) {
    return (
      <div className="settings-page">
        <ServiceHeader />
        <div className="settings-container">
                     <div className="loading-state">
             <Icon name="settings" size={32} />
             <p>設定を読み込み中...</p>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-page">
      <ServiceHeader />
      
      <div className="settings-container">
        {/* ヘッダー */}
        <div className="settings-header">
          <h1 className="settings-title">
            <Icon name="settings" size={24} />
            通知設定
          </h1>
          <p className="settings-description">
            通知の種類、優先度、配信方法を詳細に設定できます
          </p>
        </div>

        <div className="settings-content">
          {/* 基本設定 */}
          <section className="settings-section">
            <h2 className="section-title">基本設定</h2>
            
            <div className="setting-group">
              <div className="setting-item">
                <div className="setting-info">
                  <h3>通知機能</h3>
                  <p>すべての通知機能を有効/無効にします</p>
                </div>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={settings.enabled}
                    onChange={(e) => setSettings(prev => ({ ...prev, enabled: e.target.checked }))}
                  />
                  <span className="slider"></span>
                </label>
              </div>

              <div className="setting-item">
                <div className="setting-info">
                  <h3>ブラウザ通知</h3>
                  <p>デスクトップでのプッシュ通知を有効にします</p>
                  {!hasPermission && (
                    <span className="permission-warning">
                      <Icon name="bell" size={14} />
                      通知許可が必要です
                    </span>
                  )}
                </div>
                <div className="setting-actions">
                  {!hasPermission ? (
                    <button
                      onClick={requestNotificationPermission}
                      className="permission-btn"
                    >
                      許可する
                    </button>
                  ) : (
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={settings.browserNotifications}
                        onChange={(e) => setSettings(prev => ({ ...prev, browserNotifications: e.target.checked }))}
                      />
                      <span className="slider"></span>
                    </label>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* 通知種類別設定 */}
          <section className="settings-section">
            <h2 className="section-title">通知種類別設定</h2>
            
            <div className="type-settings-grid">
              {notificationTypes.map(({ type, label, description, icon }) => (
                <div key={type} className="type-setting-card">
                  <div className="type-header">
                    <div className="type-icon">
                      <Icon name={icon} size={20} />
                    </div>
                    <div className="type-info">
                      <h4>{label}</h4>
                      <p>{description}</p>
                    </div>
                                         <button
                       onClick={() => testNotification(type)}
                       className="test-btn"
                       title="テスト通知を送信"
                     >
                       <Icon name="bell" size={14} />
                     </button>
                  </div>

                  <div className="type-controls">
                    <div className="control-row">
                      <span className="control-label">有効</span>
                      <label className="switch small">
                        <input
                          type="checkbox"
                          checked={settings.typeSettings[type]?.enabled || false}
                          onChange={(e) => updateTypeSettings(type, 'enabled', e.target.checked)}
                        />
                        <span className="slider"></span>
                      </label>
                    </div>

                    <div className="control-row">
                      <span className="control-label">優先度</span>
                      <select
                        value={settings.typeSettings[type]?.priority || 'normal'}
                        onChange={(e) => updateTypeSettings(type, 'priority', e.target.value)}
                        className="priority-select"
                      >
                        {priorities.map(priority => (
                          <option key={priority} value={priority}>
                            {priorityLabels[priority]}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="control-row">
                      <span className="control-label">ブラウザ</span>
                      <label className="switch small">
                        <input
                          type="checkbox"
                          checked={settings.typeSettings[type]?.showBrowser || false}
                          onChange={(e) => updateTypeSettings(type, 'showBrowser', e.target.checked)}
                          disabled={!hasPermission}
                        />
                        <span className="slider"></span>
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 静寂時間設定 */}
          <section className="settings-section">
            <h2 className="section-title">静寂時間</h2>
            
            <div className="setting-group">
              <div className="setting-item">
                <div className="setting-info">
                  <h3>静寂時間を有効にする</h3>
                  <p>指定した時間帯は通知を無効にします（緊急通知を除く）</p>
                </div>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={settings.quietHours?.enabled || false}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      quietHours: {
                        ...prev.quietHours!,
                        enabled: e.target.checked
                      }
                    }))}
                  />
                  <span className="slider"></span>
                </label>
              </div>

              {settings.quietHours?.enabled && (
                <div className="time-range-setting">
                  <div className="time-input-group">
                    <label>開始時刻</label>
                    <input
                      type="time"
                      value={settings.quietHours.start}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        quietHours: {
                          ...prev.quietHours!,
                          start: e.target.value
                        }
                      }))}
                      className="time-input"
                    />
                  </div>
                  <div className="time-input-group">
                    <label>終了時刻</label>
                    <input
                      type="time"
                      value={settings.quietHours.end}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        quietHours: {
                          ...prev.quietHours!,
                          end: e.target.value
                        }
                      }))}
                      className="time-input"
                    />
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* ダイジェスト設定 */}
          <section className="settings-section">
            <h2 className="section-title">通知ダイジェスト</h2>
            
            <div className="setting-group">
              <div className="setting-item">
                <div className="setting-info">
                  <h3>ダイジェスト通知</h3>
                  <p>複数の通知をまとめて定期的に送信します</p>
                </div>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={settings.digestSettings?.enabled || false}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      digestSettings: {
                        ...prev.digestSettings!,
                        enabled: e.target.checked
                      }
                    }))}
                  />
                  <span className="slider"></span>
                </label>
              </div>

              {settings.digestSettings?.enabled && (
                <div className="digest-settings">
                  <div className="digest-option">
                    <label>配信頻度</label>
                    <select
                      value={settings.digestSettings.frequency}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        digestSettings: {
                          ...prev.digestSettings!,
                          frequency: e.target.value as 'hourly' | 'daily' | 'weekly'
                        }
                      }))}
                      className="frequency-select"
                    >
                      <option value="hourly">1時間毎</option>
                      <option value="daily">毎日</option>
                      <option value="weekly">毎週</option>
                    </select>
                  </div>
                  <div className="digest-option">
                    <label>最大通知数</label>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={settings.digestSettings.maxItems}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        digestSettings: {
                          ...prev.digestSettings!,
                          maxItems: parseInt(e.target.value)
                        }
                      }))}
                      className="max-items-input"
                    />
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* 保存ボタン */}
        <div className="settings-footer">
          <button
            onClick={saveSettings}
            disabled={isSaving}
            className="save-btn"
          >
            {isSaving ? (
              <>
                <Icon name="loader" size={16} />
                保存中...
              </>
            ) : (
              <>
                <Icon name="check" size={16} />
                設定を保存
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationSettings; 