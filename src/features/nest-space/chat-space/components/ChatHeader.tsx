import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Platform
} from 'react-native';
import { useNestSpace } from '@contexts/NestSpaceContext';
import { useChatSpace } from '../hooks/useChatSpace';
import { useThreadNavigation } from '../hooks/useThreadNavigation';
import { LayoutType, SpaceType } from '../../types/nestSpace.types';

// Placeholder for icons - in a real implementation, you'd import from a library
const Icon = ({ name, size = 20, color = '#000' }: { name: string; size?: number; color?: string }) => (
  <Text style={{ fontSize: size, color }}>{name === 'search' ? '🔍' : name === 'plus' ? '➕' : name === 'thread' ? '🧵' : name === 'pin' ? '📌' : name === 'back' ? '←' : name === 'settings' ? '⚙️' : '•'}</Text>
);

interface ChatHeaderProps {
  onToggleThreadView?: () => void;
  onToggleSettings?: () => void;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({
  onToggleThreadView,
  onToggleSettings
}) => {
  const { spaceState, getSpaceMetadata } = useNestSpace();
  const { chatRooms, activeChatRoomId, chatSpaceState, togglePin } = useChatSpace();
  const { navigationState, searchThreads, clearSearch, startNewThread } = useThreadNavigation();
  
  const [isSearching, setIsSearching] = useState(false);
  const [searchText, setSearchText] = useState('');
  
  const chatMetadata = getSpaceMetadata(SpaceType.CHAT);
  const activeChatRoom = chatRooms.find(room => room.id === activeChatRoomId);
  const activeThread = chatSpaceState.activeThreadId 
    ? chatSpaceState.threads[chatSpaceState.activeThreadId] 
    : null;
  
  const isMobile = spaceState.layoutType === LayoutType.MOBILE;
  
  // Count online members from presence
  const onlineMembers = spaceState.memberPresence.filter(member => member.online);
  
  const handleSearch = () => {
    if (isSearching) {
      clearSearch();
      setSearchText('');
    }
    setIsSearching(!isSearching);
  };
  
  const handleSearchSubmit = () => {
    searchThreads(searchText);
  };
  
  const handleStartNewThread = () => {
    startNewThread('New Thread');
  };
  
  return (
    <View style={styles.container}>
      <View style={styles.leftSection}>
        {activeThread && activeThread.parentMessageId && (
          <TouchableOpacity style={styles.backButton} onPress={() => onToggleThreadView && onToggleThreadView()}>
            <Icon name="back" />
          </TouchableOpacity>
        )}
        
        <View style={styles.titleContainer}>
          <Text style={styles.title}>
            {activeThread ? activeThread.title : activeChatRoom ? activeChatRoom.name : 'チャット空間'}
          </Text>
          {activeChatRoom && (
            <Text style={styles.subtitle}>
              {activeChatRoom.description || '会話スレッド'}
            </Text>
          )}
        </View>
      </View>
      
      <View style={styles.rightSection}>
        {isSearching ? (
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="検索..."
              value={searchText}
              onChangeText={setSearchText}
              onSubmitEditing={handleSearchSubmit}
              autoFocus
            />
            <TouchableOpacity style={styles.iconButton} onPress={() => setIsSearching(false)}>
              <Text>✕</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.presenceContainer}>
              <Text style={styles.presenceText}>
                {onlineMembers.length} オンライン
              </Text>
              <View style={styles.presenceIndicators}>
                {spaceState.memberPresence.slice(0, 3).map(member => (
                  <View
                    key={member.userId}
                    style={[
                      styles.presenceIndicator,
                      { backgroundColor: member.online ? '#4CAF50' : '#9E9E9E' }
                    ]}
                  />
                ))}
              </View>
            </View>
            
            {!isMobile && (
              <>
                <TouchableOpacity style={styles.iconButton} onPress={handleSearch}>
                  <Icon name="search" />
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.iconButton} onPress={handleStartNewThread}>
                  <Icon name="plus" />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.iconButton} 
                  onPress={() => onToggleThreadView && onToggleThreadView()}
                >
                  <Icon name="thread" />
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.iconButton} onPress={togglePin}>
                  <Icon name="pin" color={chatSpaceState.isPinned ? '#1E88E5' : undefined} />
                </TouchableOpacity>
              </>
            )}
            
            <TouchableOpacity 
              style={styles.iconButton}
              onPress={() => onToggleSettings && onToggleSettings()}
            >
              <Icon name="settings" />
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    backgroundColor: '#F5F5F5',
    height: 56,
    minHeight: 56,
    maxHeight: 56,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    marginRight: 8,
  },
  titleContainer: {
    flexDirection: 'column',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 12,
    color: '#757575',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  presenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  presenceText: {
    fontSize: 12,
    color: '#757575',
    marginRight: 4,
  },
  presenceIndicators: {
    flexDirection: 'row',
  },
  presenceIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 2,
  },
  iconButton: {
    padding: 8,
    marginLeft: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    paddingHorizontal: 8,
    flex: 1,
    maxWidth: 300,
  },
  searchInput: {
    flex: 1,
    height: 36,
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      },
    }),
  },
});

export default ChatHeader; 