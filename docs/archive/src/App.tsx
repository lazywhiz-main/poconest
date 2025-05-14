import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './contexts/AuthContext';
import { NestProvider } from './contexts/NestContext';
import AuthNavigator from './navigation/AuthNavigator';
import { ChatProvider } from './contexts/ChatContext';
import { MockChatProvider } from './contexts/MockChatContext';
import { BoardProvider } from './contexts/BoardContext';
import { ToastProvider } from './contexts/ToastContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { InsightProvider } from './contexts/InsightContext';

// カスタムナビゲーションテーマ
const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#3498db',
    background: '#f8f9fa',
    card: '#ffffff',
    text: '#2c3e50',
    border: '#e1e1e1',
    notification: '#e74c3c',
  },
};

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer theme={theme}>
        <StatusBar style="auto" />
        <ThemeProvider>
          <AuthProvider>
            <NestProvider>
              {/* ChatProviderの代わりにMockChatProviderを使用 */}
              <MockChatProvider>
                <BoardProvider>
                  <InsightProvider>
                    <ToastProvider>
                      <AuthNavigator />
                    </ToastProvider>
                  </InsightProvider>
                </BoardProvider>
              </MockChatProvider>
            </NestProvider>
          </AuthProvider>
        </ThemeProvider>
      </NavigationContainer>
    </SafeAreaProvider>
  );
} 