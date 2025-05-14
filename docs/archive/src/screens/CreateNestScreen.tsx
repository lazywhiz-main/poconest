import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useNest } from '../contexts/NestContext';
import { BrandColors } from '../constants/Colors';

type RootStackParamList = {
  TabsScreen: undefined;
  CreateNest: undefined;
  NestSettings: { nestId: string };
};

type CreateNestScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'CreateNest'>;
};

// カラーオプション
const colorOptions = [
  '#A5D6A7', // グリーン
  '#FFB74D', // オレンジ
  '#81D4FA', // ライトブルー
  '#E57373', // ライトレッド
  '#BA68C8', // パープル
  '#F8BBD0', // ピンク
];

const CreateNestScreen = ({ navigation }: CreateNestScreenProps) => {
  const { createNest, loading, error } = useNest();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedColor, setSelectedColor] = useState(colorOptions[0]);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleCreateNest = async () => {
    if (!name.trim()) {
      setLocalError('Nestの名前を入力してください');
      return;
    }

    try {
      setLocalError(null);
      const { error, nest } = await createNest({
        name: name.trim(),
        description: description.trim(),
        color: selectedColor,
      });

      if (error) {
        setLocalError(error.message);
        return;
      }

      if (nest) {
        Alert.alert(
          'Nestを作成しました',
          `「${nest.name}」が正常に作成されました。`,
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('TabsScreen'),
            },
          ]
        );
      }
    } catch (err: any) {
      setLocalError(err?.message || '予期せぬエラーが発生しました');
    }
  };

  const displayError = localError || error;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={BrandColors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>新しいNestを作成</Text>
        </View>

        {displayError && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={20} color={BrandColors.error} />
            <Text style={styles.errorText}>{displayError}</Text>
          </View>
        )}

        <View style={styles.form}>
          <Text style={styles.label}>Nest名</Text>
          <TextInput
            style={styles.input}
            placeholder="例: プロジェクトA"
            value={name}
            onChangeText={setName}
            maxLength={50}
            editable={!loading}
          />

          <Text style={styles.label}>説明 (オプション)</Text>
          <TextInput
            style={[styles.input, styles.multilineInput]}
            placeholder="このNestの目的や用途を入力してください"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            maxLength={200}
            editable={!loading}
          />

          <Text style={styles.label}>色を選択</Text>
          <View style={styles.colorOptions}>
            {colorOptions.map((color) => (
              <TouchableOpacity
                key={color}
                style={[
                  styles.colorOption,
                  { backgroundColor: color },
                  selectedColor === color && styles.selectedColorOption,
                ]}
                onPress={() => setSelectedColor(color)}
              />
            ))}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.createButton, loading && styles.buttonDisabled]}
          onPress={handleCreateNest}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.createButtonText}>作成</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BrandColors.background,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  backButton: {
    padding: 8,
    marginRight: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: BrandColors.text.primary,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFE5E5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: BrandColors.error,
    marginLeft: 8,
    flex: 1,
  },
  form: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: BrandColors.text.primary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: BrandColors.text.primary,
    marginBottom: 16,
  },
  multilineInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  colorOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    marginBottom: 12,
  },
  selectedColorOption: {
    borderWidth: 3,
    borderColor: BrandColors.primary,
  },
  createButton: {
    backgroundColor: BrandColors.primary,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 'auto',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default CreateNestScreen; 