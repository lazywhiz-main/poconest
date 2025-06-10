import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AIProviderSelector } from '../../../components/AIProviderSelector';

interface SettingsSpaceProps {
  // 必要に応じてpropsを追加
}

const SettingsSpace: React.FC<SettingsSpaceProps> = () => {
  const [selectedProvider, setSelectedProvider] = useState<'openai' | 'gemini'>('openai');
  const [enableFallback, setEnableFallback] = useState(true);

  const handleProviderChange = (provider: 'openai' | 'gemini') => {
    setSelectedProvider(provider);
    // ここで設定をサーバーに保存
  };

  const handleFallbackChange = (enabled: boolean) => {
    setEnableFallback(enabled);
    // ここで設定をサーバーに保存
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>設定空間</Text>
      <Text style={styles.description}>
        巣の設定、AI機能の設定、メンバー管理などを行えます。
      </Text>
      
      <View style={styles.settingsSection}>
        <Text style={styles.sectionTitle}>AI プロバイダー設定</Text>
        <Text style={styles.sectionDescription}>
          AI機能で使用するプロバイダーを選択できます
        </Text>
        <AIProviderSelector 
          selectedProvider={selectedProvider}
          onProviderChange={handleProviderChange}
          enableFallback={enableFallback}
          onFallbackChange={handleFallbackChange}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#424242',
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    color: '#616161',
    maxWidth: 400,
    alignSelf: 'center',
    marginBottom: 32,
  },
  settingsSection: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#424242',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#616161',
    marginBottom: 16,
  },
});

export default SettingsSpace; 