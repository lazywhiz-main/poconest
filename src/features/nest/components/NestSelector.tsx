import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Image, 
  Alert, 
  ActivityIndicator,
  ImageBackground 
} from 'react-native';
// import { Nest } from '../../../types/nestSpace.types'; // Comment out or remove this line
import { useAuth } from '../../../contexts/AuthContext';
import theme from '../../../styles/theme';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import { nestSpaceService } from '../../../services/NestSpaceService';
import { useNest, Nest as ImportedNestType } from '../contexts/NestContext'; // Import Nest as ImportedNestType from context
import { SampleNestService } from '../services/sampleNestService';
import { supabase } from '@services/supabase';

// Use the context's Nest type as the local Nest type for this component
type Nest = ImportedNestType;

interface NestData {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  created_at: string;
  updated_at: string;
  icon: string | null;
  nest_spaces: Array<{
    id: string;
    name: string;
    type: string;
    icon: string;
  }>;
}

// SVGアイコンコンポーネント
interface IconProps {
  name: string;
  size?: number;
  color?: string;
  style?: any;
}

const Icon: React.FC<IconProps> = ({ name, size = 24, color = 'currentColor', style = {} }) => {
  return (
    <View style={style}>
      <svg 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke={color} 
        strokeWidth="2"
        strokeLinecap="round" 
        strokeLinejoin="round"
      >
        {getIconPath(name)}
      </svg>
    </View>
  );
};

// アイコンパス定義
const getIconPath = (name: string) => {
  switch (name) {
    case 'home':
      return (
        <>
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </>
      );
    case 'briefcase':
      return (
        <>
          <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
        </>
      );
    case 'palette':
      return (
        <>
          <circle cx="13.5" cy="6.5" r="2.5"></circle>
          <circle cx="19" cy="13" r="2.5"></circle>
          <circle cx="13.5" cy="19.5" r="2.5"></circle>
          <circle cx="6" cy="13" r="2.5"></circle>
          <path d="M12 13c0-2.76 2.24-5 5-5s5 2.24 5 5-2.24 5-5 5-5-2.24-5-5z"></path>
        </>
      );
    case 'plus':
      return (
        <>
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </>
      );
    case 'check':
      return (
        <>
          <polyline points="20 6 9 17 4 12"></polyline>
        </>
      );
    default:
      return <circle cx="12" cy="12" r="10"></circle>;
  }
};

interface NestSelectorProps {
  onSelectNest: (nest: Nest) => void; // Now uses the aliased Nest type
  onCreateNest: () => void;
}

/**
 * ネストセレクターコンポーネント
 * 
 * ユーザーが所属するネスト（巣）の一覧を表示し、選択または新規作成を可能にする
 */
const NestSelector: React.FC<NestSelectorProps> = ({ onSelectNest, onCreateNest }) => {
  const [nests, setNests] = useState<Nest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNestId, setSelectedNestId] = useState<string | null>(null);
  const [isCreatingSamples, setIsCreatingSamples] = useState(false);
  const { user, logout } = useAuth();
  const { userNests } = useNest();
  const sampleNestService = new SampleNestService();

  useEffect(() => {
    const fetchNests = async () => {
      if (!user) return;
      setLoading(true);
      setError(null);
      try {
        // 1. 自分がownerのNEST
        const { data: ownerNests, error: ownerError } = await supabase
          .from('nests')
          .select('*')
          .eq('owner_id', user.id);
        console.log('[NestSelector] ownerNests:', ownerNests, 'ownerError:', ownerError);
        if (ownerError) throw ownerError;

        // 2. 自分がmemberのNEST
        const { data: memberNests, error: memberError } = await supabase
          .from('nest_members')
          .select('nest_id')
          .eq('user_id', user.id);
        console.log('[NestSelector] memberNests:', memberNests, 'memberError:', memberError);
        if (memberError) throw memberError;
        const memberNestIds = memberNests?.map((m: any) => m.nest_id) ?? [];

        const { data: joinedNests, error: joinedError } = memberNestIds.length > 0
          ? await supabase
              .from('nests')
              .select('*')
              .in('id', memberNestIds)
          : { data: [], error: null };
        console.log('[NestSelector] joinedNests:', joinedNests, 'joinedError:', joinedError);
        if (joinedError) throw joinedError;

        // 3. 両方をマージ（重複除去）
        const allNests = [
          ...(ownerNests ?? []),
          ...(joinedNests ?? []).filter(n => !(ownerNests ?? []).some(o => o.id === n.id))
        ];
        console.log('[NestSelector] allNests:', allNests);
        const nestIds = allNests.map((n: any) => n.id);

        // 4. spaces取得
        const { data: spacesData, error: spacesError } = await supabase
          .from('spaces')
          .select('*')
          .in('nest_id', nestIds);
        console.log('[NestSelector] spacesData:', spacesData, 'spacesError:', spacesError);
        if (spacesError) throw spacesError;

        // 5. 紐付け
        const nestsWithSpaces = allNests.map((nest: any) => ({
          id: nest.id,
          name: nest.name,
          description: nest.description || '',
          owner_id: nest.owner_id,
          is_active: true,
          created_at: nest.created_at,
          updated_at: nest.updated_at,
          color: theme.colors.primary,
          icon: nest.icon || '🏠',
          space_ids: (spacesData || []).filter((space: any) => space.nest_id === nest.id).map((space: any) => space.id)
        })) as Nest[];
        console.log('[NestSelector] nestsWithSpaces:', nestsWithSpaces);
        setNests(nestsWithSpaces);
      } catch (err) {
        console.error('巣データの取得に失敗しました:', err);
        setError('巣データの取得に失敗しました');
        setNests([]);
      } finally {
        setLoading(false);
      }
    };
    fetchNests();
  }, [user]);

  // サンプルNESTの作成
  const handleCreateSampleNests = async () => {
    if (!user) {
      setError('ユーザーがログインしていません');
      return;
    }

    setIsCreatingSamples(true);
    setError(null);

    try {
      await sampleNestService.createSampleNests(user.id);
      // 作成後にNEST一覧を更新
      const containers = await nestSpaceService.getUserContainers(user.id);
      const convertedNests = containers.map(container => ({
        id: container.id,
        name: container.name,
        description: container.description || '',
        owner_id: container.ownerId,
        is_active: true,
        created_at: container.createdAt.toISOString(),
        updated_at: container.updatedAt.toISOString(),
        color: theme.colors.primary,
        icon: '🏠',
        space_ids: container.spaces.map(s => s.id)
      })) as Nest[];
      
      setNests(convertedNests);
    } catch (err) {
      console.error('サンプルNESTの作成に失敗しました:', err);
      setError('サンプルNESTの作成に失敗しました');
    } finally {
      setIsCreatingSamples(false);
    }
  };

  // 選択された巣で続行する
  const handleContinue = () => {
    if (selectedNestId) {
      const selectedNest = nests.find(nest => nest.id === selectedNestId);
      if (selectedNest) {
        onSelectNest(selectedNest);
      }
    }
  };

  // アイコンを取得する
  const getNestIcon = (nest: Nest) => {
    switch(nest.icon) {
      case '🏠': return 'home';
      case '💼': return 'briefcase';
      case '🎨': return 'palette';
      default: return 'circle';
    }
  };

  // ログアウト処理
  const handleLogout = async () => {
    try {
      await logout();
      window.location.href = '/login'; // ログイン画面やトップページに遷移（必要に応じて修正）
    } catch (err) {
      Alert.alert('ログアウト失敗', 'ログアウトに失敗しました');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>巣を読み込み中...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>エラーが発生しました</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => window.location.reload()}
        >
          <Text style={styles.retryButtonText}>再試行</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (nests.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>巣がありません</Text>
        <Text style={styles.emptyText}>
          まだ巣に参加していないようです。新しい巣を作成するか、サンプルの巣を作成して始めましょう。
        </Text>
        <View style={styles.emptyActions}>
          <TouchableOpacity
            style={styles.createNestButtonBig}
            onPress={onCreateNest}
          >
            <Text style={styles.createNestButtonText}>新しい巣を作成</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.createNestButtonBig, styles.createSampleButton]}
            onPress={handleCreateSampleNests}
            disabled={isCreatingSamples}
          >
            {isCreatingSamples ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.createNestButtonText}>サンプルの巣を作成</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.outerContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>ポコの巣を選択</Text>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} accessibilityLabel="ログアウト">
          <Text style={styles.logoutButtonText}>ログアウト</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.subtitle}>
        参加している巣からひとつ選択してください
      </Text>
      <View style={styles.content}>
        <ScrollView style={styles.nestsContainer} contentContainerStyle={styles.nestsContent}>
          {nests.map((nest) => (
            <TouchableOpacity
              key={nest.id}
              style={[
                styles.nestCard,
                selectedNestId === nest.id && styles.selectedNestCard
              ]}
              onPress={() => setSelectedNestId(nest.id)}
              activeOpacity={0.92}
            >
              <View style={styles.nestCardHeader}>
                <View style={styles.nestIcon}>
                  <Icon 
                    name={getNestIcon(nest)} 
                    size={24} 
                    color="#fff" 
                    style={styles.iconStyle}
                  />
                </View>
                <View style={styles.nestInfo}>
                  <Text style={styles.nestName}>{nest.name}</Text>
                  <Text style={styles.nestDescription} numberOfLines={2}>
                    {nest.description}
                  </Text>
                </View>
                {selectedNestId === nest.id && (
                  <View style={styles.selectedCheck}>
                    <Icon name="check" size={18} color="#fff" />
                  </View>
                )}
              </View>
              <View style={styles.nestDetails}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>メンバー</Text>
                  <Text style={styles.detailValue}>- 人</Text>
                </View>
                <View style={styles.detailSeparator} />
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>最終更新</Text>
                  <Text style={styles.detailValue}>
                    {new Date(nest.updated_at).toLocaleDateString()}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={styles.createNestCard}
            onPress={onCreateNest}
            activeOpacity={0.92}
          >
            <View style={styles.createNestContent}>
              <View style={styles.createNestIcon}>
                <Icon name="plus" size={24} color="#fff" />
              </View>
              <Text style={styles.createNestText}>新しい巣を作る</Text>
            </View>
          </TouchableOpacity>
        </ScrollView>
        <View style={styles.footer}>
          <TouchableOpacity 
            style={[
              styles.continueButton,
              !selectedNestId && styles.disabledButton
            ]}
            onPress={handleContinue}
            disabled={!selectedNestId}
          >
            <Text style={styles.continueButtonText}>選択した巣に入る</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: theme.colors.background.default,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 600,
    marginTop: 40,
    marginBottom: 8,
    paddingHorizontal: 32,
    backgroundColor: 'transparent',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    flex: 1,
    textAlign: 'left',
  },
  logoutButton: {
    backgroundColor: theme.colors.action,
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginLeft: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 4,
    elevation: 2,
  },
  logoutButtonText: {
    color: theme.colors.background.paper,
    fontWeight: 'bold',
    fontSize: 16,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    marginBottom: 24,
    width: '100%',
    maxWidth: 600,
    textAlign: 'center',
    alignSelf: 'center',
  },
  content: {
    flex: 1,
    width: '100%',
    maxWidth: 600,
    marginHorizontal: 'auto',
    alignSelf: 'center',
  },
  nestsContainer: {
    flex: 1,
    width: '100%',
  },
  nestsContent: {
    alignItems: 'center',
    paddingBottom: 32,
  },
  nestCard: {
    backgroundColor: theme.colors.background.paper,
    borderRadius: 16,
    marginVertical: 16,
    width: '100%',
    maxWidth: 540,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
  selectedNestCard: {
    borderColor: theme.colors.accent,
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
  },
  nestCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  nestIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 18,
    shadowColor: theme.colors.accent,
    shadowOpacity: 0.13,
    shadowRadius: 8,
    elevation: 2,
  },
  iconStyle: {
    alignSelf: 'center',
  },
  nestInfo: {
    flex: 1,
  },
  nestName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginBottom: 2,
  },
  nestDescription: {
    fontSize: 14,
    color: theme.colors.text.secondary,
  },
  selectedCheck: {
    backgroundColor: theme.colors.accent,
    borderRadius: 12,
    padding: 4,
    marginLeft: 8,
  },
  nestDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  detailItem: {
    flex: 1,
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 12,
    color: theme.colors.text.disabled,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    marginTop: 2,
  },
  detailSeparator: {
    width: 1,
    height: 24,
    backgroundColor: theme.colors.divider,
    marginHorizontal: 8,
  },
  createNestCard: {
    backgroundColor: theme.colors.action,
    borderRadius: 16,
    marginVertical: 20,
    width: '100%',
    maxWidth: 540,
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.action,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 2,
    borderColor: theme.colors.action,
  },
  createNestContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  createNestIcon: {
    marginRight: 14,
  },
  createNestText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.background.paper,
  },
  footer: {
    paddingTop: 32,
    alignItems: 'center',
  },
  continueButton: {
    backgroundColor: theme.colors.action,
    height: 48,
    width: '100%',
    maxWidth: 540,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    marginBottom: 24,
  },
  disabledButton: {
    backgroundColor: theme.colors.action + '60',
  },
  continueButtonText: {
    color: theme.colors.background.paper,
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background.default,
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: theme.fontSizes.md,
    color: theme.colors.text.secondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.background.default,
  },
  errorTitle: {
    fontSize: theme.fontSizes.xl,
    fontWeight: theme.fontWeights.bold as any,
    color: theme.colors.status.error,
    marginBottom: theme.spacing.md,
  },
  errorText: {
    fontSize: theme.fontSizes.md,
    color: theme.colors.text.primary,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  retryButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
  },
  retryButtonText: {
    color: 'white',
    fontSize: theme.fontSizes.md,
    fontWeight: theme.fontWeights.semibold as any,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.background.default,
  },
  emptyTitle: {
    fontSize: theme.fontSizes.xl,
    fontWeight: theme.fontWeights.bold as any,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.md,
  },
  emptyText: {
    fontSize: theme.fontSizes.md,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
  emptyActions: {
    width: '100%',
    gap: theme.spacing.md,
  },
  createNestButtonBig: {
    backgroundColor: theme.colors.secondary,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.borderRadius.md,
    ...theme.shadows.md,
  },
  createNestButtonText: {
    color: 'white',
    fontSize: theme.fontSizes.md,
    fontWeight: theme.fontWeights.semibold as any,
  },
  createSampleButton: {
    backgroundColor: theme.colors.primary,
  },
});

export default NestSelector; 