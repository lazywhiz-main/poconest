import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Modal,
  FlatList,
  Animated,
  Dimensions,
  Platform,
  Pressable
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNest } from '../contexts/NestContext';
import { BrandColors } from '../constants/Colors';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

type RootStackParamList = {
  TabsScreen: undefined;
  CreateNest: undefined;
  NestSettings: { nestId: string };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface NestHeaderProps {
  backgroundColor?: string;
  borderBottomColor?: string;
}

export const NestHeader: React.FC<NestHeaderProps> = ({
  backgroundColor = BrandColors.backgroundVariants.light,
  borderBottomColor = '#eee',
}) => {
  const navigation = useNavigation<NavigationProp>();
  const { currentNest, userNests, setCurrentNestById } = useNest();
  const [isModalVisible, setModalVisible] = useState(false);
  const modalAnimation = useRef(new Animated.Value(0)).current;
  const screenHeight = Dimensions.get('window').height;

  useEffect(() => {
    if (isModalVisible) {
      Animated.timing(modalAnimation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(modalAnimation, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [isModalVisible]);

  const handleNestPress = async (nestId: string) => {
    setModalVisible(false);
    await setCurrentNestById(nestId);
  };

  const handleCreateNest = () => {
    setModalVisible(false);
    navigation.navigate('CreateNest');
  };

  const translateY = modalAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [screenHeight, 0],
  });

  const opacity = modalAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.5],
  });

  return (
    <View style={[styles.header, { backgroundColor, borderBottomColor }]}>
      <TouchableOpacity 
        style={styles.nestSelector} 
        onPress={() => setModalVisible(true)}
      >
        <View style={styles.nestInfo}>
          <View style={[
            styles.nestColor, 
            { backgroundColor: currentNest?.color || BrandColors.primary }
          ]} />
          <Text style={styles.nestName} numberOfLines={1}>
            {currentNest?.name || 'マイホーム'}
          </Text>
        </View>
        <Ionicons name="chevron-down" size={18} color={BrandColors.text.secondary} />
      </TouchableOpacity>

      <Modal
        transparent
        visible={isModalVisible}
        animationType="none"
        onRequestClose={() => setModalVisible(false)}
      >
        <Animated.View 
          style={[
            styles.modalOverlay,
            { opacity }
          ]}
        >
          <Pressable 
            style={styles.modalOverlayPressable} 
            onPress={() => setModalVisible(false)} 
          />
        </Animated.View>

        <Animated.View 
          style={[
            styles.modalContent,
            { transform: [{ translateY }] }
          ]}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Nestを選択</Text>
            <TouchableOpacity 
              style={styles.closeButton} 
              onPress={() => setModalVisible(false)}
            >
              <Ionicons name="close" size={24} color={BrandColors.text.primary} />
            </TouchableOpacity>
          </View>

          <FlatList
            data={userNests}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.nestItem,
                  currentNest?.id === item.id && styles.selectedNestItem,
                ]}
                onPress={() => handleNestPress(item.id)}
              >
                <View style={[
                  styles.nestItemColor,
                  { backgroundColor: item.color || BrandColors.primary }
                ]} />
                <View style={styles.nestItemInfo}>
                  <Text style={styles.nestItemName}>{item.name}</Text>
                  {item.description && (
                    <Text style={styles.nestItemDescription} numberOfLines={1}>
                      {item.description}
                    </Text>
                  )}
                </View>
                {currentNest?.id === item.id && (
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={BrandColors.primary}
                  />
                )}
              </TouchableOpacity>
            )}
            ListFooterComponent={
              <TouchableOpacity
                style={styles.createNestButton}
                onPress={handleCreateNest}
              >
                <Ionicons name="add-circle-outline" size={20} color={BrandColors.primary} />
                <Text style={styles.createNestText}>新しいNestを作成</Text>
              </TouchableOpacity>
            }
          />
        </Animated.View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    justifyContent: 'space-between',
  },
  nestSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    flex: 1,
  },
  nestInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  nestColor: {
    width: 8,
    height: 20,
    borderRadius: 4,
    marginRight: 8,
  },
  nestName: {
    fontSize: 16,
    fontWeight: '600',
    color: BrandColors.text.primary,
    flex: 1,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
  },
  modalOverlayPressable: {
    width: '100%',
    height: '100%',
  },
  modalContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: BrandColors.background,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: Platform.OS === 'ios' ? 30 : 16,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: BrandColors.text.primary,
  },
  closeButton: {
    padding: 4,
  },
  nestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEFEF',
  },
  selectedNestItem: {
    backgroundColor: '#F0F8FF',
  },
  nestItemColor: {
    width: 12,
    height: 40,
    borderRadius: 6,
    marginRight: 12,
  },
  nestItemInfo: {
    flex: 1,
  },
  nestItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: BrandColors.text.primary,
  },
  nestItemDescription: {
    fontSize: 14,
    color: BrandColors.text.secondary,
    marginTop: 2,
  },
  createNestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEFEF',
  },
  createNestText: {
    fontSize: 16,
    color: BrandColors.primary,
    marginLeft: 8,
  },
}); 