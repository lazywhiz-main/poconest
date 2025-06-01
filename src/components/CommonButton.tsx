import React from 'react';
import { Platform, TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';

interface CommonButtonProps {
  variant?: 'default' | 'primary' | 'danger';
  disabled?: boolean;
  onPress?: () => void;
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  textStyle?: TextStyle | TextStyle[];
  type?: 'button' | 'submit' | 'reset'; // for web
}

const getButtonStyle = (variant: string, disabled: boolean) => {
  switch (variant) {
    case 'primary':
      return [styles.btn, styles.primary, disabled && styles.disabledPrimary];
    case 'danger':
      return [styles.btn, styles.danger, disabled && styles.disabledDanger];
    default:
      return [styles.btn, styles.default, disabled && styles.disabledDefault];
  }
};

const getTextStyle = (variant: string) => {
  switch (variant) {
    case 'primary':
      return [styles.btnText, styles.primaryText];
    case 'danger':
      return [styles.btnText, styles.dangerText];
    default:
      return [styles.btnText, styles.defaultText];
  }
};

const CommonButton: React.FC<CommonButtonProps> = ({
  variant = 'default',
  disabled = false,
  onPress,
  children,
  style,
  textStyle,
  type = 'button',
}) => {
  // React Native
  if (Platform.OS !== 'web') {
    return (
      <TouchableOpacity
        style={[...getButtonStyle(variant, disabled), style]}
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.8}
      >
        <Text style={[...getTextStyle(variant), textStyle]}>{children}</Text>
      </TouchableOpacity>
    );
  }
  // Web
  // style, textStyleは配列の可能性があるのでマージ
  const mergedBtnStyle = Object.assign({}, webBtnBase, webBtnVariants[variant], disabled ? webBtnDisabled[variant] : {}, ...(Array.isArray(style) ? style : style ? [style] : []));
  const mergedTextStyle = Object.assign({}, webBtnTextBase, webBtnTextVariants[variant], ...(Array.isArray(textStyle) ? textStyle : textStyle ? [textStyle] : []));
  return (
    <button
      type={type}
      style={mergedBtnStyle}
      onClick={onPress}
      disabled={disabled}
    >
      <span style={mergedTextStyle}>{children}</span>
    </button>
  );
};

const styles = StyleSheet.create({
  btn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 2,
    borderWidth: 1,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginLeft: 8,
    marginRight: 0,
    marginTop: 0,
    marginBottom: 0,
  },
  default: {
    backgroundColor: '#1a1a2e',
    borderColor: '#333366',
  },
  primary: {
    backgroundColor: '#00ff88',
    borderColor: '#00ff88',
  },
  danger: {
    backgroundColor: '#ff6b6b',
    borderColor: '#ff6b6b',
  },
  disabledDefault: {
    opacity: 0.6,
  },
  disabledPrimary: {
    opacity: 0.6,
  },
  disabledDanger: {
    opacity: 0.6,
  },
  btnText: {
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  defaultText: {
    color: '#e2e8f0',
  },
  primaryText: {
    color: '#0f0f23',
  },
  dangerText: {
    color: '#fff',
  },
});

// Web用スタイル
const webBtnBase: React.CSSProperties = {
  padding: '8px 16px',
  borderRadius: 2,
  borderWidth: 1,
  borderStyle: 'solid',
  minWidth: 80,
  alignItems: 'center',
  justifyContent: 'center',
  display: 'inline-flex',
  marginLeft: 8,
  fontFamily: 'inherit',
  fontWeight: 700,
  fontSize: 12,
  textTransform: 'uppercase',
  letterSpacing: 0.5,
  cursor: 'pointer',
  transition: 'all 0.2s',
};
const webBtnVariants: Record<string, React.CSSProperties> = {
  default: {
    background: '#1a1a2e',
    borderColor: '#333366',
    color: '#e2e8f0',
  },
  primary: {
    background: '#00ff88',
    borderColor: '#00ff88',
    color: '#0f0f23',
  },
  danger: {
    background: '#ff6b6b',
    borderColor: '#ff6b6b',
    color: '#fff',
  },
};
const webBtnDisabled: Record<string, React.CSSProperties> = {
  default: { opacity: 0.6, cursor: 'not-allowed' },
  primary: { opacity: 0.6, cursor: 'not-allowed' },
  danger: { opacity: 0.6, cursor: 'not-allowed' },
};
const webBtnTextBase: React.CSSProperties = {
  fontWeight: 700,
  fontSize: 12,
  textTransform: 'uppercase',
  letterSpacing: 0.5,
};
const webBtnTextVariants: Record<string, React.CSSProperties> = {
  default: { color: '#e2e8f0' },
  primary: { color: '#0f0f23' },
  danger: { color: '#fff' },
};

export default CommonButton; 