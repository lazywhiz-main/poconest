import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  SafeAreaView,
  Animated,
  Easing,
} from 'react-native';
import { BrandColors } from '../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import PocoLogo from '../components/PocoLogo';
import { CustomHeader } from '../components/CustomHeader';

// ステッカーの型
type Sticker = {
  id: string;
  name: string;
  image: string;
  unlocked: boolean;
};

// テーマの型
type Theme = {
  id: string;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  backgroundImage?: string;
  unlocked: boolean;
};

// 仮のステッカーデータ
const mockStickers: Sticker[] = [
  {
    id: '1',
    name: 'ハッピーポコ',
    image: 'https://via.placeholder.com/150',
    unlocked: true,
  },
  {
    id: '2',
    name: 'アイデアポコ',
    image: 'https://via.placeholder.com/150',
    unlocked: true,
  },
  {
    id: '3',
    name: 'おやすみポコ',
    image: 'https://via.placeholder.com/150',
    unlocked: false,
  },
  {
    id: '4',
    name: 'お祝いポコ',
    image: 'https://via.placeholder.com/150',
    unlocked: false,
  },
  {
    id: '5',
    name: 'ビックリポコ',
    image: 'https://via.placeholder.com/150',
    unlocked: false,
  },
];

// 仮のテーマデータ
const mockThemes: Theme[] = [
  {
    id: '1',
    name: 'デフォルト',
    primaryColor: BrandColors.primary,
    secondaryColor: BrandColors.secondary,
    unlocked: true,
  },
  {
    id: '2',
    name: 'ダークモード',
    primaryColor: '#6B21A8',
    secondaryColor: '#9333EA',
    unlocked: true,
  },
  {
    id: '3',
    name: 'フォレスト',
    primaryColor: '#047857',
    secondaryColor: '#10B981',
    unlocked: false,
  },
  {
    id: '4',
    name: 'オーシャン',
    primaryColor: '#1E40AF',
    secondaryColor: '#3B82F6',
    unlocked: false,
  },
];

export const PlayScreen = () => {
  const [activeTab, setActiveTab] = useState<'stickers' | 'themes'>('stickers');
  const [selectedSticker, setSelectedSticker] = useState<Sticker | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<Theme | null>(null);
  const [spinValue] = useState(new Animated.Value(0));

  // ポコの回転アニメーション
  const startSpinAnimation = () => {
    Animated.timing(spinValue, {
      toValue: 1,
      duration: 1000,
      easing: Easing.elastic(1),
      useNativeDriver: true,
    }).start(() => {
      spinValue.setValue(0);
    });
  };

  // ステッカーをタップしたときの処理
  const handleStickerPress = (sticker: Sticker) => {
    if (sticker.unlocked) {
      setSelectedSticker(sticker);
      startSpinAnimation();
    }
  };

  // テーマをタップしたときの処理
  const handleThemePress = (theme: Theme) => {
    if (theme.unlocked) {
      setSelectedTheme(theme);
      startSpinAnimation();
    }
  };

  // 回転アニメーション用のスタイル
  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // ステッカーアイテム
  const renderStickerItem = ({ item }: { item: Sticker }) => (
    <TouchableOpacity
      style={[
        styles.stickerItem,
        !item.unlocked && styles.lockedItem,
        selectedSticker?.id === item.id && styles.selectedItem,
      ]}
      onPress={() => handleStickerPress(item)}
      disabled={!item.unlocked}
    >
      <Image
        source={{ uri: item.image }}
        style={[
          styles.stickerImage,
          !item.unlocked && styles.lockedImage,
        ]}
      />
      <Text style={styles.stickerName}>{item.name}</Text>
      {!item.unlocked && (
        <View style={styles.lockIconContainer}>
          <Ionicons name="lock-closed" size={24} color="#fff" />
        </View>
      )}
    </TouchableOpacity>
  );

  // テーマアイテム
  const renderThemeItem = ({ item }: { item: Theme }) => (
    <TouchableOpacity
      style={[
        styles.themeItem,
        !item.unlocked && styles.lockedItem,
        selectedTheme?.id === item.id && styles.selectedItem,
      ]}
      onPress={() => handleThemePress(item)}
      disabled={!item.unlocked}
    >
      <View
        style={[
          styles.themeColorPreview,
          {
            backgroundColor: item.primaryColor,
            borderColor: item.secondaryColor,
          },
        ]}
      />
      <Text style={styles.themeName}>{item.name}</Text>
      {!item.unlocked && (
        <View style={styles.lockIconContainer}>
          <Ionicons name="lock-closed" size={24} color="#fff" />
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <CustomHeader
        title="遊び"
        showBackButton={false}
        showEmoji={true}
        emoji="🎮"
      />

      {/* タブ切り替え */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'stickers' && styles.activeTabButton]}
          onPress={() => setActiveTab('stickers')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'stickers' && styles.activeTabButtonText]}>
            ステッカー
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'themes' && styles.activeTabButton]}
          onPress={() => setActiveTab('themes')}
        >
          <Text style={[styles.tabButtonText, activeTab === 'themes' && styles.activeTabButtonText]}>
            テーマ
          </Text>
        </TouchableOpacity>
      </View>

      {/* ポコのプレビュー */}
      <View style={styles.previewContainer}>
        <Animated.View style={{ transform: [{ rotate: spin }] }}>
          <PocoLogo size={120} />
        </Animated.View>
        <Text style={styles.previewText}>
          {activeTab === 'stickers'
            ? selectedSticker
              ? `「${selectedSticker.name}」を選択中`
              : 'ステッカーを選んでね'
            : selectedTheme
            ? `「${selectedTheme.name}」テーマを選択中`
            : 'テーマを選んでね'}
        </Text>
      </View>

      {/* コンテンツ */}
      <View style={styles.contentContainer}>
        {activeTab === 'stickers' ? (
          <>
            <Text style={styles.contentTitle}>利用可能なステッカー</Text>
            <FlatList
              data={mockStickers}
              renderItem={renderStickerItem}
              keyExtractor={(item) => item.id}
              numColumns={2}
              contentContainerStyle={styles.gridContainer}
            />
          </>
        ) : (
          <>
            <Text style={styles.contentTitle}>利用可能なテーマ</Text>
            <FlatList
              data={mockThemes}
              renderItem={renderThemeItem}
              keyExtractor={(item) => item.id}
              numColumns={2}
              contentContainerStyle={styles.gridContainer}
            />
          </>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BrandColors.background,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    marginHorizontal: 4,
  },
  activeTabButton: {
    backgroundColor: BrandColors.backgroundVariants.light,
  },
  tabButtonText: {
    fontSize: 14,
    color: BrandColors.text.tertiary,
  },
  activeTabButtonText: {
    color: BrandColors.primary,
    fontWeight: 'bold',
  },
  previewContainer: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: BrandColors.backgroundVariants.light,
  },
  previewText: {
    marginTop: 16,
    fontSize: 16,
    color: BrandColors.text.primary,
    textAlign: 'center',
  },
  contentContainer: {
    flex: 1,
    padding: 16,
  },
  contentTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: BrandColors.text.primary,
  },
  gridContainer: {
    paddingBottom: 16,
  },
  stickerItem: {
    flex: 1,
    margin: 8,
    padding: 16,
    borderRadius: 12,
    backgroundColor: BrandColors.backgroundVariants.light,
    alignItems: 'center',
  },
  stickerImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 8,
  },
  stickerName: {
    fontSize: 14,
    color: BrandColors.text.primary,
    textAlign: 'center',
  },
  themeItem: {
    flex: 1,
    margin: 8,
    padding: 16,
    borderRadius: 12,
    backgroundColor: BrandColors.backgroundVariants.light,
    alignItems: 'center',
  },
  themeColorPreview: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 8,
    borderWidth: 2,
  },
  themeName: {
    fontSize: 14,
    color: BrandColors.text.primary,
    textAlign: 'center',
  },
  lockedItem: {
    opacity: 0.5,
  },
  lockedImage: {
    opacity: 0.5,
  },
  lockIconContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -12,
    marginTop: -12,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 12,
    padding: 4,
  },
  selectedItem: {
    borderWidth: 2,
    borderColor: BrandColors.primary,
  },
});

export default PlayScreen; 