import React, { useCallback } from 'react';
import {
  View,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  SafeAreaView,
  StatusBar
} from 'react-native';
import { useNavigation, useRoute, RouteProp, ParamListBase } from '@react-navigation/native';
import CreateNestWizard from '../components/CreateNestWizard';
import { BRAND_COLORS } from '@constants/Colors';

// 単純化した型定義
type CreateNestScreenParams = {
  redirectScreen?: string;
};

/**
 * NEST作成画面
 */
const CreateNestScreen: React.FC = () => {
  const navigation = useNavigation<ParamListBase>();
  const route = useRoute<RouteProp<Record<string, CreateNestScreenParams>, string>>();

  // ウィザードが完了したときの処理
  const handleComplete = useCallback((nestId: string) => {
    // 作成完了後に特定の画面に遷移する場合
    const redirectScreen = route.params?.redirectScreen;
    
    if (redirectScreen) {
      // 動的な画面へのナビゲーション
      navigation.navigate(redirectScreen, { nestId });
    } else {
      // デフォルトではタブスクリーンに戻る
      navigation.navigate('TabsScreen', { reload: true });
    }
  }, [navigation, route.params]);

  // ウィザードを閉じる処理
  const handleClose = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        backgroundColor={BRAND_COLORS.background.light}
        barStyle="dark-content"
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <CreateNestWizard
          onComplete={handleComplete}
          onClose={handleClose}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BRAND_COLORS.background.default,
  },
  container: {
    flex: 1,
    backgroundColor: BRAND_COLORS.background.default,
  },
});

export default CreateNestScreen; 