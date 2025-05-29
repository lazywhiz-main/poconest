import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  useWindowDimensions
} from 'react-native';
import { useNest } from '../contexts/NestContext';
import NestMemberList from '../components/NestMemberList';
import InvitationForm from '../components/InvitationForm';
import PrivacySettingsForm from '../components/PrivacySettingsForm';
import theme from '../../../styles/theme';
import { useNavigate } from 'react-router-dom';

// シミュレートされたナビゲーションのためのタイプ
interface NestSettingsScreenProps {
  nestId?: string;
  onBack?: () => void;
}

const NestSettingsScreen: React.FC<NestSettingsScreenProps> = ({ 
  nestId: propNestId,
  onBack
}) => {
  const { currentNest, userNests, updateNest, loading } = useNest();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('');
  const [savingBasicInfo, setSavingBasicInfo] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'members' | 'privacy'>('basic');
  
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  // 使用するNest ID (props経由で指定されるか、現在のNestを使用)
  const nestId = propNestId || currentNest?.id;
  
  const navigate = useNavigate();
  
  // 現在のNestの情報をフォームにセット
  useEffect(() => {
    if (nestId && userNests) {
      const nest = userNests.find(n => n.id === nestId);
      if (nest) {
        setName(nest.name);
        setDescription(nest.description || '');
        setColor(nest.color || '#3498db');
      }
    }
  }, [nestId, userNests]);

  // 基本情報保存
  const handleSaveBasicInfo = async () => {
    if (!nestId) return;
    
    if (!name.trim()) {
      Alert.alert('エラー', 'NESTの名前を入力してください');
      return;
    }
    
    setSavingBasicInfo(true);
    
    const { error } = await updateNest(nestId, {
      name,
      description,
      color
    });
    
    setSavingBasicInfo(false);
    
    if (error) {
      Alert.alert('エラー', error.message || '設定の保存に失敗しました');
    } else {
      Alert.alert('成功', '設定を保存しました');
    }
  };

  // キーボードショートカット設定 (デスクトップ用)
  useEffect(() => {
    if (Platform.OS === 'web') {
      const handleKeyDown = (event: KeyboardEvent) => {
        // Save with Alt+S
        if (event.altKey && event.key === 's') {
          event.preventDefault();
          handleSaveBasicInfo();
        }
        
        // Tab navigation with Alt+1, Alt+2, Alt+3
        if (event.altKey) {
          if (event.key === '1') {
            event.preventDefault();
            setActiveTab('basic');
          } else if (event.key === '2') {
            event.preventDefault();
            setActiveTab('members');
          } else if (event.key === '3' || event.key === 'p') {
            event.preventDefault();
            setActiveTab('privacy');
          }
        }
      };
      
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [handleSaveBasicInfo]);

  // 色選択オプション
  const colorOptions = [
    { value: '#3498db', label: 'ブルー' },
    { value: '#2ecc71', label: 'グリーン' },
    { value: '#e74c3c', label: 'レッド' },
    { value: '#f39c12', label: 'オレンジ' },
    { value: '#9b59b6', label: 'パープル' },
    { value: '#1abc9c', label: 'ターコイズ' },
    { value: '#34495e', label: 'ダークブルー' }
  ];

  if (!nestId || loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
        <Text style={styles.loadingText}>設定を読み込み中...</Text>
      </View>
    );
  }

  // モバイル用のタブ切り替えUI
  const renderMobileTabs = () => (
    <View style={styles.mobileTabContainer}>
      <TouchableOpacity
        style={[styles.mobileTab, activeTab === 'basic' && styles.activeTab]}
        onPress={() => setActiveTab('basic')}
        accessibilityRole="tab"
        accessibilityState={{ selected: activeTab === 'basic' }}
      >
        <Text 
          style={[
            styles.mobileTabText, 
            activeTab === 'basic' && styles.activeTabText
          ]}
        >
          基本情報
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.mobileTab, activeTab === 'members' && styles.activeTab]}
        onPress={() => setActiveTab('members')}
        accessibilityRole="tab"
        accessibilityState={{ selected: activeTab === 'members' }}
      >
        <Text 
          style={[
            styles.mobileTabText, 
            activeTab === 'members' && styles.activeTabText
          ]}
        >
          メンバー
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.mobileTab, activeTab === 'privacy' && styles.activeTab]}
        onPress={() => setActiveTab('privacy')}
        accessibilityRole="tab"
        accessibilityState={{ selected: activeTab === 'privacy' }}
      >
        <Text 
          style={[
            styles.mobileTabText, 
            activeTab === 'privacy' && styles.activeTabText
          ]}
        >
          プライバシー
        </Text>
      </TouchableOpacity>
    </View>
  );

  // 戻るボタンのハンドラ
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(`/nest-top?nestId=${nestId}`);
    }
  };

  // デスクトップ用のサイドナビゲーション
  const renderDesktopNavigation = () => (
    <View style={styles.desktopSidebar}>
      <TouchableOpacity
        style={styles.sidebarBackButton}
        onPress={handleBack}
        accessibilityLabel="NESTトップへ戻る"
      >
        <Text style={styles.sidebarBackButtonText}>← NESTトップへ</Text>
      </TouchableOpacity>
      <View style={styles.menuGroup}>
        <TouchableOpacity
          style={[styles.sidebarItem, activeTab === 'basic' && styles.activeSidebarItem]}
          onPress={() => setActiveTab('basic')}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'basic' }}
        >
          <Text 
            style={[
              styles.sidebarItemText, 
              activeTab === 'basic' && styles.activeSidebarItemText
            ]}
          >
            基本情報
          </Text>
          <Text style={styles.shortcutText}>Alt+1</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.sidebarItem, activeTab === 'members' && styles.activeSidebarItem]}
          onPress={() => setActiveTab('members')}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'members' }}
        >
          <Text 
            style={[
              styles.sidebarItemText, 
              activeTab === 'members' && styles.activeSidebarItemText
            ]}
          >
            メンバー管理
          </Text>
          <Text style={styles.shortcutText}>Alt+2</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.sidebarItem, activeTab === 'privacy' && styles.activeSidebarItem]}
          onPress={() => setActiveTab('privacy')}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'privacy' }}
        >
          <Text 
            style={[
              styles.sidebarItemText, 
              activeTab === 'privacy' && styles.activeSidebarItemText
            ]}
          >
            プライバシー設定
          </Text>
          <Text style={styles.shortcutText}>Alt+3</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity
        style={styles.saveButton}
        onPress={handleSaveBasicInfo}
        disabled={savingBasicInfo}
        accessibilityLabel="設定を保存"
        accessibilityHint="Alt+Sでも保存できます"
      >
        {savingBasicInfo ? (
          <ActivityIndicator size="small" color={theme.colors.background.paper} />
        ) : (
          <Text style={styles.saveButtonText}>保存 (Alt+S)</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  // 基本設定フォームの表示
  const renderBasicSettingsForm = () => (
    <View style={styles.basicSettingsContainer}>
      <Text style={styles.sectionTitle}>基本情報</Text>
      
      <View style={styles.formGroup}>
        <Text style={styles.label}>NEST名</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="NESTの名前を入力"
          maxLength={50}
          editable={!savingBasicInfo}
          accessibilityLabel="NEST名"
        />
        <Text style={styles.charCount}>{name.length}/50</Text>
      </View>
      
      <View style={styles.formGroup}>
        <Text style={styles.label}>説明</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={description}
          onChangeText={setDescription}
          placeholder="NESTの説明を入力"
          multiline
          numberOfLines={4}
          maxLength={200}
          editable={!savingBasicInfo}
          accessibilityLabel="NEST説明"
        />
        <Text style={styles.charCount}>{description.length}/200</Text>
      </View>
      
      <View style={styles.formGroup}>
        <Text style={styles.label}>カラー</Text>
        <View style={styles.colorOptions}>
          {colorOptions.map(option => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.colorOption,
                { backgroundColor: option.value },
                color === option.value && styles.selectedColorOption
              ]}
              onPress={() => setColor(option.value)}
              accessibilityLabel={`${option.label}カラーを選択`}
              accessibilityRole="radio"
              accessibilityState={{ checked: color === option.value }}
            />
          ))}
        </View>
      </View>
      
      {isMobile && (
        <TouchableOpacity
          style={[styles.mobileFormSubmit, savingBasicInfo && styles.disabledButton]}
          onPress={handleSaveBasicInfo}
          disabled={savingBasicInfo}
        >
          {savingBasicInfo ? (
            <ActivityIndicator size="small" color={theme.colors.background.paper} />
          ) : (
            <Text style={styles.mobileFormSubmitText}>保存</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );

  // メンバー管理セクションの表示
  const renderMembersSection = () => (
    <View style={styles.membersContainer}>
      <InvitationForm nestId={nestId} />
      <NestMemberList nestId={nestId} />
    </View>
  );

  // プライバシー設定セクションの表示
  const renderPrivacySection = () => (
    <View style={styles.privacyContainer}>
      <PrivacySettingsForm nestId={nestId} />
    </View>
  );

  // デスクトップレイアウト
  if (!isMobile) {
    return (
      <View style={styles.desktopContainer}>
        {renderDesktopNavigation()}
        
        <ScrollView style={styles.desktopContent}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.contentContainer}
          >
            {activeTab === 'basic' && renderBasicSettingsForm()}
            {activeTab === 'members' && renderMembersSection()}
            {activeTab === 'privacy' && renderPrivacySection()}
          </KeyboardAvoidingView>
        </ScrollView>
      </View>
    );
  }

  // モバイルレイアウト
  return (
    <View style={styles.mobileContainer}>
      <View style={styles.mobileHeader}>
        <TouchableOpacity 
          style={styles.mobileBackButton}
          onPress={handleBack}
          accessibilityLabel="NESTトップへ戻る"
        >
          <Text style={styles.mobileBackButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.mobileHeaderTitle}>NEST設定</Text>
        <View style={styles.mobileHeaderRight} />
      </View>
      
      {renderMobileTabs()}
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.mobileContent}
      >
        <ScrollView>
          {activeTab === 'basic' && renderBasicSettingsForm()}
          {activeTab === 'members' && renderMembersSection()}
          {activeTab === 'privacy' && renderPrivacySection()}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  // 共通スタイル
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: theme.fontSizes.md,
    color: theme.colors.text.secondary,
  },
  sectionTitle: {
    fontSize: theme.fontSizes.xl,
    fontWeight: theme.fontWeights.bold as any,
    marginBottom: theme.spacing.lg,
    color: theme.colors.text.primary,
  },
  formGroup: {
    marginBottom: theme.spacing.lg,
  },
  label: {
    fontSize: theme.fontSizes.md,
    fontWeight: theme.fontWeights.medium as any,
    marginBottom: theme.spacing.xs,
    color: theme.colors.text.primary,
  },
  input: {
    backgroundColor: theme.colors.background.paper,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    fontSize: theme.fontSizes.md,
    color: theme.colors.text.primary,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: theme.fontSizes.xs,
    color: theme.colors.text.disabled,
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  colorOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: theme.spacing.xs,
  },
  colorOption: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  selectedColorOption: {
    borderWidth: 3,
    borderColor: theme.colors.background.paper,
    ...Platform.select({
      web: {
        boxShadow: '0 0 0 2px ' + theme.colors.accent,
      },
      default: {
        shadowColor: theme.colors.accent,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 4,
        elevation: 4,
      }
    }),
  },
  
  // デスクトップ版スタイル
  desktopContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: theme.colors.background.default,
  },
  desktopSidebar: {
    width: 240,
    backgroundColor: theme.colors.background.paper,
    borderRightWidth: 1,
    borderRightColor: theme.colors.divider,
    padding: theme.spacing.md,
    paddingTop: theme.spacing.lg,
    height: '100%',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  sidebarBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
    borderRadius: theme.borderRadius.md,
  },
  sidebarBackButtonText: {
    fontSize: theme.fontSizes.md,
    fontWeight: theme.fontWeights.medium as any,
    color: theme.colors.text.primary,
  },
  saveButton: {
    backgroundColor: theme.colors.action,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  saveButtonText: {
    color: theme.colors.background.paper,
    fontSize: theme.fontSizes.md,
    fontWeight: theme.fontWeights.semibold as any,
  },
  desktopContent: {
    flex: 1,
    padding: theme.spacing.lg,
  },
  contentContainer: {
    flex: 1,
  },
  basicSettingsContainer: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.background.paper,
    borderRadius: theme.borderRadius.lg,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(20, 184, 166, 0.08)',
      },
      default: {
        ...theme.shadows.md,
      }
    }),
    marginBottom: theme.spacing.lg,
  },
  membersContainer: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.background.paper,
    borderRadius: theme.borderRadius.lg,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      },
      default: {
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      }
    }),
    marginBottom: theme.spacing.lg,
  },
  privacyContainer: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.background.paper,
    borderRadius: theme.borderRadius.lg,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      },
      default: {
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      }
    }),
    marginBottom: theme.spacing.lg,
  },
  
  // モバイル版スタイル
  mobileContainer: {
    flex: 1,
    backgroundColor: theme.colors.background.default,
  },
  mobileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.background.paper,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  mobileBackButton: {
    padding: theme.spacing.sm,
  },
  mobileBackButtonText: {
    fontSize: 20,
    color: theme.colors.primary,
  },
  mobileHeaderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
  },
  mobileHeaderRight: {
    width: 40, // スペース確保用
  },
  mobileTabContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.background.paper,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  mobileTab: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.primary,
  },
  mobileTabText: {
    fontSize: 14,
    color: theme.colors.text.disabled,
  },
  activeTabText: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  mobileContent: {
    flex: 1,
  },
  mobileFormSubmit: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  mobileFormSubmitText: {
    color: theme.colors.background.paper,
    fontSize: theme.fontSizes.md,
    fontWeight: theme.fontWeights.semibold as any,
  },
  disabledButton: {
    opacity: 0.5,
  },
  sidebarItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
    borderRadius: theme.borderRadius.md,
  },
  activeSidebarItem: {
    backgroundColor: theme.colors.primary,
  },
  sidebarItemText: {
    fontSize: theme.fontSizes.md,
    fontWeight: theme.fontWeights.medium as any,
    color: theme.colors.text.primary,
  },
  activeSidebarItemText: {
    color: theme.colors.background.paper,
    fontWeight: theme.fontWeights.semibold as any,
  },
  shortcutText: {
    fontSize: theme.fontSizes.xs,
    color: theme.colors.text.disabled,
  },
  menuGroup: {
    marginTop: theme.spacing.lg,
    marginBottom: 'auto',
  },
});

export default NestSettingsScreen; 