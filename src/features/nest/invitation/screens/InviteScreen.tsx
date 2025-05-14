import React, { useState } from 'react';
import { 
  ScrollView, 
  View, 
  Text, 
  StyleSheet, 
  useWindowDimensions,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity
} from 'react-native';
import { BRAND_COLORS } from '@constants/Colors';
import { SPACING, FONT_SIZE, COMPONENT_STYLES } from '@constants/Styles';
import responsive from '@utils/responsive';
import InviteForm from '../components/InviteForm';
import InviteLink from '../components/InviteLink';
import PendingInvitations from '../components/PendingInvitations';
import { useNest } from '../../../contexts/NestContext';

// タブの種類
type TabType = 'email' | 'link' | 'pending';

const InviteScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('email');
  const { currentNest } = useNest();
  const { width, height } = useWindowDimensions();
  
  // 画面サイズからレイアウトを判断
  const isMobile = responsive.mediaQuery.isMobile(width);
  const isLandscape = width > height;
  
  // タブ毎のコンテンツ
  const renderTabContent = () => {
    switch (activeTab) {
      case 'email':
        return <InviteForm onInviteSent={handleInviteSent} />;
      case 'link':
        return <InviteLink onLinkGenerated={handleLinkGenerated} />;
      case 'pending':
        return (
          <PendingInvitations 
            onInvitationCanceled={handleInvitationCanceled}
            onInvitationResent={handleInvitationResent}
          />
        );
      default:
        return <InviteForm onInviteSent={handleInviteSent} />;
    }
  };
  
  // タブボタン
  const TabButton = ({ label, type, count }: { label: string; type: TabType; count?: number }) => (
    <TouchableOpacity
      style={[
        styles.tabButton,
        activeTab === type && styles.activeTabButton
      ]}
      onPress={() => setActiveTab(type)}
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: activeTab === type }}
    >
      <Text style={[
        styles.tabButtonText,
        activeTab === type && styles.activeTabButtonText
      ]}>
        {label}
        {count !== undefined && count > 0 && ` (${count})`}
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
    // 招待キャンセル後の処理（必要であれば）
    console.log('Invitation canceled');
  };
  
  const handleInvitationResent = () => {
    // 招待再送信後の処理（必要であれば）
    console.log('Invitation resent');
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
        
        <View style={styles.tabsContainer}>
          <TabButton label="メールで招待" type="email" />
          <TabButton label="招待リンク" type="link" />
          <TabButton label="保留中の招待" type="pending" />
        </View>
        
        <View style={styles.contentContainer}>
          {renderTabContent()}
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
});

export default InviteScreen; 