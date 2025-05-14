import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import theme from '../../../styles/theme';
import Card from '../../../components/ui/Card';

interface BoardSpaceProps {
  // 必要に応じてpropsを追加
}

interface Insight {
  id: string;
  title: string;
  description: string;
  source: 'chat' | 'meeting' | 'ai';
  confidence: number; // 0-1
  timestamp: string;
  tags: string[];
  isStarred: boolean;
}

interface InsightGroup {
  id: string;
  title: string;
  insights: Insight[];
}

/**
 * ボード空間コンポーネント
 * 
 * AI分析によって得られた洞察を管理するインタフェースを提供
 */
const BoardSpace: React.FC<BoardSpaceProps> = () => {
  // ボード情報
  const [boardInfo, setBoardInfo] = useState({
    title: 'AI洞察ボード',
    lastUpdated: '15分前',
    totalInsights: 8,
    aiStatus: 'アクティブ'
  });
  
  // 検索クエリ
  const [searchQuery, setSearchQuery] = useState('');
  
  // モックデータ - 実際の実装では状態管理やAPIからデータを取得
  const [insightGroups, setInsightGroups] = useState<InsightGroup[]>([
    {
      id: 'important',
      title: '重要な洞察',
      insights: [
        { 
          id: 'i1', 
          title: 'プロジェクトXの締め切りが迫っています', 
          description: '複数の会話からプロジェクトXの締め切りが今週金曜日であることが確認されました。チームメンバーは準備を急ぐ必要があります。',
          source: 'chat',
          confidence: 0.95,
          timestamp: '2時間前',
          tags: ['プロジェクトX', '締め切り', '重要'],
          isStarred: true
        },
        { 
          id: 'i2', 
          title: 'クライアントミーティングの主要ポイント', 
          description: '先週のクライアントミーティングでは、UI改善とパフォーマンス最適化が主な要望として挙げられました。特に検索機能の応答速度に対する懸念が強調されています。',
          source: 'meeting',
          confidence: 0.88,
          timestamp: '昨日',
          tags: ['クライアント', 'UI', 'パフォーマンス'],
          isStarred: true
        },
      ],
    },
    {
      id: 'recent',
      title: '最近の発見',
      insights: [
        { 
          id: 'i3', 
          title: 'チーム内コミュニケーションパターン', 
          description: 'チャット分析によると、最近のコミュニケーションは主に技術的な問題解決に集中しており、戦略的なディスカッションが減少傾向にあります。',
          source: 'ai',
          confidence: 0.78,
          timestamp: '3時間前',
          tags: ['コミュニケーション', '分析'],
          isStarred: false
        },
        { 
          id: 'i4', 
          title: 'リソース配分の最適化提案', 
          description: 'プロジェクトの進捗状況と会話内容の分析から、デザインチームへのリソース追加が必要と判断されます。現在のボトルネックはUI/UXデザインの遅延にあります。',
          source: 'ai',
          confidence: 0.82,
          timestamp: '昨日',
          tags: ['リソース', '最適化', 'デザイン'],
          isStarred: false
        },
      ],
    },
    {
      id: 'people',
      title: '人物と関係性',
      insights: [
        { 
          id: 'i5', 
          title: '鈴木さんと田中さんの協力パターン', 
          description: '過去3週間の会話分析から、鈴木さんと田中さんが技術的問題で頻繁に協力していることが分かりました。この協力関係はプロジェクトの技術的側面に大きく貢献しています。',
          source: 'ai',
          confidence: 0.75,
          timestamp: '2日前',
          tags: ['チーム', '協力関係'],
          isStarred: false
        },
        { 
          id: 'i6', 
          title: '新メンバーの統合状況', 
          description: '先月加入した山本さんは、チャットでの活動分析によるとすでにチームに良く馴染んでおり、特にフロントエンド開発で重要な役割を果たしています。',
          source: 'ai',
          confidence: 0.71,
          timestamp: '3日前',
          tags: ['新メンバー', 'チーム統合'],
          isStarred: false
        },
      ],
    },
    {
      id: 'topics',
      title: '話題と傾向',
      insights: [
        { 
          id: 'i7', 
          title: 'セキュリティに関する懸念の増加', 
          description: '過去2週間で、チームの会話におけるセキュリティに関する言及が3倍に増加しました。特にデータ保護とユーザー認証に関する議論が目立ちます。',
          source: 'ai',
          confidence: 0.85,
          timestamp: '4日前',
          tags: ['セキュリティ', '傾向'],
          isStarred: false
        },
        { 
          id: 'i8', 
          title: 'マイクロサービスアーキテクチャへの関心', 
          description: 'エンジニアリングチーム内で、モノリシックからマイクロサービスへの移行に関する会話が増加しています。具体的な計画の策定が必要かもしれません。',
          source: 'ai',
          confidence: 0.68,
          timestamp: '1週間前',
          tags: ['アーキテクチャ', '技術傾向'],
          isStarred: false
        },
      ],
    },
  ]);

  // フィルタリングされた洞察グループ
  const filteredInsightGroups = searchQuery
    ? insightGroups.map(group => ({
        ...group,
        insights: group.insights.filter(insight => 
          insight.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          insight.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          insight.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
        )
      })).filter(group => group.insights.length > 0)
    : insightGroups;

  // 洞察を星印/お気に入り登録するハンドラー
  const handleToggleStar = (insightId: string) => {
    setInsightGroups(prevGroups => 
      prevGroups.map(group => ({
        ...group,
        insights: group.insights.map(insight => 
          insight.id === insightId
            ? { ...insight, isStarred: !insight.isStarred }
            : insight
        )
      }))
    );
  };

  // 洞察カードのレンダリング
  const renderInsightCard = (insight: Insight) => (
    <Card
      key={insight.id}
      style={styles.insightCard}
      elevation="sm"
    >
      <View style={styles.insightHeader}>
        <Text style={styles.insightTitle}>{insight.title}</Text>
        <TouchableOpacity 
          style={styles.starButton}
          onPress={() => handleToggleStar(insight.id)}
        >
          <Text style={styles.starIcon}>
            {insight.isStarred ? '★' : '☆'}
          </Text>
        </TouchableOpacity>
      </View>
      
      <Text style={styles.insightDescription}>
        {insight.description}
        </Text>
      
      <View style={styles.insightMeta}>
        <View style={styles.sourceContainer}>
          <Text 
            style={[
              styles.sourceIndicator, 
              insight.source === 'chat' ? styles.chatSource : 
              insight.source === 'meeting' ? styles.meetingSource : 
              styles.aiSource
            ]}
          >
            {insight.source === 'chat' ? 'チャット' : 
             insight.source === 'meeting' ? 'ミーティング' : 
             'AI分析'}
          </Text>
          <Text style={styles.timestamp}>{insight.timestamp}</Text>
          <Text style={styles.confidence}>信頼度: {Math.round(insight.confidence * 100)}%</Text>
        </View>
      </View>
      
      {insight.tags && insight.tags.length > 0 && (
        <View style={styles.tagsContainer}>
          {insight.tags.map((tag, index) => (
            <View key={index} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      )}
      
      <View style={styles.insightActions}>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonText}>詳細</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonText}>関連項目</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonText}>ボードに追加</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );

  // 洞察グループのレンダリング
  const renderInsightGroup = (group: InsightGroup) => (
    <View key={group.id} style={styles.insightGroup}>
      <View style={styles.groupHeader}>
        <Text style={styles.groupTitle}>{group.title}</Text>
        <Text style={styles.insightCount}>{group.insights.length}</Text>
      </View>
      
      {group.insights.map(renderInsightCard)}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* ボード空間ヘッダー */}
      <View style={styles.spaceHeader}>
        <View style={styles.headerIcon}>
          <Text style={styles.headerIconText}>🧠</Text>
        </View>
        <Text style={styles.headerTitle}>ボード空間</Text>
      </View>
      
      {/* ボードヘッダー */}
      <View style={styles.boardHeader}>
        <View style={styles.headerLeft}>
          <Text style={styles.boardTitle}>{boardInfo.title}</Text>
          <View style={styles.boardInfoContainer}>
            <Text style={styles.boardInfoText}>
              {boardInfo.totalInsights}個の洞察 • AI分析: {boardInfo.aiStatus} • 最終更新: {boardInfo.lastUpdated}
            </Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="洞察を検索..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <TouchableOpacity style={styles.analyzeButton}>
            <Text style={styles.analyzeButtonText}>新しい分析</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      <ScrollView style={styles.boardContainer}>
        {filteredInsightGroups.length > 0 ? (
          filteredInsightGroups.map(renderInsightGroup)
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              検索条件に一致する洞察が見つかりませんでした。
        </Text>
        </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.default,
  },
  spaceHeader: {
    padding: 16,
    backgroundColor: theme.colors.spaces.board.primary,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    marginRight: 12,
  },
  headerIconText: {
    fontSize: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  boardHeader: {
    padding: theme.spacing.md,
    backgroundColor: 'rgba(255, 189, 89, 0.15)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 189, 89, 0.2)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flex: 1,
  },
  boardTitle: {
    fontSize: theme.fontSizes.lg,
    fontWeight: theme.fontWeights.semibold as any,
    color: theme.colors.text.primary,
  },
  boardInfoContainer: {
    marginTop: 4,
  },
  boardInfoText: {
    fontSize: theme.fontSizes.xs,
    color: theme.colors.text.secondary,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchContainer: {
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  searchInput: {
    backgroundColor: 'white',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  analyzeButton: {
    backgroundColor: theme.colors.spaces.board.primary,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
  },
  analyzeButtonText: {
    color: 'white',
    fontSize: theme.fontSizes.sm,
    fontWeight: '500',
  },
  boardContainer: {
    flex: 1,
    padding: theme.spacing.md,
  },
  insightGroup: {
    marginBottom: theme.spacing.lg,
    width: '100%',
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  groupTitle: {
    fontSize: theme.fontSizes.md,
    fontWeight: theme.fontWeights.semibold as any,
    color: theme.colors.text.primary,
  },
  insightCount: {
    fontSize: theme.fontSizes.sm,
    color: 'white',
    backgroundColor: theme.colors.spaces.board.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  insightCard: {
    marginBottom: theme.spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.spaces.board.primary,
  },
  insightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  insightTitle: {
    fontSize: theme.fontSizes.md,
    fontWeight: theme.fontWeights.medium as any,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
    flex: 1,
  },
  starButton: {
    padding: 2,
  },
  starIcon: {
    fontSize: 24,
    color: 'orange',
  },
  insightDescription: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.text.secondary,
    marginBottom: theme.spacing.sm,
  },
  insightMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: theme.spacing.xs,
  },
  sourceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sourceIndicator: {
    fontSize: theme.fontSizes.xs,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginRight: theme.spacing.xs,
  },
  chatSource: {
    backgroundColor: 'rgba(255, 107, 107, 0.2)',
    color: theme.colors.secondary,
  },
  meetingSource: {
    backgroundColor: 'rgba(80, 208, 200, 0.2)',
    color: theme.colors.accent,
  },
  aiSource: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    color: '#6366F1',
  },
  timestamp: {
    fontSize: theme.fontSizes.xs,
    color: theme.colors.text.secondary,
    marginRight: theme.spacing.md,
  },
  confidence: {
    fontSize: theme.fontSizes.xs,
    color: theme.colors.text.secondary,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: theme.spacing.sm,
  },
  tag: {
    backgroundColor: 'rgba(80, 208, 200, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 4,
  },
  tagText: {
    fontSize: theme.fontSizes.xs,
    color: theme.colors.accent,
  },
  insightActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: theme.spacing.md,
  },
  actionButton: {
    padding: theme.spacing.xs,
    backgroundColor: 'rgba(255, 189, 89, 0.1)',
    borderRadius: theme.borderRadius.sm,
    marginLeft: theme.spacing.sm,
  },
  actionButtonText: {
    color: theme.colors.spaces.board.primary,
    fontSize: theme.fontSizes.xs,
  },
  emptyState: {
    padding: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    fontSize: theme.fontSizes.md,
    color: theme.colors.text.secondary,
    textAlign: 'center',
  },
});

export default BoardSpace; 