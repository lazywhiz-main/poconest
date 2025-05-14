import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Modal,
  Animated,
  Platform,
  TouchableWithoutFeedback,
  Keyboard
} from 'react-native';
import { SpaceType } from '../../types/nestSpace.types';
import { QuickSwitchItem } from '../types/navigation.types';

// SVGアイコンのラッパーコンポーネント
// 実際の実装では適切なアイコンライブラリを使用すること
const Icon = ({ name, color, size = 24 }: { name: string; color: string; size?: number }) => {
  return (
    <View style={{ width: size, height: size, backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color, fontSize: size * 0.5 }}>{name[0].toUpperCase()}</Text>
    </View>
  );
};

// モックデータ：最近アクセスしたコンテキスト
const RECENT_ITEMS: QuickSwitchItem[] = [
  {
    id: 'chat1',
    title: 'プロジェクト会議の議事録',
    type: SpaceType.CHAT,
    contextId: 'chat-123',
    lastAccessed: Date.now() - 1000 * 60 * 5, // 5分前
  },
  {
    id: 'board1',
    title: '新機能設計ボード',
    type: SpaceType.BOARD,
    contextId: 'board-456',
    lastAccessed: Date.now() - 1000 * 60 * 30, // 30分前
  },
  {
    id: 'analysis1',
    title: 'ユーザー行動分析',
    type: SpaceType.ANALYSIS,
    contextId: 'analysis-789',
    lastAccessed: Date.now() - 1000 * 60 * 60, // 1時間前
  },
  {
    id: 'zoom1',
    title: '週次ミーティング',
    type: SpaceType.ZOOM,
    contextId: 'zoom-012',
    lastAccessed: Date.now() - 1000 * 60 * 60 * 3, // 3時間前
  }
];

// 空間タイプごとのアイコンとカラーのマッピング
const SPACE_CONFIGS: Record<SpaceType, { icon: string; color: string }> = {
  [SpaceType.CHAT]: { icon: 'message-circle', color: '#4a6da7' },
  [SpaceType.BOARD]: { icon: 'layout', color: '#43a047' },
  [SpaceType.ANALYSIS]: { icon: 'bar-chart-2', color: '#7e57c2' },
  [SpaceType.ZOOM]: { icon: 'video', color: '#0e71eb' },
  [SpaceType.SETTINGS]: { icon: 'settings', color: '#757575' }
};

interface QuickSwitcherProps {
  onClose: () => void;
  onSpaceSelect: (spaceType: SpaceType, contextId?: string) => void;
}

/**
 * クイック切替コンポーネント
 * 最近のコンテキストと空間へ素早く切り替え
 */
const QuickSwitcher: React.FC<QuickSwitcherProps> = ({
  onClose,
  onSpaceSelect
}) => {
  // 検索クエリ
  const [searchQuery, setSearchQuery] = useState('');
  // アニメーション値
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-20)).current;
  // 入力フィールドの参照
  const inputRef = useRef<TextInput>(null);
  
  // フィルタリングされたアイテム
  const filteredItems = searchQuery
    ? RECENT_ITEMS.filter(item => 
        item.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : RECENT_ITEMS;
  
  // クイックスイッチャーが表示されたときにアニメーションを開始
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true
      })
    ]).start();
    
    // 入力フィールドにフォーカス
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  }, [opacity, translateY]);
  
  // クローズ時のアニメーション
  const animateClose = (callback: () => void) => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true
      }),
      Animated.timing(translateY, {
        toValue: -20,
        duration: 150,
        useNativeDriver: true
      })
    ]).start(callback);
  };
  
  // 閉じるハンドラー
  const handleClose = () => {
    animateClose(onClose);
  };
  
  // アイテム選択ハンドラー
  const handleSelectItem = (item: QuickSwitchItem) => {
    animateClose(() => {
      onSpaceSelect(item.type, item.contextId);
    });
  };
  
  // 空間直接選択ハンドラー
  const handleSelectSpace = (spaceType: SpaceType) => {
    animateClose(() => {
      onSpaceSelect(spaceType);
    });
  };
  
  // 空間名を取得
  const getSpaceName = (spaceType: SpaceType): string => {
    switch (spaceType) {
      case SpaceType.CHAT: return 'チャット';
      case SpaceType.BOARD: return 'ボード';
      case SpaceType.ANALYSIS: return '分析';
      case SpaceType.ZOOM: return 'Zoom';
      case SpaceType.SETTINGS: return '設定';
      default: return '不明';
    }
  };
  
  // アイテムをレンダリング
  const renderItem = ({ item }: { item: QuickSwitchItem }) => {
    const spaceConfig = SPACE_CONFIGS[item.type];
    
    return (
      <TouchableOpacity
        style={styles.itemContainer}
        onPress={() => handleSelectItem(item)}
      >
        <View style={[styles.itemIconContainer, { backgroundColor: spaceConfig.color }]}>
          <Icon name={spaceConfig.icon} color="#FFFFFF" size={16} />
        </View>
        <View style={styles.itemContent}>
          <Text style={styles.itemTitle} numberOfLines={1} ellipsizeMode="tail">
            {item.title}
          </Text>
          <Text style={styles.itemSubtitle}>
            {getSpaceName(item.type)}
          </Text>
        </View>
        <View style={styles.itemActions}>
          <Icon name="arrow-right" color="#9e9e9e" size={16} />
        </View>
      </TouchableOpacity>
    );
  };
  
  return (
    <Modal
      transparent
      visible
      animationType="none"
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <Animated.View 
              style={[
                styles.container,
                {
                  opacity,
                  transform: [{ translateY }]
                }
              ]}
            >
              {/* 検索バー */}
              <View style={styles.searchContainer}>
                <Icon name="search" color="#9e9e9e" size={20} />
                <TextInput
                  ref={inputRef}
                  style={styles.searchInput}
                  placeholder="検索..."
                  placeholderTextColor="#9e9e9e"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  returnKeyType="search"
                  autoCorrect={false}
                />
                {searchQuery ? (
                  <TouchableOpacity
                    style={styles.clearButton}
                    onPress={() => setSearchQuery('')}
                  >
                    <Icon name="x" color="#9e9e9e" size={16} />
                  </TouchableOpacity>
                ) : null}
              </View>
              
              {/* クイック空間アクセス */}
              <View style={styles.quickAccessContainer}>
                <Text style={styles.sectionTitle}>空間</Text>
                <View style={styles.spacesGrid}>
                  {Object.values(SpaceType).map(spaceType => {
                    const config = SPACE_CONFIGS[spaceType];
                    return (
                      <TouchableOpacity
                        key={spaceType}
                        style={styles.spaceButton}
                        onPress={() => handleSelectSpace(spaceType)}
                      >
                        <View style={[styles.spaceIconContainer, { backgroundColor: config.color }]}>
                          <Icon name={config.icon} color="#FFFFFF" size={16} />
                        </View>
                        <Text style={styles.spaceName}>{getSpaceName(spaceType)}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
              
              {/* 最近アクセスしたもの */}
              {!searchQuery || filteredItems.length > 0 ? (
                <View style={styles.recentItemsContainer}>
                  <Text style={styles.sectionTitle}>最近のアクセス</Text>
                  <FlatList
                    data={filteredItems}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    style={styles.itemsList}
                    showsVerticalScrollIndicator={Platform.OS !== 'web'}
                  />
                </View>
              ) : (
                <View style={styles.noResultsContainer}>
                  <Text style={styles.noResultsText}>「{searchQuery}」に一致する結果はありません</Text>
                </View>
              )}
              
              {/* キーボードショートカット説明 */}
              <View style={styles.shortcutsContainer}>
                <Text style={styles.shortcutsText}>
                  TIP: ⌘+K でいつでもこの画面を開けます
                </Text>
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '90%',
    maxWidth: 480,
    maxHeight: '80%',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: 8,
    color: '#333333',
    height: Platform.OS === 'web' ? 28 : 'auto',
  },
  clearButton: {
    padding: 4,
  },
  quickAccessContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#757575',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  spacesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  spaceButton: {
    width: '25%',
    alignItems: 'center',
    padding: 8,
  },
  spaceIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  spaceName: {
    fontSize: 12,
    color: '#333333',
    textAlign: 'center',
  },
  recentItemsContainer: {
    padding: 16,
    flex: 1,
  },
  itemsList: {
    flex: 1,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  itemIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemContent: {
    flex: 1,
    marginLeft: 12,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333333',
  },
  itemSubtitle: {
    fontSize: 12,
    color: '#757575',
    marginTop: 2,
  },
  itemActions: {
    marginLeft: 8,
  },
  noResultsContainer: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  noResultsText: {
    fontSize: 14,
    color: '#757575',
    textAlign: 'center',
  },
  shortcutsContainer: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    alignItems: 'center',
  },
  shortcutsText: {
    fontSize: 12,
    color: '#9e9e9e',
  }
});

export default QuickSwitcher; 