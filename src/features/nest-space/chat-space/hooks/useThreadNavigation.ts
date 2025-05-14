import { useCallback, useState, useEffect } from 'react';
import { useChatSpace, Thread } from './useChatSpace';

interface ThreadNavigationState {
  threadHistory: string[];
  expandedThreads: Record<string, boolean>;
  searchTerm: string;
  filteredThreadIds: string[];
  isSearching: boolean;
}

/**
 * Hook to manage thread navigation and search functionality
 */
export const useThreadNavigation = () => {
  const { 
    chatSpaceState, 
    setActiveThread,
    createThread
  } = useChatSpace();
  
  const [navigationState, setNavigationState] = useState<ThreadNavigationState>({
    threadHistory: [],
    expandedThreads: {},
    searchTerm: '',
    filteredThreadIds: [],
    isSearching: false
  });
  
  // Update history when active thread changes
  useEffect(() => {
    const activeThreadId = chatSpaceState.activeThreadId;
    if (activeThreadId) {
      setNavigationState(prev => {
        // Don't add duplicate entries in a row
        if (prev.threadHistory[prev.threadHistory.length - 1] === activeThreadId) {
          return prev;
        }
        
        return {
          ...prev,
          threadHistory: [...prev.threadHistory, activeThreadId]
        };
      });
    }
  }, [chatSpaceState.activeThreadId]);
  
  // Navigate to previous thread
  const goBack = useCallback(() => {
    if (navigationState.threadHistory.length <= 1) return;
    
    const newHistory = [...navigationState.threadHistory];
    newHistory.pop(); // Remove current thread
    const previousThreadId = newHistory[newHistory.length - 1];
    
    if (previousThreadId) {
      setActiveThread(previousThreadId);
      
      setNavigationState(prev => ({
        ...prev,
        threadHistory: newHistory
      }));
    }
  }, [navigationState.threadHistory, setActiveThread]);
  
  // Toggle thread expansion in the thread list
  const toggleThreadExpansion = useCallback((threadId: string) => {
    setNavigationState(prev => ({
      ...prev,
      expandedThreads: {
        ...prev.expandedThreads,
        [threadId]: !prev.expandedThreads[threadId]
      }
    }));
  }, []);
  
  // Search threads by content or title
  const searchThreads = useCallback((term: string) => {
    if (!term.trim()) {
      setNavigationState(prev => ({
        ...prev,
        searchTerm: '',
        filteredThreadIds: [],
        isSearching: false
      }));
      return;
    }
    
    setNavigationState(prev => ({
      ...prev,
      searchTerm: term,
      isSearching: true
    }));
    
    // Perform search
    const searchTermLower = term.toLowerCase();
    const matchingThreadIds = Object.values(chatSpaceState.threads)
      .filter(thread => {
        // Search in title
        if (thread.title.toLowerCase().includes(searchTermLower)) {
          return true;
        }
        
        // Search in messages
        return thread.messages.some(message => 
          message.content.toLowerCase().includes(searchTermLower)
        );
      })
      .map(thread => thread.id);
    
    setNavigationState(prev => ({
      ...prev,
      filteredThreadIds: matchingThreadIds
    }));
  }, [chatSpaceState.threads]);
  
  // Clear search results
  const clearSearch = useCallback(() => {
    setNavigationState(prev => ({
      ...prev,
      searchTerm: '',
      filteredThreadIds: [],
      isSearching: false
    }));
  }, []);
  
  // Create a new thread (e.g. from button press rather than from message)
  const startNewThread = useCallback((title: string = 'New Thread') => {
    const activeThreadId = chatSpaceState.activeThreadId;
    if (!activeThreadId) return null;
    
    // Get the first message from the current thread as the parent
    const currentThread = chatSpaceState.threads[activeThreadId];
    if (!currentThread || !currentThread.messages.length) return null;
    
    const parentMessageId = currentThread.messages[0].id;
    return createThread(parentMessageId, title);
  }, [chatSpaceState.activeThreadId, chatSpaceState.threads, createThread]);
  
  // Get threads organized by hierarchy
  const getThreadHierarchy = useCallback(() => {
    const threads = Object.values(chatSpaceState.threads);
    const mainThreads: Thread[] = [];
    const childThreads: Record<string, Thread[]> = {};
    
    threads.forEach(thread => {
      if (!thread.parentMessageId) {
        mainThreads.push(thread);
      } else {
        const parentMessageId = thread.parentMessageId;
        
        // Find which thread contains this message
        for (const potentialParent of threads) {
          const hasParentMessage = potentialParent.messages.some(m => m.id === parentMessageId);
          
          if (hasParentMessage) {
            if (!childThreads[potentialParent.id]) {
              childThreads[potentialParent.id] = [];
            }
            childThreads[potentialParent.id].push(thread);
            break;
          }
        }
      }
    });
    
    return { mainThreads, childThreads };
  }, [chatSpaceState.threads]);
  
  // Check if a thread is visible based on search state
  const isThreadVisible = useCallback((threadId: string) => {
    if (!navigationState.isSearching) return true;
    return navigationState.filteredThreadIds.includes(threadId);
  }, [navigationState.isSearching, navigationState.filteredThreadIds]);
  
  return {
    navigationState,
    goBack,
    toggleThreadExpansion,
    searchThreads,
    clearSearch,
    startNewThread,
    getThreadHierarchy,
    isThreadVisible
  };
}; 