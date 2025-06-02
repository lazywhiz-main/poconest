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
import { UIMessage } from '../types/chat.types';

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

export interface ThreadViewProps {
  thread: Thread;
  messages: UIMessage[];
  onClose: () => void;
  onReply: (messageId: string) => void;
}

const ThreadView: React.FC<ThreadViewProps> = ({
  thread,
  messages,
  onClose,
  onReply
}) => {
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
        <TouchableOpacity onPress={onClose}>
          <Text style={styles.closeButton}>×</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.messages}>
        {messages.map(message => (
          <View key={message.id} style={styles.messageContainer}>
            <View style={styles.messageHeader}>
              <Text style={styles.senderName}>{message.sender.name}</Text>
              <Text style={styles.timestamp}>
                {new Date(message.created_at).toLocaleTimeString()}
              </Text>
            </View>
            <Text style={styles.messageContent}>{message.content}</Text>
            <TouchableOpacity
              style={styles.replyButton}
              onPress={() => onReply(message.id)}
            >
              <Text style={styles.replyButtonText}>返信</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    fontSize: 24,
    color: '#666',
  },
  messages: {
    flex: 1,
  },
  messageContainer: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  senderName: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  timestamp: {
    color: '#666',
    fontSize: 12,
  },
  messageContent: {
    fontSize: 14,
    lineHeight: 20,
  },
  replyButton: {
    marginTop: 8,
  },
  replyButtonText: {
    color: '#666',
    fontSize: 12,
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
});

export default ThreadView; 