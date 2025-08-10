import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Icon } from '../../../../../components/Icon';

interface CreatedByFilterProps {
  selectedUsers: string[];
  onChange: (users: string[]) => void;
  availableUsers: { id: string; name: string }[];
}

const CreatedByFilter: React.FC<CreatedByFilterProps> = ({
  selectedUsers,
  onChange,
  availableUsers,
}) => {
  const handleUserToggle = (userId: string) => {
    if (selectedUsers.includes(userId)) {
      onChange(selectedUsers.filter(id => id !== userId));
    } else {
      onChange([...selectedUsers, userId]);
    }
  };

  const handleSelectAll = () => {
    onChange(availableUsers.map(user => user.id));
  };

  const handleClearAll = () => {
    onChange([]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Icon name="edit" size={16} color="#a6adc8" />
        <Text style={styles.title}>作成者</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleSelectAll}
            accessibilityLabel="全ての作成者を選択"
          >
            <Text style={styles.actionButtonText}>全選択</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleClearAll}
            accessibilityLabel="全ての作成者選択を解除"
          >
            <Text style={styles.actionButtonText}>クリア</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.userList} showsVerticalScrollIndicator={false}>
        {availableUsers.length > 0 ? (
          availableUsers.map((user) => {
            const isSelected = selectedUsers.includes(user.id);
            
            return (
              <TouchableOpacity
                key={user.id}
                style={[
                  styles.userItem,
                  isSelected && styles.userItemSelected
                ]}
                onPress={() => handleUserToggle(user.id)}
                accessibilityLabel={`作成者「${user.name}」を${isSelected ? '選択解除' : '選択'}`}
                accessibilityState={{ selected: isSelected }}
              >
                <View style={styles.userItemLeft}>
                  <View style={[styles.userIcon, { backgroundColor: isSelected ? '#00ff88' : '#333366' }]}>
                    <Icon name="user" size={14} color="#ffffff" />
                  </View>
                  <Text style={styles.userName}>{user.name}</Text>
                  <Text style={styles.userId}>{user.id}</Text>
                </View>
                
                {isSelected && (
                  <Icon name="check" size={16} color="#00ff88" />
                )}
              </TouchableOpacity>
            );
          })
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>作成者が見つかりません</Text>
          </View>
        )}
      </ScrollView>

      {selectedUsers.length > 0 && (
        <View style={styles.selectedCount}>
          <Text style={styles.selectedCountText}>
            {selectedUsers.length}人の作成者が選択されています
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
  userList: {
    maxHeight: 200,
  },
  userItem: {
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
  userItemSelected: {
    backgroundColor: '#333366',
    borderColor: '#00ff88',
  },
  userItemLeft: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    flex: 1,
  },
  userIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginRight: 10,
  },
  userName: {
    fontSize: 14,
    color: '#e2e8f0',
    fontFamily: 'Space Grotesk',
    marginRight: 8,
  },
  userId: {
    fontSize: 10,
    color: '#6c7086',
    fontFamily: 'JetBrains Mono',
    backgroundColor: '#1a1a2e',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  emptyState: {
    paddingVertical: 20,
    alignItems: 'center' as const,
  },
  emptyText: {
    fontSize: 12,
    color: '#6c7086',
    fontFamily: 'JetBrains Mono',
    fontStyle: 'italic' as const,
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

export default CreatedByFilter;
