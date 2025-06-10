import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Modal, Platform } from 'react-native';
import { useAuth } from '../../../contexts/AuthContext';
import { useNest } from '../contexts/NestContext';
import CommonButton from '../../../components/CommonButton';

const TAG_SUGGESTIONS = [
  'knowledge', 'research', 'analysis', 'brainstorming', 'meeting', 'project'
];

const MAX_NAME = 50;
const MAX_DESC = 200;
const MAX_TAGS = 10;
const MAX_TAG_LENGTH = 20;

interface CreateTestNestScreenProps {
  onCreated?: (nestId: string) => void;
}

const CreateTestNestScreen: React.FC<CreateTestNestScreenProps> = ({ onCreated }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const tagInputRef = useRef<TextInput>(null);
  const { createNest, refreshData } = useNest();

  // タグ追加
  const handleTagInputKey = (e: any) => {
    if ((e.nativeEvent.key === 'Enter' || e.nativeEvent.key === ',') && tagInput.trim()) {
      e.preventDefault?.();
      addTag(tagInput.trim());
      setTagInput('');
    } else if (e.nativeEvent.key === 'Backspace' && tagInput === '' && tags.length > 0) {
      setTags(tags.slice(0, -1));
    }
  };
  const addTag = (tag: string) => {
    const t = tag.toLowerCase();
    if (t && !tags.includes(t) && tags.length < MAX_TAGS && t.length <= MAX_TAG_LENGTH) {
      setTags([...tags, t]);
    }
  };
  const removeTag = (tag: string) => setTags(tags.filter(t => t !== tag));
  const addSuggestedTag = (tag: string) => addTag(tag);

  // バリデーション
  const isNameValid = name.trim().length > 0 && name.length <= MAX_NAME;
  const isDescValid = description.length <= MAX_DESC;
  const canSubmit = isNameValid && isDescValid && !isLoading;

  // ドラフト保存
  const handleSaveDraft = () => {
    setDraftSaved(true);
    setTimeout(() => setDraftSaved(false), 1200);
  };

  // NEST作成
  const handleCreate = async () => {
    if (!isNameValid) return;
    setIsLoading(true);
    setError(null);
    setSuccess(false);
    const { error, nest } = await createNest({ name, description });
    setIsLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    if (nest) {
      setSuccess(true);
      setShowModal(true);
      await refreshData();
      if (onCreated) onCreated(nest.id);
    }
  };

  // 成功モーダル閉じる
  const closeModal = () => setShowModal(false);

  // UI
  return (
    <ScrollView contentContainerStyle={styles.outer} keyboardShouldPersistTaps="handled">
      <View style={styles.container}>
        {/* ヘッダー */}
        <View style={styles.header}>
          <Text style={styles.logo}><Text style={styles.poco}>poco</Text><Text style={styles.nest}>nest</Text></Text>
          <Text style={styles.pageTitle}>Create New NEST</Text>
          <Text style={styles.pageSubtitle}>AI-powered knowledge workspace</Text>
        </View>
        {/* メインフォーム */}
        {Platform.OS === 'web' ? (
          <div className="form-card-web">
            {/* NEST名 */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>NEST Name</Text>
              <TextInput
                style={styles.formInput}
                value={name}
                onChangeText={setName}
                placeholder="Enter nest name..."
                maxLength={MAX_NAME}
                autoFocus
              />
              <Text style={styles.formHint}>Choose a descriptive name for your knowledge workspace ({MAX_NAME - name.length} chars remaining)</Text>
            </View>
            {/* 説明 */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Description</Text>
              <TextInput
                style={[styles.formInput, styles.formTextarea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Describe the purpose and scope of this NEST..."
                maxLength={MAX_DESC}
                multiline
              />
              <Text style={styles.formHint}>Help AI understand the context and goals (optional) ({MAX_DESC - description.length} chars remaining)</Text>
            </View>
            {/* エラー表示 */}
            {error && <Text style={styles.error}>{error}</Text>}
          </div>
        ) : (
          <View style={styles.formCard}>
            {/* NEST名 */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>NEST Name</Text>
              <TextInput
                style={styles.formInput}
                value={name}
                onChangeText={setName}
                placeholder="Enter nest name..."
                maxLength={MAX_NAME}
                autoFocus
              />
              <Text style={styles.formHint}>Choose a descriptive name for your knowledge workspace ({MAX_NAME - name.length} chars remaining)</Text>
            </View>
            {/* 説明 */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Description</Text>
              <TextInput
                style={[styles.formInput, styles.formTextarea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Describe the purpose and scope of this NEST..."
                maxLength={MAX_DESC}
                multiline
              />
              <Text style={styles.formHint}>Help AI understand the context and goals (optional) ({MAX_DESC - description.length} chars remaining)</Text>
            </View>
            {/* エラー表示 */}
            {error && <Text style={styles.error}>{error}</Text>}
          </View>
        )}
        {/* アクションボタン */}
        <View style={styles.actionButtons}>
          <CommonButton
            variant="default"
            disabled={isLoading}
            onPress={handleSaveDraft}
            style={{ marginRight: 16, minWidth: 160 }}
          >
            <span role="img" aria-label="save">💾</span> SAVE DRAFT
          </CommonButton>
          <CommonButton
            variant="primary"
            disabled={!canSubmit}
            onPress={handleCreate}
            style={{ minWidth: 180 }}
          >
            <span role="img" aria-label="rocket">🚀</span> CREATE NEST
          </CommonButton>
        </View>
        {/* 成功モーダル */}
        <Modal visible={showModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalIcon}>🎉</Text>
              <Text style={styles.modalTitle}>NEST Created!</Text>
              <Text style={styles.modalDesc}>
                {`"${name}" が正常に作成されました。\nAIが自動的に知識の抽出と分析を開始します。`}
              </Text>
              <TouchableOpacity style={[styles.btn, styles.primaryBtn]} onPress={closeModal}>
                <Text>Open NEST</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
        {/* ドラフト保存アニメーション */}
        {draftSaved && <Text style={styles.draftSaved}>✅ Draft Saved!</Text>}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  outer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f0f23',
    minHeight: 600,
    padding: 20,
  },
  container: {
    maxWidth: 500,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    textAlign: 'center',
    marginBottom: 40,
    alignItems: 'center',
  },
  logo: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 20,
  },
  poco: { color: '#00ff88' },
  nest: { color: '#e2e8f0' },
  pageTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#e2e8f0',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 8,
  },
  pageSubtitle: {
    fontSize: 13,
    color: '#6c7086',
    fontFamily: 'JetBrains Mono',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  formCard: {
    backgroundColor: '#1a1a2e',
    borderColor: '#333366',
    borderWidth: 1,
    borderRadius: 8,
    padding: 40,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  formGroup: { marginBottom: 24 },
  formLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#a6adc8',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  formInput: {
    width: '100%',
    backgroundColor: '#0f0f23',
    borderColor: '#333366',
    borderWidth: 1,
    borderRadius: 4,
    paddingVertical: 12,
    paddingHorizontal: 16,
    color: '#e2e8f0',
    fontSize: 14,
    fontFamily: 'Space Grotesk',
    marginBottom: 0,
  },
  formTextarea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  formHint: {
    fontSize: 11,
    color: '#6c7086',
    marginTop: 6,
    fontFamily: 'JetBrains Mono',
  },
  tagInputContainer: { position: 'relative' },
  tagList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
    minHeight: 32,
    alignItems: 'center',
    backgroundColor: '#0f0f23',
    borderColor: '#333366',
    borderWidth: 1,
    borderRadius: 4,
    padding: 8,
  },
  tagListEmpty: {},
  tagItem: {
    backgroundColor: '#333366',
    color: '#e2e8f0',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 2,
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginRight: 4,
  },
  tagRemove: {
    marginLeft: 4,
    color: '#a6adc8',
    padding: 0,
  },
  tagInput: {
    borderWidth: 0,
    backgroundColor: 'transparent',
    color: '#e2e8f0',
    fontSize: 14,
    fontFamily: 'Space Grotesk',
    minWidth: 120,
    flex: 1,
    paddingVertical: 4,
    paddingHorizontal: 0,
  },
  tagSuggestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  tagSuggestion: {
    backgroundColor: '#1a1a2e',
    borderColor: '#333366',
    borderWidth: 1,
    color: '#a6adc8',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 2,
    fontSize: 10,
    marginRight: 4,
    marginBottom: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'center',
    marginBottom: 16,
  },
  btn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderRadius: 4,
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Space Grotesk',
    textTransform: 'uppercase',
    letterSpacing: 1,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  primaryBtn: {
    backgroundColor: '#00ff88',
    borderColor: '#00ff88',
    color: '#0f0f23',
  },
  secondaryBtn: {
    backgroundColor: 'transparent',
    borderColor: '#6c7086',
    color: '#a6adc8',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  error: {
    color: '#ff6b6b',
    marginTop: 8,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,15,35,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    backgroundColor: '#1a1a2e',
    borderColor: '#333366',
    borderWidth: 1,
    borderRadius: 8,
    padding: 40,
    alignItems: 'center',
    maxWidth: 400,
    width: '90%',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  modalIcon: {
    fontSize: 48,
    marginBottom: 20,
  },
  modalTitle: {
    color: '#00ff88',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontSize: 20,
    fontWeight: '700',
  },
  modalDesc: {
    color: '#a6adc8',
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 24,
    textAlign: 'center',
  },
  draftSaved: {
    color: '#00ff88',
    textAlign: 'center',
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
  },
});

export default CreateTestNestScreen; 