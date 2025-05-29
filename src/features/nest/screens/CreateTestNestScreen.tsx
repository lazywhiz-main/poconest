import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, TextInput } from 'react-native';
import { useAuth } from '../../../contexts/AuthContext';
import { useNest } from '../contexts/NestContext';

interface CreateTestNestScreenProps {
  onCreated?: (nestId: string) => void;
}

const DEFAULT_COLOR = '#E86C60';

const CreateTestNestScreen: React.FC<CreateTestNestScreenProps> = ({ onCreated }) => {
  const [name, setName] = useState('Test_NEST');
  const [description, setDescription] = useState('テスト用のNESTです');
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const { user } = useAuth();
  const { createNest, refreshData } = useNest();

  const handleCreate = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(false);
    const { error, nest } = await createNest({ name, description, color });
    setIsLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    if (nest) {
      setSuccess(true);
      await refreshData();
      if (onCreated) onCreated(nest.id);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>テスト用NEST作成</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="NEST名"
      />
      <TextInput
        style={styles.input}
        value={description}
        onChangeText={setDescription}
        placeholder="説明"
      />
      <TextInput
        style={styles.input}
        value={color}
        onChangeText={setColor}
        placeholder="カラーコード"
      />
      {error && <Text style={styles.error}>{error}</Text>}
      {success && <Text style={styles.success}>作成成功！</Text>}
      <TouchableOpacity style={styles.button} onPress={handleCreate} disabled={isLoading}>
        {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>作成</Text>}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 24,
  },
  input: {
    width: 240,
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 12,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#E86C60',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
    marginTop: 16,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  error: {
    color: 'red',
    marginBottom: 8,
  },
  success: {
    color: 'green',
    marginBottom: 8,
  },
});

export default CreateTestNestScreen; 