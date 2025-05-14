import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useNest } from '../contexts/NestContext';
import { useAuth } from '../contexts/AuthContext';
import { BrandColors } from '../constants/Colors';
import { NestMember, NestPrivacySettings } from '../lib/supabase';

type RootStackParamList = {
  TabsScreen: undefined;
  CreateNest: undefined;
  NestSettings: { nestId: string };
};

type NestSettingsScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'NestSettings'>;
  route: {
    params: {
      nestId: string;
    };
  };
};

const NestSettingsScreen = ({ navigation, route }: NestSettingsScreenProps) => {
  const { currentNest, updateNest, nestMembers, inviteMember, pendingInvitations, cancelInvitation, resendInvitation, nestSettings, updatePrivacySettings } = useNest();
  const { signOut } = useAuth();
  const [name, setName] = useState(currentNest?.name || '');
  const [description, setDescription] = useState(currentNest?.description || '');
  const [loading, setLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [privacyLoading, setPrivacyLoading] = useState(false);

  const handleSave = async () => {
    if (!name) {
      Alert.alert('エラー', 'Nestの名前を入力してください');
      return;
    }

    setLoading(true);
    const { error } = await updateNest(currentNest?.id || '', {
      name,
      description,
    });
    setLoading(false);

    if (error) {
      Alert.alert('エラー', error.message || '保存に失敗しました');
      return;
    }

    Alert.alert('成功', '設定を保存しました');
  };

  const handleInvite = async () => {
    if (!inviteEmail) {
      Alert.alert('エラー', 'メールアドレスを入力してください');
      return;
    }

    if (!inviteEmail.includes('@')) {
      Alert.alert('エラー', '有効なメールアドレスを入力してください');
      return;
    }

    setInviteLoading(true);
    const { error } = await inviteMember(currentNest?.id || '', inviteEmail);
    setInviteLoading(false);

    if (error) {
      Alert.alert('エラー', error.message || '招待に失敗しました');
      return;
    }

    Alert.alert('成功', `${inviteEmail}を招待しました`);
    setInviteEmail('');
  };

  const handleSignOut = async () => {
    Alert.alert(
      'ログアウト',
      'ログアウトしてもよろしいですか？',
      [
        {
          text: 'キャンセル',
          style: 'cancel',
        },
        {
          text: 'ログアウト',
          style: 'destructive',
          onPress: async () => {
            const { error } = await signOut();
            if (error) {
              Alert.alert('エラー', error.message || 'ログアウトに失敗しました');
            }
          },
        },
      ],
    );
  };

  const handleCancelInvitation = async (invitationId: string) => {
    Alert.alert(
      '招待をキャンセル',
      '招待をキャンセルしてもよろしいですか？',
      [
        {
          text: 'キャンセル',
          style: 'cancel',
        },
        {
          text: '招待を取り消す',
          style: 'destructive',
          onPress: async () => {
            const { error } = await cancelInvitation(invitationId);
            if (error) {
              Alert.alert('エラー', error.message || '招待のキャンセルに失敗しました');
            } else {
              Alert.alert('成功', '招待をキャンセルしました');
            }
          },
        },
      ],
    );
  };

  const handleResendInvitation = async (invitationId: string) => {
    const { error } = await resendInvitation(invitationId);
    if (error) {
      Alert.alert('エラー', error.message || '招待の再送信に失敗しました');
    } else {
      Alert.alert('成功', '招待を再送信しました');
    }
  };

  const handlePrivacySettingChange = async (key: keyof NestPrivacySettings, value: string) => {
    if (!currentNest) return;

    setPrivacyLoading(true);
    const { error } = await updatePrivacySettings(currentNest.id, {
      [key]: value
    } as Partial<NestPrivacySettings>);
    setPrivacyLoading(false);

    if (error) {
      Alert.alert('エラー', error.message || 'プライバシー設定の更新に失敗しました');
    }
  };

  const getMemberRole = (role: string) => {
    switch (role) {
      case 'owner':
        return 'オーナー';
      case 'admin':
        return '管理者';
      case 'member':
        return 'メンバー';
      default:
        return '不明';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={BrandColors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nest設定</Text>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          disabled={loading}
        >
          <Text style={styles.saveButtonText}>
            {loading ? '保存中...' : '保存'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>基本情報</Text>

          <View style={styles.formGroup}>
            <Text style={styles.label}>名前</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Nestの名前"
              maxLength={50}
            />
            <Text style={styles.charCount}>{name.length}/50</Text>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>説明</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Nestの説明"
              multiline
              numberOfLines={4}
              maxLength={200}
            />
            <Text style={styles.charCount}>{description.length}/200</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>メンバー管理</Text>
          
          <View style={styles.inviteForm}>
            <Text style={styles.label}>新しいメンバーを招待</Text>
            <View style={styles.inviteInputContainer}>
              <TextInput
                style={[styles.input, styles.inviteInput]}
                value={inviteEmail}
                onChangeText={setInviteEmail}
                placeholder="メールアドレスを入力"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={[styles.inviteButton, inviteLoading && styles.disabledButton]}
                onPress={handleInvite}
                disabled={inviteLoading}
              >
                {inviteLoading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text style={styles.inviteButtonText}>招待</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.memberList}>
            <Text style={styles.label}>メンバー一覧</Text>
            {nestMembers.map((member) => (
              <View key={member.user_id} style={styles.memberItem}>
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>
                    {member.users?.display_name || 'Unknown'}
                  </Text>
                  <Text style={styles.memberEmail}>
                    {member.users?.email || ''}
                  </Text>
                </View>
                <View style={styles.memberRole}>
                  <Text style={styles.roleText}>
                    {getMemberRole(member.role)}
                  </Text>
                  <TouchableOpacity style={styles.memberActionButton}>
                    <Ionicons name="ellipsis-vertical" size={20} color={BrandColors.text.secondary} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>招待管理</Text>
          
          <View style={styles.inviteForm}>
            <Text style={styles.label}>新しいメンバーを招待</Text>
            <View style={styles.inviteInputContainer}>
              <TextInput
                style={[styles.input, styles.inviteInput]}
                value={inviteEmail}
                onChangeText={setInviteEmail}
                placeholder="メールアドレスを入力"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={[styles.inviteButton, inviteLoading && styles.disabledButton]}
                onPress={handleInvite}
                disabled={inviteLoading}
              >
                {inviteLoading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text style={styles.inviteButtonText}>招待</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.invitationList}>
            <Text style={styles.label}>保留中の招待</Text>
            {pendingInvitations.map((invitation) => (
              <View key={invitation.id} style={styles.invitationItem}>
                <View style={styles.invitationInfo}>
                  <Text style={styles.invitationEmail}>{invitation.email}</Text>
                  <Text style={styles.invitationDate}>
                    招待日: {new Date(invitation.created_at).toLocaleDateString('ja-JP')}
                  </Text>
                  {invitation.expires_at && (
                    <Text style={styles.invitationExpiry}>
                      有効期限: {new Date(invitation.expires_at).toLocaleDateString('ja-JP')}
                    </Text>
                  )}
                </View>
                <View style={styles.invitationActions}>
                  <TouchableOpacity
                    style={styles.invitationActionButton}
                    onPress={() => handleResendInvitation(invitation.id)}
                  >
                    <Ionicons name="refresh" size={20} color={BrandColors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.invitationActionButton}
                    onPress={() => handleCancelInvitation(invitation.id)}
                  >
                    <Ionicons name="close" size={20} color={BrandColors.error} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            {pendingInvitations.length === 0 && (
              <Text style={styles.emptyText}>保留中の招待はありません</Text>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>プライバシー設定</Text>
          
          <View style={styles.settingGroup}>
            <Text style={styles.label}>招待権限</Text>
            <View style={styles.radioGroup}>
              <TouchableOpacity
                style={[
                  styles.radioButton,
                  nestSettings?.privacy_settings.inviteRestriction === 'owner_only' && styles.radioButtonSelected
                ]}
                onPress={() => handlePrivacySettingChange('inviteRestriction', 'owner_only')}
                disabled={privacyLoading}
              >
                <Text style={[
                  styles.radioButtonText,
                  nestSettings?.privacy_settings.inviteRestriction === 'owner_only' && styles.radioButtonTextSelected
                ]}>
                  オーナーのみ
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.radioButton,
                  nestSettings?.privacy_settings.inviteRestriction === 'members' && styles.radioButtonSelected
                ]}
                onPress={() => handlePrivacySettingChange('inviteRestriction', 'members')}
                disabled={privacyLoading}
              >
                <Text style={[
                  styles.radioButtonText,
                  nestSettings?.privacy_settings.inviteRestriction === 'members' && styles.radioButtonTextSelected
                ]}>
                  全メンバー
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.settingGroup}>
            <Text style={styles.label}>コンテンツの公開範囲</Text>
            <View style={styles.radioGroup}>
              <TouchableOpacity
                style={[
                  styles.radioButton,
                  nestSettings?.privacy_settings.contentVisibility === 'members_only' && styles.radioButtonSelected
                ]}
                onPress={() => handlePrivacySettingChange('contentVisibility', 'members_only')}
                disabled={privacyLoading}
              >
                <Text style={[
                  styles.radioButtonText,
                  nestSettings?.privacy_settings.contentVisibility === 'members_only' && styles.radioButtonTextSelected
                ]}>
                  メンバーのみ
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.radioButton,
                  nestSettings?.privacy_settings.contentVisibility === 'public' && styles.radioButtonSelected
                ]}
                onPress={() => handlePrivacySettingChange('contentVisibility', 'public')}
                disabled={privacyLoading}
              >
                <Text style={[
                  styles.radioButtonText,
                  nestSettings?.privacy_settings.contentVisibility === 'public' && styles.radioButtonTextSelected
                ]}>
                  公開
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.settingGroup}>
            <Text style={styles.label}>メンバーリストの公開範囲</Text>
            <View style={styles.radioGroup}>
              <TouchableOpacity
                style={[
                  styles.radioButton,
                  nestSettings?.privacy_settings.memberListVisibility === 'members_only' && styles.radioButtonSelected
                ]}
                onPress={() => handlePrivacySettingChange('memberListVisibility', 'members_only')}
                disabled={privacyLoading}
              >
                <Text style={[
                  styles.radioButtonText,
                  nestSettings?.privacy_settings.memberListVisibility === 'members_only' && styles.radioButtonTextSelected
                ]}>
                  メンバーのみ
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.radioButton,
                  nestSettings?.privacy_settings.memberListVisibility === 'public' && styles.radioButtonSelected
                ]}
                onPress={() => handlePrivacySettingChange('memberListVisibility', 'public')}
                disabled={privacyLoading}
              >
                <Text style={[
                  styles.radioButtonText,
                  nestSettings?.privacy_settings.memberListVisibility === 'public' && styles.radioButtonTextSelected
                ]}>
                  公開
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>アカウント</Text>
          <TouchableOpacity
            style={styles.signOutButton}
            onPress={handleSignOut}
          >
            <Text style={styles.signOutButtonText}>ログアウト</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: BrandColors.text.primary,
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: BrandColors.primary,
    borderRadius: 8,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: BrandColors.text.primary,
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: BrandColors.text.secondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: BrandColors.backgroundVariants.light,
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    color: BrandColors.text.primary,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: BrandColors.text.tertiary,
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  inviteForm: {
    marginBottom: 24,
  },
  inviteInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inviteInput: {
    flex: 1,
    marginRight: 8,
  },
  inviteButton: {
    backgroundColor: BrandColors.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 80,
  },
  inviteButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
  },
  memberList: {
    marginTop: 8,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: BrandColors.backgroundVariants.light,
    borderRadius: 8,
    marginBottom: 8,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '500',
    color: BrandColors.text.primary,
    marginBottom: 2,
  },
  memberEmail: {
    fontSize: 12,
    color: BrandColors.text.secondary,
  },
  memberRole: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roleText: {
    fontSize: 12,
    color: BrandColors.text.secondary,
    marginRight: 8,
  },
  memberActionButton: {
    padding: 4,
  },
  signOutButton: {
    backgroundColor: '#FF3B30',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  signOutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  invitationList: {
    marginTop: 16,
  },
  invitationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: BrandColors.backgroundVariants.light,
    borderRadius: 8,
    marginBottom: 8,
  },
  invitationInfo: {
    flex: 1,
  },
  invitationEmail: {
    fontSize: 14,
    fontWeight: '500',
    color: BrandColors.text.primary,
    marginBottom: 2,
  },
  invitationDate: {
    fontSize: 12,
    color: BrandColors.text.secondary,
  },
  invitationExpiry: {
    fontSize: 12,
    color: BrandColors.text.tertiary,
  },
  invitationActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  invitationActionButton: {
    padding: 8,
    marginLeft: 8,
  },
  emptyText: {
    fontSize: 14,
    color: BrandColors.text.tertiary,
    textAlign: 'center',
    padding: 16,
  },
  settingGroup: {
    marginBottom: 24,
  },
  radioGroup: {
    flexDirection: 'row',
    marginTop: 8,
  },
  radioButton: {
    flex: 1,
    padding: 12,
    backgroundColor: BrandColors.backgroundVariants.light,
    borderRadius: 8,
    marginRight: 8,
    alignItems: 'center',
  },
  radioButtonSelected: {
    backgroundColor: BrandColors.primary,
  },
  radioButtonText: {
    fontSize: 14,
    color: BrandColors.text.primary,
  },
  radioButtonTextSelected: {
    color: 'white',
    fontWeight: '600',
  },
});

export default NestSettingsScreen; 