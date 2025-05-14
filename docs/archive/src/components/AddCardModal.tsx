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
import { BoardColumnType } from '../types/board';

interface AddCardModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (title: string, content: string, tags: string[], column: BoardColumnType) => void;
  initialColumn?: BoardColumnType;
}

const AddCardModal: React.FC<AddCardModalProps> = ({
  visible,
  onClose,
  onSubmit,
  initialColumn = BoardColumnType.INBOX
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [column, setColumn] = useState<BoardColumnType>(initialColumn);

  const resetForm = () => {
    setTitle('');
    setContent('');
    setTagInput('');
    setTags([]);
    setColumn(initialColumn);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = () => {
    if (!title.trim()) {
      Alert.alert('エラー', 'タイトルを入力してください');
      return;
    }

    if (!content.trim()) {
      Alert.alert('エラー', '内容を入力してください');
      return;
    }

    onSubmit(title.trim(), content.trim(), tags, column);
    resetForm();
  };

  const handleAddTag = () => {
    if (!tagInput.trim()) return;
    if (!tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
    }
    setTagInput('');
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
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
              <Text style={styles.title}>新しいカード</Text>
              <TouchableOpacity onPress={handleClose}>
                <Ionicons name="close" size={24} color={BrandColors.text.secondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.content}>
              {/* タイトル入力 */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>タイトル</Text>
                <TextInput
                  style={styles.titleInput}
                  placeholder="カードのタイトルを入力..."
                  value={title}
                  onChangeText={setTitle}
                  placeholderTextColor={BrandColors.text.tertiary}
                />
              </View>

              {/* 内容 */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>内容</Text>
                <TextInput
                  style={styles.contentInput}
                  placeholder="カードの内容を入力..."
                  value={content}
                  onChangeText={setContent}
                  multiline
                  numberOfLines={4}
                  placeholderTextColor={BrandColors.text.tertiary}
                />
              </View>

              {/* タグ */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>タグ</Text>
                <View style={styles.tagInputContainer}>
                  <TextInput
                    style={styles.tagInput}
                    placeholder="タグを入力..."
                    value={tagInput}
                    onChangeText={setTagInput}
                    placeholderTextColor={BrandColors.text.tertiary}
                    onSubmitEditing={handleAddTag}
                  />
                  <TouchableOpacity 
                    style={styles.addTagButton}
                    onPress={handleAddTag}
                  >
                    <Ionicons name="add" size={18} color="#fff" />
                  </TouchableOpacity>
                </View>

                {tags.length > 0 && (
                  <View style={styles.tagsContainer}>
                    {tags.map((tag, index) => (
                      <View key={index} style={styles.tag}>
                        <Text style={styles.tagText}>{tag}</Text>
                        <TouchableOpacity
                          style={styles.removeTagButton}
                          onPress={() => handleRemoveTag(tag)}
                        >
                          <Ionicons name="close" size={14} color={BrandColors.secondary} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              {/* カラム選択 */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>カラム</Text>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  style={styles.columnSelector}
                >
                  {Object.values(BoardColumnType).map((columnType) => (
                    <TouchableOpacity
                      key={columnType}
                      style={[
                        styles.columnButton,
                        column === columnType && styles.selectedColumnButton
                      ]}
                      onPress={() => setColumn(columnType)}
                    >
                      <Text 
                        style={[
                          styles.columnButtonText,
                          column === columnType && styles.selectedColumnButtonText
                        ]}
                      >
                        {columnType === BoardColumnType.INBOX ? 'Inbox' : 
                          columnType === BoardColumnType.INSIGHTS ? 'Insights' :
                          columnType === BoardColumnType.THEMES ? 'Themes' : 'Zoom'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
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
                  (!title.trim() || !content.trim()) && styles.disabledButton
                ]}
                onPress={handleSubmit}
                disabled={!title.trim() || !content.trim()}
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
  titleInput: {
    backgroundColor: BrandColors.backgroundVariants.medium,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: BrandColors.text.primary,
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
  tagInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tagInput: {
    flex: 1,
    backgroundColor: BrandColors.backgroundVariants.medium,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: BrandColors.text.primary,
  },
  addTagButton: {
    backgroundColor: BrandColors.primary,
    borderRadius: 8,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  tag: {
    backgroundColor: `${BrandColors.secondary}15`,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tagText: {
    fontSize: 12,
    color: BrandColors.secondary,
    marginRight: 4,
  },
  removeTagButton: {
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  columnSelector: {
    flexDirection: 'row',
  },
  columnButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: `${BrandColors.text.tertiary}20`,
    marginRight: 8,
  },
  selectedColumnButton: {
    backgroundColor: BrandColors.primary,
  },
  columnButtonText: {
    fontSize: 14,
    color: BrandColors.text.secondary,
  },
  selectedColumnButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
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

export default AddCardModal; 