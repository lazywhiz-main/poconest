import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { ThemeProvider } from './src/contexts/ThemeContext';
import { BoardProvider } from './src/contexts/BoardContext';
import { ChatProvider } from './src/contexts/ChatContext';
import { MockChatProvider } from './src/contexts/MockChatContext';
import { InsightProvider } from './src/contexts/InsightContext';
import { NestProvider } from './src/contexts/NestContext';
import { InsightService } from './src/services/insightService';
import MainTabNavigator from './src/navigation/MainTabNavigator';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';

const Stack = createNativeStackNavigator();

// APIキーの設定
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

// サービスの初期化
const insightService = new InsightService(OPENAI_API_KEY);

// Navigation - 認証状態に応じたナビゲーション
function Navigation() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4D96FF" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {user ? (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Main" component={MainTabNavigator} />
        </Stack.Navigator>
      ) : (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </Stack.Navigator>
      )}
      <StatusBar style="auto" />
    </NavigationContainer>
  );
}

// アプリのルートコンポーネント
export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <ThemeProvider>
          <NestProvider>
            <BoardProvider>
              {/* リアルタイムチャットのRLSに問題があるため、モック版を使用 */}
              <MockChatProvider>
                <InsightProvider insightService={insightService}>
                  <Navigation />
                </InsightProvider>
              </MockChatProvider>
            </BoardProvider>
          </NestProvider>
        </ThemeProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF9EA',
  },
}); 