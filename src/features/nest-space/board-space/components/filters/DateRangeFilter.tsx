import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Icon } from '../../../../../components/Icon';

interface DateRangeFilterProps {
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
  onChange: (dateRange: { start: Date | null; end: Date | null }) => void;
}

const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  dateRange,
  onChange,
}) => {
  const handleDateSelect = (type: 'start' | 'end') => {
    // 実際の実装では、日付選択モーダルやカレンダーコンポーネントを使用
    // ここでは簡易的な実装として現在の日付を設定
    const today = new Date();
    if (type === 'start') {
      onChange({ ...dateRange, start: dateRange.start ? null : today });
    } else {
      onChange({ ...dateRange, end: dateRange.end ? null : today });
    }
  };

  const handleClearRange = () => {
    onChange({ start: null, end: null });
  };

  const formatDate = (date: Date | null) => {
    if (!date) return '未設定';
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Icon name="calendar" size={16} color="#a6adc8" />
        <Text style={styles.title}>日付範囲</Text>
        <TouchableOpacity
          style={styles.clearButton}
          onPress={handleClearRange}
          accessibilityLabel="日付範囲をクリア"
        >
          <Text style={styles.clearButtonText}>クリア</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.dateContainer}>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => handleDateSelect('start')}
          accessibilityLabel="開始日を選択"
        >
          <View style={styles.dateButtonContent}>
            <Icon name="play" size={14} color="#00ff88" />
            <Text style={styles.dateLabel}>開始日</Text>
          </View>
          <Text style={styles.dateValue}>{formatDate(dateRange.start)}</Text>
        </TouchableOpacity>

        <View style={styles.dateSeparator}>
          <Icon name="arrow-right" size={16} color="#6c7086" />
        </View>

        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => handleDateSelect('end')}
          accessibilityLabel="終了日を選択"
        >
          <View style={styles.dateButtonContent}>
            <Icon name="stop-circle" size={14} color="#ff6b6b" />
            <Text style={styles.dateLabel}>終了日</Text>
          </View>
          <Text style={styles.dateValue}>{formatDate(dateRange.end)}</Text>
        </TouchableOpacity>
      </View>

      {(dateRange.start || dateRange.end) && (
        <View style={styles.info}>
          <Text style={styles.infoText}>
            {dateRange.start && dateRange.end
              ? `${formatDate(dateRange.start)} から ${formatDate(dateRange.end)} の期間でフィルター`
              : dateRange.start
              ? `${formatDate(dateRange.start)} 以降`
              : `${formatDate(dateRange.end)} 以前`}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = {
  container: {
    marginBottom: 24,
  },
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#e2e8f0',
    marginLeft: 8,
    fontFamily: 'Space Grotesk',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    flex: 1,
  },
  clearButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#333366',
  },
  clearButtonText: {
    fontSize: 11,
    color: '#a6adc8',
    fontFamily: 'JetBrains Mono',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  dateContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
  },
  dateButton: {
    flex: 1,
    backgroundColor: '#252545',
    borderWidth: 1,
    borderColor: '#333366',
    borderRadius: 6,
    padding: 12,
  },
  dateButtonContent: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: 8,
  },
  dateLabel: {
    fontSize: 12,
    color: '#a6adc8',
    marginLeft: 6,
    fontFamily: 'JetBrains Mono',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  dateValue: {
    fontSize: 14,
    color: '#e2e8f0',
    fontFamily: 'Space Grotesk',
    fontWeight: '500' as const,
  },
  dateSeparator: {
    paddingVertical: 8,
  },
  info: {
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#00ff88',
    borderRadius: 4,
  },
  infoText: {
    fontSize: 11,
    color: '#0f0f23',
    fontFamily: 'JetBrains Mono',
    fontWeight: '600' as const,
    textAlign: 'center' as const,
  },
};

export default DateRangeFilter;
