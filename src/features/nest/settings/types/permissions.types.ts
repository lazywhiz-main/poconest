/**
 * NEST権限の型定義
 */

// NESTのユーザーロール
export enum NestRole {
  OWNER = 'owner',       // オーナー（すべての権限）
  ADMIN = 'admin',       // 管理者（招待と管理権限）
  MEMBER = 'member',     // 一般メンバー（基本利用権限）
  GUEST = 'guest'        // ゲスト（閲覧のみ）
}

// 権限タイプ
export enum PermissionType {
  // 管理系の権限
  MANAGE_SETTINGS = 'manage_settings',           // 設定管理
  MANAGE_MEMBERS = 'manage_members',             // メンバー管理
  MANAGE_ROLES = 'manage_roles',                 // ロール管理
  MANAGE_CONTENT = 'manage_content',             // コンテンツ管理
  
  // メンバー招待・管理の権限
  INVITE_MEMBERS = 'invite_members',             // メンバー招待
  REMOVE_MEMBERS = 'remove_members',             // メンバー削除
  APPROVE_JOIN_REQUESTS = 'approve_join_requests', // 参加リクエスト承認
  
  // コンテンツ操作の権限
  CREATE_CONTENT = 'create_content',             // コンテンツ作成
  EDIT_ANY_CONTENT = 'edit_any_content',         // 任意のコンテンツ編集
  EDIT_OWN_CONTENT = 'edit_own_content',         // 自分のコンテンツ編集
  DELETE_ANY_CONTENT = 'delete_any_content',     // 任意のコンテンツ削除
  DELETE_OWN_CONTENT = 'delete_own_content',     // 自分のコンテンツ削除
  
  // 共有の権限
  SHARE_CONTENT = 'share_content',               // コンテンツ共有
  EXTERNAL_SHARING = 'external_sharing',         // 外部共有
  
  // 閲覧の権限
  VIEW_MEMBERS = 'view_members',                 // メンバー閲覧
  VIEW_CONTENT = 'view_content',                 // コンテンツ閲覧
  VIEW_ACTIVITY = 'view_activity',               // アクティビティ閲覧
  
  // アクティビティの権限
  POST_MESSAGES = 'post_messages',               // メッセージ投稿
  COMMENT_ON_CONTENT = 'comment_on_content',     // コンテンツへのコメント
  REACT_TO_CONTENT = 'react_to_content',         // コンテンツへのリアクション
}

// ロールごとの権限マッピング
export const DefaultRolePermissions: Record<NestRole, PermissionType[]> = {
  [NestRole.OWNER]: Object.values(PermissionType), // オーナーはすべての権限を持つ
  
  [NestRole.ADMIN]: [
    // 管理系
    PermissionType.MANAGE_MEMBERS,
    PermissionType.MANAGE_CONTENT,
    
    // 招待・管理
    PermissionType.INVITE_MEMBERS,
    PermissionType.REMOVE_MEMBERS,
    PermissionType.APPROVE_JOIN_REQUESTS,
    
    // コンテンツ系
    PermissionType.CREATE_CONTENT,
    PermissionType.EDIT_ANY_CONTENT,
    PermissionType.EDIT_OWN_CONTENT,
    PermissionType.DELETE_ANY_CONTENT,
    PermissionType.DELETE_OWN_CONTENT,
    
    // 共有
    PermissionType.SHARE_CONTENT,
    PermissionType.EXTERNAL_SHARING,
    
    // 閲覧
    PermissionType.VIEW_MEMBERS,
    PermissionType.VIEW_CONTENT,
    PermissionType.VIEW_ACTIVITY,
    
    // アクティビティ
    PermissionType.POST_MESSAGES,
    PermissionType.COMMENT_ON_CONTENT,
    PermissionType.REACT_TO_CONTENT,
  ],
  
  [NestRole.MEMBER]: [
    // コンテンツ系
    PermissionType.CREATE_CONTENT,
    PermissionType.EDIT_OWN_CONTENT,
    PermissionType.DELETE_OWN_CONTENT,
    
    // 共有（設定次第）
    PermissionType.SHARE_CONTENT,
    
    // 閲覧
    PermissionType.VIEW_MEMBERS,
    PermissionType.VIEW_CONTENT,
    PermissionType.VIEW_ACTIVITY,
    
    // アクティビティ
    PermissionType.POST_MESSAGES,
    PermissionType.COMMENT_ON_CONTENT,
    PermissionType.REACT_TO_CONTENT,
  ],
  
  [NestRole.GUEST]: [
    // 閲覧のみ
    PermissionType.VIEW_CONTENT,
    PermissionType.VIEW_ACTIVITY,
    
    // 限定的なアクティビティ
    PermissionType.REACT_TO_CONTENT,
  ]
};

// メンバー権限付きのユーザー情報
export interface NestMemberWithPermissions {
  userId: string;
  displayName: string;
  email?: string;
  avatarUrl?: string;
  role: NestRole;
  permissions: PermissionType[];
  joinedDate: string;
  lastActiveDate?: string;
  customPermissions?: {
    granted: PermissionType[];
    revoked: PermissionType[];
  };
}

// 権限チェック関数の型
export type PermissionChecker = (
  userId: string,
  permission: PermissionType | PermissionType[],
  nestId: string
) => boolean | Promise<boolean>;

// 権限更新のリクエスト型
export interface PermissionUpdateRequest {
  nestId: string;
  userId: string;
  role?: NestRole;
  grantPermissions?: PermissionType[];
  revokePermissions?: PermissionType[];
}

// 権限更新のレスポンス型
export interface PermissionUpdateResponse {
  success: boolean;
  error?: string;
  member?: NestMemberWithPermissions;
} 