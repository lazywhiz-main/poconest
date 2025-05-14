import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Switch
} from 'react-native';
import { NestPrivacySettings } from '../../settings/types/settings.types';
import { BRAND_COLORS } from '@constants/Colors';

interface NestPrivacyStepProps {
  privacySettings?: NestPrivacySettings;
  onChange: (settings: Partial<NestPrivacySettings>) => void;
  onNext: () => void;
  onBack: () => void;
}

/**
 * NESTプライバシー設定ステップコンポーネント
 */
const NestPrivacyStep: React.FC<NestPrivacyStepProps> = ({
  privacySettings,
  onChange,
  onNext,
  onBack
}) => {
  // デフォルト値の設定
  const initialSettings: NestPrivacySettings = {
    visibility: 'private',
    searchable: false,
    memberListVisibility: 'members_only'
  };

  // ローカル状態
  const [settings, setSettings] = useState<NestPrivacySettings>(
    privacySettings || initialSettings
  );

  // 親コンポーネントに変更を通知
  useEffect(() => {
    onChange(settings);
  }, [settings, onChange]);

  // 可視性の変更
  const handleVisibilityChange = (visibility: 'public' | 'private') => {
    setSettings(prev => ({
      ...prev,
      visibility
    }));
  };

  // 検索可能性の変更
  const handleSearchableChange = (value: boolean) => {
    setSettings(prev => ({
      ...prev,
      searchable: value
    }));
  };

  // メンバーリスト可視性の変更
  const handleMemberListVisibilityChange = (memberListVisibility: 'public' | 'members_only') => {
    setSettings(prev => ({
      ...prev,
      memberListVisibility
    }));
  };

  // 特定の可視性が選択されているかをチェック
  const isSelected = (type: string, value: string) => {
    return settings[type as keyof NestPrivacySettings] === value;
  };

  // 設定オプションカードをレンダリング
  const renderOptionCard = (
    title: string,
    description: string,
    type: 'visibility' | 'memberListVisibility',
    value: 'public' | 'private' | 'members_only',
    icon: string
  ) => {
    const isActive = isSelected(type, value);
    const handlePress = () => {
      if (type === 'visibility') {
        handleVisibilityChange(value as 'public' | 'private');
      } else if (type === 'memberListVisibility') {
        handleMemberListVisibilityChange(value as 'public' | 'members_only');
      }
    };

    return (
      <TouchableOpacity
        style={[
          styles.optionCard,
          isActive && styles.selectedOptionCard
        ]}
        onPress={handlePress}
        accessibilityState={{ selected: isActive }}
      >
        <View style={styles.optionContent}>
          <View style={styles.optionHeader}>
            <Text style={styles.optionIcon}>{icon}</Text>
            <Text style={styles.optionTitle}>{title}</Text>
          </View>
          <Text style={styles.optionDescription}>{description}</Text>
        </View>
        <View style={styles.radioContainer}>
          <View style={[styles.radio, isActive && styles.radioSelected]}>
            {isActive && <View style={styles.radioInner} />}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      <Text style={styles.title}>プライバシー設定</Text>
      <Text style={styles.description}>
        NESTのプライバシー設定を構成します。これらの設定はあとからいつでも変更できます。
      </Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>NEST公開範囲</Text>
        <Text style={styles.sectionDescription}>
          誰がこのNESTにアクセスできるかを選択します
        </Text>

        {renderOptionCard(
          'プライベート',
          'このNESTと内容は招待されたメンバーだけが閲覧できます',
          'visibility',
          'private',
          '🔒'
        )}

        {renderOptionCard(
          'パブリック',
          'このNESTは誰でも閲覧できます（メンバーのみが編集可能）',
          'visibility',
          'public',
          '🌐'
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>検索可能性</Text>
        <View style={styles.switchContainer}>
          <View style={styles.switchTextContainer}>
            <Text style={styles.switchLabel}>検索結果に表示する</Text>
            <Text style={styles.switchDescription}>
              「検索可能」に設定すると、NESTがアプリ内の検索結果に表示されます
              {settings.visibility === 'private' && ' (プライベートNESTでも検索可能にできます)'}
            </Text>
          </View>
          <Switch
            value={settings.searchable}
            onValueChange={handleSearchableChange}
            trackColor={{ false: '#d3d3d3', true: '#81b0ff' }}
            thumbColor={settings.searchable ? BRAND_COLORS.primary : '#f4f3f4'}
            accessibilityLabel="検索可能性を切り替え"
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>メンバーリスト公開範囲</Text>
        <Text style={styles.sectionDescription}>
          誰がメンバーリストを閲覧できるかを選択します
        </Text>

        {renderOptionCard(
          'メンバーのみ',
          'NESTメンバーだけがメンバーリストを閲覧できます',
          'memberListVisibility',
          'members_only',
          '👥'
        )}

        {renderOptionCard(
          '公開',
          'NESTを閲覧できる全員がメンバーリストを閲覧できます',
          'memberListVisibility',
          'public',
          '📋'
        )}
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.infoIcon}>ℹ️</Text>
        <Text style={styles.infoText}>
          プライバシー設定は、NESTの管理者やオーナーがいつでも変更できます。
          詳細な権限設定はNEST作成後に調整できます。
        </Text>
      </View>

      {/* デスクトップ向けのボタン */}
      {Platform.OS === 'web' && (
        <View style={styles.webButtonContainer}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={onBack}
          >
            <Text style={styles.backButtonText}>戻る</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.nextButton}
            onPress={onNext}
          >
            <Text style={styles.nextButtonText}>次へ</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BRAND_COLORS.background.light,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: Platform.OS === 'web' ? 0 : 100, // モバイルでは下部ナビのスペースを確保
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: BRAND_COLORS.text.primary,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: BRAND_COLORS.text.secondary,
    marginBottom: 24,
    lineHeight: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: BRAND_COLORS.text.primary,
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 14,
    color: BRAND_COLORS.text.secondary,
    marginBottom: 12,
  },
  optionCard: {
    flexDirection: 'row',
    backgroundColor: BRAND_COLORS.background.medium,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  selectedOptionCard: {
    backgroundColor: 'rgba(52, 152, 219, 0.1)',
    borderColor: BRAND_COLORS.primary,
    borderWidth: 1,
  },
  optionContent: {
    flex: 1,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  optionIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: BRAND_COLORS.text.primary,
  },
  optionDescription: {
    fontSize: 14,
    color: BRAND_COLORS.text.secondary,
    lineHeight: 20,
  },
  radioContainer: {
    padding: 4,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: BRAND_COLORS.text.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: BRAND_COLORS.primary,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: BRAND_COLORS.primary,
  },
  switchContainer: {
    flexDirection: 'row',
    backgroundColor: BRAND_COLORS.background.medium,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  switchTextContainer: {
    flex: 1,
    marginRight: 12,
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: BRAND_COLORS.text.primary,
    marginBottom: 4,
  },
  switchDescription: {
    fontSize: 14,
    color: BRAND_COLORS.text.secondary,
    lineHeight: 20,
  },
  infoContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(52, 152, 219, 0.1)',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },
  infoIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: BRAND_COLORS.text.secondary,
    lineHeight: 20,
  },
  webButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 40,
    paddingHorizontal: 40,
  },
  backButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
    borderWidth: 1,
    borderColor: BRAND_COLORS.background.dark,
  },
  backButtonText: {
    color: BRAND_COLORS.text.primary,
    fontSize: 16,
    fontWeight: '500',
  },
  nextButton: {
    backgroundColor: BRAND_COLORS.primary,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default NestPrivacyStep; 