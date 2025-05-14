import React, { useState } from 'react';
import { View, Text, SafeAreaView, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import AppHeader from '@components/layout/AppHeader';
import { COLORS, SPACING } from '@constants/config';
import Screen from '@components/layout/Screen';

const AppHeaderExample: React.FC = () => {
  const [count, setCount] = useState(0);

  // カウンターを増やす
  const handleIncrement = () => {
    setCount(count + 1);
  };

  // アラートを表示
  const handleActionPress = () => {
    alert('アクションボタンが押されました！');
  };

  return (
    <Screen scrollable>
      {/* 基本的なヘッダー */}
      <View style={styles.exampleContainer}>
        <Text style={styles.exampleTitle}>基本的なヘッダー</Text>
        <AppHeader title="ポコの巣" />
      </View>

      {/* サブタイトル付きヘッダー */}
      <View style={styles.exampleContainer}>
        <Text style={styles.exampleTitle}>サブタイトル付き</Text>
        <AppHeader 
          title="ポコの巣" 
          subtitle="設定画面" 
        />
      </View>

      {/* 戻るボタン付き */}
      <View style={styles.exampleContainer}>
        <Text style={styles.exampleTitle}>戻るボタン付き</Text>
        <AppHeader 
          title="設定" 
          showBackButton 
          onBackPress={() => alert('戻るボタンが押されました')} 
        />
      </View>

      {/* 絵文字付き */}
      <View style={styles.exampleContainer}>
        <Text style={styles.exampleTitle}>絵文字付き</Text>
        <AppHeader 
          title="チャット" 
          showEmoji 
          emoji="💬" 
        />
      </View>

      {/* アクションボタン付き */}
      <View style={styles.exampleContainer}>
        <Text style={styles.exampleTitle}>アクションボタン付き</Text>
        <AppHeader 
          title="メッセージ" 
          showActionButton 
          actionLabel="新規" 
          onActionPress={handleActionPress} 
        />
      </View>

      {/* カスタム右コンポーネント */}
      <View style={styles.exampleContainer}>
        <Text style={styles.exampleTitle}>カスタムコンポーネント</Text>
        <AppHeader 
          title="カウンター" 
          rightComponent={
            <TouchableOpacity 
              style={styles.counterButton} 
              onPress={handleIncrement}
            >
              <Text style={styles.counterText}>{count}</Text>
            </TouchableOpacity>
          } 
        />
      </View>

      {/* カスタムカラーヘッダー */}
      <View style={styles.exampleContainer}>
        <Text style={styles.exampleTitle}>カスタムカラー</Text>
        <AppHeader 
          title="プライマリカラー" 
          backgroundColor={COLORS.primary}
          borderBottomColor="transparent"
          showEmoji
          emoji="🎨"
        />
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  exampleContainer: {
    marginBottom: SPACING.lg,
  },
  exampleTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: SPACING.xs,
    color: COLORS.text,
  },
  counterButton: {
    backgroundColor: COLORS.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterText: {
    color: COLORS.white,
    fontWeight: 'bold',
  },
});

export default AppHeaderExample; 