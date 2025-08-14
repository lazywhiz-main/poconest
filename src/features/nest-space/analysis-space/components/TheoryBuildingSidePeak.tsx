import React, { useState, useCallback } from 'react';
import { THEME_COLORS } from '../../../../constants/theme';
import { GroundedTheoryManager } from './GroundedTheoryManager';
import type { ClusterLabel } from '../../../../services/AnalysisService';
import type { ClusteringResult } from '../../../../services/SmartClusteringService';

interface TheoryBuildingSidePeakProps {
  /** 現在のクラスターラベル */
  currentClusters: ClusterLabel[];
  /** 現在のクラスタリング結果 */
  currentClusteringResult: ClusteringResult | null;
  /** ボードID */
  boardId: string;
  /** ネストID */
  nestId: string;
}

/**
 * Theory Building サイドピークコンポーネント
 * 仮説抽出と理論構築の分析手法を管理
 */
export const TheoryBuildingSidePeak: React.FC<TheoryBuildingSidePeakProps> = ({
  currentClusters,
  currentClusteringResult,
  boardId,
  nestId,
}) => {
  const [selectedMethod, setSelectedMethod] = useState<'grounded-theory' | null>('grounded-theory');

  // ボタンホバー効果
  const handleButtonHover = useCallback((e: React.MouseEvent, isEnter: boolean) => {
    const target = e.currentTarget as HTMLElement;
    if (isEnter) {
      target.style.transform = 'translateY(-1px)';
      target.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
    } else {
      target.style.transform = 'translateY(0)';
      target.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
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
    methodSelection: {
      padding: '20px',
      borderBottom: `1px solid ${THEME_COLORS.borderSecondary}`,
      backgroundColor: THEME_COLORS.bgSecondary,
    } as React.CSSProperties,
    sectionTitle: {
      fontSize: '14px',
      fontWeight: '600',
      color: THEME_COLORS.textPrimary,
      marginBottom: '8px',
      fontFamily: 'Space Grotesk, system-ui, sans-serif',
    } as React.CSSProperties,
    sectionDesc: {
      fontSize: '12px',
      color: THEME_COLORS.textSecondary,
      marginBottom: '16px',
      lineHeight: '1.4',
    } as React.CSSProperties,
    methodGrid: {
      display: 'grid',
      gridTemplateColumns: '1fr',
      gap: '8px',
    } as React.CSSProperties,
    methodButton: {
      padding: '12px 16px',
      border: `1px solid ${THEME_COLORS.borderSecondary}`,
      borderRadius: THEME_COLORS.borderRadius.medium,
      backgroundColor: THEME_COLORS.bgTertiary,
      color: THEME_COLORS.textSecondary,
      fontSize: '12px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      textAlign: 'left',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    } as React.CSSProperties,
    selectedMethodButton: {
      backgroundColor: THEME_COLORS.primaryPurple,
      color: THEME_COLORS.textInverse,
      borderColor: THEME_COLORS.primaryPurple,
    } as React.CSSProperties,
    disabledMethodButton: {
      opacity: 0.6,
      cursor: 'not-allowed',
    } as React.CSSProperties,
    methodContent: {
      flex: 1,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
    } as React.CSSProperties,
    comingSoon: {
      padding: '20px',
      textAlign: 'center',
      color: THEME_COLORS.textMuted,
      fontSize: '12px',
      background: THEME_COLORS.bgTertiary,
      margin: '20px',
      borderRadius: THEME_COLORS.borderRadius.medium,
      border: `1px solid ${THEME_COLORS.borderSecondary}`,
    } as React.CSSProperties,
  };

  // 分析手法情報
  const analysismethods = [
    {
      id: 'grounded-theory',
      name: 'Grounded Theory Analysis',
      icon: '🧠',
      description: 'データから理論を構築する質的分析手法。概念の抽出、カテゴリ化、関係性の発見を通じて理論を形成します。',
      isAvailable: true,
    },
    {
      id: 'narrative-analysis',
      name: 'Narrative Analysis',
      icon: '📖',
      description: 'ストーリーやナラティブの構造を分析し、意味や価値観を探求する手法。（実装予定）',
      isAvailable: false,
    },
    {
      id: 'thematic-analysis',
      name: 'Thematic Analysis',
      icon: '🎭',
      description: 'データ内のパターンやテーマを識別し、分析する質的分析手法。（実装予定）',
      isAvailable: false,
    },
    {
      id: 'content-analysis',
      name: 'Content Analysis',
      icon: '📊',
      description: 'テキスト内容を定量的・定性的に分析し、パターンや傾向を抽出する手法。（実装予定）',
      isAvailable: false,
    },
  ];

  return (
    <div style={styles.container}>
      {/* 分析手法選択セクション */}
      <div style={styles.methodSelection}>
        <div style={styles.sectionTitle}>
          🔬 理論構築・仮説抽出手法
        </div>
        <div style={styles.sectionDesc}>
          使用する分析手法を選択してください。各手法には異なる理論的背景とアプローチがあります。
        </div>
        
        <div style={styles.methodGrid}>
          {analysismethods.map((method) => (
            <button
              key={method.id}
              style={{
                ...styles.methodButton,
                ...(selectedMethod === method.id ? styles.selectedMethodButton : {}),
                ...((!method.isAvailable) ? styles.disabledMethodButton : {}),
              }}
              onClick={() => method.isAvailable && setSelectedMethod(method.id as any)}
              disabled={!method.isAvailable}
              onMouseEnter={(e) => method.isAvailable && handleButtonHover(e, true)}
              onMouseLeave={(e) => method.isAvailable && handleButtonHover(e, false)}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '8px',
              }}>
                <span style={{ fontSize: '16px' }}>{method.icon}</span>
                <span style={{ 
                  fontSize: '13px', 
                  fontWeight: '600',
                  color: selectedMethod === method.id ? THEME_COLORS.textInverse : THEME_COLORS.textPrimary,
                }}>
                  {method.name}
                </span>
                {!method.isAvailable && (
                  <span style={{
                    fontSize: '9px',
                    backgroundColor: THEME_COLORS.primaryOrange,
                    color: THEME_COLORS.textInverse,
                    padding: '2px 6px',
                    borderRadius: '3px',
                    fontWeight: '600',
                  }}>
                    Coming Soon
                  </span>
                )}
              </div>
              <div style={{
                fontSize: '11px',
                color: selectedMethod === method.id ? THEME_COLORS.textInverse : THEME_COLORS.textMuted,
                lineHeight: '1.3',
                opacity: method.isAvailable ? 1 : 0.7,
              }}>
                {method.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 選択された手法のコンテンツ */}
      <div style={styles.methodContent}>
        {selectedMethod === 'grounded-theory' ? (
          <GroundedTheoryManager
            currentClusters={currentClusters}
            currentClusteringResult={currentClusteringResult}
            boardId={boardId}
            nestId={nestId}
            onClose={() => {}} // サイドピーク内なので個別のクローズ不要
          />
        ) : selectedMethod ? (
          <div style={styles.comingSoon}>
            <div style={{ marginBottom: '8px', fontSize: '20px' }}>🚧</div>
            <div style={{ fontWeight: '600', marginBottom: '4px' }}>
              {analysismethods.find(m => m.id === selectedMethod)?.name}
            </div>
            <div>
              この分析手法は現在開発中です。<br />
              今後のアップデートでご利用いただけるようになります。
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
