import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { BrandColors } from '../constants/Colors';

interface CustomHeaderProps {
  title: string;
  subtitle?: string;
  leftComponent?: React.ReactNode;
  rightComponent?: React.ReactNode;
  showBackButton?: boolean;
  showNetworkButton?: boolean;
  showEmoji?: boolean;
  emoji?: string;
  onBackPress?: () => void;
  onNetworkPress?: () => void;
  backgroundColor?: string;
  borderBottomColor?: string;
}

export const CustomHeader: React.FC<CustomHeaderProps> = ({
  title,
  subtitle,
  leftComponent,
  rightComponent,
  showBackButton = false,
  showNetworkButton = false,
  showEmoji = false,
  emoji = '🎯',
  onBackPress,
  onNetworkPress,
  backgroundColor = BrandColors.backgroundVariants.light,
  borderBottomColor = '#eee',
}) => {
  const navigation = useNavigation();

  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      navigation.goBack();
    }
  };

  return (
    <View style={[styles.header, { backgroundColor, borderBottomColor }]}>
      <View style={styles.leftContainer}>
        {showBackButton && (
          <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color={BrandColors.text.primary} />
          </TouchableOpacity>
        )}
        {showEmoji && <Text style={styles.emoji}>{emoji}</Text>}
        <View style={styles.titleTextContainer}>
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
        {leftComponent}
      </View>
      
      <View style={styles.rightContainer}>
        {showNetworkButton && (
          <TouchableOpacity
            onPress={onNetworkPress}
            style={styles.networkButton}
          >
            <Ionicons name="globe-outline" size={20} color={BrandColors.text.primary} />
          </TouchableOpacity>
        )}
        {rightComponent}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    height: 60,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: BrandColors.backgroundVariants.light,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  leftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleContainer: {
    flex: 1,
    marginLeft: 0,
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleTextContainer: {
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: BrandColors.text.primary,
  },
  subtitle: {
    fontSize: 12,
    color: BrandColors.text.secondary,
    marginTop: 2,
  },
  emoji: {
    fontSize: 24,
    marginRight: 8,
  },
  networkButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: `${BrandColors.primary}15`,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 