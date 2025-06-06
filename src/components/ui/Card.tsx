import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle, TouchableOpacity } from 'react-native';
import theme from '../../styles/theme';

// ダークモード判定（シンプルなwindow.matchMediaで対応）
const isDarkMode = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

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
  // ダーク/ライトで色を切り替え
  const cardBg = isDarkMode ? '#18192a' : theme.colors.background.card;
  const cardBorder = isDarkMode ? '#333366' : (borderColor || theme.colors.divider);
  const cardText = isDarkMode ? '#e2e8f0' : theme.colors.text.primary;
  const cardShadow = isDarkMode
    ? {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
      }
    : theme.shadows[elevation];

  const cardStyles = [
    {
      backgroundColor: cardBg,
      borderRadius: theme.borderRadius.md,
      overflow: 'hidden' as 'hidden',
      marginVertical: theme.spacing.sm,
      borderWidth: border ? 1 : 0,
      borderColor: border ? cardBorder : 'transparent',
      ...cardShadow,
    },
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
          <View style={[styles.titleContainer, { borderBottomColor: cardBorder }] }>
            <Text style={[styles.title, { color: cardText }, titleStyle]}>{title}</Text>
          </View>
        )}
        
        <View style={[styles.content, contentStyle]}>
          {children}
        </View>
        
        {footer && (
          <View style={[styles.footer, { borderTopColor: cardBorder, backgroundColor: cardBg }, footerStyle]}>
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
        <View style={[styles.titleContainer, { borderBottomColor: cardBorder }] }>
          <Text style={[styles.title, { color: cardText }, titleStyle]}>{title}</Text>
        </View>
      )}
      
      <View style={[styles.content, contentStyle]}>
        {children}
      </View>
      
      {footer && (
        <View style={[styles.footer, { borderTopColor: cardBorder, backgroundColor: cardBg }, footerStyle]}>
          {footer}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    // ここは使わず、上で分岐
  },
  titleContainer: {
    padding: theme.spacing.md,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: theme.fontSizes.lg,
    fontWeight: theme.fontWeights.semibold as any,
  },
  content: {
    padding: theme.spacing.md,
  },
  footer: {
    padding: theme.spacing.md,
    borderTopWidth: 1,
  },
});

export default Card; 