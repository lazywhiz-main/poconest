import React, { useState } from 'react';
import { View, TextInput, StyleSheet, Platform } from 'react-native';
import CommonButton from './CommonButton';

interface ChatInputProps {
  onSend: (message: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({
  onSend,
  placeholder = 'メッセージを入力...',
  disabled = false,
}) => {
  const [message, setMessage] = useState('');

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSend(message.trim());
      setMessage('');
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        value={message}
        onChangeText={setMessage}
        placeholder={placeholder}
        placeholderTextColor="#6c7086"
        multiline
        maxLength={1000}
        editable={!disabled}
      />
      <View style={styles.buttonContainer}>
        <CommonButton
          variant="primary"
          onPress={handleSend}
          disabled={!message.trim() || disabled}
        >
          送信
        </CommonButton>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#1a1a2e',
    borderTopWidth: 1,
    borderTopColor: '#333366',
    gap: 12,
  },
  input: {
    flex: 1,
    backgroundColor: '#0f0f23',
    borderWidth: 1,
    borderColor: '#333366',
    borderRadius: 2,
    padding: 12,
    color: '#e2e8f0',
    fontSize: 13,
    minHeight: 40,
    maxHeight: 120,
    textAlignVertical: 'top',
    fontFamily: Platform.select({ ios: 'System', android: 'System', default: 'sans-serif' }),
  },
  buttonContainer: {
    alignSelf: 'flex-end',
  },
});

export default ChatInput; 