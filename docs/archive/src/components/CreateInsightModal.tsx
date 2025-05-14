import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Modal, 
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BrandColors } from '../constants/Colors';
import { InsightType, InsightPriority, InsightInput } from '../types/insight';

interface CreateInsightModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (insightInput: InsightInput) => void;
  chatId: string;
  messageIds?: string[];
}

const CreateInsightModal: React.FC<CreateInsightModalProps> = ({
  visible,
  onClose,
  onSubmit,
  chatId,
  messageIds = []
}) => {
  const [content, setContent] = useState('');
  const [type, setType] = useState<InsightType>(InsightType.KEYWORD);
  const [priority, setPriority] = useState<InsightPriority>(InsightPriority.MEDIUM);
  const [category, setCategory] = useState('');

  const handleSubmit = () => {
    if (!content.trim()) {
      Alert.alert('エラー', 'インサイト内容を入力してください');
      return;
    }

    const insightInput: InsightInput = {
      type,
      content: content.trim(),
      sourceChatId: chatId,
      sourceMessageIds: messageIds,
      priority,
      category: category.trim() || undefined
    };

    onSubmit(insightInput);
    resetForm();
  };

  const resetForm = () => {
    setContent('');
    setType(InsightType.KEYWORD);
    setPriority(InsightPriority.MEDIUM);
    setCategory('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <TouchableOpacity 
        style={styles.overlay} 
        activeOpacity={1}
        onPress={handleClose}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidingView}
        >
          <View 
            style={styles.container}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.header}>
              <Text style={styles.title}>新しいインサイト</Text>
              <TouchableOpacity onPress={handleClose}>
                <Ionicons name="close" size={24} color={BrandColors.text.secondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.content}>
              {/* インサイトタイプ選択 */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>タイプ</Text>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  style={styles.typeSelector}
                >
                  {Object.values(InsightType).map((insightType) => (
                    <TouchableOpacity
                      key={insightType}
                      style={[
                        styles.typeButton,
                        type === insightType && styles.selectedTypeButton
                      ]}
                      onPress={() => setType(insightType)}
                    >
                      <Text 
                        style={[
                          styles.typeButtonText,
                          type === insightType && styles.selectedTypeButtonText
                        ]}
                      >
                        {getTypeLabel(insightType)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* インサイト内容 */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>内容</Text>
                <TextInput
                  style={styles.contentInput}
                  placeholder="インサイトの内容を入力..."
                  value={content}
                  onChangeText={setContent}
                  multiline
                  numberOfLines={4}
                  placeholderTextColor={BrandColors.text.tertiary}
                />
              </View>

              {/* 優先度 */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>優先度</Text>
                <View style={styles.prioritySelector}>
                  {Object.values(InsightPriority).map((priorityValue) => (
                    <TouchableOpacity
                      key={priorityValue}
                      style={[
                        styles.priorityButton,
                        priority === priorityValue && styles.selectedPriorityButton,
                        getPriorityStyle(priorityValue)
                      ]}
                      onPress={() => setPriority(priorityValue)}
                    >
                      <Text 
                        style={[
                          styles.priorityButtonText,
                          priority === priorityValue && styles.selectedPriorityButtonText
                        ]}
                      >
                        {getPriorityLabel(priorityValue)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* カテゴリ（オプション） */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>カテゴリ（任意）</Text>
                <TextInput
                  style={styles.categoryInput}
                  placeholder="カテゴリを入力..."
                  value={category}
                  onChangeText={setCategory}
                  placeholderTextColor={BrandColors.text.tertiary}
                />
              </View>
            </ScrollView>

            <View style={styles.footer}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={handleClose}
              >
                <Text style={styles.cancelButtonText}>キャンセル</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  styles.submitButton,
                  !content.trim() && styles.disabledButton
                ]}
                onPress={handleSubmit}
                disabled={!content.trim()}
              >
                <Text style={styles.submitButtonText}>作成</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </TouchableOpacity>
    </Modal>
  );
};

// ヘルパー関数
const getTypeLabel = (type: InsightType): string => {
  switch (type) {
    case InsightType.SUMMARY:
      return '要約';
    case InsightType.KEYWORD:
      return 'キーワード';
    case InsightType.ACTION_ITEM:
      return 'タスク';
    case InsightType.QUESTION:
      return '質問';
    case InsightType.DECISION:
      return '決定事項';
    case InsightType.CUSTOM:
      return 'カスタム';
    default:
      return 'その他';
  }
};

const getPriorityLabel = (priority: InsightPriority): string => {
  switch (priority) {
    case InsightPriority.HIGH:
      return '高';
    case InsightPriority.MEDIUM:
      return '中';
    case InsightPriority.LOW:
      return '低';
    default:
      return '中';
  }
};

const getPriorityStyle = (priority: InsightPriority) => {
  switch (priority) {
    case InsightPriority.HIGH:
      return { borderColor: '#FF3B30' };
    case InsightPriority.MEDIUM:
      return { borderColor: '#FF9500' };
    case InsightPriority.LOW:
      return { borderColor: '#FFCC00' };
    default:
      return {};
  }
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  keyboardAvoidingView: {
    width: '100%',
  },
  container: {
    backgroundColor: BrandColors.backgroundVariants.light,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: `${BrandColors.text.tertiary}20`,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: BrandColors.text.primary,
  },
  content: {
    maxHeight: '100%',
  },
  formGroup: {
    marginTop: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: BrandColors.text.secondary,
    marginBottom: 8,
  },
  typeSelector: {
    flexDirection: 'row',
  },
  typeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: `${BrandColors.text.tertiary}20`,
    marginRight: 8,
  },
  selectedTypeButton: {
    backgroundColor: BrandColors.primary,
  },
  typeButtonText: {
    fontSize: 14,
    color: BrandColors.text.secondary,
  },
  selectedTypeButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  contentInput: {
    backgroundColor: BrandColors.backgroundVariants.medium,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: BrandColors.text.primary,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  prioritySelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  priorityButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    marginHorizontal: 4,
    borderWidth: 1,
    alignItems: 'center',
  },
  selectedPriorityButton: {
    backgroundColor: `${BrandColors.text.tertiary}20`,
  },
  priorityButtonText: {
    fontSize: 14,
    color: BrandColors.text.secondary,
  },
  selectedPriorityButtonText: {
    fontWeight: '600',
  },
  categoryInput: {
    backgroundColor: BrandColors.backgroundVariants.medium,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: BrandColors.text.primary,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: `${BrandColors.text.tertiary}20`,
    marginTop: 16,
  },
  cancelButton: {
    padding: 10,
    marginRight: 8,
  },
  cancelButtonText: {
    fontSize: 14,
    color: BrandColors.text.secondary,
  },
  submitButton: {
    backgroundColor: BrandColors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  disabledButton: {
    backgroundColor: `${BrandColors.text.tertiary}60`,
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default CreateInsightModal; 