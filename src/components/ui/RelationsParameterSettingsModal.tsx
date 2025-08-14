import React, { useState, useEffect } from 'react';
import { THEME_COLORS } from '../../constants/theme';
import { RelationsParameterManager, type RelationsParameters, type AnalysisMode } from '../../services/RelationsParameterManager';

interface RelationsParameterSettingsModalProps {
  isVisible: boolean;
  onClose: () => void;
  onParametersChanged?: () => void;
}

const RelationsParameterSettingsModal: React.FC<RelationsParameterSettingsModalProps> = ({
  isVisible,
  onClose,
  onParametersChanged
}) => {
  const [currentMode, setCurrentMode] = useState<AnalysisMode>('balanced');
  const [parameters, setParameters] = useState<RelationsParameters | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // 初期化：現在の設定を読み込み
  useEffect(() => {
    if (isVisible) {
      const mode = RelationsParameterManager.getCurrentMode();
      const params = RelationsParameterManager.getParameters();
      setCurrentMode(mode);
      setParameters(params);
      setHasChanges(false);
    }
  }, [isVisible]);

  // プリセットモード変更
  const handleModeChange = (mode: AnalysisMode) => {
    RelationsParameterManager.setMode(mode);
    setCurrentMode(mode);
    setParameters(RelationsParameterManager.getParameters());
    setHasChanges(true);
  };

  // 個別パラメータ変更
  const handleParameterChange = <T extends keyof RelationsParameters, K extends keyof RelationsParameters[T]>(
    category: T,
    key: K,
    value: RelationsParameters[T][K]
  ) => {
    if (!parameters) return;
    
    RelationsParameterManager.updateParameter(category, key, value);
    setParameters(RelationsParameterManager.getParameters());
    setCurrentMode('custom');
    setHasChanges(true);
  };

  // 設定保存
  const handleSave = () => {
    RelationsParameterManager.saveToLocalStorage();
    setHasChanges(false);
    onParametersChanged?.();
  };

  // リセット
  const handleReset = () => {
    RelationsParameterManager.reset('balanced');
    setCurrentMode('balanced');
    setParameters(RelationsParameterManager.getParameters());
    setHasChanges(true);
  };

  if (!isVisible || !parameters) return null;

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
    },
    modal: {
      backgroundColor: THEME_COLORS.cardBackground,
      borderRadius: '12px',
      padding: '24px',
      width: '90%',
      maxWidth: '700px',
      maxHeight: '80vh',
      overflow: 'auto',
      border: `1px solid ${THEME_COLORS.border}`,
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '20px',
      borderBottom: `1px solid ${THEME_COLORS.border}`,
      paddingBottom: '16px',
    },
    title: {
      color: THEME_COLORS.text,
      fontSize: '20px',
      fontWeight: '600',
      margin: 0,
    },
    closeButton: {
      background: 'none',
      border: 'none',
      fontSize: '24px',
      cursor: 'pointer',
      color: THEME_COLORS.textMuted,
      padding: '4px',
    },
    content: {
      color: THEME_COLORS.text,
    },
    section: {
      marginBottom: '24px',
      padding: '16px',
      backgroundColor: THEME_COLORS.background,
      borderRadius: '8px',
      border: `1px solid ${THEME_COLORS.border}`,
    },
    sectionTitle: {
      fontSize: '16px',
      fontWeight: '600',
      color: THEME_COLORS.text,
      marginBottom: '12px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    presetButtons: {
      display: 'flex',
      gap: '8px',
      marginBottom: '16px',
      flexWrap: 'wrap' as const,
    },
    presetButton: {
      padding: '8px 16px',
      border: `1px solid ${THEME_COLORS.border}`,
      borderRadius: '6px',
      backgroundColor: THEME_COLORS.cardBackground,
      color: THEME_COLORS.text,
      cursor: 'pointer',
      fontSize: '14px',
      transition: 'all 0.2s',
    },
    presetButtonActive: {
      backgroundColor: THEME_COLORS.primaryBlue,
      color: '#ffffff',
      borderColor: THEME_COLORS.primaryBlue,
    },
    paramGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: '16px',
    },
    paramItem: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '4px',
    },
    paramLabel: {
      fontSize: '13px',
      color: THEME_COLORS.textMuted,
      fontWeight: '500',
    },
    paramInput: {
      padding: '8px 12px',
      border: `1px solid ${THEME_COLORS.border}`,
      borderRadius: '4px',
      backgroundColor: THEME_COLORS.cardBackground,
      color: THEME_COLORS.text,
      fontSize: '14px',
    },
    footer: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: '24px',
      paddingTop: '16px',
      borderTop: `1px solid ${THEME_COLORS.border}`,
    },
    footerButtons: {
      display: 'flex',
      gap: '12px',
    },
    button: {
      padding: '10px 20px',
      borderRadius: '6px',
      border: 'none',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '500',
      transition: 'all 0.2s',
    },
    saveButton: {
      backgroundColor: THEME_COLORS.primaryGreen,
      color: '#ffffff',
    },
    resetButton: {
      backgroundColor: THEME_COLORS.textMuted,
      color: '#ffffff',
    },
    cancelButton: {
      backgroundColor: 'transparent',
      color: THEME_COLORS.textMuted,
      border: `1px solid ${THEME_COLORS.border}`,
    },
    statusBadge: {
      padding: '4px 8px',
      borderRadius: '4px',
      fontSize: '12px',
      fontWeight: '500',
    },
    changedBadge: {
      backgroundColor: THEME_COLORS.primaryYellow,
      color: '#000000',
    },
    savedBadge: {
      backgroundColor: THEME_COLORS.primaryGreen,
      color: '#ffffff',
    },
  };

  const presets: { mode: AnalysisMode; label: string; description: string }[] = [
    { mode: 'conservative', label: '🛡️ Conservative', description: '高品質・少数精鋭' },
    { mode: 'balanced', label: '⚖️ Balanced', description: '品質と量のバランス' },
    { mode: 'aggressive', label: '🚀 Aggressive', description: '多数生成・実験的' },
    { mode: 'custom', label: '🔧 Custom', description: 'カスタム設定' }
  ];

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>🎛️ Relations分析パラメータ設定</h2>
          <button style={styles.closeButton} onClick={onClose}>×</button>
        </div>

        <div style={styles.content}>
          {/* プリセット選択 */}
          <div style={styles.section}>
            <div style={styles.sectionTitle}>
              📋 プリセットモード
              {hasChanges && <span style={{...styles.statusBadge, ...styles.changedBadge}}>変更あり</span>}
            </div>
            <div style={styles.presetButtons}>
              {presets.map(preset => (
                <button
                  key={preset.mode}
                  style={{
                    ...styles.presetButton,
                    ...(currentMode === preset.mode ? styles.presetButtonActive : {})
                  }}
                  onClick={() => handleModeChange(preset.mode)}
                  title={preset.description}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* AI分析設定 */}
          <div style={styles.section}>
            <div style={styles.sectionTitle}>🤖 AI分析設定</div>
            <div style={styles.paramGrid}>
              <div style={styles.paramItem}>
                <label style={styles.paramLabel}>最小類似度 (0.0-1.0)</label>
                <input
                  style={styles.paramInput}
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  value={parameters.ai.minSimilarity}
                  onChange={(e) => handleParameterChange('ai', 'minSimilarity', parseFloat(e.target.value))}
                />
              </div>
              <div style={styles.paramItem}>
                <label style={styles.paramLabel}>最大提案数</label>
                <input
                  style={styles.paramInput}
                  type="number"
                  min="1"
                  max="200"
                  value={parameters.ai.maxSuggestions}
                  onChange={(e) => handleParameterChange('ai', 'maxSuggestions', parseInt(e.target.value))}
                />
              </div>
              <div style={styles.paramItem}>
                <label style={styles.paramLabel}>信頼度 (0.0-1.0)</label>
                <input
                  style={styles.paramInput}
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  value={parameters.ai.confidence}
                  onChange={(e) => handleParameterChange('ai', 'confidence', parseFloat(e.target.value))}
                />
              </div>
            </div>
          </div>

          {/* 統合分析設定 */}
          <div style={styles.section}>
            <div style={styles.sectionTitle}>🧠 統合分析設定</div>
            <div style={styles.paramGrid}>
              <div style={styles.paramItem}>
                <label style={styles.paramLabel}>最小総合スコア (0.0-1.0)</label>
                <input
                  style={styles.paramInput}
                  type="number"
                  min="0"
                  max="1"
                  step="0.05"
                  value={parameters.unified.minOverallScore}
                  onChange={(e) => handleParameterChange('unified', 'minOverallScore', parseFloat(e.target.value))}
                />
              </div>
              <div style={styles.paramItem}>
                <label style={styles.paramLabel}>最小信頼度 (0.0-1.0)</label>
                <input
                  style={styles.paramInput}
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  value={parameters.unified.minConfidence}
                  onChange={(e) => handleParameterChange('unified', 'minConfidence', parseFloat(e.target.value))}
                />
              </div>
              <div style={styles.paramItem}>
                <label style={styles.paramLabel}>最小意味スコア (0.0-1.0)</label>
                <input
                  style={styles.paramInput}
                  type="number"
                  min="0"
                  max="1"
                  step="0.05"
                  value={parameters.unified.minSemanticScore}
                  onChange={(e) => handleParameterChange('unified', 'minSemanticScore', parseFloat(e.target.value))}
                />
              </div>
              <div style={styles.paramItem}>
                <label style={styles.paramLabel}>最大関係性数</label>
                <input
                  style={styles.paramInput}
                  type="number"
                  min="10"
                  max="2000"
                  value={parameters.unified.maxRelationsPerBoard}
                  onChange={(e) => handleParameterChange('unified', 'maxRelationsPerBoard', parseInt(e.target.value))}
                />
              </div>
            </div>
          </div>

          {/* タグ類似性設定 */}
          <div style={styles.section}>
            <div style={styles.sectionTitle}>🏷️ タグ類似性設定</div>
            <div style={styles.paramGrid}>
              <div style={styles.paramItem}>
                <label style={styles.paramLabel}>最小共通タグ数</label>
                <input
                  style={styles.paramInput}
                  type="number"
                  min="1"
                  max="5"
                  value={parameters.tagSimilarity.minCommonTags}
                  onChange={(e) => handleParameterChange('tagSimilarity', 'minCommonTags', parseInt(e.target.value))}
                />
              </div>
              <div style={styles.paramItem}>
                <label style={styles.paramLabel}>最小類似度 (0.0-1.0)</label>
                <input
                  style={styles.paramInput}
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  value={parameters.tagSimilarity.minSimilarity}
                  onChange={(e) => handleParameterChange('tagSimilarity', 'minSimilarity', parseFloat(e.target.value))}
                />
              </div>
              <div style={styles.paramItem}>
                <label style={styles.paramLabel}>最大提案数</label>
                <input
                  style={styles.paramInput}
                  type="number"
                  min="5"
                  max="100"
                  value={parameters.tagSimilarity.maxSuggestions}
                  onChange={(e) => handleParameterChange('tagSimilarity', 'maxSuggestions', parseInt(e.target.value))}
                />
              </div>
            </div>
          </div>
        </div>

        <div style={styles.footer}>
          <div>
            <span style={{...styles.paramLabel}}>現在のモード: </span>
            <span style={{color: THEME_COLORS.primaryBlue, fontWeight: '600'}}>{currentMode}</span>
          </div>
          <div style={styles.footerButtons}>
            <button
              style={{...styles.button, ...styles.resetButton}}
              onClick={handleReset}
            >
              🔄 リセット
            </button>
            <button
              style={{...styles.button, ...styles.cancelButton}}
              onClick={onClose}
            >
              キャンセル
            </button>
            <button
              style={{...styles.button, ...styles.saveButton}}
              onClick={() => {
                handleSave();
                onClose();
              }}
              disabled={!hasChanges}
            >
              💾 保存して適用
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RelationsParameterSettingsModal;
