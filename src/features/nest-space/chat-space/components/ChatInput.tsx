import React from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, Text } from 'react-native';
import { MessageInputState } from '../types/chat.types';

export interface ChatInputProps {
  inputState: MessageInputState;
  onSend: () => void;
  onInputChange: (content: string) => void;
  onAttachmentSelect: () => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  inputState,
  onSend,
  onInputChange,
  onAttachmentSelect
}) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.attachmentButton}
        onPress={onAttachmentSelect}
      >
        <Text style={styles.attachmentButtonText}>+</Text>
      </TouchableOpacity>
      <TextInput
        style={styles.input}
        value={inputState.content}
        onChangeText={onInputChange}
        placeholder="メッセージを入力..."
        multiline
      />
      <TouchableOpacity
        style={[
          styles.sendButton,
          !inputState.content.trim() && styles.sendButtonDisabled
        ]}
        onPress={onSend}
        disabled={!inputState.content.trim()}
      >
        <Text style={styles.sendButtonText}>送信</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  attachmentButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  attachmentButtonText: {
    fontSize: 24,
    color: '#666',
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
  },
  sendButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#007AFF',
    borderRadius: 20,
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
}); 