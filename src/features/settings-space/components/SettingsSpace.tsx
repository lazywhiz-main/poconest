import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface SettingsSpaceProps {
  // 必要に応じてpropsを追加
}

const SettingsSpace: React.FC<SettingsSpaceProps> = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>設定空間</Text>
      <Text style={styles.description}>
        ここには巣の設定、メンバー管理、通知設定などが表示されます。
        このコンポーネントは現在開発中です。
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#424242',
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    color: '#616161',
    maxWidth: 400,
  },
});

export default SettingsSpace; 