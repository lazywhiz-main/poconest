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

  // タイプ設定（NetworkVisualizationの実装と完全に統一）
  const getTypeConfig = useCallback((type: string, isSelected: boolean) => {
    switch(type) {
      case 'INSIGHTS':
        return {
          icon: '💡',
          background: isSelected ? 'rgba(156,39,176,0.2)' : THEME_COLORS.bgTertiary,
          color: isSelected ? '#9c27b0' : THEME_COLORS.textSecondary,
          borderColor: isSelected ? '#9c27b0' : THEME_COLORS.borderSecondary,
          hoverBg: 'rgba(156,39,176,0.2)',
          hoverColor: '#9c27b0',
          hoverBorder: '#9c27b0',
        };
      case 'THEMES':
        return {
          icon: '🎯',
          background: isSelected ? 'rgba(100,181,246,0.2)' : THEME_COLORS.bgTertiary,
          color: isSelected ? '#64b5f6' : THEME_COLORS.textSecondary,
          borderColor: isSelected ? '#64b5f6' : THEME_COLORS.borderSecondary,
          hoverBg: 'rgba(100,181,246,0.2)',
          hoverColor: '#64b5f6',
          hoverBorder: '#64b5f6',
        };
      case 'QUESTIONS':
        return {
          icon: '❓',
          background: isSelected ? 'rgba(255,211,61,0.2)' : THEME_COLORS.bgTertiary,
          color: isSelected ? '#ffd93d' : THEME_COLORS.textSecondary,
          borderColor: isSelected ? '#ffd93d' : THEME_COLORS.borderSecondary,
          hoverBg: 'rgba(255,211,61,0.2)',
          hoverColor: '#ffd93d',
          hoverBorder: '#ffd93d',
        };
      case 'ACTIONS':
        return {
          icon: '⚡',
          background: isSelected ? 'rgba(255,165,0,0.2)' : THEME_COLORS.bgTertiary,
          color: isSelected ? '#ffa500' : THEME_COLORS.textSecondary,
          borderColor: isSelected ? '#ffa500' : THEME_COLORS.borderSecondary,
          hoverBg: 'rgba(255,165,0,0.2)',
          hoverColor: '#ffa500',
          hoverBorder: '#ffa500',
        };
      case 'INBOX':
        return {
          icon: '📥',
          background: isSelected ? 'rgba(117,117,117,0.2)' : THEME_COLORS.bgTertiary,
          color: isSelected ? '#6c7086' : THEME_COLORS.textSecondary,
          borderColor: isSelected ? '#6c7086' : THEME_COLORS.borderSecondary,
          hoverBg: 'rgba(117,117,117,0.2)',
          hoverColor: '#6c7086',
          hoverBorder: '#6c7086',
        };
      default:
        return {
          icon: '📝',
          background: THEME_COLORS.bgTertiary,
          color: THEME_COLORS.textSecondary,
          borderColor: THEME_COLORS.borderSecondary,
          hoverBg: THEME_COLORS.bgTertiary,
          hoverColor: THEME_COLORS.textSecondary,
          hoverBorder: THEME_COLORS.borderSecondary,
        };
    }
  }, []);

  // 関係性タイプ設定（NetworkVisualizationの実装と完全に統一）
  const getRelationshipConfig = useCallback((type: string, isSelected: boolean) => {
    switch(type) {
      case 'manual':
        return {
          icon: '👥',
          label: 'Manual',
          background: isSelected ? 'rgba(0,255,136,0.2)' : THEME_COLORS.bgTertiary,
          color: isSelected ? THEME_COLORS.primaryGreen : THEME_COLORS.textSecondary,
          borderColor: isSelected ? THEME_COLORS.primaryGreen : THEME_COLORS.borderSecondary,
          hoverBg: 'rgba(0,255,136,0.2)',
          hoverColor: THEME_COLORS.primaryGreen,
          hoverBorder: THEME_COLORS.primaryGreen,
        };
      case 'semantic':
        return {
          icon: '🧠',
          label: 'Semantic',
          background: isSelected ? 'rgba(255,165,0,0.2)' : THEME_COLORS.bgTertiary,
          color: isSelected ? THEME_COLORS.primaryOrange : THEME_COLORS.textSecondary,
          borderColor: isSelected ? THEME_COLORS.primaryOrange : THEME_COLORS.borderSecondary,
          hoverBg: 'rgba(255,165,0,0.2)',
          hoverColor: THEME_COLORS.primaryOrange,
          hoverBorder: THEME_COLORS.primaryOrange,
        };
      case 'derived':
        return {
          icon: '🔗',
          label: 'Derived',
          background: isSelected ? 'rgba(100,181,246,0.2)' : THEME_COLORS.bgTertiary,
          color: isSelected ? THEME_COLORS.primaryBlue : THEME_COLORS.textSecondary,
          borderColor: isSelected ? THEME_COLORS.primaryBlue : THEME_COLORS.borderSecondary,
          hoverBg: 'rgba(100,181,246,0.2)',
          hoverColor: THEME_COLORS.primaryBlue,
          hoverBorder: THEME_COLORS.primaryBlue,
        };
      case 'tag_similarity':
        return {
          icon: '🏷️',
          label: 'Tags',
          background: isSelected ? 'rgba(139,195,74,0.2)' : THEME_COLORS.bgTertiary,
          color: isSelected ? THEME_COLORS.primaryCyan : THEME_COLORS.textSecondary,
          borderColor: isSelected ? THEME_COLORS.primaryCyan : THEME_COLORS.borderSecondary,
          hoverBg: 'rgba(139,195,74,0.2)',
          hoverColor: THEME_COLORS.primaryCyan,
          hoverBorder: THEME_COLORS.primaryCyan,
        };
      case 'ai':
        return {
          icon: '🤖',
          label: 'AI',
          background: isSelected ? 'rgba(255,235,59,0.2)' : THEME_COLORS.bgTertiary,
          color: isSelected ? THEME_COLORS.primaryYellow : THEME_COLORS.textSecondary,
          borderColor: isSelected ? THEME_COLORS.primaryYellow : THEME_COLORS.borderSecondary,
          hoverBg: 'rgba(255,235,59,0.2)',
          hoverColor: THEME_COLORS.primaryYellow,
          hoverBorder: THEME_COLORS.primaryYellow,
        };
      default:
        return {
          icon: '🔗',
          label: type,
          background: THEME_COLORS.bgTertiary,
          color: THEME_COLORS.textSecondary,
          borderColor: THEME_COLORS.borderSecondary,
          hoverBg: THEME_COLORS.bgTertiary,
          hoverColor: THEME_COLORS.textSecondary,
          hoverBorder: THEME_COLORS.borderSecondary,
        };
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
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      padding: '2px 6px',
      borderRadius: THEME_COLORS.borderRadius.small,
      fontSize: '10px',
      fontWeight: '500',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      fontFamily: 'JetBrains Mono, monospace',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      border: '1px solid',
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
      <div style={{
        ...styles.sectionTitle,
        fontSize: '12px',
        marginBottom: '8px',
      }}>
        🔍 検索
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
      <div style={{
        ...styles.sectionTitle,
        fontSize: '12px',
        marginBottom: '8px',
      }}>
        📦 タイプ
        {activeFilters.types.length > 0 && (
          <span style={styles.badge}>{activeFilters.types.length}</span>
        )}
      </div>
      <div style={styles.filterGrid}>
        {['QUESTIONS', 'INSIGHTS', 'ACTIONS', 'THEMES', 'INBOX'].map(type => {
          const isSelected = activeFilters.types.includes(type);
          const typeConfig = getTypeConfig(type, isSelected);
          
          return (
            <button
              key={type}
              style={{
                ...styles.filterChip,
                background: typeConfig.background,
                color: typeConfig.color,
                borderColor: typeConfig.borderColor,
                transform: isSelected ? 'translateY(-1px)' : 'translateY(0)',
                boxShadow: isSelected ? '0 4px 12px rgba(0,255,136,0.2)' : 'none',
              }}
              onClick={() => onToggleTypeFilter(type)}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.background = typeConfig.hoverBg;
                  e.currentTarget.style.color = typeConfig.hoverColor;
                  e.currentTarget.style.borderColor = typeConfig.hoverBorder;
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,255,136,0.2)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.background = THEME_COLORS.bgTertiary;
                  e.currentTarget.style.color = THEME_COLORS.textSecondary;
                  e.currentTarget.style.borderColor = THEME_COLORS.borderSecondary;
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }
              }}
            >
              <span style={{ fontSize: '10px' }}>{typeConfig.icon}</span>
              {type}
            </button>
          );
        })}
      </div>
    </div>
  );

  // タグフィルター
  const renderTagFilters = () => (
    <div style={styles.filterSection}>
      <div style={{
        ...styles.sectionTitle,
        fontSize: '12px',
        marginBottom: '8px',
      }}>
        🏷️ タグ
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
      <div style={{
        ...styles.sectionTitle,
        fontSize: '12px',
        marginBottom: '8px',
      }}>
        🔗 関係性タイプ
        {activeFilters.relationships.length > 0 && (
          <span style={styles.badge}>{activeFilters.relationships.length}</span>
        )}
      </div>
      <div style={styles.filterGrid}>
        {['manual', 'semantic', 'derived', 'tag_similarity', 'ai'].map(relationshipType => {
          const isSelected = activeFilters.relationships.includes(relationshipType);
          const relationshipConfig = getRelationshipConfig(relationshipType, isSelected);
          
          return (
            <button
              key={relationshipType}
              style={{
                ...styles.filterChip,
                background: relationshipConfig.background,
                color: relationshipConfig.color,
                borderColor: relationshipConfig.borderColor,
                transform: isSelected ? 'translateY(-1px)' : 'translateY(0)',
                boxShadow: isSelected ? '0 4px 12px rgba(0,255,136,0.2)' : 'none',
              }}
              onClick={() => onToggleRelationshipFilter(relationshipType)}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.background = relationshipConfig.hoverBg;
                  e.currentTarget.style.color = relationshipConfig.hoverColor;
                  e.currentTarget.style.borderColor = relationshipConfig.hoverBorder;
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,255,136,0.2)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.background = THEME_COLORS.bgTertiary;
                  e.currentTarget.style.color = THEME_COLORS.textSecondary;
                  e.currentTarget.style.borderColor = THEME_COLORS.borderSecondary;
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }
              }}
            >
              <span style={{ fontSize: '10px' }}>{relationshipConfig.icon}</span>
              {relationshipConfig.label}
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

      {/* コンテンツ */}
      <div style={styles.content}>
        {/* ノードフィルター */}
        <div style={{
          ...styles.filterSection,
          borderBottom: `1px solid ${THEME_COLORS.borderSecondary}`,
          paddingBottom: '20px',
          marginBottom: '20px',
        }}>
          <div style={{
            ...styles.sectionTitle,
            fontSize: '14px',
            marginBottom: '16px',
            color: THEME_COLORS.textPrimary,
          }}>
            📝 ノードフィルター
            {(activeFilters.tags.length + activeFilters.types.length) > 0 && (
              <span style={styles.badge}>{activeFilters.tags.length + activeFilters.types.length}</span>
            )}
          </div>
          {renderSearchSection()}
          {renderTagFilters()}
          {renderNodeTypeFilters()}
        </div>

        {/* 関係性フィルター */}
        <div style={styles.filterSection}>
          <div style={{
            ...styles.sectionTitle,
            fontSize: '14px',
            marginBottom: '16px',
            color: THEME_COLORS.textPrimary,
          }}>
            🔗 関係性フィルター
            {activeFilters.relationships.length > 0 && (
              <span style={styles.badge}>{activeFilters.relationships.length}</span>
            )}
          </div>
          {renderRelationshipFilters()}
        </div>
      </div>
    </div>
  );
};
