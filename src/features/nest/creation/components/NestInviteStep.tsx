import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  TextInput,
  FlatList,
  Keyboard
} from 'react-native';
import { BRAND_COLORS } from '@constants/Colors';

interface NestInviteStepProps {
  initialMembers: string[];
  onChange: (members: string[]) => void;
  onNext: () => void;
  onBack: () => void;
}

/**
 * NESTメンバー招待ステップコンポーネント
 */
const NestInviteStep: React.FC<NestInviteStepProps> = ({
  initialMembers,
  onChange,
  onNext,
  onBack
}) => {
  const [email, setEmail] = useState('');
  const [invitees, setInvitees] = useState<string[]>(initialMembers || []);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);

  // メールアドレスの検証
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // メンバーを追加
  const addMember = () => {
    const trimmedEmail = email.trim();
    
    if (!trimmedEmail) {
      setError('メールアドレスを入力してください');
      return;
    }
    
    if (!validateEmail(trimmedEmail)) {
      setError('有効なメールアドレスを入力してください');
      return;
    }
    
    if (invitees.includes(trimmedEmail)) {
      setError('このメールアドレスは既に追加されています');
      return;
    }
    
    // 新しいメンバーを追加
    const newInvitees = [...invitees, trimmedEmail];
    setInvitees(newInvitees);
    onChange(newInvitees);
    
    // 入力フィールドをクリア
    setEmail('');
    setError(null);
    
    // フォーカスを保持（モバイルではキーボードを閉じない）
    if (Platform.OS === 'web') {
      inputRef.current?.focus();
    }
  };

  // メンバーを削除
  const removeMember = (memberEmail: string) => {
    const newInvitees = invitees.filter(email => email !== memberEmail);
    setInvitees(newInvitees);
    onChange(newInvitees);
  };

  // キーボードの確定ボタンでメンバー追加
  const handleSubmit = () => {
    addMember();
  };

  // 招待メンバーのレンダリング
  const renderInvitee = ({ item }: { item: string }) => (
    <View style={styles.inviteeItem}>
      <View style={styles.inviteeAvatar}>
        <Text style={styles.inviteeInitial}>{item.charAt(0).toUpperCase()}</Text>
      </View>
      <Text style={styles.inviteeEmail}>{item}</Text>
      <TouchableOpacity 
        style={styles.removeButton}
        onPress={() => removeMember(item)}
        accessibilityLabel={`${item}を削除`}
      >
        <Text style={styles.removeButtonText}>✕</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>メンバーを招待</Text>
      <Text style={styles.description}>
        NESTのメンバーを招待できます。あとからいつでも追加できるので、今は省略しても構いません。
      </Text>

      <View style={styles.formSection}>
        <Text style={styles.label}>メールアドレスで招待</Text>
        <View style={styles.inputContainer}>
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="例: taro@example.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
            accessibilityLabel="招待するメールアドレスを入力"
          />
          <TouchableOpacity
            style={[
              styles.addButton,
              !email.trim() && styles.disabledButton
            ]}
            onPress={addMember}
            disabled={!email.trim()}
          >
            <Text style={styles.addButtonText}>追加</Text>
          </TouchableOpacity>
        </View>
        
        {error && (
          <Text style={styles.errorText}>{error}</Text>
        )}
        
        <Text style={styles.helperText}>
          メンバーには招待メールが送信されます。NESTが作成されるまでメールは送信されません。
        </Text>
      </View>

      {invitees.length > 0 && (
        <View style={styles.inviteesSection}>
          <Text style={styles.inviteesTitle}>
            招待予定のメンバー ({invitees.length})
          </Text>
          <FlatList
            data={invitees}
            renderItem={renderInvitee}
            keyExtractor={(item) => item}
            style={styles.inviteesList}
            scrollEnabled={false}
          />
        </View>
      )}

      <View style={styles.divider} />

      <View style={styles.infoContainer}>
        <Text style={styles.infoIcon}>💡</Text>
        <Text style={styles.infoText}>
          ヒント: 招待メンバーはすぐに参加できますが、初期状態では「メンバー」権限が付与されます。
          作成後にNEST設定で管理者に昇格させることができます。
        </Text>
      </View>

      {invitees.length > 0 && (
        <TouchableOpacity
          style={styles.clearAllButton}
          onPress={() => {
            setInvitees([]);
            onChange([]);
          }}
        >
          <Text style={styles.clearAllButtonText}>
            すべての招待をクリア
          </Text>
        </TouchableOpacity>
      )}

      {/* デスクトップ向けのボタン */}
      {Platform.OS === 'web' && (
        <View style={styles.webButtonContainer}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={onBack}
          >
            <Text style={styles.backButtonText}>戻る</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.nextButton}
            onPress={onNext}
          >
            <Text style={styles.nextButtonText}>次へ</Text>
          </TouchableOpacity>
        </View>
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
    paddingBottom: Platform.OS === 'web' ? 0 : 100, // モバイルでは下部ナビのスペースを確保
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
  formSection: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: BRAND_COLORS.text.primary,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: BRAND_COLORS.text.primary,
    borderWidth: 1,
    borderColor: BRAND_COLORS.background.medium,
  },
  addButton: {
    backgroundColor: BRAND_COLORS.primary,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    backgroundColor: BRAND_COLORS.background.dark,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  errorText: {
    color: BRAND_COLORS.error,
    marginTop: 8,
    fontSize: 14,
  },
  helperText: {
    fontSize: 12,
    color: BRAND_COLORS.text.tertiary,
    marginTop: 8,
    marginBottom: 16,
  },
  inviteesSection: {
    marginBottom: 24,
  },
  inviteesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: BRAND_COLORS.text.primary,
    marginBottom: 12,
  },
  inviteesList: {
    paddingHorizontal: 4,
  },
  inviteeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BRAND_COLORS.background.medium,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
  },
  inviteeAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: BRAND_COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  inviteeInitial: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  inviteeEmail: {
    flex: 1,
    fontSize: 14,
    color: BRAND_COLORS.text.primary,
  },
  removeButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButtonText: {
    color: BRAND_COLORS.text.primary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    backgroundColor: BRAND_COLORS.background.medium,
    marginVertical: 16,
  },
  infoContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(243, 156, 18, 0.1)',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },
  infoIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: BRAND_COLORS.text.secondary,
    lineHeight: 20,
  },
  clearAllButton: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
    marginBottom: 24,
  },
  clearAllButtonText: {
    color: BRAND_COLORS.error,
    fontSize: 14,
    fontWeight: '500',
  },
  webButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 40,
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
  nextButton: {
    backgroundColor: BRAND_COLORS.primary,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default NestInviteStep; 