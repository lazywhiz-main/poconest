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

export class GroundedTheoryAnalysisService {
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
      console.log('🧠 [GroundedTheoryAnalysisService] 分析実行開始');
      
      // 入力データの検証
      if (!params.clusters || params.clusters.length === 0) {
        throw new Error('クラスター情報が必要です');
      }

      // 分析実行（現在はモック実装）
      const result = await this.executeGroundedTheoryAnalysis(params);
      
      // 品質指標の計算
      const qualityMetrics = this.calculateQualityMetrics(result, params.clusters);
      
      const executionTime = Date.now() - startTime;
      
      console.log(`✅ [GroundedTheoryAnalysisService] 分析完了: ${executionTime}ms`);
      
      return {
        result,
        executionTime,
        qualityMetrics,
        warnings: [] // 必要に応じて警告を追加
      };
      
    } catch (error) {
      console.error('❌ [GroundedTheoryAnalysisService] 分析エラー:', error);
      throw error;
    }
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
   * 中核概念の生成（モック）
   */
  private static generateCoreCategory(clusters: ClusterLabel[]): string {
    const themes = clusters.map(c => c.theme).filter(Boolean);
    if (themes.length > 0) {
      return `${themes[0]}を中心とした価値創造プロセス`;
    }
    return 'システム価値創造の統合理論';
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
      
      hypotheses.push({
        id: `hypothesis_${i + 1}`,
        statement: `${cluster.text}における${type === 'descriptive' ? '記述的' : type === 'explanatory' ? '説明的' : '予測的'}仮説: ${cluster.theme}が${cluster.metadata.cardCount}個の概念を通じて価値創造に寄与する。`,
        type: type,
        confidence: 0.6 + Math.random() * 0.3, // 60-90%
        supportingEvidence: [
          `クラスター「${cluster.text}」における${cluster.metadata.cardCount}個の概念`,
          `支配的タグ: ${cluster.metadata.dominantTags.join(', ')}`,
          `支配的タイプ: ${cluster.metadata.dominantTypes.join(', ')}`
        ],
        limitations: [
          'サンプルサイズの制限',
          '特定のコンテキストに依存',
          '時間的変化の考慮が必要'
        ],
        testable: Math.random() > 0.3, // 70%の確率で検証可能
        relatedConcepts: cluster.metadata.dominantTags.slice(0, 3),
        implications: [
          '実践的な適用可能性',
          '理論的貢献の可能性',
          '今後の研究方向性'
        ],
        researchQuestions: [
          `${cluster.text}の影響メカニズムの詳細分析`,
          '他のコンテキストでの検証',
          '長期的な効果の測定'
        ]
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
   * データベースレコードからフロントエンド型への変換
   */
  private static convertRecordToAnalysis(record: GroundedTheoryAnalysisRecord): SavedGroundedTheoryAnalysis {
    return {
      id: record.id,
      name: record.name,
      description: record.description || undefined,
      boardId: record.board_id,
      nestId: record.nest_id,
      analysisResult: record.analysis_result,
      sourceClusters: record.source_clusters,
      sourceClusteringResult: record.source_clustering_result || undefined,
      analysisParameters: record.analysis_parameters,
      qualityMetrics: record.quality_metrics,
      hypothesisCount: record.hypothesis_count,
      confidenceAverage: record.confidence_average,
      conceptCount: record.concept_count,
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
      createdBy: record.created_by
    };
  }
}
