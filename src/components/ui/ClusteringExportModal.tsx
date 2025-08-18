import React, { useState } from 'react';
import { ClusteringExportService, type ClusterExportData } from '../../services/ClusteringExportService';
import { THEME_COLORS } from '../../constants/theme';
import Icon, { IconName } from './Icon';

interface ClusteringExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  clusters: any[];
  clusterLabels: any[];
  cards: any[];
}

const ClusteringExportModal: React.FC<ClusteringExportModalProps> = ({
  isOpen,
  onClose,
  clusters,
  clusterLabels,
  cards
}) => {
  const [selectedFormat, setSelectedFormat] = useState<'csv' | 'json' | 'excel'>('csv');
  const [customFilename, setCustomFilename] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;

  const canExport = ClusteringExportService.canExport(clusters);
  const supportedFormats = ClusteringExportService.getSupportedFormats();

  const handleExport = async () => {
    if (!canExport) return;

    setIsExporting(true);
    try {
      const filename = customFilename || undefined;
      
      switch (selectedFormat) {
        case 'csv':
          ClusteringExportService.exportToCSV(clusters, clusterLabels, cards, filename);
          break;
        case 'json':
          ClusteringExportService.exportToJSON(clusters, clusterLabels, cards, filename);
          break;
        case 'excel':
          ClusteringExportService.exportToExcel(clusters, clusterLabels, cards, filename);
          break;
      }
      
      onClose();
    } catch (error) {
      console.error('エクスポートエラー:', error);
      alert(`エクスポートに失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
    } finally {
      setIsExporting(false);
    }
  };

  const getDefaultFilename = () => {
    const date = new Date().toISOString().split('T')[0];
    const extension = selectedFormat === 'json' ? 'json' : 'csv';
    return `clustering_results_${date}.${extension}`;
  };

  return (
    <div className="modal-overlay" style={styles.overlay}>
      <div className="modal-content" style={styles.modal}>
        <div className="modal-header" style={styles.header}>
          <h2 style={styles.title}>
            <Icon name="upload" size={20} />
            クラスタリング結果をエクスポート
          </h2>
          <button onClick={onClose} style={styles.closeButton}>
            <Icon name="close" size={16} />
          </button>
        </div>

        <div className="modal-body" style={styles.body}>
          {!canExport ? (
            <div style={styles.errorMessage}>
              <Icon name="alert" size={16} />
              エクスポートするクラスターがありません。クラスタリングを実行してください。
            </div>
          ) : (
            <>
              <div style={styles.section}>
                <h3 style={styles.sectionTitle}>エクスポート形式</h3>
                <div style={styles.formatOptions}>
                  {supportedFormats.map(format => (
                    <label key={format.value} style={styles.formatOption}>
                      <input
                        type="radio"
                        name="format"
                        value={format.value}
                        checked={selectedFormat === format.value}
                        onChange={(e) => setSelectedFormat(e.target.value as any)}
                        style={styles.radio}
                      />
                      <div style={styles.formatInfo}>
                        <span style={styles.formatLabel}>{format.label}</span>
                        <span style={styles.formatDescription}>{format.description}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div style={styles.section}>
                <h3 style={styles.sectionTitle}>ファイル名</h3>
                <input
                  type="text"
                  value={customFilename}
                  onChange={(e) => setCustomFilename(e.target.value)}
                  placeholder={getDefaultFilename()}
                  style={styles.filenameInput}
                />
                <p style={styles.filenameHint}>
                  空白の場合は自動生成されます: {getDefaultFilename()}
                </p>
              </div>

              <div style={styles.section}>
                <h3 style={styles.sectionTitle}>エクスポート内容</h3>
                <div style={styles.exportSummary}>
                  <div style={styles.summaryItem}>
                    <span style={styles.summaryLabel}>クラスター数:</span>
                    <span style={styles.summaryValue}>{clusters.length}</span>
                  </div>
                  <div style={styles.summaryItem}>
                    <span style={styles.summaryLabel}>カード総数:</span>
                    <span style={styles.summaryValue}>{cards.length}</span>
                  </div>
                  <div style={styles.summaryItem}>
                    <span style={styles.summaryLabel}>形式:</span>
                    <span style={styles.summaryValue}>
                      {supportedFormats.find(f => f.value === selectedFormat)?.label}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="modal-footer" style={styles.footer}>
          <button onClick={onClose} style={styles.cancelButton}>
            キャンセル
          </button>
          {canExport && (
            <button
              onClick={handleExport}
              disabled={isExporting}
              style={{
                ...styles.exportButton,
                opacity: isExporting ? 0.6 : 1
              }}
            >
              {isExporting ? (
                <>
                  <Icon name="loading" size={16} />
                  エクスポート中...
                </>
              ) : (
                <>
                  <Icon name="download" size={16} />
                  エクスポート
                </>
              )}
            </button>
          )}
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: THEME_COLORS.cardBackground,
    borderRadius: '12px',
    maxWidth: '600px',
    width: '90%',
    maxHeight: '80vh',
    overflow: 'hidden',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 24px',
    borderBottom: `1px solid ${THEME_COLORS.border}`,
  },
  title: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 600,
    color: THEME_COLORS.text,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '8px',
    borderRadius: '6px',
    color: THEME_COLORS.textTertiary,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    padding: '24px',
    overflowY: 'auto' as const,
    maxHeight: '60vh',
  },
  section: {
    marginBottom: '24px',
  },
  sectionTitle: {
    margin: '0 0 12px 0',
    fontSize: '14px',
    fontWeight: 600,
    color: THEME_COLORS.text,
  },
  formatOptions: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  formatOption: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    borderRadius: '8px',
    border: `1px solid ${THEME_COLORS.border}`,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  radio: {
    margin: 0,
  },
  formatInfo: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '2px',
  },
  formatLabel: {
    fontSize: '14px',
    fontWeight: 500,
    color: THEME_COLORS.text,
  },
  formatDescription: {
    fontSize: '12px',
    color: THEME_COLORS.textTertiary,
  },
  filenameInput: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '6px',
    border: `1px solid ${THEME_COLORS.border}`,
    backgroundColor: THEME_COLORS.background,
    color: THEME_COLORS.text,
    fontSize: '14px',
  },
  filenameHint: {
    margin: '8px 0 0 0',
    fontSize: '12px',
    color: THEME_COLORS.textTertiary,
  },
  exportSummary: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  summaryItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 0',
  },
  summaryLabel: {
    fontSize: '14px',
    color: THEME_COLORS.textTertiary,
  },
  summaryValue: {
    fontSize: '14px',
    fontWeight: 500,
    color: THEME_COLORS.text,
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: '12px',
    padding: '20px 24px',
    borderTop: `1px solid ${THEME_COLORS.border}`,
  },
  cancelButton: {
    padding: '10px 20px',
    borderRadius: '6px',
    border: `1px solid ${THEME_COLORS.border}`,
    backgroundColor: 'transparent',
    color: THEME_COLORS.text,
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
  },
  exportButton: {
    padding: '10px 20px',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: THEME_COLORS.primaryBlue,
    color: 'white',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  errorMessage: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '16px',
    backgroundColor: THEME_COLORS.primaryRed + '20',
    color: THEME_COLORS.primaryRed,
    borderRadius: '8px',
    fontSize: '14px',
  },
};

export default ClusteringExportModal;
