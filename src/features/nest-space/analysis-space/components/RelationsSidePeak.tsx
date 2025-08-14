import React, { useState, useCallback } from 'react';
import { THEME_COLORS } from '../../../../constants/theme';

interface RelationsSidePeakProps {
  /** 関係性分析中かどうか */
  isAnalyzing: boolean;
  /** 関係性品質分析中かどうか */
  isAnalyzingRelations: boolean;
  /** 統合関係性分析の実行 */
  onRunUnifiedAnalysis: (mode: 'incremental' | 'full') => void;
  /** Relations一括削除の実行 */
  onBulkDeleteRelations: () => void;
  /** パラメータ設定モーダルを開く */
  onOpenParameterSettings: () => void;
  /** Relations品質分析の実行 */
  onRunRelationsAnalysis: () => void;
  /** Relations数 */
  relationsCount: number;
}

/**
 * Relations サイドピークコンポーネント
 * タブ1: 作成・設定 / タブ2: 関係性一覧・管理
 */
export const RelationsSidePeak: React.FC<RelationsSidePeakProps> = ({
  isAnalyzing,
  isAnalyzingRelations,
  onRunUnifiedAnalysis,
  onBulkDeleteRelations,
  onOpenParameterSettings,
  onRunRelationsAnalysis,
  relationsCount,
}) => {
  const [activeTab, setActiveTab] = useState<'create' | 'manage'>('create');

  // スタイル定義
  const styles = {
    tabContainer: {
      display: 'flex',
      borderBottom: `1px solid ${THEME_COLORS.borderSecondary}`,
      backgroundColor: THEME_COLORS.bgTertiary,
    },
    tab: {
      flex: 1,
      padding: '12px 16px',
      border: 'none',
      background: 'transparent',
      color: THEME_COLORS.textSecondary,
      cursor: 'pointer',
      fontSize: '13px',
      fontWeight: '500',
      transition: 'all 0.2s ease',
      borderRadius: 0,
    },
    activeTab: {
      color: THEME_COLORS.textPrimary,
      backgroundColor: THEME_COLORS.bgPrimary,
      borderBottom: `2px solid ${THEME_COLORS.primaryOrange}`,
    },
    content: {
      padding: '20px',
      height: 'calc(100% - 50px)',
      overflow: 'auto',
    },
    section: {
      marginBottom: '24px',
    },
    sectionTitle: {
      fontSize: '14px',
      fontWeight: '600',
      color: THEME_COLORS.textPrimary,
      marginBottom: '12px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    sectionDesc: {
      fontSize: '12px',
      color: THEME_COLORS.textSecondary,
      marginBottom: '16px',
      lineHeight: 1.4,
    },
    buttonGroup: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '8px',
    },
    button: {
      padding: '10px 16px',
      border: `1px solid ${THEME_COLORS.borderPrimary}`,
      borderRadius: THEME_COLORS.borderRadius.medium,
      background: THEME_COLORS.bgSecondary,
      color: THEME_COLORS.textSecondary,
      cursor: 'pointer',
      fontSize: '12px',
      fontWeight: '500',
      transition: 'all 0.2s ease',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    primaryButton: {
      backgroundColor: THEME_COLORS.primaryOrange,
      color: THEME_COLORS.textInverse,
      borderColor: THEME_COLORS.primaryOrange,
      fontWeight: '600',
    },
    dangerButton: {
      borderColor: THEME_COLORS.primaryRed,
      color: THEME_COLORS.primaryRed,
    },
    disabledButton: {
      opacity: 0.5,
      cursor: 'not-allowed',
    },
    statCard: {
      padding: '12px',
      backgroundColor: THEME_COLORS.bgTertiary,
      borderRadius: THEME_COLORS.borderRadius.medium,
      border: `1px solid ${THEME_COLORS.borderSecondary}`,
      marginBottom: '16px',
    },
    statNumber: {
      fontSize: '24px',
      fontWeight: '700',
      color: THEME_COLORS.primaryOrange,
      marginBottom: '4px',
    },
    statLabel: {
      fontSize: '12px',
      color: THEME_COLORS.textSecondary,
    },
  };

  const handleButtonHover = useCallback((e: React.MouseEvent<HTMLButtonElement>, isEnter: boolean) => {
    const button = e.currentTarget;
    const isDanger = button.classList.contains('danger-btn');
    const isPrimary = button.classList.contains('primary-btn');
    const isDisabled = button.disabled;

    if (isDisabled) return;

    if (isEnter) {
      if (isDanger) {
        button.style.backgroundColor = THEME_COLORS.primaryRed;
        button.style.color = THEME_COLORS.textInverse;
      } else if (isPrimary) {
        button.style.backgroundColor = THEME_COLORS.primaryOrange;
        button.style.color = THEME_COLORS.textInverse;
      } else {
        button.style.backgroundColor = THEME_COLORS.bgTertiary;
        button.style.borderColor = THEME_COLORS.primaryOrange;
      }
      button.style.transform = 'translateY(-1px)';
    } else {
      if (isDanger) {
        button.style.backgroundColor = THEME_COLORS.bgSecondary;
        button.style.color = THEME_COLORS.primaryRed;
      } else if (isPrimary) {
        button.style.backgroundColor = THEME_COLORS.primaryOrange;
        button.style.color = THEME_COLORS.textInverse;
      } else {
        button.style.backgroundColor = THEME_COLORS.bgSecondary;
        button.style.borderColor = THEME_COLORS.borderPrimary;
        button.style.color = THEME_COLORS.textSecondary;
      }
      button.style.transform = 'translateY(0)';
    }
  }, []);

  const renderCreateTab = () => (
    <div style={styles.content}>
      {/* 関係性生成セクション */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>
          🔗 関係性生成
        </div>
        <div style={styles.sectionDesc}>
          AIによる統合分析でカード間の関係性を自動生成します。増分モードでは新しい関係性のみを生成し、フルモードでは全体を再分析します。
        </div>
        <div style={styles.buttonGroup}>
          <button
            className="primary-btn"
            style={{
              ...styles.button,
              ...styles.primaryButton,
              ...(isAnalyzing ? styles.disabledButton : {}),
            }}
            onClick={() => onRunUnifiedAnalysis('incremental')}
            disabled={isAnalyzing}
            onMouseEnter={(e) => handleButtonHover(e, true)}
            onMouseLeave={(e) => handleButtonHover(e, false)}
          >
            <span>🔗 関係性生成（増分）</span>
            {isAnalyzing && <span>分析中...</span>}
          </button>
          <button
            style={{
              ...styles.button,
              ...(isAnalyzing ? styles.disabledButton : {}),
            }}
            onClick={() => onRunUnifiedAnalysis('full')}
            disabled={isAnalyzing}
            onMouseEnter={(e) => handleButtonHover(e, true)}
            onMouseLeave={(e) => handleButtonHover(e, false)}
          >
            <span>🔄 全体再分析</span>
            {isAnalyzing && <span>分析中...</span>}
          </button>
        </div>
      </div>

      {/* パラメータ設定セクション */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>
          🎛️ 分析パラメータ
        </div>
        <div style={styles.sectionDesc}>
          関係性分析の閾値、重み付け、アルゴリズムパラメータを調整できます。
        </div>
        <div style={styles.buttonGroup}>
          <button
            style={styles.button}
            onClick={onOpenParameterSettings}
            onMouseEnter={(e) => handleButtonHover(e, true)}
            onMouseLeave={(e) => handleButtonHover(e, false)}
          >
            🎛️ パラメータ設定
          </button>
        </div>
      </div>

      {/* 品質分析セクション */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>
          📊 品質分析
        </div>
        <div style={styles.sectionDesc}>
          現在の関係性の品質、密度、重複率を分析してレポートを生成します。
        </div>
        <div style={styles.buttonGroup}>
          <button
            style={{
              ...styles.button,
              ...(isAnalyzingRelations ? styles.disabledButton : {}),
            }}
            onClick={onRunRelationsAnalysis}
            disabled={isAnalyzingRelations}
            onMouseEnter={(e) => handleButtonHover(e, true)}
            onMouseLeave={(e) => handleButtonHover(e, false)}
          >
            <span>📊 品質分析実行</span>
            {isAnalyzingRelations && <span>分析中...</span>}
          </button>
        </div>
      </div>
    </div>
  );

  const renderManageTab = () => (
    <div style={styles.content}>
      {/* 統計情報 */}
      <div style={styles.section}>
        <div style={styles.statCard}>
          <div style={styles.statNumber}>{relationsCount}</div>
          <div style={styles.statLabel}>総関係性数</div>
        </div>
      </div>

      {/* 関係性削除セクション */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>
          🗑️ 関係性削除
        </div>
        <div style={styles.sectionDesc}>
          条件を指定して関係性を一括削除できます。この操作は元に戻せません。
        </div>
        <div style={styles.buttonGroup}>
          <button
            className="danger-btn"
            style={{
              ...styles.button,
              ...styles.dangerButton,
            }}
            onClick={onBulkDeleteRelations}
            onMouseEnter={(e) => handleButtonHover(e, true)}
            onMouseLeave={(e) => handleButtonHover(e, false)}
          >
            🗑️ 一括削除
          </button>
        </div>
      </div>

      {/* 関係性一覧（実装予定） */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>
          📋 関係性一覧
        </div>
        <div style={{
          padding: '16px',
          backgroundColor: THEME_COLORS.bgTertiary,
          borderRadius: THEME_COLORS.borderRadius.medium,
          border: `1px solid ${THEME_COLORS.borderSecondary}`,
          fontSize: '12px',
          color: THEME_COLORS.textSecondary,
          textAlign: 'center',
        }}>
          📋 実装予定: 関係性の一覧表示・編集・フィルタリング機能
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* タブヘッダー */}
      <div style={styles.tabContainer}>
        <button
          style={{
            ...styles.tab,
            ...(activeTab === 'create' ? styles.activeTab : {}),
          }}
          onClick={() => setActiveTab('create')}
        >
          作成・設定
        </button>
        <button
          style={{
            ...styles.tab,
            ...(activeTab === 'manage' ? styles.activeTab : {}),
          }}
          onClick={() => setActiveTab('manage')}
        >
          一覧・管理
        </button>
      </div>

      {/* タブコンテンツ */}
      {activeTab === 'create' ? renderCreateTab() : renderManageTab()}
    </div>
  );
};

export default RelationsSidePeak;
