// ミーティング自動化システム - サービスクラス
// 実行日: 2025-01-09

import { supabase } from '../../../services/supabase/client';
import { StorageService } from '../../../services/StorageService';
import type {
  ScheduledMeeting,
  DbScheduledMeeting,
  CreateScheduledMeetingRequest,
  UpdateScheduledMeetingRequest,
  ScheduledMeetingLog,
  DbScheduledMeetingLog,
  PlatformType,
  ScheduledMeetingStatus,
  AutomationLogAction,
  AutomationLogStatus
} from '../types/scheduledMeeting';
import {
  dbToScheduledMeeting,
  scheduledMeetingToDb,
  dbToScheduledMeetingLog,
  validateMeetingUrl,
  validateMeetingTime
} from '../types/scheduledMeeting';

export class MeetingAutomationService {
  /**
   * 新しい予約ミーティングを作成
   */
  static async scheduleAutoMeeting(request: CreateScheduledMeetingRequest): Promise<ScheduledMeeting | null> {
    try {
      console.log('[MeetingAutomationService] Creating scheduled meeting:', request);

      // バリデーション
      if (!validateMeetingTime(request.startTime, request.duration)) {
        throw new Error('開始時間または期間が不正です');
      }

      if (request.meetingUrl && !validateMeetingUrl(request.meetingUrl, request.platformType)) {
        throw new Error('ミーティングURLが無効です');
      }

      // 認証チェック
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('認証が必要です');
      }

      // データベース形式に変換
      const dbData: Omit<DbScheduledMeeting, 'id' | 'created_at' | 'updated_at'> = {
        title: request.title,
        description: request.description,
        platform_type: request.platformType,
        meeting_url: request.meetingUrl,
        start_time: request.startTime.toISOString(),
        duration: request.duration,
        
        auto_join: request.autoJoin ?? false,
        auto_transcribe: request.autoTranscribe ?? false,
        auto_summarize: request.autoSummarize ?? false,
        auto_extract_cards: request.autoExtractCards ?? false,
        
        participants: request.participants ?? [],
        metadata: request.metadata ?? {},
        
        nest_id: request.nestId,
        created_meeting_id: undefined,
        
        status: 'scheduled',
        created_by: user.id
      };

      // データベースに挿入
      const { data, error } = await supabase
        .from('scheduled_meetings')
        .insert([dbData])
        .select()
        .single();

      if (error) {
        console.error('[MeetingAutomationService] Insert error:', error);
        throw error;
      }

      console.log('[MeetingAutomationService] Scheduled meeting created:', data.id);
      return dbToScheduledMeeting(data as DbScheduledMeeting);

    } catch (error) {
      console.error('[MeetingAutomationService] Error creating scheduled meeting:', error);
      return null;
    }
  }

  /**
   * 指定されたNestの予約ミーティング一覧を取得
   */
  static async getScheduledMeetings(nestId: string): Promise<ScheduledMeeting[]> {
    try {
      console.log('[MeetingAutomationService] Fetching scheduled meetings for nest:', nestId);

      const { data, error } = await supabase
        .from('scheduled_meetings')
        .select('*')
        .eq('nest_id', nestId)
        .order('start_time', { ascending: true });

      if (error) {
        console.error('[MeetingAutomationService] Fetch error:', error);
        throw error;
      }

      const meetings = (data || []).map((dbMeeting: DbScheduledMeeting) => 
        dbToScheduledMeeting(dbMeeting)
      );

      console.log('[MeetingAutomationService] Fetched scheduled meetings:', meetings.length);
      return meetings;

    } catch (error) {
      console.error('[MeetingAutomationService] Error fetching scheduled meetings:', error);
      return [];
    }
  }

  /**
   * 特定のステータスの予約ミーティングを取得
   */
  static async getScheduledMeetingsByStatus(
    nestId: string, 
    status: ScheduledMeetingStatus
  ): Promise<ScheduledMeeting[]> {
    try {
      console.log('[MeetingAutomationService] Fetching meetings by status:', { nestId, status });

      const { data, error } = await supabase
        .from('scheduled_meetings')
        .select('*')
        .eq('nest_id', nestId)
        .eq('status', status)
        .order('start_time', { ascending: true });

      if (error) {
        console.error('[MeetingAutomationService] Fetch by status error:', error);
        throw error;
      }

      const meetings = (data || []).map((dbMeeting: DbScheduledMeeting) => 
        dbToScheduledMeeting(dbMeeting)
      );

      console.log('[MeetingAutomationService] Fetched meetings by status:', meetings.length);
      return meetings;

    } catch (error) {
      console.error('[MeetingAutomationService] Error fetching meetings by status:', error);
      return [];
    }
  }

  /**
   * 今後のミーティングを取得
   */
  static async getUpcomingMeetings(nestId: string): Promise<ScheduledMeeting[]> {
    try {
      const now = new Date().toISOString();
      
      const { data, error } = await supabase
        .from('scheduled_meetings')
        .select('*')
        .eq('nest_id', nestId)
        .in('status', ['scheduled', 'in_progress'])
        .gte('start_time', now)
        .order('start_time', { ascending: true })
        .limit(10);

      if (error) {
        console.error('[MeetingAutomationService] Fetch upcoming error:', error);
        throw error;
      }

      return (data || []).map((dbMeeting: DbScheduledMeeting) => 
        dbToScheduledMeeting(dbMeeting)
      );

    } catch (error) {
      console.error('[MeetingAutomationService] Error fetching upcoming meetings:', error);
      return [];
    }
  }

  /**
   * 予約ミーティングを更新
   */
  static async updateScheduledMeeting(
    id: string, 
    updates: UpdateScheduledMeetingRequest
  ): Promise<boolean> {
    try {
      console.log('[MeetingAutomationService] Updating scheduled meeting:', { id, updates });

      // バリデーション
      if (updates.startTime && updates.duration && 
          !validateMeetingTime(updates.startTime, updates.duration)) {
        throw new Error('開始時間または期間が不正です');
      }

      if (updates.meetingUrl && updates.platformType && 
          !validateMeetingUrl(updates.meetingUrl, updates.platformType)) {
        throw new Error('ミーティングURLが無効です');
      }

      // データベース形式に変換
      const dbUpdates = scheduledMeetingToDb(updates as Partial<ScheduledMeeting>);

      const { error } = await supabase
        .from('scheduled_meetings')
        .update(dbUpdates)
        .eq('id', id);

      if (error) {
        console.error('[MeetingAutomationService] Update error:', error);
        throw error;
      }

      console.log('[MeetingAutomationService] Scheduled meeting updated successfully:', id);
      return true;

    } catch (error) {
      console.error('[MeetingAutomationService] Error updating scheduled meeting:', error);
      return false;
    }
  }

  /**
   * 予約ミーティングをキャンセル
   */
  static async cancelScheduledMeeting(id: string): Promise<boolean> {
    try {
      console.log('[MeetingAutomationService] Cancelling scheduled meeting:', id);

      const { error } = await supabase
        .from('scheduled_meetings')
        .update({ status: 'cancelled' })
        .eq('id', id);

      if (error) {
        console.error('[MeetingAutomationService] Cancel error:', error);
        throw error;
      }

      console.log('[MeetingAutomationService] Scheduled meeting cancelled successfully:', id);
      return true;

    } catch (error) {
      console.error('[MeetingAutomationService] Error cancelling scheduled meeting:', error);
      return false;
    }
  }

  /**
   * ミーティングに関連するカードを一括削除
   */
  private static async deleteRelatedCards(meetingId: string): Promise<void> {
    try {
      console.log(`🗑️ [MeetingAutomationService] ミーティング ${meetingId} の関連カード削除開始`);

      // 1. metadata.meeting_idで関連するカードを検索（手動追加カード用）
      const { data: directMetadataCards, error: directMetadataError } = await supabase
        .from('board_cards')
        .select('id')
        .contains('metadata', { meeting_id: meetingId });

      if (directMetadataError) {
        console.error('直接メタデータ関連カード検索エラー:', directMetadataError);
        throw directMetadataError;
      }

      // 2. metadata.ai.meeting_idで関連するカードを検索（カード抽出カード用）
      const { data: aiMetadataCards, error: aiMetadataError } = await supabase
        .from('board_cards')
        .select('id')
        .contains('metadata', { ai: { meeting_id: meetingId } });

      if (aiMetadataError) {
        console.error('AIメタデータ関連カード検索エラー:', aiMetadataError);
        throw aiMetadataError;
      }

      // 関連するカードIDを収集
      const relatedCardIds = new Set<string>();
      
      if (directMetadataCards) {
        directMetadataCards.forEach(card => relatedCardIds.add(card.id));
        console.log(`🗑️ [MeetingAutomationService] 直接メタデータ関連カード数: ${directMetadataCards.length}`);
      }
      
      if (aiMetadataCards) {
        aiMetadataCards.forEach(card => relatedCardIds.add(card.id));
        console.log(`🗑️ [MeetingAutomationService] AIメタデータ関連カード数: ${aiMetadataCards.length}`);
      }

      if (relatedCardIds.size === 0) {
        console.log(`🗑️ [MeetingAutomationService] 関連カードなし: ${meetingId}`);
        return;
      }

      console.log(`🗑️ [MeetingAutomationService] 削除対象カード数: ${relatedCardIds.size}`);

      // 関連するリレーションを削除
      const { error: relationError } = await supabase
        .from('board_card_relations')
        .delete()
        .or(`card_id.in.(${Array.from(relatedCardIds).join(',')}),related_card_id.in.(${Array.from(relatedCardIds).join(',')})`);

      if (relationError) {
        console.error('カードリレーション削除エラー:', relationError);
        // リレーション削除に失敗しても、カード削除は続行
      }

      // 関連するタグを削除
      const { error: tagError } = await supabase
        .from('board_card_tags')
        .delete()
        .in('card_id', Array.from(relatedCardIds));

      if (tagError) {
        console.error('カードタグ削除エラー:', tagError);
        // タグ削除に失敗しても、カード削除は続行
      }

      // 関連するソースを削除
      const { error: sourceError } = await supabase
        .from('board_card_sources')
        .delete()
        .in('card_id', Array.from(relatedCardIds));

      if (sourceError) {
        console.error('カードソース削除エラー:', sourceError);
        // ソース削除に失敗しても、カード削除は続行
      }

      // カード埋め込みを削除
      const { error: embeddingError } = await supabase
        .from('card_embeddings')
        .delete()
        .in('card_id', Array.from(relatedCardIds));

      if (embeddingError) {
        console.error('カード埋め込み削除エラー:', embeddingError);
        // 埋め込み削除に失敗しても、カード削除は続行
      }

      // 関係性提案を削除
      const { error: suggestionError } = await supabase
        .from('relationship_suggestions')
        .delete()
        .or(`source_card_id.in.(${Array.from(relatedCardIds).join(',')}),target_card_id.in.(${Array.from(relatedCardIds).join(',')})`);

      if (suggestionError) {
        console.error('関係性提案削除エラー:', suggestionError);
        // 提案削除に失敗しても、カード削除は続行
      }

      // カードを削除
      const { error: cardError } = await supabase
        .from('board_cards')
        .delete()
        .in('id', Array.from(relatedCardIds));

      if (cardError) {
        console.error('カード削除エラー:', cardError);
        throw cardError;
      }

      console.log(`🗑️ [MeetingAutomationService] ミーティング ${meetingId} の関連カード削除完了: ${relatedCardIds.size}件`);

    } catch (error) {
      console.error(`🗑️ [MeetingAutomationService] 関連カード削除エラー:`, error);
      throw error;
    }
  }

  /**
   * 予約ミーティングを削除（関連ファイルも削除）
   */
  static async deleteScheduledMeeting(id: string): Promise<boolean> {
    try {
      console.log('[MeetingAutomationService] Deleting scheduled meeting:', id);

      // 予約ミーティング情報を取得（関連する実際のミーティングIDを確認）
      const { data: scheduledMeeting, error: fetchError } = await supabase
        .from('scheduled_meetings')
        .select('created_meeting_id')
        .eq('id', id)
        .single();

      if (fetchError) {
        console.error('[MeetingAutomationService] Fetch error:', fetchError);
        throw fetchError;
      }

      // 関連する実際のミーティングがある場合は、そのファイルも削除
      if (scheduledMeeting?.created_meeting_id) {
        try {
          // 関連するカードを一括削除
          await this.deleteRelatedCards(scheduledMeeting.created_meeting_id);
          console.log('[MeetingAutomationService] Related meeting cards deleted:', scheduledMeeting.created_meeting_id);
        } catch (cardError) {
          console.error('[MeetingAutomationService] Related card deletion error (continuing):', cardError);
          // カード削除に失敗しても、予約ミーティング削除は続行
        }

        try {
          await StorageService.deleteMeetingAudioFiles(scheduledMeeting.created_meeting_id);
          console.log('[MeetingAutomationService] Related meeting files deleted:', scheduledMeeting.created_meeting_id);
        } catch (storageError) {
          console.error('[MeetingAutomationService] Storage deletion error (continuing):', storageError);
          // ストレージ削除に失敗しても、予約ミーティング削除は続行
        }
      }

      // 予約ミーティングを削除
      const { error } = await supabase
        .from('scheduled_meetings')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('[MeetingAutomationService] Delete error:', error);
        throw error;
      }

      console.log('[MeetingAutomationService] Scheduled meeting deleted successfully:', id);
      return true;

    } catch (error) {
      console.error('[MeetingAutomationService] Error deleting scheduled meeting:', error);
      return false;
    }
  }

  /**
   * 自動化ログを記録
   */
  static async logAutomationAction(
    scheduledMeetingId: string,
    action: AutomationLogAction,
    status: AutomationLogStatus,
    message?: string,
    metadata?: Record<string, any>
  ): Promise<boolean> {
    try {
      console.log('[MeetingAutomationService] Logging automation action:', {
        scheduledMeetingId,
        action,
        status,
        message
      });

      const { error } = await supabase
        .from('scheduled_meeting_logs')
        .insert([{
          scheduled_meeting_id: scheduledMeetingId,
          action,
          status,
          message,
          metadata: metadata || {}
        }]);

      if (error) {
        console.error('[MeetingAutomationService] Log error:', error);
        throw error;
      }

      console.log('[MeetingAutomationService] Automation action logged successfully');
      return true;

    } catch (error) {
      console.error('[MeetingAutomationService] Error logging automation action:', error);
      return false;
    }
  }

  /**
   * 自動化ログを取得
   */
  static async getAutomationLogs(scheduledMeetingId: string): Promise<ScheduledMeetingLog[]> {
    try {
      console.log('[MeetingAutomationService] Fetching automation logs:', scheduledMeetingId);

      const { data, error } = await supabase
        .from('scheduled_meeting_logs')
        .select('*')
        .eq('scheduled_meeting_id', scheduledMeetingId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[MeetingAutomationService] Fetch logs error:', error);
        throw error;
      }

      const logs = (data || []).map((dbLog: DbScheduledMeetingLog) => 
        dbToScheduledMeetingLog(dbLog)
      );

      console.log('[MeetingAutomationService] Fetched automation logs:', logs.length);
      return logs;

    } catch (error) {
      console.error('[MeetingAutomationService] Error fetching automation logs:', error);
      return [];
    }
  }

  /**
   * ミーティングステータス自動更新（バッチ処理用）
   */
  static async updateMeetingStatuses(): Promise<boolean> {
    try {
      console.log('[MeetingAutomationService] Updating meeting statuses');

      // データベース関数を呼び出し
      const { error } = await supabase.rpc('update_scheduled_meeting_status');

      if (error) {
        console.error('[MeetingAutomationService] Status update error:', error);
        throw error;
      }

      console.log('[MeetingAutomationService] Meeting statuses updated successfully');
      return true;

    } catch (error) {
      console.error('[MeetingAutomationService] Error updating meeting statuses:', error);
      return false;
    }
  }

  /**
   * プラットフォーム別のミーティング取得
   */
  static async getMeetingsByPlatform(
    nestId: string, 
    platformType: PlatformType
  ): Promise<ScheduledMeeting[]> {
    try {
      console.log('[MeetingAutomationService] Fetching meetings by platform:', { nestId, platformType });

      const { data, error } = await supabase
        .from('scheduled_meetings')
        .select('*')
        .eq('nest_id', nestId)
        .eq('platform_type', platformType)
        .order('start_time', { ascending: true });

      if (error) {
        console.error('[MeetingAutomationService] Fetch by platform error:', error);
        throw error;
      }

      const meetings = (data || []).map((dbMeeting: DbScheduledMeeting) => 
        dbToScheduledMeeting(dbMeeting)
      );

      console.log('[MeetingAutomationService] Fetched meetings by platform:', meetings.length);
      return meetings;

    } catch (error) {
      console.error('[MeetingAutomationService] Error fetching meetings by platform:', error);
      return [];
    }
  }

  /**
   * ミーティングIDでスケジュールされたミーティングを取得
   */
  static async getScheduledMeetingById(id: string): Promise<ScheduledMeeting | null> {
    try {
      console.log('[MeetingAutomationService] Fetching scheduled meeting by ID:', id);

      const { data, error } = await supabase
        .from('scheduled_meetings')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Not found
        }
        console.error('[MeetingAutomationService] Fetch by ID error:', error);
        throw error;
      }

      console.log('[MeetingAutomationService] Fetched scheduled meeting by ID');
      return dbToScheduledMeeting(data as DbScheduledMeeting);

    } catch (error) {
      console.error('[MeetingAutomationService] Error fetching scheduled meeting by ID:', error);
      return null;
    }
  }

  /**
   * 作成されたミーティングIDを関連付け
   */
  static async linkCreatedMeeting(
    scheduledMeetingId: string, 
    createdMeetingId: string
  ): Promise<boolean> {
    try {
      console.log('[MeetingAutomationService] Linking created meeting:', {
        scheduledMeetingId,
        createdMeetingId
      });

      const { error } = await supabase
        .from('scheduled_meetings')
        .update({ created_meeting_id: createdMeetingId })
        .eq('id', scheduledMeetingId);

      if (error) {
        console.error('[MeetingAutomationService] Link meeting error:', error);
        throw error;
      }

      console.log('[MeetingAutomationService] Created meeting linked successfully');
      return true;

    } catch (error) {
      console.error('[MeetingAutomationService] Error linking created meeting:', error);
      return false;
    }
  }
} 