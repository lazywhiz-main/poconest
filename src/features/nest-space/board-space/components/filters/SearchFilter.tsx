import React from 'react';
import { View, Text, TextInput } from 'react-native';
import { Icon } from '../../../../../components/Icon';

interface SearchFilterProps {
  value: string;
  onChange: (value: string) => void;
}

const SearchFilter: React.FC<SearchFilterProps> = ({
  value,
  onChange,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Icon name="search" size={16} color="#a6adc8" />
        <Text style={styles.title}>検索</Text>
      </View>
      
      <TextInput
        style={styles.searchInput}
        value={value}
        onChangeText={onChange}
        placeholder="カードのタイトル、内容、タグを検索..."
        placeholderTextColor="#6c7086"
        accessibilityLabel="カード検索"
      />
      
      {value && (
        <View style={styles.searchInfo}>
          <Text style={styles.searchInfoText}>
            検索クエリ: "{value}"
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
  searchInput: {
    backgroundColor: '#252545',
    borderWidth: 1,
    borderColor: '#333366',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#e2e8f0',
    fontFamily: 'Space Grotesk',
  },
  searchInfo: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#00ff88',
    borderRadius: 4,
  },
  searchInfoText: {
    fontSize: 11,
    color: '#0f0f23',
    fontFamily: 'JetBrains Mono',
    fontWeight: '600' as const,
  },
};

export default SearchFilter;
