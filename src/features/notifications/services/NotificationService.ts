import { supabase } from '../../../services/supabase/client';
import type {
  Notification,
  NotificationType,
  NotificationPriority,
  NotificationStatus,
  CreateNotificationRequest,
  UpdateNotificationRequest,
  NotificationFilter,
  NotificationStats,
  NotificationData,
  NotificationAction
} from '../types/notification';

export class NotificationService {
  private static readonly TABLE_NAME = 'notifications';

  /**
   * 通知作成
   */
  static async createNotification(request: CreateNotificationRequest): Promise<Notification | null> {
    try {
      const data = {
        user_id: request.userId,
        type: request.type,
        title: request.title,
        content: request.content,
        data: request.data || {},
        is_read: false // statusの代わりにis_readを使用
      };

      const { data: result, error } = await supabase
        .from(this.TABLE_NAME)
        .insert([data])
        .select()
        .single();

      if (error) {
        console.error('[NotificationService] Create notification error:', error);
        throw error;
      }

      const notification = this.mapDbToNotification(result);
      
      // ブラウザ通知を送信
      await this.sendBrowserNotification(notification);
      
      console.log(`[NotificationService] Notification created: ${notification.id}`);
      return notification;
    } catch (error) {
      console.error('[NotificationService] Failed to create notification:', error);
      return null;
    }
  }

  /**
   * バックグラウンドジョブ完了時の通知作成
   */
  static async createJobCompletionNotification(
    userId: string,
    jobType: string,
    jobId: string,
    meetingId: string,
    success: boolean,
    result?: any,
    errorMessage?: string
  ): Promise<Notification | null> {
    const type = this.mapJobTypeToNotificationType(jobType);
    const title = success 
      ? this.getJobSuccessTitle(jobType)
      : this.getJobFailureTitle(jobType);
    
    const content = success
      ? this.getJobSuccessContent(jobType, result)
      : this.getJobFailureContent(jobType, errorMessage);

    const data: NotificationData = {
      jobId,
      jobType,
      meetingId,
      result: success ? result : undefined,
      actions: success ? this.getJobSuccessActions(jobType, meetingId, result) : []
    };

    return this.createNotification({
      userId,
      type,
      title,
      content,
      data
    });
  }

  /**
   * AI洞察通知の作成
   */
  static async createAIInsightNotification(
    userId: string,
    insight: {
      title: string;
      content: string;
      confidence: number;
      relatedItems: string[];
      recommendations: string[];
    },
    nestId?: string
  ): Promise<Notification | null> {
    return this.createNotification({
      userId,
      type: 'ai_insight',
      title: `🤖 ${insight.title}`,
      content: insight.content,
      data: {
        nestId,
        aiInsight: {
          confidence: insight.confidence,
          relatedItems: insight.relatedItems,
          recommendations: insight.recommendations
        },
        actions: [
          {
            id: 'view_insight',
            label: '詳細を見る',
            type: 'primary',
            action: 'navigate',
            payload: { nestId, section: 'insights' }
          },
          {
            id: 'dismiss',
            label: '閉じる',
            type: 'secondary',
            action: 'dismiss'
          }
        ]
      }
    });
  }

  /**
   * 通知一覧取得
   */
  static async getNotifications(
    userId: string,
    filter?: NotificationFilter,
    limit: number = 50,
    offset: number = 0
  ): Promise<Notification[]> {
    try {
      let query = supabase
        .from(this.TABLE_NAME)
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      // フィルター適用
      if (filter) {
        if (filter.types?.length) {
          query = query.in('type', filter.types);
        }
        if (filter.status?.length) {
          // statusフィルターをis_readに変換
          const isReadValues: boolean[] = [];
          if (filter.status.includes('read')) isReadValues.push(true);
          if (filter.status.includes('unread')) isReadValues.push(false);
          if (isReadValues.length > 0) {
            query = query.in('is_read', isReadValues);
          }
        }
        // priority フィルターを一時的に無効化（カラムが存在しないため）
        // if (filter.priorities?.length) {
        //   query = query.in('priority', filter.priorities);
        // }
        if (filter.dateRange) {
          query = query
            .gte('created_at', filter.dateRange.start.toISOString())
            .lte('created_at', filter.dateRange.end.toISOString());
        }
      }

      const { data, error } = await query;

      if (error) {
        console.error('[NotificationService] Get notifications error:', error);
        throw error;
      }

      return data?.map(item => this.mapDbToNotification(item)) || [];
    } catch (error) {
      console.error('[NotificationService] Failed to get notifications:', error);
      return [];
    }
  }

  /**
   * 未読通知数取得
   */
  static async getUnreadCount(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from(this.TABLE_NAME)
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) {
        console.error('[NotificationService] Get unread count error:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('[NotificationService] Failed to get unread count:', error);
      return 0;
    }
  }

  /**
   * 通知を既読にマーク
   */
  static async markAsRead(notificationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from(this.TABLE_NAME)
        .update({ 
          is_read: true // statusとread_atの代わりにis_readのみ使用
        })
        .eq('id', notificationId);

      if (error) {
        console.error('[NotificationService] Mark as read error:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[NotificationService] Failed to mark as read:', error);
      return false;
    }
  }

  /**
   * 全ての通知を既読にマーク
   */
  static async markAllAsRead(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from(this.TABLE_NAME)
        .update({ 
          is_read: true // statusとread_atの代わりにis_readのみ使用
        })
        .eq('user_id', userId)
        .eq('is_read', false); // 未読のもののみ更新

      if (error) {
        console.error('[NotificationService] Mark all as read error:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[NotificationService] Failed to mark all as read:', error);
      return false;
    }
  }

  /**
   * 通知削除
   */
  static async deleteNotification(notificationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from(this.TABLE_NAME)
        .delete()
        .eq('id', notificationId);

      if (error) {
        console.error('[NotificationService] Delete notification error:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[NotificationService] Failed to delete notification:', error);
      return false;
    }
  }

  /**
   * 通知統計取得
   */
  static async getStats(userId: string): Promise<NotificationStats> {
    try {
      const { data, error } = await supabase
        .from(this.TABLE_NAME)
        .select('type, is_read, created_at')
        .eq('user_id', userId);

      if (error) {
        console.error('[NotificationService] Get stats error:', error);
        throw error;
      }

      const stats: NotificationStats = {
        total: data?.length || 0,
        unread: data?.filter(n => !n.is_read).length || 0,
        byType: {} as Record<NotificationType, number>,
        byPriority: {} as Record<NotificationPriority, number>,
        recent: 0
      };

      const now = new Date();
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      data?.forEach(notification => {
        // タイプ別集計
        stats.byType[notification.type as NotificationType] = 
          (stats.byType[notification.type as NotificationType] || 0) + 1;
        
        // 優先度別集計を一時的に無効化（priorityカラムが存在しないため）
        // stats.byPriority[notification.priority as NotificationPriority] = 
        //   (stats.byPriority[notification.priority as NotificationPriority] || 0) + 1;
        
        // 24時間以内の通知
        if (new Date(notification.created_at) > twentyFourHoursAgo) {
          stats.recent++;
        }
      });

      return stats;
    } catch (error) {
      console.error('[NotificationService] Failed to get stats:', error);
      return {
        total: 0,
        unread: 0,
        byType: {} as Record<NotificationType, number>,
        byPriority: {} as Record<NotificationPriority, number>,
        recent: 0
      };
    }
  }

  /**
   * ブラウザ通知送信
   */
  private static async sendBrowserNotification(notification: Notification): Promise<void> {
    try {
      // 通知許可確認
      if (Notification.permission !== 'granted') {
        return;
      }

      // 一旦全ての通知でブラウザ通知を送信（テスト用）
      // if (!['high', 'urgent'].includes(notification.priority)) {
      //   return;
      // }

      const options: NotificationOptions = {
        body: notification.content,
        icon: '/favicon.ico',
        badge: '/notification-badge.png',
        tag: notification.id,
        requireInteraction: notification.priority === 'urgent',
        silent: notification.priority === 'low'
      };

      const browserNotification = new Notification(notification.title, options);

      // クリック時の処理
      browserNotification.onclick = () => {
        window.focus();
        this.handleNotificationClick(notification);
        browserNotification.close();
      };

      // 自動閉じる
      setTimeout(() => {
        browserNotification.close();
      }, 5000);

    } catch (error) {
      console.error('[NotificationService] Failed to send browser notification:', error);
    }
  }

  /**
   * 通知クリック処理
   */
  private static handleNotificationClick(notification: Notification): void {
    // 自動で既読にマーク
    this.markAsRead(notification.id);

    // データに基づいてナビゲーション
    if (notification.data.meetingId) {
      window.location.hash = `#/meeting/${notification.data.meetingId}`;
    } else if (notification.data.nestId) {
      window.location.hash = `#/nest/${notification.data.nestId}`;
    }
  }

  /**
   * データベース形式からアプリ形式に変換
   */
  private static mapDbToNotification(dbItem: any): Notification {
    return {
      id: dbItem.id,
      userId: dbItem.user_id,
      type: dbItem.type,
      title: dbItem.title,
      content: dbItem.content,
      priority: 'normal', // priorityカラムがないのでデフォルト値
      status: dbItem.is_read ? 'read' : 'unread', // is_readからstatusに変換
      data: dbItem.data || {},
      createdAt: new Date(dbItem.created_at),
      // updatedAt: dbItem.updated_at ? new Date(dbItem.updated_at) : undefined, // カラムなし
      readAt: dbItem.is_read ? new Date(dbItem.created_at) : undefined, // 簡易実装
      actionable: Boolean(dbItem.data?.actions?.length)
    };
  }

  /**
   * ジョブタイプから通知タイプにマッピング
   */
  private static mapJobTypeToNotificationType(jobType: string): NotificationType {
    switch (jobType) {
      case 'ai_summary': return 'ai_summary';
      case 'card_extraction': return 'card_extraction';
      case 'transcription': return 'transcription';
      default: return 'system';
    }
  }

  /**
   * ジョブ成功時のタイトル生成
   */
  private static getJobSuccessTitle(jobType: string): string {
    switch (jobType) {
      case 'ai_summary': return '✅ AI要約が完了しました';
      case 'card_extraction': return '✅ カード抽出が完了しました';
      case 'transcription': return '✅ 転写が完了しました';
      default: return '✅ 処理が完了しました';
    }
  }

  /**
   * ジョブ失敗時のタイトル生成
   */
  private static getJobFailureTitle(jobType: string): string {
    switch (jobType) {
      case 'ai_summary': return '❌ AI要約に失敗しました';
      case 'card_extraction': return '❌ カード抽出に失敗しました';
      case 'transcription': return '❌ 転写に失敗しました';
      default: return '❌ 処理に失敗しました';
    }
  }

  /**
   * ジョブ成功時のコンテンツ生成
   */
  private static getJobSuccessContent(jobType: string, result?: any): string {
    switch (jobType) {
      case 'ai_summary': 
        return result?.summary ? `要約: ${result.summary.substring(0, 100)}...` : 'ミーティングの要約を作成しました。';
      case 'card_extraction':
        const cardCount = result?.cards?.length || 0;
        return `${cardCount}個のカードを抽出しました。`;
      case 'transcription':
        return '音声の転写が完了しました。';
      default:
        return '処理が正常に完了しました。';
    }
  }

  /**
   * ジョブ失敗時のコンテンツ生成
   */
  private static getJobFailureContent(jobType: string, errorMessage?: string): string {
    const baseMessage = errorMessage || '処理中にエラーが発生しました。';
    return `${baseMessage} 後でもう一度お試しください。`;
  }

  /**
   * ジョブ成功時のアクション生成
   */
  private static getJobSuccessActions(jobType: string, meetingId: string, result?: any): NotificationAction[] {
    const actions: NotificationAction[] = [
      {
        id: 'view_meeting',
        label: 'ミーティングを見る',
        type: 'primary',
        action: 'navigate',
        payload: { meetingId }
      }
    ];

    if (jobType === 'ai_summary' && result?.summary) {
      actions.unshift({
        id: 'copy_summary',
        label: '要約をコピー',
        type: 'secondary',
        action: 'copy',
        payload: { text: result.summary }
      });
    }

    return actions;
  }
} 