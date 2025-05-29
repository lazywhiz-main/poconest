import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface NestSpaceProps {
  name: string;
}

export const NestSpace: React.FC<NestSpaceProps> = ({ name }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>NEST: {name}</Text>
      <View style={styles.content}>
        <Text>Welcome to your NEST!</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  content: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
}); 