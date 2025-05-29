import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Platform } from 'react-native';
import { Nest } from '../../contexts/NestContext';
import { COLORS } from '@constants/config';

interface NestPopoverMenuProps {
  nests: Nest[];
  currentNestId: string | null;
  onSelectNest: (nest: Nest) => void;
  onCreateNest: () => void;
}

const NestPopoverMenu: React.FC<NestPopoverMenuProps> = ({
  nests,
  currentNestId,
  onSelectNest,
  onCreateNest,
}) => {
  return (
    <View style={styles.container}>
      <FlatList
        data={nests}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.nestItem,
              currentNestId === item.id && styles.activeNestItem
            ]}
            onPress={() => onSelectNest(item)}
            accessibilityRole="menuitem"
          >
            <View 
              style={[
                styles.nestColorIndicator, 
                { backgroundColor: item.color || COLORS.primary }
              ]} 
            />
            <Text style={styles.nestName}>{item.name}</Text>
            {currentNestId === item.id && (
              <Text style={styles.checkmark}>✓</Text>
            )}
          </TouchableOpacity>
        )}
        ListFooterComponent={
          <TouchableOpacity 
            style={styles.createButton}
            onPress={onCreateNest}
            accessibilityRole="menuitem"
          >
            <Text style={styles.createButtonText}>+ 新しいNESTを作成</Text>
          </TouchableOpacity>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    maxHeight: 300,
    width: 320,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    position: 'absolute',
    top: 16,
    left: 16,
    alignSelf: 'flex-start',
    zIndex: 999,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
      },
      default: {
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      }
    }),
  },
  nestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  activeNestItem: {
    backgroundColor: COLORS.lightGray,
  },
  nestColorIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  nestName: {
    fontSize: 16,
    color: COLORS.text,
    flex: 1,
  },
  checkmark: {
    fontSize: 16,
    color: COLORS.primary,
    marginLeft: 8,
  },
  createButton: {
    padding: 12,
    alignItems: 'center',
  },
  createButtonText: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '600',
  },
});

export default NestPopoverMenu; 