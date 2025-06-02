import React from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TouchableOpacity, 
  StyleSheet,
  Platform,
  useWindowDimensions
} from 'react-native';
import { ChatRoom } from 'src/features/nest-space/chat-space/types/chat.types';
import { COLORS, SPACING, BREAKPOINTS } from '@constants/config';

interface ChatRoomListProps {
  chatRooms: ChatRoom[];
  activeChatRoomId: string | null;
  onSelectChatRoom: (id: string) => void;
  onClose?: () => void;
}

const ChatRoomList: React.FC<ChatRoomListProps> = ({ 
  chatRooms, 
  activeChatRoomId, 
  onSelectChatRoom,
  onClose
}) => {
  const { width: windowWidth } = useWindowDimensions();
  const isMobile = windowWidth < BREAKPOINTS.tablet;
  
  // チャットルームアイテムをレンダリング
  const renderChatRoomItem = ({ item }: { item: ChatRoom }) => {
    const isActive = activeChatRoomId === item.id;
    
    return (
      <TouchableOpacity 
        style={[
          styles.chatItem, 
          isActive && styles.selectedChat
        ]}
        onPress={() => {
          onSelectChatRoom(item.id);
          if (isMobile && onClose) {
            onClose();
          }
        }}
        accessibilityRole="button"
        accessibilityState={{ selected: isActive }}
      >
        <View style={styles.chatItemContent}>
          <View style={styles.avatarContainer}>
            <View style={styles.defaultAvatar}>
              <Text style={styles.avatarText}>{item.name[0]}</Text>
            </View>
          </View>
          <View style={styles.chatItemInfo}>
            <Text style={styles.chatName} numberOfLines={1} ellipsizeMode="tail">
              {item.name}
            </Text>
            {item.lastMessage && (
              <Text style={styles.lastMessage} numberOfLines={1} ellipsizeMode="tail">
                {item.lastMessage.content}
              </Text>
            )}
            {item.unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{item.unreadCount}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };
  
  // チャットルームリストのヘッダー
  const ListHeader = () => (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>チャットルーム</Text>
      {isMobile && (
        <TouchableOpacity 
          style={styles.closeButton} 
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="閉じる"
        >
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
      )}
    </View>
  );
  
  return (
    <View style={styles.container}>
      <FlatList
        data={chatRooms}
        renderItem={renderChatRoomItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={ListHeader}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  listContent: {
    paddingBottom: SPACING.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  closeButton: {
    padding: SPACING.xs,
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.lightGray,
  },
  closeButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  chatItem: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
    ...Platform.select({
      web: {
        cursor: 'pointer' as any,
      },
    }),
  },
  chatItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedChat: {
    backgroundColor: `${COLORS.primary}15`,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    marginRight: SPACING.sm,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: COLORS.lightGray,
  },
  defaultAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${COLORS.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  chatItemInfo: {
    flex: 1,
    position: 'relative',
  },
  chatName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
    color: COLORS.text,
    paddingRight: 30, // 未読バッジ用のスペース
  },
  lastMessage: {
    fontSize: 14,
    color: COLORS.lightText,
    paddingRight: 30, // 未読バッジ用のスペース
  },
  unreadBadge: {
    position: 'absolute',
    right: 5,
    top: '50%',
    marginTop: -10,
    backgroundColor: COLORS.primary,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default ChatRoomList; 