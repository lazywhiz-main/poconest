import { supabase } from '@services/supabase';
import { v4 as uuidv4 } from 'uuid';

// 招待メンバーのメールアドレスによる招待
export const inviteMemberByEmail = async (nestId: string, email: string) => {
  try {
    // 認証チェック
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { error: { message: '認証されていません' } };
    }

    // 現在のユーザーがNESTのメンバーか確認
    const { data: currentMember, error: memberError } = await supabase
      .from('nest_members')
      .select('user_id, role')
      .eq('nest_id', nestId)
      .eq('user_id', user.id)
      .single();

    if (memberError || !currentMember) {
      return { error: { message: 'NESTのメンバーではないため、招待を行う権限がありません' } };
    }

    // NESTのプライバシー設定を確認
    const { data: nestSettings, error: settingsError } = await supabase
      .from('nest_settings')
      .select('privacy_settings')
      .eq('nest_id', nestId)
      .single();

    // プライバシー設定が存在し、権限がある場合のみ招待可能
    const canInvite = 
      currentMember.role === 'owner' || 
      (nestSettings?.privacy_settings?.inviteRestriction === 'members' && 
      currentMember.role !== 'restricted');

    if (!canInvite) {
      return { error: { message: '招待を行う権限がありません' } };
    }

    // 既存ユーザーか確認
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, display_name')
      .eq('email', email)
      .maybeSingle();

    // 既に招待されているか確認
    const { data: existingInvitation } = await supabase
      .from('nest_invitations')
      .select('id')
      .eq('email', email)
      .eq('nest_id', nestId)
      .eq('is_accepted', false)
      .maybeSingle();

    if (existingInvitation) {
      return { error: { message: 'このメールアドレスには既に招待を送信済みです' } };
    }

    // 既にメンバーか確認
    if (existingUser) {
      const { data: existingMember } = await supabase
        .from('nest_members')
        .select('user_id')
        .eq('nest_id', nestId)
        .eq('user_id', existingUser.id)
        .maybeSingle();

      if (existingMember) {
        return { error: { message: 'このユーザーは既にメンバーです' } };
      }
    }

    // 招待トークンを生成
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 1週間後

    // 招待レコードを作成
    const { data: invitation, error: invitationError } = await supabase
      .from('nest_invitations')
      .insert({
        nest_id: nestId,
        email,
        invited_by: user.id,
        token,
        expires_at: expiresAt,
        is_accepted: false
      })
      .select('id, nest_id, token, email, invited_by, created_at, expires_at')
      .single();

    if (invitationError) {
      return { error: { message: '招待レコードの作成に失敗しました' } };
    }

    // NESTの情報を取得
    const { data: nest } = await supabase
      .from('nests')
      .select('id, name')
      .eq('id', nestId)
      .single();

    // 通知を送信（既存ユーザーの場合はアプリ内通知、新規ユーザーの場合はメール）
    if (existingUser) {
      await supabase.from('notifications').insert({
        user_id: existingUser.id,
        type: 'nest_invitation',
        title: `${nest?.name || 'NEST'}への招待`,
        content: `${user.email}があなたを${nest?.name || 'NEST'}に招待しました`,
        data: {
          nest_id: nestId,
          invitation_id: invitation.id,
          token
        },
        is_read: false
      });
    } else {
      // メール送信処理（Supabase Edge Functionsなどを使用）
      // ここではモック処理
      console.log(`[MOCK] 招待メールを送信: ${email}, トークン: ${token}`);
      
      // Supabase Edge Functions呼び出し例
      /*
      await supabase.functions.invoke('send-invitation-email', {
        body: {
          email,
          nestId: nestId,
          nestName: nest?.name,
          inviterEmail: user.email,
          token
        }
      });
      */
    }

    return { 
      success: true, 
      invitation: {
        ...invitation,
        nestName: nest?.name
      }
    };
  } catch (error: any) {
    console.error('Error inviting member:', error);
    return { error: { message: error.message || '招待処理中にエラーが発生しました' } };
  }
};

// 保留中の招待を取得
export const getPendingInvitations = async (nestId: string) => {
  try {
    const { data: invitations, error } = await supabase
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
        invited_users:invited_by (
          id, 
          display_name, 
          avatar_url
        )
      `)
      .eq('nest_id', nestId)
      .eq('is_accepted', false)
      .order('created_at', { ascending: false });

    if (error) {
      return { error: { message: '招待の取得に失敗しました' } };
    }

    return { success: true, invitations };
  } catch (error: any) {
    console.error('Error getting pending invitations:', error);
    return { error: { message: error.message || '招待の取得中にエラーが発生しました' } };
  }
};

// 招待をキャンセル
export const cancelInvitation = async (invitationId: string) => {
  try {
    // 認証チェック
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { error: { message: '認証されていません' } };
    }

    // 招待情報を取得
    const { data: invitation, error: getError } = await supabase
      .from('nest_invitations')
      .select('nest_id, invited_by')
      .eq('id', invitationId)
      .single();

    if (getError || !invitation) {
      return { error: { message: '招待が見つかりません' } };
    }

    // 権限チェック
    const { data: nestMember } = await supabase
      .from('nest_members')
      .select('role')
      .eq('nest_id', invitation.nest_id)
      .eq('user_id', user.id)
      .single();

    // オーナーまたは招待者のみキャンセル可能
    const canCancel = 
      nestMember?.role === 'owner' || 
      invitation.invited_by === user.id;

    if (!canCancel) {
      return { error: { message: '招待をキャンセルする権限がありません' } };
    }

    // 招待を削除
    const { error: deleteError } = await supabase
      .from('nest_invitations')
      .delete()
      .eq('id', invitationId);

    if (deleteError) {
      return { error: { message: '招待のキャンセルに失敗しました' } };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error canceling invitation:', error);
    return { error: { message: error.message || '招待のキャンセル中にエラーが発生しました' } };
  }
};

// 招待を再送信
export const resendInvitation = async (invitationId: string) => {
  try {
    // 認証チェック
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { error: { message: '認証されていません' } };
    }

    // 招待情報を取得
    const { data: invitation, error: getError } = await supabase
      .from('nest_invitations')
      .select(`
        id, 
        nest_id, 
        email, 
        token,
        nests:nest_id (
          id,
          name
        )
      `)
      .eq('id', invitationId)
      .single();

    if (getError || !invitation) {
      return { error: { message: '招待が見つかりません' } };
    }

    // 有効期限を更新
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 1週間後
    const { error: updateError } = await supabase
      .from('nest_invitations')
      .update({
        expires_at: expiresAt
      })
      .eq('id', invitationId);

    if (updateError) {
      return { error: { message: '招待の更新に失敗しました' } };
    }

    // メール再送信処理（Supabase Edge Functionsなどを使用）
    // ここではモック処理
    console.log(`[MOCK] 招待メールを再送信: ${invitation.email}, トークン: ${invitation.token}`);

    // Supabase Edge Functions呼び出し例
    /*
    await supabase.functions.invoke('send-invitation-email', {
      body: {
        email: invitation.email,
        nestId: invitation.nest_id,
        nestName: invitation.nests?.name,
        inviterEmail: user.email,
        token: invitation.token
      }
    });
    */

    return { success: true };
  } catch (error: any) {
    console.error('Error resending invitation:', error);
    return { error: { message: error.message || '招待の再送信中にエラーが発生しました' } };
  }
};

// 招待リンク生成
export const generateInviteLink = async (nestId: string, expiresInHours: number = 72) => {
  try {
    // 認証チェック
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { error: { message: '認証されていません' } };
    }

    // 権限チェック
    const { data: nestMember, error: memberError } = await supabase
      .from('nest_members')
      .select('role')
      .eq('nest_id', nestId)
      .eq('user_id', user.id)
      .single();

    if (memberError || !nestMember) {
      return { error: { message: 'NESTのメンバーではないため、招待リンクを生成する権限がありません' } };
    }

    // プライバシー設定を確認
    const { data: nestSettings } = await supabase
      .from('nest_settings')
      .select('privacy_settings')
      .eq('nest_id', nestId)
      .single();

    // 招待権限確認
    const canGenerateLink = 
      nestMember.role === 'owner' || 
      (nestSettings?.privacy_settings?.inviteRestriction === 'members' && 
       nestMember.role !== 'restricted');

    if (!canGenerateLink) {
      return { error: { message: '招待リンクを生成する権限がありません' } };
    }

    // トークン生成
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000).toISOString();

    // 招待リンクレコードを作成
    const { data: linkData, error: linkError } = await supabase
      .from('nest_invite_links')
      .insert({
        nest_id: nestId,
        created_by: user.id,
        token,
        expires_at: expiresAt,
        is_active: true
      })
      .select('id, token, created_at, expires_at')
      .single();

    if (linkError) {
      return { error: { message: '招待リンクの生成に失敗しました' } };
    }

    // アプリのドメインを取得（環境によって切り替え）
    const appDomain = 
      Platform.OS === 'web' 
        ? window.location.origin 
        : 'https://poconest.app'; // モバイルアプリのディープリンク用URL

    // 招待リンクを生成
    const inviteLink = `${appDomain}/invite/${token}`;

    return { 
      success: true, 
      link: inviteLink,
      expiresAt: linkData.expires_at
    };
  } catch (error: any) {
    console.error('Error generating invite link:', error);
    return { error: { message: error.message || '招待リンクの生成中にエラーが発生しました' } };
  }
};

// 招待リンクによる招待承諾
export const acceptInviteByLink = async (token: string) => {
  try {
    // 認証チェック
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { error: { message: '認証されていません。ログインしてください。' } };
    }

    // 招待リンクを検索
    const { data: inviteLink, error: findError } = await supabase
      .from('nest_invite_links')
      .select(`
        id, 
        nest_id,
        expires_at,
        is_active,
        nests:nest_id (
          id,
          name,
          owner_id
        )
      `)
      .eq('token', token)
      .eq('is_active', true)
      .single();

    if (findError || !inviteLink) {
      return { error: { message: '有効な招待リンクが見つかりません' } };
    }

    // リンクの有効期限チェック
    if (inviteLink.expires_at && new Date(inviteLink.expires_at) < new Date()) {
      return { error: { message: '招待リンクの有効期限が切れています' } };
    }

    // 既にメンバーでないかチェック
    const { data: existingMember } = await supabase
      .from('nest_members')
      .select('id')
      .eq('nest_id', inviteLink.nest_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingMember) {
      return { error: { message: 'あなたは既にこのNESTのメンバーです' } };
    }

    // NESTメンバーとして追加
    const { error: memberError } = await supabase
      .from('nest_members')
      .insert({
        nest_id: inviteLink.nest_id,
        user_id: user.id,
        role: 'member',
        joined_at: new Date().toISOString()
      });

    if (memberError) {
      return { error: { message: 'NESTへの参加に失敗しました' } };
    }

    // 所有者に通知
    await supabase.from('notifications').insert({
      user_id: inviteLink.nests.owner_id,
      type: 'nest_member_joined',
      title: 'NESTに新しいメンバーが参加しました',
      content: `${user.email}が${inviteLink.nests.name || 'NEST'}に参加しました`,
      data: {
        nest_id: inviteLink.nest_id,
        user_id: user.id
      },
      is_read: false
    });

    return {
      success: true,
      nestId: inviteLink.nest_id,
      nestName: inviteLink.nests.name
    };
  } catch (error: any) {
    console.error('Error accepting invite by link:', error);
    return { error: { message: error.message || '招待の承諾中にエラーが発生しました' } };
  }
};

// メール招待による招待承諾
export const acceptInviteByEmail = async (token: string) => {
  try {
    // 認証チェック
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { error: { message: '認証されていません。ログインしてください。' } };
    }

    // 招待を検索
    const { data: invitation, error: findError } = await supabase
      .from('nest_invitations')
      .select(`
        id, 
        nest_id, 
        email,
        nests:nest_id (
          id,
          name,
          owner_id
        )
      `)
      .eq('token', token)
      .eq('is_accepted', false)
      .single();

    if (findError || !invitation) {
      return { error: { message: '有効な招待が見つかりません' } };
    }

    // メールアドレスの確認
    if (invitation.email !== user.email) {
      return { error: { message: 'この招待は別のメールアドレス宛てです' } };
    }

    // メンバーとして追加
    const { error: memberError } = await supabase
      .from('nest_members')
      .insert({
        nest_id: invitation.nest_id,
        user_id: user.id,
        role: 'member',
        joined_at: new Date().toISOString()
      });

    if (memberError) {
      return { error: { message: 'NESTへの参加に失敗しました' } };
    }

    // 招待を承諾済みにマーク
    const { error: updateError } = await supabase
      .from('nest_invitations')
      .update({
        is_accepted: true,
        accepted_at: new Date().toISOString()
      })
      .eq('id', invitation.id);

    if (updateError) {
      return { error: { message: '招待の更新に失敗しました' } };
    }

    // 所有者に通知
    await supabase.from('notifications').insert({
      user_id: invitation.nests.owner_id,
      type: 'nest_member_joined',
      title: 'NESTに新しいメンバーが参加しました',
      content: `${user.email}が${invitation.nests.name || 'NEST'}に参加しました`,
      data: {
        nest_id: invitation.nest_id,
        user_id: user.id
      },
      is_read: false
    });

    return {
      success: true,
      nestId: invitation.nest_id,
      nestName: invitation.nests.name
    };
  } catch (error: any) {
    console.error('Error accepting invite by email:', error);
    return { error: { message: error.message || '招待の承諾中にエラーが発生しました' } };
  }
};

// Platform型定義
const Platform = {
  OS: typeof window !== 'undefined' ? 'web' : 'native',
};

export default {
  inviteMemberByEmail,
  getPendingInvitations,
  cancelInvitation,
  resendInvitation,
  generateInviteLink,
  acceptInviteByLink,
  acceptInviteByEmail
}; 