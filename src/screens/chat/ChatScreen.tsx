import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  Modal,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import AppHeader from '@components/layout/AppHeader';
import { useChat } from '@contexts/ChatContext';
import styles from './ChatScreen.styles';
import ChatRoomList from './components/ChatRoomList';
import MessageList from './components/MessageList';
import ChatInput from './components/ChatInput';
import { BREAKPOINTS } from '@constants/config';

// シンプルなSafeAreaViewの代替
const SafeAreaContainer: React.FC<{ style?: any; children: React.ReactNode }> = ({ style, children }) => (
  <View style={[{ flex: 1 }, style]}>{children}</View>
);

const ChatScreen: React.FC = () => {
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
  } = useChat();
  
  const [showChatList, setShowChatList] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  const { width } = useWindowDimensions();
  const isMobile = width < BREAKPOINTS.tablet;
  const isTablet = width >= BREAKPOINTS.tablet && width < BREAKPOINTS.desktop;
  const isDesktop = width >= BREAKPOINTS.desktop;
  
  // デスクトップとタブレットモードでは、サイドバーを常に表示
  const shouldShowSidebar = isDesktop || isTablet || showChatList;
  const isSidebarOverlay = isMobile && showChatList;
  
  // 現在選択されているチャットルームの情報
  const activeChatRoom = chatRooms.find(room => room.id === activeChatRoomId);
  const currentMessages = activeChatRoomId ? [...(messages[activeChatRoomId] || [])] : [];
  
  // サイドバーの表示/非表示を切り替え
  const toggleChatList = () => {
    setShowChatList(!showChatList);
  };
  
  // チャットルーム選択時のハンドラ
  const handleSelectChatRoom = (id: string) => {
    setActiveChatRoom(id);
    if (isMobile) {
      setShowChatList(false);
    }
  };
  
  // メッセージ送信時のハンドラ
  const handleSendMessage = (content: string) => {
    if (content.trim() && activeChatRoomId) {
      sendMessage(content);
    }
  };
  
  // メッセージをボードに保存
  const handleSaveMessage = (message: any) => {
    // この関数は実際にはボードへの保存ロジックを実装することになります
    // 現在はモックのみ
    console.log('Save message:', message);
  };
  
  // インサイト抽出
  const handleExtractInsights = () => {
    if (activeChatRoomId) {
      extractAndSaveInsights(activeChatRoomId);
    }
  };
  
  // 会話要約生成
  const handleGenerateSummary = () => {
    generateSummary();
  };
  
  // ヘッダーの右側にあるアクションボタン
  const renderHeaderRightComponent = () => {
    if (!activeChatRoomId) return null;
    
    return (
      <View style={styles.headerRight}>
        {/* インサイト抽出ボタン */}
        <TouchableOpacity
          style={styles.headerButton}
          onPress={handleExtractInsights}
          disabled={isExtractingInsights}
          accessibilityLabel="インサイトを抽出"
        >
          <Text style={{ fontSize: 20 }}>💡</Text>
        </TouchableOpacity>
        
        {/* 要約生成ボタン */}
        <TouchableOpacity
          style={styles.headerButton}
          onPress={handleGenerateSummary}
          accessibilityLabel="会話を要約"
        >
          <Text style={{ fontSize: 20 }}>📝</Text>
        </TouchableOpacity>
        
        {/* 設定ボタン */}
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => setShowSettings(true)}
          accessibilityLabel="設定"
        >
          <Text style={{ fontSize: 20 }}>⋯</Text>
        </TouchableOpacity>
      </View>
    );
  };
  
  return (
    <SafeAreaContainer style={styles.safeArea}>
      <View style={styles.container}>
        {/* ヘッダー */}
        <AppHeader
          title={activeChatRoom?.name || 'チャット'}
          subtitle={activeChatRoom?.description || 'ポコと会話'}
          showBackButton={isMobile && !showChatList}
          showEmoji={true}
          emoji="💬"
          onBackPress={toggleChatList}
          rightComponent={renderHeaderRightComponent()}
        />
        
        {/* メインコンテンツ */}
        <KeyboardAvoidingView 
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
        >
          <View style={styles.content}>
            {/* チャットルームリスト */}
            {shouldShowSidebar && (
              <View style={[
                styles.chatList,
                isSidebarOverlay && styles.mobileChatList
              ]}>
                <ChatRoomList 
                  chatRooms={chatRooms}
                  activeChatRoomId={activeChatRoomId}
                  onSelectChatRoom={handleSelectChatRoom}
                  onClose={isMobile ? toggleChatList : undefined}
                />
              </View>
            )}
            
            {/* メインチャットエリア */}
            {(!isMobile || !showChatList) && (
              <View style={styles.chatArea}>
                {activeChatRoomId ? (
                  <>
                    {/* 要約表示 */}
                    {showSummary && conversationSummary && (
                      <View style={styles.summaryContainer}>
                        <Text style={styles.summaryTitle}>会話の要約:</Text>
                        <Text style={styles.summaryText}>{conversationSummary}</Text>
                      </View>
                    )}
                    
                    {/* メッセージリスト */}
                    <View style={styles.messageContainer}>
                      <MessageList 
                        messages={currentMessages}
                        isTyping={isPocoTyping}
                        loading={loadingMessages}
                        onSaveMessage={handleSaveMessage}
                      />
                    </View>
                    
                    {/* メッセージ入力 */}
                    <ChatInput 
                      onSend={handleSendMessage}
                      disabled={isPocoTyping}
                    />
                  </>
                ) : (
                  <View style={styles.emptyChatMessage}>
                    <Text style={styles.emptyChatText}>チャットルームを選択してください</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
        
        {/* 設定モーダル */}
        <Modal
          transparent
          visible={showSettings}
          animationType="fade"
          onRequestClose={() => setShowSettings(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>チャット設定</Text>
              <Text>このモーダルには、チャットの設定オプションが含まれます</Text>
              <TouchableOpacity 
                style={styles.modalButton}
                onPress={() => setShowSettings(false)}
              >
                <Text style={styles.modalButtonText}>閉じる</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaContainer>
  );
};

export default ChatScreen; 