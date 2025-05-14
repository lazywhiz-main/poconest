/**
 * NEST設定の型定義
 */

// プライバシー設定
export interface NestPrivacySettings {
  visibility: 'public' | 'private'; // NESTの公開範囲
  searchable: boolean; // 検索可能かどうか
  memberListVisibility: 'public' | 'members_only'; // メンバーリストの公開範囲
}

// コンテンツ制限設定
export interface NestContentSettings {
  contentVisibility: 'public' | 'members_only'; // コンテンツの公開範囲
  joinRequirement: 'approval_required' | 'open' | 'invite_only'; // 参加条件
  allowExternalSharing: boolean; // 外部共有を許可するか
  fileAccessLevel: 'download_allowed' | 'view_only'; // ファイルアクセスレベル
}

// 招待権限設定
export interface NestInvitationSettings {
  invitePermission: 'owner_only' | 'admins' | 'all_members'; // 誰が招待できるか
  approvalRequired: boolean; // 招待承認が必要か
  maxInvitesPerMember: number; // メンバーあたりの最大招待数
  inviteLinkEnabled: boolean; // 招待リンクを有効にするか
  inviteLinkExpiration: number; // 招待リンクの有効期限（時間）
}

// 通知設定
export interface NestNotificationSettings {
  activityNotifications: boolean; // アクティビティの通知
  messageNotifications: boolean; // メッセージの通知
  memberUpdateNotifications: boolean; // メンバー更新の通知
  systemNotifications: boolean; // システム通知
  notificationDigestFrequency: 'realtime' | 'daily' | 'weekly'; // 通知ダイジェストの頻度
}

// NEST設定全体
export interface NestSettings {
  nestId: string;
  privacy: NestPrivacySettings;
  content: NestContentSettings;
  invitation: NestInvitationSettings;
  notification: NestNotificationSettings;
  lastUpdated?: string; // 最終更新日時
  updatedBy?: string; // 最終更新者ID
}

// 設定変更イベントの型
export interface SettingsChangeEvent {
  nestId: string;
  changedBy: string;
  timestamp: string;
  previousSettings: Partial<NestSettings>;
  newSettings: Partial<NestSettings>;
}

// 設定変更レスポンスの型
export interface SettingsUpdateResponse {
  success: boolean;
  error?: string;
  settings?: NestSettings;
} 