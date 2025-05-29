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
import theme from '../../../styles/theme';

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
          placeholderTextColor={theme.colors.text.disabled}
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
            <ActivityIndicator size="small" color={theme.colors.background.paper} />
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
          <ActivityIndicator style={styles.loader} color={theme.colors.primary} />
        ) : filteredInvitations.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>保留中の招待はありません</Text>
          </View>
        ) : (
          <FlatList
            data={filteredInvitations}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              (() => { console.log('[InvitationForm] renderItem item:', item); return null; })() ||
              <View style={styles.invitationItem}>
                <View style={styles.invitationInfo}>
                  <Text style={styles.invitationEmail} numberOfLines={1}>
                    {item.invited_email}
                  </Text>
                  <Text style={styles.invitationDate}>
                    送信日: {formatDate(item.created_at)}
                    {item.expires_at ? ` (有効期限: ${formatDate(item.expires_at)})` : ''}
                  </Text>
                </View>
                
                <View style={styles.invitationActions}>
                  {/* 招待リンク常時表示・コピー */}
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ fontSize: 12, color: theme.colors.text.disabled, marginRight: 4 }}>リンク:</Text>
                    <Text style={{ fontSize: 12, color: theme.colors.primary, maxWidth: 120 }} numberOfLines={1} ellipsizeMode="middle">
                      https://poconest.app/invite/{item.token}
                    </Text>
                    <TouchableOpacity
                      style={styles.invitationAction}
                      onPress={() => handleCopyInviteLink(item.token)}
                      accessibilityLabel="招待リンクをコピー"
                    >
                      <Text style={[styles.actionIcon, { color: theme.colors.accent }]}>📋</Text>
                    </TouchableOpacity>
                  </View>
                  
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
    backgroundColor: theme.colors.background.paper,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    ...theme.shadows.sm,
  },
  sectionTitle: {
    fontSize: theme.fontSizes.lg,
    fontWeight: theme.fontWeights.bold as any,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
  },
  formContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  input: {
    flex: 1,
    backgroundColor: theme.colors.background.paper,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    fontSize: theme.fontSizes.md,
    color: theme.colors.text.primary,
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  inviteButton: {
    backgroundColor: theme.colors.action,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    marginLeft: theme.spacing.sm,
    ...theme.shadows.sm,
  },
  inviteButtonText: {
    color: theme.colors.background.paper,
    fontWeight: theme.fontWeights.bold as any,
    fontSize: theme.fontSizes.md,
  },
  disabledButton: {
    opacity: 0.5,
  },
  pendingInvitationsContainer: {
    marginTop: theme.spacing.md,
  },
  pendingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  pendingTitle: {
    fontSize: theme.fontSizes.md,
    fontWeight: theme.fontWeights.bold as any,
    color: theme.colors.text.primary,
  },
  keyboard: {
    fontSize: theme.fontSizes.xs,
    color: theme.colors.text.disabled,
  },
  loader: {
    marginTop: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 16,
  },
  emptyText: {
    color: theme.colors.text.disabled,
    fontSize: 14,
  },
  invitationsList: {
    maxHeight: 300,
  },
  invitationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.background.default,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  invitationInfo: {
    flex: 1,
  },
  invitationEmail: {
    fontWeight: theme.fontWeights.bold as any,
    color: theme.colors.text.primary,
    fontSize: 15,
  },
  invitationDate: {
    color: theme.colors.text.disabled,
    fontSize: 12,
  },
  invitationActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  invitationAction: {
    marginLeft: 8,
    padding: 4,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.background.paper,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: {
        boxShadow: '0 1px 4px rgba(20,184,166,0.04)',
      },
      default: {
        elevation: 1,
      }
    }),
  },
  actionIcon: {
    fontSize: 18,
    color: theme.colors.text.disabled,
  },
  cancelAction: {
    backgroundColor: theme.colors.status.error + '20', // 透明度20%
  },
});

export default InvitationForm; 