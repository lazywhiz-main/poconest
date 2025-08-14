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
  return (
    <>
      {/* サイドピークパネル本体 - 真のサイドピーク形式 */}
      <div
        style={{
          position: 'fixed',
          top: '70px', // メインメニューボタンの少し下
          left: isOpen ? '20px' : '-380px', // 開いているときは20px、閉じているときは隠す
          width: `${width}px`,
          maxHeight,
          backgroundColor: THEME_COLORS.bgPrimary,
          border: `1px solid ${THEME_COLORS.borderPrimary}`,
          borderRadius: THEME_COLORS.borderRadius.large,
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
          zIndex,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)', // スムーズなイーズアウト
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none', // 閉じているときはクリックを無効化
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
