import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Icon } from '../../../../../components/Icon';
import { BoardColumnType } from '../../../../../types/board';

interface ColumnTypeFilterProps {
  selectedTypes: BoardColumnType[];
  onChange: (types: BoardColumnType[]) => void;
}

const ColumnTypeFilter: React.FC<ColumnTypeFilterProps> = ({
  selectedTypes,
  onChange,
}) => {
  const availableTypes: BoardColumnType[] = ['INBOX', 'QUESTIONS', 'INSIGHTS', 'THEMES', 'ACTIONS'];

  const handleTypeToggle = (type: BoardColumnType) => {
    if (selectedTypes.includes(type)) {
      onChange(selectedTypes.filter(t => t !== type));
    } else {
      onChange([...selectedTypes, type]);
    }
  };

  const handleSelectAll = () => {
    onChange(availableTypes);
  };

  const handleClearAll = () => {
    onChange([]);
  };

  const getTypeDisplayName = (type: BoardColumnType) => {
    const displayNames: Record<BoardColumnType, string> = {
      'INBOX': '受信トレイ',
      'QUESTIONS': '質問',
      'INSIGHTS': '洞察',
      'THEMES': 'テーマ',
      'ACTIONS': 'アクション',
    };
    
    return displayNames[type];
  };

  const getTypeIcon = (type: BoardColumnType) => {
    const icons: Record<BoardColumnType, string> = {
      'INBOX': 'inbox',
      'QUESTIONS': 'help-circle',
      'INSIGHTS': 'lightbulb',
      'THEMES': 'layers',
      'ACTIONS': 'play',
    };
    
    return icons[type];
  };

  const getTypeColor = (type: BoardColumnType) => {
    const colors: Record<BoardColumnType, string> = {
      'INBOX': '#ffd93d',
      'QUESTIONS': '#00ff88',
      'INSIGHTS': '#9c27b0',
      'THEMES': '#26c6da',
      'ACTIONS': '#4caf50',
    };
    
    return colors[type];
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Icon name="columns" size={16} color="#a6adc8" />
        <Text style={styles.title}>カラムタイプ</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleSelectAll}
            accessibilityLabel="全てのカラムタイプを選択"
          >
            <Text style={styles.actionButtonText}>全選択</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleClearAll}
            accessibilityLabel="全てのカラムタイプ選択を解除"
          >
            <Text style={styles.actionButtonText}>クリア</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.typeList} showsVerticalScrollIndicator={false}>
        {availableTypes.map((type) => {
          const isSelected = selectedTypes.includes(type);
          const displayName = getTypeDisplayName(type);
          const iconName = getTypeIcon(type);
          const color = getTypeColor(type);
          
          return (
            <TouchableOpacity
              key={type}
              style={[
                styles.typeItem,
                isSelected && styles.typeItemSelected
              ]}
              onPress={() => handleTypeToggle(type)}
              accessibilityLabel={`カラムタイプ「${displayName}」を${isSelected ? '選択解除' : '選択'}`}
              accessibilityState={{ selected: isSelected }}
            >
              <View style={styles.typeItemLeft}>
                <View style={[styles.typeIcon, { backgroundColor: color }]}>
                  <Icon name={iconName} size={14} color="#ffffff" />
                </View>
                <Text style={styles.typeName}>{displayName}</Text>
                <Text style={styles.typeCode}>{type}</Text>
              </View>
              
              {isSelected && (
                <Icon name="check" size={16} color="#00ff88" />
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {selectedTypes.length > 0 && (
        <View style={styles.selectedCount}>
          <Text style={styles.selectedCountText}>
            {selectedTypes.length}個のカラムタイプが選択されています
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
  typeList: {
    maxHeight: 200,
  },
  typeItem: {
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
  typeItemSelected: {
    backgroundColor: '#333366',
    borderColor: '#00ff88',
  },
  typeItemLeft: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    flex: 1,
  },
  typeIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginRight: 10,
  },
  typeName: {
    fontSize: 14,
    color: '#e2e8f0',
    fontFamily: 'Space Grotesk',
    marginRight: 8,
  },
  typeCode: {
    fontSize: 10,
    color: '#6c7086',
    fontFamily: 'JetBrains Mono',
    backgroundColor: '#1a1a2e',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
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

export default ColumnTypeFilter;
