import React from 'react';
import { THEME_COLORS } from '../../../../constants/theme';

// カスタムスクロールバーのスタイル
const scrollbarStyles = `
  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-track {
    background: ${THEME_COLORS.bgTertiary};
    border-radius: 3px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: ${THEME_COLORS.borderSecondary};
    border-radius: 3px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: ${THEME_COLORS.textSecondary};
  }
`;

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
      {/* カスタムスクロールバーのスタイル */}
      {isOpen && <style>{scrollbarStyles}</style>}
      
      {/* サイドピークパネル本体 - 真のサイドピーク形式 */}
      <div
        style={{
          position: 'fixed',
          top: '60px', // NESTヘッダーの下から開始
          right: isOpen ? '20px' : `-${width + 20}px`, // 右側から、開いているときは20px、閉じているときは隠す
          bottom: '20px', // 画面下から20px
          width: `${width}px`,
          height: 'calc(100vh - 80px)', // NESTヘッダー分を除いた高さ
          backgroundColor: THEME_COLORS.bgPrimary,
          border: `1px solid ${THEME_COLORS.borderPrimary}`,
          borderRadius: THEME_COLORS.borderRadius.large,
          boxShadow: '-4px 0 16px rgba(0, 0, 0, 0.2)', // 左側に影
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
            // カスタムスクロールバー
            scrollbarWidth: 'thin',
            scrollbarColor: `${THEME_COLORS.borderSecondary} ${THEME_COLORS.bgTertiary}`,
          }}
          className="custom-scrollbar"
        >
          {children}
        </div>
      </div>
    </>
  );
};

export default SidePeakPanel;
