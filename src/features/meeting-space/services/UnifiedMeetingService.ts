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
   * ミーティングに関連するカードを一括削除
   */
  private async deleteRelatedCards(meetingId: string): Promise<void> {
    try {
      console.log(`🗑️ [UnifiedMeetingService] ミーティング ${meetingId} の関連カード削除開始`);

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
        console.log(`🗑️ [UnifiedMeetingService] 直接メタデータ関連カード数: ${directMetadataCards.length}`);
      }
      
      if (aiMetadataCards) {
        aiMetadataCards.forEach(card => relatedCardIds.add(card.id));
        console.log(`🗑️ [UnifiedMeetingService] AIメタデータ関連カード数: ${aiMetadataCards.length}`);
      }

      if (relatedCardIds.size === 0) {
        console.log(`🗑️ [UnifiedMeetingService] 関連カードなし: ${meetingId}`);
        return;
      }

      console.log(`🗑️ [UnifiedMeetingService] 削除対象カード数: ${relatedCardIds.size}`);

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

      console.log(`🗑️ [UnifiedMeetingService] ミーティング ${meetingId} の関連カード削除完了: ${relatedCardIds.size}件`);

    } catch (error) {
      console.error(`🗑️ [UnifiedMeetingService] 関連カード削除エラー:`, error);
      throw error;
    }
  }

  /**
   * ミーティングの削除（論理削除 + ストレージファイル削除 + 関連カード削除）
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
        // 関連するカードを一括削除
        try {
          await this.deleteRelatedCards(unifiedMeeting.actualMeetingId);
        } catch (cardError) {
          console.error('関連カード削除エラー（処理は続行）:', cardError);
          // カード削除に失敗しても、ミーティング削除は続行
        }

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