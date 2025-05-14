import { Card } from '../types/board';

// グラフのノード（カード）の型定義
export interface GraphNode {
  id: string;
  label: string;
  category: string; // column type
  value: number;    // 重要度を表す円の大きさ
  tags?: string[];
}

// グラフのエッジ（関連性）の型定義
export interface GraphEdge {
  source: string;   // カードID
  target: string;   // 関連カードID
  value: number;    // 関連度の強さ（1〜10）
  label?: string;   // 関連の種類（「同じタグ」など）
}

// グラフデータの型定義
export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

/**
 * カード群からの関連性グラフデータの生成
 */
export const generateRelationshipGraph = (cards: Card[], centerCardId?: string): GraphData => {
  if (cards.length === 0) {
    return { nodes: [], edges: [] };
  }

  console.log(`生成中のカード: ${cards.length}件`);
  console.log(`カラム別集計: Inbox=${cards.filter(c => c.column === 'inbox').length}, Insights=${cards.filter(c => c.column === 'insights').length}, Themes=${cards.filter(c => c.column === 'themes').length}, Zoom=${cards.filter(c => c.column === 'zoom').length}`);

  // ノードを生成（全カードまたは中心カードとその関連カード）
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const processedCardIds = new Set<string>();
  
  // 中心カードが指定されている場合
  if (centerCardId) {
    const centerCard = cards.find(card => card.id === centerCardId);
    if (!centerCard) {
      return { nodes: [], edges: [] };
    }
    
    // 中心カードをノードに追加
    nodes.push({
      id: centerCard.id,
      label: centerCard.title.length > 20 ? centerCard.title.substring(0, 20) + '...' : centerCard.title,
      category: centerCard.column,
      value: 30, // 中心カードは大きく表示
      tags: centerCard.tags || []
    });
    processedCardIds.add(centerCard.id);
    
    // 関連カードを検索して追加
    addRelatedCards(centerCard, cards, nodes, edges, processedCardIds);
  } 
  // 中心カードが指定されていない場合は全カードを表示（カラムフィルタなし）
  else {
    // 全カードをノードとして追加
    cards.forEach(card => {
      if (!processedCardIds.has(card.id)) {
        nodes.push({
          id: card.id,
          label: card.title.length > 20 ? card.title.substring(0, 20) + '...' : card.title,
          category: card.column,
          value: 15, // 標準サイズ
          tags: card.tags || []
        });
        processedCardIds.add(card.id);
      }
    });
    
    // カード間の関連性を検索
    generateAllEdges(cards, edges);
  }
  
  console.log(`生成されたノード: ${nodes.length}件、エッジ: ${edges.length}件`);
  return { nodes, edges };
};

/**
 * 特定のカードに関連するカードをノードとエッジとして追加
 */
const addRelatedCards = (
  card: Card, 
  allCards: Card[], 
  nodes: GraphNode[], 
  edges: GraphEdge[],
  processedCardIds: Set<string>
) => {
  // 関連カードを検索
  const relatedCards = findRelatedCards(card, allCards);
  
  // 関連カードをノードとして追加し、エッジを作成
  relatedCards.forEach(relatedCard => {
    // すでに処理済みのカードは追加しない
    if (processedCardIds.has(relatedCard.card.id)) {
      // エッジのみ追加
      edges.push({
        source: card.id,
        target: relatedCard.card.id,
        value: relatedCard.strength,
        label: relatedCard.relationshipType
      });
      return;
    }
    
    // ノードを追加
    nodes.push({
      id: relatedCard.card.id,
      label: relatedCard.card.title.length > 20 ? relatedCard.card.title.substring(0, 20) + '...' : relatedCard.card.title,
      category: relatedCard.card.column,
      value: 15,
      tags: relatedCard.card.tags
    });
    
    // エッジを追加
    edges.push({
      source: card.id,
      target: relatedCard.card.id,
      value: relatedCard.strength,
      label: relatedCard.relationshipType
    });
    
    processedCardIds.add(relatedCard.card.id);
    
    // 再帰的に関連カードを追加（深さを制限）
    if (nodes.length < 30) { // 最大30ノードまで
      addRelatedCards(relatedCard.card, allCards, nodes, edges, processedCardIds);
    }
  });
};

/**
 * すべてのカード間のエッジを生成
 */
const generateAllEdges = (cards: Card[], edges: GraphEdge[]) => {
  const processedPairs = new Set<string>();
  
  cards.forEach(sourceCard => {
    const relatedCards = findRelatedCards(sourceCard, cards);
    
    relatedCards.forEach(relatedCard => {
      // 既に処理済みのペアはスキップ
      const pairKey1 = `${sourceCard.id}-${relatedCard.card.id}`;
      const pairKey2 = `${relatedCard.card.id}-${sourceCard.id}`;
      
      if (processedPairs.has(pairKey1) || processedPairs.has(pairKey2)) {
        return;
      }
      
      // エッジを追加
      edges.push({
        source: sourceCard.id,
        target: relatedCard.card.id,
        value: relatedCard.strength,
        label: relatedCard.relationshipType
      });
      
      processedPairs.add(pairKey1);
    });
  });
};

// 関連カードを見つける
interface RelatedCard {
  card: Card;
  strength: number; // 1-10の関連度
  relationshipType: string;
}

/**
 * カードに関連するカードを検索
 */
const findRelatedCards = (card: Card, allCards: Card[]): RelatedCard[] => {
  const relatedCards: RelatedCard[] = [];
  
  // 1. タグの一致で関連付け
  if (card.tags && card.tags.length > 0) {
    allCards.forEach(otherCard => {
      if (card.id === otherCard.id) return; // 自分自身は除外
      
      if (otherCard.tags && otherCard.tags.length > 0) {
        const commonTags = card.tags!.filter(tag => otherCard.tags?.includes(tag));
        
        if (commonTags.length > 0) {
          relatedCards.push({
            card: otherCard,
            strength: Math.min(10, commonTags.length * 3), // タグの一致数に応じて強度を設定
            relationshipType: '共通タグ'
          });
        }
      }
    });
  }
  
  // 2. メタデータの関連IDを使用
  if (card.metadata?.relatedCardIds) {
    const relatedIds = card.metadata.relatedCardIds as string[];
    
    relatedIds.forEach(relatedId => {
      const relatedCard = allCards.find(c => c.id === relatedId);
      if (relatedCard) {
        relatedCards.push({
          card: relatedCard,
          strength: 10, // 明示的な関連は強度最大
          relationshipType: '関連付け'
        });
      }
    });
  }
  
  // 3. テーマとインサイトの関連
  if (card.metadata?.relatedInsightIds) {
    const insightIds = card.metadata.relatedInsightIds as string[];
    
    insightIds.forEach(insightId => {
      const insight = allCards.find(c => c.id === insightId);
      if (insight) {
        relatedCards.push({
          card: insight,
          strength: 8,
          relationshipType: 'テーマ関連'
        });
      }
    });
  }
  
  // 4. タイトルや内容のキーワード類似性
  const cardWords = (card.title + ' ' + card.content)
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 3); // 4文字以上の意味のある単語

  if (cardWords.length > 0) {
    allCards.forEach(otherCard => {
      // 既に関連付けされているか、自分自身は除外
      if (card.id === otherCard.id || relatedCards.some(rc => rc.card.id === otherCard.id)) {
        return;
      }
      
      const otherCardText = (otherCard.title + ' ' + otherCard.content).toLowerCase();
      const matchingWords = cardWords.filter(word => otherCardText.includes(word));
      
      if (matchingWords.length >= 2) { // 最低2単語一致
        relatedCards.push({
          card: otherCard,
          strength: Math.min(7, matchingWords.length), // 最大7
          relationshipType: 'キーワード類似'
        });
      }
    });
  }
  
  // 5. 同じソースから生成されたカード
  if (card.sourceId) {
    allCards.forEach(otherCard => {
      // 既に関連付けされているか、自分自身は除外
      if (card.id === otherCard.id || relatedCards.some(rc => rc.card.id === otherCard.id)) {
        return;
      }
      
      if (otherCard.sourceId === card.sourceId) {
        relatedCards.push({
          card: otherCard,
          strength: 6,
          relationshipType: '同一ソース'
        });
      }
    });
  }
  
  // 重複を削除して返す（同じカードIDの場合は強度の高い方を採用）
  const uniqueRelatedCards: RelatedCard[] = [];
  const processedCardIds = new Set<string>();
  
  relatedCards
    .sort((a, b) => b.strength - a.strength) // 強度の高い順にソート
    .forEach(relatedCard => {
      if (!processedCardIds.has(relatedCard.card.id)) {
        uniqueRelatedCards.push(relatedCard);
        processedCardIds.add(relatedCard.card.id);
      }
    });
  
  return uniqueRelatedCards;
}; 