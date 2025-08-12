import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  GestureResponderEvent
} from 'react-native';
import { useBoardSpace } from '../hooks/useBoardSpace';
import { Card, BoardColumnType } from '../../../../types/board';

interface BoardCardProps {
  card: Card;
  onPress?: (cardId: string) => void;
  isSelected?: boolean;
}

const BoardCard: React.FC<BoardCardProps> = ({ 
  card, 
  onPress, 
  isSelected = false
}) => {
  const { 
    toggleCardSelection, 
    toggleExpandCard, 
    boardSpaceState,
    togglePinCard,
    deleteCard
  } = useBoardSpace();
  
  const [showMenu, setShowMenu] = useState(false);
  
  const isExpanded = boardSpaceState.expandedCards.includes(card.id);
  const isPinned = boardSpaceState.pinnedCards.includes(card.id);
  
  const handlePress = () => {
    if (boardSpaceState.isSelectionMode) {
      toggleCardSelection(card.id);
    } else if (onPress) {
      onPress(card.id);
    }
  };
  
  const handleLongPress = () => {
    if (!boardSpaceState.isSelectionMode) {
      toggleCardSelection(card.id);
    }
  };
  
  const toggleMenu = (e: GestureResponderEvent) => {
    e.stopPropagation();
    setShowMenu(!showMenu);
  };
  
  const handleExpand = (e: GestureResponderEvent) => {
    e.stopPropagation();
    toggleExpandCard(card.id);
  };
  
  const handlePin = (e: GestureResponderEvent) => {
    e.stopPropagation();
    togglePinCard(card.id);
  };
  
  const handleDelete = (e: GestureResponderEvent) => {
    e.stopPropagation();
    deleteCard(card.id);
    setShowMenu(false);
  };
  
  // Format the date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ja-JP', { 
      month: '2-digit', 
      day: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Tokyo'
    });
  };
  
  // Get source icon based on card source
  const getSourceIcon = () => {
    switch(card.sourceType) {
      case 'chat':
        return '💬';
      case 'zoom':
        return '🎥';
      case 'manual':
      default:
        return '📝';
    }
  };
  
  return (
    <TouchableOpacity 
      style={[
        styles.card, 
        isSelected && styles.selectedCard,
        isPinned && styles.pinnedCard,
        isExpanded && styles.expandedCard
      ]} 
      onPress={handlePress}
      onLongPress={handleLongPress}
      activeOpacity={0.7}
    >
      {/* Card Header with title and controls */}
      <View style={styles.cardHeader}>
        <View style={styles.titleRow}>
          {isPinned && (
            <Text style={styles.pinIcon}>📌</Text>
          )}
          <Text style={styles.cardTitle} numberOfLines={isExpanded ? undefined : 1}>
            {card.title}
          </Text>
        </View>
        
        <View style={styles.cardControls}>
          <TouchableOpacity onPress={handleExpand} style={styles.controlButton}>
            <Text>{isExpanded ? '▲' : '▼'}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity onPress={handlePin} style={styles.controlButton}>
            <Text>{isPinned ? '📌' : '📍'}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity onPress={toggleMenu} style={styles.controlButton}>
            <Text>⋯</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Card Body - Description */}
      <Text 
        style={styles.cardDescription} 
        numberOfLines={isExpanded ? undefined : 3}
      >
        {card.description}
      </Text>
      
      {/* Card Footer - Source info and Tags */}
      <View style={styles.cardFooter}>
        <View style={styles.sourceInfo}>
          <Text style={styles.sourceIcon}>{getSourceIcon()}</Text>
          {card.sources?.map((source, index) => (
            <View key={source.id} style={styles.sourceBadge}>
              <Text style={styles.sourceLabel}>{source.label}</Text>
            </View>
          ))}
          <Text style={styles.cardDate}>
            {formatDate(card.updated_at)}
          </Text>
        </View>
        
        <View style={styles.tagsContainer}>
          {card.tags?.slice(0, isExpanded ? undefined : 2).map((tag, index) => (
            <View key={index} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
          {!isExpanded && (card.tags?.length ?? 0) > 2 && (
            <View style={styles.tag}>
              <Text style={styles.tagText}>+{(card.tags?.length ?? 0) - 2}</Text>
            </View>
          )}
        </View>
      </View>
      
      {/* Actions Menu (for delete, etc.) */}
      {showMenu && (
        <View style={styles.actionsMenu}>
          <View style={styles.menuDivider} />
          <TouchableOpacity 
            style={[styles.actionButton, styles.deleteButton]}
            onPress={handleDelete}
          >
            <Text style={styles.deleteText}>Delete Card</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    position: 'relative',
  },
  selectedCard: {
    borderColor: '#4a6da7',
    backgroundColor: 'rgba(74, 109, 167, 0.05)',
  },
  pinnedCard: {
    borderColor: '#FFB800',
    borderLeftWidth: 3,
  },
  expandedCard: {
    minHeight: 150,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  pinIcon: {
    marginRight: 4,
    fontSize: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  cardControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  controlButton: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sourceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sourceIcon: {
    marginRight: 4,
    fontSize: 14,
  },
  cardDate: {
    fontSize: 12,
    color: '#999',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  tag: {
    backgroundColor: 'rgba(74, 109, 167, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 4,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 12,
    color: '#4a6da7',
  },
  actionsMenu: {
    position: 'absolute',
    top: 40,
    right: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    padding: 4,
    zIndex: 10,
    minWidth: 160,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
      },
    }),
  },
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  deleteButton: {
    backgroundColor: 'rgba(255, 0, 0, 0.05)',
  },
  deleteText: {
    color: '#E53935',
    fontSize: 14,
  },
  sourceBadge: {
    backgroundColor: 'rgba(74, 109, 167, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  sourceLabel: {
    fontSize: 11,
    color: '#4a6da7',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#EEEEEE',
    marginVertical: 4,
  },
});

export default BoardCard; 