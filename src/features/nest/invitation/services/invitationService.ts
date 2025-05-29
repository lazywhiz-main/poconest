import { supabase } from '@services/supabase';
import { v4 as uuidv4 } from 'uuid';

// 招待メンバーのメールアドレスによる招待
export const inviteMemberByEmail = async (nestId: string, email: string) => {
  console.log('[inviteMemberByEmail] 実際に呼ばれた', nestId, email);
  try {
    // 認証チェック
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { error: { message: '認証されていません' } };
    }

    console.log('[inviteMemberByEmail] user:', user);
    // 現在のユーザーがNESTのメンバーか確認
    const { data: currentMember, error: memberError } = await supabase
      .from('nest_members')
      .select('user_id, role')
      .eq('nest_id', nestId)
      .eq('user_id', user.id)
      .single();
    console.log('[inviteMemberByEmail] currentMember:', currentMember, 'memberError:', memberError);
    if (memberError || !currentMember) {
      console.log('[inviteMemberByEmail] NESTのメンバーでないためreturn');
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

    console.log('[inviteMemberByEmail] canInvite:', canInvite);
    if (!canInvite) {
      console.log('[inviteMemberByEmail] 招待権限なしreturn');
      return { error: { message: '招待を行う権限がありません' } };
    }

    // 既存ユーザーか確認
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, display_name')
      .eq('email', email)
      .maybeSingle();
    console.log('[inviteMemberByEmail] existingUser:', existingUser);

    // 既に招待されているか確認
    const { data: existingInvitation } = await supabase
      .from('nest_invitations')
      .select('id')
      .eq('invited_email', email)
      .eq('nest_id', nestId)
      .eq('is_accepted', false)
      .maybeSingle();
    console.log('[inviteMemberByEmail] existingInvitation:', existingInvitation);

    if (existingInvitation) {
      console.log('[inviteMemberByEmail] 既に招待済みreturn');
      return { error: { message: 'このメールアドレスには既に招待を送信済みです' } };
    }

    // 既にメンバーか確認
    let existingMember = null;
    if (existingUser) {
      const { data: _existingMember } = await supabase
        .from('nest_members')
        .select('user_id')
        .eq('nest_id', nestId)
        .eq('user_id', existingUser.id)
        .maybeSingle();
      existingMember = _existingMember;
      console.log('[inviteMemberByEmail] existingMember:', existingMember);
      if (existingMember) {
        console.log('[inviteMemberByEmail] 既にメンバーreturn');
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
        invited_email: email,
        invited_by: user.id,
        token,
        expires_at: expiresAt,
        is_accepted: false
      })
      .select('id, nest_id, token, invited_email, invited_by, created_at, expires_at')
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

    // 通知を送信（既存ユーザーの場合はアプリ内通知）
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
    }
    // 既存ユーザーかどうかに関係なくメール送信Edge Functionを呼び出す
    console.log('[inviteMemberByEmail] send-invitation呼び出し直前', { email, nestName: nest?.name, inviterEmail: user.email, inviteLink: `https://poconest.app/invite/${token}` });
    const { data: mailData, error: mailError } = await supabase.functions.invoke('send-invitation', {
      body: {
        email,
        nestName: nest?.name,
        inviterEmail: user.email,
        inviteLink: `https://poconest.app/invite/${token}`
      }
    });
    console.log('[inviteMemberByEmail] send-invitationレスポンス', { mailData, mailError });
    // エラー時はログのみ（招待自体は作成済みなのでスローしない）

    return { 
      success: true, 
      invitation: {
        ...invitation,
        nestName: nest?.name
      }
    };
  } catch (error: any) {
    console.error('[inviteMemberByEmail] 例外:', error);
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
        invited_email, 
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
      .select(`
        nest_id, 
        invited_by,
        invited_email,
        nests:nest_id (
          id,
          name,
          owner_id
        )
      `)
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

    // 招待者に通知を送信
    let ownerId = '';
    if (Array.isArray(invitation.nests)) {
      ownerId = invitation.nests[0]?.owner_id || '';
    } else if (invitation.nests && typeof invitation.nests === 'object' && 'owner_id' in invitation.nests && typeof (invitation.nests as any).owner_id === 'string') {
      ownerId = (invitation.nests as any).owner_id;
    }

    let nestName = '';
    if (Array.isArray(invitation.nests)) {
      nestName = invitation.nests[0]?.name || '';
    } else if (invitation.nests && typeof invitation.nests === 'object' && 'name' in invitation.nests && typeof (invitation.nests as any).name === 'string') {
      nestName = (invitation.nests as any).name;
    }

    await supabase.from('notifications').insert({
      user_id: ownerId,
      type: 'invitation_canceled',
      title: '招待がキャンセルされました',
      content: `${invitation.invited_email}への招待がキャンセルされました`,
      data: {
        nest_id: invitation.nest_id,
        nest_name: nestName,
        invited_email: invitation.invited_email
      },
      is_read: false
    });

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
        invited_email, 
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

    // メール再送信処理（Supabase Edge Functionsを使用）
    const inviteLink = `https://poconest.app/invite/${invitation.token}`;
    let nestName = '';
    if (Array.isArray(invitation.nests)) {
      nestName = (invitation.nests[0] && typeof invitation.nests[0].name === 'string') ? invitation.nests[0].name : '';
    } else if (invitation.nests && typeof invitation.nests === 'object' && 'name' in invitation.nests && typeof (invitation.nests as any).name === 'string') {
      nestName = (invitation.nests as any).name;
    }
    const { data: mailData, error: mailError } = await supabase.functions.invoke('send-invitation', {
      body: {
        email: invitation.invited_email,
        nestName,
        inviterEmail: user.email,
        inviteLink
      }
    });
    if (mailError) {
      console.error('[resendInvitation] send-invitationエラー:', mailError);
      return { error: { message: 'メールの再送信に失敗しました' } };
    }

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
    let ownerId = '';
    if (Array.isArray(inviteLink.nests)) {
      ownerId = inviteLink.nests[0]?.owner_id || '';
    } else if (inviteLink.nests && typeof inviteLink.nests === 'object' && 'owner_id' in inviteLink.nests && typeof (inviteLink.nests as any).owner_id === 'string') {
      ownerId = (inviteLink.nests as any).owner_id;
    }
    let inviteNestName = '';
    if (Array.isArray(inviteLink.nests)) {
      inviteNestName = inviteLink.nests[0]?.name || '';
    } else if (inviteLink.nests && typeof inviteLink.nests === 'object' && 'name' in inviteLink.nests && typeof (inviteLink.nests as any).name === 'string') {
      inviteNestName = (inviteLink.nests as any).name;
    }
    await supabase.from('notifications').insert({
      user_id: ownerId,
      type: 'nest_member_joined',
      title: 'NESTに新しいメンバーが参加しました',
      content: `${user.email}が${inviteNestName || 'NEST'}に参加しました`,
      data: {
        nest_id: inviteLink.nest_id,
        user_id: user.id
      },
      is_read: false
    });

    return {
      success: true,
      nestId: inviteLink.nest_id,
      nestName: inviteNestName
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
        invited_email,
        invited_by,
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
    if (invitation.invited_email !== user.email) {
      return { error: { message: 'この招待は別のメールアドレス宛てです' } };
    }

    // 既にメンバーでないかチェック
    const { data: existingMember } = await supabase
      .from('nest_members')
      .select('id')
      .eq('nest_id', invitation.nest_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingMember) {
      return { error: { message: 'あなたは既にこのNESTのメンバーです' } };
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

    // 所有者と招待者に通知
    let ownerId = '';
    if (Array.isArray(invitation.nests)) {
      ownerId = invitation.nests[0]?.owner_id || '';
    } else if (invitation.nests && typeof invitation.nests === 'object' && 'owner_id' in invitation.nests && typeof (invitation.nests as any).owner_id === 'string') {
      ownerId = (invitation.nests as any).owner_id;
    }

    let nestName = '';
    if (Array.isArray(invitation.nests)) {
      nestName = invitation.nests[0]?.name || '';
    } else if (invitation.nests && typeof invitation.nests === 'object' && 'name' in invitation.nests && typeof (invitation.nests as any).name === 'string') {
      nestName = (invitation.nests as any).name;
    }

    // 所有者への通知
    if (ownerId && ownerId !== user.id) {
      await supabase.from('notifications').insert({
        user_id: ownerId,
        type: 'nest_member_joined',
        title: 'NESTに新しいメンバーが参加しました',
        content: `${user.email}が${nestName || 'NEST'}に参加しました`,
        data: {
          nest_id: invitation.nest_id,
          user_id: user.id
        },
        is_read: false
      });
    }

    // 招待者への通知（招待者が所有者と異なる場合）
    if (invitation.invited_by && invitation.invited_by !== ownerId && invitation.invited_by !== user.id) {
      await supabase.from('notifications').insert({
        user_id: invitation.invited_by,
        type: 'invitation_accepted',
        title: '招待が承諾されました',
        content: `${user.email}が${nestName || 'NEST'}への招待を承諾しました`,
        data: {
          nest_id: invitation.nest_id,
          user_id: user.id
        },
        is_read: false
      });
    }

    // 新規メンバーへのウェルカムメッセージ
    await supabase.from('notifications').insert({
      user_id: user.id,
      type: 'welcome_to_nest',
      title: `${nestName || 'NEST'}へようこそ！`,
      content: `${nestName || 'NEST'}に参加しました。メンバーと交流を始めましょう。`,
      data: {
        nest_id: invitation.nest_id
      },
      is_read: false
    });

    return {
      success: true,
      nestId: invitation.nest_id,
      nestName: nestName
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