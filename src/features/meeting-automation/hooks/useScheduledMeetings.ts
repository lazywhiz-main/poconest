// ミーティング自動化システム - Reactフック
// 実行日: 2025-01-09

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../services/supabase/client';
import { MeetingAutomationService } from '../services/MeetingAutomationService';
import type {
  ScheduledMeeting,
  CreateScheduledMeetingRequest,
  UpdateScheduledMeetingRequest,
  ScheduledMeetingStatus,
  PlatformType,
  DbScheduledMeeting
} from '../types/scheduledMeeting';
import { dbToScheduledMeeting } from '../types/scheduledMeeting';

interface UseScheduledMeetingsResult {
  // 状態
  meetings: ScheduledMeeting[];
  upcomingMeetings: ScheduledMeeting[];
  isLoading: boolean;
  error: string | null;

  // 操作
  createMeeting: (request: CreateScheduledMeetingRequest) => Promise<ScheduledMeeting | null>;
  updateMeeting: (id: string, updates: UpdateScheduledMeetingRequest) => Promise<boolean>;
  cancelMeeting: (id: string) => Promise<boolean>;
  deleteMeeting: (id: string) => Promise<boolean>;
  getMeetingById: (id: string) => ScheduledMeeting | undefined;
  getMeetingsByStatus: (status: ScheduledMeetingStatus) => ScheduledMeeting[];
  getMeetingsByPlatform: (platform: PlatformType) => ScheduledMeeting[];
  refreshMeetings: () => Promise<void>;
}

export const useScheduledMeetings = (nestId: string): UseScheduledMeetingsResult => {
  const [meetings, setMeetings] = useState<ScheduledMeeting[]>([]);
  const [upcomingMeetings, setUpcomingMeetings] = useState<ScheduledMeeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ミーティング一覧を読み込み
  const loadMeetings = useCallback(async () => {
    if (!nestId) return;

    try {
      setIsLoading(true);
      setError(null);

      console.log('[useScheduledMeetings] Loading meetings for nest:', nestId);

      // 全ミーティングと今後のミーティングを並行取得
      const [allMeetings, upcoming] = await Promise.all([
        MeetingAutomationService.getScheduledMeetings(nestId),
        MeetingAutomationService.getUpcomingMeetings(nestId)
      ]);

      console.log('[useScheduledMeetings] Loaded meetings:', {
        total: allMeetings.length,
        upcoming: upcoming.length
      });

      setMeetings(allMeetings);
      setUpcomingMeetings(upcoming);

    } catch (err) {
      console.error('[useScheduledMeetings] Load error:', err);
      setError(err instanceof Error ? err.message : 'ミーティングの読み込みに失敗しました');
    } finally {
      setIsLoading(false);
    }
  }, [nestId]);

  // 初回読み込み
  useEffect(() => {
    loadMeetings();
  }, [loadMeetings]);

  // リアルタイム更新の設定
  useEffect(() => {
    if (!nestId) return;

    console.log('[useScheduledMeetings] Setting up real-time subscription for nest:', nestId);

    // Supabase Realtimeで変更を監視
    const subscription = supabase
      .channel('scheduled_meetings_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'scheduled_meetings',
          filter: `nest_id=eq.${nestId}`
        },
        (payload) => {
          console.log('[useScheduledMeetings] Real-time update:', payload);
          
          if (payload.eventType === 'INSERT') {
            const newMeeting = dbToScheduledMeeting(payload.new as DbScheduledMeeting);
            setMeetings(prev => {
              // 重複チェック
              if (prev.find(m => m.id === newMeeting.id)) {
                return prev;
              }
              return [...prev, newMeeting].sort((a, b) => 
                new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
              );
            });
            
            // 今後のミーティングにも追加（条件に合致する場合）
            if (newMeeting.status === 'scheduled' && newMeeting.startTime > new Date()) {
              setUpcomingMeetings(prev => {
                if (prev.find(m => m.id === newMeeting.id)) {
                  return prev;
                }
                return [...prev, newMeeting].sort((a, b) => 
                  new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
                );
              });
            }
            
          } else if (payload.eventType === 'UPDATE') {
            const updatedMeeting = dbToScheduledMeeting(payload.new as DbScheduledMeeting);
            
            setMeetings(prev => prev.map(meeting => 
              meeting.id === updatedMeeting.id ? updatedMeeting : meeting
            ));
            
            setUpcomingMeetings(prev => {
              // 条件に合致しなくなった場合は削除
              if (updatedMeeting.status !== 'scheduled' || updatedMeeting.startTime <= new Date()) {
                return prev.filter(m => m.id !== updatedMeeting.id);
              }
              // 条件に合致する場合は更新または追加
              const existingIndex = prev.findIndex(m => m.id === updatedMeeting.id);
              if (existingIndex >= 0) {
                return prev.map(meeting => 
                  meeting.id === updatedMeeting.id ? updatedMeeting : meeting
                );
              } else {
                return [...prev, updatedMeeting].sort((a, b) => 
                  new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
                );
              }
            });
            
          } else if (payload.eventType === 'DELETE') {
            const deletedId = payload.old.id;
            setMeetings(prev => prev.filter(meeting => meeting.id !== deletedId));
            setUpcomingMeetings(prev => prev.filter(meeting => meeting.id !== deletedId));
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [nestId]);

  // 新しいミーティング作成
  const createMeeting = useCallback(async (request: CreateScheduledMeetingRequest): Promise<ScheduledMeeting | null> => {
    try {
      setError(null);
      console.log('[useScheduledMeetings] Creating meeting:', request);

      const meeting = await MeetingAutomationService.scheduleAutoMeeting(request);
      
      if (meeting) {
        console.log('[useScheduledMeetings] Meeting created successfully:', meeting.id);
        // リアルタイム更新で自動的に追加されるので、手動での更新は不要
      }
      
      return meeting;

    } catch (err) {
      console.error('[useScheduledMeetings] Create meeting error:', err);
      const errorMessage = err instanceof Error ? err.message : 'ミーティングの作成に失敗しました';
      setError(errorMessage);
      return null;
    }
  }, []);

  // ミーティング更新
  const updateMeeting = useCallback(async (id: string, updates: UpdateScheduledMeetingRequest): Promise<boolean> => {
    try {
      setError(null);
      console.log('[useScheduledMeetings] Updating meeting:', { id, updates });

      const success = await MeetingAutomationService.updateScheduledMeeting(id, updates);
      
      if (success) {
        console.log('[useScheduledMeetings] Meeting updated successfully:', id);
        // リアルタイム更新で自動的に更新されるので、手動での更新は不要
      }
      
      return success;

    } catch (err) {
      console.error('[useScheduledMeetings] Update meeting error:', err);
      const errorMessage = err instanceof Error ? err.message : 'ミーティングの更新に失敗しました';
      setError(errorMessage);
      return false;
    }
  }, []);

  // ミーティングキャンセル
  const cancelMeeting = useCallback(async (id: string): Promise<boolean> => {
    try {
      setError(null);
      console.log('[useScheduledMeetings] Cancelling meeting:', id);

      const success = await MeetingAutomationService.cancelScheduledMeeting(id);
      
      if (success) {
        console.log('[useScheduledMeetings] Meeting cancelled successfully:', id);
        // リアルタイム更新で自動的に更新されるので、手動での更新は不要
      }
      
      return success;

    } catch (err) {
      console.error('[useScheduledMeetings] Cancel meeting error:', err);
      const errorMessage = err instanceof Error ? err.message : 'ミーティングのキャンセルに失敗しました';
      setError(errorMessage);
      return false;
    }
  }, []);

  // ミーティング削除
  const deleteMeeting = useCallback(async (id: string): Promise<boolean> => {
    try {
      setError(null);
      console.log('[useScheduledMeetings] Deleting meeting:', id);

      const success = await MeetingAutomationService.deleteScheduledMeeting(id);
      
      if (success) {
        console.log('[useScheduledMeetings] Meeting deleted successfully:', id);
        // リアルタイム更新で自動的に削除されるので、手動での更新は不要
      }
      
      return success;

    } catch (err) {
      console.error('[useScheduledMeetings] Delete meeting error:', err);
      const errorMessage = err instanceof Error ? err.message : 'ミーティングの削除に失敗しました';
      setError(errorMessage);
      return false;
    }
  }, []);

  // IDでミーティング取得
  const getMeetingById = useCallback((id: string): ScheduledMeeting | undefined => {
    return meetings.find(meeting => meeting.id === id);
  }, [meetings]);

  // ステータス別ミーティング取得
  const getMeetingsByStatus = useCallback((status: ScheduledMeetingStatus): ScheduledMeeting[] => {
    return meetings.filter(meeting => meeting.status === status);
  }, [meetings]);

  // プラットフォーム別ミーティング取得
  const getMeetingsByPlatform = useCallback((platform: PlatformType): ScheduledMeeting[] => {
    return meetings.filter(meeting => meeting.platformType === platform);
  }, [meetings]);

  // 手動更新
  const refreshMeetings = useCallback(async (): Promise<void> => {
    await loadMeetings();
  }, [loadMeetings]);

  return {
    // 状態
    meetings,
    upcomingMeetings,
    isLoading,
    error,

    // 操作
    createMeeting,
    updateMeeting,
    cancelMeeting,
    deleteMeeting,
    getMeetingById,
    getMeetingsByStatus,
    getMeetingsByPlatform,
    refreshMeetings
  };
}; 