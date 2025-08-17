import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Platform,
  NativeSyntheticEvent,
  TextInputKeyPressEventData
} from 'react-native';
import { useBoardSpace } from '../hooks/useBoardSpace';
import { BoardColumnType } from 'src/types/board';
import type { BoardItem } from '../../../../services/SmartClusteringService';

const BOARD_COLUMN_TYPES = ['INBOX', 'QUESTIONS', 'INSIGHTS', 'THEMES', 'ACTIONS'] as const;

interface CardEditorProps {
  isVisible: boolean;
  onClose: () => void;
  initialCardId?: string;
  initialColumn?: BoardColumnType;
}

const CardEditor: React.FC<CardEditorProps> = ({
  isVisible,
  onClose,
  initialCardId,
  initialColumn = 'INBOX'
}) => {
  const { 
    allCards, 
    addCards, 
    updateCard
  } = useBoardSpace();
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [selectedColumn, setSelectedColumn] = useState<BoardColumnType>(initialColumn);
  
  // Load card data if editing an existing card
  useEffect(() => {
    if (initialCardId) {
      const card = allCards.find((c: BoardItem) => c.id === initialCardId);
      if (card) {
        setTitle(card.title);
        setDescription(card.content || '');
        setTags(card.tags || []);
        setSelectedColumn(card.column_type);
      }
    } else {
      // Reset form for new card
      setTitle('');
      setDescription('');
      setTags([]);
      setSelectedColumn(initialColumn);
    }
  }, [initialCardId, allCards, initialColumn]);
  
  // Handle form submission
  const handleSubmit = async () => {
    if (title.trim() === '') {
      alert('Title is required');
      return;
    }
    
    const now = new Date().toISOString();
    const cardData: Partial<BoardItem> = {
      title,
      content: description,
      tags,
      column_type: selectedColumn,
      metadata: {
        source: 'manual'
      },
      created_at: now,
      updated_at: now,
      order_index: 0,
      is_archived: false
    };
    
    try {
      if (initialCardId) {
        // Update existing card
        await updateCard({ 
          ...cardData, 
          id: initialCardId,
          updated_at: now
        });
      } else {
        // Create new card
        await addCards([{
          ...cardData,
          id: crypto.randomUUID(),
          board_id: '', // This will be set by the backend
          created_by: '', // This will be set by the backend
        } as BoardItem]);
      }
      
      onClose();
    } catch (error) {
      console.error('Error saving card:', error);
      alert('Failed to save card');
    }
  };
  
  // Add a new tag
  const handleAddTag = () => {
    if (tagInput.trim() === '') return;
    
    // Prevent duplicate tags
    if (!tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
    }
    
    setTagInput('');
  };
  
  // Remove a tag
  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };
  
  // Handle pressing Enter in tag input
  const handleTagInputKeyPress = (e: NativeSyntheticEvent<TextInputKeyPressEventData>) => {
    if (Platform.OS === 'web' && e.nativeEvent.key === 'Enter') {
      e.preventDefault?.();
      handleAddTag();
    }
  };
  
  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>
            {initialCardId ? 'Edit Card' : 'Create New Card'}
          </Text>
          
          <ScrollView style={styles.formContainer}>
            {/* Title Input */}
            <Text style={styles.inputLabel}>Title</Text>
            <TextInput
              style={styles.titleInput}
              value={title}
              onChangeText={setTitle}
              placeholder="Card title"
              autoFocus
            />
            
            {/* Description Input */}
            <Text style={styles.inputLabel}>Description</Text>
            <TextInput
              style={styles.descriptionInput}
              value={description}
              onChangeText={setDescription}
              placeholder="Card description"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            
            {/* Column Selection */}
            <Text style={styles.inputLabel}>Column</Text>
            <View style={styles.columnSelector}>
              {BOARD_COLUMN_TYPES.map((column) => (
                <TouchableOpacity 
                  key={column}
                  style={[
                    styles.columnOption,
                    selectedColumn === column && styles.selectedColumnOption
                  ]}
                  onPress={() => setSelectedColumn(column as BoardColumnType)}
                >
                  <Text 
                    style={[
                      styles.columnOptionText,
                      selectedColumn === column && styles.selectedColumnOptionText
                    ]}
                  >
                    {column === 'INBOX' ? 'Inbox' :
                     column === 'QUESTIONS' ? 'Questions' :
                     column === 'INSIGHTS' ? 'Insights' :
                     column === 'THEMES' ? 'Themes' : 'Zoom'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            {/* Tags Input */}
            <Text style={styles.inputLabel}>Tags</Text>
            <View style={styles.tagInputContainer}>
              <TextInput
                style={styles.tagInput}
                value={tagInput}
                onChangeText={setTagInput}
                placeholder="Add a tag"
                onSubmitEditing={handleAddTag}
                onKeyPress={handleTagInputKeyPress}
                blurOnSubmit={false}
              />
              <TouchableOpacity 
                style={styles.addTagButton}
                onPress={handleAddTag}
              >
                <Text style={styles.addTagButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
            
            {/* Tags Display */}
            <View style={styles.tagsContainer}>
              {tags.map((tag: string, index: number) => (
                <View key={tag} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                  <TouchableOpacity
                    style={styles.removeTagButton}
                    onPress={() => handleRemoveTag(tag)}
                  >
                    <Text style={styles.removeTagButtonText}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}
              {tags.length === 0 && (
                <Text style={styles.noTagsText}>No tags added</Text>
              )}
            </View>
          </ScrollView>
          
          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={onClose}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.saveButton}
              onPress={handleSubmit}
            >
              <Text style={styles.saveButtonText}>
                {initialCardId ? 'Update' : 'Create'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
    textAlign: 'center',
  },
  formContainer: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginBottom: 6,
    marginTop: 12,
  },
  titleInput: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 4,
    padding: 10,
    fontSize: 16,
    backgroundColor: '#F9F9F9',
  },
  descriptionInput: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 4,
    padding: 10,
    fontSize: 14,
    backgroundColor: '#F9F9F9',
    minHeight: 100,
    textAlignVertical: 'top',
    ...Platform.select({
      web: {
        outline: 'none',
      }
    })
  },
  columnSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginVertical: 8,
  },
  columnOption: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: '#F0F0F0',
  },
  selectedColumnOption: {
    backgroundColor: '#4a6da7',
  },
  columnOptionText: {
    fontSize: 14,
    color: '#555',
  },
  selectedColumnOptionText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  tagInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tagInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 4,
    padding: 10,
    fontSize: 14,
    backgroundColor: '#F9F9F9',
  },
  addTagButton: {
    marginLeft: 8,
    backgroundColor: '#4a6da7',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  addTagButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    marginBottom: 20,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(74, 109, 167, 0.1)',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    fontSize: 14,
    color: '#4a6da7',
  },
  removeTagButton: {
    marginLeft: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(74, 109, 167, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeTagButtonText: {
    fontSize: 12,
    color: '#4a6da7',
    fontWeight: 'bold',
  },
  noTagsText: {
    color: '#999',
    fontSize: 14,
    fontStyle: 'italic',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
    paddingTop: 16,
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginRight: 12,
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: '#4a6da7',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 4,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CardEditor; 