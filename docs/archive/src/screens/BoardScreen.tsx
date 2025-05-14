import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Animated,
  Dimensions,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BrandColors } from '../constants/Colors';
import { BoardColumnType, Card } from '../types/board';
import PocoLogo from '../components/PocoLogo';
import InsightCard from '../components/InsightCard';
import AddCardModal from '../components/AddCardModal';
import CardDetailModal from '../components/CardDetailModal';
import KnowledgeMapView from '../components/KnowledgeMapView';
import { useBoard, COLUMN_DESCRIPTIONS } from '../contexts/BoardContext';
import { useRoute, RouteProp } from '@react-navigation/native';
import { MainTabParamList } from '../navigation/MainTabNavigator';
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import ReAnimated, {
  useAnimatedStyle,
  withSpring,
  withTiming,
  useSharedValue,
  FadeIn,
  FadeOut,
  runOnJS,
} from 'react-native-reanimated';
import { Insight, InsightType, InsightPriority } from '../types/insight';
import CardTypeIndicator from '../components/CardTypeIndicator';
import { AppHeader } from '../components/AppHeader';

// カラムのラベル
const COLUMN_LABELS = {
  [BoardColumnType.INBOX]: 'Inbox',
  [BoardColumnType.INSIGHTS]: 'Insights',
  [BoardColumnType.THEMES]: 'Themes',
  [BoardColumnType.ZOOM]: 'Zoom',
};

// 仮のモックデータ
const mockCards: Card[] = [
  {
    id: '1',
    title: 'プロジェクト企画書作成',
    description: 'ポコネストのプロジェクト企画書を作成する。目標、スケジュール、予算を含める。',
    column: BoardColumnType.INBOX,
    created_at: new Date(2023, 6, 15).toISOString(),
    updated_at: new Date(2023, 6, 15).toISOString(),
    user_id: '1',
    tags: ['仕事', '企画'],
    order: 0,
    sourceType: 'manual'
  },
  {
    id: '2',
    title: 'デザインミーティングの振り返り',
    description: 'デザインチームとのミーティングでの決定事項をまとめる。UIの方向性と次のステップ。',
    column: BoardColumnType.INSIGHTS,
    created_at: new Date(2023, 6, 20).toISOString(),
    updated_at: new Date(2023, 6, 21).toISOString(),
    user_id: '1',
    tags: ['仕事', 'デザイン', 'ミーティング'],
    order: 1,
    sourceType: 'chat',
    sourceId: '123'
  },
  {
    id: '3',
    title: '開発環境のセットアップ手順',
    description: '新しい開発環境のセットアップ手順をドキュメント化する。Node.js、React Native、Expoのインストール。',
    column: BoardColumnType.INBOX,
    created_at: new Date(2023, 7, 5).toISOString(),
    updated_at: new Date(2023, 7, 5).toISOString(),
    tags: ['開発', 'セットアップ'],
    user_id: '1',
    order: 2,
    sourceType: 'manual'
  },
  {
    id: '4',
    title: 'ユーザーインタビュー結果',
    description: '3人のユーザーインタビューから得られた主な洞察。共通の問題点と要望をまとめる。',
    column: BoardColumnType.INSIGHTS,
    created_at: new Date(2023, 7, 10).toISOString(),
    updated_at: new Date(2023, 7, 12).toISOString(),
    tags: ['リサーチ', 'ユーザーインタビュー'],
    user_id: '1',
    order: 3,
    sourceType: 'manual'
  },
  {
    id: '5',
    title: 'プロダクト戦略会議',
    description: '今後6ヶ月のプロダクト戦略について話し合った内容。主要な機能リリース計画と市場展開。',
    column: BoardColumnType.ZOOM,
    created_at: new Date(2023, 7, 15).toISOString(),
    updated_at: new Date(2023, 7, 15).toISOString(),
    tags: ['戦略', 'ミーティング'],
    user_id: '1',
    order: 4,
    sourceType: 'manual'
  },
  {
    id: '6',
    title: 'マーケティングキャンペーン',
    description: 'ソーシャルメディアでのマーケティングキャンペーンのアイデアブレスト結果。対象ユーザーと訴求ポイント。',
    column: BoardColumnType.INBOX,
    created_at: new Date(2023, 7, 20).toISOString(),
    updated_at: new Date(2023, 7, 20).toISOString(),
    tags: ['マーケティング', 'アイデア'],
    user_id: '1',
    order: 5,
    sourceType: 'manual'
  },
  {
    id: '7',
    title: '週次ミーティング',
    description: '週次ミーティングでの進捗報告と次週の計画。各メンバーのタスク割り当て。',
    column: BoardColumnType.ZOOM,
    created_at: new Date(2023, 7, 25).toISOString(),
    updated_at: new Date(2023, 7, 25).toISOString(),
    tags: ['チーム', 'ミーティング', '計画'],
    user_id: '1',
    order: 6,
    sourceType: 'manual'
  },
  {
    id: '8',
    title: 'ユーザビリティテスト結果',
    description: '最新バージョンのユーザビリティテスト結果。発見された問題点と改善すべき点。',
    column: BoardColumnType.THEMES,
    created_at: new Date(2023, 8, 10).toISOString(),
    updated_at: new Date(2023, 8, 10).toISOString(),
    tags: ['リサーチ', 'UX'],
    user_id: '1',
    order: 7,
    sourceType: 'manual'
  }
];

// カード移動アニメーションのための値
const cardWidth = Dimensions.get('window').width * 0.7;
const cardHeight = 120;

type BoardScreenRouteProp = RouteProp<MainTabParamList, 'Board'>;

const BoardScreen: React.FC = () => {
  const route = useRoute<BoardScreenRouteProp>();
  const { 
    cards, 
    loading, 
    activeColumn, 
    setActiveColumn, 
    getCardsByColumn,
    moveCard,
    deleteCard,
    addCard,
    promoteCardToInsight,
    promoteInsightToTheme,
    getColumnInfo,
    updateCard,
    updateCardOrder,
  } = useBoard();
  
  const translateX = useSharedValue(0);
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [showColumnInfoModal, setShowColumnInfoModal] = useState(false);
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [previousCards, setPreviousCards] = useState<Card[]>([]);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [showCardDetailModal, setShowCardDetailModal] = useState(false);
  const [showKnowledgeMap, setShowKnowledgeMap] = useState(false);
  const [mapCenterCardId, setMapCenterCardId] = useState<string | undefined>(undefined);
  const [indicatorStyle, setIndicatorStyle] = useState<'line' | 'badge' | 'header' | 'tag'>('header');
  
  // 現在のカラムのカードを取得
  const currentCards = useMemo(() => {
    return getCardsByColumn(activeColumn);
  }, [activeColumn, cards, getCardsByColumn]);
  
  // カラムを切り替える
  const handleColumnChange = (column: BoardColumnType) => {
    if (column === activeColumn || isTransitioning) return; // 同じカラムまたは遷移中は何もしない
    
    setIsTransitioning(true);
    setPreviousCards(currentCards);
    
    // 現在のカードを左に流す
    translateX.value = withTiming(-300, {
      duration: 200,
    }, (finished) => {
      if (finished) {
        // runOnJSを使用してメインスレッドで状態更新を行う
        runOnJS(setActiveColumn)(column);
        runOnJS(setSelectedCards)([]);
        runOnJS(setIsSelectionMode)(false);
        
        // 次のカードを右側に配置
        translateX.value = 300;
        
        // 新しいカードを右から左に流す
        translateX.value = withTiming(0, {
          duration: 200,
        }, (finished) => {
          if (finished) {
            runOnJS(setIsTransitioning)(false);
            runOnJS(setPreviousCards)([]);
          }
        });
      }
    });
  };

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
      opacity: withSpring(1),
    };
  });

  // カードを追加
  const handleAddCard = (title: string, content: string, tags: string[], column: BoardColumnType) => {
    const now = new Date().toISOString();
    const newCardData = {
      title,
      description: content,
      column,
      user_id: '1',
      tags,
      sourceType: 'manual' as const,
      order: 0,
      created_at: now,
      updated_at: now,
    };
    
    addCard(newCardData)
      .then(() => {
        setShowAddCardModal(false);
        if (column !== activeColumn) {
          handleColumnChange(column);
        }
      })
      .catch(error => {
        console.error('カード追加エラー:', error);
        Alert.alert('エラー', 'カードの追加に失敗しました');
      });
  };

  // Inboxカードを洞察に昇格させる
  const handlePromoteToInsight = (cardId: string) => {
    Alert.alert(
      '洞察に昇格',
      'このカードを洞察（Insights）に昇格させますか？\nAIがタイトルやタグを補強します。',
      [
        {
          text: 'キャンセル',
          style: 'cancel',
        },
        {
          text: '昇格させる',
          onPress: async () => {
            try {
              const promotedCard = await promoteCardToInsight(cardId);
              if (promotedCard) {
                Alert.alert('成功', 'カードを洞察に昇格しました');
                if (activeColumn !== BoardColumnType.INSIGHTS) {
                  handleColumnChange(BoardColumnType.INSIGHTS);
                }
              } else {
                Alert.alert('エラー', '昇格処理に失敗しました');
              }
            } catch (error) {
              console.error('昇格エラー:', error);
              Alert.alert('エラー', '処理中にエラーが発生しました');
            }
          },
        },
      ]
    );
  };
  
  // 選択したInsightカードからテーマを作成
  const handleCreateTheme = () => {
    if (selectedCards.length === 0) {
      Alert.alert('選択エラー', 'テーマを作成するには1つ以上のインサイトを選択してください');
      return;
    }
    
    Alert.alert(
      'テーマを作成',
      `選択した${selectedCards.length}件のインサイトからテーマを作成しますか？`,
      [
        {
          text: 'キャンセル',
          style: 'cancel',
        },
        {
          text: '作成する',
          onPress: async () => {
            try {
              const themeCard = await promoteInsightToTheme(selectedCards);
              if (themeCard) {
                setSelectedCards([]);
                setIsSelectionMode(false);
                Alert.alert('成功', 'テーマを作成しました');
                if (activeColumn !== BoardColumnType.THEMES) {
                  handleColumnChange(BoardColumnType.THEMES);
                }
              } else {
                Alert.alert('エラー', 'テーマの作成に失敗しました');
              }
            } catch (error) {
              console.error('テーマ作成エラー:', error);
              Alert.alert('エラー', '処理中にエラーが発生しました');
            }
          },
        },
      ]
    );
  };
  
  // カードの選択状態を切り替え
  const toggleCardSelection = (cardId: string) => {
    if (selectedCards.includes(cardId)) {
      setSelectedCards(selectedCards.filter(id => id !== cardId));
    } else {
      setSelectedCards([...selectedCards, cardId]);
    }
  };

  // カードを編集
  const handleEditCard = (card: Card) => {
    console.log('Edit card called with card:', JSON.stringify(card, null, 2));
    
    // Set the card and show the modal with a small timeout to ensure the card is set first
    setSelectedCard(null);
    setTimeout(() => {
      setSelectedCard(card);
      setShowCardDetailModal(true);
    }, 100);
  };

  // カードを削除
  const handleDeleteCard = (cardId: string) => {
    Alert.alert(
      'カードを削除',
      'このカードを削除してもよろしいですか？',
      [
        {
          text: 'キャンセル',
          style: 'cancel',
        },
        {
          text: '削除',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCard(cardId);
              // 選択中だった場合、選択解除
              if (selectedCards.includes(cardId)) {
                setSelectedCards(selectedCards.filter(id => id !== cardId));
              }
            } catch (error) {
              console.error('カード削除エラー:', error);
              Alert.alert('エラー', 'カードの削除中にエラーが発生しました');
            }
          },
        },
      ]
    );
  };

  // 選択モードをキャンセル
  const cancelSelectionMode = () => {
    setIsSelectionMode(false);
    setSelectedCards([]);
  };

  // カードをドラッグして別のカラムに移動する機能（将来的に実装）
  const handleMoveCard = async (cardId: string, targetColumn: BoardColumnType) => {
    try {
      await moveCard(cardId, targetColumn);
    } catch (error) {
      console.error('カード移動エラー:', error);
    }
  };

  // カードのドラッグ終了時の処理
  const handleDragEnd = async ({ data, from, to }: { data: Card[], from: number, to: number }) => {
    try {
      const reorderedCards = [...data];
      const [movedCard] = reorderedCards.splice(from, 1);
      reorderedCards.splice(to, 0, movedCard);
      
      // カードの順序を更新
      await updateCardOrder(activeColumn, reorderedCards.map(card => card.id));
    } catch (error) {
      console.error('Error updating card order:', error);
      Alert.alert('エラー', 'カードの順序の更新に失敗しました');
    }
  };

  // スワイプアクションのレンダリング
  const renderSwipeActions = (card: Card) => {
    return (
      <View style={styles.swipeActions}>
        <TouchableOpacity
          style={[styles.swipeAction, styles.deleteAction]}
          onPress={() => handleDeleteCard(card.id)}
        >
          <Ionicons name="trash-outline" size={24} color="white" />
        </TouchableOpacity>
        {activeColumn !== 'insights' && (
          <TouchableOpacity
            style={[styles.swipeAction, styles.promoteAction]}
            onPress={() => handlePromoteToInsight(card.id)}
          >
            <Ionicons name="arrow-up-outline" size={24} color="white" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // カードをタップしたときの処理
  const handleCardPress = (card: Card) => {
    if (isSelectionMode) {
      toggleCardSelection(card.id);
      return;
    }
    
    // カード詳細を表示
    setSelectedCard(card);
    setShowCardDetailModal(true);
  };

  // カードリストのレンダリング
  const renderCardList = () => {
    if (loading) {
      return <ActivityIndicator size="large" color={BrandColors.primary} />;
    }

    if (currentCards.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>
            このカラムにはまだカードがありません
          </Text>
        </View>
      );
    }

    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <DraggableFlatList
          data={currentCards}
          onDragEnd={handleDragEnd}
          keyExtractor={(item) => item.id}
          renderItem={({ item, drag, isActive }) => (
            <ScaleDecorator>
              <ReAnimated.View
                entering={FadeIn}
                exiting={FadeOut}
                style={[
                  styles.cardContainer,
                  isActive && styles.draggingCard
                ]}
              >
                <TouchableOpacity
                  style={styles.dragHandle}
                  onPressIn={drag}
                  activeOpacity={0.7}
                >
                  <Ionicons name="reorder-three" size={18} color={BrandColors.text.tertiary} style={{ opacity: 0.5 }} />
                </TouchableOpacity>
                
                <View style={styles.cardContent}>
                  <TouchableOpacity
                    onPress={() => handleCardPress(item)}
                    onLongPress={() => {
                      if (isSelectionMode) {
                        toggleCardSelection(item.id);
                      } else {
                        setIsSelectionMode(true);
                        setSelectedCards([item.id]);
                      }
                    }}
                    delayLongPress={500}
                    style={[
                      styles.card,
                      indicatorStyle === 'header' && styles.cardWithHeader
                    ]}
                  >
                    <CardTypeIndicator type={item.column} style={indicatorStyle} />
                    <View style={[
                      styles.cardHeader,
                      indicatorStyle === 'header' && styles.headerWithPadding
                    ]}>
                      <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                      <Ionicons 
                        name={item.sourceType === 'chat' ? 'chatbubble-outline' : 
                              item.sourceType === 'zoom' ? 'videocam-outline' : 
                              'document-text-outline'} 
                        size={18} 
                        color={BrandColors.text.secondary} 
                      />
                    </View>
                    <Text style={[
                      styles.cardDescription,
                      indicatorStyle === 'badge' && styles.descriptionWithPadding
                    ]} numberOfLines={2}>
                      {item.description}
                    </Text>
                    <View style={styles.cardFooter}>
                      <View style={styles.tagsContainer}>
                        {item.tags && item.tags.map((tag, index) => (
                          <View key={index} style={styles.tag}>
                            <Text style={styles.tagText}>{tag}</Text>
                          </View>
                        ))}
                      </View>
                      <Text style={styles.cardDate}>
                        {new Date(item.updated_at).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}
                      </Text>
                    </View>
                  </TouchableOpacity>
                  
                  {isSelectionMode && (
                    <View style={styles.selectionIndicator}>
                      <Ionicons 
                        name={selectedCards.includes(item.id) ? "checkmark-circle" : "ellipse-outline"} 
                        size={24} 
                        color={selectedCards.includes(item.id) ? BrandColors.primary : "#999"} 
                      />
                    </View>
                  )}
                </View>
              </ReAnimated.View>
            </ScaleDecorator>
          )}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.cardsContainer}
        />
      </GestureHandlerRootView>
    );
  };

  // 知識マップからカードが選択されたときの処理
  const handleMapCardSelect = (cardId: string) => {
    const card = cards.find(c => c.id === cardId);
    if (card) {
      setSelectedCard(card);
      setShowCardDetailModal(true);
      setShowKnowledgeMap(false);
    }
  };

  useEffect(() => {
    if (route.params?.initialTab) {
      setActiveColumn(route.params.initialTab);
    }
  }, [route.params?.initialTab, setActiveColumn]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={BrandColors.primary} />
      </View>
    );
  }

  // アクティブなカラムのカードをフィルタリング
  const filteredCards = getCardsByColumn(activeColumn);
  // 現在のカラム情報
  const columnInfo = getColumnInfo(activeColumn);

  // ヘッダーの右側コンポーネント
  const headerRightComponent = (
    <TouchableOpacity 
      style={styles.networkButton}
      onPress={() => {
        setMapCenterCardId(undefined);
        setShowKnowledgeMap(true);
      }}
    >
      <Ionicons name="git-network-outline" size={24} color={BrandColors.text.primary} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader
        title="ボード"
        showEmoji={true}
        emoji="📋"
        rightComponent={headerRightComponent}
      />

      {/* カラムタブ */}
      <View style={styles.tabHeader}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.columnTabsContainer}
        >
          {Object.values(BoardColumnType).map((column) => (
            <TouchableOpacity
              key={column}
              style={[styles.columnTab, activeColumn === column && styles.activeColumnTab]}
              onPress={() => handleColumnChange(column)}
            >
              <Text style={[styles.columnTabText, activeColumn === column && styles.activeColumnTabText]}>
                {COLUMN_LABELS[column]}
              </Text>
              {activeColumn === column && <View style={styles.activeIndicator} />}
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* カラム説明と選択モードUIを含むヘッダー */}
        <View style={styles.columnHeader}>
          <View style={styles.columnHeaderTop}>
            <TouchableOpacity 
              style={styles.columnTitleContainer}
              onPress={() => setShowColumnInfoModal(true)}
            >
              <Ionicons name={columnInfo.icon as any} size={20} color={BrandColors.primary} />
              <Text style={styles.columnTitle}>{columnInfo.title}</Text>
              <Ionicons name="information-circle-outline" size={16} color={BrandColors.text.secondary} />
            </TouchableOpacity>
            <View style={styles.cardCountContainer}>
              <Text style={styles.cardCount}>{currentCards.length}</Text>
            </View>
          </View>
          
          {isSelectionMode ? (
            <View style={styles.selectionModeControls}>
              <Text style={styles.selectionCount}>{selectedCards.length}件選択中</Text>
              
              {activeColumn === BoardColumnType.INSIGHTS && selectedCards.length > 0 && (
                <TouchableOpacity 
                  style={[styles.selectionActionButton, styles.themeButton]}
                  onPress={handleCreateTheme}
                >
                  <Ionicons name="library-outline" size={16} color="#fff" />
                  <Text style={styles.selectionActionButtonText}>テーマ作成</Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity 
                style={styles.cancelSelectionButton}
                onPress={cancelSelectionMode}
              >
                <Text style={styles.cancelSelectionText}>キャンセル</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={styles.columnDescription} numberOfLines={2}>
              {columnInfo.description}
            </Text>
          )}
        </View>
      </View>

      {/* カードリスト */}
      {renderCardList()}

      {/* 追加ボタン（固定位置） */}
      {!isSelectionMode && (
        <TouchableOpacity 
          style={styles.floatingAddButton}
          onPress={() => setShowAddCardModal(true)}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      )}

      {/* モーダル類 */}
      <Modal
        visible={showColumnInfoModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowColumnInfoModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowColumnInfoModal(false)}
        >
          <View style={styles.columnInfoModal}>
            <View style={styles.columnInfoIconContainer}>
              <Ionicons name={columnInfo.icon as any} size={36} color={BrandColors.primary} />
            </View>
            <Text style={styles.columnInfoTitle}>{columnInfo.title}</Text>
            <Text style={styles.columnInfoDescription}>{columnInfo.description}</Text>
            
            {activeColumn === BoardColumnType.INBOX && (
              <View style={styles.columnInfoActionHint}>
                <Ionicons name="arrow-up-circle-outline" size={18} color={BrandColors.primary} />
                <Text style={styles.columnInfoActionText}>
                  カードを長押しして「洞察」に昇格させることができます
                </Text>
              </View>
            )}
            
            {activeColumn === BoardColumnType.INSIGHTS && (
              <View style={styles.columnInfoActionHint}>
                <Ionicons name="layers-outline" size={18} color={BrandColors.primary} />
                <Text style={styles.columnInfoActionText}>
                  複数のカードを選択して「テーマ」を作成できます
                </Text>
              </View>
            )}
            
            <TouchableOpacity 
              style={styles.closeModalButton} 
              onPress={() => setShowColumnInfoModal(false)}
            >
              <Text style={styles.closeModalButtonText}>閉じる</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* 知識マップモーダル */}
      <Modal
        visible={showKnowledgeMap}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowKnowledgeMap(false)}
      >
        <View style={styles.modalContainer}>
          <KnowledgeMapView 
            centerCardId={mapCenterCardId}
            onCardPress={handleMapCardSelect}
            onClose={() => setShowKnowledgeMap(false)}
          />
        </View>
      </Modal>

      {/* カード追加モーダル */}
      <AddCardModal
        visible={showAddCardModal}
        onClose={() => setShowAddCardModal(false)}
        onSubmit={handleAddCard}
        initialColumn={activeColumn}
      />

      {/* カード詳細モーダル */}
      <CardDetailModal
        visible={showCardDetailModal}
        onClose={() => {
          console.log('カード詳細モーダルを閉じる');
          setShowCardDetailModal(false);
          setSelectedCard(null);
        }}
        card={selectedCard}
        onUpdate={async (cardId, updates) => {
          console.log('カード更新:', cardId, updates);
          return updateCard(cardId, updates);
        }}
        onDelete={async (cardId) => {
          console.log('カード削除:', cardId);
          try {
            await deleteCard(cardId);
            return Promise.resolve();
          } catch (error) {
            console.error('Card delete error:', error);
            return Promise.reject(error);
          }
        }}
        onPromoteToInsight={async (cardId) => {
          console.log('カードを洞察に昇格:', cardId);
          try {
            const result = await promoteCardToInsight(cardId);
            return result;
          } catch (error) {
            console.error('Promote error:', error);
            return Promise.reject(error);
          }
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BrandColors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: BrandColors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: BrandColors.backgroundVariants.light,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    height: 60,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emoji: {
    fontSize: 24,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: BrandColors.text.primary,
  },
  networkButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: `${BrandColors.primary}15`,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabHeader: {
    backgroundColor: BrandColors.backgroundVariants.light,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  columnTabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    height: 44,
    alignItems: 'center',
  },
  columnHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  columnHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  columnTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  columnTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: BrandColors.text.primary,
    marginLeft: 8,
    marginRight: 4,
  },
  columnDescription: {
    fontSize: 14,
    color: BrandColors.text.secondary,
    marginTop: 2,
  },
  selectionModeControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  selectionCount: {
    fontSize: 14,
    color: BrandColors.text.primary,
    fontWeight: '500',
  },
  selectionActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BrandColors.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 8,
  },
  themeButton: {
    backgroundColor: BrandColors.secondary,
  },
  selectionActionButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  cancelSelectionButton: {
    padding: 6,
    marginLeft: 'auto',
  },
  cancelSelectionText: {
    color: BrandColors.text.secondary,
    fontSize: 14,
  },
  cardListContainer: {
    flex: 1,
  },
  cardsContainer: {
    padding: 16,
    paddingBottom: 80,
  },
  cardContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 8,
    marginVertical: 4,
    marginHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  dragHandle: {
    width: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  cardContent: {
    flex: 1,
  },
  draggingCard: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    transform: [{ scale: 1.02 }],
  },
  cardSelectionMode: {
    backgroundColor: BrandColors.backgroundVariants.medium,
  },
  cardSelected: {
    borderColor: BrandColors.primary,
    borderWidth: 2,
  },
  selectionIndicator: {
    position: 'absolute',
    right: 8,
    top: 8,
    zIndex: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    flex: 1,
    backgroundColor: BrandColors.backgroundVariants.light,
    borderRadius: 8,
    padding: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: BrandColors.text.primary,
    flex: 1,
    marginRight: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: BrandColors.text.secondary,
    marginBottom: 12,
    lineHeight: 20,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    flex: 1,
  },
  tag: {
    backgroundColor: `${BrandColors.secondary}15`, // 15% opacity
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 4,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 12,
    color: BrandColors.secondary,
  },
  cardDate: {
    fontSize: 12,
    color: BrandColors.text.tertiary,
    marginLeft: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 14,
    color: BrandColors.text.secondary,
    marginTop: 16,
    marginBottom: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  columnInfoModal: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    alignItems: 'center',
  },
  columnInfoIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: `${BrandColors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  columnInfoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: BrandColors.text.primary,
    marginBottom: 8,
  },
  columnInfoDescription: {
    fontSize: 14,
    color: BrandColors.text.secondary,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  columnInfoActionHint: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${BrandColors.primary}10`,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  columnInfoActionText: {
    fontSize: 13,
    color: BrandColors.text.primary,
    marginLeft: 8,
    flex: 1,
  },
  closeModalButton: {
    paddingVertical: 8,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: BrandColors.primary,
  },
  closeModalButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  columnTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 8,
    position: 'relative',
  },
  columnTabText: {
    fontSize: 14,
    color: BrandColors.text.secondary,
  },
  activeColumnTab: {
    backgroundColor: `${BrandColors.primary}15`,
  },
  activeColumnTabText: {
    color: BrandColors.primary,
    fontWeight: 'bold',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -1,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: BrandColors.primary,
    borderRadius: 1,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  floatingAddButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: BrandColors.primary,
    borderRadius: 24,
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardCountContainer: {
    backgroundColor: `${BrandColors.primary}15`,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  cardCount: {
    fontSize: 14,
    color: BrandColors.primary,
    fontWeight: '600',
  },
  swipeActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
  },
  swipeAction: {
    width: 80,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteAction: {
    backgroundColor: BrandColors.error,
  },
  promoteAction: {
    backgroundColor: BrandColors.primary,
  },
  cardWithHeader: {
    paddingTop: 32,
  },
  headerWithPadding: {
    marginTop: 0,
  },
  descriptionWithPadding: {
    paddingLeft: 48,
    marginTop: 4,
  },
});

export default BoardScreen; 