import React from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { UIMessage } from '../types/chat.types';
import ChatMessage from './ChatMessage';

export interface MessageListProps {
  messages: UIMessage[];
  onReply: (message: any) => void;
  onSave?: (message: any) => void;
  onHighlight?: (messageIds: string[]) => void;
  onClearHighlights?: () => void;
  highlightedMessageIds?: string[];
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  onReply,
  onSave,
  onHighlight,
  onClearHighlights,
  highlightedMessageIds = []
}) => {
  return (
    <FlatList
      data={messages}
      keyExtractor={item => item.id}
      renderItem={({ item }) => (
        <ChatMessage
          message={item}
          onReply={onReply}
          onSave={onSave}
          onHighlight={onHighlight}
          onClearHighlights={onClearHighlights}
          isHighlighted={highlightedMessageIds.includes(item.id)}
        />
      )}
      contentContainerStyle={styles.content}
    />
  );
};

const styles = StyleSheet.create({
  content: {
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
});

export default MessageList; 