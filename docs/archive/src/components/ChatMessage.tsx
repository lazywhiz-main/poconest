import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BrandColors } from '../constants/Colors';
import { Message } from '../types/chat';

interface ChatMessageProps {
  message: Message;
  isUserMessage: boolean;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, isUserMessage }) => {
  return (
    <View style={[
      styles.container, 
      isUserMessage ? styles.userContainer : styles.pocoContainer
    ]}>
      <View style={[
        styles.bubble,
        isUserMessage ? styles.userBubble : styles.pocoBubble
      ]}>
        <Text style={[
          styles.text,
          isUserMessage ? styles.userText : styles.pocoText
        ]}>
          {message.content}
        </Text>
        <Text style={[
          styles.timestamp,
          isUserMessage ? styles.userTimestamp : styles.pocoTimestamp
        ]}>
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 6,
    marginHorizontal: 12,
    flexDirection: 'row',
  },
  userContainer: {
    justifyContent: 'flex-end',
  },
  pocoContainer: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '70%',
    padding: 12,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  userBubble: {
    backgroundColor: BrandColors.primary,
    borderBottomRightRadius: 4,
  },
  pocoBubble: {
    backgroundColor: '#F5F5F5',
    borderBottomLeftRadius: 4,
  },
  text: {
    fontSize: 16,
    lineHeight: 22,
  },
  userText: {
    color: '#FFFFFF',
  },
  pocoText: {
    color: '#333333',
  },
  timestamp: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  userTimestamp: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  pocoTimestamp: {
    color: '#999999',
  },
}); 