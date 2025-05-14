import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import InsightBadge from './InsightBadge';
import { Insight, InsightType } from '../types/insight';
import { BrandColors } from '../constants/Colors';
import { useInsight } from '../contexts/InsightContext';

interface ConversationSummaryProps {
  chatId: string;
  onClose?: () => void;
  visible?: boolean;
}

const ConversationSummary: React.FC<ConversationSummaryProps> = ({
  chatId,
  onClose,
  visible = true,
}) => {
  const { getInsightsByChatId, generateInsightsFromChat, loading } = useInsight();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (chatId && visible) {
      loadInsights();
    }
  }, [chatId, visible]);

  const loadInsights = async () => {
    if (!chatId) return;
    
    setIsGenerating(true);
    try {
      const fetchedInsights = await getInsightsByChatId(chatId);
      setInsights(fetchedInsights);
    } catch (error) {
      console.error('Failed to load insights:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateInsights = async () => {
    if (!chatId) return;
    
    setIsGenerating(true);
    try {
      await generateInsightsFromChat(chatId);
      await loadInsights();
    } catch (error) {
      console.error('Failed to generate insights:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  // インサイトを種類ごとにグループ化
  const groupedInsights = insights.reduce((acc, insight) => {
    if (!acc[insight.type]) {
      acc[insight.type] = [];
    }
    acc[insight.type].push(insight);
    return acc;
  }, {} as Record<InsightType, Insight[]>);

  const renderSectionTitle = (title: string, count: number) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.countBadge}>
        <Text style={styles.countText}>{count}</Text>
      </View>
    </View>
  );

  if (!visible) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>会話のインサイト</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            style={styles.expandButton}
            onPress={() => setExpanded(!expanded)}
          >
            <Ionicons 
              name={expanded ? "contract-outline" : "expand-outline"} 
              size={20} 
              color={BrandColors.text.secondary} 
            />
          </TouchableOpacity>
          {onClose && (
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={20} color={BrandColors.text.secondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView style={styles.content}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={BrandColors.primary} />
            <Text style={styles.loadingText}>インサイトを処理中...</Text>
          </View>
        ) : insights.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>この会話のインサイトはまだありません</Text>
            <TouchableOpacity
              style={styles.generateButton}
              onPress={handleGenerateInsights}
            >
              <Text style={styles.generateButtonText}>インサイトを生成</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {groupedInsights[InsightType.SUMMARY] && (
              <View style={styles.section}>
                {renderSectionTitle('要約', groupedInsights[InsightType.SUMMARY].length)}
                {groupedInsights[InsightType.SUMMARY].map(insight => (
                  <View key={insight.id} style={styles.summaryItem}>
                    <Text style={styles.summaryItemText}>{insight.content}</Text>
                  </View>
                ))}
              </View>
            )}

            {groupedInsights[InsightType.KEYWORD] && (
              <View style={styles.section}>
                {renderSectionTitle('キーワード', groupedInsights[InsightType.KEYWORD].length)}
                <View style={styles.insightBadges}>
                  {groupedInsights[InsightType.KEYWORD].map(insight => (
                    <InsightBadge key={insight.id} insight={insight} />
                  ))}
                </View>
              </View>
            )}

            {groupedInsights[InsightType.ACTION_ITEM] && (
              <View style={styles.section}>
                {renderSectionTitle('アクションアイテム', groupedInsights[InsightType.ACTION_ITEM].length)}
                {groupedInsights[InsightType.ACTION_ITEM].map(insight => (
                  <InsightBadge key={insight.id} insight={insight} />
                ))}
              </View>
            )}

            {groupedInsights[InsightType.QUESTION] && (
              <View style={styles.section}>
                {renderSectionTitle('質問', groupedInsights[InsightType.QUESTION].length)}
                {groupedInsights[InsightType.QUESTION].map(insight => (
                  <InsightBadge key={insight.id} insight={insight} />
                ))}
              </View>
            )}

            {groupedInsights[InsightType.DECISION] && (
              <View style={styles.section}>
                {renderSectionTitle('決定事項', groupedInsights[InsightType.DECISION].length)}
                {groupedInsights[InsightType.DECISION].map(insight => (
                  <InsightBadge key={insight.id} insight={insight} />
                ))}
              </View>
            )}

            <TouchableOpacity 
              style={styles.refreshButton}
              onPress={handleGenerateInsights}
              disabled={isGenerating || loading}
            >
              <Ionicons name="refresh" size={16} color={BrandColors.primary} />
              <Text style={styles.refreshButtonText}>
                {isGenerating ? '更新中...' : 'インサイトを更新'}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: BrandColors.text.primary,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  expandButton: {
    padding: 4,
    marginRight: 8,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 8,
    color: BrandColors.text.secondary,
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    marginBottom: 16,
    color: BrandColors.text.secondary,
    fontSize: 14,
    textAlign: 'center',
  },
  generateButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: BrandColors.primary,
    borderRadius: 20,
  },
  generateButtonText: {
    color: '#FFFFFF',
    fontWeight: '500',
    fontSize: 14,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  refreshButtonText: {
    fontSize: 12,
    color: BrandColors.primary,
    marginLeft: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: BrandColors.text.primary,
  },
  countBadge: {
    backgroundColor: BrandColors.secondary,
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  countText: {
    fontSize: 10,
    color: '#FFF',
    fontWeight: '700',
  },
  summaryItem: {
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
  },
  summaryItemText: {
    fontSize: 13,
    color: BrandColors.text.primary,
  },
  insightBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});

export default ConversationSummary; 