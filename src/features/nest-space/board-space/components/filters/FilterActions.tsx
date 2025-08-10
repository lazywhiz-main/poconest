import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Icon } from '../../../../../components/Icon';

interface FilterActionsProps {
  onClearAll: () => void;
  activeFiltersCount: number;
}

const FilterActions: React.FC<FilterActionsProps> = ({
  onClearAll,
  activeFiltersCount,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.divider} />
      
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={[
            styles.clearButton,
            activeFiltersCount === 0 && styles.clearButtonDisabled
          ]}
          onPress={onClearAll}
          disabled={activeFiltersCount === 0}
          accessibilityLabel="全てのフィルターをクリア"
        >
          <Icon 
            name="x-circle" 
            size={16} 
            color={activeFiltersCount === 0 ? '#6c7086' : '#ff6b6b'} 
          />
          <Text style={[
            styles.clearButtonText,
            activeFiltersCount === 0 && styles.clearButtonTextDisabled
          ]}>
            全てクリア
          </Text>
        </TouchableOpacity>

        <View style={styles.filterInfo}>
          <Icon name="filter" size={14} color="#00ff88" />
          <Text style={styles.filterInfoText}>
            {activeFiltersCount}個のフィルターが適用中
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = {
  container: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#0f0f23',
    borderTopWidth: 1,
    borderTopColor: '#333366',
  },
  divider: {
    height: 1,
    backgroundColor: '#333366',
    marginBottom: 16,
  },
  actionsContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },
  clearButton: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#1a1a2e',
    borderWidth: 1,
    borderColor: '#ff6b6b',
    borderRadius: 6,
    gap: 8,
  },
  clearButtonDisabled: {
    backgroundColor: '#252545',
    borderColor: '#333366',
  },
  clearButtonText: {
    fontSize: 14,
    color: '#ff6b6b',
    fontFamily: 'Space Grotesk',
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  clearButtonTextDisabled: {
    color: '#6c7086',
  },
  filterInfo: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
  },
  filterInfoText: {
    fontSize: 12,
    color: '#a6adc8',
    fontFamily: 'JetBrains Mono',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
};

export default FilterActions;
