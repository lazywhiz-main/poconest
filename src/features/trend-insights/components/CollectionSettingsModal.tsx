import React, { useState, useEffect } from 'react';
import {
  TrendCollectionSettingsService,
  CollectionSettings,
  RSSFeed,
  BrandWatch,
} from '../services/TrendCollectionSettingsService';
import AddRSSFeedModal from './AddRSSFeedModal';
import AddBrandWatchModal from './AddBrandWatchModal';

interface CollectionSettingsModalProps {
  nestId: string;
  onClose: () => void;
}

type Tab = 'rss' | 'brands';

const CollectionSettingsModal: React.FC<CollectionSettingsModalProps> = ({
  nestId,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('rss');
  const [settings, setSettings] = useState<CollectionSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddRSSModal, setShowAddRSSModal] = useState(false);
  const [showAddBrandModal, setShowAddBrandModal] = useState(false);

  useEffect(() => {
    loadSettings();
  }, [nestId]);

  const loadSettings = async () => {
    setLoading(true);
    const data = await TrendCollectionSettingsService.getSettings(nestId);
    setSettings(data);
    setLoading(false);
  };

  const handleToggleFeed = async (feedId: string, enabled: boolean) => {
    await TrendCollectionSettingsService.updateRSSFeed(nestId, feedId, { enabled });
    await loadSettings();
  };

  const handleDeleteFeed = async (feedId: string) => {
    if (!confirm('このRSSフィードを削除しますか？')) return;
    await TrendCollectionSettingsService.deleteRSSFeed(nestId, feedId);
    await loadSettings();
  };

  const handleToggleBrand = async (brandId: string, enabled: boolean) => {
    await TrendCollectionSettingsService.updateBrandWatch(nestId, brandId, { enabled });
    await loadSettings();
  };

  const handleDeleteBrand = async (brandId: string) => {
    if (!confirm('このブランドウォッチを削除しますか？')) return;
    await TrendCollectionSettingsService.deleteBrandWatch(nestId, brandId);
    await loadSettings();
  };

  if (loading || !settings) {
    return (
      <div style={styles.overlay}>
        <div style={styles.modal}>
          <div style={styles.loading}>読み込み中...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* ヘッダー */}
        <div style={styles.header}>
          <h2 style={styles.title}>⚙️ データ収集設定</h2>
          <button onClick={onClose} style={styles.closeButton}>
            <svg style={{ width: '20px', height: '20px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* タブ */}
        <div style={styles.tabs}>
          <button
            onClick={() => setActiveTab('rss')}
            style={{
              ...styles.tab,
              ...(activeTab === 'rss' ? styles.tabActive : {}),
            }}
          >
            📡 RSSフィード
          </button>
          <button
            onClick={() => setActiveTab('brands')}
            style={{
              ...styles.tab,
              ...(activeTab === 'brands' ? styles.tabActive : {}),
            }}
          >
            🏢 ブランドウォッチ
          </button>
        </div>

        {/* コンテンツ */}
        <div style={styles.content}>
          {activeTab === 'rss' && (
            <RSSFeedList
              feeds={settings.rss_feeds}
              onToggle={handleToggleFeed}
              onDelete={handleDeleteFeed}
              onAdd={() => setShowAddRSSModal(true)}
            />
          )}

          {activeTab === 'brands' && (
            <BrandWatchList
              brands={settings.brand_watches}
              onToggle={handleToggleBrand}
              onDelete={handleDeleteBrand}
              onAdd={() => setShowAddBrandModal(true)}
            />
          )}
        </div>
      </div>

      {/* RSSフィード追加モーダル */}
      {showAddRSSModal && (
        <AddRSSFeedModal
          nestId={nestId}
          onClose={() => setShowAddRSSModal(false)}
          onAdded={loadSettings}
        />
      )}

      {/* ブランド追加モーダル */}
      {showAddBrandModal && (
        <AddBrandWatchModal
          nestId={nestId}
          onClose={() => setShowAddBrandModal(false)}
          onAdded={loadSettings}
        />
      )}
    </div>
  );
};

// RSSフィードリストコンポーネント
const RSSFeedList: React.FC<{
  feeds: RSSFeed[];
  onToggle: (feedId: string, enabled: boolean) => void;
  onDelete: (feedId: string) => void;
  onAdd: () => void;
}> = ({ feeds, onToggle, onDelete, onAdd }) => {
  return (
    <div style={styles.list}>
      {feeds.length === 0 ? (
        <div style={styles.empty}>
          RSSフィードが登録されていません
        </div>
      ) : (
        feeds.map((feed) => (
          <div key={feed.id} style={styles.item}>
            <div style={styles.itemHeader}>
              <span style={feed.enabled ? styles.statusEnabled : styles.statusDisabled}>
                {feed.enabled ? '🟢' : '⚫'}
              </span>
              <div style={styles.itemInfo}>
                <div style={styles.itemName}>{feed.name}</div>
                <div style={styles.itemCategory}>{feed.category}</div>
                <div style={styles.itemMeta}>
                  {feed.last_collected
                    ? `最終収集: ${new Date(feed.last_collected).toLocaleString('ja-JP')}`
                    : '未収集'}
                  {' • '}
                  {feed.products_count}製品/週
                </div>
              </div>
              <div style={styles.itemActions}>
                <button
                  onClick={() => onToggle(feed.id, !feed.enabled)}
                  style={styles.actionButton}
                  title={feed.enabled ? '無効化' : '有効化'}
                >
                  {feed.enabled ? '✓ 有効' : '無効化'}
                </button>
                <button
                  onClick={() => onDelete(feed.id)}
                  style={styles.deleteButton}
                  title="削除"
                >
                  <svg style={{ width: '14px', height: '14px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    <line x1="10" y1="11" x2="10" y2="17"/>
                    <line x1="14" y1="11" x2="14" y2="17"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ))
      )}

      <button onClick={onAdd} style={styles.addButton}>
        + RSSフィードを追加
      </button>
    </div>
  );
};

// ブランドウォッチリストコンポーネント
const BrandWatchList: React.FC<{
  brands: BrandWatch[];
  onToggle: (brandId: string, enabled: boolean) => void;
  onDelete: (brandId: string) => void;
  onAdd: () => void;
}> = ({ brands, onToggle, onDelete, onAdd }) => {
  return (
    <div style={styles.list}>
      <div style={styles.description}>
        ブランド・企業をキーワードで追跡し、新製品や発表を自動収集します
      </div>

      {brands.length === 0 ? (
        <div style={styles.empty}>
          ブランドウォッチが登録されていません
        </div>
      ) : (
        brands.map((brand) => (
          <div key={brand.id} style={styles.item}>
            <div style={styles.itemHeader}>
              <span style={brand.enabled ? styles.statusEnabled : styles.statusDisabled}>
                {brand.enabled ? '🟢' : '⚫'}
              </span>
              <div style={styles.itemInfo}>
                <div style={styles.itemName}>{brand.name}</div>
                <div style={styles.itemCategory}>{brand.category}</div>
                <div style={styles.itemMeta}>
                  {brand.last_checked
                    ? `最終検出: ${new Date(brand.last_checked).toLocaleString('ja-JP')}`
                    : '未検索'}
                  {' • '}
                  {brand.products_count}製品/月
                </div>
                <div style={styles.itemMeta}>
                  検索方法: {brand.search_methods.includes('rss') && 'RSS'}
                  {brand.search_methods.includes('rss') && brand.search_methods.includes('google') && ' + '}
                  {brand.search_methods.includes('google') && 'Google検索'}
                </div>
              </div>
              <div style={styles.itemActions}>
                <button
                  onClick={() => onToggle(brand.id, !brand.enabled)}
                  style={styles.actionButton}
                  title={brand.enabled ? '無効化' : '有効化'}
                >
                  {brand.enabled ? '✓ 有効' : '無効化'}
                </button>
                <button
                  onClick={() => onDelete(brand.id)}
                  style={styles.deleteButton}
                  title="削除"
                >
                  <svg style={{ width: '14px', height: '14px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    <line x1="10" y1="11" x2="10" y2="17"/>
                    <line x1="14" y1="11" x2="14" y2="17"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ))
      )}

      <button onClick={onAdd} style={styles.addButton}>
        + ブランドを追加
      </button>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
  },
  modal: {
    backgroundColor: '#0f0f23',
    border: '1px solid #333366',
    borderRadius: '8px',
    width: '100%',
    maxWidth: '800px',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column' as const,
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: '1px solid #333366',
  },
  title: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#00ff88',
    fontFamily: 'Space Grotesk, sans-serif',
    margin: 0,
  },
  closeButton: {
    background: 'none',
    border: 'none',
    color: '#a6adc8',
    fontSize: '24px',
    cursor: 'pointer',
    padding: '4px 8px',
    lineHeight: 1,
  },
  tabs: {
    display: 'flex',
    borderBottom: '1px solid #333366',
    padding: '0 24px',
  },
  tab: {
    padding: '12px 20px',
    background: 'none',
    border: 'none',
    color: '#6c7086',
    fontSize: '14px',
    fontWeight: 600,
    fontFamily: 'Space Grotesk, sans-serif',
    cursor: 'pointer',
    borderBottom: '2px solid transparent',
    transition: 'all 0.2s',
  },
  tabActive: {
    color: '#00ff88',
    borderBottom: '2px solid #00ff88',
  },
  content: {
    flex: 1,
    overflowY: 'auto' as const,
    padding: '24px',
  },
  loading: {
    padding: '40px',
    textAlign: 'center' as const,
    color: '#a6adc8',
    fontFamily: 'Space Grotesk, sans-serif',
  },
  description: {
    marginBottom: '16px',
    padding: '12px 16px',
    backgroundColor: '#1a1a2e',
    border: '1px solid #333366',
    borderRadius: '4px',
    color: '#a6adc8',
    fontSize: '13px',
    lineHeight: 1.5,
    fontFamily: 'Space Grotesk, sans-serif',
  },
  list: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  empty: {
    padding: '40px',
    textAlign: 'center' as const,
    color: '#6c7086',
    fontSize: '14px',
    fontFamily: 'Space Grotesk, sans-serif',
  },
  item: {
    backgroundColor: '#1a1a2e',
    border: '1px solid #333366',
    borderRadius: '4px',
    padding: '16px',
  },
  itemHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
  },
  statusEnabled: {
    fontSize: '16px',
    flexShrink: 0,
  },
  statusDisabled: {
    fontSize: '16px',
    flexShrink: 0,
    opacity: 0.5,
  },
  itemInfo: {
    flex: 1,
    minWidth: 0,
  },
  itemName: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#e2e8f0',
    fontFamily: 'Space Grotesk, sans-serif',
    marginBottom: '4px',
  },
  itemCategory: {
    fontSize: '12px',
    color: '#a6adc8',
    fontFamily: 'Space Grotesk, sans-serif',
    marginBottom: '8px',
  },
  itemMeta: {
    fontSize: '11px',
    color: '#6c7086',
    fontFamily: 'JetBrains Mono, monospace',
    marginTop: '4px',
  },
  itemActions: {
    display: 'flex',
    gap: '8px',
    flexShrink: 0,
  },
  actionButton: {
    padding: '6px 12px',
    backgroundColor: '#333366',
    color: '#a6adc8',
    border: '1px solid #45475a',
    borderRadius: '3px',
    fontSize: '12px',
    fontWeight: 500,
    fontFamily: 'Space Grotesk, sans-serif',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  deleteButton: {
    padding: '6px 12px',
    backgroundColor: 'transparent',
    color: '#a6adc8',
    border: '1px solid #333366',
    borderRadius: '3px',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  addButton: {
    padding: '12px 16px',
    backgroundColor: '#00ff88',
    color: '#0f0f23',
    border: 'none',
    borderRadius: '4px',
    fontSize: '13px',
    fontWeight: 600,
    fontFamily: 'Space Grotesk, sans-serif',
    cursor: 'pointer',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    transition: 'all 0.2s',
    marginTop: '8px',
  },
};

export default CollectionSettingsModal;

