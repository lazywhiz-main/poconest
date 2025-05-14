import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BrandColors } from '../constants/Colors';

interface SaveOptionsModalProps {
  visible: boolean;
  onClose: () => void;
  onSaveToInbox: () => void;
  onSaveAsInsight: () => void;
}

const { width } = Dimensions.get('window');

const SaveOptionsModal: React.FC<SaveOptionsModalProps> = ({
  visible,
  onClose,
  onSaveToInbox,
  onSaveAsInsight
}) => {
  const slideAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true
      }).start();
    }
  }, [visible]);

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [300, 0]
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <Animated.View
          style={[
            styles.modalContent,
            { transform: [{ translateY }] }
          ]}
        >
          <View style={styles.header}>
            <Text style={styles.title}>メッセージを保存</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={BrandColors.text.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.options}>
            <TouchableOpacity
              style={styles.option}
              onPress={() => {
                onSaveToInbox();
                onClose();
              }}
            >
              <View style={[styles.iconContainer, { backgroundColor: BrandColors.primary }]}>
                <Ionicons name="inbox-outline" size={24} color="white" />
              </View>
              <View style={styles.optionText}>
                <Text style={styles.optionTitle}>Inboxに保存</Text>
                <Text style={styles.optionDescription}>
                  後で整理できるように一時保存します
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.option}
              onPress={() => {
                onSaveAsInsight();
                onClose();
              }}
            >
              <View style={[styles.iconContainer, { backgroundColor: BrandColors.secondary }]}>
                <Ionicons name="bulb-outline" size={24} color="white" />
              </View>
              <View style={styles.optionText}>
                <Text style={styles.optionTitle}>洞察として保存</Text>
                <Text style={styles.optionDescription}>
                  AIが内容を分析し、価値ある洞察として保存します
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    width: width,
    maxHeight: '80%'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: BrandColors.text.primary
  },
  closeButton: {
    padding: 5
  },
  options: {
    gap: 15
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: BrandColors.background.secondary,
    borderRadius: 12
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15
  },
  optionText: {
    flex: 1
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: BrandColors.text.primary,
    marginBottom: 4
  },
  optionDescription: {
    fontSize: 14,
    color: BrandColors.text.secondary
  }
});

export default SaveOptionsModal; 