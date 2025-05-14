import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Insight, InsightType, InsightPriority } from '../types/insight';
import { BrandColors } from '../constants/Colors';

interface InsightCardProps {
  insight: {
    id: string;
    type: InsightType;
    content: string;  // Card型のdescriptionフィールドから変換
    priority: InsightPriority;
    sourceChatId: string;
    sourceMessageIds: string[];
    createdAt: string;  // Card型のcreated_atから変換
    updatedAt: string;  // Card型のupdated_atから変換
    isReviewed: boolean;
    isSaved: boolean;
    cardId?: string;
    metadata?: Record<string, any>;
    category?: string;
  };
  onPress?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

const InsightCard: React.FC<InsightCardProps> = ({
  insight,
  onPress,
  onEdit,
  onDelete
}) => {
  // インサイトタイプに基づくアイコンとカラーの選択
  const getTypeIcon = (type: InsightType) => {
    switch (type) {
      case InsightType.SUMMARY:
        return 'document-text';
      case InsightType.KEYWORD:
        return 'pricetag';
      case InsightType.ACTION_ITEM:
        return 'checkmark-circle';
      case InsightType.QUESTION:
        return 'help-circle';
      case InsightType.DECISION:
        return 'flag';
      default:
        return 'bookmark';
    }
  };

  const getTypeColor = (type: InsightType) => {
    switch (type) {
      case InsightType.SUMMARY:
        return '#4D96FF'; // ソーダ
      case InsightType.KEYWORD:
        return '#FF6B6B'; // コーラル
      case InsightType.ACTION_ITEM:
        return '#34C759'; // 緑
      case InsightType.QUESTION:
        return '#5AC8FA'; // 水色
      case InsightType.DECISION:
        return '#AF52DE'; // 紫
      default:
        return '#FF9500'; // オレンジ
    }
  };

  const getTypeLabel = (type: InsightType): string => {
    switch (type) {
      case InsightType.SUMMARY:
        return '要約';
      case InsightType.KEYWORD:
        return 'キーワード';
      case InsightType.ACTION_ITEM:
        return 'タスク';
      case InsightType.QUESTION:
        return '質問';
      case InsightType.DECISION:
        return '決定事項';
      case InsightType.CUSTOM:
        return 'カスタム';
      default:
        return 'その他';
    }
  };

  const getPriorityLabel = (priority: InsightPriority): string => {
    switch (priority) {
      case InsightPriority.HIGH:
        return '高';
      case InsightPriority.MEDIUM:
        return '中';
      case InsightPriority.LOW:
        return '低';
      default:
        return '中';
    }
  };

  const getPriorityColor = (priority: InsightPriority): string => {
    switch (priority) {
      case InsightPriority.HIGH:
        return '#FF3B30';
      case InsightPriority.MEDIUM:
        return '#FF9500';
      case InsightPriority.LOW:
        return '#FFCC00';
      default:
        return '#FF9500';
    }
  };

  const typeColor = getTypeColor(insight.type);
  const priorityColor = getPriorityColor(insight.priority);

  // フォーマットされた日付
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <TouchableOpacity
      style={[styles.card, { borderLeftColor: typeColor }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.cardHeader}>
        <View style={styles.typeContainer}>
          <View style={[styles.typeIconContainer, { backgroundColor: typeColor }]}>
            <Ionicons name={getTypeIcon(insight.type)} size={14} color="#FFF" />
          </View>
          <Text style={styles.typeLabel}>{getTypeLabel(insight.type)}</Text>
        </View>
        
        <View style={styles.actions}>
          {onEdit && (
            <TouchableOpacity style={styles.actionButton} onPress={onEdit}>
              <Ionicons name="create-outline" size={18} color={BrandColors.text.secondary} />
            </TouchableOpacity>
          )}
          {onDelete && (
            <TouchableOpacity style={styles.actionButton} onPress={onDelete}>
              <Ionicons name="trash-outline" size={18} color={BrandColors.text.secondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      <Text style={styles.content}>{insight.content}</Text>
      
      <View style={styles.cardFooter}>
        <View style={styles.metaInfo}>
          <View style={[styles.priorityBadge, { backgroundColor: `${priorityColor}20`, borderColor: priorityColor }]}>
            <Text style={[styles.priorityText, { color: priorityColor }]}>
              {getPriorityLabel(insight.priority)}
            </Text>
          </View>
          
          {insight.category && (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{insight.category}</Text>
            </View>
          )}
        </View>
        
        <Text style={styles.date}>{formatDate(insight.createdAt)}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: BrandColors.backgroundVariants.light,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    alignItems: 'center',
  },
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  typeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: BrandColors.text.secondary,
  },
  actions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 4,
    marginLeft: 8,
  },
  content: {
    fontSize: 16,
    color: BrandColors.text.primary,
    marginBottom: 16,
    lineHeight: 22,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    marginRight: 8,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '600',
  },
  categoryBadge: {
    backgroundColor: `${BrandColors.text.tertiary}20`,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  categoryText: {
    fontSize: 12,
    color: BrandColors.text.secondary,
  },
  date: {
    fontSize: 12,
    color: BrandColors.text.tertiary,
  },
});

export default InsightCard; 