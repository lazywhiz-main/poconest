import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
  Alert,
  ActivityIndicator
} from 'react-native';
import { useNest } from '../contexts/NestContext';
import { COLORS, SPACING } from '@constants/config';

interface CreateNestScreenProps {
  onSuccess?: (nestId: string) => void;
  onCancel?: () => void;
}

const CreateNestScreen: React.FC<CreateNestScreenProps> = ({
  onSuccess,
  onCancel
}) => {
  const { createNest, loading } = useNest();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedColor, setSelectedColor] = useState('#3498db');
  const [creating, setCreating] = useState(false);
  
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  // 色オプション
  const colorOptions = [
    { id: 'blue', value: '#3498db', label: 'ブルー' },
    { id: 'green', value: '#2ecc71', label: 'グリーン' },
    { id: 'red', value: '#e74c3c', label: 'レッド' },
    { id: 'orange', value: '#f39c12', label: 'オレンジ' },
    { id: 'purple', value: '#9b59b6', label: 'パープル' },
    { id: 'turquoise', value: '#1abc9c', label: 'ターコイズ' },
    { id: 'dark-blue', value: '#34495e', label: 'ダークブルー' }
  ];

  // NEST作成を実行
  const handleCreateNest = async () => {
    if (!name.trim()) {
      Alert.alert('エラー', 'NESTの名前を入力してください');
      return;
    }
    
    setCreating(true);
    
    try {
      const { error, nest } = await createNest({
        name: name.trim(),
        description: description.trim(),
        color: selectedColor
      });
      
      if (error) {
        Alert.alert('エラー', error.message || 'NESTの作成に失敗しました');
        return;
      }
      
      if (nest && onSuccess) {
        onSuccess(nest.id);
      }
    } finally {
      setCreating(false);
    }
  };

  // キーボードショートカットのサポート (デスクトップ)
  React.useEffect(() => {
    if (Platform.OS === 'web') {
      const handleKeyDown = (event: KeyboardEvent) => {
        // Escキーでキャンセル
        if (event.key === 'Escape' && onCancel) {
          event.preventDefault();
          onCancel();
        }
        
        // Ctrl+Enter または Cmd+Enter で作成
        if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
          event.preventDefault();
          handleCreateNest();
        }
      };
      
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [onCancel, handleCreateNest]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>読み込み中...</Text>
      </View>
    );
  }

  // メインのフォームコンテンツ
  const renderForm = () => (
    <View style={styles.formContainer}>
      <View style={styles.formGroup}>
        <Text style={styles.label}>NEST名 *</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="NESTの名前を入力"
          placeholderTextColor={COLORS.gray}
          maxLength={50}
          autoFocus={Platform.OS === 'web'}
          editable={!creating}
          accessibilityLabel="NEST名"
        />
        <Text style={styles.charCount}>{name.length}/50</Text>
      </View>
      
      <View style={styles.formGroup}>
        <Text style={styles.label}>説明</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="NESTの説明を入力（任意）"
          placeholderTextColor={COLORS.gray}
          multiline
          numberOfLines={4}
          maxLength={200}
          editable={!creating}
          accessibilityLabel="NEST説明"
        />
        <Text style={styles.charCount}>{description.length}/200</Text>
      </View>
      
      <View style={styles.formGroup}>
        <Text style={styles.label}>カラー</Text>
        <View style={styles.colorOptionsContainer}>
          {colorOptions.map(color => (
            <TouchableOpacity
              key={color.id}
              style={[
                styles.colorOption,
                { backgroundColor: color.value },
                selectedColor === color.value && styles.selectedColorOption
              ]}
              onPress={() => setSelectedColor(color.value)}
              disabled={creating}
              accessibilityLabel={`${color.label}カラーを選択`}
              accessibilityRole="radio"
              accessibilityState={{ checked: selectedColor === color.value }}
            />
          ))}
        </View>
      </View>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={onCancel}
          disabled={creating}
          accessibilityLabel="キャンセル"
        >
          <Text style={styles.cancelButtonText}>キャンセル</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.createButton, creating && styles.disabledButton]}
          onPress={handleCreateNest}
          disabled={creating || !name.trim()}
          accessibilityLabel="NESTを作成"
        >
          {creating ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <Text style={styles.createButtonText}>作成</Text>
          )}
        </TouchableOpacity>
      </View>
      
      {Platform.OS === 'web' && (
        <View style={styles.shortcutContainer}>
          <Text style={styles.shortcutText}>Esc: キャンセル</Text>
          <Text style={styles.shortcutText}>Ctrl+Enter: 作成</Text>
        </View>
      )}
    </View>
  );

  // モバイルレイアウト
  if (isMobile) {
    return (
      <View style={styles.mobileContainer}>
        <View style={styles.mobileHeader}>
          <TouchableOpacity
            style={styles.mobileBackButton}
            onPress={onCancel}
            accessibilityLabel="戻る"
          >
            <Text style={styles.mobileBackButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.mobileTitle}>新しいNESTを作成</Text>
          <View style={{ width: 40 }} />
        </View>
        
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.mobileContent}
        >
          <ScrollView contentContainerStyle={styles.mobileScrollContent}>
            {renderForm()}
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    );
  }

  // デスクトップレイアウト
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>新しいNESTを作成</Text>
        <Text style={styles.subtitle}>
          NESTは、2人のユーザーで構成されるプライベートな空間です。
          チャットやボードなどのコンテンツを共有できます。
        </Text>
        
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView>
            {renderForm()}
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // 共通スタイル
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: 16,
    color: COLORS.gray,
  },
  formContainer: {
    padding: SPACING.md,
  },
  formGroup: {
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: SPACING.xs,
    color: COLORS.text,
  },
  input: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: 8,
    padding: SPACING.md,
    fontSize: 16,
    color: COLORS.text,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: COLORS.gray,
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  colorOptionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: SPACING.xs,
  },
  colorOption: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  selectedColorOption: {
    borderWidth: 3,
    borderColor: COLORS.white,
    ...Platform.select({
      web: {
        boxShadow: '0 0 0 2px ' + COLORS.primary,
      },
      default: {
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 4,
        elevation: 4,
      }
    }),
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: SPACING.lg,
  },
  cancelButton: {
    backgroundColor: 'transparent',
    padding: SPACING.md,
    borderRadius: 8,
    marginRight: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.gray,
  },
  cancelButtonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '500',
  },
  createButton: {
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  createButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
  },
  shortcutContainer: {
    marginTop: SPACING.lg,
    padding: SPACING.sm,
    backgroundColor: COLORS.lightGray + '40', // 透明度40%
    borderRadius: 8,
  },
  shortcutText: {
    fontSize: 12,
    color: COLORS.gray,
    fontFamily: 'monospace',
    marginBottom: 2,
  },
  
  // デスクトップスタイル
  container: {
    flex: 1,
    padding: SPACING.lg,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: SPACING.lg,
    width: '100%',
    maxWidth: 500,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
      },
      default: {
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
      }
    }),
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: SPACING.sm,
    color: COLORS.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.gray,
    marginBottom: SPACING.lg,
    textAlign: 'center',
  },
  
  // モバイルスタイル
  mobileContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  mobileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  mobileBackButton: {
    padding: SPACING.sm,
  },
  mobileBackButtonText: {
    fontSize: 20,
    color: COLORS.primary,
  },
  mobileTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  mobileContent: {
    flex: 1,
  },
  mobileScrollContent: {
    flexGrow: 1,
    padding: SPACING.md,
  },
});

export default CreateNestScreen; 