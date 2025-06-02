// このファイルの型定義はsrc/types/nestSpace.types.tsに統合されました。
// すべてのimportはsrc/types/nestSpace.typesから行ってください。

/**
 * NEST空間の型定義
 */

/**
 * 空間タイプの定義
 */
export enum SpaceType {
  CHAT = 'chat',           // チャット空間
  BOARD = 'board',         // ボード空間
  ANALYSIS = 'analysis',   // 分析空間
  MEETING = 'meeting',     // ミーティング空間
  USER_PROFILE = 'user_profile',   // ユーザープロフィール空間
  ZOOM = 'zoom',           // Zoom空間
  SETTINGS = 'settings',   // 設定空間
  INSIGHTS = 'insights'    // インサイト空間
}

/**
 * 画面サイズに基づくレイアウトタイプ
 */
export enum LayoutType {
  MOBILE = 'mobile',       // モバイル（タブバー + スワイプ）
  TABLET = 'tablet',       // タブレット（サイドナビ + タブ）
  DESKTOP = 'desktop',     // デスクトップ（サイドナビ + マルチペイン）
}

/**
 * NEST（巣）の型定義
 */
export interface Nest {
  id: string;
  name: string;
  description?: string;
  owner_id: string;
  members?: string[];
  is_active?: boolean;
  created_at: string;
  updated_at: string;
  color?: string;
  icon?: string;
  space_ids: string[];
  emoji?: string;  // 絵文字アイコン
}

/**
 * ユーザーパーソナライズ設定
 */
export interface SpacePersonalization {
  preferredSpaces?: SpaceType[];    // 優先表示する空間
  pinnedItems?: {                   // 各空間内でピン留めされたアイテム
    [key in SpaceType]?: string[];
  };
  expandedPanels?: string[];        // 展開されたパネル
  compactMode?: boolean;            // コンパクトモード
  theme?: 'light' | 'dark' | 'system'; // テーマ設定
  fontSize?: 'small' | 'medium' | 'large'; // フォントサイズ
  notifications?: {                 // 通知設定
    [key in SpaceType]?: boolean;
  };
  lastVisitedSpaces?: {             // 最後に訪問した空間の記録
    spaceType: SpaceType;
    timestamp: number;
  }[];
}

/**
 * メンバー閲覧状態
 */
export interface MemberPresence {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  online: boolean;
  lastSeen?: number;
  currentSpace?: SpaceType;
  currentItemId?: string;  // 現在閲覧/編集中のアイテムID
  action?: 'viewing' | 'editing' | 'idle';
  device?: 'mobile' | 'tablet' | 'desktop';
  cursorPosition?: { x: number; y: number }; // 編集時のカーソル位置
}

/**
 * 空間メタデータ
 */
export interface SpaceMetadata {
  id: string;
  type: SpaceType;
  title: string;
  icon: string;
  color: string;
  badge?: number;       // 未読数などのバッジ
  lastUpdated?: number; // 最終更新日時
  hasUnread?: boolean;  // 未読アイテムの有無
}

/**
 * 空間状態インターフェース
 */
export interface SpaceState {
  activeSpaceType: SpaceType;
  lastActiveSpace?: { [nestId: string]: SpaceType }; // NEST毎の最後にアクティブだった空間
  availableSpaces: SpaceMetadata[];
  layoutType: LayoutType;
  sidebarOpen: boolean;
  loading: boolean;
  memberPresence: MemberPresence[]; // メンバーの在席状態
  personalization: SpacePersonalization;
  splitView?: {
    enabled: boolean;
    primarySpace?: SpaceType;
    secondarySpace?: SpaceType;
    splitRatio?: number; // 0.0～1.0の比率
  };
}

/**
 * 空間ナビゲーションアクション
 */
export type SpaceNavigationAction = 
  | { type: 'NAVIGATE_TO_SPACE'; payload: SpaceType }
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'SET_LAYOUT_TYPE'; payload: LayoutType }
  | { type: 'UPDATE_MEMBER_PRESENCE'; payload: MemberPresence }
  | { type: 'UPDATE_PERSONALIZATION'; payload: Partial<SpacePersonalization> }
  | { type: 'ENABLE_SPLIT_VIEW'; payload: { primary: SpaceType; secondary: SpaceType; ratio?: number } }
  | { type: 'DISABLE_SPLIT_VIEW' }
  | { type: 'SET_SPLIT_RATIO'; payload: number };

/**
 * 空間コンテキスト型
 */
export interface NestSpaceContextType {
  // 現在のNESTとユーザー情報
  currentNest: Nest | null;
  nestMembers: MemberPresence[];
  
  // 空間状態
  spaceState: SpaceState;
  dispatch: React.Dispatch<SpaceNavigationAction>;
  
  // 空間操作メソッド
  navigateToSpace: (spaceType: SpaceType) => void;
  toggleSidebar: () => void;
  updatePresence: (presenceData: Partial<MemberPresence>) => void;
  updatePersonalization: (settings: Partial<SpacePersonalization>) => void;
  
  // マルチビュー操作
  enableSplitView: (primary: SpaceType, secondary: SpaceType, ratio?: number) => void;
  disableSplitView: () => void;
  setSplitRatio: (ratio: number) => void;
  
  // 空間状態ユーティリティ
  isSpaceActive: (spaceType: SpaceType) => boolean;
  getSpaceMetadata: (spaceType: SpaceType) => SpaceMetadata | undefined;
  getMemberPresence: (userId: string) => MemberPresence | undefined;
} 