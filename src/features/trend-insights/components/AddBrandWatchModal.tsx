import React, { useState } from 'react';
import { TrendCollectionSettingsService, BrandWatch } from '../services/TrendCollectionSettingsService';

interface AddBrandWatchModalProps {
  nestId: string;
  onClose: () => void;
  onAdded: () => void;
}

const AddBrandWatchModal: React.FC<AddBrandWatchModalProps> = ({ nestId, onClose, onAdded }) => {
  const [brandName, setBrandName] = useState('');
  const [keywords, setKeywords] = useState('');
  const [officialUrl, setOfficialUrl] = useState('');
  const [category, setCategory] = useState<'ブランド' | 'デザイナー' | '企業'>('ブランド');
  const [searchMethods, setSearchMethods] = useState<('rss' | 'google')[]>(['rss', 'google']);
  const [frequency, setFrequency] = useState<'weekly' | 'monthly' | 'manual'>('weekly');
  const [testing, setTesting] = useState(false);
  const [adding, setAdding] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    official_rss?: string;
    preview_items?: any[];
    error?: string;
  } | null>(null);

  const handleTest = async () => {
    if (!brandName.trim()) {
      alert('ブランド名を入力してください');
      return;
    }

    setTesting(true);
    setTestResult(null);

    const result = await TrendCollectionSettingsService.testBrandWatch(
      brandName,
      officialUrl || undefined
    );
    setTestResult(result);
    setTesting(false);
  };

  const handleAdd = async () => {
    if (!brandName.trim()) {
      alert('ブランド名を入力してください');
      return;
    }

    setAdding(true);

    const keywordList = keywords
      .split(',')
      .map((k) => k.trim())
      .filter((k) => k.length > 0);

    const result = await TrendCollectionSettingsService.addBrandWatch(nestId, {
      name: brandName.trim(),
      keywords: keywordList.length > 0 ? keywordList : [brandName.trim()],
      official_url: officialUrl.trim() || null,
      official_rss: testResult?.official_rss || null,
      category,
      enabled: true,
      search_methods: searchMethods,
      frequency,
    });

    setAdding(false);

    if (result.success) {
      onAdded();
      onClose();
    } else {
      alert(`追加に失敗しました: ${result.error}`);
    }
  };

  const toggleSearchMethod = (method: 'rss' | 'google') => {
    if (searchMethods.includes(method)) {
      setSearchMethods(searchMethods.filter((m) => m !== method));
    } else {
      setSearchMethods([...searchMethods, method]);
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* ヘッダー */}
        <div style={styles.header}>
          <h2 style={styles.title}>新しいブランドを追加</h2>
          <button onClick={onClose} style={styles.closeButton}>
            <svg style={{ width: '20px', height: '20px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* コンテンツ */}
        <div style={styles.content}>
          <div style={styles.description}>
            ブランド・企業をキーワードで追跡し、新製品や発表を自動収集します
          </div>

          {/* ブランド名 */}
          <div style={styles.field}>
            <label style={styles.label}>
              ブランド名 / デザイナー名 <span style={styles.required}>*</span>
            </label>
            <input
              type="text"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              placeholder="例: Nendo, HAY, Jasper Morrison"
              style={styles.input}
            />
          </div>

          {/* カテゴリー */}
          <div style={styles.field}>
            <label style={styles.label}>カテゴリー</label>
            <div style={styles.radioGroup}>
              <label style={styles.radioLabel}>
                <input
                  type="radio"
                  value="ブランド"
                  checked={category === 'ブランド'}
                  onChange={(e) => setCategory(e.target.value as 'ブランド')}
                  style={styles.radio}
                />
                ブランド
              </label>
              <label style={styles.radioLabel}>
                <input
                  type="radio"
                  value="デザイナー"
                  checked={category === 'デザイナー'}
                  onChange={(e) => setCategory(e.target.value as 'デザイナー')}
                  style={styles.radio}
                />
                デザイナー
              </label>
              <label style={styles.radioLabel}>
                <input
                  type="radio"
                  value="企業"
                  checked={category === '企業'}
                  onChange={(e) => setCategory(e.target.value as '企業')}
                  style={styles.radio}
                />
                企業
              </label>
            </div>
          </div>

          {/* 検索キーワード */}
          <div style={styles.field}>
            <label style={styles.label}>検索キーワード（カンマ区切り、任意）</label>
            <input
              type="text"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="例: Nendo, 佐藤オオキ"
              style={styles.input}
            />
            <div style={styles.hint}>
              💡 空欄の場合、ブランド名で検索します
            </div>
          </div>

          {/* 公式サイトURL */}
          <div style={styles.field}>
            <label style={styles.label}>公式サイトURL（任意）</label>
            <input
              type="url"
              value={officialUrl}
              onChange={(e) => setOfficialUrl(e.target.value)}
              placeholder="https://example.com"
              style={styles.input}
            />
            <div style={styles.hint}>
              💡 RSSフィードを自動検出します
            </div>
          </div>

          {/* 検索範囲 */}
          <div style={styles.field}>
            <label style={styles.label}>検索範囲</label>
            <div style={styles.checkboxGroup}>
              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={searchMethods.includes('rss')}
                  onChange={() => toggleSearchMethod('rss')}
                  style={styles.checkbox}
                />
                公式サイト（RSS）
              </label>
              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={searchMethods.includes('google')}
                  onChange={() => toggleSearchMethod('google')}
                  style={styles.checkbox}
                />
                デザインメディア + Google検索
              </label>
            </div>
          </div>

          {/* 収集頻度 */}
          <div style={styles.field}>
            <label style={styles.label}>収集頻度</label>
            <div style={styles.radioGroup}>
              <label style={styles.radioLabel}>
                <input
                  type="radio"
                  value="weekly"
                  checked={frequency === 'weekly'}
                  onChange={(e) => setFrequency(e.target.value as 'weekly')}
                  style={styles.radio}
                />
                週1回
              </label>
              <label style={styles.radioLabel}>
                <input
                  type="radio"
                  value="monthly"
                  checked={frequency === 'monthly'}
                  onChange={(e) => setFrequency(e.target.value as 'monthly')}
                  style={styles.radio}
                />
                月1回
              </label>
              <label style={styles.radioLabel}>
                <input
                  type="radio"
                  value="manual"
                  checked={frequency === 'manual'}
                  onChange={(e) => setFrequency(e.target.value as 'manual')}
                  style={styles.radio}
                />
                手動のみ
              </label>
            </div>
          </div>

          {/* テスト結果 */}
          {testResult && (
            <div style={testResult.success ? styles.testSuccess : styles.testError}>
              {testResult.success ? (
                <>
                  <div style={styles.testTitle}>
                    <svg style={{ width: '16px', height: '16px', display: 'inline-block', marginRight: '6px', verticalAlign: 'text-bottom' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    ブランド検索テスト成功
                  </div>
                  {testResult.official_rss && (
                    <div style={styles.testMessage}>
                      公式RSS検出: {testResult.official_rss}
                    </div>
                  )}
                  <div style={styles.testMessage}>
                    過去30日間で {testResult.preview_items?.length || 0}件 検出
                  </div>
                </>
              ) : (
                <>
                  <div style={styles.testTitle}>
                    <svg style={{ width: '16px', height: '16px', display: 'inline-block', marginRight: '6px', verticalAlign: 'text-bottom' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="15" y1="9" x2="9" y2="15"/>
                      <line x1="9" y1="9" x2="15" y2="15"/>
                    </svg>
                    ブランド検索テスト失敗
                  </div>
                  <div style={styles.testMessage}>{testResult.error}</div>
                </>
              )}
            </div>
          )}
        </div>

        {/* フッター */}
        <div style={styles.footer}>
          <button
            onClick={handleTest}
            disabled={testing || !brandName.trim()}
            style={{
              ...styles.testButton,
              ...(testing || !brandName.trim() ? styles.buttonDisabled : {}),
            }}
          >
            {testing ? '🔍 テスト中...' : '🔍 ブランドをテスト'}
          </button>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={onClose} style={styles.cancelButton}>
              キャンセル
            </button>
            <button
              onClick={handleAdd}
              disabled={adding || !brandName.trim() || searchMethods.length === 0}
              style={{
                ...styles.addButton,
                ...(adding || !brandName.trim() || searchMethods.length === 0
                  ? styles.buttonDisabled
                  : {}),
              }}
            >
              {adding ? '追加中...' : '💾 追加'}
            </button>
          </div>
        </div>
      </div>
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
    zIndex: 1100,
    padding: '20px',
  },
  modal: {
    backgroundColor: '#0f0f23',
    border: '1px solid #333366',
    borderRadius: '8px',
    width: '100%',
    maxWidth: '600px',
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
    fontSize: '18px',
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
  content: {
    flex: 1,
    overflowY: 'auto' as const,
    padding: '24px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '20px',
  },
  description: {
    padding: '12px 16px',
    backgroundColor: '#1a1a2e',
    border: '1px solid #333366',
    borderRadius: '4px',
    color: '#a6adc8',
    fontSize: '13px',
    lineHeight: 1.5,
    fontFamily: 'Space Grotesk, sans-serif',
  },
  field: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  label: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#e2e8f0',
    fontFamily: 'Space Grotesk, sans-serif',
  },
  required: {
    color: '#ff6b6b',
  },
  input: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#1a1a2e',
    border: '1px solid #333366',
    borderRadius: '4px',
    color: '#e2e8f0',
    fontSize: '14px',
    fontFamily: 'Space Grotesk, sans-serif',
    outline: 'none',
  },
  hint: {
    fontSize: '12px',
    color: '#6c7086',
    fontFamily: 'Space Grotesk, sans-serif',
  },
  radioGroup: {
    display: 'flex',
    gap: '16px',
  },
  radioLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '14px',
    color: '#e2e8f0',
    fontFamily: 'Space Grotesk, sans-serif',
    cursor: 'pointer',
  },
  radio: {
    cursor: 'pointer',
  },
  checkboxGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: '#e2e8f0',
    fontFamily: 'Space Grotesk, sans-serif',
    cursor: 'pointer',
  },
  checkbox: {
    cursor: 'pointer',
  },
  testSuccess: {
    padding: '16px',
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
    border: '1px solid rgba(0, 255, 136, 0.3)',
    borderRadius: '4px',
  },
  testError: {
    padding: '16px',
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    border: '1px solid rgba(255, 107, 107, 0.3)',
    borderRadius: '4px',
  },
  testTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#e2e8f0',
    fontFamily: 'Space Grotesk, sans-serif',
    marginBottom: '4px',
  },
  testMessage: {
    fontSize: '13px',
    color: '#a6adc8',
    fontFamily: 'Space Grotesk, sans-serif',
    marginTop: '4px',
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 24px',
    borderTop: '1px solid #333366',
  },
  testButton: {
    padding: '10px 16px',
    backgroundColor: '#333366',
    color: '#00ff88',
    border: '1px solid #45475a',
    borderRadius: '4px',
    fontSize: '13px',
    fontWeight: 600,
    fontFamily: 'Space Grotesk, sans-serif',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  cancelButton: {
    padding: '10px 16px',
    backgroundColor: 'transparent',
    color: '#a6adc8',
    border: '1px solid #333366',
    borderRadius: '4px',
    fontSize: '13px',
    fontWeight: 500,
    fontFamily: 'Space Grotesk, sans-serif',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  addButton: {
    padding: '10px 20px',
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
    transition: 'all 0.2s ease',
  },
  buttonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
};

export default AddBrandWatchModal;

