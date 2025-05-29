import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Keyboard, 
  Platform, 
  Animated,
  KeyboardEvent,
  Text
} from 'react-native';
import { COLORS, SPACING } from '@constants/config';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

const ChatInput: React.FC<ChatInputProps> = ({ 
  onSend, 
  disabled = false,
  placeholder = 'メッセージを入力...' 
}) => {
  const [message, setMessage] = useState('');
  const inputRef = useRef<TextInput>(null);
  const inputHeight = useRef(new Animated.Value(40)).current;
  const maxHeight = 120;
  
  // キーボードイベントリスナー
  useEffect(() => {
    const keyboardShowEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const keyboardHideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    
    // キーボード表示時のリスナー
    const keyboardShowListener = Keyboard.addListener(keyboardShowEvent, (event: KeyboardEvent) => {
      // 必要に応じて実装（例：自動スクロールなど）
    });
    
    // キーボード非表示時のリスナー
    const keyboardHideListener = Keyboard.addListener(keyboardHideEvent, () => {
      if (inputRef.current) {
        inputRef.current.blur();
      }
    });
    
    return () => {
      keyboardShowListener.remove();
      keyboardHideListener.remove();
    };
  }, []);
  
  // テキスト変更時の処理
  const handleChangeText = (text: string) => {
    setMessage(text);
    
    // テキストエリアの高さを自動調整
    if (text.length === 0) {
      // テキストが空の場合は初期高さに戻す
      Animated.timing(inputHeight, {
        toValue: 40,
        duration: 100,
        useNativeDriver: false
      }).start();
    }
  };
  
  // テキストエリアのコンテンツサイズ変更イベント
  const handleContentSizeChange = (event: { nativeEvent: { contentSize: { width: number; height: number } } }) => {
    const { height } = event.nativeEvent.contentSize;
    const newHeight = Math.min(Math.max(40, height), maxHeight);
    
    Animated.timing(inputHeight, {
      toValue: newHeight,
      duration: 100,
      useNativeDriver: false
    }).start();
  };
  
  // メッセージ送信処理
  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSend(message.trim());
      setMessage('');
      
      // 送信後に入力欄をリセット
      Animated.timing(inputHeight, {
        toValue: 40,
        duration: 100,
        useNativeDriver: false
      }).start();
    }
  };
  
  // キーボードサブミット時の処理（Enterキー）
  const handleSubmitEditing = () => {
    if (Platform.OS === 'web') {
      return; // Webではエンターキーの処理は別途行う
    }
    
    handleSend();
  };

  // Webプラットフォームでのキーイベント処理
  const handleKeyPress = (e: any) => {
    if (Platform.OS === 'web') {
      // ShiftキーとEnterキーを同時に押した場合は改行を許可
      if (e.nativeEvent.key === 'Enter' && !e.nativeEvent.shiftKey) {
        e.preventDefault(); // デフォルトの改行を防止
        handleSend();
      }
    }
  };
  
  return (
    <View style={styles.container}>
      <Animated.View style={[styles.inputContainer, { height: inputHeight }]}>
        <TextInput
          ref={inputRef}
          style={[styles.input, { height: Platform.OS === 'web' ? '100%' : 'auto' }]}
          value={message}
          onChangeText={handleChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.lightText}
          multiline
          editable={!disabled}
          returnKeyType="send"
          blurOnSubmit={false}
          onSubmitEditing={handleSubmitEditing}
          onContentSizeChange={handleContentSizeChange}
          onKeyPress={handleKeyPress}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            { opacity: message.trim() && !disabled ? 1 : 0.5 },
          ]}
          onPress={handleSend}
          disabled={!message.trim() || disabled}
          accessibilityLabel="送信"
        >
          <Text style={styles.sendButtonText}>送信</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignSelf: 'stretch',
    padding: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
    backgroundColor: COLORS.white,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    width: '100%',
    alignSelf: 'stretch',
  },
  input: {
    flex: 1,
    width: '100%',
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingRight: 44, // 送信ボタン分のスペース
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    ...Platform.select({
      web: {
        outlineStyle: 'none' as any,
      },
    }),
  },
  sendButton: {
    width: 60,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      web: {
        cursor: 'pointer' as any,
      },
    }),
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ChatInput; 