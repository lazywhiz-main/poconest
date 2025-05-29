import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert,
  Platform,
  useWindowDimensions
} from 'react-native';
import { BRAND_COLORS } from '@constants/Colors';
import { SPACING, FONT_SIZE, BORDER_RADIUS, COMPONENT_STYLES } from '@constants/Styles';
import responsive from '@utils/responsive';
import { useNest } from '@features/nest/contexts/NestContext';
import { cancelInvitation, resendInvitation, getPendingInvitations } from '../services/invitationService';

console.log('PendingInvitations component loaded');

// 招待の型定義
interface Invitation {
  id: string;
  nest_id: string;
  invited_email: string;
  invited_by: string;
  created_at: string;
  expires_at: string;
  token: string;
  is_accepted: boolean;
  invited_users?: {
    id: string;
    display_name: string;
    avatar_url: string;
  };
}

interface PendingInvitationsProps {
  onInvitationCanceled?: () => void;
  onInvitationResent?: () => void;
}

const PendingInvitations: React.FC<PendingInvitationsProps> = ({
  onInvitationCanceled,
  onInvitationResent
}) => {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<{ [key: string]: string }>({});
  
  const { currentNest } = useNest();
  const { width } = useWindowDimensions();
  const isMobile = responsive.mediaQuery.isMobile(width);
  
  // 招待リストの取得
  const fetchInvitations = async () => {
    console.log('[PendingInvitations] fetchInvitations called, currentNest:', currentNest);
    if (!currentNest) {
      setInvitations([]);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await getPendingInvitations(currentNest.id);
      
      if (result.error) {
        setError(result.error.message);
        setInvitations([]);
      } else {
        console.log('[PendingInvitations] fetch result.invitations:', result.invitations);
        setInvitations(
          (result.invitations || []).map((inv: any) => ({
            ...inv,
            invited_users: Array.isArray(inv.invited_users) ? inv.invited_users[0] : inv.invited_users
          }))
        );
      }
    } catch (err: any) {
      console.error('Error fetching invitations:', err);
      setError(err.message || '招待の取得に失敗しました');
      setInvitations([]);
    } finally {
      setLoading(false);
    }
  };
  
  // NESTが変更されたら招待リストを更新
  useEffect(() => {
    console.log('[PendingInvitations] useEffect currentNest:', currentNest);
    fetchInvitations();
  }, [currentNest]);
  
  // 招待のキャンセル
  const handleCancelInvitation = async (invitation: Invitation) => {
    // 確認ダイアログを表示
    const confirmCancel = () => {
      if (Platform.OS === 'web') {
        return window.confirm(`${invitation.invited_email}への招待をキャンセルしますか？`);
      } else {
        Alert.alert(
          '招待のキャンセル',
          `${invitation.invited_email}への招待をキャンセルしますか？`,
          [
            { text: 'キャンセル', style: 'cancel' },
            { 
              text: '招待を削除', 
              style: 'destructive',
              onPress: () => performCancelInvitation(invitation)
            }
          ]
        );
        return false; // Alertはコールバックで処理するため、falseを返す
      }
    };
    
    // Web環境では即時実行、モバイルはコールバックで実行
    if (Platform.OS === 'web') {
      if (confirmCancel()) {
        performCancelInvitation(invitation);
      }
    }
  };
  
  // 招待のキャンセル処理
  const performCancelInvitation = async (invitation: Invitation) => {
    setActionLoading(prev => ({ ...prev, [invitation.id]: 'cancel' }));
    
    try {
      const result = await cancelInvitation(invitation.id);
      
      if (result.error) {
        setError(result.error.message);
        
        if (Platform.OS !== 'web') {
          Alert.alert('エラー', result.error.message);
        }
      } else {
        // 成功したら招待リストから削除
        setInvitations(prev => prev.filter(inv => inv.id !== invitation.id));
        
        if (onInvitationCanceled) {
          onInvitationCanceled();
        }
      }
    } catch (err: any) {
      console.error('Error canceling invitation:', err);
      setError(err.message || '招待のキャンセルに失敗しました');
      
      if (Platform.OS !== 'web') {
        Alert.alert('エラー', err.message || '招待のキャンセルに失敗しました');
      }
    } finally {
      setActionLoading(prev => {
        const newState = { ...prev };
        delete newState[invitation.id];
        return newState;
      });
    }
  };
  
  // 招待の再送信
  const handleResendInvitation = async (invitation: Invitation) => {
    setActionLoading(prev => ({ ...prev, [invitation.id]: 'resend' }));
    
    try {
      const result = await resendInvitation(invitation.id);
      
      if (result.error) {
        setError(result.error.message);
        
        if (Platform.OS !== 'web') {
          Alert.alert('エラー', result.error.message);
        }
      } else {
        // 成功したらメッセージを表示
        if (Platform.OS !== 'web') {
          Alert.alert('成功', `${invitation.invited_email}に招待が再送信されました`);
        } else {
          // Webの場合は一時的なメッセージ表示などを実装可能
          alert(`${invitation.invited_email}に招待が再送信されました`);
        }
        
        // 再読み込み
        fetchInvitations();
        
        if (onInvitationResent) {
          onInvitationResent();
        }
      }
    } catch (err: any) {
      console.error('Error resending invitation:', err);
      setError(err.message || '招待の再送信に失敗しました');
      
      if (Platform.OS !== 'web') {
        Alert.alert('エラー', err.message || '招待の再送信に失敗しました');
      }
    } finally {
      setActionLoading(prev => {
        const newState = { ...prev };
        delete newState[invitation.id];
        return newState;
      });
    }
  };
  
  // 有効期限の表示フォーマット
  const formatDate = (dateString?: string) => {
    if (!dateString) return '無期限';
    
    const date = new Date(dateString);
    const now = new Date();
    
    // 期限切れかどうか
    const isExpired = date < now;
    
    // 日付のフォーマット
    return isExpired 
      ? '期限切れ' 
      : date.toLocaleDateString(undefined, { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric', 
          hour: '2-digit', 
          minute: '2-digit'
        });
  };
  
  // 招待作成日時のフォーマット
  const formatCreatedAt = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric'
    });
  };
  
  // リストアイテムのレンダリング
  const renderInvitationItem = ({ item }: { item: Invitation }) => {
    console.log('[PendingInvitations] render item:', item);
    const isActionInProgress = !!actionLoading[item.id];
    const actionType = actionLoading[item.id];
    
    return (
      <View style={styles.itemContainer}>
        <View style={styles.itemContent}>
          <Text style={styles.emailText}>{item.invited_email}</Text>
          <Text style={styles.dateText}>
            招待日: {formatCreatedAt(item.created_at)}
          </Text>
          <Text style={[
            styles.expiryText,
            item.expires_at && new Date(item.expires_at) < new Date() ? styles.expiredText : null
          ]}>
            有効期限: {formatDate(item.expires_at)}
          </Text>
        </View>
        
        <View style={styles.actionsContainer}>
          {isActionInProgress ? (
            <ActivityIndicator 
              size="small" 
              color={actionType === 'cancel' ? BRAND_COLORS.error : BRAND_COLORS.primary} 
            />
          ) : (
            <>
              <TouchableOpacity
                style={[styles.actionButton, styles.resendButton]}
                onPress={() => handleResendInvitation(item)}
                disabled={isActionInProgress}
                accessibilityLabel="招待を再送信"
              >
                <Text style={styles.actionButtonText}>再送信</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.actionButton, styles.cancelButton]}
                onPress={() => handleCancelInvitation(item)}
                disabled={isActionInProgress}
                accessibilityLabel="招待をキャンセル"
              >
                <Text style={styles.cancelButtonText}>削除</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  };
  
  // 空のリスト表示
  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>
        {loading ? '読み込み中...' : '保留中の招待はありません'}
      </Text>
    </View>
  );
  
  return (
    <View style={[
      styles.container,
      isMobile ? styles.containerMobile : styles.containerDesktop
    ]}>
      <View style={styles.headerContainer}>
        <Text style={styles.title}>保留中の招待</Text>
        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={fetchInvitations}
          disabled={loading}
        >
          <Text style={styles.refreshButtonText}>更新</Text>
        </TouchableOpacity>
      </View>
      
      {error && Platform.OS === 'web' && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BRAND_COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={invitations}
          keyExtractor={(item) => item.id}
          renderItem={renderInvitationItem}
          ListEmptyComponent={renderEmptyList}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          maxToRenderPerBatch={10}
          initialNumToRender={5}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...COMPONENT_STYLES.card,
    marginVertical: SPACING.md,
  },
  containerMobile: {
    padding: SPACING.md,
  },
  containerDesktop: {
    padding: SPACING.lg,
    maxWidth: 800,
    alignSelf: 'center',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZE.xl,
    fontWeight: 'bold',
    color: BRAND_COLORS.text.primary,
  },
  refreshButton: {
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: BRAND_COLORS.background.medium,
  },
  refreshButtonText: {
    fontSize: FONT_SIZE.sm,
    color: BRAND_COLORS.text.primary,
    fontWeight: '500',
  },
  errorContainer: {
    backgroundColor: BRAND_COLORS.error,
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    marginBottom: SPACING.md,
  },
  errorText: {
    color: BRAND_COLORS.white,
    fontSize: FONT_SIZE.sm,
  },
  loadingContainer: {
    padding: SPACING.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    maxHeight: 400,
  },
  listContent: {
    flexGrow: 1,
  },
  emptyContainer: {
    padding: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: FONT_SIZE.md,
    color: BRAND_COLORS.text.secondary,
    textAlign: 'center',
  },
  itemContainer: {
    flexDirection: responsive.mediaQuery.isMobile() ? 'column' : 'row',
    justifyContent: 'space-between',
    alignItems: responsive.mediaQuery.isMobile() ? 'flex-start' : 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: BRAND_COLORS.background.medium,
    backgroundColor: BRAND_COLORS.background.light,
    marginBottom: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  itemContent: {
    flex: 1,
    marginBottom: responsive.mediaQuery.isMobile() ? SPACING.md : 0,
  },
  emailText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '500',
    color: BRAND_COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  dateText: {
    fontSize: FONT_SIZE.sm,
    color: BRAND_COLORS.text.secondary,
    marginBottom: 2,
  },
  expiryText: {
    fontSize: FONT_SIZE.sm,
    color: BRAND_COLORS.text.secondary,
  },
  expiredText: {
    color: BRAND_COLORS.error,
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.sm,
    marginLeft: SPACING.sm,
  },
  resendButton: {
    backgroundColor: BRAND_COLORS.primary,
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: BRAND_COLORS.error,
  },
  actionButtonText: {
    fontSize: FONT_SIZE.sm,
    color: BRAND_COLORS.white,
    fontWeight: '500',
  },
  cancelButtonText: {
    fontSize: FONT_SIZE.sm,
    color: BRAND_COLORS.error,
    fontWeight: '500',
  },
});

export default PendingInvitations; 