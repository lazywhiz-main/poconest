import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { UIMessage } from '../types/chat.types';

export interface ChatMessageProps {
  message: UIMessage;
  onReply: (message: any) => void;
  onSave?: (message: any) => void;
  onHighlight?: (messageIds: string[]) => void;
  onClearHighlights?: () => void;
  isHighlighted?: boolean;
}

const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  onReply,
  onSave,
  onHighlight,
  onClearHighlights,
  isHighlighted = false
}) => {
  const handleReply = () => {
    onReply(message);
  };

  const handleSave = () => {
    if (onSave) {
      onSave(message);
    }
  };

  const handleHighlight = () => {
    if (onHighlight) {
      onHighlight([message.id]);
    }
  };

  const handleClearHighlight = () => {
    if (onClearHighlights) {
      onClearHighlights();
    }
  };

  return (
    <View
      style={[
        styles.messageContainer,
        isHighlighted && styles.highlightedMessage
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
          style={styles.actionButton}
          onPress={handleReply}
        >
          <Text style={styles.actionButtonText}>返信</Text>
        </TouchableOpacity>
        {onSave && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleSave}
          >
            <Text style={styles.actionButtonText}>保存</Text>
          </TouchableOpacity>
        )}
        {onHighlight && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={isHighlighted ? handleClearHighlight : handleHighlight}
          >
            <Text style={styles.actionButtonText}>
              {isHighlighted ? 'ハイライト解除' : 'ハイライト'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
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
  actionButton: {
    padding: 4,
    marginRight: 8,
  },
  actionButtonText: {
    color: '#666',
    fontSize: 12,
  },
});

export default ChatMessage; 