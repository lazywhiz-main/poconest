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

// Use the context's Nest type as the local Nest type for this component
type Nest = ImportedNestType;

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
          <path d="M12 13c0-2.76 2.24-5 5-5s5 2.24 5 5-2.24 5-5 5-5-2.24-5-5zm-9 0c0-2.76 2.24-5 5-5s5 2.24 5 5-2.24 5-5 5-5-2.24-5-5z"></path>
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
  const [nests, setNests] = useState<Nest[]>([]); // Use aliased Nest type
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNestId, setSelectedNestId] = useState<string | null>(null);
  const { user } = useAuth();
  const { userNests } = useNest(); // This is already of type ImportedNestType[]

  // 巣データの読み込み
  useEffect(() => {
    const fetchNests = async () => {
      if (!user) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // まずNestContextからユーザーの所属するネストを取得
        if (userNests && userNests.length > 0) {
          // NestContext型からnestSpace.types.Nest型に変換
          setNests(userNests);
        } else {
          // バックアップとしてNestSpaceServiceから取得
          const containers = await nestSpaceService.getUserContainers(user.id);
          
          if (containers.length > 0) {
            // NestSpaceService型からnestSpace.types.Nest型に変換
            const convertedNests = containers.map(container => ({
              id: container.id,
              name: container.name,
              description: container.description || '',
              owner_id: container.ownerId,
              // members: container.members, // This might not be needed here if fetched later
              is_active: true, // Assuming active from container
              created_at: container.createdAt.toISOString(),
              updated_at: container.updatedAt.toISOString(),
              color: theme.colors.primary, // Default color
              icon: '🏠', // Default icon
              space_ids: container.spaces.map(s => s.id)
            })) as Nest[]; // Cast to aliased Nest type
            
            setNests(convertedNests);
          } else {
            // データがない場合は空配列
            setNests([]);
          }
        }
      } catch (err) {
        console.error('巣データの取得に失敗しました:', err);
        setError('巣データの取得に失敗しました');
        setNests([]);
      } finally {
        setLoading(false);
      }
    };

    fetchNests();
  }, [user, userNests]);

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
          まだ巣に参加していないようです。新しい巣を作成するか、招待を受け取ってください。
        </Text>
        <TouchableOpacity
          style={styles.createNestButtonBig}
          onPress={onCreateNest}
        >
          <Text style={styles.createNestButtonText}>新しい巣を作る</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>ポコの巣を選択</Text>
        <Text style={styles.subtitle}>
          参加している巣からひとつ選択してください
        </Text>
      </View>

      <View style={styles.content}>
      <ScrollView style={styles.nestsContainer}>
        {nests.map((nest) => (
          <TouchableOpacity
            key={nest.id}
            style={[
                styles.nestCard,
                selectedNestId === nest.id && styles.selectedNestCard
            ]}
            onPress={() => setSelectedNestId(nest.id)}
          >
              <View style={styles.nestCardHeader}>
            <View 
              style={[
                    styles.nestIcon
                  ]}
                >
                  <Icon 
                    name={getNestIcon(nest)} 
                    size={24} 
                    color="white" 
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
                    <Icon name="check" size={18} color="white" />
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
          >
            <View style={styles.createNestContent}>
              <View style={styles.createNestIcon}>
                <Icon name="plus" size={24} color={theme.colors.secondary} />
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
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.default,
  },
  header: {
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
  },
  title: {
    fontSize: theme.fontSizes.xxl,
    fontWeight: theme.fontWeights.bold as any,
    color: theme.colors.text.onDark,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontSize: theme.fontSizes.md,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: theme.spacing.lg,
  },
  content: {
    flex: 1,
    padding: theme.spacing.lg,
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
  nestsContainer: {
    flex: 1,
  },
  nestCard: {
    backgroundColor: theme.colors.background.card,
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.md,
    ...theme.shadows.md,
    overflow: 'hidden',
  },
  selectedNestCard: {
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  nestCardHeader: {
    flexDirection: 'row',
    padding: theme.spacing.lg,
    backgroundColor: 'white',
    alignItems: 'center',
  },
  nestIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    marginRight: theme.spacing.md,
  },
  iconStyle: {
    alignSelf: 'center',
  },
  nestInfo: {
    flex: 1,
  },
  nestName: {
    fontSize: theme.fontSizes.lg,
    fontWeight: theme.fontWeights.semibold as any,
    color: theme.colors.text.primary,
    marginBottom: theme.spacing.xs,
  },
  nestDescription: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.text.secondary,
  },
  selectedCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nestDetails: {
    flexDirection: 'row',
    padding: theme.spacing.md,
    backgroundColor: 'rgba(80, 208, 200, 0.05)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(80, 208, 200, 0.1)',
  },
  detailItem: {
    flex: 1,
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: theme.fontSizes.xs,
    color: theme.colors.text.hint,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: theme.fontSizes.sm,
    color: theme.colors.text.secondary,
    fontWeight: theme.fontWeights.medium as any,
  },
  detailSeparator: {
    width: 1,
    height: 24,
    backgroundColor: theme.colors.divider,
    marginHorizontal: theme.spacing.md,
  },
  createNestCard: {
    backgroundColor: 'rgba(80, 208, 200, 0.05)',
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: theme.colors.secondary,
    marginBottom: theme.spacing.xl,
    padding: theme.spacing.lg,
  },
  createNestContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  createNestIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(80, 208, 200, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  createNestText: {
    fontSize: theme.fontSizes.md,
    fontWeight: theme.fontWeights.semibold as any,
    color: theme.colors.secondary,
  },
  footer: {
    paddingTop: theme.spacing.lg,
  },
  continueButton: {
    backgroundColor: theme.colors.secondary,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: theme.borderRadius.md,
    ...theme.shadows.sm,
  },
  disabledButton: {
    backgroundColor: 'rgba(80, 208, 200, 0.5)',
  },
  continueButtonText: {
    color: 'white',
    fontSize: theme.fontSizes.md,
    fontWeight: theme.fontWeights.semibold as any,
  },
});

export default NestSelector; 