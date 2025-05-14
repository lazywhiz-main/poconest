import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { BrandColors } from '../constants/Colors';
import PocoLogo from '../components/PocoLogo';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { TwoTierHeader } from '../components/TwoTierHeader';
import { useNest } from '../contexts/NestContext';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

type RootStackParamList = {
  TabsScreen: undefined;
  CreateNest: undefined;
  NestSettings: { nestId: string };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

type HighlightItem = {
  id: string;
  title: string;
  content: string;
  type: 'chat' | 'board' | 'zoom';
  createdAt: string;
  icon: string;
};

const HomeScreen = () => {
  const { user } = useAuth();
  const [greeting, setGreeting] = useState('');
  const [loading, setLoading] = useState(true);
  const [highlights, setHighlights] = useState<HighlightItem[]>([]);
  const navigation = useNavigation<NavigationProp>();
  const { currentNest, nestMembers, loading: nestLoading, error } = useNest();
  
  // ローディング状態のデバッグと手動リセット用
  const [forceRender, setForceRender] = useState(false);
  
  useEffect(() => {
    // アプリがフリーズするのを防ぐために、タイムアウト後に強制的にレンダリングさせる
    const timeoutId = setTimeout(() => {
      if (nestLoading || loading) {
        console.log('HomeScreen: ローディングタイムアウト - 強制レンダリング');
        setForceRender(true);
        setLoading(false); // 内部ローディング状態を解除
      }
    }, 5000); // 5秒後にタイムアウト
    
    return () => clearTimeout(timeoutId);
  }, [nestLoading, loading]);

  useEffect(() => {
    // 時間帯に応じた挨拶メッセージ
    const hours = new Date().getHours();
    if (hours < 12) {
      setGreeting('おはようございます');
    } else if (hours < 18) {
      setGreeting('こんにちは');
    } else {
      setGreeting('こんばんは');
    }

    // モックのハイライトデータを読み込む
    setTimeout(() => {
      setHighlights([
        {
          id: '1',
          title: 'ポコとのチャット',
          content: 'プロジェクトの進捗を確認しました',
          type: 'chat',
          createdAt: new Date(new Date().setHours(new Date().getHours() - 1)).toISOString(),
          icon: 'chatbubble',
        },
        {
          id: '2',
          title: '新しいアイデア',
          content: 'モバイルアプリのUI改善案',
          type: 'board',
          createdAt: new Date(new Date().setHours(new Date().getHours() - 3)).toISOString(),
          icon: 'bulb',
        },
        {
          id: '3',
          title: 'ウィークリーミーティング',
          content: '次回のスプリント計画について話し合いました',
          type: 'zoom',
          createdAt: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString(),
          icon: 'videocam',
        },
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  // ハイライトアイテムコンポーネント
  const HighlightItem = ({ item }: { item: HighlightItem }) => {
    // 時間の表示形式を調整
    const getTimeText = (dateString: string) => {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      
      if (diffHours < 1) {
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        return `${diffMinutes}分前`;
      } else if (diffHours < 24) {
        return `${Math.floor(diffHours)}時間前`;
      } else {
        return `${Math.floor(diffHours / 24)}日前`;
      }
    };

    return (
      <TouchableOpacity style={styles.highlightItem}>
        <View style={[styles.iconContainer, { backgroundColor: getIconColor(item.type) }]}>
          <Ionicons name={item.icon as any} size={24} color="#fff" />
        </View>
        <View style={styles.highlightContent}>
          <Text style={styles.highlightTitle}>{item.title}</Text>
          <Text style={styles.highlightDescription} numberOfLines={2}>
            {item.content}
          </Text>
          <Text style={styles.highlightTime}>{getTimeText(item.createdAt)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  // ハイライトタイプに応じたアイコン色を取得
  const getIconColor = (type: string) => {
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

  const handleEditNest = () => {
    if (currentNest) {
      navigation.navigate('NestSettings', { nestId: currentNest.id });
    }
  };

  if ((loading || nestLoading) && !forceRender) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={BrandColors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <TwoTierHeader
        title={currentNest?.name || 'ホーム'}
        subtitle={`${nestMembers.length}人のメンバー`}
        showEmoji={true}
        emoji="🌳"
        rightComponent={
          currentNest && (
            <TouchableOpacity style={styles.editButton} onPress={handleEditNest}>
              <Ionicons name="settings-outline" size={20} color={BrandColors.text.secondary} />
            </TouchableOpacity>
          )
        }
      />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Nestの説明 */}
        {currentNest?.description && (
          <View style={styles.nestDescriptionCard}>
            <Text style={styles.nestDescription}>{currentNest.description}</Text>
          </View>
        )}

        {/* ヘッダー部分 */}
        <View style={styles.header}>
          <View style={styles.greetingContainer}>
            <Text style={styles.greeting}>{greeting}、</Text>
            <Text style={styles.username}>{user?.email?.split('@')[0] || 'ユーザー'}</Text>
            <Text style={styles.tagline}>今日も一緒に学んでいきましょう！</Text>
          </View>
          <View style={styles.avatar}>
            <PocoLogo size={60} />
          </View>
        </View>

        {/* 今日の一言 */}
        <View style={styles.quoteCard}>
          <Text style={styles.quoteTitle}>今日の一言</Text>
          <Text style={styles.quote}>
            「小さな進歩も積み重なれば、大きな成果になる」
          </Text>
        </View>

        {/* Nestのメンバー */}
        <View style={styles.membersSection}>
          <Text style={styles.sectionTitle}>メンバー</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.membersScroll}>
            {nestMembers.map((member) => (
              <View key={`${member.nest_id}-${member.user_id}`} style={styles.memberItem}>
                <View style={styles.memberAvatar}>
                  <Text style={styles.memberInitial}>
                    {member.users?.display_name?.charAt(0) || '?'}
                  </Text>
                </View>
                <Text style={styles.memberName} numberOfLines={1}>
                  {member.users?.display_name || '名前なし'}
                </Text>
                {member.role === 'owner' && (
                  <View style={styles.ownerBadge}>
                    <Text style={styles.ownerBadgeText}>Owner</Text>
                  </View>
                )}
              </View>
            ))}
          </ScrollView>
        </View>

        {/* ハイライト */}
        <View style={styles.highlightsContainer}>
          <Text style={styles.sectionTitle}>最近の活動</Text>
          {highlights.map((item) => (
            <HighlightItem key={item.id} item={item} />
          ))}
        </View>

        {/* お知らせセクション */}
        <View style={styles.newsSection}>
          <Text style={styles.sectionTitle}>お知らせ</Text>
          <TouchableOpacity style={styles.newsCard}>
            <View style={styles.newsIconContainer}>
              <Ionicons name="newspaper-outline" size={24} color={BrandColors.primary} />
            </View>
            <View style={styles.newsContent}>
              <Text style={styles.newsTitle}>新機能が追加されました！</Text>
              <Text style={styles.newsDate}>2024年4月30日</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={BrandColors.text.tertiary} />
          </TouchableOpacity>
        </View>

        {/* ヒントセクション */}
        <View style={styles.tipsSection}>
          <Text style={styles.sectionTitle}>今日のヒント</Text>
          <View style={styles.tipCard}>
            <Ionicons name="bulb-outline" size={24} color="#F5A623" style={styles.tipIcon} />
            <Text style={styles.tipText}>
              ポコとチャットで会話をすると、自動的に重要なポイントを見つけてくれます。
            </Text>
          </View>
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BrandColors.background,
  },
  scrollContent: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: BrandColors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greetingContainer: {
    flex: 1,
  },
  greeting: {
    fontSize: 16,
    color: BrandColors.text.secondary,
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
    color: BrandColors.text.primary,
    marginBottom: 4,
  },
  tagline: {
    fontSize: 14,
    color: BrandColors.text.secondary,
  },
  avatar: {
    marginLeft: 16,
  },
  quoteCard: {
    backgroundColor: BrandColors.primary + '15', // 15% opacity
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: BrandColors.primary,
  },
  quoteTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: BrandColors.primary,
    marginBottom: 8,
  },
  quote: {
    fontSize: 16,
    fontStyle: 'italic',
    color: BrandColors.text.primary,
    lineHeight: 24,
  },
  nestDescriptionCard: {
    backgroundColor: `${BrandColors.secondary}08`,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  nestDescription: {
    fontSize: 14,
    color: BrandColors.text.primary,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  membersSection: {
    marginVertical: 24,
  },
  membersScroll: {
    flexDirection: 'row',
  },
  memberItem: {
    alignItems: 'center',
    marginRight: 20,
    width: 70,
  },
  memberAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: `${BrandColors.primary}30`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  memberInitial: {
    fontSize: 20,
    color: BrandColors.primary,
    fontWeight: 'bold',
  },
  memberName: {
    fontSize: 12,
    color: BrandColors.text.primary,
    textAlign: 'center',
  },
  ownerBadge: {
    backgroundColor: BrandColors.primary,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 4,
  },
  ownerBadgeText: {
    color: 'white',
    fontSize: 9,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: BrandColors.text.primary,
    marginBottom: 16,
  },
  highlightsContainer: {
    marginBottom: 16,
  },
  highlightItem: {
    flexDirection: 'row',
    backgroundColor: BrandColors.backgroundVariants.light,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  highlightContent: {
    flex: 1,
  },
  highlightTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: BrandColors.text.primary,
    marginBottom: 4,
  },
  highlightDescription: {
    fontSize: 14,
    color: BrandColors.text.secondary,
    marginBottom: 8,
    lineHeight: 20,
  },
  highlightTime: {
    fontSize: 12,
    color: BrandColors.text.tertiary,
  },
  newsSection: {
    padding: 24,
  },
  newsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BrandColors.backgroundVariants.light,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  newsIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${BrandColors.primary}10`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  newsContent: {
    flex: 1,
  },
  newsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: BrandColors.text.primary,
    marginBottom: 4,
  },
  newsDate: {
    fontSize: 12,
    color: BrandColors.text.tertiary,
  },
  tipsSection: {
    padding: 24,
    paddingTop: 0,
  },
  tipCard: {
    backgroundColor: `${BrandColors.primary}05`,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tipIcon: {
    marginRight: 12,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: BrandColors.text.secondary,
    lineHeight: 20,
  },
  editButton: {
    padding: 8,
  },
  errorContainer: {
    margin: 16,
    padding: 12,
    backgroundColor: '#FFE5E5',
    borderRadius: 8,
  },
  errorText: {
    color: BrandColors.error,
  },
});

export default HomeScreen; 