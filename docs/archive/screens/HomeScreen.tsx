import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';

export const HomeScreen = () => {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>PocoNest</Text>
        <Text style={styles.subtitle}>Welcome to your forest of conversations</Text>
      </View>
      
      <View style={styles.content}>
        {/* Content will be added here */}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    padding: 20,
    backgroundColor: '#F8F9FA',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2C3E50',
  },
  subtitle: {
    fontSize: 16,
    color: '#7F8C8D',
    marginTop: 5,
  },
  content: {
    flex: 1,
    padding: 20,
  },
}); 