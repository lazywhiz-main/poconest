import React, { useState, useEffect, useCallback } from 'react';
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
import CreateChannelModal from './CreateChannelModal';
import { LayoutType } from '../../types/nestSpace.types';
import { ChatRoom, UIMessage, Thread, ChatMessage, MessageInputState, ChatUser } from '../types/chat.types';
import ChatRoomList from './ChatRoomList';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';

export interface ChatSpaceProps {
  nestId: string;
}

export const ChatSpace: React.FC<ChatSpaceProps> = ({ nestId }) => {
  const { width } = useWindowDimensions();
  const { spaceState } = useNestSpace();
  const {
    chatRooms,
    messages: chatMessages,
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
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [messages, setMessages] = useState<Record<string, UIMessage[]>>({});
  const [threads, setThreads] = useState<Record<string, Thread>>({});
  const [inputState, setInputState] = useState<MessageInputState>({
    content: '',
    isTyping: false,
    attachments: []
  });
  
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
  const currentMessages = activeChatRoomId ? [...(chatMessages[activeChatRoomId] || [])] : [];
  
  // Determine if we have an active thread
  const activeThread = activeThreadId ? threads[activeThreadId] : null;
  
  const threadMessages = activeThread?.messages || [];
  
  // Toggle chat list visibility (for mobile)
  const toggleChatList = () => {
    setShowChatList(!showChatList);
  };
  
  // Select a chat room
  const handleSelectChatRoom = (id: string) => {
    setActiveRoomId(id);
    if (isMobile) {
      setShowChatList(false);
    }
  };
  
  // Send a message
  const handleSendMessage = useCallback(() => {
    if (!inputState.content.trim() || !activeRoomId) return;

    const currentUser: ChatUser = {
      id: 'current-user-id',
      name: 'Current User',
      isBot: false
    };

    const newMessage: UIMessage = {
      id: Date.now().toString(),
      chatId: activeRoomId,
      content: inputState.content,
      sender: currentUser,
      created_at: new Date().toISOString(),
      is_read: false
    };

    setMessages(prev => ({
      ...prev,
      [activeRoomId]: [...(prev[activeRoomId] || []), newMessage]
    }));
    setInputState(prev => ({ ...prev, content: '' }));
  }, [inputState.content, activeRoomId]);
  
  // Toggle thread panel
  const handleToggleThreadView = () => {
    toggleThreadView();
  };
  
  // Toggle settings modal
  const handleToggleSettings = () => {
    setShowSettings(!showSettings);
  };

  // Toggle create channel modal
  const handleToggleCreateChannel = () => {
    setShowCreateChannel(!showCreateChannel);
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

  const handleInputChange = useCallback((content: string) => {
    setInputState(prev => ({ ...prev, content }));
  }, []);

  const handleAttachmentSelect = useCallback(() => {
    // TODO: Implement attachment selection
    console.log('Attachment selection not implemented yet');
  }, []);

  const handleReply = useCallback((messageId: string, inNewThread = false) => {
    if (inNewThread) {
      // Create new thread
      const newThread: Thread = {
        id: Date.now().toString(),
        parentMessageId: messageId,
        roomId: activeRoomId!,
        participants: [],
        lastMessage: undefined,
        messageCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: [],
        title: `Thread ${Date.now()}`,
        isActive: false
      };
      setThreads(prev => ({ ...prev, [newThread.id]: newThread }));
      setActiveThreadId(newThread.id);
    } else {
      // Reply in existing thread
      setActiveThreadId(messageId);
    }
  }, [activeRoomId]);

  const handleCloseThread = useCallback(() => {
    setActiveThreadId(null);
  }, []);

  console.log('DUMMY LAYOUT!');

  return (
    <KeyboardAvoidingView
      style={styles.keyboardAvoidingView}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <View style={styles.container}>
        <View style={styles.layoutRow}>
          {shouldShowSidebar && (
            <View style={[
              styles.sidebar,
              isSidebarOverlay && styles.overlaySidebar
            ]}>
              <ChatRoomList
                rooms={rooms}
                activeRoomId={activeRoomId}
                onSelectRoom={handleSelectChatRoom}
                onCreateChannel={handleToggleCreateChannel}
              />
            </View>
          )}
          
          <View style={styles.mainArea}>
            <View style={styles.messageArea}>
              {activeChatRoom ? (
                <>
                  <ChatHeader
                    onToggleThreadView={handleToggleThreadView}
                    onToggleSettings={handleToggleSettings}
                    onCreateChannel={handleToggleCreateChannel}
                  />
                  
                  <MessageList
                    messages={currentMessages}
                    onReply={handleReplyMessage}
                    onSave={handleSaveMessage}
                    onHighlight={highlightMessages}
                    onClearHighlights={clearHighlights}
                    highlightedMessageIds={chatSpaceState.highlightedMessageIds}
                  />
                  
                  <ChatInput
                    inputState={inputState}
                    onSend={handleSendMessage}
                    onInputChange={handleInputChange}
                    onAttachmentSelect={() => {
                      // TODO: Implement attachment selection
                      console.log('Attachment selection not implemented yet');
                    }}
                  />
                </>
              ) : (
                <View style={styles.emptyChatMessage}>
                  <Text style={styles.emptyChatText}>
                    チャットルームを選択してください
                  </Text>
                </View>
              )}
            </View>
            
            {shouldShowThreadPanel && (
              <View style={styles.threadPanel}>
                {activeThread ? (
                  <ThreadView
                    thread={activeThread}
                    messages={threadMessages}
                    onClose={handleToggleThreadView}
                    onReply={messageId => handleReplyMessage({ id: messageId })}
                  />
                ) : null}
              </View>
            )}
          </View>
        </View>
      </View>
      
      <ChatSpaceSettings
        visible={showSettings}
        onClose={handleToggleSettings}
      />
      
      <CreateChannelModal
        visible={showCreateChannel}
        onClose={handleToggleCreateChannel}
      />
    </KeyboardAvoidingView>
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