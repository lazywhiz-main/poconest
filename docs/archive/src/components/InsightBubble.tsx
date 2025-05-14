import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import { Insight } from '../types/insight';

interface InsightBubbleProps {
  insight: Insight;
  onPress?: () => void;
  style?: any;
}

export const InsightBubble: React.FC<InsightBubbleProps> = ({ insight, onPress, style }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
        easing: Easing.elastic(1.2),
      }),
    ]).start();
  }, []);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'summary': return '📝';
      case 'key_point': return '💡';
      case 'action_item': return '✅';
      case 'question': return '❓';
      default: return '📌';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'summary': return '要約';
      case 'key_point': return '重要ポイント';
      case 'action_item': return 'タスク';
      case 'question': return '検討事項';
      default: return 'その他';
    }
  };

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    onPress?.();
  };

  return (
    <Animated.View 
      style={[
        styles.container,
        style,
        { 
          opacity,
          transform: [{ scale }],
        }
      ]}
    >
      <TouchableOpacity
        style={[
          styles.bubble,
          styles[`priority_${insight.priority}`]
        ]}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        <View style={styles.header}>
          <Text style={styles.icon}>{getTypeIcon(insight.type)}</Text>
          <Text style={styles.type}>{getTypeLabel(insight.type)}</Text>
        </View>
        
        <Text style={styles.content} numberOfLines={2}>
          {insight.content}
        </Text>

        <View style={styles.footer}>
          <Text style={styles.timestamp}>
            {new Date(insight.createdAt).toLocaleTimeString()}
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    alignSelf: 'flex-start',
    maxWidth: '80%',
  },
  bubble: {
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 12,
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
    marginBottom: 8,
  },
  icon: {
    fontSize: 16,
    marginRight: 8,
  },
  type: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  content: {
    fontSize: 14,
    color: '#2C3E50',
    lineHeight: 20,
  },
  footer: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  timestamp: {
    fontSize: 10,
    color: '#999',
  },
  priority_high: {
    borderLeftWidth: 3,
    borderLeftColor: '#E74C3C',
  },
  priority_medium: {
    borderLeftWidth: 3,
    borderLeftColor: '#F1C40F',
  },
  priority_low: {
    borderLeftWidth: 3,
    borderLeftColor: '#3498DB',
  },
}); 