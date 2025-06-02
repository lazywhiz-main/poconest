import React from 'react';
import { View, StyleSheet, FlatList, Text, TouchableOpacity } from 'react-native';
import { UIMessage } from '../types/chat.types';

export interface MessageListProps {
  messages: UIMessage[];
  onReply: (messageId: string, inNewThread?: boolean) => void;
  highlightedMessageIds: string[];
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  onReply,
  highlightedMessageIds
}) => {
  const renderMessage = ({ item: message }: { item: UIMessage }) => (
    <View
      style={[
        styles.messageContainer,
        highlightedMessageIds.includes(message.id) && styles.highlightedMessage
      ]}
    >
      <View style={styles.messageHeader}>
        <Text style={styles.senderName}>{message.sender.name}</Text>
        <Text style={styles.timestamp}>
          {new Date(message.created_at).toLocaleTimeString()}
        </Text>
      </View>
      <Text style={styles.messageContent}>{message.content}</Text>
      <View style={styles.messageActions}>
        <TouchableOpacity
          style={styles.replyButton}
          onPress={() => onReply(message.id)}
        >
          <Text style={styles.replyButtonText}>返信</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <FlatList
      data={messages}
      renderItem={renderMessage}
      keyExtractor={message => message.id}
      style={styles.container}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  messageContainer: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  highlightedMessage: {
    backgroundColor: '#fff3e0',
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
  messageActions: {
    flexDirection: 'row',
    marginTop: 8,
  },
  replyButton: {
    padding: 4,
  },
  replyButtonText: {
    color: '#666',
    fontSize: 12,
  },
}); 