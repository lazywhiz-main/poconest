import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';

export const SearchScreen = () => {
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Search</Text>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search conversations..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={styles.content}>
        <Text style={styles.placeholder}>Search results will appear here</Text>
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
  searchContainer: {
    padding: 15,
    backgroundColor: '#FFFFFF',
  },
  searchInput: {
    backgroundColor: '#F8F9FA',
    padding: 10,
    borderRadius: 8,
    fontSize: 16,
  },
  content: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    fontSize: 16,
    color: '#7F8C8D',
  },
}); 