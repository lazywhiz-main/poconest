import React, { useState } from 'react';
import { 
  ScrollView, 
  View, 
  Text, 
  StyleSheet, 
  useWindowDimensions,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
  ActivityIndicator
} from 'react-native';
import { BRAND_COLORS } from '@constants/Colors';
import { SPACING, FONT_SIZE, COMPONENT_STYLES } from '@constants/Styles';
import responsive from '@utils/responsive';
import InviteForm from '../components/InviteForm';
import InviteLink from '../components/InviteLink';
import PendingInvitations from '../components/PendingInvitations';
import { useNest } from '@features/nest/contexts/NestContext';
import { useNavigation } from '@react-navigation/native';
import { acceptInviteByEmail } from '../services/invitationService';

// タブの種類
type TabType = 'email' | 'link' | 'pending';

const InviteScreen: React.FC = () => {
  const { currentNest } = useNest();
  const [activeTab, setActiveTab] = useState<TabType>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigation = useNavigation();
  const { width, height } = useWindowDimensions();
  
  // 画面サイズからレイアウトを判断
  const isMobile = responsive.mediaQuery.isMobile(width);
  const isLandscape = width > height;
  
  // タブ毎のコンテンツ
  const renderTabContent = () => {
    switch (activeTab) {
      case 'email':
        return <InviteForm onInviteSent={() => setError(null)} />;
      case 'link':
        return <InviteLink onLinkGenerated={() => setError(null)} />;
      case 'pending':
        return (
          <PendingInvitations
            onInvitationCanceled={handleInvitationCanceled}
            onInvitationResent={handleInvitationResent}
          />
        );
      default:
        return null;
    }
  };
  
  // タブボタン
  const TabButton = ({ label, type, active, onPress }: { label: string; type: TabType; active: boolean; onPress: () => void }) => (
    <TouchableOpacity
      style={[
        styles.tabButton,
        active && styles.activeTabButton
      ]}
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
    >
      <Text style={[
        styles.tabButtonText,
        active && styles.activeTabButtonText
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
  
  // イベントハンドラー
  const handleInviteSent = () => {
    // 招待送信後に保留中タブへ移動するなどの処理
    setActiveTab('pending');
  };
  
  const handleLinkGenerated = (link: string) => {
    // リンク生成後の処理（必要であれば）
    console.log('Link generated:', link);
  };
  
  const handleInvitationCanceled = () => {
    // 招待キャンセル後の処理
    setError(null);
    // 保留中の招待リストを更新
    if (activeTab === 'pending') {
      // 必要に応じてリストを更新
    }
  };
  
  const handleInvitationResent = () => {
    // 招待再送信後の処理
    setError(null);
    // 成功メッセージを表示
    Alert.alert('成功', '招待を再送信しました');
  };

  const handleInvitationAccepted = async (token: string) => {
    setLoading(true);
    setError(null);

    try {
      const { error, nestId, nestName } = await acceptInviteByEmail(token);
      
      if (error) {
        setError(error.message);
        Alert.alert('エラー', error.message);
        return;
      }

      // 成功メッセージを表示
      Alert.alert(
        '成功',
        `${nestName || 'NEST'}に参加しました！`,
        [
          {
            text: 'OK',
            onPress: () => {
              // NESTの詳細画面に遷移
              if (nestId) {
                navigation.navigate('NestDetail', { nestId });
              }
            }
          }
        ]
      );
    } catch (err: any) {
      setError(err.message || '招待の承諾中にエラーが発生しました');
      Alert.alert('エラー', err.message || '招待の承諾中にエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[
          styles.headerContainer,
          isMobile ? styles.headerContainerMobile : styles.headerContainerDesktop
        ]}>
          <Text style={styles.title}>
            {currentNest?.name || 'NEST'} にメンバーを招待
          </Text>
          <Text style={styles.subtitle}>
            メールアドレスで招待するか、共有可能な招待リンクを作成できます
          </Text>
        </View>
        
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
        
        <View style={styles.tabsContainer}>
          <TabButton 
            label="メールで招待" 
            type="email" 
            active={activeTab === 'email'}
            onPress={() => setActiveTab('email')}
          />
          <TabButton 
            label="招待リンク" 
            type="link"
            active={activeTab === 'link'}
            onPress={() => setActiveTab('link')}
          />
          <TabButton 
            label="保留中の招待" 
            type="pending"
            active={activeTab === 'pending'}
            onPress={() => setActiveTab('pending')}
          />
        </View>
        
        <View style={styles.contentContainer}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={BRAND_COLORS.primary} />
            </View>
          ) : (
            renderTabContent()
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BRAND_COLORS.background.default,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
    padding: SPACING.md,
  },
  headerContainer: {
    marginBottom: SPACING.lg,
  },
  headerContainerMobile: {
    alignItems: 'flex-start',
  },
  headerContainerDesktop: {
    alignItems: 'center',
  },
  title: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: 'bold',
    color: BRAND_COLORS.text.primary,
    marginBottom: SPACING.xs,
    textAlign: responsive.mediaQuery.isMobile() ? 'left' : 'center',
  },
  subtitle: {
    fontSize: FONT_SIZE.md,
    color: BRAND_COLORS.text.secondary,
    textAlign: responsive.mediaQuery.isMobile() ? 'left' : 'center',
  },
  tabsContainer: {
    flexDirection: 'row',
    marginBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: BRAND_COLORS.background.medium,
  },
  tabButton: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    marginRight: SPACING.sm,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTabButton: {
    borderBottomColor: BRAND_COLORS.primary,
  },
  tabButtonText: {
    fontSize: FONT_SIZE.md,
    color: BRAND_COLORS.text.secondary,
    fontWeight: '500',
  },
  activeTabButtonText: {
    color: BRAND_COLORS.primary,
  },
  contentContainer: {
    flex: 1,
  },
  errorContainer: {
    backgroundColor: BRAND_COLORS.error + '20',
    padding: SPACING.md,
    borderRadius: COMPONENT_STYLES.BORDER_RADIUS.md,
    marginBottom: SPACING.md,
  },
  errorText: {
    color: BRAND_COLORS.error,
    fontSize: FONT_SIZE.sm,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
});

export default InviteScreen; 