import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BrandColors } from '../constants/Colors';

interface TutorialCardProps {
  title: string;
  description: string;
  iconName: any; // Ioniconsで使用できるアイコン名
  onDismiss?: () => void;
  onAction?: () => void;
  actionText?: string;
}

const TutorialCard: React.FC<TutorialCardProps> = ({
  title,
  description,
  iconName,
  onDismiss,
  onAction,
  actionText = 'やってみる'
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Ionicons name={iconName} size={24} color="#FFFFFF" />
        </View>
        <Text style={styles.title}>{title}</Text>
        {onDismiss && (
          <TouchableOpacity style={styles.dismissButton} onPress={onDismiss}>
            <Ionicons name="close" size={20} color={BrandColors.text.tertiary} />
          </TouchableOpacity>
        )}
      </View>
      
      <Text style={styles.description}>{description}</Text>
      
      {onAction && (
        <TouchableOpacity style={styles.actionButton} onPress={onAction}>
          <Text style={styles.actionButtonText}>{actionText}</Text>
          <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: BrandColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: BrandColors.text.primary,
    flex: 1,
  },
  dismissButton: {
    padding: 4,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    color: BrandColors.text.secondary,
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BrandColors.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginRight: 8,
  },
});

export default TutorialCard; 