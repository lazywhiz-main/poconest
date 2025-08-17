/**
 * クラスタービュー管理サービス
 * 分析スペースでのクラスタリング結果の保存・管理・復元を担当
 */

import { supabase } from './supabase/client';
import type {
  SavedClusterView,
  CreateClusterViewInput,
  UpdateClusterViewInput,
  ClusterViewRecord,
  ClusterViewResponse,
  ClusterViewListResponse,
  ClusterViewSummary
} from '../types/clusterView';

export class ClusterViewService {
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
   * 新しいクラスタービューを保存
   */
  static async saveClusterView(input: CreateClusterViewInput): Promise<ClusterViewResponse<string>> {
    try {
      console.log('💾 [ClusterViewService] クラスタービュー保存開始:', input.name);
      
      // ユーザー認証チェック
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) {
        return { success: false, error: 'ユーザー認証が必要です' };
      }

      // 循環参照を除去してシリアライズ
      const sanitizedClusterLabels = this.sanitizeForJSON(input.clusterLabels);
      const sanitizedSmartClusteringResult = this.sanitizeForJSON(input.smartClusteringResult);
      const sanitizedNodePositions = this.sanitizeForJSON(input.nodePositions);
      const sanitizedFilteredClusters = this.sanitizeForJSON(input.filteredClusters);
      
      // データ変換（フロントエンド型 → データベース型）
      const record = {
        board_id: input.boardId,
        nest_id: input.nestId,
        name: input.name,
        description: input.description || null,
        cluster_labels: sanitizedClusterLabels,
        smart_clustering_result: sanitizedSmartClusteringResult,
        filtered_clusters: sanitizedFilteredClusters,
        node_positions: sanitizedNodePositions,
        show_filtered_clusters: input.showFilteredClusters,
        show_labels: input.showLabels,
        created_by: authData.user.id
      };
      
      const { data, error } = await supabase
        .from('cluster_views')
        .insert(record)
        .select('id')
        .single();
      
      if (error) {
        console.error('❌ [ClusterViewService] 保存エラー:', error);
        return { success: false, error: error.message };
      }
      
      console.log('✅ [ClusterViewService] クラスタービュー保存完了:', data.id);
      return { success: true, data: data.id };
      
    } catch (error) {
      console.error('❌ [ClusterViewService] 予期しないエラー:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
  
  /**
   * 指定ボードの全クラスタービューを取得
   */
  static async getClusterViews(boardId: string): Promise<ClusterViewListResponse> {
    try {
      console.log('📂 [ClusterViewService] ビューリスト取得開始:', boardId);
      
      const { data, error } = await supabase
        .from('cluster_views')
        .select('*')
        .eq('board_id', boardId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('❌ [ClusterViewService] 取得エラー:', error);
        return { success: false, error: error.message };
      }
      
      // データ変換（データベース型 → フロントエンド型）
      const views: SavedClusterView[] = data.map(this.convertRecordToView);
      
      console.log('✅ [ClusterViewService] ビューリスト取得完了:', views.length);
      return { success: true, data: views };
      
    } catch (error) {
      console.error('❌ [ClusterViewService] 予期しないエラー:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
  
  /**
   * 指定ボードの最新のクラスタービューを取得
   */
  static async getLatestClusterView(boardId: string): Promise<ClusterViewResponse> {
    try {
      console.log('🔄 [ClusterViewService] 最新ビュー取得開始:', boardId);
      
      const { data, error } = await supabase
        .from('cluster_views')
        .select('*')
        .eq('board_id', boardId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          // データが見つからない場合
          console.log('ℹ️ [ClusterViewService] 保存されたビューがありません');
          return { success: false, error: 'No saved views found' };
        }
        console.error('❌ [ClusterViewService] 取得エラー:', error);
        return { success: false, error: error.message };
      }
      
      if (!data) {
        return { success: false, error: 'Latest cluster view not found' };
      }
      
      // データ変換
      const view = this.convertRecordToView(data);
      
      console.log('✅ [ClusterViewService] 最新ビュー取得完了:', view.name);
      return { success: true, data: view };
      
    } catch (error) {
      console.error('❌ [ClusterViewService] 予期しないエラー:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * 特定のクラスタービューを取得
   */
  static async getClusterView(id: string): Promise<ClusterViewResponse> {
    try {
      console.log('📄 [ClusterViewService] ビュー取得開始:', id);
      
      const { data, error } = await supabase
        .from('cluster_views')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        console.error('❌ [ClusterViewService] 取得エラー:', error);
        return { success: false, error: error.message };
      }
      
      if (!data) {
        return { success: false, error: 'Cluster view not found' };
      }
      
      // データ変換
      const view = this.convertRecordToView(data);
      
      console.log('✅ [ClusterViewService] ビュー取得完了:', view.name);
      return { success: true, data: view };
      
    } catch (error) {
      console.error('❌ [ClusterViewService] 予期しないエラー:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
  
  /**
   * クラスタービューを更新
   */
  static async updateClusterView(id: string, input: UpdateClusterViewInput): Promise<ClusterViewResponse<void>> {
    try {
      console.log('✏️ [ClusterViewService] ビュー更新開始:', id);
      
      const updateData: any = {
        updated_at: new Date().toISOString()
      };
      
      if (input.name !== undefined) updateData.name = input.name;
      if (input.description !== undefined) updateData.description = input.description;
      
      const { error } = await supabase
        .from('cluster_views')
        .update(updateData)
        .eq('id', id);
      
      if (error) {
        console.error('❌ [ClusterViewService] 更新エラー:', error);
        return { success: false, error: error.message };
      }
      
      console.log('✅ [ClusterViewService] ビュー更新完了:', id);
      return { success: true };
      
    } catch (error) {
      console.error('❌ [ClusterViewService] 予期しないエラー:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
  
  /**
   * クラスタービューを削除
   */
  static async deleteClusterView(id: string): Promise<ClusterViewResponse<void>> {
    try {
      console.log('🗑️ [ClusterViewService] ビュー削除開始:', id);
      
      const { error } = await supabase
        .from('cluster_views')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('❌ [ClusterViewService] 削除エラー:', error);
        return { success: false, error: error.message };
      }
      
      console.log('✅ [ClusterViewService] ビュー削除完了:', id);
      return { success: true };
      
    } catch (error) {
      console.error('❌ [ClusterViewService] 予期しないエラー:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
  
  /**
   * クラスタービューのサマリー情報を取得（一覧表示用）
   */
  static async getClusterViewSummaries(boardId: string): Promise<ClusterViewResponse<ClusterViewSummary[]>> {
    try {
      console.log('📊 [ClusterViewService] サマリー取得開始:', boardId);
      
      const { data, error } = await supabase
        .from('cluster_views')
        .select('id, name, description, cluster_labels, created_at, created_by')
        .eq('board_id', boardId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('❌ [ClusterViewService] サマリー取得エラー:', error);
        return { success: false, error: error.message };
      }
      
      // サマリー計算
      const summaries: ClusterViewSummary[] = data.map(record => {
        const clusterLabels = record.cluster_labels as any[];
        const clusterCount = clusterLabels.length;
        const cardCount = clusterLabels.reduce((total, cluster) => total + cluster.cardIds.length, 0);
        const averageConfidence = clusterLabels.length > 0 
          ? clusterLabels.reduce((sum, cluster) => sum + cluster.confidence, 0) / clusterLabels.length
          : 0;
        
        return {
          id: record.id,
          name: record.name,
          description: record.description,
          clusterCount,
          cardCount,
          averageConfidence,
          createdAt: new Date(record.created_at),
          createdBy: record.created_by
        };
      });
      
      console.log('✅ [ClusterViewService] サマリー取得完了:', summaries.length);
      return { success: true, data: summaries };
      
    } catch (error) {
      console.error('❌ [ClusterViewService] 予期しないエラー:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
  
  /**
   * データベースレコードをフロントエンド型に変換
   */
  private static convertRecordToView(record: ClusterViewRecord): SavedClusterView {
    return {
      id: record.id,
      name: record.name,
      description: record.description,
      boardId: record.board_id,
      nestId: record.nest_id,
      clusterLabels: record.cluster_labels,
      smartClusteringResult: record.smart_clustering_result,
      filteredClusters: record.filtered_clusters,
      nodePositions: record.node_positions,
      showFilteredClusters: record.show_filtered_clusters,
      showLabels: record.show_labels,
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
      createdBy: record.created_by
    };
  }
  
  /**
   * 現在のクラスタリング状態から保存用データを作成
   */
  static createSaveInput(
    name: string,
    description: string | undefined,
    boardId: string,
    nestId: string,
    clusterLabels: any[],
    smartClusteringResult: any,
    filteredClusters: string[][],
    nodePositions: { [nodeId: string]: { x: number, y: number } },
    showFilteredClusters: boolean,
    showLabels: boolean
  ): CreateClusterViewInput {
    return {
      name,
      description,
      boardId,
      nestId,
      clusterLabels,
      smartClusteringResult,
      filteredClusters,
      nodePositions,
      showFilteredClusters,
      showLabels
    };
  }
}
