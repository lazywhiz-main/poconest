import React, { useState } from 'react';
import {
  View,
  Text,
  Switch,
  StyleSheet,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useNestSettings } from '../hooks/useNestSettings';
import { NestPrivacySettings } from '../types/settings.types';

// プラットフォームに応じたスタイル調整
const isWeb = Platform.OS === 'web';

interface PrivacySettingsProps {
  nestId?: string;
  onSettingsChange?: () => void;
}

/**
 * NESTのプライバシー設定コンポーネント
 */
const PrivacySettingsComponent: React.FC<PrivacySettingsProps> = ({ 
  nestId,
  onSettingsChange 
}) => {
  const { 
    settings, 
    loading, 
    saving, 
    error, 
    updatePrivacySettings 
  } = useNestSettings(nestId);
  
  const [unsavedChanges, setUnsavedChanges] = useState<Partial<NestPrivacySettings> | null>(null);
  const [showConfirmation, setShowConfirmation] = useState<boolean>(false);
  
  // 現在のプライバシー設定（ローカルの変更があればそれを優先）
  const currentPrivacy: NestPrivacySettings | undefined = unsavedChanges 
    ? { ...settings?.privacy, ...unsavedChanges } as NestPrivacySettings
    : settings?.privacy;
  
  if (loading || !settings) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066cc" />
        <Text style={styles.loadingText}>設定を読み込んでいます...</Text>
      </View>
    );
  }

  /**
   * 設定値を変更する
   */
  const handleChange = (key: keyof NestPrivacySettings, value: any) => {
    setUnsavedChanges({
      ...(unsavedChanges || {}),
      [key]: value
    });
  };

  /**
   * 変更を保存する
   */
  const handleSave = async () => {
    if (!unsavedChanges) return;
    
    try {
      const result = await updatePrivacySettings(unsavedChanges);
      
      if (result.success) {
        setUnsavedChanges(null);
        setShowConfirmation(false);
        onSettingsChange && onSettingsChange();
        
        // 成功メッセージを表示
        if (Platform.OS !== 'web') {
          Alert.alert('成功', 'プライバシー設定が更新されました');
        }
      } else {
        // エラーメッセージを表示
        Alert.alert('エラー', result.error || '設定の更新に失敗しました');
      }
    } catch (err) {
      Alert.alert('エラー', '設定の更新中にエラーが発生しました');
    }
  };

  /**
   * 変更を破棄する
   */
  const handleCancel = () => {
    setUnsavedChanges(null);
    setShowConfirmation(false);
  };

  /**
   * 保存前の確認ダイアログを表示する
   */
  const confirmSave = () => {
    if (Platform.OS === 'web') {
      if (window.confirm('この変更を保存しますか？')) {
        handleSave();
      }
    } else {
      Alert.alert(
        '確認',
        'プライバシー設定の変更を保存しますか？',
        [
          { text: 'キャンセル', style: 'cancel' },
          { text: '保存', onPress: handleSave }
        ]
      );
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>プライバシー設定</Text>
      
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* NEST公開設定 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>NEST公開範囲</Text>
        <View style={styles.radioGroup}>
          <TouchableOpacity 
            style={styles.radioOption}
            onPress={() => handleChange('visibility', 'private')}
          >
            {isWeb ? null : (
              <span>プライベート</span>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.radioOption}
            onPress={() => handleChange('visibility', 'public')}
          >
            {isWeb ? null : (
              <span>パブリック</span>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* 検索設定 */}
      <View style={styles.section}>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={styles.settingLabel}>検索可能</Text>
            <Text style={styles.settingDescription}>
              このNESTが検索結果に表示されるようにします
            </Text>
          </View>
          <Switch
            value={currentPrivacy?.searchable}
            onValueChange={value => handleChange('searchable', value)}
            trackColor={{ false: '#d3d3d3', true: '#81b0ff' }}
            thumbColor={currentPrivacy?.searchable ? '#0066cc' : '#f4f3f4'}
          />
        </View>
      </View>

      {/* メンバーリスト表示設定 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>メンバーリスト公開範囲</Text>
        <View style={styles.radioGroup}>
          <TouchableOpacity 
            style={styles.radioOption}
            onPress={() => handleChange('memberListVisibility', 'members_only')}
          >
            {isWeb ? null : (
              <span>メンバーのみ</span>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.radioOption}
            onPress={() => handleChange('memberListVisibility', 'public')}
          >
            {isWeb ? null : (
              <span>公開</span>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* 保存ボタン */}
      {unsavedChanges && (
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.cancelButton}
            onPress={handleCancel}
            disabled={saving}
          >
            <Text style={styles.cancelButtonText}>キャンセル</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.saveButton}
            onPress={confirmSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Text style={styles.saveButtonText}>変更を保存</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
      
      {/* 設定情報 */}
      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>
          プライバシー設定はNESTの可視性とアクセス権を制御します。
          変更はすべてのメンバーに即時反映されます。
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
        maxWidth: 800,
        margin: 'auto',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 2,
      },
    }),
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  errorContainer: {
    backgroundColor: '#ffeeee',
    padding: 10,
    borderRadius: 4,
    marginBottom: 16,
  },
  errorText: {
    color: '#cc0000',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#444',
  },
  radioGroup: {
    marginBottom: 8,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    marginVertical: 4,
    backgroundColor: '#f8f8f8',
    borderRadius: 6,
    paddingHorizontal: 8,
  },
  radioLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  radioDescription: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  radioOptionContent: {
    marginLeft: 8,
    flex: 1,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    borderRadius: 6,
    padding: 12,
  },
  settingInfo: {
    flex: 1,
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  settingDescription: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 24,
    marginBottom: 16,
  },
  saveButton: {
    backgroundColor: '#0066cc',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '500',
    fontSize: 14,
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginRight: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: '500',
    fontSize: 14,
  },
  infoContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 6,
    alignItems: 'flex-start',
  },
  infoText: {
    color: '#666',
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
  },
});

export default PrivacySettingsComponent; 