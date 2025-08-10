import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Icon } from '../../../../../components/Icon';

interface PriorityFilterProps {
  selectedPriorities: ('high' | 'medium' | 'low')[];
  onChange: (priorities: ('high' | 'medium' | 'low')[]) => void;
}

const PriorityFilter: React.FC<PriorityFilterProps> = ({
  selectedPriorities,
  onChange,
}) => {
  const priorities = [
    { value: 'high' as const, label: '高', icon: 'alert-triangle', color: '#ff6b6b' },
    { value: 'medium' as const, label: '中', icon: 'minus-circle', color: '#ffd93d' },
    { value: 'low' as const, label: '低', icon: 'check-circle', color: '#4caf50' },
  ];

  const handlePriorityToggle = (priority: 'high' | 'medium' | 'low') => {
    if (selectedPriorities.includes(priority)) {
      onChange(selectedPriorities.filter(p => p !== priority));
    } else {
      onChange([...selectedPriorities, priority]);
    }
  };

  const handleSelectAll = () => {
    onChange(['high', 'medium', 'low']);
  };

  const handleClearAll = () => {
    onChange([]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Icon name="flag" size={16} color="#a6adc8" />
        <Text style={styles.title}>優先度</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleSelectAll}
            accessibilityLabel="全ての優先度を選択"
          >
            <Text style={styles.actionButtonText}>全選択</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleClearAll}
            accessibilityLabel="全ての優先度選択を解除"
          >
            <Text style={styles.actionButtonText}>クリア</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.priorityContainer}>
        {priorities.map(({ value, label, icon, color }) => {
          const isSelected = selectedPriorities.includes(value);
          
          return (
            <TouchableOpacity
              key={value}
              style={[
                styles.priorityItem,
                isSelected && styles.priorityItemSelected,
                { borderColor: isSelected ? color : 'transparent' }
              ]}
              onPress={() => handlePriorityToggle(value)}
              accessibilityLabel={`優先度「${label}」を${isSelected ? '選択解除' : '選択'}`}
              accessibilityState={{ selected: isSelected }}
            >
              <View style={styles.priorityItemLeft}>
                <View style={[styles.priorityIcon, { backgroundColor: color }]}>
                  <Icon name={icon} size={16} color="#ffffff" />
                </View>
                <View style={styles.priorityInfo}>
                  <Text style={styles.priorityLabel}>{label}</Text>
                  <Text style={styles.priorityValue}>{value.toUpperCase()}</Text>
                </View>
              </View>
              
              {isSelected && (
                <Icon name="check" size={16} color={color} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {selectedPriorities.length > 0 && (
        <View style={styles.selectedCount}>
          <Text style={styles.selectedCountText}>
            {selectedPriorities.length}個の優先度が選択されています
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
  },
  headerActions: {
    flexDirection: 'row' as const,
    marginLeft: 'auto' as const,
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#333366',
  },
  actionButtonText: {
    fontSize: 11,
    color: '#a6adc8',
    fontFamily: 'JetBrains Mono',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  priorityContainer: {
    gap: 8,
  },
  priorityItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#252545',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  priorityItemSelected: {
    backgroundColor: '#333366',
  },
  priorityItemLeft: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    flex: 1,
  },
  priorityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginRight: 12,
  },
  priorityInfo: {
    flex: 1,
  },
  priorityLabel: {
    fontSize: 16,
    color: '#e2e8f0',
    fontFamily: 'Space Grotesk',
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  priorityValue: {
    fontSize: 11,
    color: '#6c7086',
    fontFamily: 'JetBrains Mono',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  selectedCount: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#00ff88',
    borderRadius: 6,
  },
  selectedCountText: {
    fontSize: 11,
    color: '#0f0f23',
    fontFamily: 'JetBrains Mono',
    textAlign: 'center' as const,
    fontWeight: '600' as const,
  },
};

export default PriorityFilter;
