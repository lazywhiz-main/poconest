import React, { useState, useEffect } from 'react';
import { TrendProductService, TrendProduct } from '../services/TrendProductService';
import { TrendCollectionService } from '../services/TrendCollectionService';
import ProductDetailModal from './ProductDetailModal';
import TrendPatternsView from './TrendPatternsView';

interface TrendInsightsSpaceProps {
  nestId: string;
}

type FilterCategory = 'all' | 'high-score' | 'investigating' | 'completed' | 'this-week' | 'this-month';
type ViewMode = 'products' | 'patterns';

const TrendInsightsSpace: React.FC<TrendInsightsSpaceProps> = ({ nestId }) => {
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<FilterCategory>('all');
  const [products, setProducts] = useState<TrendProduct[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    highScore: 0,
    investigating: 0,
  });
  const [collecting, setCollecting] = useState(false);
  const [collectionMessage, setCollectionMessage] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<TrendProduct | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('products');

  // データ取得
  useEffect(() => {
    loadProducts();
    loadStats();
  }, [nestId, selectedCategory]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      let options: any = {};

      // フィルター適用
      switch (selectedCategory) {
        case 'high-score':
          options.minScore = 28;
          break;
        case 'investigating':
          // 調査中のステータスでフィルター（後でクライアント側でフィルター）
          break;
        case 'completed':
          options.statusFilter = '完了';
          break;
        case 'this-week':
          // 今週のデータ（後でクライアント側でフィルター）
          break;
        case 'this-month':
          // 今月のデータ（後でクライアント側でフィルター）
          break;
      }

      const { data, error } = await TrendProductService.getProductsByNestId(nestId, options);

      if (error) {
        console.error('[TrendInsightsSpace] Error loading products:', error);
        setProducts([]);
        return;
      }

      let filteredData = data || [];

      // クライアント側でのフィルタリング
      if (selectedCategory === 'investigating') {
        filteredData = filteredData.filter((p) => p.status.includes('調査中'));
      } else if (selectedCategory === 'this-week') {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        filteredData = filteredData.filter(
          (p) => new Date(p.discovered_at) >= oneWeekAgo
        );
      } else if (selectedCategory === 'this-month') {
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        filteredData = filteredData.filter(
          (p) => new Date(p.discovered_at) >= oneMonthAgo
        );
      }

      setProducts(filteredData);
    } catch (error) {
      console.error('[TrendInsightsSpace] Exception loading products:', error);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const statsData = await TrendProductService.getProductStats(nestId);
      setStats(statsData);
    } catch (error) {
      console.error('[TrendInsightsSpace] Error loading stats:', error);
    }
  };

  // RSS収集を実行
  const handleCollectProducts = async () => {
    setCollecting(true);
    setCollectionMessage('RSS収集を開始しています...');
    
    try {
      const result = await TrendCollectionService.collectProducts(nestId);
      
      if (result.success && result.stats) {
        setCollectionMessage(
          `収集完了: ${result.stats.inserted}件の新製品を追加しました`
        );
        // データを再読み込み
        await loadProducts();
        await loadStats();
        
        // 5秒後にメッセージをクリア
        setTimeout(() => {
          setCollectionMessage('');
        }, 5000);
      } else {
        // エラーの場合でも、データが保存されている可能性があるので再読み込み
        setCollectionMessage(
          'バックグラウンドで処理中です。少し待ってからリフレッシュしてください。'
        );
        
        // 5秒後に自動でリロード
        setTimeout(async () => {
          await loadProducts();
          await loadStats();
          setCollectionMessage('');
        }, 5000);
      }
    } catch (error) {
      console.error('Collection error:', error);
      setCollectionMessage(
        'バックグラウンドで処理中です。少し待ってからリフレッシュしてください。'
      );
      
      // エラーでも5秒後に自動リロード
      setTimeout(async () => {
        await loadProducts();
        await loadStats();
        setCollectionMessage('');
      }, 5000);
    } finally {
      setCollecting(false);
    }
  };

  const categories = [
    { id: 'all' as const, name: 'すべて' },
    { id: 'high-score' as const, name: '高スコア' },
    { id: 'investigating' as const, name: '調査中' },
    { id: 'completed' as const, name: '完了' },
    { id: 'this-week' as const, name: '今週' },
    { id: 'this-month' as const, name: '今月' },
  ];

  // 総合スコア (0-40点) の色分け
  const getTotalScoreColor = (totalScore: number): string => {
    if (totalScore >= 28) return '#00ff88';  // 🟢 高スコア (70%以上)
    if (totalScore >= 20) return '#ffd93d';  // 🟡 中スコア (50-69%)
    return '#6c7086';                        // ⚪ 低スコア (50%未満)
  };

  // 個別スコア (0-10点) の色分け
  const getIndividualScoreColor = (score: number): string => {
    if (score >= 7) return '#00ff88';   // 🟢 高スコア (70%以上)
    if (score >= 5) return '#ffd93d';   // 🟡 中スコア (50-69%)
    return '#6c7086';                   // ⚪ 低スコア (50%未満)
  };

  // ボードスタイルのバッジベース
  const badgeBase = {
    display: 'inline-flex' as const,
    alignItems: 'center',
    gap: '4px',
    padding: '2px 6px',
    borderRadius: '2px',
    fontSize: '10px',
    fontWeight: 500,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    fontFamily: 'JetBrains Mono, monospace',
    border: '1px solid',
    transition: 'all 0.2s',
    cursor: 'pointer',
    flexShrink: 0,
  };

  // ステータスバッジ情報
  const statusBadgeInfo: Record<string, { bg: string; color: string; border: string; icon: string }> = {
    'New': { bg: 'rgba(0,255,136,0.2)', color: '#00ff88', border: '#00ff88', icon: '🆕' },
    '新着': { bg: 'rgba(0,255,136,0.2)', color: '#00ff88', border: '#00ff88', icon: '🆕' }, // 既存データ対応
    '調査中(L1)': { bg: 'rgba(255,211,61,0.2)', color: '#ffd93d', border: '#ffd93d', icon: '🔍' },
    '調査中(L2)': { bg: 'rgba(255,165,0,0.2)', color: '#ffa500', border: '#ffa500', icon: '🔬' },
    '調査中(L3)': { bg: 'rgba(100,181,246,0.2)', color: '#64b5f6', border: '#64b5f6', icon: '🎯' },
    '完了': { bg: 'rgba(156,39,176,0.2)', color: '#9c27b0', border: '#9c27b0', icon: '✅' },
  };

  const getStatusBadgeStyle = (status: string) => {
    const info = statusBadgeInfo[status] || {
      bg: 'rgba(108,112,134,0.2)',
      color: '#6c7086',
      border: '#6c7086',
      icon: '📦',
    };

    return {
      ...badgeBase,
      background: info.bg,
      color: info.color,
      borderColor: info.border,
    };
  };

  const getStatusIcon = (status: string): string => {
    return statusBadgeInfo[status]?.icon || '📦';
  };

  return (
    <div style={styles.container}>
      {/* サブキャッチ */}
      <div style={styles.subCatch}>
        デザイン製品のトレンドを自動収集・分析
      </div>

      {/* ビューモード切り替え + フィルターバー */}
      <div style={styles.filterBar}>
        {/* ビューモード切り替えボタン */}
        <div style={styles.viewModeSwitcher}>
          <button
            onClick={() => setViewMode('products')}
            style={{
              ...styles.viewModeButton,
              ...(viewMode === 'products' ? styles.viewModeButtonActive : {}),
            }}
          >
            製品一覧
          </button>
          <button
            onClick={() => setViewMode('patterns')}
            style={{
              ...styles.viewModeButton,
              ...(viewMode === 'patterns' ? styles.viewModeButtonActive : {}),
            }}
          >
            パターン検出
          </button>
        </div>

        {/* フィルターボタン（製品一覧モードのみ） */}
        {viewMode === 'products' && (
          <div style={styles.filterButtons}>
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                style={{
                  ...styles.filterButton,
                  ...(selectedCategory === category.id ? styles.filterButtonActive : {}),
                }}
              >
                {category.name}
              </button>
            ))}
          </div>
        )}
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* 収集ボタン */}
          <button
            onClick={handleCollectProducts}
            disabled={collecting}
            style={styles.collectButton}
          >
            {collecting ? '収集中...' : 'RSS収集'}
          </button>
          
          {/* 統計表示 */}
          <div style={styles.statsInline}>
            <div style={styles.statItem}>
              <div style={styles.statValue}>{stats.total}</div>
              <div style={styles.statLabel}>製品</div>
            </div>
            <div style={styles.statDivider} />
            <div style={styles.statItem}>
              <div style={styles.statValue}>{stats.highScore}</div>
              <div style={styles.statLabel}>高スコア</div>
            </div>
            <div style={styles.statDivider} />
            <div style={styles.statItem}>
              <div style={styles.statValue}>{stats.investigating}</div>
              <div style={styles.statLabel}>調査中</div>
            </div>
          </div>
        </div>
      </div>

      {/* 収集メッセージ */}
      {collectionMessage && (
        <div style={styles.collectionMessage}>
          {collectionMessage}
        </div>
      )}

      {/* コンテンツ切り替え */}
      {viewMode === 'patterns' ? (
        <TrendPatternsView nestId={nestId} />
      ) : (
        <div style={styles.cardGrid}>
          {loading ? (
          <div style={styles.loadingState}>
            <div style={styles.spinner} />
            <div style={styles.loadingText}>読み込み中...</div>
          </div>
        ) : products.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>
              <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                <circle cx="32" cy="32" r="30" stroke="#333366" strokeWidth="2" opacity="0.3"/>
                <path d="M16 48 L24 38 L32 42 L40 28 L48 32" stroke="#00ff88" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" opacity="0.6"/>
                <circle cx="24" cy="38" r="3" fill="#00ff88" opacity="0.6"/>
                <circle cx="32" cy="42" r="3" fill="#00ff88" opacity="0.8"/>
                <circle cx="40" cy="28" r="3" fill="#00ff88"/>
                <polyline points="42,16 48,16 48,22" stroke="#00ff88" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.6"/>
                <line x1="42" y1="22" x2="48" y2="16" stroke="#00ff88" strokeWidth="2" strokeLinecap="round" opacity="0.6"/>
              </svg>
            </div>
            <div style={styles.emptyTitle}>製品データがありません</div>
            <div style={styles.emptyText}>
              RSS収集を開始すると、ここに製品が表示されます
            </div>
          </div>
        ) : (
          products.map((product) => (
            <div
              key={product.id}
              style={styles.productCard}
              onClick={() => setSelectedProduct(product)}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#45475a';
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,255,136,0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#333366';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {/* スコアとステータス */}
              <div style={styles.cardHeader}>
                <div
                  style={{
                    ...styles.scoreValue,
                    color: getTotalScoreColor(product.score_total),
                  }}
                >
                  {product.score_total.toFixed(1)}
                </div>
                <span
                  style={getStatusBadgeStyle(product.status)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,255,136,0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <span style={{ fontSize: '10px' }}>{getStatusIcon(product.status)}</span>
                  {product.status}
                </span>
              </div>

              {/* タイトル */}
              <div style={styles.productTitle}>{product.title_ja}</div>

              {/* バッジエリア: ブランド + カテゴリー */}
              <div style={styles.badgeArea}>
                {product.brand_designer && (
                  <span
                    style={styles.brandBadge}
                    onClick={(e) => e.stopPropagation()}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#00ff88';
                      e.currentTarget.style.color = '#0f0f23';
                      e.currentTarget.style.borderColor = '#00ff88';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,255,136,0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#333366';
                      e.currentTarget.style.color = '#a6adc8';
                      e.currentTarget.style.borderColor = '#45475a';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    {product.brand_designer}
                  </span>
                )}
                {product.category && (
                  <span
                    style={styles.categoryBadge}
                    onClick={(e) => e.stopPropagation()}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#00ff88';
                      e.currentTarget.style.color = '#0f0f23';
                      e.currentTarget.style.borderColor = '#00ff88';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,255,136,0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#333366';
                      e.currentTarget.style.color = '#a6adc8';
                      e.currentTarget.style.borderColor = '#45475a';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    {product.category}
                  </span>
                )}
              </div>

              {/* サマリー */}
              <div style={styles.productDescription}>
                {product.summary_ja || '説明がありません'}
              </div>

              {/* スコア詳細 */}
              <div style={styles.scoreBreakdown}>
                <div style={styles.scoreItem}>
                  <div style={styles.scoreLabel}>コンセプト</div>
                  <div style={styles.scoreBar}>
                    <div
                      style={{
                        ...styles.scoreBarFill,
                        width: `${(product.score_concept_shift / 10) * 100}%`,
                        background: getIndividualScoreColor(product.score_concept_shift),
                      }}
                    />
                  </div>
                  <div
                    style={{
                      ...styles.scoreNumber,
                      color: getIndividualScoreColor(product.score_concept_shift),
                    }}
                  >
                    {product.score_concept_shift.toFixed(1)}
                  </div>
                </div>
                <div style={styles.scoreItem}>
                  <div style={styles.scoreLabel}>破壊性</div>
                  <div style={styles.scoreBar}>
                    <div
                      style={{
                        ...styles.scoreBarFill,
                        width: `${(product.score_category_disruption / 10) * 100}%`,
                        background: getIndividualScoreColor(product.score_category_disruption),
                      }}
                    />
                  </div>
                  <div
                    style={{
                      ...styles.scoreNumber,
                      color: getIndividualScoreColor(product.score_category_disruption),
                    }}
                  >
                    {product.score_category_disruption.toFixed(1)}
                  </div>
                </div>
                <div style={styles.scoreItem}>
                  <div style={styles.scoreLabel}>価格革新</div>
                  <div style={styles.scoreBar}>
                    <div
                      style={{
                        ...styles.scoreBarFill,
                        width: `${(product.score_philosophical_pricing / 10) * 100}%`,
                        background: getIndividualScoreColor(product.score_philosophical_pricing),
                      }}
                    />
                  </div>
                  <div
                    style={{
                      ...styles.scoreNumber,
                      color: getIndividualScoreColor(product.score_philosophical_pricing),
                    }}
                  >
                    {product.score_philosophical_pricing.toFixed(1)}
                  </div>
                </div>
                <div style={styles.scoreItem}>
                  <div style={styles.scoreLabel}>体験変化</div>
                  <div style={styles.scoreBar}>
                    <div
                      style={{
                        ...styles.scoreBarFill,
                        width: `${(product.score_experience_change / 10) * 100}%`,
                        background: getIndividualScoreColor(product.score_experience_change),
                      }}
                    />
                  </div>
                  <div
                    style={{
                      ...styles.scoreNumber,
                      color: getIndividualScoreColor(product.score_experience_change),
                    }}
                  >
                    {product.score_experience_change.toFixed(1)}
                  </div>
                </div>
              </div>

              {/* メタ情報 */}
              <div style={styles.cardMeta}>
                <div style={styles.metaItem}>
                  <span style={styles.metaLabel}>発見:</span>{' '}
                  {new Date(product.discovered_at).toLocaleDateString('ja-JP')}
                </div>
              </div>
            </div>
          ))
        )}
        </div>
      )}

      {/* 製品詳細モーダル */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </div>
  );
};

// Poconest デザインシステムに完全準拠したスタイル
const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    height: '100%',
    backgroundColor: '#0f0f23',
    overflow: 'hidden',
  },
  subCatch: {
    padding: '16px 32px',
    backgroundColor: '#1a1a2e',
    borderBottom: '1px solid #333366',
    fontSize: '13px',
    color: '#a6adc8',
    fontFamily: 'Space Grotesk, sans-serif',
  },
  filterBar: {
    padding: '16px 32px',
    backgroundColor: '#1a1a2e',
    borderBottom: '1px solid #333366',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '16px',
    flexWrap: 'wrap' as const,
  },
  viewModeSwitcher: {
    display: 'flex',
    gap: '4px',
    border: '1px solid #333366',
    borderRadius: '4px',
    padding: '2px',
    backgroundColor: '#0f0f23',
  },
  viewModeButton: {
    padding: '6px 16px',
    border: 'none',
    borderRadius: '2px',
    backgroundColor: 'transparent',
    color: '#a6adc8',
    fontSize: '11px',
    fontWeight: 600,
    fontFamily: 'Space Grotesk, sans-serif',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  viewModeButtonActive: {
    backgroundColor: '#00ff88',
    color: '#0f0f23',
  },
  filterButtons: {
    display: 'flex',
    gap: '8px',
    flex: 1,
    overflowX: 'auto' as const,
  },
  statsInline: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexShrink: 0,
  },
  statItem: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
  },
  statValue: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#00ff88',
    fontFamily: 'JetBrains Mono, monospace',
    lineHeight: 1,
  },
  statLabel: {
    fontSize: '9px',
    color: '#6c7086',
    fontFamily: 'JetBrains Mono, monospace',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    marginTop: '2px',
  },
  statDivider: {
    width: '1px',
    height: '24px',
    backgroundColor: '#333366',
  },
  filterButton: {
    padding: '8px 16px',
    borderRadius: '2px',
    border: '1px solid #333366',
    backgroundColor: '#1a1a2e',
    color: '#a6adc8',
    fontFamily: 'Space Grotesk, sans-serif',
    fontSize: '12px',
    fontWeight: 500,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    whiteSpace: 'nowrap' as const,
  },
  filterButtonActive: {
    backgroundColor: '#333366',
    borderColor: '#00ff88',
    color: '#00ff88',
  },
  cardGrid: {
    flex: 1,
    overflowY: 'auto' as const,
    padding: '32px',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
    gap: '24px',
    alignContent: 'start',
  },
  productCard: {
    background: '#1a1a2e',
    border: '1px solid #333366',
    borderRadius: '4px',
    padding: '20px',
    transition: 'all 0.2s ease',
    cursor: 'pointer',
  },
  thumbnail: {
    width: '100%',
    height: '140px',
    backgroundColor: '#0f0f23',
    overflow: 'hidden' as const,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '16px',
  },
  scoreValue: {
    fontSize: '28px',
    fontWeight: 700,
    fontFamily: 'JetBrains Mono, monospace',
    lineHeight: 1,
  },
  productTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#e2e8f0',
    fontFamily: 'Space Grotesk, sans-serif',
    marginBottom: '8px',
    lineHeight: 1.4,
  },
  badgeArea: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '6px',
    marginBottom: '12px',
  },
  brandBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    background: '#333366',
    padding: '2px 6px',
    borderRadius: '2px',
    fontSize: '10px',
    fontWeight: 500,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    fontFamily: 'JetBrains Mono, monospace',
    border: '1px solid #45475a',
    color: '#a6adc8',
    flexShrink: 0,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  categoryBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    background: '#333366',
    padding: '2px 6px',
    borderRadius: '2px',
    fontSize: '10px',
    fontWeight: 500,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    fontFamily: 'JetBrains Mono, monospace',
    border: '1px solid #45475a',
    color: '#a6adc8',
    flexShrink: 0,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  productDescription: {
    fontSize: '12px',
    color: '#a6adc8',
    fontFamily: 'Space Grotesk, sans-serif',
    lineHeight: 1.5,
    marginBottom: '12px',
  },
  scoreBreakdown: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
    marginBottom: '12px',
  },
  scoreItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  scoreLabel: {
    fontSize: '9px',
    color: '#6c7086',
    fontFamily: 'JetBrains Mono, monospace',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    width: '60px',
    flexShrink: 0,
  },
  scoreBar: {
    flex: 1,
    height: '6px',
    background: '#333366',
    borderRadius: '1px',
    overflow: 'hidden' as const,
  },
  scoreBarFill: {
    height: '100%',
    borderRadius: '1px',
    transition: 'all 0.3s ease',
  },
  scoreNumber: {
    fontSize: '10px',
    fontWeight: 600,
    fontFamily: 'JetBrains Mono, monospace',
    width: '28px',
    textAlign: 'right' as const,
  },
  cardMeta: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
    fontSize: '10px',
    color: '#6c7086',
    fontFamily: 'JetBrains Mono, monospace',
    borderTop: '1px solid #333366',
    paddingTop: '12px',
  },
  metaItem: {
    display: 'flex',
    gap: '4px',
  },
  metaLabel: {
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  },
  collectButton: {
    padding: '8px 16px',
    backgroundColor: '#00ff88',
    color: '#0f0f23',
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 600,
    fontFamily: 'Space Grotesk, sans-serif',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  },
  collectionMessage: {
    padding: '12px 32px',
    backgroundColor: '#1a1a2e',
    borderBottom: '1px solid #333366',
    fontSize: '12px',
    color: '#00ff88',
    fontFamily: 'JetBrains Mono, monospace',
    textAlign: 'center' as const,
  },
  emptyState: {
    gridColumn: '1 / -1',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '80px 32px',
    textAlign: 'center' as const,
    minHeight: '400px',
  },
  emptyIcon: {
    marginBottom: '24px',
    opacity: 0.8,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#e2e8f0',
    fontFamily: 'Space Grotesk, sans-serif',
    marginBottom: '12px',
    letterSpacing: '0.5px',
  },
  emptyText: {
    fontSize: '14px',
    color: '#a6adc8',
    fontFamily: 'Space Grotesk, sans-serif',
    lineHeight: '22px',
    maxWidth: '400px',
  },
  loadingState: {
    gridColumn: '1 / -1',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid #333366',
    borderTopColor: '#00ff88',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    marginTop: '16px',
    fontSize: '13px',
    color: '#a6adc8',
    fontFamily: 'Space Grotesk, sans-serif',
  },
};

export default TrendInsightsSpace;

