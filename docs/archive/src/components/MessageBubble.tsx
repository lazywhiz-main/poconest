import React, { useState, useRef, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity,
  Animated,
  PanResponder,
  Alert,
  ToastAndroid,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BrandColors } from '../constants/Colors';
import { ChatMessage } from '../types/chat';
import { useBoard } from '../contexts/BoardContext';
import { BoardColumnType } from '../types/board';
import LottieView from 'lottie-react-native';
import SaveOptionsModal from './SaveOptionsModal';

interface MessageBubbleProps {
  message: ChatMessage;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUserMessage = !message.sender.isBot;
  const { addCard } = useBoard();
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveAnimation, setSaveAnimation] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSwipeHint, setShowSwipeHint] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const saveIconAnim = useRef(new Animated.Value(0)).current;
  const swipeHintOpacity = useRef(new Animated.Value(0)).current;
  const lottieRef = useRef<LottieView>(null);

  // 簡易トースト通知（クロスプラットフォーム対応）
  const showToast = (message: string) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      Alert.alert('', message, [{ text: 'OK' }], { cancelable: true });
    }
  };

  // アニメーションをリセット
  const resetAnimations = useCallback(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 40,
      friction: 7
    }).start();
  }, [slideAnim]);

  // スワイプ操作関連の変数
  const swipeThreshold = -25;
  const holdTimer = useRef<NodeJS.Timeout | null>(null);
  const lastMoveTime = useRef<number>(0);
  const lastMovePosition = useRef<number>(0);

  // 保存アイコンのアニメーション
  const showSaveIcon = useCallback(() => {
    saveIconAnim.setValue(0);
    Animated.sequence([
      Animated.timing(saveIconAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true
      }),
      Animated.delay(500),
      Animated.timing(saveIconAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true
      })
    ]).start(resetAnimations);
  }, [saveIconAnim, resetAnimations]);

  // スワイプヒントの表示
  const showHint = () => {
    setShowSwipeHint(true);
    Animated.timing(swipeHintOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true
    }).start();
    
    setTimeout(() => {
      Animated.timing(swipeHintOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true
      }).start(() => {
        setShowSwipeHint(false);
      });
    }, 1500);
  };

  // スワイプジェスチャーの設定
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !isSaving,
      
      onMoveShouldSetPanResponder: (_, gestureState) => {
        const shouldRespond = !isSaving && Math.abs(gestureState.dx) > 5;
        return shouldRespond;
      },
      
      onPanResponderGrant: () => {
        if (holdTimer.current) {
          clearTimeout(holdTimer.current);
          holdTimer.current = null;
        }
      },
      
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx < 0) {
          const newValue = Math.max(gestureState.dx, -80);
          slideAnim.setValue(newValue);
          
          lastMoveTime.current = Date.now();
          lastMovePosition.current = newValue;
          
          if (newValue < -10 && !showSwipeHint && !isSaving) {
            showHint();
          }
          
          if (newValue <= swipeThreshold && !isSaving) {
            if (holdTimer.current) {
              clearTimeout(holdTimer.current);
            }
            
            holdTimer.current = setTimeout(() => {
              const timeSinceLastMove = Date.now() - lastMoveTime.current;
              if (timeSinceLastMove > 200 && !isSaving) {
                Animated.timing(slideAnim, {
                  toValue: -80,
                  duration: 100,
                  useNativeDriver: true
                }).start(() => {
                  setShowSaveModal(true);
                  showSaveIcon();
                });
                
                holdTimer.current = null;
              }
            }, 150);
          }
        }
      },
      
      onPanResponderRelease: (_, gestureState) => {
        if (holdTimer.current) {
          clearTimeout(holdTimer.current);
          holdTimer.current = null;
        }
        
        if (gestureState.dx < swipeThreshold && !isSaving) {
          Animated.timing(slideAnim, {
            toValue: -80,
            duration: 100,
            useNativeDriver: true
          }).start(() => {
            setShowSaveModal(true);
            showSaveIcon();
          });
        } else {
          resetAnimations();
        }
      },
      
      onPanResponderTerminate: () => {
        if (holdTimer.current) {
          clearTimeout(holdTimer.current);
          holdTimer.current = null;
        }
        resetAnimations();
      }
    })
  ).current;

  // メッセージを保存する処理
  const saveMessage = async (mode: "quick" | "insight") => {
    if (isSaving) return;
    
    try {
      setIsSaving(true);
      
      Animated.timing(slideAnim, {
        toValue: -80,
        duration: 100,
        useNativeDriver: true
      }).start();
      
      setSaveAnimation(true);
      
      const messageTitle = message.content.length > 50 
        ? `${message.content.substring(0, 47)}...`
        : message.content;
      
      const messageTags = isUserMessage 
        ? ["自分のメッセージ", "チャットから保存"] 
        : ["ポコの返答", "チャットから保存"];
      
      const newCard = {
        title: messageTitle,
        content: message.content,
        column: mode === "quick" ? BoardColumnType.INBOX : BoardColumnType.INSIGHTS,
        userId: message.sender.id,
        tags: messageTags,
        sourceType: "chat" as const,
        sourceId: message.chatId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      await addCard(newCard);
      
      showToast(mode === "quick" ? "Inboxに保存しました" : "洞察として保存しました");
      
      // 保存アニメーションの再生
      if (lottieRef.current) {
        lottieRef.current.play();
      }
      
    } catch (error) {
      console.error('Error saving message:', error);
      showToast('保存に失敗しました');
    } finally {
      setIsSaving(false);
      setSaveAnimation(false);
      resetAnimations();
    }
  };

  const handleLongPress = () => {
    setShowSaveModal(true);
  };

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.messageContainer,
          { transform: [{ translateX: slideAnim }] }
        ]}
        {...panResponder.panHandlers}
      >
        <View style={[
          styles.messageWrapper,
          isUserMessage ? styles.userMessageWrapper : styles.botMessageWrapper
        ]}>
          {/* 左側のタイムスタンプ（ユーザーメッセージの場合に表示） */}
          {isUserMessage && (
            <View style={styles.leftTimestampContainer}>
              <Text style={[styles.timestamp, styles.userTimestamp]}>
                {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          )}

          {/* メッセージバブル */}
          <View style={[
            styles.bubble,
            isUserMessage ? styles.userBubble : styles.botBubble
          ]}>
            <Text style={styles.messageText}>{message.content}</Text>
          </View>

          {/* 右側のタイムスタンプ（ボットメッセージの場合に表示） */}
          {!isUserMessage && (
            <View style={styles.rightTimestampContainer}>
              <Text style={[styles.timestamp, styles.botTimestamp]}>
                {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          )}
        </View>
      </Animated.View>

      {showSwipeHint && (
        <Animated.View
          style={[
            styles.swipeHint,
            { opacity: swipeHintOpacity }
          ]}
        >
          <Ionicons name="arrow-back" size={20} color={BrandColors.text.secondary} />
          <Text style={styles.swipeHintText}>スワイプして保存</Text>
        </Animated.View>
      )}

      {saveAnimation && (
        <View style={styles.saveAnimationContainer}>
          <LottieView
            ref={lottieRef}
            source={require('../assets/animations/save.json')}
            style={styles.saveAnimation}
            loop={false}
            onAnimationFinish={() => setSaveAnimation(false)}
          />
        </View>
      )}

      <SaveOptionsModal
        visible={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onSaveToInbox={() => saveMessage("quick")}
        onSaveAsInsight={() => saveMessage("insight")}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    position: 'relative'
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
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)'
  },
  userBubble: {
    backgroundColor: BrandColors.primary + '80',
  },
  botBubble: {
    backgroundColor: '#F5F5F5',
  },
  messageText: {
    fontSize: 16,
    color: BrandColors.text.primary,
    lineHeight: 22
  },
  swipeHint: {
    position: 'absolute',
    left: 20,
    top: '50%',
    transform: [{ translateY: -10 }],
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16
  },
  swipeHintText: {
    marginLeft: 4,
    color: BrandColors.text.secondary,
    fontSize: 12
  },
  saveAnimationContainer: {
    position: 'absolute',
    right: 20,
    top: '50%',
    transform: [{ translateY: -20 }]
  },
  saveAnimation: {
    width: 40,
    height: 40
  },
  timestamp: {
    fontSize: 10,
    color: BrandColors.text.secondary,
    marginBottom: 2,
  },
  userTimestamp: {
    textAlign: 'right',
  },
  botTimestamp: {
    textAlign: 'left',
  },
});

export default MessageBubble; 