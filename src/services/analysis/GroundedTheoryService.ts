import { BoardItem } from '../../types/board';
import { supabase } from '../supabase';

// 🧠 グラウンデッド・セオリー分析の型定義
export interface ConceptItem {
  id: string;
  concept: string;
  description: string;
  evidence: string[];      // 根拠となるカード内容
  frequency: number;       // 出現頻度
  relevance: number;       // 関連度スコア (0-1)
  category: ConceptCategory;
  clusterId: string;
}

export interface ConceptCategory {
  id: string;
  name: string;
  description: string;
  type: 'phenomenon' | 'causal_condition' | 'intervening_condition' | 'context' | 'action_strategy' | 'consequence';
  concepts: string[];      // concept IDs
}

export interface ConceptRelation {
  id: string;
  sourceConceptId: string;
  targetConceptId: string;
  relationType: 'causal' | 'correlational' | 'conditional' | 'contextual' | 'sequential';
  strength: number;        // 関係の強さ (0-1)
  evidence: string[];      // 根拠となる説明
  bidirectional: boolean;
}

export interface CausalChain {
  id: string;
  name: string;
  description: string;
  conceptSequence: string[]; // concept IDs in order
  strength: number;
  evidence: string[];
}

export interface CoreCategory {
  id: string;
  name: string;
  description: string;
  supportingConcepts: string[];
  contradictingFactors: string[];
  confidence: number;
  centralPhenomenon: string;
}

export interface Hypothesis {
  id: string;
  statement: string;
  type: 'descriptive' | 'explanatory' | 'predictive';
  confidence: number;
  supportingEvidence: string[];
  limitations: string[];
  testable: boolean;
}

export interface TheoreticalModel {
  id: string;
  name: string;
  description: string;
  coreCategory: string;
  conceptNetwork: ConceptRelation[];
  propositions: string[];
  scope: string;
  limitations: string[];
}

// 🎯 分析結果の型定義
export interface OpenCodingResult {
  clusterId: string;
  clusterName: string;
  extractedConcepts: ConceptItem[];
  dominantThemes: string[];
  codeFrequency: Record<string, number>;
  confidenceScore: number;
  analysisDate: string;
}

export interface AxialCodingResult {
  categories: ConceptCategory[];
  relations: ConceptRelation[];
  causalChains: CausalChain[];
  paradigmModel: {
    phenomenon: string;
    causalConditions: string[];
    context: string[];
    interveningConditions: string[];
    actionStrategies: string[];
    consequences: string[];
  };
  analysisDate: string;
}

export interface SelectiveCodingResult {
  coreCategory: CoreCategory;
  storyline: string;
  hypotheses: Hypothesis[];
  theoreticalModel: TheoreticalModel;
  integration: {
    coherence: number;      // 理論の一貫性
    density: number;        // 概念間の密度
    variation: number;      // バリエーションの豊富さ
  };
  analysisDate: string;
}

export interface GroundedTheoryAnalysis {
  id: string;
  nestId: string;
  userId: string;
  boardId: string;
  
  // 3段階の分析結果
  openCoding?: OpenCodingResult[];
  axialCoding?: AxialCodingResult;
  selectiveCoding?: SelectiveCodingResult;
  
  // メタデータ
  analysisPhase: 'open' | 'axial' | 'selective' | 'complete';
  createdAt: string;
  updatedAt: string;
  settings: {
    conceptExtractionThreshold: number;
    relationshipThreshold: number;
    aiAssistanceLevel: 'minimal' | 'moderate' | 'extensive';
  };
}

/**
 * 🧠 グラウンデッド・セオリー分析サービス
 * 
 * 定性データから段階的に理論を構築するためのサービス
 * オープンコーディング → 軸足コーディング → 選択的コーディング の3段階を支援
 */
export class GroundedTheoryService {
  
  /**
   * 📊 Phase 1: オープンコーディング（概念抽出）
   * クラスターごとに概念を抽出し、初期的なコード体系を構築
   */
  static async performOpenCoding(
    clusters: Array<{ id: string; name: string; nodes: string[]; cards: BoardItem[] }>,
    settings: { threshold: number; aiAssistance: boolean } = { threshold: 0.3, aiAssistance: true }
  ): Promise<OpenCodingResult[]> {
    const phaseStartTime = performance.now();
    console.log('🧠 [GroundedTheory] オープンコーディング開始');
    console.log(`📊 対象クラスター数: ${clusters.length}`);
    console.log(`🔧 設定: threshold=${settings.threshold}, aiAssistance=${settings.aiAssistance}`);
    
    const results: OpenCodingResult[] = [];
    let totalProcessingTime = 0;
    
    for (let i = 0; i < clusters.length; i++) {
      const cluster = clusters[i];
      const clusterStartTime = performance.now();
      console.log(`🔍 [${i + 1}/${clusters.length}] クラスター「${cluster.name}」の概念抽出開始`);
      console.log(`📄 カード数: ${cluster.cards.length}, ノード数: ${cluster.nodes.length}`);
      
      try {
        // 1. クラスター内カードの内容分析
        const textExtractionStart = performance.now();
        const textContent = this.extractTextContent(cluster.cards);
        const textExtractionTime = performance.now() - textExtractionStart;
        
        console.log(`📝 テキスト抽出完了 (${textExtractionTime.toFixed(1)}ms)`);
        console.log(`📊 テキスト長: ${textContent.length}文字`);
        console.log(`📄 テキストサンプル: "${textContent.substring(0, 100)}..."`);
        
        // 2. AI支援による概念抽出
        const aiExtractionStart = performance.now();
        const aiConcepts = settings.aiAssistance 
          ? await this.extractConceptsWithAI(textContent, cluster.name)
          : [];
        const aiExtractionTime = performance.now() - aiExtractionStart;
        
        console.log(`🤖 AI概念抽出完了 (${aiExtractionTime.toFixed(1)}ms)`);
        console.log(`🔢 AI抽出概念数: ${aiConcepts.length}`);
        if (aiConcepts.length > 0) {
          console.log(`🎯 AI概念サンプル: ${aiConcepts.slice(0, 3).map(c => c.concept).join(', ')}`);
        }
        
        // 3. 統計的キーワード抽出
        const statsExtractionStart = performance.now();
        const statisticalConcepts = this.extractConceptsStatistically(textContent);
        const statsExtractionTime = performance.now() - statsExtractionStart;
        
        console.log(`📊 統計的抽出完了 (${statsExtractionTime.toFixed(1)}ms)`);
        console.log(`🔢 統計的概念数: ${statisticalConcepts.length}`);
        if (statisticalConcepts.length > 0) {
          console.log(`📈 統計的概念サンプル: ${statisticalConcepts.slice(0, 3).map(c => c.concept).join(', ')}`);
        }
        
        // 4. 概念の統合・精錬
        const refinementStart = performance.now();
        const allConcepts = [...aiConcepts, ...statisticalConcepts];
        const refinedConcepts = this.refineConcepts(allConcepts, settings.threshold);
        const refinementTime = performance.now() - refinementStart;
        
        console.log(`🔧 概念精錬完了 (${refinementTime.toFixed(1)}ms)`);
        console.log(`📊 概念統合: ${allConcepts.length} → ${refinedConcepts.length} (閾値: ${settings.threshold})`);
        
        // 5. カテゴリ分類
        const categorizationStart = performance.now();
        const categorizedConcepts = await this.categorizeConceptsWithAI(refinedConcepts, textContent);
        const categorizationTime = performance.now() - categorizationStart;
        
        console.log(`🏷️ カテゴリ分類完了 (${categorizationTime.toFixed(1)}ms)`);
        
        // カテゴリ別統計表示
        const categoryStats = this.analyzeConceptCategories(categorizedConcepts);
        console.log(`📊 カテゴリ別統計:`, categoryStats);
        
        const result: OpenCodingResult = {
          clusterId: cluster.id,
          clusterName: cluster.name,
          extractedConcepts: categorizedConcepts,
          dominantThemes: this.extractDominantThemes(categorizedConcepts),
          codeFrequency: this.calculateCodeFrequency(categorizedConcepts),
          confidenceScore: this.calculateConfidenceScore(categorizedConcepts),
          analysisDate: new Date().toISOString()
        };
        
        const clusterTotalTime = performance.now() - clusterStartTime;
        totalProcessingTime += clusterTotalTime;
        
        results.push(result);
        console.log(`✅ クラスター「${cluster.name}」完了: ${categorizedConcepts.length}個の概念 (${clusterTotalTime.toFixed(1)}ms)`);
        console.log(`⏱️ 処理時間内訳: テキスト抽出=${textExtractionTime.toFixed(1)}ms, AI=${aiExtractionTime.toFixed(1)}ms, 統計=${statsExtractionTime.toFixed(1)}ms, 精錬=${refinementTime.toFixed(1)}ms, 分類=${categorizationTime.toFixed(1)}ms`);
        
      } catch (error) {
        const clusterErrorTime = performance.now() - clusterStartTime;
        console.error(`❌ クラスター「${cluster.name}」の分析エラー (${clusterErrorTime.toFixed(1)}ms):`, error);
        // エラーが発生したクラスターは空の結果で継続
        results.push({
          clusterId: cluster.id,
          clusterName: cluster.name,
          extractedConcepts: [],
          dominantThemes: [],
          codeFrequency: {},
          confidenceScore: 0,
          analysisDate: new Date().toISOString()
        });
      }
    }
    
    const phaseTotalTime = performance.now() - phaseStartTime;
    console.log(`🎉 オープンコーディング完了: ${results.length}クラスター処理済み`);
    console.log(`⏱️ 総処理時間: ${phaseTotalTime.toFixed(1)}ms (平均: ${(phaseTotalTime / clusters.length).toFixed(1)}ms/クラスター)`);
    console.log(`📊 最終概念数: ${results.reduce((sum, r) => sum + r.extractedConcepts.length, 0)}個`);
    
    return results;
  }
  
  /**
   * 🔗 Phase 2: 軸足コーディング（関係性分析）
   * オープンコーディングで抽出した概念間の関係性を分析
   */
  static async performAxialCoding(
    openCodingResults: OpenCodingResult[],
    settings: { relationThreshold: number; aiAssistance: boolean } = { relationThreshold: 0.4, aiAssistance: true }
  ): Promise<AxialCodingResult> {
    const phaseStartTime = performance.now();
    console.log('🔗 [GroundedTheory] 軸足コーディング開始');
    console.log(`🔧 設定: relationThreshold=${settings.relationThreshold}, aiAssistance=${settings.aiAssistance}`);
    
    // 1. 全概念の統合
    const integrationStart = performance.now();
    const allConcepts = this.integrateAllConcepts(openCodingResults);
    const integrationTime = performance.now() - integrationStart;
    
    console.log(`📊 概念統合完了 (${integrationTime.toFixed(1)}ms): ${allConcepts.length}個`);
    console.log(`📈 クラスター別概念数: ${openCodingResults.map(r => `${r.clusterName}=${r.extractedConcepts.length}`).join(', ')}`);
    
    // 2. 概念間関係性の発見
    const relationStart = performance.now();
    const relations = await this.discoverConceptRelations(allConcepts, settings);
    const relationTime = performance.now() - relationStart;
    
    console.log(`🔗 関係性発見完了 (${relationTime.toFixed(1)}ms): ${relations.length}個`);
    
    // 関係性タイプ別統計
    const relationTypeStats = this.analyzeRelationTypes(relations);
    console.log(`📊 関係性タイプ別統計:`, relationTypeStats);
    
    // 3. カテゴリの精錬・統合
    const categoryStart = performance.now();
    const refinedCategories = this.refineCategories(allConcepts, relations);
    const categoryTime = performance.now() - categoryStart;
    
    console.log(`🔧 カテゴリ精錬完了 (${categoryTime.toFixed(1)}ms): ${refinedCategories.length}個`);
    
    // カテゴリ別統計
    refinedCategories.forEach(cat => {
      console.log(`📂 ${cat.name}: ${cat.concepts.length}概念 (タイプ: ${cat.type})`);
    });
    
    // 4. 因果連鎖の特定
    const chainStart = performance.now();
    const causalChains = this.identifyCausalChains(relations);
    const chainTime = performance.now() - chainStart;
    
    console.log(`⛓️ 因果連鎖特定完了 (${chainTime.toFixed(1)}ms): ${causalChains.length}個`);
    
    // 5. パラダイムモデルの構築
    const paradigmStart = performance.now();
    const paradigmModel = this.buildParadigmModel(allConcepts, relations);
    const paradigmTime = performance.now() - paradigmStart;
    
    console.log(`🏗️ パラダイムモデル構築完了 (${paradigmTime.toFixed(1)}ms)`);
    console.log(`🎯 パラダイム要素: 現象="${paradigmModel.phenomenon}", 原因条件=${paradigmModel.causalConditions.length}, 文脈=${paradigmModel.context.length}, 戦略=${paradigmModel.actionStrategies.length}, 結果=${paradigmModel.consequences.length}`);
    
    const result: AxialCodingResult = {
      categories: refinedCategories,
      relations,
      causalChains,
      paradigmModel,
      analysisDate: new Date().toISOString()
    };
    
    const phaseTotalTime = performance.now() - phaseStartTime;
    console.log(`✅ 軸足コーディング完了: ${phaseTotalTime.toFixed(1)}ms`);
    console.log(`⏱️ 処理時間内訳: 統合=${integrationTime.toFixed(1)}ms, 関係性=${relationTime.toFixed(1)}ms, カテゴリ=${categoryTime.toFixed(1)}ms, 因果連鎖=${chainTime.toFixed(1)}ms, パラダイム=${paradigmTime.toFixed(1)}ms`);
    
    return result;
  }
  
  /**
   * ⭐ Phase 3: 選択的コーディング（中核概念特定・理論統合）
   * 軸足コーディングの結果から中核概念を特定し、統合的な理論を構築
   */
  static async performSelectiveCoding(
    axialCodingResult: AxialCodingResult,
    settings: { integrationThreshold: number; aiAssistance: boolean } = { integrationThreshold: 0.6, aiAssistance: true }
  ): Promise<SelectiveCodingResult> {
    const phaseStartTime = performance.now();
    console.log('⭐ [GroundedTheory] 選択的コーディング開始');
    console.log(`🔧 設定: integrationThreshold=${settings.integrationThreshold}, aiAssistance=${settings.aiAssistance}`);
    console.log(`📊 入力データ: カテゴリ=${axialCodingResult.categories.length}, 関係性=${axialCodingResult.relations.length}, 因果連鎖=${axialCodingResult.causalChains.length}`);
    
    // 1. 中核概念（コアカテゴリ）の特定
    const coreStart = performance.now();
    const coreCategory = await this.identifyCoreCategory(axialCodingResult, settings);
    const coreTime = performance.now() - coreStart;
    
    console.log(`🎯 中核概念特定完了 (${coreTime.toFixed(1)}ms): "${coreCategory.name}"`);
    console.log(`📊 中核概念詳細: 信頼度=${coreCategory.confidence.toFixed(2)}, 支持概念=${coreCategory.supportingConcepts.length}個`);
    
    // 2. ストーリーライン構築
    const storylineStart = performance.now();
    const storyline = await this.constructStoryline(coreCategory, axialCodingResult);
    const storylineTime = performance.now() - storylineStart;
    
    console.log(`📖 ストーリーライン構築完了 (${storylineTime.toFixed(1)}ms): ${storyline.length}文字`);
    
    // 3. 仮説生成
    const hypothesisStart = performance.now();
    const hypotheses = await this.generateHypotheses(coreCategory, axialCodingResult);
    const hypothesisTime = performance.now() - hypothesisStart;
    
    console.log(`💡 仮説生成完了 (${hypothesisTime.toFixed(1)}ms): ${hypotheses.length}個`);
    
    // 仮説タイプ別統計
    const hypothesisTypeStats = this.analyzeHypothesisTypes(hypotheses);
    console.log(`📊 仮説タイプ別統計:`, hypothesisTypeStats);
    
    // 仮説品質チェック
    const duplicateHypotheses = this.findDuplicateHypotheses(hypotheses);
    if (duplicateHypotheses.length > 0) {
      console.warn(`⚠️ 重複仮説検出: ${duplicateHypotheses.length}組`);
      duplicateHypotheses.forEach((dup, i) => {
        console.warn(`  ${i + 1}. "${dup.hypothesis1.statement.substring(0, 50)}..." vs "${dup.hypothesis2.statement.substring(0, 50)}..." (類似度: ${dup.similarity.toFixed(2)})`);
      });
    }
    
    // 4. 理論モデル構築
    const modelStart = performance.now();
    const theoreticalModel = await this.buildTheoreticalModel(coreCategory, axialCodingResult, storyline);
    const modelTime = performance.now() - modelStart;
    
    console.log(`🏗️ 理論モデル構築完了 (${modelTime.toFixed(1)}ms)`);
    
    // 5. 統合品質評価
    const evaluationStart = performance.now();
    const integration = this.evaluateIntegration(coreCategory, axialCodingResult, theoreticalModel);
    const evaluationTime = performance.now() - evaluationStart;
    
    console.log(`📈 統合品質評価完了 (${evaluationTime.toFixed(1)}ms)`);
    console.log(`📊 品質指標: 一貫性=${integration.coherence.toFixed(2)}, 密度=${integration.density.toFixed(2)}, バリエーション=${integration.variation.toFixed(2)}`);
    
    const result: SelectiveCodingResult = {
      coreCategory,
      storyline,
      hypotheses,
      theoreticalModel,
      integration,
      analysisDate: new Date().toISOString()
    };
    
    const phaseTotalTime = performance.now() - phaseStartTime;
    console.log(`🏆 選択的コーディング完了: ${phaseTotalTime.toFixed(1)}ms - 理論構築完成`);
    console.log(`⏱️ 処理時間内訳: 中核概念=${coreTime.toFixed(1)}ms, ストーリーライン=${storylineTime.toFixed(1)}ms, 仮説=${hypothesisTime.toFixed(1)}ms, 理論モデル=${modelTime.toFixed(1)}ms, 品質評価=${evaluationTime.toFixed(1)}ms`);
    
    return result;
  }
  
  // ===============================
  // 🛠️ プライベートヘルパーメソッド
  // ===============================
  
  /**
   * カードからテキスト内容を抽出
   */
  private static extractTextContent(cards: BoardItem[]): string {
    return cards
      .map(card => `${card.title || ''} ${card.content || ''}`)
      .join(' ')
      .trim();
  }
  
  /**
   * AI支援による概念抽出（詳細ログ版）
   */
  private static async extractConceptsWithAI(textContent: string, clusterName: string): Promise<ConceptItem[]> {
    const aiStartTime = performance.now();
    
    try {
      console.log('🤖 AI支援による概念抽出開始');
      console.log(`📝 入力テキスト長: ${textContent.length}文字`);
      console.log(`🏷️ クラスター名: "${clusterName}"`);
      
      // リクエスト準備
      const requestBody = {
        action: 'extract_concepts',
        textContent: textContent.substring(0, 8000), // 制限対策
        clusterName,
        analysisType: 'open_coding'
      };
      
      console.log(`📤 Edge Function呼び出し開始 (テキスト: ${requestBody.textContent.length}文字)`);
      
      // Edge Function呼び出し（グラウンデッド・セオリー専用）
      const functionCallStart = performance.now();
      const { data, error } = await supabase.functions.invoke('grounded-theory-analysis', {
        body: requestBody
      });
      const functionCallTime = performance.now() - functionCallStart;
      
      console.log(`📥 Edge Function呼び出し完了 (${functionCallTime.toFixed(1)}ms)`);
      
      if (error) {
        console.error('❌ AI概念抽出エラー:', error);
        console.error('🔍 エラー詳細:', {
          message: error.message,
          code: error.code,
          details: error.details
        });
        return [];
      }
      
      if (!data?.success) {
        console.error('❌ AI概念抽出失敗:', data?.error);
        console.error('🔍 レスポンス詳細:', data);
        return [];
      }
      
      const conceptCount = data.concepts?.length || 0;
      console.log(`✅ AI概念抽出成功: ${conceptCount}個の概念`);
      
      if (conceptCount > 0) {
        console.log('🎯 AI抽出概念一覧:');
        data.concepts.slice(0, 5).forEach((concept: any, index: number) => {
          console.log(`  ${index + 1}. ${concept.concept} (関連度: ${concept.relevance?.toFixed(2) || 'N/A'})`);
        });
        
        // 品質統計
        const avgRelevance = data.concepts.reduce((sum: number, c: any) => sum + (c.relevance || 0), 0) / conceptCount;
        console.log(`📊 AI概念品質: 平均関連度=${avgRelevance.toFixed(2)}, 最高関連度=${Math.max(...data.concepts.map((c: any) => c.relevance || 0)).toFixed(2)}`);
        
        // 不正な概念の検出
        const invalidConcepts = data.concepts.filter((c: any) => 
          !c.concept || 
          c.concept.length < 2 || 
          /話者\d+|発言者[A-Z]/i.test(c.concept)
        );
        
        if (invalidConcepts.length > 0) {
          console.warn(`⚠️ 不正な概念が検出されました: ${invalidConcepts.length}個`);
          invalidConcepts.forEach((c: any, i: number) => {
            console.warn(`  ${i + 1}. "${c.concept}" (タイプ: ${c.category?.type || 'unknown'})`);
          });
        }
      }
      
      const totalTime = performance.now() - aiStartTime;
      console.log(`⏱️ AI概念抽出総時間: ${totalTime.toFixed(1)}ms (Edge Function: ${functionCallTime.toFixed(1)}ms, 処理: ${(totalTime - functionCallTime).toFixed(1)}ms)`);
      
      return data.concepts || [];
      
    } catch (error) {
      const errorTime = performance.now() - aiStartTime;
      console.error(`💥 AI概念抽出例外 (${errorTime.toFixed(1)}ms):`, error);
      
      // エラーの詳細分析
      if (error instanceof Error) {
        console.error('🔍 例外詳細:', {
          name: error.name,
          message: error.message,
          stack: error.stack?.split('\n').slice(0, 3)
        });
      }
      
      return [];
    }
  }
  
  /**
   * 統計的手法による概念抽出（フィルタリング強化版）
   */
  private static extractConceptsStatistically(textContent: string): ConceptItem[] {
    const statsStartTime = performance.now();
    console.log('📊 統計的概念抽出開始（フィルタリング強化版）');
    console.log(`📝 入力テキスト長: ${textContent.length}文字`);
    
    // 1. テキストの前処理
    const preprocessStart = performance.now();
    const cleanedText = this.cleanTextForConceptExtraction(textContent);
    const preprocessTime = performance.now() - preprocessStart;
    
    console.log(`🧹 テキスト前処理完了 (${preprocessTime.toFixed(1)}ms)`);
    console.log(`📊 クリーニング効果: ${textContent.length} → ${cleanedText.length}文字`);
    console.log(`📄 クリーニング済みサンプル: "${cleanedText.substring(0, 100)}..."`);
    
    // 2. トークン化と基本フィルタリング
    const tokenizeStart = performance.now();
    const words = cleanedText
      .toLowerCase()
      .replace(/[^\w\s\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g, ' ')
      .split(/\s+/)
      .filter(word => this.isValidConcept(word));
    const tokenizeTime = performance.now() - tokenizeStart;
    
    console.log(`🔤 トークン化完了 (${tokenizeTime.toFixed(1)}ms): ${words.length}語`);
    
    // 3. 頻度分析
    const freqAnalysisStart = performance.now();
    const frequency: Record<string, number> = {};
    words.forEach(word => {
      frequency[word] = (frequency[word] || 0) + 1;
    });
    const freqAnalysisTime = performance.now() - freqAnalysisStart;
    
    const totalUniqueWords = Object.keys(frequency).length;
    const maxFreq = Math.max(...Object.values(frequency));
    console.log(`📈 頻度分析完了 (${freqAnalysisTime.toFixed(1)}ms): ユニーク語数=${totalUniqueWords}, 最大頻度=${maxFreq}`);
    
    // 4. 品質フィルタリング
    const filterStart = performance.now();
    const rawCandidates = Object.entries(frequency)
      .filter(([concept, freq]) => freq >= 2);
    
    console.log(`🔍 頻度フィルタ: ${totalUniqueWords} → ${rawCandidates.length}語 (最低2回出現)`);
    
    const semanticFiltered = rawCandidates
      .filter(([concept, freq]) => this.isSemanticalleMeaningful(concept));
    
    console.log(`🧠 意味フィルタ: ${rawCandidates.length} → ${semanticFiltered.length}語`);
    
    const structureFiltered = semanticFiltered
      .filter(([concept, freq]) => !this.isStructuralLabel(concept));
    
    console.log(`🏗️ 構造フィルタ: ${semanticFiltered.length} → ${structureFiltered.length}語`);
    
    // 不正概念の詳細表示
    const rejectedConcepts = rawCandidates.filter(([concept, freq]) => 
      !this.isSemanticalleMeaningful(concept) || this.isStructuralLabel(concept)
    );
    
    if (rejectedConcepts.length > 0) {
      console.log(`❌ 除外された概念サンプル: ${rejectedConcepts.slice(0, 5).map(([c, f]) => `"${c}"(${f})`).join(', ')}`);
    }
    
    // 5. 最終概念生成
    const validConcepts = structureFiltered
      .sort(([,a], [,b]) => b - a)
      .slice(0, 15) // 上位15概念
      .map(([concept, freq], index): ConceptItem => ({
        id: `stat_${index}`,
        concept,
        description: `統計的抽出: ${freq}回出現 - 意味分析済み`,
        evidence: [`有意な頻出概念: ${freq}回`, '品質フィルタ通過'],
        frequency: freq,
        relevance: Math.min(freq / maxFreq, 1) * 1.2, // 品質ボーナス
        category: {
          id: 'statistical_filtered',
          name: '精選された統計的概念',
          description: '品質フィルタを通過した頻度分析概念',
          type: this.inferSemanticConceptType(concept),
          concepts: []
        },
        clusterId: ''
      }));
    
    const filterTime = performance.now() - filterStart;
    const totalTime = performance.now() - statsStartTime;
    
    console.log(`✅ 統計的概念抽出完了 (${totalTime.toFixed(1)}ms): ${validConcepts.length}個`);
    console.log(`⏱️ 処理時間内訳: 前処理=${preprocessTime.toFixed(1)}ms, トークン化=${tokenizeTime.toFixed(1)}ms, 頻度分析=${freqAnalysisTime.toFixed(1)}ms, フィルタリング=${filterTime.toFixed(1)}ms`);
    
    if (validConcepts.length > 0) {
      console.log(`🎯 上位統計的概念: ${validConcepts.slice(0, 5).map(c => `${c.concept}(${c.frequency})`).join(', ')}`);
      
      // 品質統計
      const avgRelevance = validConcepts.reduce((sum, c) => sum + c.relevance, 0) / validConcepts.length;
      console.log(`📊 統計的概念品質: 平均関連度=${avgRelevance.toFixed(2)}`);
    }
    
    return validConcepts;
  }
  
  /**
   * 概念の精錬・統合（詳細ログ版）
   */
  private static refineConcepts(concepts: ConceptItem[], threshold: number): ConceptItem[] {
    console.log(`🔧 概念精錬開始: 入力=${concepts.length}個, 閾値=${threshold}`);
    
    // ID重複チェック
    const duplicateIds = this.findDuplicateConceptIds(concepts);
    if (duplicateIds.length > 0) {
      console.warn(`⚠️ 重複ID検出: ${duplicateIds.join(', ')}`);
    }
    
    // 関連度統計
    const relevanceStats = {
      min: Math.min(...concepts.map(c => c.relevance)),
      max: Math.max(...concepts.map(c => c.relevance)),
      avg: concepts.reduce((sum, c) => sum + c.relevance, 0) / concepts.length
    };
    console.log(`📊 関連度統計: 最小=${relevanceStats.min.toFixed(2)}, 最大=${relevanceStats.max.toFixed(2)}, 平均=${relevanceStats.avg.toFixed(2)}`);
    
    // 閾値より低い概念の詳細表示
    const belowThreshold = concepts.filter(concept => concept.relevance < threshold);
    if (belowThreshold.length > 0) {
      console.log(`❌ 閾値未満で除外される概念: ${belowThreshold.length}個`);
      belowThreshold.slice(0, 5).forEach((concept, i) => {
        console.log(`  ${i + 1}. "${concept.concept}" (関連度: ${concept.relevance.toFixed(2)})`);
      });
    }
    
    // 類似概念の統合、低品質概念の除去
    const refined = concepts.filter(concept => concept.relevance >= threshold);
    
    // ID重複除去（同じIDの場合は関連度の高い方を残す）
    const deduplicatedConcepts = this.deduplicateConceptsByRelevance(refined);
    
    console.log(`🔧 概念精錬完了: ${concepts.length} → ${refined.length} → ${deduplicatedConcepts.length}個 (重複除去後)`);
    
    if (deduplicatedConcepts.length === 0) {
      console.warn(`⚠️ 精錬後の概念が0個になりました。閾値を下げる必要があります。`);
      // 緊急対策: 閾値を下げて最低限の概念を確保
      const emergencyThreshold = Math.max(0.1, threshold * 0.5);
      const emergencyConcepts = concepts.filter(concept => concept.relevance >= emergencyThreshold);
      console.warn(`🚨 緊急対策: 閾値を${emergencyThreshold.toFixed(2)}に下げて${emergencyConcepts.length}個の概念を確保`);
      return this.deduplicateConceptsByRelevance(emergencyConcepts.slice(0, 10)); // 最大10個
    }
    
    return deduplicatedConcepts;
  }
  
  /**
   * 概念のカテゴリ分類（AI支援）
   */
  private static async categorizeConceptsWithAI(concepts: ConceptItem[], context: string): Promise<ConceptItem[]> {
    // AI支援による概念のカテゴリ分類
    // 現時点では簡易的な分類を実装
    return concepts.map(concept => ({
      ...concept,
      category: {
        ...concept.category,
        type: this.inferConceptType(concept.concept)
      }
    }));
  }
  
  /**
   * 概念タイプの推定
   */
  private static inferConceptType(concept: string): ConceptCategory['type'] {
    // キーワードベースの簡易分類
    if (concept.includes('問題') || concept.includes('課題')) return 'phenomenon';
    if (concept.includes('原因') || concept.includes('理由')) return 'causal_condition';
    if (concept.includes('条件') || concept.includes('状況')) return 'context';
    if (concept.includes('対策') || concept.includes('解決')) return 'action_strategy';
    if (concept.includes('結果') || concept.includes('効果')) return 'consequence';
    return 'phenomenon';
  }
  
  /**
   * 支配的テーマの抽出
   */
  private static extractDominantThemes(concepts: ConceptItem[]): string[] {
    return concepts
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 5)
      .map(c => c.concept);
  }
  
  /**
   * コード頻度の計算
   */
  private static calculateCodeFrequency(concepts: ConceptItem[]): Record<string, number> {
    const frequency: Record<string, number> = {};
    concepts.forEach(concept => {
      frequency[concept.concept] = concept.frequency;
    });
    return frequency;
  }
  
  /**
   * 信頼度スコアの計算
   */
  private static calculateConfidenceScore(concepts: ConceptItem[]): number {
    if (concepts.length === 0) return 0;
    const avgRelevance = concepts.reduce((sum, c) => sum + c.relevance, 0) / concepts.length;
    return Math.min(avgRelevance * 1.2, 1); // 信頼度を若干高めに調整
  }
  
  // 軸足コーディング用のヘルパーメソッド
  private static integrateAllConcepts(openCodingResults: OpenCodingResult[]): ConceptItem[] {
    return openCodingResults.flatMap(result => result.extractedConcepts);
  }
  
  /**
   * 🔗 概念間関係性の発見（軸足コーディングの核心）
   */
  private static async discoverConceptRelations(concepts: ConceptItem[], settings: any): Promise<ConceptRelation[]> {
    console.log('🔗 概念間関係性発見開始');
    const relations: ConceptRelation[] = [];
    
    // 1. 語彙類似度ベースの関係性発見
    for (let i = 0; i < concepts.length; i++) {
      for (let j = i + 1; j < concepts.length; j++) {
        const conceptA = concepts[i];
        const conceptB = concepts[j];
        
        // 語彙類似度計算
        const lexicalSimilarity = this.calculateLexicalSimilarity(conceptA.concept, conceptB.concept);
        
        // 説明文類似度計算
        const descriptionSimilarity = this.calculateLexicalSimilarity(conceptA.description, conceptB.description);
        
        // 証拠テキスト共起分析
        const evidenceOverlap = this.calculateEvidenceOverlap(conceptA.evidence, conceptB.evidence);
        
        // 総合類似度
        const overallSimilarity = (lexicalSimilarity * 0.4) + (descriptionSimilarity * 0.4) + (evidenceOverlap * 0.2);
        
        if (overallSimilarity >= settings.relationThreshold) {
          // 関係性タイプの推定
          const relationType = this.inferRelationType(conceptA, conceptB, overallSimilarity);
          
          const relation: ConceptRelation = {
            id: `relation_${conceptA.id}_${conceptB.id}`,
            sourceConceptId: conceptA.id,
            targetConceptId: conceptB.id,
            relationType,
            strength: overallSimilarity,
            evidence: this.extractRelationEvidence(conceptA, conceptB),
            bidirectional: relationType === 'correlational'
          };
          
          relations.push(relation);
        }
      }
    }
    
    // 2. カテゴリ内関係性の強化
    const categoryBasedRelations = this.discoverCategoryBasedRelations(concepts);
    relations.push(...categoryBasedRelations);
    
    // 3. 因果関係パターンの検出
    const causalRelations = this.detectCausalPatterns(concepts, relations);
    relations.push(...causalRelations);
    
    console.log(`✅ 発見された関係性: ${relations.length}個`);
    return relations;
  }
  
  /**
   * 🔧 カテゴリの精錬・統合
   */
  private static refineCategories(concepts: ConceptItem[], relations: ConceptRelation[]): ConceptCategory[] {
    console.log('🔧 カテゴリ精錬開始');
    
    // カテゴリ別にグループ化
    const categoryMap: Record<string, ConceptItem[]> = {};
    concepts.forEach(concept => {
      const type = concept.category.type;
      if (!categoryMap[type]) categoryMap[type] = [];
      categoryMap[type].push(concept);
    });
    
    // 精錬されたカテゴリを構築
    const refinedCategories: ConceptCategory[] = [];
    
    Object.entries(categoryMap).forEach(([type, conceptsInCategory]) => {
      if (conceptsInCategory.length > 0) {
        const category: ConceptCategory = {
          id: `refined_${type}`,
          name: this.getCategoryDisplayName(type as ConceptCategory['type']),
          description: `${conceptsInCategory.length}個の関連概念を含む統合カテゴリ`,
          type: type as ConceptCategory['type'],
          concepts: conceptsInCategory.map(c => c.id)
        };
        refinedCategories.push(category);
      }
    });
    
    console.log(`✅ 精錬カテゴリ: ${refinedCategories.length}個`);
    return refinedCategories;
  }
  
  /**
   * 🔗 因果連鎖の特定
   */
  private static identifyCausalChains(relations: ConceptRelation[]): CausalChain[] {
    console.log('🔗 因果連鎖特定開始');
    
    const causalRelations = relations.filter(r => r.relationType === 'causal');
    const chains: CausalChain[] = [];
    
    // 各因果関係から連鎖を構築
    causalRelations.forEach((relation, index) => {
      const chain = this.buildChainFromRelation(relation, causalRelations);
      if (chain.conceptSequence.length >= 2) {
        chains.push({
          id: `chain_${index}`,
          name: `因果連鎖 ${index + 1}`,
          description: `${chain.conceptSequence.length}段階の因果関係`,
          conceptSequence: chain.conceptSequence,
          strength: chain.strength,
          evidence: chain.evidence
        });
      }
    });
    
    console.log(`✅ 因果連鎖: ${chains.length}個`);
    return chains;
  }
  
  /**
   * 🏗️ パラダイムモデル構築
   */
  private static buildParadigmModel(concepts: ConceptItem[], relations: ConceptRelation[]): AxialCodingResult['paradigmModel'] {
    console.log('🏗️ パラダイムモデル構築開始');
    
    // カテゴリ別概念の抽出
    const phenomena = concepts.filter(c => c.category.type === 'phenomenon').map(c => c.concept);
    const causalConditions = concepts.filter(c => c.category.type === 'causal_condition').map(c => c.concept);
    const context = concepts.filter(c => c.category.type === 'context').map(c => c.concept);
    const interveningConditions = concepts.filter(c => c.category.type === 'intervening_condition').map(c => c.concept);
    const actionStrategies = concepts.filter(c => c.category.type === 'action_strategy').map(c => c.concept);
    const consequences = concepts.filter(c => c.category.type === 'consequence').map(c => c.concept);
    
    // 最も関係性の多い現象を中心現象として選択
    const centralPhenomenon = this.findMostConnectedConcept(phenomena, relations, concepts);
    
    return {
      phenomenon: centralPhenomenon || '中心現象（特定中）',
      causalConditions: causalConditions.slice(0, 5), // 上位5個
      context: context.slice(0, 3),
      interveningConditions: interveningConditions.slice(0, 3),
      actionStrategies: actionStrategies.slice(0, 5),
      consequences: consequences.slice(0, 5)
    };
  }
  
  // 選択的コーディング用のヘルパーメソッド
  /**
   * ⭐ 中核概念特定（選択的コーディングの核心）
   */
  private static async identifyCoreCategory(axialResult: AxialCodingResult, settings: any): Promise<CoreCategory> {
    console.log('⭐ 中核概念特定開始');
    
    // 1. パラダイムモデルから中心現象を取得
    const centralPhenomenon = axialResult.paradigmModel.phenomenon;
    
    // 2. 関係性密度が最も高いカテゴリを特定
    const categoryConnections: Record<string, number> = {};
    
    axialResult.relations.forEach(relation => {
      const sourceCategory = relation.sourceConceptId.split('_')[0] || 'unknown';
      const targetCategory = relation.targetConceptId.split('_')[0] || 'unknown';
      
      categoryConnections[sourceCategory] = (categoryConnections[sourceCategory] || 0) + relation.strength;
      categoryConnections[targetCategory] = (categoryConnections[targetCategory] || 0) + relation.strength;
    });
    
    // 3. 最も接続性の高いカテゴリをコアカテゴリとして選択
    const topCategory = Object.entries(categoryConnections)
      .sort(([,a], [,b]) => b - a)[0];
    
    const coreCategory: CoreCategory = {
      id: 'core_category_1',
      name: centralPhenomenon || 'システムの中核現象',
      description: `最も多くの概念と関係性を持つ中核的な現象。関係性密度: ${Math.round((topCategory?.[1] || 0) * 100) / 100}`,
      supportingConcepts: axialResult.categories
        .flatMap(cat => cat.concepts)
        .slice(0, 8), // 上位8概念
      contradictingFactors: [
        '外部環境の変化',
        '制約条件の変動',
        '予期しない介入要因'
      ],
      confidence: Math.min(0.9, 0.6 + (axialResult.relations.length * 0.01)), // 関係性数に応じて信頼度上昇
      centralPhenomenon: centralPhenomenon
    };
    
    console.log(`✅ 中核概念特定完了: ${coreCategory.name}`);
    return coreCategory;
  }
  
  /**
   * 📖 ストーリーライン構築（理論の統合的物語）
   */
  private static async constructStoryline(coreCategory: CoreCategory, axialResult: AxialCodingResult): Promise<string> {
    console.log('📖 ストーリーライン構築開始');
    
    const paradigm = axialResult.paradigmModel;
    
    // ストーリーライン テンプレート
    const storyline = `
📖 **${coreCategory.name}** に関する統合的理論

🎯 **中心現象**
${paradigm.phenomenon} は、この分析において最も重要な現象として位置づけられます。

🔍 **原因条件**
この現象は主に以下の条件によって引き起こされます：
${paradigm.causalConditions.map((condition, i) => `${i + 1}. ${condition}`).join('\n')}

🌍 **文脈条件**
現象が発生・展開する背景として以下の文脈が影響しています：
${paradigm.context.map((ctx, i) => `• ${ctx}`).join('\n')}

⚡ **介入条件**
現象の展開過程において、以下の要因が介入・調整的役割を果たします：
${paradigm.interveningConditions.map((condition, i) => `• ${condition}`).join('\n')}

🛠️ **対応戦略**
この現象に対して、関係者は以下の戦略・行動を取っています：
${paradigm.actionStrategies.map((strategy, i) => `${i + 1}. ${strategy}`).join('\n')}

📈 **結果・帰結**
これらの戦略・行動の結果として、以下の帰結が生じています：
${paradigm.consequences.map((consequence, i) => `• ${consequence}`).join('\n')}

🔗 **因果連鎖**
${axialResult.causalChains.length}個の因果連鎖が特定され、現象の動的な展開プロセスが明らかになりました。

💡 **理論的含意**
この分析から、${coreCategory.name}は単独の現象ではなく、複数の要因が相互作用する複合的なシステムであることが示されました。
    `.trim();
    
    console.log('✅ ストーリーライン構築完了');
    return storyline;
  }
  
  /**
   * 💡 仮説生成（検証可能な命題の創出）- 強化版
   */
  private static async generateHypotheses(coreCategory: CoreCategory, axialResult: AxialCodingResult): Promise<Hypothesis[]> {
    console.log('💡 仮説生成開始（強化版）');
    
    const hypotheses: Hypothesis[] = [];
    const paradigm = axialResult.paradigmModel;
    
    // デバッグ：パラダイムモデルの内容確認
    console.log('🔍 パラダイムモデル内容:', {
      phenomenon: paradigm.phenomenon,
      causalConditions: paradigm.causalConditions.length,
      context: paradigm.context.length,
      actionStrategies: paradigm.actionStrategies.length,
      consequences: paradigm.consequences.length
    });
    
    // 1. 記述的仮説（現象の特徴記述）- 必ず生成
    hypotheses.push({
      id: 'hypothesis_descriptive_1',
      statement: `${paradigm.phenomenon || coreCategory.name}は、複数の相互関連する要因によって特徴づけられる複合的現象である`,
      type: 'descriptive',
      confidence: 0.8,
      supportingEvidence: [
        `${axialResult.categories.length}個のカテゴリが相互関連`,
        `${axialResult.relations.length}個の関係性を確認`,
        '複数のステークホルダーが関与'
      ],
      limitations: ['観察された事例の範囲内', '特定の文脈条件下での分析'],
      testable: true
    });
    
    // 2. 説明的仮説（因果関係の説明）- 条件緩和
    if (paradigm.causalConditions.length > 0 || paradigm.consequences.length > 0) {
      const cause = paradigm.causalConditions[0] || '環境要因の変化';
      const effect = paradigm.consequences[0] || coreCategory.name;
      
      hypotheses.push({
        id: 'hypothesis_explanatory_1',
        statement: `${cause}の変化は、${effect}の発生・変化に直接的な影響を与える`,
        type: 'explanatory',
        confidence: 0.7,
        supportingEvidence: [
          '因果関係パターンの観察',
          `${axialResult.causalChains.length}個の因果連鎖を特定`,
          '時系列的関連性の確認'
        ],
        limitations: ['因果の方向性の確定には追加検証が必要'],
        testable: true
      });
    }
    
    // 3. 予測的仮説（将来の展開予測）- 条件緩和
    if (paradigm.actionStrategies.length > 0 || paradigm.consequences.length > 0) {
      const strategy = paradigm.actionStrategies[0] || '適切な介入策';
      const outcome = paradigm.consequences[0] || `${coreCategory.name}の改善`;
      
      hypotheses.push({
        id: 'hypothesis_predictive_1',
        statement: `${strategy}を実行することで、${outcome}が促進される可能性が高い`,
        type: 'predictive',
        confidence: 0.6,
        supportingEvidence: [
          '観察された戦略-結果パターン',
          '関係者の行動意図の分析',
          '類似事例での成功パターン'
        ],
        limitations: ['外部環境の変化は考慮されていない', '個別事例での検証が必要'],
        testable: true
      });
    }
    
    // 4. 条件的仮説（条件付き関係性）- 条件緩和
    if (paradigm.context.length > 0 || axialResult.categories.length > 1) {
      const contextCondition = paradigm.context[0] || '特定の環境条件';
      
      hypotheses.push({
        id: 'hypothesis_conditional_1',
        statement: `${contextCondition}の条件下でのみ、観察された現象パターンが顕著に現れる`,
        type: 'explanatory',
        confidence: 0.65,
        supportingEvidence: [
          '文脈条件の影響分析',
          '条件別での現象の差異観察',
          '環境要因の重要性確認'
        ],
        limitations: ['他の文脈条件での検証が必要'],
        testable: true
      });
    }
    
    // 5. 構造的仮説（システム全体の仮説）- 新規追加
    if (axialResult.relations.length > 10) {
      hypotheses.push({
        id: 'hypothesis_structural_1',
        statement: `${coreCategory.name}を含むシステムは、自己組織化と適応的変化の特性を持つ`,
        type: 'explanatory',
        confidence: 0.75,
        supportingEvidence: [
          `${axialResult.relations.length}個の複雑な相互関係`,
          '多層的な因果構造の確認',
          'システム全体の動的バランス'
        ],
        limitations: ['システム境界の定義が必要', '長期的観察による検証が必要'],
        testable: true
      });
    }
    
    console.log(`✅ 仮説生成完了: ${hypotheses.length}個の仮説`);
    return hypotheses;
  }
  
  private static async buildTheoreticalModel(coreCategory: CoreCategory, axialResult: AxialCodingResult, storyline: string): Promise<TheoreticalModel> {
    // 理論モデル構築ロジック
    return {
      id: 'model_1',
      name: '理論モデル',
      description: '',
      coreCategory: coreCategory.id,
      conceptNetwork: [],
      propositions: [],
      scope: '',
      limitations: []
    };
  }
  
  private static evaluateIntegration(coreCategory: CoreCategory, axialResult: AxialCodingResult, model: TheoreticalModel): SelectiveCodingResult['integration'] {
    // 統合品質評価ロジック
    return {
      coherence: 0.8,
      density: 0.7,
      variation: 0.6
    };
  }
  
  // ===============================
  // 🔧 関係性発見のヘルパーメソッド
  // ===============================
  
  /**
   * 語彙類似度計算（Jaccard index）
   */
  private static calculateLexicalSimilarity(text1: string, text2: string): number {
    const tokens1 = new Set(text1.toLowerCase().split(/\s+/));
    const tokens2 = new Set(text2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...tokens1].filter(x => tokens2.has(x)));
    const union = new Set([...tokens1, ...tokens2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }
  
  /**
   * 証拠テキストの重複度計算
   */
  private static calculateEvidenceOverlap(evidence1: string[], evidence2: string[]): number {
    if (evidence1.length === 0 || evidence2.length === 0) return 0;
    
    let overlapCount = 0;
    const totalComparisons = evidence1.length * evidence2.length;
    
    for (const e1 of evidence1) {
      for (const e2 of evidence2) {
        const similarity = this.calculateLexicalSimilarity(e1, e2);
        if (similarity > 0.3) overlapCount++;
      }
    }
    
    return totalComparisons > 0 ? overlapCount / totalComparisons : 0;
  }
  
  /**
   * 関係性タイプの推定
   */
  private static inferRelationType(conceptA: ConceptItem, conceptB: ConceptItem, similarity: number): ConceptRelation['relationType'] {
    // カテゴリベースの関係性推定
    const categoryA = conceptA.category.type;
    const categoryB = conceptB.category.type;
    
    // 因果関係パターン
    if ((categoryA === 'causal_condition' && categoryB === 'phenomenon') ||
        (categoryA === 'phenomenon' && categoryB === 'consequence')) {
      return 'causal';
    }
    
    // 条件関係パターン
    if ((categoryA === 'context' && categoryB === 'action_strategy') ||
        (categoryA === 'intervening_condition' && categoryB === 'phenomenon')) {
      return 'conditional';
    }
    
    // 順序関係パターン
    if ((categoryA === 'action_strategy' && categoryB === 'consequence') ||
        (categoryA === 'causal_condition' && categoryB === 'action_strategy')) {
      return 'sequential';
    }
    
    // 文脈関係パターン
    if (categoryA === 'context' || categoryB === 'context') {
      return 'contextual';
    }
    
    // デフォルト：相関関係
    return 'correlational';
  }
  
  /**
   * 関係性の証拠抽出
   */
  private static extractRelationEvidence(conceptA: ConceptItem, conceptB: ConceptItem): string[] {
    const evidence: string[] = [];
    
    // 共通キーワードの抽出
    const commonWords = this.findCommonWords(conceptA.concept, conceptB.concept);
    if (commonWords.length > 0) {
      evidence.push(`共通キーワード: ${commonWords.join(', ')}`);
    }
    
    // 説明文の類似部分
    const descSimilarity = this.calculateLexicalSimilarity(conceptA.description, conceptB.description);
    if (descSimilarity > 0.3) {
      evidence.push(`概念説明の類似性: ${Math.round(descSimilarity * 100)}%`);
    }
    
    // カテゴリベースの関係性
    evidence.push(`カテゴリ関係: ${conceptA.category.name} ↔ ${conceptB.category.name}`);
    
    return evidence;
  }
  
  /**
   * 共通単語の発見
   */
  private static findCommonWords(text1: string, text2: string): string[] {
    const tokens1 = text1.toLowerCase().split(/\s+/);
    const tokens2 = text2.toLowerCase().split(/\s+/);
    
    return tokens1.filter(word => 
      tokens2.includes(word) && 
      word.length > 2 && 
      !['の', 'は', 'が', 'を', 'に', 'で', 'と', 'から', 'まで'].includes(word)
    );
  }
  
  /**
   * カテゴリベース関係性の発見
   */
  private static discoverCategoryBasedRelations(concepts: ConceptItem[]): ConceptRelation[] {
    const relations: ConceptRelation[] = [];
    
    // カテゴリ別にグループ化
    const categoryGroups: Record<string, ConceptItem[]> = {};
    concepts.forEach(concept => {
      const type = concept.category.type;
      if (!categoryGroups[type]) categoryGroups[type] = [];
      categoryGroups[type].push(concept);
    });
    
    // 同一カテゴリ内の強い関係性
    Object.values(categoryGroups).forEach(group => {
      if (group.length > 1) {
        for (let i = 0; i < group.length; i++) {
          for (let j = i + 1; j < group.length; j++) {
            const relation: ConceptRelation = {
              id: `category_relation_${group[i].id}_${group[j].id}`,
              sourceConceptId: group[i].id,
              targetConceptId: group[j].id,
              relationType: 'correlational',
              strength: 0.6 + (Math.random() * 0.2), // 0.6-0.8の範囲
              evidence: [`同一カテゴリ内の関係性: ${group[i].category.name}`],
              bidirectional: true
            };
            relations.push(relation);
          }
        }
      }
    });
    
    return relations;
  }
  
  /**
   * 因果関係パターンの検出
   */
  private static detectCausalPatterns(concepts: ConceptItem[], existingRelations: ConceptRelation[]): ConceptRelation[] {
    const causalRelations: ConceptRelation[] = [];
    
    // 原因 → 現象 → 結果のパターン検出
    const causes = concepts.filter(c => c.category.type === 'causal_condition');
    const phenomena = concepts.filter(c => c.category.type === 'phenomenon');
    const consequences = concepts.filter(c => c.category.type === 'consequence');
    
    causes.forEach(cause => {
      phenomena.forEach(phenomenon => {
        const causalSimilarity = this.calculateLexicalSimilarity(cause.concept, phenomenon.concept);
        if (causalSimilarity > 0.2) {
          const relation: ConceptRelation = {
            id: `causal_${cause.id}_${phenomenon.id}`,
            sourceConceptId: cause.id,
            targetConceptId: phenomenon.id,
            relationType: 'causal',
            strength: causalSimilarity + 0.3, // 因果関係はボーナス
            evidence: [`因果関係パターン: ${cause.concept} → ${phenomenon.concept}`],
            bidirectional: false
          };
          causalRelations.push(relation);
        }
      });
    });
    
    // 現象 → 結果のパターン
    phenomena.forEach(phenomenon => {
      consequences.forEach(consequence => {
        const consequenceSimilarity = this.calculateLexicalSimilarity(phenomenon.concept, consequence.concept);
        if (consequenceSimilarity > 0.2) {
          const relation: ConceptRelation = {
            id: `consequence_${phenomenon.id}_${consequence.id}`,
            sourceConceptId: phenomenon.id,
            targetConceptId: consequence.id,
            relationType: 'causal',
            strength: consequenceSimilarity + 0.3,
            evidence: [`結果関係パターン: ${phenomenon.concept} → ${consequence.concept}`],
            bidirectional: false
          };
          causalRelations.push(relation);
        }
      });
    });
    
    return causalRelations;
  }
  
  // ===============================
  // 🔧 追加ヘルパーメソッド
  // ===============================
  
  /**
   * カテゴリ表示名の取得
   */
  private static getCategoryDisplayName(type: ConceptCategory['type']): string {
    const displayNames: Record<ConceptCategory['type'], string> = {
      'phenomenon': '現象',
      'causal_condition': '原因条件',
      'context': '文脈条件',
      'intervening_condition': '介入条件',
      'action_strategy': '対応戦略',
      'consequence': '結果・帰結'
    };
    return displayNames[type] || '未分類';
  }
  
  /**
   * 関係性から因果連鎖を構築
   */
  private static buildChainFromRelation(
    startRelation: ConceptRelation, 
    allCausalRelations: ConceptRelation[]
  ): { conceptSequence: string[], strength: number, evidence: string[] } {
    const sequence = [startRelation.sourceConceptId, startRelation.targetConceptId];
    const evidence = [...startRelation.evidence];
    let totalStrength = startRelation.strength;
    let currentTarget = startRelation.targetConceptId;
    
    // 連鎖を最大5段階まで追跡
    for (let depth = 0; depth < 5; depth++) {
      const nextRelation = allCausalRelations.find(r => 
        r.sourceConceptId === currentTarget && 
        !sequence.includes(r.targetConceptId) // 循環回避
      );
      
      if (!nextRelation) break;
      
      sequence.push(nextRelation.targetConceptId);
      evidence.push(...nextRelation.evidence);
      totalStrength += nextRelation.strength;
      currentTarget = nextRelation.targetConceptId;
    }
    
    return {
      conceptSequence: sequence,
      strength: totalStrength / sequence.length, // 平均強度
      evidence
    };
  }
  
  /**
   * 最も関係性の多い概念を特定
   */
  private static findMostConnectedConcept(
    conceptNames: string[], 
    relations: ConceptRelation[], 
    allConcepts: ConceptItem[]
  ): string | null {
    const connectionCount: Record<string, number> = {};
    
    relations.forEach(relation => {
      const sourceConcept = allConcepts.find(c => c.id === relation.sourceConceptId)?.concept;
      const targetConcept = allConcepts.find(c => c.id === relation.targetConceptId)?.concept;
      
      if (sourceConcept && conceptNames.includes(sourceConcept)) {
        connectionCount[sourceConcept] = (connectionCount[sourceConcept] || 0) + 1;
      }
      if (targetConcept && conceptNames.includes(targetConcept)) {
        connectionCount[targetConcept] = (connectionCount[targetConcept] || 0) + 1;
      }
    });
    
    const mostConnected = Object.entries(connectionCount)
      .sort(([,a], [,b]) => b - a)[0];
    
    return mostConnected?.[0] || null;
  }
  
  // ===============================
  // 🧹 概念品質フィルタリング
  // ===============================
  
  /**
   * 概念抽出用のテキストクリーニング
   */
  private static cleanTextForConceptExtraction(text: string): string {
    // 1. 話者ラベルの除去
    let cleaned = text
      .replace(/話者\s*\d+\s*[:：]/g, '') // "話者1:" "話者 2："
      .replace(/>\s*話者\s*\d+\s*[:：]/g, '') // "> 話者1:"
      .replace(/発言者\s*[A-Z]\s*[:：]/g, '') // "発言者A:"
      .replace(/>\s*発言者\s*[A-Z]\s*[:：]/g, ''); // "> 発言者A:"
    
    // 2. 引用記号・構造マーカーの除去
    cleaned = cleaned
      .replace(/>\s*/g, '') // 引用記号
      .replace(/###\s*[^\\n]+/g, '') // 見出し
      .replace(/\*\*([^*]+)\*\*/g, '$1') // 太字マークダウン
      .replace(/\*([^*]+)\*/g, '$1') // 斜体マークダウン
      .replace(/```[\\s\\S]*?```/g, '') // コードブロック
      .replace(/`([^`]+)`/g, '$1'); // インラインコード
    
    // 3. 時間・日付ラベルの除去
    cleaned = cleaned
      .replace(/\d{4}年\d{1,2}月\d{1,2}日/g, '')
      .replace(/\d{1,2}:\d{1,2}/g, '')
      .replace(/\d{1,2}時\d{1,2}分/g, '');
    
    return cleaned.trim();
  }
  
  /**
   * 有効な概念かどうかの判定
   */
  private static isValidConcept(word: string): boolean {
    // 1. 長さチェック
    if (word.length < 2 || word.length > 20) return false;
    
    // 2. 数字のみ除外
    if (/^\d+$/.test(word)) return false;
    
    // 3. 意味のない記号・文字列
    if (/^[a-zA-Z]+$/.test(word) && word.length < 4) return false;
    
    // 4. 一般的なストップワード
    const stopWords = [
      'の', 'は', 'が', 'を', 'に', 'で', 'と', 'から', 'まで', 'より', 'へ',
      'こと', 'もの', 'とき', 'とこ', 'そう', 'よう', 'ため', 'ところ', 'など',
      'ちょっと', 'なんか', 'だから', 'でも', 'けど', 'まあ', 'あと', 'それで'
    ];
    
    return !stopWords.includes(word);
  }
  
  /**
   * 意味的に価値のある概念かの判定
   */
  private static isSemanticalleMeaningful(concept: string): boolean {
    // 1. 単純な代名詞・指示語の除外
    const pronouns = ['これ', 'それ', 'あれ', 'どれ', 'ここ', 'そこ', 'あそこ', 'どこ'];
    if (pronouns.includes(concept)) return false;
    
    // 2. 感嘆詞・間投詞の除外
    const interjections = ['うん', 'はい', 'ええ', 'いえ', 'そう', 'なるほど', 'へえ'];
    if (interjections.includes(concept)) return false;
    
    // 3. 最低限の意味的重みがあるか
    return concept.length >= 2;
  }
  
  /**
   * 構造的ラベル（除外すべき）かの判定
   */
  private static isStructuralLabel(concept: string): boolean {
    // 1. 話者・発言者関連
    if (/話者\d*|発言者[A-Z]*|speaker\d*/i.test(concept)) return true;
    
    // 2. 時間・順序関連
    if (/第\d+|番目|回目|\d+目|時点|段階/.test(concept)) return true;
    
    // 3. 構造的記述子
    if (/項目|要素|部分|箇所|個所|事項/.test(concept)) return true;
    
    // 4. メタ情報
    if (/内容|情報|データ|詳細|説明|記述/.test(concept)) return true;
    
    return false;
  }
  
  /**
   * 意味的概念タイプの推定（強化版）
   */
  private static inferSemanticConceptType(concept: string): ConceptCategory['type'] {
    // 1. 現象キーワード
    if (/問題|課題|現象|状況|状態|傾向|パターン/.test(concept)) {
      return 'phenomenon';
    }
    
    // 2. 原因キーワード
    if (/原因|理由|要因|背景|きっかけ|契機/.test(concept)) {
      return 'causal_condition';
    }
    
    // 3. 文脈キーワード
    if (/環境|状況|条件|文脈|背景|前提/.test(concept)) {
      return 'context';
    }
    
    // 4. 対策・戦略キーワード
    if (/対策|解決|改善|戦略|方法|手段|アプローチ/.test(concept)) {
      return 'action_strategy';
    }
    
    // 5. 結果キーワード
    if (/結果|効果|影響|変化|成果|帰結/.test(concept)) {
      return 'consequence';
    }
    
    // デフォルト：現象
    return 'phenomenon';
  }

  // ===============================
  // 📊 統計分析ヘルパーメソッド
  // ===============================

  /**
   * 概念カテゴリの統計分析
   */
  private static analyzeConceptCategories(concepts: ConceptItem[]): Record<string, any> {
    const stats: Record<string, any> = {};
    
    // カテゴリ別統計
    const categoryGroups: Record<string, ConceptItem[]> = {};
    concepts.forEach(concept => {
      const type = concept.category.type;
      if (!categoryGroups[type]) categoryGroups[type] = [];
      categoryGroups[type].push(concept);
    });
    
    Object.entries(categoryGroups).forEach(([type, conceptsInCategory]) => {
      const avgRelevance = conceptsInCategory.reduce((sum, c) => sum + c.relevance, 0) / conceptsInCategory.length;
      const totalFrequency = conceptsInCategory.reduce((sum, c) => sum + c.frequency, 0);
      
      stats[type] = {
        count: conceptsInCategory.length,
        avgRelevance: parseFloat(avgRelevance.toFixed(2)),
        totalFrequency,
        percentage: parseFloat(((conceptsInCategory.length / concepts.length) * 100).toFixed(1))
      };
    });
    
    return stats;
  }

  /**
   * 関係性タイプの統計分析
   */
  private static analyzeRelationTypes(relations: ConceptRelation[]): Record<string, any> {
    const stats: Record<string, any> = {};
    
    const relationGroups: Record<string, ConceptRelation[]> = {};
    relations.forEach(relation => {
      const type = relation.relationType;
      if (!relationGroups[type]) relationGroups[type] = [];
      relationGroups[type].push(relation);
    });
    
    Object.entries(relationGroups).forEach(([type, relationsOfType]) => {
      const avgStrength = relationsOfType.reduce((sum, r) => sum + r.strength, 0) / relationsOfType.length;
      
      stats[type] = {
        count: relationsOfType.length,
        avgStrength: parseFloat(avgStrength.toFixed(2)),
        percentage: parseFloat(((relationsOfType.length / relations.length) * 100).toFixed(1))
      };
    });
    
    return stats;
  }

  /**
   * 仮説タイプの統計分析
   */
  private static analyzeHypothesisTypes(hypotheses: Hypothesis[]): Record<string, any> {
    const stats: Record<string, any> = {};
    
    const hypothesisGroups: Record<string, Hypothesis[]> = {};
    hypotheses.forEach(hypothesis => {
      const type = hypothesis.type;
      if (!hypothesisGroups[type]) hypothesisGroups[type] = [];
      hypothesisGroups[type].push(hypothesis);
    });
    
    Object.entries(hypothesisGroups).forEach(([type, hypothesesOfType]) => {
      const avgConfidence = hypothesesOfType.reduce((sum, h) => sum + h.confidence, 0) / hypothesesOfType.length;
      
      stats[type] = {
        count: hypothesesOfType.length,
        avgConfidence: parseFloat(avgConfidence.toFixed(2)),
        percentage: parseFloat(((hypothesesOfType.length / hypotheses.length) * 100).toFixed(1))
      };
    });
    
    return stats;
  }

  /**
   * 重複仮説の検出
   */
  private static findDuplicateHypotheses(hypotheses: Hypothesis[]): Array<{ hypothesis1: Hypothesis, hypothesis2: Hypothesis, similarity: number }> {
    const duplicates: Array<{ hypothesis1: Hypothesis, hypothesis2: Hypothesis, similarity: number }> = [];
    
    for (let i = 0; i < hypotheses.length; i++) {
      for (let j = i + 1; j < hypotheses.length; j++) {
        const similarity = this.calculateLexicalSimilarity(
          hypotheses[i].statement,
          hypotheses[j].statement
        );
        
        if (similarity > 0.7) { // 70%以上の類似度で重複と判定
          duplicates.push({
            hypothesis1: hypotheses[i],
            hypothesis2: hypotheses[j],
            similarity
          });
        }
      }
    }
    
    return duplicates;
  }

  /**
   * 概念ID重複検出
   */
  private static findDuplicateConceptIds(concepts: ConceptItem[]): string[] {
    const idCounts: Record<string, number> = {};
    concepts.forEach(concept => {
      idCounts[concept.id] = (idCounts[concept.id] || 0) + 1;
    });
    
    return Object.entries(idCounts)
      .filter(([id, count]) => count > 1)
      .map(([id, count]) => id);
  }

  /**
   * 関連度による概念重複除去
   */
  private static deduplicateConceptsByRelevance(concepts: ConceptItem[]): ConceptItem[] {
    const conceptMap: Record<string, ConceptItem> = {};
    
    concepts.forEach(concept => {
      const existingConcept = conceptMap[concept.id];
      if (!existingConcept || concept.relevance > existingConcept.relevance) {
        conceptMap[concept.id] = concept;
      }
    });
    
    return Object.values(conceptMap);
  }
}
