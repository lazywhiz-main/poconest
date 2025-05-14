import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { COLORS, SPACING } from '@constants/config';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'text';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: any;
  textStyle?: any;
}

const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  fullWidth = false,
  style,
  textStyle,
}) => {
  // Determine background color based on variant
  const getBackgroundColor = () => {
    if (disabled) return COLORS.gray;
    
    switch (variant) {
      case 'primary':
        return COLORS.primary;
      case 'secondary':
        return COLORS.secondary;
      case 'outline':
      case 'text':
        return 'transparent';
      default:
        return COLORS.primary;
    }
  };

  // Determine text color based on variant
  const getTextColor = () => {
    if (disabled) return COLORS.lightText;
    
    switch (variant) {
      case 'primary':
      case 'secondary':
        return COLORS.white;
      case 'outline':
        return COLORS.primary;
      case 'text':
        return COLORS.primary;
      default:
        return COLORS.white;
    }
  };

  // Determine border style based on variant
  const getBorderStyle = () => {
    if (variant === 'outline') {
      return {
        borderWidth: 1,
        borderColor: disabled ? COLORS.gray : COLORS.primary,
      };
    }
    return {};
  };

  // Determine padding based on size
  const getPadding = () => {
    switch (size) {
      case 'small':
        return { paddingVertical: SPACING.xs, paddingHorizontal: SPACING.md };
      case 'medium':
        return { paddingVertical: SPACING.sm, paddingHorizontal: SPACING.lg };
      case 'large':
        return { paddingVertical: SPACING.md, paddingHorizontal: SPACING.xl };
      default:
        return { paddingVertical: SPACING.sm, paddingHorizontal: SPACING.lg };
    }
  };

  // Platform-specific styles
  const getPlatformStyles = () => {
    if (Platform.OS === 'web') {
      return {
        cursor: disabled ? 'not-allowed' : 'pointer',
        outline: 'none',
        userSelect: 'none' as const,
      };
    }
    return {};
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      style={[
        styles.button,
        { backgroundColor: getBackgroundColor() },
        getBorderStyle(),
        getPadding(),
        fullWidth && styles.fullWidth,
        getPlatformStyles(),
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={getTextColor()} />
      ) : (
        <Text style={[styles.text, { color: getTextColor() }, textStyle]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  text: {
    fontWeight: '600',
    textAlign: 'center',
  },
  fullWidth: {
    width: '100%',
  },
});

export default Button; 