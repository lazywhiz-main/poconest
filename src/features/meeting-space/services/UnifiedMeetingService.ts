import { supabase } from '../../../services/supabase/client';
import { Meeting } from '../types/meeting';
import { ScheduledMeeting, dbToScheduledMeeting } from '../../meeting-automation/types/scheduledMeeting';
import { StorageService } from '../../../services/StorageService';
import { 
  UnifiedMeeting, 
  scheduledMeetingToUnified, 
  actualMeetingToUnified,
  sortUnifiedMeetings,
  filterUnifiedMeetings
} from '../types/unifiedMeeting';

export class UnifiedMeetingService {
  /**
   * 指定されたNestの統合ミーティングリストを取得
   */
  async getMeetingsForNest(nestId: string): Promise<UnifiedMeeting[]> {
    try {
      // 並列で両方のテーブルからデータを取得
      const [scheduledResult, actualResult] = await Promise.all([
        this.getScheduledMeetings(nestId),
        this.getActualMeetings(nestId)
      ]);

      // 統合形式に変換
      const scheduledUnified = scheduledResult.map(scheduledMeetingToUnified);
      const actualUnified = actualResult.map(actualMeetingToUnified);

      // 重複を除去（scheduled_meetings.created_meeting_id が存在する場合）
      const deduplicated = this.removeDuplicates([...scheduledUnified, ...actualUnified]);

      // 日付順でソート
      return sortUnifiedMeetings(deduplicated);
    } catch (error) {
      console.error('Failed to fetch unified meetings:', error);
      throw error;
    }
  }

  /**
   * 予約ミーティングを取得
   */
  private async getScheduledMeetings(nestId: string): Promise<ScheduledMeeting[]> {
    const { data, error } = await supabase
      .from('scheduled_meetings')
      .select('*')
      .eq('nest_id', nestId)
      .order('start_time', { ascending: false });

    if (error) throw error;

    return (data || []).map(dbToScheduledMeeting);
  }

  /**
   * 実際のミーティングを取得
   */
  private async getActualMeetings(nestId: string): Promise<Meeting[]> {
    const { data, error } = await supabase
      .from('meetings')
      .select('*')
      .eq('nest_id', nestId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data || [];
  }

  /**
   * 重複を除去（予約ミーティングから実際のミーティングが作成された場合）
   */
  private removeDuplicates(meetings: UnifiedMeeting[]): UnifiedMeeting[] {
    const result: UnifiedMeeting[] = [];
    const actualMeetingIds = new Set<string>();

    // まず、すべての actual ミーティングIDを収集
    meetings.forEach(meeting => {
      if (meeting.type === 'actual' && meeting.actualMeetingId) {
        actualMeetingIds.add(meeting.actualMeetingId);
      }
    });

    // 重複チェックしながら追加
    meetings.forEach(meeting => {
      if (meeting.type === 'scheduled') {
        // 予約ミーティングが実際のミーティングとして既に存在する場合はスキップ
        if (meeting.actualMeetingId && actualMeetingIds.has(meeting.actualMeetingId)) {
          // ただし、予約ミーティング情報は実際のミーティングにマージ
          const actualMeetingIndex = result.findIndex(
            m => m.type === 'actual' && m.actualMeetingId === meeting.actualMeetingId
          );
          
          if (actualMeetingIndex >= 0) {
            // 自動化情報を実際のミーティングに追加
            result[actualMeetingIndex] = {
              ...result[actualMeetingIndex],
              scheduledMeetingId: meeting.scheduledMeetingId,
              automation: meeting.automation,
            };
          }
          return; // 予約ミーティング自体は追加しない
        }
      }
      
      result.push(meeting);
    });

    return result;
  }

  /**
   * 統合ミーティングの検索・フィルタリング
   */
  async searchMeetings(
    nestId: string,
    options: {
      query?: string;
      status?: string[];
      type?: ('scheduled' | 'actual')[];
      sortBy?: 'date' | 'title';
    } = {}
  ): Promise<UnifiedMeeting[]> {
    const allMeetings = await this.getMeetingsForNest(nestId);
    
    const filtered = filterUnifiedMeetings(allMeetings, {
      query: options.query,
      status: options.status,
      type: options.type,
    });

    return sortUnifiedMeetings(filtered, options.sortBy);
  }

  /**
   * 予約ミーティングから実際のミーティングへの移行
   */
  async migrateScheduledToActual(scheduledMeetingId: string): Promise<Meeting> {
    try {
      // 予約ミーティング情報を取得
      const { data: scheduledData, error: scheduledError } = await supabase
        .from('scheduled_meetings')
        .select('*')
        .eq('id', scheduledMeetingId)
        .single();

      if (scheduledError || !scheduledData) {
        throw new Error('Scheduled meeting not found');
      }

      const scheduled = dbToScheduledMeeting(scheduledData);

      // 実際のミーティングを作成
      const { data: meetingData, error: meetingError } = await supabase
        .from('meetings')
        .insert({
          title: scheduled.title,
          description: scheduled.description,
          start_time: scheduled.startTime.toISOString(),
          end_time: new Date(scheduled.startTime.getTime() + scheduled.duration * 60000).toISOString(),
          nest_id: scheduled.nestId,
          status: 'in_progress',
          participants: scheduled.participants.map(email => ({ email, name: email, id: email })),
          uploaded_files: [],
          tags: [],
        })
        .select()
        .single();

      if (meetingError || !meetingData) {
        throw new Error('Failed to create actual meeting');
      }

      // 予約ミーティングの created_meeting_id を更新
      await supabase
        .from('scheduled_meetings')
        .update({
          created_meeting_id: meetingData.id,
          status: 'in_progress',
        })
        .eq('id', scheduledMeetingId);

      return meetingData;
    } catch (error) {
      console.error('Failed to migrate scheduled to actual meeting:', error);
      throw error;
    }
  }

  /**
   * ミーティングの削除（論理削除 + ストレージファイル削除）
   */
  async deleteMeeting(unifiedMeeting: UnifiedMeeting): Promise<void> {
    try {
      if (unifiedMeeting.type === 'scheduled' && unifiedMeeting.scheduledMeetingId) {
        // 予約ミーティングの削除
        await supabase
          .from('scheduled_meetings')
          .update({ status: 'cancelled' })
          .eq('id', unifiedMeeting.scheduledMeetingId);
      } else if (unifiedMeeting.type === 'actual' && unifiedMeeting.actualMeetingId) {
        // ストレージからオーディオファイルを削除
        try {
          await StorageService.deleteMeetingAudioFiles(unifiedMeeting.actualMeetingId);
        } catch (storageError) {
          console.error('ストレージファイル削除エラー（処理は続行）:', storageError);
          // ストレージ削除に失敗しても、ミーティング削除は続行
        }

        // 実際のミーティングの論理削除
        await supabase
          .from('meetings')
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', unifiedMeeting.actualMeetingId);
      }
    } catch (error) {
      console.error('Failed to delete meeting:', error);
      throw error;
    }
  }
}

// シングルトンインスタンス
export const unifiedMeetingService = new UnifiedMeetingService(); 