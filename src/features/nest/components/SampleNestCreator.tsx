import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useAuth } from '../../../contexts/AuthContext';
import { SampleNestService } from '../services/sampleNestService';

export const SampleNestCreator: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const sampleNestService = new SampleNestService();

  const handleCreateSampleNests = async () => {
    if (!user) {
      setError('ユーザーがログインしていません');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await sampleNestService.createSampleNests(user.id);
      // 成功時の処理（例：リロードやナビゲーション）
    } catch (err) {
      setError('サンプルNESTの作成に失敗しました');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>サンプルNESTを作成</Text>
      <Text style={styles.description}>
        開発チーム、デザインチーム、プロジェクト管理の3つのサンプルNESTを作成します。
        各NESTには、チャット、ボード、ズームなどの基本的な空間が含まれます。
      </Text>
      
      {error && <Text style={styles.error}>{error}</Text>}
      
      <TouchableOpacity
        style={styles.button}
        onPress={handleCreateSampleNests}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>サンプルNESTを作成</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  error: {
    color: '#FF3B30',
    marginBottom: 16,
  },
}); 