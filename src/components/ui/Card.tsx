import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle, TouchableOpacity } from 'react-native';
import theme from '../../styles/theme';

interface CardProps {
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  titleStyle?: TextStyle;
  contentStyle?: ViewStyle;
  footerStyle?: ViewStyle;
  elevation?: 'sm' | 'md' | 'lg';
  border?: boolean;
  borderColor?: string;
}

/**
 * 汎用カードコンポーネント
 * 
 * タイトル、コンテンツ、フッターを持ち、タッチ操作にも対応
 */
const Card: React.FC<CardProps> = ({
  title,
  children,
  footer,
  onPress,
  style,
  titleStyle,
  contentStyle,
  footerStyle,
  elevation = 'md',
  border = false,
  borderColor,
}) => {
  // スタイルの計算
  const cardStyles = [
    styles.card,
    theme.shadows[elevation],
    border && { borderWidth: 1, borderColor: borderColor || theme.colors.divider },
    style,
  ];

  // タッチ操作がある場合はTouchableOpacityでラップ
  if (onPress) {
    return (
      <TouchableOpacity 
        style={cardStyles} 
        onPress={onPress} 
        activeOpacity={0.7}
      >
        {title && (
          <View style={styles.titleContainer}>
            <Text style={[styles.title, titleStyle]}>{title}</Text>
          </View>
        )}
        
        <View style={[styles.content, contentStyle]}>
          {children}
        </View>
        
        {footer && (
          <View style={[styles.footer, footerStyle]}>
            {footer}
          </View>
        )}
      </TouchableOpacity>
    );
  }

  // タッチ操作がない場合は通常のView
  return (
    <View style={cardStyles}>
      {title && (
        <View style={styles.titleContainer}>
          <Text style={[styles.title, titleStyle]}>{title}</Text>
        </View>
      )}
      
      <View style={[styles.content, contentStyle]}>
        {children}
      </View>
      
      {footer && (
        <View style={[styles.footer, footerStyle]}>
          {footer}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
    marginVertical: theme.spacing.sm,
  },
  titleContainer: {
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  title: {
    fontSize: theme.fontSizes.lg,
    fontWeight: theme.fontWeights.semibold as any,
    color: theme.colors.text.primary,
  },
  content: {
    padding: theme.spacing.md,
  },
  footer: {
    padding: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
    backgroundColor: theme.colors.background.default,
  },
});

export default Card; 