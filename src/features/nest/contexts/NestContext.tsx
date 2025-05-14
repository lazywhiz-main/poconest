import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@services/supabase';
import { useAuth } from '@contexts/AuthContext';
import { v4 as uuidv4 } from 'uuid';
import { Nest as ImportedNestType } from '../../../types/nestSpace.types';

// 型定義
export interface Nest {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  owner_id: string;
  icon?: string;
  color?: string;
  is_active: boolean;
  space_ids?: string[];
  updated_at: string;
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

export interface NestInvitation {
  id: string;
  nest_id: string;
  email: string;
  invited_by: string;
  created_at: string;
  expires_at?: string;
  token: string;
  is_accepted: boolean;
  accepted_at?: string;
  nests?: {
    id: string;
    name: string;
    description?: string;
  };
  inviters?: {
    id: string;
    display_name: string;
    avatar_url?: string;
  };
}

export interface NestPrivacySettings {
  inviteRestriction: 'owner_only' | 'members';
  contentVisibility: 'members_only' | 'public';
  memberListVisibility: 'members_only' | 'public';
}

export interface NestSettings {
  nest_id: string;
  privacy_settings: NestPrivacySettings;
  // その他の設定も追加可能
}

// コンテキストの型定義
interface NestContextType {
  nests: Nest[];
  currentNest: Nest | null;
  userNests: Nest[];
  nestMembers: NestMember[];
  pendingInvitations: NestInvitation[];
  nestSettings: NestSettings | null;
  loading: boolean;
  initializing: boolean;
  error: string | null;
  setCurrentNestById: (nestId: string) => Promise<void>;
  createNest: (data: { name: string; description?: string; color?: string }) => Promise<{ error: Error | null; nest: Nest | null }>;
  updateNest: (nestId: string, data: Partial<Nest>) => Promise<{ error: Error | null }>;
  inviteMember: (nestId: string, email: string) => Promise<{ error: Error | null; invitation: NestInvitation | null }>;
  acceptInvitation: (token: string) => Promise<{ error: Error | null }>;
  leaveNest: (nestId: string) => Promise<{ error: Error | null }>;
  cancelInvitation: (invitationId: string) => Promise<{ error: Error | null }>;
  resendInvitation: (invitationId: string) => Promise<{ error: Error | null }>;
  updatePrivacySettings: (nestId: string, settings: Partial<NestPrivacySettings>) => Promise<{ error: Error | null }>;
  refreshData: () => Promise<void>;
  selectNest: (nestId: string) => void;
  deleteNest: (nestId: string) => Promise<void>;
  refreshNests: () => Promise<void>;
}

// コンテキストの作成
const NestContext = createContext<NestContextType | undefined>(undefined);

// サンプルNestデータ
export const SAMPLE_NESTS = [
  {
    id: 'nest-1',
    name: 'マイホーム',
    description: '家族との共有スペース',
    owner_id: 'user-1',
    is_active: true,
    created_at: new Date('2023-01-01').toISOString(),
    updated_at: new Date('2023-04-15').toISOString(),
    color: '#4a6da7',
    icon: '🏠',
    space_ids: ['chat-1', 'board-1', 'zoom-1', 'analysis-1']
  },
  {
    id: 'nest-2',
    name: '仕事用',
    description: '業務連絡と資料共有',
    owner_id: 'user-1',
    is_active: true,
    created_at: new Date('2023-02-10').toISOString(),
    updated_at: new Date('2023-05-20').toISOString(),
    color: '#2ecc71',
    icon: '💼',
    space_ids: ['chat-2', 'board-2', 'zoom-2', 'analysis-2']
  },
  {
    id: 'nest-3',
    name: '趣味の会',
    description: '写真と旅行の記録',
    owner_id: 'user-2',
    is_active: true,
    created_at: new Date('2023-03-15').toISOString(),
    updated_at: new Date('2023-06-01').toISOString(),
    color: '#9b59b6',
    icon: '🎨',
    space_ids: ['chat-3', 'board-3', 'analysis-3']
  }
];

// プロバイダーコンポーネント
export function NestProvider({ children }: { children: React.ReactNode }) {
  const { user, session, loading: authLoading } = useAuth();
  const [nests, setNests] = useState<Nest[]>([]);
  const [currentNest, setCurrentNestState] = useState<Nest | null>(null);
  const [userNests, setUserNests] = useState<Nest[]>([]);
  const [nestMembers, setNestMembers] = useState<NestMember[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<NestInvitation[]>([]);
  const [nestSettings, setNestSettings] = useState<NestSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ユーザーのNestリストを取得
  const fetchUserNests = useCallback(async () => {
    if (!user) return [];
    
    try {
      const { data, error } = await supabase
        .from('nest_members')
        .select(`
          nest_id,
          nests:nest_id (
            id, 
            name, 
            description, 
            created_at, 
            owner_id, 
            icon, 
            color, 
            is_active
          )
        `)
        .eq('user_id', user.id);
        
      if (error) throw error;
      
      // ネストデータを抽出して明示的に型キャスト
      const nests = data
        .map(item => item.nests as unknown as Nest)
        .filter(nest => nest && nest.is_active);
        
      return nests;
    } catch (error) {
      console.error('Error fetching user nests:', error);
      return [];
    }
  }, [user]);

  // Nestのメンバーリストを取得
  const fetchNestMembers = useCallback(async (nestId: string) => {
    try {
      const { data, error } = await supabase
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
        
      if (error) throw error;
      
      // 明示的に型キャスト
      return data as unknown as NestMember[];
    } catch (error) {
      console.error('Error fetching nest members:', error);
      return [];
    }
  }, []);

  // Nestの設定を取得
  const fetchNestSettings = useCallback(async (nestId: string) => {
    try {
      const { data, error } = await supabase
        .from('nest_settings')
        .select('*')
        .eq('nest_id', nestId)
        .single();
        
      if (error && error.code !== 'PGRST116') { // Not found
        throw error;
      }
      
      if (!data) {
        // デフォルト設定を返す
        return {
          nest_id: nestId,
          privacy_settings: {
            inviteRestriction: 'owner_only',
            contentVisibility: 'members_only',
            memberListVisibility: 'members_only'
          }
        } as NestSettings;
      }
      
      return data as NestSettings;
    } catch (error) {
      console.error('Error fetching nest settings:', error);
      return null;
    }
  }, []);

  // 保留中の招待を取得
  const fetchPendingInvitations = useCallback(async () => {
    if (!user?.email) return [];
    
    try {
      const { data, error } = await supabase
        .from('nest_invitations')
        .select(`
          id, 
          nest_id, 
          email, 
          invited_by, 
          created_at, 
          expires_at, 
          token, 
          is_accepted,
          nests:nest_id (
            id, 
            name, 
            description
          ),
          inviters:invited_by (
            id, 
            display_name, 
            avatar_url
          )
        `)
        .eq('email', user.email)
        .eq('is_accepted', false)
        .or('expires_at.is.null,expires_at.gt.now()');
        
      if (error) throw error;
      
      // 明示的に型キャスト
      return data as unknown as NestInvitation[];
    } catch (error) {
      console.error('Error fetching pending invitations:', error);
      return [];
    }
  }, [user?.email]);

  // データの初期化
  const initializeNestData = useCallback(async () => {
    if (!user || !session || authLoading) return;
    
    setInitializing(true);
    setLoading(true);
    setError(null);
    
    try {
      // 1. ユーザーのNestリストを取得
      const nests = await fetchUserNests();
      setUserNests(nests);
      
      if (nests.length === 0) {
        setCurrentNestState(null);
        setInitializing(false);
        setLoading(false);
        return;
      }
      
      // 2. 現在のNestを決定（ローカルストレージから取得またはリストの最初のものを使用）
      const storedNestId = localStorage.getItem('currentNestId');
      const currentNestToSet = storedNestId 
        ? nests.find(n => n.id === storedNestId) || nests[0]
        : nests[0];
      
      setCurrentNestState(currentNestToSet);
      
      // 3. 現在のNestのメンバーと設定を取得
      const [members, settings, invitations] = await Promise.all([
        fetchNestMembers(currentNestToSet.id),
        fetchNestSettings(currentNestToSet.id),
        fetchPendingInvitations()
      ]);
      
      setNestMembers(members);
      setNestSettings(settings);
      setPendingInvitations(invitations);
      
    } catch (err: any) {
      console.error('Error initializing nest data:', err);
      setError(err.message || 'データの初期化中にエラーが発生しました');
    } finally {
      setInitializing(false);
      setLoading(false);
    }
  }, [user, session, authLoading, fetchUserNests, fetchNestMembers, fetchNestSettings, fetchPendingInvitations]);

  // 初期化
  useEffect(() => {
    initializeNestData();
  }, [initializeNestData]);

  // Nest切り替え
  const setCurrentNestById = useCallback(async (nestId: string) => {
    const nestToSet = userNests.find(n => n.id === nestId);
    if (!nestToSet || !user || nestToSet.id === currentNest?.id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      setCurrentNestState(nestToSet);
      localStorage.setItem('currentNestId', nestToSet.id);
      
      // 新しいNestのメンバーと設定を取得
      const [members, settings] = await Promise.all([
        fetchNestMembers(nestId),
        fetchNestSettings(nestId)
      ]);
      
      setNestMembers(members);
      setNestSettings(settings);
      
      // 最終アクティブ日時を更新（バックグラウンド処理）
      try {
        await supabase
          .from('nest_members')
          .update({ last_active_at: new Date().toISOString() })
          .match({ nest_id: nestId, user_id: user.id });
      } catch (updateErr) {
        console.error('Error updating last active time:', updateErr);
      }
        
    } catch (err: any) {
      console.error('Error setting current nest:', err);
      setError(err.message || 'Nestの切り替え中にエラーが発生しました');
      
      // エラー時は前の状態に戻す
      setCurrentNestState(currentNest);
    } finally {
      setLoading(false);
    }
  }, [userNests, user, currentNest, fetchNestMembers, fetchNestSettings]);

  // データの更新
  const refreshData = useCallback(async () => {
    await initializeNestData();
  }, [initializeNestData]);

  // Nestの作成
  const createNest = async (data: { name: string; description?: string; color?: string }) => {
    setLoading(true);
    setError(null);
    
    try {
      if (!user) throw new Error('認証されていません');
      if (!data.name) throw new Error('Nestの名前を入力してください');
      
      // 1. Nestを作成
      const { data: newNest, error } = await supabase
        .from('nests')
        .insert({
          name: data.name,
          description: data.description || '',
          owner_id: user.id,
          color: data.color || '#3498db', // デフォルトカラー
          is_active: true,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // 2. 自分をメンバーとして追加
      const { error: memberError } = await supabase
        .from('nest_members')
        .insert({
          nest_id: newNest.id,
          user_id: user.id,
          role: 'owner',
          joined_at: new Date().toISOString()
        });
        
      if (memberError) throw memberError;
      
      // 3. デフォルト設定を作成
      const { error: settingsError } = await supabase
        .from('nest_settings')
        .insert({
          nest_id: newNest.id,
          privacy_settings: {
            inviteRestriction: 'owner_only',
            contentVisibility: 'members_only',
            memberListVisibility: 'members_only'
          }
        });
        
      if (settingsError) throw settingsError;
      
      // 4. データをリフレッシュ
      await refreshData();
      
      return { error: null, nest: newNest as Nest };
    } catch (err: any) {
      console.error('Error creating nest:', err);
      setError(err.message || 'Nestの作成に失敗しました');
      return { error: err, nest: null };
    } finally {
      setLoading(false);
    }
  };

  // Nestの更新
  const updateNest = async (nestId: string, data: Partial<Nest>) => {
    setError(null);
    
    try {
      if (!user) throw new Error('認証されていません');
      
      // 権限チェック
      const nest = userNests.find(n => n.id === nestId);
      if (!nest) throw new Error('Nestが見つかりません');
      if (nest.owner_id !== user.id) throw new Error('更新権限がありません');
      
      const { error } = await supabase
        .from('nests')
        .update(data)
        .eq('id', nestId);
        
      if (error) throw error;
      
      await refreshData();
      return { error: null };
    } catch (err: any) {
      console.error('Error updating nest:', err);
      setError(err.message || 'Nestの更新に失敗しました');
      return { error: err };
    }
  };

  // メンバーの招待
  const inviteMember = async (nestId: string, email: string) => {
    setError(null);
    
    try {
      if (!user) throw new Error('認証されていません');
      if (!email || !email.includes('@')) throw new Error('有効なメールアドレスを入力してください');
      
      // 1. 権限チェック
      const nest = userNests.find(n => n.id === nestId);
      if (!nest) throw new Error('Nestが見つかりません');
      
      const isMember = nestMembers.some(m => m.user_id === user.id);
      const isOwner = nest.owner_id === user.id;
      const settings = nestSettings;
      
      const canInvite = isOwner || 
        (isMember && settings?.privacy_settings.inviteRestriction === 'members');
        
      if (!canInvite) throw new Error('招待権限がありません');
      
      // 2. 既存ユーザーか確認
      const { data: existingUser } = await supabase
        .from('users')
        .select('id, display_name')
        .eq('email', email)
        .maybeSingle();
        
      // 3. 既に招待されているか確認
      const { data: existingInvitation } = await supabase
        .from('nest_invitations')
        .select('id')
        .eq('email', email)
        .eq('nest_id', nestId)
        .eq('is_accepted', false)
        .maybeSingle();
        
      if (existingInvitation) throw new Error('このメールアドレスには既に招待を送信済みです');
      
      // 4. 既にメンバーか確認
      if (existingUser) {
        const { data: existingMember } = await supabase
          .from('nest_members')
          .select('user_id')
          .eq('nest_id', nestId)
          .eq('user_id', existingUser.id)
          .maybeSingle();
          
        if (existingMember) throw new Error('このユーザーは既にメンバーです');
      }
      
      // 5. 招待トークンを生成
      const token = uuidv4();
      
      // 6. 招待レコードを作成
      const { data, error } = await supabase
        .from('nest_invitations')
        .insert({
          nest_id: nestId,
          email,
          invited_by: user.id,
          token,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          is_accepted: false
        })
        .select()
        .single();
        
      if (error) throw error;
      
      // 7. 通知を送信（既存ユーザーの場合はアプリ内通知、新規ユーザーの場合はメール）
      if (existingUser) {
        await supabase.from('notifications').insert({
          user_id: existingUser.id,
          type: 'nest_invitation',
          title: `${nest.name}への招待`,
          content: `${user.email}があなたを${nest.name}に招待しました`,
          data: {
            nest_id: nestId,
            invitation_id: data.id,
            token: token
          },
          is_read: false
        });
      } else {
        // メール送信はサーバー側で実装（ここではローカルに通知のみ）
        console.log(`招待メールを送信: ${email}, トークン: ${token}`);
      }
      
      // 8. 保留中の招待を更新
      const invitations = await fetchPendingInvitations();
      setPendingInvitations(invitations);
      
      return { error: null, invitation: data as NestInvitation };
    } catch (err: any) {
      console.error('Error inviting member:', err);
      setError(err.message || 'メンバーの招待に失敗しました');
      return { error: err, invitation: null };
    }
  };

  // 招待の承諾
  const acceptInvitation = async (token: string) => {
    setLoading(true);
    setError(null);
    
    try {
      if (!user) throw new Error('認証されていません');
      
      // 1. 招待を検索
      const { data: invitation, error: findError } = await supabase
        .from('nest_invitations')
        .select('id, nest_id, email')
        .eq('token', token)
        .eq('is_accepted', false)
        .single();
        
      if (findError) throw new Error('有効な招待が見つかりません');
      
      // 2. メールアドレスの確認
      if (invitation.email !== user.email) {
        throw new Error('この招待は別のメールアドレス宛てです');
      }
      
      // 3. メンバーとして追加
      const { error: memberError } = await supabase
        .from('nest_members')
        .insert({
          nest_id: invitation.nest_id,
          user_id: user.id,
          role: 'member',
          joined_at: new Date().toISOString()
        });
        
      if (memberError) throw memberError;
      
      // 4. 招待を承諾済みにマーク
      const { error: updateError } = await supabase
        .from('nest_invitations')
        .update({
          is_accepted: true,
          accepted_at: new Date().toISOString()
        })
        .eq('id', invitation.id);
        
      if (updateError) throw updateError;
      
      // 5. データをリフレッシュ
      await refreshData();
      
      return { error: null };
    } catch (err: any) {
      console.error('Error accepting invitation:', err);
      setError(err.message || '招待の承諾に失敗しました');
      return { error: err };
    } finally {
      setLoading(false);
    }
  };

  // Nestから退出
  const leaveNest = async (nestId: string) => {
    setError(null);
    
    try {
      if (!user) throw new Error('認証されていません');
      
      // 1. Nestの確認
      const nest = userNests.find(n => n.id === nestId);
      if (!nest) throw new Error('Nestが見つかりません');
      
      // 2. オーナーは退出不可
      if (nest.owner_id === user.id) {
        throw new Error('オーナーはNestから退出できません。Nestを削除するか、オーナー権限を他のメンバーに譲渡してください。');
      }
      
      // 3. メンバーから削除
      const { error } = await supabase
        .from('nest_members')
        .delete()
        .eq('nest_id', nestId)
        .eq('user_id', user.id);
        
      if (error) throw error;
      
      // 4. データをリフレッシュ
      await refreshData();
      
      return { error: null };
    } catch (err: any) {
      console.error('Error leaving nest:', err);
      setError(err.message || 'Nestからの退出に失敗しました');
      return { error: err };
    }
  };

  // 招待のキャンセル
  const cancelInvitation = async (invitationId: string) => {
    setError(null);
    
    try {
      if (!user) throw new Error('認証されていません');
      
      // 1. 招待を削除
      const { error } = await supabase
        .from('nest_invitations')
        .delete()
        .eq('id', invitationId);
        
      if (error) throw error;
      
      // 2. 保留中の招待を更新
      const invitations = await fetchPendingInvitations();
      setPendingInvitations(invitations);
      
      return { error: null };
    } catch (err: any) {
      console.error('Error canceling invitation:', err);
      return { error: err };
    }
  };

  // 招待の再送信
  const resendInvitation = async (invitationId: string) => {
    setError(null);
    
    try {
      if (!user) throw new Error('認証されていません');
      
      // 1. 招待情報を取得
      const { data: invitation, error: findError } = await supabase
        .from('nest_invitations')
        .select('id, nest_id, email, token')
        .eq('id', invitationId)
        .single();
        
      if (findError) throw new Error('招待が見つかりません');
      
      // 2. 有効期限を更新
      const { error: updateError } = await supabase
        .from('nest_invitations')
        .update({
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        })
        .eq('id', invitationId);
        
      if (updateError) throw updateError;
      
      // 3. メール再送信（現実装ではログ出力のみ）
      console.log(`招待メールを再送信: ${invitation.email}, トークン: ${invitation.token}`);
      
      return { error: null };
    } catch (err: any) {
      console.error('Error resending invitation:', err);
      setError(err.message || '招待の再送信に失敗しました');
      return { error: err };
    }
  };

  // プライバシー設定の更新
  const updatePrivacySettings = async (nestId: string, settings: Partial<NestPrivacySettings>) => {
    setError(null);
    
    try {
      if (!user) throw new Error('認証されていません');
      
      // 1. 現在の設定を取得
      const currentSettings = nestSettings;
      
      if (!currentSettings) throw new Error('設定が見つかりません');
      
      // 2. 設定を更新
      const updatedSettings = {
        privacy_settings: {
          ...currentSettings.privacy_settings,
          ...settings
        }
      };
      
      const { error } = await supabase
        .from('nest_settings')
        .update(updatedSettings)
        .eq('nest_id', nestId);
        
      if (error) throw error;
      
      // 3. 設定を再取得して状態を更新
      const newSettings = await fetchNestSettings(nestId);
      setNestSettings(newSettings);
      
      return { error: null };
    } catch (err: any) {
      console.error('Error updating privacy settings:', err);
      return { error: err };
    }
  };

  // コンテキスト値
  const value: NestContextType = {
    nests,
    currentNest,
    userNests,
    nestMembers,
    pendingInvitations,
    nestSettings,
    loading: loading || initializing,
    initializing,
    error,
    setCurrentNestById,
    createNest,
    updateNest,
    inviteMember,
    acceptInvitation,
    leaveNest,
    cancelInvitation,
    resendInvitation,
    updatePrivacySettings,
    refreshData,
    selectNest: setCurrentNestById,
    deleteNest: async (nestId: string): Promise<void> => {
      await leaveNest(nestId);
      return;
    },
    refreshNests: refreshData
  };

  return (
    <NestContext.Provider value={value}>
      {children}
    </NestContext.Provider>
  );
}

// カスタムフック
export function useNest() {
  const context = useContext(NestContext);
  if (context === undefined) {
    throw new Error('useNest must be used within a NestProvider');
  }
  return context;
} 