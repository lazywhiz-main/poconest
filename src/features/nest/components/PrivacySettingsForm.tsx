import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
  Platform
} from 'react-native';
import { useNest, NestPrivacySettings } from '../contexts/NestContext';
import { COLORS, SPACING } from '@constants/config';

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
      Alert.alert('エラー', error.message || '設定の更新に失敗しました');
    }
  };

  // アクセシビリティをサポートする選択コンポーネント
  const renderOptionSelector = (
    title: string,
    key: keyof NestPrivacySettings,
    options: Array<{ value: string; label: string; description: string }>
  ) => {
    return (
      <View style={styles.settingSection}>
        <Text style={styles.settingTitle}>{title}</Text>
        
        {options.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.option,
              privacySettings[key] === option.value && styles.selectedOption
            ]}
            onPress={() => handleSettingChange(key, option.value)}
            disabled={updating || loading}
            accessibilityRole="radio"
            accessibilityState={{ checked: privacySettings[key] === option.value }}
            accessibilityLabel={option.label}
            accessibilityHint={option.description}
          >
            <View style={styles.optionHeader}>
              <View 
                style={[
                  styles.radioButton,
                  privacySettings[key] === option.value && styles.radioButtonSelected
                ]}
              >
                {privacySettings[key] === option.value && (
                  <View style={styles.radioButtonDot} />
                )}
              </View>
              
              <Text 
                style={[
                  styles.optionLabel,
                  privacySettings[key] === option.value && styles.selectedLabel
                ]}
              >
                {option.label}
              </Text>
            </View>
            
            <Text style={styles.optionDescription}>{option.description}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>設定を読み込み中...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>プライバシー設定</Text>
      
      {updating && (
        <View style={styles.updatingOverlay}>
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={styles.updatingText}>更新中...</Text>
        </View>
      )}
      
      {renderOptionSelector(
        '招待権限',
        'inviteRestriction',
        [
          {
            value: 'owner_only',
            label: 'オーナーのみ',
            description: 'NESTのオーナーだけがメンバーを招待できます'
          },
          {
            value: 'members',
            label: '全メンバー',
            description: 'すべてのメンバーが新しいメンバーを招待できます'
          }
        ]
      )}
      
      {renderOptionSelector(
        'コンテンツの公開範囲',
        'contentVisibility',
        [
          {
            value: 'members_only',
            label: 'メンバーのみ',
            description: 'NEST内のコンテンツはメンバーのみが閲覧できます'
          },
          {
            value: 'public',
            label: '公開',
            description: '招待された人も一部のコンテンツを閲覧できます'
          }
        ]
      )}
      
      {renderOptionSelector(
        'メンバーリストの公開範囲',
        'memberListVisibility',
        [
          {
            value: 'members_only',
            label: 'メンバーのみ',
            description: 'メンバーリストはNESTのメンバーのみが閲覧できます'
          },
          {
            value: 'public',
            label: '公開',
            description: '招待された人もメンバーリストを閲覧できます'
          }
        ]
      )}
      
      {Platform.OS === 'web' && (
        <View style={styles.keyboardShortcuts}>
          <Text style={styles.shortcutTitle}>キーボードショートカット</Text>
          <Text style={styles.shortcutText}>Alt+P: プライバシー設定を開く</Text>
          <Text style={styles.shortcutText}>Alt+S: 設定を保存</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: SPACING.md,
    position: 'relative',
  },
  loadingContainer: {
    padding: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: 14,
    color: COLORS.gray,
  },
  updatingOverlay: {
    position: 'absolute',
    top: SPACING.md,
    right: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: SPACING.sm,
    borderRadius: 8,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
      },
      default: {
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      }
    }),
  },
  updatingText: {
    marginLeft: SPACING.xs,
    fontSize: 14,
    color: COLORS.text,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: SPACING.lg,
    color: COLORS.text,
  },
  settingSection: {
    marginBottom: SPACING.xl,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: SPACING.md,
    color: COLORS.text,
  },
  option: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    ...Platform.select({
      web: {
        transition: 'all 0.2s ease',
        cursor: 'pointer',
      }
    }),
  },
  selectedOption: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '10', // 透明度10%
    ...Platform.select({
      web: {
        boxShadow: '0 0 0 1px ' + COLORS.primary,
      },
      default: {
        // ネイティブの場合は既に境界線の色を変更しているのでOK
      }
    }),
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.gray,
    marginRight: SPACING.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonSelected: {
    borderColor: COLORS.primary,
  },
  radioButtonDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
  },
  selectedLabel: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  optionDescription: {
    fontSize: 14,
    color: COLORS.gray,
    marginLeft: SPACING.lg + 14, // ラジオボタンの幅+マージン+少し余分に
  },
  keyboardShortcuts: {
    marginTop: SPACING.lg,
    padding: SPACING.md,
    backgroundColor: COLORS.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderStyle: 'dashed',
  },
  shortcutTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  shortcutText: {
    fontSize: 13,
    color: COLORS.gray,
    fontFamily: Platform.OS === 'web' ? 'monospace' : 'monospace',
    marginBottom: 2,
  },
});

export default PrivacySettingsForm; 