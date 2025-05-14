import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform
} from 'react-native';
import { usePermissions } from '../hooks/usePermissions';
import { 
  NestMemberWithPermissions, 
  NestRole, 
  PermissionType 
} from '../types/permissions.types';
import { useAuth } from '@contexts/AuthContext';

// アイコン用のプレースホルダーコンポーネント（実際の実装ではアイコンライブラリを使用）
const Icon = ({ name, size, color }: { name: string, size: number, color: string }) => (
  <Text style={{ color, fontSize: size / 1.5 }}>
    {name === 'crown' ? '👑' : 
     name === 'shield' ? '🛡️' : 
     name === 'person' ? '👤' : 
     name === 'key' ? '🔑' : '⚙️'}
  </Text>
);

interface PermissionManagerProps {
  nestId?: string;
  onPermissionsChange?: () => void;
}

/**
 * NESTメンバーの権限管理コンポーネント
 */
const PermissionManager: React.FC<PermissionManagerProps> = ({
  nestId,
  onPermissionsChange
}) => {
  const { user } = useAuth();
  const { 
    loading, 
    error,
    getAllMembersWithPermissions,
    updateMemberRole,
    hasPermission
  } = usePermissions(nestId);
  
  const [members, setMembers] = useState<NestMemberWithPermissions[]>([]);
  const [selectedMember, setSelectedMember] = useState<NestMemberWithPermissions | null>(null);
  const [savingMemberId, setSavingMemberId] = useState<string | null>(null);
  const [canManageRoles, setCanManageRoles] = useState<boolean>(false);
  const [loadingMembers, setLoadingMembers] = useState(true);

  // メンバー一覧を取得
  const fetchMembers = useCallback(async () => {
    try {
      setLoadingMembers(true);
      const membersList = await getAllMembersWithPermissions();
      
      // ロール順にソート（Owner -> Admin -> Member -> Guest）
      const sortedMembers = membersList.sort((a, b) => {
        const roleOrder = {
          [NestRole.OWNER]: 0,
          [NestRole.ADMIN]: 1,
          [NestRole.MEMBER]: 2,
          [NestRole.GUEST]: 3
        };
        
        return roleOrder[a.role] - roleOrder[b.role];
      });
      
      setMembers(sortedMembers);
    } catch (err) {
      console.error('メンバー情報の取得に失敗しました:', err);
    } finally {
      setLoadingMembers(false);
    }
  }, [getAllMembersWithPermissions]);

  // 権限の確認
  const checkPermissions = useCallback(async () => {
    if (!user) return;
    
    const canManage = await hasPermission(
      user.id,
      PermissionType.MANAGE_ROLES
    );
    
    setCanManageRoles(canManage);
  }, [user, hasPermission]);

  // 初期データの読み込み
  useEffect(() => {
    fetchMembers();
    checkPermissions();
  }, [fetchMembers, checkPermissions]);

  /**
   * メンバーのロールを変更する
   */
  const handleRoleChange = async (userId: string, newRole: NestRole) => {
    if (!canManageRoles) {
      Alert.alert('権限エラー', 'ロール変更の権限がありません');
      return;
    }
    
    // 確認ダイアログを表示
    if (Platform.OS === 'web') {
      if (!window.confirm(`このメンバーのロールを${getRoleLabel(newRole)}に変更しますか？`)) {
        return;
      }
    } else {
      return new Promise((resolve) => {
        Alert.alert(
          'ロール変更の確認',
          `このメンバーのロールを${getRoleLabel(newRole)}に変更しますか？`,
          [
            { text: 'キャンセル', style: 'cancel', onPress: () => resolve(false) },
            { 
              text: '変更', 
              onPress: async () => {
                try {
                  await changeRole(userId, newRole);
                  resolve(true);
                } catch (err) {
                  resolve(false);
                }
              }
            }
          ]
        );
      });
    }
    
    await changeRole(userId, newRole);
  };

  /**
   * ロール変更の実行
   */
  const changeRole = async (userId: string, newRole: NestRole) => {
    try {
      setSavingMemberId(userId);
      
      const result = await updateMemberRole(userId, newRole);
      
      if (result.success) {
        // メンバーリストを更新
        await fetchMembers();
        onPermissionsChange && onPermissionsChange();
        
        // 成功メッセージを表示
        if (Platform.OS !== 'web') {
          Alert.alert('成功', 'メンバーのロールが更新されました');
        }
      } else {
        // エラーメッセージを表示
        Alert.alert('エラー', result.error || 'ロールの更新に失敗しました');
      }
    } catch (err: any) {
      Alert.alert('エラー', err.message || 'ロール変更中にエラーが発生しました');
    } finally {
      setSavingMemberId(null);
    }
  };

  /**
   * メンバー詳細を表示
   */
  const handleMemberSelect = (member: NestMemberWithPermissions) => {
    setSelectedMember(member);
    
    // ここでモーダル表示などの処理
    if (Platform.OS !== 'web') {
      Alert.alert(
        `${member.displayName}の詳細`,
        `ロール: ${getRoleLabel(member.role)}\n` +
        `権限数: ${member.permissions.length}\n` +
        `参加日: ${new Date(member.joinedDate).toLocaleDateString()}`,
        [{ text: '閉じる' }]
      );
    }
  };

  /**
   * ロールの表示名を取得
   */
  const getRoleLabel = (role: NestRole): string => {
    switch (role) {
      case NestRole.OWNER:
        return 'オーナー';
      case NestRole.ADMIN:
        return '管理者';
      case NestRole.MEMBER:
        return 'メンバー';
      case NestRole.GUEST:
        return 'ゲスト';
      default:
        return '不明';
    }
  };

  /**
   * ロールアイコンを取得
   */
  const getRoleIcon = (role: NestRole): { name: string; color: string } => {
    switch (role) {
      case NestRole.OWNER:
        return { name: 'crown', color: '#FFD700' };
      case NestRole.ADMIN:
        return { name: 'shield', color: '#4169E1' };
      case NestRole.MEMBER:
        return { name: 'person', color: '#2E8B57' };
      case NestRole.GUEST:
        return { name: 'eye', color: '#A9A9A9' };
      default:
        return { name: 'help', color: '#888888' };
    }
  };

  /**
   * メンバーカードをレンダリング
   */
  const renderMemberItem = ({ item }: { item: NestMemberWithPermissions }) => {
    const roleInfo = getRoleIcon(item.role);
    const isCurrentUser = user && user.id === item.userId;
    const isOwner = item.role === NestRole.OWNER;
    const isSaving = savingMemberId === item.userId;
    
    return (
      <View style={styles.memberCard}>
        <TouchableOpacity 
          style={styles.memberInfo}
          onPress={() => handleMemberSelect(item)}
        >
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>
              {item.displayName.substring(0, 2)}
            </Text>
            <View style={styles.roleIconContainer}>
              <Icon name={roleInfo.name} size={14} color={roleInfo.color} />
            </View>
          </View>
          
          <View style={styles.memberDetails}>
            <Text style={styles.memberName}>
              {item.displayName}
              {isCurrentUser && <Text style={styles.currentUser}> (あなた)</Text>}
            </Text>
            <Text style={styles.memberRole}>{getRoleLabel(item.role)}</Text>
            {item.email && (
              <Text style={styles.memberEmail}>{item.email}</Text>
            )}
          </View>
        </TouchableOpacity>
        
        {canManageRoles && !isOwner && !isCurrentUser && (
          <View style={styles.roleActions}>
            {isSaving ? (
              <ActivityIndicator size="small" color="#0066cc" />
            ) : (
              <View style={styles.roleButtonsContainer}>
                {item.role !== NestRole.ADMIN && (
                  <TouchableOpacity 
                    style={[styles.roleButton, styles.adminButton]}
                    onPress={() => handleRoleChange(item.userId, NestRole.ADMIN)}
                  >
                    <Text style={styles.roleButtonText}>管理者に</Text>
                  </TouchableOpacity>
                )}
                
                {item.role !== NestRole.MEMBER && (
                  <TouchableOpacity 
                    style={[styles.roleButton, styles.memberButton]}
                    onPress={() => handleRoleChange(item.userId, NestRole.MEMBER)}
                  >
                    <Text style={styles.roleButtonText}>メンバーに</Text>
                  </TouchableOpacity>
                )}
                
                {item.role !== NestRole.GUEST && (
                  <TouchableOpacity 
                    style={[styles.roleButton, styles.guestButton]}
                    onPress={() => handleRoleChange(item.userId, NestRole.GUEST)}
                  >
                    <Text style={styles.roleButtonText}>ゲストに</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  if (loading || loadingMembers) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066cc" />
        <Text style={styles.loadingText}>メンバー情報を読み込んでいます...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>メンバー管理</Text>
        {canManageRoles && (
          <Text style={styles.subtitle}>
            メンバーのロールを変更できます
          </Text>
        )}
      </View>
      
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
      
      <View style={styles.membersContainer}>
        <FlatList
          data={members}
          renderItem={renderMemberItem}
          keyExtractor={(item) => item.userId}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>メンバーが見つかりません</Text>
          }
        />
      </View>
      
      <View style={styles.legendContainer}>
        <Text style={styles.legendTitle}>ロールについて</Text>
        <View style={styles.legendItem}>
          <Icon name="crown" size={18} color="#FFD700" />
          <Text style={styles.legendText}>
            <Text style={styles.bold}>オーナー: </Text>
            すべての権限を持ち、NESTを管理できます
          </Text>
        </View>
        <View style={styles.legendItem}>
          <Icon name="shield" size={18} color="#4169E1" />
          <Text style={styles.legendText}>
            <Text style={styles.bold}>管理者: </Text>
            メンバーの管理やコンテンツの編集権限を持ちます
          </Text>
        </View>
        <View style={styles.legendItem}>
          <Icon name="person" size={18} color="#2E8B57" />
          <Text style={styles.legendText}>
            <Text style={styles.bold}>メンバー: </Text>
            基本的なコンテンツの作成と共有ができます
          </Text>
        </View>
        <View style={styles.legendItem}>
          <Icon name="eye" size={18} color="#A9A9A9" />
          <Text style={styles.legendText}>
            <Text style={styles.bold}>ゲスト: </Text>
            閲覧とリアクションのみの限定的な権限です
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    ...Platform.select({
      web: {
        maxWidth: 800,
        margin: 'auto',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
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
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
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
  membersContainer: {
    flex: 1,
    marginBottom: 20,
  },
  listContent: {
    paddingVertical: 8,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    padding: 20,
  },
  memberCard: {
    flexDirection: 'row',
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    marginBottom: 8,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  memberInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    position: 'relative',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#555',
  },
  roleIconContainer: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#fff',
    borderRadius: 10,
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  memberDetails: {
    flex: 1,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  currentUser: {
    fontStyle: 'italic',
    color: '#666',
  },
  memberRole: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  memberEmail: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  roleActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roleButtonsContainer: {
    flexDirection: 'column',
  },
  roleButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    marginBottom: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminButton: {
    backgroundColor: '#e6effd',
  },
  memberButton: {
    backgroundColor: '#e6f5ed',
  },
  guestButton: {
    backgroundColor: '#f0f0f0',
  },
  roleButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  legendContainer: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  legendTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#555',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
  bold: {
    fontWeight: '600',
  },
});

export default PermissionManager; 