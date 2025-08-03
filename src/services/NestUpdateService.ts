import { supabase } from './supabase/client';

/**
 * NESTのupdated_atを管理するサービス
 * 
 * 使用方法:
 * 1. データベーストリガーが自動的にupdated_atを更新
 * 2. 重要な操作時には明示的にupdateNestActivity()を呼び出し
 * 
 * 例:
 * - チャットメッセージ送信後: await NestUpdateService.updateNestActivity(nestId)
 * - ミーティング作成後: await NestUpdateService.updateNestActivity(nestId)
 * - カード作成後: await NestUpdateService.updateNestActivity(nestId)
 * - 設定変更後: await NestUpdateService.updateNestActivity(nestId)
 */
export class NestUpdateService {
  /**
   * NESTのupdated_atを明示的に更新
   * 重要な操作時に呼び出して、トリガーが動作しない場合の保険として使用
   */
  static async updateNestActivity(nestId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('nests')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', nestId);

      if (error) {
        console.error('Failed to update nest activity:', error);
        throw error;
      }

      console.log(`Updated nest activity for nest: ${nestId}`);
    } catch (error) {
      console.error('Error updating nest activity:', error);
      throw error;
    }
  }

  /**
   * 複数のNESTのupdated_atを一括更新
   */
  static async updateMultipleNestActivity(nestIds: string[]): Promise<void> {
    try {
      const updates = nestIds.map(nestId => ({
        id: nestId,
        updated_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('nests')
        .upsert(updates, { onConflict: 'id' });

      if (error) {
        console.error('Failed to update multiple nest activities:', error);
        throw error;
      }

      console.log(`Updated activities for ${nestIds.length} nests`);
    } catch (error) {
      console.error('Error updating multiple nest activities:', error);
      throw error;
    }
  }

  /**
   * NESTの最終更新日時を取得
   */
  static async getNestLastUpdated(nestId: string): Promise<Date | null> {
    try {
      const { data, error } = await supabase
        .from('nests')
        .select('updated_at')
        .eq('id', nestId)
        .single();

      if (error) {
        console.error('Failed to get nest last updated:', error);
        return null;
      }

      return data?.updated_at ? new Date(data.updated_at) : null;
    } catch (error) {
      console.error('Error getting nest last updated:', error);
      return null;
    }
  }

  /**
   * NESTの活動状況をチェック（デバッグ用）
   */
  static async checkNestActivity(nestId: string): Promise<{
    lastUpdated: Date | null;
    recentChatMessages: number;
    recentMeetings: number;
    recentBoardCards: number;
  }> {
    try {
      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // 最終更新日時を取得
      const lastUpdated = await this.getNestLastUpdated(nestId);

      // 最近のチャットメッセージ数を取得
      const { data: spaces } = await supabase
        .from('spaces')
        .select('id')
        .eq('nest_id', nestId);
      
      const spaceIds = spaces?.map(space => space.id) || [];
      const { data: chatRooms } = await supabase
        .from('chat_rooms')
        .select('id')
        .in('space_id', spaceIds);
      
      const chatRoomIds = chatRooms?.map(room => room.id) || [];
      const { count: chatCount } = await supabase
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', oneWeekAgo.toISOString())
        .in('chat_id', chatRoomIds);

      // 最近のミーティング数を取得
      const { count: meetingCount } = await supabase
        .from('meetings')
        .select('*', { count: 'exact', head: true })
        .eq('nest_id', nestId)
        .gte('created_at', oneWeekAgo.toISOString());

      // 最近のボードカード数を取得
      const { data: boards } = await supabase
        .from('boards')
        .select('id')
        .eq('nest_id', nestId);
      
      const boardIds = boards?.map(board => board.id) || [];
      const { count: cardCount } = await supabase
        .from('board_cards')
        .select('*', { count: 'exact', head: true })
        .in('board_id', boardIds)
        .gte('created_at', oneWeekAgo.toISOString());

      return {
        lastUpdated,
        recentChatMessages: chatCount || 0,
        recentMeetings: meetingCount || 0,
        recentBoardCards: cardCount || 0
      };
    } catch (error) {
      console.error('Error checking nest activity:', error);
      return {
        lastUpdated: null,
        recentChatMessages: 0,
        recentMeetings: 0,
        recentBoardCards: 0
      };
    }
  }
} 