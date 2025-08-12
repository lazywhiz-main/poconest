import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  FlatList, 
  useWindowDimensions, 
  Platform,
  KeyboardAvoidingView,
  SafeAreaView,
  TextInput
} from 'react-native';
import theme from '../../../styles/theme';
import { useChat } from '../../../contexts/ChatContext';
import { useAuth } from '@contexts/AuthContext';
import { useNest } from '../../nest/contexts/NestContext';
import { useNestSpace } from '@contexts/NestSpaceContext';
import { useResponsive } from '../../../hooks/useResponsive';
import { useChatToBoard } from '../../../hooks/useChatToBoard';
import ChatMessage from '../../../components/ChatMessage';
import ChatInput from '../../../components/ChatInput';
import Modal from '../../../components/ui/Modal';
import Icon from '../../../components/ui/Icon';

interface ResponsiveChatSpaceProps {
  nestId: string;
}

const ResponsiveChatSpace: React.FC<ResponsiveChatSpaceProps> = ({ nestId }) => {
  const { width, height } = useWindowDimensions();
  const { isMobile, isTablet, isDesktop } = useResponsive();
  const { user } = useAuth();
  const { currentNest } = useNest();
  const { spaceState } = useNestSpace();
  
  // Chat state
  const {
    chatRooms,
    messages,
    activeChatRoomId,
    setActiveChatRoom,
    isPocoTyping,
    sendMessage,
    createChatRoom,
    deleteChatRoom
  } = useChat();

  // Current messages for active room
  const currentMessages = activeChatRoomId ? messages[activeChatRoomId] || [] : [];

  // Local state
  const [showChannelList, setShowChannelList] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [analyzeResult, setAnalyzeResult] = useState<any[] | null>(null);
  const [showAnalyzeResultModal, setShowAnalyzeResultModal] = useState(false);
  const [analyzeWarning, setAnalyzeWarning] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelDesc, setNewChannelDesc] = useState('');
  const [newChannelError, setNewChannelError] = useState<string | null>(null);
  const [isCreatingChannel, setIsCreatingChannel] = useState(false);

  // Current active room
  const currentChannel = chatRooms.find(room => room.id === activeChatRoomId);

  // Chat to Board integration - Convert UIMessage to Message format
  const aiMessages = currentMessages.map(msg => ({
    id: msg.id,
    text: msg.content,
    userId: msg.sender.id,
    userName: msg.sender.name || 'User',
    timestamp: msg.created_at,
    created_at: msg.created_at,
    updated_at: msg.created_at,
    sender: msg.sender
  }));

  console.log('🚨🚨🚨 [ResponsiveChatSpace] useChatToBoard呼び出し開始 🚨🚨🚨', {
    timestamp: new Date().toISOString(),
    currentChannelId: currentChannel?.id,
    messagesCount: aiMessages.length,
    stackTrace: new Error().stack
  });
  
  const { status, startAnalysis, insights } = useChatToBoard({
    channelId: currentChannel?.id || '',
    messages: aiMessages,
    enabled: true,
    onNewInsightsGenerated: (newInsights) => {
      setAnalyzeResult(newInsights);
      setShowAnalyzeResultModal(true);
    },
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollViewRef.current && currentMessages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [currentMessages]);



  // Handlers
  const handleSendMessage = async (message: string) => {
    if (!activeChatRoomId || !message.trim()) return;
    await sendMessage(message);
  };

  const handleChannelSelect = (channelId: string) => {
    setActiveChatRoom(channelId);
    if (isMobile) {
      setShowChannelList(false);
    }
  };

  const handleToggleChannelList = () => {
    setShowChannelList(!showChannelList);
    // 他のメニューを閉じる
    if (showMobileMenu) setShowMobileMenu(false);
  };

  // カード抽出ハンドラー
  const handleAnalyzeClick = async () => {
    console.log('🚨🚨🚨 [ResponsiveChatSpace] handleAnalyzeClick called - 分析開始 🚨🚨🚨');
    console.log('[ResponsiveChatSpace] handleAnalyzeClick called');
    const warn = await startAnalysis();
    if (warn) {
      setAnalyzeWarning(warn);
      setShowAnalyzeResultModal(true);
    } else if (status.lastError) {
      setAnalyzeWarning(status.lastError.message || 'AI分析でエラーが発生しました');
      setShowAnalyzeResultModal(true);
    }
  };

  // チャンネル作成ハンドラー
  const handleCreateChannel = async () => {
    if (!newChannelName.trim()) {
      setNewChannelError('チャネル名を入力してください');
      return;
    }

    setIsCreatingChannel(true);
    setNewChannelError(null);

    try {
      // spaceIdを取得
      let chatSpaceId: string | undefined = undefined;

      // 1. activeSpaceTypeで現在のspaceを特定し、そのidを使う
      if (spaceState?.activeSpaceType && Array.isArray(spaceState.availableSpaces)) {
        const activeSpace = spaceState.availableSpaces.find(
          (s: any) => s.type === spaceState.activeSpaceType
        );
        if (activeSpace) chatSpaceId = activeSpace.id;
      }

      // 2. availableSpacesからtype: 'chat'を探す
      if (!chatSpaceId && Array.isArray(spaceState?.availableSpaces)) {
        const chatSpace = spaceState.availableSpaces.find((s: any) => s.type === 'chat');
        if (chatSpace) chatSpaceId = chatSpace.id;
      }

      // 3. chatRoomsが存在する場合はそこからspaceIdを使う
      if (!chatSpaceId && chatRooms && chatRooms.length > 0 && chatRooms[0].spaceId) {
        chatSpaceId = chatRooms[0].spaceId;
      }

      if (!chatSpaceId) {
        setNewChannelError('チャット空間のspaceIdが見つかりません');
        return;
      }

      await createChatRoom(chatSpaceId, newChannelName.trim(), newChannelDesc.trim());
      
      // 成功時にフォームをリセット
      setNewChannelName('');
      setNewChannelDesc('');
      setCreateModalVisible(false);
    } catch (error) {
      console.error('チャンネル作成エラー:', error);
      setNewChannelError('チャネルの作成に失敗しました');
    } finally {
      setIsCreatingChannel(false);
    }
  };

  // チャンネル削除ハンドラー
  const handleDeleteChannel = async () => {
    if (!currentChannel) return;
    
    try {
      await deleteChatRoom(currentChannel.id);
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error('チャンネル削除エラー:', error);
      // エラーハンドリングを追加可能
    }
  };

  // Web用のCSS適用
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const style = document.createElement('style');
      style.textContent = `
        #mobile-dropdown {
          background-color: #1a1a2e !important;
          border: 1px solid #333366 !important;
        }
        #mobile-dropdown > * {
          background-color: #1a1a2e !important;
        }
        #mobile-menu-dropdown {
          background-color: #1a1a2e !important;
          border: 1px solid #333366 !important;
        }
        #mobile-menu-dropdown > * {
          background-color: #1a1a2e !important;
        }
      `;
      document.head.appendChild(style);
      
      return () => {
        document.head.removeChild(style);
      };
    }
  }, [showChannelList, showMobileMenu]);

  // Render channel item
  const renderChannelItem = ({ item }: { item: typeof chatRooms[0] }) => (
    <TouchableOpacity
      style={[
        styles.channelItem,
        item.id === activeChatRoomId && styles.activeChannelItem
      ]}
      onPress={() => handleChannelSelect(item.id)}
    >
      <View style={styles.channelIconContainer}>
        <Text style={styles.channelIcon}>#</Text>
      </View>
      <View style={styles.channelInfo}>
        <Text style={[
          styles.channelName,
          item.id === activeChatRoomId && styles.activeChannelName
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

  // Mobile header with channel selector
  const renderMobileHeader = () => (
    <View style={styles.mobileHeader}>
      <TouchableOpacity 
        style={styles.channelSelectorButton}
        onPress={handleToggleChannelList}
      >
        <Text style={styles.channelSelectorText}>
          {currentChannel ? `# ${currentChannel.name}` : 'チャンネルを選択'}
        </Text>
        <Icon name="chevron-down" size={16} color="#e2e8f0" />
      </TouchableOpacity>
      
      <View style={styles.mobileHeaderActions}>
        {/* 検索ボタン */}
        <TouchableOpacity 
          style={styles.mobileActionButton}
          onPress={() => {
            // TODO: 検索機能の実装
            console.log('検索機能を開く');
          }}
        >
          <Icon name="search" size={18} color="#e2e8f0" />
        </TouchableOpacity>
        
        {/* メニューボタン（カード抽出・削除など） */}
        <TouchableOpacity 
          style={styles.mobileActionButton}
          onPress={() => {
            setShowMobileMenu(!showMobileMenu);
            // 他のメニューを閉じる
            if (showChannelList) setShowChannelList(false);
          }}
        >
          <Icon name="more-vertical" size={18} color="#e2e8f0" />
        </TouchableOpacity>
      </View>
    </View>
  );

  // Desktop/Tablet sidebar
  const renderSidebar = () => (
    <View style={[
      styles.sidebar,
      isTablet && styles.tabletSidebar
    ]}>
      <View style={styles.sidebarHeader}>
        <Text style={styles.sidebarTitle}>チャンネル</Text>
        <TouchableOpacity 
          style={styles.addChannelButton}
          onPress={() => setCreateModalVisible(true)}
        >
          <Icon name="plus" size={16} />
        </TouchableOpacity>
      </View>
      
      <FlatList
        data={chatRooms}
        keyExtractor={item => item.id}
        renderItem={renderChannelItem}
        style={styles.channelList}
      />
    </View>
  );

  // Messages area
  const renderMessagesArea = () => (
    <View style={styles.messagesContainer}>
      {/* Header */}
      {isMobile ? renderMobileHeader() : (
        <View style={styles.desktopHeader}>
          <View style={styles.channelTitleContainer}>
            <Text style={styles.channelTitle}>
              {currentChannel ? `# ${currentChannel.name}` : 'チャンネルを選択してください'}
            </Text>
            {currentChannel?.description && (
              <Text style={styles.channelDescription}>
                {currentChannel.description}
              </Text>
            )}
          </View>
        </View>
      )}

      {/* Messages */}
      <View style={styles.messageArea}>
        {currentMessages.length === 0 ? (
          <View style={styles.emptyMessageContainer}>
            <Text style={styles.emptyMessageTitle}>
              初めてのメッセージを送ってみてください！
            </Text>
            <Text style={styles.emptyMessageSub}>
              このチャットルームの最初の一言を投稿しましょう。
            </Text>
          </View>
        ) : (
          <ScrollView 
            ref={scrollViewRef}
            style={styles.messagesList}
            contentContainerStyle={[
              styles.messagesContent,
              isMobile && styles.mobileMessagesContent
            ]}
            showsVerticalScrollIndicator={!isMobile}
          >
            {currentMessages.map(message => (
              <ChatMessage
                key={message.id}
                content={message.content}
                sender={message.sender}
                timestamp={message.created_at}
                isSelf={message.sender.id === user?.id}
              />
            ))}
            {isPocoTyping && (
              <View style={styles.typingIndicator}>
                <Text style={styles.typingText}>ポコは入力中...</Text>
              </View>
            )}
          </ScrollView>
        )}
      </View>

      {/* Input Area */}
      <View style={[
        styles.inputContainer,
        isMobile && styles.mobileInputContainer
      ]}>
        <ChatInput
          onSend={handleSendMessage}
          disabled={!activeChatRoomId}
          placeholder={
            activeChatRoomId 
              ? `# ${currentChannel?.name || 'チャンネル'}にメッセージを送信`
              : 'チャンネルを選択してください'
          }
        />
      </View>
    </View>
  );

  // Mobile menu dropdown (for actions like card extract, delete)
  const renderMobileMenu = () => {
    if (!showMobileMenu) return null;
    
    return (
      <View style={styles.mobileMenuOverlay}>
        <TouchableOpacity 
          style={styles.menuBackdrop}
          onPress={() => setShowMobileMenu(false)}
          activeOpacity={1}
        />
        <View 
          style={styles.mobileMenuDropdown}
          nativeID="mobile-menu-dropdown"
        >
          {/* カード抽出ボタン */}
          <TouchableOpacity
            style={styles.mobileMenuItem}
            onPress={() => {
              setShowMobileMenu(false);
              handleAnalyzeClick();
            }}
          >
            <Icon name="card-extract" size={16} color="#e2e8f0" />
            <Text style={styles.mobileMenuText}>カード抽出</Text>
          </TouchableOpacity>
          
          {/* チャンネル削除ボタン */}
          {currentChannel && (
            <TouchableOpacity
              style={styles.mobileMenuItem}
              onPress={() => {
                setShowMobileMenu(false);
                setShowDeleteConfirm(true);
              }}
            >
              <Icon name="delete" size={16} color="#ff6b6b" />
              <Text style={[styles.mobileMenuText, { color: '#ff6b6b' }]}>チャンネルを削除</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  // Mobile channel list dropdown
  const renderMobileChannelList = () => {
    if (!showChannelList) return null;
    
    return (
      <View style={styles.mobileDropdownOverlay}>
        <TouchableOpacity 
          style={styles.dropdownBackdrop}
          onPress={() => setShowChannelList(false)}
          activeOpacity={1}
        />
        <View 
          style={styles.mobileDropdown}
          nativeID="mobile-dropdown"
        >
          <View style={styles.dropdownHeader}>
            <Text style={styles.dropdownTitle}>チャンネル</Text>
            <TouchableOpacity 
              style={styles.addChannelButtonDropdown}
              onPress={() => {
                setShowChannelList(false);
                setCreateModalVisible(true);
              }}
            >
              <Icon name="plus" size={16} color="#0f0f23" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.dropdownScrollView}>
            {chatRooms.map(item => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.dropdownChannelItem,
                  item.id === activeChatRoomId && styles.activeDropdownChannelItem
                ]}
                onPress={() => handleChannelSelect(item.id)}
              >
                <View style={styles.dropdownChannelIcon}>
                  <Text style={styles.dropdownChannelIconText}>#</Text>
                </View>
                <Text style={[
                  styles.dropdownChannelName,
                  item.id === activeChatRoomId && styles.activeDropdownChannelName
                ]}>
                  {item.name}
                </Text>
                {item.unreadCount > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadText}>{item.unreadCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
            
            {/* 新しいチャンネル追加ボタン */}
            <TouchableOpacity
              style={styles.addChannelDropdownItem}
              onPress={() => {
                setShowChannelList(false);
                setCreateModalVisible(true);
              }}
            >
              <View style={styles.addChannelDropdownIcon}>
                <Icon name="plus" size={16} color="#00ff88" />
              </View>
              <Text style={styles.addChannelDropdownText}>新しいチャンネル</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    );
  };

  // Main layout
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? (isMobile ? 64 : 0) : 0}
      >
        <View style={styles.content}>
          {/* Sidebar for desktop/tablet */}
          {!isMobile && renderSidebar()}
          
          {/* Messages area */}
          {renderMessagesArea()}
        </View>
      </KeyboardAvoidingView>

      {/* Mobile channel list modal - positioned outside KeyboardAvoidingView */}
      {isMobile && renderMobileChannelList()}
      
      {/* Mobile menu modal - positioned outside KeyboardAvoidingView */}
      {isMobile && renderMobileMenu()}

      {/* Analysis result modal */}
      <Modal
        open={showAnalyzeResultModal}
        onClose={() => {
          setShowAnalyzeResultModal(false);
          setAnalyzeWarning(null);
        }}
        title="分析完了"
      >
        <View style={styles.modalContent}>
          {analyzeWarning ? (
            <Text style={styles.warningText}>{analyzeWarning}</Text>
          ) : analyzeResult && analyzeResult.length > 0 ? (
            <View>
              <Text style={styles.resultTitle}>
                追加されたカード数: {analyzeResult.length}
              </Text>
              <ScrollView style={styles.cardList}>
                {analyzeResult.map((card, index) => (
                  <View key={card.id || index} style={styles.cardItem}>
                    <Icon name="card-extract" size={16} color="#00ff88" />
                    <Text style={styles.cardTitle}>{card.title}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          ) : (
            <Text style={styles.noResultText}>カードは抽出されませんでした。</Text>
          )}
        </View>
      </Modal>

      {/* Delete confirmation modal */}
      <Modal
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="チャンネル削除"
      >
        <View style={styles.modalContent}>
          <Text style={styles.deleteWarningText}>
            「{currentChannel?.name}」を本当に削除しますか？
          </Text>
          <Text style={styles.deleteSubText}>
            この操作は取り消せません。
          </Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowDeleteConfirm(false)}
            >
              <Text style={styles.cancelButtonText}>キャンセル</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={handleDeleteChannel}
            >
              <Text style={styles.deleteButtonText}>削除</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Create channel modal */}
      <Modal
        open={createModalVisible}
        onClose={() => {
          setCreateModalVisible(false);
          setNewChannelName('');
          setNewChannelDesc('');
          setNewChannelError(null);
        }}
        title="新しいチャンネルを作成"
      >
        <View style={styles.modalContent}>
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>チャネル名</Text>
            <TextInput
              style={[styles.formInput, newChannelError ? styles.formInputError : null]}
              value={newChannelName}
              onChangeText={setNewChannelName}
              placeholder="例: プロジェクト計画"
              placeholderTextColor="#6c7086"
              autoFocus
            />
            {newChannelError && <Text style={styles.formError}>{newChannelError}</Text>}
          </View>
          
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>説明（任意）</Text>
            <TextInput
              style={[styles.formInput, styles.textArea]}
              value={newChannelDesc}
              onChangeText={setNewChannelDesc}
              placeholder="このチャネルの目的や用途を説明してください"
              placeholderTextColor="#6c7086"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
          
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setCreateModalVisible(false);
                setNewChannelName('');
                setNewChannelDesc('');
                setNewChannelError(null);
              }}
              disabled={isCreatingChannel}
            >
              <Text style={styles.cancelButtonText}>キャンセル</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.createButton,
                (!newChannelName.trim() || isCreatingChannel) && styles.createButtonDisabled
              ]}
              onPress={handleCreateChannel}
              disabled={!newChannelName.trim() || isCreatingChannel}
            >
              <Text style={[
                styles.createButtonText,
                (!newChannelName.trim() || isCreatingChannel) && styles.createButtonTextDisabled
              ]}>
                {isCreatingChannel ? '作成中...' : '作成'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f23', // ダークテーマの背景色
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
  },
  
  // Sidebar styles
  sidebar: {
    width: 240,
    backgroundColor: '#1a1a2e', // ダークテーマのサイドバー背景
    borderRightWidth: 1,
    borderRightColor: '#333366', // ダークテーマのボーダー
  },
  tabletSidebar: {
    width: 200,
  },
  sidebarHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333366', // border-primary
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sidebarTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e2e8f0', // ダークテーマのプライマリテキスト
  },
  addChannelButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.action,
    justifyContent: 'center',
    alignItems: 'center',
  },
  channelList: {
    flex: 1,
  },
  
  // Channel item styles
  channelItem: {
    flexDirection: 'row',
    padding: 12,
    paddingLeft: 16,
    alignItems: 'center',
    minHeight: 44, // Touch-friendly height
  },
  activeChannelItem: {
    backgroundColor: theme.colors.spaces.chat.primary + '15',
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.spaces.chat.primary,
  },
  channelIconContainer: {
    marginRight: 12,
  },
  channelIcon: {
    fontSize: 16,
    color: '#a6adc8', // ダークテーマのセカンダリテキスト
  },
  channelInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  channelName: {
    fontSize: 14,
    color: '#a6adc8', // ダークテーマのセカンダリテキスト
  },
  activeChannelName: {
    fontWeight: '600',
    color: '#e2e8f0', // ダークテーマのプライマリテキスト
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
  
  // Messages container
  messagesContainer: {
    flex: 1,
    backgroundColor: '#0f0f23', // ダークテーマのメッセージ背景
  },
  
  // Mobile header
  mobileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#1a1a2e', // ダークテーマのヘッダー背景
    borderBottomWidth: 1,
    borderBottomColor: '#333366', // border-primary
    minHeight: 56,
  },
  channelSelectorButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 12,
  },
  channelSelectorText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e2e8f0', // プライマリテキスト色
  },
  mobileHeaderActions: {
    flexDirection: 'row',
    gap: 8,
  },
  mobileActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Desktop header
  desktopHeader: {
    padding: 16,
    backgroundColor: '#1a1a2e', // ダークテーマのヘッダー背景
    borderBottomWidth: 1,
    borderBottomColor: '#333366', // border-primary
  },
  channelTitleContainer: {
    flex: 1,
  },
  channelTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#e2e8f0', // プライマリテキスト色
  },
  channelDescription: {
    fontSize: 14,
    color: '#a6adc8', // ダークテーマのセカンダリテキスト
    marginTop: 4,
  },
  
  // Messages area
  messageArea: {
    flex: 1,
    minHeight: 0,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  mobileMessagesContent: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  emptyMessageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyMessageTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e2e8f0', // ダークテーマのプライマリテキスト
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyMessageSub: {
    fontSize: 14,
    color: '#a6adc8', // ダークテーマのセカンダリテキスト
    textAlign: 'center',
  },
  typingIndicator: {
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginLeft: 16,
    marginBottom: 16,
  },
  typingText: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    fontStyle: 'italic',
  },
  
  // Input container
  inputContainer: {
    backgroundColor: '#1a1a2e', // ダークテーマの入力エリア背景
    borderTopWidth: 1,
    borderTopColor: '#333366', // border-primary
  },
  mobileInputContainer: {
    paddingBottom: Platform.OS === 'ios' ? 0 : 8,
  },
  
  // Mobile dropdown styles
  mobileDropdownOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    backgroundColor: 'transparent',
  },
  dropdownBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  mobileDropdown: {
    position: 'absolute',
    top: 56, // ヘッダーの高さ分
    left: 12,
    right: 12,
    backgroundColor: '#1a1a2e',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333366',
    maxHeight: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    // Web用の追加スタイル
    ...(Platform.OS === 'web' && {
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
    }),
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#1a1a2e', // 明示的に背景色を設定
    borderBottomWidth: 1,
    borderBottomColor: '#333366',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  dropdownTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e2e8f0',
  },
  addChannelButtonDropdown: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#00ff88',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownChannelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingLeft: 16,
    minHeight: 44,
    backgroundColor: '#1a1a2e',
    borderBottomWidth: 1,
    borderBottomColor: '#333366',
  },
  activeDropdownChannelItem: {
    backgroundColor: '#2a2a3e', // より濃い背景色
    borderLeftWidth: 3,
    borderLeftColor: '#00ff88',
    borderBottomColor: '#333366',
  },
  dropdownChannelIcon: {
    marginRight: 12,
  },
  dropdownChannelIconText: {
    fontSize: 16,
    color: '#a6adc8',
  },
  dropdownChannelName: {
    flex: 1,
    fontSize: 14,
    color: '#e2e8f0',
  },
  activeDropdownChannelName: {
    fontWeight: '600',
    color: '#e2e8f0',
  },
  dropdownScrollView: {
    maxHeight: 300,
  },
  addChannelDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingLeft: 16,
    minHeight: 44,
    backgroundColor: '#1a1a2e',
    borderTopWidth: 1,
    borderTopColor: '#333366',
  },
  addChannelDropdownIcon: {
    marginRight: 12,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addChannelDropdownText: {
    fontSize: 14,
    color: '#00ff88',
    fontWeight: '600',
  },
  
  // Mobile menu styles
  mobileMenuOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  menuBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  mobileMenuDropdown: {
    position: 'absolute',
    top: 56, // ヘッダーの高さ分
    right: 12,
    backgroundColor: '#1a1a2e',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333366',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    minWidth: 160,
  },
  mobileMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
    minHeight: 44, // タッチフレンドリーな高さ
  },
  mobileMenuText: {
    color: '#e2e8f0',
    fontSize: 14,
    fontWeight: '500',
  },
  
  // Modal styles
  modalContent: {
    padding: 16,
  },
  warningText: {
    color: '#ff6b6b',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
    marginBottom: 18,
  },
  resultTitle: {
    color: '#a6adc8',
    fontSize: 14,
    fontWeight: '400',
    marginBottom: 10,
  },
  cardList: {
    maxHeight: 140,
    marginBottom: 14,
  },
  cardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#23243a',
    borderRadius: 4,
    padding: 8,
    marginBottom: 6,
    gap: 8,
  },
  cardTitle: {
    color: '#e2e8f0',
    fontSize: 14,
    fontWeight: '400',
    flex: 1,
  },
  noResultText: {
    color: '#a6adc8',
    fontSize: 14,
    fontWeight: '400',
    marginBottom: 14,
  },
  deleteWarningText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 32,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  deleteSubText: {
    color: '#a6adc8',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 20,
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#333366',
    borderRadius: 4,
    paddingVertical: 12,
    paddingHorizontal: 24,
    minWidth: 120,
  },
  cancelButtonText: {
    color: '#e2e8f0',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  deleteButton: {
    backgroundColor: '#ff6b6b',
    borderRadius: 4,
    paddingVertical: 12,
    paddingHorizontal: 24,
    minWidth: 120,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  
  // Form styles for create channel modal
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#a6adc8',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  formInput: {
    backgroundColor: '#0f0f23',
    borderWidth: 1,
    borderColor: '#333366',
    borderRadius: 4,
    padding: 12,
    color: '#e2e8f0',
    fontSize: 14,
    minHeight: 44,
  },
  formInputError: {
    borderColor: '#ff6b6b',
  },
  formError: {
    color: '#ff6b6b',
    fontSize: 12,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textArea: {
    minHeight: 80,
    maxHeight: 120,
    textAlignVertical: 'top',
  },
  createButton: {
    backgroundColor: '#00ff88',
    borderRadius: 4,
    paddingVertical: 12,
    paddingHorizontal: 24,
    minWidth: 120,
  },
  createButtonDisabled: {
    backgroundColor: '#333366',
    opacity: 0.6,
  },
  createButtonText: {
    color: '#0f0f23',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  createButtonTextDisabled: {
    color: '#a6adc8',
  },
});

export default ResponsiveChatSpace; 