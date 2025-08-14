import React, { useCallback } from 'react';
import { THEME_COLORS } from '../../../../constants/theme';

interface ViewNavigationSidePeakProps {
  /** Reset View実行 */
  onResetView: () => void;
  /** Auto Layout実行 */
  onAutoLayout: () => void;
  /** Minimap表示・非表示切り替え */
  showMinimap: boolean;
  onToggleMinimap: (show: boolean) => void;
}

/**
 * View & Navigation サイドピークコンポーネント
 * ビュー操作とナビゲーション機能を管理
 */
export const ViewNavigationSidePeak: React.FC<ViewNavigationSidePeakProps> = ({
  onResetView,
  onAutoLayout,
  showMinimap,
  onToggleMinimap,
}) => {
  // ボタンホバー効果
  const handleButtonHover = useCallback((e: React.MouseEvent, isEnter: boolean) => {
    const target = e.currentTarget as HTMLElement;
    if (isEnter) {
      target.style.transform = 'translateY(-1px)';
      target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
    } else {
      target.style.transform = 'translateY(0)';
      target.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
    }
  }, []);

  // スタイル定義
  const styles = {
    container: {
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflow: 'hidden',
    } as React.CSSProperties,
    section: {
      padding: '20px',
      borderBottom: `1px solid ${THEME_COLORS.borderSecondary}`,
    } as React.CSSProperties,
    sectionTitle: {
      fontSize: '14px',
      fontWeight: '600',
      color: THEME_COLORS.textPrimary,
      marginBottom: '8px',
      fontFamily: 'Space Grotesk, system-ui, sans-serif',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
    } as React.CSSProperties,
    sectionDesc: {
      fontSize: '11px',
      color: THEME_COLORS.textSecondary,
      marginBottom: '16px',
      lineHeight: '1.4',
    } as React.CSSProperties,
    buttonGrid: {
      display: 'grid',
      gridTemplateColumns: '1fr',
      gap: '10px',
    } as React.CSSProperties,
    actionButton: {
      padding: '12px 16px',
      border: `1px solid ${THEME_COLORS.borderSecondary}`,
      borderRadius: THEME_COLORS.borderRadius.medium,
      backgroundColor: THEME_COLORS.bgTertiary,
      color: THEME_COLORS.textPrimary,
      fontSize: '12px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      textAlign: 'left',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
    } as React.CSSProperties,
    resetButton: {
      backgroundColor: THEME_COLORS.primaryGreen,
      color: THEME_COLORS.textInverse,
      borderColor: THEME_COLORS.primaryGreen,
    } as React.CSSProperties,
    autoLayoutButton: {
      backgroundColor: THEME_COLORS.primaryBlue,
      color: THEME_COLORS.textInverse,
      borderColor: THEME_COLORS.primaryBlue,
    } as React.CSSProperties,
    toggleSection: {
      padding: '16px 20px',
    } as React.CSSProperties,
    toggleContainer: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 16px',
      backgroundColor: THEME_COLORS.bgTertiary,
      borderRadius: THEME_COLORS.borderRadius.medium,
      border: `1px solid ${THEME_COLORS.borderSecondary}`,
    } as React.CSSProperties,
    toggleLabel: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontSize: '12px',
      color: THEME_COLORS.textPrimary,
      fontWeight: '500',
    } as React.CSSProperties,
    toggleSwitch: {
      position: 'relative',
      width: '40px',
      height: '20px',
      backgroundColor: showMinimap ? THEME_COLORS.primaryGreen : THEME_COLORS.bgSecondary,
      borderRadius: '10px',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      border: `1px solid ${showMinimap ? THEME_COLORS.primaryGreen : THEME_COLORS.borderSecondary}`,
    } as React.CSSProperties,
    toggleHandle: {
      position: 'absolute',
      top: '1px',
      left: showMinimap ? '19px' : '1px',
      width: '16px',
      height: '16px',
      backgroundColor: THEME_COLORS.textInverse,
      borderRadius: '50%',
      transition: 'all 0.2s ease',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
    } as React.CSSProperties,
    keyboardInfo: {
      padding: '16px 20px',
      backgroundColor: THEME_COLORS.bgSecondary,
      borderTop: `1px solid ${THEME_COLORS.borderSecondary}`,
      marginTop: 'auto',
    } as React.CSSProperties,
    keyboardTitle: {
      fontSize: '12px',
      fontWeight: '600',
      color: THEME_COLORS.textPrimary,
      marginBottom: '8px',
    } as React.CSSProperties,
    shortcutList: {
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
    } as React.CSSProperties,
    shortcutItem: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      fontSize: '10px',
      color: THEME_COLORS.textMuted,
    } as React.CSSProperties,
    shortcutKey: {
      padding: '2px 6px',
      backgroundColor: THEME_COLORS.bgTertiary,
      borderRadius: '3px',
      fontSize: '9px',
      fontWeight: '600',
      color: THEME_COLORS.textSecondary,
      border: `1px solid ${THEME_COLORS.borderSecondary}`,
    } as React.CSSProperties,
  };

  return (
    <div style={styles.container}>
      {/* ビュー操作セクション */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>
          🎯 ビュー操作
        </div>
        <div style={styles.sectionDesc}>
          ネットワークビューの位置とレイアウトを調整します
        </div>
        
        <div style={styles.buttonGrid}>
          {/* Reset View ボタン */}
          <button
            style={{
              ...styles.actionButton,
              ...styles.resetButton,
            }}
            onClick={onResetView}
            onMouseEnter={(e) => handleButtonHover(e, true)}
            onMouseLeave={(e) => handleButtonHover(e, false)}
          >
            <span style={{ fontSize: '14px' }}>🔄</span>
            <div>
              <div style={{ fontWeight: '600', marginBottom: '2px' }}>Reset View</div>
              <div style={{ fontSize: '10px', opacity: 0.8 }}>ビューを初期位置にリセット</div>
            </div>
          </button>

          {/* Auto Layout ボタン */}
          <button
            style={{
              ...styles.actionButton,
              ...styles.autoLayoutButton,
            }}
            onClick={onAutoLayout}
            onMouseEnter={(e) => handleButtonHover(e, true)}
            onMouseLeave={(e) => handleButtonHover(e, false)}
          >
            <span style={{ fontSize: '14px' }}>⚡</span>
            <div>
              <div style={{ fontWeight: '600', marginBottom: '2px' }}>Auto Layout</div>
              <div style={{ fontSize: '10px', opacity: 0.8 }}>ノードを自動配置</div>
            </div>
          </button>
        </div>
      </div>

      {/* ナビゲーション設定セクション */}
      <div style={styles.toggleSection}>
        <div style={styles.sectionTitle}>
          🗺️ ナビゲーション
        </div>
        <div style={styles.sectionDesc}>
          ネットワーク全体の把握を支援する機能です
        </div>
        
        <div style={styles.toggleContainer}>
          <div style={styles.toggleLabel}>
            <span>📍</span>
            <span>Minimap表示</span>
          </div>
          <div
            style={styles.toggleSwitch}
            onClick={() => onToggleMinimap(!showMinimap)}
          >
            <div style={styles.toggleHandle} />
          </div>
        </div>
      </div>

      {/* キーボードショートカット情報 */}
      <div style={styles.keyboardInfo}>
        <div style={styles.keyboardTitle}>
          ⌨️ キーボードショートカット
        </div>
        <div style={styles.shortcutList}>
          <div style={styles.shortcutItem}>
            <span>ビューリセット</span>
            <span style={styles.shortcutKey}>R</span>
          </div>
          <div style={styles.shortcutItem}>
            <span>ズームイン</span>
            <span style={styles.shortcutKey}>+</span>
          </div>
          <div style={styles.shortcutItem}>
            <span>ズームアウト</span>
            <span style={styles.shortcutKey}>-</span>
          </div>
          <div style={styles.shortcutItem}>
            <span>選択解除</span>
            <span style={styles.shortcutKey}>ESC</span>
          </div>
        </div>
      </div>
    </div>
  );
};
