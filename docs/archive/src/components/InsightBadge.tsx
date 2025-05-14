import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { InsightType, InsightPriority, Insight } from '../types/insight';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface InsightBadgeProps {
  insight: Insight;
  onPress?: () => void;
  selected?: boolean;
  compact?: boolean;
}

const getIconName = (type: InsightType): string => {
  switch (type) {
    case 'summary':
      return 'text-box-outline';
    case 'key_point':
      return 'lightbulb-outline';
    case 'action_item':
      return 'checkbox-marked-circle-outline';
    case 'question':
      return 'help-circle-outline';
    default:
      return 'information-outline';
  }
};

const getColor = (type: InsightType): string => {
  switch (type) {
    case 'summary':
      return '#4A90E2';
    case 'key_point':
      return '#F5A623';
    case 'action_item':
      return '#7ED321';
    case 'question':
      return '#9013FE';
    default:
      return '#B8B8B8';
  }
};

const InsightBadge: React.FC<InsightBadgeProps> = ({ insight, onPress, selected = false, compact = false }) => {
  const iconName = getIconName(insight.type);
  const color = getColor(insight.type);

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.container,
        { backgroundColor: selected ? color : `${color}20` },
        compact && styles.compactContainer,
      ]}
    >
      <Icon
        name={iconName}
        size={compact ? 14 : 16}
        color={selected ? '#FFFFFF' : color}
        style={styles.icon}
      />
      {!compact && (
        <Text
          style={[
            styles.text,
            { color: selected ? '#FFFFFF' : color },
          ]}
          numberOfLines={1}
        >
          {insight.content}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  compactContainer: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    marginRight: 4,
    marginBottom: 4,
  },
  icon: {
    marginRight: 4,
  },
  text: {
    fontSize: 12,
    fontWeight: '500',
  },
});

export default InsightBadge; 