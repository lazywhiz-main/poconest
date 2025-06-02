import React, { useEffect } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { useNestSpace } from '@contexts/NestSpaceContext';
import { SpaceType } from '../../types/nestSpace.types';
import ChatSpace from '../components/ChatSpace';
import { useNest } from '../../../nest/contexts/NestContext';

// This is a custom hook that provides a wrapper over useChatSpace 
// which we'll create next as a provider
const ChatSpaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Eventually implement provider logic for chat-space specific state
  // For now, we pass through as the hook is doing all the work
  return <>{children}</>;
};

// Main screen component
const ChatSpaceScreen: React.FC = () => {
  const { navigateToSpace, isSpaceActive } = useNestSpace();
  const { currentNest } = useNest();
  
  // Ensure the chat space is activated
  useEffect(() => {
    if (!isSpaceActive(SpaceType.CHAT)) {
      navigateToSpace(SpaceType.CHAT);
    }
  }, [isSpaceActive, navigateToSpace]);
  
  if (!currentNest) {
    return (
      <View style={styles.container}>
        <Text>NEST情報を取得中...</Text>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <ChatSpaceProvider>
        <ChatSpace nestId={currentNest.id} />
      </ChatSpaceProvider>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
});

export default ChatSpaceScreen; 