import React from 'react';
import { 
  TouchableOpacity, 
  Text, 
  StyleSheet, 
  ViewStyle, 
  TextStyle, 
  ActivityIndicator,
  View
} from 'react-native';
import theme from '../../styles/theme';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'text';
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

/**
 * スタイル付きボタンコンポーネント
 * 
 * バリエーション、サイズ、アイコン、ローディング状態をサポート
 */
const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  style,
  textStyle,
  fullWidth = false,
}) => {
  // サイズに基づくスタイル
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

  // バリアントに基づくスタイル
  const getVariantStyles = (variant: ButtonVariant) => {
    switch (variant) {
      case 'primary':
        return {
          button: {
            backgroundColor: disabled ? 'rgba(255, 122, 122, 0.6)' : theme.colors.primary,
            ...theme.shadows.sm,
          },
          text: {
            color: theme.colors.text.onDark,
          },
        };
      case 'secondary':
        return {
          button: {
            backgroundColor: disabled ? 'rgba(80, 208, 200, 0.6)' : theme.colors.secondary,
            ...theme.shadows.sm,
          },
          text: {
            color: theme.colors.text.onDark,
          },
        };
      case 'outline':
        return {
          button: {
            backgroundColor: 'transparent',
            borderWidth: 1,
            borderColor: disabled ? theme.colors.text.disabled : theme.colors.secondary,
          },
          text: {
            color: disabled ? theme.colors.text.disabled : theme.colors.secondary,
          },
        };
      case 'text':
        return {
          button: {
            backgroundColor: 'transparent',
            paddingHorizontal: theme.spacing.sm,
          },
          text: {
            color: disabled ? theme.colors.text.disabled : theme.colors.secondary,
          },
        };
      default:
        return {
          button: {},
          text: {},
        };
    }
  };

  const variantStyles = getVariantStyles(variant);

  // コンポーネントスタイルの組み合わせ
  const buttonStyles = [
    styles.button,
    sizeStyles[size].button,
    variantStyles.button,
    fullWidth && styles.fullWidth,
    style,
  ];

  const textStyles = [
    styles.text,
    sizeStyles[size].text,
    variantStyles.text,
    textStyle,
  ];

  // ローディングインジケーターの色
  const spinnerColor = 
    variant === 'outline' || variant === 'text'
      ? theme.colors.secondary
      : theme.colors.text.onDark;

  return (
    <TouchableOpacity
      style={buttonStyles}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator size="small" color={spinnerColor} />
      ) : (
        <View style={styles.contentContainer}>
          {icon && iconPosition === 'left' && (
            <View style={styles.iconLeft}>{icon}</View>
          )}
          
          <Text style={textStyles}>{title}</Text>
          
          {icon && iconPosition === 'right' && (
            <View style={styles.iconRight}>{icon}</View>
          )}
        </View>
      )}
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