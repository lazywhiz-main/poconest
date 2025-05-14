import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  Platform,
  Alert
} from 'react-native';
import { useNest, NestMember } from '../contexts/NestContext';
import { COLORS, SPACING } from '@constants/config';

interface NestMemberListProps {
  nestId: string;
}

const NestMemberList: React.FC<NestMemberListProps> = ({ nestId }) => {
  const { nestMembers, currentNest, loading } = useNest();
  const [selectedMember, setSelectedMember] = useState<NestMember | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // メンバーの役割を表示用に変換
  const getMemberRoleLabel = (role: string) => {
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

  // メンバーの最終アクティブ日時をフォーマット
  const formatLastActive = (date?: string) => {
    if (!date) return '活動なし';
    
    const lastActive = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - lastActive.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHours === 0) {
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        return `${diffMinutes}分前`;
      }
      return `${diffHours}時間前`;
    }
    
    if (diffDays < 30) {
      return `${diffDays}日前`;
    }
    
    return lastActive.toLocaleDateString();
  };

  // メンバー詳細モーダルを表示
  const handleMemberPress = (member: NestMember) => {
    setSelectedMember(member);
    setModalVisible(true);
  };

  // メンバー管理アクション
  const handleAction = (action: 'promote' | 'demote' | 'remove') => {
    if (!selectedMember) return;
    
    // ここでAPI呼び出し
    const actionLabels = {
      promote: '管理者に昇格',
      demote: 'メンバーに降格',
      remove: 'NESTから削除'
    };
    
    Alert.alert(
      '確認',
      `${selectedMember.users?.display_name || 'このユーザー'}を${actionLabels[action]}しますか？`,
      [
        {
          text: 'キャンセル',
          style: 'cancel'
        },
        {
          text: '実行',
          onPress: () => {
            // 実際の実装ではAPIを呼び出す
            console.log(`${action} action on member ${selectedMember.user_id}`);
            // 成功したらモーダルを閉じる
            setModalVisible(false);
          },
          style: 'destructive'
        }
      ]
    );
  };

  // メンバー詳細モーダル
  const renderMemberModal = () => {
    if (!selectedMember) return null;
    
    const isOwner = selectedMember.role === 'owner';
    const isAdmin = selectedMember.role === 'admin';
    const isMember = selectedMember.role === 'member';
    
    return (
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>メンバー詳細</Text>
              <TouchableOpacity 
                onPress={() => setModalVisible(false)}
                accessibilityLabel="閉じる"
              >
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.memberDetail}>
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>
                  {(selectedMember.users?.display_name || '?')[0].toUpperCase()}
                </Text>
              </View>
              
              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>
                  {selectedMember.users?.display_name || '名前なし'}
                </Text>
                <Text style={styles.memberEmail}>
                  {selectedMember.users?.email || 'メールなし'}
                </Text>
                <Text style={styles.memberRole}>
                  {getMemberRoleLabel(selectedMember.role)}
                </Text>
                <Text style={styles.memberJoinDate}>
                  参加日: {new Date(selectedMember.joined_at).toLocaleDateString()}
                </Text>
                <Text style={styles.memberLastActive}>
                  最終アクティブ: {formatLastActive(selectedMember.last_active_at)}
                </Text>
              </View>
            </View>
            
            <View style={styles.actionButtons}>
              {!isOwner && isMember && (
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => handleAction('promote')}
                >
                  <Text style={styles.actionButtonText}>管理者に昇格</Text>
                </TouchableOpacity>
              )}
              
              {!isOwner && isAdmin && (
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => handleAction('demote')}
                >
                  <Text style={styles.actionButtonText}>メンバーに降格</Text>
                </TouchableOpacity>
              )}
              
              {!isOwner && (
                <TouchableOpacity 
                  style={[styles.actionButton, styles.removeButton]}
                  onPress={() => handleAction('remove')}
                >
                  <Text style={styles.removeButtonText}>NESTから削除</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>メンバーを読み込み中...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>メンバー ({nestMembers.length})</Text>
      
      <FlatList
        data={nestMembers}
        keyExtractor={(item) => `${item.nest_id}-${item.user_id}`}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.memberItem}
            onPress={() => handleMemberPress(item)}
            accessibilityRole="button"
            accessibilityLabel={`${item.users?.display_name || '名前なし'} - ${getMemberRoleLabel(item.role)}`}
            accessibilityHint="タップするとメンバー詳細を表示します"
          >
            <View style={styles.memberAvatar}>
              <Text style={styles.avatarText}>
                {(item.users?.display_name || '?')[0].toUpperCase()}
              </Text>
            </View>
            
            <View style={styles.memberItemInfo}>
              <Text style={styles.memberItemName} numberOfLines={1}>
                {item.users?.display_name || '名前なし'}
              </Text>
              <Text style={styles.memberItemRole}>
                {getMemberRoleLabel(item.role)}
              </Text>
            </View>
            
            <View style={styles.memberStatus}>
              <View 
                style={[
                  styles.statusIndicator, 
                  item.last_active_at ? styles.activeStatus : styles.inactiveStatus
                ]} 
              />
              <Text style={styles.lastActiveText} numberOfLines={1}>
                {item.last_active_at 
                  ? formatLastActive(item.last_active_at)
                  : '未アクセス'
                }
              </Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>メンバーがいません</Text>
          </View>
        }
      />
      
      {renderMemberModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: SPACING.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.md,
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.gray,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: SPACING.md,
    color: COLORS.text,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.white,
    borderRadius: 8,
    marginBottom: SPACING.sm,
    ...Platform.select({
      web: {
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        cursor: 'pointer',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        ':hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        }
      },
      default: {
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      }
    }),
  },
  memberAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  avatarText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  memberItemInfo: {
    flex: 1,
  },
  memberItemName: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
  },
  memberItemRole: {
    fontSize: 13,
    color: COLORS.gray,
  },
  memberStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: SPACING.xs,
  },
  activeStatus: {
    backgroundColor: COLORS.success,
  },
  inactiveStatus: {
    backgroundColor: COLORS.gray,
  },
  lastActiveText: {
    fontSize: 12,
    color: COLORS.gray,
    maxWidth: 80,
  },
  emptyContainer: {
    padding: SPACING.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: 'center',
  },
  
  // モーダル関連スタイル
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: Platform.OS === 'web' ? 480 : '90%',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SPACING.lg,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
      },
      default: {
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
      }
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  closeButton: {
    fontSize: 20,
    color: COLORS.gray,
    padding: SPACING.sm,
  },
  memberDetail: {
    flexDirection: 'row',
    marginBottom: SPACING.lg,
  },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.lg,
  },
  avatarInitial: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  memberInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  memberName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 2,
  },
  memberEmail: {
    fontSize: 14,
    color: COLORS.gray,
    marginBottom: SPACING.sm,
  },
  memberRole: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 2,
  },
  memberJoinDate: {
    fontSize: 13,
    color: COLORS.gray,
    marginBottom: 2,
  },
  memberLastActive: {
    fontSize: 13,
    color: COLORS.gray,
  },
  actionButtons: {
    marginTop: SPACING.md,
  },
  actionButton: {
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: 8,
    marginBottom: SPACING.sm,
    alignItems: 'center',
  },
  actionButtonText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 16,
  },
  removeButton: {
    backgroundColor: COLORS.error,
  },
  removeButtonText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 16,
  },
});

export default NestMemberList; 