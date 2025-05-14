export enum SpaceActionType {
  VIEW = 'view',
  EDIT = 'edit',
  CREATE = 'create',
  DELETE = 'delete',
  SHARE = 'share',
  INVITE = 'invite',
  CHANGE_PERMISSIONS = 'change_permissions',
  MANAGE_MEMBERS = 'manage_members',
}

export enum SpaceRoleType {
  OWNER = 'owner',
  ADMIN = 'admin',
  MEMBER = 'member',
  GUEST = 'guest',
}

export interface SpacePermission {
  roleType: SpaceRoleType;
  actions: SpaceActionType[];
}

export const DEFAULT_PERMISSIONS: Record<SpaceRoleType, SpacePermission> = {
  [SpaceRoleType.OWNER]: {
    roleType: SpaceRoleType.OWNER,
    actions: Object.values(SpaceActionType),
  },
  [SpaceRoleType.ADMIN]: {
    roleType: SpaceRoleType.ADMIN,
    actions: [
      SpaceActionType.VIEW,
      SpaceActionType.EDIT,
      SpaceActionType.CREATE,
      SpaceActionType.SHARE,
      SpaceActionType.INVITE,
      SpaceActionType.MANAGE_MEMBERS,
    ],
  },
  [SpaceRoleType.MEMBER]: {
    roleType: SpaceRoleType.MEMBER,
    actions: [
      SpaceActionType.VIEW,
      SpaceActionType.EDIT,
      SpaceActionType.CREATE,
    ],
  },
  [SpaceRoleType.GUEST]: {
    roleType: SpaceRoleType.GUEST,
    actions: [
      SpaceActionType.VIEW,
    ],
  },
};

export interface SpaceMember {
  userId: string;
  roleType: SpaceRoleType;
  joinedAt: Date;
  invitedBy?: string;
  customPermissions?: SpaceActionType[]; // Override default permissions for this member
}

export const hasPermission = (
  memberRole: SpaceRoleType,
  action: SpaceActionType,
  customPermissions?: SpaceActionType[]
): boolean => {
  if (customPermissions && customPermissions.includes(action)) {
    return true;
  }
  
  return DEFAULT_PERMISSIONS[memberRole].actions.includes(action);
}; 