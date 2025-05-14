import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Share,
  Dimensions,
  ScrollView,
} from 'react-native';
import { Insight } from '../types/insight';
import { Ionicons } from '@expo/vector-icons';
import InsightBadge from './InsightBadge';
import { BrandColors } from '../constants/Colors';
import { useInsight } from '../contexts/InsightContext';

interface InsightSelectionModalProps {
  visible: boolean;
  selectedInsights: Insight[];
  onClose: () => void;
  onSave?: () => void;
}

const InsightSelectionModal: React.FC<InsightSelectionModalProps> = ({
  visible,
  selectedInsights,
  onClose,
  onSave,
}) => {
  const [selectedTab, setSelectedTab] = useState<'list' | 'summary'>('list');
  const { saveInsights } = useInsight();

  const handleShare = async () => {
    try {
      const insightText = selectedInsights
        .map(insight => `• ${insight.content}`)
        .join('\n\n');
      
      await Share.share({
        message: `Insights from PocoNest:\n\n${insightText}`,
      });
    } catch (error) {
      console.error('Error sharing insights:', error);
    }
  };

  const handleSaveInsights = async () => {
    // Default collection name - could be made customizable
    const collectionName = 'My Insights';
    const success = await saveInsights(selectedInsights, collectionName);
    if (success) {
      if (onSave) onSave();
      onClose();
    }
  };

  const generateSummary = () => {
    if (selectedInsights.length === 0) return 'No insights selected.';
    
    // Group insights by type
    const byType = selectedInsights.reduce((groups, insight) => {
      const group = groups[insight.type] || [];
      group.push(insight);
      return { ...groups, [insight.type]: group };
    }, {} as Record<string, Insight[]>);
    
    // Create summary text
    return Object.entries(byType).map(([type, insights]) => (
      `${type.toUpperCase()} (${insights.length}):\n${insights.map(i => `• ${i.content}`).join('\n')}`
    )).join('\n\n');
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <View style={styles.header}>
            <Text style={styles.title}>Selected Insights</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="black" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.tabContainer}>
            <TouchableOpacity 
              style={[styles.tab, selectedTab === 'list' && styles.activeTab]} 
              onPress={() => setSelectedTab('list')}
            >
              <Text style={styles.tabText}>List View</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tab, selectedTab === 'summary' && styles.activeTab]} 
              onPress={() => setSelectedTab('summary')}
            >
              <Text style={styles.tabText}>Summary</Text>
            </TouchableOpacity>
          </View>
          
          {selectedTab === 'list' ? (
            <FlatList
              data={selectedInsights}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.insightItem}>
                  <InsightBadge insight={item} />
                  <Text style={styles.insightText}>{item.content}</Text>
                </View>
              )}
              style={styles.list}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No insights selected</Text>
              }
            />
          ) : (
            <ScrollView style={styles.summaryContainer}>
              <Text style={styles.summaryText}>{generateSummary()}</Text>
            </ScrollView>
          )}
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[styles.button, styles.cancelButton, selectedInsights.length === 0 && styles.disabledButton]} 
              onPress={onClose}
              disabled={selectedInsights.length === 0}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.button, styles.saveButton, selectedInsights.length === 0 && styles.disabledButton]} 
              onPress={handleSaveInsights}
              disabled={selectedInsights.length === 0}
            >
              <Text style={styles.buttonText}>Save Insights</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
    width: width > 600 ? 500 : width * 0.9,
    maxHeight: '80%',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'black',
  },
  closeButton: {
    padding: 5,
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: BrandColors.primary,
  },
  tabText: {
    fontSize: 16,
    color: 'black',
  },
  list: {
    flex: 1,
    maxHeight: 400,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  insightText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: 'black',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    color: '#888888',
    fontSize: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    minWidth: 100,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#E0E0E0',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  summaryContainer: {
    maxHeight: 400,
    padding: 10,
  },
  summaryText: {
    fontSize: 16,
    lineHeight: 24,
    color: 'black',
  },
});

export default InsightSelectionModal; 