import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  ActivityIndicator
} from 'react-native';
import { CreateNestData } from '../hooks/useCreateNest';
import { BRAND_COLORS } from '@constants/Colors';

interface NestSummaryStepProps {
  nestData: CreateNestData;
  onCreateNest: () => Promise<void>;
  onBack: () => void;
  loading: boolean;
}

/**
 * NEST作成の最終確認ステップコンポーネント
 */
const NestSummaryStep: React.FC<NestSummaryStepProps> = ({
  nestData,
  onCreateNest,
  onBack,
  loading
}) => {
  // 確認セクションのレンダリング
  const renderSection = (title: string, content: React.ReactNode) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionContent}>
        {content}
      </View>
    </View>
  );

  // 基本情報セクション
  const renderBasicInfo = () => (
    <View>
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>NEST名:</Text>
        <Text style={styles.infoValue}>{nestData.name}</Text>
      </View>
      
      {nestData.description && (
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>説明:</Text>
          <Text style={styles.infoValue}>{nestData.description}</Text>
        </View>
      )}
      
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>テーマカラー:</Text>
        <View 
          style={[
            styles.colorSample, 
            { backgroundColor: nestData.color || BRAND_COLORS.primary }
          ]}
        />
      </View>
    </View>
  );

  // プライバシー設定セクション
  const renderPrivacySettings = () => (
    <View>
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>公開範囲:</Text>
        <Text style={styles.infoValue}>
          {nestData.privacy?.visibility === 'public' ? 'パブリック' : 'プライベート'}
        </Text>
      </View>
      
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>検索可能:</Text>
        <Text style={styles.infoValue}>
          {nestData.privacy?.searchable ? '可能' : '不可'}
        </Text>
      </View>
      
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>メンバーリスト:</Text>
        <Text style={styles.infoValue}>
          {nestData.privacy?.memberListVisibility === 'public' ? '公開' : 'メンバーのみ'}
        </Text>
      </View>
    </View>
  );

  // 招待メンバーセクション
  const renderInvitations = () => (
    <View>
      {nestData.initialMembers && nestData.initialMembers.length > 0 ? (
        <View>
          <Text style={styles.invitationCount}>
            {nestData.initialMembers.length}人のメンバーを招待
          </Text>
          <View style={styles.membersList}>
            {nestData.initialMembers.map(email => (
              <View key={email} style={styles.memberItem}>
                <View style={styles.memberAvatar}>
                  <Text style={styles.memberInitial}>{email.charAt(0).toUpperCase()}</Text>
                </View>
                <Text style={styles.memberEmail}>{email}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : (
        <Text style={styles.noMembersText}>
          招待メンバーはいません。NEST作成後にいつでも招待できます。
        </Text>
      )}
    </View>
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      <Text style={styles.title}>作成内容の確認</Text>
      <Text style={styles.description}>
        以下の内容でNESTを作成します。作成後にすべての設定を変更できます。
      </Text>

      <View style={styles.summaryCard}>
        <View style={styles.nestPreview}>
          <View 
            style={[
              styles.nestIconPreview, 
              { backgroundColor: nestData.color || BRAND_COLORS.primary }
            ]}
          >
            <Text style={styles.nestIconText}>
              {nestData.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.nestNamePreview}>{nestData.name}</Text>
        </View>

        {renderSection('基本情報', renderBasicInfo())}
        {renderSection('プライバシー設定', renderPrivacySettings())}
        {renderSection('招待メンバー', renderInvitations())}
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>
          「作成」をクリックすると、設定した内容でNESTが作成され、
          招待メンバーにはメールが送信されます。
        </Text>
      </View>

      {/* デスクトップ向けのボタン */}
      {Platform.OS === 'web' ? (
        <View style={styles.webButtonContainer}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={onBack}
            disabled={loading}
          >
            <Text style={styles.backButtonText}>戻る</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.createButton, loading && styles.disabledButton]}
            onPress={onCreateNest}
            disabled={loading}
            accessibilityLabel="NESTを作成"
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.createButtonText}>作成</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        // モバイル用の作成ボタン（大きめのボタン）
        <TouchableOpacity 
          style={[styles.mobileCreateButton, loading && styles.disabledButton]}
          onPress={onCreateNest}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.createButtonText}>NESTを作成</Text>
          )}
        </TouchableOpacity>
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
    paddingBottom: Platform.OS === 'web' ? 40 : 100,
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
  summaryCard: {
    backgroundColor: BRAND_COLORS.background.medium,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: BRAND_COLORS.background.dark,
  },
  nestPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: BRAND_COLORS.background.dark,
  },
  nestIconPreview: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  nestIconText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  nestNamePreview: {
    fontSize: 20,
    fontWeight: 'bold',
    color: BRAND_COLORS.text.primary,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: BRAND_COLORS.text.primary,
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: BRAND_COLORS.background.dark,
  },
  sectionContent: {
    paddingHorizontal: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoLabel: {
    width: 120,
    fontSize: 14,
    fontWeight: '500',
    color: BRAND_COLORS.text.secondary,
  },
  infoValue: {
    flex: 1,
    fontSize: 14,
    color: BRAND_COLORS.text.primary,
  },
  colorSample: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  invitationCount: {
    fontSize: 14,
    fontWeight: '500',
    color: BRAND_COLORS.text.primary,
    marginBottom: 12,
  },
  membersList: {
    marginTop: 8,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingVertical: 4,
  },
  memberAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: BRAND_COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  memberInitial: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  memberEmail: {
    fontSize: 14,
    color: BRAND_COLORS.text.primary,
  },
  noMembersText: {
    fontSize: 14,
    color: BRAND_COLORS.text.secondary,
    fontStyle: 'italic',
  },
  infoContainer: {
    backgroundColor: 'rgba(52, 152, 219, 0.1)',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },
  infoText: {
    fontSize: 14,
    color: BRAND_COLORS.text.secondary,
    lineHeight: 20,
    textAlign: 'center',
  },
  webButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  createButton: {
    backgroundColor: BRAND_COLORS.success,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
  },
  mobileCreateButton: {
    backgroundColor: BRAND_COLORS.success,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
});

export default NestSummaryStep; 