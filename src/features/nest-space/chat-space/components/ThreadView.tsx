import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView
} from 'react-native';
import { useChatSpace, Thread } from '../hooks/useChatSpace';
import { useThreadNavigation } from '../hooks/useThreadNavigation';

interface ThreadItemProps {
  thread: Thread;
  isActive: boolean;
  isExpanded: boolean;
  childThreads?: Thread[];
  onSelect: (threadId: string) => void;
  onToggleExpansion: (threadId: string) => void;
}

const ThreadItem: React.FC<ThreadItemProps> = ({
  thread,
  isActive,
  isExpanded,
  childThreads = [],
  onSelect,
  onToggleExpansion
}) => {
  // Calculate some derived values for display
  const hasChildren = childThreads && childThreads.length > 0;
  const lastMessage = thread.messages[thread.messages.length - 1];
  const lastMessageTime = new Date(lastMessage?.created_at || thread.updatedAt);
  const formattedTime = lastMessageTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  return (
    <View style={styles.threadItemContainer}>
      <TouchableOpacity
        style={[
          styles.threadItem,
          isActive && styles.activeThreadItem
        ]}
        onPress={() => onSelect(thread.id)}
      >
        <View style={styles.threadItemContent}>
          <Text style={styles.threadTitle} numberOfLines={1}>{thread.title}</Text>
          <Text style={styles.threadPreview} numberOfLines={1}>
            {lastMessage ? lastMessage.content : 'スレッドが開始されました'}
          </Text>
          
          <View style={styles.threadMetaRow}>
            <Text style={styles.threadTime}>{formattedTime}</Text>
            <Text style={styles.threadMessageCount}>{thread.messages.length} メッセージ</Text>
          </View>
        </View>
      </TouchableOpacity>
      
      {hasChildren && (
        <TouchableOpacity 
          style={styles.expandButton}
          onPress={() => onToggleExpansion(thread.id)}
        >
          <Text>{isExpanded ? '▼' : '▶'}</Text>
        </TouchableOpacity>
      )}
      
      {isExpanded && hasChildren && (
        <View style={styles.childThreads}>
          {childThreads.map(childThread => (
            <TouchableOpacity
              key={childThread.id}
              style={[
                styles.childThreadItem,
                isActive && childThread.id === thread.id && styles.activeThreadItem
              ]}
              onPress={() => onSelect(childThread.id)}
            >
              <Text style={styles.childThreadTitle} numberOfLines={1}>
                {childThread.title}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

interface ThreadViewProps {
  onClose?: () => void;
}

const ThreadView: React.FC<ThreadViewProps> = ({ onClose }) => {
  const { chatSpaceState, setActiveThread } = useChatSpace();
  const { navigationState, toggleThreadExpansion, searchThreads, clearSearch, getThreadHierarchy, isThreadVisible } = useThreadNavigation();
  
  const [searchText, setSearchText] = useState('');
  
  const { mainThreads, childThreads } = getThreadHierarchy();
  
  const handleSearch = (text: string) => {
    setSearchText(text);
    if (text.trim() === '') {
      clearSearch();
    } else {
      searchThreads(text);
    }
  };
  
  const handleThreadSelect = (threadId: string) => {
    setActiveThread(threadId);
    if (onClose) {
      onClose();
    }
  };
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>スレッド</Text>
        {onClose && (
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.closeButton}>✕</Text>
          </TouchableOpacity>
        )}
      </View>
      
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="スレッドを検索..."
          value={searchText}
          onChangeText={handleSearch}
        />
      </View>
      
      <ScrollView style={styles.threadList}>
        {mainThreads
          .filter(thread => isThreadVisible(thread.id))
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
          .map(thread => (
            <ThreadItem
              key={thread.id}
              thread={thread}
              isActive={thread.id === chatSpaceState.activeThreadId}
              isExpanded={!!navigationState.expandedThreads[thread.id]}
              childThreads={childThreads[thread.id] || []}
              onSelect={handleThreadSelect}
              onToggleExpansion={toggleThreadExpansion}
            />
          ))
        }
        
        {/* Show when there are no threads or no search results */}
        {mainThreads.length === 0 && (
          <Text style={styles.emptyMessage}>スレッドがありません</Text>
        )}
        
        {mainThreads.length > 0 && 
          navigationState.isSearching && 
          !mainThreads.some(thread => isThreadVisible(thread.id)) && (
          <Text style={styles.emptyMessage}>検索結果がありません</Text>
        )}
      </ScrollView>
      
      <View style={styles.footer}>
        <TouchableOpacity style={styles.newThreadButton}>
          <Text style={styles.newThreadButtonText}>新規スレッド</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderLeftWidth: 1,
    borderLeftColor: '#E0E0E0',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  closeButton: {
    fontSize: 18,
  },
  searchContainer: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  searchInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  threadList: {
    flex: 1,
  },
  threadItemContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  threadItem: {
    padding: 12,
    backgroundColor: '#FFFFFF',
  },
  activeThreadItem: {
    backgroundColor: '#E3F2FD',
  },
  threadItemContent: {
    flex: 1,
  },
  threadTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  threadPreview: {
    fontSize: 12,
    color: '#757575',
    marginBottom: 4,
  },
  threadMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  threadTime: {
    fontSize: 10,
    color: '#9E9E9E',
  },
  threadMessageCount: {
    fontSize: 10,
    color: '#9E9E9E',
  },
  expandButton: {
    position: 'absolute',
    right: 8,
    top: 12,
    padding: 8,
  },
  childThreads: {
    marginLeft: 16,
  },
  childThreadItem: {
    padding: 8,
    backgroundColor: '#F8F8F8',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  childThreadTitle: {
    fontSize: 12,
  },
  emptyMessage: {
    padding: 16,
    textAlign: 'center',
    color: '#9E9E9E',
  },
  footer: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  newThreadButton: {
    backgroundColor: '#1E88E5',
    borderRadius: 4,
    padding: 12,
    alignItems: 'center',
  },
  newThreadButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});

export default ThreadView; 