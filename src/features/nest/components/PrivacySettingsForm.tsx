import React, { useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useNest, NestPrivacySettings } from '../contexts/NestContext';
import FormGroup from '../../../components/ui/FormGroup';

interface PrivacySettingsFormProps {
  nestId: string;
}

const PrivacySettingsForm: React.FC<PrivacySettingsFormProps> = ({ nestId }) => {
  const { nestSettings, updatePrivacySettings, loading } = useNest();
  const [updating, setUpdating] = useState(false);

  // 現在の設定がない場合はデフォルト値を使用
  const defaultSettings: NestPrivacySettings = {
    inviteRestriction: 'owner_only',
    contentVisibility: 'members_only',
    memberListVisibility: 'members_only'
  };

  const privacySettings = nestSettings?.privacy_settings || defaultSettings;

  // 設定変更ハンドラー
  const handleSettingChange = async (
    key: keyof NestPrivacySettings,
    value: string
  ) => {
    setUpdating(true);
    
    const { error } = await updatePrivacySettings(nestId, {
      [key]: value
    } as Partial<NestPrivacySettings>);
    
    setUpdating(false);
    
    if (error) {
      console.error('設定の更新に失敗しました:', error);
    }
  };

  // アクセシビリティをサポートする選択コンポーネント
  const renderOptionSelector = (
    title: string,
    key: keyof NestPrivacySettings,
    options: Array<{ value: string; label: string; description: string }>
  ) => {
    return (
      <div style={{ marginBottom: 16 }}>
        <label style={{ 
          display: 'block',
          fontSize: 11, 
          fontWeight: 600, 
          color: '#a6adc8',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          marginBottom: 6
        }}>
          {title}
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {options.map((option) => (
            <label 
              key={option.value} 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 8, 
                cursor: 'pointer',
                padding: '12px 16px',
                backgroundColor: privacySettings[key] === option.value ? '#2c2e33' : 'transparent',
                borderRadius: 8,
                border: `1px solid ${privacySettings[key] === option.value ? '#00ff88' : '#3a3b3e'}`,
                transition: 'all 0.2s ease'
              }}
            >
              <input
                type="radio"
                name={key}
                value={option.value}
                checked={privacySettings[key] === option.value}
                onChange={() => handleSettingChange(key, option.value)}
                disabled={updating || loading}
                style={{ 
                  accentColor: '#00ff88',
                  width: 16,
                  height: 16,
                  margin: 0
                }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ 
                  fontWeight: 500, 
                  color: privacySettings[key] === option.value ? '#00ff88' : '#e2e8f0',
                  fontSize: 14,
                  marginBottom: 2
                }}>
                  {option.label}
                </div>
                <div style={{ 
                  color: '#6c7086', 
                  fontSize: 12 
                }}>
                  {option.description}
                </div>
              </div>
            </label>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{ 
        background: '#1a1a2e',
        border: '1px solid #333366',
        borderRadius: 4,
        padding: 20, 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center' 
      }}>
        <div style={{ color: '#6c7086', fontSize: 12 }}>設定を読み込み中...</div>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 0 }}>
      {updating && (
        <div style={{ color: '#00ff88', fontSize: 12, marginBottom: 16 }}>更新中...</div>
      )}
      {renderOptionSelector(
        'INVITATION PERMISSION',
        'inviteRestriction',
        [
          { value: 'owner_only', label: 'オーナーのみ', description: 'NESTのオーナーだけがメンバーを招待できます' },
          { value: 'members', label: '全メンバー', description: 'すべてのメンバーが新しいメンバーを招待できます' }
        ]
      )}
      {renderOptionSelector(
        'CONTENT VISIBILITY',
        'contentVisibility',
        [
          { value: 'members_only', label: 'メンバーのみ', description: 'NEST内のコンテンツはメンバーのみが閲覧できます' },
          { value: 'public', label: '公開', description: '招待された人も一部のコンテンツを閲覧できます' }
        ]
      )}
      {renderOptionSelector(
        'MEMBER LIST VISIBILITY',
        'memberListVisibility',
        [
          { value: 'members_only', label: 'メンバーのみ', description: 'メンバーリストはNESTのメンバーのみが閲覧できます' },
          { value: 'public', label: '公開', description: '招待された人もメンバーリストを閲覧できます' }
        ]
      )}
    </div>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#6c7086',
  },
});

export default PrivacySettingsForm; 