/**
 * NEST空間の権限関連の型定義
 */

import { SpaceType } from 'src/types/nestSpace.types';

// Replace with proper import path once component is integrated
// Using a local definition to prevent linting errors
export enum NestRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MEMBER = 'member',
  GUEST = 'guest'
}

/**
 * 空間アクション許可タイプ
 */
export enum SpaceActionType {
  // 閲覧許可
  VIEW = 'view',
  
  // 編集許可
  EDIT = 'edit',
  
  // 共有許可
  SHARE = 'share',
  
  // 管理許可（設定変更など）
  MANAGE = 'manage',
  
  // アイテム作成許可
  CREATE = 'create',
  
  // アイテム削除許可
  DELETE = 'delete',
  
  // コメント付加許可
  COMMENT = 'comment',
  
  // リアクション付加許可
  REACT = 'react',
  
  // ピン留め許可
  PIN = 'pin',
  
  // エクスポート/インポート許可
  EXPORT = 'export',
}

/**
 * 空間内のアイテムに対する許可タイプ
 */
export type SpaceItemPermission = {
  itemId: string;
  allowedActions: SpaceActionType[];
};

/**
 * 空間全体に対する許可タイプ
 */
export type SpaceTypePermission = {
  spaceType: SpaceType;
  allowedActions: SpaceActionType[];
  itemPermissions?: SpaceItemPermission[]; // 特定アイテムに対する個別許可
};

/**
 * ユーザーロールに基づく空間許可定義
 */
export const DefaultRoleSpacePermissions: Record<NestRole, SpaceTypePermission[]> = {
  // オーナー権限（すべての空間タイプ、すべてのアクション許可）
  [NestRole.OWNER]: Object.values(SpaceType).map(spaceType => ({
    spaceType,
    allowedActions: Object.values(SpaceActionType),
  })),
  
  // 管理者権限
  [NestRole.ADMIN]: [
    // チャット空間権限
    {
      spaceType: SpaceType.CHAT,
      allowedActions: [
        SpaceActionType.VIEW,
        SpaceActionType.EDIT,
        SpaceActionType.CREATE,
        SpaceActionType.DELETE,
        SpaceActionType.COMMENT,
        SpaceActionType.REACT,
        SpaceActionType.SHARE,
        SpaceActionType.PIN,
        SpaceActionType.EXPORT,
      ],
    },
    // ボード空間権限
    {
      spaceType: SpaceType.BOARD,
      allowedActions: [
        SpaceActionType.VIEW,
        SpaceActionType.EDIT,
        SpaceActionType.CREATE,
        SpaceActionType.DELETE,
        SpaceActionType.COMMENT,
        SpaceActionType.REACT,
        SpaceActionType.SHARE,
        SpaceActionType.PIN,
        SpaceActionType.EXPORT,
      ],
    },
    // Zoom空間権限
    {
      spaceType: SpaceType.ZOOM,
      allowedActions: [
        SpaceActionType.VIEW,
        SpaceActionType.CREATE,
        SpaceActionType.DELETE,
        SpaceActionType.SHARE,
        SpaceActionType.EXPORT,
      ],
    },
    // 分析空間権限
    {
      spaceType: SpaceType.INSIGHTS,
      allowedActions: [
        SpaceActionType.VIEW,
        SpaceActionType.EXPORT,
        SpaceActionType.SHARE,
      ],
    },
    // 設定空間権限（部分的）
    {
      spaceType: SpaceType.SETTINGS,
      allowedActions: [
        SpaceActionType.VIEW,
        SpaceActionType.EDIT,
      ],
    },
    // ミーティング空間権限
    {
      spaceType: SpaceType.MEETING,
      allowedActions: [
        SpaceActionType.VIEW,
        SpaceActionType.CREATE,
        SpaceActionType.DELETE,
        SpaceActionType.SHARE,
        SpaceActionType.EXPORT,
      ],
    },
    // ユーザープロフィール空間権限
    {
      spaceType: SpaceType.USER_PROFILE,
      allowedActions: [
        SpaceActionType.VIEW,
        SpaceActionType.EDIT,
        SpaceActionType.SHARE,
      ],
    },
  ],
  
  // メンバー権限
  [NestRole.MEMBER]: [
    // チャット空間権限
    {
      spaceType: SpaceType.CHAT,
      allowedActions: [
        SpaceActionType.VIEW,
        SpaceActionType.EDIT,
        SpaceActionType.CREATE,
        SpaceActionType.COMMENT,
        SpaceActionType.REACT,
        SpaceActionType.PIN,
      ],
    },
    // ボード空間権限
    {
      spaceType: SpaceType.BOARD,
      allowedActions: [
        SpaceActionType.VIEW,
        SpaceActionType.EDIT,
        SpaceActionType.CREATE,
        SpaceActionType.COMMENT,
        SpaceActionType.REACT,
        SpaceActionType.PIN,
      ],
    },
    // Zoom空間権限
    {
      spaceType: SpaceType.ZOOM,
      allowedActions: [
        SpaceActionType.VIEW,
        SpaceActionType.CREATE,
      ],
    },
    // 分析空間権限
    {
      spaceType: SpaceType.INSIGHTS,
      allowedActions: [
        SpaceActionType.VIEW,
      ],
    },
    // 設定空間権限（閲覧のみ）
    {
      spaceType: SpaceType.SETTINGS,
      allowedActions: [
        SpaceActionType.VIEW,
      ],
    },
    // ミーティング空間権限
    {
      spaceType: SpaceType.MEETING,
      allowedActions: [
        SpaceActionType.VIEW,
        SpaceActionType.CREATE,
      ],
    },
    // ユーザープロフィール空間権限
    {
      spaceType: SpaceType.USER_PROFILE,
      allowedActions: [
        SpaceActionType.VIEW,
        SpaceActionType.EDIT,
      ],
    },
  ],
  
  // ゲスト権限
  [NestRole.GUEST]: [
    // チャット空間権限
    {
      spaceType: SpaceType.CHAT,
      allowedActions: [
        SpaceActionType.VIEW,
        SpaceActionType.REACT,
      ],
    },
    // ボード空間権限
    {
      spaceType: SpaceType.BOARD,
      allowedActions: [
        SpaceActionType.VIEW,
        SpaceActionType.REACT,
      ],
    },
    // その他の空間は閲覧のみ
    {
      spaceType: SpaceType.ZOOM,
      allowedActions: [
        SpaceActionType.VIEW,
      ],
    },
    {
      spaceType: SpaceType.INSIGHTS,
      allowedActions: [
        SpaceActionType.VIEW,
      ],
    },
    // 設定は閲覧不可
    {
      spaceType: SpaceType.SETTINGS,
      allowedActions: [],
    },
    // ミーティング空間権限
    {
      spaceType: SpaceType.MEETING,
      allowedActions: [
        SpaceActionType.VIEW,
      ],
    },
    // ユーザープロフィール空間権限
    {
      spaceType: SpaceType.USER_PROFILE,
      allowedActions: [
        SpaceActionType.VIEW,
      ],
    },
  ],
};

/**
 * 空間アクセス権判定関数の型
 */
export type SpacePermissionChecker = (
  userId: string,
  spaceType: SpaceType,
  action: SpaceActionType,
  itemId?: string
) => boolean;

/**
 * ユーザーのカスタム空間権限
 */
export interface UserSpacePermissions {
  userId: string;
  nestId: string;
  // カスタム権限（追加の許可または制限）
  customPermissions: {
    granted: SpaceTypePermission[];
    revoked: {
      spaceType: SpaceType;
      actions: SpaceActionType[];
      itemId?: string;
    }[];
  };
  lastUpdated: number;
} 