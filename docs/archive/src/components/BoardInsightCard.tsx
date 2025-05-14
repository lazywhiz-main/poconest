import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Card } from '../types/board';
import { InsightType, InsightPriority } from '../types/insight';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

interface BoardInsightCardProps {
  card: Card;
  onEdit?: (card: Card) => void;
  onDelete?: (cardId: string) => void;
  onMove?: (cardId: string, targetColumn: string) => void;
}

const BoardInsightCard: React.FC<BoardInsightCardProps> = ({
  card,
  onEdit,
  onDelete,
  onMove,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const { colors } = useTheme();

  // Get insight type and priority from card metadata
  const insightType = card.metadata?.insightType as InsightType || InsightType.CUSTOM;
  const insightPriority = card.metadata?.insightPriority as InsightPriority || InsightPriority.MEDIUM;

  // Get icon and color based on insight type
  const getIconAndColor = () => {
    switch (insightType) {
      case InsightType.SUMMARY:
        return { icon: 'document-text', color: colors.primary };
      case InsightType.KEYWORD:
        return { icon: 'pricetag', color: colors.accent };
      case InsightType.ACTION_ITEM:
        return { icon: 'checkmark-circle', color: colors.success };
      case InsightType.QUESTION:
        return { icon: 'help-circle', color: colors.warning };
      case InsightType.DECISION:
        return { icon: 'flag', color: colors.info };
      default:
        return { icon: 'star', color: colors.secondary };
    }
  };

  const { icon, color } = getIconAndColor();

  // Get border color based on priority
  const getBorderColor = () => {
    switch (insightPriority) {
      case InsightPriority.HIGH:
        return colors.error;
      case InsightPriority.MEDIUM:
        return colors.warning;
      case InsightPriority.LOW:
        return colors.success;
      default:
        return colors.border;
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  return (
    <TouchableOpacity
      style={[
        styles.card,
        { 
          backgroundColor: colors.cardBackground,
          borderColor: getBorderColor(),
        }
      ]}
      onPress={() => setModalVisible(true)}
    >
      <View style={styles.header}>
        <View style={styles.typeContainer}>
          <Ionicons name={icon} size={16} color={color} style={styles.icon} />
          <Text style={[styles.type, { color }]}>
            {insightType.charAt(0).toUpperCase() + insightType.slice(1)}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={(e) => {
            e.stopPropagation();
            setModalVisible(true);
          }}
        >
          <Ionicons name="ellipsis-vertical" size={16} color={colors.text} />
        </TouchableOpacity>
      </View>

      <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
        {card.title}
      </Text>
      
      <Text style={[styles.content, { color: colors.textSecondary }]} numberOfLines={3}>
        {card.content}
      </Text>
      
      <View style={styles.footer}>
        <Text style={[styles.date, { color: colors.textTertiary }]}>
          {formatDate(card.updatedAt)}
        </Text>
        {card.tags && card.tags.length > 0 && (
          <View style={styles.tags}>
            {card.tags.slice(0, 2).map((tag, index) => (
              <View 
                key={index} 
                style={[styles.tag, { backgroundColor: colors.backgroundLight }]}
              >
                <Text style={[styles.tagText, { color: colors.textSecondary }]}>
                  {tag}
                </Text>
              </View>
            ))}
            {card.tags.length > 2 && (
              <Text style={[styles.moreTag, { color: colors.textTertiary }]}>
                +{card.tags.length - 2}
              </Text>
            )}
          </View>
        )}
      </View>

      {/* Modal for card actions */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View 
            style={[
              styles.modalContent,
              { backgroundColor: colors.cardBackground }
            ]}
          >
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {card.title}
            </Text>
            
            <Text style={[styles.modalContent, { color: colors.textSecondary }]}>
              {card.content}
            </Text>

            <View style={styles.actionButtons}>
              {onEdit && (
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: colors.primary }]}
                  onPress={() => {
                    setModalVisible(false);
                    onEdit(card);
                  }}
                >
                  <Ionicons name="create-outline" size={20} color="white" />
                  <Text style={styles.actionButtonText}>Edit</Text>
                </TouchableOpacity>
              )}
              
              {onMove && (
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: colors.info }]}
                  onPress={() => {
                    setModalVisible(false);
                    // For simplicity, just move to THEMES column
                    onMove(card.id, 'themes');
                  }}
                >
                  <Ionicons name="move-outline" size={20} color="white" />
                  <Text style={styles.actionButtonText}>Move</Text>
                </TouchableOpacity>
              )}
              
              {onDelete && (
                <TouchableOpacity
                  style={[styles.actionButton, { backgroundColor: colors.error }]}
                  onPress={() => {
                    setModalVisible(false);
                    onDelete(card.id);
                  }}
                >
                  <Ionicons name="trash-outline" size={20} color="white" />
                  <Text style={styles.actionButtonText}>Delete</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 4,
  },
  type: {
    fontSize: 12,
    fontWeight: '600',
  },
  menuButton: {
    padding: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  content: {
    fontSize: 14,
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  date: {
    fontSize: 12,
  },
  tags: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tag: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 4,
  },
  tagText: {
    fontSize: 10,
  },
  moreTag: {
    fontSize: 10,
    marginLeft: 4,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 20,
  },
  modalContent: {
    width: '90%',
    borderRadius: 16,
    padding: 20,
    maxHeight: '80%',
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    marginTop: 12,
  },
  modalContent: {
    fontSize: 14,
    marginBottom: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  actionButtonText: {
    color: 'white',
    marginLeft: 8,
    fontWeight: '500',
  },
});

export default BoardInsightCard; 