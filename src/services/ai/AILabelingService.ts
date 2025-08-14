import type { BoardItem } from '../../features/board-space/contexts/BoardContext';
import { ClusterLabel } from '../AnalysisService';
import { supabase } from '../supabase/client';

// AI支援ラベル生成の提案結果
export interface AILabelingSuggestion {
  primary: string;           // メイン候補
  alternatives: string[];    // 複数候補（3-5個）
  confidence: number;        // 信頼度（0-1）
  reasoning: string;         // 生成理由・根拠
  generation_method: 'statistical' | 'semantic' | 'ai_enhanced';
  keywords: string[];        // 抽出されたキーワード
  user_context?: {           // ユーザー学習データ
    edit_history: string[];
    preference_patterns: string[];
  };
}

// ユーザーのラベル編集履歴
export interface UserLabelHistory {
  id: string;
  user_id: string;
  original_label: string;
  edited_label: string;
  cluster_context: {
    card_count: number;
    dominant_tags: string[];
    theme: string;
  };
  created_at: Date;
}

// AI強化設定
export interface AILabelingConfig {
  use_ai_enhancement: boolean;
  include_alternatives: boolean;
  learn_from_history: boolean;
  generate_detailed_reasoning: boolean;
  preferred_style: 'concise' | 'descriptive' | 'technical';
  min_confidence_threshold: number;
}

export class AILabelingService {
  
  /**
   * AI支援によるクラスターラベル候補生成
   */
  static async generateAILabelSuggestions(
    cards: BoardItem[],
    clusterId: string,
    userId?: string,
    config: AILabelingConfig = {
      use_ai_enhancement: true,
      include_alternatives: true,
      learn_from_history: true,
      generate_detailed_reasoning: true,
      preferred_style: 'descriptive',
      min_confidence_threshold: 0.6
    }
  ): Promise<AILabelingSuggestion> {
    try {
      console.log(`🚨🚨🚨 [AILabelingService] === AI支援ラベル生成開始 ===`);
      console.log(`🚨 [AILabelingService] clusterId: ${clusterId}`);
      console.log(`🚨 [AILabelingService] cards: ${cards.length}個`);
      console.log(`🚨 [AILabelingService] card titles:`, cards.map(c => c.title));
      console.log(`🚨 [AILabelingService] userId: ${userId}`);
      console.log(`🚨 [AILabelingService] config:`, config);
      
      // 環境変数チェック（Vite形式とReact形式の両方をサポート）
      const openAIKey = import.meta.env.VITE_OPENAI_API_KEY || process.env.REACT_APP_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
      const geminiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.REACT_APP_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
      const hasOpenAI = !!openAIKey;
      const hasGemini = !!geminiKey;
      console.log(`🚨 [APIキー確認] OpenAI: ${hasOpenAI}, Gemini: ${hasGemini}`);
      console.log(`🚨 [APIキー詳細] OpenAI key length: ${openAIKey?.length || 0}, Gemini key length: ${geminiKey?.length || 0}`);
      
      // 1. 基本統計分析
      console.log(`🚨 [AILabelingService] 1. 統計分析開始...`);
      const statisticalResult = await this.generateStatisticalLabels(cards);
      console.log(`🚨 [AILabelingService] 統計分析結果:`, statisticalResult);
      
      // 2. ユーザー学習データの取得
      let userContext;
      if (config.learn_from_history && userId) {
        console.log(`🚨 [AILabelingService] 2. ユーザー学習データ取得中...`);
        userContext = await this.getUserLabelingContext(userId);
        console.log(`🚨 [AILabelingService] ユーザーコンテキスト:`, userContext);
      }
      
      // 3. AI強化ラベル生成
      let enhancedResult;
      if (config.use_ai_enhancement) {
        console.log(`🚨 [AILabelingService] 3. AI強化ラベル生成開始...`);
        enhancedResult = await this.generateAIEnhancedLabels(
          cards, 
          statisticalResult, 
          userContext, 
          config
        );
        console.log(`🚨 [AILabelingService] AI強化結果:`, enhancedResult);
      } else {
        console.log(`🚨 [AILabelingService] AI強化は無効化されています`);
      }
      
      // 4. 結果の統合と最適化
      console.log(`🚨 [AILabelingService] 4. 結果統合開始...`);
      const finalResult = this.combineAndOptimizeResults(
        statisticalResult,
        enhancedResult,
        userContext,
        config
      );
      
      console.log(`🚨🚨🚨 [最終結果] primary: ${finalResult.primary}, confidence: ${finalResult.confidence}, method: ${finalResult.generation_method}`);
      return finalResult;
      
    } catch (error) {
      console.error('🚨🚨🚨 [AILabelingService] Label generation failed:', error);
      
      // フォールバック: 基本統計ラベル
      return this.generateFallbackLabel(cards);
    }
  }
  
  /**
   * 統計ベースのラベル生成（既存機能の改良版）
   */
  private static async generateStatisticalLabels(cards: BoardItem[]): Promise<{
    primary: string;
    alternatives: string[];
    confidence: number;
    keywords: string[];
  }> {
    // 1. タグ頻度分析
    const tagFreq: { [tag: string]: number } = {};
    cards.forEach(card => {
      card.tags?.forEach((tag: string) => {
        tagFreq[tag] = (tagFreq[tag] || 0) + 1;
      });
    });
    
    // 2. キーワード抽出
    const allText = cards
      .map(card => `${card.title} ${card.content || ''}`)
      .join(' ');
    const keywords = this.extractKeywords(allText);
    
    // 3. 共起語分析
    const cooccurrenceTerms = this.analyzeCooccurrence(cards, keywords);
    
    // 4. 統計的ラベル候補生成
    const dominantTags = Object.entries(tagFreq)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([tag]) => tag);
    
    const alternatives: string[] = [];
    
    // タグベースのラベル
    if (dominantTags.length > 0) {
      alternatives.push(dominantTags[0]);
      if (dominantTags.length > 1) {
        alternatives.push(`${dominantTags[0]}・${dominantTags[1]}`);
      }
    }
    
    // キーワードベースのラベル
    if (keywords.length > 0) {
      alternatives.push(keywords[0]);
      if (keywords.length > 1) {
        alternatives.push(`${keywords[0]}の${keywords[1]}`);
      }
    }
    
    // 共起語ベースのラベル
    if (cooccurrenceTerms.length > 0) {
      alternatives.push(cooccurrenceTerms[0]);
    }
    
    // プライマリラベルの選択（最も適切なもの）
    const primary = this.selectBestStatisticalLabel(alternatives, cards);
    
    return {
      primary,
      alternatives: alternatives.slice(0, 3),
      confidence: this.calculateStatisticalConfidence(cards, dominantTags, keywords),
      keywords: keywords.slice(0, 5)
    };
  }
  
  /**
   * AI強化ラベル生成（OpenAI/Gemini API使用）
   */
  private static async generateAIEnhancedLabels(
    cards: BoardItem[],
    statisticalResult: any,
    userContext: any,
    config: AILabelingConfig
  ): Promise<{
    primary: string;
    alternatives: string[];
    reasoning: string;
    confidence: number;
  }> {
    console.log(`🔥 [generateAIEnhancedLabels] 開始`);
    
    // カードの内容を要約
    const cardSummary = cards.slice(0, 5).map(card => ({
      title: card.title,
      content: card.content?.slice(0, 200) || '',
      tags: card.tags?.slice(0, 3) || [],
      type: card.column_type
    }));
    
    console.log(`🔥 [generateAIEnhancedLabels] カードサマリー:`, cardSummary);
    
    // プロンプト構築
    const prompt = this.buildAILabelingPrompt(
      cardSummary,
      statisticalResult,
      userContext,
      config
    );
    
    console.log(`🔥 [generateAIEnhancedLabels] プロンプト構築完了, 文字数: ${prompt.length}`);
    console.log(`🔥 [generateAIEnhancedLabels] プロンプト内容:`, prompt.substring(0, 500) + '...');
    
    try {
      console.log(`🔥 [generateAIEnhancedLabels] AI API呼び出し開始...`);
      // AI API呼び出し（設定に応じてOpenAI/Gemini切り替え）
      const response = await this.callAIAPI(prompt, config);
      
      console.log(`🔥 [generateAIEnhancedLabels] AI API レスポンス取得成功`);
      console.log(`🔥 [generateAIEnhancedLabels] レスポンス内容:`, response);
      
      const parsedResult = this.parseAIResponse(response);
      console.log(`🔥 [generateAIEnhancedLabels] パース結果:`, parsedResult);
      
      return parsedResult;
      
    } catch (error) {
      console.error('🔥🔥🔥 [generateAIEnhancedLabels] AI API call failed:', error);
      
      // APIキーエラーの場合は統計フォールバックを使わず、エラーとして扱う
      if (error instanceof Error && error.message === 'AI_API_KEY_REQUIRED') {
        console.error('🔥 [generateAIEnhancedLabels] API キーが必要です - 統計フォールバックは行いません');
        throw error; // 上位層でユーザーに適切なエラーメッセージを表示
      }
      
      // その他のエラー（ネットワークエラーなど）の場合のみフォールバック
      console.log(`🔥 [generateAIEnhancedLabels] ネットワークエラー等でフォールバック実行中...`);
      const fallbackResult = this.enhanceStatisticalResult(statisticalResult, config);
      console.log(`🔥 [generateAIEnhancedLabels] フォールバック結果:`, fallbackResult);
      return fallbackResult;
    }
  }
  
  /**
   * キーワード保持型AIラベリング用プロンプト構築
   */
  private static buildAILabelingPrompt(
    cardSummary: any[],
    statisticalResult: any,
    userContext: any,
    config: AILabelingConfig
  ): string {
    const basePrompt = `
あなたは優秀な質的データ分析の専門家です。以下のカード群の**特徴的なキーワードを保持**しつつ、意味のあるクラスターラベルを生成してください。

## 🎯 キーワード保持型ラベリング指針

### 【重要】キーワード保持ルール
1. **カード群の最も特徴的なキーワード2-3個を必ず含める**
2. **抽象化しすぎず、具体性を残す**  
3. **「・」「×」「→」などで特徴キーワードを繋ぐ**
4. **地名・人名・専門用語などの重要情報を隠さない**

### ✅ 良いラベル例
- "宇都宮・餃子店・大学生体験"（地名・業種・対象保持）
- "アンケート設計→データ分析→課題発見"（手法フロー保持）
- "パン屋×地域住民×コミュニティ形成"（要素関係保持）
- "リモートワーク・生産性・チーム連携"（概念関係保持）

### ❌ 避けるべき例  
- "地域連携活動"（抽象的すぎ・キーワード消失）
- "教育価値創造"（汎用的すぎ・具体性無し）
- "課題解決手法"（特徴が見えない）
- "コミュニティ活性化"（キーワード隠蔽）

## 分析対象のカード群（${cardSummary.length}枚）
${cardSummary.map((card, i) => `
${i + 1}. 【${card.type}】${card.title}
   内容: ${card.content}
   タグ: ${card.tags.join(', ')}`).join('\n')}

## ラベル生成手順
1. **キーワード抽出**: カード群から最重要キーワード3-5個を特定
2. **関係性分析**: キーワード間の関係（並列・順序・因果・手段）を理解
3. **ラベル構築**: 適切な接続詞で特徴キーワードを繋げる
4. **具体性保持**: 抽象化レベルを適度に留める（medium程度）`;

    const styleGuidance = {
      'concise': 'コンパクトで覚えやすく、本質を捉えたラベルを優先してください。',
      'descriptive': 'カード群の内容と関係性を正確に表現する説明的なラベルを優先してください。',
      'technical': '専門的で分析的な観点からの正確なラベルを優先してください。'
    };

    const userGuidance = userContext ? `
## ユーザーの編集傾向（参考情報）
このユーザーは過去に以下のような編集を行っています：
${userContext.edit_history.slice(0, 3).map((edit: string) => `- ${edit}`).join('\n')}
パターン: ${userContext.preference_patterns.join(', ')}` : '';

    const outputFormat = `
## 出力形式（JSON）
{
  "primary": "特徴キーワード・保持・具体的ラベル",
  "alternatives": [
    "観点1: キーワード並列形式（A・B・C）", 
    "観点2: キーワード→関係性形式（A→B→C）", 
    "観点3: キーワード×統合形式（A×B×C）"
  ],
  "extractedKeywords": ["キーワード1", "キーワード2", "キーワード3"],
  "reasoning": "なぜこれらのキーワードを選び、どう繋げたかの説明（抽象化度も含む）",
  "confidence": 0.85,
  "abstractionLevel": "medium"
}

## 🎯 キーワード保持型要件
- **必須**: 特徴的キーワード2-3個を必ず含める
- **禁止**: 地名・人名の隠蔽、過度な抽象化
- **推奨**: 「・」「×」「→」等の記号で接続
- **制限**: 20文字以内（キーワード保持のため従来より長め）
- **目標**: ${styleGuidance[config.preferred_style]}

## 補足情報（統計分析結果 - キーワード抽出の参考）
- 頻出キーワード: ${statisticalResult.keywords.join(', ')}
- 統計候補: ${statisticalResult.alternatives.join(', ')}
（注意：キーワード抽出の参考として活用し、意味的関係性も考慮してください）`;

    return basePrompt + userGuidance + outputFormat;
  }
  
  /**
   * AI API呼び出し（OpenAI/Gemini）
   */
  private static async callAIAPI(prompt: string, config: AILabelingConfig): Promise<string> {
    // 環境設定に応じてAPI選択（複数の環境変数形式をサポート）
    const useOpenAI = import.meta.env.VITE_OPENAI_API_KEY || process.env.REACT_APP_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    const useGemini = import.meta.env.VITE_GEMINI_API_KEY || process.env.REACT_APP_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
    
    console.log(`🌟 [callAIAPI] APIキー確認 - OpenAI: ${!!useOpenAI} (${useOpenAI?.length || 0}文字), Gemini: ${!!useGemini} (${useGemini?.length || 0}文字)`);
    
    if (useOpenAI) {
      console.log(`🌟 [callAIAPI] OpenAI API使用開始`);
      return this.callOpenAIAPI(prompt, useOpenAI);
    } else if (useGemini) {
      console.log(`🌟 [callAIAPI] Gemini API使用開始`);
      return this.callGeminiAPI(prompt, useGemini);
    } else {
      console.error(`🌟🌟🌟 [callAIAPI] AI提案にはAPIキーが必要です`);
      console.error(`🌟 [デバッグ] import.meta.env:`, import.meta.env);
      console.error(`🌟 [デバッグ] process.env:`, process.env);
      throw new Error('AI_API_KEY_REQUIRED');
    }
  }
  
  /**
   * OpenAI API呼び出し
   */
  private static async callOpenAIAPI(prompt: string, apiKey: string): Promise<string> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
        temperature: 0.3
      })
    });
    
    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  }
  
  /**
   * Gemini API呼び出し
   */
  private static async callGeminiAPI(prompt: string, apiKey: string): Promise<string> {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: 500,
          temperature: 0.3
        }
      })
    });
    
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }
  
  /**
   * AI応答のパース
   */
  private static parseAIResponse(response: string): {
    primary: string;
    alternatives: string[];
    reasoning: string;
    confidence: number;
    extractedKeywords?: string[];
    abstractionLevel?: string;
  } {
    console.log(`🤖 [AILabelingService] AI Raw Response:`, response);
    
    try {
      // JSON部分を抽出
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        // AI回答の品質チェック（キーワード保持型）
        const primary = parsed.primary || '';
        const isValidLabel = this.validateKeywordPreservingLabel(primary);
        
        if (!isValidLabel) {
          console.warn(`🚨 [AILabelingService] Invalid keyword-preserving label detected: "${primary}"`);
          return this.generateKeywordPreservingFallback(response, parsed);
        }
        
        return {
          primary: primary,
          alternatives: Array.isArray(parsed.alternatives) ? parsed.alternatives : [],
          reasoning: parsed.reasoning || 'キーワード保持型AI分析による推奨',
          confidence: Math.min(Math.max(parsed.confidence || 0.7, 0.6), 1.0),
          extractedKeywords: Array.isArray(parsed.extractedKeywords) ? parsed.extractedKeywords : [],
          abstractionLevel: parsed.abstractionLevel || 'medium'
        };
      }
    } catch (error) {
      console.error('[AILabelingService] Failed to parse AI response:', error);
    }
    
    // パース失敗時のキーワード保持型フォールバック
    return this.generateKeywordPreservingFallback(response, null);
  }
  
  /**
   * キーワード保持型AIラベルの品質検証
   */
  private static validateKeywordPreservingLabel(label: string): boolean {
    if (!label || label.length < 2) return false;
    
    // キーワード保持型として無効なパターン
    const invalidPatterns = [
      /^話者\d+$/,                      // 話者名のみ
      /^[0-9]+$/,                      // 数字のみ
      /^[a-zA-Z]+$/,                    // 英語のみ（ただし専門用語は除く）
    ];
    
    // 過度に抽象的なパターン（キーワード保持型では避けるべき）
    const overlyAbstractPatterns = [
      /^(地域|活動|課題|解決|価値|創造|連携|活性化|取り組み)$/,
      /^(コミュニティ|イノベーション|ソリューション)$/,
      /^(プロジェクト|マネジメント|ストラテジー)$/
    ];
    
    // 無効パターンにマッチしない && 過度に抽象的でない
    return !invalidPatterns.some(pattern => pattern.test(label.trim())) && 
           !overlyAbstractPatterns.some(pattern => pattern.test(label.trim()));
  }
  
  /**
   * 従来のAIラベル品質検証（後方互換性のため保持）
   */
  private static validateAILabel(label: string): boolean {
    if (!label || label.length < 2) return false;
    
    // 地名・人名の単純リストは無効
    const invalidPatterns = [
      /^[都道府県市区町村]+$/,          // 単純な地名
      /^話者\d+$/,                      // 話者名
      /^[ァ-ヶー・]+$/,                  // カタカナのみ
      /^[a-zA-Z]+$/,                    // 英語のみ
      /^[0-9]+$/,                      // 数字のみ
    ];
    
    return !invalidPatterns.some(pattern => pattern.test(label.trim()));
  }
  
  /**
   * キーワード保持型フォールバック生成
   */
  private static generateKeywordPreservingFallback(response: string, parsed: any): {
    primary: string;
    alternatives: string[];
    reasoning: string;
    confidence: number;
    extractedKeywords?: string[];
    abstractionLevel?: string;
  } {
    // レスポンスからキーワードを抽出
    const extractedKeywords = this.extractKeywordsFromResponse(response);
    const primary = extractedKeywords.length >= 2 
      ? extractedKeywords.slice(0, 3).join('・') 
      : extractedKeywords.length > 0 
        ? `${extractedKeywords[0]}関連`
        : '関連項目群';
    
    return {
      primary: primary,
      alternatives: [
        extractedKeywords.length >= 2 ? extractedKeywords.slice(0, 2).join('×') : '共通テーマ',
        extractedKeywords.length >= 3 ? `${extractedKeywords[0]}→${extractedKeywords[1]}→${extractedKeywords[2]}` : '関連概念群',
        extractedKeywords.length > 0 ? `${extractedKeywords[0]}・その他` : '議論項目'
      ],
      reasoning: 'レスポンスから特徴キーワードを抽出してラベル構築',
      confidence: 0.6,
      extractedKeywords: extractedKeywords,
      abstractionLevel: 'medium'
    };
  }
  
  /**
   * 改良されたフォールバック生成（従来版・後方互換性）
   */
  private static generateImprovedFallback(response: string, parsed: any): {
    primary: string;
    alternatives: string[];
    reasoning: string;
    confidence: number;
  } {
    // レスポンスから意味のある単語を抽出
    const meaningfulWords = this.extractMeaningfulConcepts(response);
    
    return {
      primary: meaningfulWords.length > 0 ? meaningfulWords[0] : '関連項目群',
      alternatives: [
        '共通テーマ',
        '関連概念群', 
        '議論項目'
      ],
      reasoning: 'AI分析から意味的関連性を抽出してグループ化',
      confidence: 0.6
    };
  }
  
  /**
   * レスポンスからキーワードを抽出（キーワード保持型用）
   */
  private static extractKeywordsFromResponse(response: string): string[] {
    // 具体的な名詞・地名・専門用語を優先的に抽出
    const keywordPatterns = [
      /([ァ-ヶー]{2,})/g,              // カタカナ2文字以上（地名・専門用語）
      /([一-龯]{2,}(?:店|屋|館|院|社|部|科|課))/g, // 施設・組織名
      /([一-龯]{2,}(?:市|町|村|区|県|府|道))/g,    // 地名
      /([一-龯]{2,}(?:大学|高校|学校|研究|開発))/g, // 教育・研究機関
      /([a-zA-Z]{3,})/g,               // 英語専門用語
      /([一-龯]{2,}(?:分析|設計|調査|評価|管理))/g, // 業務関連
    ];
    
    const extractedKeywords: string[] = [];
    keywordPatterns.forEach(pattern => {
      const matches = response.match(pattern);
      if (matches) {
        extractedKeywords.push(...matches);
      }
    });
    
    // 重複除去・フィルタリング
    const uniqueKeywords = [...new Set(extractedKeywords)]
      .filter(keyword => keyword.length >= 2 && keyword.length <= 8)
      .slice(0, 5); // 最大5個
    
    return uniqueKeywords;
  }
  
  /**
   * レスポンスから意味のある概念を抽出（従来版）
   */
  private static extractMeaningfulConcepts(response: string): string[] {
    // 分析的な表現を探す
    const conceptPatterns = [
      /([課題解決策戦略取組施策方針]に関する.+)/g,
      /([地域社会経済政策]の.+)/g,
      /(.+に関する[検討議論分析])/g,
      /(.+[促進強化改善]の取組)/g,
    ];
    
    const concepts: string[] = [];
    conceptPatterns.forEach(pattern => {
      const matches = response.match(pattern);
      if (matches) {
        concepts.push(...matches.map(m => m.substring(0, 15))); // 15文字以内
      }
    });
    
    return concepts.slice(0, 3);
  }
  
  /**
   * ユーザーのラベル編集履歴取得
   */
  private static async getUserLabelingContext(userId: string): Promise<{
    edit_history: string[];
    preference_patterns: string[];
  } | null> {
    try {
      // 将来的にSupabaseテーブルから取得
      // 現在はローカルストレージから取得
      const history = localStorage.getItem(`labelHistory_${userId}`);
      
      if (history) {
        const parsedHistory = JSON.parse(history);
        return {
          edit_history: parsedHistory.edits || [],
          preference_patterns: parsedHistory.patterns || []
        };
      }
      
      return null;
    } catch (error) {
      console.error('[AILabelingService] Failed to get user context:', error);
      return null;
    }
  }
  
  /**
   * ユーザーのラベル編集履歴を保存
   */
  static async saveUserLabelEdit(
    userId: string,
    originalLabel: string,
    editedLabel: string,
    clusterContext: any
  ): Promise<void> {
    try {
      const historyKey = `labelHistory_${userId}`;
      const existing = localStorage.getItem(historyKey);
      const history = existing ? JSON.parse(existing) : { edits: [], patterns: [] };
      
      // 編集履歴追加
      const edit = `${originalLabel} → ${editedLabel}`;
      history.edits.unshift(edit);
      history.edits = history.edits.slice(0, 10); // 最新10件のみ保持
      
      // パターン分析
      const pattern = this.analyzeEditPattern(originalLabel, editedLabel);
      if (pattern) {
        history.patterns.push(pattern);
        history.patterns = [...new Set(history.patterns)].slice(0, 5); // 重複除去 & 5件まで
      }
      
      localStorage.setItem(historyKey, JSON.stringify(history));
      
      console.log(`💾 [AILabelingService] Saved label edit for user ${userId}`);
    } catch (error) {
      console.error('[AILabelingService] Failed to save label edit:', error);
    }
  }
  
  /**
   * 編集パターン分析
   */
  private static analyzeEditPattern(original: string, edited: string): string | null {
    if (original.length < edited.length) {
      return '詳細化傾向';
    } else if (original.length > edited.length) {
      return '簡潔化傾向';
    } else if (edited.includes('の')) {
      return '関係性明示傾向';
    } else if (edited.match(/[課題|問題|課題]/)) {
      return '課題指向傾向';
    }
    return null;
  }
  
  // Utility methods
  private static extractKeywords(text: string): string[] {
    // 既存のキーワード抽出ロジックを改良
    const words = text
      .replace(/[^\w\s\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 1)
      .filter(word => !['の', 'は', 'が', 'を', 'に', 'で', 'から', 'まで'].includes(word));
    
    const wordCount: { [word: string]: number } = {};
    words.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1;
    });
    
    return Object.entries(wordCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([word]) => word);
  }
  
  private static analyzeCooccurrence(cards: BoardItem[], keywords: string[]): string[] {
    // 共起語分析の簡易実装
    const cooccurrence: { [pair: string]: number } = {};
    
    cards.forEach(card => {
      const text = `${card.title} ${card.content || ''}`;
      keywords.forEach(keyword1 => {
        keywords.forEach(keyword2 => {
          if (keyword1 !== keyword2 && text.includes(keyword1) && text.includes(keyword2)) {
            const pair = [keyword1, keyword2].sort().join('・');
            cooccurrence[pair] = (cooccurrence[pair] || 0) + 1;
          }
        });
      });
    });
    
    return Object.entries(cooccurrence)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([pair]) => pair);
  }
  
  private static selectBestStatisticalLabel(alternatives: string[], cards: BoardItem[]): string {
    if (alternatives.length === 0) return 'クラスター';
    
    // 最も代表的なラベルを選択（現在は最初の候補）
    return alternatives[0] || 'クラスター';
  }
  
  private static calculateStatisticalConfidence(
    cards: BoardItem[], 
    dominantTags: string[], 
    keywords: string[]
  ): number {
    let confidence = 0.5; // ベース信頼度
    
    // タグの一貫性
    if (dominantTags.length > 0) {
      confidence += 0.2;
    }
    
    // キーワードの明確性
    if (keywords.length > 2) {
      confidence += 0.2;
    }
    
    // カード数による安定性
    if (cards.length >= 3) {
      confidence += 0.1;
    }
    
    return Math.min(confidence, 0.9);
  }
  
  private static combineAndOptimizeResults(
    statisticalResult: any,
    enhancedResult: any,
    userContext: any,
    config: AILabelingConfig
  ): AILabelingSuggestion {
    // AI強化結果を優先し、統計結果は補完として使用
    const finalResult: AILabelingSuggestion = {
      primary: enhancedResult?.primary || statisticalResult.primary,
      alternatives: enhancedResult?.alternatives?.length > 0 
        ? [
            ...enhancedResult.alternatives,
            ...statisticalResult.alternatives.filter((alt: string) => 
              !enhancedResult.alternatives.includes(alt)
            )
          ].slice(0, 5)
        : statisticalResult.alternatives,
      confidence: enhancedResult?.confidence || statisticalResult.confidence,
      reasoning: enhancedResult?.reasoning || '統計分析に基づく推奨ラベル',
      generation_method: enhancedResult ? 'ai_enhanced' : 'statistical',
      keywords: statisticalResult.keywords,
      user_context: userContext
    };
    
    // AI結果の信頼度が高い場合は統計結果より優先
    // 低い場合のみ統計結果にフォールバック
    if (enhancedResult && enhancedResult.confidence >= 0.7) {
      // AI結果を信頼して使用
      finalResult.primary = enhancedResult.primary;
      finalResult.confidence = enhancedResult.confidence;
    } else if (finalResult.confidence < config.min_confidence_threshold) {
      // 両方とも信頼度が低い場合は統計結果を使用
      finalResult.primary = statisticalResult.primary;
      finalResult.confidence = Math.max(finalResult.confidence, 0.6);
      finalResult.reasoning = '統計分析ベース（AI分析の信頼度が低いため）';
    }
    
    return finalResult;
  }
  
  private static enhanceStatisticalResult(
    statisticalResult: any,
    config: AILabelingConfig
  ): any {
    // AI呼び出し失敗時の統計結果強化
    return {
      primary: statisticalResult.primary,
      alternatives: statisticalResult.alternatives,
      reasoning: '統計分析とキーワード抽出に基づく推奨',
      confidence: Math.max(statisticalResult.confidence, 0.6)
    };
  }
  
  private static generateFallbackLabel(cards: BoardItem[]): AILabelingSuggestion {
    return {
      primary: `クラスター（${cards.length}項目）`,
      alternatives: ['関連項目群', '共通テーマ', '分類項目'],
      confidence: 0.5,
      reasoning: 'フォールバック：基本的なクラスター識別',
      generation_method: 'statistical',
      keywords: [],
    };
  }
}
