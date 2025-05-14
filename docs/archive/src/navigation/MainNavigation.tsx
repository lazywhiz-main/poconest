import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet, Button, ActivityIndicator } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';

// スクリーンのインポート
import ZoomScreen from '../screens/ZoomScreen';
import ChatScreen from '../screens/ChatScreen';
import BoardScreen from '../screens/BoardScreen';

// プロフィール画面
const ProfileScreen = () => {
  const { user, signOut, loading } = useAuth();

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      console.error('Error signing out:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>プロフィール</Text>
      
      {user ? (
        <View style={styles.profileInfo}>
          <Text style={styles.label}>メールアドレス</Text>
          <Text style={styles.value}>{user.email}</Text>
          
          <Text style={styles.label}>ユーザーID</Text>
          <Text style={styles.value}>{user.id}</Text>
          
          <Button 
            title="ログアウト" 
            onPress={handleSignOut}
            color="#FF3B30"
          />
        </View>
      ) : (
        <View>
          <Text>ログインしていません</Text>
        </View>
      )}
    </View>
  );
};

// タイプ定義
export type MainTabParamList = {
  Chat: undefined;
  Board: undefined;
  Zoom: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Main: undefined;
  Login: undefined;
  Register: undefined;
};

// タブナビゲーター
const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

// メインのタブナビゲーション
export const MainTabNavigator = () => {
  return (
    <Tab.Navigator
      id={undefined}
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'help-outline';

          if (route.name === 'Chat') {
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          } else if (route.name === 'Board') {
            iconName = focused ? 'albums' : 'albums-outline';
          } else if (route.name === 'Zoom') {
            iconName = focused ? 'videocam' : 'videocam-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#0066cc',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="Chat" 
        component={ChatScreen} 
        options={{ title: 'チャット' }}
      />
      <Tab.Screen 
        name="Board" 
        component={BoardScreen} 
        options={{ title: 'ボード' }}
      />
      <Tab.Screen 
        name="Zoom" 
        component={ZoomScreen} 
        options={{ title: 'Zoom' }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen} 
        options={{ title: 'プロフィール' }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  profileInfo: {
    width: '100%',
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  value: {
    fontSize: 18,
    marginBottom: 15,
  },
}); 