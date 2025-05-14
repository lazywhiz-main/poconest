import React from 'react';
import { View, StyleSheet } from 'react-native';
import { NestHeader } from './NestHeader';
import { CustomHeader } from './CustomHeader';
import { BrandColors } from '../constants/Colors';

interface TwoTierHeaderProps {
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
  nestHeaderBackgroundColor?: string;
  nestHeaderBorderBottomColor?: string;
}

export const TwoTierHeader: React.FC<TwoTierHeaderProps> = ({
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
  nestHeaderBackgroundColor = BrandColors.backgroundVariants.light,
  nestHeaderBorderBottomColor = '#eee',
}) => {
  return (
    <View style={styles.container}>
      <NestHeader 
        backgroundColor={nestHeaderBackgroundColor}
        borderBottomColor={nestHeaderBorderBottomColor}
      />
      <CustomHeader
        title={title}
        subtitle={subtitle}
        leftComponent={leftComponent}
        rightComponent={rightComponent}
        showBackButton={showBackButton}
        showNetworkButton={showNetworkButton}
        showEmoji={showEmoji}
        emoji={emoji}
        onBackPress={onBackPress}
        onNetworkPress={onNetworkPress}
        backgroundColor={backgroundColor}
        borderBottomColor={borderBottomColor}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
}); 