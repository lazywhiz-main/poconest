import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, Nest, NestMember, NestInvitation, NestSettings, NestPrivacySettings } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { randomUUID } from 'expo-crypto';

// Nestコンテキストの型定義
interface NestContextType {
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
}

// コンテキストの作成
const NestContext = createContext<NestContextType | undefined>(undefined);

// プロバイダーコンポーネント
export function NestProvider({ children }: { children: React.ReactNode }) {
  const { user, profile, loading: authLoading } = useAuth();
  const [currentNest, setCurrentNestState] = useState<Nest | null>(null);
  const [userNests, setUserNests] = useState<Nest[]>([]);
  const [nestMembers, setNestMembers] = useState<NestMember[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<NestInvitation[]>([]);
  const [nestSettings, setNestSettings] = useState<NestSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUserNestsInternal = useCallback(async (userId: string): Promise<Nest[]> => {
    console.log('NestContext: fetchUserNestsInternal 開始');
    const { data, error } = await supabase.rpc('get_user_nests', { user_id: userId });
    if (error) {
      console.error('Error fetching nests:', error.message);
      throw new Error('Nestリストの取得に失敗しました');
    }
    console.log('NestContext: fetchUserNestsInternal 完了');
    return (data as Nest[]) || [];
  }, []);

  const fetchNestMembersInternal = useCallback(async (nestId: string): Promise<NestMember[]> => {
    console.log(`NestContext: fetchNestMembersInternal 開始 (nestId: ${nestId})`);
    try {
      const { data, error } = await supabase.rpc('get_nest_members', { p_nest_id: nestId });
      if (error) {
        console.error('Error fetching nest members (RPC):', error.message);
        // エラー時は空の配列を返す
        console.log('NestContext: fetchNestMembersInternal 完了 (エラー発生時は空の配列を返す)');
        return [];
      }
      if (!data) return [];

      const userIds = data.map((member: any) => member.user_id);
      if (userIds.length === 0) {
        console.log('NestContext: fetchNestMembersInternal 完了 (メンバーなし)');
        return [];
      }

      try {
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('id, display_name, avatar_url, email')
          .in('id', userIds);

        if (usersError) {
          console.error('Error fetching user details for members:', usersError.message);
          // ユーザー情報が取得できなくてもメンバーリスト自体は返す
        }

        const membersWithUsers = data.map((member: any) => {
          const userDetail = usersData?.find((u: any) => u.id === member.user_id);
          return { ...member, users: userDetail };
        });
        console.log('NestContext: fetchNestMembersInternal 完了');
        return membersWithUsers.map((item: any) => convertToNestMember(item));
      } catch (userErr) {
        console.error('Error in user details fetch:', userErr);
        // ユーザー詳細取得エラー時はユーザー情報なしのメンバーリストを返す
        return data.map((item: any) => convertToNestMember(item));
      }
    } catch (err) {
      console.error('Error in fetchNestMembersInternal:', err);
      console.log('NestContext: fetchNestMembersInternal 完了 (例外発生時は空の配列を返す)');
      return [];
    }
  }, []);

  const fetchNestSettingsInternal = useCallback(async (nestId: string): Promise<NestSettings | null> => {
    console.log(`NestContext: fetchNestSettingsInternal 開始 (nestId: ${nestId})`);
    try {
      const { data, error } = await supabase
        .from('nest_settings')
        .select('*')
        .eq('nest_id', nestId)
        .single();

      if (error && error.code !== 'PGRST116') { // 'Not Found' 以外はエラー
        console.error('Error fetching nest settings:', error.message);
        // エラー時はnullを返す
        console.log('NestContext: fetchNestSettingsInternal 完了 (エラー発生時はnullを返す)');
        return null;
      }

      if (data) {
        console.log('NestContext: fetchNestSettingsInternal 完了 (設定あり)');
        return data as NestSettings;
      }

      // 設定が存在しない場合 (PGRST116) は null を返す (ここでは作成しない)
      console.log('NestContext: fetchNestSettingsInternal 完了 (設定なし)');
      return null;
    } catch (err) {
      console.error('Error in fetchNestSettingsInternal:', err);
      console.log('NestContext: fetchNestSettingsInternal 完了 (例外発生時はnullを返す)');
      return null;
    }
  }, []);

  const fetchPendingInvitationsInternal = useCallback(async (email: string): Promise<NestInvitation[]> => {
    console.log(`NestContext: fetchPendingInvitationsInternal 開始 (email: ${email})`);
    try {
      const { data, error } = await supabase
        .from('nest_invitations')
        .select(`
          id, nest_id, email, invited_by, created_at, expires_at, token, is_accepted,
          nests:nest_id (id, name, description),
          inviters:invited_by (id, display_name, avatar_url)
        `)
        .eq('email', email)
        .eq('is_accepted', false)
        .or('expires_at.is.null,expires_at.gt.now()');

      if (error) {
        console.error('Error fetching invitations:', error.message);
        // エラー時は空の配列を返す
        console.log('NestContext: fetchPendingInvitationsInternal 完了 (エラー発生時は空の配列を返す)');
        return [];
      }
      console.log('NestContext: fetchPendingInvitationsInternal 完了');
      return data ? data.map(convertToNestInvitation) : [];
    } catch (err) {
      console.error('Error in fetchPendingInvitationsInternal:', err);
      console.log('NestContext: fetchPendingInvitationsInternal 完了 (例外発生時は空の配列を返す)');
      return [];
    }
  }, []);

  const initializeNestData = useCallback(async () => {
    if (!user || !profile || authLoading) {
      console.log('NestContext: 初期化待機 (user, profile, authLoading)', { hasUser: !!user, hasProfile: !!profile, authLoading });
      return; // ユーザー情報とプロファイルが揃うまで待機
    }
    console.log('NestContext: initializeNestData 開始');
    setInitializing(true);
    setLoading(true); // 確実にローディング状態を開始
    setError(null);
    setNestMembers([]); // データクリア
    setNestSettings(null);
    setPendingInvitations([]);
    setCurrentNestState(null);

    try {
      // 1. ユーザーのNestリストを取得
      const nests = await fetchUserNestsInternal(user.id);
      setUserNests(nests);

      if (nests.length === 0) {
        console.log('NestContext: 所属Nestなし');
        setInitializing(false);
        setLoading(false); // ローディング状態を解除
        return; // Nestがなければここで終了
      }

      // 2. 現在のNestを決定
      let currentNestToSet: Nest | null = null;
      if (profile.default_nest_id) {
        currentNestToSet = nests.find(n => n.id === profile.default_nest_id) || nests[0];
      } else {
        currentNestToSet = nests[0];
      }
      setCurrentNestState(currentNestToSet);
      console.log(`NestContext: currentNest 決定 (id: ${currentNestToSet.id})`);

      // 3. 現在のNestの関連情報と招待情報を取得 (各データ取得を個別に実行し、エラーハンドリングを改善)
      try {
        const members = await fetchNestMembersInternal(currentNestToSet.id);
        setNestMembers(members);
      } catch (membersError) {
        console.error('メンバー取得エラー:', membersError);
        setNestMembers([]); // エラー時は空のメンバーリスト
      }

      try {
        const settings = await fetchNestSettingsInternal(currentNestToSet.id);
        setNestSettings(settings);
      } catch (settingsError) {
        console.error('設定取得エラー:', settingsError);
        setNestSettings(null); // エラー時はnull
      }

      try {
        const invitations = await fetchPendingInvitationsInternal(user.email!);
        setPendingInvitations(invitations);
      } catch (invitationsError) {
        console.error('招待取得エラー:', invitationsError);
        setPendingInvitations([]); // エラー時は空の招待リスト
      }

      console.log('NestContext: initializeNestData 完了');

    } catch (err: any) {
      console.error('NestContext: initializeNestData エラー:', err.message);
      setError(err.message || 'データの初期化中にエラーが発生しました');
      // エラー時も最低限の表示はできるように一部状態は更新しておく
      setUserNests([]); // エラー時はNestリストも空にするか、状況による
      setCurrentNestState(null);
    } finally {
      setInitializing(false);
      setLoading(false); // 必ず実行: ローディング状態を解除
      console.log('NestContext: 初期化完了 - ローディング解除');
    }
  }, [user, profile, authLoading, fetchUserNestsInternal, fetchNestMembersInternal, fetchNestSettingsInternal, fetchPendingInvitationsInternal]);

  useEffect(() => {
    initializeNestData();
  }, [initializeNestData]);

  const setCurrentNestById = useCallback(async (nestId: string) => {
    const nestToSet = userNests.find(n => n.id === nestId);
    if (!nestToSet || !user || nestToSet.id === currentNest?.id) {
      // Nestが見つからない、ユーザーがいない、または既に選択中の場合は何もしない
      return;
    }

    console.log(`NestContext: setCurrentNestById 開始 (id: ${nestId})`);
    setLoading(true); // 個別のローディング開始
    setError(null);
    setCurrentNestState(nestToSet);
    setNestMembers([]); // 切り替え時に一旦クリア
    setNestSettings(null);

    try {
      // 新しいNestのメンバーと設定を取得 (並行)
      const [members, settings] = await Promise.all([
        fetchNestMembersInternal(nestId),
        fetchNestSettingsInternal(nestId)
      ]);
      setNestMembers(members);
      setNestSettings(settings);

      // DB更新 (バックグラウンドで実行、エラーはコンソール表示のみ)
      Promise.allSettled([
        supabase
          .from('nest_members')
          .update({ last_active_at: new Date().toISOString() })
          .match({ nest_id: nestId, user_id: user.id }),
        supabase
          .from('users')
          .update({ default_nest_id: nestId })
          .eq('id', user.id)
      ]).then(results => {
          results.forEach((result, index) => {
            if (result.status === 'rejected') {
              console.error(`NestContext: setCurrentNestById DB更新エラー (${index === 0 ? 'last_active' : 'default_nest'}):`, result.reason);
            }
          });
        });

      console.log(`NestContext: setCurrentNestById 完了 (id: ${nestId})`);

    } catch (err: any) {
      console.error(`NestContext: setCurrentNestById エラー (id: ${nestId}):`, err.message);
      setError(err.message || 'Nestの切り替え中にエラーが発生しました');
      // エラーが発生したら前のNestに戻すか、nullにするか検討
      // setCurrentNestState(currentNest); // 例: 前の状態に戻す
      setCurrentNestState(null); // 例: nullにする
      setNestMembers([]);
      setNestSettings(null);
    } finally {
      setLoading(false); // 個別のローディング終了
    }
  }, [user, userNests, currentNest?.id, fetchNestMembersInternal, fetchNestSettingsInternal]);

  const refreshData = useCallback(async () => {
    console.log('NestContext: refreshData 呼び出し');
    await initializeNestData();
  }, [initializeNestData]);

  const createNest = async (data: { name: string; description?: string; color?: string }) => {
    try {
      setError(null);
      setLoading(true);
      
      if (!user) {
        throw new Error('認証されていません');
      }
      
      if (!data.name) {
        throw new Error('Nestの名前を入力してください');
      }

      const { data: newNest, error } = await supabase
        .from('nests')
        .insert({
          name: data.name,
          description: data.description || '',
          owner_id: user.id,
          color: data.color || '#A5D6A7',
          is_active: true,
        })
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      // 自分自身をメンバーとして追加
      const { error: memberError } = await supabase
        .from('nest_members')
        .insert({
          nest_id: newNest.id,
          user_id: user.id,
          role: 'owner'
        });
      
      if (memberError) {
        throw memberError;
      }
      
      // 作成成功後に全データをリフレッシュ
      await refreshData();

      return { error: null, nest: newNest as Nest };
    } catch (err: any) {
      console.error('Error creating nest:', err.message);
      setError(err.message || 'Nestの作成に失敗しました');
      setLoading(false);
      return { error: err, nest: null };
    }
  };

  const updateNest = async (nestId: string, data: Partial<Nest>) => {
    try {
      setError(null);
      
      if (!user) {
        throw new Error('認証されていません');
      }
      
      const nest = userNests.find(n => n.id === nestId);
      if (!nest) {
        throw new Error('Nestが見つかりません');
      }
      
      if (nest.owner_id !== user.id) {
        throw new Error('更新権限がありません');
      }

      const { error } = await supabase
        .from('nests')
        .update(data)
        .eq('id', nestId);
      
      if (error) {
        throw error;
      }
      
      // Nest一覧を再取得
      await refreshData();
      
      return { error: null };
    } catch (err: any) {
      console.error('Error updating nest:', err.message);
      setError(err.message || 'Nestの更新に失敗しました');
      return { error: err };
    }
  };

  const inviteMember = async (nestId: string, email: string) => {
    try {
      setError(null);
      
      if (!user) {
        throw new Error('認証されていません');
      }
      
      const nest = userNests.find(n => n.id === nestId);
      if (!nest) {
        throw new Error('Nestが見つかりません');
      }
      
      // 招待権限の確認
      const { data: settings } = await supabase
        .from('nest_settings')
        .select('privacy_settings')
        .eq('nest_id', nestId)
        .single();
      
      const canInvite = 
        nest.owner_id === user.id || 
        (settings?.privacy_settings?.inviteRestriction === 'members' && 
         nestMembers.some(m => m.user_id === user.id));
      
      if (!canInvite) {
        throw new Error('招待権限がありません');
      }
      
      if (!email || !email.includes('@')) {
        throw new Error('有効なメールアドレスを入力してください');
      }

      // 既存ユーザーの確認
      const { data: existingUser } = await supabase
        .from('users')
        .select('id, display_name')
        .eq('email', email)
        .single();

      // 既に招待されているか確認
      const { data: existingInvitation } = await supabase
        .from('nest_invitations')
        .select('*')
        .eq('email', email)
        .eq('nest_id', nestId)
        .eq('is_accepted', false)
        .single();

      if (existingInvitation) {
        throw new Error('このメールアドレスには既に招待を送信済みです');
      }

      // 既にメンバーかどうか確認
      if (existingUser) {
        const { data: existingMember } = await supabase
          .from('nest_members')
          .select('*')
          .eq('nest_id', nestId)
          .eq('user_id', existingUser.id)
          .single();

        if (existingMember) {
          throw new Error('このユーザーは既にメンバーです');
        }
      }

      // トークン生成
      const token = randomUUID();
      
      // 招待レコードの作成
      const { data, error } = await supabase
        .from('nest_invitations')
        .insert({
          nest_id: nestId,
          email,
          invited_by: user.id,
          token,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          is_accepted: false,
          target_user_id: existingUser?.id || null,
        })
        .select()
        .single();
      
      if (error) {
        throw error;
      }

      // 既存ユーザーの場合はアプリ内通知を送信
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
        // 新規ユーザーの場合はメール送信
        const inviteLink = `https://poconest.app/invite/${token}`;
        const { error: mailError } = await supabase.functions.invoke('send-invitation', {
          body: {
            email,
            nestName: nest.name,
            inviterEmail: user.email,
            inviteLink
          }
        });

        if (mailError) {
          console.error('メール送信エラー:', mailError);
          // メール送信に失敗しても招待自体は作成済みなのでエラーはスローしない
        }
      }
      
      // 招待リストを再取得
      if (user?.email) {
         // 部分的な更新
         const invitations = await fetchPendingInvitationsInternal(user.email);
         setPendingInvitations(invitations);
         // あるいは全体リフレッシュ
         // await refreshData();
      }

      return { error: null, invitation: data as NestInvitation };
    } catch (err: any) {
      console.error('Error inviting member:', err.message);
      setError(err.message || 'メンバーの招待に失敗しました');
      return { error: err, invitation: null };
    }
  };

  const acceptInvitation = async (token: string) => {
    try {
      setError(null);
      setLoading(true);

      if (!user) {
        throw new Error('認証されていません');
      }

      // RPC関数を呼び出して招待を受諾し、メンバーに追加
      const { error: rpcError } = await supabase.rpc('accept_invitation', {
        invitation_token: token
      });

      if (rpcError) {
        console.error('Error accepting invitation via RPC:', rpcError);
        throw new Error(rpcError.message || '招待の受諾に失敗しました');
      }

      // 成功したら、Nestリスト、メンバーリスト、招待リストを更新
      await refreshData(); // 全データリフレッシュ

      setLoading(false);
      return { error: null };

    } catch (err: any) {
      console.error('Error accepting invitation:', err.message);
      setError(err.message || '招待の受諾に失敗しました');
      setLoading(false);
      return { error: err };
    }
  };

  const leaveNest = async (nestId: string) => {
    try {
      setError(null);
      
      if (!user) {
        throw new Error('認証されていません');
      }
      
      const nest = userNests.find(n => n.id === nestId);
      if (!nest) {
        throw new Error('Nestが見つかりません');
      }
      
      if (nest.owner_id === user.id) {
        throw new Error('オーナーはNestから退出できません。Nestを削除するか、オーナー権限を他のメンバーに譲渡してください。');
      }

      const { error } = await supabase
        .from('nest_members')
        .delete()
        .match({ nest_id: nestId, user_id: user.id });
      
      if (error) {
        throw error;
      }
      
      // Nestリストなどをリフレッシュ
      await refreshData();

      return { error: null };
    } catch (err: any) {
      console.error('Error leaving nest:', err.message);
      setError(err.message || 'Nestからの退出に失敗しました');
      return { error: err };
    }
  };

  const cancelInvitation = async (invitationId: string) => {
    try {
      setError(null);
      
      if (!user) {
        throw new Error('認証されていません');
      }

      const { error } = await supabase
        .from('nest_invitations')
        .delete()
        .eq('id', invitationId);

      if (error) {
        console.error('Error canceling invitation:', error);
        throw error;
      }

      // 招待リストを再取得
       if (user?.email) {
         const invitations = await fetchPendingInvitationsInternal(user.email);
         setPendingInvitations(invitations);
         // あるいは全体リフレッシュ
         // await refreshData();
      }

      return { error: null };
    } catch (err: any) {
      console.error('Error in cancelInvitation:', err.message);
      return { error: err };
    }
  };

  const resendInvitation = async (invitationId: string): Promise<{ error: Error | null }> => {
    try {
      setError(null);
      setLoading(true); // ローディング開始を追加

      if (!user) {
        throw new Error('認証されていません');
      }

      // 既存の招待情報を取得して再送処理 (メール送信など)
      // (既存の resendInvitation ロジック - 変更なしだが、エラーハンドリングと戻り値を追加)
      // ここではダミーの実装として成功/失敗を返す例
      console.log(`resendInvitation 実行 (ID: ${invitationId}) - 実際のメール送信等は未実装`);
      // 例: 成功した場合
      // await someResendLogic(invitationId);

      // 必要であれば招待リストを再取得 (今回は省略)
      // if (user?.email) {
      //   const invitations = await fetchPendingInvitationsInternal(user.email);
      //   setPendingInvitations(invitations);
      // }

      setLoading(false);
      return { error: null }; // 成功時は null エラーを返す
    } catch (err: any) {
      console.error('Error in resendInvitation:', err.message);
      setError(err.message || '招待の再送に失敗しました');
      setLoading(false);
      return { error: err }; // 失敗時はエラーオブジェクトを返す
    }
  };

  const fetchNestSettings = useCallback(async (nestId: string) => {
    try {
      console.log(`NestContext: fetchNestSettings (旧) 開始 (nestId: ${nestId})`);
      const settings = await fetchNestSettingsInternal(nestId);
      // 取得した設定を状態にセットする（必要であれば）
      // setNestSettings(settings); // ここでセットすると競合の可能性
      console.log(`NestContext: fetchNestSettings (旧) 完了 (nestId: ${nestId})`);
      return settings; // 返り値を使う場合
    } catch (err: any) {
      console.error('Error fetching nest settings (旧):', err.message);
      setError('設定の取得に失敗しました');
      return null;
    }
  }, [fetchNestSettingsInternal]);

  const updatePrivacySettings = async (nestId: string, settings: Partial<NestPrivacySettings>) => {
    try {
      setError(null);

      if (!user) {
        throw new Error('認証されていません');
      }

      // 現在の設定を取得
      const { data: currentSettings, error: fetchError } = await supabase
        .from('nest_settings')
        .select('privacy_settings')
        .eq('nest_id', nestId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      const updatedSettings = {
        privacy_settings: {
          ...(currentSettings?.privacy_settings || {
            inviteRestriction: 'owner_only',
            contentVisibility: 'members_only',
            memberListVisibility: 'members_only'
          }),
          ...settings
        }
      };

      const { error: updateError } = await supabase
        .from('nest_settings')
        .upsert({
          nest_id: nestId,
          ...updatedSettings
        });

      if (updateError) {
        throw updateError;
      }

      // 設定を再取得して状態を更新
      const updatedSettingsData = await fetchNestSettingsInternal(nestId);
      setNestSettings(updatedSettingsData);
      // あるいは全体リフレッシュ
      // await refreshData();

      return { error: null };
    } catch (err: any) {
      console.error('Error updating privacy settings:', err.message);
      return { error: err };
    }
  };

  const convertToNestMember = (data: any): NestMember => {
    return {
      nest_id: data.nest_id,
      user_id: data.user_id,
      role: data.role,
      joined_at: data.joined_at,
      last_active_at: data.last_active_at,
      users: data.users || undefined
    };
  };

  const convertToNestInvitation = (data: any): NestInvitation => {
    return {
      id: data.id,
      nest_id: data.nest_id,
      email: data.email,
      invited_by: data.invited_by,
      created_at: data.created_at,
      expires_at: data.expires_at,
      token: data.token,
      is_accepted: data.is_accepted,
      accepted_at: data.accepted_at,
      nests: data.nests ? {
        id: data.nests.id,
        name: data.nests.name,
        description: data.nests.description
      } : undefined,
      inviters: data.inviters ? {
        id: data.inviters.id,
        display_name: data.inviters.display_name,
        avatar_url: data.inviters.avatar_url
      } : undefined
    };
  };

  const value = {
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
  };

  return (
    <NestContext.Provider value={value}>
      {children}
    </NestContext.Provider>
  );
}

export function useNest() {
  const context = useContext(NestContext);
  if (context === undefined) {
    throw new Error('useNest must be used within a NestProvider');
  }
  return context;
} 