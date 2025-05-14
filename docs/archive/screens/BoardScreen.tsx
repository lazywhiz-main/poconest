import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';

interface Card {
  id: string;
  content: string;
  type: 'inbox' | 'insight' | 'theme' | 'zoom';
  createdAt: Date;
}

const BoardScreen: React.FC = () => {
  const [cards, setCards] = useState<Card[]>([]);
  const [activeColumn, setActiveColumn] = useState<'inbox' | 'insight' | 'theme' | 'zoom'>('inbox');

  const renderColumn = (type: 'inbox' | 'insight' | 'theme' | 'zoom', title: string) => {
    const columnCards = cards.filter(card => card.type === type);
    
    return (
      <View style={styles.column}>
        <View style={styles.columnHeader}>
          <Text style={styles.columnTitle}>{title}</Text>
          <Text style={styles.cardCount}>{columnCards.length}</Text>
        </View>
        <ScrollView style={styles.cardList}>
          {columnCards.map(card => (
            <TouchableOpacity
              key={card.id}
              style={styles.card}
              onPress={() => {/* Handle card press */}}
            >
              <Text style={styles.cardContent}>{card.content}</Text>
              <Text style={styles.cardDate}>
                {new Date(card.createdAt).toLocaleDateString()}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Wisdom Board</Text>
        <TouchableOpacity style={styles.addButton}>
          <Icon name="add" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>
      
      <ScrollView horizontal style={styles.boardContainer}>
        {renderColumn('inbox', 'Inbox')}
        {renderColumn('insight', 'Insights')}
        {renderColumn('theme', 'Themes')}
        {renderColumn('zoom', 'Zoom')}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
  },
  addButton: {
    padding: 8,
  },
  boardContainer: {
    flex: 1,
    padding: 16,
  },
  column: {
    width: Dimensions.get('window').width * 0.8,
    marginRight: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  columnHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  columnTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
  },
  cardCount: {
    fontSize: 14,
    color: '#666666',
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  cardList: {
    flex: 1,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  cardContent: {
    fontSize: 16,
    color: '#333333',
    marginBottom: 8,
  },
  cardDate: {
    fontSize: 12,
    color: '#999999',
  },
});

export default BoardScreen; 