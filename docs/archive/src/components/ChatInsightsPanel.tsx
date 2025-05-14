import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Insight } from '../types/insight';
import { BrandColors } from '../constants/Colors';
import InsightBadge from './InsightBadge';
import { useInsight } from '../contexts/InsightContext';

interface ChatInsightsPanelProps {
  chatId: string;
  onInsightSelect?: (insight: Insight) => void;
}

const ChatInsightsPanel: React.FC<ChatInsightsPanelProps> = ({ 
  chatId, 
  onInsightSelect
}) => {
  const { getInsightsByChatId, loading } = useInsight();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [expanded, setExpanded] = useState(false);

  // チャットIDに関連するインサイトを取得
  const fetchInsights = async () => {
    if (chatId) {
      const chatInsights = await getInsightsByChatId(chatId);
      setInsights(chatInsights);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, [chatId]);

  // インサイトがない場合は何も表示しない
  if (insights.length === 0) {
    return null;
  }

  return (
    <View style={expanded ? styles.container : styles.compactContainer}>
      <View style={expanded ? styles.headerContainer : styles.headerContainerCompact}>
        <Text style={expanded ? styles.headerTitle : styles.headerTitleCompact}>
          インサイト
        </Text>
        <View style={styles.buttonGroup}>
          <TouchableOpacity 
            style={expanded ? styles.refreshButton : styles.refreshButtonCompact}
            onPress={fetchInsights}
            disabled={loading}
          >
            <Ionicons 
              name="refresh" 
              size={expanded ? 16 : 14} 
              color={loading ? BrandColors.text.tertiary : BrandColors.primary} 
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setExpanded(!expanded)}
          >
            <Ionicons 
              name={expanded ? "chevron-up" : "chevron-down"} 
              size={expanded ? 16 : 14} 
              color={BrandColors.text.secondary} 
            />
          </TouchableOpacity>
        </View>
      </View>

      {expanded ? (
        <ScrollView style={styles.expandedList}>
          {insights.map((insight) => (
            <TouchableOpacity
              key={insight.id}
              style={styles.insightItem}
              onPress={() => onInsightSelect?.(insight)}
            >
              <InsightBadge insight={insight} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : (
        <ScrollView 
          horizontal 
          style={styles.scrollViewCompact}
          contentContainerStyle={styles.scrollViewContentCompact}
          showsHorizontalScrollIndicator={false}
        >
          {insights.map((insight) => (
            <TouchableOpacity
              key={insight.id}
              style={styles.insightItemCompact}
              onPress={() => onInsightSelect?.(insight)}
            >
              <InsightBadge insight={insight} compact />
            </TouchableOpacity>
          ))}
          {insights.length > 3 && (
            <TouchableOpacity
              style={styles.moreButtonCompact}
              onPress={() => setExpanded(true)}
            >
              <Text style={styles.moreButtonTextCompact}>
                +{insights.length - 3}
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: `${BrandColors.background}80`,
    borderBottomWidth: 1,
    borderBottomColor: `${BrandColors.text.tertiary}20`,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  compactContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    paddingVertical: 3,
    paddingHorizontal: 10,
    backgroundColor: '#FAFAFA',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  headerContainerCompact: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  headerTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: BrandColors.text.secondary,
    flex: 1,
  },
  headerTitleCompact: {
    fontSize: 10,
    fontWeight: 'bold',
    color: BrandColors.text.secondary,
    flex: 1,
  },
  buttonGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  refreshButton: {
    padding: 4,
    marginRight: 8,
  },
  refreshButtonCompact: {
    padding: 4,
    marginRight: 6,
  },
  expandedList: {
    maxHeight: 150,
    paddingVertical: 5,
  },
  scrollViewCompact: {
    marginTop: 2,
    height: 26,
  },
  scrollViewContentCompact: {
    paddingHorizontal: 2,
    alignItems: 'center',
  },
  insightItem: {
    marginVertical: 2,
  },
  insightItemCompact: {
    marginHorizontal: 2,
    marginVertical: 1,
  },
  moreButtonCompact: {
    backgroundColor: `${BrandColors.text.tertiary}30`,
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 2,
  },
  moreButtonTextCompact: {
    color: BrandColors.text.secondary,
    fontSize: 8,
    fontWeight: 'bold',
  },
});

export default ChatInsightsPanel; 