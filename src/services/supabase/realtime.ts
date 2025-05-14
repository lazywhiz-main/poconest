import { RealtimeChannel, RealtimePostgresChangesPayload, RealtimePostgresInsertPayload, RealtimePostgresUpdatePayload, RealtimePostgresDeletePayload } from '@supabase/supabase-js';
import { supabase } from './client';
import { SubscriptionHandler } from './types';

/**
 * テーブルへのリアルタイムサブスクリプション
 * @param table テーブル名
 * @param callback データ変更時のコールバック関数
 * @param filter フィルター条件（カラム名とその値のオブジェクト）
 * @param event イベントタイプ（INSERT, UPDATE, DELETE, *）
 * @returns サブスクリプションハンドラー（チャンネルとコールバック）
 */
export const subscribeToTable = <T extends Record<string, any>>(
  table: string,
  callback: (payload: RealtimePostgresChangesPayload<T>) => void,
  filter?: Record<string, any>,
  event: 'INSERT' | 'UPDATE' | 'DELETE' | '*' = '*'
): SubscriptionHandler<RealtimePostgresChangesPayload<T>> => {
  try {
    console.log(`リアルタイムサブスクリプション開始: ${table}`);
    
    // フィルター条件を構築
    let channelFilter = `table=${table}:${event === '*' ? '' : `${event}:`}`;
    
    if (filter) {
      const columns = Object.keys(filter);
      if (columns.length > 0) {
        const filterString = columns
          .map(col => `${col}=eq.${filter[col]}`)
          .join(',');
        channelFilter += filterString;
      }
    }
    
    // サブスクリプションチャンネルを作成
    const channel = supabase
      .channel(channelFilter)
      .on<T>(
        'postgres_changes' as any, // Type workaround
        { event, schema: 'public', table, filter },
        (payload: any) => {
          console.log(`リアルタイムイベント受信: ${table} - ${event}`, payload);
          callback(payload as RealtimePostgresChangesPayload<T>);
        }
      )
      .subscribe((status) => {
        console.log(`Subscription status for ${table}:`, status);
      });
    
    // サブスクリプションハンドラーを返す
    return {
      callback,
      channel
    };
  } catch (error) {
    console.error(`リアルタイムサブスクリプションエラー(${table}):`, error);
    // エラー時は空のチャンネルを返す
    return {
      callback,
      channel: supabase.channel(`error-${Date.now()}`)
    };
  }
};

/**
 * サブスクリプションの解除
 * @param handler サブスクリプションハンドラー
 */
export const unsubscribe = (handler: SubscriptionHandler): void => {
  try {
    if (handler && handler.channel) {
      supabase.removeChannel(handler.channel);
      console.log('サブスクリプション解除成功');
    }
  } catch (error) {
    console.error('サブスクリプション解除エラー:', error);
  }
};

/**
 * チャットメッセージのリアルタイムサブスクリプション
 * @param chatRoomId チャットルームID
 * @param callback データ変更時のコールバック関数
 * @returns サブスクリプションハンドラー
 */
export const subscribeToChatMessages = <T extends Record<string, any>>(
  chatRoomId: string,
  callback: (payload: RealtimePostgresChangesPayload<T>) => void
): SubscriptionHandler<RealtimePostgresChangesPayload<T>> => {
  return subscribeToTable<T>(
    'chat_messages',
    callback,
    { chat_room_id: chatRoomId }
  );
};

/**
 * チャットルームのリアルタイムサブスクリプション
 * @param userId ユーザーID
 * @param callback データ変更時のコールバック関数
 * @returns サブスクリプションハンドラー
 */
export const subscribeToChatRooms = <T extends Record<string, any>>(
  userId: string,
  callback: (payload: RealtimePostgresChangesPayload<T>) => void
): SubscriptionHandler<RealtimePostgresChangesPayload<T>> => {
  // 複雑なクエリのためカスタムチャンネルを作成
  const channel = supabase
    .channel(`chat_rooms_${userId}`)
    .on<T>(
      'postgres_changes' as any, // Type workaround
      {
        event: '*',
        schema: 'public',
        table: 'chat_participants',
        filter: `user_id=eq.${userId}`
      },
      (payload: any) => callback(payload as RealtimePostgresChangesPayload<T>)
    )
    .subscribe();
  
  return { callback, channel };
};

/**
 * ボードのリアルタイムサブスクリプション
 * @param boardId ボードID
 * @param callback データ変更時のコールバック関数
 * @returns サブスクリプションハンドラー
 */
export const subscribeToBoardCards = <T extends Record<string, any>>(
  boardId: string,
  callback: (payload: RealtimePostgresChangesPayload<T>) => void
): SubscriptionHandler<RealtimePostgresChangesPayload<T>> => {
  // ボードカードの変更を監視するカスタムチャンネル
  const channel = supabase
    .channel(`board_cards_${boardId}`)
    .on<T>(
      'postgres_changes' as any, // Type workaround
      {
        event: '*',
        schema: 'public',
        table: 'board_cards',
        filter: `board_id=eq.${boardId}`
      },
      (payload: any) => callback(payload as RealtimePostgresChangesPayload<T>)
    )
    .subscribe();
  
  return { callback, channel };
};

/**
 * プレゼンス機能 - ユーザーのオンライン状態を追跡
 * @param roomId 部屋ID（チャットルームIDやボードIDなど）
 * @param userId ユーザーID
 * @param userInfo ユーザー情報
 * @param onSync 同期完了時のコールバック
 * @param onPresenceChange プレゼンス状態変更時のコールバック
 * @returns プレゼンスチャンネル
 */
export const trackPresence = (
  roomId: string,
  userId: string,
  userInfo: Record<string, any> = {},
  onSync?: () => void,
  onPresenceChange?: (state: Record<string, any>) => void
): RealtimeChannel => {
  const presenceChannel = supabase.channel(`presence_${roomId}`);
  
  // プレゼンスイベントのトラッキング
  presenceChannel
    .on('presence', { event: 'sync' }, () => {
      const state = presenceChannel.presenceState();
      console.log('プレゼンス同期:', state);
      onSync && onSync();
    })
    .on('presence', { event: 'join' }, ({ key, newPresences }) => {
      console.log('参加:', key, newPresences);
      onPresenceChange && onPresenceChange(presenceChannel.presenceState());
    })
    .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
      console.log('離脱:', key, leftPresences);
      onPresenceChange && onPresenceChange(presenceChannel.presenceState());
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        // ユーザー情報をプレゼンスに追加
        const presenceTrackStatus = await presenceChannel.track({
          user_id: userId,
          online_at: new Date().toISOString(),
          ...userInfo
        });
        console.log('プレゼンス追跡状態:', presenceTrackStatus);
      }
    });
  
  return presenceChannel;
};

/**
 * プレゼンス追跡の解除
 * @param presenceChannel プレゼンスチャンネル
 */
export const untrackPresence = (presenceChannel: RealtimeChannel): void => {
  try {
    if (presenceChannel) {
      presenceChannel.untrack();
      supabase.removeChannel(presenceChannel);
    }
  } catch (error) {
    console.error('プレゼンス追跡解除エラー:', error);
  }
}; 