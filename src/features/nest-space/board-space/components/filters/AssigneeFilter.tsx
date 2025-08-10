import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Icon } from '../../../../../components/Icon';

interface AssigneeFilterProps {
  selectedAssignees: string[];
  availableUsers: { id: string; name: string }[];
  onChange: (assignees: string[]) => void;
}

const AssigneeFilter: React.FC<AssigneeFilterProps> = ({
  selectedAssignees,
  availableUsers,
  onChange,
}) => {
  const handleAssigneeToggle = (assigneeId: string) => {
    if (selectedAssignees.includes(assigneeId)) {
      onChange(selectedAssignees.filter(id => id !== assigneeId));
    } else {
      onChange([...selectedAssignees, assigneeId]);
    }
  };

  const handleSelectAll = () => {
    onChange(availableUsers.map(user => user.id));
  };

  const handleClearAll = () => {
    onChange([]);
  };

  const getAssigneeDisplayName = (userId: string) => {
    const user = availableUsers.find(u => u.id === userId);
    return user ? user.name : '不明なユーザー';
  };

  if (availableUsers.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Icon name="user" size={16} color="#a6adc8" />
          <Text style={styles.title}>担当者</Text>
        </View>
        <Text style={styles.emptyText}>利用可能な担当者がいません</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Icon name="user" size={16} color="#a6adc8" />
        <Text style={styles.title}>担当者</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleSelectAll}
            accessibilityLabel="全ての担当者を選択"
          >
            <Text style={styles.actionButtonText}>全選択</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleClearAll}
            accessibilityLabel="全ての担当者選択を解除"
          >
            <Text style={styles.actionButtonText}>クリア</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.assigneeList} showsVerticalScrollIndicator={false}>
        {availableUsers.map((user) => {
          const isSelected = selectedAssignees.includes(user.id);
          
          return (
            <TouchableOpacity
              key={user.id}
              style={[
                styles.assigneeItem,
                isSelected && styles.assigneeItemSelected
              ]}
              onPress={() => handleAssigneeToggle(user.id)}
              accessibilityLabel={`担当者「${user.name}」を${isSelected ? '選択解除' : '選択'}`}
              accessibilityState={{ selected: isSelected }}
            >
              <View style={styles.assigneeItemLeft}>
                <View style={styles.assigneeAvatar}>
                  <Icon name="user" size={16} color="#a6adc8" />
                </View>
                <View style={styles.assigneeInfo}>
                  <Text style={styles.assigneeName}>{user.name}</Text>
                  <Text style={styles.assigneeId}>{user.id}</Text>
                </View>
              </View>
              
              {isSelected && (
                <Icon name="check" size={16} color="#00ff88" />
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {selectedAssignees.length > 0 && (
        <View style={styles.selectedCount}>
          <Text style={styles.selectedCountText}>
            {selectedAssignees.length}人の担当者が選択されています
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
  assigneeList: {
    maxHeight: 200,
  },
  assigneeItem: {
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
  assigneeItemSelected: {
    backgroundColor: '#333366',
    borderColor: '#00ff88',
  },
  assigneeItemLeft: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    flex: 1,
  },
  assigneeAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#333366',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginRight: 12,
  },
  assigneeInfo: {
    flex: 1,
  },
  assigneeName: {
    fontSize: 14,
    color: '#e2e8f0',
    fontFamily: 'Space Grotesk',
    fontWeight: '500' as const,
    marginBottom: 2,
  },
  assigneeId: {
    fontSize: 10,
    color: '#6c7086',
    fontFamily: 'JetBrains Mono',
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

export default AssigneeFilter;
