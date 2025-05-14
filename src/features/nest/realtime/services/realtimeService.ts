import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '@services/supabase';
import { Platform } from 'react-native';

// Realtimeイベントタイプ
export enum NestRealtimeEventType {
  SETTINGS_CHANGED = 'SETTINGS_CHANGED',
  MEMBER_ADDED = 'MEMBER_ADDED',
  MEMBER_REMOVED = 'MEMBER_REMOVED',
  MEMBER_UPDATED = 'MEMBER_UPDATED',
  PRESENCE_CHANGED = 'PRESENCE_CHANGED',
  ACTIVITY_CREATED = 'ACTIVITY_CREATED',
  NOTIFICATION_RECEIVED = 'NOTIFICATION_RECEIVED',
}

// リアルタイムイベントリスナータイプ
export type NestRealtimeListener = (
  eventType: NestRealtimeEventType,
  payload: any
) => void;

// テーブル変更イベントの型
export type PostgresChangeEvent = RealtimePostgresChangesPayload<{
  [key: string]: any;
}>;

// テーブル監視設定
const REALTIME_TABLES = {
  NEST_SETTINGS: 'nest_settings',
  NEST_MEMBERS: 'nest_members',
  NEST_ACTIVITIES: 'nest_activities',
  NOTIFICATIONS: 'notifications',
};

class NestRealtimeService {
  private nestChannels: Map<string, RealtimeChannel> = new Map();
  private presenceChannels: Map<string, RealtimeChannel> = new Map();
  private listeners: Map<string, NestRealtimeListener[]> = new Map();
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private appState: 'active' | 'background' | 'inactive' = 'active';

  constructor() {
    this.setupAppStateListener();
  }

  // アプリの状態監視（バックグラウンド/フォアグラウンド）
  private setupAppStateListener(): void {
    if (Platform.OS === 'web') {
      // ブラウザでのvisibility変更を監視
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          this.appState = 'active';
          this.handleAppActive();
        } else {
          this.appState = 'background';
          this.handleAppBackground();
        }
      });

      // オンライン/オフライン状態を監視
      window.addEventListener('online', this.handleNetworkStateChange);
      window.addEventListener('offline', this.handleNetworkStateChange);
    } else {
      // React Native向けのAppState監視は別途AppState.addEventListenerで実装
      // この実装は、必要に応じてネイティブモジュールでの実装が必要
      console.log('Native platform app state monitoring requires platform-specific implementation');
    }
  }

  // ネットワーク状態変更ハンドラ
  private handleNetworkStateChange = (): void => {
    if (navigator.onLine) {
      this.reconnectChannels();
    } else {
      this.markAllChannelsDisconnected();
    }
  };

  // アプリがアクティブ状態になった時
  private handleAppActive(): void {
    // 接続を再開
    this.reconnectChannels();
    
    // プレゼンス状態を「オンライン」に更新
    this.updateUserPresence({ isOnline: true, lastSeen: new Date().toISOString() });
  }

  // アプリがバックグラウンド状態になった時
  private handleAppBackground(): void {
    // リアルタイム通知を最小限に抑える（バッテリー消費対策）
    this.optimizeBackgroundConnections();
    
    // プレゼンス状態を「オフライン」に更新（一定時間後）
    setTimeout(() => {
      if (this.appState === 'background') {
        this.updateUserPresence({ isOnline: false, lastSeen: new Date().toISOString() });
      }
    }, 30000); // 30秒後にオフラインに設定
  }

  // バックグラウンド時の接続最適化
  private optimizeBackgroundConnections(): void {
    // デスクトップ/Web: 全ての接続を維持
    if (Platform.OS === 'web' && !this.isMobileDevice()) {
      return;
    }

    // モバイル: 重要な通知チャネルのみ維持し、それ以外を一時停止
    this.pauseNonEssentialChannels();
  }

  // モバイルデバイス判定（Web環境での判定用）
  private isMobileDevice(): boolean {
    if (Platform.OS !== 'web') return true;
    
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    return /android|iPad|iPhone|iPod/i.test(userAgent);
  }

  // 非重要チャネルの一時停止
  private pauseNonEssentialChannels(): void {
    // 現在の実装では通知チャネルを最優先に維持し、それ以外は一時停止
    this.nestChannels.forEach((channel, nestId) => {
      // 通知関連のサブスクリプションのみ維持する場合の例
      channel.subscription.unsubscribe();
    });
  }

  // すべてのチャネルを切断状態としてマーク
  private markAllChannelsDisconnected(): void {
    this.isConnected = false;
  }

  // チャネルの再接続
  private reconnectChannels(): void {
    if (!navigator.onLine) return;
    
    this.reconnectAttempts++;
    
    if (this.reconnectAttempts > this.maxReconnectAttempts) {
      console.error('Maximum reconnection attempts reached');
      return;
    }
    
    // 既存のすべてのチャネルを再接続
    const reconnectPromises: Promise<void>[] = [];
    
    this.nestChannels.forEach((channel, nestId) => {
      const promise = this.subscribeToNest(nestId)
        .then(() => {
          // 成功したら成功を記録
        })
        .catch(error => {
          console.error(`Failed to reconnect to nest ${nestId}:`, error);
        });
      
      reconnectPromises.push(promise as unknown as Promise<void>);
    });
    
    this.presenceChannels.forEach((channel, nestId) => {
      const promise = this.subscribeToPresence(nestId)
        .then(() => {
          // 成功したら成功を記録
        })
        .catch(error => {
          console.error(`Failed to reconnect to presence ${nestId}:`, error);
        });
      
      reconnectPromises.push(promise as unknown as Promise<void>);
    });
    
    Promise.all(reconnectPromises)
      .then(() => {
        this.isConnected = true;
        this.reconnectAttempts = 0;
      })
      .catch(() => {
        // 指数バックオフで再試行
        const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 30000);
        
        if (this.reconnectTimeout) {
          clearTimeout(this.reconnectTimeout);
        }
        
        this.reconnectTimeout = setTimeout(() => {
          this.reconnectChannels();
        }, delay);
      });
  }

  // NEST変更を監視するチャネルを設定
  async subscribeToNest(nestId: string): Promise<RealtimeChannel> {
    // 既存のチャネルがある場合は一度解放
    if (this.nestChannels.has(nestId)) {
      const existingChannel = this.nestChannels.get(nestId)!;
      existingChannel.unsubscribe();
      this.nestChannels.delete(nestId);
    }
    
    const channelName = `nest-${nestId}`;
    let channel = supabase.channel(channelName);

    // NEST設定変更を監視
    channel = channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: REALTIME_TABLES.NEST_SETTINGS,
        filter: `nest_id=eq.${nestId}`,
      },
      (payload) => {
        this.handleSettingsChange(nestId, payload);
      }
    );

    // NESTメンバー変更を監視
    channel = channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: REALTIME_TABLES.NEST_MEMBERS,
        filter: `nest_id=eq.${nestId}`,
      },
      (payload) => {
        this.handleMembersChange(nestId, payload);
      }
    );

    // NESTアクティビティを監視
    channel = channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: REALTIME_TABLES.NEST_ACTIVITIES,
        filter: `nest_id=eq.${nestId}`,
      },
      (payload) => {
        this.handleActivityCreated(nestId, payload);
      }
    );

    // チャネルを開始
    const status = await channel.subscribe();

    if (status !== 'SUBSCRIBED') {
      throw new Error(`Failed to subscribe to nest ${nestId}`);
    }

    this.nestChannels.set(nestId, channel);
    return channel;
  }

  // プレゼンス（オンライン状態）を監視するチャネルを設定
  async subscribeToPresence(nestId: string): Promise<RealtimeChannel> {
    // 既存のチャネルがある場合は一度解放
    if (this.presenceChannels.has(nestId)) {
      const existingChannel = this.presenceChannels.get(nestId)!;
      existingChannel.unsubscribe();
      this.presenceChannels.delete(nestId);
    }
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    const channelName = `presence-${nestId}`;
    const presenceKey = user.id;
    
    const channel = supabase.channel(channelName, {
      config: {
        presence: {
          key: presenceKey,
        },
      },
    });
    
    // プレゼンス状態監視
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        this.handlePresenceSync(nestId, state);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        this.handlePresenceJoin(nestId, key, newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        this.handlePresenceLeave(nestId, key, leftPresences);
      });
    
    // ユーザーの初期プレゼンス状態を設定
    channel.track({
      user_id: user.id,
      email: user.email,
      online_at: new Date().toISOString(),
      isOnline: true,
    });
    
    // チャネルを開始
    const status = await channel.subscribe();
    
    if (status !== 'SUBSCRIBED') {
      throw new Error(`Failed to subscribe to presence ${nestId}`);
    }
    
    this.presenceChannels.set(nestId, channel);
    return channel;
  }

  // ユーザーのプレゼンス状態を更新
  async updateUserPresence(presenceData: { isOnline: boolean; lastSeen: string }): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    this.presenceChannels.forEach((channel) => {
      channel.track({
        user_id: user.id,
        email: user.email,
        online_at: presenceData.isOnline ? new Date().toISOString() : undefined,
        last_seen_at: presenceData.lastSeen,
        isOnline: presenceData.isOnline,
      });
    });
  }

  // NEST設定変更ハンドラ
  private handleSettingsChange(nestId: string, payload: PostgresChangeEvent): void {
    const eventType = NestRealtimeEventType.SETTINGS_CHANGED;
    const data = {
      nestId,
      settings: payload.new,
      previousSettings: payload.old,
      eventType: payload.eventType,
    };
    
    this.notifyListeners(nestId, eventType, data);
  }

  // NESTメンバー変更ハンドラ
  private handleMembersChange(nestId: string, payload: PostgresChangeEvent): void {
    let eventType: NestRealtimeEventType;
    
    switch (payload.eventType) {
      case 'INSERT':
        eventType = NestRealtimeEventType.MEMBER_ADDED;
        break;
      case 'DELETE':
        eventType = NestRealtimeEventType.MEMBER_REMOVED;
        break;
      case 'UPDATE':
        eventType = NestRealtimeEventType.MEMBER_UPDATED;
        break;
      default:
        return; // 不明なイベントは無視
    }
    
    const data = {
      nestId,
      member: payload.new,
      previousMember: payload.old,
      eventType: payload.eventType,
    };
    
    this.notifyListeners(nestId, eventType, data);
  }

  // NESTアクティビティ作成ハンドラ
  private handleActivityCreated(nestId: string, payload: PostgresChangeEvent): void {
    const eventType = NestRealtimeEventType.ACTIVITY_CREATED;
    const data = {
      nestId,
      activity: payload.new,
    };
    
    this.notifyListeners(nestId, eventType, data);
  }

  // プレゼンス同期ハンドラ
  private handlePresenceSync(nestId: string, state: any): void {
    const eventType = NestRealtimeEventType.PRESENCE_CHANGED;
    const data = {
      nestId,
      presenceState: state,
    };
    
    this.notifyListeners(nestId, eventType, data);
  }

  // プレゼンス参加ハンドラ
  private handlePresenceJoin(nestId: string, key: string, newPresences: any[]): void {
    const eventType = NestRealtimeEventType.PRESENCE_CHANGED;
    const data = {
      nestId,
      action: 'join',
      userId: key,
      presences: newPresences,
    };
    
    this.notifyListeners(nestId, eventType, data);
  }

  // プレゼンス離脱ハンドラ
  private handlePresenceLeave(nestId: string, key: string, leftPresences: any[]): void {
    const eventType = NestRealtimeEventType.PRESENCE_CHANGED;
    const data = {
      nestId,
      action: 'leave',
      userId: key,
      presences: leftPresences,
    };
    
    this.notifyListeners(nestId, eventType, data);
  }

  // リスナーにイベントを通知
  private notifyListeners(
    nestId: string,
    eventType: NestRealtimeEventType,
    payload: any
  ): void {
    // ネストIDに関連付けられたリスナー
    const nestListeners = this.listeners.get(nestId) || [];
    
    // すべてのネストに関連付けられたリスナー
    const globalListeners = this.listeners.get('global') || [];
    
    // すべてのリスナーに通知
    [...nestListeners, ...globalListeners].forEach(listener => {
      try {
        listener(eventType, payload);
      } catch (error) {
        console.error('Error in realtime listener:', error);
      }
    });
  }

  // リスナーを追加
  addListener(nestId: string | 'global', listener: NestRealtimeListener): () => void {
    if (!this.listeners.has(nestId)) {
      this.listeners.set(nestId, []);
    }
    
    this.listeners.get(nestId)!.push(listener);
    
    // リスナー削除関数を返す
    return () => {
      const listeners = this.listeners.get(nestId);
      if (!listeners) return;
      
      const index = listeners.indexOf(listener);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    };
  }

  // 特定のNESTのサブスクリプションを解除
  async unsubscribeFromNest(nestId: string): Promise<void> {
    // NEST変更チャネルの解除
    if (this.nestChannels.has(nestId)) {
      const channel = this.nestChannels.get(nestId)!;
      channel.unsubscribe();
      this.nestChannels.delete(nestId);
    }
    
    // プレゼンスチャネルの解除
    if (this.presenceChannels.has(nestId)) {
      const channel = this.presenceChannels.get(nestId)!;
      channel.unsubscribe();
      this.presenceChannels.delete(nestId);
    }
    
    // リスナーの削除
    this.listeners.delete(nestId);
  }

  // すべてのサブスクリプションを解除
  async unsubscribeAll(): Promise<void> {
    // すべてのNESTチャネルを解除
    for (const [nestId, channel] of this.nestChannels.entries()) {
      channel.unsubscribe();
    }
    this.nestChannels.clear();
    
    // すべてのプレゼンスチャネルを解除
    for (const [nestId, channel] of this.presenceChannels.entries()) {
      channel.unsubscribe();
    }
    this.presenceChannels.clear();
    
    // すべてのリスナーを削除
    this.listeners.clear();
  }
}

// シングルトンインスタンス
const nestRealtimeService = new NestRealtimeService();

export default nestRealtimeService; 