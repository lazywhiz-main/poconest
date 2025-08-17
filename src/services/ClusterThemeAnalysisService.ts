/**
 * クラスターテーマ分析サービス
 * 既存のクラスターに対して、GTA分析に活用できるテーマを抽出する
 */

import type { BoardItem } from './SmartClusteringService';
import type { ClusterLabel } from './AnalysisService';

export interface ContentTheme {
  primaryDomain: string;           // 主要領域
  keyConcepts: string[];           // 主要概念
  problemType: string;             // 問題の種類
  approachStyle: string;           // アプローチスタイル
  stakeholderFocus: string;        // 関係者焦点
  gtaFocus: string[];              // GTA分析での注目点
  analysisPattern: string;         // 分析パターン
  confidence: number;              // 信頼度
}

export interface ThemeAnalysisResult {
  clusterId: string;
  theme: ContentTheme;
  analysisTimestamp: Date;
}

export class ClusterThemeAnalysisService {
  
  /**
   * 既存クラスターに対してテーマ分析を実行
   * 既存のAIラベルとカード内容を活用してテーマを抽出
   */
  static async analyzeExistingCluster(
    clusterLabel: ClusterLabel,
    clusterCards: BoardItem[]
  ): Promise<ContentTheme> {
    
    console.log(`🎯 [ClusterThemeAnalysisService] テーマ分析開始: ${clusterLabel.id}`);
    
    try {
      // 既存のAIラベルを活用
      const existingLabel = clusterLabel.text;
      
      // カード内容のサマリーを作成
      const cardSummary = this.createCardSummary(clusterCards);
      
      // AIでテーマ分析を実行
      const themeResult = await this.extractThemeFromExistingLabel(
        existingLabel,
        cardSummary,
        clusterCards
      );
      
      console.log(`✅ [ClusterThemeAnalysisService] テーマ分析完了:`, {
        clusterId: clusterLabel.id,
        theme: themeResult.primaryDomain,
        confidence: themeResult.confidence
      });
      
      return themeResult;
      
    } catch (error) {
      console.error(`❌ [ClusterThemeAnalysisService] テーマ分析エラー:`, error);
      
      // エラー時はフォールバックテーマを返す
      return this.generateFallbackTheme(clusterCards);
    }
  }
  
  /**
   * 既存のAIラベルからテーマを抽出
   */
  private static async extractThemeFromExistingLabel(
    existingLabel: string,
    cardSummary: string,
    clusterCards: BoardItem[]
  ): Promise<ContentTheme> {
    
    const prompt = `
あなたは質的データ分析の専門家です。以下の既存のクラスターラベルとカード内容から、GTA分析に活用できるテーマを抽出してください。

【既存のAIラベル】
${existingLabel}

【カード内容サマリー】
${cardSummary}

【カード数】
${clusterCards.length}枚

【テーマ抽出要件】
以下の形式でテーマを出力してください：

{
  "primaryDomain": "主要領域（例：user_research, technical_implementation, business_strategy）",
  "keyConcepts": ["主要概念1", "主要概念2", "主要概念3"],
  "problemType": "問題の種類（例：understanding_user_needs, technical_constraints, strategic_planning）",
  "approachStyle": "アプローチスタイル（例：qualitative_research, solution_design, strategic_analysis）",
  "stakeholderFocus": "関係者焦点（例：end_users, development_team, business_stakeholders）",
  "gtaFocus": ["GTA分析での注目点1", "注目点2", "注目点3"],
  "analysisPattern": "分析パターン（例：user_centered_qualitative, solution_oriented_technical, strategic_framework）"
}

【重要】
- 既存のAIラベルの内容を活かしてテーマを抽出
- GTA分析で実際に活用できる具体的な分析方向性を示す
- 表面的な分類ではなく、内容の本質を反映したテーマにする
`;

    // AI呼び出し（環境に応じてOpenAIまたはGeminiを使用）
    const response = await this.callAIForThemeExtraction(prompt);
    
    // 信頼度を計算（既存ラベルの品質を考慮）
    const confidence = this.calculateThemeConfidence(existingLabel, response, clusterCards);
    
    return {
      ...response,
      confidence
    };
  }
  
  /**
   * カード内容のサマリーを作成
   */
  private static createCardSummary(clusterCards: BoardItem[]): string {
    const typeCounts: { [key: string]: number } = {};
    const tagCounts: { [key: string]: number } = {};
    
    clusterCards.forEach(card => {
      // カラムタイプの集計
      typeCounts[card.column_type] = (typeCounts[card.column_type] || 0) + 1;
      
      // タグの集計（metadataから取得）
      const tags = (card.metadata as any)?.tags || [];
      tags.forEach((tag: string) => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });
    
    const dominantType = Object.entries(typeCounts)
      .sort(([,a], [,b]) => b - a)[0];
    
    const topTags = Object.entries(tagCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([tag, count]) => `${tag}(${count})`);
    
    return `
カラムタイプ分布: ${dominantType ? `${dominantType[0]}(${dominantType[1]}枚)` : '不明'}
主要タグ: ${topTags.join(', ')}
代表的なカードタイトル: ${clusterCards.slice(0, 3).map(c => c.title).join(', ')}
`;
  }
  
  /**
   * AI呼び出し（環境に応じて実装）
   */
  private static async callAIForThemeExtraction(prompt: string): Promise<Omit<ContentTheme, 'confidence'>> {
    // 環境変数チェック
    const openAIKey = import.meta.env.VITE_OPENAI_API_KEY || process.env.REACT_APP_OPENAI_API_KEY;
    const geminiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.REACT_APP_GEMINI_API_KEY;
    
    if (openAIKey) {
      return await this.callOpenAI(prompt);
    } else if (geminiKey) {
      return await this.callGemini(prompt);
    } else {
      throw new Error('AI APIキーが設定されていません');
    }
  }
  
  /**
   * OpenAI呼び出し
   */
  private static async callOpenAI(prompt: string): Promise<Omit<ContentTheme, 'confidence'>> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY || process.env.REACT_APP_OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'あなたは質的データ分析の専門家です。JSON形式で正確に回答してください。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1000
      })
    });
    
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }
    
    const data = await response.json();
    const content = data.choices[0].message.content;
    
    try {
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`JSON parse error: ${content}`);
    }
  }
  
  /**
   * Gemini呼び出し
   */
  private static async callGemini(prompt: string): Promise<Omit<ContentTheme, 'confidence'>> {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY || process.env.REACT_APP_GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1000
        }
      })
    });
    
    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }
    
    const data = await response.json();
    const content = data.candidates[0].content.parts[0].text;
    
    try {
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`JSON parse error: ${content}`);
    }
  }
  
  /**
   * テーマ信頼度を計算
   */
  private static calculateThemeConfidence(
    existingLabel: string,
    themeResult: Omit<ContentTheme, 'confidence'>,
    clusterCards: BoardItem[]
  ): number {
    let confidence = 0.7; // ベース信頼度
    
    // 既存ラベルの品質を評価
    if (existingLabel.length > 10 && existingLabel.length < 50) {
      confidence += 0.1; // 適切な長さ
    }
    
    // カード数の適切性
    if (clusterCards.length >= 3 && clusterCards.length <= 15) {
      confidence += 0.1; // 適切なクラスターサイズ
    }
    
    // テーマ結果の完全性
    if (themeResult.gtaFocus.length >= 2) {
      confidence += 0.1; // GTA分析焦点が十分
    }
    
    return Math.min(confidence, 1.0);
  }
  
  /**
   * フォールバックテーマ生成
   */
  private static generateFallbackTheme(clusterCards: BoardItem[]): ContentTheme {
    const dominantType = clusterCards.reduce((acc, card) => {
      acc[card.column_type] = (acc[card.column_type] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });
    
    const mainType = Object.entries(dominantType)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'UNKNOWN';
    
    return {
      primaryDomain: 'general_analysis',
      keyConcepts: ['基本分析', 'データ整理'],
      problemType: 'information_organization',
      approachStyle: 'basic_analysis',
      stakeholderFocus: 'general',
      gtaFocus: ['基本的な概念抽出', 'パターン認識'],
      analysisPattern: 'basic_grounded_analysis',
      confidence: 0.5
    };
  }
  
  /**
   * 複数クラスターの一括テーマ分析
   */
  static async analyzeMultipleClusters(
    clusterLabels: ClusterLabel[],
    allCards: BoardItem[]
  ): Promise<ThemeAnalysisResult[]> {
    
    console.log(`🎯 [ClusterThemeAnalysisService] 一括テーマ分析開始: ${clusterLabels.length}クラスター`);
    
    const results = await Promise.all(
      clusterLabels.map(async (clusterLabel) => {
        const clusterCards = allCards.filter(card => 
          clusterLabel.cardIds.includes(card.id)
        );
        
        const theme = await this.analyzeExistingCluster(clusterLabel, clusterCards);
        
        return {
          clusterId: clusterLabel.id,
          theme,
          analysisTimestamp: new Date()
        };
      })
    );
    
    console.log(`✅ [ClusterThemeAnalysisService] 一括テーマ分析完了: ${results.length}クラスター`);
    
    return results;
  }
}
