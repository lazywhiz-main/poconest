import { useState, useEffect, useCallback } from 'react';
import { UnifiedMeeting } from '../types/unifiedMeeting';
import { unifiedMeetingService } from '../services/UnifiedMeetingService';
import { supabase } from '../../../services/supabase/client';

interface UseUnifiedMeetingsResult {
  meetings: UnifiedMeeting[];
  selectedMeeting: UnifiedMeeting | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  loadMeetings: () => Promise<void>;
  searchMeetings: (options: {
    query?: string;
    status?: string[];
    type?: ('scheduled' | 'actual')[];
    sortBy?: 'date' | 'title';
  }) => Promise<void>;
  selectMeeting: (meeting: UnifiedMeeting | null) => void;
  deleteMeeting: (meeting: UnifiedMeeting) => Promise<void>;
  migrateScheduledToActual: (scheduledMeetingId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export const useUnifiedMeetings = (nestId: string): UseUnifiedMeetingsResult => {
  const [meetings, setMeetings] = useState<UnifiedMeeting[]>([]);
  const [selectedMeeting, setSelectedMeeting] = useState<UnifiedMeeting | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ミーティング一覧の読み込み
  const loadMeetings = useCallback(async () => {
    if (!nestId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const fetchedMeetings = await unifiedMeetingService.getMeetingsForNest(nestId);
      setMeetings(fetchedMeetings);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load meetings';
      setError(errorMessage);
      console.error('Failed to load unified meetings:', err);
    } finally {
      setIsLoading(false);
    }
  }, [nestId]);

  // 検索・フィルタリング
  const searchMeetings = useCallback(async (options: {
    query?: string;
    status?: string[];
    type?: ('scheduled' | 'actual')[];
    sortBy?: 'date' | 'title';
  }) => {
    if (!nestId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const filteredMeetings = await unifiedMeetingService.searchMeetings(nestId, options);
      setMeetings(filteredMeetings);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to search meetings';
      setError(errorMessage);
      console.error('Failed to search unified meetings:', err);
    } finally {
      setIsLoading(false);
    }
  }, [nestId]);

  // ミーティング選択
  const selectMeeting = useCallback((meeting: UnifiedMeeting | null) => {
    setSelectedMeeting(meeting);
  }, []);

  // ミーティング削除
  const deleteMeeting = useCallback(async (meeting: UnifiedMeeting) => {
    try {
      setError(null);
      
      await unifiedMeetingService.deleteMeeting(meeting);
      
      // 削除されたミーティングをローカル状態からも除去
      setMeetings(prev => prev.filter(m => m.id !== meeting.id));
      
      // 選択されていたミーティングの場合は選択を解除
      if (selectedMeeting?.id === meeting.id) {
        setSelectedMeeting(null);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete meeting';
      setError(errorMessage);
      console.error('Failed to delete meeting:', err);
      throw err;
    }
  }, [selectedMeeting]);

  // 予約ミーティングから実際のミーティングへの移行
  const migrateScheduledToActual = useCallback(async (scheduledMeetingId: string) => {
    try {
      setError(null);
      
      await unifiedMeetingService.migrateScheduledToActual(scheduledMeetingId);
      
      // 移行後にミーティング一覧を再読み込み
      await loadMeetings();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to migrate meeting';
      setError(errorMessage);
      console.error('Failed to migrate scheduled meeting:', err);
      throw err;
    }
  }, [loadMeetings]);

  // 手動リフレッシュ
  const refresh = useCallback(async () => {
    await loadMeetings();
  }, [loadMeetings]);

  // 初期読み込み
  useEffect(() => {
    loadMeetings();
  }, [loadMeetings]);

  // リアルタイム更新の設定
  useEffect(() => {
    if (!nestId) return;

    // meetings テーブルの変更を監視
    const meetingsSubscription = supabase
      .channel(`meetings-${nestId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'meetings',
          filter: `nest_id=eq.${nestId}`
        },
        (payload) => {
          console.log('Meetings table change:', payload);
          // 変更があった場合は再読み込み
          loadMeetings();
        }
      )
      .subscribe();

    // scheduled_meetings テーブルの変更を監視
    const scheduledSubscription = supabase
      .channel(`scheduled-meetings-${nestId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'scheduled_meetings',
          filter: `nest_id=eq.${nestId}`
        },
        (payload) => {
          console.log('Scheduled meetings table change:', payload);
          // 変更があった場合は再読み込み
          loadMeetings();
        }
      )
      .subscribe();

    return () => {
      meetingsSubscription.unsubscribe();
      scheduledSubscription.unsubscribe();
    };
  }, [nestId, loadMeetings]);

  return {
    meetings,
    selectedMeeting,
    isLoading,
    error,
    loadMeetings,
    searchMeetings,
    selectMeeting,
    deleteMeeting,
    migrateScheduledToActual,
    refresh,
  };
}; 