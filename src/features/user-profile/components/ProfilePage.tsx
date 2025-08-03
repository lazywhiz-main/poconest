import React, { useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { ServiceHeader } from '../../../components/ServiceHeader';
import Icon from '../../../components/ui/Icon';

const ProfilePage: React.FC = () => {
  const { user, profile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [isLoading, setIsLoading] = useState(false);

  return (
    <div style={{ height: '100vh', background: '#0f0f23', color: '#e2e8f0' }}>
      <ServiceHeader />
      
      <div style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
        <div style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center' }}>
            <Icon name="user" size={24} color="#e2e8f0" style={{ marginRight: 12 }} />
            プロフィール
          </h1>
          <button
            onClick={() => setIsEditing(!isEditing)}
            style={{
              padding: '8px 16px',
              background: isEditing ? '#45475a' : '#00ff88',
              color: isEditing ? '#e2e8f0' : '#0f0f23',
              border: 'none',
              borderRadius: 4,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            {isEditing ? 'キャンセル' : '編集'}
          </button>
        </div>

        <div style={{ background: '#1a1a2e', borderRadius: 8, padding: 24, border: '1px solid #333366' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
            <div style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: '#00ff88',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 32,
              fontWeight: 600,
              color: '#0f0f23',
              marginRight: 24
            }}>
              {profile?.display_name ? profile.display_name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>
                {profile?.display_name || 'Unknown User'}
              </h2>
              <p style={{ color: '#a6adc8', margin: 0 }}>
                {user?.email || 'No email provided'}
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gap: 16 }}>
            <div style={{ padding: 16, background: '#232345', borderRadius: 6, border: '1px solid #45475a' }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>基本情報</h3>
              <div style={{ display: 'grid', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: '#a6adc8', marginBottom: 4, display: 'block' }}>
                    表示名
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        background: '#1a1a2e',
                        color: '#e2e8f0',
                        border: '1px solid #45475a',
                        borderRadius: 4,
                        fontSize: 14
                      }}
                      placeholder="表示名を入力"
                    />
                  ) : (
                    <div style={{ fontSize: 14, color: '#e2e8f0' }}>
                      {profile?.display_name || '未設定'}
                    </div>
                  )}
                </div>
                <div>
                  <label style={{ fontSize: 12, color: '#a6adc8', marginBottom: 4, display: 'block' }}>
                    メールアドレス
                  </label>
                  <div style={{ fontSize: 14, color: '#e2e8f0' }}>
                    {user?.email || '未設定'}
                  </div>
                  <div style={{ fontSize: 12, color: '#a6adc8', marginTop: 4 }}>
                    メールアドレスの変更は現在サポートされていません
                  </div>
                </div>
              </div>
              {isEditing && (
                <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
                  <button
                    onClick={async () => {
                      setIsLoading(true);
                      try {
                        // プロフィール更新の実装
                        console.log('プロフィール更新:', displayName);
                        setIsEditing(false);
                      } catch (error) {
                        console.error('プロフィール更新エラー:', error);
                      } finally {
                        setIsLoading(false);
                      }
                    }}
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
                    {isLoading ? '保存中...' : '保存'}
                  </button>
                </div>
              )}
            </div>

            <div style={{ padding: 16, background: '#232345', borderRadius: 6, border: '1px solid #45475a' }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>アカウント情報</h3>
              <div style={{ display: 'grid', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, color: '#a6adc8', marginBottom: 4, display: 'block' }}>
                    ユーザーID
                  </label>
                  <div style={{ fontSize: 14, color: '#e2e8f0', fontFamily: 'monospace' }}>
                    {user?.id || '不明'}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 12, color: '#a6adc8', marginBottom: 4, display: 'block' }}>
                    作成日
                  </label>
                  <div style={{ fontSize: 14, color: '#e2e8f0' }}>
                    {user?.created_at ? new Date(user.created_at).toLocaleDateString('ja-JP') : '不明'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage; 