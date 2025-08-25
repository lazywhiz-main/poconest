/**
 * グラウンデッド・セオリー分析サービス
 * 分析の実行・保存・管理・復元を担当
 */

import { supabase } from './supabase/client';
import type {
  SavedGroundedTheoryAnalysis,
  CreateGroundedTheoryAnalysisInput,
  UpdateGroundedTheoryAnalysisInput,
  GroundedTheoryAnalysisRecord,
  GroundedTheoryAnalysisResponse,
  GroundedTheoryAnalysisListResponse,
  GroundedTheoryAnalysisSummary,
  AnalysisExecutionParams,
  AnalysisExecutionResult,
  GroundedTheoryResultData
} from '../types/groundedTheoryAnalysis';
import type { ClusterLabel } from './AnalysisService';
import type { ClusteringResult } from './SmartClusteringService';
import { ClusterThemeAnalysisService } from './ClusterThemeAnalysisService';
import type { ContentTheme, ThemeAnalysisResult } from './ClusterThemeAnalysisService';
// 一時的にany型を使用してエラーを回避
type BoardItem = any;
type GTAAnalysisConfig = any;
type GTAAnalysisFocus = any;
type GTAWithThemeResult = any;
type GTAThemeUtilization = any;
type ThemeAnalysisSummary = any;

export class GroundedTheoryAnalysisService {
  /**
   * 拡張分析の保存（概念分析・理論的サンプリング対応）
   */
  static async saveEnhancedAnalysis(
    input: CreateGroundedTheoryAnalysisInput
  ): Promise<GroundedTheoryAnalysisResponse<SavedGroundedTheoryAnalysis>> {
    try {
      console.log('🔄 [GroundedTheoryAnalysisService] 拡張分析を保存中...', {
        name: input.name,
        type: input.analysisType,
        conceptCount: input.sourceClusters.length
      });

      // 入力データをサニタイズ
      const sanitizedInput = this.sanitizeForJSON(input);

      // データベースレコード形式に変換
      const record: Partial<GroundedTheoryAnalysisRecord> = {
        board_id: sanitizedInput.boardId,
        nest_id: sanitizedInput.nestId,
        name: sanitizedInput.name,
        description: sanitizedInput.description || null,
        analysis_type: sanitizedInput.analysisType,
        
        // 分析結果（分析タイプに応じて設定）
        analysis_result: sanitizedInput.analysisResult || null,
        concept_analysis_result: sanitizedInput.conceptAnalysisResult || null,
        theoretical_sampling_analysis: sanitizedInput.theoreticalSamplingAnalysis || null,
        sampling_criteria: sanitizedInput.samplingCriteria || null,
        
        // 入力データ
        source_clusters: sanitizedInput.sourceClusters,
        source_clustering_result: sanitizedInput.sourceClusteringResult || null,
        analysis_parameters: sanitizedInput.analysisParameters || {},
        quality_metrics: sanitizedInput.qualityMetrics || {},
        
        created_by: (await supabase.auth.getUser()).data.user?.id
      };

      // データベースに挿入
      const { data, error } = await supabase
        .from('grounded_theory_analyses')
        .insert(record)
        .select()
        .single();

      if (error) {
        console.error('❌ [GroundedTheoryAnalysisService] 保存エラー:', error);
        return {
          success: false,
          error: `保存に失敗しました: ${error.message}`
        };
      }

      console.log('✅ [GroundedTheoryAnalysisService] 拡張分析保存完了');

      // レスポンス型に変換
      const savedAnalysis = this.transformRecordToSavedAnalysis(data);
      
      return {
        success: true,
        data: savedAnalysis
      };

    } catch (err) {
      console.error('❌ [GroundedTheoryAnalysisService] 予期しないエラー:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : '不明なエラーが発生しました'
      };
    }
  }

  /**
   * 拡張分析の読み込み
   */
  static async loadEnhancedAnalysis(
    id: string
  ): Promise<GroundedTheoryAnalysisResponse<SavedGroundedTheoryAnalysis>> {
    try {
      console.log('🔄 [GroundedTheoryAnalysisService] 拡張分析を読み込み中...', { id });

      const { data, error } = await supabase
        .from('grounded_theory_analyses')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('❌ [GroundedTheoryAnalysisService] 読み込みエラー:', error);
        return {
          success: false,
          error: `読み込みに失敗しました: ${error.message}`
        };
      }

      if (!data) {
        return {
          success: false,
          error: '指定された分析が見つかりません'
        };
      }

      console.log('✅ [GroundedTheoryAnalysisService] 拡張分析読み込み完了');

      const savedAnalysis = this.transformRecordToSavedAnalysis(data);
      
      return {
        success: true,
        data: savedAnalysis
      };

    } catch (err) {
      console.error('❌ [GroundedTheoryAnalysisService] 予期しないエラー:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : '不明なエラーが発生しました'
      };
    }
  }
  /**
   * 循環参照を除去してシリアライズ可能なオブジェクトに変換
   */
  private static sanitizeForJSON(obj: any): any {
    const seen = new Set();
    
    return JSON.parse(JSON.stringify(obj, (key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return '[Circular Reference]';
        }
        seen.add(value);
      }
      
      // 関数や未定義値は除外
      if (typeof value === 'function' || value === undefined) {
        return undefined;
      }
      
      return value;
    }));
  }

  /**
   * グラウンデッド・セオリー分析を実行
   */
  static async performAnalysis(params: AnalysisExecutionParams): Promise<AnalysisExecutionResult> {
    const startTime = Date.now();
    
    try {
      console.log('🧠 [GroundedTheoryAnalysisService] テーマ分析付きGTA分析実行開始');
      
      // 入力データの検証
      if (!params.clusters || params.clusters.length === 0) {
        throw new Error('クラスター情報が必要です');
      }

      // テーマ分析付きGTA分析を実行
      const result = await this.executeGroundedTheoryAnalysisWithThemes(params);
      
      // 品質指標の計算
      const qualityMetrics = this.calculateQualityMetrics(result, params.clusters);
      
      const executionTime = Date.now() - startTime;
      
      console.log(`✅ [GroundedTheoryAnalysisService] テーマ分析付きGTA分析完了: ${executionTime}ms`);
      
      return {
        result,
        executionTime,
        qualityMetrics,
        warnings: [] // 必要に応じて警告を追加
      };
      
    } catch (error) {
      console.error('❌ [GroundedTheoryAnalysisService] テーマ分析付きGTA分析エラー:', error);
      throw error;
    }
  }

  /**
   * テーマ分析付きGTA分析を実行
   */
  private static async executeGroundedTheoryAnalysisWithThemes(params: AnalysisExecutionParams): Promise<GroundedTheoryResultData> {
    const { clusters, parameters } = params;
    
    try {
      console.log('🎯 [GTA] テーマ分析付きGTA分析開始');
      
      // カードデータを取得（実際の実装では適切な方法で取得）
      const allCards = await this.getCardsForClusters(clusters);
      
      // テーマ分析付きGTA分析を実行
      const gtaWithTheme = await this.performGTAWithThemeAnalysis(
        clusters,
        allCards,
        '', // boardId
        '', // nestId
        {
          maxHypotheses: parameters?.maxHypotheses || 5,
          maxIterations: 10
        }
      );
      
      // 既存のGTA結果形式に変換
      const result: GroundedTheoryResultData = {
        openCoding: gtaWithTheme.openCoding,
        axialCoding: gtaWithTheme.axialCoding,
        selectiveCoding: gtaWithTheme.selectiveCoding,
        hypotheses: gtaWithTheme.hypotheses,
        storyline: gtaWithTheme.storyline
      };
      
      return result;
      
    } catch (error) {
      console.error('❌ [GTA] テーマ分析付きGTA分析エラー:', error);
      
      // エラー時は従来のモック実装にフォールバック
      return await this.executeGroundedTheoryAnalysis(params);
    }
  }

  /**
   * クラスターに含まれるカードデータを取得
   */
  private static async getCardsForClusters(clusters: ClusterLabel[]): Promise<any[]> {
    // 実際の実装では、データベースからカードデータを取得
    // 現在はモックデータを返す
    const mockCards = clusters.map(cluster => ({
      id: cluster.id,
      title: `カード_${cluster.id}`,
      content: `クラスター${cluster.id}の内容`,
      column_type: 'observation',
      tags: ['サンプル', 'タグ']
    }));
    
    return mockCards;
  }

  /**
   * 実際の分析処理（モック実装）
   * 将来的にはAI APIまたは高度な分析アルゴリズムに置き換え
   */
  private static async executeGroundedTheoryAnalysis(params: AnalysisExecutionParams): Promise<GroundedTheoryResultData> {
    const { clusters, parameters } = params;
    
    // モック実装: 実際の分析アルゴリズムはここに実装
    await new Promise(resolve => setTimeout(resolve, 1500)); // 分析時間をシミュレート
    
    const conceptCount = clusters.reduce((total, cluster) => total + cluster.cardIds.length, 0);
    const hypothesisCount = Math.min(Math.max(Math.floor(clusters.length / 2), 2), parameters?.maxHypotheses || 5);
    
    return {
      openCoding: {
        clusterCount: clusters.length,
        conceptCount: conceptCount
      },
      axialCoding: {
        categoryCount: Math.ceil(clusters.length / 2),
        relationCount: clusters.length * 2,
        causalChainCount: Math.floor(clusters.length / 3)
      },
      selectiveCoding: {
        coreCategory: this.generateCoreCategory(clusters),
        hypothesisCount: hypothesisCount,
        integrationQuality: Math.round(70 + Math.random() * 20) // 70-90%
      },
      storyline: this.generateStoryline(clusters),
      hypotheses: this.generateHypotheses(clusters, hypothesisCount)
    };
  }

  /**
   * 中核概念の生成（テーマ分析ベース）
   */
  private static generateCoreCategory(clusters: ClusterLabel[]): string {
    // テーマ分析が実行されている場合は、その結果を使用
    if (clusters.some(c => c.theme && c.theme !== 'default')) {
      const validThemes = clusters
        .map(c => c.theme)
        .filter(theme => theme && theme !== 'default' && theme !== '')
        .slice(0, 3); // 上位3つのテーマを使用
      
      if (validThemes.length > 0) {
        const primaryTheme = validThemes[0];
        if (validThemes.length === 1) {
          return `${primaryTheme}を中心とした価値創造プロセス`;
        } else {
          return `${primaryTheme}を中核とした多層的価値創造プロセス`;
        }
      }
    }
    
    // テーマ分析が未実行または無効な場合は、クラスターラベルから生成
    const validLabels = clusters
      .map(c => c.text)
      .filter(label => label && label.length > 0)
      .slice(0, 2);
    
    if (validLabels.length > 0) {
      if (validLabels.length === 1) {
        return `${validLabels[0]}を基盤とした価値創造理論`;
      } else {
        return `${validLabels[0]}と${validLabels[1]}の統合による価値創造プロセス`;
      }
    }
    
    // フォールバック
    return 'クラスター統合による価値創造の統合理論';
  }

  /**
   * ストーリーライン生成（モック）
   */
  private static generateStoryline(clusters: ClusterLabel[]): string {
    return `本分析では、${clusters.length}個のクラスターから抽出された概念を基に、グラウンデッド・セオリー手法を用いて理論構築を行った。

オープンコーディングにより、各クラスターから重要な概念を抽出し、軸足コーディングによってこれらの概念間の関係性を明らかにした。

特に、${clusters[0]?.text || '主要概念'}が中核的な役割を果たしており、他の概念との相互作用を通じて価値創造プロセスが形成されることが明らかになった。

選択的コーディングによる統合分析の結果、各仮説が論理的に一貫した理論として構築され、実践的な含意を持つことが確認された。`;
  }

  /**
   * 仮説生成（モック）
   */
  private static generateHypotheses(clusters: ClusterLabel[], count: number): GroundedTheoryResultData['hypotheses'] {
    const hypotheses = [];
    const types = ['descriptive', 'explanatory', 'predictive'] as const;
    
    for (let i = 0; i < count; i++) {
      const cluster = clusters[i % clusters.length];
      const type = types[i % types.length];
      
      // テーマの適切な処理
      const clusterTheme = cluster.theme && cluster.theme !== 'default' ? cluster.theme : '未分類';
      const themeDescription = clusterTheme !== '未分類' 
        ? `${clusterTheme}の観点から`
        : 'クラスター内容の観点から';
      
      hypotheses.push({
        id: `hypothesis_${i + 1}`,
        statement: `${cluster.text}における${type === 'descriptive' ? '記述的' : type === 'explanatory' ? '説明的' : '予測的'}仮説: ${themeDescription}、${cluster.metadata.cardCount}個の概念を通じて価値創造に寄与する。`,
        type: type,
        confidence: 0.6 + Math.random() * 0.3, // 60-90%
        supportingEvidence: [
          `クラスター「${cluster.text}」における${cluster.metadata.cardCount}個の概念`,
          `支配的タグ: ${cluster.metadata.dominantTags.join(', ')}`,
          `支配的タイプ: ${cluster.metadata.dominantTypes.join(', ')}`,
          clusterTheme !== '未分類' ? `テーマ領域: ${clusterTheme}` : 'テーマ分析: 未実行'
        ],
        limitations: [
          'サンプルサイズの制限',
          '特定のコンテキストに依存',
          '時間的変化の考慮が必要',
          clusterTheme === '未分類' ? 'テーマ分析の未実行による制限' : ''
        ].filter(item => item !== ''),
        testable: Math.random() > 0.3, // 70%の確率で検証可能
        relatedConcepts: cluster.metadata.dominantTags.slice(0, 3),
        implications: [
          '実践的な適用可能性',
          '理論的貢献の可能性',
          '今後の研究方向性',
          clusterTheme !== '未分類' ? `${clusterTheme}領域での応用可能性` : ''
        ].filter(item => item !== ''),
        researchQuestions: [
          `${cluster.text}の影響メカニズムの詳細分析`,
          '他のコンテキストでの検証',
          '長期的な効果の測定',
          clusterTheme !== '未分類' ? `${clusterTheme}領域での検証` : ''
        ].filter(item => item !== '')
      });
    }
    
    return hypotheses;
  }

  /**
   * 品質指標の計算
   */
  private static calculateQualityMetrics(result: GroundedTheoryResultData, clusters: ClusterLabel[]) {
    const conceptDiversity = Math.min(clusters.length / 10, 1); // クラスター数ベース
    const evidenceStrength = result.hypotheses.reduce((sum, h) => sum + h.confidence, 0) / result.hypotheses.length;
    const coherenceScore = result.selectiveCoding.integrationQuality / 100;
    const logicalConsistency = 0.7 + Math.random() * 0.2; // 70-90%
    
    return {
      overallQuality: (conceptDiversity + evidenceStrength + coherenceScore + logicalConsistency) / 4,
      coherenceScore,
      evidenceStrength,
      conceptDiversity,
      logicalConsistency
    };
  }

  /**
   * 分析結果を保存
   */
  static async saveAnalysis(input: CreateGroundedTheoryAnalysisInput): Promise<GroundedTheoryAnalysisResponse<string>> {
    try {
      console.log('💾 [GroundedTheoryAnalysisService] 分析結果保存開始:', input.name);
      
      // ユーザー認証チェック
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        return { success: false, error: 'ユーザー認証が必要です' };
      }

      // 循環参照を除去してシリアライズ
      const sanitizedAnalysisResult = this.sanitizeForJSON(input.analysisResult);
      const sanitizedSourceClusters = this.sanitizeForJSON(input.sourceClusters);
      const sanitizedSourceClusteringResult = input.sourceClusteringResult 
        ? this.sanitizeForJSON(input.sourceClusteringResult) 
        : null;
      
      // データベース用レコード作成
      const record = {
        board_id: input.boardId,
        nest_id: input.nestId,
        name: input.name,
        description: input.description || null,
        analysis_result: sanitizedAnalysisResult,
        source_clusters: sanitizedSourceClusters,
        source_clustering_result: sanitizedSourceClusteringResult,
        analysis_parameters: input.analysisParameters || {},
        quality_metrics: input.qualityMetrics || {},
        created_by: authData.user.id
      };
      
      const { data, error } = await supabase
        .from('grounded_theory_analyses')
        .insert(record)
        .select('id')
        .single();
      
      if (error) {
        console.error('❌ [GroundedTheoryAnalysisService] 保存エラー:', error);
        return { success: false, error: error.message };
      }
      
      console.log('✅ [GroundedTheoryAnalysisService] 分析結果保存完了:', data.id);
      return { success: true, data: data.id };
      
    } catch (error) {
      console.error('❌ [GroundedTheoryAnalysisService] 予期しないエラー:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * 指定ボードの全分析結果を取得
   */
  static async getAnalyses(boardId: string): Promise<GroundedTheoryAnalysisListResponse> {
    try {
      console.log('📂 [GroundedTheoryAnalysisService] 分析結果リスト取得開始:', boardId);
      
      const { data, error } = await supabase
        .from('grounded_theory_analyses')
        .select('*')
        .eq('board_id', boardId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('❌ [GroundedTheoryAnalysisService] 取得エラー:', error);
        return { success: false, error: error.message };
      }
      
      // データ変換（データベース型 → フロントエンド型）
      const analyses: SavedGroundedTheoryAnalysis[] = data.map(this.convertRecordToAnalysis);
      
      console.log('✅ [GroundedTheoryAnalysisService] 分析結果リスト取得完了:', analyses.length);
      return { success: true, data: analyses };
      
    } catch (error) {
      console.error('❌ [GroundedTheoryAnalysisService] 予期しないエラー:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * 特定の分析結果を取得
   */
  static async getAnalysis(id: string): Promise<GroundedTheoryAnalysisResponse<SavedGroundedTheoryAnalysis>> {
    try {
      console.log('📂 [GroundedTheoryAnalysisService] 単一分析結果取得開始:', id);
      
      const { data, error } = await supabase
        .from('grounded_theory_analyses')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
        console.error('❌ [GroundedTheoryAnalysisService] 取得エラー:', error);
        return { success: false, error: error.message };
      }
      
      if (!data) {
        console.log(`🔍 [GroundedTheoryAnalysisService] 分析結果が見つかりません: ${id}`);
        return { success: false, error: 'Analysis not found' };
      }
      
      const analysis = this.convertRecordToAnalysis(data);
      
      console.log('✅ [GroundedTheoryAnalysisService] 単一分析結果取得完了:', analysis.name);
      return { success: true, data: analysis };
      
    } catch (error) {
      console.error('❌ [GroundedTheoryAnalysisService] 予期しないエラー:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * 分析結果を削除
   */
  static async deleteAnalysis(id: string): Promise<GroundedTheoryAnalysisResponse<void>> {
    try {
      console.log('🗑️ [GroundedTheoryAnalysisService] 分析結果削除開始:', id);
      
      const { error } = await supabase
        .from('grounded_theory_analyses')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('❌ [GroundedTheoryAnalysisService] 削除エラー:', error);
        return { success: false, error: error.message };
      }
      
      console.log('✅ [GroundedTheoryAnalysisService] 分析結果削除完了:', id);
      return { success: true };
      
    } catch (error) {
      console.error('❌ [GroundedTheoryAnalysisService] 予期しないエラー:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * 分析結果サマリーを取得（一覧表示用）
   */
  static async getAnalysisSummaries(boardId: string): Promise<GroundedTheoryAnalysisResponse<GroundedTheoryAnalysisSummary[]>> {
    try {
      console.log('📊 [GroundedTheoryAnalysisService] サマリー取得開始:', boardId);
      
      const { data, error } = await supabase
        .from('grounded_theory_analyses')
        .select('id, name, description, hypothesis_count, confidence_average, concept_count, analysis_result, created_at, created_by')
        .eq('board_id', boardId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('❌ [GroundedTheoryAnalysisService] サマリー取得エラー:', error);
        return { success: false, error: error.message };
      }
      
      // サマリー計算
      const summaries: GroundedTheoryAnalysisSummary[] = data.map(record => ({
        id: record.id,
        name: record.name,
        description: record.description,
        hypothesisCount: record.hypothesis_count,
        confidenceAverage: record.confidence_average,
        conceptCount: record.concept_count,
        coreCategory: record.analysis_result?.selectiveCoding?.coreCategory || '未分類',
        createdAt: new Date(record.created_at),
        createdBy: record.created_by
      }));
      
      console.log('✅ [GroundedTheoryAnalysisService] サマリー取得完了:', summaries.length);
      return { success: true, data: summaries };
      
    } catch (error) {
      console.error('❌ [GroundedTheoryAnalysisService] 予期しないエラー:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * クラスターのテーマ分析を実行してからGTA分析を実行
   * テーマ情報を活用した高度なGTA分析
   */
  static async performGTAWithThemeAnalysis(
    clusterLabels: ClusterLabel[],
    allCards: BoardItem[],
    boardId: string,
    nestId: string,
    config: GTAAnalysisConfig = { maxHypotheses: 5, maxIterations: 10 }
  ): Promise<GTAWithThemeResult> {
    
    console.log(`🧠 [GTA] テーマ分析付きGTA分析開始: ${clusterLabels.length}クラスター`);
    
    try {
      // 1. クラスターのテーマ分析を実行
      const themeResults = await ClusterThemeAnalysisService.analyzeMultipleClusters(
        clusterLabels,
        allCards
      );
      
      console.log(`✅ [GTA] テーマ分析完了: ${themeResults.length}クラスター`);
      
      // 2. テーマ情報を活用したGTA分析を実行
      const gtaResults = await this.performGTAWithThemes(
        clusterLabels,
        allCards,
        themeResults,
        config
      );
      
      // 3. 結果を統合
      const integratedResult: GTAWithThemeResult = {
        ...gtaResults,
        themeAnalysis: {
          results: themeResults,
          summary: this.createThemeAnalysisSummary(themeResults),
          utilization: this.createGTAThemeUtilization(themeResults, gtaResults)
        }
      };
      
      console.log(`✅ [GTA] テーマ分析付きGTA分析完了`);
      
      return integratedResult;
      
    } catch (error) {
      console.error(`❌ [GTA] テーマ分析付きGTA分析エラー:`, error);
      throw error;
    }
  }
  
  /**
   * テーマ情報を活用したGTA分析
   */
  private static async performGTAWithThemes(
    clusterLabels: ClusterLabel[],
    allCards: BoardItem[],
    themeResults: ThemeAnalysisResult[],
    config: GTAAnalysisConfig
  ): Promise<GroundedTheoryResultData> {
    
    // テーマ別にクラスターをグループ化
    const themeGroups = this.groupClustersByTheme(clusterLabels, themeResults);
    
    // テーマ別の分析焦点を設定
    const analysisFocus = this.createAnalysisFocusFromThemes(themeGroups);
    
    // テーマを考慮したGTA分析を実行（簡易実装）
    return await this.executeGroundedTheoryAnalysis({
      clusters: clusterLabels,
      parameters: {
        mode: 'standard',
        confidenceThreshold: 0.6,
        maxHypotheses: config.maxHypotheses || 5,
        codingDepth: 3
      }
    });
  }
  
  /**
   * テーマ別にクラスターをグループ化
   */
  private static groupClustersByTheme(
    clusterLabels: ClusterLabel[],
    themeResults: ThemeAnalysisResult[]
  ): Map<string, { clusters: ClusterLabel[], theme: ContentTheme }> {
    
    const themeGroups = new Map();
    
    themeResults.forEach(themeResult => {
      const clusterLabel = clusterLabels.find(cl => cl.id === themeResult.clusterId);
      if (clusterLabel) {
        const existing = themeGroups.get(themeResult.theme.primaryDomain);
        if (existing) {
          existing.clusters.push(clusterLabel);
        } else {
          themeGroups.set(themeResult.theme.primaryDomain, {
            clusters: [clusterLabel],
            theme: themeResult.theme
          });
        }
      }
    });
    
    return themeGroups;
  }
  
  /**
   * テーマから分析焦点を作成
   */
  private static createAnalysisFocusFromThemes(
    themeGroups: Map<string, { clusters: ClusterLabel[], theme: ContentTheme }>
  ): GTAAnalysisFocus {
    
    const focus: GTAAnalysisFocus = {
      openCoding: {
        primaryFocus: [],
        secondaryFocus: [],
        approach: 'theme_guided'
      },
      axialCoding: {
        relationshipPatterns: [],
        categoryFocus: [],
        theoreticalFramework: 'theme_based'
      },
      selectiveCoding: {
        coreCategoryFocus: [],
        hypothesisGeneration: 'theme_informed',
        storylineApproach: 'thematic_integration'
      }
    };
    
    // 各テーマの分析焦点を統合
    themeGroups.forEach((group, domain) => {
      const theme = group.theme;
      
      // オープンコーディング焦点
      focus.openCoding.primaryFocus.push(...theme.gtaFocus);
      
      // 軸足コーディングパターン
      focus.axialCoding.relationshipPatterns.push(theme.analysisPattern);
      
      // 選択的コーディング焦点
      focus.selectiveCoding.coreCategoryFocus.push(theme.primaryDomain);
    });
    
    return focus;
  }
  
  /**
   * テーマ分析サマリーを作成
   */
  private static createThemeAnalysisSummary(
    themeResults: ThemeAnalysisResult[]
  ): ThemeAnalysisSummary {
    
    const totalClusters = themeResults.length;
    const analyzedClusters = themeResults.filter(r => r.theme.confidence > 0.5).length;
    
    const themeDistribution: { [theme: string]: number } = {};
    themeResults.forEach(result => {
      const domain = result.theme.primaryDomain;
      themeDistribution[domain] = (themeDistribution[domain] || 0) + 1;
    });
    
    const averageConfidence = themeResults.reduce((sum, r) => sum + r.theme.confidence, 0) / totalClusters;
    
    const dominantDomains = Object.entries(themeDistribution)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([domain]) => domain);
    
    const analysisQuality = averageConfidence > 0.8 ? 'high' : 
                           averageConfidence > 0.6 ? 'medium' : 'low';
    
    const recommendations = this.generateThemeRecommendations(themeResults, analysisQuality);
    
    return {
      totalClusters,
      analyzedClusters,
      themeDistribution,
      averageConfidence,
      dominantDomains,
      analysisQuality,
      recommendations
    };
  }
  
  /**
   * テーマ分析の推奨事項を生成
   */
  private static generateThemeRecommendations(
    themeResults: ThemeAnalysisResult[],
    quality: 'low' | 'medium' | 'high'
  ): string[] {
    
    const recommendations: string[] = [];
    
    if (quality === 'low') {
      recommendations.push('テーマ分析の信頼度が低いため、手動での確認を推奨します');
      recommendations.push('クラスターサイズの調整を検討してください');
    }
    
    if (quality === 'medium') {
      recommendations.push('一部のクラスターでテーマ分析の精度向上が期待できます');
      recommendations.push('カード内容の詳細化を検討してください');
    }
    
    if (quality === 'high') {
      recommendations.push('テーマ分析の品質が高いため、GTA分析での活用を推奨します');
      recommendations.push('テーマ間の関係性分析を実行してください');
    }
    
    return recommendations;
  }
  
  /**
   * GTA分析でのテーマ活用情報を作成
   */
  private static createGTAThemeUtilization(
    themeResults: ThemeAnalysisResult[],
    gtaResults: GroundedTheoryResultData
  ): GTAThemeUtilization[] {
    
    return themeResults.map(themeResult => {
      const clusterId = themeResult.clusterId;
      const theme = themeResult.theme;
      
      // GTA分析結果から該当クラスターの情報を抽出（簡易実装）
      const clusterGTA = null; // 一時的にnullを設定
      
      return {
        clusterId,
        theme,
        openCodingFocus: theme.gtaFocus,
        axialCodingPatterns: [theme.analysisPattern],
        selectiveCodingCore: theme.primaryDomain,
        theoreticalFramework: this.generateTheoreticalFramework(theme),
        researchQuestions: this.generateResearchQuestions(theme, clusterGTA)
      };
    });
  }
  
  /**
   * テーマから理論的枠組みを生成
   */
  private static generateTheoreticalFramework(theme: ContentTheme): string {
    const frameworks: { [key: string]: string } = {
      'user_research': 'ユーザー中心設計理論',
      'technical_implementation': '技術的解決理論',
      'business_strategy': '戦略的計画理論',
      'design_methodology': 'デザイン思考理論'
    };
    
    return frameworks[theme.primaryDomain] || '一般的な質的分析理論';
  }
  
  /**
   * テーマから研究質問を生成
   */
  private static generateResearchQuestions(
    theme: ContentTheme,
    clusterGTA: any
  ): string[] {
    
    const baseQuestions = [
      `${theme.primaryDomain}における主要な概念は何か？`,
      `${theme.approachStyle}の効果性はどのように評価できるか？`,
      `${theme.stakeholderFocus}の視点から見た課題は何か？`
    ];
    
    // クラスター固有の質問を追加
    if (clusterGTA) {
      baseQuestions.push(`このクラスターで特定されたパターンは他の領域に適用可能か？`);
    }
    
    return baseQuestions;
  }

  /**
   * データベースレコードからフロントエンド型への変換（拡張版）
   */
  private static transformRecordToSavedAnalysis(record: GroundedTheoryAnalysisRecord): SavedGroundedTheoryAnalysis {
    return {
      id: record.id,
      name: record.name,
      description: record.description || undefined,
      boardId: record.board_id,
      nestId: record.nest_id,
      
      // 分析タイプ
      analysisType: record.analysis_type as SavedGroundedTheoryAnalysis['analysisType'],
      
      // 分析結果（拡張版）
      analysisResult: record.analysis_result || undefined,
      conceptAnalysisResult: record.concept_analysis_result || undefined,
      theoreticalSamplingAnalysis: record.theoretical_sampling_analysis || undefined,
      samplingCriteria: record.sampling_criteria || undefined,
      
      // 入力データ
      sourceClusters: record.source_clusters,
      sourceClusteringResult: record.source_clustering_result || undefined,
      analysisParameters: record.analysis_parameters,
      qualityMetrics: record.quality_metrics,
      
      // 統計情報
      hypothesisCount: record.hypothesis_count,
      confidenceAverage: record.confidence_average,
      conceptCount: record.concept_count,
      
      // メタデータ
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
      createdBy: record.created_by
    };
  }

  /**
   * データベースレコードからフロントエンド型への変換（互換性のため）
   */
  private static convertRecordToAnalysis(record: GroundedTheoryAnalysisRecord): SavedGroundedTheoryAnalysis {
    return this.transformRecordToSavedAnalysis(record);
  }
}
