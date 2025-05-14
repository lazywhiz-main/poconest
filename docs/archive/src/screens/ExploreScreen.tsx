import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BrandColors } from '../constants/Colors';
import PocoLogo from '../components/PocoLogo';
import { useNavigation } from '@react-navigation/native';
import { AppHeader } from '../components/AppHeader';
import { PlayScreen } from './PlayScreen';

// 検索結果の型
type SearchResult = {
  id: string;
  title: string;
  content: string;
  type: 'chat' | 'board' | 'zoom';
  date: string;
  tags?: string[];
  matchScore: number; // AIによる関連度スコア
};

// 仮の検索結果データ
const mockSearchResults: SearchResult[] = [
  {
    id: '1',
    title: 'プロジェクト立ち上げミーティング',
    content: 'プロジェクトの目標と役割分担について話し合いました。初期のマイルストーンを設定し、次回のミーティング日程を決定しました。',
    type: 'zoom',
    date: new Date(2023, 8, 15).toISOString(),
    tags: ['プロジェクト計画', '立ち上げ'],
    matchScore: 0.92,
  },
  {
    id: '2',
    title: 'プロジェクト企画書作成',
    content: 'ポコネストのプロジェクト企画書を作成する。目標、スケジュール、予算を含める。',
    type: 'board',
    date: new Date(2023, 6, 15).toISOString(),
    tags: ['仕事', '企画'],
    matchScore: 0.85,
  },
  {
    id: '3',
    title: 'プロジェクトの進捗確認',
    content: '現在のプロジェクト進捗状況は以下の通りです：\n・デザイン：80%完了\n・フロントエンド：60%完了\n・バックエンド：40%完了\n次のマイルストーンは来週金曜日です。',
    type: 'chat',
    date: new Date(2023, 8, 15).toISOString(),
    tags: ['進捗', 'ステータス'],
    matchScore: 0.78,
  },
];

// AI推薦の型
type Recommendation = {
  id: string;
  title: string;
  reason: string;
  type: 'chat' | 'board' | 'zoom';
};

// 仮のAI推薦データ
const mockRecommendations: Recommendation[] = [
  {
    id: '1',
    title: 'UI改善ミーティングノート',
    reason: '最近のUI関連の会話に基づいて',
    type: 'zoom',
  },
  {
    id: '2',
    title: 'バックエンド開発計画',
    reason: 'プロジェクトのタイムラインに関連',
    type: 'board',
  },
];

export const ExploreScreen = () => {
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchPerformed, setSearchPerformed] = useState(false);
  const [activeTab, setActiveTab] = useState<'search' | 'play'>('search');

  // 検索実行
  const handleSearch = () => {
    if (!searchQuery.trim()) return;

    setSearching(true);
    setSearchPerformed(true);
    
    // 本来はAPIリクエストを行うが、ここではモックデータを使用
    setTimeout(() => {
      // 検索クエリに「プロジェクト」が含まれる場合はモックデータを返す
      if (searchQuery.toLowerCase().includes('プロジェクト')) {
        setResults(mockSearchResults);
      } else {
        // それ以外は空の結果を返す
        setResults([]);
      }
      setSearching(false);
    }, 1000);
  };

  // 初期推薦の読み込み
  useEffect(() => {
    setRecommendations(mockRecommendations);
  }, []);

  // 検索結果アイテム
  const renderSearchResultItem = ({ item }: { item: SearchResult }) => {
    // 検索結果のアイコン
    const getTypeIcon = () => {
      switch (item.type) {
        case 'chat':
          return 'chatbubble-outline';
        case 'board':
          return 'grid-outline';
        case 'zoom':
          return 'videocam-outline';
        default:
          return 'document-text-outline';
      }
    };

    return (
      <TouchableOpacity style={styles.resultItem}>
        <View style={[styles.typeIcon, { backgroundColor: getTypeColor(item.type) }]}>
          <Ionicons name={getTypeIcon()} size={18} color="#fff" />
        </View>
        <View style={styles.resultContent}>
          <Text style={styles.resultTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.resultSnippet} numberOfLines={2}>{item.content}</Text>
          <View style={styles.resultMeta}>
            <Text style={styles.resultDate}>
              {new Date(item.date).toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' })}
            </Text>
            {item.tags && (
              <View style={styles.tagsContainer}>
                {item.tags.map((tag, index) => (
                  <View key={index} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
        <View style={styles.matchScore}>
          <Text style={styles.matchScoreText}>{Math.round(item.matchScore * 100)}%</Text>
        </View>
      </TouchableOpacity>
    );
  };

  // 推薦アイテム
  const renderRecommendationItem = ({ item }: { item: Recommendation }) => {
    return (
      <TouchableOpacity style={styles.recommendationItem}>
        <View style={[styles.recommendationIcon, { backgroundColor: getTypeColor(item.type) }]}>
          <Ionicons
            name={item.type === 'chat' ? 'chatbubble' : item.type === 'board' ? 'grid' : 'videocam'}
            size={16}
            color="#fff"
          />
        </View>
        <View style={styles.recommendationContent}>
          <Text style={styles.recommendationTitle}>{item.title}</Text>
          <Text style={styles.recommendationReason}>{item.reason}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  // タイプに応じた色を取得
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'chat':
        return BrandColors.primary;
      case 'board':
        return BrandColors.secondary;
      case 'zoom':
        return '#8B5CF6'; // 紫色
      default:
        return BrandColors.primary;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader
        title="探索"
        showEmoji={true}
        emoji="🔍"
      />

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'search' && styles.activeTab]}
          onPress={() => setActiveTab('search')}
        >
          <Ionicons
            name="search-outline"
            size={20}
            color={activeTab === 'search' ? BrandColors.primary : BrandColors.text.tertiary}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'search' && styles.activeTabText,
            ]}
          >
            検索
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'play' && styles.activeTab]}
          onPress={() => setActiveTab('play')}
        >
          <Ionicons
            name="game-controller-outline"
            size={20}
            color={activeTab === 'play' ? BrandColors.primary : BrandColors.text.tertiary}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'play' && styles.activeTabText,
            ]}
          >
            遊び
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'search' ? (
        <>
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="会話を検索..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <View style={styles.content}>
            {searching ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={BrandColors.primary} />
              </View>
            ) : searchPerformed ? (
              results.length > 0 ? (
                <FlatList
                  data={results}
                  renderItem={renderSearchResultItem}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={styles.resultsList}
                  showsVerticalScrollIndicator={false}
                />
              ) : (
                <View style={styles.emptyResultsContainer}>
                  <PocoLogo size={80} />
                  <Text style={styles.emptyResultsText}>
                    "{searchQuery}" に一致する結果は見つかりませんでした
                  </Text>
                  <Text style={styles.emptyResultsTip}>
                    別のキーワードを試してみてください
                  </Text>
                </View>
              )
            ) : (
              <View style={styles.recommendationsContainer}>
                <Text style={styles.recommendationsTitle}>おすすめコンテンツ</Text>
                <FlatList
                  data={recommendations}
                  renderItem={renderRecommendationItem}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={styles.recommendationsList}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                />
              </View>
            )}
          </View>
        </>
      ) : (
        <PlayScreen />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BrandColors.background,
  },
  searchContainer: {
    padding: 15,
    backgroundColor: BrandColors.backgroundVariants.light,
  },
  searchInput: {
    backgroundColor: BrandColors.backgroundVariants.medium,
    padding: 10,
    borderRadius: 8,
    fontSize: 16,
    color: BrandColors.text.primary,
  },
  content: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: BrandColors.background,
  },
  resultsList: {
    padding: 16,
  },
  resultItem: {
    flexDirection: 'row',
    backgroundColor: BrandColors.backgroundVariants.light,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  typeIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  resultContent: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: BrandColors.text.primary,
    marginBottom: 4,
  },
  resultSnippet: {
    fontSize: 14,
    color: BrandColors.text.secondary,
    marginBottom: 8,
    lineHeight: 20,
  },
  resultMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  resultDate: {
    fontSize: 12,
    color: BrandColors.text.tertiary,
    marginRight: 8,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: `${BrandColors.secondary}15`, // 15% opacity
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 4,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 12,
    color: BrandColors.secondary,
  },
  matchScore: {
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  matchScoreText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: BrandColors.secondary,
  },
  emptyResultsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyResultsText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: BrandColors.text.primary,
    marginTop: 16,
    textAlign: 'center',
  },
  emptyResultsTip: {
    fontSize: 14,
    color: BrandColors.text.secondary,
    textAlign: 'center',
    marginTop: 8,
  },
  recommendationsContainer: {
    flex: 1,
    padding: 16,
  },
  recommendationsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: BrandColors.text.primary,
    marginBottom: 16,
  },
  recommendationsList: {
    paddingBottom: 16,
  },
  recommendationItem: {
    width: 200,
    backgroundColor: BrandColors.backgroundVariants.light,
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  recommendationIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  recommendationContent: {
    flex: 1,
  },
  recommendationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: BrandColors.text.primary,
    marginBottom: 4,
  },
  recommendationReason: {
    fontSize: 12,
    color: BrandColors.text.secondary,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: BrandColors.backgroundVariants.light,
  },
  tabText: {
    marginLeft: 4,
    fontSize: 14,
    color: BrandColors.text.tertiary,
  },
  activeTabText: {
    color: BrandColors.primary,
    fontWeight: 'bold',
  },
  playContainer: {
    flex: 1,
    backgroundColor: BrandColors.background,
  },
  playSection: {
    padding: 16,
  },
  playSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: BrandColors.text.primary,
  },
  playGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
});

// Add default export
export default ExploreScreen; 