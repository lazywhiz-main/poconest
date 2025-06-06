import React, { useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useNest, NestInvitation } from '../contexts/NestContext';
import Button from '../../../components/ui/Button';
import FormGroup from '../../../components/ui/FormGroup';
import Input from '../../../components/ui/Input';
import Card from '../../../components/ui/Card';

interface InvitationFormProps {
  nestId: string;
}

const InvitationForm: React.FC<InvitationFormProps> = ({ nestId }) => {
  const { pendingInvitations, inviteMember, resendInvitation, cancelInvitation, loading } = useNest();
  const [email, setEmail] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);

  // 現在のNESTの招待リストをフィルタリング
  const filteredInvitations = pendingInvitations.filter((invitation: NestInvitation) => invitation.nest_id === nestId);

  const handleInvite = async () => {
    if (!email.trim()) return;
    
    setInviteLoading(true);
    const { error } = await inviteMember(nestId, email.trim());
    setInviteLoading(false);
    
    if (error) {
      Alert.alert('エラー', error.message || '招待の送信に失敗しました');
    } else {
      setEmail('');
    }
  };

  const handleResendInvitation = async (invitationId: string) => {
    const { error } = await resendInvitation(invitationId);
    if (error) {
      Alert.alert('エラー', error.message || '招待の再送に失敗しました');
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    const { error } = await cancelInvitation(invitationId);
    if (error) {
      Alert.alert('エラー', error.message || '招待の取消に失敗しました');
    }
  };

  const handleCopyInviteLink = async (token: string) => {
    const inviteLink = `${window.location.origin}/invite/${token}`;
    try {
      await navigator.clipboard.writeText(inviteLink);
      Alert.alert('成功', '招待リンクをクリップボードにコピーしました');
    } catch (error) {
      Alert.alert('エラー', 'クリップボードへのコピーに失敗しました');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric'
    });
  };

  return (
    <div style={{ marginBottom: 0 }}>
      <div style={{ marginBottom: 16 }}>
        <label style={{ 
          display: 'block',
          fontSize: 11, 
          fontWeight: 600, 
          color: '#a6adc8',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          marginBottom: 6
        }}>
          EMAIL ADDRESS
        </label>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <Input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="メールアドレスを入力"
              disabled={inviteLoading}
            />
          </div>
          <Button
            title={inviteLoading ? '送信中...' : '招待'}
            onPress={handleInvite}
            variant="primary"
            size="md"
            disabled={inviteLoading || !email.trim()}
            loading={inviteLoading}
            style={{ minWidth: 100, flexShrink: 0, height: 40 }}
          />
        </div>
      </div>

      <div style={{ marginTop: 32 }}>
        <div style={{ 
          fontSize: 11, 
          fontWeight: 600, 
          color: '#a6adc8',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          marginBottom: 16 
        }}>
          保留中の招待 ({filteredInvitations.length})
        </div>
        
        {filteredInvitations.length === 0 ? (
          <div style={{ 
            background: '#1a1a2e',
            border: '1px solid #333366',
            borderRadius: 4,
            padding: 20, 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center' 
          }}>
            <div style={{ color: '#6c7086', fontSize: 12 }}>保留中の招待はありません</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filteredInvitations.map((item: NestInvitation) => (
              <div 
                key={item.id} 
                style={{ 
                  background: '#1a1a2e',
                  border: '1px solid #333366',
                  borderRadius: 4,
                  padding: 16,
                  transition: 'all 0.2s ease'
                }}
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
                    backgroundColor: '#6c7086', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    marginRight: 16,
                    flexShrink: 0
                  }}>
                    <span style={{ color: '#fff', fontSize: 18, fontWeight: 700 }}>
                      {item.invited_email && item.invited_email.length > 0 ? item.invited_email[0].toUpperCase() : '?'}
                    </span>
                  </div>
                  
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ 
                      fontSize: 14, 
                      fontWeight: 500, 
                      color: '#e2e8f0', 
                      marginBottom: 2 
                    }}>
                      {item.invited_email}
                    </div>
                    <div style={{ 
                      fontSize: 12, 
                      color: '#6c7086', 
                      marginBottom: 2 
                    }}>
                      送信日: {formatDate(item.created_at)}
                    </div>
                    {item.expires_at && (
                      <div style={{ 
                        fontSize: 11, 
                        color: '#6c7086' 
                      }}>
                        有効期限: {formatDate(item.expires_at)}
                      </div>
                    )}
                  </div>
                  
                  <div style={{ display: 'flex', gap: 8, marginLeft: 16 }}>
                    <Button 
                      title="コピー" 
                      onPress={() => handleCopyInviteLink(item.token)} 
                      variant="default" 
                      size="sm" 
                    />
                    <Button 
                      title="再送" 
                      onPress={() => handleResendInvitation(item.id)} 
                      variant="default" 
                      size="sm" 
                    />
                    <Button 
                      title="取消" 
                      onPress={() => handleCancelInvitation(item.id)} 
                      variant="danger" 
                      size="sm" 
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default InvitationForm; 