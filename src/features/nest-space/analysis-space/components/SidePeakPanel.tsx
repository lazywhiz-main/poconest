import React from 'react';
import { THEME_COLORS } from '../../../../constants/theme';

interface SidePeakPanelProps {
  /** パネルが表示されているかどうか */
  isOpen: boolean;
  /** パネルを閉じる関数 */
  onClose: () => void;
  /** パネルのタイトル */
  title: string;
  /** タイトルのアイコン（絵文字など） */
  icon?: string;
  /** パネルの内容 */
  children: React.ReactNode;
  /** パネルの幅（オプション、デフォルト: 400px） */
  width?: number;
  /** パネルの最大高さ（オプション、デフォルト: 80vh） */
  maxHeight?: string;
  /** 背景のz-index（オプション、デフォルト: 100） */
  zIndex?: number;
}

/**
 * 分析スペース共通サイドピークパネルコンポーネント
 * 5つのメインカテゴリー（Relations, Clustering, Theory Building, View & Navigation, Search & Filter）で共通使用
 */
export const SidePeakPanel: React.FC<SidePeakPanelProps> = ({
  isOpen,
  onClose,
  title,
  icon,
  children,
  width = 400,
  maxHeight = '80vh',
  zIndex = 100,
}) => {
  if (!isOpen) return null;

  return (
    <>
      {/* オーバーレイ背景（クリックで閉じる） */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          zIndex: zIndex - 1,
          transition: 'opacity 0.2s ease',
        }}
        onClick={onClose}
      />

      {/* サイドピークパネル本体 */}
      <div
        style={{
          position: 'fixed',
          top: '20px',
          left: '200px', // メインメニューボタンの右側に配置
          width: `${width}px`,
          maxHeight,
          backgroundColor: THEME_COLORS.bgPrimary,
          border: `1px solid ${THEME_COLORS.borderPrimary}`,
          borderRadius: THEME_COLORS.borderRadius.large,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          backdropFilter: 'blur(12px)',
          zIndex,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          transition: 'all 0.3s ease',
          transform: 'translateY(0)',
        }}
        onClick={(e) => e.stopPropagation()} // パネル内クリックでは閉じない
      >
        {/* ヘッダー */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: `1px solid ${THEME_COLORS.borderSecondary}`,
            background: `linear-gradient(135deg, ${THEME_COLORS.bgSecondary}, ${THEME_COLORS.bgTertiary})`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {icon && (
              <span style={{ fontSize: '18px', lineHeight: 1 }}>{icon}</span>
            )}
            <h3
              style={{
                margin: 0,
                fontSize: '16px',
                fontWeight: '600',
                color: THEME_COLORS.textPrimary,
                fontFamily: 'JetBrains Mono, monospace',
              }}
            >
              {title}
            </h3>
          </div>
          
          {/* 閉じるボタン */}
          <button
            style={{
              background: 'transparent',
              border: 'none',
              color: THEME_COLORS.textSecondary,
              fontSize: '18px',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: THEME_COLORS.borderRadius.small,
              transition: 'all 0.2s ease',
              lineHeight: 1,
            }}
            onClick={onClose}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = THEME_COLORS.bgTertiary;
              e.currentTarget.style.color = THEME_COLORS.textPrimary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = THEME_COLORS.textSecondary;
            }}
          >
            ✕
          </button>
        </div>

        {/* コンテンツエリア */}
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            padding: '0', // パディングは各カテゴリーで個別に設定
          }}
        >
          {children}
        </div>
      </div>
    </>
  );
};

export default SidePeakPanel;
