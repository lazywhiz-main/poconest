import React from 'react';
import { View } from 'react-native';

// Web環境では、SafeAreaProviderは単にコンテンツを渡すラッパーとして機能します
const SafeAreaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <View style={{ flex: 1 }}>{children}</View>;
};

// SafeAreaViewもWebでは普通のViewとして扱います
const SafeAreaView: React.FC<{ style?: any; children: React.ReactNode }> = ({ style, children }) => {
  return <View style={[{ flex: 1 }, style]}>{children}</View>;
};

export { SafeAreaProvider, SafeAreaView }; 