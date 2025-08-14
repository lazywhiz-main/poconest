/**
 * ネットワーク特化距離計算
 * グラフ構造、意味的、構造的距離の統合
 */

import type { NetworkNode, NetworkEdge } from '../../../types/analysis';
import type { BoardItem } from '../../../features/board-space/contexts/BoardContext';
import type { DistanceWeights, DistanceMetrics } from '../types/hdbscan';

// ===========================================
// メイン距離計算クラス
// ===========================================

export class NetworkDistanceCalculator {
  private graphDistanceCache = new Map<string, number>();
  private semanticDistanceCache = new Map<string, number>();
  private loggedWeights = false; // 重み設定ログの重複防止
  private debugLogCount = 0; // デバッグログの制限
  
  constructor(
    private nodes: NetworkNode[],
    private edges: NetworkEdge[],
    private cards: BoardItem[]
  ) {
    this.buildCaches();
  }

  /**
   * 統合距離計算（メイン関数）
   */
  calculateDistance(
    nodeA: NetworkNode,
    nodeB: NetworkNode,
    weights: DistanceWeights
  ): number {
    const metrics = this.calculateAllMetrics(nodeA, nodeB);
    
    const combinedDistance = 
      weights.graph * metrics.graphDistance +
      weights.semantic * metrics.semanticDistance +
      weights.structural * metrics.structuralDistance;
    
    // デバッグ用：重み設定のログ出力（初回のみ）
    if (!this.loggedWeights) {
      console.log(`🎯 [内容ベースクラスタリング] 距離重み設定:`, {
        graph: `${(weights.graph * 100).toFixed(0)}%`,
        semantic: `${(weights.semantic * 100).toFixed(0)}%`,
        structural: `${(weights.structural * 100).toFixed(0)}%`
      });
      this.loggedWeights = true;
    }
    
    return Math.max(0, Math.min(1, combinedDistance)); // 0-1正規化
  }

  /**
   * 全ての距離指標を計算
   */
  calculateAllMetrics(nodeA: NetworkNode, nodeB: NetworkNode): DistanceMetrics {
    const graphDistance = this.calculateGraphDistance(nodeA, nodeB);
    const semanticDistance = this.calculateSemanticDistance(nodeA, nodeB);
    const structuralDistance = this.calculateStructuralDistance(nodeA, nodeB);
    
    return {
      graphDistance,
      semanticDistance,
      structuralDistance,
      combinedDistance: (graphDistance + semanticDistance + structuralDistance) / 3
    };
  }

  /**
   * 距離行列を一括計算
   */
  calculateDistanceMatrix(weights: DistanceWeights): number[][] {
    console.log(`📏 距離行列計算開始: ${this.nodes.length}x${this.nodes.length}`);
    
    const n = this.nodes.length;
    const matrix: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));
    
    let calculatedPairs = 0;
    const totalPairs = (n * (n - 1)) / 2;
    
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const distance = this.calculateDistance(this.nodes[i], this.nodes[j], weights);
        matrix[i][j] = distance;
        matrix[j][i] = distance; // 対称行列
        
        calculatedPairs++;
        if (calculatedPairs % 1000 === 0) {
          console.log(`📊 距離計算進捗: ${calculatedPairs}/${totalPairs} (${((calculatedPairs/totalPairs)*100).toFixed(1)}%)`);
        }
      }
    }
    
    console.log(`✅ 距離行列計算完了: ${calculatedPairs}ペア`);
    return matrix;
  }

  // ===========================================
  // グラフ距離計算
  // ===========================================

  /**
   * グラフ構造に基づく距離（最短パス距離）
   */
  private calculateGraphDistance(nodeA: NetworkNode, nodeB: NetworkNode): number {
    const cacheKey = `${nodeA.id}-${nodeB.id}`;
    const reverseCacheKey = `${nodeB.id}-${nodeA.id}`;
    
    // キャッシュチェック
    if (this.graphDistanceCache.has(cacheKey)) {
      return this.graphDistanceCache.get(cacheKey)!;
    }
    if (this.graphDistanceCache.has(reverseCacheKey)) {
      return this.graphDistanceCache.get(reverseCacheKey)!;
    }

    // 直接接続チェック
    const directEdge = this.edges.find(e => 
      (e.source === nodeA.id && e.target === nodeB.id) ||
      (e.source === nodeB.id && e.target === nodeA.id)
    );

    let distance: number;
    
    if (directEdge) {
      // 直接接続: エッジ強度を距離に変換
      distance = 1 - (directEdge.strength || 0.5);
    } else {
      // 最短パス距離計算
      distance = this.calculateShortestPathDistance(nodeA.id, nodeB.id);
    }

    // キャッシュに保存
    this.graphDistanceCache.set(cacheKey, distance);
    return distance;
  }

  /**
   * 最短パス距離計算（BFS）
   */
  private calculateShortestPathDistance(startId: string, endId: string): number {
    if (startId === endId) return 0;

    // 隣接リスト構築
    const adjacencyList = this.buildAdjacencyList();
    
    // BFS
    const queue: Array<{ nodeId: string; distance: number }> = [{ nodeId: startId, distance: 0 }];
    const visited = new Set<string>();
    visited.add(startId);

    while (queue.length > 0) {
      const { nodeId, distance } = queue.shift()!;
      
      const neighbors = adjacencyList.get(nodeId) || [];
      for (const neighbor of neighbors) {
        if (neighbor.nodeId === endId) {
          // 目標到達: 距離を正規化（最大6ホップ想定）
          const totalDistance = distance + neighbor.distance;
          return Math.min(1, totalDistance / 6);
        }
        
        if (!visited.has(neighbor.nodeId)) {
          visited.add(neighbor.nodeId);
          queue.push({
            nodeId: neighbor.nodeId,
            distance: distance + neighbor.distance
          });
        }
      }
    }

    // パスが見つからない場合は最大距離
    return 1.0;
  }

  /**
   * 隣接リスト構築
   */
  private buildAdjacencyList(): Map<string, Array<{ nodeId: string; distance: number }>> {
    const adjacencyList = new Map<string, Array<{ nodeId: string; distance: number }>>();
    
    // 初期化
    for (const node of this.nodes) {
      adjacencyList.set(node.id, []);
    }
    
    // エッジを追加
    for (const edge of this.edges) {
      const distance = 1 - (edge.strength || 0.5); // 強度を距離に変換
      
      adjacencyList.get(edge.source)?.push({ nodeId: edge.target, distance });
      adjacencyList.get(edge.target)?.push({ nodeId: edge.source, distance });
    }
    
    return adjacencyList;
  }

  // ===========================================
  // 意味的距離計算
  // ===========================================

  /**
   * 意味的類似性に基づく距離
   */
  private calculateSemanticDistance(nodeA: NetworkNode, nodeB: NetworkNode): number {
    const cacheKey = `${nodeA.id}-${nodeB.id}`;
    const reverseCacheKey = `${nodeB.id}-${nodeA.id}`;
    
    // キャッシュチェック
    if (this.semanticDistanceCache.has(cacheKey)) {
      return this.semanticDistanceCache.get(cacheKey)!;
    }
    if (this.semanticDistanceCache.has(reverseCacheKey)) {
      return this.semanticDistanceCache.get(reverseCacheKey)!;
    }

    const cardA = this.cards.find(c => c.id === nodeA.id);
    const cardB = this.cards.find(c => c.id === nodeB.id);
    
    if (!cardA || !cardB) {
      this.semanticDistanceCache.set(cacheKey, 1.0);
      return 1.0;
    }

    // 複数の類似性指標を統合
    const similarities = {
      title: this.calculateTextSimilarity(cardA.title || '', cardB.title || ''),
      content: this.calculateTextSimilarity(cardA.content || '', cardB.content || ''),
      tags: this.calculateTagSimilarity(cardA.tags || [], cardB.tags || []),
      type: this.calculateTypeSimilarity(cardA.column_type, cardB.column_type)
    };

    // 重み付き統合（内容極重視テスト）
    const semanticSimilarity = 
      0.20 * similarities.title +    // タイトル（35% → 20%）
      0.75 * similarities.content +  // コンテンツ極重視（55% → 75%）
      0.05 * similarities.tags +     // タグ最小（10% → 5%）
      0.00 * similarities.type;      // タイプ無視

    const distance = 1 - semanticSimilarity;
    
    // デバッグ用：タイプ間距離の詳細ログ（特定条件でのみ）
    if (cardA.column_type !== cardB.column_type && this.debugLogCount < 5) {
      // フィルタリング効果を確認
      const originalTitleTokens = (cardA.title || '').split(/\s+/).filter(w => w.length > 1);
      const filteredTitleTokens = this.tokenizeText(cardA.title || '');
      const originalContentTokens = (cardA.content || '').split(/\s+/).filter(w => w.length > 1);
      const filteredContentTokens = this.tokenizeText(cardA.content || '');
      
      console.log(`🔍 [完全フレーム除去診断] ${cardA.column_type} vs ${cardB.column_type}:`, {
        titleSim: similarities.title.toFixed(3),
        contentSim: similarities.content.toFixed(3),
        tagsSim: similarities.tags.toFixed(3),
        typeSim: similarities.type.toFixed(3),
        totalSemantic: semanticSimilarity.toFixed(3),
        finalDistance: distance.toFixed(3),
        cardATitle: cardA.title?.substring(0, 40) + '...',
        cardBTitle: cardB.title?.substring(0, 40) + '...',
        advancedFilterEffect: {
          titleTokens: `${originalTitleTokens.length} → ${filteredTitleTokens.length}`,
          contentTokens: `${originalContentTokens.length} → ${filteredContentTokens.length}`,
          totalRemovedWords: originalTitleTokens.length + originalContentTokens.length - 
                            filteredTitleTokens.length - filteredContentTokens.length,
          removalRatio: `${(((originalTitleTokens.length + originalContentTokens.length - filteredTitleTokens.length - filteredContentTokens.length) / Math.max(1, originalTitleTokens.length + originalContentTokens.length)) * 100).toFixed(1)}%`
        }
      });
      this.debugLogCount++;
    }
    
    // キャッシュに保存
    this.semanticDistanceCache.set(cacheKey, distance);
    return distance;
  }

  /**
   * テキスト類似性計算（Jaccard係数）
   */
  private calculateTextSimilarity(textA: string, textB: string): number {
    if (!textA || !textB) return 0;

    // 単語に分割（フィルタリング適用）
    const wordsA = this.tokenizeText(textA);
    const wordsB = this.tokenizeText(textB);
    
    if (wordsA.length === 0 && wordsB.length === 0) return 1;
    if (wordsA.length === 0 || wordsB.length === 0) return 0;

    // Jaccard係数
    const setA = new Set(wordsA);
    const setB = new Set(wordsB);
    const intersection = new Set(Array.from(setA).filter(x => setB.has(x)));
    const union = new Set(Array.from(setA).concat(Array.from(setB)));
    
    const similarity = intersection.size / union.size;
    
    // より実質的な内容での類似性にフォーカス
    return similarity;
  }

  /**
   * テキストのトークン化（カードタイプ特有キーワード除去）
   */
  private tokenizeText(text: string): string[] {
    // Step 1: 見出し構造のフレーズを除去（実際のプロンプトフレーム完全版）
    let cleanedText = text;
    const headingPatterns = [
      // === QUESTIONS特有フレーム ===
      /###\s*関連する発言の流れ/g,
      /###\s*問いの構造と前提/g,
      /###\s*なぜ今この問いが重要か/g,
      /###\s*対応する必要のある観点/g,
      /###\s*この問いに答えるには何が必要か/g,
      
      // === INSIGHTS特有フレーム ===
      /###\s*この発言が示す新しい視点/g,
      /###\s*背景にある構造や認知/g,
      /###\s*意味づけ[・・]仮説/g,
      /###\s*他とどう繋がるか/g,
      
      // === THEMES特有フレーム ===
      /###\s*代表的な発言の流れ/g,
      /###\s*議論の流れ/g,
      /###\s*発言の共通構造/g,
      /###\s*検討すべき視点/g,
      /###\s*次に扱うべき問い/g,
      
      // === ACTIONS特有フレーム ===
      /###\s*実行すべきこと/g,
      /###\s*背景と目的/g,
      /###\s*具体的な担当[／・/]期日[（\(][^）\)]*[）\)]?/g,
      /###\s*成功条件[・／]完了条件/g,
      
      // === INBOX特有フレーム ===
      /###\s*直感的な引っかかり/g,
      /###\s*未整理の可能性/g,
      /###\s*なぜ気になったのか/g,
      /###\s*今後の展開予想[（\(][^）\)]*[）\)]?/g,
      
      // === 共通フレーム ===
      /###\s*関連する発言の流れ/g, // 全タイプ共通
      
      // === 引用構造除去 ===
      />\s*発言者[A-Z]?[:：]/g,
      />\s*話者\s*\d+[:：]/g,
      
      // === その他のマークダウン構造 ===
      /###\s*/g,  // 残った見出し記号
      /##\s*/g,   // 残った見出し記号
      /#\s*/g     // 残った見出し記号
    ];
    
    headingPatterns.forEach(pattern => {
      cleanedText = cleanedText.replace(pattern, ' ');
    });
    
    // Step 2: カードタイプ特有のキーワード（フレームワード）を定義
    const typeSpecificKeywords = new Set([
      // === 実際のフレーム見出し由来の単語 ===
      // Questions関連
      '関連', '発言', '流れ', '問い', '構造', '前提', 'なぜ', '今', '重要', 
      '対応', '必要', '観点', '答える', '必要',
      
      // Insights関連  
      'この', '示す', '新しい', '視点', '背景', 'ある', '認知',
      '意味づけ', '仮説', '他', 'どう', '繋がる',
      
      // Themes関連
      '代表的', '議論', '共通', '検討', 'すべき', '次', '扱う',
      
      // Actions関連
      '実行', 'すべき', 'こと', '目的', '具体的', '担当', '期日',
      '成功', '条件', '完了',
      
      // INBOX関連
      '直感的', '引っかかり', '未整理', '可能性', '気になった', 
      '今後', '展開', '予想',
      
      // === 従来のキーワード拡張版 ===
      // Question特有
      '疑問', '質問', 'どうして', 'どのように', '何が', 'いつ', 'どこで',
      'なに', 'だれ', 'いかに', 'どこ', 'いくつ', 'どれ', 'いくら',
      '確認', '不明', '不明確', '曖昧', '疑問点', '質問事項',
      
      // Insight特有
      '洞察', '気づき', '発見', '理解', '思う', '考える', '感じる', 'わかる',
      '判明', '明らか', 'ポイント', '要点', '核心', '本質',
      '観点', '意味づけ', 'つながり', '読み取れる', '見えてくる', '浮かび上がる',
      
      // Action特有
      '対応', '改善', '実施', '進める', '取り組む', '行う', '実現',
      '推進', '展開', '導入', '運用', '活用', '実践', '遂行',
      '期限', '目標', '達成', 'やる', 'やろう', 'しよう', '要求',
      
      // 共通フレームワード
      'について', 'における', 'に関して', 'に対して', 'として', 'である',
      'です', 'ます', 'だろう', 'でしょう', 'かもしれない', 'と思われる',
      'に関する', 'に対する', 'から見た', 'という', 'といった',
      'であり', 'であった', 'していた', 'している', 'された', 'される',
      'との', 'での', 'への', 'からの', 'までの', 'による', 'において'
    ]);
    
    return cleanedText
      .toLowerCase()
      .replace(/[^\w\s\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g, ' ') // 日本語文字保持
      .split(/\s+/)
      .filter(word => 
        word.length > 1 && 
        !typeSpecificKeywords.has(word) // タイプ特有キーワードを除外
      );
  }

  /**
   * タグ類似性計算
   */
  private calculateTagSimilarity(tagsA: string[], tagsB: string[]): number {
    if (tagsA.length === 0 && tagsB.length === 0) return 1;
    if (tagsA.length === 0 || tagsB.length === 0) return 0;

    const setA = new Set(tagsA.map(tag => tag.toLowerCase()));
    const setB = new Set(tagsB.map(tag => tag.toLowerCase()));
    const intersection = new Set(Array.from(setA).filter(x => setB.has(x)));
    const union = new Set(Array.from(setA).concat(Array.from(setB)));
    
    return intersection.size / union.size;
  }

  /**
   * カラムタイプ類似性（内容ベースクラスタリング対応）
   */
  private calculateTypeSimilarity(typeA: string, typeB: string): number {
    // 内容重視: カードタイプでの分離を防ぐため中立値を返す
    return 0.5; // 全てのタイプペアを中立として扱い、内容での判断を優先
    
    /* 従来のタイプ重視ロジック（無効化）
    if (typeA === typeB) return 1;
    
    // 関連タイプのマッピング
    const typeGroups = [
      ['INBOX', 'IDEAS'],
      ['ACTIONS', 'DOING'], 
      ['DONE', 'COMPLETED'],
      ['ISSUES', 'BLOCKERS']
    ];
    
    for (const group of typeGroups) {
      if (group.includes(typeA) && group.includes(typeB)) {
        return 0.5; // 関連タイプ
      }
    }
    
    return 0; // 無関係
    */
  }

  // ===========================================
  // 構造的距離計算
  // ===========================================

  /**
   * 構造的類似性に基づく距離
   */
  private calculateStructuralDistance(nodeA: NetworkNode, nodeB: NetworkNode): number {
    // ノードの次数（接続数）
    const degreeA = this.getNodeDegree(nodeA.id);
    const degreeB = this.getNodeDegree(nodeB.id);
    
    // 共通隣接ノード数
    const commonNeighbors = this.getCommonNeighbors(nodeA.id, nodeB.id);
    const maxNeighbors = Math.max(degreeA, degreeB);
    
    // 構造類似性指標
    const degreeSimilarity = maxNeighbors > 0 ? 
      1 - Math.abs(degreeA - degreeB) / maxNeighbors : 1;
    
    const neighborSimilarity = maxNeighbors > 0 ? 
      commonNeighbors / maxNeighbors : 0;
    
    // 統合
    const structuralSimilarity = (degreeSimilarity + neighborSimilarity) / 2;
    
    return 1 - structuralSimilarity;
  }

  /**
   * ノードの次数を取得
   */
  private getNodeDegree(nodeId: string): number {
    return this.edges.filter(e => e.source === nodeId || e.target === nodeId).length;
  }

  /**
   * 共通隣接ノード数を取得
   */
  private getCommonNeighbors(nodeA: string, nodeB: string): number {
    const neighborsA = new Set<string>();
    const neighborsB = new Set<string>();
    
    // ノードAの隣接ノード
    for (const edge of this.edges) {
      if (edge.source === nodeA) neighborsA.add(edge.target);
      if (edge.target === nodeA) neighborsA.add(edge.source);
    }
    
    // ノードBの隣接ノード
    for (const edge of this.edges) {
      if (edge.source === nodeB) neighborsB.add(edge.target);
      if (edge.target === nodeB) neighborsB.add(edge.source);
    }
    
    // 共通隣接ノード数
    let commonCount = 0;
    Array.from(neighborsA).forEach(neighbor => {
      if (neighborsB.has(neighbor)) commonCount++;
    });
    
    return commonCount;
  }

  // ===========================================
  // キャッシュ・ユーティリティ
  // ===========================================

  /**
   * キャッシュの初期構築
   */
  private buildCaches(): void {
    console.log(`🗄️ 距離計算キャッシュ初期化`);
    // 必要に応じて頻用ペアのキャッシュを事前構築
  }

  /**
   * キャッシュクリア
   */
  clearCaches(): void {
    this.graphDistanceCache.clear();
    this.semanticDistanceCache.clear();
  }

  /**
   * キャッシュ統計
   */
  getCacheStats(): { graph: number; semantic: number } {
    return {
      graph: this.graphDistanceCache.size,
      semantic: this.semanticDistanceCache.size
    };
  }

  /**
   * 距離行列の品質検証
   */
  static validateDistanceMatrix(matrix: number[][]): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    const n = matrix.length;
    
    // 基本検証
    for (let i = 0; i < n; i++) {
      if (matrix[i].length !== n) {
        errors.push(`行${i}の長さが不正: ${matrix[i].length} (期待値: ${n})`);
      }
      
      for (let j = 0; j < n; j++) {
        const value = matrix[i][j];
        
        // 範囲チェック
        if (value < 0 || value > 1 || isNaN(value)) {
          errors.push(`matrix[${i}][${j}] = ${value} (範囲外: 0-1)`);
        }
        
        // 対角成分チェック
        if (i === j && value !== 0) {
          errors.push(`対角成分が0でない: matrix[${i}][${j}] = ${value}`);
        }
        
        // 対称性チェック
        if (Math.abs(matrix[i][j] - matrix[j][i]) > 1e-6) {
          errors.push(`非対称: matrix[${i}][${j}] = ${matrix[i][j]}, matrix[${j}][${i}] = ${matrix[j][i]}`);
        }
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
