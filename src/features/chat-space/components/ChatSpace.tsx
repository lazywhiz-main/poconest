import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Image, FlatList } from 'react-native';
import theme from '../../../styles/theme';
import { useChatToBoard } from '../../../hooks/useChatToBoard';
import { useChat } from '../../../contexts/ChatContext';
import { Channel, Message } from '../../../types/chat';

interface ChatSpaceProps {
  // 必要に応じてpropsを追加
}

// SVGアイコンコンポーネント
interface IconProps {
  name: string;
  size?: number;
  color?: string;
  style?: any;
}

const Icon: React.FC<IconProps> = ({ name, size = 24, color = 'currentColor', style = {} }) => {
  return (
    <View style={style}>
      <svg 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke={color} 
        strokeWidth="2"
        strokeLinecap="round" 
        strokeLinejoin="round"
      >
        {getIconPath(name)}
      </svg>
    </View>
  );
};

// アイコンパス定義
const getIconPath = (name: string) => {
  switch (name) {
    case 'mail':
      return (
        <>
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
          <polyline points="22,6 12,13 2,6"></polyline>
        </>
      );
    case 'send':
      return (
        <>
          <line x1="22" y1="2" x2="11" y2="13"></line>
          <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
        </>
      );
    case 'hash':
      return (
        <>
          <line x1="4" y1="9" x2="20" y2="9"></line>
          <line x1="4" y1="15" x2="20" y2="15"></line>
          <line x1="10" y1="3" x2="8" y2="21"></line>
          <line x1="16" y1="3" x2="14" y2="21"></line>
        </>
      );
    case 'plus':
      return (
        <>
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </>
      );
    case 'lock':
      return (
        <>
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
        </>
      );
    case 'unlock':
      return (
        <>
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
          <path d="M7 11V7a5 5 0 0 1 9.9-1"></path>
        </>
      );
    case 'search':
      return (
        <>
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </>
      );
    case 'more-vertical':
      return (
        <>
          <circle cx="12" cy="12" r="1"></circle>
          <circle cx="12" cy="5" r="1"></circle>
          <circle cx="12" cy="19" r="1"></circle>
        </>
      );
    default:
      return <circle cx="12" cy="12" r="10"></circle>;
  }
};

/**
 * チャット空間コンポーネント
 * 
 * チャネルごとに直接メッセージのやり取りを行える
 */
const ChatSpace: React.FC<ChatSpaceProps> = () => {
  const [newMessage, setNewMessage] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);
  
  // ChatContextからチャット関連の状態と機能を取得
  const { 
    chatRooms, 
    messages, 
    activeChatRoomId, 
    setActiveChatRoom, 
    sendMessage: sendChatMessage,
    isPocoTyping,
    extractAndSaveInsights,
    isExtractingInsights
  } = useChat();
  
  // 現在選択されているチャネル情報
  const currentChannel = chatRooms.find(room => room.id === activeChatRoomId);
  
  // 現在のチャネルのメッセージ一覧
  const currentMessages = activeChatRoomId ? messages[activeChatRoomId] || [] : [];

  // メッセージ送信時に自動スクロール
  useEffect(() => {
    if (scrollViewRef.current && currentMessages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [currentMessages.length]);

  // チャット→ボード連携の設定
  const { status, startAnalysis } = useChatToBoard({
    channelId: activeChatRoomId || '',
    // 型変換が必要
    messages: currentMessages.map(msg => ({
      id: msg.id,
      text: msg.content,
      userId: msg.sender.id,
      userName: msg.sender.name,
      timestamp: msg.created_at,
      isSelf: msg.sender.id === 'human-user-id'
    })) as any,
    enabled: true
  });

  // メッセージ送信ハンドラー
  const handleSendMessage = async () => {
    if (newMessage.trim() === '' || !activeChatRoomId) return;
    
    await sendChatMessage(newMessage);
    setNewMessage('');
  };

  // インサイト抽出ハンドラー
  const handleExtractInsights = async () => {
    if (!activeChatRoomId) return;
    await extractAndSaveInsights(activeChatRoomId);
  };

  // チャネルアイテムをレンダリング
  const renderChannelItem = ({ item }: { item: typeof chatRooms[0] }) => {
    const isActive = activeChatRoomId === item.id;
    const isPublic = item.name !== 'プロジェクトアイデア'; // 仮の実装
    
    return (
      <TouchableOpacity
        style={[
          styles.channelItem,
          isActive && styles.activeChannelItem
        ]}
        onPress={() => setActiveChatRoom(item.id)}
      >
        <View style={styles.channelIconContainer}>
          <Icon 
            name={isPublic ? 'hash' : 'lock'} 
            size={16} 
            color={isActive ? theme.colors.primary : theme.colors.text.secondary} 
          />
        </View>
        
        <View style={styles.channelInfo}>
          <Text style={[
            styles.channelName,
            isActive && styles.activeChannelName
          ]}>
            {item.name}
          </Text>
          
          {item.unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{item.unreadCount}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // メッセージ表示コンポーネント
  const ChatMessageItem = ({ message }: { message: typeof currentMessages[0] }) => {
    const isSelf = message.sender.id === 'human-user-id';
    const timestamp = new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    return (
      <View style={[styles.messageRow, isSelf && styles.selfMessageRow]}>
        {!isSelf && (
          <View style={styles.messageAvatar}>
            <Image 
              source={{ uri: 'https://i.pravatar.cc/150?img=32' }} 
              style={styles.avatar} 
            />
          </View>
        )}
        
        <View 
          style={[
            styles.messageBubble,
            isSelf ? styles.selfBubble : styles.otherBubble
          ]}
        >
          {!isSelf && (
            <Text style={styles.messageAuthor}>{message.sender.name}</Text>
          )}
          <Text style={styles.messageText}>{message.content}</Text>
          <Text style={styles.timestamp}>{timestamp}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* チャット空間ヘッダー */}
      <View style={styles.spaceHeader}>
        <View style={styles.headerIcon}>
          <Text style={styles.headerIconText}>💬</Text>
        </View>
        <Text style={styles.headerTitle}>チャット空間</Text>
        
        {/* AIステータスインジケーター */}
        {(status.isAnalyzing || isExtractingInsights) && (
          <View style={styles.aiStatusContainer}>
            <Text style={styles.aiStatusText}>AI分析中...</Text>
          </View>
        )}
        
        {status.insightCount > 0 && (
          <TouchableOpacity 
            style={styles.insightIndicator}
            onPress={handleExtractInsights}
          >
            <Text style={styles.insightCount}>{status.insightCount}</Text>
            <Text style={styles.insightText}>件の洞察</Text>
          </TouchableOpacity>
        )}
      </View>
      
      <View style={styles.content}>
        {/* チャネルリスト */}
        <View style={styles.channelListContainer}>
          <View style={styles.channelListHeader}>
            <Text style={styles.listHeaderTitle}>チャネル</Text>
            <TouchableOpacity style={styles.newChannelButton}>
              <Icon name="plus" size={16} color="white" />
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={chatRooms}
            keyExtractor={item => item.id}
            renderItem={renderChannelItem}
            showsVerticalScrollIndicator={false}
          />
      </View>

      {/* メッセージ表示エリア */}
        <View style={styles.messagesContainer}>
          {/* チャネルヘッダー */}
          {currentChannel && (
            <View style={styles.channelHeader}>
              <View style={styles.channelTitleContainer}>
                <View style={styles.channelTitleRow}>
                  <Icon 
                    name={'hash'} 
                    size={18} 
                    color={theme.colors.text.primary} 
                    style={styles.channelHeaderIcon}
                  />
                  <Text style={styles.channelHeaderName}>{currentChannel.name}</Text>
                </View>
                <Text style={styles.channelDescription}>
                  {currentChannel.description}
                </Text>
              </View>
              <View style={styles.channelActions}>
                <TouchableOpacity style={styles.channelAction}>
                  <Icon name="search" size={18} color={theme.colors.text.secondary} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.channelAction}>
                  <Icon name="more-vertical" size={18} color={theme.colors.text.secondary} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* メッセージリスト */}
          <ScrollView 
            ref={scrollViewRef}
            style={styles.messagesList}
            contentContainerStyle={styles.messagesContent}
          >
            {currentMessages.map(message => (
              <ChatMessageItem key={message.id} message={message} />
            ))}
            {isPocoTyping && (
              <View style={styles.typingIndicator}>
                <Text style={styles.typingText}>ポコは入力中...</Text>
          </View>
            )}
      </ScrollView>

      {/* 入力エリア */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="メッセージを入力..."
          placeholderTextColor={theme.colors.text.hint}
          multiline
              value={newMessage}
              onChangeText={setNewMessage}
        />
            <View style={styles.inputActions}>
              <TouchableOpacity 
                style={styles.analyzeButton}
                onPress={startAnalysis}
                disabled={status.isAnalyzing}
              >
                <Text style={styles.analyzeButtonText}>🧠</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  styles.sendButton,
                  newMessage.trim() === '' && styles.sendButtonDisabled
                ]}
                onPress={handleSendMessage}
                disabled={newMessage.trim() === ''}
              >
                <Icon name="send" size={18} color="white" />
        </TouchableOpacity>
      </View>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.default,
  },
  spaceHeader: {
    padding: 16,
    backgroundColor: theme.colors.spaces.chat.primary,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    marginRight: 12,
  },
  headerIconText: {
    fontSize: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
  },
  channelListContainer: {
    width: 200,
    borderRightWidth: 1,
    borderRightColor: theme.colors.divider,
    backgroundColor: 'white',
  },
  channelListHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listHeaderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  newChannelButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  channelItem: {
    flexDirection: 'row',
    padding: 10,
    paddingLeft: 16,
    alignItems: 'center',
  },
  activeChannelItem: {
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.spaces.chat.primary,
  },
  channelIconContainer: {
    marginRight: 8,
  },
  channelInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  channelName: {
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  activeChannelName: {
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  unreadBadge: {
    backgroundColor: theme.colors.spaces.chat.primary,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  unreadText: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold',
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: theme.colors.spaces.chat.background,
    display: 'flex',
    flexDirection: 'column',
  },
  channelHeader: {
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  channelTitleContainer: {
    flex: 1,
  },
  channelTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  channelHeaderIcon: {
    marginRight: 8,
  },
  channelHeaderName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text.primary,
  },
  channelDescription: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginTop: 4,
  },
  channelActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  channelAction: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  selfMessageRow: {
    flexDirection: 'row-reverse',
  },
  messageAvatar: {
    marginRight: 8,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  messageBubble: {
    padding: 12,
    borderRadius: 18,
    maxWidth: '70%',
  },
  selfBubble: {
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
    borderBottomRightRadius: 4,
    marginLeft: 40,
  },
  otherBubble: {
    backgroundColor: 'white',
    borderBottomLeftRadius: 4,
    marginRight: 40,
  },
  messageAuthor: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  messageText: {
    fontSize: 15,
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    alignSelf: 'flex-end',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
    backgroundColor: 'white',
  },
  input: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 250, 240, 0.5)',
    fontSize: 15,
    maxHeight: 100,
    color: theme.colors.text.primary,
  },
  inputActions: {
    marginLeft: 8,
    alignSelf: 'flex-end',
    flexDirection: 'row',
  },
  analyzeButton: {
    width: 40,
    height: 40,
    marginRight: 8,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  analyzeButtonText: {
    fontSize: 20,
  },
  sendButton: {
    width: 44,
    height: 44,
    backgroundColor: theme.colors.secondary,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: theme.colors.secondaryLight,
    opacity: 0.6,
  },
  aiStatusContainer: {
    marginLeft: 'auto',
    marginRight: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  aiStatusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  insightIndicator: {
    marginLeft: 'auto',
    marginRight: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  insightCount: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
    marginRight: 4,
  },
  insightText: {
    color: 'white',
    fontSize: 12,
  },
  typingIndicator: {
    padding: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  typingText: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    fontStyle: 'italic',
  },
});

export default ChatSpace; 