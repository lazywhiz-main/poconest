import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, StyleSheet, Platform } from 'react-native';
import theme from '../../../styles/theme'; // プロジェクトのテーマファイルへのパスを確認してください

interface CreateNestModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (nestData: { name: string; description?: string; color?: string; icon?: string }) => Promise<void>;
}

const CreateNestModal: React.FC<CreateNestModalProps> = ({ visible, onClose, onSubmit }) => {
  const [name, setName] = useState('');
  // const [description, setDescription] = useState('');
  // const [color, setColor] = useState(theme.colors.primary);
  // const [icon, setIcon] = useState('🏠');
  const [isSubmitting, setIsSubmitting] = useState(false);
  // const [error, setError] = useState<string | null>(null);

  // Reset form state when modal becomes visible
  useEffect(() => {
    if (visible) {
      setName('');
      setIsSubmitting(false);
    }
  }, [visible]);

  // const handleSubmit = async () => { ... }; // Original handleSubmit temporarily commented

  const handleClose = () => {
    setName('');
    // setDescription('');
    // setColor(theme.colors.primary);
    // setIcon('🏠');
    // setError(null);
    onClose();
  };

  // const colorOptions = [ ... ];
  // const iconOptions = [ ... ];

  if (!visible) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleClose}
    >
      <TouchableOpacity 
        style={styles.modalOverlay_VIEW_VERSION}
        activeOpacity={1}
        onPress={handleClose} 
      >
        <TouchableOpacity 
          style={styles.modalContent} 
          activeOpacity={1} 
          onPress={(e) => e.stopPropagation()} 
        >
          <Text style={styles.modalTitle}>新しい巣を作成</Text>
          
          <TextInput
            style={styles.input}
            placeholder="Nestの名前"
            value={name}
            onChangeText={setName}
            placeholderTextColor={theme.colors.text.hint}
          />

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleClose}
              disabled={isSubmitting}
            >
              <Text style={styles.buttonTextWhite}>キャンセル</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.button, 
                styles.submitButton,
                (isSubmitting || !name.trim()) && styles.disabledButton
              ]}
              onPress={() => {
                if (!isSubmitting && name.trim()) {
                  setIsSubmitting(true);
                  onSubmit({ name: name.trim() })
                    .catch(error => {
                      console.error('Failed to create nest:', error);
                    })
                    .finally(() => {
                      setIsSubmitting(false);
                    });
                }
              }}
              disabled={isSubmitting || !name.trim()}
            >
              <Text style={styles.buttonText}>作成</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

// Original styles can remain, they are not used by the minimal test JSX above
const styles = StyleSheet.create({
  modalOverlay_VIEW_VERSION: { // New style for View-based overlay
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)', // Semi-transparent black overlay
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000, // Ensure it's on top
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 12,
    width: Platform.OS === 'web' ? 400 : '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: theme.colors.text.primary,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.divider,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
    color: theme.colors.text.primary,
    backgroundColor: theme.colors.background.paper,
  },
  multilineInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: theme.colors.text.secondary,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  colorOption: {
    width: 32,
    height: 32,
    borderRadius: 16,
    margin: 4,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  iconOption: {
    width: 40,
    height: 40,
    borderRadius: 8,
    margin: 4,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: theme.colors.background.default,
  },
  iconText: {
    fontSize: 20,
  },
  selectedOption: {
    borderColor: theme.colors.accent,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
  },
  cancelButton: {
    backgroundColor: theme.colors.background.default,
    marginRight: 8,
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  submitButton: {
    backgroundColor: theme.colors.primary,
    marginLeft: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonTextWhite: { // Added for cancel button if its background is dark
    color: theme.colors.text.primary, // Or a specific color for light text on dark bg
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorText: {
    color: 'red',
    marginBottom: 10,
    textAlign: 'center',
  },
  disabledButton: {
    opacity: 0.7,
  }
});

export default CreateNestModal; 