import React, { useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { ServiceHeader } from '../../../components/ServiceHeader';
import Icon from '../../../components/ui/Icon';

const SettingsPage: React.FC = () => {
  const { user, profile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [autoSave, setAutoSave] = useState(true);
  const [language, setLanguage] = useState('ja');

  const handlePasswordChange = async () => {
    setIsLoading(true);
    try {
      // パスワードリセットメールを送信
      console.log('パスワード変更機能は実装予定');
    } catch (error) {
      console.error('パスワード変更エラー:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (window.confirm('本当にアカウントを削除しますか？この操作は取り消せません。')) {
      setIsLoading(true);
      try {
        // アカウント削除の実装
        console.log('アカウント削除機能は実装予定');
      } catch (error) {
        console.error('アカウント削除エラー:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleThemeChange = () => {
    setDarkMode(!darkMode);
    console.log('テーマ変更:', !darkMode ? 'ダーク' : 'ライト');
  };

  const handleNotificationChange = () => {
    setNotifications(!notifications);
    console.log('通知設定変更:', !notifications);
  };

  const handleAutoSaveChange = () => {
    setAutoSave(!autoSave);
    console.log('自動保存設定変更:', !autoSave);
  };

  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage);
    console.log('言語設定変更:', newLanguage);
  };

  return (
    <div style={{ height: '100vh', background: '#0f0f23', color: '#e2e8f0' }}>
      <ServiceHeader />
      
      <div style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center' }}>
            <Icon name="settings" size={24} color="#e2e8f0" style={{ marginRight: 12 }} />
            設定
          </h1>
        </div>

        <div style={{ display: 'grid', gap: 24 }}>
          {/* セキュリティ設定 */}
          <div style={{ background: '#1a1a2e', borderRadius: 8, padding: 24, border: '1px solid #333366' }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20, display: 'flex', alignItems: 'center' }}>
              <Icon name="lock" size={18} color="#e2e8f0" style={{ marginRight: 8 }} />
              セキュリティ
            </h2>
            
            <div style={{ display: 'grid', gap: 16 }}>
              <div style={{ padding: 16, background: '#232345', borderRadius: 6, border: '1px solid #45475a' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>パスワード変更</h3>
                    <p style={{ fontSize: 12, color: '#a6adc8', margin: 0 }}>
                      アカウントのパスワードを変更します
                    </p>
                  </div>
                  <button
                    onClick={handlePasswordChange}
                    disabled={isLoading}
                    style={{
                      padding: '8px 16px',
                      background: '#00ff88',
                      color: '#0f0f23',
                      border: 'none',
                      borderRadius: 4,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      opacity: isLoading ? 0.6 : 1
                    }}
                  >
                    {isLoading ? '処理中...' : '変更'}
                  </button>
                </div>
              </div>

              <div style={{ padding: 16, background: '#232345', borderRadius: 6, border: '1px solid #45475a' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>二要素認証</h3>
                    <p style={{ fontSize: 12, color: '#a6adc8', margin: 0 }}>
                      セキュリティを強化するための二要素認証を設定します
                    </p>
                  </div>
                  <div style={{ fontSize: 12, color: '#a6adc8' }}>
                    実装予定
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 表示設定 */}
          <div style={{ background: '#1a1a2e', borderRadius: 8, padding: 24, border: '1px solid #333366' }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>表示設定</h2>
            
            <div style={{ display: 'grid', gap: 16 }}>
              <div style={{ padding: 16, background: '#232345', borderRadius: 6, border: '1px solid #45475a' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>ダークモード</h3>
                    <p style={{ fontSize: 12, color: '#a6adc8', margin: 0 }}>
                      ダークテーマを使用します
                    </p>
                  </div>
                  <button
                    onClick={handleThemeChange}
                    style={{
                      padding: '8px 16px',
                      background: darkMode ? '#00ff88' : '#45475a',
                      color: darkMode ? '#0f0f23' : '#e2e8f0',
                      border: 'none',
                      borderRadius: 4,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    {darkMode ? 'ON' : 'OFF'}
                  </button>
                </div>
              </div>

              <div style={{ padding: 16, background: '#232345', borderRadius: 6, border: '1px solid #45475a' }}>
                <div>
                  <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>言語</h3>
                  <select
                    value={language}
                    onChange={(e) => handleLanguageChange(e.target.value)}
                    style={{
                      background: '#1a1a2e',
                      color: '#e2e8f0',
                      border: '1px solid #45475a',
                      borderRadius: 4,
                      padding: '8px 12px',
                      fontSize: 14
                    }}
                  >
                    <option value="ja">日本語</option>
                    <option value="en">English</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* 通知設定 */}
          <div style={{ background: '#1a1a2e', borderRadius: 8, padding: 24, border: '1px solid #333366' }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20, display: 'flex', alignItems: 'center' }}>
              <Icon name="bell" size={18} color="#e2e8f0" style={{ marginRight: 8 }} />
              通知設定
            </h2>
            
            <div style={{ display: 'grid', gap: 16 }}>
              <div style={{ padding: 16, background: '#232345', borderRadius: 6, border: '1px solid #45475a' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>プッシュ通知</h3>
                    <p style={{ fontSize: 12, color: '#a6adc8', margin: 0 }}>
                      ブラウザのプッシュ通知を有効にします
                    </p>
                  </div>
                  <button
                    onClick={handleNotificationChange}
                    style={{
                      padding: '8px 16px',
                      background: notifications ? '#00ff88' : '#45475a',
                      color: notifications ? '#0f0f23' : '#e2e8f0',
                      border: 'none',
                      borderRadius: 4,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    {notifications ? 'ON' : 'OFF'}
                  </button>
                </div>
              </div>

              <div style={{ padding: 16, background: '#232345', borderRadius: 6, border: '1px solid #45475a' }}>
                <div>
                  <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>通知タイプ</h3>
                  <div style={{ display: 'grid', gap: 8 }}>
                    <label style={{ display: 'flex', alignItems: 'center', fontSize: 12 }}>
                      <input type="checkbox" defaultChecked style={{ marginRight: 8 }} />
                      AI洞察の通知
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', fontSize: 12 }}>
                      <input type="checkbox" defaultChecked style={{ marginRight: 8 }} />
                      ミーティング更新の通知
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', fontSize: 12 }}>
                      <input type="checkbox" defaultChecked style={{ marginRight: 8 }} />
                      システム通知
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* データ設定 */}
          <div style={{ background: '#1a1a2e', borderRadius: 8, padding: 24, border: '1px solid #333366' }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>データ設定</h2>
            
            <div style={{ display: 'grid', gap: 16 }}>
              <div style={{ padding: 16, background: '#232345', borderRadius: 6, border: '1px solid #45475a' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>自動保存</h3>
                    <p style={{ fontSize: 12, color: '#a6adc8', margin: 0 }}>
                      作業内容を自動的に保存します
                    </p>
                  </div>
                  <button
                    onClick={handleAutoSaveChange}
                    style={{
                      padding: '8px 16px',
                      background: autoSave ? '#00ff88' : '#45475a',
                      color: autoSave ? '#0f0f23' : '#e2e8f0',
                      border: 'none',
                      borderRadius: 4,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    {autoSave ? 'ON' : 'OFF'}
                  </button>
                </div>
              </div>

              <div style={{ padding: 16, background: '#232345', borderRadius: 6, border: '1px solid #45475a' }}>
                <div>
                  <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>データエクスポート</h3>
                  <p style={{ fontSize: 12, color: '#a6adc8', marginBottom: 12 }}>
                    アカウントデータをエクスポートします
                  </p>
                  <button
                    style={{
                      padding: '8px 16px',
                      background: '#45475a',
                      color: '#e2e8f0',
                      border: 'none',
                      borderRadius: 4,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    エクスポート
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* アカウント情報 */}
          <div style={{ background: '#1a1a2e', borderRadius: 8, padding: 24, border: '1px solid #333366' }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>アカウント情報</h2>
            
            <div style={{ display: 'grid', gap: 16 }}>
              <div style={{ padding: 16, background: '#232345', borderRadius: 6, border: '1px solid #45475a' }}>
                <div>
                  <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>メールアドレス</h3>
                  <div style={{ fontSize: 14, color: '#e2e8f0', marginBottom: 8 }}>
                    {user?.email || '未設定'}
                  </div>
                  <div style={{ fontSize: 12, color: '#a6adc8' }}>
                    メールアドレスの変更は現在サポートされていません
                  </div>
                </div>
              </div>

              <div style={{ padding: 16, background: '#232345', borderRadius: 6, border: '1px solid #45475a' }}>
                <div>
                  <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>アカウント作成日</h3>
                  <div style={{ fontSize: 14, color: '#e2e8f0' }}>
                    {user?.created_at ? new Date(user.created_at).toLocaleDateString('ja-JP') : '不明'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 危険な操作 */}
          <div style={{ background: '#1a1a2e', borderRadius: 8, padding: 24, border: '1px solid #ff6b6b' }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 20, color: '#ff6b6b' }}>
              危険な操作
            </h2>
            
            <div style={{ padding: 16, background: '#232345', borderRadius: 6, border: '1px solid #ff6b6b' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 4, color: '#ff6b6b' }}>
                    アカウント削除
                  </h3>
                  <p style={{ fontSize: 12, color: '#a6adc8', margin: 0 }}>
                    アカウントとすべてのデータを完全に削除します。この操作は取り消せません。
                  </p>
                </div>
                <button
                  onClick={handleDeleteAccount}
                  disabled={isLoading}
                  style={{
                    padding: '8px 16px',
                    background: '#ff6b6b',
                    color: 'white',
                    border: 'none',
                    borderRadius: 4,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    opacity: isLoading ? 0.6 : 1
                  }}
                >
                  {isLoading ? '処理中...' : '削除'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage; 