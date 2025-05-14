import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SPACING } from '@constants/config';

interface DateDividerProps {
  date: string;
}

const DateDivider: React.FC<DateDividerProps> = ({ date }) => {
  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return d.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      weekday: 'short'
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.divider}>
        <Text style={styles.text}>{formatDate(date)}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  divider: {
    backgroundColor: 'rgba(142, 142, 147, 0.12)',
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
    borderRadius: 12,
  },
  text: {
    fontSize: 12,
    color: COLORS.lightText,
  },
});

export default DateDivider; 