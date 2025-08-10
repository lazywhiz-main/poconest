import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Icon } from '../../../../../components/Icon';

interface TagFilterProps {
  selectedTags: string[];
  availableTags: string[];
  onChange: (tags: string[]) => void;
}

const TagFilter: React.FC<TagFilterProps> = ({
  selectedTags,
  availableTags,
  onChange,
}) => {
  const handleTagToggle = (tag: string) => {
    if (selectedTags.includes(tag)) {
      onChange(selectedTags.filter(t => t !== tag));
    } else {
      onChange([...selectedTags, tag]);
    }
  };

  const handleSelectAll = () => {
    onChange(availableTags);
  };

  const handleClearAll = () => {
    onChange([]);
  };

  if (availableTags.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Icon name="tag" size={16} color="#a6adc8" />
          <Text style={styles.title}>タグ</Text>
        </View>
        <Text style={styles.emptyText}>利用可能なタグがありません</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Icon name="tag" size={16} color="#a6adc8" />
        <Text style={styles.title}>タグ</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleSelectAll}
            accessibilityLabel="全てのタグを選択"
          >
            <Text style={styles.actionButtonText}>全選択</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleClearAll}
            accessibilityLabel="全てのタグ選択を解除"
          >
            <Text style={styles.actionButtonText}>クリア</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.tagList} showsVerticalScrollIndicator={false}>
        {availableTags.map((tag) => {
          const isSelected = selectedTags.includes(tag);
          
          return (
            <TouchableOpacity
              key={tag}
              style={[
                styles.tagItem,
                isSelected && styles.tagItemSelected
              ]}
              onPress={() => handleTagToggle(tag)}
              accessibilityLabel={`タグ「${tag}」を${isSelected ? '選択解除' : '選択'}`}
              accessibilityState={{ selected: isSelected }}
            >
              <View style={styles.tagItemLeft}>
                <View style={styles.tagIcon}>
                  <Icon name="tag" size={12} color="#a6adc8" />
                </View>
                <Text style={styles.tagName}>{tag}</Text>
              </View>
              
              {isSelected && (
                <Icon name="check" size={16} color="#00ff88" />
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {selectedTags.length > 0 && (
        <View style={styles.selectedCount}>
          <Text style={styles.selectedCountText}>
            {selectedTags.length}個のタグが選択されています
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
  tagList: {
    maxHeight: 200,
  },
  tagItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginBottom: 4,
    backgroundColor: '#252545',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tagItemSelected: {
    backgroundColor: '#333366',
    borderColor: '#00ff88',
  },
  tagItemLeft: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    flex: 1,
  },
  tagIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#333366',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginRight: 10,
  },
  tagName: {
    fontSize: 14,
    color: '#e2e8f0',
    fontFamily: 'Space Grotesk',
  },
  emptyText: {
    fontSize: 12,
    color: '#6c7086',
    fontStyle: 'italic' as const,
    textAlign: 'center' as const,
    paddingVertical: 16,
  },
  selectedCount: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#00ff88',
    borderRadius: 4,
  },
  selectedCountText: {
    fontSize: 11,
    color: '#0f0f23',
    fontFamily: 'JetBrains Mono',
    textAlign: 'center' as const,
    fontWeight: '600' as const,
  },
};

export default TagFilter;
