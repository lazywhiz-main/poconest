/**
 * HDBSCAN専用ログ管理ユーティリティ
 * 本格運用時は簡単に無効化できる
 */

let hdbscanLoggingEnabled = process.env.NODE_ENV === 'development'; // 開発時のみ有効

export const HDBSCANLogger = {
  /**
   * ログの有効/無効を切り替え
   */
  setEnabled(enabled: boolean) {
    hdbscanLoggingEnabled = enabled;
  },

  /**
   * HDBSCAN情報ログ
   */
  info(message: string, data?: any) {
    if (!hdbscanLoggingEnabled) return;
    console.log(`ℹ️ [HDBSCAN] ${message}`, data ? data : '');
  },

  /**
   * HDBSCAN処理開始ログ
   */
  start(message: string, data?: any) {
    if (!hdbscanLoggingEnabled) return;
    console.log(`🚀 [HDBSCAN] ${message}`, data ? data : '');
  },

  /**
   * HDBSCAN完了ログ
   */
  success(message: string, data?: any) {
    if (!hdbscanLoggingEnabled) return;
    console.log(`✅ [HDBSCAN] ${message}`, data ? data : '');
  },

  /**
   * HDBSCAN分析ログ
   */
  analysis(message: string, data?: any) {
    if (!hdbscanLoggingEnabled) return;
    console.log(`📊 [HDBSCAN] ${message}`, data ? data : '');
  },

  /**
   * HDBSCAN詳細ログ
   */
  detail(message: string, data?: any) {
    if (!hdbscanLoggingEnabled) return;
    console.log(`🔍 [HDBSCAN] ${message}`, data ? data : '');
  },

  /**
   * HDBSCAN統計ログ
   */
  stats(message: string, data?: any) {
    if (!hdbscanLoggingEnabled) return;
    console.log(`📏 [HDBSCAN] ${message}`, data ? data : '');
  },

  /**
   * HDBSCAN階層ログ
   */
  hierarchy(message: string, data?: any) {
    if (!hdbscanLoggingEnabled) return;
    console.log(`🌳 [HDBSCAN] ${message}`, data ? data : '');
  },

  /**
   * HDBSCANエラーログ（常に有効）
   */
  error(message: string, error?: any) {
    console.error(`❌ [HDBSCAN] ${message}`, error ? error : '');
  },

  /**
   * デバッグセッション開始
   */
  startDebugSession() {
    if (!hdbscanLoggingEnabled) return;
    console.clear();
    console.log('🔍 [HDBSCAN] === デバッグセッション開始 ===');
  },

  /**
   * デバッグセッション終了
   */
  endDebugSession() {
    if (!hdbscanLoggingEnabled) return;
    console.log('🔍 [HDBSCAN] === デバッグセッション終了 ===');
  },

  /**
   * 現在のログ設定状態を取得
   */
  isEnabled(): boolean {
    return hdbscanLoggingEnabled;
  }
};

// 本格運用時の簡単切り替え用
export const disableHDBSCANLogging = () => HDBSCANLogger.setEnabled(false);
export const enableHDBSCANLogging = () => HDBSCANLogger.setEnabled(true);
