import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../../services/supabase/client';
import { NotificationService } from '../services/NotificationService';
import type {
  Notification,
  NotificationFilter,
  NotificationStats,
  NotificationType
} from '../types/notification';

interface UseNotificationsResult {
  notifications: Notification[];
  unreadCount: number;
  stats: NotificationStats;
  isLoading: boolean;
  error: string | null;
  
  // アクション
  markAsRead: (notificationId: string) => Promise<boolean>;
  markAllAsRead: () => Promise<boolean>;
  deleteNotification: (notificationId: string) => Promise<boolean>;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  
  // フィルタリング
  setFilter: (filter: NotificationFilter) => void;
  clearFilter: () => void;
  
  // 許可関連
  requestPermission: () => Promise<boolean>;
  hasPermission: boolean;
}

interface UseNotificationsOptions {
  limit?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
  filter?: NotificationFilter;
}

export const useNotifications = (options: UseNotificationsOptions = {}): UseNotificationsResult => {
  const {
    limit = 50,
    autoRefresh = true,
    refreshInterval = 30000, // 30秒
    filter: initialFilter
  } = options;

  // State
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [stats, setStats] = useState<NotificationStats>({
    total: 0,
    unread: 0,
    byType: {} as Record<NotificationType, number>,
    byPriority: {} as any,
    recent: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilterState] = useState<NotificationFilter | undefined>(initialFilter);
  const [hasMore, setHasMore] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);

  // Refs
  const currentUser = useRef<string | null>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const offset = useRef(0);

  // 現在のユーザーID取得
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      currentUser.current = user?.id || null;
      
      if (user?.id) {
        await loadNotifications(true);
        await loadStats();
        await loadUnreadCount();
      }
    };
    
    getUser();
  }, []);

  // ブラウザ通知許可状態チェック
  useEffect(() => {
    const checkPermission = () => {
      setHasPermission(Notification.permission === 'granted');
    };
    
    checkPermission();
    
    // 定期的にチェック
    const interval = setInterval(checkPermission, 5000);
    return () => clearInterval(interval);
  }, []);

  // リアルタイム更新
  useEffect(() => {
    if (!currentUser.current) return;

    const subscription = supabase
      .channel(`notifications_${currentUser.current}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'notifications',
          filter: `user_id=eq.${currentUser.current}`
        },
        (payload) => {
          console.log('[useNotifications] Real-time update:', payload);
          handleRealtimeUpdate(payload);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [currentUser.current]);

  // 自動リフレッシュ
  useEffect(() => {
    if (!autoRefresh || !currentUser.current) return;

    refreshIntervalRef.current = setInterval(async () => {
      await loadUnreadCount();
      await loadStats();
    }, refreshInterval);

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [autoRefresh, refreshInterval, currentUser.current]);

  /**
   * 通知一覧読み込み
   */
  const loadNotifications = useCallback(async (reset: boolean = false) => {
    if (!currentUser.current) return;

    try {
      setIsLoading(true);
      setError(null);

      const currentOffset = reset ? 0 : offset.current;
      const notifications = await NotificationService.getNotifications(
        currentUser.current,
        filter,
        limit,
        currentOffset
      );

      if (reset) {
        setNotifications(notifications);
        offset.current = notifications.length;
      } else {
        setNotifications(prev => [...prev, ...notifications]);
        offset.current += notifications.length;
      }

      setHasMore(notifications.length === limit);
    } catch (err) {
      setError(err instanceof Error ? err.message : '通知の読み込みに失敗しました');
    } finally {
      setIsLoading(false);
    }
  }, [filter, limit]);

  /**
   * 未読数読み込み
   */
  const loadUnreadCount = useCallback(async () => {
    if (!currentUser.current) return;

    try {
      const count = await NotificationService.getUnreadCount(currentUser.current);
      setUnreadCount(count);
    } catch (err) {
      console.error('[useNotifications] Failed to load unread count:', err);
    }
  }, []);

  /**
   * 統計読み込み
   */
  const loadStats = useCallback(async () => {
    if (!currentUser.current) return;

    try {
      const stats = await NotificationService.getStats(currentUser.current);
      setStats(stats);
    } catch (err) {
      console.error('[useNotifications] Failed to load stats:', err);
    }
  }, []);

  /**
   * リアルタイム更新処理
   */
  const handleRealtimeUpdate = useCallback((payload: any) => {
    const eventType = payload.eventType;
    
    if (eventType === 'INSERT') {
      const newNotification = mapDbToNotification(payload.new);
      setNotifications(prev => [newNotification, ...prev]);
      setUnreadCount(prev => prev + 1);
      
      // ブラウザ通知
      if (Notification.permission === 'granted' && 
          ['high', 'urgent'].includes(newNotification.priority)) {
        showBrowserNotification(newNotification);
      }
    } else if (eventType === 'UPDATE') {
      const updatedNotification = mapDbToNotification(payload.new);
      setNotifications(prev => 
        prev.map(n => n.id === updatedNotification.id ? updatedNotification : n)
      );
      
      // 読み状態が変わった場合
      if (payload.old.status === 'unread' && payload.new.status === 'read') {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } else if (eventType === 'DELETE') {
      setNotifications(prev => prev.filter(n => n.id !== payload.old.id));
      if (payload.old.status === 'unread') {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    }
    
    // 統計更新
    loadStats();
  }, [loadStats]);

  /**
   * 既読マーク
   */
  const markAsRead = useCallback(async (notificationId: string): Promise<boolean> => {
    const success = await NotificationService.markAsRead(notificationId);
    if (success) {
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId 
            ? { ...n, status: 'read', readAt: new Date() }
            : n
        )
      );
    }
    return success;
  }, []);

  /**
   * 全て既読
   */
  const markAllAsRead = useCallback(async (): Promise<boolean> => {
    const success = await NotificationService.markAllAsRead(currentUser.current!);
    if (success) {
      setNotifications(prev => 
        prev.map(n => 
          n.status === 'unread'
            ? { ...n, status: 'read', readAt: new Date() }
            : n
        )
      );
      setUnreadCount(0);
    }
    return success;
  }, []);

  /**
   * 通知削除
   */
  const deleteNotification = useCallback(async (notificationId: string): Promise<boolean> => {
    const success = await NotificationService.deleteNotification(notificationId);
    if (success) {
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    }
    return success;
  }, []);

  /**
   * 手動リフレッシュ
   */
  const refresh = useCallback(async () => {
    await Promise.all([
      loadNotifications(true),
      loadUnreadCount(),
      loadStats()
    ]);
  }, [loadNotifications, loadUnreadCount, loadStats]);

  /**
   * 追加読み込み
   */
  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading) return;
    await loadNotifications(false);
  }, [hasMore, isLoading, loadNotifications]);

  /**
   * フィルター設定
   */
  const setFilter = useCallback((newFilter: NotificationFilter) => {
    setFilterState(newFilter);
    offset.current = 0;
    loadNotifications(true);
  }, [loadNotifications]);

  /**
   * フィルタークリア
   */
  const clearFilter = useCallback(() => {
    setFilterState(undefined);
    offset.current = 0;
    loadNotifications(true);
  }, [loadNotifications]);

  /**
   * ブラウザ通知許可要求
   */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const permission = await Notification.requestPermission();
      const granted = permission === 'granted';
      setHasPermission(granted);
      return granted;
    } catch (error) {
      console.error('[useNotifications] Failed to request permission:', error);
      return false;
    }
  }, []);

  /**
   * ブラウザ通知表示
   */
  const showBrowserNotification = useCallback((notification: Notification) => {
    try {
      const browserNotification = new Notification(notification.title, {
        body: notification.content,
        icon: '/favicon.ico',
        tag: notification.id,
        requireInteraction: notification.priority === 'urgent'
      });

      browserNotification.onclick = () => {
        window.focus();
        markAsRead(notification.id);
        browserNotification.close();
      };

      setTimeout(() => {
        browserNotification.close();
      }, 5000);
    } catch (error) {
      console.error('[useNotifications] Failed to show browser notification:', error);
    }
  }, [markAsRead]);

  /**
   * データベース形式からアプリ形式に変換
   */
  const mapDbToNotification = useCallback((dbItem: any): Notification => {
    return {
      id: dbItem.id,
      userId: dbItem.user_id,
      type: dbItem.type,
      title: dbItem.title,
      content: dbItem.content,
      priority: dbItem.priority,
      status: dbItem.status,
      data: dbItem.data || {},
      createdAt: new Date(dbItem.created_at),
      updatedAt: dbItem.updated_at ? new Date(dbItem.updated_at) : undefined,
      readAt: dbItem.read_at ? new Date(dbItem.read_at) : undefined,
      actionable: Boolean(dbItem.data?.actions?.length)
    };
  }, []);

  return {
    notifications,
    unreadCount,
    stats,
    isLoading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refresh,
    loadMore,
    setFilter,
    clearFilter,
    requestPermission,
    hasPermission
  };
}; 