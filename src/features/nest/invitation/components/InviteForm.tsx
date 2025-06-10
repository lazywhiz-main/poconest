import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Platform,
  ActivityIndicator,
  Alert,
  useWindowDimensions
} from 'react-native';
import { useNest } from '../../contexts/NestContext';
import invitationService from '../services/invitationService';
console.log('[InviteForm] invitationService:', invitationService);
import { COLORS, BRAND_COLORS } from '@constants/Colors';
import Styles, { SPACING, FONT_SIZE, BORDER_RADIUS, SHADOW, COMPONENT_STYLES } from '@constants/Styles';
import responsive from '@utils/responsive';
import { useAuth } from '../../../../contexts/AuthContext';
import { Navigate } from 'react-router-dom';

interface InviteFormProps {
  onInviteSent?: () => void;
}

const InviteForm: React.FC<InviteFormProps> = ({ onInviteSent }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const { currentNest } = useNest();
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const isMobile = responsive.mediaQuery.isMobile(width);
  
  if (!user) {
    return <Navigate to="/login" />;
  }

  if (!currentNest) {
    return (
      <View style={styles.container}>
        <Text>NESTが選択されていません。Nest一覧から選択してください。</Text>
      </View>
    );
  }
  
  // メール招待送信処理
  const handleSendInvitation = async () => {
    console.log('[InviteForm] handleSendInvitation called', email, currentNest?.id);
    console.log('[InviteForm] invitationService:', invitationService);
    console.log('[InviteForm] invitationService.inviteMemberByEmail:', invitationService.inviteMemberByEmail);
    if (!email || !email.includes('@')) {
      setError('有効なメールアドレスを入力してください');
      return;
    }
    
    if (!currentNest) {
      setError('NESTが選択されていません');
      return;
    }
    
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const result = await invitationService.inviteMemberByEmail(currentNest.id, email);
      
      if (result.error) {
        setError(result.error.message);
      } else {
        setSuccess(`${email}に招待を送信しました`);
        setEmail('');
        if (onInviteSent) {
          onInviteSent();
        }
      }
    } catch (err: any) {
      setError(err.message || '招待の送信に失敗しました');
    } finally {
      setLoading(false);
    }
  };
  
  // エラーダイアログの表示（モバイル用）
  const showErrorAlert = () => {
    if (Platform.OS !== 'web' && error) {
      Alert.alert('エラー', error, [{ text: 'OK', onPress: () => setError(null) }]);
    }
  };
  
  if (error && Platform.OS !== 'web') {
    showErrorAlert();
  }
  
  return (
    <View style={[
      styles.container,
      isMobile ? styles.containerMobile : styles.containerDesktop
    ]}>
      <View style={styles.headerContainer}>
        <Text style={styles.title}>NESTに招待する</Text>
        {currentNest && (
          <Text style={styles.subtitle}>
            「{currentNest.name}」にメンバーを招待します
          </Text>
        )}
      </View>
      
      <View style={styles.formContainer}>
        <TextInput
          style={styles.input}
          placeholder="メールアドレスを入力"
          placeholderTextColor={BRAND_COLORS.text.tertiary}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          editable={!loading}
          accessibilityLabel="招待するメールアドレス"
        />
        
        <TouchableOpacity
          style={[
            styles.button,
            loading && styles.buttonDisabled
          ]}
          onPress={handleSendInvitation}
          disabled={loading || !email}
          accessibilityLabel="招待を送信"
          accessibilityHint="入力したメールアドレスに招待を送信します"
        >
          {loading ? (
            <ActivityIndicator color={BRAND_COLORS.white} size="small" />
          ) : (
            <Text style={styles.buttonText}>招待を送信</Text>
          )}
        </TouchableOpacity>
      </View>
      
      {/* エラーメッセージ（Webのみ。モバイルはAlert） */}
      {error && Platform.OS === 'web' && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
      
      {/* 成功メッセージ */}
      {success && (
        <View style={styles.successContainer}>
          <Text style={styles.successText}>{success}</Text>
        </View>
      )}
      
      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>
          招待されたユーザーには、メールで通知が送信されます。
          24時間以内に招待を承諾するよう依頼してください。
        </Text>
      </View>
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
    maxWidth: 600,
    alignSelf: 'center',
  },
  headerContainer: {
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZE.xl,
    fontWeight: 'bold',
    color: BRAND_COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: FONT_SIZE.md,
    color: BRAND_COLORS.text.secondary,
  },
  formContainer: {
    flexDirection: responsive.mediaQuery.isMobile() ? 'column' : 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  input: {
    ...COMPONENT_STYLES.input,
    flex: 1,
    marginBottom: responsive.mediaQuery.isMobile() ? SPACING.sm : 0,
    marginRight: responsive.mediaQuery.isMobile() ? 0 : SPACING.sm,
  },
  button: {
    ...COMPONENT_STYLES.button,
    paddingVertical: responsive.mediaQuery.isMobile() ? SPACING.sm : SPACING.md,
    minWidth: responsive.mediaQuery.isMobile() ? '100%' : 120,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    flexDirection: 'row' as const,
  },
  buttonDisabled: {
    backgroundColor: BRAND_COLORS.gray,
  },
  buttonText: {
    color: BRAND_COLORS.white,
    fontWeight: 'bold',
    fontSize: FONT_SIZE.md,
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
  successContainer: {
    backgroundColor: BRAND_COLORS.success,
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    marginBottom: SPACING.md,
  },
  successText: {
    color: BRAND_COLORS.white,
    fontSize: FONT_SIZE.sm,
  },
  infoContainer: {
    padding: SPACING.sm,
    backgroundColor: BRAND_COLORS.background.medium,
    borderRadius: BORDER_RADIUS.sm,
  },
  infoText: {
    fontSize: FONT_SIZE.sm,
    color: BRAND_COLORS.text.secondary,
  },
});

export default InviteForm; 