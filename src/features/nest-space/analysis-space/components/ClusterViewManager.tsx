/**
 * クラスタービュー管理コンポーネント
 * 保存済みクラスタービューの一覧表示・操作を担当
 */

import React, { useState, useEffect } from 'react';
import { ClusterViewService } from '../../../../services/ClusterViewService';
import type { SavedClusterView, ClusterViewSummary } from '../../../../types/clusterView';

interface ClusterViewManagerProps {
  boardId: string;
  onLoadView: (view: SavedClusterView) => void;
  onClose: () => void;
}

// テーマカラー（既存のTHEME_COLORSを仮定）
const THEME_COLORS = {
  bgPrimary: '#1a1a2e',
  bgSecondary: '#16213e',
  bgTertiary: '#0f172a',
  textPrimary: '#f1f5f9',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  textInverse: '#ffffff',
  borderPrimary: '#334155',
  borderSecondary: '#475569',
  primaryGreen: '#10b981',
  primaryGreenDark: '#059669',
  primaryRed: '#ef4444',
  primaryBlue: '#3b82f6',
  primaryCyan: '#06b6d4',
  primaryPurple: '#8b5cf6',
  borderRadius: {
    small: '4px',
    medium: '6px',
    large: '8px'
  }
};

export const ClusterViewManager: React.FC<ClusterViewManagerProps> = ({
  boardId,
  onLoadView,
  onClose
}) => {
  const [views, setViews] = useState<SavedClusterView[]>([]);
  const [summaries, setSummaries] = useState<ClusterViewSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedViewId, setSelectedViewId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // 初期データロード
  useEffect(() => {
    loadViews();
  }, [boardId]);

  const loadViews = async () => {
    try {
      setLoading(true);
      setError(null);

      // サマリー情報を取得（パフォーマンス向上のため）
      const summaryResponse = await ClusterViewService.getClusterViewSummaries(boardId);
      if (summaryResponse.success && summaryResponse.data) {
        setSummaries(summaryResponse.data);
      }

      // 詳細データも取得
      const response = await ClusterViewService.getClusterViews(boardId);
      if (response.success && response.data) {
        setViews(response.data);
      } else {
        setError(response.error || '取得に失敗しました');
      }
    } catch (err) {
      setError('予期しないエラーが発生しました');
      console.error('ビューロードエラー:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadView = async (viewId: string) => {
    try {
      setSelectedViewId(viewId);
      
      const response = await ClusterViewService.getClusterView(viewId);
      if (response.success && response.data) {
        onLoadView(response.data);
        onClose(); // ダイアログを閉じる
      } else {
        setError(response.error || '読み込みに失敗しました');
      }
    } catch (err) {
      setError('予期しないエラーが発生しました');
      console.error('ビュー読み込みエラー:', err);
    } finally {
      setSelectedViewId(null);
    }
  };

  const handleDeleteView = async (viewId: string, viewName: string) => {
    if (!confirm(`「${viewName}」を削除しますか？\nこの操作は取り消せません。`)) {
      return;
    }

    try {
      setIsDeleting(viewId);
      
      const response = await ClusterViewService.deleteClusterView(viewId);
      if (response.success) {
        // リストから除外
        setViews(prev => prev.filter(v => v.id !== viewId));
        setSummaries(prev => prev.filter(s => s.id !== viewId));
      } else {
        setError(response.error || '削除に失敗しました');
      }
    } catch (err) {
      setError('予期しないエラーが発生しました');
      console.error('ビュー削除エラー:', err);
    } finally {
      setIsDeleting(null);
    }
  };

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h3 style={styles.title}>📚 保存済みクラスタービュー</h3>
          <button style={styles.closeButton} onClick={onClose}>✕</button>
        </div>
        <div style={styles.loading}>
          <div style={styles.spinner}></div>
          <div>読み込み中...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h3 style={styles.title}>📚 保存済みクラスタービュー</h3>
          <button style={styles.closeButton} onClick={onClose}>✕</button>
        </div>
        <div style={styles.error}>
          <div>❌ {error}</div>
          <button style={styles.retryButton} onClick={loadViews}>
            再試行
          </button>
        </div>
      </div>
    );
  }

  if (views.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <h3 style={styles.title}>📚 保存済みクラスタービュー</h3>
          <button style={styles.closeButton} onClick={onClose}>✕</button>
        </div>
        <div style={styles.empty}>
          <div style={styles.emptyIcon}>📭</div>
          <div style={styles.emptyTitle}>保存済みビューはありません</div>
          <div style={styles.emptyText}>
            クラスタリング実行後に「現在のクラスターを保存」ボタンから<br />
            ビューを保存できます
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>📚 保存済みクラスタービュー</h3>
        <button style={styles.closeButton} onClick={onClose}>✕</button>
      </div>

      <div style={styles.content}>
        {views.map((view) => {
          const summary = summaries.find(s => s.id === view.id);
          const isLoadingThis = selectedViewId === view.id;
          const isDeletingThis = isDeleting === view.id;

          return (
            <div key={view.id} style={styles.viewCard}>
              {/* ビュー基本情報 */}
              <div style={styles.viewHeader}>
                <div style={styles.viewTitle}>{view.name}</div>
                <div style={styles.viewDate}>
                  {formatDate(view.createdAt)}
                </div>
              </div>

              {/* ビュー詳細情報 */}
              <div style={styles.viewDetails}>
                <div style={styles.viewStats}>
                  <span style={styles.stat}>
                    🔗 {summary?.clusterCount || view.clusterLabels.length} クラスター
                  </span>
                  <span style={styles.stat}>
                    📄 {summary?.cardCount || 0} カード
                  </span>
                  {summary?.averageConfidence && (
                    <span style={styles.stat}>
                      🎯 {Math.round(summary.averageConfidence * 100)}% 信頼度
                    </span>
                  )}
                </div>
                
                {view.description && (
                  <div style={styles.viewDescription}>
                    {view.description}
                  </div>
                )}
              </div>

              {/* アクションボタン */}
              <div style={styles.viewActions}>
                <button
                  style={{
                    ...styles.loadButton,
                    opacity: isLoadingThis || isDeletingThis ? 0.7 : 1,
                    cursor: isLoadingThis || isDeletingThis ? 'not-allowed' : 'pointer'
                  }}
                  onClick={() => handleLoadView(view.id)}
                  disabled={isLoadingThis || isDeletingThis}
                >
                  {isLoadingThis ? '読み込み中...' : '📊 表示'}
                </button>
                
                <button
                  style={{
                    ...styles.deleteButton,
                    opacity: isLoadingThis || isDeletingThis ? 0.7 : 1,
                    cursor: isLoadingThis || isDeletingThis ? 'not-allowed' : 'pointer'
                  }}
                  onClick={() => handleDeleteView(view.id, view.name)}
                  disabled={isLoadingThis || isDeletingThis}
                >
                  {isDeletingThis ? '削除中...' : '🗑️ 削除'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    height: '100%',
    maxHeight: '500px'
  },

  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: `1px solid ${THEME_COLORS.borderSecondary}`,
    backgroundColor: THEME_COLORS.bgTertiary
  },

  title: {
    margin: 0,
    color: THEME_COLORS.textPrimary,
    fontSize: '16px',
    fontWeight: '600'
  },

  closeButton: {
    background: 'none',
    border: 'none',
    color: THEME_COLORS.textMuted,
    fontSize: '16px',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: THEME_COLORS.borderRadius.small
  },

  content: {
    flex: 1,
    padding: '16px',
    overflowY: 'auto' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px'
  },

  loading: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px',
    color: THEME_COLORS.textMuted,
    fontSize: '14px'
  },

  spinner: {
    width: '20px',
    height: '20px',
    border: `2px solid ${THEME_COLORS.borderSecondary}`,
    borderTop: `2px solid ${THEME_COLORS.primaryBlue}`,
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '12px'
  },

  error: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px',
    color: THEME_COLORS.primaryRed,
    fontSize: '14px',
    gap: '12px'
  },

  retryButton: {
    backgroundColor: THEME_COLORS.primaryBlue,
    border: 'none',
    borderRadius: THEME_COLORS.borderRadius.medium,
    color: THEME_COLORS.textInverse,
    fontSize: '12px',
    fontWeight: '500',
    padding: '8px 16px',
    cursor: 'pointer'
  },

  empty: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px',
    textAlign: 'center' as const
  },

  emptyIcon: {
    fontSize: '48px',
    marginBottom: '16px'
  },

  emptyTitle: {
    color: THEME_COLORS.textSecondary,
    fontSize: '16px',
    fontWeight: '600',
    marginBottom: '8px'
  },

  emptyText: {
    color: THEME_COLORS.textMuted,
    fontSize: '13px',
    lineHeight: '1.4'
  },

  viewCard: {
    backgroundColor: THEME_COLORS.bgTertiary,
    border: `1px solid ${THEME_COLORS.borderSecondary}`,
    borderRadius: THEME_COLORS.borderRadius.medium,
    padding: '16px',
    transition: 'all 0.2s ease'
  },

  viewHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '12px'
  },

  viewTitle: {
    color: THEME_COLORS.textPrimary,
    fontSize: '14px',
    fontWeight: '600',
    flex: 1,
    marginRight: '12px'
  },

  viewDate: {
    color: THEME_COLORS.textMuted,
    fontSize: '11px',
    whiteSpace: 'nowrap' as const
  },

  viewDetails: {
    marginBottom: '12px'
  },

  viewStats: {
    display: 'flex',
    gap: '12px',
    marginBottom: '8px',
    flexWrap: 'wrap' as const
  },

  stat: {
    color: THEME_COLORS.textSecondary,
    fontSize: '11px',
    backgroundColor: THEME_COLORS.bgSecondary,
    padding: '4px 8px',
    borderRadius: THEME_COLORS.borderRadius.small,
    border: `1px solid ${THEME_COLORS.borderSecondary}`
  },

  viewDescription: {
    color: THEME_COLORS.textMuted,
    fontSize: '12px',
    lineHeight: '1.4',
    fontStyle: 'italic'
  },

  viewActions: {
    display: 'flex',
    gap: '8px'
  },

  loadButton: {
    flex: 1,
    backgroundColor: THEME_COLORS.primaryBlue,
    border: 'none',
    borderRadius: THEME_COLORS.borderRadius.small,
    color: THEME_COLORS.textInverse,
    fontSize: '11px',
    fontWeight: '600',
    padding: '8px 12px',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },

  deleteButton: {
    backgroundColor: 'transparent',
    border: `1px solid ${THEME_COLORS.primaryRed}`,
    borderRadius: THEME_COLORS.borderRadius.small,
    color: THEME_COLORS.primaryRed,
    fontSize: '11px',
    fontWeight: '500',
    padding: '7px 12px',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  }
};
