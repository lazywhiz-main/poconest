import React, { useEffect } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { useNestSpace } from '@contexts/NestSpaceContext';
import { SpaceType } from '../../types/nestSpace.types';
import ChatSpace from '../components/ChatSpace';
import { useNest } from '../../../nest/contexts/NestContext';
import { useAuth } from '../../../contexts/AuthContext';
import { Navigate } from 'react-router-dom';

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
  const { user } = useAuth();
  
  // Ensure the chat space is activated
  useEffect(() => {
    if (!isSpaceActive(SpaceType.CHAT)) {
      navigateToSpace(SpaceType.CHAT);
    }
  }, [isSpaceActive, navigateToSpace]);
  
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  if (!currentNest) {
    return (
      <View style={styles.container}>
        <Text>NESTが選択されていません。Nest一覧から選択してください。</Text>
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