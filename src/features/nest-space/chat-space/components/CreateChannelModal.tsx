import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useChat } from '@contexts/ChatContext';
import { useNestSpace } from '@contexts/NestSpaceContext';
import { SpaceType } from '../../types/nestSpace.types';

interface CreateChannelModalProps {
  visible: boolean;
  onClose: () => void;
}

const CreateChannelModal: React.FC<CreateChannelModalProps> = ({
  visible,
  onClose,
}) => {
  const { createChatRoom } = useChat();
  const { spaceState } = useNestSpace();
  const [channelName, setChannelName] = useState('');
  const [description, setDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!channelName.trim()) {
      setError('チャネル名を入力してください');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const spaceId = spaceState.activeSpaceType;
      await createChatRoom(spaceId, channelName.trim(), description.trim());
      setChannelName('');
      setDescription('');
      onClose();
    } catch (err) {
      setError('チャネルの作成に失敗しました');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>新しいチャネルを作成</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalClose} accessibilityLabel="閉じる">
              <Text style={styles.modalCloseText}>×</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.modalBody}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>チャネル名</Text>
              <TextInput
                style={[styles.formInput, error ? styles.formInputError : null]}
                value={channelName}
                onChangeText={setChannelName}
                placeholder="例: プロジェクト計画"
                placeholderTextColor="#6c7086"
                autoFocus
              />
              {error && <Text style={styles.formError}>{error}</Text>}
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>説明（任意）</Text>
              <TextInput
                style={[styles.formInput, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="このチャネルの目的や用途を説明してください"
                placeholderTextColor="#6c7086"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </View>
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.btn, styles.btnDefault]}
              onPress={onClose}
              disabled={isCreating}
            >
              <Text style={styles.btnText}>キャンセル</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.btnPrimary, (!channelName.trim() || isCreating) && styles.btnDisabled]}
              onPress={handleCreate}
              disabled={!channelName.trim() || isCreating}
            >
              <Text style={[styles.btnText, styles.btnPrimaryText]}>{isCreating ? '作成中...' : '作成'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 15, 35, 0.8)',
  },
  modal: {
    backgroundColor: '#1a1a2e',
    borderColor: '#333366',
    borderWidth: 1,
    borderRadius: 4,
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  modalHeader: {
    backgroundColor: '#333366',
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#45475a',
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e2e8f0',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  modalClose: {
    padding: 4,
    borderRadius: 2,
  },
  modalCloseText: {
    color: '#a6adc8',
    fontSize: 18,
  },
  modalBody: {
    padding: 20,
    backgroundColor: '#1a1a2e',
  },
  modalFooter: {
    backgroundColor: '#333366',
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#45475a',
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#a6adc8',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  formInput: {
    width: '100%',
    backgroundColor: '#0f0f23',
    borderColor: '#333366',
    borderWidth: 1,
    borderRadius: 2,
    paddingVertical: 8,
    paddingHorizontal: 12,
    color: '#e2e8f0',
    fontSize: 13,
    fontFamily: Platform.select({ ios: 'System', android: 'System', default: 'sans-serif' }),
    marginBottom: 2,
  },
  formInputError: {
    borderColor: '#ff6b6b',
  },
  formError: {
    color: '#ff6b6b',
    fontSize: 10,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textArea: {
    minHeight: 60,
    maxHeight: 120,
  },
  btn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: '#333366',
    backgroundColor: '#1a1a2e',
    marginLeft: 8,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  btnDefault: {
    backgroundColor: '#1a1a2e',
  },
  btnPrimary: {
    backgroundColor: '#00ff88',
    borderColor: '#00ff88',
  },
  btnPrimaryText: {
    color: '#0f0f23',
    fontWeight: 'bold',
  },
  btnText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#e2e8f0',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  btnDisabled: {
    backgroundColor: '#333366',
    borderColor: '#333366',
    opacity: 0.6,
  },
});

export default CreateChannelModal; 