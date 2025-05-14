import { useEffect, useCallback } from 'react';
import { realtimeService } from '@services/realtimeService';
import { useNest } from '../contexts/NestContext';
import { useAuth } from '@contexts/AuthContext';

// ユーザープロファイルの型定義
interface UserProfile {
  id?: string;
  display_name?: string;
  avatar_url?: string;
  email?: string;
}

/**
 * NESTのリアルタイム同期を管理するフック
 * NestContextと連携して、設定変更やメンバー変更をリアルタイムに反映
 */
export const useNestRealtime = () => {
  const { user } = useAuth();
  const { 
    currentNest, 
    nestMembers, 
    nestSettings,
    refreshData,
    setCurrentNestById,
  } = useNest();

  // NESTの設定変更を監視
  const setupSettingsSync = useCallback(async () => {
    if (!currentNest || !user) return;

    await realtimeService.subscribeToNestSettings(
      currentNest.id, 
      async (settings) => {
        console.log('NEST設定が変更されました:', settings);
        // 設定が変更されたらデータを更新
        await refreshData();
      }
    );
  }, [currentNest, user, refreshData]);

  // NESTのメンバー変更を監視
  const setupMembersSync = useCallback(async () => {
    if (!currentNest || !user) return;

    await realtimeService.subscribeToNestMembers(
      currentNest.id, 
      (members) => {
        console.log('NESTメンバーが変更されました:', members);
        
        // 自分がメンバーから削除された場合
        const isMember = members.some(m => m.user_id === user.id);
        
        if (!isMember) {
          // 自分が所属するNESTのリストを更新
          refreshData().then(() => {
            // 別のNESTに切り替え
            const otherNest = members.find(m => m.user_id === user.id);
            if (otherNest) {
              setCurrentNestById(otherNest.nest_id);
            }
          });
        } else {
          // 通常のメンバー更新時はデータを更新
          refreshData();
        }
      }
    );
  }, [currentNest, user, refreshData, setCurrentNestById]);

  // ユーザーのオンライン状態を監視
  const setupPresenceTracking = useCallback(async () => {
    if (!currentNest || !user) return;

    // ユーザープロファイル情報を取得
    const userMember = nestMembers.find(m => m.user_id === user.id);
    const userProfile = userMember?.users as UserProfile || {};

    await realtimeService.trackUserPresence(
      currentNest.id,
      user.id,
      {
        displayName: userProfile.display_name || user.email || 'Unknown User',
        avatar: userProfile.avatar_url || '',
        role: userMember?.role || 'member',
      },
      (presenceState) => {
        console.log('オンラインユーザー状態:', presenceState);
        // オンライン状態が変化した場合の処理（必要に応じて実装）
      }
    );
  }, [currentNest, user, nestMembers]);

  // NESTのアクティビティを監視
  const setupActivitySync = useCallback(async () => {
    if (!currentNest || !user) return;

    await realtimeService.subscribeToNestActivity(
      currentNest.id,
      (activity) => {
        console.log('NESTアクティビティ更新:', activity);
        // アクティビティが更新された場合の処理（必要に応じて実装）
      }
    );
  }, [currentNest, user]);

  // 初期化
  useEffect(() => {
    const initialize = async () => {
      await realtimeService.initialize();
    };
    
    initialize();
    
    // クリーンアップ
    return () => {
      realtimeService.cleanup();
    };
  }, []);

  // NESTが変更されたら各種監視を設定
  useEffect(() => {
    if (currentNest && user) {
      setupSettingsSync();
      setupMembersSync();
      setupPresenceTracking();
      setupActivitySync();
    }
  }, [
    currentNest, 
    user, 
    setupSettingsSync, 
    setupMembersSync, 
    setupPresenceTracking, 
    setupActivitySync
  ]);

  return {
    // 必要に応じて追加機能をここに追加
    isInitialized: !!currentNest && !!user,
  };
}; 