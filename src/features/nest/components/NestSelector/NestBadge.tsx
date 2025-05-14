import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Nest } from '../../contexts/NestContext';
import { COLORS } from '@constants/config';

interface NestBadgeProps {
  nest: Nest;
  isActive?: boolean;
  onPress?: () => void;
  size?: 'small' | 'medium' | 'large';
}

const NestBadge: React.FC<NestBadgeProps> = ({
  nest,
  isActive = false,
  onPress,
  size = 'medium',
}) => {
  // サイズによって異なるスタイルを適用
  const containerSizeStyle = {
    small: styles.containerSmall,
    medium: styles.containerMedium,
    large: styles.containerLarge,
  }[size];
  
  const textSizeStyle = {
    small: styles.textSmall,
    medium: styles.textMedium,
    large: styles.textLarge,
  }[size];
  
  const indicatorSizeStyle = {
    small: styles.colorIndicatorSmall,
    medium: styles.colorIndicatorMedium,
    large: styles.colorIndicatorLarge,
  }[size];

  const BadgeContent = () => (
    <>
      <View 
        style={[
          styles.colorIndicator,
          indicatorSizeStyle,
          { backgroundColor: nest.color || COLORS.primary }
        ]} 
      />
      <Text 
        style={[
          styles.text,
          textSizeStyle,
          isActive && styles.activeText
        ]}
        numberOfLines={1}
      >
        {nest.name}
      </Text>
    </>
  );

  // クリックできる場合はTouchableOpacityでラップ
  if (onPress) {
    return (
      <TouchableOpacity
        style={[
          styles.container,
          containerSizeStyle,
          isActive && styles.activeContainer,
        ]}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${nest.name} NESTを選択`}
      >
        <BadgeContent />
      </TouchableOpacity>
    );
  }

  // クリックできない場合は単なるView
  return (
    <View 
      style={[
        styles.container,
        containerSizeStyle,
        isActive && styles.activeContainer,
      ]}
    >
      <BadgeContent />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    overflow: 'hidden',
  },
  containerSmall: {
    padding: 4,
    paddingHorizontal: 8,
  },
  containerMedium: {
    padding: 8,
    paddingHorizontal: 12,
  },
  containerLarge: {
    padding: 12,
    paddingHorizontal: 16,
  },
  activeContainer: {
    backgroundColor: COLORS.primary,
  },
  text: {
    color: COLORS.text,
    fontWeight: '500',
  },
  textSmall: {
    fontSize: 12,
  },
  textMedium: {
    fontSize: 14,
  },
  textLarge: {
    fontSize: 16,
  },
  activeText: {
    color: COLORS.white,
  },
  colorIndicator: {
    borderRadius: 50,
    marginRight: 8,
  },
  colorIndicatorSmall: {
    width: 8,
    height: 8,
  },
  colorIndicatorMedium: {
    width: 12,
    height: 12,
  },
  colorIndicatorLarge: {
    width: 16,
    height: 16,
  },
});

export default NestBadge; 