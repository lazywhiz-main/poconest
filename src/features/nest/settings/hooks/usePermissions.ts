import { useState, useCallback } from 'react';
import { supabase } from '@services/supabase/client';
import { useNest } from '../../contexts/NestContext';
import { useAuth } from '@contexts/AuthContext';
import { 
  NestRole, 
  PermissionType, 
  DefaultRolePermissions, 
  NestMemberWithPermissions, 
  PermissionUpdateRequest, 
  PermissionUpdateResponse 
} from '../types/permissions.types';

/**
 * NEST権限を管理するカスタムフック
 */
export const usePermissions = (nestId?: string) => {
  const { user } = useAuth();
  const { currentNest, nestMembers, refreshData } = useNest();
  
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // 使用するnestIdを決定
  const targetNestId = nestId || currentNest?.id;

  /**
   * ユーザーのロールを取得する
   */
  const getUserRole = useCallback(async (
    userId: string,
    nestId: string = targetNestId || ''
  ): Promise<NestRole | null> => {
    if (!nestId) return null;
    
    try {
      // ローカルデータを確認
      if (nestMembers.length > 0) {
        const member = nestMembers.find(m => m.user_id === userId && m.nest_id === nestId);
        if (member) {
          return member.role as NestRole;
        }
      }
      
      // データベースから取得
      const { data, error: fetchError } = await supabase
        .from('nest_members')
        .select('role')
        .eq('nest_id', nestId)
        .eq('user_id', userId)
        .single();
      
      if (fetchError || !data) {
        return null;
      }
      
      return data.role as NestRole;
    } catch (err) {
      console.error('ロールの取得に失敗しました:', err);
      return null;
    }
  }, [targetNestId, nestMembers]);

  /**
   * ユーザーの権限をロールに基づいて取得する
   */
  const getUserPermissions = useCallback(async (
    userId: string,
    nestId: string = targetNestId || ''
  ): Promise<PermissionType[]> => {
    if (!nestId) return [];
    
    try {
      // ロールを取得
      const role = await getUserRole(userId, nestId);
      if (!role) return [];
      
      // カスタム権限を取得
      const { data: customPermissions } = await supabase
        .from('nest_member_permissions')
        .select('granted_permissions, revoked_permissions')
        .eq('nest_id', nestId)
        .eq('user_id', userId)
        .single();
      
      // ロールに基づく権限を取得
      const rolePermissions = DefaultRolePermissions[role] || [];
      
      // カスタム権限を適用
      if (customPermissions) {
        // 特別に付与された権限を追加
        const grantedPermissions = customPermissions.granted_permissions || [];
        
        // 特別に取り消された権限を除外
        const revokedPermissions = customPermissions.revoked_permissions || [];
        
        // 最終的な権限リストを作成
        const finalPermissions = [
          ...rolePermissions,
          ...grantedPermissions
        ].filter(p => !revokedPermissions.includes(p));
        
        // 重複を除去
        return [...new Set(finalPermissions)];
      }
      
      return rolePermissions;
    } catch (err) {
      console.error('権限の取得に失敗しました:', err);
      return [];
    }
  }, [getUserRole, targetNestId]);

  /**
   * ユーザーが特定の権限を持っているかチェックする
   */
  const hasPermission = useCallback(async (
    userId: string,
    permission: PermissionType | PermissionType[],
    nestId: string = targetNestId || ''
  ): Promise<boolean> => {
    if (!nestId || !userId) return false;
    
    try {
      // ロールを取得
      const role = await getUserRole(userId, nestId);
      
      // オーナーは常にすべての権限を持つ
      if (role === NestRole.OWNER) return true;
      
      if (!role) return false;
      
      // 権限リストを取得
      const permissions = await getUserPermissions(userId, nestId);
      
      // 単一の権限または複数の権限をチェック
      if (Array.isArray(permission)) {
        return permission.every(p => permissions.includes(p));
      } else {
        return permissions.includes(permission);
      }
    } catch (err) {
      console.error('権限チェックに失敗しました:', err);
      return false;
    }
  }, [getUserRole, getUserPermissions, targetNestId]);

  /**
   * メンバーの権限を更新する
   */
  const updateMemberPermissions = useCallback(async (
    request: PermissionUpdateRequest
  ): Promise<PermissionUpdateResponse> => {
    if (!user) {
      return { success: false, error: 'ユーザーが認証されていません' };
    }
    
    const nestId = request.nestId || targetNestId;
    if (!nestId) {
      return { success: false, error: 'NEST IDが指定されていません' };
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // 権限をチェック（管理者とオーナーのみがロールと権限を管理できる）
      const canManageRoles = await hasPermission(
        user.id, 
        PermissionType.MANAGE_ROLES, 
        nestId
      );
      
      if (!canManageRoles) {
        throw new Error('権限を管理する権限がありません');
      }
      
      // ロールの更新があるか確認
      if (request.role) {
        // 対象のメンバーの現在のロールを取得
        const currentRole = await getUserRole(request.userId, nestId);
        
        // オーナーロールの変更を防止
        if (currentRole === NestRole.OWNER) {
          throw new Error('オーナーのロールは変更できません');
        }
        
        // ロールを更新
        const { error: roleUpdateError } = await supabase
          .from('nest_members')
          .update({ role: request.role })
          .eq('nest_id', nestId)
          .eq('user_id', request.userId);
        
        if (roleUpdateError) throw roleUpdateError;
      }
      
      // カスタム権限の更新
      let grantedPermissions: PermissionType[] = [];
      let revokedPermissions: PermissionType[] = [];
      
      // 既存のカスタム権限を取得
      const { data: existingCustomPermissions } = await supabase
        .from('nest_member_permissions')
        .select('granted_permissions, revoked_permissions')
        .eq('nest_id', nestId)
        .eq('user_id', request.userId)
        .single();
      
      if (existingCustomPermissions) {
        grantedPermissions = existingCustomPermissions.granted_permissions || [];
        revokedPermissions = existingCustomPermissions.revoked_permissions || [];
      }
      
      // 権限の付与
      if (request.grantPermissions && request.grantPermissions.length > 0) {
        // 既に付与されている権限をフィルタ
        const newGrantedPermissions = request.grantPermissions.filter(
          p => !grantedPermissions.includes(p)
        );
        
        // 付与する権限を追加
        grantedPermissions = [...grantedPermissions, ...newGrantedPermissions];
        
        // 付与する権限が取り消されている場合、取り消しリストから削除
        revokedPermissions = revokedPermissions.filter(
          p => !request.grantPermissions!.includes(p)
        );
      }
      
      // 権限の取り消し
      if (request.revokePermissions && request.revokePermissions.length > 0) {
        // 既に取り消されている権限をフィルタ
        const newRevokedPermissions = request.revokePermissions.filter(
          p => !revokedPermissions.includes(p)
        );
        
        // 取り消す権限を追加
        revokedPermissions = [...revokedPermissions, ...newRevokedPermissions];
        
        // 取り消す権限が付与されている場合、付与リストから削除
        grantedPermissions = grantedPermissions.filter(
          p => !request.revokePermissions!.includes(p)
        );
      }
      
      // カスタム権限を更新または作成
      const { error: permissionsUpdateError } = await supabase
        .from('nest_member_permissions')
        .upsert({
          nest_id: nestId,
          user_id: request.userId,
          granted_permissions: grantedPermissions,
          revoked_permissions: revokedPermissions,
          updated_at: new Date().toISOString(),
          updated_by: user.id
        });
      
      if (permissionsUpdateError) throw permissionsUpdateError;
      
      // 最新のメンバー情報を取得
      const updatedMember = await getMemberWithPermissions(request.userId, nestId);
      
      // NEST全体のデータを更新
      await refreshData();
      
      return {
        success: true,
        member: updatedMember
      };
    } catch (err: any) {
      const errorMessage = err.message || '権限の更新に失敗しました';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setLoading(false);
    }
  }, [user, targetNestId, hasPermission, getUserRole, refreshData]);

  /**
   * メンバーのロールを更新する
   */
  const updateMemberRole = useCallback(async (
    userId: string,
    role: NestRole,
    nestId: string = targetNestId || ''
  ): Promise<PermissionUpdateResponse> => {
    return updateMemberPermissions({
      nestId,
      userId,
      role
    });
  }, [updateMemberPermissions, targetNestId]);

  /**
   * 権限付きのメンバー情報を取得する
   */
  const getMemberWithPermissions = useCallback(async (
    userId: string,
    nestId: string = targetNestId || ''
  ): Promise<NestMemberWithPermissions | null> => {
    if (!nestId) return null;
    
    try {
      // メンバー情報を取得
      const { data: memberData, error: memberError } = await supabase
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
            email,
            avatar_url
          )
        `)
        .eq('nest_id', nestId)
        .eq('user_id', userId)
        .single();
      
      if (memberError || !memberData) return null;
      
      // カスタム権限を取得
      const { data: customPermissions } = await supabase
        .from('nest_member_permissions')
        .select('granted_permissions, revoked_permissions')
        .eq('nest_id', nestId)
        .eq('user_id', userId)
        .single();
      
      // ロールに基づく権限を取得
      const role = memberData.role as NestRole;
      const rolePermissions = DefaultRolePermissions[role] || [];
      
      // 最終的な権限リストを作成
      let permissions = [...rolePermissions];
      let customPermissionsObj;
      
      if (customPermissions) {
        const grantedPermissions = customPermissions.granted_permissions || [];
        const revokedPermissions = customPermissions.revoked_permissions || [];
        
        permissions = [
          ...rolePermissions,
          ...grantedPermissions
        ].filter(p => !revokedPermissions.includes(p));
        
        // 重複を除去
        permissions = [...new Set(permissions)];
        
        customPermissionsObj = {
          granted: grantedPermissions,
          revoked: revokedPermissions
        };
      }
      
      // ユーザー情報を取得
      const user = memberData.users || {};
      
      // メンバー情報を整形
      return {
        userId: memberData.user_id,
        displayName: user.display_name || '',
        email: user.email,
        avatarUrl: user.avatar_url,
        role,
        permissions,
        joinedDate: memberData.joined_at,
        lastActiveDate: memberData.last_active_at,
        customPermissions: customPermissionsObj
      };
    } catch (err) {
      console.error('メンバー情報の取得に失敗しました:', err);
      return null;
    }
  }, [targetNestId]);

  /**
   * すべてのメンバーの権限付き情報を取得する
   */
  const getAllMembersWithPermissions = useCallback(async (
    nestId: string = targetNestId || ''
  ): Promise<NestMemberWithPermissions[]> => {
    if (!nestId) return [];
    
    try {
      setLoading(true);
      
      // メンバー情報を取得
      const { data: membersData, error: membersError } = await supabase
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
            email,
            avatar_url
          )
        `)
        .eq('nest_id', nestId);
      
      if (membersError || !membersData) return [];
      
      // カスタム権限を取得
      const { data: allCustomPermissions } = await supabase
        .from('nest_member_permissions')
        .select('user_id, granted_permissions, revoked_permissions')
        .eq('nest_id', nestId);
      
      // メンバーごとの権限情報を作成
      const membersWithPermissions = membersData.map(member => {
        const userId = member.user_id;
        const role = member.role as NestRole;
        const user = member.users || {};
        
        // ロールに基づく権限
        let permissions = [...(DefaultRolePermissions[role] || [])];
        
        // カスタム権限を適用
        const customPermission = allCustomPermissions?.find(p => p.user_id === userId);
        let customPermissionsObj;
        
        if (customPermission) {
          const grantedPermissions = customPermission.granted_permissions || [];
          const revokedPermissions = customPermission.revoked_permissions || [];
          
          permissions = [
            ...permissions,
            ...grantedPermissions
          ].filter(p => !revokedPermissions.includes(p));
          
          // 重複を除去
          permissions = [...new Set(permissions)];
          
          customPermissionsObj = {
            granted: grantedPermissions,
            revoked: revokedPermissions
          };
        }
        
        return {
          userId,
          displayName: user.display_name || '',
          email: user.email,
          avatarUrl: user.avatar_url,
          role,
          permissions,
          joinedDate: member.joined_at,
          lastActiveDate: member.last_active_at,
          customPermissions: customPermissionsObj
        };
      });
      
      return membersWithPermissions;
    } catch (err) {
      console.error('メンバー情報の取得に失敗しました:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [targetNestId]);

  return {
    loading,
    error,
    getUserRole,
    getUserPermissions,
    hasPermission,
    updateMemberPermissions,
    updateMemberRole,
    getMemberWithPermissions,
    getAllMembersWithPermissions
  };
}; 