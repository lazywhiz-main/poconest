import React, { useRef, useEffect, useState, useCallback } from 'react';
import { 
  FlatList, 
  View, 
  StyleSheet, 
  NativeSyntheticEvent, 
  NativeScrollEvent,
  ActivityIndicator,
  Platform
} from 'react-native';
import { UIMessage } from 'src/types/nestSpace.types';
import MessageBubble from './MessageBubble';
import DateDivider from './DateDivider';
import TypingIndicator from './TypingIndicator';
import { COLORS, SPACING } from '@constants/config';

interface MessageListProps {
  messages: UIMessage[];
  isTyping?: boolean;
  loading?: boolean;
  onSaveMessage?: (message: UIMessage) => void;
}

const MessageList: React.FC<MessageListProps> = ({ 
  messages, 
  isTyping = false, 
  loading = false,
  onSaveMessage
}) => {
  const flatListRef = useRef<FlatList>(null);
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  
  // メッセージ件数が変わったときに自動スクロール
  useEffect(() => {
    if (messages.length > 0 && autoScrollEnabled) {
      scrollToBottom();
    } else if (messages.length > 0 && !autoScrollEnabled) {
      setHasNewMessage(true);
    }
  }, [messages.length, autoScrollEnabled]);
  
  // タイピング状態が変わったときにも自動スクロール
  useEffect(() => {
    if (isTyping && autoScrollEnabled) {
      scrollToBottom();
    }
  }, [isTyping, autoScrollEnabled]);
  
  // 画面下部までスクロールする
  const scrollToBottom = (animated = true) => {
    if (flatListRef.current && messages.length > 0) {
      if (Platform.OS === 'web') {
        // Webでは少し遅延を入れると確実にスクロールする
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated });
        }, 100);
      } else {
        flatListRef.current.scrollToEnd({ animated });
      }
      
      if (hasNewMessage) {
        setHasNewMessage(false);
      }
    }
  };
  
  // スクロールイベントハンドラ
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    // スクロール位置が最下部から離れているかチェック
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 20; // 下部からの余白
    
    const isCloseToBottom = 
      layoutMeasurement.height + contentOffset.y >= 
      contentSize.height - paddingToBottom;
    
    // スクロール位置に応じて自動スクロールの有効/無効を切り替え
    setAutoScrollEnabled(isCloseToBottom);
    
    // 最下部までスクロールしたら新規メッセージフラグをリセット
    if (isCloseToBottom && hasNewMessage) {
      setHasNewMessage(false);
    }
  };
  
  // 各メッセージのレンダリング
  const renderItem = useCallback(({ item, index }: { item: UIMessage; index: number }) => {
    // 日付が変わったかどうかをチェック
    const showDateDivider = () => {
      if (index === 0) return true;
      
      const currentDate = new Date(item.created_at).toDateString();
      const prevDate = new Date(messages[index - 1].created_at).toDateString();
      
      return currentDate !== prevDate;
    };

    return (
      <>
        {showDateDivider() && (
          <DateDivider date={item.created_at} />
        )}
        <MessageBubble 
          message={item} 
          onSave={onSaveMessage}
        />
      </>
    );
  }, [messages, onSaveMessage]);
  
  // 一意のキーを生成
  const keyExtractor = (item: UIMessage) => item.id;
  
  // パフォーマンス最適化のためのItemSeparatorComponent
  const ItemSeparator = () => <View style={styles.separator} />;
  
  // ロード中表示
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ItemSeparatorComponent={ItemSeparator}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={Platform.OS !== 'web'}
        initialNumToRender={15}
        maxToRenderPerBatch={10}
        windowSize={15}
        removeClippedSubviews={Platform.OS !== 'web'}
        maintainVisibleContentPosition={{
          minIndexForVisible: 0
        }}
      />
      
      {isTyping && (
        <View style={styles.typingContainer}>
          <TypingIndicator />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  contentContainer: {
    padding: SPACING.md,
    paddingBottom: SPACING.lg,
  },
  separator: {
    height: 2,
  },
  typingContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default MessageList; 