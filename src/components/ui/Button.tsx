import React from 'react';
import { 
  TouchableOpacity, 
  Text, 
  StyleSheet, 
  ViewStyle, 
  TextStyle, 
  ActivityIndicator,
  View,
  Platform
} from 'react-native';
import theme from '../../styles/theme';

type ButtonVariant = 'primary' | 'danger' | 'default';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
}

// --- getButtonStyle: web用デザインシステムスタイル ---
const getButtonStyle = (variant: ButtonVariant, disabled: boolean): React.CSSProperties => {
  const base = {
    borderRadius: 2,
    padding: '8px 16px',
    fontWeight: 700,
    fontSize: 12,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
    transition: 'all 0.2s',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: undefined,
    background: undefined,
    color: undefined,
  } as React.CSSProperties;
  switch (variant) {
    case 'primary':
      return {
        ...base,
        background: '#00ff88',
        border: '1px solid #00ff88',
        color: '#0f0f23',
      };
    case 'danger':
      return {
        ...base,
        background: '#ff6b6b',
        border: '1px solid #ff6b6b',
        color: '#fff',
      };
    default:
      return {
        ...base,
        background: '#1a1a2e',
        border: '1px solid #333366',
        color: '#e2e8f0',
      };
  }
};

/**
 * スタイル付きボタンコンポーネント
 * 
 * バリエーション、サイズ、アイコン、ローディング状態をサポート
 */
const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
  textStyle,
  ...rest
}) => {
  if (Platform.OS === 'web') {
    // Web: use native button and design system styles
    const btnStyle = getButtonStyle(variant as ButtonVariant, disabled);
    return (
      <button
        style={{ ...btnStyle, ...(style as any) }}
        onClick={onPress}
        disabled={disabled || loading}
        {...rest}
      >
        {title}
      </button>
    );
  }
  // Native: use TouchableOpacity and StyleSheet
  const sizeStyles = {
    sm: {
      button: { paddingVertical: theme.spacing.xs, paddingHorizontal: theme.spacing.md },
      text: { fontSize: theme.fontSizes.sm },
    },
    md: {
      button: { paddingVertical: theme.spacing.sm, paddingHorizontal: theme.spacing.lg },
      text: { fontSize: theme.fontSizes.md },
    },
    lg: {
      button: { paddingVertical: theme.spacing.md, paddingHorizontal: theme.spacing.xl },
      text: { fontSize: theme.fontSizes.lg },
    },
  };
  const btnStyle = [
    styles.button,
    sizeStyles['md'].button,
    style,
    disabled && { opacity: 0.6 },
  ];
  const textStyles = [
    styles.text,
    sizeStyles['md'].text,
    textStyle,
  ];
  return (
    <TouchableOpacity
      style={btnStyle}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      <Text style={textStyles}>{title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 44,
  },
  text: {
    fontWeight: theme.fontWeights.medium as any,
    textAlign: 'center',
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLeft: {
    marginRight: theme.spacing.xs,
  },
  iconRight: {
    marginLeft: theme.spacing.xs,
  },
  fullWidth: {
    width: '100%',
  },
});

export default Button; 