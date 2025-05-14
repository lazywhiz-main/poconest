import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  BackHandler
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useCreateNest, CreateNestStep } from '../hooks/useCreateNest';
import NestBasicInfo from './NestBasicInfo';
import NestPrivacyStep from './NestPrivacyStep';
import NestInviteStep from './NestInviteStep';
import NestSummaryStep from './NestSummaryStep';
import { BRAND_COLORS } from '@constants/Colors';

// スクリーンサイズを取得
const { width } = Dimensions.get('window');
const isWebPlatform = Platform.OS === 'web';
const isDesktopWeb = isWebPlatform && width > 768;

interface CreateNestWizardProps {
  onClose?: () => void;
  onComplete?: (nestId: string) => void;
}

/**
 * NEST作成ウィザードコンポーネント
 */
const CreateNestWizard: React.FC<CreateNestWizardProps> = ({
  onClose,
  onComplete
}) => {
  const navigation = useNavigation();
  const {
    currentStep,
    nestData,
    loading,
    error,
    success,
    createdNestId,
    updateBasicInfo,
    updatePrivacySettings,
    updateInitialMembers,
    nextStep,
    prevStep,
    goToStep,
    createNewNest,
    resetForm
  } = useCreateNest();

  // アニメーションの状態
  const [slideAnim] = useState(new Animated.Value(0));
  // キーボードショートカットの状態
  const [keyboardShortcutsEnabled, setKeyboardShortcutsEnabled] = useState(isDesktopWeb);

  // ステップ間のアニメーション
  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: -currentStep * width,
      duration: 300,
      useNativeDriver: false
    }).start();
  }, [currentStep, slideAnim]);

  // バックハンドラー（Androidの戻るボタン対応）
  useEffect(() => {
    const handleBackPress = () => {
      if (currentStep > 0) {
        prevStep();
        return true;
      }
      return false;
    };

    if (Platform.OS === 'android') {
      BackHandler.addEventListener('hardwareBackPress', handleBackPress);
      return () => {
        BackHandler.removeEventListener('hardwareBackPress', handleBackPress);
      };
    }
  }, [currentStep, prevStep]);

  // キーボードショートカット
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!keyboardShortcutsEnabled) return;

      // Escキーでクローズ
      if (e.key === 'Escape') {
        handleClose();
      }

      // Ctrl+Enterで次へ/作成
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (currentStep === CreateNestStep.SUMMARY) {
          handleCreateNest();
        } else {
          nextStep();
        }
      }
    };

    if (isWebPlatform) {
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [keyboardShortcutsEnabled, currentStep]);

  // 成功時のコールバック
  useEffect(() => {
    if (success && createdNestId && onComplete) {
      onComplete(createdNestId);
    }
  }, [success, createdNestId, onComplete]);

  // ウィザードを閉じる
  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      navigation.goBack();
    }
  };

  // NESTを作成する
  const handleCreateNest = async () => {
    const nest = await createNewNest();
    if (nest && onComplete) {
      onComplete(nest.id);
    }
  };

  // ステップのタイトルを取得
  const getStepTitle = (step: CreateNestStep): string => {
    switch (step) {
      case CreateNestStep.BASIC_INFO:
        return '基本情報';
      case CreateNestStep.PRIVACY:
        return 'プライバシー設定';
      case CreateNestStep.INVITE:
        return 'メンバー招待';
      case CreateNestStep.SUMMARY:
        return '確認';
      default:
        return '';
    }
  };

  // 現在のステップコンテンツをレンダリング
  const renderStepContent = () => {
    return (
      <Animated.View
        style={[
          styles.stepsContainer,
          { transform: [{ translateX: slideAnim }] }
        ]}
      >
        <View style={styles.stepContent}>
          <NestBasicInfo
            nestData={nestData}
            onChange={updateBasicInfo}
            onNext={nextStep}
          />
        </View>

        <View style={styles.stepContent}>
          <NestPrivacyStep
            privacySettings={nestData.privacy}
            onChange={updatePrivacySettings}
            onNext={nextStep}
            onBack={prevStep}
          />
        </View>

        <View style={styles.stepContent}>
          <NestInviteStep
            initialMembers={nestData.initialMembers || []}
            onChange={updateInitialMembers}
            onNext={nextStep}
            onBack={prevStep}
          />
        </View>

        <View style={styles.stepContent}>
          <NestSummaryStep
            nestData={nestData}
            onCreateNest={handleCreateNest}
            onBack={prevStep}
            loading={loading}
          />
        </View>
      </Animated.View>
    );
  };

  // ステップインジケーターをレンダリング
  const renderStepIndicator = () => {
    return (
      <View style={styles.stepIndicator}>
        {Array.from({ length: 4 }, (_, i) => (
          <TouchableOpacity
            key={i}
            style={[
              styles.stepDot,
              i <= currentStep && styles.activeStepDot,
              i === currentStep && styles.currentStepDot
            ]}
            onPress={() => i < currentStep && goToStep(i as CreateNestStep)}
            disabled={i > currentStep}
          >
            {i < currentStep ? (
              <Ionicons name="checkmark" size={16} color="#fff" />
            ) : (
              <Text style={styles.stepNumber}>{i + 1}</Text>
            )}
          </TouchableOpacity>
        ))}
        <View style={styles.stepLine} />
      </View>
    );
  };

  // モバイル向けボトムナビゲーション
  const renderMobileNavigation = () => {
    const isLastStep = currentStep === CreateNestStep.SUMMARY;
    
    return (
      <View style={styles.mobileNavigation}>
        {currentStep > 0 && (
          <TouchableOpacity
            style={styles.navButton}
            onPress={prevStep}
            disabled={loading}
          >
            <Ionicons name="arrow-back" size={24} color={BRAND_COLORS.text.primary} />
            <Text style={styles.navButtonText}>戻る</Text>
          </TouchableOpacity>
        )}

        {!isLastStep ? (
          <TouchableOpacity
            style={[styles.navButton, styles.primaryNavButton]}
            onPress={nextStep}
            disabled={loading}
          >
            <Text style={styles.primaryNavButtonText}>次へ</Text>
            <Ionicons name="arrow-forward" size={24} color="#fff" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.navButton, styles.primaryNavButton]}
            onPress={handleCreateNest}
            disabled={loading}
          >
            <Text style={styles.primaryNavButtonText}>作成</Text>
            <Ionicons name="checkmark" size={24} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // ステップリスト（デスクトップ向けサイドバー）
  const renderStepList = () => {
    return (
      <View style={styles.stepList}>
        <Text style={styles.stepListTitle}>新しいNESTを作成</Text>
        {Array.from({ length: 4 }, (_, i) => (
          <TouchableOpacity
            key={i}
            style={[
              styles.stepListItem,
              i === currentStep && styles.activeStepListItem
            ]}
            onPress={() => i <= currentStep && goToStep(i as CreateNestStep)}
            disabled={i > currentStep}
          >
            <View
              style={[
                styles.stepIcon,
                i <= currentStep && styles.activeStepIcon,
                i === currentStep && styles.currentStepIcon
              ]}
            >
              {i < currentStep ? (
                <Ionicons name="checkmark" size={16} color="#fff" />
              ) : (
                <Text style={[
                  styles.stepIconText,
                  i <= currentStep && styles.activeStepIconText
                ]}>
                  {i + 1}
                </Text>
              )}
            </View>
            <Text
              style={[
                styles.stepListItemText,
                i === currentStep && styles.activeStepListItemText
              ]}
            >
              {getStepTitle(i as CreateNestStep)}
            </Text>
          </TouchableOpacity>
        ))}

        <View style={styles.keyboardShortcuts}>
          <Text style={styles.keyboardShortcutsTitle}>ショートカット</Text>
          <View style={styles.shortcutRow}>
            <Text style={styles.shortcutKey}>Esc</Text>
            <Text style={styles.shortcutDescription}>閉じる</Text>
          </View>
          <View style={styles.shortcutRow}>
            <Text style={styles.shortcutKey}>Ctrl+Enter</Text>
            <Text style={styles.shortcutDescription}>次へ/作成</Text>
          </View>
        </View>
      </View>
    );
  };

  // ウィザードコンテナ
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={[
        styles.wizardContainer,
        isDesktopWeb && styles.desktopWizardContainer
      ]}>
        {/* ヘッダー */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleClose}
          >
            <Ionicons name="close" size={24} color={BRAND_COLORS.text.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>新しいNESTを作成</Text>
          <Text style={styles.stepTitle}>{getStepTitle(currentStep)}</Text>
        </View>

        {/* エラーメッセージ */}
        {error && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={20} color={BRAND_COLORS.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* デスクトップレイアウト */}
        {isDesktopWeb ? (
          <View style={styles.desktopContent}>
            {renderStepList()}
            <View style={styles.mainContent}>
              {renderStepContent()}
            </View>
          </View>
        ) : (
          // モバイルレイアウト
          <View style={styles.mobileContent}>
            {renderStepIndicator()}
            {renderStepContent()}
            {renderMobileNavigation()}
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BRAND_COLORS.background.default,
  },
  wizardContainer: {
    flex: 1,
    backgroundColor: BRAND_COLORS.background.light,
    borderRadius: Platform.OS === 'web' ? 12 : 0,
    overflow: 'hidden',
  },
  desktopWizardContainer: {
    maxWidth: 900,
    maxHeight: 650,
    margin: 'auto',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: BRAND_COLORS.background.medium,
    backgroundColor: BRAND_COLORS.background.light,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 8,
    zIndex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: BRAND_COLORS.text.primary,
    marginBottom: 4,
  },
  stepTitle: {
    fontSize: 16,
    color: BRAND_COLORS.text.secondary,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFE5E5',
    padding: 12,
    margin: 16,
    borderRadius: 8,
  },
  errorText: {
    color: BRAND_COLORS.error,
    marginLeft: 8,
    flex: 1,
  },
  // デスクトップレイアウト
  desktopContent: {
    flex: 1,
    flexDirection: 'row',
  },
  stepList: {
    width: 220,
    backgroundColor: BRAND_COLORS.background.medium,
    padding: 16,
    borderRightWidth: 1,
    borderRightColor: BRAND_COLORS.background.dark,
  },
  stepListTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: BRAND_COLORS.text.primary,
    marginBottom: 20,
  },
  stepListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
  },
  activeStepListItem: {
    backgroundColor: 'rgba(52, 152, 219, 0.1)',
  },
  stepIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: BRAND_COLORS.background.dark,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  activeStepIcon: {
    backgroundColor: BRAND_COLORS.primary,
  },
  currentStepIcon: {
    backgroundColor: BRAND_COLORS.primary,
    shadowColor: BRAND_COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  stepIconText: {
    fontSize: 12,
    color: BRAND_COLORS.text.primary,
    fontWeight: '500',
  },
  activeStepIconText: {
    color: '#fff',
  },
  stepListItemText: {
    fontSize: 14,
    color: BRAND_COLORS.text.secondary,
  },
  activeStepListItemText: {
    color: BRAND_COLORS.text.primary,
    fontWeight: '500',
  },
  // キーボードショートカット
  keyboardShortcuts: {
    marginTop: 'auto',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: BRAND_COLORS.background.dark,
  },
  keyboardShortcutsTitle: {
    fontSize: 12,
    color: BRAND_COLORS.text.secondary,
    marginBottom: 8,
  },
  shortcutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  shortcutKey: {
    fontSize: 12,
    color: BRAND_COLORS.text.primary,
    backgroundColor: BRAND_COLORS.background.dark,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
    overflow: 'hidden',
    minWidth: 70,
    textAlign: 'center',
  },
  shortcutDescription: {
    fontSize: 12,
    color: BRAND_COLORS.text.secondary,
  },
  // モバイルレイアウト
  mobileContent: {
    flex: 1,
    paddingTop: 16,
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 24,
    position: 'relative',
  },
  stepLine: {
    position: 'absolute',
    top: '50%',
    left: 70,
    right: 70,
    height: 2,
    backgroundColor: BRAND_COLORS.background.dark,
    zIndex: -1,
  },
  stepDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: BRAND_COLORS.background.dark,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    zIndex: 1,
  },
  activeStepDot: {
    backgroundColor: BRAND_COLORS.primary,
  },
  currentStepDot: {
    backgroundColor: BRAND_COLORS.primary,
    shadowColor: BRAND_COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  stepNumber: {
    fontSize: 14,
    color: BRAND_COLORS.text.inverse,
    fontWeight: '500',
  },
  stepsContainer: {
    flex: 1,
    flexDirection: 'row',
    width: width * 4, // 4ステップ分
  },
  stepContent: {
    width,
    padding: 16,
  },
  mainContent: {
    flex: 1,
    padding: 24,
  },
  mobileNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: BRAND_COLORS.background.medium,
    backgroundColor: BRAND_COLORS.background.light,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    minWidth: 100,
    justifyContent: 'center',
  },
  navButtonText: {
    marginLeft: 8,
    color: BRAND_COLORS.text.primary,
    fontWeight: '500',
  },
  primaryNavButton: {
    backgroundColor: BRAND_COLORS.primary,
  },
  primaryNavButtonText: {
    color: '#fff',
    fontWeight: '500',
    marginRight: 8,
  },
});

export default CreateNestWizard; 