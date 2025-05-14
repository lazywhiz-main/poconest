import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
  Image
} from 'react-native';
import { CreateNestData } from '../hooks/useCreateNest';
import { BRAND_COLORS } from '@constants/Colors';

// テーマカラーオプション
const colorOptions = [
  '#3498db', // ブルー
  '#2ecc71', // グリーン
  '#e74c3c', // レッド
  '#f39c12', // オレンジ
  '#9b59b6', // パープル
  '#1abc9c', // ティール
  '#34495e', // ダークブルー
  '#e67e22', // ダークオレンジ
];

interface NestBasicInfoProps {
  nestData: CreateNestData;
  onChange: (data: Partial<CreateNestData>) => void;
  onNext: () => void;
}

/**
 * NEST基本情報入力コンポーネント
 */
const NestBasicInfo: React.FC<NestBasicInfoProps> = ({
  nestData,
  onChange,
  onNext
}) => {
  const [localName, setLocalName] = useState(nestData.name || '');
  const [localDescription, setLocalDescription] = useState(nestData.description || '');
  const [selectedColor, setSelectedColor] = useState(nestData.color || colorOptions[0]);
  const [localError, setLocalError] = useState<string | null>(null);
  
  // 入力値をリモートと同期
  useEffect(() => {
    onChange({
      name: localName,
      description: localDescription,
      color: selectedColor
    });
  }, [localName, localDescription, selectedColor, onChange]);
  
  // 名前のバリデーション
  const validateName = () => {
    if (!localName.trim()) {
      setLocalError('NEST名を入力してください');
      return false;
    }
    
    if (localName.trim().length < 3) {
      setLocalError('NEST名は3文字以上で入力してください');
      return false;
    }
    
    setLocalError(null);
    return true;
  };
  
  // 次へボタン処理
  const handleNext = () => {
    if (validateName()) {
      onNext();
    }
  };
  
  // テーマカラー選択
  const handleColorSelect = (color: string) => {
    setSelectedColor(color);
  };
  
  // NESTカードプレビュー
  const renderNestPreview = () => {
    return (
      <View style={styles.previewSection}>
        <Text style={styles.previewTitle}>プレビュー</Text>
        <View 
          style={[
            styles.nestCard, 
            { 
              backgroundColor: selectedColor,
              shadowColor: selectedColor,
            }
          ]}
        >
          <Text style={styles.nestCardName} numberOfLines={1}>
            {localName || 'NEST名'}
          </Text>
          {localDescription ? (
            <Text style={styles.nestCardDescription} numberOfLines={2}>
              {localDescription}
            </Text>
          ) : (
            <Text style={[styles.nestCardDescription, styles.placeholderText]}>
              説明文（オプション）
            </Text>
          )}
          <View style={styles.nestCardFooter}>
            <Text style={styles.memberCount}>メンバー: 1</Text>
            <Text style={styles.createdDate}>
              作成: {new Date().toLocaleDateString()}
            </Text>
          </View>
        </View>
      </View>
    );
  };
  
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      <Text style={styles.title}>NESTの基本情報</Text>
      <Text style={styles.description}>
        NESTとはポコの巣のワークスペースのことです。
        プロジェクト、チーム、個人用など、用途に合わせたNESTを作成できます。
      </Text>
      
      {localError && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{localError}</Text>
        </View>
      )}
      
      <View style={styles.formSection}>
        <Text style={styles.label}>NEST名 <Text style={styles.required}>*</Text></Text>
        <TextInput
          style={styles.input}
          placeholder="例: プロジェクトA、マーケティングチーム等"
          value={localName}
          onChangeText={setLocalName}
          maxLength={50}
          autoFocus={Platform.OS === 'web'}
          accessibilityLabel="NEST名を入力"
          onSubmitEditing={handleNext}
        />
        <Text style={styles.helperText}>
          3～50文字で入力してください。あとから変更できます。
        </Text>
        
        <Text style={styles.label}>説明 (オプション)</Text>
        <TextInput
          style={[styles.input, styles.multilineInput]}
          placeholder="このNESTの目的や用途について説明してください"
          value={localDescription}
          onChangeText={setLocalDescription}
          multiline
          numberOfLines={Platform.OS === 'web' ? 4 : 3}
          maxLength={200}
          accessibilityLabel="NEST説明を入力"
        />
        <Text style={styles.helperText}>
          最大200文字まで入力できます。
        </Text>
        
        <Text style={styles.label}>テーマカラー</Text>
        <View style={styles.colorOptions}>
          {colorOptions.map((color) => (
            <TouchableOpacity
              key={color}
              style={[
                styles.colorOption,
                { backgroundColor: color },
                selectedColor === color && styles.selectedColorOption,
              ]}
              onPress={() => handleColorSelect(color)}
              accessibilityLabel={`テーマカラー: ${color}`}
              accessibilityState={{ selected: selectedColor === color }}
            />
          ))}
        </View>
        <Text style={styles.helperText}>
          NESTのアイコンやカードの色として使われます。
        </Text>
      </View>
      
      {/* プレビュー */}
      {renderNestPreview()}
      
      {/* デスクトップのみ表示するボタン（モバイルは下部ナビゲーション） */}
      {Platform.OS === 'web' && (
        <View style={styles.webButtonContainer}>
          <TouchableOpacity 
            style={styles.nextButton}
            onPress={handleNext}
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
  errorContainer: {
    backgroundColor: '#FFE5E5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: BRAND_COLORS.error,
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
  required: {
    color: BRAND_COLORS.error,
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: BRAND_COLORS.text.primary,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: BRAND_COLORS.background.medium,
  },
  multilineInput: {
    height: Platform.OS === 'web' ? 100 : 80,
    textAlignVertical: 'top',
  },
  helperText: {
    fontSize: 12,
    color: BRAND_COLORS.text.tertiary,
    marginBottom: 16,
  },
  colorOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 2,
  },
  selectedColorOption: {
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  previewSection: {
    marginBottom: 24,
    alignItems: 'center',
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: BRAND_COLORS.text.primary,
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  nestCard: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 12,
    padding: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  nestCardName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  nestCardDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 16,
    lineHeight: 20,
  },
  placeholderText: {
    opacity: 0.7,
    fontStyle: 'italic',
  },
  nestCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  memberCount: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  createdDate: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  webButtonContainer: {
    marginTop: 16,
    marginBottom: 40,
    alignItems: 'center',
  },
  nextButton: {
    backgroundColor: BRAND_COLORS.primary,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 200,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default NestBasicInfo; 