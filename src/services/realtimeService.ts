import { RealtimeChannel } from '@supabase/supabase-js';
import { Platform, AppState, AppStateStatus } from 'react-native';
import { supabase } from './supabase/client';
import { 
  subscribeToTable, 
  unsubscribe, 
  trackPresence, 
  untrackPresence
} from './supabase/realtime';
import { SubscriptionHandler } from './supabase/types';

// 型定義（ここで直接定義して依存関係を減らす）
export interface NestSettings {
  nest_id: string;
  privacy_settings: {
    inviteRestriction: 'owner_only' | 'members';
    contentVisibility: 'members_only' | 'public';
    memberListVisibility: 'members_only' | 'public';
  };
}

export interface NestMember {
  nest_id: string;
  user_id: string;
  role: 'owner' | 'member' | 'admin';
  joined_at: string;
  last_active_at?: string;
  users?: {
    id: string;
    display_name: string;
    avatar_url?: string;
    email?: string;
  };
}

// リアルタイム同期サービスのインターフェース
export interface RealtimeService {
  // 初期化
  initialize: () => Promise<void>;

  // 設定変更の監視
  subscribeToNestSettings: (
    nestId: string, 
    onSettingsChange: (settings: NestSettings) => void
  ) => Promise<void>;

  // メンバー変更の監視
  subscribeToNestMembers: (
    nestId: string, 
    onMemberChange: (members: NestMember[]) => void
  ) => Promise<void>;

  // アクティビティの監視
  subscribeToNestActivity: (
    nestId: string, 
    onActivityChange: (activity: any) => void
  ) => Promise<void>;

  // ユーザーオンライン状態の監視
  trackUserPresence: (
    nestId: string, 
    userId: string, 
    userData: Record<string, any>,
    onPresenceChange: (state: Record<string, any>) => void
  ) => Promise<void>;

  // クリーンアップ
  cleanup: () => Promise<void>;
}

class RealtimeServiceImpl implements RealtimeService {
  private nestSettingsSubscription: SubscriptionHandler | null = null;
  private nestMembersSubscription: SubscriptionHandler | null = null;
  private nestActivitySubscription: SubscriptionHandler | null = null;
  private presenceChannel: RealtimeChannel | null = null;
  private currentNestId: string | null = null;
  private currentUserId: string | null = null;
  private appState: AppStateStatus = 'active';
  private connectionRetryTimer: NodeJS.Timeout | null = null;
  private retryCount = 0;
  private maxRetryCount = 10;
  private baseRetryTimeout = 1000; // 1秒
  private isInitialized = false;

  constructor() {
    // AppStateの変更を監視
    if (Platform.OS !== 'web') {
      AppState.addEventListener('change', this.handleAppStateChange);
    } else {
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
    }

    // オンライン状態の変更を監視（Webのみ）
    if (Platform.OS === 'web') {
      window.addEventListener('online', this.handleConnectionChange);
      window.addEventListener('offline', this.handleConnectionChange);
    }
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      // Supabaseのリアルタイム機能を初期化
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token || '';
      await supabase.realtime.setAuth(token);
      console.log('リアルタイムサービスを初期化しました');
      this.isInitialized = true;
    } catch (error) {
      console.error('リアルタイムサービスの初期化に失敗しました:', error);
      this.scheduleReconnect();
    }
  }

  private handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (nextAppState === 'active' && this.appState !== 'active') {
      // アプリがバックグラウンドからアクティブになった時に再接続
      this.reconnect();
    } else if (nextAppState !== 'active' && this.appState === 'active') {
      // アプリがバックグラウンドに入る時に一部の監視を停止（バッテリー節約）
      this.optimizeForBackground();
    }
    
    this.appState = nextAppState;
  };

  private handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      this.reconnect();
    } else {
      this.optimizeForBackground();
    }
  };

  private handleConnectionChange = () => {
    if (navigator.onLine) {
      this.reconnect();
    } else {
      // オフラインの場合は接続を切り、バックグラウンド最適化
      this.optimizeForBackground();
    }
  };

  private reconnect = async () => {
    try {
      // 再接続
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token || '';
      await supabase.realtime.setAuth(token);
      
      // 既存のサブスクリプションがある場合、再初期化
      if (this.currentNestId) {
        this.unsubscribeAll();
        
        // ToDo: 保存していたコールバック関数を使って再サブスクライブ
        // このサンプル実装では省略
      }
      
      this.retryCount = 0;
      console.log('リアルタイム接続を再確立しました');
    } catch (error) {
      console.error('リアルタイム再接続に失敗しました:', error);
      this.scheduleReconnect();
    }
  };

  private scheduleReconnect = () => {
    if (this.connectionRetryTimer) {
      clearTimeout(this.connectionRetryTimer);
    }

    if (this.retryCount >= this.maxRetryCount) {
      console.log('最大再試行回数に達しました');
      return;
    }

    // 指数バックオフで再試行（1秒、2秒、4秒、8秒...）
    const timeout = this.baseRetryTimeout * Math.pow(2, this.retryCount);
    this.retryCount++;

    this.connectionRetryTimer = setTimeout(() => {
      this.reconnect();
    }, timeout);
  };

  private optimizeForBackground = () => {
    // バッテリー消費を抑えるためにバックグラウンドでの処理を最適化
    
    // アクティビティ監視を停止（頻繁に更新されるため）
    if (this.nestActivitySubscription) {
      unsubscribe(this.nestActivitySubscription);
      this.nestActivitySubscription = null;
    }
    
    // メンバーとNest設定は重要なため、継続して監視
    // プラットフォームにより最適化の度合いを変える
    
    if (Platform.OS === 'web') {
      // Webではタブが見えなくなった場合も全て監視停止
      this.unsubscribeAll();
    } else if (Platform.OS === 'android' || Platform.OS === 'ios') {
      // モバイルでは最小限の監視は続ける（設定変更など）
      if (this.nestActivitySubscription) {
        unsubscribe(this.nestActivitySubscription);
        this.nestActivitySubscription = null;
      }
    }
  };

  private unsubscribeAll = () => {
    // 全ての監視を停止
    if (this.nestSettingsSubscription) {
      unsubscribe(this.nestSettingsSubscription);
      this.nestSettingsSubscription = null;
    }
    
    if (this.nestMembersSubscription) {
      unsubscribe(this.nestMembersSubscription);
      this.nestMembersSubscription = null;
    }
    
    if (this.nestActivitySubscription) {
      unsubscribe(this.nestActivitySubscription);
      this.nestActivitySubscription = null;
    }
    
    if (this.presenceChannel) {
      untrackPresence(this.presenceChannel);
      this.presenceChannel = null;
    }
  };

  public async subscribeToNestSettings(
    nestId: string, 
    onSettingsChange: (settings: NestSettings) => void
  ): Promise<void> {
    if (!this.isInitialized) await this.initialize();
    this.currentNestId = nestId;
    
    // 既存のサブスクリプションを解除
    if (this.nestSettingsSubscription) {
      unsubscribe(this.nestSettingsSubscription);
    }
    
    // Nest設定の変更を監視
    this.nestSettingsSubscription = subscribeToTable<any>(
      'nest_settings',
      async (payload) => {
        if (payload.new && typeof payload.new === 'object' && 'nest_id' in payload.new && payload.new.nest_id === nestId) {
          onSettingsChange(payload.new as NestSettings);
        }
      },
      { nest_id: nestId }
    );
  }

  public async subscribeToNestMembers(
    nestId: string, 
    onMemberChange: (members: NestMember[]) => void
  ): Promise<void> {
    if (!this.isInitialized) await this.initialize();
    this.currentNestId = nestId;
    
    // 既存のサブスクリプションを解除
    if (this.nestMembersSubscription) {
      unsubscribe(this.nestMembersSubscription);
    }
    
    // メンバー変更を監視
    this.nestMembersSubscription = subscribeToTable<any>(
      'nest_members',
      async (payload) => {
        const newData = payload.new;
        const oldData = payload.old;
        
        const newNestId = newData && typeof newData === 'object' && 'nest_id' in newData ? newData.nest_id : null;
        const oldNestId = oldData && typeof oldData === 'object' && 'nest_id' in oldData ? oldData.nest_id : null;
        
        if (newNestId === nestId || oldNestId === nestId) {
          // メンバーデータが変更されたら、最新のメンバーリストを取得
          const { data } = await supabase
            .from('nest_members')
            .select(`
              nest_id, 
              user_id, 
              role, 
              joined_at, 
              last_active_at,
              users:user_id (
                id, 
                display_name, 
                avatar_url, 
                email
              )
            `)
            .eq('nest_id', nestId);
            
          if (data) {
            // 型を確実に合わせるために明示的に変換
            const members: NestMember[] = data.map(item => {
              // usersの型がバラバラな場合に対応
              let userInfo = {
                id: '',
                display_name: '',
                avatar_url: '',
                email: ''
              };
              
              // usersが配列の場合
              if (item.users && Array.isArray(item.users) && item.users.length > 0) {
                const firstUser = item.users[0];
                userInfo = {
                  id: firstUser?.id || '',
                  display_name: firstUser?.display_name || '',
                  avatar_url: firstUser?.avatar_url || '',
                  email: firstUser?.email || ''
                };
              } 
              // usersがオブジェクトの場合
              else if (item.users && typeof item.users === 'object' && !Array.isArray(item.users)) {
                const user = item.users as { id: string; display_name: string; avatar_url: string; email: string };
                userInfo = {
                  id: user.id || '',
                  display_name: user.display_name || '',
                  avatar_url: user.avatar_url || '',
                  email: user.email || ''
                };
              }
              
              return {
                nest_id: item.nest_id,
                user_id: item.user_id,
                role: item.role as 'owner' | 'member' | 'admin',
                joined_at: item.joined_at,
                last_active_at: item.last_active_at,
                users: userInfo
              };
            });
            
            onMemberChange(members);
          }
        }
      },
      { nest_id: nestId }
    );
  }

  public async subscribeToNestActivity(
    nestId: string, 
    onActivityChange: (activity: any) => void
  ): Promise<void> {
    if (!this.isInitialized) await this.initialize();
    this.currentNestId = nestId;
    
    // 既存のサブスクリプションを解除
    if (this.nestActivitySubscription) {
      unsubscribe(this.nestActivitySubscription);
    }
    
    // アクティビティの変更を監視
    this.nestActivitySubscription = subscribeToTable<any>(
      'nest_activity',
      (payload) => {
        if (payload.new && typeof payload.new === 'object' && 'nest_id' in payload.new && payload.new.nest_id === nestId) {
          onActivityChange(payload.new);
        }
      },
      { nest_id: nestId }
    );
  }

  public async trackUserPresence(
    nestId: string, 
    userId: string, 
    userData: Record<string, any>,
    onPresenceChange: (state: Record<string, any>) => void
  ): Promise<void> {
    if (!this.isInitialized) await this.initialize();
    this.currentNestId = nestId;
    this.currentUserId = userId;
    
    // 既存のプレゼンスチャンネルを解除
    if (this.presenceChannel) {
      untrackPresence(this.presenceChannel);
    }
    
    // プレゼンス（オンライン状態）の監視を開始
    this.presenceChannel = trackPresence(
      nestId,
      userId,
      {
        ...userData,
        platform: Platform.OS,
        last_seen: new Date().toISOString()
      },
      undefined,
      onPresenceChange
    );
  }

  public async cleanup(): Promise<void> {
    // 全てのサブスクリプションとイベントリスナーを解除
    this.unsubscribeAll();
    
    if (Platform.OS !== 'web') {
      // React Nativeの新しいAPIに対応
      const appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);
      appStateSubscription.remove();
    } else {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
      window.removeEventListener('online', this.handleConnectionChange);
      window.removeEventListener('offline', this.handleConnectionChange);
    }
    
    if (this.connectionRetryTimer) {
      clearTimeout(this.connectionRetryTimer);
      this.connectionRetryTimer = null;
    }
    
    this.isInitialized = false;
    this.currentNestId = null;
    this.currentUserId = null;
    console.log('リアルタイムサービスをクリーンアップしました');
  }
}

// シングルトンインスタンスを作成
export const realtimeService: RealtimeService = new RealtimeServiceImpl(); 