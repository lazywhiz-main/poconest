/**
 * クラスタービュー保存ダイアログ
 * 現在のクラスタリング結果を名前付きで保存するためのダイアログ
 */

import React, { useState } from 'react';

interface SaveClusterDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, description?: string) => Promise<void>;
  isLoading?: boolean;
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
  borderRadius: {
    small: '4px',
    medium: '6px',
    large: '8px'
  }
};

export const SaveClusterDialog: React.FC<SaveClusterDialogProps> = ({
  isOpen,
  onClose,
  onSave,
  isLoading = false
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [nameError, setNameError] = useState('');

  const handleSave = async () => {
    // バリデーション
    if (!name.trim()) {
      setNameError('名前は必須です');
      return;
    }
    
    if (name.trim().length > 100) {
      setNameError('名前は100文字以内で入力してください');
      return;
    }

    try {
      await onSave(name.trim(), description.trim() || undefined);
      // 成功時のリセット
      setName('');
      setDescription('');
      setNameError('');
    } catch (error) {
      console.error('保存エラー:', error);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setName('');
      setDescription('');
      setNameError('');
      onClose();
    }
  };

  const handleNameChange = (value: string) => {
    setName(value);
    if (nameError) {
      setNameError('');
    }
  };

  if (!isOpen) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.dialog}>
        {/* ヘッダー */}
        <div style={styles.header}>
          <h3 style={styles.title}>🛟 クラスタービューを保存</h3>
          <button
            style={styles.closeButton}
            onClick={handleClose}
            disabled={isLoading}
          >
            ✕
          </button>
        </div>

        {/* コンテンツ */}
        <div style={styles.content}>
          {/* 名前入力 */}
          <div style={styles.fieldGroup}>
            <label style={styles.label}>
              名前 <span style={styles.required}>*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="例: UXパターン分析"
              style={{
                ...styles.input,
                borderColor: nameError ? THEME_COLORS.primaryRed : THEME_COLORS.borderSecondary
              }}
              disabled={isLoading}
              maxLength={100}
            />
            {nameError && (
              <div style={styles.errorText}>{nameError}</div>
            )}
            <div style={styles.charCount}>
              {name.length} / 100
            </div>
          </div>

          {/* 説明入力 */}
          <div style={styles.fieldGroup}>
            <label style={styles.label}>説明（オプション）</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="このクラスタリングの目的や特徴を記載..."
              style={styles.textarea}
              disabled={isLoading}
              maxLength={500}
              rows={3}
            />
            <div style={styles.charCount}>
              {description.length} / 500
            </div>
          </div>

          {/* 保存内容の説明 */}
          <div style={styles.infoBox}>
            <div style={styles.infoTitle}>📦 保存される内容</div>
            <ul style={styles.infoList}>
              <li>現在のクラスター構造とラベル</li>
              <li>ノードの配置情報</li>
              <li>表示状態（フィルタ・ラベル表示等）</li>
              <li>分析パラメータ</li>
            </ul>
          </div>
        </div>

        {/* ボタン */}
        <div style={styles.buttons}>
          <button
            style={styles.cancelButton}
            onClick={handleClose}
            disabled={isLoading}
          >
            キャンセル
          </button>
          <button
            style={{
              ...styles.saveButton,
              opacity: isLoading ? 0.7 : 1,
              cursor: isLoading ? 'not-allowed' : 'pointer'
            }}
            onClick={handleSave}
            disabled={isLoading || !name.trim()}
          >
            {isLoading ? '保存中...' : '💾 保存'}
          </button>
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
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    backdropFilter: 'blur(4px)'
  },

  dialog: {
    backgroundColor: THEME_COLORS.bgSecondary,
    border: `1px solid ${THEME_COLORS.borderPrimary}`,
    borderRadius: THEME_COLORS.borderRadius.large,
    width: '480px',
    maxWidth: '90vw',
    maxHeight: '90vh',
    overflow: 'hidden',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)'
  },

  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: `1px solid ${THEME_COLORS.borderSecondary}`,
    backgroundColor: THEME_COLORS.bgTertiary
  },

  title: {
    margin: 0,
    color: THEME_COLORS.textPrimary,
    fontSize: '18px',
    fontWeight: '600'
  },

  closeButton: {
    background: 'none',
    border: 'none',
    color: THEME_COLORS.textMuted,
    fontSize: '18px',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: THEME_COLORS.borderRadius.small,
    transition: 'all 0.2s ease'
  },

  content: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '20px'
  },

  fieldGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px'
  },

  label: {
    color: THEME_COLORS.textSecondary,
    fontSize: '14px',
    fontWeight: '500'
  },

  required: {
    color: THEME_COLORS.primaryRed
  },

  input: {
    backgroundColor: THEME_COLORS.bgTertiary,
    border: `1px solid ${THEME_COLORS.borderSecondary}`,
    borderRadius: THEME_COLORS.borderRadius.medium,
    color: THEME_COLORS.textPrimary,
    fontSize: '14px',
    padding: '12px',
    outline: 'none',
    transition: 'border-color 0.2s ease'
  },

  textarea: {
    backgroundColor: THEME_COLORS.bgTertiary,
    border: `1px solid ${THEME_COLORS.borderSecondary}`,
    borderRadius: THEME_COLORS.borderRadius.medium,
    color: THEME_COLORS.textPrimary,
    fontSize: '14px',
    padding: '12px',
    outline: 'none',
    resize: 'vertical' as const,
    minHeight: '80px',
    transition: 'border-color 0.2s ease',
    fontFamily: 'inherit'
  },

  errorText: {
    color: THEME_COLORS.primaryRed,
    fontSize: '12px',
    marginTop: '4px'
  },

  charCount: {
    color: THEME_COLORS.textMuted,
    fontSize: '12px',
    textAlign: 'right' as const
  },

  infoBox: {
    backgroundColor: THEME_COLORS.bgTertiary,
    border: `1px solid ${THEME_COLORS.borderSecondary}`,
    borderRadius: THEME_COLORS.borderRadius.medium,
    padding: '16px'
  },

  infoTitle: {
    color: THEME_COLORS.textSecondary,
    fontSize: '13px',
    fontWeight: '600',
    marginBottom: '8px'
  },

  infoList: {
    margin: 0,
    paddingLeft: '16px',
    color: THEME_COLORS.textMuted,
    fontSize: '12px'
  },

  buttons: {
    display: 'flex',
    gap: '12px',
    padding: '20px 24px',
    borderTop: `1px solid ${THEME_COLORS.borderSecondary}`,
    backgroundColor: THEME_COLORS.bgTertiary
  },

  cancelButton: {
    flex: 1,
    backgroundColor: 'transparent',
    border: `1px solid ${THEME_COLORS.borderSecondary}`,
    borderRadius: THEME_COLORS.borderRadius.medium,
    color: THEME_COLORS.textSecondary,
    fontSize: '14px',
    fontWeight: '500',
    padding: '12px 16px',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },

  saveButton: {
    flex: 1,
    backgroundColor: THEME_COLORS.primaryGreen,
    border: 'none',
    borderRadius: THEME_COLORS.borderRadius.medium,
    color: THEME_COLORS.textInverse,
    fontSize: '14px',
    fontWeight: '600',
    padding: '12px 16px',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  }
};
