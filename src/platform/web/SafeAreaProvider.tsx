import React from 'react';
import { View } from 'react-native';

// Web環境では、SafeAreaProviderは単にコンテンツを渡すラッパーとして機能します
export const SafeAreaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => <>{children}</>;

// SafeAreaViewもWebでは普通のViewとして扱います
const SafeAreaView: React.FC<{ style?: any; children: React.ReactNode }> = ({ style, children }) => {
  return <View style={[{ flex: 1 }, style]}>{children}</View>;
};

export const useSafeAreaInsets = () => ({ top: 0, bottom: 0, left: 0, right: 0 });

export { SafeAreaView }; 