import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  Alert,
  Platform,
  Clipboard
} from 'react-native';
import { useNest } from '../contexts/NestContext';
import { COLORS, SPACING } from '@constants/config';

interface InvitationFormProps {
  nestId: string;
}

const InvitationForm: React.FC<InvitationFormProps> = ({ nestId }) => {
  const { inviteMember, pendingInvitations, cancelInvitation, resendInvitation, loading } = useNest();
  const [email, setEmail] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);

  // 招待送信
  const handleInvite = async () => {
    if (!email || !email.includes('@')) {
      Alert.alert('エラー', '有効なメールアドレスを入力してください');
      return;
    }

    setInviteLoading(true);
    const { error, invitation } = await inviteMember(nestId, email);
    setInviteLoading(false);

    if (error) {
      Alert.alert('エラー', error.message || '招待の送信に失敗しました');
      return;
    }

    Alert.alert('成功', `${email}に招待を送信しました`);
    setEmail('');
  };

  // 招待キャンセル
  const handleCancelInvitation = (invitationId: string) => {
    Alert.alert(
      '招待のキャンセル',
      '招待をキャンセルしますか？',
      [
        {
          text: 'キャンセル',
          style: 'cancel'
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
          }
        }
      ]
    );
  };

  // 招待再送信
  const handleResendInvitation = async (invitationId: string) => {
    const { error } = await resendInvitation(invitationId);
    if (error) {
      Alert.alert('エラー', error.message || '招待の再送信に失敗しました');
    } else {
      Alert.alert('成功', '招待を再送信しました');
    }
  };

  // 招待リンクのコピー (デスクトップ用)
  const handleCopyInviteLink = (token: string) => {
    const inviteLink = `https://poconest.app/invite/${token}`;
    
    if (Platform.OS === 'web') {
      // Webブラウザの場合
      navigator.clipboard.writeText(inviteLink).then(() => {
        Alert.alert('成功', '招待リンクをクリップボードにコピーしました');
      }).catch(err => {
        console.error('クリップボードへのコピーに失敗:', err);
        Alert.alert('エラー', 'リンクのコピーに失敗しました');
      });
    } else {
      // ネイティブの場合
      Clipboard.setString(inviteLink);
      Alert.alert('成功', '招待リンクをクリップボードにコピーしました');
    }
  };

  // 日付フォーマット
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // フィルター: 現在のNestに関する招待のみ表示
  const filteredInvitations = pendingInvitations.filter(
    invitation => invitation.nest_id === nestId
  );

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>メンバーを招待</Text>
      
      <View style={styles.formContainer}>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="メールアドレスを入力"
          placeholderTextColor={COLORS.gray}
          keyboardType="email-address"
          autoCapitalize="none"
          editable={!inviteLoading}
          accessibilityLabel="招待するメールアドレス"
        />
        
        <TouchableOpacity
          style={[
            styles.inviteButton,
            inviteLoading && styles.disabledButton
          ]}
          onPress={handleInvite}
          disabled={inviteLoading || !email}
          accessibilityLabel="招待を送信"
          accessibilityHint="入力したメールアドレスに招待を送ります"
        >
          {inviteLoading ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <Text style={styles.inviteButtonText}>招待</Text>
          )}
        </TouchableOpacity>
      </View>
      
      <View style={styles.pendingInvitationsContainer}>
        <View style={styles.pendingHeader}>
          <Text style={styles.pendingTitle}>保留中の招待 ({filteredInvitations.length})</Text>
          {Platform.OS === 'web' && (
            <Text style={styles.keyboard}>ショートカット: Alt+I</Text>
          )}
        </View>
        
        {loading ? (
          <ActivityIndicator style={styles.loader} color={COLORS.primary} />
        ) : filteredInvitations.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>保留中の招待はありません</Text>
          </View>
        ) : (
          <FlatList
            data={filteredInvitations}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.invitationItem}>
                <View style={styles.invitationInfo}>
                  <Text style={styles.invitationEmail} numberOfLines={1}>
                    {item.email}
                  </Text>
                  <Text style={styles.invitationDate}>
                    送信日: {formatDate(item.created_at)}
                    {item.expires_at ? ` (有効期限: ${formatDate(item.expires_at)})` : ''}
                  </Text>
                </View>
                
                <View style={styles.invitationActions}>
                  {Platform.OS === 'web' && (
                    <TouchableOpacity
                      style={styles.invitationAction}
                      onPress={() => handleCopyInviteLink(item.token)}
                      accessibilityLabel="招待リンクをコピー"
                    >
                      <Text style={styles.actionIcon}>📋</Text>
                    </TouchableOpacity>
                  )}
                  
                  <TouchableOpacity
                    style={styles.invitationAction}
                    onPress={() => handleResendInvitation(item.id)}
                    accessibilityLabel="招待を再送信"
                  >
                    <Text style={styles.actionIcon}>🔄</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.invitationAction, styles.cancelAction]}
                    onPress={() => handleCancelInvitation(item.id)}
                    accessibilityLabel="招待をキャンセル"
                  >
                    <Text style={styles.actionIcon}>✕</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            style={styles.invitationsList}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: SPACING.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: SPACING.md,
    color: COLORS.text,
  },
  formContainer: {
    flexDirection: 'row',
    marginBottom: SPACING.lg,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: SPACING.md,
    fontSize: 16,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    marginRight: SPACING.sm,
  },
  inviteButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
  },
  inviteButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
  },
  pendingInvitationsContainer: {
    flex: 1,
  },
  pendingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  pendingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  keyboard: {
    fontSize: 12,
    color: COLORS.gray,
    fontStyle: 'italic',
  },
  loader: {
    marginVertical: SPACING.lg,
  },
  emptyContainer: {
    padding: SPACING.lg,
    backgroundColor: COLORS.white,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderStyle: 'dashed',
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.gray,
  },
  invitationsList: {
    maxHeight: 300,
  },
  invitationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  invitationInfo: {
    flex: 1,
  },
  invitationEmail: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 4,
  },
  invitationDate: {
    fontSize: 12,
    color: COLORS.gray,
  },
  invitationActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  invitationAction: {
    padding: SPACING.sm,
    marginLeft: SPACING.xs,
    borderRadius: 4,
    backgroundColor: 'transparent',
  },
  actionIcon: {
    fontSize: 16,
  },
  cancelAction: {
    backgroundColor: COLORS.error + '20', // 透明度20%
  },
});

export default InvitationForm; 