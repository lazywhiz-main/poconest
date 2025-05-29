import React, { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  Animated,
  PanResponder,
  Alert,
  ToastAndroid,
  Platform,
  useWindowDimensions
} from 'react-native';
import { UIMessage } from '@contexts/ChatContext';
import { COLORS, SPACING } from '@constants/config';

interface MessageBubbleProps {
  message: UIMessage;
  onSave?: (message: UIMessage) => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, onSave }) => {
  const isUserMessage = !message.sender.isBot;
  
  // スワイプ操作関連の状態と参照
  const [showActions, setShowActions] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const { width: windowWidth } = useWindowDimensions();
  const isMobile = windowWidth < 768;

  // 簡易トースト通知（クロスプラットフォーム対応）
  const showToast = (message: string) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else if (Platform.OS === 'web') {
      alert(message);
    } else {
      Alert.alert('', message, [{ text: 'OK' }], { cancelable: true });
    }
  };

  // アニメーションをリセット
  const resetAnimations = () => {
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 40,
      friction: 7
    }).start();
  };

  // メッセージを保存する処理
  const handleSave = () => {
    if (onSave) {
      onSave(message);
      showToast('メッセージを保存しました');
    }
    resetAnimations();
    setShowActions(false);
  };

  // スワイプジェスチャーの設定（モバイルのみ）
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => isMobile,
      
      onMoveShouldSetPanResponder: (_, gestureState) => {
        const shouldRespond = isMobile && Math.abs(gestureState.dx) > 5;
        return shouldRespond;
      },
      
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx < 0 && isMobile) {
          // 左にスワイプする場合
          const newValue = Math.max(gestureState.dx, -80);
          slideAnim.setValue(newValue);
        } else if (gestureState.dx > 0 && isMobile) {
          // 右にスワイプする場合（ユーザーメッセージの場合）
          const newValue = Math.min(gestureState.dx, 80);
          if (isUserMessage) {
            slideAnim.setValue(newValue);
          }
        }
      },
      
      onPanResponderRelease: (_, gestureState) => {
        // スワイプが一定以上なら、アクションを表示
        if ((gestureState.dx < -30 || (isUserMessage && gestureState.dx > 30)) && isMobile) {
          Animated.timing(slideAnim, {
            toValue: isUserMessage ? 80 : -80,
            duration: 200,
            useNativeDriver: true
          }).start(() => {
            setShowActions(true);
          });
        } else {
          resetAnimations();
        }
      },
      
      onPanResponderTerminate: () => {
        resetAnimations();
      }
    })
  ).current;

  const handleLongPress = () => {
    // デスクトップでは長押しでアクションメニューを表示
    if (!isMobile) {
      setShowActions(!showActions);
    }
  };

  return (
    <View style={styles.container}>
      {/* ユーザー名とタイムスタンプをバブルの上に表示 */}
      <View style={styles.metaRow}>
        <Text style={styles.username}>{message.sender.name}</Text>
        <Text style={styles.timestamp}>
          {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
      <Animated.View
        style={[
          styles.messageContainer,
          { transform: [{ translateX: slideAnim }] }
        ]}
        {...(isMobile ? panResponder.panHandlers : {})}
      >
        <View style={[
          styles.messageWrapper,
          isUserMessage ? styles.userMessageWrapper : styles.botMessageWrapper
        ]}>
          {/* メッセージバブル本体のみ */}
          <TouchableOpacity 
            style={[
              styles.bubble,
              isUserMessage ? styles.userBubble : styles.botBubble
            ]}
            onLongPress={handleLongPress}
            delayLongPress={500}
          >
            <Text style={styles.messageText}>{message.content}</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
      {/* アクションボタン */}
      {showActions && (
        <TouchableOpacity 
          style={[
            styles.actionButton,
            isUserMessage ? styles.actionButtonRight : styles.actionButtonLeft
          ]} 
          onPress={handleSave}
        >
          <Text style={styles.actionButtonText}>保存</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    position: 'relative',
  },
  messageContainer: {
    width: '100%',
  },
  messageWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 4,
  },
  userMessageWrapper: {
    justifyContent: 'flex-end',
  },
  botMessageWrapper: {
    justifyContent: 'flex-start',
  },
  leftTimestampContainer: {
    paddingRight: 4,
  },
  rightTimestampContainer: {
    paddingLeft: 4,
  },
  bubble: {
    maxWidth: '70%',
    padding: SPACING.sm,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  userBubble: {
    backgroundColor: `${COLORS.primary}80`,
  },
  botBubble: {
    backgroundColor: '#F5F5F5',
  },
  messageText: {
    fontSize: 16,
    color: COLORS.text,
    lineHeight: 22,
  },
  timestamp: {
    fontSize: 10,
    color: COLORS.lightText,
    marginBottom: 2,
  },
  userTimestamp: {
    textAlign: 'right',
  },
  botTimestamp: {
    textAlign: 'left',
  },
  actionButton: {
    position: 'absolute',
    top: '50%',
    transform: [{ translateY: -15 }],
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 8,
  },
  actionButtonLeft: {
    left: 20,
  },
  actionButtonRight: {
    right: 20,
  },
  actionButtonText: {
    color: 'white',
    fontWeight: '500',
    fontSize: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
    paddingHorizontal: 8,
  },
  username: {
    fontSize: 12,
    color: COLORS.lightText,
    fontWeight: 'bold',
    marginRight: 8,
  },
});

export default MessageBubble; 