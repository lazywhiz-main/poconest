import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Platform, Alert } from 'react-native';
import { useNest, NestMember } from '../contexts/NestContext';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/ui/Icon';

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
    if (!date) return '未アクセス';
    
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

  // メンバーのオンライン状態を判定（仮の実装）
  const getMemberStatus = (lastActive?: string) => {
    if (!lastActive) return 'offline';
    const lastActiveDate = new Date(lastActive);
    const now = new Date();
    const diffMinutes = (now.getTime() - lastActiveDate.getTime()) / (1000 * 60);
    
    if (diffMinutes < 5) return 'online';
    if (diffMinutes < 30) return 'away';
    return 'offline';
  };

  // プロフィール画像の背景色を生成（ユーザーIDに基づく）
  const getAvatarColor = (userId: string) => {
    const colors = [
      '#00ff88', // Green
      '#64b5f6', // Blue
      '#ff6b6b', // Red
      '#ffa500', // Orange
      '#9c27b0', // Purple
      '#26c6da', // Cyan
      '#ffeb3b', // Yellow
      '#4caf50', // Dark Green
      '#e91e63', // Pink
      '#795548'  // Brown
    ];
    
    // ユーザーIDのハッシュ値を計算して色を決定
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  // ステータスインジケーターコンポーネント
  const StatusIndicator = ({ status }: { status: string }) => {
    const colors = {
      online: '#00ff88',
      away: '#ffa500',
      busy: '#ff6b6b',
      offline: '#6c7086'
    };
    
    return (
      <div style={{
        position: 'absolute',
        bottom: -2,
        right: -2,
        width: 16,
        height: 16,
        borderRadius: '50%',
        backgroundColor: colors[status as keyof typeof colors] || colors.offline,
        border: '2px solid #1a1a2e'
      }} />
    );
  };

  // メンバー詳細モーダルを表示
  const handleMemberPress = (member: NestMember) => {
    setSelectedMember(member);
    setModalVisible(true);
  };

  // メンバー管理アクション
  const handleAction = (action: 'promote' | 'demote' | 'remove') => {
    if (!selectedMember) return;
    
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
            console.log(`${action} action on member ${selectedMember.user_id}`);
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
        <View style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'rgba(15, 15, 35, 0.8)',
          ...Platform.select({
            web: { backdropFilter: 'blur(4px)' },
            default: {}
          })
        }}>
          <div style={{
            width: Platform.OS === 'web' ? 480 : '90%',
            maxWidth: 480,
            background: '#1a1a2e',
            border: '1px solid #333366',
            borderRadius: 4,
            padding: 24,
            opacity: 1
          }}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>メンバー詳細</Text>
              <TouchableOpacity 
                onPress={() => setModalVisible(false)}
                accessibilityLabel="閉じる"
              >
                <Icon name="close" size={20} color="#6c7086" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.memberDetail}>
              <div style={{ 
                width: 64, 
                height: 64, 
                borderRadius: 8, 
                backgroundColor: getAvatarColor(selectedMember.user_id), 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                marginRight: 20,
                position: 'relative'
              }}>
                <span style={{ color: '#0f0f23', fontSize: 28, fontWeight: 700 }}>
                  {selectedMember.users?.display_name && selectedMember.users.display_name.length > 0 ? selectedMember.users.display_name[0].toUpperCase() : '?'}
                </span>
                <StatusIndicator status={getMemberStatus(selectedMember.last_active_at)} />
              </div>
              
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
                <Button
                  title="管理者に昇格"
                  onPress={() => handleAction('promote')}
                  variant="primary"
                  size="md"
                  style={{ marginBottom: 8 }}
                />
              )}
              
              {!isOwner && isAdmin && (
                <Button
                  title="メンバーに降格"
                  onPress={() => handleAction('demote')}
                  variant="default"
                  size="md"
                  style={{ marginBottom: 8 }}
                />
              )}
              
              {!isOwner && (
                <Button
                  title="NESTから削除"
                  onPress={() => handleAction('remove')}
                  variant="danger"
                  size="md"
                />
              )}
            </View>
          </div>
        </View>
      </Modal>
    );
  };

  if (loading) {
    return (
      <div style={{ 
        background: '#1a1a2e',
        border: '1px solid #333366',
        borderRadius: 4,
        padding: 20, 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center' 
      }}>
        <div style={{ color: '#6c7086', fontSize: 12 }}>メンバーを読み込み中...</div>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 0 }}>
      <div style={{ 
        fontSize: 11, 
        fontWeight: 600, 
        color: '#a6adc8',
        textTransform: 'uppercase',
        letterSpacing: '1px',
        marginBottom: 16 
      }}>
        メンバー ({nestMembers.length})
      </div>
      
      {nestMembers.length === 0 ? (
        <div style={{ 
          background: '#1a1a2e',
          border: '1px solid #333366',
          borderRadius: 4,
          padding: 20, 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center' 
        }}>
          <div style={{ color: '#6c7086', fontSize: 12 }}>メンバーがいません</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {nestMembers.map((item) => {
            const name = item.users?.display_name || '名前なし';
            const memberStatus = getMemberStatus(item.last_active_at);
            return (
              <div
                key={item.nest_id + '-' + item.user_id} 
                style={{ 
                  background: '#1a1a2e',
                  border: '1px solid #333366',
                  borderRadius: 4,
                  padding: 16,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onClick={() => handleMemberPress(item)}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = '#45475a';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = '#333366';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ 
                    width: 48, 
                    height: 48, 
                    borderRadius: 8, 
                    backgroundColor: getAvatarColor(item.user_id), 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    marginRight: 16, 
                    flexShrink: 0,
                    position: 'relative'
                  }}>
                    <span style={{ color: '#0f0f23', fontSize: 18, fontWeight: 700 }}>
                      {name && name.length > 0 ? name[0].toUpperCase() : '?'}
                    </span>
                    <StatusIndicator status={memberStatus} />
                  </div>
                  
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ 
                      fontSize: 14, 
                      fontWeight: 500, 
                      color: '#e2e8f0', 
                      marginBottom: 2 
                    }}>
                      {name}
                    </div>
                    <div style={{ 
                      fontSize: 12, 
                      color: '#6c7086', 
                      marginBottom: 2 
                    }}>
                      {getMemberRoleLabel(item.role)}
                    </div>
                    <div style={{ 
                      fontSize: 11, 
                      color: '#6c7086' 
                    }}>
                      {formatLastActive(item.last_active_at)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {renderMemberModal()}
    </div>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: Platform.OS === 'web' ? 480 : '90%',
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#e2e8f0',
  },
  memberDetail: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  memberInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  memberName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#e2e8f0',
    marginBottom: 2,
  },
  memberEmail: {
    fontSize: 14,
    color: '#a6adc8',
    marginBottom: 8,
  },
  memberRole: {
    fontSize: 14,
    fontWeight: '500',
    color: '#e2e8f0',
    marginBottom: 2,
  },
  memberJoinDate: {
    fontSize: 13,
    color: '#6c7086',
    marginBottom: 2,
  },
  memberLastActive: {
    fontSize: 13,
    color: '#6c7086',
  },
  actionButtons: {
    marginTop: 16,
  },
});

export default NestMemberList; 