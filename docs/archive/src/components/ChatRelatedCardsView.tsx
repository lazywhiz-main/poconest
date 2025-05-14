import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card, BoardColumnType } from '../types/board';
import { useBoard } from '../contexts/BoardContext';
import { BrandColors } from '../constants/Colors';
import { ChatMessage } from '../types/chat';

interface ChatRelatedCardsViewProps {
  chatId: string;
  recentMessages: ChatMessage[];
  onCardSelect?: (card: Card) => void;
  onClose?: () => void;
}

const ChatRelatedCardsView: React.FC<ChatRelatedCardsViewProps> = ({
  chatId,
  recentMessages,
  onCardSelect,
  onClose
}) => {
  const { cards } = useBoard();
  const [relatedCards, setRelatedCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  
  // チャットの内容に関連するカードを検索
  useEffect(() => {
    const findRelatedCards = async () => {
      try {
        setLoading(true);
        
        // チャットメッセージの内容からキーワードを抽出
        const messageContent = recentMessages
          .map(msg => msg.content)
          .join(' ');
          
        // キーワード抽出（簡易版）
        const keywords = extractKeywords(messageContent);
        
        if (keywords.length === 0) {
          setRelatedCards([]);
          setLoading(false);
          return;
        }
          
        // キーワードに基づいてカードを検索
        const matchingCards = findCardsByKeywords(cards, keywords);
        
        // 同じチャットから保存されたカードを追加
        const chatSourceCards = cards.filter(
          card => card.sourceType === 'chat' && card.sourceId === chatId
        );
        
        // 重複を除いて結合
        const uniqueCards = [...matchingCards];
        chatSourceCards.forEach(card => {
          if (!uniqueCards.some(c => c.id === card.id)) {
            uniqueCards.push(card);
          }
        });
        
        // 最大5件まで表示
        setRelatedCards(uniqueCards.slice(0, 5));
      } catch (error) {
        console.error('関連カード検索エラー:', error);
      } finally {
        setLoading(false);
      }
    };
    
    findRelatedCards();
  }, [chatId, recentMessages, cards]);
  
  // メッセージからキーワードを抽出（簡易版）
  const extractKeywords = (text: string): string[] => {
    // 日本語と英語の単語を抽出（4文字以上）
    const words = text.toLowerCase()
      .replace(/[^\w\sぁ-んァ-ン一-龯]/g, '')
      .split(/\s+/)
      .filter(word => word.length >= 4);
      
    // 頻度をカウント
    const wordCount: Record<string, number> = {};
    words.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1;
    });
    
    // 頻度順にソートして上位10件を返す
    return Object.entries(wordCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(entry => entry[0]);
  };
  
  // キーワードに基づいてカードを検索
  const findCardsByKeywords = (allCards: Card[], keywords: string[]): Card[] => {
    const matchingCards: Card[] = [];
    const cardScores: Record<string, number> = {};
    
    allCards.forEach(card => {
      const cardText = (card.title + ' ' + card.content).toLowerCase();
      let score = 0;
      
      // キーワードごとにスコアを加算
      keywords.forEach(keyword => {
        const regex = new RegExp(keyword, 'g');
        const matches = cardText.match(regex);
        if (matches) {
          score += matches.length;
        }
      });
      
      // タグに一致するキーワードがあればスコアを加算
      if (card.tags) {
        keywords.forEach(keyword => {
          if (card.tags?.some(tag => tag.toLowerCase().includes(keyword))) {
            score += 3; // タグ一致は重み付け
          }
        });
      }
      
      if (score > 0) {
        cardScores[card.id] = score;
        matchingCards.push(card);
      }
    });
    
    // スコア順にソート
    return matchingCards.sort((a, b) => (cardScores[b.id] || 0) - (cardScores[a.id] || 0));
  };
  
  // カード選択時の処理
  const handleCardSelect = (card: Card) => {
    if (onCardSelect) {
      onCardSelect(card);
    }
  };
  
  // カラム名を取得
  const getColumnName = (column: BoardColumnType): string => {
    switch (column) {
      case BoardColumnType.INBOX:
        return 'Inbox';
      case BoardColumnType.INSIGHTS:
        return '洞察';
      case BoardColumnType.THEMES:
        return 'テーマ';
      case BoardColumnType.ZOOM:
        return 'Zoom';
      default:
        return column;
    }
  };
  
  // カラムに応じたアイコン名を取得
  const getColumnIcon = (column: BoardColumnType): any => {
    switch (column) {
      case BoardColumnType.INBOX:
        return 'file-tray-outline';
      case BoardColumnType.INSIGHTS:
        return 'bulb-outline';
      case BoardColumnType.THEMES:
        return 'library-outline';
      case BoardColumnType.ZOOM:
        return 'videocam-outline';
      default:
        return 'document-text-outline';
    }
  };
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={BrandColors.primary} />
      </View>
    );
  }
  
  if (relatedCards.length === 0) {
    return null; // 関連カードがなければ何も表示しない
  }
  
  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.headerContainer}
        onPress={() => setExpanded(!expanded)}
      >
        <View style={styles.titleContainer}>
          <Ionicons name="git-branch-outline" size={16} color={BrandColors.primary} />
          <Text style={styles.title}>関連するカード ({relatedCards.length})</Text>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={BrandColors.text.secondary}
        />
      </TouchableOpacity>
      
      {expanded && (
        <ScrollView 
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.cardsContainer}
        >
          {relatedCards.map(card => (
            <TouchableOpacity
              key={card.id}
              style={styles.card}
              onPress={() => handleCardSelect(card)}
            >
              <View style={styles.cardHeader}>
                <View style={styles.cardColumnBadge}>
                  <Ionicons name={getColumnIcon(card.column)} size={12} color="#FFFFFF" />
                  <Text style={styles.cardColumnText}>{getColumnName(card.column)}</Text>
                </View>
              </View>
              <Text style={styles.cardTitle} numberOfLines={2}>{card.title}</Text>
              <Text style={styles.cardContent} numberOfLines={3}>{card.content}</Text>
              
              {card.tags && card.tags.length > 0 && (
                <View style={styles.tagsContainer}>
                  {card.tags.slice(0, 2).map((tag, index) => (
                    <View key={index} style={styles.tag}>
                      <Text style={styles.tagText}>{tag}</Text>
                    </View>
                  ))}
                  {card.tags.length > 2 && (
                    <View style={styles.tag}>
                      <Text style={styles.tagText}>+{card.tags.length - 2}</Text>
                    </View>
                  )}
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 0,
    borderBottomWidth: 1,
    borderColor: '#EEEEEE',
    overflow: 'hidden',
  },
  loadingContainer: {
    padding: 16,
    alignItems: 'center',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 0,
    borderBottomColor: '#EEEEEE',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: BrandColors.text.primary,
    marginLeft: 8,
  },
  cardsContainer: {
    padding: 12,
  },
  card: {
    width: 220,
    backgroundColor: '#FAFAFA',
    borderRadius: 8,
    padding: 12,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardColumnBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BrandColors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  cardColumnText: {
    fontSize: 10,
    color: '#FFFFFF',
    marginLeft: 4,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: BrandColors.text.primary,
    marginBottom: 8,
  },
  cardContent: {
    fontSize: 12,
    color: BrandColors.text.secondary,
    marginBottom: 8,
    lineHeight: 18,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: `${BrandColors.secondary}15`,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 4,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 10,
    color: BrandColors.secondary,
  },
});

export default ChatRelatedCardsView; 