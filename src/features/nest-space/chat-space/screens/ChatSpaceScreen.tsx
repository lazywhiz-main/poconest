import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useNestSpace } from '@contexts/NestSpaceContext';
import { SpaceType } from '../../types/nestSpace.types';
import ChatSpace from '../components/ChatSpace';

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
  
  // Ensure the chat space is activated
  useEffect(() => {
    if (!isSpaceActive(SpaceType.CHAT)) {
      navigateToSpace(SpaceType.CHAT);
    }
  }, [isSpaceActive, navigateToSpace]);
  
  return (
    <View style={styles.container}>
      <ChatSpaceProvider>
        <ChatSpace />
      </ChatSpaceProvider>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'pink',
  },
});

export default ChatSpaceScreen; 