import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions
} from 'react-native';
import { ZoomMeeting } from '../hooks/useZoomSpace';
import { useMeetingAnalysis } from '../hooks/useMeetingAnalysis';

// 主要な表示タブ
type TabType = 'summary' | 'actions' | 'topics' | 'speakers' | 'keywords';

// MeetingInsightsコンポーネントのプロパティ定義
interface MeetingInsightsProps {
  meeting?: ZoomMeeting | null;
}

// MeetingInsightsコンポーネント
const MeetingInsights: React.FC<MeetingInsightsProps> = ({ meeting }) => {
  const { width } = useWindowDimensions();
  const isTabletOrLarger = width > 768;
  
  // 分析フックを利用
  const {
    analysis,
    actionItems,
    topics,
    keyPoints,
    wordFrequencyData,
    isAnalyzing,
    error,
    startAnalysis
  } = useMeetingAnalysis(meeting);
  
  // アクティブタブの状態
  const [activeTab, setActiveTab] = useState<TabType>('summary');
  
  // ミーティングがない場合
  if (!meeting) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>ミーティングが選択されていません</Text>
          <Text style={styles.emptyText}>
            分析を表示するには、左側のリストからミーティングを選択してください。
          </Text>
        </View>
      </View>
    );
  }
  
  // 分析中の表示
  if (isAnalyzing) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4a6da7" />
          <Text style={styles.loadingText}>
            AIによるミーティング分析を実行中...
          </Text>
          <Text style={styles.loadingSubtext}>
            これには数分かかる場合があります。
          </Text>
        </View>
      </View>
    );
  }
  
  // エラーの表示
  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>エラーが発生しました</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => startAnalysis()}
          >
            <Text style={styles.retryButtonText}>再試行</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
  
  // 分析データがなくて分析を開始できる場合
  if (!analysis && !isAnalyzing) {
    return (
      <View style={styles.container}>
        <View style={styles.noAnalysisContainer}>
          <Text style={styles.noAnalysisTitle}>
            まだ分析が行われていません
          </Text>
          <Text style={styles.noAnalysisText}>
            AIによる会議内容の自動分析を実行して、重要なポイントやアクションアイテムを抽出します。
          </Text>
          <TouchableOpacity
            style={styles.analyzeButton}
            onPress={() => startAnalysis()}
          >
            <Text style={styles.analyzeButtonText}>分析を開始</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
  
  // タブコンテンツをレンダリング
  const renderTabContent = () => {
    switch (activeTab) {
      case 'summary':
        return (
          <ScrollView style={styles.tabContent}>
            <View style={styles.summarySection}>
              <Text style={styles.sectionTitle}>会議の要約</Text>
              <Text style={styles.summaryText}>{analysis?.aiSummary}</Text>
            </View>
            
            <View style={styles.keyPointsSection}>
              <Text style={styles.sectionTitle}>キーポイント</Text>
              {analysis?.keyPoints.map((point, index) => (
                <View key={index} style={styles.keyPoint}>
                  <Text style={styles.keyPointText}>• {point}</Text>
                </View>
              ))}
            </View>
            
            <View style={styles.sentimentSection}>
              <Text style={styles.sectionTitle}>全体的な雰囲気</Text>
              <View style={styles.sentimentBadge}>
                <Text style={styles.sentimentText}>
                  {analysis?.sentiment === 'positive' && '肯定的 😊'}
                  {analysis?.sentiment === 'neutral' && '中立的 😐'}
                  {analysis?.sentiment === 'negative' && '否定的 😕'}
                </Text>
              </View>
            </View>
          </ScrollView>
        );
        
      case 'actions':
        return (
          <ScrollView style={styles.tabContent}>
            <View style={styles.actionsSection}>
              <Text style={styles.sectionTitle}>アクションアイテム</Text>
              {actionItems.length > 0 ? (
                actionItems.map((item, index) => (
                  <View key={index} style={styles.actionItem}>
                    <View style={styles.actionHeader}>
                      <Text style={styles.actionAssignee}>{item.assignee}</Text>
                      {item.deadline && (
                        <Text style={styles.actionDeadline}>期限: {item.deadline}</Text>
                      )}
                    </View>
                    <Text style={styles.actionContent}>{item.content}</Text>
                    <View style={styles.actionStatus}>
                      <Text style={styles.actionStatusText}>
                        {item.status === 'pending' && '保留中'}
                        {item.status === 'in_progress' && '進行中'}
                        {item.status === 'completed' && '完了'}
                      </Text>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyListText}>アクションアイテムがありません</Text>
              )}
            </View>
          </ScrollView>
        );
        
      case 'topics':
        return (
          <ScrollView style={styles.tabContent}>
            <View style={styles.topicsSection}>
              <Text style={styles.sectionTitle}>議題トピック</Text>
              {topics.length > 0 ? (
                topics.map((topic, index) => (
                  <View key={index} style={styles.topicItem}>
                    <View style={styles.topicHeader}>
                      <Text style={styles.topicTitle}>{topic.title}</Text>
                      <Text style={styles.topicTime}>
                        {Math.floor(topic.startTime / 60)}分 - {Math.floor(topic.endTime / 60)}分
                      </Text>
                    </View>
                    {topic.keyPoints.map((keyPoint, kpIndex) => (
                      <Text key={kpIndex} style={styles.topicKeyPoint}>
                        • {keyPoint.content}
                      </Text>
                    ))}
                  </View>
                ))
              ) : (
                <Text style={styles.emptyListText}>トピック情報がありません</Text>
              )}
            </View>
          </ScrollView>
        );
        
      case 'speakers':
        return (
          <ScrollView style={styles.tabContent}>
            <View style={styles.speakersSection}>
              <Text style={styles.sectionTitle}>発言時間の割合</Text>
              {analysis?.speakingTimePercentage && Object.keys(analysis.speakingTimePercentage).length > 0 ? (
                Object.entries(analysis.speakingTimePercentage).map(([speaker, percentage], index) => (
                  <View key={index} style={styles.speakerItem}>
                    <Text style={styles.speakerName}>{speaker}</Text>
                    <View style={styles.speakerBarContainer}>
                      <View 
                        style={[
                          styles.speakerBar, 
                          { width: `${percentage}%` }
                        ]} 
                      />
                    </View>
                    <Text style={styles.speakerPercentage}>{percentage}%</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyListText}>発言時間データがありません</Text>
              )}
            </View>
          </ScrollView>
        );
        
      case 'keywords':
        return (
          <ScrollView style={styles.tabContent}>
            <View style={styles.keywordsSection}>
              <Text style={styles.sectionTitle}>頻出キーワード</Text>
              <View style={styles.keywordsCloud}>
                {wordFrequencyData.length > 0 ? (
                  wordFrequencyData
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 20)
                    .map((item, index) => (
                      <View
                        key={index}
                        style={[
                          styles.keywordBubble,
                          {
                            backgroundColor: `rgba(74, 109, 167, ${0.3 + (item.importance * 0.7)})`,
                            padding: 8 + Math.floor(item.importance * 8),
                            margin: 4,
                          }
                        ]}
                      >
                        <Text
                          style={[
                            styles.keywordText,
                            {
                              fontSize: 12 + Math.floor(item.importance * 6),
                              color: item.importance > 0.7 ? '#ffffff' : '#333333',
                            }
                          ]}
                        >
                          {item.word}
                        </Text>
                      </View>
                    ))
                ) : (
                  <Text style={styles.emptyListText}>キーワードデータがありません</Text>
                )}
              </View>
            </View>
          </ScrollView>
        );
        
      default:
        return null;
    }
  };
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>会議の分析</Text>
        <Text style={styles.headerSubtitle}>{meeting.title}</Text>
      </View>
      
      <View style={styles.tabBar}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabBarContent}
        >
          <TouchableOpacity
            style={[styles.tab, activeTab === 'summary' && styles.activeTab]}
            onPress={() => setActiveTab('summary')}
          >
            <Text 
              style={[
                styles.tabText, 
                activeTab === 'summary' && styles.activeTabText
              ]}
            >
              要約
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'actions' && styles.activeTab]}
            onPress={() => setActiveTab('actions')}
          >
            <Text 
              style={[
                styles.tabText, 
                activeTab === 'actions' && styles.activeTabText
              ]}
            >
              アクション
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'topics' && styles.activeTab]}
            onPress={() => setActiveTab('topics')}
          >
            <Text 
              style={[
                styles.tabText, 
                activeTab === 'topics' && styles.activeTabText
              ]}
            >
              トピック
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'speakers' && styles.activeTab]}
            onPress={() => setActiveTab('speakers')}
          >
            <Text 
              style={[
                styles.tabText, 
                activeTab === 'speakers' && styles.activeTabText
              ]}
            >
              発言時間
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'keywords' && styles.activeTab]}
            onPress={() => setActiveTab('keywords')}
          >
            <Text 
              style={[
                styles.tabText, 
                activeTab === 'keywords' && styles.activeTabText
              ]}
            >
              キーワード
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
      
      {renderTabContent()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#757575',
    marginTop: 4,
  },
  tabBar: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tabBarContent: {
    paddingHorizontal: 8,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#4a6da7',
  },
  tabText: {
    fontSize: 14,
    color: '#757575',
  },
  activeTabText: {
    fontWeight: 'bold',
    color: '#4a6da7',
  },
  tabContent: {
    flex: 1,
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#757575',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#9e9e9e',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#757575',
    marginTop: 16,
    marginBottom: 8,
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#9e9e9e',
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#d32f2f',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#757575',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#4a6da7',
    borderRadius: 4,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  noAnalysisContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noAnalysisTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#757575',
    marginBottom: 8,
  },
  noAnalysisText: {
    fontSize: 14,
    color: '#9e9e9e',
    textAlign: 'center',
    marginBottom: 16,
  },
  analyzeButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#4a6da7',
    borderRadius: 4,
  },
  analyzeButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 12,
  },
  summarySection: {
    marginBottom: 24,
  },
  summaryText: {
    fontSize: 14,
    color: '#333333',
    lineHeight: 22,
  },
  keyPointsSection: {
    marginBottom: 24,
  },
  keyPoint: {
    marginBottom: 8,
  },
  keyPointText: {
    fontSize: 14,
    color: '#333333',
    lineHeight: 20,
  },
  sentimentSection: {
    marginBottom: 24,
  },
  sentimentBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 16,
  },
  sentimentText: {
    fontSize: 14,
    color: '#333333',
  },
  actionsSection: {
    marginBottom: 24,
  },
  actionItem: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  actionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  actionAssignee: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4a6da7',
  },
  actionDeadline: {
    fontSize: 12,
    color: '#757575',
  },
  actionContent: {
    fontSize: 14,
    color: '#333333',
    marginBottom: 8,
  },
  actionStatus: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
  },
  actionStatusText: {
    fontSize: 10,
    color: '#757575',
  },
  topicsSection: {
    marginBottom: 24,
  },
  topicItem: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  topicHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  topicTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333333',
    flex: 1,
    marginRight: 8,
  },
  topicTime: {
    fontSize: 12,
    color: '#757575',
  },
  topicKeyPoint: {
    fontSize: 12,
    color: '#333333',
    marginBottom: 4,
  },
  speakersSection: {
    marginBottom: 24,
  },
  speakerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  speakerName: {
    width: 100,
    fontSize: 14,
    color: '#333333',
  },
  speakerBarContainer: {
    flex: 1,
    height: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  speakerBar: {
    height: '100%',
    backgroundColor: '#4a6da7',
  },
  speakerPercentage: {
    width: 40,
    fontSize: 12,
    color: '#757575',
    textAlign: 'right',
  },
  keywordsSection: {
    marginBottom: 24,
  },
  keywordsCloud: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    padding: 8,
  },
  keywordBubble: {
    borderRadius: 16,
  },
  keywordText: {
    textAlign: 'center',
  },
  emptyListText: {
    fontSize: 14,
    color: '#9e9e9e',
    textAlign: 'center',
    marginTop: 16,
  },
});

export default MeetingInsights; 