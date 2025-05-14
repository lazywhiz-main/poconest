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
import { COLORS, SPACING } from '@constants/config';

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
        <ActivityIndicator size="large" color={COLORS.primary} />
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

  // デスクトップ用のサイドナビゲーション
  const renderDesktopNavigation = () => (
    <View style={styles.desktopSidebar}>
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
      
      <View style={styles.sidebarFooter}>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSaveBasicInfo}
          disabled={savingBasicInfo}
          accessibilityLabel="設定を保存"
          accessibilityHint="Alt+Sでも保存できます"
        >
          {savingBasicInfo ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <Text style={styles.saveButtonText}>保存 (Alt+S)</Text>
          )}
        </TouchableOpacity>
        
        {onBack && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBack}
            accessibilityLabel="戻る"
          >
            <Text style={styles.backButtonText}>戻る</Text>
          </TouchableOpacity>
        )}
      </View>
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
            <ActivityIndicator size="small" color={COLORS.white} />
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
          onPress={onBack}
          accessibilityLabel="戻る"
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
    padding: SPACING.lg,
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: 16,
    color: COLORS.gray,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: SPACING.lg,
    color: COLORS.text,
  },
  formGroup: {
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: SPACING.xs,
    color: COLORS.text,
  },
  input: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: 8,
    padding: SPACING.md,
    fontSize: 16,
    color: COLORS.text,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: COLORS.gray,
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  colorOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: SPACING.xs,
  },
  colorOption: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  selectedColorOption: {
    borderWidth: 3,
    borderColor: COLORS.white,
    ...Platform.select({
      web: {
        boxShadow: '0 0 0 2px ' + COLORS.primary,
      },
      default: {
        shadowColor: COLORS.primary,
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
    backgroundColor: COLORS.background,
  },
  desktopSidebar: {
    width: 240,
    backgroundColor: COLORS.white,
    borderRightWidth: 1,
    borderRightColor: COLORS.lightGray,
    padding: SPACING.md,
    paddingTop: SPACING.lg,
    height: '100%',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  sidebarItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.sm,
    marginBottom: SPACING.xs,
    borderRadius: 8,
  },
  activeSidebarItem: {
    backgroundColor: COLORS.primary,
  },
  sidebarItemText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
  },
  activeSidebarItemText: {
    color: COLORS.white,
    fontWeight: '600',
  },
  shortcutText: {
    fontSize: 12,
    color: COLORS.gray,
  },
  sidebarFooter: {
    marginTop: 'auto',
    paddingTop: SPACING.lg,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    backgroundColor: 'transparent',
    padding: SPACING.md,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.gray,
  },
  backButtonText: {
    color: COLORS.text,
    fontSize: 16,
  },
  desktopContent: {
    flex: 1,
    padding: SPACING.lg,
  },
  contentContainer: {
    flex: 1,
  },
  basicSettingsContainer: {
    padding: SPACING.md,
    backgroundColor: COLORS.white,
    borderRadius: 8,
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
    marginBottom: SPACING.lg,
  },
  membersContainer: {
    padding: SPACING.md,
    backgroundColor: COLORS.white,
    borderRadius: 8,
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
    marginBottom: SPACING.lg,
  },
  privacyContainer: {
    padding: SPACING.md,
    backgroundColor: COLORS.white,
    borderRadius: 8,
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
    marginBottom: SPACING.lg,
  },
  
  // モバイル版スタイル
  mobileContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  mobileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  mobileBackButton: {
    padding: SPACING.sm,
  },
  mobileBackButtonText: {
    fontSize: 20,
    color: COLORS.primary,
  },
  mobileHeaderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  mobileHeaderRight: {
    width: 40, // スペース確保用
  },
  mobileTabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  mobileTab: {
    flex: 1,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
  },
  mobileTabText: {
    fontSize: 14,
    color: COLORS.gray,
  },
  activeTabText: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  mobileContent: {
    flex: 1,
  },
  mobileFormSubmit: {
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  mobileFormSubmitText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
  },
});

export default NestSettingsScreen; 