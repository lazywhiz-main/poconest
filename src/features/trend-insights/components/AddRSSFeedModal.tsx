import React, { useState } from 'react';
import { TrendCollectionSettingsService, RSSFeed } from '../services/TrendCollectionSettingsService';

interface AddRSSFeedModalProps {
  nestId: string;
  onClose: () => void;
  onAdded: () => void;
}

const AddRSSFeedModal: React.FC<AddRSSFeedModalProps> = ({ nestId, onClose, onAdded }) => {
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [language, setLanguage] = useState<'en' | 'ja' | 'auto'>('en');
  const [category, setCategory] = useState('デザインメディア');
  const [testing, setTesting] = useState(false);
  const [adding, setAdding] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; items?: any[]; error?: string } | null>(null);

  const handleTest = async () => {
    if (!url.trim()) {
      alert('RSS URLを入力してください');
      return;
    }

    setTesting(true);
    setTestResult(null);

    const result = await TrendCollectionSettingsService.testRSSFeed(url);
    setTestResult(result);
    setTesting(false);

    // 自動的に名前を設定（まだ未入力の場合）
    if (result.success && !name.trim() && result.items && result.items.length > 0) {
      // RSSのチャンネル名などから自動設定する処理を追加可能
    }
  };

  const handleAdd = async () => {
    if (!url.trim()) {
      alert('RSS URLを入力してください');
      return;
    }

    if (!name.trim()) {
      alert('フィード名を入力してください');
      return;
    }

    setAdding(true);

    const result = await TrendCollectionSettingsService.addRSSFeed(nestId, {
      url: url.trim(),
      name: name.trim(),
      enabled: true,
      language,
      category: category.trim() || 'デザインメディア',
    });

    setAdding(false);

    if (result.success) {
      onAdded();
      onClose();
    } else {
      alert(`追加に失敗しました: ${result.error}`);
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* ヘッダー */}
        <div style={styles.header}>
          <h2 style={styles.title}>新しいRSSフィードを追加</h2>
          <button onClick={onClose} style={styles.closeButton}>
            <svg style={{ width: '20px', height: '20px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* コンテンツ */}
        <div style={styles.content}>
          {/* RSS URL */}
          <div style={styles.field}>
            <label style={styles.label}>
              RSS URL <span style={styles.required}>*</span>
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/feed.xml"
              style={styles.input}
            />
          </div>

          {/* フィード名 */}
          <div style={styles.field}>
            <label style={styles.label}>
              フィード名 <span style={styles.required}>*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例: Dezeen, Core77"
              style={styles.input}
            />
          </div>

          {/* 言語 */}
          <div style={styles.field}>
            <label style={styles.label}>言語</label>
            <div style={styles.radioGroup}>
              <label style={styles.radioLabel}>
                <input
                  type="radio"
                  value="en"
                  checked={language === 'en'}
                  onChange={(e) => setLanguage(e.target.value as 'en')}
                  style={styles.radio}
                />
                英語
              </label>
              <label style={styles.radioLabel}>
                <input
                  type="radio"
                  value="ja"
                  checked={language === 'ja'}
                  onChange={(e) => setLanguage(e.target.value as 'ja')}
                  style={styles.radio}
                />
                日本語
              </label>
              <label style={styles.radioLabel}>
                <input
                  type="radio"
                  value="auto"
                  checked={language === 'auto'}
                  onChange={(e) => setLanguage(e.target.value as 'auto')}
                  style={styles.radio}
                />
                自動検出
              </label>
            </div>
          </div>

          {/* カテゴリー */}
          <div style={styles.field}>
            <label style={styles.label}>カテゴリー（任意）</label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="例: デザインメディア, 建築, ファッション"
              style={styles.input}
            />
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
                    フィードのテスト成功
                  </div>
                  <div style={styles.testMessage}>
                    {testResult.items?.length || 0}件の記事を検出しました
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
                    フィードのテスト失敗
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
            disabled={testing || !url.trim()}
            style={{
              ...styles.testButton,
              ...(testing || !url.trim() ? styles.buttonDisabled : {}),
            }}
          >
            {testing ? '🔍 テスト中...' : '🔍 フィードをテスト'}
          </button>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={onClose} style={styles.cancelButton}>
              キャンセル
            </button>
            <button
              onClick={handleAdd}
              disabled={adding || !url.trim() || !name.trim()}
              style={{
                ...styles.addButton,
                ...(adding || !url.trim() || !name.trim() ? styles.buttonDisabled : {}),
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

export default AddRSSFeedModal;

