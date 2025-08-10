import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Icon } from '../../../../../components/Icon';

interface SourceFilterProps {
  selectedSources: string[];
  availableSources: string[];
  onChange: (sources: string[]) => void;
}

const SourceFilter: React.FC<SourceFilterProps> = ({
  selectedSources,
  availableSources,
  onChange,
}) => {
  const handleSourceToggle = (source: string) => {
    if (selectedSources.includes(source)) {
      onChange(selectedSources.filter(s => s !== source));
    } else {
      onChange([...selectedSources, source]);
    }
  };

  const handleSelectAll = () => {
    onChange(availableSources);
  };

  const handleClearAll = () => {
    onChange([]);
  };

  // ソースの表示名を取得
  const getSourceDisplayName = (source: string) => {
    const displayNames: Record<string, string> = {
      'chat': 'チャット',
      'zoom': 'Zoom',
      'manual': '手動',
      'ai': 'AI',
      'meeting': 'ミーティング',
      'analysis': '分析',
      'insight': 'インサイト',
      'theme': 'テーマ',
      'task': 'タスク',
      'idea': 'アイデア',
      'issue': '課題',
      'decision': '決定事項',
      'note': 'メモ',
    };
    
    return displayNames[source] || source;
  };

  // ソースのアイコンを取得
  const getSourceIcon = (source: string) => {
    const icons: Record<string, string> = {
      'chat': 'message-circle',
      'zoom': 'video',
      'manual': 'edit',
      'ai': 'zap',
      'meeting': 'users',
      'analysis': 'bar-chart-2',
      'insight': 'lightbulb',
      'theme': 'target',
      'task': 'check-square',
      'idea': 'star',
      'issue': 'alert-triangle',
      'decision': 'check-circle',
      'note': 'file-text',
    };
    
    return icons[source] || 'circle';
  };

  // ソースの色を取得
  const getSourceColor = (source: string) => {
    const colors: Record<string, string> = {
      'chat': '#64b5f6',
      'zoom': '#ff6b6b',
      'manual': '#ffd93d',
      'ai': '#00ff88',
      'meeting': '#9c27b0',
      'analysis': '#26c6da',
      'insight': '#ffa500',
      'theme': '#4caf50',
      'task': '#2196f3',
      'idea': '#ff9800',
      'issue': '#f44336',
      'decision': '#4caf50',
      'note': '#607d8b',
    };
    
    return colors[source] || '#a6adc8';
  };

  if (availableSources.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Icon name="database" size={16} color="#a6adc8" />
          <Text style={styles.title}>ソース</Text>
        </View>
        <Text style={styles.emptyText}>利用可能なソースがありません</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Icon name="database" size={16} color="#a6adc8" />
        <Text style={styles.title}>ソース</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleSelectAll}
            accessibilityLabel="全てのソースを選択"
          >
            <Text style={styles.actionButtonText}>全選択</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleClearAll}
            accessibilityLabel="全てのソース選択を解除"
          >
            <Text style={styles.actionButtonText}>クリア</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.sourceList} showsVerticalScrollIndicator={false}>
        {availableSources.map((source) => {
          const isSelected = selectedSources.includes(source);
          const displayName = getSourceDisplayName(source);
          const iconName = getSourceIcon(source);
          const color = getSourceColor(source);
          
          return (
            <TouchableOpacity
              key={source}
              style={[
                styles.sourceItem,
                isSelected && styles.sourceItemSelected
              ]}
              onPress={() => handleSourceToggle(source)}
              accessibilityLabel={`${displayName}を${isSelected ? '選択解除' : '選択'}`}
              accessibilityState={{ selected: isSelected }}
            >
              <View style={styles.sourceItemLeft}>
                <View style={[styles.sourceIcon, { backgroundColor: color }]}>
                  <Icon name={iconName} size={14} color="#ffffff" />
                </View>
                <Text style={styles.sourceName}>{displayName}</Text>
              </View>
              
              {isSelected && (
                <Icon name="check" size={16} color="#00ff88" />
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {selectedSources.length > 0 && (
        <View style={styles.selectedCount}>
          <Text style={styles.selectedCountText}>
            {selectedSources.length}個のソースが選択されています
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
  sourceList: {
    maxHeight: 200,
  },
  sourceItem: {
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
  sourceItemSelected: {
    backgroundColor: '#333366',
    borderColor: '#00ff88',
  },
  sourceItemLeft: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    flex: 1,
  },
  sourceIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginRight: 10,
  },
  sourceName: {
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

export default SourceFilter;
