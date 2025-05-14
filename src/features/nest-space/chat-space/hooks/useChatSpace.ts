import { useCallback, useState, useEffect } from 'react';
import { useChat, ChatMessage, ChatRoom } from '@contexts/ChatContext';
import { useNestSpace } from '../../contexts/_NestSpaceContext';
import { SpaceType } from '../../types/nestSpace.types';

export interface Thread {
  id: string;
  parentMessageId: string | null;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  participants: string[];
}

export interface ChatInsight {
  id: string;
  threadId: string;
  content: string;
  type: 'topic' | 'action' | 'question' | 'summary';
  createdAt: string;
  confidence: number; // 0-1 representing AI confidence in this insight
}

export interface ChatSpaceState {
  activeThreadId: string | null;
  threads: Record<string, Thread>;
  insights: ChatInsight[];
  isPinned: boolean;
  isThreadViewOpen: boolean;
  isTypingUsers: string[];
  replyingToMessageId: string | null;
  highlightedMessageIds: string[];
}

export const useChatSpace = () => {
  const { 
    chatRooms, 
    messages, 
    activeChatRoomId, 
    setActiveChatRoom, 
    sendMessage, 
    isPocoTyping, 
    generateSummary, 
    extractAndSaveInsights 
  } = useChat();
  
  const { isSpaceActive, navigateToSpace } = useNestSpace();
  
  // Chat space specific state
  const [chatSpaceState, setChatSpaceState] = useState<ChatSpaceState>({
    activeThreadId: null,
    threads: {},
    insights: [],
    isPinned: false,
    isThreadViewOpen: false,
    isTypingUsers: [],
    replyingToMessageId: null,
    highlightedMessageIds: [],
  });
  
  // Ensure chat space is properly activated in the space context
  useEffect(() => {
    if (!isSpaceActive(SpaceType.CHAT) && activeChatRoomId) {
      navigateToSpace(SpaceType.CHAT);
    }
  }, [isSpaceActive, navigateToSpace, activeChatRoomId]);
  
  // Initialize threads based on the active chat room messages
  useEffect(() => {
    if (activeChatRoomId && messages[activeChatRoomId]) {
      // Create a main thread if it doesn't exist
      const mainThreadId = `main-${activeChatRoomId}`;
      
      setChatSpaceState(prev => {
        // If main thread already exists, just update its messages
        if (prev.threads[mainThreadId]) {
          return {
            ...prev,
            threads: {
              ...prev.threads,
              [mainThreadId]: {
                ...prev.threads[mainThreadId],
                messages: [...messages[activeChatRoomId]],
                updatedAt: new Date().toISOString(),
              }
            },
            activeThreadId: prev.activeThreadId || mainThreadId
          };
        }
        
        // Create a new main thread
        return {
          ...prev,
          threads: {
            ...prev.threads,
            [mainThreadId]: {
              id: mainThreadId,
              parentMessageId: null,
              title: chatRooms.find(room => room.id === activeChatRoomId)?.name || 'Main Thread',
              messages: [...messages[activeChatRoomId]],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              isActive: true,
              participants: Array.from(new Set(messages[activeChatRoomId].map(msg => msg.sender.id)))
            }
          },
          activeThreadId: prev.activeThreadId || mainThreadId
        };
      });
    }
  }, [activeChatRoomId, messages, chatRooms]);
  
  // Set the active thread
  const setActiveThread = useCallback((threadId: string) => {
    setChatSpaceState(prev => ({
      ...prev,
      activeThreadId: threadId,
      isThreadViewOpen: true
    }));
  }, []);
  
  // Create a new thread from a specific message
  const createThread = useCallback((messageId: string, title: string) => {
    if (!activeChatRoomId) return;
    
    const message = messages[activeChatRoomId].find(m => m.id === messageId);
    if (!message) return;
    
    const threadId = `thread-${messageId}`;
    
    setChatSpaceState(prev => ({
      ...prev,
      threads: {
        ...prev.threads,
        [threadId]: {
          id: threadId,
          parentMessageId: messageId,
          title: title || `Thread: ${message.content.substring(0, 20)}...`,
          messages: [message],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isActive: true,
          participants: [message.sender.id]
        }
      },
      activeThreadId: threadId,
      isThreadViewOpen: true
    }));
    
    return threadId;
  }, [activeChatRoomId, messages]);
  
  // Reply to a specific message (either in main thread or create a new thread)
  const replyToMessage = useCallback((messageId: string, inNewThread: boolean = false) => {
    setChatSpaceState(prev => ({
      ...prev,
      replyingToMessageId: messageId
    }));
    
    if (inNewThread) {
      const message = activeChatRoomId && messages[activeChatRoomId].find(m => m.id === messageId);
      if (message) {
        createThread(messageId, `Reply to: ${message.content.substring(0, 20)}...`);
      }
    }
  }, [activeChatRoomId, messages, createThread]);
  
  // Send a message in the current active thread
  const sendThreadMessage = useCallback((content: string) => {
    if (!activeChatRoomId || !chatSpaceState.activeThreadId) return;
    
    // If replying to a specific message, we might want to handle that specially
    const replyingTo = chatSpaceState.replyingToMessageId;
    
    // Clear the replying state
    setChatSpaceState(prev => ({
      ...prev,
      replyingToMessageId: null
    }));
    
    // Use the existing chat context to send the message
    sendMessage(content);
    
    // In a real implementation, we'd associate this message with the thread
    // But for this mock, we'll let the useEffect handle updating the threads
  }, [activeChatRoomId, chatSpaceState.activeThreadId, chatSpaceState.replyingToMessageId, sendMessage]);
  
  // Toggle thread view open/closed
  const toggleThreadView = useCallback(() => {
    setChatSpaceState(prev => ({
      ...prev,
      isThreadViewOpen: !prev.isThreadViewOpen
    }));
  }, []);
  
  // Pin/unpin the chat space
  const togglePin = useCallback(() => {
    setChatSpaceState(prev => ({
      ...prev,
      isPinned: !prev.isPinned
    }));
  }, []);
  
  // Generate insights for the current thread
  const generateThreadInsights = useCallback(async () => {
    if (!activeChatRoomId || !chatSpaceState.activeThreadId) return;
    
    // In a real implementation, this would call an AI service
    // For now, we'll mock it with some delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const thread = chatSpaceState.threads[chatSpaceState.activeThreadId];
    if (!thread) return;
    
    // Mock insights generation
    const mockInsights: ChatInsight[] = [
      {
        id: `insight-1-${Date.now()}`,
        threadId: chatSpaceState.activeThreadId,
        content: 'Key topics: Project planning, resource allocation, timeline discussion',
        type: 'summary',
        createdAt: new Date().toISOString(),
        confidence: 0.92
      },
      {
        id: `insight-2-${Date.now()}`,
        threadId: chatSpaceState.activeThreadId,
        content: 'Action item: Schedule follow-up meeting next week',
        type: 'action',
        createdAt: new Date().toISOString(),
        confidence: 0.85
      },
      {
        id: `insight-3-${Date.now()}`,
        threadId: chatSpaceState.activeThreadId,
        content: 'Open question: Who will be responsible for the design work?',
        type: 'question',
        createdAt: new Date().toISOString(),
        confidence: 0.78
      }
    ];
    
    setChatSpaceState(prev => ({
      ...prev,
      insights: [...prev.insights, ...mockInsights]
    }));
    
    return mockInsights;
  }, [activeChatRoomId, chatSpaceState.activeThreadId, chatSpaceState.threads]);
  
  // Highlight specific messages (e.g., when searching)
  const highlightMessages = useCallback((messageIds: string[]) => {
    setChatSpaceState(prev => ({
      ...prev,
      highlightedMessageIds: messageIds
    }));
  }, []);
  
  // Clear highlighted messages
  const clearHighlights = useCallback(() => {
    setChatSpaceState(prev => ({
      ...prev,
      highlightedMessageIds: []
    }));
  }, []);
  
  return {
    // External chat context
    chatRooms,
    messages,
    activeChatRoomId,
    setActiveChatRoom,
    isPocoTyping,
    
    // Chat space specific state and functions
    chatSpaceState,
    setActiveThread,
    createThread,
    replyToMessage,
    sendThreadMessage,
    toggleThreadView,
    togglePin,
    generateThreadInsights,
    highlightMessages,
    clearHighlights
  };
}; 