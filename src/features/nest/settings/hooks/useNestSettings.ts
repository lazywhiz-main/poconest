import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@services/supabase/client';
import { realtimeService } from '@services/realtimeService';
import { useNest } from '../../contexts/NestContext';
import { 
  NestSettings, 
  NestPrivacySettings, 
  NestContentSettings, 
  NestInvitationSettings, 
  NestNotificationSettings, 
  SettingsUpdateResponse 
} from '../types/settings.types';
import { useAuth } from '@contexts/AuthContext';
import { PermissionType } from '../types/permissions.types';
import { usePermissions } from './usePermissions';

/**
 * NEST設定を管理するカスタムフック
 */
export const useNestSettings = (nestId?: string) => {
  const { user } = useAuth();
  const { currentNest, refreshData } = useNest();
  const { hasPermission } = usePermissions();
  
  const [settings, setSettings] = useState<NestSettings | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  
  // 使用するnestIdを決定
  const targetNestId = nestId || currentNest?.id;

  /**
   * NEST設定を取得する
   */
  const fetchSettings = useCallback(async () => {
    if (!targetNestId) {
      setError('NEST IDが指定されていません');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // 設定データを取得
      const { data, error: fetchError } = await supabase
        .from('nest_settings')
        .select('*')
        .eq('nest_id', targetNestId)
        .single();
      
      if (fetchError) {
        throw fetchError;
      }
      
      if (!data) {
        // 設定がない場合はデフォルト設定を返す
        const defaultSettings = createDefaultSettings(targetNestId);
        setSettings(defaultSettings);
      } else {
        // データベースの形式からフロントエンドの形式に変換
        const formattedSettings = formatSettingsFromDB(data, targetNestId);
        setSettings(formattedSettings);
      }
    } catch (err: any) {
      console.error('NEST設定の取得に失敗しました:', err);
      setError(err.message || 'NEST設定の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [targetNestId]);

  /**
   * NEST設定を更新する
   */
  const updateSettings = useCallback(async (
    updatedSettings: Partial<NestSettings>
  ): Promise<SettingsUpdateResponse> => {
    if (!targetNestId || !user) {
      return { 
        success: false, 
        error: 'NESTまたはユーザー情報がありません' 
      };
    }

    // 権限チェック
    const canUpdateSettings = await hasPermission(
      user.id,
      PermissionType.MANAGE_SETTINGS,
      targetNestId
    );

    if (!canUpdateSettings) {
      return { 
        success: false, 
        error: '設定を更新する権限がありません'
      };
    }

    try {
      setSaving(true);
      
      // 現在の設定を取得
      const currentSettings = settings || await getInitialSettings();
      
      // 新しい設定をマージ
      const newSettings: NestSettings = {
        ...currentSettings,
        ...updatedSettings,
        nestId: targetNestId,
        lastUpdated: new Date().toISOString(),
        updatedBy: user.id,
      };
      
      // データベース形式に変換
      const dbData = formatSettingsForDB(newSettings);
      
      // データベースを更新 (nest_idを基準にupsert)
      const { error: updateError } = await supabase
        .from('nest_settings')
        .upsert(dbData, {
          onConflict: 'nest_id'
        });
      
      if (updateError) {
        throw updateError;
      }
      
      // ローカル状態を更新
      setSettings(newSettings);
      
      // NEST全体のデータを更新
      await refreshData();
      
      return { 
        success: true, 
        settings: newSettings 
      };
    } catch (err: any) {
      console.error('NEST設定の更新に失敗しました:', err);
      return { 
        success: false, 
        error: err.message || 'NEST設定の更新に失敗しました'
      };
    } finally {
      setSaving(false);
    }
  }, [targetNestId, user, settings, hasPermission, refreshData]);

  /**
   * プライバシー設定のみを更新する
   */
  const updatePrivacySettings = useCallback(async (
    privacySettings: Partial<NestPrivacySettings>
  ): Promise<SettingsUpdateResponse> => {
    if (!settings) {
      return { 
        success: false, 
        error: '現在の設定がロードされていません' 
      };
    }
    
    const updatedSettings: Partial<NestSettings> = {
      privacy: {
        ...settings.privacy,
        ...privacySettings
      }
    };
    
    return await updateSettings(updatedSettings);
  }, [settings, updateSettings]);

  /**
   * コンテンツ設定のみを更新する
   */
  const updateContentSettings = useCallback(async (
    contentSettings: Partial<NestContentSettings>
  ): Promise<SettingsUpdateResponse> => {
    if (!settings) {
      return { 
        success: false, 
        error: '現在の設定がロードされていません' 
      };
    }
    
    const updatedSettings: Partial<NestSettings> = {
      content: {
        ...settings.content,
        ...contentSettings
      }
    };
    
    return await updateSettings(updatedSettings);
  }, [settings, updateSettings]);

  /**
   * 招待設定のみを更新する
   */
  const updateInvitationSettings = useCallback(async (
    invitationSettings: Partial<NestInvitationSettings>
  ): Promise<SettingsUpdateResponse> => {
    if (!settings) {
      return { 
        success: false, 
        error: '現在の設定がロードされていません' 
      };
    }
    
    const updatedSettings: Partial<NestSettings> = {
      invitation: {
        ...settings.invitation,
        ...invitationSettings
      }
    };
    
    return await updateSettings(updatedSettings);
  }, [settings, updateSettings]);

  /**
   * 通知設定のみを更新する
   */
  const updateNotificationSettings = useCallback(async (
    notificationSettings: Partial<NestNotificationSettings>
  ): Promise<SettingsUpdateResponse> => {
    if (!settings) {
      return { 
        success: false, 
        error: '現在の設定がロードされていません' 
      };
    }
    
    const updatedSettings: Partial<NestSettings> = {
      notification: {
        ...settings.notification,
        ...notificationSettings
      }
    };
    
    return await updateSettings(updatedSettings);
  }, [settings, updateSettings]);

  /**
   * 初期設定を取得する（データベースから取得またはデフォルト設定を作成）
   */
  const getInitialSettings = async (): Promise<NestSettings> => {
    if (!targetNestId) {
      return createDefaultSettings('temp');
    }
    
    try {
      const { data } = await supabase
        .from('nest_settings')
        .select('*')
        .eq('nest_id', targetNestId)
        .single();
      
      if (data) {
        return formatSettingsFromDB(data, targetNestId);
      } else {
        return createDefaultSettings(targetNestId);
      }
    } catch (err) {
      return createDefaultSettings(targetNestId);
    }
  };

  /**
   * デフォルト設定を作成する
   */
  const createDefaultSettings = (nestId: string): NestSettings => {
    return {
      nestId,
      privacy: {
        visibility: 'private',
        searchable: false,
        memberListVisibility: 'members_only'
      },
      content: {
        contentVisibility: 'members_only',
        joinRequirement: 'invite_only',
        allowExternalSharing: false,
        fileAccessLevel: 'download_allowed'
      },
      invitation: {
        invitePermission: 'owner_only',
        approvalRequired: false,
        maxInvitesPerMember: 10,
        inviteLinkEnabled: false,
        inviteLinkExpiration: 24 // 24時間
      },
      notification: {
        activityNotifications: true,
        messageNotifications: true,
        memberUpdateNotifications: true,
        systemNotifications: true,
        notificationDigestFrequency: 'realtime'
      },
      lastUpdated: new Date().toISOString()
    };
  };

  /**
   * データベースから取得した設定をフロントエンド形式に変換する
   */
  const formatSettingsFromDB = (dbData: any, nestId: string): NestSettings => {
    // データベースの構造に合わせて変換
    const defaultSettings = createDefaultSettings(nestId);
    
    try {
      return {
        nestId: dbData.nest_id || nestId,
        privacy: {
          ...defaultSettings.privacy,
          ...(dbData.privacy_settings || {})
        },
        content: {
          ...defaultSettings.content,
          ...(dbData.content_settings || {})
        },
        invitation: {
          ...defaultSettings.invitation,
          ...(dbData.invitation_settings || {})
        },
        notification: {
          ...defaultSettings.notification,
          ...(dbData.notification_settings || {})
        },
        lastUpdated: dbData.updated_at || defaultSettings.lastUpdated,
        updatedBy: dbData.updated_by
      };
    } catch (err) {
      console.error('設定のフォーマットエラー:', err);
      return defaultSettings;
    }
  };

  /**
   * フロントエンドの設定をデータベース形式に変換する
   */
  const formatSettingsForDB = (settings: NestSettings): any => {
    return {
      nest_id: settings.nestId,
      privacy_settings: settings.privacy,
      content_settings: settings.content,
      invitation_settings: settings.invitation,
      notification_settings: settings.notification,
      updated_at: settings.lastUpdated,
      updated_by: settings.updatedBy
    };
  };

  // NEST設定の実時間監視
  useEffect(() => {
    if (!targetNestId) return;

    // 初回読み込み
    fetchSettings();

    // リアルタイム購読を設定
    const setupRealtime = async () => {
      try {
        await realtimeService.subscribeToNestSettings(
          targetNestId,
          (updatedSettings) => {
            if (updatedSettings) {
              const formattedSettings = formatSettingsFromDB(updatedSettings, targetNestId);
              setSettings(formattedSettings);
            }
          }
        );
      } catch (err) {
        console.error('リアルタイム設定の購読に失敗しました:', err);
      }
    };

    setupRealtime();

    // クリーンアップ
    return () => {
      // クリーンアップは実装済みのRealtimeServiceに任せる
    };
  }, [targetNestId, fetchSettings]);

  return {
    settings,
    loading,
    error,
    saving,
    updateSettings,
    updatePrivacySettings,
    updateContentSettings,
    updateInvitationSettings,
    updateNotificationSettings,
    refreshSettings: fetchSettings
  };
}; 