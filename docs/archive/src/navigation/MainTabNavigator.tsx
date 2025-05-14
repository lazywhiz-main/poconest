import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StyleSheet, TouchableOpacity, View, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BrandColors } from '../constants/Colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BoardColumnType } from '../types/board';

// スクリーン
import HomeScreen from '../screens/HomeScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ChatScreen from '../screens/ChatScreen';
import BoardScreen from '../screens/BoardScreen';
import ExploreScreen from '../screens/ExploreScreen';
import CreateNestScreen from '../screens/CreateNestScreen';
import NestSettingsScreen from '../screens/NestSettingsScreen';

// タブナビゲーション用のタイプ
export type MainTabParamList = {
  Home: undefined;
  Chat: undefined;
  Board: { initialTab?: BoardColumnType };
  Explore: undefined;
  Profile: undefined;
};

// スタックナビゲーションの型定義
type RootStackParamList = {
  TabsScreen: undefined;
  CreateNest: undefined;
  NestSettings: { nestId: string };
};

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

// タブナビゲーション
function TabsScreen() {
  // SafeAreaの値を取得
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: BrandColors.primary,
        tabBarInactiveTintColor: BrandColors.text.tertiary,
        tabBarStyle: {
          backgroundColor: BrandColors.backgroundVariants.light,
          borderTopWidth: 1,
          borderTopColor: '#eee',
          height: Platform.OS === 'ios' ? 50 + Math.max(insets.bottom, 0) : 60,
          paddingBottom: Platform.OS === 'ios' ? Math.max(insets.bottom, 0) : 0,
          shadowOpacity: 0, // 影を削除
          elevation: 0, // Android用の影を削除
        },
        tabBarItemStyle: {
          paddingTop: 8, // 上部のパディングを追加
        },
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: 'bold',
        },
        headerStyle: {
          backgroundColor: BrandColors.backgroundVariants.light,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: '#eee',
        },
        headerTitleStyle: {
          color: BrandColors.text.primary,
          fontWeight: 'bold',
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'ホーム',
          tabBarLabel: 'ホーム',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Chat"
        component={ChatScreen}
        options={{
          title: 'チャット',
          tabBarLabel: 'チャット',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubble-outline" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Board"
        component={BoardScreen}
        options={{
          title: 'ボード',
          tabBarLabel: 'ボード',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid-outline" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Explore"
        component={ExploreScreen}
        options={{
          title: '探索',
          tabBarLabel: '探索',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="compass-outline" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'プロフィール',
          tabBarLabel: 'プロフィール',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export const MainTabNavigator = () => {
  // SafeAreaの値を取得
  const insets = useSafeAreaInsets();
  
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="TabsScreen" component={TabsScreen} />
      <Stack.Screen 
        name="CreateNest" 
        component={CreateNestScreen} 
        options={{
          headerShown: true,
          headerTitle: '新しいNestを作成',
          headerTitleStyle: {
            color: BrandColors.text.primary,
          },
          headerTintColor: BrandColors.primary,
        }}
      />
      <Stack.Screen 
        name="NestSettings" 
        component={NestSettingsScreen} 
        options={{
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 5,
  },
});

export default MainTabNavigator; 