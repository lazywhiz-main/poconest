import React, { useState, useCallback } from 'react';
import { THEME_COLORS } from '../../../../constants/theme';

interface SearchFilterSidePeakProps {
  /** 現在のアクティブフィルター */
  activeFilters: {
    tags: string[];
    types: string[];
    relationships: string[];
  };
  /** タグフィルター切り替え */
  onToggleTagFilter: (tag: string) => void;
  /** タイプフィルター切り替え */
  onToggleTypeFilter: (type: string) => void;
  /** 関係性フィルター切り替え */
  onToggleRelationshipFilter: (relationshipType: string) => void;
  /** 検索クエリ */
  searchQuery?: string;
  /** 検索クエリ変更 */
  onSearchQueryChange?: (query: string) => void;
}

/**
 * Search & Filter サイドピークコンポーネント
 * ノード検索とフィルタリング機能を管理
 */
export const SearchFilterSidePeak: React.FC<SearchFilterSidePeakProps> = ({
  activeFilters,
  onToggleTagFilter,
  onToggleTypeFilter,
  onToggleRelationshipFilter,
  searchQuery = '',
  onSearchQueryChange,
}) => {
  const [activeTab, setActiveTab] = useState<'search' | 'nodes' | 'relationships'>('search');

  // アクティブフィルターの総数を計算
  const totalActiveFilters = activeFilters.tags.length + activeFilters.types.length + activeFilters.relationships.length;

  // フィルターをクリア
  const clearAllFilters = useCallback(() => {
    // すべてのアクティブなタグフィルターをクリア
    activeFilters.tags.forEach(tag => onToggleTagFilter(tag));
    // すべてのアクティブなタイプフィルターをクリア
    activeFilters.types.forEach(type => onToggleTypeFilter(type));
    // すべてのアクティブな関係性フィルターをクリア
    activeFilters.relationships.forEach(rel => onToggleRelationshipFilter(rel));
    // 検索クエリもクリア
    if (onSearchQueryChange) onSearchQueryChange('');
  }, [activeFilters, onToggleTagFilter, onToggleTypeFilter, onToggleRelationshipFilter, onSearchQueryChange]);

  // タイプ設定
  const getTypeConfig = useCallback((type: string) => {
    switch(type) {
      case 'INSIGHTS':
        return { icon: '💡', color: THEME_COLORS.primaryYellow, label: 'インサイト' };
      case 'QUESTIONS':
        return { icon: '❓', color: THEME_COLORS.primaryBlue, label: '質問' };
      case 'ACTIONS':
        return { icon: '⚡', color: THEME_COLORS.primaryGreen, label: 'アクション' };
      case 'THEMES':
        return { icon: '🎭', color: THEME_COLORS.primaryPurple, label: 'テーマ' };
      case 'INBOX':
        return { icon: '📥', color: THEME_COLORS.primaryGray, label: 'インボックス' };
      default:
        return { icon: '📝', color: THEME_COLORS.primaryGray, label: type };
    }
  }, []);

  // 関係性タイプ設定
  const getRelationshipConfig = useCallback((type: string) => {
    switch(type) {
      case 'manual':
        return { icon: '👤', color: THEME_COLORS.primaryBlue, label: '手動' };
      case 'semantic':
        return { icon: '🧠', color: THEME_COLORS.primaryPurple, label: 'セマンティック' };
      case 'derived':
        return { icon: '🔗', color: THEME_COLORS.primaryGreen, label: '派生' };
      case 'tag_similarity':
        return { icon: '🏷️', color: THEME_COLORS.primaryOrange, label: 'タグ類似' };
      case 'ai':
        return { icon: '🤖', color: THEME_COLORS.primaryCyan, label: 'AI提案' };
      default:
        return { icon: '🔗', color: THEME_COLORS.primaryGray, label: type };
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
    header: {
      padding: '16px 20px',
      borderBottom: `1px solid ${THEME_COLORS.borderSecondary}`,
      flexShrink: 0,
    } as React.CSSProperties,
    headerTitle: {
      fontSize: '14px',
      fontWeight: '600',
      color: THEME_COLORS.textPrimary,
      marginBottom: '4px',
      fontFamily: 'Space Grotesk, system-ui, sans-serif',
    } as React.CSSProperties,
    headerSubtitle: {
      fontSize: '11px',
      color: THEME_COLORS.textSecondary,
      lineHeight: '1.3',
    } as React.CSSProperties,
    clearButton: {
      marginTop: '8px',
      padding: '6px 12px',
      backgroundColor: totalActiveFilters > 0 ? THEME_COLORS.primaryRed : THEME_COLORS.bgTertiary,
      color: totalActiveFilters > 0 ? THEME_COLORS.textInverse : THEME_COLORS.textMuted,
      border: 'none',
      borderRadius: THEME_COLORS.borderRadius.small,
      fontSize: '10px',
      fontWeight: '600',
      cursor: totalActiveFilters > 0 ? 'pointer' : 'not-allowed',
      transition: 'all 0.2s ease',
      opacity: totalActiveFilters > 0 ? 1 : 0.5,
    } as React.CSSProperties,
    tabContainer: {
      display: 'flex',
      borderBottom: `1px solid ${THEME_COLORS.borderSecondary}`,
      backgroundColor: THEME_COLORS.bgSecondary,
    } as React.CSSProperties,
    tab: {
      flex: 1,
      padding: '12px 16px',
      border: 'none',
      backgroundColor: 'transparent',
      color: THEME_COLORS.textSecondary,
      fontSize: '11px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      borderBottom: '2px solid transparent',
    } as React.CSSProperties,
    activeTab: {
      backgroundColor: THEME_COLORS.bgTertiary,
      color: THEME_COLORS.textPrimary,
      borderBottomColor: THEME_COLORS.primaryCyan,
    } as React.CSSProperties,
    content: {
      flex: 1,
      overflow: 'auto',
      padding: '16px 20px',
    } as React.CSSProperties,
    searchSection: {
      marginBottom: '20px',
    } as React.CSSProperties,
    searchInput: {
      width: '100%',
      padding: '10px 12px',
      border: `1px solid ${THEME_COLORS.borderSecondary}`,
      borderRadius: THEME_COLORS.borderRadius.medium,
      backgroundColor: THEME_COLORS.bgTertiary,
      color: THEME_COLORS.textPrimary,
      fontSize: '12px',
      transition: 'all 0.2s ease',
    } as React.CSSProperties,
    filterSection: {
      marginBottom: '24px',
    } as React.CSSProperties,
    sectionTitle: {
      fontSize: '12px',
      fontWeight: '600',
      color: THEME_COLORS.textPrimary,
      marginBottom: '8px',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
    } as React.CSSProperties,
    filterGrid: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '6px',
    } as React.CSSProperties,
    filterChip: {
      padding: '4px 8px',
      border: `1px solid ${THEME_COLORS.borderSecondary}`,
      borderRadius: THEME_COLORS.borderRadius.small,
      backgroundColor: THEME_COLORS.bgTertiary,
      color: THEME_COLORS.textSecondary,
      fontSize: '10px',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
    } as React.CSSProperties,
    activeFilterChip: {
      backgroundColor: THEME_COLORS.primaryCyan,
      color: THEME_COLORS.textInverse,
      borderColor: THEME_COLORS.primaryCyan,
    } as React.CSSProperties,
    badge: {
      display: 'inline-block',
      backgroundColor: THEME_COLORS.primaryCyan,
      color: THEME_COLORS.textInverse,
      borderRadius: '8px',
      padding: '2px 6px',
      fontSize: '9px',
      fontWeight: '600',
      minWidth: '16px',
      textAlign: 'center',
      marginLeft: '4px',
    } as React.CSSProperties,
  };

  // 検索セクション
  const renderSearchSection = () => (
    <div style={styles.searchSection}>
      <div style={styles.sectionTitle}>
        🔍 ノード検索
      </div>
      <input
        type="text"
        placeholder="タイトル、コンテンツ、タグで検索..."
        value={searchQuery}
        onChange={(e) => onSearchQueryChange?.(e.target.value)}
        style={{
          ...styles.searchInput,
          borderColor: searchQuery ? THEME_COLORS.primaryCyan : THEME_COLORS.borderSecondary,
        }}
      />
      {searchQuery && (
        <div style={{
          fontSize: '10px',
          color: THEME_COLORS.textMuted,
          marginTop: '4px',
        }}>
          "{searchQuery}" で検索中
        </div>
      )}
    </div>
  );

  // ノードタイプフィルター
  const renderNodeTypeFilters = () => (
    <div style={styles.filterSection}>
      <div style={styles.sectionTitle}>
        📝 ノードタイプ
        {activeFilters.types.length > 0 && (
          <span style={styles.badge}>{activeFilters.types.length}</span>
        )}
      </div>
      <div style={styles.filterGrid}>
        {['QUESTIONS', 'INSIGHTS', 'ACTIONS', 'THEMES', 'INBOX'].map(type => {
          const isSelected = activeFilters.types.includes(type);
          const config = getTypeConfig(type);
          
          return (
            <button
              key={type}
              style={{
                ...styles.filterChip,
                ...(isSelected ? styles.activeFilterChip : {}),
                borderColor: isSelected ? config.color : styles.filterChip.borderColor,
              }}
              onClick={() => onToggleTypeFilter(type)}
            >
              <span>{config.icon}</span>
              <span>{config.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  // タグフィルター
  const renderTagFilters = () => (
    <div style={styles.filterSection}>
      <div style={styles.sectionTitle}>
        🏷️ タグフィルター
        {activeFilters.tags.length > 0 && (
          <span style={styles.badge}>{activeFilters.tags.length}</span>
        )}
      </div>
      <div style={styles.filterGrid}>
        {['ux', 'psychology', 'design', 'research', 'behavior', 'user', 'interface', 'study'].map(tag => {
          const isSelected = activeFilters.tags.includes(tag);
          
          return (
            <button
              key={tag}
              style={{
                ...styles.filterChip,
                ...(isSelected ? styles.activeFilterChip : {}),
              }}
              onClick={() => onToggleTagFilter(tag)}
            >
              #{tag}
            </button>
          );
        })}
      </div>
    </div>
  );

  // 関係性フィルター
  const renderRelationshipFilters = () => (
    <div style={styles.filterSection}>
      <div style={styles.sectionTitle}>
        🔗 関係性タイプ
        {activeFilters.relationships.length > 0 && (
          <span style={styles.badge}>{activeFilters.relationships.length}</span>
        )}
      </div>
      <div style={styles.filterGrid}>
        {['manual', 'semantic', 'derived', 'tag_similarity', 'ai'].map(relationshipType => {
          const isSelected = activeFilters.relationships.includes(relationshipType);
          const config = getRelationshipConfig(relationshipType);
          
          return (
            <button
              key={relationshipType}
              style={{
                ...styles.filterChip,
                ...(isSelected ? styles.activeFilterChip : {}),
                borderColor: isSelected ? config.color : styles.filterChip.borderColor,
              }}
              onClick={() => onToggleRelationshipFilter(relationshipType)}
            >
              <span>{config.icon}</span>
              <span>{config.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div style={styles.container}>
      {/* ヘッダー */}
      <div style={styles.header}>
        <div style={styles.headerTitle}>
          🔍 検索・フィルタリング
        </div>
        <div style={styles.headerSubtitle}>
          ノードの検索とフィルタリングで表示を絞り込みます
          {totalActiveFilters > 0 && ` (${totalActiveFilters}個のフィルター適用中)`}
        </div>
        {totalActiveFilters > 0 && (
          <button
            style={styles.clearButton}
            onClick={clearAllFilters}
          >
            🧹 すべてクリア
          </button>
        )}
      </div>

      {/* タブ */}
      <div style={styles.tabContainer}>
        <button
          style={{
            ...styles.tab,
            ...(activeTab === 'search' ? styles.activeTab : {}),
          }}
          onClick={() => setActiveTab('search')}
        >
          🔍 検索
        </button>
        <button
          style={{
            ...styles.tab,
            ...(activeTab === 'nodes' ? styles.activeTab : {}),
          }}
          onClick={() => setActiveTab('nodes')}
        >
          📝 ノード{activeFilters.types.length > 0 && ` (${activeFilters.types.length})`}
        </button>
        <button
          style={{
            ...styles.tab,
            ...(activeTab === 'relationships' ? styles.activeTab : {}),
          }}
          onClick={() => setActiveTab('relationships')}
        >
          🔗 関係性{activeFilters.relationships.length > 0 && ` (${activeFilters.relationships.length})`}
        </button>
      </div>

      {/* コンテンツ */}
      <div style={styles.content}>
        {activeTab === 'search' && (
          <div>
            {renderSearchSection()}
            {renderTagFilters()}
          </div>
        )}
        
        {activeTab === 'nodes' && (
          <div>
            {renderNodeTypeFilters()}
          </div>
        )}
        
        {activeTab === 'relationships' && (
          <div>
            {renderRelationshipFilters()}
          </div>
        )}
      </div>
    </div>
  );
};
