import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Text,
  SafeAreaView,
  useWindowDimensions,
  ActivityIndicator,
  Animated,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { BrandColors } from '../constants/Colors';
import MessageBubble from '../components/MessageBubble';
import TypingIndicator from '../components/TypingIndicator';
import { useMockChat } from '../contexts/MockChatContext';
import { UIMessage } from '../types/chat';
import PocoLogo from '../components/PocoLogo';
import ChatRelatedCardsView from '../components/ChatRelatedCardsView';
import { Card } from '../types/board';
import ChatSettingsModal from '../components/ChatSettingsModal';
import DateDivider from '../components/DateDivider';
import { AppHeader } from '../components/AppHeader';

const ChatScreen = () => {
  const {
    chatRooms,
    messages,
    activeChatRoomId,
    setActiveChatRoom,
    sendMessage,
    isPocoTyping,
    generateSummary,
    showSummary,
    conversationSummary,
    extractAndSaveInsights,
    isExtractingInsights,
    loadingMessages
  } = useMockChat();
  
  const [messageText, setMessageText] = useState('');
  const [showChatList, setShowChatList] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const inputHeight = useRef(new Animated.Value(40)).current;
  const dimensions = useWindowDimensions();
  const isMobileLandscape = dimensions.width > dimensions.height && Platform.OS !== 'web';
  
  const navigation = useNavigation();

  const currentMessages = activeChatRoomId ? [...(messages[activeChatRoomId] || [])] : [];

  const scrollToBottom = () => {
    if (flatListRef.current && currentMessages.length > 0) {
      flatListRef.current.scrollToEnd({ animated: false });
    }
  };

  const handleSendMessage = () => {
    if (messageText.trim() && activeChatRoomId) {
      sendMessage(messageText);
      setMessageText('');
      setTimeout(scrollToBottom, 100);
    }
  };

  useEffect(() => {
    const keyboardWillShow = Platform.OS === 'ios' 
      ? 'keyboardWillShow' 
      : 'keyboardDidShow';
    
    const showSubscription = Keyboard.addListener(keyboardWillShow, () => {
      setTimeout(scrollToBottom, 100);
    });

    return () => {
      showSubscription.remove();
    };
  }, []);

  const renderItem = ({ item, index }: { item: UIMessage; index: number }) => {
    // 日付が変わったかどうかをチェック
    const showDateDivider = () => {
      if (index === 0) return true;
      
      const currentDate = new Date(item.created_at).toDateString();
      const prevDate = new Date(currentMessages[index - 1].created_at).toDateString();
      
      return currentDate !== prevDate;
    };

    return (
      <>
        {showDateDivider() && (
          <DateDivider date={item.created_at} />
        )}
        <MessageBubble message={item} />
      </>
    );
  };

  const toggleChatList = () => {
    setShowChatList(!showChatList);
  };

  const activeChatObject = chatRooms.find(c => c.id === activeChatRoomId);

  const handleRelatedCardSelect = (card: Card) => {
    // カード内容をメッセージとして引用
    const cardReference = `
カード「${card.title}」の内容:

${card.description.substring(0, 150)}${card.description.length > 150 ? '...' : ''}

このカードについて詳しく教えてください。
    `.trim();
    
    setMessageText(cardReference);
  };

  // ヘッダーの右側コンポーネント
  const chatHeaderRightComponent = activeChatRoomId ? (
    <View style={styles.headerRight}>
      <TouchableOpacity
        style={styles.headerButton}
        onPress={() => extractAndSaveInsights(activeChatRoomId)}
        disabled={isExtractingInsights}
      >
        <Ionicons name="bulb-outline" size={20} color={BrandColors.text.primary} />
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.headerButton}
        onPress={() => generateSummary()}
      >
        <Ionicons name="document-text-outline" size={20} color={BrandColors.text.primary} />
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.headerButton}
        onPress={() => setShowSettings(true)}
      >
        <Ionicons name="ellipsis-horizontal" size={20} color={BrandColors.text.primary} />
      </TouchableOpacity>
    </View>
  ) : undefined;

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <AppHeader
          title={activeChatObject?.name || 'チャット'}
          subtitle={activeChatObject?.description || 'ポコと会話'}
          showBackButton={!isMobileLandscape}
          showEmoji={true}
          emoji="💬"
          onBackPress={toggleChatList}
          rightComponent={chatHeaderRightComponent}
        />

        <KeyboardAvoidingView 
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          <View style={styles.content}>
            {/* Chat List */}
            {(isMobileLandscape || showChatList) && (
              <View style={[
                styles.chatList,
                !isMobileLandscape && styles.mobileChatList
              ]}>
                <Text style={styles.sectionTitle}>チャットルーム</Text>
                <FlatList
                  data={chatRooms}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <TouchableOpacity 
                      style={[
                        styles.chatItem, 
                        activeChatRoomId === item.id && styles.selectedChat
                      ]}
                      onPress={() => {
                        setActiveChatRoom(item.id);
                        if (!isMobileLandscape) {
                          setShowChatList(false);
                        }
                      }}
                    >
                      <View style={styles.chatItemContent}>
                        <View style={styles.avatarContainer}>
                          <View style={styles.defaultAvatar}>
                            <Text style={styles.avatarText}>{item.name[0]}</Text>
                          </View>
                        </View>
                        <View style={styles.chatItemInfo}>
                          <Text style={styles.chatName}>{item.name}</Text>
                          {item.lastMessage && (
                            <Text style={styles.lastMessage} numberOfLines={1}>
                              {item.lastMessage.content}
                            </Text>
                          )}
                          {item.unreadCount > 0 && (
                            <View style={styles.unreadBadge}>
                              <Text style={styles.unreadText}>{item.unreadCount}</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>
                  )}
                />
              </View>
            )}

            {/* Main Chat Area */}
            {(!showChatList || isMobileLandscape) && (
              <View style={styles.chatArea}>
                {activeChatRoomId ? (
                  <>
                    {/* Related Cards Section */}
                    {currentMessages.length > 2 && (
                      <ChatRelatedCardsView 
                        chatId={activeChatRoomId}
                        recentMessages={currentMessages.slice(-5)}
                        onCardSelect={handleRelatedCardSelect}
                      />
                    )}

                    {/* Messages Container */}
                    <View style={styles.messageContainer}>
                      {loadingMessages ? (
                        <View style={styles.loadingContainer}>
                          <ActivityIndicator size="large" color={BrandColors.primary} />
                          <Text style={styles.loadingText}>メッセージを読み込み中...</Text>
                        </View>
                      ) : (
                        <FlatList
                          ref={flatListRef}
                          data={currentMessages}
                          keyExtractor={(item) => item.id}
                          renderItem={renderItem}
                          style={styles.flatList}
                          contentContainerStyle={styles.messageList}
                          onContentSizeChange={scrollToBottom}
                          onLayout={scrollToBottom}
                        />
                      )}
                      
                      {isPocoTyping && <TypingIndicator />}
                    </View>

                    {/* Input Container */}
                    <View style={styles.inputContainer}>
                      <TextInput
                        ref={inputRef}
                        style={styles.input}
                        value={messageText}
                        onChangeText={setMessageText}
                        placeholder="メッセージを入力..."
                        returnKeyType="send"
                        onSubmitEditing={handleSendMessage}
                        onFocus={() => setTimeout(scrollToBottom, 100)}
                        multiline={true}
                      />
                      <TouchableOpacity 
                        style={styles.sendButton}
                        onPress={handleSendMessage}
                      >
                        <Ionicons name="send" size={24} color="white" />
                      </TouchableOpacity>
                    </View>
                  </>
                ) : (
                  <View style={styles.emptyChatMessage}>
                    <Text>チャットルームを選択してください</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Settings Modal */}
      <ChatSettingsModal
        visible={showSettings}
        onClose={() => setShowSettings(false)}
        chatId={activeChatRoomId || ''}
        messages={activeChatRoomId ? messages[activeChatRoomId] || [] : []}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  safeArea: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    padding: 8,
    marginLeft: 8,
    borderRadius: 8,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
  },
  chatList: {
    width: 250,
    borderRightWidth: 1,
    borderRightColor: '#e1e1e1',
    paddingVertical: 10,
  },
  mobileChatList: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    zIndex: 10,
    backgroundColor: '#fff',
    width: '85%',
    borderRightWidth: 1,
    borderRightColor: '#e1e1e1',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 16,
    marginBottom: 8,
  },
  chatItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
  },
  chatItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 40,
    height: 40,
    marginRight: 12,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  defaultAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: BrandColors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: BrandColors.primary,
  },
  chatItemInfo: {
    flex: 1,
  },
  chatName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
    color: BrandColors.text.primary,
  },
  lastMessage: {
    fontSize: 12,
    color: BrandColors.text.secondary,
  },
  selectedChat: {
    backgroundColor: BrandColors.primary + '10',
  },
  chatArea: {
    flex: 1,
    backgroundColor: 'white',
    display: 'flex',
    flexDirection: 'column',
  },
  messageContainer: {
    flex: 1,
    position: 'relative',
  },
  flatList: {
    flex: 1,
  },
  messageList: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#e1e1e1',
    backgroundColor: 'white',
    minHeight: 50,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginRight: 10,
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: BrandColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-end',
  },
  emptyChatMessage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: BrandColors.text.secondary,
  },
  unreadBadge: {
    position: 'absolute',
    right: 0,
    top: 10,
    backgroundColor: BrandColors.primary,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default ChatScreen; 