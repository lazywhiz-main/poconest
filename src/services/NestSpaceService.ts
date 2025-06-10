import { supabase } from './supabase/client';

/**
 * NestSpaceService - ネストスペース関連の操作を管理するサービス
 */
export class NestSpaceService {
  
  /**
   * ユーザーの全てのコンテナを取得
   */
  async getUserContainers(userId: string): Promise<any[]> {
    try {
      // 1. ユーザーがメンバーであるネストのIDリストを取得
      const { data: memberOfNestsData, error: memberError } = await supabase
        .from('nest_members')
        .select('nest_id')
        .eq('user_id', userId);

      if (memberError) throw memberError;
      const memberNestIds = memberOfNestsData?.map(m => m.nest_id) || [];

      // 2. or条件を構築
      let orConditions = `owner_id.eq.${userId}`;
      if (memberNestIds.length > 0) {
        // memberNestIds が空でない場合のみ id.in を追加
        orConditions += `,id.in.(${memberNestIds.join(',')})`;
      }

      const { data: nests, error: nestError } = await supabase
        .from('nests')
        .select(`
          id,
          name,
          description,
          owner_id,
          created_at,
          updated_at,
          nest_members (
            user_id
          )
        `)
        .or(orConditions);
      
      if (nestError) throw nestError;
      
      if (!nests) { // nestsがnullまたはundefinedの場合、空配列を返す
        return [];
      }
      
      // データ変換
      return nests.map(nest => ({
        id: nest.id,
        name: nest.name,
        description: nest.description || '',
        ownerId: nest.owner_id,
        spaces: [], // スペースは別途取得される想定
        members: [
          nest.owner_id,
          ...(nest.nest_members?.map((member: { user_id: string }) => member.user_id) || [])
        ].filter((v, i, a) => a.indexOf(v) === i), // 重複を削除
        createdAt: new Date(nest.created_at),
        updatedAt: new Date(nest.updated_at)
      }));
    } catch (error) {
      console.error('Failed to get user containers:', error);
      throw error;
    }
  }
  
  /**
   * 特定のコンテナの詳細を取得
   */
  async getContainerDetails(containerId: string): Promise<any> {
    try {
      // ネスト情報を取得
      const { data: nest, error: nestError } = await supabase
        .from('nests')
        .select(`
          id,
          name,
          description,
          owner_id,
          created_at,
          updated_at,
          nest_members (
            user_id
          )
        `)
        .eq('id', containerId)
        .single();
      
      if (nestError) throw nestError;
      
      if (!nest) {
        throw new Error(`Container with ID ${containerId} not found`);
      }
      
      // ネスト内の全スペースを取得
      const { data: spaces, error: spacesError } = await supabase
        .from('spaces')
        .select(`
          id,
          name,
          type,
          icon,
          description,
          content,
          metadata,
          created_at,
          created_by,
          updated_at,
          updated_by,
          view_count,
          version,
          nest_space_members (
            user_id
          )
        `)
        .eq('nest_id', containerId);
      
      if (spacesError) throw spacesError;
      
      // データ変換
      const container: any = {
        id: nest.id,
        name: nest.name,
        description: nest.description || '',
        ownerId: nest.owner_id,
        spaces: spaces ? this.transformSpaces(spaces) : [],
        members: [
          nest.owner_id,
          ...(nest.nest_members?.map(member => member.user_id) || [])
        ].filter((v, i, a) => a.indexOf(v) === i), // 重複を削除
        createdAt: new Date(nest.created_at),
        updatedAt: new Date(nest.updated_at)
      };
      
      return container;
    } catch (error) {
      console.error('Failed to get container details:', error);
      throw error;
    }
  }
  
  /**
   * スペースのデータ変換
   */
  private transformSpaces(spacesData: any[]): any[] {
    return spacesData.map(space => {
      return {
        id: space.id,
        name: space.name,
        type: space.type,
        icon: space.icon || '',
        description: space.description || '',
        content: space.content || {},
        metadata: {
          createdAt: new Date(space.created_at),
          createdBy: space.created_by,
          updatedAt: new Date(space.updated_at),
          updatedBy: space.updated_by || space.created_by,
          viewCount: space.view_count || 0,
          version: space.version || 1
        },
        members: [
          space.created_by,
          ...(space.nest_space_members?.map((member: { user_id: string }) => member.user_id) || [])
        ].filter((v, i, a) => a.indexOf(v) === i), // 重複を削除
        activeMembers: []
      };
    });
  }
  
  /**
   * デフォルトのスペースを取得または作成
   */
  async getOrCreateDefaultSpaces(containerId: string, userId: string): Promise<any[]> {
    try {
      // 既存のスペースを確認
      const { data: existingSpaces, error: checkError } = await supabase
        .from('spaces')
        .select('type')
        .eq('nest_id', containerId);
      
      if (checkError) throw checkError;
      
      // 存在するスペースタイプをチェック
      const existingTypes = new Set(existingSpaces?.map(s => s.type) || []);
      
      // デフォルトで作成すべきスペースタイプ
      const defaultSpaceTypes = [
        'chat', 
        'board', 
        'analysis'
      ];
      
      // 不足しているスペースを作成
      const spacesToCreate = defaultSpaceTypes
        .filter(type => !existingTypes.has(type))
        .map(type => {
          return {
            nest_id: containerId,
            name: this.getDefaultSpaceName(type),
            type,
            icon: this.getDefaultSpaceIcon(type),
            description: this.getDefaultSpaceDescription(type),
            content: {},
            created_by: userId,
            updated_by: userId
          };
        });
      
      if (spacesToCreate.length > 0) {
        const { error: insertError } = await supabase
          .from('spaces')
          .insert(spacesToCreate);
        
        if (insertError) throw insertError;
      }
      
      // 更新されたスペース一覧を取得
      return (await this.getContainerDetails(containerId)).spaces;
      
    } catch (error) {
      console.error('Failed to create default spaces:', error);
      throw error;
    }
  }
  
  /**
   * デフォルトのスペース名を取得
   */
  private getDefaultSpaceName(type: string): string {
    switch (type) {
      case 'chat':
        return 'チャット';
      case 'board':
        return 'ボード';
      case 'analysis':
        return '分析';
      case 'user_profile':
        return 'プロフィール';
      default:
        return 'スペース';
    }
  }
  
  /**
   * デフォルトのスペースアイコンを取得
   */
  private getDefaultSpaceIcon(type: string): string {
    switch (type) {
      case 'chat':
        return 'message';
      case 'board':
        return 'grid';
      case 'analysis':
        return 'analytics';
      case 'user_profile':
        return 'person';
      default:
        return 'circle';
    }
  }
  
  /**
   * デフォルトのスペース説明を取得
   */
  private getDefaultSpaceDescription(type: string): string {
    switch (type) {
      case 'chat':
        return 'メンバーとのコミュニケーション空間';
      case 'board':
        return 'アイデアやタスクを整理するボード';
      case 'analysis':
        return 'データの分析と洞察';
      case 'user_profile':
        return 'ユーザー設定';
      default:
        return '';
    }
  }
  
  /**
   * ユーザー存在のリアルタイム更新
   */
  async updateUserPresence(presence: any): Promise<void> {
    try {
      // リアルタイムでの存在情報を更新
      const { error } = await supabase
        .from('user_presence')
        .upsert({
          user_id: presence.userId,
          user_name: presence.userName,
          avatar_url: presence.avatarUrl,
          last_active: new Date().toISOString(),
          status: presence.status,
          current_space_id: presence.currentSpaceId
        });
      
      if (error) throw error;
    } catch (error) {
      console.error('Failed to update user presence:', error);
      // リアルタイム更新は失敗してもクリティカルではないので、エラーはスローせずログだけ
    }
  }
  
  /**
   * 新しいネストスペースを作成
   */
  async createNestSpace(nestId: string, space: Partial<any>, userId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('spaces')
        .insert({
          nest_id: nestId,
          name: space.name,
          type: space.type,
          icon: space.icon || this.getDefaultSpaceIcon(space.type as string),
          description: space.description || '',
          content: space.content || {},
          created_by: userId,
          updated_by: userId
        })
        .select()
        .single();
      
      if (error) throw error;
      
      return this.transformSpaces([data])[0];
    } catch (error) {
      console.error('Failed to create nest space:', error);
      throw error;
    }
  }
}

// サービスのインスタンスをエクスポート
export const nestSpaceService = new NestSpaceService(); 