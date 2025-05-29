import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions
} from 'react-native';
import { useChatSpace } from '../hooks/useChatSpace';
import { useNestSpace } from '@contexts/NestSpaceContext';
import ChatHeader from './ChatHeader';
import ThreadView from './ThreadView';
import ChatSpaceSettings from './ChatSpaceSettings';
import { LayoutType } from '../../types/nestSpace.types';

// Reuse some existing components from the current chat implementation
import MessageList from '../../../../screens/chat/components/MessageList';
import ChatInput from '../../../../screens/chat/components/ChatInput';
import ChatRoomList from '../../../../screens/chat/components/ChatRoomList';

const ChatSpace: React.FC = () => {
  const { width } = useWindowDimensions();
  const { spaceState } = useNestSpace();
  const {
    chatRooms,
    messages,
    activeChatRoomId,
    setActiveChatRoom,
    isPocoTyping,
    chatSpaceState,
    toggleThreadView,
    sendThreadMessage,
    replyToMessage,
    highlightMessages,
    clearHighlights
  } = useChatSpace();

  // Local state
  const [showSettings, setShowSettings] = useState(false);
  const [showChatList, setShowChatList] = useState(false);
  
  // Responsive layout calculations
  const isMobile = spaceState.layoutType === LayoutType.MOBILE;
  const isTablet = spaceState.layoutType === LayoutType.TABLET;
  const isDesktop = spaceState.layoutType === LayoutType.DESKTOP;
  
  // Side panel display logic
  const shouldShowThreadPanel = !isMobile && chatSpaceState.isThreadViewOpen;
  const shouldShowSidebar = isDesktop || isTablet || showChatList;
  const isSidebarOverlay = isMobile && showChatList;
  
  // Content preparation
  const activeChatRoom = chatRooms.find(room => room.id === activeChatRoomId);
  const currentMessages = activeChatRoomId ? [...(messages[activeChatRoomId] || [])] : [];
  
  // Determine if we have an active thread
  const activeThread = chatSpaceState.activeThreadId 
    ? chatSpaceState.threads[chatSpaceState.activeThreadId]
    : null;
  
  const threadMessages = activeThread?.messages || [];
  
  // Toggle chat list visibility (for mobile)
  const toggleChatList = () => {
    setShowChatList(!showChatList);
  };
  
  // Select a chat room
  const handleSelectChatRoom = (id: string) => {
    setActiveChatRoom(id);
    if (isMobile) {
      setShowChatList(false);
    }
  };
  
  // Send a message
  const handleSendMessage = (content: string) => {
    if (content.trim() && activeChatRoomId) {
      sendThreadMessage(content);
    }
  };
  
  // Toggle thread panel
  const handleToggleThreadView = () => {
    toggleThreadView();
  };
  
  // Toggle settings modal
  const handleToggleSettings = () => {
    setShowSettings(!showSettings);
  };
  
  // Save message to board
  const handleSaveMessage = (message: any) => {
    // This would integrate with the board space
    console.log('Save message to board:', message);
  };
  
  // Handle reply to message (fixed type issue)
  const handleReplyMessage = (message: any) => {
    if (message && message.id) {
      replyToMessage(message.id, false);
    }
  };
  
  // Clear reply (fixed type issue)
  const handleClearReply = () => {
    // We'll need to modify useChatSpace.ts to handle empty string
    replyToMessage("", false);
  };

  console.log('DUMMY LAYOUT!');

  return (
    <View style={{ flex: 1, flexDirection: 'row' }}>
      {/* サイドバー */}
      <View style={{ width: 80, backgroundColor: 'red' }} />
      {/* チャット空間全体 */}
      <View style={{ flex: 1, flexDirection: 'column' }}>
        {/* チャット空間ヘッダー */}
        <View style={{ height: 60, backgroundColor: 'orange' }} />
        {/* 下部（スレッドリスト＋メッセージエリア） */}
        <View style={{ flex: 1, flexDirection: 'row' }}>
          {/* スレッドリスト */}
          <View style={{ width: 200, backgroundColor: 'blue' }} />
          {/* メッセージエリア */}
          <View style={{ flex: 1, flexDirection: 'column' }}>
            {/* メッセージヘッダー */}
            <View style={{ height: 48, backgroundColor: 'green' }} />
            {/* メッセージ表示 */}
            <View style={{ flex: 1, backgroundColor: 'yellow' }} />
            {/* メッセージ入力＋送信 */}
            <View style={{ height: 56, backgroundColor: 'purple' }} />
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
    display: 'flex',
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    display: 'flex',
  },
  layoutRow: {
    flex: 1,
    flexDirection: 'row',
    minHeight: 0,
    display: 'flex',
  },
  sidebar: {
    width: 280,
    backgroundColor: '#FFFFFF',
    borderRightWidth: 1,
    borderRightColor: '#E0E0E0',
    display: 'flex',
  },
  overlaySidebar: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    zIndex: 10,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  mainArea: {
    flex: 1,
    backgroundColor: '#fff',
    minWidth: 0,
    minHeight: 0,
    display: 'flex',
  },
  messageArea: {
    flex: 1,
    minHeight: 0,
    minWidth: 0,
    display: 'flex',
  },
  inputArea: {
    width: '100%',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    padding: 8,
    flexShrink: 0,
  },
  threadPanel: {
    width: 320,
    backgroundColor: '#FFFFFF',
    borderLeftWidth: 1,
    borderLeftColor: '#E0E0E0',
    display: 'flex',
  },
  emptyChatMessage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyChatText: {
    color: '#9E9E9E',
    fontSize: 16,
  },
});

export default ChatSpace; 